// Yêu cầu Con gửi Ba Mẹ (FR-05.01–05.03, BRD 6.4, Phụ lục A.2): xin thêm giờ, mở website, cài/mở ứng dụng, ngoại lệ không đủ điểm,
// xin ngoài khung giờ, khác. Giới hạn chống spam: ≤ 3 đang chờ, ≤ 10 mỗi ngày. Hết hạn: 24 giờ (thêm giờ…) / 7 ngày (web, app).
// TỪ 15/11 (#263/#265, lib/so-sao.ts): mọi lời «cho thêm» là LỜI XIN VAY SAO — loai `vay_sao` (`soSao`, `mucDich` choi | qua, `quaId`).
// Lời xin cũ của agent / app chưa cập nhật (them_gio, ngoai_le, ngoai_gio kèm `phut`) được nhận như xin vay `phut` sao để chơi (1 sao = 1 phút),
// giữ nguyên `loai` cũ để máy cũ còn đọc được trạng thái. Ba Mẹ đồng ý ⇒ cho vay N sao (choVay) — không còn «ngoại lệ», «trừ điểm», quỹ, cửa sổ mở.
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { thamSo } from "./cau-hinh.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { khoaCon } from "./vi.ts";
import { chuanMuc, datLuat } from "./luat-app.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { choVay, trangThaiSao, VAY_TOI_DA, xemTruocVay, type MucDichVay } from "./so-sao.ts";

export const LOAI_YC = ["vay_sao", "them_gio", "mo_web", "cai_app", "ngoai_le", "ngoai_gio", "khac"] as const;
/** Lời xin vay sao (mới) + các loại cũ nay nhận như xin vay để chơi. */
export const LOAI_VAY = new Set<string>(["vay_sao", "them_gio", "ngoai_le", "ngoai_gio"]);
export type LoaiYc = (typeof LOAI_YC)[number];
export const LY_DO_NHANH = ["Để làm bài tập", "Bạn rủ chơi", "Hôm nay con ngoan", "Con làm xong việc rồi"];

type Yc = { id: string; child_id: string; device_id: string | null; loai: LoaiYc; phut: number | null; gia_tri: string | null; ly_do: string;
  trang_thai: string; het_han: Date; created_at: Date; pham_vi: string | null; muc_dich: string | null };

async function hetHanCu(t: Q, con: string, now: Date) {
  await t(`update requests set trang_thai = 'het_han', xu_ly_luc = $2 where child_id = $1 and trang_thai = 'cho' and het_han <= $2`, [con, now]);
}

