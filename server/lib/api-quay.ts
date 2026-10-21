// API màn quầy AiiCafe: /api/quay/<đường>. Bearer = phiên Nhân viên AiiCafe (hoặc Admin). Nhân viên chỉ làm được ba việc: đăng nhập,
// quét / gõ mã phiếu quà, đăng xuất — không xem gia đình, quỹ hay bất kỳ dữ liệu nào khác (BRD 8.2: vai «Nhân viên AiiCafe» chỉ có màn này).
import { batLoi, docJson, json, loi } from "./api.ts";
import { one } from "./db.ts";
import { dangNhapNv, dangXuatNv, ghiKiemToan, nvGoi } from "./admin.ts";
import { quetVoucher } from "./phan-thuong.ts";

/** Lấy mã phiếu quà từ chữ quét được / gõ vào: «AG» + 10 ký tự (bỏ gạch, cách; QR có thể là đường dẫn chứa mã). */
export function tachMa(s: unknown): string {
  const t = String(s ?? "").toUpperCase().replace(/[\s\-–.·]/g, "");
  return /AG[A-Z0-9]{10}/.exec(t)?.[0] ?? t.slice(0, 40);
}

export async function xuLyQuay(req: Request, p: string[]): Promise<Response> {
  try {
    const d = p.join("/"), post = req.method === "POST";
    if (d === "dang-nhap" && post) {
      const b = await docJson(req);
      return json({ token: await dangNhapNv(b.tenDangNhap, b.matKhau, "quay") });
    }
    const nv = await nvGoi(req);
    if (!nv) return loi("chua_dang_nhap", "Phiên đăng nhập quầy đã hết — đăng nhập lại", 401);
    if (d === "toi" && req.method === "GET") return json({ nhanVien: { ten: nv.ten, vai: nv.vai, quay: nv.quay || "Quầy AiiCafe" } });
    if (d === "dang-xuat" && post) { await dangXuatNv(req); return json({ ok: true }); }
    if (d === "quet" && post) {
      const ma = tachMa((await docJson(req)).ma);
      if (!ma) return loi("thieu_ma", "Quét mã QR hoặc gõ mã trên phiếu quà");
      const quay = nv.quay || "Quầy AiiCafe";
      const kq = await quetVoucher(ma, quay);
      const v = await one<{ family_id: string; ten_gd: string; quay: string | null; het_han: Date }>(
        `select v.family_id, f.ten as ten_gd, v.quay, v.het_han from vouchers v join families f on f.id = v.family_id where v.ma = $1`, [ma]);
      await ghiKiemToan(nv, "quet_voucher", { ma, ketQua: kq.ketQua, menhGia: kq.menhGia ?? null, quay }, v?.family_id ?? null);
      return json({ ...kq, ma, tenGiaDinh: kq.ketQua === "hop_le" ? v?.ten_gd : undefined,
        quayDung: kq.ketQua === "da_dung" ? v?.quay : undefined, hetHan: v ? new Date(v.het_han).toISOString() : undefined,
        luc: new Date().toISOString() });
    }
    return loi("khong_co_duong", "Không có đường này", 404);
  } catch (e) {
    return batLoi(e);
  }
}
