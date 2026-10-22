// M4 agent Windows — phần máy chủ mới của /api/device: Policy thêm trường, ghép QR, phiên web cho khung Kid, sự kiện gửi bù,
// bù phút chơi khi mất mạng (BRD 6.7), gỡ agent bằng mật khẩu Ba Mẹ. Mốc giờ cố định (giờ VN = UTC+7).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const mc = await import("./may-con.ts");
const ph = await import("./phien.ts");
const la = await import("./luat-app.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const { bamMatKhau } = await import("./auth.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyCon } = await import("./api-con.ts");
const { q, one } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);

type Kq = { status: number; body: any };
async function goi(f: typeof xuLyMay, duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> {
  const req = new Request(`http://may.test/api/device/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duong.split("/"));
  return { status: r.status, body: await r.json() };
}
const dv = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyMay, d, o);

async function nha(diem: number) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  if (diem) await v.dieuChinhTay(fam, con, diem, "Điểm thử", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await la.datLuat(fam, { muc: "scratch.exe", ten: "Scratch", loai: "hoc" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Ken");
  const may = (await g.mayTuToken(ghep.token))!;
  return { fam, bm, con, token: ghep.token, may };
}

test("Policy cho agent: thêm tz, lechGioPhut, phienToiDa; Fun list kèm giá phần nghìn điểm/phút; trường cũ giữ nguyên", async () => {
  const { token } = await nha(0);
  const p = (await dv("dong-bo", { tok: token, body: { clientTime: new Date().toISOString() } })).body;
  assert.equal(p.tz, "Asia/Ho_Chi_Minh");
  assert.equal(p.lechGioPhut, 10);
  assert.equal(p.phienToiDa, 30);
  assert.deepEqual(p.luat.find((l: any) => l.muc === "roblox.exe"), { muc: "roblox.exe", loai: "giai_tri", nhom: "game", giaPhanNghin: 1000 });
  assert.equal(p.luat.find((l: any) => l.muc === "scratch.exe").giaPhanNghin, null);
  for (const k of ["serverTime", "nextCheckSec", "gioMaySai", "con", "canChonCon", "allowlistHeThong", "lich", "khoaNgay", "soDu", "phien"]) assert.ok(k in p, k);
});

test("phiên web cho khung Kid: agent xin phiên Con dùng được /api/kid, không gọi được /api/device", async () => {
  const { token } = await nha(5);
  const pw = (await dv("phien-web", { tok: token, body: {} })).body;
  assert.ok(pw.phienCon);
  const r = await xuLyCon(new Request("http://x/api/kid/toi", { headers: { authorization: `Bearer ${pw.phienCon}` } }), ["toi"]);
  assert.equal((await r.json()).soDu, 5);
  assert.equal((await dv("dong-bo", { tok: pw.phienCon, body: {} })).status, 401);
});

test("sự kiện agent: gửi bù không ghi trùng (cùng mã), loại lạ bỏ qua, thử gỡ ⇒ cảnh báo nghiêm trọng", async () => {
  const { fam, token } = await nha(0);
  const ds = [{ ma: "e1", loai: "thu_go", luc: new Date().toISOString(), chiTiet: { cach: "sc stop" } }, { ma: "e2", loai: "cong_diem" }, { ma: "e3", loai: "khay_tat" }];
  assert.equal((await dv("su-kien", { tok: token, body: { ds } })).body.nhan, 2);
  assert.equal((await dv("su-kien", { tok: token, body: { ds } })).body.nhan, 0, "gửi lại cả lô: không ghi trùng");
  const cb = await q<{ loai: string; muc: string }>(`select loai, muc from alerts where family_id = $1`, [fam]);
  assert.deepEqual(cb.map((x) => [x.loai, x.muc]), [["may_thu_go", "nghiem_trong"]]);
  assert.equal((await q(`select 1 from events where family_id = $1 and loai like 'may_%'`, [fam])).length, 2);
});

test("sự kiện mã offline: mở ⇒ báo thông tin; có mạng lại kết thúc (het_ma_offline) ⇒ chỉ ghi nhật ký, không báo", async () => {
  const { fam, token } = await nha(0);
  const luc = new Date().toISOString();
  const ds = [{ ma: "m1", loai: "mo_ma_offline", luc, chiTiet: { phut: "60" } }, { ma: "m2", loai: "het_ma_offline", luc, chiTiet: { ket_thuc: "co_mang", conPhut: "50" } }];
  assert.equal((await dv("su-kien", { tok: token, body: { ds } })).body.nhan, 2);
  const cb = await q<{ loai: string; muc: string }>(`select loai, muc from alerts where family_id = $1`, [fam]);
  assert.deepEqual(cb.map((x) => [x.loai, x.muc]), [["may_mo_ma_offline", "thong_tin"]]);
  const ev = await one<{ chi_tiet: Record<string, unknown> }>(`select chi_tiet from events where family_id = $1 and loai = 'may_het_ma_offline'`, [fam]);
  assert.equal(ev?.chi_tiet.ket_thuc, "co_mang");
});

test("bù phút offline: trừ đúng phút đã chơi, không vượt thời gian thật đã trôi, gửi lại không trừ đôi", async () => {
  const { con, may } = await nha(50);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  for (let i = 1; i <= 5; i++) await ph.nhip(con, p.id, true, sau(t0, i));        // 5 phút online
  assert.equal(await v.soDu(con), 45);
  // mất mạng 10 phút, Con chơi tiếp rồi agent tự đóng; có mạng lại gửi bù — khai 60 phút nhưng thời gian thật chỉ 10
  const b = await mc.buPhien(may, con, { ma: "bu-1", id: p.id, phut: 60, ketThuc: true }, sau(t0, 15));
  assert.equal(b.phut, 10);
  assert.equal(b.diemTru, 10);
  assert.equal(b.soDu, 35);
  const lai = await mc.buPhien(may, con, { ma: "bu-1", id: p.id, phut: 60, ketThuc: true }, sau(t0, 16));
  assert.equal(lai.lapLai, true);
  assert.equal(await v.soDu(con), 35, "gửi lại cùng mã: không trừ đôi");
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from play_sessions where id = $1`, [p.id]))!.trang_thai, "ket_thuc");
});

