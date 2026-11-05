// Thành viên gia đình — theo thiết kế chốt 05/11 (L6, docs/KE-HOACH-KHOP-THIET-KE-0511.md): bỏ mã mời gõ tay, bỏ vai Ba / Mẹ.
// Hai quyền (lib/quyen.ts): «Ba Mẹ» (làm được hết) / «Người trông giúp» (xem, duyệt, khoá máy). Mọi Ba Mẹ mời được người nhà.
// Mời bằng SĐT hoặc email ⇒ lời mời có link (token một lần, hạn 72 giờ, chỉ lưu băm). Người được mời:
//   • mở link ⇒ xem trước (không cần đăng nhập) ⇒ đăng ký bằng link (OTP như đăng ký thường) hoặc đăng nhập rồi «Vào nhà»;
//   • hoặc đăng ký / đăng nhập bằng đúng SĐT / email được mời ⇒ tự thấy lời mời (GET moi/cho-toi) ⇒ một lệnh «Vào nhà» (POST moi/nhan {id}).
// Tài khoản nhận lời mời phải còn TRỐNG (chưa Con, máy, người lớn khác) — chuyển sang nhà mời, nhà trống cũ bị xoá.
// Người tạo nhà (families.chu_id) không bị đổi quyền / mời ra. Mời ra = vai «roi» (giữ tên cho lịch sử «ai duyệt»), xoá mọi phiên.
import { randomInt } from "node:crypto";
import { newId, one, q, tx, type Q } from "./db.ts";
import { bamMatKhau, chuanDinhDanh, hienDinhDanh, TIEN_TO_FB, kiemOtp, sha, type BaMe } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { damBaoBang, ghiKiemToan } from "./admin.ts";
import { SCHEMA_TV_TB } from "./schema.ts";
import { chiBaMe, laChuNha, quyenTuVai, quyenVao, TEN_QUYEN, vaiCu, type Quyen } from "./quyen.ts";

export const LOI_MOI_GIO = 72;
export const MOI_CHO_TOI_DA = 5;
export const THANH_VIEN_TOI_DA = 8;
/** Quyền mời được (L6). Tên giữ «VAI_MOI» cho mã cũ đọc. */
export const VAI_MOI = ["ba_me", "trong_giup"] as const;
export type VaiMoi = Quyen;
/** Tên quyền hiển thị (hiểu cả giá trị cũ chu / duyet / xem trong sự kiện cũ). */
export const TEN_VAI: Record<string, string> = TEN_QUYEN;

let coBang = false;
export async function bangTvTb() {
  if (coBang) return;
  for (const c of SCHEMA_TV_TB) await q(c);
  coBang = true;
}


