// API app Ba Mẹ: /api/m/<đường>. Bearer = phiên Ba Mẹ (lib/auth.ts). Hợp đồng: docs/API.md.
import { batLoi, docJson, json, loi } from "@/lib/api.ts";
import { baMeGoi, bearer, dangKy, dangNhap, datLaiMatKhau, guiOtp, taoPhien, xoaPhien } from "@/lib/auth.ts";

type Ctx = { params: Promise<{ duong: string[] }> };

async function xuLy(req: Request, ctx: Ctx) {
  const p = (await ctx.params).duong ?? [];
  const get = req.method === "GET", post = req.method === "POST";
  const duong = p.join("/");
  // --- không cần đăng nhập
  if (duong === "otp" && post) {
    const b = await docJson(req);
    return json(await guiOtp(b.dinhDanh, b.mucDich === "quen_mk" ? "quen_mk" : "dang_ky"));
  }
  if (duong === "dang-ky" && post) {
    const id = await dangKy(await docJson(req));
    return json({ token: await taoPhien(id), moi: true });
  }
  if (duong === "dang-nhap" && post) {
    const b = await docJson(req);
    return json({ token: await taoPhien(await dangNhap(b.dinhDanh, b.matKhau)) });
  }
  if (duong === "quen-mat-khau" && post) {
    const b = await docJson(req);
    await datLaiMatKhau(b.dinhDanh, b.ma, b.matKhauMoi);
    return json({ ok: true });
  }
  // --- cần đăng nhập
  const bm = await baMeGoi(req);
  if (!bm) return loi("chua_dang_nhap", "Phiên đăng nhập đã hết — đăng nhập lại nhé", 401);
  if (duong === "toi" && get) return json({ baMe: { id: bm.id, ten: bm.ten, dinhDanh: bm.dinh_danh, vai: bm.vai } });
  if (duong === "dang-xuat" && post) {
    await xoaPhien(bearer(req)!);
    return json({ ok: true });
  }
  return loi("khong_co_duong", "Không có đường này", 404);
}

const bocLoi = (f: typeof xuLy) => async (req: Request, ctx: Ctx) => {
  try {
    return await f(req, ctx);
  } catch (e) {
    return batLoi(e);
  }
};

export const GET = bocLoi(xuLy);
export const POST = bocLoi(xuLy);
