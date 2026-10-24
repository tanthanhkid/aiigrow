// GET /api/agent/ban-moi[?platform=mac] — bản agent mới nhất {version, url, sha256} (lib/ban-agent.ts). Không có `platform` (agent Windows
// 0.2.x) ⇒ bản Windows như trước; `platform=mac` ⇒ bản agent-mac. Công khai: không có gì bí mật, agent tự kiểm https + host + sha256 trước khi cài.
import { json } from "@/lib/api.ts";
import { banAgentCho } from "@/lib/ban-agent.ts";

export const GET = (req: Request) => {
  const u = new URL(req.url);
  return json(banAgentCho(u.searchParams.get("platform"), u.origin));
};
