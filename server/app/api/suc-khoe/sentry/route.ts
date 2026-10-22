// GET /api/suc-khoe/sentry — CHỈ bản preview: cố ý ném lỗi để kiểm đường Sentry (batLoi → aiigrow-server). Production ⇒ 404.
import { batLoi, loi } from "@/lib/api.ts";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") return loi("khong_thay", "Không có", 404);
  try {
    throw new Error(`Kiểm Sentry AiiGrow (preview ${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "?"})`);
  } catch (e) {
    return batLoi(e);
  }
}

// POST (chỉ preview): body giả có «matKhau» — kiểm sự kiện Sentry KHÔNG mang nội dung request
export async function POST(req: Request) {
  if (process.env.VERCEL_ENV !== "preview") return loi("khong_thay", "Không có", 404);
  await req.text();
  try {
    throw new Error(`Kiểm Sentry AiiGrow POST (preview ${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "?"})`);
  } catch (e) {
    return batLoi(e);
  }
}
