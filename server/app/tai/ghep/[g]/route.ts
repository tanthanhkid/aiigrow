// /tai/ghep/<g>: bộ cài Windows MANG SẴN gói ghép trong tên tệp — máy chủ chuyển tiếp tệp từ GitHub Release CHỈ khi gói cài còn hiệu lực và
// còn lượt (lib/tai-ghep.ts, #551); không đạt ⇒ chuyển về bộ cài thường (gõ mã 6 số).
import { nguonGoi } from "@/lib/gia-dinh.ts";
import { dauTaiGhep, taiGhep } from "@/lib/tai-ghep.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Trên VPS (pm2) luồng cắt theo lib/tai-ghep.ts (ngừng đọc 2 phút / tối đa 60 phút)

export async function GET(req: Request, { params }: { params: Promise<{ g: string }> }) {
  const server = process.env.AIIGROW_APP_URL || new URL(req.url).origin;      // cùng gốc với link ghép (api-m › ghep-may)
  return taiGhep((await params).g, server, nguonGoi(req.headers));
}

// HEAD (trình tải dò tên tệp trước): không đốt lượt, không kéo tệp từ GitHub (lib/tai-ghep.ts › dauTaiGhep).
export async function HEAD(req: Request, { params }: { params: Promise<{ g: string }> }) {
  return dauTaiGhep((await params).g, process.env.AIIGROW_APP_URL || new URL(req.url).origin);
}
