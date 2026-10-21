// Cửa hàng + phiếu quà AiiCafe (FR-04.01, 04.03, 04.04, FR-09.02, BRD 6.5, Phụ lục A.4).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const pt = await import("./phan-thuong.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const { q, one } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const THU4 = new Date("2026-10-21T11:00:00Z"), THU7 = new Date("2026-10-24T03:00:00Z");     // 18:00 thứ Tư / 10:00 thứ Bảy giờ VN

test("BRD 6.5: nạp quỹ 200.000đ, Con đổi phiếu 50k ⇒ trừ 500 điểm, QR trong ví, quỹ còn 150.000đ; quét tại quầy một lần", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await v.dieuChinhTay(fam, con, 700, "Điểm thử", bm);
  const vc = await pt.taoQua(fam, { ten: "Phiếu quà AiiCafe 50.000đ", loai: "voucher", diem: 500, menh_gia: 50_000 });
  await loi(pt.doiQua(con, vc, THU4), "quy_thieu");
  assert.equal(await v.soDu(con), 700, "không đổi được thì không trừ điểm");
  assert.equal(await pt.napQuy(fam, 200_000, "Tiền mặt tại quầy", "admin"), 200_000);
  const r = await pt.doiQua(con, vc, THU4);
  assert.equal(r.trang_thai, "da_phat_hanh");
  assert.equal(r.quyConLai, 150_000);
  assert.match(r.voucher!.ma, /^AG[A-Z0-9]{10}$/);
  assert.equal(await v.soDu(con), 200);
  assert.equal((await pt.viQua(con)).voucher[0].trang_thai, "da_phat_hanh");
  const [a, b] = await Promise.all([pt.quetVoucher(r.voucher!.ma, "quay-1"), pt.quetVoucher(r.voucher!.ma.toLowerCase(), "quay-2")]);
  assert.deepEqual([a.ketQua, b.ketQua].sort(), ["da_dung", "hop_le"], "hai lượt quét cùng lúc: chỉ một lượt hợp lệ");
  assert.equal((await pt.quetVoucher(r.voucher!.ma, "quay-1")).ketQua, "da_dung");
  assert.equal((await pt.quetVoucher("AGKHONGCOMA1", "quay-1")).ketQua, "khong_thay");
  const ds = await pt.doiSoat(fam, new Date(Date.now() - 86_400_000), new Date(Date.now() + 86_400_000));
  assert.deepEqual([ds[0].nap, ds[0].phat_hanh, ds[0].da_dung], [200_000, 50_000, 50_000]);
});

test("voucher mệnh giá ≥ 100k chờ Ba Mẹ xác nhận (điểm giữ, quỹ chưa trừ); quét khi chưa phát hành / hết hạn bị từ chối", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bill" });
  await v.dieuChinhTay(fam, con, 2000, "Điểm thử", bm);
  await pt.napQuy(fam, 150_000, "", "admin");
  const lon = await pt.taoQua(fam, { ten: "Phiếu 100k", loai: "voucher", diem: 1000, menh_gia: 100_000 });
  const r = await pt.doiQua(con, lon, THU4);
  assert.equal(r.trang_thai, "cho_xac_nhan");
  const ma = (await one<{ ma: string }>(`select ma from vouchers where redemption_id = $1`, [r.phieu]))!.ma;
  assert.equal((await pt.quetVoucher(ma, "q")).ketQua, "chua_phat_hanh");
  assert.equal((await one<{ quy_voucher: number }>(`select quy_voucher from families where id = $1`, [fam]))!.quy_voucher, 150_000);
  await pt.xacNhanPhieu(fam, r.phieu, bm);
  assert.equal((await one<{ quy_voucher: number }>(`select quy_voucher from families where id = $1`, [fam]))!.quy_voucher, 50_000);
  await q(`update vouchers set het_han = now() - interval '1 minute' where ma = $1`, [ma]);
  assert.equal((await pt.quetVoucher(ma, "q")).ketQua, "het_han");
  // Ba Mẹ huỷ phiếu chờ xác nhận ⇒ hoàn điểm
  const r2 = await pt.doiQua(con, lon, THU4);
  const du = await v.soDu(con);
  await pt.huyPhieu(fam, r2.phieu, bm);
  assert.equal(await v.soDu(con), du + 1000);
});

test("quà vật lý: giữ điểm + tồn kho, Ba Mẹ trao hoặc huỷ hoàn điểm; chỉ cuối tuần; tối đa N lần/tháng; cửa hàng báo thiếu bao nhiêu", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Na" });
  await v.dieuChinhTay(fam, con, 500, "Điểm thử", bm);
  const lego = await pt.taoQua(fam, { ten: "Bộ Lego", loai: "qua", diem: 400, ton_kho: 1 });
  const phim = await pt.taoQua(fam, { ten: "Xem phim", loai: "dac_quyen", diem: 50, chi_cuoi_tuan: true });
  const thucDon = await pt.taoQua(fam, { ten: "Chọn thực đơn", loai: "dac_quyen", diem: 10, toi_da_thang: 1 });
  let ch = await pt.cuaHang(con);
  assert.equal(ch.qua.find((x) => x.id === lego)!.du, true);
  const r = await pt.doiQua(con, lego, THU4);
  assert.equal(r.trang_thai, "cho_trao");
  assert.equal(await v.soDu(con), 100);
  ch = await pt.cuaHang(con);
  assert.ok(!ch.qua.some((x) => x.id === lego), "hết tồn kho thì ẩn");
  await pt.huyPhieu(fam, r.phieu, bm);
  assert.equal(await v.soDu(con), 500);
  assert.ok((await pt.cuaHang(con)).qua.some((x) => x.id === lego), "huỷ trả tồn kho");
  const r2 = await pt.doiQua(con, lego, THU4);
  await pt.xacNhanPhieu(fam, r2.phieu, bm);
  await loi(pt.huyPhieu(fam, r2.phieu, bm), "da_xu_ly");
  await loi(pt.doiQua(con, phim, THU4), "chi_cuoi_tuan");
  assert.equal((await pt.doiQua(con, phim, THU7)).trang_thai, "cho_trao");
  await pt.doiQua(con, thucDon, THU4);
  await loi(pt.doiQua(con, thucDon, THU4), "du_thang");
  ch = await pt.cuaHang(con);
  assert.equal(ch.qua.find((x) => x.id === phim)!.conThieu, 50 - ch.soDu > 0 ? 50 - ch.soDu : 0);
  await loi(pt.doiQua(con, lego, THU4), "het_hang");                             // hết hàng
});
