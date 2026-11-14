// Khớp thiết kế 14/11 — Hằng ngày / Báo cáo: «<Con> đã dùng gì» hôm nay (con/:id/hom-nay), Báo cáo «7 ngày qua» (bao-cao?bay=1),
// «Nhật ký cả nhà» (nhat-ky?ca-nha=1).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { datLuat } = await import("./luat-app.ts");
const { q, newId } = await import("./db.ts");
const { gioDiaPhuong, congNgay } = await import("./gio.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");
const { homNayDung, tinhGioCua } = await import("./hom-nay-dung.ts");
const { baoCaoTuan } = await import("./bao-cao.ts");
const { nhatKyCaNha, cauSuKien } = await import("./nhat-ky-ca-nha.ts");
const { ghiSuKien } = await import("./nhat-ky.ts");

const homNay = () => gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").ngay;

async function nha() {
  const { fam, bm } = await taoNha("Mẹ Lan");
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const may = (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop")).deviceId;
  return { fam, bm, con, may };
}

test("tinhGioCua: luật hoc ⇒ dùng thoải mái; giai_tri / chan ⇒ tính giờ; chưa có luật ⇒ theo usage.loai", () => {
  assert.equal(tinhGioCua("giai_tri", { loai: "hoc" }), false);
  assert.equal(tinhGioCua("hoc", { loai: "giai_tri" }), true);
  assert.equal(tinhGioCua("hoc", undefined), false);
  assert.equal(tinhGioCua("chua_phan_loai", undefined), true);
});

test("con/:id/hom-nay: gộp app + web hôm nay, giờ bắt đầu, máy, Chơi/Học theo luật, đang mở, bị chặn hôm nay", async () => {
  const { fam, con, may } = await nha();
  const n = homNay();
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut, dau_luc) values ($1,$2,$3,'robloxplayerbeta.exe','giai_tri',39, now() - interval '40 minutes')`, [may, con, n]);
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut, dau_luc) values ($1,$2,$3,'tudien.exe','chua_phan_loai',10, now() - interval '2 hours')`, [may, con, n]);
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,'robloxplayerbeta.exe','giai_tri',99)`, [may, con, congNgay(n, -1)]);
  await datLuat(fam, { con, muc: "tudien.exe", ten: "Từ điển", loai: "hoc" });
  await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, dau_luc) values ($1,$2,$3,'khanacademy.org',2,600, now() - interval '3 hours')`, [may, con, n]);
  await q(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut) values ($1,$2,$3,'robloxplayerbeta.exe','game',1000,60)`, [newId(), con, may]);
  await q(`insert into requests(id, child_id, device_id, loai, phut, gia_tri, het_han) values ($1,$2,$3,'mo_web',30,'youtube.com', now() + interval '1 hour')`, [newId(), con, may]);
  await q(`insert into requests(id, child_id, device_id, loai, phut, trang_thai, het_han) values ($1,$2,$3,'them_gio',20,'cho', now() + interval '1 hour')`, [newId(), con, may]);

  const r = await homNayDung(fam, con);
  assert.equal(r.ten, "Bảo Anh");
  const rb = r.dung.find((x) => x.muc === "robloxplayerbeta.exe")!;
  assert.equal(rb.phut, 39, "chỉ hôm nay");
  assert.equal(rb.ten, "Roblox");
  assert.equal(rb.may, "Laptop");
  assert.equal(rb.tinhGio, true);
  assert.equal(rb.dangMo, true);
  const td = r.dung.find((x) => x.muc === "tudien.exe")!;
  assert.equal(td.tinhGio, false, "luật hoc ⇒ Học");
  assert.equal(td.ten, "Từ điển");
  assert.ok(r.dung.some((x) => x.kieu === "web" && x.muc === "khanacademy.org" && x.phut === 10));
  assert.equal(r.dung[0].muc, "robloxplayerbeta.exe", "mới bắt đầu trước");
  assert.equal(r.biChan.length, 1, "xin thêm giờ không phải «bị chặn»");
  assert.equal(r.biChan[0].ten, "youtube.com");
  assert.equal(r.biChan[0].ly, "dang_xin");
  assert.ok(r.hoc.phut >= 10);
  assert.equal(typeof r.choi.tongPhut, "number");
});

test("bao-cao?bay=1: cửa sổ 7 ngày tính tới hôm nay; số lần xin thêm giờ / được cho; sao kiếm; máy của app dùng nhiều", async () => {
  const { fam, con, may } = await nha();
  const n = homNay();
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,'robloxplayerbeta.exe','giai_tri',50)`, [may, con, congNgay(n, -6)]);
  await q(`insert into requests(id, child_id, loai, phut, trang_thai, het_han) values ($1,$2,'them_gio',20,'dong_y', now())`, [newId(), con]);
  await q(`insert into requests(id, child_id, loai, phut, trang_thai, het_han) values ($1,$2,'them_gio',20,'tu_choi', now())`, [newId(), con]);
  await q(`insert into points(id, child_id, delta, loai, ly_do) values ($1,$2,30,'nhiem_vu','Dọn phòng')`, [newId(), con]);
  const r = await baoCaoTuan(fam, con, new Date(), true);
  assert.equal(r.tuanNay.giaiTriTheoNgay.length, 7);
  assert.equal(r.tuanNay.giaiTriTheoNgay[6].ngay, n, "ngày cuối = hôm nay");
  assert.equal(r.tuanNay.giaiTriTheoNgay[0].ngay, congNgay(n, -6));
  assert.deepEqual(r.tuanNay.xinThemGio, { so: 2, cho: 1 });
  assert.equal(r.tuanNay.saoKiem, 30);
  assert.equal(r.tuanNay.dungNhieu[0].may, "Laptop");
});

