// Yêu cầu Con gửi Ba Mẹ (FR-05.01–05.03, BRD 6.4, Phụ lục A.2): xin thêm giờ, mở website, cài/mở ứng dụng, ngoại lệ không đủ điểm,
// xin ngoài khung giờ, khác. Giới hạn chống spam: ≤ 3 đang chờ, ≤ 10 mỗi ngày. Hết hạn: 24 giờ (thêm giờ…) / 7 ngày (web, app).
// TỪ 15/11 (#263/#265, lib/so-sao.ts): mọi lời «cho thêm» là LỜI XIN VAY SAO — loai `vay_sao` (`soSao`, `mucDich` choi | qua, `quaId`).
// Lời xin cũ của agent / app chưa cập nhật (them_gio, ngoai_le, ngoai_gio kèm `phut`) được nhận như xin vay `phut` sao để chơi (1 sao = 1 phút),
// giữ nguyên `loai` cũ để máy cũ còn đọc được trạng thái. Ba Mẹ đồng ý ⇒ cho vay N sao (choVay) — không còn «ngoại lệ», «trừ điểm», quỹ, cửa sổ mở.
// #258/#262 (15/11): lời xin mở app / web (cai_app / mo_web) = xin THÊM VÀO DANH SÁCH. Ba Mẹ trả lời 1 trong 3: «Tính phút» / «Không tính phút»
// (dong-y {nhom} ⇒ luật lâu dài của Con) hoặc «Bỏ qua» (trang_thai «bo_qua» — không ghi gì vào danh sách, Con xin lại được) — Hoàn tác trong
// 60 giây; «Lời xin đã bỏ qua» có «Thêm luôn». Con nhận kết quả (đã thêm vào nhóm nào / chưa thêm) — dsYcCuaCon, api-may › yeu-cau/:id.
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { thamSo } from "./cau-hinh.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { khoaCon } from "./vi.ts";
import { allowlistHieuLuc, chuanMuc, datLuat, dsLuat, laCongCuHeThong, phanLoaiTu } from "./luat-app.ts";
import { loaiTuNhom, nhanNhom, nhomTuLoai, type NhomDs } from "./chan-co-ban.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { kieuMuc } from "./chinh-sach.ts";
import { choVay, trangThaiSao, VAY_TOI_DA, xemTruocVay, type MucDichVay } from "./so-sao.ts";

export const LOAI_YC = ["vay_sao", "them_gio", "mo_web", "cai_app", "ngoai_le", "ngoai_gio", "khac"] as const;
/** Lời xin vay sao (mới) + các loại cũ nay nhận như xin vay để chơi. */
export const LOAI_VAY = new Set<string>(["vay_sao", "them_gio", "ngoai_le", "ngoai_gio"]);
export type LoaiYc = (typeof LOAI_YC)[number];
export const LY_DO_NHANH = ["Để làm bài tập", "Bạn rủ chơi", "Hôm nay con ngoan", "Con làm xong việc rồi"];

type Yc = { id: string; child_id: string; device_id: string | null; loai: LoaiYc; phut: number | null; gia_tri: string | null; ly_do: string;
  trang_thai: string; het_han: Date; created_at: Date; pham_vi: string | null; muc_dich: string | null; theo_ten?: boolean | null; ten_app?: string | null };

async function hetHanCu(t: Q, con: string, now: Date) {
  await t(`update requests set trang_thai = 'het_han', xu_ly_luc = $2 where child_id = $1 and trang_thai = 'cho' and het_han <= $2`, [con, now]);
}

