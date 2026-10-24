// Tệp liên kết ứng dụng của Apple (universal link /cai/*). Không đuôi, phải trả application/json, không chuyển hướng.
import { aasa } from "@/lib/ios-link.ts";

export const dynamic = "force-dynamic";
export const GET = () => Response.json(aasa(), { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
