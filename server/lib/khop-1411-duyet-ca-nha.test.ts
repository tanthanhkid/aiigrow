// Thiết kế 14/11 (docs/KE-HOACH-KHOP-THIET-KE-1411.md · bm-viec-duyet): «Giao việc» từ danh mục Học · Vận động · Giúp Ba Mẹ.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const g = await import("./gia-dinh.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");
const { DANH_MUC_VIEC, VIEC_DM, TEN_AIIROB } = await import("./danh-muc-viec.ts");

const m = async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLyM(new Request(`http://x/api/m/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};

async function nha() {
  const { fam, bm } = await taoNha();
  const a = await g.taoCon(fam, { ten: "Bảo Anh" });
  const b = await g.taoCon(fam, { ten: "Bảo Minh" });
  return { fam, a, b, tok: await taoPhien(bm) };
}

test("danh mục: 3 mục, Giúp Ba Mẹ 100 việc / 10 chủ đề, mã không trùng", () => {
  assert.deepEqual(DANH_MUC_VIEC.map((x) => x.ma), ["hoc", "van_dong", "giup_ba_me"]);
  const gbm = DANH_MUC_VIEC[2];
  assert.equal(gbm.chuDe.length, 10);
  assert.equal(gbm.chuDe.reduce((n, c) => n + c.viec.length, 0), 100);
  assert.equal(new Set(VIEC_DM.map((v) => v.ma)).size, VIEC_DM.length);
  assert.ok(VIEC_DM.every((v) => v.ten.length <= 90 && v.sao > 0));
});

test("GET nhiem-vu/danh-muc ⇒ daCo theo con; POST thêm việc, bỏ qua việc đã có", async () => {
  const { a, b, tok } = await nha();
  const r0 = await m(tok, `nhiem-vu/danh-muc?con=${a}`);
  assert.equal(r0.status, 200);
  assert.equal(r0.body.muc.length, 3);
  const hoc = r0.body.muc[0].chuDe.flatMap((c: any) => c.viec);
  const doc = hoc.find((v: any) => v.bangChung === "ghi_am");
  const rob = hoc.find((v: any) => v.ten === TEN_AIIROB);
  assert.ok(doc && rob && rob.bangChung === "tu_dong");

  const r1 = await m(tok, "nhiem-vu/danh-muc", { con: a, viec: [doc.ma, rob.ma, doc.ma] });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.taoMoi, 2);

  const ds = (await m(tok, "nhiem-vu")).body.ds as any[];
  const vDoc = ds.find((x) => x.ten === doc.ten);
  assert.equal(vDoc.giao_cho, a);
  assert.equal(vDoc.bang_chung, "ghi_am");
  assert.equal(vDoc.bo, "hoc");
  assert.equal(ds.find((x) => x.ten === TEN_AIIROB).giao_cho, null);   // AiiRob tự chấm: cả nhà

  const r2 = await m(tok, `nhiem-vu/danh-muc?con=${a}`);
  const hoc2 = r2.body.muc[0].chuDe.flatMap((c: any) => c.viec);
  assert.equal(hoc2.find((v: any) => v.ma === doc.ma).daCo, true);
  const rb = await m(tok, `nhiem-vu/danh-muc?con=${b}`);
  const hocB = rb.body.muc[0].chuDe.flatMap((c: any) => c.viec);
  assert.equal(hocB.find((v: any) => v.ma === doc.ma).daCo, false);   // Bảo Minh chưa có
  assert.equal(hocB.find((v: any) => v.ma === rob.ma).daCo, true);    // việc AiiRob cả nhà

  const r3 = await m(tok, "nhiem-vu/danh-muc", { con: a, viec: [doc.ma] });
  assert.deepEqual([r3.body.taoMoi, r3.body.boQua], [0, 1]);
});

test("POST nhiem-vu/danh-muc: thiếu con / chưa chọn / mã sai / con nhà khác ⇒ lỗi", async () => {
  const { a, tok } = await nha();
  const khac = await nha();
  assert.equal((await m(tok, "nhiem-vu/danh-muc", { viec: ["x"] })).status, 400);
  assert.equal((await m(tok, "nhiem-vu/danh-muc", { con: a, viec: [] })).status, 400);
  assert.equal((await m(tok, "nhiem-vu/danh-muc", { con: a, viec: ["khong:1"] })).status, 400);
  assert.equal((await m(tok, "nhiem-vu/danh-muc", { con: khac.a, viec: [VIEC_DM[0].ma] })).status, 404);
});
