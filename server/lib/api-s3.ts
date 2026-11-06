// Đường mới của thiết kế chốt 06/11 (S3 — PIN theo bé, quà bảng giá, mã mở máy, chuông) — docs/KE-HOACH-KHOP-THIET-KE-0611.md L13 L14 L19.
// Như api-sao.ts: mỗi router (api-m / api-con / api-may) gọi hàm ở đây TRƯỚC đường cũ; trả null = không phải đường của S3 ⇒ đi tiếp.
// Hợp đồng: docs/API.md mục «S3 thiết kế chốt 06/11».
import { json } from "./api.ts";
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import * as pin from "./pin-be.ts";
import * as qb from "./qua-bang-gia.ts";
import * as pt from "./phan-thuong.ts";
import { canDeY, mayMatMang } from "./can-de-y.ts";
import { chonCon, type May } from "./gia-dinh.ts";

const tham = (req: Request, k: string) => new URL(req.url).searchParams.get(k);

/** /api/m/* — `bm` đã đăng nhập và đã qua chặn «Người trông giúp» cho POST. */
export async function xuLyMS3(bm: { id: string; family_id: string }, req: Request, p: string[], b: Record<string, unknown>): Promise<Response | null> {
  const get = req.method === "GET", post = req.method === "POST", d = p.join("/"), fam = bm.family_id;
  // L13: PIN theo bé
  if (p[0] === "con" && p[1] && p[2] === "pin" && p.length === 3) {
    if (get) return json(await pin.xemPin(fam, p[1]));
    if (post) return json(await pin.datPin(fam, p[1], b.pin === null ? null : b.pin, bm.id));
  }
  // L19: «Cần Ba Mẹ để ý» + số chuông · máy mất mạng hôm nay
  if (d === "can-de-y" && get) return json(await canDeY(fam));
  if (d === "may-mat-mang" && get) return json({ ds: await mayMatMang(fam) });
  if (p[0] === "may" && p[1] && p[2] === "nguoi-dung" && p.length === 3 && get) {
    const m = await one<May>(`select * from devices where id = $1 and family_id = $2`, [p[1], fam]);
    if (!m) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
    const h = await pin.hoSoMay(m);
    return json({ dangDung: h.dangDung, baMeDung: h.baMeDung, mayRieng: h.mayRieng, con: h.con.map(({ vanPin: _v, ...c }) => c) });
  }
  // L14: quà bảng giá
  if (p[0] === "qua") {
    if (d === "qua" && get) return json(await qb.dsQua(fam, tham(req, "con")));
    if (d === "qua" && post) return json({ id: await qb.taoQuaRieng(fam, b) });
    if (d === "qua/mac-dinh" && get) {
      const co = new Set((await q<{ mau: string }>(`select mau from rewards where family_id = $1 and mau is not null and bat`, [fam])).map((x) => x.mau));   // quà đã cất ⇒ chưa «có»
      return json({ ds: qb.QUA_MAC_DINH.map((m) => ({ ma: m.ma, ten: m.ten, moTa: m.mo_ta ?? null, hinh: m.hinh ?? null, sao: m.diem, loai: m.loai,
        menhGia: m.menh_gia ?? null, chiCuoiTuan: !!m.chi_cuoi_tuan, tonKho: m.ton_kho ?? null, daCo: co.has(m.ma) })) });
    }
    if (d === "qua/mac-dinh" && post) return json(await qb.luuQuaMacDinh(fam, { chon: b.chon, con: b.con }, bm.id));
    // «Mẫu» cũ (app bản trước) ⇒ thêm quà mặc định còn thiếu (không xoá gì)
    if (d === "qua/mau" && post) {
      const truoc = (await q(`select 1 from rewards where family_id = $1`, [fam])).length;
      const ds = await qb.luuQuaMacDinh(fam, {}, bm.id);
      return json({ taoMoi: (await q(`select 1 from rewards where family_id = $1`, [fam])).length - truoc, ds: ds.ds });
    }
    if (d === "qua/thu-vien" && get) return json(await qb.thuVien(fam, tham(req, "con")));
    if (d === "qua/thu-vien" && post) return json(await qb.themTuThuVien(fam, { mau: b.mau, con: b.con }, bm.id));
    if (p[1] && p.length === 2 && post) return json({ ok: true, qua: await qb.suaQuaS3(fam, p[1], b) });
    if (p[1] && p[2] === "xoa" && p.length === 3 && post) return json(await qb.xoaQua(fam, p[1], bm.id));
  }
  if (p[0] === "phieu" && p[1] && p.length === 2 && get) return json(await qb.chiTietPhieu(fam, p[1]));
  return null;
}

/** Màn Con /api/kid/* (app web). Quà: voucher AiiCafe đổi được lại (giữ sao chờ Ba Mẹ trao). */
export async function xuLyConS3(con: string, req: Request, p: string[]): Promise<Response | null> {
  const get = req.method === "GET", post = req.method === "POST", d = p.join("/");
  if (d === "cua-hang" && get) return json(await pt.cuaHang(con));
  if (p[0] === "doi" && p[1] && p.length === 2 && post) return json(await pt.doiQua(con, p[1], new Date(), { voucherTraoTay: true }));
  return null;
}

/** /api/device/* — máy đã xác thực bằng token. Đường của máy dùng chung (chọn tên + PIN, quên PIN, Ba Mẹ nhập mã, đổi bé / đăng xuất). */
export async function xuLyMayS3(may: May, req: Request, p: string[], b: Record<string, unknown>): Promise<Response | null> {
  const post = req.method === "POST", d = p.join("/");
  if (d === "ho-so" || d === "nguoi-dung") return json(await pin.hoSoMay(may));
  if (d === "dang-nhap-be" && post) return json(await pin.dangNhapBe(may, String(b.con ?? ""), b.pin));
  if (d === "quen-pin" && post) return json(await pin.quenPin(may, String(b.con ?? "")));
  if (d === "ba-me-mo" && post) return json(await pin.baMeMoMay(may, b.ma));
  if ((d === "dang-xuat" || d === "khoa-lai") && post) return json(await pin.roiMay(may));
  // Agent cũ: chọn tên không PIN (L5 05/11) — vẫn chạy y như trước: KHÔNG ghi «bé đang dùng» (agent cũ gửi không header nghĩa là
  // «không bé nào», và không có đường đăng xuất) — chỉ dang-nhap-be mới ghi
  if (d === "chon-con" || d === "pin") return json({ phienCon: await chonCon(may, String(b.con ?? "")) });
  return null;
}
