// SỔ SAO (#263–#266, thiết kế chốt 15/11/2026) — vay sao, số dư âm, trả nợ trước, 1 sao = 1 phút «Tính phút», cảnh báo nợ > 1.000.
//   • Sổ cái là `points` (lib/vi.ts): tổng delta = SAO TIÊU ĐƯỢC (≥ 0) = phút «Tính phút» còn chơi được. Nợ = tổng (vay + tra_no).
//     Số dư Con thấy (`sao`) = sao tiêu được − nợ (âm khi nợ). Hết sao = sao tiêu được ≤ 0 (số dư ≤ 0 và không còn sao vay chưa tiêu).
//   • Ba Mẹ cho vay N sao (choVay): +N `vay` — Con dùng ngay (chơi N phút hoặc đổi quà). Sao kiếm được trả nợ trước (vi.ts › ghiDiem).
//   • Chơi app / web nhóm «Tính phút» (luật giai_tri): trừ 1 sao mỗi phút dùng thật (tinhPhutChoi) — tính theo ĐỒNG HỒ MÁY CHỦ của từng Con
//     (choi_dong_ho.phu_den): hai máy cùng chơi một lúc chỉ trừ phần thời gian thật đã trôi, không trừ đôi. Không còn quỹ phút mỗi ngày.
//   • Nợ > 1.000 sao: cảnh báo Ba Mẹ (dòng Thông báo nhóm «canh_bao_no» + đẩy theo cài đặt) MỖI lần cho vay mà nợ sau vay > 1.000 — gồm lần
//     vượt mốc và mọi lần cho vay thêm khi đang nợ > 1.000. Không chặn (không trần nợ).
//   • Mã mở máy của Ba Mẹ (pin-be / mã offline): máy mở cho Ba Mẹ, phút không tính cho Con (api-may bỏ usage lúc Ba Mẹ dùng) — không trừ sao.
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { ghiDiem, KIEM_SQL, khoaCon, NGUONG_NO, noCua, soDu, tomTatVi } from "./vi.ts";

export { NGUONG_NO };
/** Bảng «Cho vay sao» (bm them-6wjhze1d): chọn 10 / 15 / 30, mặc định 15. Máy chủ nhận 1–VAY_TOI_DA. */
export const MUC_VAY = [10, 15, 30] as const;
export const VAY_MAC_DINH = 15;
export const VAY_TOI_DA = 1000;
/** Sao tặng khởi đầu khi tạo hồ sơ Con (bm1-ob-gio): số nguyên 0…200 (bước 10), mặc định 30. */
/** #306: số nguyên 0…200, bước 10, mặc định 30. */
export const SAO_KHOI_DAU_TOI_DA = 200;
export const SAO_KHOI_DAU_BUOC = 10;
export const SAO_KHOI_DAU_MD = 30;

export type MucDichVay = "choi" | "qua";

/** Số kiểu Việt: 1.020 · âm dùng dấu trừ thật «−» (U+2212). */
export const soVN = (n: unknown) => { const x = Math.round(Number(n ?? 0)); return `${x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("en-US").replace(/,/g, ".")}`; };

export type TrangThaiSao = {
  /** số dư Con thấy — âm khi đang nợ */ sao: number;
  /** nợ Ba Mẹ còn lại */ no: number;
  /** sao tiêu được ngay (= phút «Tính phút» còn chơi được) */ phutCon: number;
  /** phần sao vay Ba Mẹ cho mà Con chưa tiêu */ saoVayChuaTieu: number;
  /** hết sao ⇒ máy khoá nhóm «Tính phút» (chỉ còn lối «Xin Ba Mẹ cho vay sao») */ hetSao: boolean;
  /** nợ > 1.000 */ canhBaoNo: boolean;
};

export function tinhTrangThai(tong: number, no0: number): TrangThaiSao {
  const no = Math.max(0, no0), tieu = Math.max(0, tong);
  return { sao: tong - no, no, phutCon: tieu, saoVayChuaTieu: Math.min(tieu, no), hetSao: tieu <= 0, canhBaoNo: no > NGUONG_NO };
}

