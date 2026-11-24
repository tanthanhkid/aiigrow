// #551: /tai/ghep/<g> chỉ chuyển tiếp bộ cài khi gói cài còn hiệu lực + còn lượt; không đạt ⇒ 302 về bộ cài thường. Mốc giờ truyền vào,
// tệp GitHub giả (layTep) — không ra mạng.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const t = await import("./tai-ghep.ts");
const { q, newId } = await import("./db.ts");
const { sha } = await import("./auth.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { BAN_AGENT_WINDOWS } = await import("./ban-agent.ts");
const { goiGhep, tenTepWindows } = await import("./trang-tai.ts");

const T = new Date(Date.UTC(2031, 0, 5, 3, 0));
const SV = "https://aiigrow.aiilab.vn";
let goi = 0;
const goiTep: typeof fetch = async () => { goi++; return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-length": "3" } }); };
const { fam } = await taoNha();

async function taoGoi(o: { platform?: string; het?: Date; dung?: boolean } = {}) {
  const tok = newId() + newId();
  await q(`insert into goi_cai(token_hash, family_id, platform, expires_at, used_at) values ($1,$2,$3,$4,$5)`,
    [sha(tok), fam, o.platform ?? "windows", o.het ?? new Date(T.getTime() + 86_400_000), o.dung ? T : null]);
  return tok;
}
const laThuong = (r: Response) => { assert.equal(r.status, 302); assert.equal(r.headers.get("location"), BAN_AGENT_WINDOWS.url); };

test("token rác / ngắn / không có / đã dùng / hết hạn / gói iOS ⇒ 302 bộ cài thường, không gọi GitHub", async () => {
  goi = 0;
  laThuong(await t.taiGhep("abc", SV, "9.9.9.1", T, goiTep));
  laThuong(await t.taiGhep("x".repeat(40), SV, "9.9.9.1", T, goiTep));
  laThuong(await t.taiGhep(await taoGoi({ dung: true }), SV, "9.9.9.1", T, goiTep));
  laThuong(await t.taiGhep(await taoGoi({ het: new Date(T.getTime() - 1) }), SV, "9.9.9.1", T, goiTep));
  laThuong(await t.taiGhep(await taoGoi({ platform: "ios" }), SV, "9.9.9.1", T, goiTep));
  assert.equal(goi, 0);
});

test("gói còn hiệu lực ⇒ 200, tên tệp mang gói ghép, đọc xong nhả chỗ luồng", async () => {
  const tok = await taoGoi();
  const r = await t.taiGhep(tok, SV, "9.9.9.2", T, goiTep);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-disposition"), `attachment; filename="${tenTepWindows(goiGhep(SV, tok))}"`);
  assert.equal(r.headers.get("content-length"), "3");
  assert.equal(t.dangTai(), 1);
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [1, 2, 3]);
  assert.equal(t.dangTai(), 0);
  laThuong(await t.taiGhep(await taoGoi({ platform: "" }), SV, "9.9.9.2", T, async () => new Response("x", { status: 404 })));
  assert.equal(t.dangTai(), 0);                                   // GitHub lỗi ⇒ 302 và nhả chỗ
});

test("trần lượt theo token / giờ và theo IP / giờ; giờ sau mở lại", async () => {
  const tok = await taoGoi();
  for (let i = 0; i < t.TAI_TOKEN_GIO; i++) await (await t.taiGhep(tok, SV, `8.8.${i}.1`, T, goiTep)).arrayBuffer();
  laThuong(await t.taiGhep(tok, SV, "8.8.99.1", T, goiTep));
  const sau = await t.taiGhep(tok, SV, "8.8.99.1", new Date(T.getTime() + 3_600_000), goiTep);
  assert.equal(sau.status, 200); await sau.arrayBuffer();
  for (let i = 0; i < t.TAI_IP_GIO; i++) await (await t.taiGhep(await taoGoi(), SV, "7.7.7.7", T, goiTep)).arrayBuffer();
  laThuong(await t.taiGhep(await taoGoi(), SV, "7.7.7.7", T, goiTep));
  const khac = await t.taiGhep(await taoGoi(), SV, "7.7.7.8", T, goiTep);
  assert.equal(khac.status, 200); await khac.arrayBuffer();
});

test("trần luồng đồng thời; người tải huỷ ⇒ nhả chỗ", async () => {
  assert.equal(t.dangTai(), 0);
  const ds: Response[] = [];
  for (let i = 0; i < t.TAI_DONG_THOI; i++) ds.push(await t.taiGhep(await taoGoi(), SV, `6.6.6.${i}`, T, goiTep));
  assert.ok(ds.every((r) => r.status === 200));
  goi = 0;
  laThuong(await t.taiGhep(await taoGoi(), SV, "6.6.7.1", T, goiTep));
  assert.equal(goi, 0);
  await ds[0].body!.cancel();
  assert.equal(t.dangTai(), t.TAI_DONG_THOI - 1);
  for (const r of ds.slice(1)) await r.arrayBuffer();
  assert.equal(t.dangTai(), 0);
});

test("cron xoá bộ đếm các giờ đã qua, giữ giờ hiện tại", async () => {
  const tok = await taoGoi();
  await (await t.taiGhep(tok, SV, "5.5.5.5", new Date(T.getTime() - 5 * 3_600_000), goiTep)).arrayBuffer();
  await (await t.taiGhep(tok, SV, "5.5.5.5", T, goiTep)).arrayBuffer();
  const n = await t.donBoDemTaiGhep(T.getTime());
  assert.ok(n >= 2);
  const con = await q<{ khoa: string }>(`select khoa from pin_sai where khoa like 'tai_ghep_%'`);
  const k = Math.floor(T.getTime() / 3_600_000);
  assert.ok(con.length > 0 && con.every((r) => Number(r.khoa.split(":").pop()) >= k - 1));
});
