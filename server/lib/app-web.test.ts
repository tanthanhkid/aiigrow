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
  assert.equal((await m(tok, `con/${con}/danh-sach`, { muc: "pornhub.com", nhom: "khong_tinh_phut" })).body.error, "web_cam", "lưới an toàn chung");
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
  assert.deepEqual([kc.status, kc.trangThai, kc.ketQua, kc.nhom], ["tu_choi", "bo_qua", "chua_them", null], "agent cũ thấy tu_choi");
  r = await m(tok, `yeu-cau/${c.id}/hoan-tac`, {});
  assert.equal(r.status, 200);
  assert.equal((await one<{ t: string }>(`select trang_thai as t from requests where id = $1`, [c.id]))!.t, "cho");
  // quá 60 giây ⇒ không hoàn tác được
  await yc.boQuaYc(fam, c.id, bm, { loiNhan: "Để cuối tuần nhé" });
  await loi(yc.moLaiYc(fam, c.id, bm, new Date(Date.now() + 61_000)), "khong_mo_lai");
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
