// /api/m/* — thành viên gia đình (FR-01.04) + thông báo trong app (FR-08.01). Gọi từ lib/api-m.ts (chỉ thêm hai dòng chuyển tiếp).
//   không cần đăng nhập: GET moi/:ma · POST moi/dang-ky
//   cần đăng nhập:       GET thanh-vien · POST thanh-vien/moi · POST thanh-vien/moi/:id/huy · POST thanh-vien/:id/vai · POST thanh-vien/:id/moi-ra
//                        POST moi/nhan · POST con/:id/dong-bang-chuoi · GET con/:id/bao-cao/csv · GET thong-bao · POST thong-bao/doc · GET/POST thong-bao/cai-dat
// Thông báo là của RIÊNG từng Ba Mẹ ⇒ vai Chỉ xem vẫn đánh dấu đã đọc / đặt giờ yên lặng được (đi trước chặn «chỉ xem» của api-m).
import { docJson, json } from "./api.ts";
import { taoPhien, type BaMe } from "./auth.ts";
import * as tv from "./thanh-vien.ts";
import * as tb from "./thong-bao.ts";
import { conCua } from "./gia-dinh.ts";
import { dongBangChuoi } from "./dong-bang.ts";
import { xuatCsvBaoCao } from "./xuat-csv.ts";

const goc = (req: Request) => process.env.AIIGROW_APP_URL || new URL(req.url).origin;

/** Đường không cần đăng nhập. null = không phải đường của mô-đun này. */
export async function xuLyMoiCongKhai(req: Request, p: string[]): Promise<Response | null> {
  if (p[0] !== "moi") return null;
  if (p[1] === "dang-ky" && p.length === 2 && req.method === "POST")
    return json({ token: await taoPhien(await tv.dangKyTheoLoiMoi(await docJson(req))) });
  if (p[1] && p[1] !== "nhan" && p[1] !== "dang-ky" && p.length === 2 && req.method === "GET") return json(await tv.xemLoiMoi(p[1]));
  return null;
}

/** Thông báo — trước chặn «chỉ xem». */
export async function xuLyThongBao(req: Request, bm: BaMe, p: string[]): Promise<Response | null> {
  if (p[0] !== "thong-bao") return null;
  const d = p.join("/"), get = req.method === "GET", post = req.method === "POST";
  if (d === "thong-bao" && get) return json(await tb.dsThongBao(bm));
  if (d === "thong-bao/doc" && post) {
    const b = await docJson(req);
    const den = b.den ? new Date(String(b.den)) : new Date();
    await tb.danhDauDoc(bm.id, Number.isFinite(den.getTime()) && den <= new Date() ? den : new Date());
    return json({ ok: true });
  }
  if (d === "thong-bao/cai-dat" && get) { const c = await tb.caiDatTb(bm.id); return json({ yenLang: c.yenLang, tat: c.tat }); }
  if (d === "thong-bao/cai-dat" && post) return json(await tb.luuCaiDatTb(bm.id, await docJson(req)));
  return null;
}

/** Thành viên — sau chặn «chỉ xem» (mọi POST ở đây là việc của Chủ gia đình, hoặc nhận lời mời). */
export async function xuLyThanhVien(req: Request, bm: BaMe, p: string[], b: Record<string, any>): Promise<Response | null> {
  const get = req.method === "GET", post = req.method === "POST";
  if (p[0] === "moi" && p[1] === "nhan" && p.length === 2 && post) return json(await tv.nhanLoiMoi(bm, b.ma));
  // FR-03.06 đóng băng chuỗi ngày · FR-06.02 xuất CSV báo cáo tuần
  if (p[0] === "con" && p[1] && p.length >= 3) {
    const sau = p.slice(2).join("/");
    if (sau === "dong-bang-chuoi" && post) { await conCua(bm.family_id, p[1]); return json(await dongBangChuoi(bm.family_id, p[1], bm.id)); }
    if (sau === "bao-cao/csv" && get) { await conCua(bm.family_id, p[1]); return json(await xuatCsvBaoCao(bm.family_id, p[1])); }
  }
  if (p[0] !== "thanh-vien") return null;
  if (p.length === 1 && get) {
    const { ds, loiMoi } = await tv.dsThanhVien(bm.family_id);
    return json({ ds: ds.map((x) => ({ id: x.id, ten: x.ten, vai: x.vai, dinh_danh: x.dinh_danh, laToi: x.id === bm.id })),
      loiMoi: loiMoi.map((x) => ({ id: x.id, vai: x.vai, tenGoi: x.ten_goi, het: new Date(x.het).toISOString() })),
      toi: { id: bm.id, vai: bm.vai }, hanGio: tv.LOI_MOI_GIO });
  }
  if (p[1] === "moi" && p.length === 2 && post) return json(await tv.taoLoiMoi(bm, b, goc(req)));
  if (p[1] === "moi" && p[2] && p[3] === "huy" && post) { await tv.huyLoiMoi(bm, p[2]); return json({ ok: true }); }
  if (p[1] && p[2] === "vai" && p.length === 3 && post) return json(await tv.doiVai(bm, p[1], b.vai));
  if (p[1] && p[2] === "moi-ra" && p.length === 3 && post) { await tv.moiRa(bm, p[1]); return json({ ok: true }); }
  return null;
}
