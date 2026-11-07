// Quà = BẢNG GIÁ SAO — thiết kế chốt 06/11 (docs/KE-HOACH-KHOP-THIET-KE-0611.md L14; màn them-s416tfdj «Sao đổi được quà gì?»,
// them-473f52w6 «Danh sách quà», them-dlul0jlr «Thêm quà từ thư viện», them-79kgpij8 «Sửa quà», them-5otw85h4 «Trao quà cho con»).
//   • 7 quà mặc định (tên + số sao lấy đúng màn), gieo MỘT lần khi nhà có Con đầu tiên mà chưa có quà nào (families.qua_seed_luc).
//   • Con đổi ⇒ sao bị GIỮ (đã ghi trừ tạm, ví hiện `saoGiu`) chờ Ba Mẹ trao; Ba Mẹ trao (trừ hẳn) / huỷ (hoàn sao); quà bị xoá ⇒ hoàn mọi phiếu đang giữ.
//   • Voucher AiiCafe bật lại: Ba Mẹ trao ⇒ mã QR (= mã phiếu, quầy /quay quét) + hạn `voucher_han_ngay` (60 ngày như màn) — lib/phan-thuong.ts.
//   • Thư viện mẫu 5 loại; điều kiện: chỉ cuối tuần, tối đa X lần / tháng, số lượng có sẵn; «Áp cho» từng Con (rewards.ap_cho).
//   • «Thêm 30 phút» KHÔNG phải quà: là nút đổi sao lấy phút (L2 — POST /api/kid/doi-sao). Quà loai `phut` cũ vẫn chạy cho dữ liệu cũ.
import { one, q, tx } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { ghiDiem, khoaCon } from "./vi.ts";
import * as pt from "./phan-thuong.ts";

export type MauQua = { ma: string; ten: string; loai: "qua" | "dac_quyen" | "voucher" | "tiet_kiem"; diem: number; mo_ta?: string; hinh?: string;
  menh_gia?: number; chi_cuoi_tuan?: boolean; ton_kho?: number; toi_da_thang?: number; can_xac_nhan?: boolean };

/** 7 quà Rob chọn sẵn (them-s416tfdj + them-473f52w6). Thứ tự = thứ tự trên màn. */
export const QUA_MAC_DINH: MauQua[] = [
  { ma: "bua_toi", ten: "Chọn món bữa tối", loai: "dac_quyen", diem: 50, mo_ta: "Con chọn, Ba Mẹ nấu", hinh: "bua_toi" },
  { ma: "an_kem", ten: "Đi ăn kem", loai: "dac_quyen", diem: 100, mo_ta: "Ba Mẹ trao", hinh: "kem" },
  { ma: "aiicafe_20k", ten: "AiiCafe 20k", loai: "voucher", diem: 200, menh_gia: 20_000, mo_ta: "Voucher QR · 60 ngày", hinh: "aiicafe" },
  { ma: "do_choi_nho", ten: "Đồ chơi nhỏ", loai: "qua", diem: 200, mo_ta: "Ba Mẹ chọn mua", hinh: "do_choi" },
  { ma: "xem_phim", ten: "Đi xem phim", loai: "dac_quyen", diem: 300, chi_cuoi_tuan: true, mo_ta: "Chỉ cuối tuần", hinh: "phim" },
  { ma: "aiicafe_50k", ten: "AiiCafe 50k", loai: "voucher", diem: 500, menh_gia: 50_000, mo_ta: "Voucher QR · 60 ngày", hinh: "aiicafe" },
  { ma: "lego", ten: "Bộ Lego", loai: "qua", diem: 800, ton_kho: 1, mo_ta: "Còn 1 bộ", hinh: "lego" },
];

