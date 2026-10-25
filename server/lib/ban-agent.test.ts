// Tự cập nhật agent Windows: manifest bản mới + bản máy tự báo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS, banMayBao } from "./ban-agent.ts";

test("manifest bản mới: số bản, https trên tên miền máy chủ, sha256 64 hex", () => {
  assert.match(BAN_AGENT_WINDOWS.version, /^\d+\.\d+\.\d+$/);
  const u = new URL(BAN_AGENT_WINDOWS.url);
  assert.equal(u.protocol, "https:");
  assert.equal(u.hostname, "aiigrow.aiilab.vn", "agent chỉ nhận host máy chủ hoặc Blob");
  assert.match(u.pathname, /^\/tai\/AiiGrow-Setup-\d+\.\d+\.\d+\.exe$/, "khớp luật chuyển hướng trong next.config");
  assert.ok(u.pathname.includes(BAN_AGENT_WINDOWS.version), "tên tệp có số bản ⇒ sha256 không lệch khi tải bản khác lên");
  assert.match(BAN_AGENT_WINDOWS.sha256, /^[0-9a-f]{64}$/);
});

test("manifest bản Mac: số bản, https trên tên miền máy chủ, tên gói khớp số bản, sha256 64 hex", () => {
  assert.match(BAN_AGENT_MAC.version, /^\d+\.\d+\.\d+$/);
  const u = new URL(BAN_AGENT_MAC.url);
  assert.equal(u.protocol, "https:");
  assert.equal(u.hostname, "aiigrow.aiilab.vn");
  assert.equal(u.pathname, `/tai/AiiGrow-${BAN_AGENT_MAC.version}.pkg`, "tên gói đúng mẫu /tai/AiiGrow-<bản>.pkg");
  assert.match(BAN_AGENT_MAC.sha256, /^[0-9a-f]{64}$/);
});

test("bản máy tự báo trong status", () => {
  assert.equal(banMayBao({ status: { version: " 0.2.0 " } } as never), "0.2.0");
  assert.equal(banMayBao({ status: { version: "" } } as never), null);
  assert.equal(banMayBao({ status: { version: 2 } } as never), null);
  assert.equal(banMayBao({ status: null } as never), null);
});
