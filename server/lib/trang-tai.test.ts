import { test } from "node:test";
import assert from "node:assert/strict";
import { oMa, thamSoTai } from "./trang-tai.ts";

test("trang /tai đọc ?g=&ma= của link Ghép máy", () => {
  const t = thamSoTai({ g: "Ab3d_Ef9-hJk<script>", ma: "482017" }, "windows");
  assert.equal(t.g, "Ab3d_Ef9-hJkscript");
  assert.equal(t.ma, "482017");
  assert.equal(t.nen, "windows");
  assert.equal(t.moApp, null);
  assert.deepEqual(oMa(t.ma), ["4", "8", "2", "0", "1", "7"]);
});

test("mã không đủ 6 số ⇒ bỏ; máy lạ ⇒ Windows; iPhone có token ⇒ mở app Con", () => {
  assert.equal(thamSoTai({ ma: "48 2" }, "khac").ma, "");
  assert.equal(thamSoTai({}, "khac").nen, "windows");
  assert.equal(thamSoTai({ g: "tok123" }, "ios").moApp, "aiigrowcon://cai/tok123");
  assert.equal(thamSoTai({}, "ios").moApp, null);
  assert.equal(thamSoTai({ ma: ["123456", "999999"] }, "mac").ma, "123456");
});

test("tên tệp bộ cài Windows mang gói ghép đúng định dạng agent-win (base64url JSON {server, token})", async () => {
  const { goiGhep, tenTepWindows } = await import("./trang-tai.ts");
  const goi = goiGhep("https://aiigrow.aiilab.vn/", "Ab3d_Ef9");
  assert.deepEqual(JSON.parse(Buffer.from(goi, "base64url").toString()), { server: "https://aiigrow.aiilab.vn", token: "Ab3d_Ef9" });
  assert.match(goi, /^[A-Za-z0-9_-]+$/);
  assert.equal(tenTepWindows(goi), `AiiGrow-Setup.enroll-${goi}.exe`);
});
