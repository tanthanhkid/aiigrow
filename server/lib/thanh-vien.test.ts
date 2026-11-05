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

test("L6 mời bằng SĐT: link (token dài, không gõ) ⇒ xem trước không cần đăng nhập ⇒ đăng ký bằng link (OTP) ⇒ vào đúng nhà, đúng quyền; link dùng một lần", async () => {
  const lan = await dangKy("Mẹ Lan");
  const soBa = sdt();
  const moi = await m("thanh-vien/moi", { tok: lan, body: { dinhDanh: `+84${soBa.slice(1)}`, quyen: "ba_me", tenGoi: "Ba Tuấn" } });
  assert.equal(moi.status, 200, JSON.stringify(moi.body));
  assert.match(moi.body.ma, /^[A-Z2-9]{16}$/);
  assert.equal(moi.body.dinhDanh, soBa);
  assert.equal(moi.body.quyen, "ba_me");
  assert.ok(moi.body.lienKet.startsWith("http://app.vidu/moi?ma="));
  assert.ok(moi.body.chiaSe.noiDung.includes(moi.body.lienKet));
  assert.ok(new Date(moi.body.het).getTime() - Date.now() > 71 * 3600_000);
  const con = (await m("con", { tok: lan, body: { ten: "Bảo Anh" } })).body.id;
  const xem = await m(`moi/${moi.body.ma.toLowerCase()}`);
  assert.equal(xem.status, 200, JSON.stringify(xem.body));
  assert.deepEqual([xem.body.tenGiaDinh, xem.body.quyen, xem.body.nguoiMoi, xem.body.tenCon], ["Nhà Mẹ Lan", "ba_me", "Mẹ Lan", ["Bảo Anh"]]);
  // OTP sai ⇒ không vào
  await m("otp", { body: { dinhDanh: soBa } });
  assert.equal((await m("moi/dang-ky", { body: { ma: moi.body.ma, dinhDanh: soBa, otp: "000000", ten: "Ba Tuấn", matKhau: "matkhau123" } })).body.error, "otp_sai");
  const vao = await vaoBangLoiMoi(moi.body.lienKet, "Ba Tuấn", soBa);
  assert.equal(vao.status, 200, JSON.stringify(vao.body));
  const ba = vao.body.token;
  assert.deepEqual((({ quyen, vai, laChuNha }) => ({ quyen, vai, laChuNha }))((await m("toi", { tok: ba })).body.baMe), { quyen: "ba_me", vai: "duyet", laChuNha: false });
  assert.deepEqual((await m("toi", { tok: lan })).body.baMe.laChuNha, true);
  const ds = (await m("thanh-vien", { tok: lan })).body;
  assert.deepEqual(ds.ds.map((x: any) => [x.ten, x.quyen, x.laChuNha, x.vai]), [["Mẹ Lan", "ba_me", true, "chu"], ["Ba Tuấn", "ba_me", false, "duyet"]]);
  assert.equal(ds.loiMoi.length, 0);
  assert.equal((await m(`con/${con}`, { tok: ba })).body.ten, "Bảo Anh");
  // link đã dùng
  assert.equal((await vaoBangLoiMoi(moi.body.ma, "Người khác")).body.error, "ma_moi_da_dung");
  assert.equal((await m(`moi/${moi.body.ma}`)).body.error, "ma_moi_da_dung");
  // app bản cũ: {vai: duyet|xem}, không định danh ⇒ vẫn tạo được (lời mời chỉ qua link)
  const cu = await m("thanh-vien/moi", { tok: lan, body: { vai: "xem" } });
  assert.deepEqual([cu.status, cu.body.quyen, cu.body.vai, cu.body.dinhDanh], [200, "trong_giup", "xem", null]);
});

