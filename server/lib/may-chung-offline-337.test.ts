// #337 / #339 / #340 (17/11) — máy chung nhiều bé: gói mất mạng theo bé, phút bù ghi theo chủ phiên, đổi gán áp ngay, lỗi nhỏ nhiều con nhiều máy.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const ph = await import("./phien.ts");
const la = await import("./luat-app.ts");
const v = await import("./vi.ts");
const mc = await import("./may-con.ts");
const pin = await import("./pin-be.ts");
const { maOfflinePhut } = await import("./ma-offline.ts");
const { biMatOfflineMay } = await import("./tuan-thu.ts");
const { choThayDoi, phienBanDoi } = await import("./cho-thay-doi.ts");
const { taoPhien, sha } = await import("./auth.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q, one, newId } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

type Kq = { status: number; body: any };
async function goi(f: typeof xuLyM, goc: string, duong: string, o: { tok?: string; body?: unknown; hdr?: Record<string, string> } = {}): Promise<Kq> {
  const r = await f(new Request(`http://app.test/api/${goc}/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}), ...(o.hdr ?? {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: await r.json() };
}
const m = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyM, "m", d, o);
const dv = (d: string, o?: { tok?: string; body?: unknown; hdr?: Record<string, string> }) => goi(xuLyMay, "device", d, o);
const truoc = (phut: number) => new Date(Date.now() - phut * 60_000);

async function nha(nen = "windows") {
  const { fam, bm } = await taoNha("Mẹ Lan");
  const a = await g.taoCon(fam, { ten: "Bảo Anh" });
  const b = await g.taoCon(fam, { ten: "Bảo Minh" });
  await v.dieuChinhTay(fam, a, 50, "Điểm thử", bm);
  await v.dieuChinhTay(fam, b, 50, "Điểm thử", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  const chung = await g.ghepMay(await g.taoMaGhep(fam, null, nen), nen, "PC phòng khách");
  const may = (await g.mayTuToken(chung.token))!;
  return { fam, bm, a, b, may, tokMay: chung.token, tok: await taoPhien(bm) };
}
/** Phiên Con (PIN) trên máy — như dang-nhap-be, không đi qua route (giữ mốc giờ của test). */
async function dangNhap(con: string, mayId: string) {
  const t = `pin-${newId()}`;
  await q(`insert into kid_sessions(id, child_id, device_id, expires_at) values ($1,$2,$3, now() + interval '12 hours')`, [sha(t), con, mayId]);
  await q(`update devices set con_dang_dung = $2, dang_nhap_luc = now() where id = $1`, [mayId, con]);
  return t;
}

// ---------------------------------------------------------------- #337 phút mất mạng ghi đúng bé
test("#337 phien/bu: A chơi lúc mất mạng rồi «Đổi người» sang B — có mạng lại, phút bù ghi cho A (chủ phiên), không cho B đang đăng nhập", async () => {
  const { a, b, may, tokMay } = await nha();
  await dangNhap(a, may.id);
  const pA = await ph.moPhien(a, may.id, "roblox.exe", {}, truoc(10));       // A mở phiên rồi mất mạng (nhịp cuối 10 phút trước)
  // mất mạng: A đổi sang B (agent báo B đăng nhập khi có mạng lại, TRƯỚC phien/bu) ⇒ máy chủ coi B đang dùng
  await q(`delete from kid_sessions where device_id = $1`, [may.id]);
  const tokB = await dangNhap(b, may.id);
  const r = await dv("phien/bu", { tok: tokMay, hdr: { "x-phien-con": tokB }, body: { ma: "bu-337-1", id: pA.id, muc: "roblox.exe", phut: 5, ketThuc: true } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.phut, 5);
  assert.equal(await v.soDu(a), 45, "5 phút của A trừ vào A");
  assert.equal(await v.soDu(b), 50, "B không bị trừ phút của A");
  // phiên mở lúc mất mạng (máy chủ chưa biết) + agent gửi kèm `con` ⇒ ghi cho bé đó dù máy chủ đang coi B dùng
  const r2 = await dv("phien/bu", { tok: tokMay, hdr: { "x-phien-con": tokB }, body: { ma: "bu-337-2", con: a, muc: "roblox.exe", phut: 3, ketThuc: true } });
  assert.equal(r2.status, 200, JSON.stringify(r2.body));
  assert.equal((await one<{ child_id: string }>(`select child_id from play_sessions where id = $1`, [r2.body.phien]))!.child_id, a, "phiên bù tạo cho A");
  assert.equal(await v.soDu(b), 50);
  // `con` không được gán máy ⇒ không nhận, về bé đang dùng
  const { fam } = (await one<{ fam: string }>(`select family_id as fam from devices where id = $1`, [may.id]))!;
  const c = await g.taoCon(fam, { ten: "Bảo Châu" });
  await q(`delete from device_children where device_id = $1 and child_id = $2`, [may.id, c]);
  const r3 = await dv("phien/bu", { tok: tokMay, hdr: { "x-phien-con": tokB }, body: { ma: "bu-337-3", con: c, muc: "roblox.exe", phut: 2, ketThuc: true } });
  assert.equal(r3.status, 200);
  assert.equal((await one<{ child_id: string }>(`select child_id from play_sessions where id = $1`, [r3.body.phien]))!.child_id, b, "bé không gán máy ⇒ phút về bé đang dùng");
});

test("#337 dong-bo usage có `con`: phút mất mạng của bé trước ghi + trừ sao bé đó, không đổ sang bé đang dùng", async () => {
  const { a, b, may, tokMay } = await nha();
  const tokB = await dangNhap(b, may.id);
  const r = await dv("dong-bo", { tok: tokMay, hdr: { "x-phien-con": tokB }, body: { usage: [{ muc: "roblox.exe", phut: 6, con: a }] } });
  assert.equal(r.status, 200);
  assert.equal(await v.soDu(a), 44);
  assert.equal(await v.soDu(b), 50);
});

// ---------------------------------------------------------------- #337 gói luật mất mạng theo bé
test("#337 ho-so?offline=1 (máy chung Windows): mỗi bé kèm luật riêng — khoá, sao của đúng bé; không xin / máy riêng ⇒ không kèm", async () => {
  const { fam, bm, a, b, tokMay } = await nha();
  await mc.khoaNgay(fam, a, true, bm);                                       // chỉ A bị khoá
  await v.dieuChinhTay(fam, b, 20, "Thêm", bm);
  const h = (await dv("ho-so?offline=1", { tok: tokMay })).body;
  assert.equal(h.mayChung, true);
  const theo = Object.fromEntries(h.con.map((c: any) => [c.id, c.offline]));
  assert.ok(theo[a]?.windows && theo[b]?.windows, "đủ gói của hai bé");
  assert.equal(theo[a].con.id, a);
  assert.equal(theo[b].con.id, b);
  assert.equal(theo[a].windows.locked, true, "A khoá");
  assert.equal(theo[b].windows.locked, false, "B không mang khoá của A");
  assert.notEqual(theo[a].soDu, theo[b].soDu, "sao riêng từng bé");
  assert.ok(theo[a].windows.maOfflineBiMat, "gói mang bí mật mã offline như dong-bo (không đè rỗng ở agent)");
  // cùng khối `windows` với dong-bo khi bé đó đăng nhập (một hàm dựng chung)
  const tokA = await dangNhap(a, (await one<{ id: string }>(`select id from devices where family_id = $1 and dung_chung`, [fam]))!.id);
  const dA = (await dv("dong-bo", { tok: tokMay, hdr: { "x-phien-con": tokA }, body: {} })).body;
  assert.deepEqual({ ...theo[a].windows, serverTime: null, nextCheckSec: null }, { ...dA.windows, serverTime: null, nextCheckSec: null });
  assert.ok(h.offlineLuc);
  // agent cũ (không xin) ⇒ ho-so như cũ
  assert.equal((await dv("ho-so", { tok: tokMay })).body.con.some((c: any) => c.offline), false);
  // máy riêng ⇒ không có gói
  const rieng = await g.ghepMay(await g.taoMaGhep(fam, a, "windows"), "windows", "Laptop A");
  assert.equal((await dv("ho-so?offline=1", { tok: rieng.token })).body.con.some((c: any) => c.offline), false);
});

test("#337 ho-so?offline=1 (máy chung Android): gói dạng nhip (chinhSach + nenTang) theo bé", async () => {
  const { fam, bm, a, b, tokMay } = await nha("android");
  await mc.khoaNgay(fam, b, true, bm);
  const h = (await dv("ho-so?offline=1", { tok: tokMay })).body;
  const theo = Object.fromEntries(h.con.map((c: any) => [c.id, c.offline]));
  assert.ok(theo[a]?.chinhSach && theo[a]?.nenTang, "gói Android của A");
  assert.ok("grantEndsAt" in theo[a] && "moDen" in theo[a], "như nhip: grantEndsAt / moDen");
  assert.ok(theo[b]?.chinhSach, "gói Android của B");
  assert.notDeepEqual(theo[a].chinhSach, theo[b].chinhSach, "luật mỗi bé khác nhau");
});

// ---------------------------------------------------------------- #339 đổi gán áp ngay
test("#339 Ba Mẹ đổi gán máy: «chờ thay đổi» trả ngay, dong-bo/nhip kèm dsCon mới; bé bị bỏ gán đang dùng ⇒ nguoiDung «chua» ngay lượt đó", async () => {
  const { fam, a, b, may, tokMay, tok } = await nha();
  const tokB = await dangNhap(b, may.id);
  const d0 = (await dv("dong-bo", { tok: tokMay, hdr: { "x-phien-con": tokB }, body: {} })).body;
  assert.deepEqual([...d0.dsCon].sort(), [a, b].sort());
  assert.equal(d0.nguoiDung.loai, "con");
  const ver = await phienBanDoi(fam);
  // agent đang giữ long-poll; Ba Mẹ bỏ B khỏi máy ⇒ long-poll trả trong lượt, không chờ chu kỳ 30 phút
  const cho = choThayDoi(fam, ver, { toiDaMs: 5_000, kiemDbMs: 50 });
  const t0 = Date.now();
  assert.equal((await m(`may/${may.id}/con`, { tok, body: { ds: [a] } })).status, 200);
  const kq = await cho;
  assert.equal(kq.doi, true);
  assert.ok(Date.now() - t0 < 4_000, "đánh thức ngay");
  const d1 = (await dv("dong-bo", { tok: tokMay, hdr: { "x-phien-con": tokB }, body: {} })).body;
  assert.deepEqual(d1.dsCon, [a], "dsCon mới ngay lượt đồng bộ kế");
  // máy còn một bé ⇒ thành máy riêng của A: B bị đẩy ra ngay lượt này (không còn là người dùng của máy)
  assert.equal(d1.nguoiDung.con?.id, a, "B bị bỏ gán ⇒ không còn đang dùng máy");
  assert.equal((await q(`select 1 from kid_sessions where device_id = $1 and child_id = $2`, [may.id, b])).length, 0);
  const n1 = (await dv("nhip", { tok: tokMay, body: {} })).body;
  assert.deepEqual(n1.dsCon, [a]);
  // gán thêm lại ⇒ dsCon có B
  const ver2 = await phienBanDoi(fam);
  assert.equal((await m(`may/${may.id}/con/${b}/gan`, { tok, body: {} })).status, 200);
  assert.ok((await phienBanDoi(fam)) > ver2);
  assert.deepEqual([...(await dv("dong-bo", { tok: tokMay, body: {} })).body.dsCon].sort(), [a, b].sort());
});

// ---------------------------------------------------------------- #340 lỗi nhỏ
test("#340.1 Ba Mẹ mở máy chung bằng mã ⇒ phiên chơi của bé đang dùng dừng (bé mở được ở máy khác)", async () => {
  const { a, may, tokMay } = await nha();
  await dangNhap(a, may.id);
  const p = await ph.moPhien(a, may.id, "roblox.exe", {}, new Date());
  const ma = maOfflinePhut((await biMatOfflineMay(may.id))!, 15);
  const r = await dv("ba-me-mo", { tok: tokMay, body: { ma } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from play_sessions where id = $1`, [p.id]))!.trang_thai, "ket_thuc");
});

