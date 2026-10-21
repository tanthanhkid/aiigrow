// /api/m/* — app Ba Mẹ. Xử lý ở lib/api-m.ts (test được bằng node --test).
import { xuLyM } from "@/lib/api-m.ts";

type Ctx = { params: Promise<{ duong: string[] }> };
const xu = async (req: Request, ctx: Ctx) => xuLyM(req, (await ctx.params).duong ?? []);
export const GET = xu;
export const POST = xu;