export async function trangThaiSao(con: string, t: Q = q): Promise<TrangThaiSao> {
  const r = (await t<{ s: number; n: number }>(
    `select coalesce(sum(delta), 0)::int as s, coalesce(sum(delta) filter (where loai in ('vay', 'tra_no')), 0)::int as n from points where child_id = $1`, [con]))[0];
  return tinhTrangThai(r.s, r.n);
}

/** Câu cho máy Con / app: «còn 30 sao = 30 phút chơi» · nợ: «Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước». */
export function cauSao(st: TrangThaiSao) {
  const so = soVN;
  return {
    soDu: `${soVN(st.sao)} sao`,
    phut: st.hetSao ? "Hết sao — xin Ba Mẹ cho vay sao nhé" : `còn ${so(st.phutCon)} sao = ${so(st.phutCon)} phút chơi`,
    no: st.no > 0 ? `Đang nợ Ba Mẹ ${so(st.no)} sao · sao nhiệm vụ trả nợ trước` : null,
  };
}

// ---------------------------------------------------------------- Chơi «Tính phút»: 1 sao = 1 phút, theo đồng hồ máy chủ

/** Phút «Tính phút» đã trừ sao hôm nay (giờ gia đình). */
export async function phutDaTruHomNay(t: Q, con: string, tz: string, now = new Date()) {
  const tu = dauNgayUtc(gioDiaPhuong(now, tz).ngay, tz);
  return (await t<{ p: number }>(`select coalesce(-sum(delta), 0)::int as p from points where child_id = $1 and loai = 'choi' and created_at >= $2`, [con, tu]))[0].p;
}

const GOP_DONG_PHUT = 10;   // nhịp cách dòng «choi» cuối ≤ 10 phút (và không có dòng khác xen giữa) ⇒ cộng dồn vào dòng đó
/** Mục là app (tệp .exe / .app, gói / bundle dạng com.x.y — như chinh-sach.ts › kieuMuc) hay tên miền. */
export const LA_APP = /\.(exe|app)$|^(com|vn|org|net|io|me|tv|uk|de|jp|us|co|app|dev)\.[a-z0-9_-]+(\.[a-z0-9_-]+)+$/i;

/** Trừ `phut` phút «Tính phút» Con vừa dùng (một lần báo của MỘT kênh: một máy / một phiên) — GỌI TRONG giao dịch đã khoaCon(con).
 *  Đồng hồ theo CỬA SỔ: lần báo `phut` phút lúc `now` được coi là chơi trong (now − phut, now]; phút trừ thêm =
 *  phut − phút đã tính (mọi kênh) trong chính cửa sổ đó ⇒ hai máy chơi SONG SONG không trừ đôi, còn chơi NỐI TIẾP (Roblox 5′ rồi YouTube 5′,
 *  kênh báo thưa / dày khác nhau) không mất phút. Mỗi lần tính ghi một dòng choi_tru (lúc, phút). Phần lẻ cộng dồn (phut_le) — đủ 1 phút
 *  trừ 1 sao. Hết sao thì dừng trừ (không tự ghi nợ — máy khoá ở lần đồng bộ này). → { tru: sao vừa trừ, tinh: phút được tính } */
