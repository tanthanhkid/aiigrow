// Bản agent Windows máy chủ đang phát — agent (UpdateWorker, 0.2.0+) hỏi GET /api/agent/ban-moi lúc khởi động + mỗi 6 giờ,
// có bản mới hơn thì tải, KIỂM sha256 rồi tự cài đè (giữ config). Phát bản mới: build agent-win → tải lên Blob tên có số bản
// (không đuôi ngẫu nhiên) → sửa ba giá trị dưới đây → merge. sha256 PHẢI là của đúng tệp trên Blob, sai thì agent xoá tệp, không cài.
import type { May } from "./gia-dinh.ts";

export const BAN_AGENT_WINDOWS = {
  version: "0.2.2",
  url: "https://frsxuiwqryvwsq70.public.blob.vercel-storage.com/tai/AiiGrow-Setup-0.2.2.exe",
  sha256: "6731c170cdcaf60cf99c88ccd50dc7b62b249a8f32bcd16d9a026cf7a05280ef",
} as const;

/** Bản agent máy Windows tự báo trong status khi đồng bộ (`status.version`) — máy Windows không gửi nhịp nên tuan_thu_may.phien_ban trống. */
export const banMayBao = (m: Pick<May, "status">): string | null => {
  const v = m.status?.version;
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : null;
};
