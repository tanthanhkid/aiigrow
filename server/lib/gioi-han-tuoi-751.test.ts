// #751: cảnh báo 13+ khi cho phép trang giới hạn tuổi cho bé dưới 13 tuổi (thêm vào danh sách / duyệt lời xin); Ba Mẹ xác nhận tiếp được.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const h = await import("./gioi-han-tuoi.ts");
const yc = await import("./yeu-cau.ts");

const NAM = new Date("2026-11-27T12:00:00+07:00");

test("trangGioiHan: tên miền con, link đầy đủ, hoa thường; trang thường không khớp", () => {
  for (const m of ["tiktok.com", "m.tiktok.com", "https://www.youtube.com/watch?v=1", "YouTu.be", "instagram.com", "web.facebook.com", "discord.gg", "snapchat.com"])
    assert.ok(h.trangGioiHan(m), m);
  for (const m of ["scratch.mit.edu", "khanacademy.org", "nottiktok.com", "tiktok.com.vn.example.org", "", null]) assert.equal(h.trangGioiHan(m), null, String(m));
});

test("canhBaoTuoi: dưới 13 ⇒ cảnh báo; đủ 13 hoặc chưa biết tuổi ⇒ không; gộp trùng trang", () => {
  assert.equal(h.canhBaoTuoi(["tiktok.com", "m.tiktok.com", "scratch.mit.edu"], 2017, NAM).length, 1);
  assert.equal(h.canhBaoTuoi(["tiktok.com"], 2017, NAM)[0].tuoiCon, 9);
  assert.equal(h.canhBaoTuoi(["tiktok.com"], 2013, NAM).length, 0, "13 tuổi tròn năm ⇒ đủ");
  assert.equal(h.canhBaoTuoi(["tiktok.com"], 2010, NAM).length, 0);
  assert.equal(h.canhBaoTuoi(["tiktok.com"], null, NAM).length, 0);
  assert.equal(h.canhBaoTuoi(["youtube.com", "discord.com"], 2018, NAM).length, 2);
});

test("API: thêm tiktok.com cho bé 9 tuổi ⇒ 409 can_xac_nhan_tuoi, chưa ghi; xacNhanTuoi ⇒ thêm được; trang thường và bé 14 tuổi không bị hỏi", async () => {
  const goi = async (d: string, body: unknown, tok = "") => {
    const r = await xuLyM(new Request(`http://x/api/${d}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: JSON.stringify(body) }), d.split("/"));
    return { status: r.status, body: await r.json() as any };
  };
  // đăng ký Ba Mẹ riêng cho gọi API
  const otp = await goi("otp", { dinhDanh: "0911000751" });
  const dk = await goi("dang-ky", { dinhDanh: "0911000751", ma: otp.body.ma, ten: "Chị Lan", matKhau: "matkhau123" });
  const tok = dk.body.token as string;
  const b2 = (await goi("con", { ten: "Na", namSinh: new Date().getFullYear() - 9 }, tok)).body.id as string;
  const l2 = (await goi("con", { ten: "Cu", namSinh: new Date().getFullYear() - 14 }, tok)).body.id as string;
  const ds = { ds: [{ nhom: "khong_tinh_phut", muc: "tiktok.com", kieu: "web" }] };
  const a = await goi(`con/${b2}/danh-sach`, ds, tok);
  assert.equal(a.status, 409);
  assert.equal(a.body.error, "can_xac_nhan_tuoi");
  assert.equal(a.body.canhBao[0].ten, "TikTok");
  assert.match(a.body.message, /TikTok.*13 tuổi.*Na.*9 tuổi/);
  const chuaGhi = await xuLyM(new Request(`http://x/api/m/con/${b2}/danh-sach`, { headers: { authorization: `Bearer ${tok}` } }), `con/${b2}/danh-sach`.split("/"));
  assert.ok(!JSON.stringify(await chuaGhi.json()).includes("tiktok.com"), "409 thì chưa ghi gì");
  assert.equal((await goi(`con/${b2}/danh-sach`, { ...ds, xacNhanTuoi: true }, tok)).status, 200, "Ba Mẹ xác nhận tiếp");
  assert.equal((await goi(`con/${b2}/danh-sach`, { ds: [{ nhom: "tinh_phut", muc: "scratch.mit.edu", kieu: "web" }] }, tok)).status, 200, "trang thường không hỏi");
  assert.equal((await goi(`con/${l2}/danh-sach`, ds, tok)).status, 200, "bé 14 tuổi không hỏi");
});

test("duyệt lời xin youtube.com của bé 9 tuổi ⇒ can_xac_nhan_tuoi; xác nhận thì đồng ý được", async () => {
  const otp0 = "0911000752";
  const goi = async (d: string, body: unknown, tok = "") => {
    const r = await xuLyM(new Request(`http://x/api/${d}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: JSON.stringify(body) }), d.split("/"));
    return { status: r.status, body: await r.json() as any };
  };
  const otp = await goi("otp", { dinhDanh: otp0 });
  const dk = await goi("dang-ky", { dinhDanh: otp0, ma: otp.body.ma, ten: "Anh Hùng", matKhau: "matkhau123" });
  const tok = dk.body.token as string;
  const con = (await goi("con", { ten: "Mít", namSinh: new Date().getFullYear() - 9 }, tok)).body.id as string;
  const r = await yc.guiYeuCau(con, null, { loai: "mo_web", giaTri: "https://www.youtube.com/", lyDo: "Xem phim hoạt hình" });
  const a = await goi(`yeu-cau/${r.id}/dong-y`, { nhom: "tinh_phut" }, tok);
  assert.equal(a.status, 409);
  assert.equal(a.body.error, "can_xac_nhan_tuoi");
  assert.equal(a.body.canhBao[0].ten, "YouTube");
  const b = await goi(`yeu-cau/${r.id}/dong-y`, { nhom: "tinh_phut", xacNhanTuoi: true }, tok);
  assert.equal(b.status, 200, JSON.stringify(b.body));
});