const CHU_MA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";          // bỏ I, L, O, 0, 1 cho dễ đọc
/** Token lời mời trong link: 16 ký tự (~79 bit) — không ai phải gõ nữa (L6), nên dài để không dò được. */
const taoMa = (n = 16) => Array.from({ length: n }, () => CHU_MA[randomInt(0, CHU_MA.length)]).join("");
/** «abcd-2345», «ABCD 2345», link …?ma=ABCD2345 ⇒ «ABCD2345». */
export const chuanMa = (v: unknown) => {
  const s = String(v ?? "").trim();
  const tuLink = /[?&]ma=([^&#\s]+)/.exec(s)?.[1];
  return decodeURIComponent(tuLink ?? s).toUpperCase().replace(/[^A-Z0-9]/g, "");
};
export const hienMa = (ma: string) => `${ma.slice(0, 4)}-${ma.slice(4)}`;
const lienKetMoi = (goc: string, ma: string) => `${goc.replace(/\/$/, "")}/moi?ma=${ma}`;

type DongTv = { id: string; ten: string; vai: string; dinh_danh: string; created_at: Date; la_chu: boolean };
type DongMoi = { id: string; vai: string; ten_goi: string; dinh_danh: string | null; het: Date; gui_luc: Date | null; created_at: Date; nguoi: string | null };

/** Danh sách người lớn (không gồm người đã rời) + lời mời đang chờ (còn hạn). Người tạo nhà đứng đầu. */
export async function dsThanhVien(fam: string) {
  await bangTvTb();
  const ds = await q<DongTv>(
    `select p.id, p.ten, p.vai, p.dinh_danh, p.created_at, coalesce(f.chu_id = p.id, p.vai = 'chu') as la_chu
       from parents p join families f on f.id = p.family_id where p.family_id = $1 and p.vai <> 'roi'
      order by coalesce(f.chu_id = p.id, p.vai = 'chu') desc, p.created_at`, [fam]);
  const loiMoi = await q<DongMoi>(
    `select id, vai, ten_goi, dinh_danh, het, gui_luc, created_at, nguoi from loi_moi
      where family_id = $1 and dung_luc is null and huy_luc is null and het > now() order by created_at desc`, [fam]);
  return { ds, loiMoi };
}

/** Dòng thành viên cho API: `quyen` (mới) + `vai` kiểu cũ (app bản trước) + `laChuNha`. */
export const tvRa = (x: DongTv, toi: string) => ({ id: x.id, ten: x.ten, quyen: quyenTuVai(x.vai) ?? "trong_giup", tenQuyen: TEN_QUYEN[quyenTuVai(x.vai) ?? "trong_giup"],
  vai: vaiCu({ vai: x.vai, la_chu: x.la_chu }), laChuNha: x.la_chu, dinh_danh: hienDinhDanh(x.dinh_danh), laFacebook: x.dinh_danh.startsWith(TIEN_TO_FB), laToi: x.id === toi });
export const moiRaApi = (x: DongMoi) => ({ id: x.id, quyen: quyenTuVai(x.vai) ?? "trong_giup", vai: quyenTuVai(x.vai) === "trong_giup" ? "xem" : "duyet",
  tenGoi: x.ten_goi, dinhDanh: x.dinh_danh, het: new Date(x.het).toISOString(), guiLuc: new Date(x.gui_luc ?? x.created_at).toISOString() });

async function ketQuaMoi(fam: string, nguoi: string, id: string, ma: string, quyen: Quyen, tenGoi: string, dinhDanh: string | null, het: Date, goc: string) {
  const lienKet = lienKetMoi(goc, ma);
  const ai = (await one<{ ten: string }>(`select ten from parents where id = $1`, [nguoi]))?.ten ?? "Ba Mẹ";
  const nha = (await one<{ ten: string }>(`select ten from families where id = $1`, [fam]))?.ten ?? "";
  return { id, ma, lienKet, quyen, vai: quyen === "trong_giup" ? "xem" : "duyet", tenGoi, dinhDanh, het: new Date(het).toISOString(),
    // câu soạn sẵn cho hàng chia sẻ (Zalo / Tin nhắn / Messenger / Sao chép) — app gắn vào share sheet, máy chủ chưa gửi SMS / email
    chiaSe: { tieuDe: `${ai} mời bạn vào ${nha || "nhà"} trên AiiGrow`, noiDung: `${ai} mời bạn cùng trông con trên AiiGrow. Bấm để vào nhà: ${lienKet}`, lienKet } };
}

/** Ba Mẹ mời người nhà bằng SĐT / email ({dinhDanh, quyen, tenGoi}). Không có dinhDanh (app bản cũ) ⇒ lời mời chỉ qua link.
 *  Đã có lời mời chờ cho đúng SĐT / email đó ⇒ huỷ cái cũ, tạo cái mới (link cũ hết hiệu lực). → token (chỉ trả MỘT lần) + link. */
export async function taoLoiMoi(bm: BaMe, b: { vai?: unknown; quyen?: unknown; tenGoi?: unknown; dinhDanh?: unknown }, goc: string) {
  chiBaMe(bm, "mời người nhà");
  await bangTvTb();
  const quyen = quyenVao(b.quyen ?? b.vai);
  const tenGoi = String(b.tenGoi ?? "").trim().slice(0, 30);
  let dinhDanh: string | null = null;
  if (b.dinhDanh !== undefined && b.dinhDanh !== null && String(b.dinhDanh).trim() !== "") {
    dinhDanh = chuanDinhDanh(b.dinhDanh);
    if (!dinhDanh) throw new LoiNghiepVu("dinh_danh_sai", "Nhập số điện thoại (10 số) hoặc email của người được mời");
    if (await one(`select 1 from parents where family_id = $1 and dinh_danh = $2 and vai <> 'roi'`, [bm.family_id, dinhDanh]))
      throw new LoiNghiepVu("da_trong_nha", "Người này đã ở trong nhà rồi", 409);
  }
  const { ds, loiMoi } = await dsThanhVien(bm.family_id);
  if (ds.length >= THANH_VIEN_TOI_DA) throw new LoiNghiepVu("du_thanh_vien", `Gia đình đã đủ ${THANH_VIEN_TOI_DA} người lớn`, 409);
  // lời mời chờ cho đúng định danh này sẽ được thay ⇒ không tính vào trần; huỷ nó CHỈ sau khi qua mọi kiểm tra
  if (loiMoi.filter((x) => !dinhDanh || x.dinh_danh !== dinhDanh).length >= MOI_CHO_TOI_DA)
    throw new LoiNghiepVu("qua_nhieu_loi_moi", `Đang có ${MOI_CHO_TOI_DA} lời mời chờ — huỷ bớt rồi mời tiếp`, 409);
  if (dinhDanh) await q(`update loi_moi set huy_luc = now() where family_id = $1 and dinh_danh = $2 and dung_luc is null and huy_luc is null`, [bm.family_id, dinhDanh]);
  for (let i = 0; i < 10; i++) {
    const ma = taoMa(), id = newId();
    const r = await q<{ het: Date }>(`insert into loi_moi(id, family_id, ma_hash, vai, ten_goi, nguoi, het, dinh_danh, gui_luc)
                       values ($1,$2,$3,$4,$5,$6, now() + make_interval(hours => $7), $8, now())
                       on conflict (ma_hash) do nothing returning het`, [id, bm.family_id, sha(ma), quyen, tenGoi, bm.id, LOI_MOI_GIO, dinhDanh]);
    if (r.length) {
      await ghiSuKien(bm.family_id, "moi_thanh_vien", { vai: quyen, ten_goi: tenGoi, co_dinh_danh: !!dinhDanh }, { nguoi: bm.id });
      return ketQuaMoi(bm.family_id, bm.id, id, ma, quyen, tenGoi, dinhDanh, r[0].het, goc);
    }
  }
  throw new Error("Không tạo được lời mời");
}

/** «Gửi lại»: lời mời còn chờ (kể cả đã quá hạn) ⇒ link MỚI (link cũ hết hiệu lực — máy chủ chỉ giữ băm) + hạn thêm 72 giờ. */
export async function guiLaiLoiMoi(bm: BaMe, id: string, goc: string) {
  chiBaMe(bm, "mời người nhà");
  await bangTvTb();
  // gửi lại lời mời đã quá hạn = thêm một lời mời sống ⇒ vẫn theo trần lời mời chờ
  const { loiMoi } = await dsThanhVien(bm.family_id);
  if (!loiMoi.some((x) => x.id === id) && loiMoi.length >= MOI_CHO_TOI_DA)
    throw new LoiNghiepVu("qua_nhieu_loi_moi", `Đang có ${MOI_CHO_TOI_DA} lời mời chờ — huỷ bớt rồi gửi lại`, 409);
  for (let i = 0; i < 10; i++) {
    const ma = taoMa();
    try {
      const r = await q<{ vai: string; ten_goi: string; dinh_danh: string | null; het: Date }>(
        `update loi_moi set ma_hash = $3, het = now() + make_interval(hours => $4), gui_luc = now()
          where id = $1 and family_id = $2 and dung_luc is null and huy_luc is null returning vai, ten_goi, dinh_danh, het`,
        [id, bm.family_id, sha(ma), LOI_MOI_GIO]);
      if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy lời mời này (có thể đã được nhận hoặc đã huỷ)", 404);
      await ghiSuKien(bm.family_id, "gui_lai_loi_moi", { ten_goi: r[0].ten_goi }, { nguoi: bm.id });
      return ketQuaMoi(bm.family_id, bm.id, id, ma, quyenTuVai(r[0].vai) ?? "trong_giup", r[0].ten_goi, r[0].dinh_danh, r[0].het, goc);
    } catch (e) {
      if (e instanceof LoiNghiepVu) throw e;
      if (i === 9) throw e;                                    // trùng băm (không thực tế) ⇒ thử token khác
    }
  }
  throw new Error("Không gửi lại được lời mời");
}

export async function huyLoiMoi(bm: BaMe, id: string) {
  chiBaMe(bm, "huỷ lời mời");
  await bangTvTb();
  const r = await q(`update loi_moi set huy_luc = now() where id = $1 and family_id = $2 and dung_luc is null and huy_luc is null returning id`, [id, bm.family_id]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy lời mời này (có thể đã dùng hoặc đã huỷ)", 404);
  await ghiSuKien(bm.family_id, "huy_loi_moi", {}, { nguoi: bm.id });
}

type LoiMoi = { id: string; family_id: string; vai: string; ten_goi: string; nguoi: string | null; het: Date; dung_luc: Date | null; huy_luc: Date | null;
  dinh_danh: string | null };

function kiemLoiMoi(m: LoiMoi | undefined): asserts m is LoiMoi {
  if (!m || m.huy_luc) throw new LoiNghiepVu("ma_moi_sai", "Lời mời không còn — nhờ người mời gửi lại", 404);
  if (m.dung_luc) throw new LoiNghiepVu("ma_moi_da_dung", "Lời mời này đã được nhận — nhờ người mời gửi lời mời mới", 409);
  if (new Date(m.het) < new Date()) throw new LoiNghiepVu("ma_moi_het_han", `Lời mời đã quá ${LOI_MOI_GIO} giờ — nhờ người mời bấm «Gửi lại»`, 410);
}

/** Tên các Con của nhà (màn «Cùng trông Bảo Anh và Bảo Minh»). */
const tenCacCon = async (fam: string) => (await q<{ ten: string }>(`select ten from children where family_id = $1 order by created_at`, [fam])).map((x) => x.ten);

/** Xem trước lời mời qua link (không cần đăng nhập): nhà nào, ai mời, quyền gì, trông Con nào. */
export async function xemLoiMoi(maVao: unknown) {
  await bangTvTb();
  const m = await one<LoiMoi & { ten_gia_dinh: string; ten_nguoi_moi: string | null }>(
    `select l.*, f.ten as ten_gia_dinh, p.ten as ten_nguoi_moi from loi_moi l join families f on f.id = l.family_id
     left join parents p on p.id = l.nguoi where l.ma_hash = $1`, [sha(chuanMa(maVao))]);
  kiemLoiMoi(m);
  const quyen = quyenTuVai(m.vai) ?? "trong_giup";
  return { tenGiaDinh: m.ten_gia_dinh, nguoiMoi: m.ten_nguoi_moi, quyen, tenQuyen: TEN_QUYEN[quyen], vai: quyen === "trong_giup" ? "xem" : "duyet",
    tenVai: TEN_QUYEN[quyen], tenGoi: m.ten_goi, tenCon: await tenCacCon(m.family_id), het: new Date(m.het).toISOString() };
}

/** Tài khoản TẠO bằng Facebook (định danh `fb:<id>` — email Facebook không chắc đã xác minh nên không dùng làm định danh, dang-nhap-mxh.ts)
 *  ⇒ không có SĐT / email để khớp lời mời theo định danh, chỉ nhận qua link mời (token `ma`). Tài khoản SĐT / email chỉ GẮN thêm Facebook
 *  (lien-ket/facebook) vẫn khớp theo định danh của chính nó. Google chỉ cho vào khi `email_verified` nên khớp được. */
export async function emailChuaXacMinh(t: Q, parentId: string) {
  // hoặc còn dòng Facebook TẠO tài khoản (không phải gắn thêm) — tài khoản bản cũ tạo lúc deploy, chưa qua chuyenFbCu
  return (await t(`select 1 from parents p where p.id = $1 and (p.dinh_danh like 'fb:%'
    or exists (select 1 from ba_me_mxh m where m.parent_id = p.id and m.nguon = 'facebook' and not m.lien_ket))`, [parentId])).length > 0;
}

/** Lời mời đang chờ gửi tới đúng SĐT / email của người đang đăng nhập (đăng ký / đăng nhập xong là thấy — L6). */
export async function loiMoiChoToi(bm: BaMe) {
  await bangTvTb();
  if (await emailChuaXacMinh(q, bm.id)) return [];
  const ds = await q<LoiMoi & { ten_gia_dinh: string; ten_nguoi_moi: string | null }>(
    `select l.*, f.ten as ten_gia_dinh, p.ten as ten_nguoi_moi from loi_moi l join families f on f.id = l.family_id
       left join parents p on p.id = l.nguoi
      where l.dinh_danh = $1 and l.family_id <> $2 and l.dung_luc is null and l.huy_luc is null and l.het > now() order by l.created_at desc`,
    [bm.dinh_danh, bm.family_id]);
  return Promise.all(ds.map(async (m) => {
    const quyen = quyenTuVai(m.vai) ?? "trong_giup";
    return { id: m.id, tenGiaDinh: m.ten_gia_dinh, nguoiMoi: m.ten_nguoi_moi, quyen, tenQuyen: TEN_QUYEN[quyen], tenGoi: m.ten_goi,
      tenCon: await tenCacCon(m.family_id), het: new Date(m.het).toISOString() };
  }));
}

/** Người được mời tạo tài khoản bằng link mời: OTP đúng ⇒ người lớn mới thuộc nhà mời với quyền đã chọn. → id Ba Mẹ. */
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
      throw new LoiNghiepVu("da_co_tai_khoan", "Số/email này đã có tài khoản — đăng nhập rồi bấm «Vào nhà»", 409);
    // Kiểm trần NGAY LÚC NHẬN (trong tx): nhiều lời mời chờ có thể cùng được nhận, đừng để vượt THANH_VIEN_TOI_DA.
    if ((await t(`select 1 from parents where family_id = $1 and vai <> 'roi'`, [m.family_id])).length >= THANH_VIEN_TOI_DA)
      throw new LoiNghiepVu("du_thanh_vien", `Gia đình đã đủ ${THANH_VIEN_TOI_DA} người lớn`, 409);
    const id = newId(), quyen = quyenTuVai(m.vai) ?? "trong_giup";
    await t(`insert into parents(id, family_id, dinh_danh, ten, vai, pass_hash) values ($1,$2,$3,$4,$5,$6)`, [id, m.family_id, d, ten, quyen, bam]);
    await t(`update loi_moi set dung_luc = now(), dung_boi = $2 where id = $1`, [m.id, id]);
    await ghiSuKien(m.family_id, "thanh_vien_vao", { ten, vai: quyen }, { nguoi: id }, t);
    return id;
  });
  if (!kq) throw new LoiNghiepVu("otp_sai", "Mã chưa đúng");
  return kq;
}

