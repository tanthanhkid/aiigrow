// Ba Mẹ: đăng ký SĐT/email + OTP, đăng nhập, khoá sau 5 lần sai, quên mật khẩu, phiên (FR-01.01, BRD mục 9).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test"; // PGlite trong bộ nhớ, OTP chế độ thử
delete process.env.DATABASE_URL;
const a = await import("./auth.ts");
const { q, one } = await import("./db.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);

test("chuẩn hoá số điện thoại / email", () => {
  for (const s of ["0912345678", "+84912345678", "84912345678", "091 234 5678", "091.234.5678"]) assert.equal(a.chuanDinhDanh(s), "0912345678", s);
  assert.equal(a.chuanDinhDanh(" Lan@Vidu.VN "), "lan@vidu.vn");
  for (const s of ["", "123", "091234567", "lan@", null]) assert.equal(a.chuanDinhDanh(s), null, String(s));
});

test("đăng ký: OTP đúng ⇒ gia đình mới, Ba Mẹ là Chủ gia đình; OTP sai / dùng lại bị chặn", async () => {
  const { ma } = await a.guiOtp("0901000001", "dang_ky");
  assert.match(ma!, /^\d{6}$/);
  await loi(a.dangKy({ dinhDanh: "0901000001", ma: "000000" === ma ? "111111" : "000000", ten: "Lan", matKhau: "matkhau123" }), "otp_sai");
  await loi(a.dangKy({ dinhDanh: "0901000001", ma, ten: "Lan", matKhau: "ngan" }), "mk_ngan");
  const id = await a.dangKy({ dinhDanh: "+84 901 000 001", ma, ten: "Chị Lan", matKhau: "matkhau123" });
  const p = (await one<{ vai: string; family_id: string }>(`select vai, family_id from parents where id = $1`, [id]))!;
  assert.equal(p.vai, "chu");
  assert.equal((await one<{ ten: string }>(`select ten from families where id = $1`, [p.family_id]))!.ten, "Nhà Chị Lan");
  await loi(a.dangKy({ dinhDanh: "0901000001", ma, ten: "Lan", matKhau: "matkhau123" }), "otp_het_han");      // mã đã dùng
  await loi(a.guiOtp("0901000001", "dang_ky"), "da_co_tai_khoan");
});

test("OTP nhập sai quá 5 lần thì phải gửi lại mã", async () => {
  const { ma } = await a.guiOtp("lan2@vidu.vn", "dang_ky");
  const sai = ma === "123456" ? "654321" : "123456";
  for (let i = 0; i < 5; i++) await loi(a.dangKy({ dinhDanh: "lan2@vidu.vn", ma: sai, ten: "Lan", matKhau: "matkhau123" }), "otp_sai");
  await loi(a.dangKy({ dinhDanh: "lan2@vidu.vn", ma, ten: "Lan", matKhau: "matkhau123" }), "otp_qua_so_lan");
  await q(`update otp set het = now() - interval '1 minute' where dinh_danh = 'lan2@vidu.vn'`);
  await loi(a.dangKy({ dinhDanh: "lan2@vidu.vn", ma, ten: "Lan", matKhau: "matkhau123" }), "otp_het_han");
});

test("đăng nhập + phiên; sai 5 lần liền ⇒ tạm khoá; quên mật khẩu đặt lại và đăng xuất mọi máy", async () => {
  const { ma } = await a.guiOtp("0901000002", "dang_ky");
  const id = await a.dangKy({ dinhDanh: "0901000002", ma, ten: "Anh Bảo", matKhau: "matkhau123" });
  assert.equal(await a.dangNhap("0901000002", "matkhau123"), id);
  const tok = await a.taoPhien(id);
  assert.equal((await a.baMeTuToken(tok))!.ten, "Anh Bảo");
  assert.equal(await a.baMeTuToken("sai"), null);
  await loi(a.dangNhap("0909999999", "matkhau123"), "sai_dang_nhap");          // không lộ số nào có tài khoản
  for (let i = 0; i < 5; i++) await loi(a.dangNhap("0901000002", "sai-mat-khau"), "sai_dang_nhap");
  await loi(a.dangNhap("0901000002", "matkhau123"), "tam_khoa");
  // quên mật khẩu: số không có tài khoản cũng trả như thường (không lộ), không có mã
  assert.equal((await a.guiOtp("0909999999", "quen_mk")).ma, undefined);
  const r = await a.guiOtp("0901000002", "quen_mk");
  await a.datLaiMatKhau("0901000002", r.ma, "matkhaumoi1");
  assert.equal(await a.baMeTuToken(tok), null, "đặt lại mật khẩu ⇒ phiên cũ chết");
  assert.equal(await a.dangNhap("0901000002", "matkhaumoi1"), id, "đặt lại cũng gỡ tạm khoá");
});
