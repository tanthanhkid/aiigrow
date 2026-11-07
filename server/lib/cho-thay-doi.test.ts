// P1 (07/11): long-poll «chờ thay đổi» — Ba Mẹ đổi gì ⇒ máy Con biết trong <1 giây (đo thật qua xuLyM → xuLyMay).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { taoPhien } = await import("./auth.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyM } = await import("./api-m.ts");
const ct = await import("./cho-thay-doi.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

async function nha() {
  const { fam, bm } = await taoNha("Mai");
  const con = await g.taoCon(fam, { ten: "Bin" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Bin");
  return { fam, con, tok: ghep.token, bmTok: await taoPhien(bm) };
}
const cho = async (tok: string, ver?: number | null, signal?: AbortSignal) => {
  const q = ver == null ? "" : `?ver=${ver}`;
  const r = await xuLyMay(new Request(`http://app.test/api/device/cho-thay-doi${q}`, { headers: { authorization: `Bearer ${tok}` }, signal }), ["cho-thay-doi"]);
  return { status: r.status, body: await r.json() as { phienBanThayDoi: number; doi: boolean; quaTai?: boolean } };
};
const baMeDoi = (bmTok: string, duong: string, body: unknown) =>
  xuLyM(new Request(`http://app.test/api/m/${duong}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${bmTok}` }, body: JSON.stringify(body) }), duong.split("/"));

test("không có ver ⇒ trả ngay số hiện tại; sai token ⇒ 401", async () => {
  const { tok } = await nha();
  const r = await cho(tok);
  assert.equal(r.status, 200); assert.equal(r.body.doi, false); assert.equal(r.body.phienBanThayDoi, 0);
  const x = await xuLyMay(new Request("http://app.test/api/device/cho-thay-doi?ver=0", { headers: { authorization: "Bearer sai" } }), ["cho-thay-doi"]);
  assert.equal(x.status, 401);
});

test("ver cũ hơn số hiện tại ⇒ trả ngay doi:true", async () => {
  const { fam, tok } = await nha();
  await ct.baoThayDoi(fam);
  const t = Date.now();
  const r = await cho(tok, 0);
  assert.ok(Date.now() - t < 500); assert.equal(r.body.doi, true); assert.equal(r.body.phienBanThayDoi, 1);
});

test("Ba Mẹ khoá máy ⇒ long-poll đang giữ trả trong <1 giây (khoá THẬT qua API Ba Mẹ)", async () => {
  const { con, tok, bmTok } = await nha();
  const mốc = (await cho(tok)).body.phienBanThayDoi;
  const t0 = Date.now();
  const dangCho = cho(tok, mốc);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(ct.soDangCho(), 1, "yêu cầu đang được giữ");
  const kq = await baMeDoi(bmTok, `con/${con}/khoa`, { khoa: true });
  assert.equal(kq.status, 200);
  const r = await dangCho;
  const ms = Date.now() - t0;
  assert.equal(r.body.doi, true); assert.equal(r.body.phienBanThayDoi, mốc + 1);
  assert.ok(ms < 1000, `trả sau ${ms}ms`);
  assert.equal(ct.soDangCho(), 0);
});

test("không có thay đổi ⇒ hết hạn giữ trả doi:false; huỷ kết nối ⇒ nhả bộ đếm", async () => {
  const { fam, tok } = await nha();
  const v = await ct.phienBanDoi(fam);
  const r = await ct.choThayDoi(fam, v, { toiDaMs: 300, kiemDbMs: 100 });
  assert.equal(r.doi, false);
  const ac = new AbortController();
  const p = cho(tok, v, ac.signal);
  await new Promise((x) => setTimeout(x, 100)); ac.abort();
  assert.equal((await p).body.doi, false);
  assert.equal(ct.soDangCho(), 0);
});

test("đổi do tiến trình khác (chỉ ghi DB, không emit) ⇒ vòng kiểm DB vẫn bắt được", async () => {
  const { fam } = await nha();
  const { q } = await import("./db.ts");
  const dangCho = ct.choThayDoi(fam, 0, { toiDaMs: 5000, kiemDbMs: 200 });
  await new Promise((r) => setTimeout(r, 100));
  await q(`update families set phien_ban_doi = phien_ban_doi + 1 where id = $1`, [fam]);
  const t = Date.now();
  const r = await dangCho;
  assert.equal(r.doi, true); assert.ok(Date.now() - t < 800);
});

test("dong-bo / nhip trả phienBanThayDoi (mốc đọc trước chính sách)", async () => {
  const { fam, tok } = await nha();
  await ct.baoThayDoi(fam);
  const r = await xuLyMay(new Request("http://app.test/api/device/dong-bo", { method: "POST", headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: "{}" }), ["dong-bo"]);
  assert.equal((await r.json() as any).phienBanThayDoi, 1);
  const n = await xuLyMay(new Request("http://app.test/api/device/nhip", { method: "POST", headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: "{}" }), ["nhip"]);
  assert.equal((await n.json() as any).phienBanThayDoi, 1);
});

test("quá tải ⇒ trả ngay quaTai, không giữ thêm", async () => {
  const { fam } = await nha();
  const gioiHan = ct.CHO_TOI_DA_YC;
  const giu = Array.from({ length: gioiHan }, () => ct.choThayDoi(fam, 0, { toiDaMs: 400, kiemDbMs: 100 }));
  await new Promise((r) => setTimeout(r, 100));
  const them = await ct.choThayDoi(fam, 0, { toiDaMs: 400 });
  assert.equal(them.quaTai, true);
  await Promise.all(giu);
});
