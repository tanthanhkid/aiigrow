// GET /api/agent/ban-moi[?platform=mac|android] — bản agent mới nhất {version, url, sha256} (+ versionCode cho android; lib/ban-agent.ts).
// Không có `platform` (agent Windows 0.2.x) ⇒ bản Windows như trước; `platform=mac` ⇒ agent-mac; `platform=android` ⇒ app Con Android. Công khai: không có gì bí mật, agent tự kiểm https + host + sha256 trước khi cài.
import { json } from "@/lib/api.ts";
import { banAgentCho, gocCongKhai } from "@/lib/ban-agent.ts";

export const GET = (req: Request) => {
  const u = new URL(req.url);
  return json(banAgentCho(u.searchParams.get("platform"), gocCongKhai(req, u)));
};

