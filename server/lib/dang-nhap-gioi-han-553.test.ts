// #553: đăng nhập mật khẩu (Ba Mẹ + Nhân viên/Admin) — trần theo IP (IPv6 gộp /64), khoá theo cặp (tài khoản, IP) luỹ tiến, không khoá cứng
// tài khoản. Phần lib truyền mốc giờ cố định; phần API đi qua đúng bộ định tuyến (api-m.ts, api-admin.ts) với header x-real-ip.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const a = await import("./auth.ts");
const ad = await import("./admin.ts");
const gh = await import("./gioi-han-dang-nhap.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyAdmin } = await import("./api-admin.ts");
const { q, one } = await import("./db.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const T = Date.parse("2030-03-01T08:01:00Z");          // đầu một khung 15 phút
const PHUT = 60_000;

async function taoBaMe(dd: string, mk = "matkhau123") {
  const { ma } = await a.guiOtp(dd, "dang_ky", `otp-${dd}`);
  return a.dangKy({ dinhDanh: dd, ma, ten: "Ba", matKhau: mk });
}

test("khoá theo cặp (tài khoản, IP): kẻ lạ sai 5 lần chỉ khoá chính nó, chủ tài khoản ở IP khác vẫn vào", async () => {
  const id = await taoBaMe("0902553001");
  for (let i = 0; i < 5; i++) await loi(a.dangNhap("0902553001", "sai-sai-sai", "6.6.6.6", T + i * 1000), "sai_dang_nhap");
  await loi(a.dangNhap("0902553001", "matkhau123", "6.6.6.6", T + 10_000), "tam_khoa");          // nguồn tấn công bị khoá, kể cả mật khẩu đúng
  assert.equal(await a.dangNhap("0902553001", "matkhau123", "1.1.1.1", T + 10_000), id);           // chủ thật ở mạng khác: vào bình thường
  // hết 15 phút ⇒ nguồn kia thử lại được
  assert.equal(await a.dangNhap("0902553001", "matkhau123", "6.6.6.6", T + 16 * PHUT), id);
});

test("khoá luỹ tiến 15 phút → 1 giờ → 24 giờ; báo đúng thời gian chờ", async () => {
  await taoBaMe("0902553002");
  const ip = "7.7.7.7";
  let t = T;
  const sai5 = async () => { for (let i = 0; i < 5; i++) await loi(a.dangNhap("0902553002", "sai-sai-sai", ip, t + i), "sai_dang_nhap"); };
  const thongBao = async (luc: number) => {
    try { await a.dangNhap("0902553002", "matkhau123", ip, luc); } catch (e) { return e as { ma: string; message: string }; }
    throw new Error("phải bị khoá");
  };
  await sai5();
  assert.match((await thongBao(t + 1000)).message, /15 phút/);
  t += 16 * PHUT; await sai5();
  assert.match((await thongBao(t + 1000)).message, /60 phút/);
  t += 61 * PHUT; await sai5();
  const e = await thongBao(t + 1000);
  assert.equal(e.ma, "tam_khoa"); assert.match(e.message, /24 giờ/);
  await loi(a.dangNhap("0902553002", "matkhau123", ip, t + 23 * 60 * PHUT), "tam_khoa");
});

test("sai thưa (cách nhau > 15 phút) không cộng dồn; đăng nhập đúng xoá bộ đếm", async () => {
  const id = await taoBaMe("0902553003");
  for (let i = 0; i < 8; i++) await loi(a.dangNhap("0902553003", "sai-sai-sai", "8.8.8.8", T + i * 16 * PHUT), "sai_dang_nhap");
  const t = T + 8 * 16 * PHUT;
  for (let i = 0; i < 4; i++) await loi(a.dangNhap("0902553003", "sai-sai-sai", "8.8.8.9", t + i), "sai_dang_nhap");
  assert.equal(await a.dangNhap("0902553003", "matkhau123", "8.8.8.9", t + 10), id);
  for (let i = 0; i < 4; i++) await loi(a.dangNhap("0902553003", "sai-sai-sai", "8.8.8.9", t + 20 + i), "sai_dang_nhap");
  assert.equal(await a.dangNhap("0902553003", "matkhau123", "8.8.8.9", t + 30), id, "4 lần sai sau lần đúng chưa khoá");
});

test("trần theo IP: 30 lượt hỏng / 15 phút cho mọi tài khoản (cả số không tồn tại); đăng nhập đúng không tốn lượt; sang khung mới mở lại", async () => {
  const id = await taoBaMe("0902553004");
  const ip = "9.9.9.9";
  // đăng nhập đúng nhiều lần (nhiều người chung NAT) không tính vào trần
  for (let i = 0; i < 40; i++) assert.equal(await a.dangNhap("0902553004", "matkhau123", ip, T + i), id);
  // dò 30 số khác nhau (mỗi số ≤ 4 lần — chưa khoá cặp nào) ⇒ lượt 31 bị chặn trước khi băm mật khẩu
  for (let i = 0; i < gh.TRAN_IP; i++) await loi(a.dangNhap(`09025541${String(i).padStart(2, "0")}`, "doan-thu-1", ip, T + 100 + i), "sai_dang_nhap");
  await loi(a.dangNhap("0902553099", "doan-thu-1", ip, T + 200), "qua_nhieu_lan");
  await loi(a.dangNhap("0902553004", "matkhau123", ip, T + 201), "qua_nhieu_lan");          // cả tài khoản thật từ IP đó (tới hết khung)
  assert.equal(await a.dangNhap("0902553004", "matkhau123", "9.9.9.10", T + 202), id);      // IP khác không ảnh hưởng
  assert.equal(await a.dangNhap("0902553004", "matkhau123", ip, T + 15 * PHUT), id);       // khung mới
});

test("trần tổng theo IP: xen đăng nhập đúng không «trả» được lượt hỏng; gửi dồn đăng nhập đúng cũng dừng ở 120 / khung", async () => {
  const id = await taoBaMe("0902553006");
  const ip = "9.9.8.8", t = T + 30 * PHUT;
  let chan = 0;
  for (let i = 0; i < 40; i++)
    for (const [dd, mk] of [["0902553006", "matkhau123"], [`09025542${String(i).padStart(2, "0")}`, "doan-thu-2"]]) {
      try { assert.equal(await a.dangNhap(dd, mk, ip, t + i), id); } catch (e) { if ((e as { ma?: string }).ma === "qua_nhieu_lan") chan++; }
    }
  assert.equal(chan, 20, "lượt hỏng thứ 31 trở đi bị chặn (cả lượt đúng xen giữa)");
  const ip2 = "9.9.8.9";
  for (let i = 0; i < gh.TRAN_IP_TONG; i++) assert.equal(await a.dangNhap("0902553006", "matkhau123", ip2, t + i), id);
  await loi(a.dangNhap("0902553006", "matkhau123", ip2, t + 500), "qua_nhieu_lan");
});

test("không lộ tài khoản: số không tồn tại cũng bị khoá cặp như số có thật", async () => {
  for (let i = 0; i < 5; i++) await loi(a.dangNhap("0902553777", "x-x-x-x-x", "5.5.5.5", T + i), "sai_dang_nhap");
  await loi(a.dangNhap("0902553777", "x-x-x-x-x", "5.5.5.5", T + 10), "tam_khoa");
});

test("quên mật khẩu (OTP) gỡ khoá ở mọi nguồn", async () => {
  const id = await taoBaMe("0902553005");
  for (const ip of ["4.4.4.1", "4.4.4.2"]) for (let i = 0; i < 5; i++) await loi(a.dangNhap("0902553005", "sai-sai-sai", ip, T + i), "sai_dang_nhap");
  await loi(a.dangNhap("0902553005", "matkhau123", "4.4.4.1", T + 10), "tam_khoa");
  // quen_mk chỉ phát mã ngoài production — test chạy NODE_ENV=test
  const r = await a.guiOtp("0902553005", "quen_mk", "otp-qmk");
  await a.datLaiMatKhau("0902553005", r.ma, "matkhaumoi9");
  for (const ip of ["4.4.4.1", "4.4.4.2"]) assert.equal(await a.dangNhap("0902553005", "matkhaumoi9", ip, T + 20), id);
});

test("nhân viên / admin: khoá theo cặp + audit «dang_nhap_tam_khoa»; admin ở IP khác vẫn vào; đặt lại tài khoản gỡ khoá", async () => {
  await ad.datTaiKhoan({ tenDangNhap: "admin553", matKhau: "matkhau-admin-1", ten: "Admin", vai: "admin" });
  for (let i = 0; i < 5; i++) await loi(ad.dangNhapNv("admin553", "sai-sai-sai", "admin", "3.3.3.3", T + i), "sai_dang_nhap");
  await loi(ad.dangNhapNv("admin553", "matkhau-admin-1", "admin", "3.3.3.3", T + 10), "tam_khoa");
  assert.ok(await ad.dangNhapNv("admin553", "matkhau-admin-1", "admin", "2.2.2.2", T + 10));
  const au = await one<{ chi_tiet: { ip: string; phut: number } }>(
    `select chi_tiet from audit where hanh_dong = 'dang_nhap_tam_khoa' and chi_tiet->>'tenDangNhap' = 'admin553'`);
  assert.deepEqual([au?.chi_tiet.ip, au?.chi_tiet.phut], ["3.3.3.3", 15]);
  await ad.datTaiKhoan({ tenDangNhap: "admin553", matKhau: "matkhau-admin-2", ten: "Admin", vai: "admin" });
  assert.ok(await ad.dangNhapNv("admin553", "matkhau-admin-2", "admin", "3.3.3.3", T + 20));
});

test("dọn bộ đếm: khung IP cũ, cặp hết khoá, bậc quá 24 giờ", async () => {
  await q(`delete from pin_sai where khoa like 'dn\\_%'`);
  await loi(a.dangNhap("0902553888", "x-x-x-x-x", "1.2.3.4", T), "sai_dang_nhap");
  for (let i = 0; i < 5; i++) await loi(a.dangNhap("0902553889", "x-x-x-x-x", "1.2.3.5", T + i), "sai_dang_nhap");
  const dem = async () => (await one<{ n: number }>(`select count(*)::int as n from pin_sai where khoa like 'dn\\_%'`))!.n;
  assert.equal(await dem(), 9);                  // 2×2 khung IP (hỏng + tổng) + 2 khung tài khoản + 2 cặp + 1 bậc
  assert.equal(await gh.donBoDemDangNhap(T + 5 * PHUT), 0, "khung hiện tại, khoá còn hạn: giữ");
  assert.equal(await gh.donBoDemDangNhap(T + 40 * PHUT), 6, "4 khung IP cũ + 2 cặp hết khoá");
  assert.equal(await gh.donBoDemDangNhap(T + 25 * 60 * PHUT), 2, "khung tài khoản cũ");
  assert.equal(await gh.donBoDemDangNhap(T + 73 * 60 * PHUT), 1, "bậc quá hạn nhớ");
});

test("gửi song song: cặp (tài khoản, IP) chỉ cho ≤ 5 lượt thử mật khẩu, còn lại 429 trước khi băm", async () => {
  await taoBaMe("0902553020");
  const kq = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => a.dangNhap("0902553020", `doan-${i}-xx`, "6.6.7.7", T + 1)));
  const ma = kq.map((x) => (x.status === "rejected" ? (x.reason as { ma: string }).ma : "ok"));
  assert.equal(ma.filter((m) => m === "sai_dang_nhap").length, gh.SAI_KHOA);
  assert.equal(ma.filter((m) => m === "tam_khoa").length, 20 - gh.SAI_KHOA);
  await loi(a.dangNhap("0902553020", "matkhau123", "6.6.7.7", T + 2), "tam_khoa");
});