export async function tinhPhutChoi(t: Q, con: string, phut: number, now = new Date(),
  o: { muc?: string | null; tz?: string; ten?: string | null; /** #433 A4: phút theo từng mục trong lượt báo này ⇒ chia sao trừ theo mục */ theoMuc?: Map<string, number>;
    /** #433 A3: mốc CUỐI khung giờ chơi do agent báo (`cuoiLuc`) — cửa sổ là (den − phut, den] thay vì (now − phut, now] ⇒ báo TRỄ không bị coi là trùng
     *  với phút máy khác vừa báo. Không có ⇒ như cũ (cửa sổ tính từ lúc nhận). Đã kẹp bằng `kepCuoiLuc`. */ den?: Date } = {}) {
  if (!(Number.isFinite(phut) && phut > 0)) return { tru: 0, tinh: 0 };
  const den = o.den && o.den.getTime() < now.getTime() ? o.den : now;
  const tu = new Date(den.getTime() - phut * 60_000);
  const da = Number((await t<{ p: number }>(`select coalesce(sum(phut), 0)::real as p from choi_tru where child_id = $1 and luc > $2 and luc <= $3`,
    [con, tu, den]))[0].p);
  const tinh = Math.max(0, Math.round((phut - da) * 1000) / 1000);
  if (tinh <= 0) return { tru: 0, tinh: 0 };
  await t(`insert into choi_tru(child_id, luc, phut) values ($1, $2, $3)`, [con, den, tinh]);
  await t(`delete from choi_tru where child_id = $1 and luc < $2`, [con, new Date(now.getTime() - 2 * 86_400_000)]);
  const r = (await t<{ phut_le: number }>(`select phut_le from choi_dong_ho where child_id = $1`, [con]))[0];
  let le = Number(r?.phut_le ?? 0) + tinh;
  const nguyen = Math.floor(le + 1e-6);
  le = Math.max(0, le - nguyen);
  let tru = 0;
  const du = await soDu(con, t);
  if (nguyen > 0 && du > 0) {
    tru = Math.min(nguyen, du);
    const tz = o.tz ?? (await t<{ tz: string }>(`select f.tz from children c join families f on f.id = c.family_id where c.id = $1`, [con]))[0]?.tz ?? "Asia/Ho_Chi_Minh";
    for (const [muc, n] of chiaTheoMuc(tru, o.theoMuc, o.muc ?? null)) await ghiChoi(t, con, n, muc, now, tz, o.theoMuc && o.theoMuc.size > 1 ? null : o.ten ?? null);
  }
  if (du - tru <= 0) le = 0;                        // hết sao: phần lẻ bỏ (không nợ phút)
  await t(`insert into choi_dong_ho(child_id, phut_le) values ($1, $2) on conflict (child_id) do update set phut_le = excluded.phut_le`, [con, le]);
  return { tru, tinh };
}

/** #433 A3: `cuoiLuc` agent gửi (ISO) → mốc dùng làm cuối cửa sổ; vô lý (không đọc được, ở tương lai, cũ hơn 6 giờ — vượt xa độ trễ báo bù) ⇒ undefined (như agent cũ). */
export function kepCuoiLuc(cuoiLuc: unknown, now: Date): Date | undefined {
  if (typeof cuoiLuc !== "string" || !cuoiLuc) return undefined;
  const d = new Date(cuoiLuc);
  const ms = d.getTime();
  if (!Number.isFinite(ms) || ms > now.getTime() + 60_000 || now.getTime() - ms > 6 * 3_600_000) return undefined;
  return ms > now.getTime() ? now : d;
}

/** #433 A4: chia `tru` sao cho các mục theo tỉ lệ phút (phần dư lớn nhất nhận thêm) — tổng đúng bằng `tru`. Không có chi tiết ⇒ một mục. */
export function chiaTheoMuc(tru: number, theoMuc: Map<string, number> | undefined, muc: string | null): [string | null, number][] {
  const ds = theoMuc ? [...theoMuc].filter(([, n]) => n > 0) : [];
  if (ds.length <= 1) return tru > 0 ? [[ds[0]?.[0] ?? muc, tru]] : [];
  const tong = ds.reduce((a, [, n]) => a + n, 0);
  const phan = ds.map(([m, n]) => ({ m, n: Math.floor((tru * n) / tong), du: (tru * n) / tong - Math.floor((tru * n) / tong), goc: n }));
  let con = tru - phan.reduce((a, x) => a + x.n, 0);
  for (const x of [...phan].sort((a, b) => b.du - a.du || b.goc - a.goc)) { if (con <= 0) break; x.n++; con--; }
  return phan.filter((x) => x.n > 0).map((x) => [x.m, x.n]);
}

