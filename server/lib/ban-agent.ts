// Bản agent Windows máy chủ đang phát — agent (UpdateWorker, 0.2.0+) hỏi GET /api/agent/ban-moi lúc khởi động + theo chuKyKiemPhut (dưới đây),
// có bản mới hơn thì tải, KIỂM sha256 rồi tự cài đè (giữ config). Phát bản mới: build agent-win (exe của CI có ngay khi job build xong,
// không chờ e2e: run của đúng commit (`gh run list -w agent-win -c <sha>`) → `gh run download <run-id> -R tanthanhkid/aiigrow -n setup-goc` — xem đầu
// .github/workflows/agent-win.yml; e2e của run đó đỏ ⇒ đừng merge manifest này) → `gh release create v<bản>` ở repo
// public tanthanhkid/aiigrow-tai, tệp AiiGrow-Setup-<bản>.exe → sửa ba giá trị dưới đây → merge. sha256 PHẢI là của đúng tệp đã tải lên,
// sai thì agent xoá tệp, không cài. URL nằm trên tên miền máy chủ (agent 0.2.0+ chỉ nhận host máy chủ hoặc Vercel Blob) — next.config
// chuyển /tai/AiiGrow-Setup-<bản>.exe sang GitHub Release. Vercel Blob gói free bị khoá 23/10 (vượt hạn mức) nên bỏ Blob.
import type { May } from "./gia-dinh.ts";

/** Chu kỳ agent hỏi bản mới, phút — DÙNG CHUNG Windows (0.2.12+) và Mac (0.1.6+); agent kẹp [5, 1440], không có trường ⇒ 6 giờ.
 *  Giai đoạn dev: 15 (Thanh 28/10). TRƯỚC GOLIVE đổi về 360 (6 giờ) — chỉ sửa số này rồi deploy máy chủ, không phát lại agent.
 *  Đồng hồ là giờ thật (máy ngủ vẫn tính). */
export const CHU_KY_KIEM_PHUT = 15;

// 0.2.12 (28/10, tự cập nhật theo giờ thật + chuKyKiemPhut; 0.2.11 sửa Start menu đơ): exe từ CI agent-win run 40648893556 (job build goc, commit ae9f0c1, PR #171); sha256 đo trên tệp tải về từ Release.
export const BAN_AGENT_WINDOWS = {
  chuKyKiemPhut: CHU_KY_KIEM_PHUT,
  version: "0.2.12",
  url: "https://aiigrow.aiilab.vn/tai/AiiGrow-Setup-0.2.12.exe",
  sha256: "f48532fa52ce0ba0a7aef1dfa610aa5bfc668caac3513ad82eb9fb468f2e2530",
} as const;

/** Bản agent macOS (agent-mac, tệp .pkg ký Developer ID + notarize). Phát bản: `KY_APP=… KY_PKG=… NOTARY=1 agent-mac/goi/build-pkg.sh` →
 *  `gh release create mac-<bản>` ở repo public tanthanhkid/aiigrow-tai → điền sha256 của đúng tệp → next.config chuyển /tai/AiiGrow-<bản>.pkg sang Release.
 *  agent Mac TỰ cập nhật từ bản 0.1.1 (hỏi lúc khởi động + theo chuKyKiemPhut từ 0.1.6, bản cũ hơn mỗi 6 giờ; 0.1.0 phải cài tay một lần). Agent chỉ theo 302 tới github.com/tanthanhkid/aiigrow-tai/releases/download/ + máy chủ tệp Release,
 *  kiểm sha256 + chữ ký «Developer ID Installer: TAN THANH TRAN (ADUL7HT969)» trước khi cài — phát bản mới phải ký đúng chứng chỉ đó và điền sha256 của đúng tệp. */
// 0.1.7 (31/10, vá lớp lỗi Windows: mồ côi tự thôi chặn, gỡ trả DNS, cập nhật không để daemon đứng): build-pkg.sh trên Mac của Thanh từ commit 119e32e
// (PR #174), notarize Accepted; sha256 đo trên tệp tải về từ Release mac-0.1.7. (0.1.6: commit 5eb73e0, PR #172.)
export const BAN_AGENT_MAC = {
  chuKyKiemPhut: CHU_KY_KIEM_PHUT,
  version: "0.1.7",
  url: "https://aiigrow.aiilab.vn/tai/AiiGrow-0.1.7.pkg",
  sha256: "f6bb388f4f518ce0a4de6c1de93875cf0f6d9ce9e4cf4f6830fe2c590034430e",
} as const;

