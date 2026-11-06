// /tai/du-phong: link dự phòng khi tải bị dừng (màn «Tải bị dừng») — chuyển tới bộ cài đúng máy theo ?os= (nếu Ba Mẹ chọn tay) hoặc User-Agent.
// Windows có ?g= ⇒ qua tai/ghep/[g] để bộ cài vẫn mang gói ghép; Android ⇒ app Con; iPhone/iPad không có tệp ⇒ về trang /tai.
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";
import { heDieuHanh } from "@/lib/he-dieu-hanh.ts";
import { chuanToken } from "@/lib/ios-link.ts";
import { linkTaiWindowsGhep } from "@/lib/trang-tai.ts";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const u = new URL(req.url);
  const chon = u.searchParams.get("os");
  const os = chon === "windows" || chon === "mac" || chon === "android" || chon === "ios"
    ? chon : heDieuHanh(req.headers.get("user-agent") ?? "", req.headers.get("sec-ch-ua-platform") ?? "");
  const g = chuanToken(u.searchParams.get("g") ?? "");
  const di = (p: string) => Response.redirect(new URL(p, u.origin).toString(), 302);
  if (os === "mac") return di(BAN_AGENT_MAC.url);
  if (os === "android") return di("/tai/aiigrow-con.apk");
  if (os === "ios") return di("/tai");
  return di(g ? linkTaiWindowsGhep(g) : BAN_AGENT_WINDOWS.url);
}