test("khoá 24 giờ xong bậc vẫn nhớ: lần khoá kế tiếp vẫn 24 giờ, không tụt về 15 phút", async () => {
  await taoBaMe("0902553021");
  const ip = "7.7.8.8";
  let t = T;
  const sai5 = async () => { for (let i = 0; i < 5; i++) await loi(a.dangNhap("0902553021", "sai-sai-sai", ip, t + i), "sai_dang_nhap"); };
  await sai5(); t += 16 * PHUT; await sai5(); t += 61 * PHUT; await sai5();
  t += 24 * 60 * PHUT + PHUT; await sai5();
  await loi(a.dangNhap("0902553021", "matkhau123", ip, t + 23 * 60 * PHUT), "tam_khoa");
});

test("dò phân tán qua nhiều IP: quá 30 lượt sai / giờ trên một tài khoản ⇒ nguồn lạ bị chặn, nguồn quen (đã đăng nhập đúng) vẫn vào", async () => {
  const id = await taoBaMe("0902553022");
  assert.equal(await a.dangNhap("0902553022", "matkhau123", "10.1.1.1", T - 86_400_000), id);      // hôm qua đăng nhập ở nhà
  for (let i = 0; i < gh.TRAN_TK; i++) await loi(a.dangNhap("0902553022", "doan-thu-3", `172.16.${i}.1`, T + i), "sai_dang_nhap");
  await loi(a.dangNhap("0902553022", "matkhau123", "172.16.200.1", T + 100), "tam_khoa");          // nguồn lạ, kể cả mật khẩu đúng
  assert.equal(await a.dangNhap("0902553022", "matkhau123", "10.1.1.1", T + 100), id);             // nhà: vào được
  assert.equal(await a.dangNhap("0902553022", "matkhau123", "172.16.200.1", T + 61 * PHUT), id);   // giờ sau mở lại
});

