// Thành viên gia đình (FR-01.04): Chủ gia đình mời Ba / Mẹ / Ông Bà với quyền Phê duyệt (đầy đủ) hoặc Chỉ xem. Lời mời qua link / mã,
// dùng MỘT lần, hết hạn sau 72 giờ, chỉ lưu băm. Người được mời: tạo tài khoản mới bằng mã (vẫn xác thực OTP như đăng ký thường),
// hoặc — nếu đã lỡ đăng ký một tài khoản trống (chưa có Con, máy, thành viên nào) — nhận lời mời để chuyển sang gia đình này.
// Chỉ Chủ gia đình mời, đổi vai, mời ra. Mời ra = vai «roi» (giữ tên cho lịch sử «ai duyệt»), xoá mọi phiên, không đăng nhập lại được.
import { randomInt } from "node:crypto";
import { newId, one, q, tx } from "./db.ts";
import { bamMatKhau, chuanDinhDanh, kiemOtp, sha, type BaMe } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { SCHEMA_TV_TB } from "./schema.ts";

export const LOI_MOI_GIO = 72;
export const MOI_CHO_TOI_DA = 5;
export const THANH_VIEN_TOI_DA = 8;
export const VAI_MOI = ["duyet", "xem"] as const;
export type VaiMoi = (typeof VAI_MOI)[number];
export const TEN_VAI: Record<string, string> = { chu: "Chủ gia đình", duyet: "Phê duyệt", xem: "Chỉ xem" };

let coBang = false;
export async function bangTvTb() {
  if (coBang) return;
  for (const c of SCHEMA_TV_TB) await q(c);
  coBang = true;
}