test("lời mời: hết hạn 72 giờ ⇒ «Gửi lại» ra link mới (link cũ chết), huỷ; mời trùng SĐT thay lời mời cũ; người đã trong nhà; quá 5 lời mời; Người trông giúp không mời được", async () => {
  const hoa = await dangKy("Mẹ Hoa");
  const soBa = sdt();
  const a = (await m("thanh-vien/moi", { tok: hoa, body: { dinhDanh: "ba@vidu.vn", quyen: "trong_giup", tenGoi: "Bà nội" } })).body;
  await q(`update loi_moi set het = now() - interval '1 minute' where id = $1`, [a.id]);
  assert.equal((await m(`moi/${a.ma}`)).status, 410);
  assert.equal((await vaoBangLoiMoi(a.ma, "Bà nội")).body.error, "ma_moi_het_han");
  assert.equal((await m("thanh-vien", { tok: hoa })).body.loiMoi.length, 0, "đã hết hạn ⇒ không còn trong danh sách chờ");
  const lai = (await m(`thanh-vien/moi/${a.id}/gui-lai`, { tok: hoa, body: {} })).body;
  assert.equal(lai.id, a.id);
  assert.notEqual(lai.ma, a.ma);
  assert.equal((await m(`moi/${a.ma}`)).body.error, "ma_moi_sai", "link cũ chết");
  assert.equal((await m(`moi/${lai.ma}`)).status, 200);
  const cho = (await m("thanh-vien", { tok: hoa })).body.loiMoi;
  assert.deepEqual(cho.map((x: any) => [x.dinhDanh, x.quyen, x.tenGoi]), [["ba@vidu.vn", "trong_giup", "Bà nội"]]);
  assert.equal((await m("moi/ZZZZZZZZZZZZZZZZ")).body.error, "ma_moi_sai");
  assert.equal((await m("thanh-vien/moi", { tok: hoa, body: { quyen: "chu" } })).body.error, "quyen_sai");
  assert.equal((await m("thanh-vien/moi", { tok: hoa, body: { quyen: "ba_me", dinhDanh: "abc" } })).body.error, "dinh_danh_sai");
  // mời lại đúng email đó ⇒ lời mời cũ huỷ, chỉ còn một
  const b = (await m("thanh-vien/moi", { tok: hoa, body: { dinhDanh: "BA@vidu.vn", quyen: "ba_me" } })).body;
  assert.deepEqual((await m("thanh-vien", { tok: hoa })).body.loiMoi.map((x: any) => [x.id, x.quyen]), [[b.id, "ba_me"]]);
  assert.equal((await m(`moi/${lai.ma}`)).body.error, "ma_moi_sai");
  assert.equal((await m(`thanh-vien/moi/${b.id}/huy`, { tok: hoa, body: {} })).status, 200);
  assert.equal((await m(`thanh-vien/moi/${b.id}/gui-lai`, { tok: hoa, body: {} })).status, 404, "đã huỷ thì không gửi lại");
  // mời chính mình / người đã trong nhà
  const toi = (await m("toi", { tok: hoa })).body.baMe.dinhDanh;
  assert.equal((await m("thanh-vien/moi", { tok: hoa, body: { quyen: "ba_me", dinhDanh: toi } })).body.error, "da_trong_nha");
  for (let i = 0; i < 5; i++) assert.equal((await m("thanh-vien/moi", { tok: hoa, body: { quyen: "trong_giup", dinhDanh: sdt() } })).status, 200);
  assert.equal((await m("thanh-vien/moi", { tok: hoa, body: { quyen: "trong_giup", dinhDanh: sdt() } })).body.error, "qua_nhieu_loi_moi");
  // Ba Mẹ (không phải người tạo nhà) mời được; Người trông giúp thì không
  const ds = (await m("thanh-vien", { tok: hoa })).body.loiMoi;
  for (const x of ds.slice(0, 2)) await m(`thanh-vien/moi/${x.id}/huy`, { tok: hoa, body: {} });
  const c = (await m("thanh-vien/moi", { tok: hoa, body: { quyen: "ba_me", dinhDanh: soBa } })).body;
  const ba = (await vaoBangLoiMoi(c.ma, "Ba Tú", soBa)).body.token;
  assert.equal((await m("thanh-vien/moi", { tok: ba, body: { quyen: "trong_giup", dinhDanh: sdt() } })).status, 200);
  const d = (await m("thanh-vien/moi", { tok: ba, body: { quyen: "trong_giup" } })).body;
  const ba2 = (await vaoBangLoiMoi(d.ma, "Bà ngoại")).body.token;
  assert.equal((await m("thanh-vien/moi", { tok: ba2, body: { quyen: "trong_giup", dinhDanh: sdt() } })).body.error, "chi_xem");
});

