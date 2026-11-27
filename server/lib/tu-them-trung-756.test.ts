// #756: Ba Mẹ tự thêm việc — bấm đúp / gõ lại tên việc đã có ⇒ 409 trung_ten; «Vẫn thêm» (chap_nhan_trung) thì tạo.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const g = await import("./gia-dinh.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

test("chanTrungTen: trùng tên (hoa thường, dấu cách thừa) cùng Con ⇒ trung_ten; Con khác thì được", async () => {
  const nv = await import("./nhiem-vu.ts");
  const { fam } = await taoNha();
  const a = await g.taoCon(fam, { ten: "An" });
  const b = await g.taoCon(fam, { ten: "Bin" });
  await nv.chanTrungTen(fam, "Tưới cây", [a]);                       // chưa có ⇒ qua
  await nv.taoNv(fam, { ten: "Tưới cây", diem: 10, giao_cho: a });
  await assert.rejects(nv.chanTrungTen(fam, "  tưới   CÂY ", [a]), (e: { ma?: string; status?: number }) => e.ma === "trung_ten" && e.status === 409);
  await nv.chanTrungTen(fam, "Tưới cây", [b]);                        // Con khác ⇒ qua
  await assert.rejects(nv.chanTrungTen(fam, "Tưới cây", [a, b]), (e: { ma?: string }) => e.ma === "trung_ten");
  await q(`update tasks set bat = false where family_id = $1`, [fam]);
  await nv.chanTrungTen(fam, "Tưới cây", [a]);                        // việc đã tắt không tính
});

test("POST nhiem-vu qua API: lần hai cùng tên ⇒ 409; chap_nhan_trung ⇒ 200", async () => {
  const goi = async (d: string, tok: string, body: unknown) => {
    const r = await xuLyM(new Request(`http://x/api/${d}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: JSON.stringify(body) }), d.split("/"));
    return { status: r.status, body: await r.json() as any };
  };
  const otp = await goi("otp", "", { dinhDanh: "0911000756" });
  const dk = await goi("dang-ky", "", { dinhDanh: "0911000756", ma: otp.body.ma, ten: "Chị Lan", matKhau: "matkhau123" });
  assert.equal(dk.status, 200, JSON.stringify(dk.body));
  const tok = dk.body.token as string;
  const con = (await goi("con", tok, { ten: "Ken", namSinh: new Date().getFullYear() - 9 })).body.id;
  const viec = { ten: "Tưới cây", hinh: "choi", diem: 10, nhom: "viec_nha", bang_chung: "anh", lap_lai: "hang_ngay", toi_da_ngay: 1, tu_duyet: false, giao_cho: [con] };
  assert.equal((await goi("nhiem-vu", tok, viec)).status, 200);
  const lan2 = await goi("nhiem-vu", tok, { ...viec, ten: "tưới cây " });
  assert.equal(lan2.status, 409);
  assert.equal(lan2.body.error, "trung_ten");
  assert.equal((await goi("nhiem-vu", tok, { ...viec, chap_nhan_trung: true })).status, 200);
});
