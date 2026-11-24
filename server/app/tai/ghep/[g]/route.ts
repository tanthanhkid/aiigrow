// /tai/ghep/<g>: bộ cài Windows MANG SẴN gói ghép trong tên tệp — máy chủ chuyển tiếp tệp từ GitHub Release CHỈ khi gói cài còn hiệu lực và
// còn lượt (lib/tai-ghep.ts, #551); không đạt ⇒ chuyển về bộ cài thường (gõ mã 6 số).
import { nguonGoi } from "@/lib/gia-dinh.ts";
import { taiGhep } from "@/lib/tai-ghep.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;            // ~186 MB qua mạng nhà chậm (≥ 0,7 MB/s)

export async function GET(req: Request, { params }: { params: Promise<{ g: string }> }) {
  const server = process.env.AIIGROW_APP_URL || new URL(req.url).origin;      // cùng gốc với link ghép (api-m › ghep-may)
  return taiGhep((await params).g, server, nguonGoi(req.headers));
}