export async function guiYeuCau(con: string, mayId: string | null,
  b: { loai?: unknown; phut?: unknown; soSao?: unknown; mucDich?: unknown; quaId?: unknown; giaTri?: unknown; lyDo?: unknown; phamVi?: unknown },
  now = new Date()) {
  const loai = (LOAI_YC as readonly string[]).includes(String(b.loai)) ? (b.loai as LoaiYc) : null;
  if (!loai) throw new LoiNghiepVu("loai_sai", "Chọn điều con muốn xin");
  // 05/11: lời nhắn / lý do không bắt buộc (con-xin, con-bi-chan)
  const lyDo = String(b.lyDo ?? "").trim().slice(0, 100);
  const laVay = LOAI_VAY.has(loai);
  const soSao = laVay ? Math.round(Number(b.soSao ?? b.phut)) : null;
  if (soSao !== null && !(soSao >= 1 && soSao <= VAY_TOI_DA)) throw new LoiNghiepVu("so_sao_sai", `Số sao xin vay từ 1 đến ${VAY_TOI_DA} (thường 10, 15, 30 sao)`);
  const mucDich: MucDichVay | null = laVay ? (b.mucDich === "qua" || (loai === "vay_sao" && b.quaId) ? "qua" : "choi") : null;
  // giá trị: web / app ⇒ tên miền / app chuẩn hoá · xin vay đổi quà ⇒ id quà · còn lại (lời xin cũ) ⇒ chữ tự do để hiển thị
  const giaTri = loai === "mo_web" || loai === "cai_app" ? chuanMuc(b.giaTri)
    : mucDich === "qua" ? String(b.quaId ?? b.giaTri ?? "").trim().slice(0, 40) || null
    : String(b.giaTri ?? "").trim().slice(0, 200) || null;
  if ((loai === "mo_web" || loai === "cai_app") && !giaTri) throw new LoiNghiepVu("thieu_gia_tri", loai === "mo_web" ? "Dán đường link website" : "Ghi tên ứng dụng");
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    if (mucDich === "qua" && giaTri && !(await t(`select 1 from rewards where id = $1 and family_id = $2`, [giaTri, fam])).length)
      throw new LoiNghiepVu("khong_thay", "Không thấy quà này", 404);
    await hetHanCu(t, con, now);
    const f = (await t<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]))[0];
    const c = (await t<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [con]))[0];
    const ts = thamSo(f.cau_hinh, c.cau_hinh);
    const dem = (await t<{ cho: number; ngay: number }>(
      `select count(*) filter (where trang_thai = 'cho')::int as cho, count(*) filter (where created_at >= $2)::int as ngay from requests where child_id = $1`,
      [con, dauNgayUtc(gioDiaPhuong(now, f.tz).ngay, f.tz)]))[0];
    if (dem.cho >= ts.yc_cho_toi_da) throw new LoiNghiepVu("qua_nhieu_cho", `Con đã gửi ${dem.cho} yêu cầu đang chờ, đợi Ba Mẹ trả lời nhé`, 429);
    if (dem.ngay >= ts.yc_ngay_toi_da) throw new LoiNghiepVu("qua_nhieu_ngay", `Hôm nay con đã gửi ${dem.ngay} yêu cầu rồi, mai gửi tiếp nhé`, 429);
    const gio = loai === "mo_web" || loai === "cai_app" ? ts.yc_het_ngay_cai * 24 : ts.yc_het_gio_them;
    const id = newId();
    // phut = số sao xin vay (1 sao = 1 phút) — cột cũ giữ để máy cũ đọc «xin thêm 20 phút»
    await t(`insert into requests(id, child_id, device_id, loai, phut, gia_tri, ly_do, het_han, created_at, muc_dich) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, con, mayId, loai, soSao, giaTri, lyDo, new Date(now.getTime() + gio * 3600_000), now, mucDich]);
    await ghiSuKien(fam, "gui_yeu_cau", { loai, phut: soSao, gia_tri: giaTri, ...(laVay ? { vay: true, so_sao: soSao, muc_dich: mucDich } : {}) }, { con, may: mayId }, t);
    return { id, trang_thai: "cho", ...(laVay ? { soSao, mucDich } : {}) };
  });
}

export async function huyYeuCau(con: string, id: string) {
  const r = await q(`update requests set trang_thai = 'huy', xu_ly_luc = now() where id = $1 and child_id = $2 and trang_thai = 'cho' returning id`, [id, con]);
  if (!r.length) throw new LoiNghiepVu("da_xu_ly", "Yêu cầu này đã được xử lý", 409);
}

async function layYc(t: Q, fam: string, id: string, now: Date) {
  const r = (await t<Yc & { ten_con: string }>(
    `select r.*, c.ten as ten_con from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2 for update of r`, [id, fam]))[0];
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
  if (r.trang_thai === "cho" && new Date(r.het_han) <= now) {
    await t(`update requests set trang_thai = 'het_han', xu_ly_luc = $2 where id = $1`, [id, now]);
    throw new LoiNghiepVu("het_han", "Yêu cầu đã hết hạn", 409);
  }
  if (r.trang_thai !== "cho") throw new LoiNghiepVu("da_xu_ly", "Yêu cầu này đã được xử lý (có thể người khác trong nhà đã trả lời)", 409);
  return r;
}

/** Xem trước khi đồng ý (them-y1r1eidm): lời xin vay ⇒ đang có / sẽ nợ / dải nhắc «đã nợ quá 1.000 sao». Lời xin khác ⇒ không có gì để nhắc.
 *  `mucCanhBao` / `soTuan` / `soThang` (cũ — ngoại lệ đã bỏ) giữ cho app cũ: «manh» khi đang nợ > 1.000. */
export async function xemTruocDongY(fam: string, id: string, soSao?: unknown) {
  const r = await one<{ child_id: string; loai: string; phut: number | null }>(
    `select r.child_id, r.loai, r.phut from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2`, [id, fam]);
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
  if (!LOAI_VAY.has(r.loai)) return { mucCanhBao: "khong" as const, soTuan: 0, soThang: 0, cau: null };
  const x = await xemTruocVay(fam, r.child_id, soSao ?? r.phut ?? undefined);
  return { ...x, mucCanhBao: x.nhacNo ? "manh" as const : "khong" as const, soTuan: 0, soThang: 0 };
}

export type DongY = { truDiem?: boolean; phut?: number; soSao?: number; phanLoai?: "hoc" | "giai_tri"; nhom?: string; phamVi?: "lan_nay" | "hom_nay" | "vinh_vien" };

/** Ba Mẹ đồng ý. Lời xin vay (và lời xin thêm giờ / ngoại lệ cũ) ⇒ cho vay `soSao` (mặc định số Con xin) sao; web/app: phân loại + phạm vi.
 *  Người đầu tiên xử lý quyết. → `{ngoaiLe: false, grantId?, vay?}` — `grantId` = id khoản vay (Hoàn tác: POST them-gio/:id/hoan-tac hoặc vay/:id/hoan-tac). */
export async function dongY(fam: string, id: string, nguoi: string | null, o: DongY = {}, now = new Date()) {
  return tx(async (t) => {
    const r = await layYc(t, fam, id, now);
    await khoaCon(t, r.child_id);
    const f = (await t<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]))[0];
    const ngay = gioDiaPhuong(now, f.tz).ngay;
    let grantId: string | null = null;
    let vay: Awaited<ReturnType<typeof choVay>> | null = null;
    if (LOAI_VAY.has(r.loai)) {
      const n = Math.round(Number(o.soSao ?? o.phut ?? r.phut));
      const mucDich: MucDichVay = r.muc_dich === "qua" ? "qua" : "choi";
      vay = await choVay(fam, r.child_id, n, nguoi, { mucDich, yeuCau: r.id, quaId: mucDich === "qua" ? r.gia_tri : null }, t, now);
      grantId = vay.id;
      await t(`update requests set phut = $2 where id = $1`, [r.id, vay.soSao]);
    } else if (r.loai === "mo_web" || r.loai === "cai_app") {
      const loai = o.phanLoai === "hoc" ? "hoc" : "giai_tri";
      const phamVi = o.phamVi ?? "vinh_vien";
      // «Lần này»: mở đúng số phút Ba Mẹ cho (thiết kế 14/11 «Cho 30 phút YouTube») — không gửi phút ⇒ 1 giờ như trước
      const phutLan = Math.round(Number(o.phut));
      if (phamVi === "lan_nay" && o.phut !== undefined && !(phutLan >= 5 && phutLan <= 240)) throw new LoiNghiepVu("phut_sai", "Chọn thời lượng");
      const het = phamVi === "vinh_vien" ? null : phamVi === "hom_nay" ? dauNgayUtc(ngay, f.tz)
        : new Date(now.getTime() + (o.phut !== undefined ? phutLan * 60_000 : 3600_000));
      const hetThat = phamVi === "hom_nay" ? new Date(het!.getTime() + 86_400_000) : het;
      await datLuat(fam, { con: r.child_id, muc: r.gia_tri, ten: r.gia_tri, loai, nhom: o.nhom, het: hetThat }, t);
    }
    await t(`update requests set trang_thai = 'dong_y', nguoi_duyet = $2, xu_ly_luc = $3, tru_diem = null, ngoai_le = false, pham_vi = coalesce($4, pham_vi), phan_loai = $5,
             tu_dong = $6 where id = $1`, [r.id, nguoi, now, o.phamVi ?? null, o.phanLoai ?? null, nguoi === null]);
    await ghiSuKien(fam, "dong_y_yeu_cau", { loai: r.loai, ...(vay ? { vay: true, so_sao: vay.soSao } : {}) }, { con: r.child_id, nguoi }, t);
    return { ngoaiLe: false, ...(grantId ? { grantId } : {}), ...(vay ? { vay } : {}) };
  });
}

export async function tuChoiYc(fam: string, id: string, nguoi: string, lyDo: string, now = new Date()) {
  const ly = String(lyDo ?? "").trim().slice(0, 120);
  if (!ly) throw new LoiNghiepVu("thieu_ly_do", "Chọn hoặc ghi lý do để Con hiểu");
  return tx(async (t) => {
    const r = await layYc(t, fam, id, now);
    await t(`update requests set trang_thai = 'tu_choi', nguoi_duyet = $2, xu_ly_luc = $4, ly_do_tu_choi = $3 where id = $1`, [r.id, nguoi, ly, now]);
    await ghiSuKien(fam, "tu_choi_yeu_cau", { loai: r.loai, ly_do: ly }, { con: r.child_id, nguoi }, t);
  });
}

/** «Hoàn tác, xem lại lời xin» (thiết kế 14/11 bm-ung-dung/12): Ba Mẹ vừa «Không cho» ⇒ đưa lời xin về «chờ» để trả lời lại.
 *  Chỉ trong 10 phút sau khi từ chối và khi lời xin chưa hết hạn; người khác đã trả lời lại / quá hạn ⇒ 409. */
export const MO_LAI_PHUT = 10;
export async function moLaiYc(fam: string, id: string, nguoi: string, now = new Date()) {
  return tx(async (t) => {
    const r = (await t<Yc & { xu_ly_luc: Date | null }>(
      `select r.* from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2 for update of r`, [id, fam]))[0];
    if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
    if (r.trang_thai !== "tu_choi" || !r.xu_ly_luc || now.getTime() - new Date(r.xu_ly_luc).getTime() > MO_LAI_PHUT * 60_000)
      throw new LoiNghiepVu("khong_mo_lai", "Lời xin này không hoàn tác được nữa", 409);
    if (new Date(r.het_han) <= now) throw new LoiNghiepVu("het_han", "Yêu cầu đã hết hạn", 409);
    await t(`update requests set trang_thai = 'cho', nguoi_duyet = null, xu_ly_luc = null, ly_do_tu_choi = null where id = $1`, [r.id]);
    await ghiSuKien(fam, "mo_lai_yeu_cau", { loai: r.loai }, { con: r.child_id, nguoi }, t);
    return { ok: true };
  });
}

/** Thiết bị Con báo đã áp phê duyệt (A.2: Đồng ý → Đã thực thi). */
export async function daThucThi(con: string, id: string) {
  await q(`update requests set trang_thai = 'da_thuc_thi' where id = $1 and child_id = $2 and trang_thai = 'dong_y'`, [id, con]);
}

/** Quy tắc tự động (FR-05.03 «tự đồng ý thêm 15 phút nếu đủ điểm») — BỎ từ 15/11: sao chính là phút (Con đủ sao thì đã chơi được), lời xin nay là
 *  xin VAY và chỉ Ba Mẹ quyết. Giữ hàm (chỗ gọi cũ) — luôn false. */
export async function apQuyTacTuDong(_fam: string, _id: string, _now = new Date()) {
  return false;
}

/** Hộp thư «Chờ duyệt» (yêu cầu), gom theo Con. */
export async function dsChoYc(fam: string, now = new Date()) {
  await q(`update requests set trang_thai = 'het_han', xu_ly_luc = $2 where trang_thai = 'cho' and het_han <= $2
           and child_id in (select id from children where family_id = $1)`, [fam, now]);
  return q<Yc & { ten_con: string }>(`select r.*, c.ten as ten_con from requests r join children c on c.id = r.child_id
                                     where c.family_id = $1 and r.trang_thai = 'cho' order by r.created_at`, [fam]);
}

export const dsYcCuaCon = (con: string) =>
  q<Yc & { ly_do_tu_choi: string | null }>(`select * from requests where child_id = $1 order by created_at desc limit 30`, [con]);

/** Chi tiết một yêu cầu cho màn xử lý: yêu cầu + tên Con + sổ sao (số dư âm được, nợ, phút còn chơi) + xem trước bảng cho vay.
 *  Trường cũ giữ cho app cũ: soDu (sao tiêu được) · phutDoiDuoc (= phút còn chơi, 1 sao = 1 phút) · giaPhut 1 · ngoaiLeTheoNguoi [] (ngoại lệ đã bỏ). */
export async function chiTietYc(fam: string, id: string) {
  const r = await one<Yc & { ten_con: string; ly_do_tu_choi: string | null; nguoi_duyet: string | null }>(
    `select r.*, c.ten as ten_con from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2`, [id, fam]);
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
  const st = await trangThaiSao(r.child_id);
  const laVay = LOAI_VAY.has(r.loai);
  const xt = laVay ? await xemTruocDongY(fam, id) : { mucCanhBao: "khong" as const, soTuan: 0, soThang: 0, cau: null };
  const qua = laVay && r.muc_dich === "qua" && r.gia_tri ? await one<{ id: string; ten: string; diem: number }>(`select id, ten, diem from rewards where id = $1`, [r.gia_tri]) : null;
  return { ...r, laVay, soSao: laVay ? r.phut : null, mucDich: r.muc_dich, qua: qua ?? null,
    soDu: st.phutCon, sao: st.sao, no: st.no, phutCon: st.phutCon, hetSao: st.hetSao, canhBaoNo: st.canhBaoNo,
    phutDoiDuoc: st.phutCon, giaPhut: 1, xemTruoc: xt, ngoaiLeTheoNguoi: [] as { ten: string; n: number }[] };
}
