// GET /api/suc-khoe/sentry — cố ý ném lỗi để kiểm đường Sentry (batLoi → aiigrow-server). Chỉ bản preview Vercel, hoặc prod trên VPS (không phải Vercel) khi gửi
// «Authorization: Bearer <CRON_SECRET>» (kiểm sau deploy-vps.sh); còn lại ⇒ 404.
import { timingSafeEqual } from "node:crypto";
import { batLoi, loi } from "@/lib/api.ts";
import { bearer } from "@/lib/auth.ts";

function duocKiem(req: Request) {
  if (process.env.VERCEL_ENV === "preview") return true;
  if (process.env.VERCEL) return false;   // Vercel production: luôn 404 như trước; chỉ VPS mới kiểm bằng khoá
  const khoa = process.env.CRON_SECRET, b = bearer(req);
  if (!khoa || !b) return false;
  const x = Buffer.from(khoa), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
const ban = () => (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.AIIGROW_BAN)?.slice(0, 7) ?? "?";

export async function GET(req: Request) {
  if (!duocKiem(req)) return loi("khong_thay", "Không có", 404);
  try {
    throw new Error(`Kiểm Sentry AiiGrow (bản ${ban()})`);
  } catch (e) {
    return batLoi(e);
  }
}

// POST (cùng điều kiện): body giả có «matKhau» — kiểm sự kiện Sentry KHÔNG mang nội dung request
export async function POST(req: Request) {
  if (!duocKiem(req)) return loi("khong_thay", "Không có", 404);
  await req.text();
  try {
    throw new Error(`Kiểm Sentry AiiGrow POST (bản ${ban()})`);
  } catch (e) {
    return batLoi(e);
  }
}