test("L6 hai quyền: đổi quyền / mời ra do Ba Mẹ; không đụng người tạo nhà; Người trông giúp xem, duyệt, khoá máy nhưng không đổi cài đặt", async () => {
  const mai = await dangKy("Mẹ Mai");
  const so = sdt(), soBa = sdt();
  const ong = (await vaoBangLoiMoi((await m("thanh-vien/moi", { tok: mai, body: { quyen: "ba_me", tenGoi: "Ông" } })).body.ma, "Ông ngoại", so)).body.token;
  const ba = (await vaoBangLoiMoi((await m("thanh-vien/moi", { tok: mai, body: { quyen: "ba_me" } })).body.ma, "Ba Huy", soBa)).body.token;
  const ds = (await m("thanh-vien", { tok: mai })).body.ds;
  const idMai = ds.find((x: any) => x.laChuNha).id, idOng = ds.find((x: any) => x.ten === "Ông ngoại").id;
  // Ba Mẹ không phải người tạo nhà vẫn đổi quyền người khác được; tên đường cũ /vai + giá trị cũ «xem» vẫn hiểu
  assert.equal((await m(`thanh-vien/${idOng}/vai`, { tok: ba, body: { vai: "xem" } })).body.quyen, "trong_giup");
  assert.equal((await m(`thanh-vien/${idOng}/quyen`, { tok: mai, body: { quyen: "trong_giup" } })).body.quyen, "trong_giup");
  // không ai đổi / mời ra người tạo nhà; không tự đổi mình
  assert.equal((await m(`thanh-vien/${idMai}/quyen`, { tok: ba, body: { quyen: "trong_giup" } })).body.error, "khong_doi_chu");
  assert.equal((await m(`thanh-vien/${idMai}/moi-ra`, { tok: ba, body: {} })).body.error, "khong_doi_chu");
  assert.equal((await m(`thanh-vien/${idMai}/quyen`, { tok: mai, body: { quyen: "trong_giup" } })).body.error, "khong_tu_doi");
  // Người trông giúp: đổi cài đặt ⇒ 403; xem / khoá máy / thông báo được
  const con = (await m("con", { tok: mai, body: { ten: "Ken" } })).body.id;
  assert.equal((await m("con", { tok: ong, body: { ten: "X" } })).body.error, "chi_xem");
  assert.equal((await m(`con/${con}/che-do-chan`, { tok: ong, body: { cheDo: "mo_het" } })).body.error, "chi_xem");
  assert.equal((await m("cau-hinh", { tok: ong, body: { tran_ngay: 30 } })).body.error, "chi_xem");
  assert.equal((await m(`con/${con}`, { tok: ong })).status, 200);
  assert.equal((await m(`con/${con}/khoa`, { tok: ong, body: { khoa: true } })).status, 200, "khoá máy được");
  assert.equal((await m(`con/${con}/khoa`, { tok: ong, body: { khoa: false } })).status, 200);
  assert.equal((await m("thong-bao", { tok: ong })).status, 200);
  assert.equal((await m("thong-bao/doc", { tok: ong, body: {} })).status, 200);
  assert.equal((await m(`thanh-vien/${idMai}/moi-ra`, { tok: ong, body: {} })).status, 403);
  // gia đình khác không đụng được
  const la = await dangKy("Người lạ");
  assert.equal((await m(`thanh-vien/${idOng}/moi-ra`, { tok: la, body: {} })).body.error, "khong_thay");
  assert.equal((await m(`thanh-vien/${idOng}/moi-ra`, { tok: ba, body: {} })).status, 200);
  assert.equal((await m("toi", { tok: ong })).status, 401);
  assert.equal((await m("dang-nhap", { body: { dinhDanh: so, matKhau: "matkhau123" } })).status, 401);
  assert.deepEqual((await m("thanh-vien", { tok: mai })).body.ds.map((x: any) => x.ten), ["Mẹ Mai", "Ba Huy"]);
  assert.equal((await m("otp", { body: { dinhDanh: so } })).status, 200, "số cũ đăng ký lại được");
  // «Rời nhà»: Ba Huy rời ⇒ sang nhà trống của riêng mình; người tạo nhà không «rời» được
  assert.equal((await m("thanh-vien/roi-nha", { tok: mai, body: {} })).body.error, "chu_khong_roi");
  assert.equal((await m("thanh-vien/roi-nha", { tok: ba, body: {} })).status, 200);
  assert.equal((await m("gia-dinh", { tok: ba })).body.ten, "Nhà Ba Huy");
  assert.equal((await m("toi", { tok: ba })).body.baMe.laChuNha, true);
  assert.deepEqual((await m("thanh-vien", { tok: mai })).body.ds.map((x: any) => x.ten), ["Mẹ Mai"]);
});

