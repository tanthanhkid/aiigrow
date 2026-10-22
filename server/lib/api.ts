// Tiện ích route: JSON thống nhất {error, message}, đọc body an toàn, đổi lỗi nghiệp vụ thành HTTP.
import { baoLoiHeThong } from "./giam-sat.ts";
import { LoiNghiepVu } from "./loi.ts";

export const json = (d: unknown, status = 200) => Response.json(d, { status, headers: { "cache-control": "no-store" } });

export const loi = (ma: string, msg: string, status = 400) => json({ error: ma, message: msg }, status);

export async function docJson(req: Request): Promise<Record<string, any>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

export function batLoi(e: unknown) {
  if (e instanceof LoiNghiepVu) return loi(e.ma, e.message, e.status);
  console.error(e);
  baoLoiHeThong(e);
  return loi("loi_may_chu", "AiiGrow đang gặp sự cố khi làm việc này. Thử lại sau ít phút; nếu lặp lại, nhắn AiiLab ở mục Hỗ trợ.", 500);
}
