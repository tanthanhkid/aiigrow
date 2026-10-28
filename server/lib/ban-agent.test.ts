// Tự cập nhật agent Windows: manifest bản mới + bản máy tự báo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS, BAN_CON_ANDROID, banAgentCho, banMayBao } from "./ban-agent.ts";

test("manifest bản mới: số bản, https trên tên miền máy chủ, sha256 64 hex", () => {
  assert.match(BAN_AGENT_WINDOWS.version, /^\d+\.\d+\.\d+$/);
  const u = new URL(BAN_AGENT_WINDOWS.url);
  assert.equal(u.protocol, "https:");
  assert.equal(u.hostname, "aiigrow.aiilab.vn", "agent chỉ nhận host máy chủ hoặc Blob");
  assert.match(u.pathname, /^\/tai\/AiiGrow-Setup-\d+\.\d+\.\d+\.exe$/, "khớp luật chuyển hướng trong next.config");
  assert.ok(u.pathname.includes(BAN_AGENT_WINDOWS.version), "tên tệp có số bản ⇒ sha256 không lệch khi tải bản khác lên");
  assert.match(BAN_AGENT_WINDOWS.sha256, /^[0-9a-f]{64}$/);
  // agent kẹp [5, 1440]; dev 15, TRƯỚC GOLIVE về 360 (CHU_KY_KIEM_PHUT_WINDOWS trong ban-agent.ts)
  assert.ok(Number.isInteger(BAN_AGENT_WINDOWS.chuKyKiemPhut) && BAN_AGENT_WINDOWS.chuKyKiemPhut >= 5 && BAN_AGENT_WINDOWS.chuKyKiemPhut <= 1440);
});

test("manifest bản Mac: số bản, https trên tên miền máy chủ, tên gói khớp số bản, sha256 64 hex", () => {
  assert.match(BAN_AGENT_MAC.version, /^\d+\.\d+\.\d+$/);
  const u = new URL(BAN_AGENT_MAC.url);
  assert.equal(u.protocol, "https:");
  assert.equal(u.hostname, "aiigrow.aiilab.vn");
  assert.equal(u.pathname, `/tai/AiiGrow-${BAN_AGENT_MAC.version}.pkg`, "tên gói đúng mẫu /tai/AiiGrow-<bản>.pkg");
  assert.match(BAN_AGENT_MAC.sha256, /^[0-9a-f]{64}$/);
});

test("manifest app Con Android: số bản + versionCode, https trên tên miền máy chủ, tệp có số bản khớp redirect, sha256 64 hex", async () => {
  assert.match(BAN_CON_ANDROID.version, /^\d+\.\d+\.\d+$/);
  assert.ok(Number.isInteger(BAN_CON_ANDROID.versionCode) && BAN_CON_ANDROID.versionCode >= 3, "app so versionCode, không so chuỗi bản");
  const u = new URL(BAN_CON_ANDROID.url);
  assert.equal(u.protocol, "https:");
  assert.equal(u.hostname, "aiigrow.aiilab.vn");
  assert.equal(u.pathname, `/tai/AiiGrow-Con-${BAN_CON_ANDROID.version}.apk`);
  assert.match(BAN_CON_ANDROID.sha256, /^[0-9a-f]{64}$/);
  const rd = (await (await import("../next.config.ts")).default.redirects!()) as { source: string; destination: string }[];
  const r = rd.find((x) => x.source.startsWith("/tai/AiiGrow-Con-"));
  assert.ok(r, "có luật chuyển hướng /tai/AiiGrow-Con-<bản>.apk");
  const m = new RegExp("^" + r.source.replace(":ban", "") + "$").exec(u.pathname);
  assert.ok(m, "URL manifest khớp luật chuyển hướng");
  assert.equal(r.destination.replaceAll(":ban", m[1]),
    `https://github.com/tanthanhkid/aiigrow-tai/releases/download/con-android-${BAN_CON_ANDROID.version}/AiiGrow-Con-android.apk`);
  // link tải tay (QR Device Owner, trang /tai) cùng trỏ bản đang phát
  assert.equal(rd.find((x) => x.source === "/tai/aiigrow-con.apk")?.destination, r.destination.replaceAll(":ban", BAN_CON_ANDROID.version));
});

test("banAgentCho: windows mặc định, mac/android theo host máy chủ https được hỏi", () => {
  assert.equal(banAgentCho(null), BAN_AGENT_WINDOWS);
  assert.equal(banAgentCho("windows", "https://staging.test"), BAN_AGENT_WINDOWS);
  assert.equal(banAgentCho("ios", "https://staging.test"), BAN_AGENT_WINDOWS);
  const a = banAgentCho("android", "https://staging.test") as typeof BAN_CON_ANDROID;
  assert.equal(a.url, `https://staging.test/tai/AiiGrow-Con-${BAN_CON_ANDROID.version}.apk`);
  assert.equal(a.versionCode, BAN_CON_ANDROID.versionCode);
  assert.equal(a.sha256, BAN_CON_ANDROID.sha256);
  assert.equal(banAgentCho("android", "http://localhost:3000"), BAN_CON_ANDROID, "origin http nội bộ ⇒ URL gốc");
  assert.equal(banAgentCho("mac", "https://staging.test").url, `https://staging.test/tai/AiiGrow-${BAN_AGENT_MAC.version}.pkg`);
});

test("bản máy tự báo trong status", () => {
  assert.equal(banMayBao({ status: { version: " 0.2.0 " } } as never), "0.2.0");
  assert.equal(banMayBao({ status: { version: "" } } as never), null);
  assert.equal(banMayBao({ status: { version: 2 } } as never), null);
  assert.equal(banMayBao({ status: null } as never), null);
});
