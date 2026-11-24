// #337 (17/11): «Gói mất mạng theo bé» cho MÁY CHUNG (Windows / Mac / Android). Máy chủ chỉ gửi luật của bé ĐANG đăng nhập ở dong-bo / nhip ⇒
// mất mạng mà «Đổi người», bé sau từng dùng luật, khoá, giới hạn của bé trước. Gói này dựng sẵn luật của TỪNG bé được gán máy, đúng hình dạng
// agent đã đọc ở dong-bo (Windows / Mac: Policy + `windows`, dựng bằng CÙNG hàm `dungWindows` với dong-bo) hoặc nhip (Android: `chinhSach` +
// `nenTang` + `grantEndsAt`/`moDen`), để agent lưu riêng theo bé và dùng khi đổi bé lúc mất mạng. Bé chưa có gói ⇒ agent khoá tới khi có mạng.
// Lấy qua `GET /api/device/ho-so?offline=1` (agent mới; agent cũ không gửi ⇒ ho-so như cũ). Chỉ đọc, không ghi gì.
import type { May } from "./gia-dinh.ts";
import { coCuaSoThemGio, coTacTu, chuyenDoi } from "./chuyen-doi.ts";
import { chinhSachChung } from "./chinh-sach.ts";
import { chinhSachWindows } from "./agent-windows.ts";
import { laMoHet, taoPolicy, type Policy } from "./may-con.ts";
import { biMatOfflineMay, hanMoCuaMay, tuanThuMay } from "./tuan-thu.ts";
import { cheDoGuiMay, lenhCho } from "./lenh-may.ts";
import { appChanCuaMay, mucAppThat, tinHieuDanhSachApp } from "./app-may.ts";
import { ghepPhienMayChung, laAgentMoi, moRongPhienMay, type TrangThaiNhip } from "./phien-windows.ts";
import { idConMay } from "./may-nhieu-con.ts";
import { chinhSachWebCho } from "./web.ts";

/** Phần không phụ thuộc bé (đọc một lần cho cả máy). */
type ChungMay = { biMat: string | null; appThat?: Set<string>; appNen?: Set<string> };
const chungMay = async (may: May): Promise<ChungMay> => {
  if (!coTacTu(may.platform)) return { biMat: null };
  const coSan = (may as { offline_secret?: string | null }).offline_secret;   // hàng devices đã nạp từ token (select *) ⇒ khỏi đọc lại
  const [biMat, appThat, appNen] = await Promise.all([coSan ? Promise.resolve(coSan) : biMatOfflineMay(may.id), mucAppThat(may.family_id), mucAppThat(may.family_id, may.platform)]);
  return { biMat, appThat, appNen };
};

/** Khối `windows` (Windows / Mac) của dong-bo — dùng chung cho dong-bo và gói mất mạng theo bé. `lenh` = lệnh đang chờ (gỡ ⇒ ép giám sát),
 *  `bmDen` = Ba Mẹ đang dùng máy tới lúc này, `status` = status agent gửi (máy chung + agent 0.2.4 ⇒ ghép phiên vào Policy chung). */
export async function dungWindows(may: May, pol: Policy, con: string | null,
  o: { lenh: { loai: string }[]; bmDen: Date | null; status?: TrangThaiNhip; chung?: ChungMay }) {
  const tac = coTacTu(may.platform);
  // Kèm bí mật mã mở offline cho máy Windows (agent cache khi còn mạng để tự kiểm mã lúc mất mạng).
  const ch = o.chung ?? await chungMay(may);
  // Đang có lệnh gỡ chờ ⇒ ép giám sát: lỡ gỡ hỏng giữa chừng thì máy Con cũng không còn bị chặn (không «dính» lại).
  // Ba Mẹ chưa chọn chế độ ⇒ không gửi (agent giữ chế độ đang chạy và báo lên trong status.cheDo).
  const cheDo = cheDoGuiMay(may, o.lenh.some((l) => l.loai === "go"), !!(con ?? (o.bmDen ? may.child_id : null)));   // máy riêng lúc Ba Mẹ dùng giữ «chan»
  // «Mở» có hạn (mở khẩn cấp / thêm giờ duyệt cho máy Windows) + thưởng còn lại ⇒ agent thả chặn ngay ở lần đồng bộ này, không đợi phiên điểm.
  const moDen = tac ? await hanMoCuaMay(may, con) : null;
  const conThuong = tac && con ? pol.quy?.conPhut ?? 0 : 0;   // 05/11: = quỹ còn (Policy đã tính, không tính lại)
  // play* chỉ cho máy sở hữu phiên. Máy dùng chung + agent 0.2.4: phiên mở trên máy ⇒ ghép phần phiên vào Policy chung (chỉ cho «windows»).
  const ghep = tac && !con && laAgentMoi(o.status) ? await ghepPhienMayChung(may, pol) : null;
  const moPhienMay = tac && con ? await moRongPhienMay(may, con) : null;
  // Danh sách app thật (lib/app-may.ts): appThat cả nhà (để loại khỏi luật web); appNen chỉ máy cùng nền (allowedApps / playChoices); app bị Chặn của máy này
  const [blockedApps, danhSachApp] = tac ? await Promise.all([appChanCuaMay(may, con), tinHieuDanhSachApp(may.id, may)]) : [[], null];
  const windows = chinhSachWindows(ghep?.pol ?? pol, ch.biMat ?? undefined, cheDo,
    { nen: may.platform === "mac" ? "mac" : "windows", moDen, conThuong, appThat: ch.appThat, appNen: ch.appNen, ...(moPhienMay ?? {}), ...(ghep?.mo ?? {}) });
  if (ghep) windows.canExchangePoints = false;               // máy dùng chung: đổi điểm phải chọn hồ sơ + PIN trên khay
  // «Mở hết» (Nghi 11/11): không đóng app Ba Mẹ từng «Chặn» — luật vẫn lưu, về «Chặn app & web» thì chặn lại
  if (tac) windows.blockedApps = laMoHet(pol) ? [] : blockedApps;
  // L13: «Ba Mẹ đang dùng máy» ⇒ máy mở hết tới hạn (thắng giờ ngủ / khoá — Ba Mẹ mở bằng mã), không đếm quỹ của con
  if (o.bmDen) {
    Object.assign(windows, { mode: "tu_do", locked: false, lockReason: null, grantEndsAt: o.bmDen.toISOString(), appTinhGio: [],
      web: chinhSachWebCho(pol, { moGiaiTri: true, moCoHan: true, appThat: ch.appThat }),
      nextCheckSec: Math.max(10, Math.min(windows.nextCheckSec, Math.ceil((o.bmDen.getTime() - Date.now()) / 1000) + 2)) });
    delete windows.quyConPhut; delete windows.khoaKhiHetNgoaiLe;
  }
  return { windows, danhSachApp };
}