async function ghiChoi(t: Q, con: string, tru: number, muc: string | null, now: Date, tz: string, ten0: string | null) {
  const ref = `choi:${gioDiaPhuong(now, tz).ngay}:${muc ?? ""}`;
  // nạp lười: man-hinh → chinh-sach → may-con → so-sao là vòng import
  const ten = ten0 ? ten0 : muc ? (await import("./man-hinh.ts")).tenDoc(muc, LA_APP.test(muc) ? "app" : "web") : "Tính phút";
  // dòng «choi» cùng mục gần nhất trong chuỗi dòng «choi» liền nhau ở cuối sổ (#433 A4: nhiều app xen kẽ trong một lượt vẫn gom được)
  const cuoiDs = await t<{ id: string; loai: string; ref: string | null; delta: number; cap_nhat: Date | null; created_at: Date }>(
    `select id, loai, ref, delta, cap_nhat, created_at from points where child_id = $1 order by seq desc limit 30`, [con]);
  let cuoi: (typeof cuoiDs)[number] | undefined;
  for (const r of cuoiDs) { if (r.loai !== "choi") break; if (r.ref === ref) { cuoi = r; break; } }
  if (cuoi && cuoi.loai === "choi" && cuoi.ref === ref
      && Math.abs(now.getTime() - new Date(cuoi.cap_nhat ?? cuoi.created_at).getTime()) <= GOP_DONG_PHUT * 60_000) {
    const phut = -cuoi.delta + tru;
    await t(`update points set delta = $2, ly_do = $3, cap_nhat = $4 where id = $1`, [cuoi.id, -phut, `Chơi ${ten} ${phut} phút`.slice(0, 120), now]);
    return;
  }
  await t(`insert into points(id, child_id, delta, loai, ly_do, ref, cap_nhat, created_at) values ($1,$2,$3,'choi',$4,$5,$6,$6)`,
    [newId(), con, -tru, `Chơi ${ten} ${tru} phút`.slice(0, 120), ref, now]);
}

/** Con đang ở «Mở hết» (không chặn, không trừ sao). */
export async function laMoHetCon(con: string, t: Q = q) {
  return (await t<{ m: string | null }>(`select che_do_chan as m from children where id = $1`, [con]))[0]?.m === "mo_het";
}

/** #433 A10: phần của `phut` phút (cửa sổ (now − phut, now] như tinhPhutChoi) rơi vào lúc Con ở «Theo danh sách» — Ba Mẹ đổi chế độ giữa
 *  chừng (sự kiện doi_che_do_chan) ⇒ phút chưa báo trước lúc đổi tính theo chế độ CŨ, sau lúc đổi theo chế độ mới. Không đổi trong cửa sổ ⇒
 *  cả `phut` (Theo danh sách) hoặc 0 (Mở hết) như trước. */
export async function phutTheoDanhSach(t: Q, con: string, phut: number, now = new Date(), fam?: string, den0?: Date) {
  now = den0 && den0.getTime() < now.getTime() ? den0 : now;   // #433 A3: cuối khung giờ chơi do agent báo
  const tu = new Date(now.getTime() - phut * 60_000);
  const moHet = await laMoHetCon(con, t);
  const f = fam ?? (await t<{ family_id: string }>(`select family_id from children where id = $1`, [con]))[0]?.family_id;
  // lọc theo (family_id, created_at) — chỉ mục events_gd, cửa sổ vài phút
  const doi = f ? await t<{ luc: Date; tu: string | null }>(
    `select created_at as luc, chi_tiet->>'tu' as tu from events where family_id = $4 and created_at > $2 and created_at <= $3
       and child_id = $1 and loai = 'doi_che_do_chan' order by created_at, seq`, [con, tu, now, f]) : [];
  if (!doi.length) return moHet ? 0 : phut;
  let moc = tu.getTime(), ms = 0;
  for (const d of doi) {
    if (d.tu !== "mo_het") ms += new Date(d.luc).getTime() - moc;
    moc = new Date(d.luc).getTime();
  }
  if (!moHet) ms += now.getTime() - moc;
  return Math.max(0, Math.min(phut, ms / 60_000));
}

/** Gói một lần trừ phút trong giao dịch riêng (khoá Con) — dùng ở đồng bộ máy / lịch sử web. Mở hết ⇒ không trừ (đổi chế độ giữa chừng: A10). */
export async function truPhutChoi(con: string, phut: number, now = new Date(),
  o: { muc?: string | null; ten?: string | null; tz?: string; theoMuc?: Map<string, number>; den?: Date } = {}) {
  if (!(phut > 0)) return { tru: 0, tinh: 0 };
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const p = await phutTheoDanhSach(t, con, phut, now, fam, o.den);
    if (!(p > 0)) return { tru: 0, tinh: 0 };
    return tinhPhutChoi(t, con, p, now, o);
  });
}

// ---------------------------------------------------------------- Cho vay

const soVay = (v: unknown) => {
  const n = Math.round(Number(v));
  if (!Number.isInteger(n) || n < 1 || n > VAY_TOI_DA) throw new LoiNghiepVu("so_sao_sai", `Chọn số sao cho vay (1–${soVN(VAY_TOI_DA)})`);
  return n;
};