test("đổi mật khẩu (đang đăng nhập) gỡ khoá đăng nhập ở mọi nguồn", async () => {
  const id = await taoBaMe("0902553023");
  const mxh = await import("./dang-nhap-mxh.ts");
  for (let i = 0; i < 5; i++) await loi(a.dangNhap("0902553023", "sai-sai-sai", "4.4.5.1", T + i), "sai_dang_nhap");
  await loi(a.dangNhap("0902553023", "matkhau123", "4.4.5.1", T + 10), "tam_khoa");
  const tok = await a.taoPhien(id);
  await mxh.doiMatKhau((await a.baMeTuToken(tok))!, { matKhau: "matkhau123", matKhauMoi: "matkhaumoi8" }, null, T + 20);
  assert.equal(await a.dangNhap("0902553023", "matkhaumoi8", "4.4.5.1", T + 30), id);
});

test("quầy đúng mật khẩu mà vào nhầm /admin (403) không tốn lượt IP", async () => {
  await ad.datTaiKhoan({ tenDangNhap: "quay553", matKhau: "matkhau-quay-1", ten: "Quầy", vai: "quay" });
  for (let i = 0; i < gh.TRAN_IP + 5; i++) await loi(ad.dangNhapNv("quay553", "matkhau-quay-1", "admin", "3.3.4.4", T + i), "khong_du_quyen");
  assert.ok(await ad.dangNhapNv("quay553", "matkhau-quay-1", "quay", "3.3.4.4", T + 100));
});

