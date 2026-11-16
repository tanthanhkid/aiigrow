// GIỚI HẠN GIỜ CHƠI (#302 mục 4, 16/11/2026) — chồng lên luật «1 sao = 1 phút» (#264, lib/so-sao.ts), KHÔNG phải quỹ phút miễn phí:
//   • Giới hạn ngày (ngày thường / T7–CN): phút «Tính phút» tối đa trong ngày. Bé chơi được min(giới hạn ngày còn lại, sao tiêu được [gồm sao vay]).
//     Hết giới hạn ngày ⇒ khoá tới hôm sau dù còn sao. Ba Mẹ cho thêm = CHO VAY sao (cơ chế có sẵn): sao vay hôm nay (trừ vay để đổi quà) cộng
//     vào giới hạn của hôm nay và kết thúc lượt nghỉ đang chạy.
//   • Mỗi lượt tối đa N phút: chơi đủ N phút ⇒ máy khoá NGHỈ đúng N phút (2h/ngày, 30p/lượt ⇒ chơi 30 nghỉ 30), hết nghỉ thì lượt mới.
//     Nghỉ không tốn sao (máy khoá nên không có phút chơi để trừ). Bé tự dừng ≥ N phút cũng coi như đã nghỉ ⇒ lượt sau tính lại từ 0.
//   • «Mở hết» (#262): không chặn, không đếm ⇒ giới hạn không áp dụng.
// Lượt tính trên ĐỒNG HỒ MÁY CHỦ của phút «Tính phút» (bảng choi_tru — so-sao.ts › tinhPhutChoi ghi mỗi lần trừ: chơi trong (luc − phut, luc]),
// chung cho mọi máy của Con ⇒ chơi trên PC rồi qua iPad vẫn là một lượt.
// Cấu hình lưu theo Con ở children.cau_hinh: gh_ngay_thuong, gh_cuoi_tuan, gh_moi_luot (phút; 0 / thiếu = không giới hạn).
import { LoiNghiepVu } from "./loi.ts";
import { dauNgayUtc, gioDiaPhuong, laCuoiTuan } from "./gio.ts";
import type { Q } from "./db.ts";

/** Khoảng «Tự chọn» của ô số phút trên app Ba Mẹ (màn Lần đầu bm1-ob-gio v21 + Giờ chơi trong hồ sơ Con). */
export const GH_NGAY = { min: 10, max: 720 } as const;
export const GH_LUOT = { min: 5, max: 240 } as const;

export type CauHinhGioiHan = { ngayThuong: number; cuoiTuan: number; moiLuot: number };

export type GioiHanChoi = {
  /** có giới hạn nào đang áp dụng không (false: không đặt gì hoặc đang «Mở hết») */ apDung: boolean;
  cauHinh: CauHinhGioiHan;
  /** giới hạn hôm nay (phút, đã cộng sao Ba Mẹ cho vay hôm nay) — null = không giới hạn ngày */ ngayPhut: number | null;
  /** sao vay để chơi hôm nay đã cộng vào giới hạn ngày */ themHomNay: number;
  /** phút «Tính phút» đã chơi hôm nay */ daChoi: number;
  /** phút còn trong giới hạn ngày — null = không giới hạn */ conNgay: number | null;
  /** phút mỗi lượt (= phút nghỉ) — null = không giới hạn lượt */ luotPhut: number | null;
  /** lượt hiện tại bắt đầu lúc (ISO) — null = chưa chơi / đã nghỉ đủ */ luotBatDau: string | null;
  /** phút đã chơi trong lượt hiện tại */ luotDaChoi: number;
  /** phút còn trong lượt — null = không giới hạn lượt */ conLuot: number | null;
  /** đang nghỉ giữa hai lượt tới `nghiDen` (ISO) */ dangNghi: boolean; nghiDen: string | null;
  /** «HH:MM» giờ gia đình của nghiDen */ nghiDenGio: string | null;
  /** hết giới hạn hôm nay ⇒ khoá tới hôm sau */ hetNgay: boolean;
  /** lý do khoá nhóm «Tính phút» do giới hạn (không tính hết sao) */ lyDoKhoa: "het_gio_ngay" | "dang_nghi" | null;
  /** phút chơi được tối đa theo giới hạn (min conNgay, conLuot; 0 khi nghỉ / hết ngày) — null = không giới hạn */ phutToiDa: number | null;
  /** câu sẵn cho máy Con / app: «Nghỉ một chút · chơi tiếp lúc 16:30» · «Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé» · «Còn 25 phút hôm nay» */
  cau: string | null;
  /** dòng giải thích cho Ba Mẹ: «Mỗi ngày tối đa 60 phút · mỗi lượt 30 phút rồi nghỉ 30 phút · chơi bằng sao» */
  moTa: string;
};