/** «Vào nhà»: người đang đăng nhập nhận lời mời — bằng `id` (lời mời gửi tới đúng SĐT / email của mình) hoặc `ma` (token trong link).
 *  Chỉ khi nhà hiện tại còn TRỐNG (chưa Con, máy, người lớn khác) — chuyển sang nhà mời, nhà trống bị xoá. */
export async function nhanLoiMoi(bm: BaMe, vao: unknown) {
  await bangTvTb(); await damBaoBang();     // bảng audit có trước giao dịch (PGlite: không DDL trong tx)
  const b = (vao && typeof vao === "object" ? vao : { ma: vao }) as { ma?: unknown; id?: unknown };
  const theoId = b.id !== undefined && b.id !== null && String(b.id) !== "";
  return tx(async (t) => {
    if (theoId && await emailChuaXacMinh(t, bm.id))
      throw new LoiNghiepVu("can_link_moi", "Tài khoản Facebook nhận lời mời bằng link mời — nhờ người mời gửi link nhé", 403);
    const m = theoId
      ? (await t<LoiMoi>(`select * from loi_moi where id = $1 and dinh_danh = $2 for update`, [String(b.id), bm.dinh_danh]))[0]
      : (await t<LoiMoi>(`select * from loi_moi where ma_hash = $1 for update`, [sha(chuanMa(b.ma))]))[0];
    kiemLoiMoi(m);
    if (m.family_id === bm.family_id) throw new LoiNghiepVu("da_trong_gia_dinh", "Bạn đã ở trong nhà này rồi", 409);
    // PGlite một kết nối: trong giao dịch chạy lần lượt, không Promise.all
    const con = await t(`select 1 from children where family_id = $1 limit 1`, [bm.family_id]);
    const may = await t(`select 1 from devices where family_id = $1 limit 1`, [bm.family_id]);
    const nguoi = await t(`select 1 from parents where family_id = $1 and id <> $2 and vai <> 'roi' limit 1`, [bm.family_id, bm.id]);
    if (con.length || may.length || nguoi.length)
      throw new LoiNghiepVu("gia_dinh_co_du_lieu", "Tài khoản này đã có Con, máy hoặc người nhà — dùng số/email khác để nhận lời mời", 409);
    if ((await t(`select 1 from parents where family_id = $1 and vai <> 'roi'`, [m.family_id])).length >= THANH_VIEN_TOI_DA)
      throw new LoiNghiepVu("du_thanh_vien", `Gia đình đã đủ ${THANH_VIEN_TOI_DA} người lớn`, 409);
    const cu = bm.family_id, quyen = quyenTuVai(m.vai) ?? "trong_giup";
    await t(`update parents set family_id = $2, vai = $3 where id = $1`, [bm.id, m.family_id, quyen]);
    await t(`update loi_moi set dung_luc = now(), dung_boi = $2 where id = $1`, [m.id, bm.id]);
    const bo = await t(`delete from families where id = $1 and not exists (select 1 from parents where family_id = $1) returning id`, [cu]);
    // mốc tính 90 ngày dọn audit của gia đình cũ (lib/xoa-tai-khoan.ts › donKiemToanGiaDinhDaXoa)
    if (bo.length) await ghiKiemToan(null, "xoa_gia_dinh", { soCon: 0, qua: "nhan_loi_moi" }, cu, t);
    await ghiSuKien(m.family_id, "thanh_vien_vao", { ten: bm.ten, vai: quyen }, { nguoi: bm.id }, t);
    return { quyen, vai: quyen === "trong_giup" ? "xem" : "duyet" };
  });
}