export async function guiYeuCau(con: string, mayId: string | null,
  b: { loai?: unknown; phut?: unknown; soSao?: unknown; mucDich?: unknown; quaId?: unknown; giaTri?: unknown; lyDo?: unknown; phamVi?: unknown;
     /** #425: lời xin app theo tên (true) / theo định danh thật (false); không gửi ⇒ đoán theo dạng giaTri */ theoTen?: boolean;
     /** tên hiển thị app (lưới app máy báo) khi giaTri là định danh */ tenApp?: unknown },
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
  // app theo TÊN (#422, «Minecraft» — không .exe / .app / tên gói) giữ hoa thường như Con gõ / chọn để Ba Mẹ đọc đúng tên
  const theoTen = loai === "cai_app" ? (b.theoTen ?? laTenApp(b.giaTri)) : null;
  const giaTri = loai === "mo_web" ? chuanMuc(b.giaTri)
    : loai === "cai_app" ? (theoTen ? String(b.giaTri ?? "").trim().slice(0, 60) : chuanMuc(b.giaTri))
    : mucDich === "qua" ? String(b.quaId ?? b.giaTri ?? "").trim().slice(0, 40) || null
    : String(b.giaTri ?? "").trim().slice(0, 200) || null;
  if ((loai === "mo_web" || loai === "cai_app") && !giaTri) throw new LoiNghiepVu("thieu_gia_tri", loai === "mo_web" ? "Dán đường link website" : "Ghi tên ứng dụng");
  // #525: thành phần Windows / công cụ hệ thống (vd «Storedesktopextension») không phải app con mở — không tạo lời xin, Ba Mẹ không thấy
  if (loai === "cai_app" && laCongCuHeThong(giaTri, typeof b.tenApp === "string" ? b.tenApp : giaTri)) return { id: "", trang_thai: "bo_qua" };
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
    await t(`insert into requests(id, child_id, device_id, loai, phut, gia_tri, ly_do, het_han, created_at, muc_dich, theo_ten, ten_app) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, con, mayId, loai, soSao, giaTri, lyDo, new Date(now.getTime() + gio * 3600_000), now, mucDich, loai === "cai_app" ? theoTen : null,
        loai === "cai_app" && typeof b.tenApp === "string" && b.tenApp.trim() ? b.tenApp.trim().slice(0, 60) : null]);
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

/** `nhom` (#262, lời xin app / web): tinh_phut | khong_tinh_phut — thêm vào danh sách lâu dài; giá trị khác (game, video_ngan… cũ) = nhóm giải trí
 *  cũ đi cùng `phanLoai`. `loiNhan`: lời Ba Mẹ nhắn Con («Chơi xong nhớ làm bài nha con!») — Con thấy cùng kết quả. */
export type DongY = { truDiem?: boolean; phut?: number; soSao?: number; phanLoai?: "hoc" | "giai_tri"; nhom?: string; phamVi?: "lan_nay" | "hom_nay" | "vinh_vien";
  loiNhan?: unknown };

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
    let nhomThem: NhomDs | null = null;
    let moTam: { den: Date; phut: number } | null = null;
    let phanLoaiCu: string | null = null;
    if (LOAI_VAY.has(r.loai)) {
      const n = Math.round(Number(o.soSao ?? o.phut ?? r.phut));
      const mucDich: MucDichVay = r.muc_dich === "qua" ? "qua" : "choi";
      vay = await choVay(fam, r.child_id, n, nguoi, { mucDich, yeuCau: r.id, quaId: mucDich === "qua" ? r.gia_tri : null }, t, now);
      grantId = vay.id;
      await t(`update requests set phut = $2 where id = $1`, [r.id, vay.soSao]);
    } else if (r.loai === "mo_web" || r.loai === "cai_app") {
      // app theo tên (#422) không mở tạm được (chưa có định danh) ⇒ đường cũ «Lần này» / «Hôm nay» cũng thêm vào danh sách theo nhóm tương ứng
      const nhomDs = nhanNhom(o.nhom === "tinh_phut" || o.nhom === "khong_tinh_phut" ? o.nhom
        : laAppTheoTen(r) ? (o.phanLoai === "hoc" ? "khong_tinh_phut" : "tinh_phut") : null);
      if (nhomDs) {
        // #262: thêm vào danh sách lâu dài, đúng nhóm Ba Mẹ chọn
        nhomThem = nhomDs;
        await themMucDanhSach(t, fam, r, nhomDs);
      } else {
        const loai = o.phanLoai === "hoc" ? "hoc" : "giai_tri";
        const phamVi = o.phamVi ?? "vinh_vien";
        // «Lần này»: mở đúng số phút Ba Mẹ cho (thiết kế 14/11 «Cho 30 phút YouTube») — không gửi phút ⇒ 1 giờ như trước
        const phutLan = Math.round(Number(o.phut));
        if (phamVi === "lan_nay" && o.phut !== undefined && !(phutLan >= 5 && phutLan <= 240)) throw new LoiNghiepVu("phut_sai", "Chọn thời lượng");
        const het = phamVi === "vinh_vien" ? null : phamVi === "hom_nay" ? dauNgayUtc(ngay, f.tz)
          : new Date(now.getTime() + (o.phut !== undefined ? phutLan * 60_000 : 3600_000));
        const hetThat = phamVi === "hom_nay" ? new Date(het!.getTime() + 86_400_000) : het;
        await datLuat(fam, { con: r.child_id, muc: r.gia_tri, ten: r.gia_tri, loai, nhom: o.nhom, het: hetThat }, t);
        // đường cũ: vĩnh viễn = đã thêm vào danh sách; «Lần này» / «Hôm nay» = chỉ MỞ TẠM tới `hetThat` — không báo «đã thêm vào danh sách»
        if (hetThat) moTam = { den: hetThat, phut: Math.round((hetThat.getTime() - now.getTime()) / 60_000) };
        else nhomThem = nhomTuLoai(loai);
        phanLoaiCu = loai;
      }
    }
    const loiNhan = sachLoiNhan(o.loiNhan);
    const phanLoaiGhi = nhomThem ? loaiTuNhom(nhomThem) : phanLoaiCu ?? o.phanLoai ?? null;
    await t(`update requests set trang_thai = 'dong_y', nguoi_duyet = $2, xu_ly_luc = $3, tru_diem = null, ngoai_le = false, pham_vi = coalesce($4, pham_vi), phan_loai = $5,
             tu_dong = $6, loi_nhan = $7 where id = $1`, [r.id, nguoi, now, (nhomThem || moTam) && !o.phamVi ? "vinh_vien" : o.phamVi ?? null, phanLoaiGhi, nguoi === null, loiNhan]);
    await ghiSuKien(fam, "dong_y_yeu_cau", { loai: r.loai, ...(vay ? { vay: true, so_sao: vay.soSao } : {}),
      ...(nhomThem ? { gia_tri: r.gia_tri, nhom: nhomThem, ten_nguoi: await tenNguoi(t, nguoi), ...(loiNhan ? { loi_nhan: loiNhan } : {}) } : {}),
      ...(moTam ? { gia_tri: r.gia_tri, mo_tam: true, phut: moTam.phut, den: moTam.den.toISOString(), ten_nguoi: await tenNguoi(t, nguoi) } : {}) }, { con: r.child_id, nguoi }, t);
    return { ngoaiLe: false, ...(grantId ? { grantId } : {}), ...(vay ? { vay } : {}), ...(nhomThem ? { nhom: nhomThem, muc: r.gia_tri } : {}),
      ...(moTam ? { moTam: { den: moTam.den.toISOString(), phut: moTam.phut }, muc: r.gia_tri } : {}) };
  });
}

/** Lời xin app theo tên? Lời xin mới ghi rõ (theo_ten); lời xin cũ (null) ⇒ đoán theo dạng gia_tri. */
const laAppTheoTen = (r: { loai: string; gia_tri: string | null; theo_ten?: boolean | null }) =>
  r.loai === "cai_app" && (r.theo_ten ?? laTenApp(r.gia_tri));
/** Tên app trần (#422 «Minecraft» — không .exe / .app / tên gói, không phải đường link): lời xin cai_app giữ TÊN, Ba Mẹ đồng ý ⇒ thêm app theo tên. */
const laTenApp = (v: unknown) => { const t = String(v ?? "").trim(); return !!t && !/[/:]/.test(t) && kieuMuc(chuanMuc(t)) !== "app"; };

const sachLoiNhan = (v: unknown) => String(v ?? "").trim().slice(0, 120) || null;
const tenNguoi = async (t: Q, id: string | null) => (id ? (await t<{ ten: string }>(`select ten from parents where id = $1`, [id]))[0]?.ten ?? null : null);

/** Lời xin app / web ⇒ luật LÂU DÀI của Con, nhóm `nhom`. Tên hiển thị: trang web = tên miền; app = tên thật máy báo (app_may) nếu có. */
async function themMucDanhSach(t: Q, fam: string, r: { child_id: string; loai: string; gia_tri: string | null; theo_ten?: boolean | null; ten_app?: string | null },
  nhom: NhomDs) {
  if (!r.gia_tri) throw new LoiNghiepVu("thieu_gia_tri", "Lời xin không có tên app / trang web", 409);
  const cd = await import("./che-do-chan.ts");      // nạp lúc chạy — che-do-chan.ts đã import file này
  if (laAppTheoTen(r)) {
    // #422: app theo tên ⇒ khớp app thật máy của Con đã báo, chưa thấy thì chờ khớp (app_theo_ten) — như Ba Mẹ «Thêm app khác»
    await cd.datAppChoPhep(fam, r.child_id, [{ ten: r.gia_tri, nhom }], undefined, t, false);
    return;
  }
  const ten = r.loai === "cai_app"
    ? (await t<{ ten: string }>(`select a.ten from app_may a join devices d on d.id = a.device_id where d.family_id = $1 and lower(a.muc) = $2
         order by a.thay_luc desc limit 1`, [fam, r.gia_tri.toLowerCase()]))[0]?.ten ?? r.ten_app ?? r.gia_tri
    : r.gia_tri;
  await datLuat(fam, { con: r.child_id, muc: r.gia_tri, ten, loai: loaiTuNhom(nhom), nhom: nhom === "tinh_phut" ? "khac" : undefined }, t);
}

/** «Bỏ qua» (#258, thiết kế bm2-yeu-cau-web / them-hppe9qh6): chỉ lời xin app / web — không ghi gì vào danh sách, không chặn thêm, Con được báo
 *  «Ba Mẹ chưa thêm … lúc này» và xin lại được. Hoàn tác trong BO_QUA_HOAN_TAC_GIAY (POST yeu-cau/:id/hoan-tac). → { ok, hoanTacDen }. */
export const BO_QUA_HOAN_TAC_GIAY = 60;
export async function boQuaYc(fam: string, id: string, nguoi: string, b: { loiNhan?: unknown } = {}, now = new Date()) {
  return tx(async (t) => {
    const r = await layYc(t, fam, id, now);
    if (r.loai !== "mo_web" && r.loai !== "cai_app") throw new LoiNghiepVu("khong_bo_qua", "Chỉ bỏ qua được lời xin mở app / trang web", 409);
    const loiNhan = sachLoiNhan(b.loiNhan);
    await t(`update requests set trang_thai = 'bo_qua', nguoi_duyet = $2, xu_ly_luc = $3, loi_nhan = $4 where id = $1`, [r.id, nguoi, now, loiNhan]);
    await ghiSuKien(fam, "bo_qua_yeu_cau", { yeu_cau: r.id, loai: r.loai, gia_tri: r.gia_tri, ten_nguoi: await tenNguoi(t, nguoi), ...(loiNhan ? { loi_nhan: loiNhan } : {}) },
      { con: r.child_id, nguoi }, t);
    return { ok: true, trangThai: "bo_qua" as const, hoanTacDen: new Date(now.getTime() + BO_QUA_HOAN_TAC_GIAY * 1000).toISOString() };
  });
}

/** «Thêm luôn» (màn «Lời xin đã bỏ qua» — them-1g0mpf21): Ba Mẹ cho ngay một lời xin đã bỏ qua (hoặc đã «Không cho» kiểu cũ), khỏi chờ Con xin lại.
 *  Lời xin còn chờ ⇒ như đồng ý. Không cần lời xin còn hạn. → { ok, nhom, muc }. */
export async function themLuonYc(fam: string, id: string, nguoi: string, b: { nhom?: unknown; loiNhan?: unknown }, now = new Date()) {
  const nhom = nhanNhom(b.nhom ?? "tinh_phut");
  if (!nhom) throw new LoiNghiepVu("nhom_sai", "Chọn «Tính phút» hoặc «Không tính phút»");
  const cho = await one<{ trang_thai: string; het_han: Date }>(`select r.trang_thai, r.het_han from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2`, [id, fam]);
  if (!cho) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
  // còn chờ và chưa hết hạn ⇒ như đồng ý; hết hạn (dù trang_thai còn «cho») ⇒ thêm luôn như lời xin đã bỏ qua
  if (cho.trang_thai === "cho" && new Date(cho.het_han) > now) return { ok: true, ...(await dongY(fam, id, nguoi, { nhom, loiNhan: b.loiNhan }, now)) };
  return tx(async (t) => {
    const r = (await t<Yc>(`select r.* from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2 for update of r`, [id, fam]))[0];
    if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
    if ((r.loai !== "mo_web" && r.loai !== "cai_app") || !["bo_qua", "tu_choi", "het_han", "cho"].includes(r.trang_thai))
      throw new LoiNghiepVu("da_xu_ly", "Lời xin này đã được xử lý", 409);
    await khoaCon(t, r.child_id);
    await themMucDanhSach(t, fam, r, nhom);
    const loiNhan = sachLoiNhan(b.loiNhan);
    await t(`update requests set trang_thai = 'dong_y', nguoi_duyet = $2, xu_ly_luc = $3, pham_vi = 'vinh_vien', phan_loai = $4, loi_nhan = coalesce($5, loi_nhan),
             ly_do_tu_choi = null where id = $1`, [r.id, nguoi, now, loaiTuNhom(nhom), loiNhan]);
    await ghiSuKien(fam, "dong_y_yeu_cau", { loai: r.loai, gia_tri: r.gia_tri, nhom, them_luon: true, ten_nguoi: await tenNguoi(t, nguoi), ...(loiNhan ? { loi_nhan: loiNhan } : {}) },
      { con: r.child_id, nguoi }, t);
    return { ok: true, ngoaiLe: false, nhom, muc: r.gia_tri };
  });
}

/** «Lời xin đã bỏ qua» (thay màn «Luôn chặn») — 30 ngày, mỗi (Con, mục) một dòng mới nhất; bỏ dòng đã có trong danh sách hoặc Con đã xin lại
 *  (đang chờ / đã thêm). `con` bỏ trống = cả nhà. */
export async function dsBoQua(fam: string, con: string | null, now = new Date()) {
  const r = await q<{ id: string; child_id: string; ten_con: string; loai: string; gia_tri: string; ten_app: string | null; ly_do: string; luc: Date; ten_nguoi: string | null; device: string | null }>(
    `select distinct on (r.child_id, r.gia_tri) r.id, r.child_id, c.ten as ten_con, r.loai, r.gia_tri, r.ten_app, r.ly_do, coalesce(r.xu_ly_luc, r.created_at) as luc,
            p.ten as ten_nguoi, d.name as device
       from requests r join children c on c.id = r.child_id left join parents p on p.id = r.nguoi_duyet left join devices d on d.id = r.device_id
      where c.family_id = $1 and ($2::text is null or r.child_id = $2) and r.loai in ('mo_web', 'cai_app') and r.gia_tri is not null
        and r.trang_thai in ('bo_qua', 'tu_choi') and coalesce(r.xu_ly_luc, r.created_at) > $3::timestamptz - interval '30 days'
        and not exists (select 1 from requests x where x.child_id = r.child_id and x.gia_tri = r.gia_tri and x.loai = r.loai
                         and x.created_at > r.created_at and (x.trang_thai in ('dong_y', 'da_thuc_thi') or (x.trang_thai = 'cho' and x.het_han > $3)))
      order by r.child_id, r.gia_tri, r.created_at desc`, [fam, con, now]);
  const luat = r.length ? await dsLuat(fam) : [];          // phân loại trong bộ nhớ — một lần đọc luật cho cả danh sách
  const allow = allowlistHieuLuc();
  const ds = [];
  for (const x of r) {
    const pl = phanLoaiTu(luat, x.child_id, x.gia_tri, allow);
    if (pl === "hoc" || pl === "giai_tri" || pl === "he_thong") continue;     // đã vào danh sách bằng đường khác
    ds.push({ id: x.id, con: x.child_id, tenCon: x.ten_con, loai: x.loai, kieu: x.loai === "mo_web" ? "web" : "app", muc: x.gia_tri, ten: x.ten_app ?? x.gia_tri,
      lyDo: x.ly_do || null, luc: new Date(x.luc).toISOString(), nguoiBoQua: x.ten_nguoi, may: x.device });
  }
  return { ds: ds.sort((a, b) => b.luc.localeCompare(a.luc)) };
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

/** «Hoàn tác, xem lại lời xin» (them-hppe9qh6): Ba Mẹ vừa «Bỏ qua» (#258 — trong 60 giây) hoặc «Không cho» kiểu cũ (trong 10 phút) ⇒ đưa lời
 *  xin về «chờ» để trả lời lại. Lời xin đã hết hạn / người khác đã trả lời lại / quá hạn hoàn tác ⇒ 409. POST yeu-cau/:id/hoan-tac (= mo-lai). */
export const MO_LAI_PHUT = 10;
export async function moLaiYc(fam: string, id: string, nguoi: string, now = new Date()) {
  return tx(async (t) => {
    const r = (await t<Yc & { xu_ly_luc: Date | null }>(
      `select r.* from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2 for update of r`, [id, fam]))[0];
    if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
    const han = r.trang_thai === "bo_qua" ? BO_QUA_HOAN_TAC_GIAY * 1000 : MO_LAI_PHUT * 60_000;
    if ((r.trang_thai !== "tu_choi" && r.trang_thai !== "bo_qua") || !r.xu_ly_luc || now.getTime() - new Date(r.xu_ly_luc).getTime() > han)
      throw new LoiNghiepVu("khong_mo_lai", "Lời xin này không hoàn tác được nữa", 409);
    if (new Date(r.het_han) <= now) throw new LoiNghiepVu("het_han", "Yêu cầu đã hết hạn", 409);
    await t(`update requests set trang_thai = 'cho', nguoi_duyet = null, xu_ly_luc = null, ly_do_tu_choi = null, loi_nhan = null where id = $1`, [r.id]);
    // Hoàn tác «Bỏ qua»: thu hồi sự kiện bo_qua (tin khay «chưa thêm» của Con, nhật ký, thông báo) — Con không thấy gì
    if (r.trang_thai === "bo_qua") await t(`delete from events where family_id = $1 and child_id = $2 and loai = 'bo_qua_yeu_cau' and chi_tiet->>'yeu_cau' = $3`, [fam, r.child_id, r.id]);
    await ghiSuKien(fam, "mo_lai_yeu_cau", { loai: r.loai, tu: r.trang_thai }, { con: r.child_id, nguoi }, t);
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
                                     where c.family_id = $1 and r.trang_thai = 'cho' order by r.created_at`, [fam])
    .then((ds) => ds.filter((r) => !(r.loai === "cai_app" && laCongCuHeThong(r.gia_tri, r.ten_app ?? r.gia_tri))));   // #525: lời xin cũ của thành phần Windows
}

