// Đường mới của thiết kế chốt 05/11 (S1 — sao, quỹ giờ chơi, ngoại lệ, nhiệm vụ theo bộ, làm lại, quà trao tay). Tách khỏi api-m / api-con /
// api-may để các nhánh song song ít đụng nhau: mỗi router gọi hàm ở đây TRƯỚC các đường cũ; trả null = không phải đường của S1 ⇒ đi tiếp.
// Hợp đồng: docs/API.md mục «Thiết kế chốt 05/11 — sao, quỹ giờ chơi».
import { json } from "./api.ts";
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import * as qg from "./quy-gio.ts";
import * as nv from "./nhiem-vu.ts";
import * as pt from "./phan-thuong.ts";
import { dsBo, dsKho, giaoBo, giaoKho } from "./bo-nhiem-vu.ts";
import { themTuDanhMuc, xemDanhMuc } from "./danh-muc-viec.ts";
import { soDu } from "./vi.ts";

const s = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);

/** /api/m/* — `bm` đã đăng nhập và đã qua chặn «Chỉ xem» cho POST. */
export async function xuLyMSao(bm: { id: string; family_id: string }, req: Request, p: string[], b: Record<string, unknown>): Promise<Response | null> {
  const get = req.method === "GET", post = req.method === "POST", d = p.join("/"), fam = bm.family_id;
  if (p[0] === "con" && p[1]) {
    const sau = p.slice(2).join("/");
    if (sau === "gio-choi" && get) return json(await qg.gioChoiCua(fam, p[1]));
    if (sau === "gio-choi" && post) return json(await qg.datGioChoi(fam, p[1], b, bm.id));
    if (sau === "quy" && get) {
      const c = await one(`select 1 from children where id = $1 and family_id = $2`, [p[1], fam]);
      if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
      const du = await soDu(p[1]);
      return json({ quy: await qg.quyHomNay(p[1]), sao: du, ngoaiLe: await qg.ngoaiLeDangMo(p[1]) });
    }
    if (sau === "them-gio" && post) return json(await qg.baMeThemGio(fam, p[1], b.phut, bm.id));
  }
  if (p[0] === "them-gio" && p[1] && p[2] === "hoan-tac" && post) return json(await qg.hoanTacThemGio(fam, p[1], bm.id));
  // Nhiệm vụ theo bộ + thêm việc riêng cho nhiều Con
  if (d === "nhiem-vu/bo" && get) return json({ ds: dsBo() });
  if (d === "nhiem-vu/bo" && post) return json(await giaoBo(fam, { bo: b.bo, con: b.con, chon: b.chon }, bm.id));
  // Kho việc «Một ngày của <Con>» (thiết kế chốt 14/11): Học · Vận động · Giúp Ba Mẹ 100 việc
  if (d === "nhiem-vu/kho" && get) return json(dsKho());
  if (d === "nhiem-vu/kho" && post) return json(await giaoKho(fam, { con: b.con, chon: b.chon }, bm.id));
  // «Giao việc» 14/11: danh mục Học · Vận động · Giúp Ba Mẹ (danh-muc-viec.ts)
  if (d === "nhiem-vu/danh-muc" && get) return json(await xemDanhMuc(fam, new URL(req.url).searchParams.get("con")));
  // «Lưu việc» ở Sửa việc: sửa + «Áp cho» trong một giao dịch (nhiem-vu.ts › luuNv)
  if (p[0] === "nhiem-vu" && p[1] && p[2] === "luu" && p.length === 3 && post) return json(await nv.luuNv(fam, p[1], { sua: b.sua, apCho: b.apCho }, bm.id));
  if (d === "nhiem-vu/danh-muc" && post) return json(await themTuDanhMuc(fam, { con: b.con, viec: b.viec }, bm.id));
  if (d === "nhiem-vu" && post && Array.isArray(b.giao_cho)) {
    const ds = [...new Set((b.giao_cho as unknown[]).map(String))].slice(0, 10);
    const ids: string[] = [];
    for (const con of ds.length ? ds : [null]) ids.push(await nv.taoNv(fam, { ...b, giao_cho: con }, bm.id));
    return json({ id: ids[0], ids });
  }
  if (p[0] === "luot" && p[1]) {
    if (p[2] === "lam-lai" && post) return json(await nv.nhoLamLai(fam, p[1], bm.id, { lyDo: b.lyDo, loiNhan: b.loiNhan }));
    if (p[2] === "bang-chung" && get)
      return json({ ds: (await nv.anhBangChung(fam, p[1])).map((a) => ({ id: a.id, mime: a.mime, loai: a.mime.startsWith("audio/") ? "ghi_am" : "anh",
        base64: Buffer.from(a.du_lieu).toString("base64"), chupLuc: a.chup_luc })) });
  }
  if (d === "duyet-hang-loat" && post) {
    const tong = { sao: 0 };
    const daDuyet = await nv.duyetHangLoat(fam, Array.isArray(b.ids) ? b.ids.map(String) : [], bm.id, { loiKhen: s(b.loiKhen) || undefined, tong });
    return json({ daDuyet, sao: tong.sao });
  }
  // Quà (L10): «Đã trao» · không tạo phiếu AiiCafe mới · quỹ phiếu quà ẩn
  if (p[0] === "phieu" && p[1] && p[2] === "trao" && post) return json({ ok: true, ...(await pt.xacNhanPhieu(fam, p[1], bm.id)) });
  if (d === "qua" && post) return json({ id: await pt.taoQua(fam, b, { ngungVoucher: pt.NGUNG_VOUCHER }) });
  if (d === "quy" && get) throw new LoiNghiepVu("da_bo", "Quỹ phiếu quà AiiCafe đã ngừng (05/11) — voucher cũ còn hạn vẫn dùng ở quầy", 410);
  return null;
}

