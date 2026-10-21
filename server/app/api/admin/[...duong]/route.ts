// /api/admin/* — cổng quản trị AiiLab. Xử lý ở lib/api-admin.ts (test được bằng node --test).
import { xuLyAdmin } from "@/lib/api-admin.ts";

type Ctx = { params: Promise<{ duong: string[] }> };
const xu = async (req: Request, ctx: Ctx) => xuLyAdmin(req, (await ctx.params).duong ?? []);
export const GET = xu;
export const POST = xu;