/** Xem trước bảng «Cho vay sao»: đang có / sẽ nợ / có nhắc «đã nợ quá 1.000 sao» không (them-y1r1eidm). */
export async function xemTruocVay(fam: string, con: string, soSao: unknown = VAY_MAC_DINH) {
  const c = await one<{ ten: string }>(`select ten from children where id = $1 and family_id = $2`, [con, fam]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const n = soVay(soSao);
  const st = await trangThaiSao(con);
  const noSau = st.no + n;
  const so = soVN;
  return {
    ten: c.ten, soSao: n, mucVay: [...MUC_VAY], macDinh: VAY_MAC_DINH, ...st, noSau,
    /** «= 30 phút chơi hoặc đổi quà · Bảo Anh sẽ nợ 30 sao» */ cau: `= ${so(n)} phút chơi hoặc đổi quà · ${c.ten} sẽ nợ ${so(noSau)} sao`,
    /** dải nhắc trước khi xác nhận — chỉ khi ĐANG nợ > 1.000 (vẫn cho vay được) */
    nhacNo: st.no > NGUONG_NO ? `${c.ten} đã nợ quá ${so(NGUONG_NO)} sao (đang nợ ${so(st.no)})` : null,
    /** cho vay xong sẽ có cảnh báo (vượt mốc hoặc đang quá mốc) */ seCanhBao: noSau > NGUONG_NO,
  };
}

/** Ba Mẹ cho vay `soSao` sao. `t` = giao dịch sẵn có (duyệt lời xin) — không có thì tự mở. → trạng thái sao sau vay + id khoản vay + cảnh báo. */
export async function choVay(fam: string, con: string, soSao: unknown, nguoi: string | null,
  o: { mucDich?: MucDichVay | null; yeuCau?: string | null; quaId?: string | null } = {}, t0?: Q, now = new Date()) {
  const n = soVay(soSao);
  const chay = async (t: Q) => {
    if ((await khoaCon(t, con)) !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    const noTruoc = await noCua(con, t);
    const id = newId();
    const ten = o.mucDich === "qua" && o.quaId ? (await t<{ ten: string }>(`select ten from rewards where id = $1 and family_id = $2`, [o.quaId, fam]))[0]?.ten : null;
    const lyDo = `Ba Mẹ cho vay ${n} sao${o.mucDich === "qua" ? ` · đổi quà${ten ? ` ${ten}` : ""}` : o.mucDich === "choi" ? " · chơi" : ""}`;
    await t(`insert into points(id, child_id, delta, loai, ly_do, ref, nguoi, created_at, muc_dich) values ($1,$2,$3,'vay',$4,$5,$6,$7,$8)`,
      [id, con, n, lyDo.slice(0, 120), o.yeuCau ?? id, nguoi, now, o.mucDich ?? null]);
    const noSau = noTruoc + n;
    // #302: vay để chơi kết thúc lượt nghỉ (lib/gioi-han-choi.ts) ⇒ bỏ giờ nghỉ đang ghi ở phiên
    if (o.mucDich !== "qua") await t(`update play_sessions set nghi_den = null where child_id = $1 and nghi_den > $2`, [con, now]);
    await ghiSuKien(fam, "cho_vay", { so_sao: n, muc_dich: o.mucDich ?? null, no_truoc: noTruoc, no_sau: noSau, ...(o.yeuCau ? { yeu_cau: o.yeuCau } : {}),
      ...(o.quaId ? { qua: o.quaId } : {}) }, { con, nguoi }, t);
    const canh = await canhBaoNoNeuCan(t, fam, con, id, noTruoc, noSau, n, nguoi);
    return { id, soSao: n, ...(await trangThaiSao(con, t)), canhBaoNo: canh };
  };
  return t0 ? chay(t0) : tx(chay);
}

/** Cảnh báo khi nợ SAU khoản vay > 1.000 — mỗi khoản vay một dòng (khoá = id khoản vay). Vượt mốc: «<Tên> đã nợ quá 1.000 sao (đang nợ 1.020)»; nhắc lại: «vẫn nợ quá…». */
async function canhBaoNoNeuCan(t: Q, fam: string, con: string, vayId: string, noTruoc: number, noSau: number, soVayN: number, nguoi: string | null) {
  if (noSau <= NGUONG_NO) return null;
  const ten = (await t<{ ten: string }>(`select ten from children where id = $1`, [con]))[0]?.ten ?? "Con";
  const so = soVN;
  const vuotMoc = noTruoc <= NGUONG_NO;
  // lần vượt mốc: «<Tên> đã nợ quá 1.000 sao»; cho vay thêm khi đã quá mốc: «<Tên> vẫn nợ quá 1.000 sao · <Mẹ> vừa cho vay thêm N sao» (#266)
  const nguoiVay = !vuotMoc && nguoi ? (await t<{ ten: string }>(`select ten from parents where id = $1`, [nguoi]))[0]?.ten : null;
  const cau = vuotMoc ? `${ten} đã nợ quá ${so(NGUONG_NO)} sao (đang nợ ${so(noSau)})`
    : `${ten} vẫn nợ quá ${so(NGUONG_NO)} sao · ${nguoiVay || "Ba Mẹ"} vừa cho vay thêm ${so(soVayN)} sao (đang nợ ${so(noSau)})`;
  await canhBao(fam, "no_qua_1000", "chu_y", cau, { con, khoa: `no_1000:${vayId}`, chiTiet: { no: noSau, no_truoc: noTruoc, vuot_moc: vuotMoc } }, t);
  return { cau, no: noSau, vuotMoc };
}

const HOAN_TAC_VAY_GIAY = 60;

/** «Hoàn tác» ngay sau khi cho vay (trong 60 giây, đúng người cho). Chỉ rút phần CHƯA tiêu và CHƯA được trả nợ: rút x = min(khoản vay,
 *  nợ còn, sao tiêu được) bằng dòng `vay` −x ⇒ nợ không bao giờ âm, sao Con tự kiếm không mất (vay 30 → nhiệm vụ +10 trả nợ 10 → hoàn tác ⇒
 *  rút 20, nợ 0, Con còn 10 sao của mình). x = 0 ⇒ 409 `da_tieu`. Rút trọn ⇒ lời xin vay (nếu có) về «chờ» + gỡ cảnh báo nợ của khoản này. */
export async function hoanTacVay(fam: string, vayId: string, nguoi: string, now = new Date()) {
  return tx(async (t) => {
    const v = (await t<{ id: string; child_id: string; delta: number; nguoi: string | null; created_at: Date; ref: string | null }>(
      `select p.id, p.child_id, p.delta, p.nguoi, p.created_at, p.ref from points p join children c on c.id = p.child_id
        where p.id = $1 and c.family_id = $2 and p.loai = 'vay' and p.delta > 0`, [vayId, fam]))[0];
    if (!v) throw new LoiNghiepVu("khong_thay", "Không thấy lần cho vay này", 404);
    await khoaCon(t, v.child_id);
    const daHoan = (await t(`select 1 from points where child_id = $1 and loai = 'vay' and ref = $2 and delta < 0`, [v.child_id, `hoan:${v.id}`])).length;
    if (daHoan || v.nguoi !== nguoi || now.getTime() - new Date(v.created_at).getTime() > HOAN_TAC_VAY_GIAY * 1000)
      throw new LoiNghiepVu("het_hoan_tac", "Đã quá thời gian hoàn tác", 409);
    const x = Math.min(v.delta, await noCua(v.child_id, t), await soDu(v.child_id, t));
    if (x <= 0) throw new LoiNghiepVu("da_tieu", "Con đã dùng sao vay (hoặc đã trả hết khoản này) — không hoàn tác được", 409);
    await t(`insert into points(id, child_id, delta, loai, ly_do, ref, nguoi, created_at) values ($1,$2,$3,'vay',$4,$5,$6,$7)`,
      [newId(), v.child_id, -x, `Ba Mẹ rút lại ${x} sao vay`, `hoan:${v.id}`, nguoi, now]);
    const tron = x === v.delta;
    if (tron) {
      // lời xin vay đã duyệt ⇒ về «chờ» để Ba Mẹ trả lời lại
      if (v.ref && v.ref !== v.id)
        await t(`update requests set trang_thai = 'cho', nguoi_duyet = null, xu_ly_luc = null where id = $1 and trang_thai = 'dong_y'`, [v.ref]);
      await t(`delete from alerts where family_id = $1 and khoa = $2`, [fam, `no_1000:${v.id}`]);
    }
    await ghiSuKien(fam, "hoan_tac_vay", { so_sao: x, ...(tron ? {} : { mot_phan: true, khoan_vay: v.delta }) }, { con: v.child_id, nguoi }, t);
    return { ok: true, soSaoHoan: x, tron, ...(await trangThaiSao(v.child_id, t)) };
  });
}

// ---------------------------------------------------------------- Sao khởi đầu

export const saoKhoiDauHopLe = (v: unknown, md: number = SAO_KHOI_DAU_MD) => {
  if (v === undefined || v === null || v === "") return md;
  const n = Math.round(Number(v));
  if (!Number.isInteger(n) || n < 0 || n > SAO_KHOI_DAU_TOI_DA || n % SAO_KHOI_DAU_BUOC) throw new LoiNghiepVu("sao_khoi_dau_sai", `Sao tặng khởi đầu: 0 đến ${SAO_KHOI_DAU_TOI_DA}, mỗi bậc ${SAO_KHOI_DAU_BUOC} sao`);
  return n;
};

/** Tặng sao khởi đầu (một lần mỗi Con — gửi lại không tặng đôi). */
export async function tangSaoKhoiDau(con: string, n: number, nguoi: string | null) {
  if (!(n > 0)) return 0;
  return tx(async (t) => {
    await khoaCon(t, con);
    if ((await t(`select 1 from points where child_id = $1 and loai = 'khoi_dau' limit 1`, [con])).length) return 0;
    await ghiDiem(t, con, n, "khoi_dau", `Ba Mẹ tặng ${n} sao khởi đầu`, { nguoi });
    return n;
  });
}

// ---------------------------------------------------------------- Ví sao + thống kê (app Ba Mẹ them-1akngbxb, Báo cáo them-gftgyspn)

/** Sao kiếm / sao vay / sao tiêu (đổi quà, chơi) / trả nợ trong [tu, den). */
export async function thongKeSao(con: string, tu: Date, den: Date, t: Q = q) {
  const r = (await t<{ kiem: number; vay: number; tra: number; choi: number; qua: number; lan_vay: number }>(
    // #433 B1: sao kiếm trừ phần «Hoàn tác duyệt» (KIEM_SQL); sao tiêu đổi quà trừ phần hoàn của phiếu quà đã huỷ / quà bị xoá (hoan dương, ref =
    // phiếu); hoàn sao chơi trừ nhầm (hoan dương khác) trừ vào sao tiêu cho chơi
    `select coalesce(sum(delta) filter (where ${KIEM_SQL}), 0)::int as kiem,
            coalesce(sum(delta) filter (where loai = 'vay'), 0)::int as vay,
            coalesce(-sum(delta) filter (where loai = 'tra_no'), 0)::int as tra,
            greatest(0, coalesce(-sum(delta) filter (where loai in ('choi', 'phien', 'doi_gio')
              or (loai = 'hoan' and delta > 0 and coalesce(ref, '') not in (select id from redemptions where child_id = $1)
                  and coalesce(ref, '') not in (select id from submissions where child_id = $1))), 0))::int as choi,
            greatest(0, coalesce(-sum(delta) filter (where loai in ('doi_qua', 'voucher')
              or (loai = 'hoan' and delta > 0 and ref in (select id from redemptions where child_id = $1))), 0))::int as qua,
            (count(*) filter (where loai = 'vay' and delta > 0) - count(*) filter (where loai = 'vay' and delta < 0 and ref like 'hoan:%'))::int as lan_vay
       from points where child_id = $1 and created_at >= $2 and created_at < $3`, [con, tu, den]))[0];
  return { saoKiem: Math.max(0, r.kiem), saoVay: r.vay, lanVay: r.lan_vay, saoTraNo: r.tra, saoTieu: r.choi + r.qua, saoTieuChoi: r.choi, saoTieuQua: r.qua,
    /** 1 sao = 1 phút */ phutChoi: r.choi };
}

/** Ví sao của một Con cho app Ba Mẹ: số dư (âm được), nợ, «vay 45 · đã trả 25», lịch sử vay / trả / chơi / kiếm. */
export async function viSao(fam: string, con: string, o: { gioiHan?: number } = {}, now = new Date()) {
  const c = await one<{ ten: string; tz: string }>(`select c.ten, f.tz from children c join families f on f.id = c.family_id where c.id = $1 and c.family_id = $2`, [con, fam]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const tu7 = new Date(now.getTime() - 7 * 86_400_000);
  const [vi, ls, tuan, homNay] = await Promise.all([
    tomTatVi(con),
    dongSoSao(con, o.gioiHan ?? 50),
    thongKeSao(con, tu7, now),
    phutDaTruHomNay(q, con, c.tz, now),
  ]);
  return {
    ten: c.ten, sao: vi.sao, no: vi.no, phutCon: vi.phutCon, saoVayChuaTieu: vi.saoVayChuaTieu, hetSao: vi.hetSao, canhBaoNo: vi.canhBaoNo,
    tongVay: vi.tongVay, daTraNo: vi.daTraNo, saoGiu: vi.saoGiu, tyLe: { sao: 1, phut: 1 }, phutChoiHomNay: homNay,
    cau: cauSao({ sao: vi.sao, no: vi.no, phutCon: vi.phutCon, saoVayChuaTieu: vi.saoVayChuaTieu, hetSao: vi.hetSao, canhBaoNo: vi.canhBaoNo }),
    bayNgay: tuan,
    lichSu: ls.map((x) => ({ id: x.id, delta: x.delta, loai: x.loai, kieu: kieuSao(x.loai, x.delta), lyDo: x.ly_do, nguoi: x.nguoi, tenNguoi: x.ten_nguoi,
      luc: new Date(x.created_at).toISOString() })),
  };
}

type DongSoSao = { id: string; delta: number; loai: string; ly_do: string; nguoi: string | null; ten_nguoi: string | null; created_at: Date };
/** `gioiHan` dòng sổ sao mới nhất (kèm tên Ba Mẹ) — dùng chung ví sao Ba Mẹ và lịch sử sao của Con. */
const dongSoSao = (con: string, gioiHan: number, t: Q = q) => t<DongSoSao>(
  `select p.id, p.delta, p.loai, p.ly_do, p.nguoi, pa.ten as ten_nguoi, p.created_at from points p left join parents pa on pa.id = p.nguoi
    where p.child_id = $1 order by p.created_at desc, p.seq desc limit $2`, [con, Math.max(1, Math.min(200, Math.round(gioiHan) || 1))]);

export type KieuSao = "vay" | "hoan_vay" | "tra_no" | "choi" | "nhiem_vu" | "qua" | "khoi_dau" | "ba_me" | "khac";
/** Loại dòng sổ sao (ví sao Ba Mẹ + màn Con): vay / rút lại sao vay / trả nợ / chơi / nhiệm vụ / quà (đổi quà, hoàn quà, quà phút) / sao khởi đầu / Ba Mẹ cộng-trừ tay / khác. */
export const kieuSao = (l: string, d: number): KieuSao => (l === "vay" ? (d > 0 ? "vay" : "hoan_vay") : l === "tra_no" ? "tra_no"
  : l === "choi" || l === "phien" || l === "doi_gio" ? "choi" : l === "nhiem_vu" ? "nhiem_vu"
  : l === "doi_qua" || l === "voucher" || l === "qua_phut" || l === "hoan" ? "qua" : l === "khoi_dau" ? "khoi_dau" : l === "tay" ? "ba_me" : "khac");

/** Lịch sử sao gần đây cho màn Con (`kid/sao`, khay `hoc-vien/sao`) — cùng sổ với ví sao Ba Mẹ (`con/:id/vi-sao`).
 *  Mỗi dòng: loại thô + kiểu Con, số sao (+/−), lúc, chú thích (ly_do), tên Ba Mẹ (cho vay / cộng tay). */
export async function lichSuSaoCon(con: string, gioiHan = 20, t: Q = q) {
  return (await dongSoSao(con, Math.min(100, gioiHan), t)).map((x) => ({ id: x.id, loai: x.loai, kieu: kieuSao(x.loai, x.delta), sao: x.delta,
    luc: new Date(x.created_at).toISOString(), chuThich: x.ly_do, tenNguoi: x.ten_nguoi }));
}
