// «Chờ thay đổi» (P1, 07/11; cách A 12/11): Ba Mẹ đổi gì (khoá máy, chế độ chặn, chặn app/web, duyệt/từ chối xin, giờ…) ⇒ máy Con biết trong ≤5 giây.
// Mỗi gia đình có MỘT số phiên bản `families.phien_ban_doi` — mọi lời gọi ghi (POST) của Ba Mẹ ở /api/m/* tăng nó (api-m.ts › xuLyM).
// Agent giữ `GET /api/device/cho-thay-doi?ver=<số đã thấy>`: máy chủ giữ yêu cầu tối đa ~25 giây và trả ngay khi số đổi.
//
// Cách A (anh Thành chốt 12/11): máy chủ nghe DB MỘT lần cho tất cả máy, không để mỗi máy đang chờ tự hỏi DB 4 giây/lần.
//   • baoThayDoi: UPDATE + `pg_notify('aiig_doi', '<fam>:<số>')` trong cùng một câu ⇒ DB báo khi giao dịch xong.
//   • Một kết nối LISTEN duy nhất (postgres.js giữ riêng, tự nối lại) nhận báo ⇒ ghi số vào bộ nhớ + đánh thức các yêu cầu đang chờ.
//   • Đang nghe được thì số phiên bản đọc từ bộ nhớ (mỗi gia đình đọc lại DB tối đa 1 lần / `BO_NHO_MS` cho chắc) ⇒ máy chờ không chạm DB.
//   • Chưa nghe được / mất nghe (khởi động, DB rớt) ⇒ quay về cách cũ: mỗi `KIEM_DB_MS` đọc số trong DB.
// Chỉ là «gõ cửa»: nội dung chính sách vẫn do dong-bo / nhip trả như cũ; mất kết nối / quá tải ⇒ agent quay về vòng 60 giây.
import { EventEmitter } from "node:events";
import { nghe, one } from "./db.ts";

export const KENH = "aiig_doi";
export const CHO_TOI_DA_MS = Number(process.env.AIIGROW_CHO_TOI_DA_MS) || 25_000;
/** Chỉ dùng khi CHƯA nghe được DB (cách cũ). */
export const KIEM_DB_MS = Number(process.env.AIIGROW_CHO_KIEM_DB_MS) || 4_000;
/** Số trong bộ nhớ quá hạn này thì đọc lại DB một lần (đề phòng báo rơi khi kết nối nghe vừa rớt). */
export const BO_NHO_MS = Number(process.env.AIIGROW_CHO_BO_NHO_MS) || 60_000;
/** Số yêu cầu chờ cùng lúc tối đa: quá ⇒ trả ngay `{doi:false, quaTai:true}`, agent lùi lại. Cách A: yêu cầu chờ chỉ tốn bộ nhớ + 1 socket, không tốn DB. */
export const CHO_TOI_DA_YC = Number(process.env.AIIGROW_CHO_TOI_DA_YC) || 3_000;
/** Công tắc quay lại: `AIIGROW_CHO_NGHE_DB=0` ⇒ không nghe DB, chạy như cách cũ (đọc DB mỗi KIEM_DB_MS). */
const TAT_NGHE = process.env.AIIGROW_CHO_NGHE_DB === "0";

type TrangThai = { bus: EventEmitter; dangNghe: boolean; batDau?: Promise<void>; boNho: Map<string, { v: number; luc: number }> };
const g = globalThis as unknown as { __aiigCho?: TrangThai };   // globalThis: /api/m và /api/device có thể là hai bản module (Next dev/HMR)
const s: TrangThai = (g.__aiigCho ??= { bus: new EventEmitter(), dangNghe: false, boNho: new Map() } as TrangThai);
s.bus.setMaxListeners(0);
const NGHE_LAI = "*nghe-lai";
let dangCho = 0;
export const soDangCho = () => dangCho;
export const dangNgheDb = () => s.dangNghe;

/** Ghi số mới vào bộ nhớ (chỉ tăng — số phiên bản không bao giờ lùi) rồi đánh thức các yêu cầu đang chờ của gia đình. */
function nhanSo(fam: string, v: number) {
  const cu = s.boNho.get(fam);
  if (!cu || v >= cu.v) s.boNho.set(fam, { v, luc: Date.now() });
  s.bus.emit(fam, v);
}

/** Bật nghe DB (một lần cho cả tiến trình). Lỗi ⇒ dangNghe=false, lần gọi sau thử lại. */
export function batNghe(): Promise<void> {
  s.batDau ??= nghe(KENH, (p) => {
    const i = p.lastIndexOf(":");
    const v = Number(p.slice(i + 1));
    if (i > 0 && Number.isFinite(v)) nhanSo(p.slice(0, i), v);
  }, () => {
    // (re)LISTEN xong: báo trong lúc rớt có thể đã mất ⇒ bỏ bộ nhớ, mọi yêu cầu đang chờ đọc lại DB một lần
    s.boNho.clear();
    s.dangNghe = true;
    s.bus.emit(NGHE_LAI);
  }).catch((e) => {
    console.error("không nghe được DB — chờ thay đổi quay về đọc DB mỗi", KIEM_DB_MS, "ms", e);
    s.dangNghe = false;
    s.batDau = undefined;
  });
  return s.batDau;
}

