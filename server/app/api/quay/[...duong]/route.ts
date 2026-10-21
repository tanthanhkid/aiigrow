// /api/quay/* — màn quầy AiiCafe. Xử lý ở lib/api-quay.ts (test được bằng node --test).
import { xuLyQuay } from "@/lib/api-quay.ts";

type Ctx = { params: Promise<{ duong: string[] }> };
const xu = async (req: Request, ctx: Ctx) => xuLyQuay(req, (await ctx.params).duong ?? []);
export const GET = xu;
export const POST = xu;
