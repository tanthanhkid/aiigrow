// Luồng đầu-cuối qua API (BRD 6.1–6.5): Ba Mẹ đăng ký → tạo Con → ghép máy → agent đồng bộ nhận Policy → Con làm nhiệm vụ, nộp ảnh →
// Ba Mẹ duyệt → Con thấy điểm → xin thêm giờ → Ba Mẹ đồng ý. Kèm cách ly gia đình, quyền Chỉ xem, token máy không gọi được API Ba Mẹ.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { xuLyCon } = await import("./api-con.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q } = await import("./db.ts");
const { anhGia } = await import("./test-fixtures/nha.ts");

type Kq = { status: number; body: any };
const goi = async (f: typeof xuLyM, duong: string, o: { tok?: string; body?: unknown; hdr?: Record<string, string> } = {}): Promise<Kq> => {
  const req = new Request(`http://x/api/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}), ...(o.hdr ?? {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duong.split("/"));
  return { status: r.status, body: await r.json() };
};
const m = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyM, d, o);
const k = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyCon, d, o);
const dv = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyMay, d, o);

async function dangKy(sdt: string, ten: string) {
  const otp = await m("otp", { body: { dinhDanh: sdt } });
  assert.equal(otp.status, 200);
  const r = await m("dang-ky", { body: { dinhDanh: sdt, ma: otp.body.ma, ten, matKhau: "matkhau123" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token as string;
}

test("đầu-cuối: đăng ký → Con → ghép máy → đồng bộ → nhiệm vụ → duyệt → điểm → xin thêm giờ → đồng ý", async () => {
  const bm = await dangKy("0911000001", "Chị Lan");
  assert.equal((await m("toi", { tok: bm })).body.baMe.vai, "chu");
  const con = (await m("con", { tok: bm, body: { ten: "Ken", namSinh: new Date().getFullYear() - 9 } })).body.id;
  assert.ok((await m("nhiem-vu/mau", { tok: bm, body: { nhom: "nhi" } })).body.taoMoi >= 8);
  const ma = (await m("ma-ghep", { tok: bm, body: { con, nen: "windows" } })).body.ma;
  const ghep = await dv("ghep", { body: { ma, nen: "windows", tenMay: "Laptop của Ken" } });
  assert.equal(ghep.status, 200);
  const may = ghep.body.token;
  const pol = await dv("dong-bo", { tok: may, body: { clientTime: new Date().toISOString(), status: { quyen: { dich_vu: true, appLocker: true } } } });
  assert.equal(pol.body.con.ten, "Ken");
  assert.ok(pol.body.allowlistHeThong.includes("winword.exe"));
  assert.equal(pol.body.gioMaySai, false);
  // Con dùng token của máy riêng
  assert.equal((await k("chao", { tok: may, body: {} })).body.diemChaoMung, 10);
  const ds = (await k("nhiem-vu", { tok: may })).body.ds;
  const chen = ds.find((x: any) => x.ten === "Rửa chén sau bữa ăn");
  const luot = (await k(`nhiem-vu/${chen.id}/bat-dau`, { tok: may, body: {} })).body.luot;
  assert.equal((await k(`luot/${luot}/nop`, { tok: may, body: { anh: [anhGia("bon-rua")] } })).body.trang_thai, "cho_duyet");
  const cho = (await m("cho-duyet", { tok: bm })).body;
  assert.equal(cho.nhiemVu.length, 1);
  assert.equal((await m(`luot/${luot}/anh`, { tok: bm })).body.anh.length, 1);
  assert.equal((await m(`luot/${luot}/duyet`, { tok: bm, body: { loiKhen: "Giỏi lắm!" } })).body.soDu, 20);
  const toi = (await k("toi", { tok: may })).body;
  assert.equal(toi.soDu, 20);
  assert.equal(toi.loiKhen[0].noi_dung, "Giỏi lắm!");
  assert.deepEqual(toi.homNayConDa, ["Rửa chén sau bữa ăn"]);
  const y = (await k("yeu-cau", { tok: may, body: { loai: "them_gio", phut: 15, lyDo: "Hôm nay con ngoan" } })).body;
  assert.equal(y.trang_thai, "cho");
  assert.equal((await m(`yeu-cau/${y.id}/xem-truoc`, { tok: bm })).body.mucCanhBao, "khong");
  assert.equal((await m(`yeu-cau/${y.id}/dong-y`, { tok: bm, body: { truDiem: true } })).status, 200);
  assert.equal((await k("toi", { tok: may })).body.soDu, 5);
  const gd = (await m("gia-dinh", { tok: bm })).body;
  assert.equal(gd.con[0].ten, "Ken");
  assert.equal((await m(`con/${con}`, { tok: bm })).body.may[0].baoVe, "day_du");
  // lệch giờ > 10 phút ⇒ Policy khoá giải trí + cảnh báo Ba Mẹ
  const lech = await dv("dong-bo", { tok: may, body: { clientTime: new Date(Date.now() - 3600_000).toISOString() } });
  assert.equal(lech.body.gioMaySai, true);
  assert.ok((await m("canh-bao", { tok: bm })).body.ds.some((x: any) => x.loai === "lech_gio"));
  assert.equal((await m(`con/${con}`, { tok: bm })).body.may[0].lechGiay, -3600);
});

test("cách ly: Ba Mẹ nhà khác không xem/duyệt được Con nhà này; token máy không gọi được API Ba Mẹ; Chỉ xem không ghi được", async () => {
  const a = await dangKy("0911000002", "Mẹ An");
  const b = await dangKy("0911000003", "Mẹ Bin");
  const conA = (await m("con", { tok: a, body: { ten: "An" } })).body.id;
  assert.equal((await m(`con/${conA}`, { tok: b })).status, 404);
  assert.equal((await m(`con/${conA}/diem`, { tok: b, body: { delta: 100, lyDo: "lạ" } })).status, 404);
  const may = (await dv("ghep", { body: { ma: (await m("ma-ghep", { tok: a, body: { con: conA, nen: "android" } })).body.ma, nen: "android", tenMay: "Tablet" } })).body.token;
  assert.equal((await m("gia-dinh", { tok: may })).status, 401, "token thiết bị không phải phiên Ba Mẹ");
  assert.equal((await m(`con/${conA}/diem`, { tok: may, body: { delta: 100, lyDo: "tự cộng" } })).status, 401);
  assert.equal((await dv("dong-bo", { tok: "token-gia" })).status, 401);
  const fam = (await q<{ family_id: string }>(`select family_id from children where id = $1`, [conA]))[0].family_id;
  await q(`update parents set vai = 'xem' where family_id = $1`, [fam]);
  assert.equal((await m("con", { tok: a, body: { ten: "Bé mới" } })).status, 403);
  assert.equal((await m(`con/${conA}`, { tok: a })).status, 200, "Chỉ xem vẫn xem được");
});

test("máy dùng chung: Con chọn hồ sơ + PIN rồi mới mở phiên / gửi yêu cầu; Con nhà khác không vào được", async () => {
  const bm = await dangKy("0911000004", "Ba Tú");
  const an = (await m("con", { tok: bm, body: { ten: "An", pin: "1111" } })).body.id;
  await m("con", { tok: bm, body: { ten: "Bin", pin: "2222" } });
  const may = (await dv("ghep", { body: { ma: (await m("ma-ghep", { tok: bm, body: { nen: "windows" } })).body.ma, nen: "windows", tenMay: "Máy chung" } })).body.token;
  assert.equal((await dv("ho-so", { tok: may, body: {} })).body.con.length, 2);
  assert.equal((await dv("dong-bo", { tok: may, body: {} })).body.canChonCon, true);
  assert.equal((await dv("yeu-cau", { tok: may, body: { loai: "them_gio", phut: 15, lyDo: "x" } })).body.error, "chua_chon_con");
  assert.equal((await dv("pin", { tok: may, body: { con: an, pin: "0000" } })).status, 401);
  const pc = (await dv("pin", { tok: may, body: { con: an, pin: "1111" } })).body.phienCon;
  const pol = await dv("dong-bo", { tok: may, body: {}, hdr: { "x-phien-con": pc } });
  assert.equal(pol.body.con.ten, "An");
  assert.equal((await dv("yeu-cau", { tok: may, body: { loai: "mo_web", giaTri: "scratch.mit.edu", lyDo: "Để làm bài tập" }, hdr: { "x-phien-con": pc } })).status, 200);
  assert.equal((await k("yeu-cau", { tok: pc })).body.ds.length, 1, "web Con / màn Con dùng phiên PIN");
});

test("báo cáo tuần có chú giải đời thường; bảng quy tắc công khai cho Con không lộ cấu hình nội bộ", async () => {
  const bm = await dangKy("0911000005", "Mẹ Mai");
  const con = (await m("con", { tok: bm, body: { ten: "Mai" } })).body.id;
  await m("nhiem-vu/mau", { tok: bm, body: { nhom: "nhi" } });
  const may = (await dv("ghep", { body: { ma: (await m("ma-ghep", { tok: bm, body: { con, nen: "android" } })).body.ma, nen: "android", tenMay: "Tablet" } })).body.token;
  const nv = (await k("nhiem-vu", { tok: may })).body.ds.find((x: any) => x.bang_chung === "anh" && !x.phut_toi_thieu);
  const luot = (await k(`nhiem-vu/${nv.id}/bat-dau`, { tok: may, body: {} })).body.luot;
  await k(`luot/${luot}/nop`, { tok: may, body: { anh: [anhGia("mai")] } });
  await m(`luot/${luot}/duyet`, { tok: bm, body: {} });
  const bc = (await m(`con/${con}/bao-cao`, { tok: bm })).body;
  assert.equal(bc.tuanNay.giaiTriTheoNgay.length, 7);
  assert.ok(bc.chuGiai.some((c: string) => c.startsWith("Tuần này Mai")), JSON.stringify(bc.chuGiai));
  const qt = (await k("quy-tac", { tok: may })).body;
  assert.equal(qt.giaPhut.game, 1);
  assert.equal(qt.giaPhut.video_ngan, 2);
  assert.ok(!("tu_dong_15" in qt) && !("cau_hinh" in qt));
});