const so = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };

/** Cấu hình đang lưu của Con (thiếu = 0 = không giới hạn). */
export function cauHinhCua(cfg: Record<string, unknown> | null | undefined): CauHinhGioiHan {
  const c = cfg ?? {};
  return { ngayThuong: so(c.gh_ngay_thuong), cuoiTuan: so(c.gh_cuoi_tuan), moiLuot: so(c.gh_moi_luot) };
}

/** Kiểm giá trị Ba Mẹ gửi — 0 / null = không giới hạn; ngoài khoảng ⇒ lỗi rõ (không kẹp lặng lẽ). undefined = không đổi. */
export function kiemGioiHan(v: unknown, k: { min: number; max: number }, ten: string): number | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "" || v === 0 || v === "0") return 0;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < k.min || n > k.max) throw new LoiNghiepVu("gioi_han_sai", `${ten}: từ ${k.min} đến ${k.max} phút (hoặc Không giới hạn)`);
  return n;
}

/** Thân gửi lên (gioiHanNgayThuong, gioiHanCuoiTuan, phutMoiLuot) ⇒ phần cau_hinh cần ghi (chỉ khoá có gửi). */
export function phanGhi(b: Record<string, unknown>): Record<string, number> {
  const r: Record<string, number> = {};
  const nt = kiemGioiHan(b.gioiHanNgayThuong, GH_NGAY, "Giới hạn ngày thường");
  const ct = kiemGioiHan(b.gioiHanCuoiTuan, GH_NGAY, "Giới hạn T7, CN");
  const ml = kiemGioiHan(b.phutMoiLuot, GH_LUOT, "Mỗi lượt tối đa");
  if (nt !== undefined) r.gh_ngay_thuong = nt;
  if (ct !== undefined) r.gh_cuoi_tuan = ct;
  if (ml !== undefined) r.gh_moi_luot = ml;
  return r;
}

/** «Mỗi ngày tối đa 60 phút (T7, CN 90 phút) · mỗi lượt 30 phút rồi nghỉ 30 phút · chơi bằng sao». */
export function moTaGioiHan(c: CauHinhGioiHan): string {
  const ngay = !c.ngayThuong && !c.cuoiTuan ? "Mỗi ngày không giới hạn"
    : c.ngayThuong === c.cuoiTuan ? `Mỗi ngày tối đa ${c.ngayThuong} phút`
    : !c.cuoiTuan ? `Ngày thường tối đa ${c.ngayThuong} phút · cuối tuần không giới hạn`
    : !c.ngayThuong ? `Ngày thường không giới hạn · cuối tuần tối đa ${c.cuoiTuan} phút`
    : `Mỗi ngày tối đa ${c.ngayThuong} phút (T7, CN ${c.cuoiTuan} phút)`;
  const luot = c.moiLuot ? `mỗi lượt ${c.moiLuot} phút rồi nghỉ ${c.moiLuot} phút` : "mỗi lượt không giới hạn";
  return `${ngay} · ${luot} · chơi bằng sao`;
}

const hhmm = (d: Date, tz: string) => { const p = gioDiaPhuong(d, tz).phut; return `${String(Math.floor(p / 60)).padStart(2, "0")}:${String(p % 60).padStart(2, "0")}`; };
const tron1 = (x: number) => Math.round(x * 10) / 10;

export type DoanChoi = { luc: Date; phut: number };