test("L6 tự thấy lời mời: đăng ký / đăng nhập bằng đúng SĐT được mời ⇒ trả kèm lời mời ⇒ «Vào nhà» một lệnh (moi/nhan {id}); tài khoản có dữ liệu thì không", async () => {
  const thu = await dangKy("Mẹ Thu");
  const so = sdt();
  const moi = (await m("thanh-vien/moi", { tok: thu, body: { dinhDanh: so, quyen: "trong_giup", tenGoi: "Ba Long" } })).body;
  await m("con", { tok: thu, body: { ten: "Bảo Minh" } });
  const otp = await m("otp", { body: { dinhDanh: so } });
  const dk = (await m("dang-ky", { body: { dinhDanh: so, ma: otp.body.ma, ten: "Ba Long", matKhau: "matkhau123" } })).body;
  assert.deepEqual(dk.loiMoi.map((x: any) => [x.id, x.nguoiMoi, x.quyen, x.tenCon]), [[moi.id, "Mẹ Thu", "trong_giup", ["Bảo Minh"]]]);
  const dn = (await m("dang-nhap", { body: { dinhDanh: so, matKhau: "matkhau123" } })).body;
  assert.equal(dn.loiMoi.length, 1);
  const ba = dk.token;
  assert.equal((await m("moi/cho-toi", { tok: ba })).body.ds.length, 1);
  // người khác không nhận được lời mời không phải của mình bằng id
  const la = await dangKy("Người lạ");
  assert.equal((await m("moi/nhan", { tok: la, body: { id: moi.id } })).body.error, "ma_moi_sai");
  assert.deepEqual((await m("moi/nhan", { tok: ba, body: { id: moi.id } })).body, { quyen: "trong_giup", vai: "xem" });
  assert.equal((await m("toi", { tok: ba })).body.baMe.quyen, "trong_giup");
  assert.equal((await m("gia-dinh", { tok: ba })).body.ten, "Nhà Mẹ Thu");
  assert.equal((await m("moi/cho-toi", { tok: ba })).body.ds.length, 0);
  // nhận bằng link (ma) vẫn được; tài khoản đã có Con thì không chuyển
  const moi2 = (await m("thanh-vien/moi", { tok: thu, body: { quyen: "ba_me" } })).body;
  const co = await dangKy("Bà có dữ liệu");
  await m("con", { tok: co, body: { ten: "Bé" } });
  assert.equal((await m("moi/nhan", { tok: co, body: { ma: moi2.ma } })).body.error, "gia_dinh_co_du_lieu");
  assert.equal((await m("moi/nhan", { tok: ba, body: { ma: moi2.ma } })).body.error, "da_trong_gia_dinh");
  const ba3 = await dangKy("Ba Ba");
  assert.equal((await m("moi/nhan", { tok: ba3, body: { ma: moi2.ma } })).body.quyen, "ba_me");
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
