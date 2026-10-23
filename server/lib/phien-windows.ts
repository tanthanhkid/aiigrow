// Nhịp phiên chơi của máy Windows lấy từ dong-bo (agent-win KHÔNG gửi phien/nhip) — PR #58 + bản 0.2.4:
//   • «Đang dùng thật» (BRD 4.4: app ở nền trước, màn hình mở) đọc từ `status.foregroundApp` khi agent 0.2.4+ gửi trường này;
//     agent cũ (0.2.0–0.2.3, không có trường) giữ đúng như #58: `childSessionActive !== false`.
//   • Máy dùng chung (devices.child_id null, Con chọn bằng PIN trên trang khay): agent không gửi X-Phien-Con ⇒ Con của nhịp lấy từ
//     phiên đang chạy/tạm MỞ TRÊN CHÍNH MÁY NÀY (cùng gia đình). Chỉ dùng cho nhịp phiên và gửi bù — không đổi Con của Policy.
//   • Đồng bộ của HeartbeatWorker (status chỉ có agent/version/online/cheDo, KHÔNG có childSessionActive) không phải nguồn nhịp:
//     nó luôn «đang dùng» nên xen vào giữa các nhịp của vòng thực thi sẽ xoá mốc tạm dừng (khoá màn hình không bao giờ đóng phiên).
import { one } from "./db.ts";
import type { May } from "./gia-dinh.ts";
import { TRINH_DUYET } from "./agent-windows.ts";
import { dungPhien, nhip, phienDang, type KetNhip } from "./phien.ts";
import { khoaTuanThu } from "./tuan-thu.ts";

const exe = (s: string) => s.toLowerCase().endsWith(".exe");

/** Trạng thái agent gửi trong dong-bo (chỉ các trường dùng cho nhịp phiên). */
export type TrangThaiNhip = { childSessionActive?: unknown; foregroundApp?: unknown };

/** Lượt dong-bo này có phải nhịp của vòng thực thi agent không (có `childSessionActive` boolean — mọi bản agent-win đều gửi; heartbeat thì không). */
export const laNhipThucThi = (st: TrangThaiNhip | undefined) => typeof st?.childSessionActive === "boolean";

/** «Đang dùng thật» cho phiên `muc`:
 *  - Con không còn đăng nhập (childSessionActive false) ⇒ false.
 *  - Không có trường `foregroundApp` (agent cũ) ⇒ true (như #58).
 *  - `foregroundApp` null / không phải chuỗi (khay chết — agent không biết tiền cảnh) ⇒ true: Con tắt khay không ngừng được đồng hồ.
 *  - "" (khay báo không có cửa sổ tiền cảnh = màn hình khoá) ⇒ false.
 *  - Trùng app của phiên (không phân biệt hoa thường), hoặc phiên web và tiền cảnh là trình duyệt ⇒ true; app khác (vd app học) ⇒ false. */
export function dangDungTuStatus(st: TrangThaiNhip | undefined, muc: string): boolean {
  if (st?.childSessionActive === false) return false;
  if (!st || !("foregroundApp" in st)) return true;
  const fg = st.foregroundApp;
  if (typeof fg !== "string") return true;
  const f = fg.trim().toLowerCase();
  if (!f) return false;
  const m = muc.trim().toLowerCase();
  return exe(m) ? f === m : TRINH_DUYET.includes(f);
}

type PhienMay = { id: string; child_id: string; muc: string; device_id: string | null; trang_thai: string };

/** Phiên đang chạy/tạm mở trên máy này: `con` có ⇒ phiên của Con đó (phải mở trên máy này); không ⇒ (máy dùng chung) phiên mở trên
 *  máy này của một Con CÙNG gia đình với máy. */
export async function phienCuaMay(may: May, con: string | null): Promise<PhienMay | undefined> {
  if (con) {
    const ph = await phienDang(con);
    return ph && ph.device_id === may.id ? { ...ph, child_id: con } : undefined;
  }
  return one<PhienMay>(
    `select s.id, s.child_id, s.muc, s.device_id, s.trang_thai from play_sessions s join children c on c.id = s.child_id
     where s.device_id = $1 and c.family_id = $2 and s.trang_thai in ('chay', 'tam') order by s.bat_dau desc limit 1`, [may.id, may.family_id]);
}

/** Một lượt dong-bo của máy Windows ⇒ nhịp phiên (nếu có). Máy không tuân thủ ⇒ đóng phiên (ba_me_khoa). → kết quả nhịp hoặc null. */
export async function nhipPhienWindows(may: May, con: string | null, st: TrangThaiNhip | undefined, now = new Date()): Promise<KetNhip | null> {
  if (may.platform !== "windows" || !laNhipThucThi(st)) return null;
  const ph = await phienCuaMay(may, con);
  if (!ph) return null;
  if ((await khoaTuanThu(may, now)).khoa) { await dungPhien(ph.child_id, ph.id, "ba_me_khoa", now); return null; }
  return nhip(ph.child_id, ph.id, dangDungTuStatus(st, ph.muc), now);
}

/** Con của lần gửi bù `phien/bu`: máy riêng / có PIN ⇒ `con`; máy dùng chung ⇒ Con của phiên `id` — phiên phải mở trên chính máy này
 *  và Con cùng gia đình với máy. Không xác định được ⇒ null. */
export async function conChoBu(may: May, con: string | null, id: unknown): Promise<string | null> {
  if (con) return con;
  if (!id) return null;
  const r = await one<{ child_id: string }>(
    `select s.child_id from play_sessions s join children c on c.id = s.child_id where s.id = $1 and s.device_id = $2 and c.family_id = $3`,
    [String(id), may.id, may.family_id]);
  return r?.child_id ?? null;
}

/** Giá + phần lẻ đang nợ của phiên — cho `playOfflineMinutes` (agent-windows.ts › phutChoiOffline). */
export async function tienPhien(id: string) {
  const r = await one<{ gia_phan_nghin: number; phan_nghin_tru: number; diem_tru: number }>(
    `select gia_phan_nghin, phan_nghin_tru, diem_tru from play_sessions where id = $1`, [id]);
  return r ? { giaPhanNghin: r.gia_phan_nghin, noPhanNghin: Math.max(0, r.phan_nghin_tru - r.diem_tru * 1000) } : undefined;
}