/** Người khác trong nhà mà `bm` được đổi quyền / mời ra: Ba Mẹ mới làm; không tự đổi mình; không đụng người tạo nhà. */
async function thanhVienKhac(bm: BaMe, id: string) {
  chiBaMe(bm, "đổi quyền người nhà");
  if (id === bm.id) throw new LoiNghiepVu("khong_tu_doi", "Không tự đổi quyền hay tự mời mình ra — dùng «Rời nhà»", 409);
  const p = await one<{ id: string; ten: string; vai: string; la_chu: boolean }>(
    `select p.id, p.ten, p.vai, coalesce(f.chu_id = p.id, p.vai = 'chu') as la_chu from parents p join families f on f.id = p.family_id
      where p.id = $1 and p.family_id = $2 and p.vai <> 'roi'`, [id, bm.family_id]);
  if (!p) throw new LoiNghiepVu("khong_thay", "Không thấy thành viên này", 404);
  if (p.la_chu) throw new LoiNghiepVu("khong_doi_chu", "Người tạo nhà luôn là Ba Mẹ — không đổi quyền hay mời ra được", 409);
  return p;
}

export async function doiQuyen(bm: BaMe, id: string, quyenVaoV: unknown) {
  const p = await thanhVienKhac(bm, id);
  const quyen = quyenVao(quyenVaoV);
  await q(`update parents set vai = $2 where id = $1`, [id, quyen]);
  await ghiSuKien(bm.family_id, "doi_vai", { ten: p.ten, tu: quyenTuVai(p.vai), thanh: quyen }, { nguoi: bm.id });
  return { quyen, vai: quyen === "trong_giup" ? "xem" : "duyet" };
}
/** Tên cũ (POST thanh-vien/:id/vai). */
export const doiVai = doiQuyen;

