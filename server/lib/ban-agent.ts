// Bản agent Windows máy chủ đang phát — agent (UpdateWorker, 0.2.0+) hỏi GET /api/agent/ban-moi lúc khởi động + mỗi 6 giờ,
// có bản mới hơn thì tải, KIỂM sha256 rồi tự cài đè (giữ config). Phát bản mới: build agent-win → `gh release create v<bản>` ở repo
// public tanthanhkid/aiigrow-tai, tệp AiiGrow-Setup-<bản>.exe → sửa ba giá trị dưới đây → merge. sha256 PHẢI là của đúng tệp đã tải lên,
// sai thì agent xoá tệp, không cài. URL nằm trên tên miền máy chủ (agent 0.2.0+ chỉ nhận host máy chủ hoặc Vercel Blob) — next.config
// chuyển /tai/AiiGrow-Setup-<bản>.exe sang GitHub Release. Vercel Blob gói free bị khoá 23/10 (vượt hạn mức) nên bỏ Blob.
import type { May } from "./gia-dinh.ts";

export const BAN_AGENT_WINDOWS = {
  version: "0.2.5",
  url: "https://aiigrow.aiilab.vn/tai/AiiGrow-Setup-0.2.5.exe",
  sha256: "246a1f26b3d03e825852415cf4e10d975d549091fe090d8a012f4f1303a777fd",
} as const;

/** Bản agent macOS (agent-mac, tệp .pkg ký Developer ID + notarize). Phát bản: `KY_APP=… KY_PKG=… NOTARY=1 agent-mac/goi/build-pkg.sh` →
 *  `gh release create mac-<bản>` ở repo public tanthanhkid/aiigrow-tai → điền sha256 của đúng tệp → next.config chuyển /tai/AiiGrow-<bản>.pkg sang Release.
 *  agent Mac TỰ cập nhật từ bản 0.1.1 (hỏi lúc khởi động + mỗi 6 giờ; 0.1.0 phải cài tay một lần). Agent chỉ theo 302 tới github.com/tanthanhkid/aiigrow-tai/releases/download/ + máy chủ tệp Release,
 *  kiểm sha256 + chữ ký «Developer ID Installer: TAN THANH TRAN (ADUL7HT969)» trước khi cài — phát bản mới phải ký đúng chứng chỉ đó và điền sha256 của đúng tệp. */
export const BAN_AGENT_MAC = {
  version: "0.1.0",
  url: "https://aiigrow.aiilab.vn/tai/AiiGrow-0.1.0.pkg",
  sha256: "45773d1dbeab71063ffdaab5c95acf9b7a82690e827966d04a1907366a7b0c2e",
} as const;

/** Manifest bản mới theo nền tảng máy hỏi (`?platform=mac|windows`; không có ⇒ Windows để agent Windows cũ nhận y như trước).
 *  Mac: URL gói đặt trên CHÍNH máy chủ được hỏi (`origin` https — vd staging) vì agent Mac chỉ nhận gói cùng host với máy chủ nó ghép;
 *  /tai/AiiGrow-<bản>.pkg ở mọi bản triển khai đều chuyển tới cùng GitHub Release. */
export const banAgentCho = (platform: string | null | undefined, origin?: string) => {
  if (platform !== "mac") return BAN_AGENT_WINDOWS;
  if (!origin?.startsWith("https://")) return BAN_AGENT_MAC;
  return { ...BAN_AGENT_MAC, url: origin + new URL(BAN_AGENT_MAC.url).pathname };
};

/** Bản agent máy Windows tự báo trong status khi đồng bộ (`status.version`) — máy Windows không gửi nhịp nên tuan_thu_may.phien_ban trống. */
export const banMayBao = (m: Pick<May, "status">): string | null => {
  const v = m.status?.version;
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : null;
};
