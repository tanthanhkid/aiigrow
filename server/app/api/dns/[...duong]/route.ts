// /api/dns/* — resolver lọc tự host của AiiGrow (kéo chính sách, gửi nhật ký tóm tắt). Xử lý ở lib/api-dns.ts.
import { xuLyDns } from "@/lib/api-dns.ts";

type Ctx = { params: Promise<{ duong: string[] }> };
const xu = async (req: Request, ctx: Ctx) => xuLyDns(req, (await ctx.params).duong ?? []);
export const GET = xu;
export const POST = xu;
