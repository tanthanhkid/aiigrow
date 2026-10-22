// GET /api/agent/ban-moi — bản agent Windows mới nhất {version, url, sha256} (lib/ban-agent.ts). Công khai: không có gì bí mật,
// agent tự kiểm https + host + sha256 trước khi cài.
import { json } from "@/lib/api.ts";
import { BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";

export const GET = () => json(BAN_AGENT_WINDOWS);