// ------------------------------------------------------------------ API: header x-real-ip, IPv6 gộp /64
const goi = async (f: (req: Request, p: string[]) => Promise<Response>, duong: string, body: unknown, ip: string) => {
  const r = await f(new Request(`http://x/api/${duong}`, {
    method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip }, body: JSON.stringify(body),
  }), duong.split("/"));
  return { status: r.status, body: await r.json() as { error?: string; token?: string } };
};

test("API /api/m/dang-nhap: nguồn tấn công bị 429 tam_khoa, chủ ở IP khác 200; IPv6 cùng /64 tính chung một nguồn", async () => {
  await taoBaMe("0902553010");
  const ke = "2001:db8:1:2::a", keKhac = "2001:db8:1:2:ffff::b", chu = "2001:db8:9:9::1";
  for (let i = 0; i < 5; i++)
    assert.equal((await goi(xuLyM, "dang-nhap", { dinhDanh: "0902553010", matKhau: "sai-sai-sai" }, i % 2 ? ke : keKhac)).status, 401);
  const r = await goi(xuLyM, "dang-nhap", { dinhDanh: "0902553010", matKhau: "matkhau123" }, ke);
  assert.deepEqual([r.status, r.body.error], [429, "tam_khoa"]);
  const r2 = await goi(xuLyM, "dang-nhap", { dinhDanh: "0902553010", matKhau: "matkhau123" }, chu);
  assert.equal(r2.status, 200); assert.ok(r2.body.token);
});

test("API /api/admin/dang-nhap: kẻ lạ không khoá được admin ở mạng khác", async () => {
  await ad.datTaiKhoan({ tenDangNhap: "admin553b", matKhau: "matkhau-admin-1", ten: "Admin", vai: "admin" });
  for (let i = 0; i < 6; i++) await goi(xuLyAdmin, "dang-nhap", { tenDangNhap: "admin553b", matKhau: "sai-sai-sai" }, "203.0.113.5");
  assert.equal((await goi(xuLyAdmin, "dang-nhap", { tenDangNhap: "admin553b", matKhau: "matkhau-admin-1" }, "203.0.113.5")).status, 429);
  const r = await goi(xuLyAdmin, "dang-nhap", { tenDangNhap: "admin553b", matKhau: "matkhau-admin-1" }, "198.51.100.7");
  assert.equal(r.status, 200); assert.ok(r.body.token);
});
