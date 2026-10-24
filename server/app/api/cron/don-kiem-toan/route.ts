// GET /api/cron/don-kiem-toan — Vercel Cron mỗi ngày (server/vercel.json): xoá hẳn nhật ký audit của gia đình đã xoá tài khoản quá 90 ngày
// (lib/xoa-tai-khoan.ts › donKiemToanGiaDinhDaXoa). Có biến CRON_SECRET thì bắt buộc «Authorization: Bearer <CRON_SECRET>» (Vercel tự gửi);
// chưa đặt biến thì mở — việc này chỉ xoá dữ liệu đã quá hạn chính sách, gọi lặp vô hại, và giãn tối thiểu 1 giờ giữa hai lần chạy.
import { json, loi, batLoi } from "@/lib/api.ts";
import { bearer } from "@/lib/auth.ts";
import { chayDonKiemToan } from "@/lib/xoa-tai-khoan.ts";

export async function GET(req: Request) {
  try {
    const bm = process.env.CRON_SECRET;
    if (bm && bearer(req) !== bm) return loi("khong_quyen", "Sai khoá cron", 401);
    const xoa = await chayDonKiemToan();
    return json({ ok: true, xoa, boQua: xoa === null });
  } catch (e) {
    return batLoi(e);
  }
}