/** Lời xin của Con (màn Con) — kèm KẾT QUẢ cho lời xin app / web (#258): `ketQua` cho | da_them | chua_them | het_han | huy · `nhom`
 *  (tinh_phut | khong_tinh_phut khi đã thêm) · `tenNguoiDuyet` («Mẹ Lan») · `loiNhan` (lời Ba Mẹ nhắn). */
export async function dsYcCuaCon(con: string) {
  const r = await q<Yc & { ly_do_tu_choi: string | null; loi_nhan: string | null; phan_loai: string | null; xu_ly_luc: Date | null; ten_nguoi: string | null }>(
    `select r.*, p.ten as ten_nguoi from requests r left join parents p on p.id = r.nguoi_duyet where r.child_id = $1 order by r.created_at desc limit 30`, [con]);
  return r.map(({ ten_nguoi, ...x }) => ({ ...x, ...ketQuaYc(x), tenNguoiDuyet: ten_nguoi }));
}

/** Kết quả lời xin app / web cho Con / agent: cho | da_them | mo_tam (đường cũ «Lần này» / «Hôm nay» — chỉ mở tạm, không vào danh sách) |
 *  chua_them | het_han | huy (lời xin khác ⇒ null). «Bỏ qua» trong 60 giây đầu (Ba Mẹ còn Hoàn tác được) vẫn là «cho» với Con. */
