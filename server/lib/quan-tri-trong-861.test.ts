// #861: agent Windows báo `status.quanTriTrong` (tài khoản quản trị chưa có mật khẩu) ⇒ cảnh báo «Cần Ba Mẹ để ý» + trang máy; báo rỗng ⇒ tự hết.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { q } = await import("./db.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { canDeY } = await import("./can-de-y.ts");
const { chiTietTuanThu } = await import("./tuan-thu.ts");
const { docQuanTriTrong, LOAI_QUAN_TRI_TRONG } = await import("./quan-tri-trong.ts");

const NOW = new Date("2026-11-28T10:00:00+07:00");
const dongBo = (token: string, status: Record<string, unknown>) => xuLyMay(new Request("http://x/api/device/dong-bo", {
  method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ status }),
}), ["dong-bo"]);
const canhBaoQtt = (fam: string) => q<{ noi_dung: string; da_doc: boolean; khoa: string | null }>(
  `select noi_dung, da_doc, khoa from alerts where family_id = $1 and loai = $2 order by created_at`, [fam, LOAI_QUAN_TRI_TRONG]);

test("docQuanTriTrong: không phải mảng ⇒ null (agent cũ); bỏ rỗng / trùng / không phải chuỗi", () => {
  assert.equal(docQuanTriTrong(undefined), null);
  assert.equal(docQuanTriTrong("Admin"), null);
  assert.deepEqual(docQuanTriTrong([]), []);
  assert.deepEqual(docQuanTriTrong([" Admin ", "Admin", "", 3, "Bố"]), ["Admin", "Bố"]);
});

test("dong-bo: quanTriTrong khác rỗng ⇒ một cảnh báo chú ý theo máy, hiện ở «Cần Ba Mẹ để ý» + trang máy; báo rỗng ⇒ hết; agent cũ không đổi", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bin" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC-BIN");

  assert.equal((await dongBo(may.token, { quanTriTrong: ["Administrator"] })).status, 200);
  assert.equal((await dongBo(may.token, { quanTriTrong: ["Administrator"] })).status, 200);   // lặp ⇒ không thêm dòng
  let cb = await canhBaoQtt(fam);
  assert.equal(cb.length, 1);
  assert.equal(cb[0]!.noi_dung, "PC-BIN: tài khoản quản trị chưa có mật khẩu — bé có thể tự vào và gỡ AiiGrow (Administrator)");
  let c = await canDeY(fam, NOW);
  const dong = c.ds.find((x) => x.loai === "canh_bao" && x.tieu.includes("tài khoản quản trị chưa có mật khẩu"));
  assert.ok(dong, JSON.stringify(c.ds));
  assert.equal(dong!.den, `/may/${may.deviceId}`);
  assert.deepEqual((await chiTietTuanThu(fam, may.deviceId, NOW)).quanTriTrong, ["Administrator"]);

  // danh sách đổi ⇒ cùng dòng, nội dung mới
  await dongBo(may.token, { quanTriTrong: ["Administrator", "Bo"] });
  cb = await canhBaoQtt(fam);
  assert.equal(cb.length, 1);
  assert.match(cb[0]!.noi_dung, /\(Administrator, Bo\)$/);

  // agent cũ (không gửi trường) ⇒ giữ nguyên
  await dongBo(may.token, { phienBan: "0.2.0" });
  assert.equal((await canhBaoQtt(fam))[0]!.da_doc, false);
  assert.deepEqual((await chiTietTuanThu(fam, may.deviceId, NOW)).quanTriTrong, ["Administrator", "Bo"]);

  // đã đặt mật khẩu ⇒ hết ở «Cần Ba Mẹ để ý» và trang máy
  await dongBo(may.token, { quanTriTrong: [] });
  cb = await canhBaoQtt(fam);
  assert.equal(cb.length, 1);
  assert.equal(cb[0]!.da_doc, true);
  assert.equal(cb[0]!.khoa, null);
  c = await canDeY(fam, NOW);
  assert.ok(!c.ds.some((x) => x.tieu.includes("tài khoản quản trị")));
  assert.deepEqual((await chiTietTuanThu(fam, may.deviceId, NOW)).quanTriTrong, []);

  // lại trống ⇒ cảnh báo mới
  await dongBo(may.token, { quanTriTrong: ["Administrator"] });
  assert.equal((await canhBaoQtt(fam)).filter((x) => !x.da_doc).length, 1);
});