const CHU_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";          // bỏ I, L, O, 0, 1 cho dễ đọc qua điện thoại
const taoMa = () => Array.from({ length: 8 }, () => CHU_MA[randomInt(0, CHU_MA.length)]).join("");
/** «abcd-2345», «ABCD 2345», link …?ma=ABCD2345 ⇒ «ABCD2345». */
export const chuanMa = (v: unknown) => {
  const s = String(v ?? "").trim();
  const tuLink = /[?&]ma=([^&#\s]+)/.exec(s)?.[1];
  return decodeURIComponent(tuLink ?? s).toUpperCase().replace(/[^A-Z0-9]/g, "");
};
export const hienMa = (ma: string) => `${ma.slice(0, 4)}-${ma.slice(4)}`;

function chiChu(bm: BaMe) {
  if (bm.vai !== "chu") throw new LoiNghiepVu("chi_chu", "Chỉ Chủ gia đình mời và đổi quyền thành viên", 403);
}

const vaiHopLe = (v: unknown): VaiMoi => {
  if (!(VAI_MOI as readonly string[]).includes(String(v))) throw new LoiNghiepVu("vai_sai", "Chọn quyền Phê duyệt hoặc Chỉ xem");
  return v as VaiMoi;
};

/** Danh sách thành viên (không gồm người đã mời ra) + lời mời còn hạn. */
export async function dsThanhVien(fam: string) {
  await bangTvTb();
  const ds = await q<{ id: string; ten: string; vai: string; dinh_danh: string; created_at: Date }>(
    `select id, ten, vai, dinh_danh, created_at from parents where family_id = $1 and vai <> 'roi' order by (vai = 'chu') desc, created_at`, [fam]);
  const loiMoi = await q<{ id: string; vai: string; ten_goi: string; het: Date; created_at: Date }>(
    `select id, vai, ten_goi, het, created_at from loi_moi where family_id = $1 and dung_luc is null and huy_luc is null and het > now()
     order by created_at desc`, [fam]);
  return { ds, loiMoi };
}

/** Chủ gia đình tạo lời mời. → mã (chỉ trả MỘT lần), link, hạn. */
export async function taoLoiMoi(bm: BaMe, b: { vai?: unknown; tenGoi?: unknown }, goc: string) {
  chiChu(bm);
  await bangTvTb();
  const vai = vaiHopLe(b.vai);
  const tenGoi = String(b.tenGoi ?? "").trim().slice(0, 30);
  const { ds, loiMoi } = await dsThanhVien(bm.family_id);
  if (ds.length >= THANH_VIEN_TOI_DA) throw new LoiNghiepVu("du_thanh_vien", `Gia đình đã đủ ${THANH_VIEN_TOI_DA} người lớn`, 409);
  if (loiMoi.length >= MOI_CHO_TOI_DA) throw new LoiNghiepVu("qua_nhieu_loi_moi", `Đang có ${MOI_CHO_TOI_DA} lời mời chờ — huỷ bớt rồi mời tiếp`, 409);
  for (let i = 0; i < 10; i++) {
    const ma = taoMa(), id = newId();
    const r = await q(`insert into loi_moi(id, family_id, ma_hash, vai, ten_goi, nguoi, het) values ($1,$2,$3,$4,$5,$6, now() + make_interval(hours => $7))
                       on conflict (ma_hash) do nothing returning het`, [id, bm.family_id, sha(ma), vai, tenGoi, bm.id, LOI_MOI_GIO]);
    if (r.length) {
      await ghiSuKien(bm.family_id, "moi_thanh_vien", { vai, ten_goi: tenGoi }, { nguoi: bm.id });
      return { id, ma: hienMa(ma), lienKet: `${goc.replace(/\/$/, "")}/moi?ma=${ma}`, vai, tenGoi, het: new Date(r[0].het).toISOString() };
    }
  }
  throw new Error("Không tạo được mã mời");
}

export async function huyLoiMoi(bm: BaMe, id: string) {
  chiChu(bm);
  await bangTvTb();
  const r = await q(`update loi_moi set huy_luc = now() where id = $1 and family_id = $2 and dung_luc is null and huy_luc is null returning id`, [id, bm.family_id]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy lời mời này (có thể đã dùng hoặc đã huỷ)", 404);
  await ghiSuKien(bm.family_id, "huy_loi_moi", {}, { nguoi: bm.id });
}

type LoiMoi = { id: string; family_id: string; vai: VaiMoi; ten_goi: string; nguoi: string | null; het: Date; dung_luc: Date | null; huy_luc: Date | null };

function kiemLoiMoi(m: LoiMoi | undefined): asserts m is LoiMoi {
  if (!m || m.huy_luc) throw new LoiNghiepVu("ma_moi_sai", "Mã mời không đúng — hỏi lại người mời", 404);
  if (m.dung_luc) throw new LoiNghiepVu("ma_moi_da_dung", "Mã mời này đã được dùng — xin người mời mã mới", 409);
  if (new Date(m.het) < new Date()) throw new LoiNghiepVu("ma_moi_het_han", `Mã mời đã quá ${LOI_MOI_GIO} giờ — xin người mời mã mới`, 410);
}

/** Xem trước lời mời (không cần đăng nhập): mời vào nhà nào, quyền gì, ai mời. */
export async function xemLoiMoi(maVao: unknown) {
  await bangTvTb();
  const m = await one<LoiMoi & { ten_gia_dinh: string; ten_nguoi_moi: string | null }>(
    `select l.*, f.ten as ten_gia_dinh, p.ten as ten_nguoi_moi from loi_moi l join families f on f.id = l.family_id
     left join parents p on p.id = l.nguoi where l.ma_hash = $1`, [sha(chuanMa(maVao))]);
  kiemLoiMoi(m);
  return { tenGiaDinh: m.ten_gia_dinh, nguoiMoi: m.ten_nguoi_moi, vai: m.vai, tenVai: TEN_VAI[m.vai], tenGoi: m.ten_goi, het: new Date(m.het).toISOString() };
}

/** Người được mời tạo tài khoản bằng mã mời: OTP đúng ⇒ Ba Mẹ mới thuộc gia đình mời với vai đã chọn. → id Ba Mẹ. */
export async function dangKyTheoLoiMoi(b: { ma?: unknown; dinhDanh?: unknown; otp?: unknown; ten?: unknown; matKhau?: unknown }) {
  await bangTvTb();
  const d = chuanDinhDanh(b.dinhDanh);
  if (!d) throw new LoiNghiepVu("dinh_danh_sai", "Nhập số điện thoại (10 số) hoặc email");
  const ten = String(b.ten ?? "").trim().slice(0, 40);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Cho biết tên gọi trong gia đình (vd Ba Huy, Bà nội)");
  const mk = String(b.matKhau ?? "");
  if (mk.length < 8) throw new LoiNghiepVu("mk_ngan", "Mật khẩu cần ít nhất 8 ký tự");
  const bam = await bamMatKhau(mk), maHash = sha(chuanMa(b.ma));
  const kq = await tx(async (t) => {
    const m = (await t<LoiMoi>(`select * from loi_moi where ma_hash = $1 for update`, [maHash]))[0];
    kiemLoiMoi(m);
    if (!(await kiemOtp(t, d, b.otp, "dang_ky"))) return null;          // lần sai vẫn được ghi (không rollback)
    if ((await t(`select 1 from parents where dinh_danh = $1`, [d])).length)
      throw new LoiNghiepVu("da_co_tai_khoan", "Số/email này đã có tài khoản — đăng nhập rồi nhập mã mời", 409);
    // Kiểm trần NGAY LÚC NHẬN (trong tx): nhiều mã chờ có thể cùng được nhận, đừng để vượt THANH_VIEN_TOI_DA.
    if ((await t(`select 1 from parents where family_id = $1 and vai <> 'roi'`, [m.family_id])).length >= THANH_VIEN_TOI_DA)
      throw new LoiNghiepVu("du_thanh_vien", `Gia đình đã đủ ${THANH_VIEN_TOI_DA} người lớn`, 409);
    const id = newId();
    await t(`insert into parents(id, family_id, dinh_danh, ten, vai, pass_hash) values ($1,$2,$3,$4,$5,$6)`, [id, m.family_id, d, ten, m.vai, bam]);
    await t(`update loi_moi set dung_luc = now(), dung_boi = $2 where id = $1`, [m.id, id]);
    await ghiSuKien(m.family_id, "thanh_vien_vao", { ten, vai: m.vai }, { nguoi: id }, t);
    return id;
  });
  if (!kq) throw new LoiNghiepVu("otp_sai", "Mã chưa đúng");
  return kq;
}

/** Ba Mẹ đã đăng nhập nhận lời mời: chỉ khi gia đình hiện tại còn TRỐNG (chưa có Con, máy, người lớn khác) — chuyển sang gia đình mời,
 * gia đình trống bị xoá. Tài khoản đã có dữ liệu thì không chuyển (mỗi tài khoản một gia đình ở giai đoạn này). */
export async function nhanLoiMoi(bm: BaMe, maVao: unknown) {
  await bangTvTb();
  const maHash = sha(chuanMa(maVao));
  return tx(async (t) => {
    const m = (await t<LoiMoi>(`select * from loi_moi where ma_hash = $1 for update`, [maHash]))[0];
    kiemLoiMoi(m);
    if (m.family_id === bm.family_id) throw new LoiNghiepVu("da_trong_gia_dinh", "Ba/Mẹ đã ở trong gia đình này rồi", 409);
    // PGlite một kết nối: trong giao dịch chạy lần lượt, không Promise.all
    const con = await t(`select 1 from children where family_id = $1 limit 1`, [bm.family_id]);
    const may = await t(`select 1 from devices where family_id = $1 limit 1`, [bm.family_id]);
    const nguoi = await t(`select 1 from parents where family_id = $1 and id <> $2 and vai <> 'roi' limit 1`, [bm.family_id, bm.id]);
    if (con.length || may.length || nguoi.length)
      throw new LoiNghiepVu("gia_dinh_co_du_lieu", "Tài khoản này đã có Con, máy hoặc thành viên — dùng số/email khác để nhận lời mời", 409);
    // Kiểm trần ở gia đình ĐÍCH ngay lúc nhận (trong tx) — chặn vượt THANH_VIEN_TOI_DA khi nhiều mã cùng được nhận.
    if ((await t(`select 1 from parents where family_id = $1 and vai <> 'roi'`, [m.family_id])).length >= THANH_VIEN_TOI_DA)
      throw new LoiNghiepVu("du_thanh_vien", `Gia đình đã đủ ${THANH_VIEN_TOI_DA} người lớn`, 409);
    const cu = bm.family_id;
    await t(`update parents set family_id = $2, vai = $3 where id = $1`, [bm.id, m.family_id, m.vai]);
    await t(`update loi_moi set dung_luc = now(), dung_boi = $2 where id = $1`, [m.id, bm.id]);
    await t(`delete from families where id = $1 and not exists (select 1 from parents where family_id = $1)`, [cu]);
    await ghiSuKien(m.family_id, "thanh_vien_vao", { ten: bm.ten, vai: m.vai }, { nguoi: bm.id }, t);
    return { vai: m.vai };
  });
}

async function thanhVienKhac(bm: BaMe, id: string) {
  chiChu(bm);
  if (id === bm.id) throw new LoiNghiepVu("khong_tu_doi", "Chủ gia đình không tự đổi quyền hay tự mời ra", 409);
  const p = await one<{ id: string; ten: string; vai: string }>(`select id, ten, vai from parents where id = $1 and family_id = $2 and vai <> 'roi'`, [id, bm.family_id]);
  if (!p) throw new LoiNghiepVu("khong_thay", "Không thấy thành viên này", 404);
  if (p.vai === "chu") throw new LoiNghiepVu("khong_doi_chu", "Không đổi quyền Chủ gia đình", 409);
  return p;
}

export async function doiVai(bm: BaMe, id: string, vaiVao: unknown) {
  const p = await thanhVienKhac(bm, id);
  const vai = vaiHopLe(vaiVao);
  await q(`update parents set vai = $2 where id = $1`, [id, vai]);
  await ghiSuKien(bm.family_id, "doi_vai", { ten: p.ten, tu: p.vai, thanh: vai }, { nguoi: bm.id });
  return { vai };
}

export async function moiRa(bm: BaMe, id: string) {
  const p = await thanhVienKhac(bm, id);
  await tx(async (t) => {
    await t(`update parents set vai = 'roi', dinh_danh = dinh_danh || '#roi:' || id, pass_hash = null where id = $1`, [id]);
    await t(`delete from sessions where parent_id = $1`, [id]);
    await ghiSuKien(bm.family_id, "moi_ra", { ten: p.ten }, { nguoi: bm.id }, t);
  });
}
