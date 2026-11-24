// /tai/ghep/<g>: bộ cài Windows MANG SẴN gói ghép trong tên tệp — máy chủ chuyển tiếp tệp từ GitHub Release CHỈ khi gói cài còn hiệu lực và
// còn lượt (lib/tai-ghep.ts, #551); không đạt ⇒ chuyển về bộ cài thường (gõ mã 6 số).
import { nguonGoi } from "@/lib/gia-dinh.ts";
import { BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";
import { taiGhep } from "@/lib/tai-ghep.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;            // chỉ có nghĩa trên Vercel; trên VPS (pm2) luồng cắt theo lib/tai-ghep.ts (ngừng đọc 2 phút / tối đa 60 phút)

export async function GET(req: Request, { params }: { params: Promise<{ g: string }> }) {
  const server = process.env.AIIGROW_APP_URL || new URL(req.url).origin;      // cùng gốc với link ghép (api-m › ghep-may)
  return taiGhep((await params).g, server, nguonGoi(req.headers));
}

// HEAD (trình tải / quét virus dò trước) không được đốt lượt hay kéo tệp từ GitHub ⇒ trả thẳng về bộ cài thường.
export function HEAD() {
  return Response.redirect(BAN_AGENT_WINDOWS.url, 302);
}
