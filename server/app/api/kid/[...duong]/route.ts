// /api/kid/* — màn Con. Xử lý ở lib/api-con.ts.
import { xuLyCon } from "@/lib/api-con.ts";

type Ctx = { params: Promise<{ duong: string[] }> };
const xu = async (req: Request, ctx: Ctx) => xuLyCon(req, (await ctx.params).duong ?? []);
export const GET = xu;
export const POST = xu;
