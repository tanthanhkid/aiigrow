// Đường mới của thiết kế chốt 05/11 (S1 — sao, quỹ giờ chơi, ngoại lệ, nhiệm vụ theo bộ, làm lại, quà trao tay). Tách khỏi api-m / api-con /
// api-may để các nhánh song song ít đụng nhau: mỗi router gọi hàm ở đây TRƯỚC các đường cũ; trả null = không phải đường của S1 ⇒ đi tiếp.
// Hợp đồng: docs/API.md mục «Thiết kế chốt 05/11 — sao, quỹ giờ chơi» + «Sổ sao 15/11 — vay sao, số dư âm, 1 sao = 1 phút».
import { json } from "./api.ts";
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { chiBaMe } from "./quyen.ts";
import * as qg from "./quy-gio.ts";
import * as nv from "./nhiem-vu.ts";
import * as pt from "./phan-thuong.ts";
import { dsBo, dsKho, giaoBo, giaoKho } from "./bo-nhiem-vu.ts";
import { themTuDanhMuc, xemDanhMuc } from "./danh-muc-viec.ts";
import * as ss from "./so-sao.ts";
import * as yc from "./yeu-cau.ts";
import { appHomNayCon } from "./hom-nay-dung.ts";

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
      const quy = await qg.quyHomNay(p[1]);
      // #302: soSao kẹp theo giới hạn ngày / lượt (phutCon = phút chơi được, saoTieuDuoc = sao thật) — khớp khoá trên máy Con
      return json({ quy, sao: quy.soSao.sao, soSao: qg.saoKepGioiHan(quy), gioiHan: qg.gioiHanMay(quy.gioiHan), ngoaiLe: [] });
    }
    // 15/11 sổ sao (#263–#266): ví sao + lịch sử vay / trả / chơi · xem trước + cho vay · «Cho thêm giờ» cũ = cho vay N sao
    if (sau === "vi-sao" && get) return json(await ss.viSao(fam, p[1], { gioiHan: Number(new URL(req.url).searchParams.get("gioiHan")) || 50 }));
    if (sau === "cho-vay/xem-truoc" && get) return json(await ss.xemTruocVay(fam, p[1], new URL(req.url).searchParams.get("soSao") ?? undefined));
    if (sau === "cho-vay" && post) {
      if (b.mucDich === "qua") chiBaMe(bm, "cho vay để mua quà");   // #492: «Chỉ trông con» cho vay chơi được, mua quà thì nhờ Ba Mẹ
      return json(await ss.choVay(fam, p[1], b.soSao, bm.id, { mucDich: b.mucDich === "qua" ? "qua" : b.mucDich === "choi" ? "choi" : null, quaId: b.quaId ? s(b.quaId, 40) : null }));
    }
    if (sau === "them-gio" && post) return json(await qg.baMeThemGio(fam, p[1], b.phut, bm.id));
  }
  if ((p[0] === "them-gio" || p[0] === "vay") && p[1] && p[2] === "hoan-tac" && post) return json(await ss.hoanTacVay(fam, p[1], bm.id));
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
    const [quy, cho] = await Promise.all([qg.quyHomNay(con),
      q(`select id, loai, phut, gia_tri, pham_vi, muc_dich, ly_do, created_at from requests where child_id = $1 and trang_thai = 'cho'
               and loai in ('vay_sao', 'them_gio', 'ngoai_le', 'ngoai_gio') and het_han > now() order by created_at desc`, [con])]);
    // `sao` (cũ = số dư ≥ 0) nay là số dư Con thấy (âm khi nợ) · `phutDoiDuoc` (cũ) = phút còn chơi · `soSao` + `cau` mới
    const kep = qg.saoKepGioiHan(quy);      // #302: kẹp theo giới hạn — khớp khoá
    return json({ quy, sao: quy.soSao.sao, soSao: kep, cau: kep.cau, phutDoiDuoc: quy.conPhut, gioiHan: qg.gioiHanMay(quy.gioiHan), ngoaiLe: [], yeuCauCho: cho });
  }
  if (d === "doi-sao" && post) return json(await qg.doiSaoLayGio(con, b.phut, mayId));
  // 15/11: sổ sao của Con — «còn N sao = N phút», hết sao, đang nợ · gửi lời xin vay (chơi / đổi quà)
  // + lichSu[] (sổ sao gần đây — cùng sổ ví sao Ba Mẹ) · appHomNay[] (màn «Đang chơi»: «Roblox 30 phút · −30 sao») · phutChoiHomNay (= sao trừ hôm nay)
  if (d === "sao" && get) {
    const gh = Number(new URL(req.url).searchParams.get("gioiHan")) || 20;
    const c = await one<{ family_id: string; tz: string }>(`select c.family_id, f.tz from children c join families f on f.id = c.family_id where c.id = $1`, [con]);
    const now = new Date();
    const [qy, lichSu, appHomNay, phutChoiHomNay] = await Promise.all([qg.quyHomNay(con, now), ss.lichSuSaoCon(con, gh), appHomNayCon(con, now, c),
      ss.phutDaTruHomNay(q, con, c?.tz ?? "Asia/Ho_Chi_Minh", now)]);
    // #302: phutCon / hetSao kẹp theo giới hạn ngày / lượt (saoTieuDuoc = sao thật) + gioiHan — màn Con không mâu thuẫn với khoá
    const st = qg.saoKepGioiHan(qy);
    return json({ ...st, gioiHan: qg.gioiHanMay(qy.gioiHan), mucVay: [...ss.MUC_VAY], vayMacDinh: ss.VAY_MAC_DINH, lichSu, appHomNay, phutChoiHomNay });
  }
  if (d === "xin-vay" && post) {
    const r = await yc.guiYeuCau(con, mayId, { loai: "vay_sao", soSao: b.soSao ?? ss.VAY_MAC_DINH, mucDich: b.mucDich, quaId: b.quaId, lyDo: b.loiNhan ?? b.lyDo });
    return json(r);
  }
  // khay Windows (05/11 «Quà của con»): quà Ba Mẹ đã trao — màn Con web có sẵn `kid/vi-qua` ở api-con
  if (d === "vi-qua" && get && o.khay) return json(await pt.viQua(con));
  if (d === "nhiem-vu" && get && new URL(req.url).searchParams.get("tuCham") === "1") return json({ ds: await nv.nvCuaCon(con, new Date(), { kemTuCham: true }) });
  if (p[0] === "luot" && p[2] === "nop" && post && !o.khay)
    return json(await nv.nop(con, p[1], { anh: b.anh as nv.AnhNop[], ghiChu: b.ghiChu, ghiAm: b.ghiAm as nv.AnhNop | undefined, batBuocGhiAm: b.ghiAmDuoc === true }));
  if (d === "cua-hang" && get && !o.khay) return json(await pt.cuaHang(con, { anVoucher: pt.NGUNG_VOUCHER }));
  if (p[0] === "doi" && p[1] && post && !o.khay) return json(await pt.doiQua(con, p[1], new Date(), { ngungVoucher: pt.NGUNG_VOUCHER }));
  return null;
}
