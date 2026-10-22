// Thành viên gia đình (FR-01.04) + thông báo trong app cho Ba Mẹ (FR-08.01) — qua API /api/m/* như app gọi.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { q } = await import("./db.ts");
const tb = await import("./thong-bao.ts");
const { ghiSuKien, canhBao } = await import("./nhat-ky.ts");

type Kq = { status: number; body: any };
const m = async (duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> => {
  const req = new Request(`http://app.vidu/api/m/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyM(req, duong.split("/"));
  return { status: r.status, body: await r.json() };
};
let soDt = 0;
const sdt = () => `0933${String(++soDt).padStart(6, "0")}`;
async function dangKy(ten: string, so = sdt()) {
  const otp = await m("otp", { body: { dinhDanh: so } });
  const r = await m("dang-ky", { body: { dinhDanh: so, ma: otp.body.ma, ten, matKhau: "matkhau123" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token as string;
}
async function vaoBangLoiMoi(ma: string, ten: string, so = sdt()) {
  const otp = await m("otp", { body: { dinhDanh: so } });
  return m("moi/dang-ky", { body: { ma, dinhDanh: so, otp: otp.body.ma, ten, matKhau: "matkhau123" } });
}

test("mời thành viên: Chủ tạo mã ⇒ xem trước không cần đăng nhập ⇒ đăng ký bằng mã (OTP) ⇒ vào đúng nhà, đúng vai; mã dùng một lần", async () => {
  const chu = await dangKy("Mẹ Lan");
  const moi = await m("thanh-vien/moi", { tok: chu, body: { vai: "duyet", tenGoi: "Ba Huy" } });
  assert.equal(moi.status, 200, JSON.stringify(moi.body));
  assert.match(moi.body.ma, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(moi.body.lienKet.startsWith("http://app.vidu/moi?ma="));
  assert.ok(new Date(moi.body.het).getTime() - Date.now() > 71 * 3600_000);
  // xem trước: nhận cả chữ thường, không gạch (đăng ký nhận cả link)
  const xem = await m(`moi/${moi.body.ma}`);
  assert.equal(xem.status, 200, JSON.stringify(xem.body));
  assert.deepEqual([xem.body.tenGiaDinh, xem.body.vai, xem.body.nguoiMoi], ["Nhà Mẹ Lan", "duyet", "Mẹ Lan"]);
  assert.equal((await m(`moi/${moi.body.ma.toLowerCase().replace("-", "")}`)).status, 200);
  // OTP sai ⇒ không vào
  const so = sdt();
  await m("otp", { body: { dinhDanh: so } });
  assert.equal((await m("moi/dang-ky", { body: { ma: moi.body.ma, dinhDanh: so, otp: "000000", ten: "Ba Huy", matKhau: "matkhau123" } })).body.error, "otp_sai");
  const vao = await vaoBangLoiMoi(moi.body.lienKet, "Ba Huy");
  assert.equal(vao.status, 200, JSON.stringify(vao.body));
  const ba = vao.body.token;
  assert.equal((await m("toi", { tok: ba })).body.baMe.vai, "duyet");
  const ds = (await m("thanh-vien", { tok: chu })).body;
  assert.deepEqual(ds.ds.map((x: any) => [x.ten, x.vai]), [["Mẹ Lan", "chu"], ["Ba Huy", "duyet"]]);
  assert.equal(ds.loiMoi.length, 0);
  // cùng gia đình: Ba thấy Con do Mẹ tạo
  const con = (await m("con", { tok: chu, body: { ten: "Ken" } })).body.id;
  assert.equal((await m(`con/${con}`, { tok: ba })).body.ten, "Ken");
  // mã đã dùng
  assert.equal((await vaoBangLoiMoi(moi.body.ma, "Người khác")).body.error, "ma_moi_da_dung");
  assert.equal((await m(`moi/${moi.body.ma}`)).body.error, "ma_moi_da_dung");
});

test("lời mời hết hạn sau 72 giờ, huỷ được; chỉ Chủ mời; mã sai; quá 5 lời mời chờ", async () => {
  const chu = await dangKy("Mẹ Hoa");
  const a = (await m("thanh-vien/moi", { tok: chu, body: { vai: "xem", tenGoi: "Bà nội" } })).body;
  await q(`update loi_moi set het = now() - interval '1 minute' where id = $1`, [a.id]);
  assert.equal((await m(`moi/${a.ma}`)).status, 410);
  assert.equal((await vaoBangLoiMoi(a.ma, "Bà nội")).body.error, "ma_moi_het_han");
  assert.equal((await m("moi/ZZZZ-ZZZZ")).body.error, "ma_moi_sai");
  assert.equal((await m("thanh-vien/moi", { tok: chu, body: { vai: "chu" } })).body.error, "vai_sai");
  const b = (await m("thanh-vien/moi", { tok: chu, body: { vai: "duyet" } })).body;
  assert.equal((await m("thanh-vien", { tok: chu })).body.loiMoi.length, 1);
  assert.equal((await m(`thanh-vien/moi/${b.id}/huy`, { tok: chu, body: {} })).status, 200);
  assert.equal((await vaoBangLoiMoi(b.ma, "Ba")).body.error, "ma_moi_sai");
  for (let i = 0; i < 5; i++) assert.equal((await m("thanh-vien/moi", { tok: chu, body: { vai: "xem" } })).status, 200);
  assert.equal((await m("thanh-vien/moi", { tok: chu, body: { vai: "xem" } })).body.error, "qua_nhieu_loi_moi");
  // thành viên Phê duyệt không mời được; Chỉ xem bị chặn mọi POST (trừ thông báo)
  const ds = (await m("thanh-vien", { tok: chu })).body.loiMoi;
  await m(`thanh-vien/moi/${ds[0].id}/huy`, { tok: chu, body: {} });
  const c = (await m("thanh-vien/moi", { tok: chu, body: { vai: "duyet" } })).body;
  const ba = (await vaoBangLoiMoi(c.ma, "Ba Tú")).body.token;
  assert.equal((await m("thanh-vien/moi", { tok: ba, body: { vai: "xem" } })).body.error, "chi_chu");
});

test("đổi vai, mời ra: chỉ Chủ; không đụng Chủ; người bị mời ra mất phiên, không đăng nhập lại được; cách ly gia đình", async () => {
  const chu = await dangKy("Mẹ Mai");
  const moi = (await m("thanh-vien/moi", { tok: chu, body: { vai: "duyet", tenGoi: "Ông" } })).body;
  const so = sdt();
  const ong = (await vaoBangLoiMoi(moi.ma, "Ông ngoại", so)).body.token;
  const ds = (await m("thanh-vien", { tok: chu })).body.ds;
  const idChu = ds.find((x: any) => x.vai === "chu").id, idOng = ds.find((x: any) => x.ten === "Ông ngoại").id;
  assert.equal((await m(`thanh-vien/${idOng}/vai`, { tok: chu, body: { vai: "xem" } })).body.vai, "xem");
  assert.equal((await m("con", { tok: ong, body: { ten: "X" } })).body.error, "chi_xem");
  // Chỉ xem vẫn đọc + đánh dấu thông báo được
  assert.equal((await m("thong-bao", { tok: ong })).status, 200);
  assert.equal((await m("thong-bao/doc", { tok: ong, body: {} })).status, 200);
  assert.equal((await m(`thanh-vien/${idChu}/vai`, { tok: chu, body: { vai: "xem" } })).body.error, "khong_tu_doi");
  assert.equal((await m(`thanh-vien/${idChu}/moi-ra`, { tok: ong, body: {} })).status, 403);
  // gia đình khác không đụng được thành viên nhà này
  const la = await dangKy("Người lạ");
  assert.equal((await m(`thanh-vien/${idOng}/moi-ra`, { tok: la, body: {} })).body.error, "khong_thay");
  assert.equal((await m(`thanh-vien/${idOng}/moi-ra`, { tok: chu, body: {} })).status, 200);
  assert.equal((await m("toi", { tok: ong })).status, 401);
  assert.equal((await m("dang-nhap", { body: { dinhDanh: so, matKhau: "matkhau123" } })).status, 401);
  assert.deepEqual((await m("thanh-vien", { tok: chu })).body.ds.map((x: any) => x.vai), ["chu"]);
  // số cũ đăng ký lại được (tài khoản mới, gia đình mới)
  assert.equal((await m("otp", { body: { dinhDanh: so } })).status, 200);
});

test("tài khoản trống nhận lời mời ⇒ chuyển sang nhà mời; tài khoản đã có Con thì không", async () => {
  const chu = await dangKy("Mẹ Thu");
  const moi1 = (await m("thanh-vien/moi", { tok: chu, body: { vai: "duyet" } })).body;
  const so = sdt();
  const ba = await dangKy("Ba Long", so);
  assert.equal((await m("moi/nhan", { tok: ba, body: { ma: moi1.ma } })).body.vai, "duyet");
  assert.equal((await m("toi", { tok: ba })).body.baMe.vai, "duyet");
  assert.equal((await m("thanh-vien", { tok: chu })).body.ds.length, 2);
  assert.equal((await m("gia-dinh", { tok: ba })).body.ten, "Nhà Mẹ Thu");
  const moi2 = (await m("thanh-vien/moi", { tok: chu, body: { vai: "xem" } })).body;
  const co = await dangKy("Bà có dữ liệu");
  await m("con", { tok: co, body: { ten: "Bé" } });
  assert.equal((await m("moi/nhan", { tok: co, body: { ma: moi2.ma } })).body.error, "gia_dinh_co_du_lieu");
  assert.equal((await m("moi/nhan", { tok: ba, body: { ma: moi2.ma } })).body.error, "da_trong_gia_dinh");
});

test("thông báo: gộp nộp nhiệm vụ liền nhau, không báo việc chính mình làm, báo việc Ba Mẹ khác làm, đã đọc, cảnh báo", async () => {
  const chu = await dangKy("Mẹ Na");
  const moi = (await m("thanh-vien/moi", { tok: chu, body: { vai: "duyet" } })).body;
  const ba = (await vaoBangLoiMoi(moi.ma, "Ba Nam")).body.token;
  const idBa = (await m("toi", { tok: ba })).body.baMe.id, idChu = (await m("toi", { tok: chu })).body.baMe.id;
  const fam = (await q<{ family_id: string }>(`select family_id from parents where id = $1`, [idChu]))[0].family_id;
  const ken = (await m("con", { tok: chu, body: { ten: "Ken" } })).body.id;
  const bill = (await m("con", { tok: chu, body: { ten: "Bill" } })).body.id;
  await m("thong-bao/doc", { tok: chu, body: {} });
  await new Promise((r) => setTimeout(r, 15));
  for (const ten of ["Rửa chén", "Đọc sách", "Lau sàn"]) await ghiSuKien(fam, "nop_nhiem_vu", { ten, nghi_trung: false }, { con: ken });
  await ghiSuKien(fam, "gui_yeu_cau", { loai: "them_gio", phut: 15 }, { con: bill });
  await ghiSuKien(fam, "duyet_nhiem_vu", { ten: "Rửa chén", diem: 10 }, { con: ken, nguoi: idBa });
  await ghiSuKien(fam, "duyet_nhiem_vu", { ten: "Đọc sách", diem: 10 }, { con: ken, nguoi: idChu });
  await canhBao(fam, "lech_gio", "nghiem_trong", "Giờ trên Laptop của Ken bị lùi 1 giờ", { con: ken });
  const r = (await m("thong-bao", { tok: chu })).body;
  const tieu = r.ds.map((x: any) => x.tieu);
  assert.ok(tieu.includes("Ken vừa nộp 3 nhiệm vụ"), tieu.join(" | "));
  assert.ok(tieu.includes("Bill xin thêm 15 phút"));
  assert.ok(tieu.includes("Ba Nam đã duyệt «Rửa chén» của Ken"));
  assert.ok(!tieu.some((t: string) => t.startsWith("Mẹ Na đã duyệt")), "không báo việc chính mình làm");
  assert.ok(tieu.includes("Giờ trên Laptop của Ken bị lùi 1 giờ"));
  assert.equal(r.ds.find((x: any) => x.tieu === "Ba Nam đã vào gia đình").moi, false, "vào trước lúc đọc ⇒ có nhưng không mới");
  assert.equal(r.ds.find((x: any) => x.so === 3).phu, "Rửa chén · Đọc sách · Lau sàn");
  assert.equal(r.chuaDoc, 4);
  // Ba thấy Mẹ duyệt, không thấy chính mình
  const tieuBa = (await m("thong-bao", { tok: ba })).body.ds.map((x: any) => x.tieu);
  assert.ok(tieuBa.includes("Mẹ Na đã duyệt «Đọc sách» của Ken"));
  assert.ok(!tieuBa.some((t: string) => t.startsWith("Ba Nam đã duyệt")));
  await m("thong-bao/doc", { tok: chu, body: {} });
  assert.equal((await m("thong-bao", { tok: chu })).body.chuaDoc, 0);
  // cách ly gia đình
  const la = await dangKy("Nhà khác");
  assert.equal((await m("thong-bao", { tok: la })).body.ds.length, 0);
});

test("giờ yên lặng + tắt nhóm: không đẩy, TRỪ cảnh báo nghiêm trọng; giờ sai bị từ chối", async () => {
  const chu = await dangKy("Mẹ Yên");
  assert.deepEqual((await m("thong-bao/cai-dat", { tok: chu })).body, { yenLang: { bat: false, tu: "22:00", den: "06:30" }, tat: [] });
  assert.equal((await m("thong-bao/cai-dat", { tok: chu, body: { yenLang: { bat: true, tu: "25:00", den: "06:30" } } })).body.error, "gio_sai");
  const luu = (await m("thong-bao/cai-dat", { tok: chu, body: { yenLang: { bat: true, tu: "22:00", den: "06:30" }, tat: ["qua", "la"] } })).body;
  assert.deepEqual(luu, { yenLang: { bat: true, tu: "22:00", den: "06:30" }, tat: ["qua"] });
  const cd = { yenLang: { bat: true, tu: "22:00", den: "06:30" }, tat: ["qua" as const] };
  const dem = new Date("2026-10-21T16:30:00Z");          // 23:30 giờ VN
  const ngay = new Date("2026-10-21T12:00:00Z");         // 19:00 giờ VN
  const tz = "Asia/Ho_Chi_Minh";
  assert.deepEqual(tb.quyetDinhDay("thong_tin", "nhiem_vu", dem, cd, tz), { day: false, imLang: true });
  assert.deepEqual(tb.quyetDinhDay("nghiem_trong", "canh_bao", dem, cd, tz), { day: true, imLang: false });
  assert.deepEqual(tb.quyetDinhDay("thong_tin", "nhiem_vu", ngay, cd, tz), { day: true, imLang: false });
  assert.deepEqual(tb.quyetDinhDay("thong_tin", "qua", ngay, cd, tz), { day: false, imLang: false });
  assert.deepEqual(tb.quyetDinhDay("nghiem_trong", "qua", ngay, cd, tz), { day: true, imLang: false });
});
