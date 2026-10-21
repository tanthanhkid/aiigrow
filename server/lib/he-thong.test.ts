// Lớp hệ thống do Admin đặt ở /admin có hiệu lực thật: tham số mặc định (dưới gia đình/Con), Allowlist thêm, mẫu nhiệm vụ thêm.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const ad = await import("./admin.ts");
const ch = await import("./cau-hinh.ts");
const la = await import("./luat-app.ts");
const nv = await import("./nhiem-vu.ts");
const g = await import("./gia-dinh.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const admin = async () => {
  await ad.datTaiKhoan({ tenDangNhap: `ad-${Math.random().toString(36).slice(2)}`, matKhau: "mat-khau-thu-10", ten: "Admin", vai: "admin" });
  return { id: "nv-thu", ten_dang_nhap: "ad", ten: "Admin", vai: "admin", quay: "" } as const;
};

test("tham số Admin là lớp đầu: đổi mặc định, gia đình/Con vẫn ghi đè được", async () => {
  const nvAd = await admin();
  const md = ch.thamSo().tran_ngay;
  const moi = md === 60 ? 75 : 60;
  await ad.datThamSo(nvAd, { tran_ngay: moi });
  assert.equal(ch.thamSo().tran_ngay, moi);
  assert.equal(ch.thamSo({ tran_ngay: 45 }).tran_ngay, 45, "gia đình ghi đè hệ thống");
  await ad.datThamSo(nvAd, { tran_ngay: null });
  assert.equal(ch.thamSo().tran_ngay, md);
});

test("Allowlist Admin thêm có hiệu lực ở phân loại; bỏ đi thì hết", async () => {
  const nvAd = await admin();
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  assert.equal((await la.phanLoai(fam, con, "scratch.mit.edu")).loai, "chua_phan_loai");
  await ad.suaAllowlist(nvAd, "scratch.mit.edu", true);
  assert.equal((await la.phanLoai(fam, con, "scratch.mit.edu")).loai, "he_thong");
  assert.ok(la.allowlistHieuLuc().includes("scratch.mit.edu"));
  await ad.suaAllowlist(nvAd, "scratch.mit.edu", false);
  assert.equal((await la.phanLoai(fam, con, "scratch.mit.edu")).loai, "chua_phan_loai");
});

test("mẫu nhiệm vụ Admin thêm (đang bật) vào thư viện khi Ba Mẹ áp mẫu", async () => {
  const nvAd = await admin();
  const id = await ad.themMau(nvAd, { loai: "nhiem_vu", nhom: "nhi", ten: "Tưới cây", diem: 5, nhomNv: "viec_nha", bangChung: "anh" });
  const { fam } = await taoNha();
  await nv.apDungMau(fam, "nhi");
  const { q } = await import("./db.ts");
  assert.ok((await q(`select 1 from tasks where family_id = $1 and ten = 'Tưới cây'`, [fam])).length);
  await ad.batTatMau(nvAd, id, false);
  const nha2 = await taoNha();
  await nv.apDungMau(nha2.fam, "nhi");
  assert.equal((await q(`select 1 from tasks where family_id = $1 and ten = 'Tưới cây'`, [nha2.fam])).length, 0, "mẫu tắt không áp");
});
