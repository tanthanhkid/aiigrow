// Kho việc «Một ngày của <Con>» (thiết kế chốt 14/11 — bm1-ob-mau): GET/POST nhiem-vu/kho.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const g = await import("./gia-dinh.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");
const { tenNgan } = await import("./bo-nhiem-vu.ts");

const m = async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLyM(new Request(`http://x/api/m/${duong}`, { method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: body === undefined ? undefined : JSON.stringify(body) }), duong.split("/"));
  return { status: r.status, body: (await r.json()) as any };
};

test("kho việc: 117 việc (Học 7 · Vận động 10 · Giúp Ba Mẹ 100 / 10 chủ đề), giao việc chạm ＋, không trùng, tên dài rút gọn", async () => {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const kho = (await m(tok, "nhiem-vu/kho")).body;
  assert.equal(kho.ds.length, 117);
  assert.equal(kho.chuDe.length, 10);
  assert.deepEqual(["hoc", "van_dong", "giup"].map((x) => kho.ds.filter((v: any) => v.muc === x).length), [7, 10, 100]);
  assert.equal(new Set(kho.ds.map((v: any) => v.ma)).size, 117, "mã không trùng");
  const ma = (ten: string) => kho.ds.find((v: any) => v.ten === ten).ma;
  const dai = kho.ds.find((v: any) => [...v.ten].length > 60);
  let r = await m(tok, "nhiem-vu/kho", { con, chon: [ma("Đọc sách 20 phút"), ma("Nhảy dây 100 cái"), ma("Học 1 bài với AiiRob"), dai.ma] });
  assert.equal(r.body.taoMoi, 4);
  r = await m(tok, "nhiem-vu/kho", { con, chon: [ma("Đọc sách 20 phút")] });
  assert.equal(r.body.taoMoi, 0, "đã có thì không tạo lại");
  assert.equal((await m(tok, "nhiem-vu/kho", { con, chon: ["khong-co"] })).status, 400);
  const nv = await q<{ ten: string; bang_chung: string; giao_cho: string | null; mo_ta: string; diem: number }>(`select ten, bang_chung, giao_cho, mo_ta, diem from tasks where family_id = $1`, [fam]);
  const tim = (t: string) => nv.find((x) => x.ten === t)!;
  assert.equal(tim("Đọc sách 20 phút").bang_chung, "ghi_am");
  assert.equal(tim("Nhảy dây 100 cái").bang_chung, "xong");
  assert.deepEqual([tim("Học 1 bài với AiiRob").bang_chung, tim("Học 1 bài với AiiRob").giao_cho], ["tu_dong", null]);
  const d = nv.find((x) => x.mo_ta === dai.ten)!;
  assert.ok(d && [...d.ten].length <= 60 && d.giao_cho === con && d.bang_chung === "anh");
});

test("tenNgan: bỏ phần ví dụ trong ngoặc, còn dài thì cắt ở khoảng trắng", () => {
  assert.equal(tenNgan("Lấy giúp đồ dùng khi ba mẹ đang bận tay (kính lão, điện thoại, bấm móng tay)"), "Lấy giúp đồ dùng khi ba mẹ đang bận tay");
  const t = tenNgan("Thu dọn đồ đạc ngoài trời/sân thượng cất vào nhà mỗi khi trời đổ mưa");
  assert.ok(t.length <= 60 && !t.endsWith(" "));
  assert.equal(tenNgan("Rửa chén"), "Rửa chén");
});
