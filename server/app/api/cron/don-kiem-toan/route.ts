// GET /api/cron/don-kiem-toan — Vercel Cron mỗi ngày 19:00 UTC = 02:00 giờ VN (server/vercel.json): xoá hẳn nhật ký audit của gia đình đã
// xoá quá 90 ngày (lib/xoa-tai-khoan.ts › donKiemToanGiaDinhDaXoa). Có biến CRON_SECRET thì bắt buộc «Authorization: Bearer <CRON_SECRET>»
// (Vercel tự gửi); chưa đặt biến thì mở — việc này chỉ xoá dữ liệu đã quá hạn chính sách, gọi lặp vô hại, giãn tối thiểu 1 giờ giữa hai lần.
import { timingSafeEqual } from "node:crypto";
import { json, loi, batLoi } from "@/lib/api.ts";
import { bearer } from "@/lib/auth.ts";
import { chayDonKiemToan } from "@/lib/xoa-tai-khoan.ts";

export const dynamic = "force-dynamic";

function dungKhoa(req: Request, khoa: string) {
  const a = Buffer.from(khoa), b = Buffer.from(bearer(req) ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  try {
    const khoa = process.env.CRON_SECRET;
    if (khoa && !dungKhoa(req, khoa)) return loi("khong_quyen", "Sai khoá cron", 401);
    const xoa = await chayDonKiemToan();
    return json({ ok: true, xoa, boQua: xoa === null });
  } catch (e) {
    return batLoi(e);
  }
}
