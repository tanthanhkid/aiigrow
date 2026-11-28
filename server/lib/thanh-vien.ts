// Thành viên gia đình — theo thiết kế chốt 05/11 (L6, docs/KE-HOACH-KHOP-THIET-KE-0511.md): bỏ mã mời gõ tay, bỏ vai Ba / Mẹ.
// Hai quyền (lib/quyen.ts): «Ba Mẹ» (làm được hết) / «Người trông giúp» (xem, duyệt, khoá máy). Mọi Ba Mẹ mời được người nhà.
// Mời bằng SĐT hoặc email ⇒ lời mời có link (token một lần, hạn 72 giờ, chỉ lưu băm). Người được mời:
//   • mở link ⇒ xem trước (không cần đăng nhập) ⇒ đăng ký bằng link (OTP như đăng ký thường) hoặc đăng nhập rồi «Vào nhà»;
//   • hoặc đăng ký / đăng nhập bằng đúng SĐT / email được mời ⇒ tự thấy lời mời (GET moi/cho-toi) ⇒ một lệnh «Vào nhà» (POST moi/nhan {id}).
// Tài khoản đã có nhà vẫn nhận được lời mời (#877): mang Con + máy + dữ liệu theo / bỏ nhà cũ / chỉ rời nếu nhà cũ còn người lớn khác (nhanLoiMoi).
// Người tạo nhà (families.chu_id) không bị đổi quyền / mời ra. Mời ra = vai «roi» (giữ tên cho lịch sử «ai duyệt»), xoá mọi phiên.
import { randomInt } from "node:crypto";
import { newId, one, q, tx, type Q } from "./db.ts";
import { bamMatKhau, chuanDinhDanh, hienDinhDanh, TIEN_TO_FB, kiemOtp, sha, type BaMe } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { goKhoaTaiKhoan } from "./gioi-han-dang-nhap.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { damBaoBang, ghiKiemToan } from "./admin.ts";
import { SCHEMA_TV_TB } from "./schema.ts";
import { baoThayDoi } from "./cho-thay-doi.ts";
import { xoaGiaDinhTrongTx } from "./xoa-gia-dinh.ts";
import { bangLog } from "./log-may.ts";
import { bangMang } from "./dns-gia-dinh.ts";
import { bangM4b } from "./tuan-thu.ts";
import { guiPushChoBaMe } from "./push.ts";
import { chiBaMe, laChuNha, quyenTuVai, quyenVao, TEN_QUYEN, vaiCu, type Quyen } from "./quyen.ts";

export const LOI_MOI_GIO = 72;
const MOI_CHO_TOI_DA = 5;
const THANH_VIEN_TOI_DA = 8;
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
const chuanMa = (v: unknown) => {
  const s = String(v ?? "").trim();
  const tuLink = /[?&]ma=([^&#\s]+)/.exec(s)?.[1];
  return decodeURIComponent(tuLink ?? s).toUpperCase().replace(/[^A-Z0-9]/g, "");
};
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
  vai: vaiCu({ vai: x.vai, la_chu: x.la_chu }), laChuNha: x.la_chu, dinh_danh: hienDinhDanh(x.dinh_danh), laFacebook: x.dinh_danh.startsWith(TIEN_TO_FB), laToi: x.id === toi,
  /** «Vào nhà từ 20/10» (thiết kế 14/11 bm-ca-nha/01, 06) — lúc tài khoản được tạo trong nhà. */ vaoLuc: x.created_at });
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

/** #876: lời mời gửi tới SĐT / email đã có tài khoản (nhà khác) ⇒ đẩy push «<Người mời> mời bạn vào nhà <tên nhà>»; bấm push ⇒ /moi/vao.
 *  Tài khoản Facebook-only không khớp định danh (chỉ qua link). Không có token / lỗi push ⇒ im lặng (người được mời vẫn thấy banner khi mở app). */