/** Bản app Con Android (agent-android, vn.aiilab.aiigrow.con, APK ký khoá phát hành aiigrow-con — chứng chỉ SHA-256 ED:65:…:C5:93).
 *  App TỰ cập nhật từ bản 0.2.2 (hỏi `?platform=android` lúc mở + mỗi 6 giờ; 0.2.0/0.2.1 phải cài tay một lần): so `versionCode`,
 *  tải qua https (chỉ theo chuyển hướng tới github.com/tanthanhkid/aiigrow-tai/releases/download/ + máy chủ tệp Release), kiểm sha256
 *  + chữ ký APK trùng chữ ký app đang chạy rồi cài (Device Owner: im lặng; không: hộp xác nhận của Android).
 *  Phát bản: tăng versionCode/versionName trong agent-android/app/build.gradle.kts → assembleRelease (ky.env) → `gh release create
 *  con-android-<bản>` ở tanthanhkid/aiigrow-tai, tệp AiiGrow-Con-android.apk → điền ba giá trị dưới (sha256 của đúng tệp tải về từ Release)
 *  → sửa redirect /tai/aiigrow-con.apk trong next.config. versionCode PHẢI khớp APK (app kiểm, lệch ⇒ không cài). */
// 0.2.3: assembleRelease khoá aiigrow-con từ commit 68d44f6 (tag phathanh-3-src) (PR #128); sha256 đo trên tệp tải về từ Release.
export const BAN_CON_ANDROID = {
  version: "0.2.3",
  versionCode: 5,
  url: "https://aiigrow.aiilab.vn/tai/AiiGrow-Con-0.2.3.apk",
  sha256: "62d63ff25d94cc7118aea8a29bc7df26bec2c411f9bff52d7fcdaf68e54f41ed",
} as const;

/** Đổi host của URL gói sang CHÍNH máy chủ được hỏi (`origin` https — vd staging): agent Mac/Android chỉ nhận gói cùng host với máy chủ
 *  nó ghép; /tai/<tệp> ở mọi bản triển khai đều chuyển tới cùng GitHub Release. */
const theoGoc = <T extends { url: string }>(b: T, origin?: string): T =>
  origin?.startsWith("https://") ? { ...b, url: origin + new URL(b.url).pathname } : b;

/** Manifest bản mới theo nền tảng máy hỏi (`?platform=mac|android|windows`; không có ⇒ Windows để agent Windows cũ nhận y như trước). */
export const banAgentCho = (platform: string | null | undefined, origin?: string) => {
  if (platform === "mac") return theoGoc(BAN_AGENT_MAC, origin);
  if (platform === "android") return theoGoc(BAN_CON_ANDROID, origin);
  return BAN_AGENT_WINDOWS;
};

/** Bản agent máy Windows tự báo trong status khi đồng bộ (`status.version`) — máy Windows không gửi nhịp nên tuan_thu_may.phien_ban trống. */
export const banMayBao = (m: Pick<May, "status">): string | null => {
  const v = m.status?.version;
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : null;
};

// Origin công khai: sau reverse proxy (nginx → Next standalone) `req.url` là http://localhost:3000 ⇒ lấy x-forwarded-proto/host
// (giá trị đầu nếu có nhiều chặng). Header bị giả chỉ đổi manifest của chính người gọi; agent vẫn đòi gói https cùng host máy chủ nó ghép.
// Chỉ tin cặp header khi proxy gửi x-forwarded-host (thiếu host thì giữ origin của req.url: http nội bộ ⇒ banAgentCho dùng URL gốc,
// không ghép «https» với host nội bộ thành https://localhost:3000).
export const gocCongKhai = (req: Request, u: URL) => {
  const dau = (t: string | null) => t?.split(",")[0]?.trim() || undefined;
  const host = dau(req.headers.get("x-forwarded-host"));
  if (!host) return u.origin;
  return `${dau(req.headers.get("x-forwarded-proto")) ?? u.protocol.replace(/:$/, "")}://${host}`;
};
