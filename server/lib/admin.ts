// Tài khoản nội bộ (Nhân viên AiiCafe ở quầy, Admin AiiLab) + nhật ký kiểm toán + cấu hình hệ thống cho cổng /admin (M5).
// Tách hẳn khỏi Ba Mẹ: bảng `staff` / `staff_sessions` riêng, token Ba Mẹ / thiết bị / Con không bao giờ khớp ở đây và ngược lại.
// Admin KHÔNG xem ảnh bằng chứng của Con (KE-HOACH 5.5): không có hàm nào ở đây đọc bảng evidence.
import { bamMatKhau, dungMatKhau, sha, taoToken, bearer } from "./auth.ts";
import { newId, one, q, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { SCHEMA_M5 } from "./schema.ts";
import { heThong } from "./he-thong.ts";
import { THAM_SO, sachCauHinh, type TenThamSo } from "./cau-hinh.ts";
import { ALLOWLIST_HE_THONG, chuanMuc } from "./luat-app.ts";
import { MAU, NHOM_NV, BANG_CHUNG } from "./nhiem-vu.ts";
import { MAU_QUA, LOAI_QUA } from "./phan-thuong.ts";

export type VaiNv = "quay" | "admin";
export type NhanVien = { id: string; ten_dang_nhap: string; ten: string; vai: VaiNv; quay: string };

const SAI_KHOA = 5, KHOA_PHUT = 15;
const PHIEN_GIO: Record<VaiNv, number> = { quay: 14, admin: 8 };     // một ca quầy / một buổi làm việc

// ---------------------------------------------------------------- lược đồ M5 (chạy một lần mỗi tiến trình)
const g = globalThis as unknown as { __aiigM5?: Promise<void> };
export function damBaoBang() {
  g.__aiigM5 ??= (async () => {
    for (const cau of SCHEMA_M5.split(";").map((s) => s.trim()).filter(Boolean)) await q(cau);
  })().catch((e) => { g.__aiigM5 = undefined; throw e; });
  return g.__aiigM5;
}

// ---------------------------------------------------------------- tài khoản
const sachTen = (s: unknown) => String(s ?? "").trim().toLowerCase().slice(0, 60);

/** Tạo hoặc cập nhật tài khoản (script seed). Mật khẩu ≥ 10 ký tự. */
export async function datTaiKhoan(b: { tenDangNhap: string; matKhau: string; ten: string; vai: VaiNv; quay?: string }) {
  await damBaoBang();
  const tdn = sachTen(b.tenDangNhap);
  if (!/^[a-z0-9._-]{3,60}$/.test(tdn)) throw new LoiNghiepVu("ten_sai", "Tên đăng nhập 3–60 ký tự: chữ thường, số, . _ -");
  if (String(b.matKhau ?? "").length < 10) throw new LoiNghiepVu("mk_ngan", "Mật khẩu tài khoản nội bộ cần ít nhất 10 ký tự");
  if (b.vai !== "quay" && b.vai !== "admin") throw new LoiNghiepVu("vai_sai", "Vai là quay hoặc admin");
  const bam = await bamMatKhau(b.matKhau);
  const r = await q<{ id: string }>(
    `insert into staff(id, ten_dang_nhap, ten, vai, quay, pass_hash) values ($1,$2,$3,$4,$5,$6)
     on conflict (ten_dang_nhap) do update set ten = excluded.ten, vai = excluded.vai, quay = excluded.quay, pass_hash = excluded.pass_hash,
       sai_lien = 0, khoa_den = null, bat = true returning id`,
    [newId(), tdn, String(b.ten ?? "").trim().slice(0, 40) || tdn, b.vai, String(b.quay ?? "").trim().slice(0, 40), bam]);
  await q(`delete from staff_sessions where staff_id = $1`, [r[0].id]);   // đổi mật khẩu ⇒ đăng xuất mọi nơi
  return r[0].id;
}

/** Đăng nhập. `vaiCan` = màn đang vào: /quay nhận quay + admin, /admin chỉ nhận admin. Sai 5 lần ⇒ khoá 15 phút. → token */
export async function dangNhapNv(tenDangNhap: unknown, mk: unknown, vaiCan: VaiNv) {
  await damBaoBang();
  const tdn = sachTen(tenDangNhap);
  const s = await one<{ id: string; vai: VaiNv; pass_hash: string; khoa_den: Date | null; bat: boolean }>(
    `select id, vai, pass_hash, khoa_den, bat from staff where ten_dang_nhap = $1`, [tdn]);
  if (s?.khoa_den && new Date(s.khoa_den) > new Date())
    throw new LoiNghiepVu("tam_khoa", `Sai mật khẩu nhiều lần — thử lại sau ${KHOA_PHUT} phút`, 429);
  const dung = s ? await dungMatKhau(String(mk ?? ""), s.pass_hash) : (await bamMatKhau(String(mk ?? "")), false);
  if (!s || !dung || !s.bat) {
    if (s) await q(`update staff set sai_lien = sai_lien + 1,
                      khoa_den = case when sai_lien + 1 >= $2 then now() + make_interval(mins => $3) else null end where id = $1`, [s.id, SAI_KHOA, KHOA_PHUT]);
    await ghiKiemToan(null, "dang_nhap_sai", { tenDangNhap: tdn.slice(0, 60), man: vaiCan });
    throw new LoiNghiepVu("sai_dang_nhap", "Tên đăng nhập hoặc mật khẩu chưa đúng", 401);
  }
  if (vaiCan === "admin" && s.vai !== "admin") throw new LoiNghiepVu("khong_du_quyen", "Tài khoản này chỉ dùng ở màn quầy AiiCafe", 403);
  await q(`update staff set sai_lien = 0, khoa_den = null where id = $1`, [s.id]);
  const t = taoToken();
  await q(`insert into staff_sessions(id, staff_id, expires_at) values ($1, $2, now() + make_interval(hours => $3))`, [sha(t), s.id, PHIEN_GIO[s.vai]]);
  await ghiKiemToan({ id: s.id, vai: s.vai }, "dang_nhap", { man: vaiCan });
  return t;
}

/** Bearer → nhân viên (hoặc null). */
export async function nvGoi(req: Request): Promise<NhanVien | null> {
  const t = bearer(req);
  if (!t) return null;
  await damBaoBang();
  return (await one<NhanVien>(
    `select s.id, s.ten_dang_nhap, s.ten, s.vai, s.quay from staff_sessions x join staff s on s.id = x.staff_id
     where x.id = $1 and x.expires_at > now() and s.bat`, [sha(t)])) ?? null;
}

export async function dangXuatNv(req: Request) {
  const t = bearer(req);
  if (t) await q(`delete from staff_sessions where id = $1`, [sha(t)]);
}

// ---------------------------------------------------------------- nhật ký kiểm toán (ai, làm gì, lúc nào)
export async function ghiKiemToan(nv: { id: string; vai: string } | null, hanhDong: string, chiTiet: Record<string, unknown> = {},
  fam: string | null = null, t: Q = q) {
  await damBaoBang();
  await t(`insert into audit(id, staff_id, vai, hanh_dong, family_id, chi_tiet) values ($1,$2,$3,$4,$5,$6::text::jsonb)`,
    [newId(), nv?.id ?? null, nv?.vai ?? null, hanhDong, fam, JSON.stringify(chiTiet)]);
}

export async function dsKiemToan(o: { hanhDong?: string | null; gioiHan?: number } = {}) {
  await damBaoBang();
  return q<{ id: string; hanh_dong: string; vai: string | null; ten_nv: string | null; family_id: string | null; ten_gd: string | null;
    chi_tiet: Record<string, unknown>; created_at: Date }>(
    `select a.id, a.hanh_dong, a.vai, s.ten as ten_nv, a.family_id, f.ten as ten_gd, a.chi_tiet, a.created_at
     from audit a left join staff s on s.id = a.staff_id left join families f on f.id = a.family_id
     where ($1::text is null or a.hanh_dong = $1) order by a.created_at desc, a.seq desc limit $2`,
    [o.hanhDong || null, Math.min(500, Math.max(1, o.gioiHan ?? 200))]);
}

// ---------------------------------------------------------------- cấu hình hệ thống (tham số mục 10, Allowlist)
async function docHt<T>(khoa: string, md: T): Promise<T> {
  await damBaoBang();
  return ((await one<{ gia_tri: T }>(`select gia_tri from he_thong where khoa = $1`, [khoa]))?.gia_tri ?? md);
}
async function ghiHt(khoa: string, v: unknown, nguoi: string) {
  await q(`insert into he_thong(khoa, gia_tri, nguoi) values ($1, $2::text::jsonb, $3)
           on conflict (khoa) do update set gia_tri = excluded.gia_tri, nguoi = excluded.nguoi, updated_at = now()`, [khoa, JSON.stringify(v), nguoi]);
}

/** Tên hiển thị + đơn vị cho bảng tham số mục 10 (BRD). */
export const TEN_THAM_SO: Record<TenThamSo, [string, string]> = {
  diem_chao_mung: ["Điểm chào mừng", "điểm"], nv_het_han_gio: ["Nhiệm vụ chờ duyệt quá hạn sau", "giờ"],
  nv_tu_duyet_qua_han: ["Tự duyệt khi quá hạn (0 tắt · 1 bật)", ""], nv_nhac_gio: ["Nhắc Ba Mẹ duyệt sau", "giờ"],
  aiirob_diem: ["Điểm mỗi bài AiiRob đạt", "điểm"], aiirob_nguong: ["Ngưỡng đạt bài AiiRob", "%"],
  gia_game: ["Giá game", "phần nghìn điểm/phút"], gia_video_ngan: ["Giá video ngắn", "phần nghìn điểm/phút"],
  gia_mxh: ["Giá mạng xã hội", "phần nghìn điểm/phút"], gia_phim_gd: ["Giá phim gia đình", "phần nghìn điểm/phút"],
  gia_khac: ["Giá giải trí khác", "phần nghìn điểm/phút"], phien_toi_da: ["Phiên giải trí tối đa", "phút"],
  nghi_giua: ["Nghỉ giữa hai phiên", "phút"], tu_dong_dong: ["Tự đóng khi không dùng", "phút"],
  voucher_xac_nhan_tu: ["Phiếu quà cần Ba Mẹ xác nhận từ", "đồng"], voucher_han_ngay: ["Hạn phiếu quà", "ngày"],
  tran_ngay: ["Trần giải trí mỗi ngày", "phút"], tran_tuan: ["Trần giải trí mỗi tuần", "phút"],
  yc_cho_toi_da: ["Yêu cầu chờ tối đa", "yêu cầu"], yc_ngay_toi_da: ["Yêu cầu mỗi ngày tối đa", "yêu cầu"],
  yc_het_gio_them: ["Yêu cầu thêm giờ hết hạn sau", "giờ"], yc_het_ngay_cai: ["Yêu cầu mở web / cài app hết hạn sau", "ngày"],
  ngoai_le_mem_tuan: ["Cảnh báo mềm: ngoại lệ mỗi tuần", "lần"], ngoai_le_mem_thang: ["Cảnh báo mềm: ngoại lệ mỗi tháng", "lần"],
  ngoai_le_manh_tuan: ["Cảnh báo mạnh: ngoại lệ mỗi tuần", "lần"], offline_gio: ["Báo máy mất kết nối sau", "giờ"],
  lech_gio_phut: ["Khoá giải trí khi giờ máy lệch quá", "phút"], ngung_chay_phut: ["Báo AiiGrow ngừng chạy sau", "phút"],
  chan_lan_gio: ["Báo khi bị chặn nhiều lần mỗi giờ", "lần"], luu_bang_chung_ngay: ["Lưu ảnh bằng chứng", "ngày"],
  mat_nhip_di_dong_phut: ["Báo máy di động mất nhịp sau", "phút"], tuan_thu_nguong: ["Ngưỡng điểm tuân thủ (dưới ⇒ khoá giải trí)", "điểm"],
  mo_khan_cap_toi_da_phut: ["Mở khẩn cấp tối đa", "phút"], goi_cai_gio: ["Gói cài (token ghép) hết hạn sau", "giờ"],
};

/** Bảng tham số: mặc định trong mã + giá trị hệ thống Admin đặt (đã kẹp min–max). */
export async function bangThamSo() {
  const ht = await docHt<Record<string, number>>("tham_so", {});
  return (Object.keys(THAM_SO) as TenThamSo[]).map((k) => ({ khoa: k, ten: TEN_THAM_SO[k][0], donVi: TEN_THAM_SO[k][1],
    macDinh: THAM_SO[k].md, min: THAM_SO[k].min, max: THAM_SO[k].max, heThong: ht[k] ?? null }));
}

/** Admin đặt mặc định hệ thống (giá trị null = về mặc định trong mã). Ghi kiểm toán giá trị cũ → mới. */
export async function datThamSo(nv: NhanVien, b: Record<string, unknown>) {
  const cu = await docHt<Record<string, number>>("tham_so", {});
  const moi: Record<string, number> = { ...cu };
  const bo = Object.entries(b ?? {}).filter(([k, v]) => k in THAM_SO && (v === null || v === "")).map(([k]) => k);
  Object.assign(moi, sachCauHinh(Object.fromEntries(Object.entries(b ?? {}).filter(([, v]) => v !== null && v !== ""))));
  for (const k of bo) delete moi[k];
  const doi = Object.keys({ ...cu, ...moi }).filter((k) => cu[k] !== moi[k]).map((k) => ({ khoa: k, cu: cu[k] ?? null, moi: moi[k] ?? null }));
  if (!doi.length) return moi;
  await ghiHt("tham_so", moi, nv.id);
  heThong.thamSo = moi;
  await ghiKiemToan(nv, "doi_tham_so", { doi });
  return moi;
}

/** Mặc định hệ thống hiệu lực — lớp đầu tiên khi gọi thamSo(heThong, gia đình, Con). */
export const thamSoHeThong = () => docHt<Record<string, number>>("tham_so", {});

export async function allowlist() {
  const them = await docHt<string[]>("allowlist_them", []);
  return { macDinh: ALLOWLIST_HE_THONG, them };
}

/** Allowlist hiệu lực = danh sách trong mã + mục Admin thêm. */
export const allowlistHieuLuc = async () => [...new Set([...ALLOWLIST_HE_THONG, ...(await allowlist()).them])];

export async function suaAllowlist(nv: NhanVien, mucVao: unknown, them: boolean) {
  const muc = chuanMuc(mucVao);
  if (!muc || muc.length < 3 || /\s/.test(muc)) throw new LoiNghiepVu("muc_sai", "Nhập tên miền (vd khanacademy.org) hoặc tên app (vd scratch.exe)");
  const ds = await docHt<string[]>("allowlist_them", []);
  if (them) {
    if (ALLOWLIST_HE_THONG.includes(muc) || ds.includes(muc)) throw new LoiNghiepVu("da_co", "Mục này đã có trong Allowlist hệ thống", 409);
    ds.push(muc);
  } else {
    if (ALLOWLIST_HE_THONG.includes(muc)) throw new LoiNghiepVu("mac_dinh", "Mục mặc định của hệ thống — không bỏ được ở đây", 409);
    const i = ds.indexOf(muc);
    if (i < 0) throw new LoiNghiepVu("khong_thay", "Không thấy mục này", 404);
    ds.splice(i, 1);
  }
  await ghiHt("allowlist_them", ds, nv.id);
  heThong.allowlistThem = [...ds];
  await ghiKiemToan(nv, them ? "them_allowlist" : "bo_allowlist", { muc });
  return ds;
}

// ---------------------------------------------------------------- thư viện mẫu (nhiệm vụ theo tuổi + quà)
export async function thuVienMau() {
  await damBaoBang();
  const rieng = await q<{ id: string; loai: string; nhom: string; du_lieu: Record<string, unknown>; bat: boolean; created_at: Date }>(
    `select id, loai, nhom, du_lieu, bat, created_at from mau_he_thong order by created_at`);
  return { nhiemVu: { nhi: MAU.nhi, teen: MAU.teen }, qua: MAU_QUA, rieng };
}

export async function themMau(nv: NhanVien, b: Record<string, unknown>) {
  const loai = b.loai === "qua" ? "qua" : "nhiem_vu";
  const ten = String(b.ten ?? "").trim().slice(0, 60);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Đặt tên cho mẫu");
  const diem = Math.round(Number(b.diem));
  if (!(diem >= 1 && diem <= 10_000)) throw new LoiNghiepVu("diem_sai", "Điểm là số nguyên từ 1 đến 10.000");
  let nhom = "", du: Record<string, unknown>;
  if (loai === "nhiem_vu") {
    nhom = b.nhom === "teen" ? "teen" : "nhi";
    const nhomNv = (NHOM_NV as readonly string[]).includes(String(b.nhomNv)) ? String(b.nhomNv) : "khac";
    const bc = (BANG_CHUNG as readonly string[]).includes(String(b.bangChung)) ? String(b.bangChung) : "anh";
    du = { ten, mo_ta: String(b.moTa ?? "").trim().slice(0, 200), nhom: nhomNv, diem, bang_chung: bc };
  } else {
    const lq = (LOAI_QUA as readonly string[]).includes(String(b.loaiQua)) ? String(b.loaiQua) : "qua";
    du = { ten, loai: lq, diem };
    if (lq === "voucher") {
      const mg = Math.round(Number(b.menhGia));
      if (!(mg >= 1000)) throw new LoiNghiepVu("menh_gia_sai", "Phiếu quà cần mệnh giá từ 1.000đ");
      du.menh_gia = mg;
    }
  }
  const id = newId();
  await q(`insert into mau_he_thong(id, loai, nhom, du_lieu) values ($1,$2,$3,$4::text::jsonb)`, [id, loai, nhom, JSON.stringify(du)]);
  await ghiKiemToan(nv, "them_mau", { loai, nhom, ten });
  return id;
}

export async function batTatMau(nv: NhanVien, id: string, bat: boolean) {
  await damBaoBang();
  const r = await q<{ du_lieu: { ten: string } }>(`update mau_he_thong set bat = $2 where id = $1 returning du_lieu`, [id, bat]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy mẫu", 404);
  await ghiKiemToan(nv, bat ? "bat_mau" : "tat_mau", { ten: r[0].du_lieu.ten });
}

/** Mẫu Admin thêm đang bật — để thư viện của Ba Mẹ ghép vào MAU / MAU_QUA (xem CẦN ANH trong PR M5). */
export async function mauRiengDangBat() {
  await damBaoBang();
  const ds = await q<{ loai: string; nhom: string; du_lieu: Record<string, unknown> }>(`select loai, nhom, du_lieu from mau_he_thong where bat order by created_at`);
  return { nhi: ds.filter((x) => x.loai === "nhiem_vu" && x.nhom === "nhi").map((x) => x.du_lieu),
    teen: ds.filter((x) => x.loai === "nhiem_vu" && x.nhom === "teen").map((x) => x.du_lieu),
    qua: ds.filter((x) => x.loai === "qua").map((x) => x.du_lieu) };
}
