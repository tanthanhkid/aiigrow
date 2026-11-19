// App & web (#262 / #258, 15/11/2026): «Mở hết» / «Theo danh sách», danh sách trắng 2 nhóm «Tính phút» / «Không tính phút», lời xin mở app / web
// trả lời 3 cách (Tính phút / Không tính phút / Bỏ qua) + Hoàn tác + «Thêm luôn», chuyển dữ liệu cũ (luật chặn, giờ ngủ / giờ học), Mở hết không trừ sao.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const la = await import("./luat-app.ts");
const yc = await import("./yeu-cau.ts");
const cd = await import("./che-do-chan.ts");
const { SCHEMA_APP_WEB } = await import("./schema.ts");
const { taoPolicy } = await import("./may-con.ts");
const { chinhSachChung } = await import("./chinh-sach.ts");
const { chinhSachWebCho } = await import("./web.ts");
const { baoCaoTuan } = await import("./bao-cao.ts");
const { homNayDung } = await import("./hom-nay-dung.ts");
const { nhatKyCaNha } = await import("./nhat-ky-ca-nha.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoPhien } = await import("./auth.ts");
const { q, one } = await import("./db.ts");
const { taoNha, luonChoiDuoc } = await import("./test-fixtures/nha.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) => async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};
const m = goi(xuLyM, "m"), dv = goi(xuLyMay, "device");
const tuanThu = { trangThai: "tuan_thu" as const, diem: 100, vanDe: [], khoaGiaiTri: false, moKhanCapDen: null };

test("chuyển dữ liệu: chi_app_duoc_phep / null ⇒ theo_danh_sach, luật «chan» xoá, mục cho phép giữ đúng nhóm, giờ ngủ + giờ học bỏ — chạy lại được", async () => {
  const { fam } = await taoNha();
  const a = await g.taoCon(fam, { ten: "An" }), b = await g.taoCon(fam, { ten: "Bình" }), c = await g.taoCon(fam, { ten: "Chi" });
  await q(`update children set che_do_chan = 'chi_app_duoc_phep', lich = $2::jsonb where id = $1`,
    [a, JSON.stringify({ ngu: { tu: "21:00", den: "06:30" }, hoc: { tu: "08:00", den: "11:00", thu: [1, 2, 3, 4, 5] }, ngayThuong: [{ tu: "17:00", den: "20:00" }] })]);
  await q(`update children set che_do_chan = null where id = $1`, [b]);
  await q(`update children set che_do_chan = 'mo_het' where id = $1`, [c]);
  // dữ liệu cũ: luật «Chặn» (Ba Mẹ gạt tắt / Luôn chặn) + «Cho phép» (hoc + cho_phep) + Học + Giải trí
  for (const [con, muc, loai, nhom] of [[a, "tiktok.com", "chan", "khac"], ["", "facebook.com", "chan", "khac"], [a, "zalo.exe", "hoc", "cho_phep"],
    [a, "khanacademy.org", "hoc", "khac"], [a, "roblox.exe", "giai_tri", "game"]] as const)
    await q(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom) values ($1,$2,$3,$3,$4,$5)`, [fam, con, muc, loai, nhom]);
  for (let lan = 0; lan < 2; lan++) for (const c0 of SCHEMA_APP_WEB) await q(c0);
  const ch = await q<{ id: string; che_do_chan: string; lich: Record<string, unknown> }>(`select id, che_do_chan, lich from children where family_id = $1`, [fam]);
  const theo = Object.fromEntries(ch.map((x) => [x.id, x]));
  assert.deepEqual([theo[a].che_do_chan, theo[b].che_do_chan, theo[c].che_do_chan], ["theo_danh_sach", "theo_danh_sach", "mo_het"]);
  assert.deepEqual(Object.keys(theo[a].lich), ["ngayThuong"], "giờ ngủ + giờ học bỏ, giữ phần khác");
  const luat = await q<{ muc: string; loai: string }>(`select muc, loai from app_rules where family_id = $1 order by muc`, [fam]);
  assert.deepEqual(luat.map((x) => `${x.muc}:${x.loai}`), ["khanacademy.org:hoc", "roblox.exe:giai_tri", "zalo.exe:hoc"]);
  // nhóm danh sách theo phân loại: giai_tri ⇒ Tính phút, còn lại (Học, Cho phép) ⇒ Không tính phút
  const ds = await cd.danhSachCon(fam, a);
  assert.deepEqual(ds.app.tinhPhut.map((x) => x.ten), ["roblox.exe"]);
  assert.deepEqual(ds.app.khongTinhPhut.map((x) => x.ten), ["zalo.exe"]);
  assert.deepEqual(ds.web.khongTinhPhut.map((x) => x.ten), ["khanacademy.org"]);
  assert.equal(ds.cheDo, "theo_danh_sach");
});

test("policy theo chế độ: Theo danh sách = danh sách trắng (agent cũ vẫn đọc cheDoChan/chuaXep); Mở hết = không chặn, không giờ ngủ / học, không lưới", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  assert.equal((await one<{ c: string }>(`select che_do_chan as c from children where id = $1`, [con]))!.c, "theo_danh_sach", "Con mới ở Theo danh sách");
  await la.datLuat(fam, { con, muc: "youtube.com", ten: "youtube.com", loai: "tinh_phut" });
  await la.datLuat(fam, { con, muc: "khanacademy.org", ten: "khanacademy.org", loai: "khong_tinh_phut" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  const dev = (await one<any>(`select * from devices where id = $1`, [may.deviceId]))!;
  let p = await taoPolicy(dev, con, { gioMaySai: false });
  assert.deepEqual([p.cheDo, p.cheDoChan, p.webChiChoPhep], ["theo_danh_sach", "chi_app_duoc_phep", true]);
  assert.deepEqual(p.luat.map((l) => `${l.muc}:${l.loai}`).sort(), ["khanacademy.org:hoc", "youtube.com:giai_tri"]);
  assert.deepEqual(p.lich.ngu, { tu: "00:00", den: "00:00" }, "giờ ngủ «tắt»");
  assert.equal(p.lich.hoc, null);
  let cs = await chinhSachChung(dev, con, tuanThu);
  assert.deepEqual([cs.ungDung.cheDo, cs.ungDung.cheDoChan, cs.ungDung.chuaXep, cs.ungDung.chan.length], ["theo_danh_sach", "chi_app_duoc_phep", "chan", 0]);
  assert.equal(cs.gioHoc, null);
  const w = chinhSachWebCho(p);
  assert.equal(w.cheDo, "chi_cho_phep");
  assert.ok(w.cho.includes("khanacademy.org") && !w.cho.includes("tiktok.com"));
  // app cũ gửi «Chặn» ⇒ bỏ khỏi danh sách (không còn luật chặn)
  const tok = await taoPhien((await one<{ id: string }>(`select id from parents where family_id = $1`, [fam]))!.id);
  assert.equal((await m(tok, "luat", { con, muc: "youtube.com", loai: "chan" })).status, 200);
  assert.equal(await one(`select 1 from app_rules where muc = 'youtube.com'`), undefined);
  // Mở hết
  const r = await m(tok, `con/${con}/che-do`, { cheDo: "mo_het" });
  assert.deepEqual(r.body, { cheDo: "mo_het", cheDoChan: "mo_het", ten: "Mở hết" });
  p = await taoPolicy(dev, con, { gioMaySai: false });
  assert.deepEqual([p.cheDo, p.webChiChoPhep, p.quy, p.webLuonChan], ["mo_het", false, null, []]);
  cs = await chinhSachChung(dev, con, tuanThu);
  assert.equal(cs.ungDung.chuaXep, "cho_phep");
  assert.deepEqual(chinhSachWebCho(p, { moGiaiTri: true }).chan, [], "Mở hết không chặn trang nào");
  // giá trị cũ vẫn nhận; sai ⇒ 400
  assert.equal((await m(tok, `con/${con}/che-do-chan`, { cheDo: "chi_app_duoc_phep" })).body.cheDo, "theo_danh_sach");
  assert.equal((await m(tok, `con/${con}/che-do`, { cheDo: "chan" })).body.error, "che_do_sai");
  assert.equal((await m(tok, `con/${con}`)).body.cheDo, "theo_danh_sach");
  // giờ ngủ / giờ học app cũ gửi lên: nhận, không lưu
  assert.equal((await m(tok, `con/${con}/gio-choi`, { gioNgu: { tu: "21:00", den: "06:30" }, gioHoc: { tu: "08:00", den: "11:00", thu: [1] } })).status, 200);
  assert.deepEqual((await one<{ lich: Record<string, unknown> }>(`select lich from children where id = $1`, [con]))!.lich, {});
});

test("danh sách của Con: thêm (lưới / tên miền), đổi nhóm, bỏ — luật cả nhà chỉ bỏ cho Con này; phút hôm nay", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" }), em = await g.taoCon(fam, { ten: "Bin" });
  const tok = await taoPhien(bm);
  let r = await m(tok, `con/${con}/danh-sach`, { ma: "roblox", nhom: "tinh_phut" });
  assert.equal(r.status, 200);
  assert.equal(r.body.daDat[0].ten, "Roblox");
  r = await m(tok, `con/${con}/danh-sach`, { ds: [{ muc: "https://www.khanacademy.org/math", nhom: "khong_tinh_phut" }, { muc: "y8.com", nhom: "tinh_phut" }] });
  assert.deepEqual(r.body.daDat.map((x: any) => `${x.ten}:${x.nhom}`), ["khanacademy.org:khong_tinh_phut", "y8.com:tinh_phut"]);
  assert.equal((await m(tok, `con/${con}/danh-sach`, { muc: "y8.com", nhom: "chan" })).body.error, "nhom_sai");
  // luật cả nhà (app cũ) — hiện trong danh sách với theoCaNha
  await la.datLuat(fam, { muc: "scratch.mit.edu", ten: "scratch.mit.edu", loai: "hoc" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  await luonChoiDuoc(con);
  await dv(may.token, "dong-bo", { usage: [{ muc: "robloxplayerbeta.exe", phut: 12 }] });
  let ds = (await m(tok, `con/${con}/danh-sach`)).body;
  const roblox = ds.app.tinhPhut.find((x: any) => x.ten === "Roblox");
  assert.ok(roblox.muc.includes("robloxplayerbeta.exe") && roblox.muc.includes("roblox.com"), "app gộp mọi định danh, kể cả tên miền đi kèm");
  assert.equal(roblox.phutHomNay, 12);
  assert.deepEqual(ds.web.tinhPhut.map((x: any) => x.ten), ["y8.com"]);
  assert.deepEqual(ds.web.khongTinhPhut.map((x: any) => [x.ten, x.theoCaNha]).sort(), [["khanacademy.org", false], ["scratch.mit.edu", true]]);
  assert.deepEqual(ds.soMuc, { app: 1, web: 3, tinhPhut: 2 });
  // đổi nhóm cả hàng Roblox
  r = await m(tok, `con/${con}/danh-sach/doi`, { muc: roblox.muc, nhom: "khong_tinh_phut" });
  assert.equal(r.status, 200);
  assert.equal((await la.phanLoai(fam, con, "roblox.com")).loai, "hoc");
  // bỏ trang cả nhà khỏi danh sách của Con này ⇒ em vẫn còn
  r = await m(tok, `con/${con}/danh-sach/bo`, { muc: ["scratch.mit.edu"] });
  assert.equal(r.status, 200);
  assert.equal((await la.phanLoai(fam, con, "scratch.mit.edu")).loai, "chua_phan_loai");
  assert.equal((await la.phanLoai(fam, em, "scratch.mit.edu")).loai, "hoc", "Con khác giữ nguyên");
  ds = (await m(tok, `con/${con}/danh-sach`)).body;
  assert.ok(!ds.web.khongTinhPhut.some((x: any) => x.ten === "scratch.mit.edu"));
  // nhật ký cả nhà có câu đời thường
  const nk = await nhatKyCaNha(fam, { con });
  assert.ok(nk.ds.some((x) => /thêm .* vào danh sách/.test(x.tieu)));
  assert.ok(nk.ds.some((x) => /bỏ scratch\.mit\.edu khỏi danh sách/.test(x.tieu)));
});

test("lời xin mở app / web: Tính phút · Không tính phút · Bỏ qua (+ Hoàn tác 60 giây) · Lời xin đã bỏ qua + Thêm luôn · Con nhận kết quả", async () => {
  const { fam, bm } = await taoNha("Lan");
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  // 1) Không tính phút + lời nhắn
  const a = (await dv(may.token, "xin-duyet", { muc: "https://www.youtube.com/watch?v=1", lyDo: "Con xem video hướng dẫn vẽ ạ" })).body;
  assert.deepEqual([a.trang_thai, a.loai, a.muc], ["cho", "mo_web", "youtube.com"]);
  let ds = (await m(tok, `con/${con}/danh-sach`)).body;
  assert.deepEqual(ds.dangXin.map((x: any) => [x.muc, x.lyDo]), [["youtube.com", "Con xem video hướng dẫn vẽ ạ"]]);
  let r = await m(tok, `yeu-cau/${a.id}/dong-y`, { nhom: "khong_tinh_phut", loiNhan: "Con xem kênh học tiếng Anh thoải mái nhé." });
  assert.deepEqual([r.status, r.body.nhom, r.body.muc], [200, "khong_tinh_phut", "youtube.com"]);
  const lu = await la.luatHienCo(fam, con, "youtube.com");
  assert.deepEqual([lu?.loai, lu?.het], ["hoc", null], "thêm lâu dài vào nhóm Không tính phút");
  const kq = (await dv(may.token, `yeu-cau/${a.id}`)).body;
  assert.deepEqual([kq.status, kq.ketQua, kq.nhom, kq.tenNguoiDuyet, kq.loiNhan, kq.muc], ["duoc", "da_them", "khong_tinh_phut", "Lan", "Con xem kênh học tiếng Anh thoải mái nhé.", "youtube.com"]);
  // 2) Tính phút (app — tên thật máy báo)
  await q(`insert into app_may(device_id, khoa, muc, ten) values ($1, 'roblox', 'robloxplayerbeta.exe', 'Roblox')`, [may.deviceId]);
  const b = (await dv(may.token, "xin-duyet", { muc: "RobloxPlayerBeta.exe" })).body;
  assert.equal(b.loai, "cai_app");
  r = await m(tok, `yeu-cau/${b.id}/dong-y`, { nhom: "tinh_phut", loiNhan: "Chơi xong nhớ làm bài nha con!" });
  assert.equal(r.body.nhom, "tinh_phut");
  const lr = await la.luatHienCo(fam, con, "robloxplayerbeta.exe");
  assert.deepEqual([lr?.loai, lr?.ten], ["giai_tri", "Roblox"]);
  // 3) Bỏ qua ⇒ không ghi gì; Hoàn tác trong 60 giây ⇒ chờ lại
  const c = (await dv(may.token, "xin-duyet", { muc: "tiktok.com" })).body;
  r = await m(tok, `yeu-cau/${c.id}/bo-qua`, {});
  assert.deepEqual([r.status, r.body.trangThai], [200, "bo_qua"]);
  assert.ok(Date.parse(r.body.hoanTacDen) > Date.now());
  assert.equal((await la.phanLoai(fam, con, "tiktok.com")).loai, "chua_phan_loai", "Bỏ qua không ghi gì vào danh sách");
  let kc = (await dv(may.token, `yeu-cau/${c.id}`)).body;
  assert.deepEqual([kc.status, kc.trangThai, kc.ketQua, kc.nhom], ["cho", "cho", "cho", null], "60 giây đầu (còn Hoàn tác) Con vẫn thấy chờ");
  r = await m(tok, `yeu-cau/${c.id}/hoan-tac`, {});
  assert.equal(r.status, 200);
  assert.equal((await one<{ t: string }>(`select trang_thai as t from requests where id = $1`, [c.id]))!.t, "cho");
  // quá 60 giây ⇒ không hoàn tác được
  await yc.boQuaYc(fam, c.id, bm, { loiNhan: "Để cuối tuần nhé" });
  await loi(yc.moLaiYc(fam, c.id, bm, new Date(Date.now() + 61_000)), "khong_mo_lai");
  await q(`update requests set xu_ly_luc = now() - interval '2 minutes' where id = $1`, [c.id]);     // qua 60 giây
  kc = (await dv(may.token, `yeu-cau/${c.id}`)).body;
  assert.deepEqual([kc.status, kc.trangThai, kc.ketQua], ["tu_choi", "bo_qua", "chua_them"], "agent cũ thấy tu_choi");
  // Con thấy «chưa thêm» (màn Con)
  const cua = await yc.dsYcCuaCon(con);
  const dongC = cua.find((x) => x.id === c.id)!;
  assert.deepEqual([dongC.ketQua, dongC.loiNhan, dongC.tenNguoiDuyet], ["chua_them", "Để cuối tuần nhé", "Lan"]);
  // chỉ bỏ qua được lời xin app / web
  const vay = await yc.guiYeuCau(con, null, { loai: "vay_sao", soSao: 10 });
  assert.equal((await m(tok, `yeu-cau/${vay.id}/bo-qua`, {})).body.error, "khong_bo_qua");
  // 4) Lời xin đã bỏ qua ⇒ Thêm luôn
  let bq = (await m(tok, `yeu-cau/bo-qua?con=${con}`)).body;
  assert.deepEqual(bq.ds.map((x: any) => [x.muc, x.kieu, x.tenCon]), [["tiktok.com", "web", "Bảo Anh"]]);
  assert.equal((await m(tok, `con/${con}/danh-sach`)).body.boQua.so, 1);
  r = await m(tok, `yeu-cau/${c.id}/them-luon`, { nhom: "tinh_phut" });
  assert.deepEqual([r.status, r.body.nhom], [200, "tinh_phut"]);
  assert.equal((await la.phanLoai(fam, con, "tiktok.com")).loai, "giai_tri");
  bq = (await m(tok, "yeu-cau/bo-qua")).body;
  assert.deepEqual(bq.ds, [], "đã thêm ⇒ không còn trong danh sách bỏ qua");
  kc = (await dv(may.token, `yeu-cau/${c.id}`)).body;
  assert.deepEqual([kc.ketQua, kc.nhom], ["da_them", "tinh_phut"]);
  // Thêm luôn lần nữa ⇒ đã xử lý
  assert.equal((await m(tok, `yeu-cau/${c.id}/them-luon`, { nhom: "tinh_phut" })).status, 409);
  // Con xin lại sau khi bị bỏ qua ⇒ lời xin mới; dòng bỏ qua cũ không còn hiện
  const d1 = (await dv(may.token, "xin-duyet", { muc: "poki.com" })).body;
  await yc.boQuaYc(fam, d1.id, bm);
  await q(`update events set created_at = now() - interval '2 minutes' where loai = 'bo_qua_yeu_cau'`);
  const d2 = (await dv(may.token, "xin-duyet", { muc: "poki.com", lyDo: "Chơi cùng bạn" })).body;
  assert.notEqual(d2.id, d1.id);
  assert.deepEqual((await yc.dsBoQua(fam, con)).ds, [], "Con đang xin lại ⇒ dòng bỏ qua cũ ẩn");
  // khay Con: tin «Mẹ Lan đã thêm …» / «… chưa thêm … lúc này»
  const { tinCho } = await import("./hoc-vien.ts");
  const tin = (await tinCho(con)).ds;
  assert.ok(tin.some((x) => x.tieu === "Lan đã thêm youtube.com" && /Không tính phút/.test(x.noi)));
  assert.ok(tin.some((x) => x.tieu === "Lan chưa thêm poki.com lúc này"));
  // thông báo + nhật ký Ba Mẹ
  const nk = await nhatKyCaNha(fam, { con });
  assert.ok(nk.ds.some((x) => x.tieu === "Lan thêm youtube.com" && x.nhan === "Không tính phút"));
  assert.ok(nk.ds.some((x) => x.nhan === "Bỏ qua"));
});

test("Mở hết: phút app «Tính phút» không trừ sao; về Theo danh sách thì trừ — báo cáo «Không tính phút», không còn dòng «Grow chặn»", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "An" });
  await luonChoiDuoc(con);
  await v.dieuChinhTay(fam, con, 50, "Thưởng", bm);
  const truoc = await v.soDu(con);
  await la.datLuat(fam, { con, muc: "roblox.exe", ten: "Roblox", loai: "tinh_phut" });
  await la.datLuat(fam, { con, muc: "tudien.exe", ten: "Từ điển", loai: "khong_tinh_phut" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  await cd.datCheDoChan(fam, con, "mo_het", bm);
  await dv(may.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 10 }, { muc: "tudien.exe", phut: 20 }] });
  assert.equal(await v.soDu(con), truoc, "Mở hết: không trừ sao");
  await cd.datCheDoChan(fam, con, "theo_danh_sach", bm);
  await dv(may.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 15 }, { muc: "tudien.exe", phut: 30 }] });
  assert.equal(await v.soDu(con), truoc - 5, "Theo danh sách: 5 phút Roblox thêm = 5 sao; Từ điển không tính");
  const bc = await baoCaoTuan(fam, con, new Date(), true);
  assert.equal(bc.tuanNay.phutKhongTinhPhut, 30);
  assert.equal(bc.tuanNay.phutKhongTinhPhut, bc.tuanNay.phutHoc, "trường cũ cùng số");
  assert.ok(bc.tuanNay.khongTinhPhutTheoNgay.some((x) => x.phut === 30));
  const hn = await homNayDung(fam, con);
  assert.equal(hn.khongTinhPhut.phut, 30);
  assert.equal(hn.hoc.khung, null);
  assert.ok(!hn.biChan.some((x) => x.ly === "grow_chan"));
});

test("review #270: giờ ngủ «tắt» (tu = den) là khung RỖNG ở luật nền tảng — Windows đăng nhập cả ngày, không lý do gio_ngu, router không chặn 24 giờ", async () => {
  const { chuyenDoi, giaiTriLucNay, gioDangNhapWindows, luatMang, lichMo } = await import("./chuyen-doi.ts");
  assert.equal(gioDangNhapWindows({ tu: "00:00", den: "00:00" }), "M-Su,00:00-24:00");
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "An" });
  await v.dieuChinhTay(fam, con, 30, "Thưởng", bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  const dev = (await one<any>(`select * from devices where id = $1`, [may.deviceId]))!;
  for (const gio of ["2026-10-21T22:30:00+07:00", "2026-10-21T03:00:00+07:00", "2026-10-21T18:00:00+07:00"]) {
    const cs = await chinhSachChung(dev, con, tuanThu, new Date(gio));
    const w = chuyenDoi(cs, "windows");
    const ngu = w.muc.find((m) => m.khaNang === "gio_ngu")!;
    assert.deepEqual([ngu.cauHinh!.ngu, ngu.cauHinh!.netUserTimes], [null, "M-Su,00:00-24:00"], gio);
    for (const nen of ["ios", "android", "mac", "mang"] as const) assert.equal(chuyenDoi(cs, nen).muc.find((m) => m.khaNang === "gio_ngu")?.cauHinh?.ngu ?? null, null);
    assert.notEqual(giaiTriLucNay(cs).lyDo, "gio_ngu");
    // khung mở = khung giờ chơi cũ (không bị giờ ngủ trừ thành rỗng) ⇒ router không chặn Internet cả ngày
    assert.ok(lichMo(cs).ngayThuong.length > 0);
    const l = luatMang(cs, { mac: "AA:BB:CC:DD:EE:01" });
    const chanTrongNgay = l.router.filter((r) => r.ngay === "T2-T6").reduce((a, r) => a + (Number(r.den.slice(0, 2)) * 60 + Number(r.den.slice(3))) - (Number(r.tu.slice(0, 2)) * 60 + Number(r.tu.slice(3))), 0);
    assert.ok(chanTrongNgay < 1440, "không chặn 24 giờ");
  }
});

test("review #270: bỏ mục cả nhà / app cũ «Chặn» chỉ loại trừ cho Con đó — luật cả nhà giữ cho máy chung + Con tạo sau; Hoàn tác kiểu cũ không 409", async () => {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const a = await g.taoCon(fam, { ten: "An" }), b = await g.taoCon(fam, { ten: "Bình" });
  await la.datLuat(fam, { muc: "scratch.mit.edu", ten: "scratch.mit.edu", loai: "hoc" });
  assert.equal((await m(tok, `con/${a}/danh-sach/bo`, { muc: "scratch.mit.edu" })).body.bo, 1);
  assert.equal((await la.phanLoai(fam, a, "scratch.mit.edu")).loai, "chua_phan_loai");
  assert.equal((await la.phanLoai(fam, b, "scratch.mit.edu")).loai, "hoc");
  assert.ok(await one(`select 1 from app_rules where family_id = $1 and child_id = '' and muc = 'scratch.mit.edu'`, [fam]), "luật cả nhà giữ nguyên");
  const c = await g.taoCon(fam, { ten: "Chi" });
  assert.equal((await la.phanLoai(fam, c, "scratch.mit.edu")).loai, "hoc", "Con tạo sau vẫn có mục cả nhà");
  assert.ok(!(await cd.danhSachCon(fam, a)).web.khongTinhPhut.some((x) => x.ten === "scratch.mit.edu"));
  const may = await g.ghepMay(await g.taoMaGhep(fam, a, "windows"), "windows", "Laptop");
  const p = await taoPolicy((await one<any>(`select * from devices where id = $1`, [may.deviceId]))!, a, { gioMaySai: false });
  assert.ok(!p.luat.some((l) => l.muc === "scratch.mit.edu"), "policy Con An không có mục đã bỏ");
  // thêm lại cho An ⇒ luật riêng đè loai_tru
  await m(tok, `con/${a}/danh-sach`, { muc: "scratch.mit.edu", nhom: "tinh_phut" });
  assert.equal((await la.phanLoai(fam, a, "scratch.mit.edu")).loai, "giai_tri");
  // app cũ: «Chặn» luật cả nhà cho một Con rồi Hoàn tác (neuLoai chan)
  await la.datLuat(fam, { muc: "khanacademy.org", ten: "khanacademy.org", loai: "hoc" });
  const r = await m(tok, "luat", { con: b, muc: "khanacademy.org", loai: "chan" });
  assert.equal(r.status, 200);
  assert.equal((await la.phanLoai(fam, b, "khanacademy.org")).loai, "chua_phan_loai", "gỡ cả luật cả nhà cho Con đó");
  assert.equal((await la.phanLoai(fam, a, "khanacademy.org")).loai, "hoc");
  const h = await m(tok, "luat/xoa", { con: b, muc: "khanacademy.org", neuLoai: "chan" });
  assert.equal(h.status, 200, "Hoàn tác cũ không 409");
  assert.equal((await la.phanLoai(fam, b, "khanacademy.org")).loai, "hoc", "khôi phục mục");
});

test("review #270: đồng ý kiểu cũ «Lần này» = mở tạm (không báo đã thêm); Bỏ qua chỉ hiện với Con sau 60 giây, Hoàn tác thì thu hồi; Thêm luôn nhận lời xin quá hạn còn «cho»; boQua.so = dsBoQua", async () => {
  const { fam, bm } = await taoNha("Lan");
  const con = await g.taoCon(fam, { ten: "An" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  const a = (await dv(may.token, "xin-duyet", { muc: "y8.com" })).body;
  const r = await m(tok, `yeu-cau/${a.id}/dong-y`, { phanLoai: "giai_tri", phamVi: "lan_nay", phut: 30 });
  assert.deepEqual([r.status, r.body.nhom, r.body.moTam?.phut], [200, undefined, 30]);
  const kq = (await dv(may.token, `yeu-cau/${a.id}`)).body;
  assert.deepEqual([kq.status, kq.ketQua, kq.nhom], ["duoc", "mo_tam", null]);
  // bỏ qua ⇒ 60 giây đầu Con vẫn thấy «chờ», không có tin khay
  const b = (await dv(may.token, "xin-duyet", { muc: "poki.com" })).body;
  await m(tok, `yeu-cau/${b.id}/bo-qua`, { loiNhan: "Để mai nhé" });
  let kb = (await dv(may.token, `yeu-cau/${b.id}`)).body;
  assert.deepEqual([kb.status, kb.ketQua, kb.loiNhan], ["cho", "cho", null]);
  assert.equal((await yc.dsYcCuaCon(con)).find((x) => x.id === b.id)!.ketQua, "cho");
  const { tinCho } = await import("./hoc-vien.ts");
  assert.ok(!(await tinCho(con)).ds.some((x) => /chưa thêm poki/.test(x.tieu)));
  // hoàn tác ⇒ sự kiện bị thu hồi
  await m(tok, `yeu-cau/${b.id}/hoan-tac`, {});
  assert.equal(await one(`select 1 from events where loai = 'bo_qua_yeu_cau' and chi_tiet->>'yeu_cau' = $1`, [b.id]), undefined);
  // bỏ qua lại, giả như đã qua 60 giây ⇒ Con thấy «chưa thêm» + tin khay
  await m(tok, `yeu-cau/${b.id}/bo-qua`, {});
  await q(`update requests set xu_ly_luc = now() - interval '2 minutes' where id = $1`, [b.id]);
  await q(`update events set created_at = now() - interval '2 minutes' where loai = 'bo_qua_yeu_cau' and chi_tiet->>'yeu_cau' = $1`, [b.id]);
  kb = (await dv(may.token, `yeu-cau/${b.id}`)).body;
  assert.deepEqual([kb.status, kb.ketQua], ["tu_choi", "chua_them"]);
  assert.ok((await tinCho(con)).ds.some((x) => x.tieu === "Lan chưa thêm poki.com lúc này"));
  // số «đã bỏ qua» ở danh sách = màn Lời xin đã bỏ qua
  assert.equal((await cd.danhSachCon(fam, con)).boQua.so, (await yc.dsBoQua(fam, con)).ds.length);
  assert.equal((await yc.dsBoQua(fam, con)).ds.length, 1);
  // lời xin quá hạn mà trang_thai còn «cho» ⇒ Thêm luôn được
  const c = (await dv(may.token, "xin-duyet", { muc: "code.org" })).body;
  await q(`update requests set het_han = now() - interval '1 minute' where id = $1`, [c.id]);
  const tl = await m(tok, `yeu-cau/${c.id}/them-luon`, { nhom: "khong_tinh_phut" });
  assert.deepEqual([tl.status, tl.body.nhom], [200, "khong_tinh_phut"]);
  assert.equal((await la.phanLoai(fam, con, "code.org")).loai, "hoc");
});

test("#422 «Xin thêm app / web»: `kieu` quyết loại lời xin — thẻ App nhận tên trần (Ba Mẹ đồng ý ⇒ thêm app theo tên), thẻ Trang web đòi tên miền", async () => {
  const { fam, bm } = await taoNha("Lan");
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const tok = await taoPhien(bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  // thẻ «Trang web»: địa chỉ đầy đủ / có ?… / có cổng ⇒ tên miền, mo_web
  const w = (await dv(may.token, "xin-duyet", { kieu: "web", muc: "https://scratch.mit.edu/projects", lyDo: "Con học làm game trên Scratch ạ" })).body;
  assert.deepEqual([w.trang_thai, w.loai, w.muc], ["cho", "mo_web", "scratch.mit.edu"]);
  assert.deepEqual([(await dv(may.token, "xin-duyet", { kieu: "web", muc: "scratch.mit.edu?lang=vi" })).body.daCo], [true], "cùng trang ⇒ lời xin cũ");
  // gõ không ra tên miền / tên gói app ⇒ lỗi rõ, không tạo lời xin
  for (const sai of ["scratch", "roblox.exe", "127.0.0.1", ""]) {
    const r = await dv(may.token, "xin-duyet", { kieu: "web", muc: sai });
    assert.deepEqual([r.status, r.body.error], [400, "web_sai"], sai);
  }
  assert.equal((await dv(may.token, "xin-duyet", { kieu: "App", muc: "x" })).body.error, "kieu_sai");
  // thẻ «App trên máy»: tên trần vẫn là app, giữ tên như Con thấy; xin lại cùng app ở thẻ Web ⇒ không tạo lời xin thứ hai
  const a = (await dv(may.token, "xin-duyet", { kieu: "app", muc: "Minecraft", ten: "Minecraft" })).body;
  assert.deepEqual([a.loai, a.muc], ["cai_app", "Minecraft"]);
  // không gửi kieu (màn chặn, agent cũ) ⇒ đoán như trước
  const p3 = (await dv(may.token, "xin-duyet", { muc: "Paint3D.exe" })).body;
  assert.deepEqual([p3.loai, p3.muc], ["cai_app", "paint3d.exe"]);
  // Ba Mẹ: «Chờ duyệt» + danh sách của Con hiện đúng loại
  const cho = (await m(tok, "cho-duyet")).body.yeuCau as { id: string; loai: string; gia_tri: string; ly_do: string }[];
  assert.deepEqual(cho.filter((x) => x.id === w.id).map((x) => [x.loai, x.gia_tri, x.ly_do]), [["mo_web", "scratch.mit.edu", "Con học làm game trên Scratch ạ"]]);
  const ds = (await m(tok, `con/${con}/danh-sach`)).body;
  assert.deepEqual(ds.dangXin.map((x: any) => [x.muc, x.kieu]).sort(), [["Minecraft", "app"], ["paint3d.exe", "app"], ["scratch.mit.edu", "web"]]);
  // Ba Mẹ thêm trang web ⇒ Con nhận «đã thêm»
  assert.equal((await m(tok, `yeu-cau/${w.id}/dong-y`, { nhom: "khong_tinh_phut" })).status, 200);
  const kq = (await dv(may.token, `yeu-cau/${w.id}`)).body;
  assert.deepEqual([kq.ketQua, kq.nhom, kq.muc], ["da_them", "khong_tinh_phut", "scratch.mit.edu"]);
  // Ba Mẹ thêm app theo tên ⇒ luật trên exe thật máy đã báo (không phải «tên miền» minecraft), app không bị xếp vào hàng Web
  await q(`insert into app_may(device_id, khoa, muc, ten) values ($1, 'minecraft', 'minecraftlauncher.exe', 'Minecraft')`, [may.deviceId]);
  assert.equal((await m(tok, `yeu-cau/${a.id}/dong-y`, { nhom: "tinh_phut" })).status, 200);
  assert.equal((await la.luatHienCo(fam, con, "minecraftlauncher.exe"))?.loai, "giai_tri");
  assert.equal(await la.luatHienCo(fam, con, "minecraft"), null, "không ghi luật lên mục giả");
  assert.equal((await dv(may.token, `yeu-cau/${a.id}`)).body.ketQua, "da_them");
  const sau = (await m(tok, `con/${con}/danh-sach`)).body;
  const dong: any[] = [];
  JSON.stringify(sau, (_k, v) => { if (v && typeof v === "object" && typeof v.kieu === "string" && typeof v.ten === "string") dong.push(v); return v; });
  assert.ok(dong.some((x) => x.kieu === "app" && x.ten === "Minecraft"), "Minecraft ở hàng App");
  assert.ok(!dong.some((x) => x.kieu === "web" && /minecraft/i.test(x.ten)), "không có hàng Web «minecraft»");
  // thẻ Web nhận trang có dạng giống tên gói (app.diagrams.net) — Con đã chọn Trang web
  assert.equal((await dv(may.token, "xin-duyet", { kieu: "web", muc: "//app.diagrams.net/x" })).body.muc, "app.diagrams.net");
  // app theo tên máy chưa báo ⇒ chờ khớp (app_theo_ten), không lỗi
  const b2 = (await dv(may.token, "xin-duyet", { kieu: "app", muc: "Scratch Desktop" })).body;
  assert.equal((await m(tok, `yeu-cau/${b2.id}/dong-y`, { nhom: "khong_tinh_phut" })).status, 200);
  assert.equal((await one<{ n: number }>(`select count(*)::int as n from app_theo_ten where child_id = $1 and khop_luc is null`, [con]))!.n, 1);
});

test("#425 thẻ App chọn trong lưới: định danh thật (exe, id Store, bundle Mac, package Android) là khoá luật, `ten` chỉ để hiển thị", async () => {
  const { fam, bm } = await taoNha("Lan");
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const tok = await taoPhien(bm);
  const win = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  const mac = await g.ghepMay(await g.taoMaGhep(fam, con, "mac"), "mac", "MacBook");
  const dt = await g.ghepMay(await g.taoMaGhep(fam, con, "android"), "android", "Điện thoại");
  const ca: [string, string, string][] = [
    [win.token, "Minecraft.exe", "Minecraft"],
    [win.token, "Microsoft.MSPaint", "Paint"],          // app Store: id không theo mẫu .exe / com.…
    [mac.token, "ch.protonvpn.mac", "Proton VPN"],      // bundle Mac ngoài mẫu com. / org. …
    [dt.token, "ru.keepcoder.telegram", "Telegram"],    // package Android ngoài mẫu
  ];
  for (const [token, muc, ten] of ca) {
    const x = (await dv(token, "xin-duyet", { kieu: "app", muc, ten, lyDo: "Con cần ạ" })).body;
    assert.deepEqual([x.loai, x.muc], ["cai_app", muc.toLowerCase()], muc);
    const dong = (await m(tok, `con/${con}/danh-sach`)).body.dangXin.find((d: any) => d.id === x.id);
    assert.deepEqual([dong.muc, dong.ten, dong.kieu], [muc.toLowerCase(), ten, "app"], "Ba Mẹ đọc tên, khoá là định danh");
    assert.equal((await m(tok, `yeu-cau/${x.id}/dong-y`, { nhom: "tinh_phut" })).status, 200);
    const lu = await la.luatHienCo(fam, con, muc);
    assert.deepEqual([lu?.loai, lu?.ten], ["giai_tri", ten], `luật trên định danh thật ${muc}`);
    assert.equal(await la.luatHienCo(fam, con, ten), null, `không ghi luật lên tên ${ten}`);
  }
  assert.equal((await one<{ n: number }>(`select count(*)::int as n from app_theo_ten where child_id = $1`, [con]))!.n, 0, "không lời xin nào đi đường theo tên");
  // định danh máy đã báo trùng tên (khác hoa thường) ⇒ vẫn là định danh (app_may), không đi đường theo tên
  await q(`insert into app_may(device_id, khoa, muc, ten) values ($1, 'spotify', 'spotify', 'Spotify')`, [win.deviceId]);
  const sp = (await dv(win.token, "xin-duyet", { kieu: "app", muc: "spotify", ten: "Spotify" })).body;
  assert.equal((await one<{ theo_ten: boolean }>(`select theo_ten from requests where id = $1`, [sp.id]))!.theo_ten, false);
  // gõ tên trần (ten trùng muc / không có ten) vẫn là lời xin theo tên; có ten ⇒ giữ ten Con thấy
  const t = (await dv(win.token, "xin-duyet", { kieu: "app", muc: "Minecraft", ten: "Minecraft" })).body;
  assert.equal((await one<{ theo_ten: boolean }>(`select theo_ten from requests where id = $1`, [t.id]))!.theo_ten, true);
  assert.equal((await dv(win.token, "xin-duyet", { kieu: "app", muc: "Visual Studio Code", ten: "Code" })).body.muc, "Code");
});
