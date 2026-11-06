// /tai/du-phong: link dự phòng khi tải bị dừng (màn «Tải bị dừng») — chuyển tới bộ cài đúng máy theo User-Agent.
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";
import { heDieuHanh } from "@/lib/he-dieu-hanh.ts";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const os = heDieuHanh(req.headers.get("user-agent") ?? "", req.headers.get("sec-ch-ua-platform") ?? "");
  return Response.redirect(os === "mac" ? BAN_AGENT_MAC.url : BAN_AGENT_WINDOWS.url, 302);
}