async function baoLoiMoiQuaPush(fam: string, nguoi: string, dinhDanh: string | null) {
  if (!dinhDanh) return 0;
  const nhan = await q<{ id: string }>(`select id from parents where dinh_danh = $1 and vai <> 'roi' and family_id <> $2`, [dinhDanh, fam]);
  const ai = (await one<{ ten: string }>(`select ten from parents where id = $1`, [nguoi]))?.ten ?? "Người nhà";
  const nha = (await one<{ ten: string }>(`select ten from families where id = $1`, [fam]))?.ten ?? "";
  let n = 0;
  const { caiDatTb, quyetDinhDay } = await import("./thong-bao.ts");     // nạp lười: thong-bao.ts nạp thanh-vien.ts
  for (const x of nhan) {
    if (await emailChuaXacMinh(q, x.id)) continue;
    // theo thiết lập của người nhận: tắt nhóm «Thành viên gia đình» hoặc đang giờ yên lặng ⇒ không đẩy (banner + dòng thông báo vẫn có)
    const nhaNhan = (await one<{ tz: string }>(`select f.tz from parents p join families f on f.id = p.family_id where p.id = $1`, [x.id]))?.tz ?? "Asia/Ho_Chi_Minh";
    if (!quyetDinhDay("chu_y", "gia_dinh", new Date(), await caiDatTb(x.id), nhaNhan).day) continue;
    n += await guiPushChoBaMe(x.id, { title: "Lời mời vào nhà", body: `${ai} mời bạn vào ${nha || "nhà"} trên AiiGrow`, data: { den: "/moi/vao", loai: "loi_moi" }, channelId: "gia_dinh" });
  }
  return n;
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
      void baoLoiMoiQuaPush(bm.family_id, bm.id, dinhDanh).catch(() => 0);   // không chặn lời mời khi APNs / FCM chậm
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
      void baoLoiMoiQuaPush(bm.family_id, bm.id, r[0].dinh_danh).catch(() => 0);
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
  const ds = await q<LoiMoi & { ten_gia_dinh: string; ten_nguoi_moi: string | null; gui_luc: Date | null; created_at: Date }>(
    `select l.*, f.ten as ten_gia_dinh, p.ten as ten_nguoi_moi from loi_moi l join families f on f.id = l.family_id
       left join parents p on p.id = l.nguoi
      where l.dinh_danh = $1 and l.family_id <> $2 and l.dung_luc is null and l.huy_luc is null and l.het > now() order by l.created_at desc`,
    [bm.dinh_danh, bm.family_id]);
  return Promise.all(ds.map(async (m) => {
    const quyen = quyenTuVai(m.vai) ?? "trong_giup";
    return { id: m.id, tenGiaDinh: m.ten_gia_dinh, nguoiMoi: m.ten_nguoi_moi, quyen, tenQuyen: TEN_QUYEN[quyen], tenGoi: m.ten_goi,
      tenCon: await tenCacCon(m.family_id), het: new Date(m.het).toISOString(), moiLuc: new Date(m.gui_luc ?? m.created_at).toISOString() };
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

/** Bảng có cột family_id mà «Mang các bé theo» phải chuyển sang nhà mời (#877). Mọi bảng có family_id (grep schema.ts) PHẢI nằm ở đây, hoặc
 *  trong BANG_KHONG_CHUYEN kèm lý do — thanh-vien-nhan-moi-877.test.ts đối chiếu với information_schema nên thêm bảng mới mà quên sẽ đỏ.
 *  Bảng con của Con (usage, points, badges, grants, submissions, kid_sessions…) chỉ khoá theo child_id / device_id ⇒ đi theo Con / máy, không cần đổi. */
export const BANG_CHUYEN_NHA = ["children", "devices", "device_children", "tasks", "rewards", "vouchers", "quy_gd", "app_theo_ten",
  "pair_codes", "exceptions", "events", "messages", "ho_tro", "may_log", "lenh_may", "goi_cai", "tuan_thu_may", "dns_thiet_bi"] as const;
/** Không chuyển: parents (chỉ người nhận chuyển, người khác không còn — trừ dòng «roi» chỉ để lịch sử), loi_moi (lời mời nhà cũ gửi đi, theo nhà cũ bị xoá),
 *  alerts (chuyển có lọc trùng khoá, bên dưới), dns_gia_dinh (khoá chính = family_id: giữ của nhà mời, nhà mời chưa có thì chuyển, bên dưới),
 *  app_rules (luật «cả gia đình» child_id = '' đổi thành luật riêng từng bé của nhà cũ — không áp lên bé nhà mời; luật theo bé chuyển, bên dưới),
 *  audit (nhật ký kiểm toán ở lại id nhà cũ: người nhà mời không thấy, dọn sau 90 ngày kể từ mốc xoa_gia_dinh). */
export const BANG_KHONG_CHUYEN = ["parents", "loi_moi", "alerts", "dns_gia_dinh", "app_rules", "audit"] as const;

export type NhaCu = { soBe: number; soMay: number; soNguoiLon: number; laNguoiLonDuyNhat: boolean; laChu: boolean; tenBe: string[]; tenNha: string };

async function nhaCuTrongTx(t: Q, bm: { id: string; family_id: string; vai: string }): Promise<NhaCu> {
  const be = await t<{ ten: string }>(`select ten from children where family_id = $1 order by created_at`, [bm.family_id]);
  // máy = máy có agent (devices) + thiết bị DNS chưa gắn agent (như xoa-tai-khoan.ts › kiemChan)
  const may = await t<{ n: number }>(`select (select count(*) from devices where family_id = $1) + (select count(*) from dns_thiet_bi where family_id = $1 and device_id is null) as n`, [bm.family_id]);
  const nl = await t<{ n: number }>(`select count(*)::int as n from parents where family_id = $1 and vai <> 'roi'`, [bm.family_id]);
  const f = await t<{ ten: string; la_chu: boolean }>(`select f.ten, coalesce(f.chu_id = $2, $3) as la_chu from families f where f.id = $1`, [bm.family_id, bm.id, bm.vai === "chu"]);
  return { soBe: be.length, soMay: Number(may[0].n), soNguoiLon: nl[0].n, laNguoiLonDuyNhat: nl[0].n <= 1, laChu: !!f[0]?.la_chu, tenBe: be.map((x) => x.ten), tenNha: f[0]?.ten ?? "" };
}

/** GET moi/nha-cu — «Nhà của bạn đang có N bé, M máy, K người lớn» cho bước xác nhận ở /moi/vao. */
export const tomTatNhaCu = (bm: BaMe) => bangMang().then(() => nhaCuTrongTx(q, bm));

/** Chuyển Con + máy + MỌI dữ liệu của nhà cũ sang nhà mời (cùng giao dịch). Khoá ngoại theo child_id / device_id không đổi ⇒ token máy Con vẫn đúng. */
async function mangTheoSangNha(t: Q, cu: string, moi: string) {
  // đóng an toàn: có bảng family_id mới mà chưa khai báo ⇒ dừng, không để cascade xoá mất dữ liệu của bé
  const biet = new Set<string>([...BANG_CHUYEN_NHA, ...BANG_KHONG_CHUYEN, "families"]);
  const la = (await t<{ table_name: string }>(`select table_name from information_schema.columns where column_name = 'family_id' and table_schema = current_schema()`))
    .map((x) => x.table_name).filter((x) => !biet.has(x));
  if (la.length) throw new LoiNghiepVu("bang_chua_khai_bao", `Bảng ${la.join(", ")} chưa khai báo cách chuyển nhà — báo AiiGrow`, 500);
  // app_rules: luật cả nhà cũ (child_id '') ⇒ luật riêng từng bé của nhà cũ (chạy TRƯỚC khi chuyển Con); luật theo bé chuyển nguyên
  await t(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom, het)
           select $2, c.id, r.muc, r.ten, r.loai, r.nhom, r.het from app_rules r join children c on c.family_id = r.family_id
            where r.family_id = $1 and r.child_id = '' on conflict do nothing`, [cu, moi]);
  await t(`delete from app_rules where family_id = $1 and child_id = ''`, [cu]);
  await t(`update app_rules set family_id = $2 where family_id = $1`, [cu, moi]);
  for (const b of BANG_CHUYEN_NHA) await t(`update ${b} set family_id = $2 where family_id = $1`, [cu, moi]);
  // alerts: khoá duy nhất (family_id, khoa) — dòng trùng khoá với nhà mời ở lại nhà cũ và bị xoá theo
  await t(`update alerts set family_id = $2 where family_id = $1 and (khoa is null or khoa not in (select khoa from alerts where family_id = $2 and khoa is not null))`, [cu, moi]);
  // dns_gia_dinh: khoá chính family_id — nhà mời chưa đặt gì thì lấy của nhà cũ
  await t(`update dns_gia_dinh set family_id = $2 where family_id = $1 and not exists (select 1 from dns_gia_dinh where family_id = $2)`, [cu, moi]);
}

/** «Vào nhà»: người đang đăng nhập nhận lời mời — bằng `id` (lời mời gửi tới đúng SĐT / email của mình) hoặc `ma` (token trong link).
 *  #877: không còn chặn tài khoản đã có nhà. Nhà hiện tại:
 *   • còn người lớn khác ⇒ chỉ mình rời (Con / máy ở lại; mình là người tạo nhà ⇒ chuyển chủ cho Ba Mẹ còn lại);
 *   • mình là người lớn duy nhất, có Con / máy ⇒ `huong`: «mang_theo» (Con + máy + dữ liệu sang nhà mời) | «bo_nha_cu» (xoá nhà cũ, như xoá gia đình;
 *     còn máy đã ghép thì phải gỡ máy trước); thiếu `huong` ⇒ 409 `can_chon_nha_cu`;
 *   • nhà trống ⇒ xoá nhà trống như trước. */
export async function nhanLoiMoi(bm: BaMe, vao: unknown) {
  await bangTvTb(); await damBaoBang(); await bangLog(); await bangMang(); await bangM4b();     // bảng tạo lười có trước giao dịch (PGlite: không DDL trong tx)
  const b = (vao && typeof vao === "object" ? vao : { ma: vao }) as { ma?: unknown; id?: unknown; huong?: unknown };
  const theoId = b.id !== undefined && b.id !== null && String(b.id) !== "";
  const huong = b.huong === undefined || b.huong === null || b.huong === "" ? null : String(b.huong);
  if (huong !== null && huong !== "mang_theo" && huong !== "bo_nha_cu") throw new LoiNghiepVu("huong_sai", "Chọn «Mang các bé theo» hoặc «Bỏ nhà cũ»", 400);
  const kq = await tx(async (t) => {
    if (theoId && await emailChuaXacMinh(t, bm.id))
      throw new LoiNghiepVu("can_link_moi", "Tài khoản Facebook nhận lời mời bằng link mời — nhờ người mời gửi link nhé", 403);
    const m = theoId
      ? (await t<LoiMoi>(`select * from loi_moi where id = $1 and dinh_danh = $2 for update`, [String(b.id), bm.dinh_danh]))[0]
      : (await t<LoiMoi>(`select * from loi_moi where ma_hash = $1 for update`, [sha(chuanMa(b.ma))]))[0];
    kiemLoiMoi(m);
    const quyen = quyenTuVai(m.vai) ?? "trong_giup";
    // đọc lại nhà hiện tại của mình trong giao dịch (khoá dòng): hai yêu cầu nhận cùng lúc không cùng dùng family_id cũ đã đổi
    const toi = (await t<{ family_id: string; vai: string }>(`select family_id, vai from parents where id = $1 and vai <> 'roi' for update`, [bm.id]))[0];
    if (!toi) throw new LoiNghiepVu("khong_thay", "Không thấy tài khoản", 404);
    const cu = toi.family_id;
    if (m.family_id === cu) throw new LoiNghiepVu("da_trong_gia_dinh", "Bạn đã ở trong nhà này rồi", 409);
    // khoá cả hai dòng gia đình theo thứ tự id ⇒ hai bên nhận lời mời của nhau cùng lúc không kẹt khoá
    await t(`select id from families where id = any($1::text[]) order by id for update`, [[cu, m.family_id]]);
    const nha = await nhaCuTrongTx(t, { id: bm.id, family_id: cu, vai: toi.vai });
    // trần thành viên nhà mời: tính cả người mang theo (người lớn duy nhất của nhà cũ = chính mình; nhà cũ còn người khác thì chỉ mình sang)
    if ((await t(`select 1 from parents where family_id = $1 and vai <> 'roi'`, [m.family_id])).length >= THANH_VIEN_TOI_DA)
      throw new LoiNghiepVu("du_thanh_vien", `Gia đình đã đủ ${THANH_VIEN_TOI_DA} người lớn`, 409);
    const coDuLieu = nha.soBe > 0 || nha.soMay > 0;
    let xuLy: "roi" | "mang_theo" | "bo" | "trong";
    if (!nha.laNguoiLonDuyNhat) xuLy = "roi";
    else if (!coDuLieu) xuLy = "trong";
    else if (huong === null) throw new LoiNghiepVu("can_chon_nha_cu", `Nhà của bạn đang có ${nha.soBe} bé, ${nha.soMay} máy — chọn mang các bé theo hay bỏ nhà cũ`, 409);
    else xuLy = huong === "mang_theo" ? "mang_theo" : "bo";
    // người mời chỉ cho quyền «Chỉ trông con» ⇒ không mang Con sang nhà họ (mất quyền quản lý chính các bé của mình)
    if (xuLy === "mang_theo" && quyen === "trong_giup")
      throw new LoiNghiepVu("mang_theo_can_ba_me", "Lời mời chỉ có quyền «Chỉ trông con» nên không mang các bé theo được — nhờ người mời gửi lại quyền «Như Ba Mẹ»", 409);
    if (xuLy === "bo" && nha.soMay > 0)
      throw new LoiNghiepVu("con_may", `Nhà cũ còn ${nha.soMay} máy đã ghép — gỡ từng máy trước (mở máy › Gỡ máy này), hoặc chọn «Mang các bé theo»`, 409);
    let chuMoi: string | null = null;
    if (xuLy === "roi" && nha.laChu) {
      // người tạo nhà rời đi ⇒ chuyển chủ cho Ba Mẹ còn lại (chỉ còn người trông giúp ⇒ chặn, không tự nâng quyền)
      const ke = (await t<{ id: string }>(`select id from parents where family_id = $1 and id <> $2 and vai in ('ba_me', 'chu', 'duyet')
          order by created_at limit 1 for update`, [cu, bm.id]))[0] as { id: string } | undefined;
      if (!ke) throw new LoiNghiepVu("can_ba_me_giu_nha", "Nhà cũ chỉ còn người trông giúp — nâng một người lên «Như Ba Mẹ» (Cả nhà › Thành viên) trước khi sang nhà khác", 409);
      chuMoi = ke.id;
      await t(`update families set chu_id = $2 where id = $1`, [cu, ke.id]);
      await t(`update parents set vai = 'ba_me' where id = $1 and vai <> 'ba_me'`, [ke.id]);
    }
    await t(`update parents set family_id = $2, vai = $3 where id = $1`, [bm.id, m.family_id, quyen]);
    await t(`update loi_moi set dung_luc = now(), dung_boi = $2 where id = $1`, [m.id, bm.id]);
    if (xuLy === "mang_theo") {
      await mangTheoSangNha(t, cu, m.family_id);
      // nhà cũ chỉ còn dòng «roi» / lời mời đã gửi / báo trùng khoá ⇒ xoá, audit giữ mốc 90 ngày
      await t(`delete from families where id = $1`, [cu]);
      await ghiKiemToan(null, "xoa_gia_dinh", { soCon: nha.soBe, qua: "nhan_loi_moi", mangTheo: true }, cu, t);
    } else if (xuLy === "bo") {
      await xoaGiaDinhTrongTx(t, cu, { qua: "nhan_loi_moi", boNhaCu: true });
    } else if (xuLy === "trong") {
      await xoaGiaDinhTrongTx(t, cu, { qua: "nhan_loi_moi" });
    }
    if (xuLy === "roi") await ghiSuKien(cu, "roi_nha", { ten: bm.ten, qua: "nhan_loi_moi", chuMoi }, { nguoi: bm.id }, t);
    await ghiSuKien(m.family_id, "thanh_vien_vao", { ten: bm.ten, vai: quyen, ...(xuLy === "mang_theo" ? { mangTheo: { soBe: nha.soBe, soMay: nha.soMay } } : {}) }, { nguoi: bm.id }, t);
    return { quyen, vai: quyen === "trong_giup" ? "xem" : "duyet", xuLy, moi: m.family_id, cu: xuLy === "roi" ? cu : null, soBe: xuLy === "mang_theo" ? nha.soBe : 0, soMay: xuLy === "mang_theo" ? nha.soMay : 0 };
  });
  // máy Con vừa đổi nhà ⇒ gõ cửa ngay (agent vẫn kịp theo vòng 60 giây nếu bỏ lỡ)
  await baoThayDoi(kq.moi);
  if (kq.cu) await baoThayDoi(kq.cu);
  return { quyen: kq.quyen, vai: kq.vai, ...(kq.xuLy === "mang_theo" ? { mangTheo: { soBe: kq.soBe, soMay: kq.soMay } } : {}) };
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

export async function moiRa(bm: BaMe, id: string) {
  const p = await thanhVienKhac(bm, id);
  await tx(async (t) => {
    const cu = await t<{ d: string }>(`update parents x set vai = 'roi', dinh_danh = x.dinh_danh || '#roi:' || x.id, pass_hash = null
      from parents y where x.id = $1 and y.id = x.id returning y.dinh_danh as d`, [id]);
    await goKhoaTaiKhoan("bm", cu.map((r) => r.d), t);                    // định danh được nhả ⇒ bỏ bộ đếm / nguồn quen đăng nhập (#553)
    await t(`delete from sessions where parent_id = $1`, [id]);
    await t(`delete from ba_me_mxh where parent_id = $1`, [id]);     // vào lại bằng Google / Facebook không quay về nhà vừa mời ra
    await ghiSuKien(bm.family_id, "moi_ra", { ten: p.ten }, { nguoi: bm.id }, t);
  });
}

/** POST toi/ten {ten} — «Tên hiển thị · Lưu tên» (thiết kế 14/11 bm-ca-nha/08 «Tài khoản của bạn»): đổi tên của chính mình (mọi quyền). */
export async function doiTenToi(bm: BaMe, v: unknown) {
  const ten = String(v ?? "").trim().slice(0, 40);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Cho biết tên gọi trong gia đình (vd Mẹ Lan, Ba Tuấn)");
  if (ten === bm.ten) return { ok: true, ten };
  await q(`update parents set ten = $2 where id = $1`, [bm.id, ten]);
  await ghiSuKien(bm.family_id, "doi_ten_ba_me", { tu: bm.ten, den: ten }, { nguoi: bm.id });
  return { ok: true, ten };
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