test("bù phút offline: phiên mở khi mất mạng ⇒ máy chủ ghi phiên + trừ điểm; mục không phải giải trí không trừ; ví không âm", async () => {
  const { con, may } = await nha(4);
  const now = VN("2026-10-21T18:00:00");
  const b = await mc.buPhien(may, con, { ma: "off-1", muc: "Roblox.exe", phut: 3, batDau: sau(now, -3).toISOString() }, now);
  assert.equal(b.diemTru, 3);
  const s = await one<{ trang_thai: string; phut_dung: number; device_id: string }>(`select trang_thai, phut_dung, device_id from play_sessions where id = $1`, [b.phien]);
  assert.deepEqual([s!.trang_thai, s!.phut_dung, s!.device_id], ["ket_thuc", 3, may.id]);
  assert.equal((await mc.buPhien(may, con, { ma: "off-2", muc: "scratch.exe", phut: 20 }, now)).diemTru, 0);
  const am = await mc.buPhien(may, con, { ma: "off-3", muc: "roblox.exe", phut: 10 }, sau(now, 30));
  assert.equal(am.diemTru, 1, "chỉ còn 1 điểm ⇒ trừ 1, không âm");
  assert.equal(await v.soDu(con), 0);
});

test("gỡ agent: cần mật khẩu AiiGrow của Ba Mẹ cùng gia đình; sai ⇒ từ chối + cảnh báo; đúng ⇒ thiết bị bị gỡ, token hết hiệu lực", async () => {
  const { fam, bm, token } = await nha(0);
  await q(`update parents set pass_hash = $2, dinh_danh = 'lan@vidu.vn' where id = $1`, [bm, await bamMatKhau("matkhau123")]);
  const sai = await dv("go", { tok: token, body: { dinhDanh: "lan@vidu.vn", matKhau: "doan-bua" } });
  assert.equal(sai.status, 401);
  assert.ok((await q(`select 1 from alerts where family_id = $1 and loai = 'may_thu_go' and muc = 'nghiem_trong'`, [fam])).length);
  const khac = await taoNha("Mai");
  await q(`update parents set pass_hash = $2, dinh_danh = 'mai@vidu.vn' where id = $1`, [khac.bm, await bamMatKhau("matkhau123")]);
  assert.equal((await dv("go", { tok: token, body: { dinhDanh: "mai@vidu.vn", matKhau: "matkhau123" } })).status, 401, "Ba Mẹ nhà khác không gỡ được");
  assert.equal((await dv("go", { tok: token, body: { dinhDanh: "LAN@vidu.vn", matKhau: "matkhau123" } })).body.ok, true);
  assert.equal((await dv("dong-bo", { tok: token, body: {} })).status, 401);
});