test("nhat-ky?ca-nha=1: câu đời thường, tên người lớn, đếm «cho ngoài quy tắc» theo người, lọc theo con", async () => {
  const { fam, bm, con } = await nha();
  const ba = await taoBaMe(fam, "Bà Hoa", "trong_giup");
  const con2 = await g.taoCon(fam, { ten: "Bảo Minh" });
  await ghiSuKien(fam, "them_gio", { phut: 30 }, { con: con2, nguoi: ba });
  await ghiSuKien(fam, "dong_y_yeu_cau", { loai: "mo_web" }, { con, nguoi: ba });
  await ghiSuKien(fam, "them_gio", { phut: 15 }, { con, nguoi: bm });
  await ghiSuKien(fam, "duyet_nhiem_vu", { ten: "Xếp cặp", diem: 10 }, { con, nguoi: bm });
  await ghiSuKien(fam, "doi_che_do_chan", { tu: "mo_het", sang: "chi_app_duoc_phep" }, { con, nguoi: bm });
  await ghiSuKien(fam, "mo_phien", { muc: "x" }, { con });          // kỹ thuật ⇒ không hiện

  const r = await nhatKyCaNha(fam);
  assert.equal(r.soNgay, 7);
  assert.equal(r.ds.length, 5);
  assert.equal(r.ngoaiQuyTac.so, 3);
  assert.deepEqual(r.ngoaiQuyTac.theoNguoi, [{ ten: "Bà Hoa", so: 2 }, { ten: "Mẹ Lan", so: 1 }]);
  assert.ok(r.ds.some((x) => x.tieu === "Mẹ Lan duyệt «Xếp cặp»" && x.nhan === "+10" && x.kieu === "tot"));
  assert.ok(r.ds.some((x) => x.tieu === "Bà Hoa cho thêm 30 phút" && x.nhan === "Ngoài quy tắc" && x.tenCon === "Bảo Minh"));
  assert.ok(r.ds.every((x) => /^\d\d:\d\d/.test(x.phu)));
  const chiCon = await nhatKyCaNha(fam, { con: con2 });
  assert.equal(chiCon.ds.length, 1);
  assert.equal(cauSuKien("mo_phien", {}, null), null);
});