/** Thư viện mẫu 5 loại (them-dlul0jlr). `nhom` = tab. Mẫu trùng mã với quà mặc định = cùng một quà («Đã có»). */
export const NHOM_THU_VIEN = [
  { ma: "thoi_gian", ten: "Thời gian chơi", phu: "giá gợi ý" },
  { ma: "voucher", ten: "Voucher AiiCafe", phu: "mã QR · 60 ngày" },
  { ma: "qua_vat_ly", ten: "Quà vật lý", phu: "Ba Mẹ mua" },
  { ma: "dac_quyen", ten: "Đặc quyền", phu: "trải nghiệm cả nhà" },
  { ma: "tiet_kiem", ten: "Tiết kiệm", phu: "sao thành tiền heo đất" },
] as const;
export const THU_VIEN: (MauQua & { nhom: (typeof NHOM_THU_VIEN)[number]["ma"] })[] = [
  { nhom: "thoi_gian", ma: "thuc_them_30", ten: "Thức thêm 30 phút", loai: "dac_quyen", diem: 100, mo_ta: "Tối thứ 7", hinh: "dong_ho" },
  { nhom: "thoi_gian", ma: "game_cung_ba", ten: "Chơi game cùng Ba", loai: "dac_quyen", diem: 150, mo_ta: "1 giờ · cuối tuần", chi_cuoi_tuan: true, hinh: "game" },
  { nhom: "voucher", ...QUA_MAC_DINH[2] },
  { nhom: "voucher", ...QUA_MAC_DINH[5] },
  { nhom: "voucher", ma: "aiicafe_100k", ten: "AiiCafe 100k", loai: "voucher", diem: 1000, menh_gia: 100_000, mo_ta: "Ba Mẹ duyệt khi con đổi", can_xac_nhan: true, hinh: "aiicafe" },
  { nhom: "qua_vat_ly", ma: "sach_moi", ten: "Sách mới con chọn", loai: "qua", diem: 150, hinh: "sach" },
  { nhom: "qua_vat_ly", ...QUA_MAC_DINH[3] },
  { nhom: "qua_vat_ly", ...QUA_MAC_DINH[6] },
  { nhom: "dac_quyen", ...QUA_MAC_DINH[0] },
  { nhom: "dac_quyen", ...QUA_MAC_DINH[1] },
  { nhom: "dac_quyen", ...QUA_MAC_DINH[4], ten: "Đi xem phim cuối tuần" },
  { nhom: "dac_quyen", ma: "ngu_nuong", ten: "Ngủ nướng Chủ nhật", loai: "dac_quyen", diem: 80, hinh: "ngu" },
  { nhom: "tiet_kiem", ma: "heo_dat_10k", ten: "Bỏ heo đất 10.000đ", loai: "tiet_kiem", diem: 100, hinh: "heo_dat" },
  { nhom: "tiet_kiem", ma: "quy_xe_dap", ten: "Góp quỹ mua xe đạp", loai: "tiet_kiem", diem: 300, mo_ta: "Ba Mẹ đặt mục tiêu", hinh: "xe_dap" },
];

const theoMa = new Map([...QUA_MAC_DINH, ...THU_VIEN].map((m) => [m.ma, m]));

/** Đổi thân API (camelCase của app mới hoặc snake_case cũ) ⇒ dạng kiemQua (phan-thuong.ts) hiểu. Chỉ khoá có gửi mới có mặt (sửa từng phần). */
export function thanQua(b: Record<string, unknown>) {
  const r: Record<string, unknown> = {};
  const lay = (moi: string, cu: string) => (b[moi] !== undefined ? b[moi] : b[cu]);
  const map: [string, string, string][] = [["ten", "ten", "ten"], ["loai", "loai", "loai"], ["diem", "sao", "diem"], ["menh_gia", "menhGia", "menh_gia"],
    ["phut", "phut", "phut"], ["ton_kho", "tonKho", "ton_kho"], ["toi_da_thang", "toiDaThang", "toi_da_thang"], ["chi_cuoi_tuan", "chiCuoiTuan", "chi_cuoi_tuan"],
    ["can_xac_nhan", "canXacNhan", "can_xac_nhan"], ["mo_ta", "moTa", "mo_ta"], ["hinh", "hinh", "hinh"], ["ap_cho", "apCho", "ap_cho"], ["bat", "bat", "bat"]];
  for (const [dich, moi, cu] of map) { const v = lay(moi, cu); if (v !== undefined) r[dich] = v; }
  return r;
}