test("#340.2 không tạo được 2 bé trùng tên; cùng Ba Mẹ gửi lại ngay (cùng dữ liệu) trả lại bé vừa tạo; Ba Mẹ khác / không rõ người ⇒ ten_trung", async () => {
  const { fam, bm } = await taoNha("Ba Hùng");
  const { taoBaMe } = await import("./test-fixtures/nha.ts");
  const a = await g.taoCon(fam, { ten: "Na", namSinh: 2018 }, bm);
  assert.equal(await g.taoCon(fam, { ten: "na ", namSinh: 2018 }, bm), a, "cùng Ba Mẹ gửi lại trong 2 phút ⇒ cùng bé");
  assert.equal((await q(`select 1 from children where family_id = $1`, [fam])).length, 1);
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'tao_con'`, [fam])).length, 1, "không ghi sự kiện đôi");
  await assert.rejects(g.taoCon(fam, { ten: "Na", namSinh: 2016 }, bm), /Nhà đã có Con tên/, "khác dữ liệu");
  await assert.rejects(g.taoCon(fam, { ten: "Na", namSinh: 2018 }), /Nhà đã có Con tên/, "không rõ người tạo");
  const me = await taoBaMe(fam, "Mẹ Hoa");
  await assert.rejects(g.taoCon(fam, { ten: "Na", namSinh: 2018 }, me), /Nhà đã có Con tên/, "Ba Mẹ khác cùng thêm «Na»");
  await q(`update children set created_at = now() - interval '1 hour' where id = $1`, [a]);
  await assert.rejects(g.taoCon(fam, { ten: "Na", namSinh: 2018 }, bm), /Nhà đã có Con tên/);
  assert.equal((await q(`select 1 from children where family_id = $1`, [fam])).length, 1);
});

test("#340.4 hai bé đăng nhập cùng lúc trên một máy ⇒ chỉ MỘT phiên Con, con_dang_dung khớp phiên đó", async () => {
  const { a, b, may } = await nha();
  await Promise.all([pin.dangNhapBe(may, a, null), pin.dangNhapBe(may, b, null)]);
  const ds = await q<{ child_id: string }>(`select child_id from kid_sessions where device_id = $1`, [may.id]);
  assert.equal(ds.length, 1, "một máy một bé");
  const d = (await one<{ con_dang_dung: string }>(`select con_dang_dung from devices where id = $1`, [may.id]))!;
  assert.equal(d.con_dang_dung, ds[0].child_id);
});

// ---------------------------------------------------------------- #338 «Ứng dụng trên máy» của máy chung theo bé
test("#338 máy chung: «Ứng dụng trên máy» chọn bé — thêm app cho A chỉ A dùng được, bỏ app không xoá luật bé khác; không chọn bé ⇒ 400", async () => {
  const { a, b, may, tokMay, tok } = await nha();
  const MC = { khoa: "appx:microsoft.minecraftuwp_8wekyb3d8bbwe", muc: "microsoft.minecraftuwp", ten: "Minecraft", nguon: "store" };
  assert.equal((await dv("ung-dung", { tok: tokMay, body: { du: true, bam: "a".repeat(64), ds: [MC] } })).status, 200);
  const d0 = (await m(`may/${may.id}/ung-dung`, { tok })).body;
  assert.deepEqual(d0.conDs.map((c: any) => c.id).sort(), [a, b].sort(), "danh sách bé để chọn");
  assert.equal(d0.may.con, null, "không chọn bé ⇒ như cũ (cả nhà) — app Ba Mẹ bản cũ vẫn dùng được");
  const dat = await m(`may/${may.id}/ung-dung/dat`, { tok, body: { khoa: MC.khoa, trangThai: "tinh_phut", con: a } });
  assert.equal(dat.status, 200);
  assert.equal(dat.body.con, a);
  const tt = async (con: string) => (await m(`may/${may.id}/ung-dung?con=${con}`, { tok })).body.ds.find((x: any) => x.khoa === MC.khoa).trangThai;
  assert.equal(await tt(a), "giai_tri", "A có Minecraft");
  assert.equal(await tt(b), "chua_xep", "B không được dùng theo luật của A");
  await m(`may/${may.id}/ung-dung/dat`, { tok, body: { khoa: MC.khoa, trangThai: "khong_tinh_phut", con: b } });
  await m(`may/${may.id}/ung-dung/dat`, { tok, body: { khoa: MC.khoa, trangThai: "bo", con: a } });
  assert.equal(await tt(a), "chua_xep");
  assert.equal(await tt(b), "hoc", "bỏ app của A không xoá luật của B");
  assert.equal((await m(`may/${may.id}/ung-dung?con=khong-co`, { tok })).status, 404);
  // app bản cũ (không gửi con) ⇒ luật cả nhà như trước
  const cu = await m(`may/${may.id}/ung-dung/dat`, { tok, body: { khoa: MC.khoa, trangThai: "tinh_phut" } });
  assert.equal(cu.status, 200);
  assert.equal(cu.body.con, "");
});

test("#337 phien/bu lúc Ba Mẹ đang dùng máy: không nhận `con` agent gửi (không tính cho bé)", async () => {
  const { a, may, tokMay } = await nha();
  await q(`update devices set ba_me_den = now() + interval '15 minutes', ba_me_tu = now() where id = $1`, [may.id]);
  const r = await dv("phien/bu", { tok: tokMay, body: { ma: "bu-bm-1", con: a, muc: "roblox.exe", phut: 3, ketThuc: true } });
  assert.equal(r.status, 409, "Ba Mẹ đang dùng ⇒ không có bé để ghi");
  assert.equal(await v.soDu(a), 50);
});
