// /tai/ghep/<g>: bộ cài Windows MANG SẴN gói ghép trong tên tệp (`AiiGrow-Setup.enroll-<gói>.exe`) ⇒ bộ cài của W2 (SetupForm, đọc tên tệp
// qua EnrollmentReader.FromFileName) tự ghép bằng `POST /api/device/ghep-goi`, không gõ mã. Tệp gốc nằm ở GitHub Release (không đổi được tên
// tệp qua chuyển hướng) ⇒ máy chủ CHUYỂN TIẾP luồng byte (không đệm) kèm Content-Disposition. Lỗi lấy tệp ⇒ chuyển về bộ cài thường (gõ mã 6 số).
import { BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";
import { chuanToken } from "@/lib/ios-link.ts";
import { goiGhep, tenTepWindows } from "@/lib/trang-tai.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;            // ~182 MB qua mạng nhà chậm (≥ 0,7 MB/s)

const NGUON = `https://github.com/tanthanhkid/aiigrow-tai/releases/download/v${BAN_AGENT_WINDOWS.version}/AiiGrow-Setup-${BAN_AGENT_WINDOWS.version}.exe`;

export async function GET(req: Request, { params }: { params: Promise<{ g: string }> }) {
  const g = chuanToken((await params).g);
  const thuong = Response.redirect(BAN_AGENT_WINDOWS.url, 302);
  if (!g) return thuong;
  const server = process.env.AIIGROW_APP_URL || new URL(req.url).origin;      // cùng gốc với link ghép (api-m › ghep-may)
  const r = await fetch(NGUON, { redirect: "follow" }).catch(() => null);
  if (!r?.ok || !r.body) return thuong;
  const dai = r.headers.get("content-length");
  return new Response(r.body, {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${tenTepWindows(goiGhep(server, g))}"`,
      ...(dai ? { "content-length": dai } : {}),
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
