// POST /api/aiirob — webhook «bài đạt» từ AiiRob, ký HMAC (lib/aiirob.ts).
import { xuLyAiiRob } from "@/lib/aiirob.ts";

export const POST = (req: Request) => xuLyAiiRob(req);
