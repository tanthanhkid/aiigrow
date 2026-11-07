// «Chờ thay đổi» (P1, 07/11): Ba Mẹ đổi gì (khoá máy, chế độ chặn, chặn app/web, duyệt/từ chối xin, giờ…) ⇒ máy Con biết trong ≤5 giây.
// Cách làm: mỗi gia đình có MỘT số phiên bản `families.phien_ban_doi` — mọi lời gọi ghi (POST) của Ba Mẹ ở /api/m/* tăng nó (api-m.ts › xuLyM).
// Agent giữ `GET /api/device/cho-thay-doi?ver=<số đã thấy>`: máy chủ giữ yêu cầu tối đa ~25 giây và trả ngay khi số đổi.
//   • Trong cùng tiến trình: EventEmitter đánh thức tức thì (bắn sau khi UPDATE đã xong).
//   • Khác tiến trình / khởi động lại: mỗi `KIEM_DB_MS` (mặc định 4 giây) đọc lại số trong DB — một câu SELECT theo khoá chính,
//     KHÔNG giữ kết nối DB trong lúc chờ (mỗi lượt kiểm là một câu ngắn trả kết nối về hồ).
// Chỉ là «gõ cửa»: nội dung chính sách vẫn do dong-bo / nhip trả như cũ; mất kết nối / quá tải ⇒ agent quay về vòng 60 giây.
import { EventEmitter } from "node:events";
import { one, q } from "./db.ts";

export const CHO_TOI_DA_MS = Number(process.env.AIIGROW_CHO_TOI_DA_MS) || 25_000;
export const KIEM_DB_MS = Number(process.env.AIIGROW_CHO_KIEM_DB_MS) || 4_000;
/** Số yêu cầu chờ cùng lúc tối đa (VPS 1 vCPU / 2 GB): quá ⇒ trả ngay `{doi:false, quaTai:true}`, agent lùi lại. */
export const CHO_TOI_DA_YC = Number(process.env.AIIGROW_CHO_TOI_DA_YC) || 400;

const g = globalThis as unknown as { __aiigChoBus?: EventEmitter };
const bus = (g.__aiigChoBus ??= new EventEmitter());   // globalThis: /api/m và /api/device có thể là hai bản module (Next dev/HMR)
bus.setMaxListeners(0);
let dangCho = 0;
export const soDangCho = () => dangCho;

/** Số phiên bản hiện tại của gia đình (0 nếu chưa đổi lần nào / không có gia đình). */
export async function phienBanDoi(fam: string): Promise<number> {
  const r = await one<{ v: string | number }>(`select phien_ban_doi as v from families where id = $1`, [fam]);
  return r ? Number(r.v) : 0;
}

/** Ba Mẹ vừa đổi gì đó của gia đình ⇒ tăng số phiên bản + đánh thức mọi yêu cầu đang chờ (cùng tiến trình). Không ném lỗi. */
export async function baoThayDoi(fam: string): Promise<number | null> {
  try {
    const r = await q<{ v: string | number }>(`update families set phien_ban_doi = phien_ban_doi + 1 where id = $1 returning phien_ban_doi as v`, [fam]);
    const v = r[0] ? Number(r[0].v) : null;
    if (v != null) bus.emit(fam, v);
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
      // đăng ký nghe TRƯỚC khi đọc số ⇒ emit rơi vào giữa chừng không bị lỡ (đọc lại sau khi đã nghe)
      let bao = false, danh: () => void = () => {};
      const nghe = () => { bao = true; danh(); };
      bus.once(fam, nghe);
      try {
        cur = await phienBanDoi(fam);
        if (cur !== ver) return { phienBanThayDoi: cur, doi: true };
        if (!bao && !o.signal?.aborted) await new Promise<void>((xong) => {
          const end = () => { clearTimeout(t); o.signal?.removeEventListener("abort", end); xong(); };
          const t = setTimeout(end, Math.min(con, kiem));
          danh = end;
          o.signal?.addEventListener("abort", end, { once: true });
        });
      } finally { bus.off(fam, nghe); }
      if (o.signal?.aborted) break;
      if (bao) { cur = await phienBanDoi(fam); if (cur !== ver) return { phienBanThayDoi: cur, doi: true }; }
    }
    return { phienBanThayDoi: cur, doi: false };
  } finally { dangCho--; }
}
