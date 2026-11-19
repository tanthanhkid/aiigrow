// GET /api/cron/qua-han — #433 B2: mỗi 30 phút (VPS /etc/cron.d/aiigrow, mẫu scripts/vps/aiigrow.cron) quét lượt nhiệm vụ chờ duyệt của MỌI gia đình:
// nhắc Ba Mẹ lượt chờ quá `nv_nhac_gio`, hết hạn (ghi sự kiện + cảnh báo) hoặc tự duyệt lượt quá `nv_het_han_gio`, đóng lượt dở của việc đã tắt /
// hết hạn (lib/nhiem-vu.ts › quetQuaHan). Trước đây chỉ chạy khi Ba Mẹ mở «Chờ duyệt». Khoá như /api/cron/don-kiem-toan: có CRON_SECRET thì bắt buộc
// «Authorization: Bearer <CRON_SECRET>»; gọi lặp vô hại (nhắc / hết hạn có khoá một lần mỗi lượt).
import { timingSafeEqual } from "node:crypto";
import { json, loi, batLoi } from "@/lib/api.ts";
import { bearer } from "@/lib/auth.ts";
import { quetQuaHan } from "@/lib/nhiem-vu.ts";

export const dynamic = "force-dynamic";

function dungKhoa(req: Request, khoa: string) {
  const a = Buffer.from(khoa), b = Buffer.from(bearer(req) ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  try {
    const khoa = process.env.CRON_SECRET;
    if (khoa && !dungKhoa(req, khoa)) return loi("khong_quyen", "Sai khoá cron", 401);
    return json({ ok: true, ...(await quetQuaHan()) });
  } catch (e) {
    return batLoi(e);
  }
}