/** Hàng `rewards` ⇒ JSON cho app (giữ cả khoá cũ snake_case cho app bản trước). */
export function quaRa(x: pt.Qua & { phut?: number | null }, dangGiu = 0) {
  return { ...x, sao: x.diem, moTa: x.mo_ta ?? null, hinh: x.hinh ?? null, menhGia: x.menh_gia, tonKho: x.ton_kho, toiDaThang: x.toi_da_thang,
    chiCuoiTuan: x.chi_cuoi_tuan, canXacNhan: x.can_xac_nhan, apCho: x.ap_cho ?? null, mau: x.mau ?? null, dangGiu,
    laVoucher: x.loai === "voucher" };
}

/** Gieo 7 quà mặc định MỘT lần cho nhà (chưa gieo + chưa có quà nào). Gọi khi tạo Con. → số quà đã tạo. */
export async function gieoQuaMacDinh(fam: string) {
  return tx(async (t) => {
    const f = (await t<{ qua_seed_luc: Date | null }>(`select qua_seed_luc from families where id = $1 for update`, [fam]))[0];
    if (!f || f.qua_seed_luc) return 0;
    await t(`update families set qua_seed_luc = now() where id = $1`, [fam]);
    if ((await t(`select 1 from rewards where family_id = $1 limit 1`, [fam])).length) return 0;
    for (const m of QUA_MAC_DINH) await pt.taoQua(fam, { ...m, mau: m.ma }, { t });
    return QUA_MAC_DINH.length;
  });
}

/** Danh sách quà (Ba Mẹ) — `con` ⇒ chỉ quà áp cho Con đó. Kèm số phiếu đang giữ của mỗi quà. */
export async function dsQua(fam: string, con?: string | null) {
  const ds = await q<pt.Qua & { phut: number | null }>(
    `select * from rewards where family_id = $1 and ($2::text is null or ap_cho is null or ap_cho ? $2) order by diem, created_at`, [fam, con ?? null]);
  const giu = await q<{ reward_id: string; n: number }>(`select r.reward_id, count(*)::int as n from redemptions r join children c on c.id = r.child_id
      where c.family_id = $1 and r.trang_thai = 'giu' and r.reward_id is not null group by r.reward_id`, [fam]);
  const n = new Map(giu.map((x) => [x.reward_id, x.n]));
  return { ds: ds.map((x) => quaRa(x, n.get(x.id) ?? 0)) };
}

/** Thư viện mẫu theo 5 nhóm, đánh dấu «Đã có» (cùng mã mẫu, hoặc cùng tên) trong nhà / với Con. */
export async function thuVien(fam: string, con?: string | null) {
  const co = await q<{ mau: string | null; ten: string }>(
    `select mau, ten from rewards where family_id = $1 and bat and ($2::text is null or ap_cho is null or ap_cho ? $2)`, [fam, con ?? null]);   // quà đã cất ⇒ hiện «+» (thêm = bật lại)
  const coMau = new Set(co.map((x) => x.mau).filter(Boolean)), coTen = new Set(co.map((x) => x.ten.toLowerCase()));
  return { nhom: NHOM_THU_VIEN.map((g) => ({ ...g, ds: THU_VIEN.filter((m) => m.nhom === g.ma).map((m) => ({ ma: m.ma, ten: m.ten, moTa: m.mo_ta ?? null,
    hinh: m.hinh ?? null, sao: m.diem, loai: m.loai, menhGia: m.menh_gia ?? null, chiCuoiTuan: !!m.chi_cuoi_tuan, tonKho: m.ton_kho ?? null,
    canXacNhan: !!m.can_xac_nhan, daCo: coMau.has(m.ma) || coTen.has(m.ten.toLowerCase()) })) })) };
}

