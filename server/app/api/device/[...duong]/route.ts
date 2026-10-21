// /api/device/* — agent thiết bị Con. Xử lý ở lib/api-may.ts.
import { xuLyMay } from "@/lib/api-may.ts";

type Ctx = { params: Promise<{ duong: string[] }> };
const xu = async (req: Request, ctx: Ctx) => xuLyMay(req, (await ctx.params).duong ?? []);
export const GET = xu;
export const POST = xu;
