// Tự cập nhật agent Windows: manifest bản mới + bản máy tự báo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAN_AGENT_WINDOWS, banMayBao } from "./ban-agent.ts";

test("manifest bản mới: số bản, https Blob, sha256 64 hex", () => {
  assert.match(BAN_AGENT_WINDOWS.version, /^\d+\.\d+\.\d+$/);
  const u = new URL(BAN_AGENT_WINDOWS.url);
  assert.equal(u.protocol, "https:");
  assert.ok(u.hostname.endsWith(".public.blob.vercel-storage.com"));
  assert.ok(u.pathname.includes(BAN_AGENT_WINDOWS.version), "tên tệp có số bản ⇒ sha256 không lệch khi tải bản khác lên");
  assert.match(BAN_AGENT_WINDOWS.sha256, /^[0-9a-f]{64}$/);
});

test("bản máy tự báo trong status", () => {
  assert.equal(banMayBao({ status: { version: " 0.2.0 " } } as never), "0.2.0");
  assert.equal(banMayBao({ status: { version: "" } } as never), null);
  assert.equal(banMayBao({ status: { version: 2 } } as never), null);
  assert.equal(banMayBao({ status: null } as never), null);
});