/** Chỉ cho test: giả mất nghe DB (quay về cách cũ) hoặc bật lại. */
export function _giaMatNghe(mat: boolean) { s.dangNghe = !mat; s.boNho.clear(); }

/** Số phiên bản hiện tại của gia đình (0 nếu chưa đổi lần nào / không có gia đình). Đang nghe DB ⇒ đọc bộ nhớ. */
export async function phienBanDoi(fam: string): Promise<number> {
  const nho = s.boNho.get(fam);
  if (s.dangNghe && nho && Date.now() - nho.luc < BO_NHO_MS) return nho.v;
  const r = await one<{ v: string | number }>(`select phien_ban_doi as v from families where id = $1`, [fam]);
  const v = r ? Number(r.v) : 0;
  if (s.dangNghe && r) { const cu = s.boNho.get(fam); if (!cu || v >= cu.v) s.boNho.set(fam, { v, luc: Date.now() }); }
  return v;
}

/** Ba Mẹ vừa đổi gì đó của gia đình ⇒ tăng số phiên bản + báo DB (mọi tiến trình máy chủ nghe được) + đánh thức ngay trong tiến trình này. Không ném lỗi. */
export async function baoThayDoi(fam: string): Promise<number | null> {
  try {
    const r = await one<{ v: string | number }>(
      `with u as (update families set phien_ban_doi = phien_ban_doi + 1 where id = $1 returning id, phien_ban_doi)
       select phien_ban_doi as v, pg_notify('${KENH}', id || ':' || phien_ban_doi) from u`, [fam]);
    const v = r ? Number(r.v) : null;
    if (v != null) nhanSo(fam, v);
    return v;
  } catch (e) {
    console.error("báo thay đổi lỗi (agent vẫn kịp theo vòng 60 giây)", e);
    return null;
  }
}

export type KetQuaCho = { phienBanThayDoi: number; doi: boolean; quaTai?: true };

/**
 * Giữ tới khi số phiên bản ≠ `ver` hoặc hết `toiDaMs`. `ver` thiếu / không hợp lệ ⇒ trả ngay số hiện tại (`doi:false`) để agent lấy mốc.
 * `signal` huỷ (agent ngắt kết nối) ⇒ dừng chờ, không để lại bộ đếm.
 */
export async function choThayDoi(fam: string, ver: number | null, o: { toiDaMs?: number; kiemDbMs?: number; signal?: AbortSignal } = {}): Promise<KetQuaCho> {
  const toiDa = o.toiDaMs ?? CHO_TOI_DA_MS, kiem = o.kiemDbMs ?? KIEM_DB_MS;
  if (!s.dangNghe && !TAT_NGHE) void batNghe();
  let cur = await phienBanDoi(fam);
  if (ver == null || !Number.isFinite(ver)) return { phienBanThayDoi: cur, doi: false };
  if (cur !== ver) return { phienBanThayDoi: cur, doi: true };
  if (dangCho >= CHO_TOI_DA_YC) return { phienBanThayDoi: cur, doi: false, quaTai: true };
  dangCho++;
  const han = Date.now() + toiDa;
  try {
    while (!o.signal?.aborted) {
      const con = han - Date.now();
      if (con <= 0) break;
      // đăng ký nghe TRƯỚC khi đọc số ⇒ báo rơi vào giữa chừng không bị lỡ
      let bao = false, danh: () => void = () => {};
      const nghe1 = () => { bao = true; danh(); };
      s.bus.once(fam, nghe1); s.bus.once(NGHE_LAI, nghe1);
      try {
        cur = await phienBanDoi(fam);
        if (cur !== ver) return { phienBanThayDoi: cur, doi: true };
        // đang nghe DB ⇒ ngủ tới hết hạn (chỉ báo mới đánh thức); chưa nghe ⇒ đọc DB lại sau `kiem`
        if (!bao && !o.signal?.aborted) await new Promise<void>((xong) => {
          const end = () => { clearTimeout(t); o.signal?.removeEventListener("abort", end); xong(); };
          const t = setTimeout(end, s.dangNghe ? con : Math.min(con, kiem));
          danh = end;
          o.signal?.addEventListener("abort", end, { once: true });
        });
      } finally { s.bus.off(fam, nghe1); s.bus.off(NGHE_LAI, nghe1); }
      if (o.signal?.aborted) break;
      if (bao) { cur = await phienBanDoi(fam); if (cur !== ver) return { phienBanThayDoi: cur, doi: true }; }
    }
    return { phienBanThayDoi: cur, doi: false };
  } finally { dangCho--; }
}