/** Lượt + nghỉ — hàm thuần. `doan`: phút chơi theo đồng hồ máy chủ (mỗi đoạn = (luc − phut, luc]); `moLai`: mốc Ba Mẹ cho vay (kết thúc nghỉ,
 *  bắt đầu lượt mới). Nghỉ đúng `luot` phút sau khi lượt đủ `luot` phút; khoảng không chơi ≥ `luot` phút cũng coi như đã nghỉ. */
export function tinhLuot(doan: DoanChoi[], moLai: Date[], luot: number, now: Date) {
  const ms = luot * 60_000;
  const reset = moLai.map((d) => d.getTime()).filter((x) => x <= now.getTime()).sort((a, b) => a - b);
  let daChoi = 0, batDau: number | null = null, cuoi: number | null = null, nghiDen: number | null = null;
  const coReset = (tu: number, den: number) => reset.some((x) => x > tu && x <= den);
  for (const d of [...doan].sort((a, b) => a.luc.getTime() - b.luc.getTime())) {
    const e = d.luc.getTime();
    if (e > now.getTime()) continue;
    let s = e - d.phut * 60_000;
    if (nghiDen !== null) {
      // phút báo trễ rơi trong lúc nghỉ (agent mất mạng / lệch nhịp): không kéo dài nghỉ; phần sau giờ nghỉ là lượt mới
      if (coReset(nghiDen - ms, e)) nghiDen = null;
      else if (e <= nghiDen) continue;
      else { s = Math.max(s, nghiDen); nghiDen = null; }
      daChoi = 0; batDau = null; cuoi = null;
    }
    if (cuoi !== null && (s - cuoi >= ms || coReset(cuoi, e))) { daChoi = 0; batDau = null; }
    if (batDau === null) batDau = s;
    const phut = (e - s) / 60_000;
    daChoi += phut; cuoi = e;
    if (luot - daChoi < 1 - 1e-6) {                     // còn < 1 phút ⇒ coi như đủ lượt (máy làm tròn xuống phút chơi được ⇒ 0)
      const du = daChoi - luot;                         // phút vượt (âm: phần lẻ chưa chơi) — nghỉ tính từ lúc đủ lượt
      nghiDen = e - du * 60_000 + ms;
    }
  }
  const t = now.getTime();
  if (nghiDen !== null && (nghiDen <= t || coReset(nghiDen - ms, t))) { nghiDen = null; daChoi = 0; batDau = null; cuoi = null; }
  if (nghiDen !== null) return { dangNghi: true, nghiDen: new Date(nghiDen), luotBatDau: null, luotDaChoi: 0, conLuot: 0 };
  if (cuoi !== null && (t - cuoi >= ms || coReset(cuoi, t))) { daChoi = 0; batDau = null; }
  return { dangNghi: false, nghiDen: null, luotBatDau: batDau !== null ? new Date(batDau) : null, luotDaChoi: tron1(daChoi), conLuot: tron1(Math.max(0, luot - daChoi)) };
}

/** Trạng thái giới hạn của Con lúc `now`. `daChoi` = phút «Tính phút» đã dùng hôm nay (quy-gio › quyHomNay.daDung). */
/** Trạng thái giới hạn của Con lúc `now`. Phút đã chơi hôm nay = phút «Tính phút» theo đồng hồ máy chủ (choi_tru — chỉ ghi ở chế độ có đếm,
 *  KHÔNG gồm phút lúc «Mở hết»). Ba truy vấn chạy song song. */