/** Nền có gói mất mạng theo bé (máy chung chỉ Windows / Mac / Android — iPhone / iPad một bé). */
const coGoiOffline = (nen: string) => coTacTu(nen) || nen === "android";

/** Luật của bé `con` trên máy `may` như thể bé đang đăng nhập (không ghi gì). Windows / Mac kèm bí mật mã offline như dong-bo (agent không bị đè rỗng). */
async function goiOfflineBe(may: May, con: string, now = new Date(),
  chung?: { lenh: { loai: string }[]; may?: ChungMay; tuanThu?: Awaited<ReturnType<typeof tuanThuMay>> }): Promise<Record<string, unknown> | null> {
  if (may.platform === "android") {
    const cs = await chinhSachChung(may, con, chung?.tuanThu ?? await tuanThuMay(may, now), now);
    // như nhip (nhip-may.ts): hạn «thêm giờ đã duyệt / mở khẩn cấp» của bé ở gốc
    const den = coCuaSoThemGio(may.platform) ? await hanMoCuaMay(may, con, now) : null;
    return { serverTime: now.toISOString(), chinhSach: cs, nenTang: chuyenDoi(cs, "android"),
      grantEndsAt: den ? den.toISOString() : null, moDen: den ? den.toISOString() : null };
  }
  if (!coTacTu(may.platform)) return null;
  const pol = await taoPolicy(may, con, { gioMaySai: false }, now);
  const { windows } = await dungWindows(may, pol, con, { lenh: chung?.lenh ?? await lenhCho(may), bmDen: null, chung: chung?.may });
  return { ...pol, windows };
}

/** Gói của mọi bé được gán máy chung: `{ <id bé>: gói }`. Máy riêng / nền không hỗ trợ ⇒ null. Lỗi một bé không làm hỏng bé khác (bé đó không có gói ⇒ agent khoá khi mất mạng). */
export async function goiOfflineMay(may: May, now = new Date()): Promise<Record<string, Record<string, unknown>> | null> {
  if (!coGoiOffline(may.platform)) return null;
  const ds = await idConMay(may.id);
  if (ds.length < 2) return null;
  // phần không phụ thuộc bé: đọc một lần cho cả máy
  const [lenh, chMay, tuanThu] = await Promise.all([lenhCho(may), chungMay(may), may.platform === "android" ? tuanThuMay(may, now) : Promise.resolve(undefined)]);
  const goi = await Promise.all(ds.map(async (c) => {
    try { return [c, await goiOfflineBe(may, c, now, { lenh, may: chMay, tuanThu })] as const; } catch (e) { console.error("goiOfflineBe lỗi", c, e); return [c, null] as const; }
  }));
  const ra: Record<string, Record<string, unknown>> = {};
  for (const [c, g] of goi) if (g) ra[c] = g;
  return ra;
}

/** Danh sách bé được gán máy (thứ tự gán) — gắn vào dong-bo / nhip (`dsCon`) để agent thấy Ba Mẹ đổi gán NGAY lượt đồng bộ do «chờ thay đổi»
 *  đánh thức (#339), không chờ chu kỳ tải lại ho-so 30 phút: lệch với danh sách đang nhớ ⇒ tải lại ho-so; bé đang dùng không còn trong danh sách ⇒ đẩy ra. */
export const dsConMay = (mayId: string) => idConMay(mayId);