export function ketQuaYc(r: { loai: string; trang_thai: string; phan_loai?: string | null; loi_nhan?: string | null; pham_vi?: string | null; xu_ly_luc?: Date | string | null },
  now = new Date()) {
  if (r.loai !== "mo_web" && r.loai !== "cai_app") return { ketQua: null, nhom: null, loiNhan: r.loi_nhan ?? null };
  const boQuaMoi = r.trang_thai === "bo_qua" && !!r.xu_ly_luc && now.getTime() - new Date(r.xu_ly_luc).getTime() < BO_QUA_HOAN_TAC_GIAY * 1000;
  const ketQua = r.trang_thai === "dong_y" || r.trang_thai === "da_thuc_thi" ? (r.pham_vi === "lan_nay" || r.pham_vi === "hom_nay" ? "mo_tam" : "da_them")
    : boQuaMoi ? "cho" : r.trang_thai === "bo_qua" || r.trang_thai === "tu_choi" ? "chua_them"
    : r.trang_thai === "cho" ? "cho" : r.trang_thai === "huy" ? "huy" : "het_han";
  return { ketQua, nhom: ketQua === "da_them" ? nhomTuLoai(r.phan_loai ?? "giai_tri") : null, loiNhan: ketQua === "cho" ? null : r.loi_nhan ?? null };
}

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
