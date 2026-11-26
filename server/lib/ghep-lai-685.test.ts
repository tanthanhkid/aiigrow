// #685: phản hồi ghép mất sau khi máy chủ đã ghép ⇒ cùng máy (maMay) thử lại cùng mã / cùng gói cài trong hạn được cấp lại token cho chính máy đó
// (xoay token) thay vì 409 «đã dùng» để lại máy mồ côi. Khác maMay / không maMay / quá hạn ⇒ vẫn 409.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const lm = await import("./lenh-may.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

async function dv(duong: string, o: { tok?: string; body?: unknown } = {}) {
  const req = new Request(`http://app.test/api/device/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyMay(req, duong.split("/"));
  return { status: r.status, body: await r.json() as any };
}
const MA = "c".repeat(64), MA2 = "d".repeat(64);

test("mã 6 số: thử lại cùng maMay sau khi phản hồi mất ⇒ cùng máy, token mới; token cũ hết hiệu lực; không tạo máy thứ hai", async () => {
  const { fam } = await taoNha("G1");
  const con = await g.taoCon(fam, { ten: "Na" });
  const ma = await g.taoMaGhep(fam, con, "windows");
  const dau = (await dv("ghep", { body: { ma, nen: "windows", tenMay: "PC Na", maMay: MA } })).body;
  assert.ok(dau.token);
  // phản hồi «mất»: máy không có token, thử lại cùng mã
  const lai = await dv("ghep", { body: { ma, nen: "windows", tenMay: "PC Na", maMay: MA } });
  assert.equal(lai.status, 200, JSON.stringify(lai.body));
  assert.equal(lai.body.deviceId, dau.deviceId);
  assert.equal(lai.body.childName, "Na");
  assert.equal(lai.body.dungChung, false);
  assert.notEqual(lai.body.token, dau.token);
  assert.equal((await dv("dong-bo", { tok: lai.body.token, body: {} })).status, 200);
  assert.equal((await dv("dong-bo", { tok: dau.token, body: {} })).status, 401, "token của phản hồi mất không còn dùng được");
  assert.equal((await q(`select 1 from devices where family_id = $1`, [fam])).length, 1, "không có máy mồ côi");
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'ghep_may_lai'`, [fam])).length, 1, "lần cấp lại có dấu vết");
  // máy khác (khác maMay) / không maMay / sai nền ⇒ vẫn 409
  assert.deepEqual([(await dv("ghep", { body: { ma, nen: "windows", maMay: MA2 } })).status], [409]);
  assert.equal((await dv("ghep", { body: { ma, nen: "windows" } })).status, 409);
  assert.equal((await dv("ghep", { body: { ma, nen: "mac", maMay: MA } })).status, 409);
});

test("mã 6 số: quá GHEP_LAI_MS sau khi ghép ⇒ 409 như cũ (mốc giờ truyền vào)", async () => {
  const { fam } = await taoNha("G2");
  const con = await g.taoCon(fam, { ten: "Bo" });
  const T0 = Date.now();                                   // một mốc, mọi lượt gọi tính từ mốc này (used_at = mốc truyền vào)
  const ma = await g.taoMaGhep(fam, con, "android");
  const dau = await g.ghepMay(ma, "android", "Đt Bo", "1.2.3.4", T0, MA);
  assert.ok(dau.token);
  assert.equal(new Date((await q<{ used_at: Date }>(`select used_at from pair_codes where code = $1`, [ma]))[0].used_at).getTime(), T0);
  await assert.rejects(g.ghepMay(ma, "android", "Đt Bo", "1.2.3.4", T0 + g.GHEP_LAI_MS + 1, MA), (e: any) => e.ma === "ma_da_dung");
  const trong = await g.ghepMay(ma, "android", "Đt Bo", "1.2.3.4", T0 + g.GHEP_LAI_MS, MA);
  assert.equal(trong.deviceId, dau.deviceId);
});

test("agent đã dùng token (đồng bộ) ⇒ thử lại cùng gói + maMay KHÔNG xoay token (chặn cướp token bằng gói cài còn trên máy)", async () => {
  const { fam } = await taoNha("G5");
  const con = await g.taoCon(fam, { ten: "Le" });
  const gc = await lm.taoGoiCai(fam, { con, nen: "windows" }, "https://app.test");
  const dau = (await dv("ghep-goi", { body: { token: gc.token, nen: "windows", tenMay: "PC Le", maMay: MA } })).body;
  assert.equal((await dv("dong-bo", { tok: dau.token, body: { status: { agent: "windows" } } })).status, 200);
  assert.equal((await dv("ghep-goi", { body: { token: gc.token, nen: "windows", maMay: MA } })).status, 409);
  assert.equal((await dv("ghep-goi", { body: { token: gc.token, nen: "", maMay: MA } })).status, 409, "thiếu nền không lọt");
  assert.equal((await dv("dong-bo", { tok: dau.token, body: {} })).status, 200, "token agent đang chạy vẫn dùng được");
});

test("mã 6 số: Ba Mẹ đã xoá máy ⇒ thử lại không hồi sinh máy (409)", async () => {
  const { fam } = await taoNha("G3");
  const con = await g.taoCon(fam, { ten: "Mi" });
  const ma = await g.taoMaGhep(fam, con, "windows");
  const dau = await g.ghepMay(ma, "windows", "PC", "1.2.3.5", Date.now(), MA2);
  await q(`delete from devices where id = $1`, [dau.deviceId]);
  await assert.rejects(g.ghepMay(ma, "windows", "PC", "1.2.3.5", Date.now(), MA2), (e: any) => e.ma === "ma_da_dung");
});

test("gói cài (ghep-goi): thử lại cùng maMay ⇒ cùng máy, token mới; khác maMay ⇒ 409", async () => {
  const { fam } = await taoNha("G4");
  const con = await g.taoCon(fam, { ten: "Su" });
  const gc = await lm.taoGoiCai(fam, { con, nen: "windows" }, "https://app.test");
  const dau = (await dv("ghep-goi", { body: { token: gc.token, nen: "windows", tenMay: "PC Su", maMay: MA } })).body;
  assert.ok(dau.token);
  const lai = await dv("ghep-goi", { body: { token: gc.token, nen: "windows", tenMay: "PC Su", maMay: MA } });
  assert.equal(lai.status, 200, JSON.stringify(lai.body));
  assert.equal(lai.body.deviceId, dau.deviceId);
  assert.equal(lai.body.childName, "Su");
  assert.equal((await dv("dong-bo", { tok: lai.body.token, body: {} })).status, 200);
  assert.equal((await dv("dong-bo", { tok: dau.token, body: {} })).status, 401);
  assert.equal((await dv("ghep-goi", { body: { token: gc.token, nen: "windows", maMay: MA2 } })).status, 409);
  assert.equal((await dv("ghep-goi", { body: { token: gc.token, nen: "windows" } })).status, 409);
  assert.equal((await q(`select 1 from devices where family_id = $1`, [fam])).length, 1);
  // quá hạn thử lại
  await assert.rejects(lm.doiGoiCai(gc.token, "windows", "PC Su", new Date(Date.now() + g.GHEP_LAI_MS + 60_000), MA), (e: any) => e.ma === "ma_da_dung");
});