export async function moiRa(bm: BaMe, id: string) {
  const p = await thanhVienKhac(bm, id);
  await tx(async (t) => {
    await t(`update parents set vai = 'roi', dinh_danh = dinh_danh || '#roi:' || id, pass_hash = null where id = $1`, [id]);
    await t(`delete from sessions where parent_id = $1`, [id]);
    await t(`delete from ba_me_mxh where parent_id = $1`, [id]);     // vào lại bằng Google / Facebook không quay về nhà vừa mời ra
    await ghiSuKien(bm.family_id, "moi_ra", { ten: p.ten }, { nguoi: bm.id }, t);
  });
}

/** «Rời nhà?» (màn Tài khoản): người lớn KHÔNG phải người tạo nhà rời khỏi nhà, giữ tài khoản — sang một nhà trống mới của riêng mình
 *  (làm Ba Mẹ của nhà đó; nhận lời mời khác được ngay). Người tạo nhà muốn bỏ thì xoá tài khoản (lib/xoa-tai-khoan.ts). */
export async function roiNha(bm: BaMe) {
  if (laChuNha(bm)) throw new LoiNghiepVu("chu_khong_roi", "Bạn là người tạo nhà — muốn bỏ thì xoá tài khoản (Tài khoản › Xoá tài khoản)", 409);
  return tx(async (t) => {
    const fam = newId();
    await t(`insert into families(id, ten, chu_id) values ($1, $2, $3)`, [fam, `Nhà ${bm.ten}`, bm.id]);
    const r = await t(`update parents set family_id = $2, vai = 'ba_me' where id = $1 and family_id = $3 and vai <> 'roi' returning id`, [bm.id, fam, bm.family_id]);
    if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy tài khoản trong nhà này", 404);
    await ghiSuKien(bm.family_id, "roi_nha", { ten: bm.ten }, { nguoi: bm.id }, t);
    return { ok: true };
  });
}
