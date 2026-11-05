// /api/m/* — thành viên gia đình (L6 thiết kế 05/11: mời bằng SĐT/email + link, 2 quyền) + thông báo trong app (FR-08.01). Gọi từ lib/api-m.ts.
//   không cần đăng nhập: GET moi/:ma · POST moi/dang-ky
//   cần đăng nhập:       GET thanh-vien · POST thanh-vien/moi · POST thanh-vien/moi/:id/gui-lai · POST thanh-vien/moi/:id/huy
//                        POST thanh-vien/:id/quyen (bí danh /vai) · POST thanh-vien/:id/moi-ra · POST thanh-vien/roi-nha
//                        GET moi/cho-toi · POST moi/nhan {id | ma} · POST con/:id/dong-bang-chuoi · GET con/:id/bao-cao/csv
//                        GET thong-bao · POST thong-bao/doc · GET/POST thong-bao/cai-dat
// Thông báo là của RIÊNG từng người ⇒ Người trông giúp vẫn đánh dấu đã đọc / đặt giờ yên lặng được (đi trước chặn quyền của api-m).
import { docJson, json } from "./api.ts";
import { q } from "./db.ts";
import { taoPhien, type BaMe } from "./auth.ts";
import { laChuNha, quyenCua, vaiCu } from "./quyen.ts";
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
  if (p[1] && !["nhan", "dang-ky", "cho-toi"].includes(p[1]) && p.length === 2 && req.method === "GET") return json(await tv.xemLoiMoi(p[1]));
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

/** Thành viên — sau chặn quyền của api-m (Người trông giúp chỉ tới đây với moi/nhan; các hàm tv.* tự kiểm quyền Ba Mẹ). */
export async function xuLyThanhVien(req: Request, bm: BaMe, p: string[], b: Record<string, any>): Promise<Response | null> {
  const get = req.method === "GET", post = req.method === "POST";
  if (p[0] === "moi" && p[1] === "nhan" && p.length === 2 && post) return json(await tv.nhanLoiMoi(bm, b.id ? { id: b.id } : { ma: b.ma }));
  if (p[0] === "moi" && p[1] === "cho-toi" && p.length === 2 && get) return json({ ds: await tv.loiMoiChoToi(bm), chiQuaLink: await tv.emailChuaXacMinh(q, bm.id) });   // Facebook: chỉ nhận qua link
  // FR-03.06 đóng băng chuỗi ngày · FR-06.02 xuất CSV báo cáo tuần
  if (p[0] === "con" && p[1] && p.length >= 3) {
    const sau = p.slice(2).join("/");
    if (sau === "dong-bang-chuoi" && post) { await conCua(bm.family_id, p[1]); return json(await dongBangChuoi(bm.family_id, p[1], bm.id)); }
    if (sau === "bao-cao/csv" && get) { await conCua(bm.family_id, p[1]); return json(await xuatCsvBaoCao(bm.family_id, p[1])); }
  }
  if (p[0] !== "thanh-vien") return null;
  if (p.length === 1 && get) {
    const { ds, loiMoi } = await tv.dsThanhVien(bm.family_id);
    return json({ ds: ds.map((x) => tv.tvRa(x, bm.id)), loiMoi: loiMoi.map(tv.moiRaApi),
      toi: { id: bm.id, quyen: quyenCua(bm), vai: vaiCu(bm), laChuNha: laChuNha(bm) }, hanGio: tv.LOI_MOI_GIO });
  }
  if (p[1] === "moi" && p.length === 2 && post) return json(await tv.taoLoiMoi(bm, b, goc(req)));
  if (p[1] === "moi" && p[2] && p[3] === "huy" && post) { await tv.huyLoiMoi(bm, p[2]); return json({ ok: true }); }
  if (p[1] === "moi" && p[2] && p[3] === "gui-lai" && post) return json(await tv.guiLaiLoiMoi(bm, p[2], goc(req)));
  if (p[1] === "roi-nha" && p.length === 2 && post) return json(await tv.roiNha(bm));
  if (p[1] && (p[2] === "quyen" || p[2] === "vai") && p.length === 3 && post) return json(await tv.doiQuyen(bm, p[1], b.quyen ?? b.vai));
  if (p[1] && p[2] === "moi-ra" && p.length === 3 && post) { await tv.moiRa(bm, p[1]); return json({ ok: true }); }
  return null;
}