export async function gioiHanCua(t: Q, con: string, cfg: Record<string, unknown> | null | undefined, tz: string,
  o: { moHet: boolean }, now = new Date()): Promise<GioiHanChoi> {
  const c = cauHinhCua(cfg);
  const g = gioDiaPhuong(now, tz);
  const goc = laCuoiTuan(g.thu) ? c.cuoiTuan : c.ngayThuong;
  const moTa = moTaGioiHan(c);
  const khong: GioiHanChoi = { apDung: false, cauHinh: c, ngayPhut: null, themHomNay: 0, daChoi: 0, conNgay: null, luotPhut: null,
    luotBatDau: null, luotDaChoi: 0, conLuot: null, dangNghi: false, nghiDen: null, nghiDenGio: null, hetNgay: false, lyDoKhoa: null, phutToiDa: null,
    cau: null, moTa };
  if (o.moHet || (!goc && !c.moiLuot)) return khong;
  const dau = dauNgayUtc(g.ngay, tz);
  const tuLuot = new Date(now.getTime() - Math.max(c.moiLuot * 4, 180) * 60_000);
  const [vay, doanRaw, ngay] = await Promise.all([
    // sao Ba Mẹ cho vay (trừ vay ĐỔI QUÀ — points.muc_dich; dòng hoàn tác «hoan:<id>» theo mục đích của khoản gốc) — cộng vào giới hạn hôm nay + kết thúc nghỉ
    t<{ delta: number; created_at: Date }>(
      `select p.delta, p.created_at from points p left join points g on p.ref like 'hoan:%' and g.id = substr(p.ref, 6)
        where p.child_id = $1 and p.loai = 'vay' and p.created_at >= $2 and p.created_at <= $3
          and coalesce(p.muc_dich, g.muc_dich, '') <> 'qua'`, [con, new Date(Math.min(dau.getTime(), tuLuot.getTime())), now]),
    c.moiLuot ? t<{ luc: Date; phut: number }>(`select luc, phut from choi_tru where child_id = $1 and luc > $2 and luc <= $3 order by luc`, [con, tuLuot, now])
      : Promise.resolve([] as { luc: Date; phut: number }[]),
    t<{ p: number }>(`select coalesce(sum(phut), 0)::real as p from choi_tru where child_id = $1 and luc > $2 and luc <= $3`, [con, dau, now]),
  ]);
  const daChoi = Number(ngay[0]?.p ?? 0);
  const themHomNay = Math.max(0, vay.filter((v) => new Date(v.created_at) >= dau).reduce((s, v) => s + Number(v.delta), 0));
  const ngayPhut = goc ? goc + themHomNay : null;
  const conNgay = ngayPhut !== null ? tron1(Math.max(0, ngayPhut - daChoi)) : null;
  let l = { dangNghi: false, nghiDen: null as Date | null, luotBatDau: null as Date | null, luotDaChoi: 0, conLuot: null as number | null };
  if (c.moiLuot) {
    const doan = doanRaw.map((r) => ({ luc: new Date(r.luc), phut: Number(r.phut) }));
    l = tinhLuot(doan, vay.filter((v) => Number(v.delta) > 0).map((v) => new Date(v.created_at)), c.moiLuot, now);
  }
  const hetNgay = conNgay !== null && conNgay < 1 - 1e-6;   // còn < 1 phút ⇒ hết (máy làm tròn xuống phút chơi được ⇒ 0)
  const lyDoKhoa = hetNgay ? "het_gio_ngay" as const : l.dangNghi ? "dang_nghi" as const : null;
  const phutToiDa = lyDoKhoa ? 0 : conNgay === null && l.conLuot === null ? null : Math.min(conNgay ?? Infinity, l.conLuot ?? Infinity);
  const nghiDenGio = l.nghiDen ? hhmm(l.nghiDen, tz) : null;
  const cau = hetNgay ? `Hôm nay đã chơi đủ ${ngayPhut} phút — mai chơi tiếp nhé`
    : l.dangNghi ? `Nghỉ một chút · chơi tiếp lúc ${nghiDenGio}`
    : conNgay !== null ? `Còn ${Math.floor(conNgay)} phút hôm nay` : null;
  return { apDung: true, cauHinh: c, ngayPhut, themHomNay, daChoi: tron1(daChoi), conNgay, luotPhut: c.moiLuot || null,
    luotBatDau: l.luotBatDau?.toISOString() ?? null, luotDaChoi: l.luotDaChoi, conLuot: l.conLuot, dangNghi: l.dangNghi,
    nghiDen: l.nghiDen?.toISOString() ?? null, nghiDenGio, hetNgay, lyDoKhoa, phutToiDa, cau, moTa };
}