const apChoVao = async (fam: string, v: unknown): Promise<string[] | null> => {
  if (v === undefined || v === null || v === "") return null;
  const ds = [...new Set((Array.isArray(v) ? v : [v]).map(String))];
  if (!ds.length) return null;
  const co = await q<{ id: string }>(`select id from children where family_id = $1 and id = any($2::text[])`, [fam, ds]);
  if (co.length !== ds.length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return ds;
};

/** «Thêm N quà» từ thư viện (`mau[]` = mã mẫu). `con` ⇒ áp cho riêng Con đó.
 *  Mẫu đã có (cùng mã): đã áp cho Con này / cho mọi Con ⇒ bỏ qua (đang cất thì bật lại); đang áp RIÊNG cho Con khác ⇒ áp thêm Con này vào
 *  quà đó («Áp cho» nhiều Con — một quà, không nhân bản) — trước đây bỏ qua nên Ba Mẹ thấy «+» mà nhận «Đã thêm 0 quà» (lệch #201).
 *  `taoMoi` = số quà Con (hoặc cả nhà) có thêm; `ids` = các quà đó (mới tạo hoặc vừa áp thêm). */
export async function themTuThuVien(fam: string, b: { mau?: unknown; con?: unknown }, nguoi: string) {
  const ma = [...new Set((Array.isArray(b.mau) ? b.mau : [b.mau]).map(String))].filter(Boolean);
  if (!ma.length || ma.some((x) => !theoMa.has(x))) throw new LoiNghiepVu("mau_sai", "Chọn quà trong thư viện");
  const con = (await apChoVao(fam, b.con))?.[0] ?? null;     // màn thư viện mở theo MỘT Con (hoặc cả nhà)
  const co = await q<CungMau>(`select id, mau, ap_cho, bat from rewards where family_id = $1 and mau = any($2::text[]) order by created_at`, [fam, ma]);
  const ids: string[] = [];
  for (const m of ma) {
    const cung = co.filter((x) => x.mau === m);
    if (!cung.length) { ids.push(await pt.taoQua(fam, { ...theoMa.get(m)!, mau: m, ap_cho: con ? [con] : null })); continue; }
    const id = await apDungChoCon(fam, cung, con, m);
    if (id) ids.push(id);
  }
  if (ids.length) await ghiSuKien(fam, "them_qua", { so: ids.length, mau: ma }, { con, nguoi });
  return { taoMoi: ids.length, ids: [...new Set(ids)] };
}

type CungMau = { id: string; mau: string; ap_cho: string[] | null; bat: boolean };

/** Cho quà mẫu `mau` (đã có các dòng `cung`, ≥ 1) hiện với `con` (null = mọi Con). → id quà Con / cả nhà vừa có thêm, null nếu vốn đã có.
 *  • có dòng đang BẬT áp cho Con (hoặc mọi Con) ⇒ không đổi gì.
 *  • cả nhà: bật lại dòng mọi Con (hoặc mở dòng áp riêng thành mọi Con).
 *  • một Con: dòng riêng của Con đang cất ⇒ bật lại; dòng mọi Con đang cất ⇒ bật lại CHỈ cho Con này; dòng áp riêng Con khác đang BẬT ⇒ áp thêm
 *    Con này (một quà, `ap_cho` nhiều Con); chỉ còn dòng Con khác đã cất ⇒ tạo dòng mới riêng Con này (không bật lại quà Ba Mẹ cất cho anh chị em).
 *  `ap_cho` tính trong MỘT câu update (jsonb, theo giá trị đang lưu) — hai lần thêm song song cho hai Con không đè nhau. */
async function apDungChoCon(fam: string, cung: CungMau[], con: string | null, mau: string): Promise<string | null> {
  const hop = (x: CungMau) => !x.ap_cho || (con !== null && x.ap_cho.includes(con));
  if (cung.some((x) => x.bat && hop(x))) return null;
  if (con === null) {
    // cả nhà: dòng mọi Con (đang cất) ⇒ bật lại; chỉ có dòng áp riêng ⇒ mở dòng đang BẬT ra mọi Con; chỉ còn dòng riêng đã cất ⇒ tạo dòng mọi Con mới
    // (không bật lại quà Ba Mẹ cất cho một Con)
    const r = cung.find((x) => !x.ap_cho) ?? cung.find((x) => x.bat);
    if (!r) return pt.taoQua(fam, { ...theoMa.get(mau)!, mau });
    await q(`update rewards set bat = true, ap_cho = null where id = $1`, [r.id]);
    return r.id;
  }
  // nhà chỉ một Con: quà mọi Con đang cất ⇒ bật lại cho mọi Con (không thu hẹp về một Con — Con thêm sau vẫn có quà)
  const motCon = (await q(`select 1 from children where family_id = $1 limit 2`, [fam])).length === 1;
  const caNha = motCon ? cung.find((x) => !x.ap_cho && !x.bat) : undefined;
  if (caNha) { await q(`update rewards set bat = true where id = $1`, [caNha.id]); return caNha.id; }
  const rieng = cung.find((x) => !x.bat && x.ap_cho?.length === 1 && x.ap_cho[0] === con);
  if (rieng) { await q(`update rewards set bat = true where id = $1`, [rieng.id]); return rieng.id; }
  const r = cung.find((x) => !x.ap_cho && !x.bat) ?? cung.find((x) => x.bat && x.ap_cho);
  if (!r) return pt.taoQua(fam, { ...theoMa.get(mau)!, mau, ap_cho: [con] });
  await q(`update rewards set bat = true, ap_cho = case when ap_cho is null and not bat then jsonb_build_array($2::text)
      when ap_cho is null or ap_cho ? $2 then ap_cho else ap_cho || jsonb_build_array($2::text) end where id = $1`, [r.id, con]);
  return r.id;
}

/** Bước «Chọn quà» lúc thiết lập (them-s416tfdj): giữ quà mặc định được tick, bỏ quà mặc định bị bỏ tick (chưa ai đổi) — `chon` = mã mẫu.
 *  Thiếu quà mặc định (nhà cũ) ⇒ tạo. `chon` bỏ trống ⇒ cả 7. → danh sách quà sau khi lưu. */
export async function luuQuaMacDinh(fam: string, b: { chon?: unknown; con?: unknown }, nguoi: string) {
  const chon = b.chon === undefined ? QUA_MAC_DINH.map((m) => m.ma) : [...new Set((Array.isArray(b.chon) ? b.chon : []).map(String))];
  if (chon.some((x) => !QUA_MAC_DINH.some((m) => m.ma === x))) throw new LoiNghiepVu("mau_sai", "Chọn trong 7 quà Rob gợi ý");
  await q(`update families set qua_seed_luc = coalesce(qua_seed_luc, now()) where id = $1`, [fam]);
  const con = (await apChoVao(fam, b.con))?.[0] ?? null;
  const co = await q<CungMau>(`select id, mau, ap_cho, bat from rewards where family_id = $1 and mau = any($2::text[]) order by created_at`, [fam, QUA_MAC_DINH.map((m) => m.ma)]);
  for (const m of QUA_MAC_DINH) {
    const cung = co.filter((x) => x.mau === m.ma);
    // có `con`: chỉ dòng áp cho Con đó / mọi Con (bỏ tick không xoá quà riêng của anh chị em)
    const r = cung.find((x) => !x.ap_cho || (con !== null && x.ap_cho.includes(con))) ?? (con ? undefined : cung[0]);
    if (chon.includes(m.ma) && !cung.length) await pt.taoQua(fam, { ...m, mau: m.ma, ap_cho: con ? [con] : null });
    // «Dùng 7 quà Rob gợi ý» trên danh sách quà của MỘT Con (gửi `con`): quà đã cất / áp riêng Con khác ⇒ có lại cho Con này (lệch #201).
    // Không `con` (bước «Chọn quà» lúc thiết lập, app cũ qua/mau) ⇒ chỉ tạo quà thiếu — không bật lại quà Ba Mẹ đã cất, không đổi «Áp cho».
    if (chon.includes(m.ma) && cung.length && con) await apDungChoCon(fam, cung, con, m.ma);
    if (!chon.includes(m.ma) && r && !(await one(`select 1 from redemptions where reward_id = $1 limit 1`, [r.id]))) await q(`delete from rewards where id = $1`, [r.id]);
  }
  await ghiSuKien(fam, "chon_qua", { chon }, { nguoi });
  return dsQua(fam, con);
}

/** Ba Mẹ tạo quà riêng («Tự đặt quà riêng») — voucher AiiCafe được tạo lại (06/11). */
export async function taoQuaRieng(fam: string, b: Record<string, unknown>) {
  const v = thanQua(b);
  return pt.taoQua(fam, { ...v, ap_cho: await apChoVao(fam, v.ap_cho) });
}

/** Ba Mẹ sửa quà (tên, hình, giá, điều kiện, áp cho). */
export async function suaQuaS3(fam: string, id: string, b: Record<string, unknown>) {
  const v = thanQua(b);
  if (v.ap_cho !== undefined) v.ap_cho = await apChoVao(fam, v.ap_cho);
  await pt.suaQua(fam, id, v);
  const x = await one<pt.Qua>(`select * from rewards where id = $1`, [id]);
  return quaRa(x!);
}

/** «Xoá quà này»: mọi phiếu đang GIỮ sao của quà ⇒ huỷ + hoàn sao cho Con («Sao con đã có không bị mất»), voucher chưa phát ⇒ thu hồi. */
export async function xoaQua(fam: string, id: string, nguoi: string) {
  return tx(async (t) => {
    const x = (await t<{ id: string; ten: string }>(`select id, ten from rewards where id = $1 and family_id = $2 for update`, [id, fam]))[0];
    if (!x) throw new LoiNghiepVu("khong_thay", "Không thấy phần thưởng", 404);
    const giu = await t<{ id: string; child_id: string; diem: number; ten: string }>(
      `select id, child_id, diem, ten from redemptions where reward_id = $1 and trang_thai = 'giu' order by created_at`, [id]);
    let hoan = 0;
    for (const p of giu) {
      await khoaCon(t, p.child_id);
      await t(`update redemptions set trang_thai = 'huy', xu_ly_boi = $2, xu_ly_luc = now() where id = $1`, [p.id, nguoi]);
      await ghiDiem(t, p.child_id, p.diem, "hoan", `Hoàn sao ${p.ten} (quà đã xoá)`, { ref: p.id, nguoi });
      await t(`update vouchers set trang_thai = 'thu_hoi' where redemption_id = $1 and trang_thai = 'cho_xac_nhan'`, [p.id]);
      await ghiSuKien(fam, "huy_qua", { ten: p.ten, hoan: p.diem, ly_do: "xoa_qua" }, { con: p.child_id, nguoi }, t);
      hoan += p.diem;
    }
    await t(`delete from rewards where id = $1`, [id]);
    await ghiSuKien(fam, "xoa_qua", { ten: x.ten, hoanPhieu: giu.length, hoanSao: hoan }, { nguoi }, t);
    return { ok: true, hoanPhieu: giu.length, hoanSao: hoan };
  });
}

/** Màn «Trao quà cho con» — một phiếu đang giữ (tên, sao, lúc đổi, Con). */
export async function chiTietPhieu(fam: string, id: string) {
  const p = await one<{ id: string; child_id: string; ten_con: string; ten: string; loai: string; diem: number; trang_thai: string; created_at: Date;
    reward_id: string | null; hinh: string | null }>(`select r.id, r.child_id, c.ten as ten_con, r.ten, r.loai, r.diem, r.trang_thai, r.created_at, r.reward_id, w.hinh
      from redemptions r join children c on c.id = r.child_id left join rewards w on w.id = r.reward_id where r.id = $1 and c.family_id = $2`, [id, fam]);
  if (!p) throw new LoiNghiepVu("khong_thay", "Không thấy phiếu quà", 404);
  const v = await one<{ ma: string; trang_thai: string; het_han: Date; menh_gia: number }>(`select ma, trang_thai, het_han, menh_gia from vouchers where redemption_id = $1`, [id]);
  return { id: p.id, con: { id: p.child_id, ten: p.ten_con }, ten: p.ten, loai: p.loai, hinh: p.hinh ?? null, sao: p.diem, trangThai: p.trang_thai,
    dangGiu: p.trang_thai === "giu", doiLuc: new Date(p.created_at).toISOString(),
    voucher: v ? { menhGia: v.menh_gia, trangThai: v.trang_thai, ...(v.trang_thai === "da_phat_hanh" || v.trang_thai === "da_dung" ? { ma: v.ma, qr: v.ma, hetHan: new Date(v.het_han).toISOString() } : {}) } : null };
}

