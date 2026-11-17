// #337 (17/11): «Gói mất mạng theo bé» cho MÁY CHUNG (Windows / Mac / Android). Máy chủ chỉ gửi luật của bé ĐANG đăng nhập ở dong-bo / nhip ⇒
// mất mạng mà «Đổi người», bé sau từng dùng luật, khoá, giới hạn của bé trước. Gói này dựng sẵn luật của TỪNG bé được gán máy, đúng hình dạng
// agent đã đọc ở dong-bo (Windows / Mac: Policy + `windows`) hoặc nhip (Android: `chinhSach` + `nenTang`), để agent lưu riêng theo bé và dùng
// khi đổi bé lúc mất mạng. Bé chưa có gói (chưa tải lần nào) ⇒ agent khoá tới khi có mạng — không mượn luật bé khác.
// Lấy qua `GET /api/device/ho-so?offline=1` (agent mới; agent cũ không gửi ⇒ ho-so như cũ). Chỉ đọc, không ghi gì.
import type { May } from "./gia-dinh.ts";
import { coTacTu, chuyenDoi } from "./chuyen-doi.ts";
import { chinhSachChung } from "./chinh-sach.ts";
import { chinhSachWindows } from "./agent-windows.ts";
import { laMoHet, taoPolicy } from "./may-con.ts";
import { hanMoCuaMay, tuanThuMay } from "./tuan-thu.ts";
import { cheDoGuiMay } from "./lenh-may.ts";
import { appChanCuaMay, mucAppThat } from "./app-may.ts";
import { moRongPhienMay } from "./phien-windows.ts";
import { idConMay } from "./may-nhieu-con.ts";

/** Nền có gói mất mạng theo bé (máy chung chỉ Windows / Mac / Android — iPhone / iPad một bé). */
export const coGoiOffline = (nen: string) => coTacTu(nen) || nen === "android";

/** Luật của bé `con` trên máy `may` như thể bé đang đăng nhập (không ghi gì, không kèm bí mật mã offline — agent đã giữ). */
export async function goiOfflineBe(may: May, con: string, now = new Date()): Promise<Record<string, unknown> | null> {
  if (may.platform === "android") {
    const cs = await chinhSachChung(may, con, await tuanThuMay(may, now), now);
    return { serverTime: now.toISOString(), chinhSach: cs, nenTang: chuyenDoi(cs, "android") };
  }
  if (!coTacTu(may.platform)) return null;
  const pol = await taoPolicy(may, con, { gioMaySai: false }, now);
  const [moDen, moPhien, appThat, appNen, blockedApps] = await Promise.all([hanMoCuaMay(may, con, now), moRongPhienMay(may, con, now),
    mucAppThat(may.family_id), mucAppThat(may.family_id, may.platform), appChanCuaMay(may, con)]);
  const windows = chinhSachWindows(pol, undefined, cheDoGuiMay(may, false, true),
    { nen: may.platform === "mac" ? "mac" : "windows", moDen, conThuong: pol.quy?.conPhut ?? 0, appThat, appNen, ...(moPhien ?? {}) });
  windows.blockedApps = laMoHet(pol) ? [] : blockedApps;
  return { ...pol, windows };
}

/** Gói của mọi bé được gán máy chung: `{ <id bé>: gói }`. Máy riêng / nền không hỗ trợ ⇒ null. Lỗi một bé không làm hỏng bé khác (bé đó không có gói ⇒ agent khoá khi mất mạng). */
export async function goiOfflineMay(may: May, now = new Date()): Promise<Record<string, Record<string, unknown>> | null> {
  if (!coGoiOffline(may.platform)) return null;
  const ds = await idConMay(may.id);
  if (ds.length < 2) return null;
  const ra: Record<string, Record<string, unknown>> = {};
  for (const c of ds) {
    try { const g = await goiOfflineBe(may, c, now); if (g) ra[c] = g; } catch (e) { console.error("goiOfflineBe lỗi", c, e); }
  }
  return ra;
}

/** Danh sách bé được gán máy (thứ tự gán) — gắn vào dong-bo / nhip (`dsCon`) để agent thấy Ba Mẹ đổi gán NGAY lượt đồng bộ do «chờ thay đổi»
 *  đánh thức (#339), không chờ chu kỳ tải lại ho-so 30 phút: lệch với danh sách đang nhớ ⇒ tải lại ho-so; bé đang dùng không còn trong danh sách ⇒ đẩy ra. */
export const dsConMay = (mayId: string) => idConMay(mayId);