/** Màn Con — /api/kid/* (c = Con của phiên) và khay /api/device/hoc-vien/* (p đã bỏ «hoc-vien»). `mayId` = máy gửi (null = app web). */
export async function xuLyConSao(con: string, mayId: string | null, req: Request, p: string[], b: Record<string, unknown>, o: { khay?: boolean } = {}): Promise<Response | null> {
  const get = req.method === "GET", post = req.method === "POST", d = p.join("/");
  if (d === "quy" && get) {
    const [quy, du, nl, cho] = await Promise.all([qg.quyHomNay(con), soDu(con), qg.ngoaiLeDangMo(con),
      q(`select id, loai, phut, gia_tri, pham_vi, ly_do, created_at from requests where child_id = $1 and trang_thai = 'cho'
               and loai in ('them_gio', 'ngoai_le', 'ngoai_gio') and het_han > now() order by created_at desc`, [con])]);
    return json({ quy, sao: du, phutDoiDuoc: quy.doiSao.bat ? Math.min(qg.phutChoSao({ phut_10_sao: quy.tyLe.phut }, du), quy.doiSao.conDoiDuoc) : 0, ngoaiLe: nl, yeuCauCho: cho });
  }
  if (d === "doi-sao" && post) return json(await qg.doiSaoLayGio(con, b.phut, mayId));
  // khay Windows (05/11 «Quà của con»): quà Ba Mẹ đã trao — màn Con web có sẵn `kid/vi-qua` ở api-con
  if (d === "vi-qua" && get && o.khay) return json(await pt.viQua(con));
  if (d === "nhiem-vu" && get && new URL(req.url).searchParams.get("tuCham") === "1") return json({ ds: await nv.nvCuaCon(con, new Date(), { kemTuCham: true }) });
  if (p[0] === "luot" && p[2] === "nop" && post && !o.khay)
    return json(await nv.nop(con, p[1], { anh: b.anh as nv.AnhNop[], ghiChu: b.ghiChu, ghiAm: b.ghiAm as nv.AnhNop | undefined, batBuocGhiAm: b.ghiAmDuoc === true }));
  if (d === "cua-hang" && get && !o.khay) return json(await pt.cuaHang(con, { anVoucher: pt.NGUNG_VOUCHER }));
  if (p[0] === "doi" && p[1] && post && !o.khay) return json(await pt.doiQua(con, p[1], new Date(), { ngungVoucher: pt.NGUNG_VOUCHER }));
  return null;
}
