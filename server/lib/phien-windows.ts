// Phiên chơi của máy Windows (agent-win KHÔNG gửi phien/nhip) — PR #58 + bản 0.2.4:
//   • Nhịp phiên = mỗi lượt dong-bo của VÒNG THỰC THI agent (status có `childSessionActive`). Đồng bộ của HeartbeatWorker (status chỉ có
//     agent/version/online/cheDo) không phải nhịp: nó luôn «đang dùng» nên xen vào sẽ xoá mốc tạm dừng (khoá màn hình không bao giờ đóng phiên).
//   • Agent 0.2.4+ gửi `status.playSeconds` (+ `playSessionId`): số giây app chơi (trình duyệt nếu phiên web) ở nền trước, màn hình mở, kể
//     từ lần đồng bộ thành công trước (agent tự kiểm khay thật, màn hình khoá theo WTS, tiến trình có thật). Máy chủ tính ĐÚNG số phút đó;
//     0 giây ⇒ tạm dừng (3 phút ⇒ đóng). Agent cũ (0.2.0–0.2.3) không có trường ⇒ như #58: `childSessionActive !== false`.
//   • Máy dùng chung (devices.child_id null, Con chọn bằng PIN trên trang khay): Con lấy từ phiên đang chạy/tạm MỞ TRÊN CHÍNH MÁY NÀY (cùng
//     gia đình) — CHỈ với agent 0.2.4+ (agent cũ: Policy chung không thả app chơi, nhịp sẽ trừ điểm cho app đang bị chặn). Policy chung được
//     GHÉP phần phiên (app chơi / trình duyệt + play*) — lịch, app học, luật web, khoá vẫn là của máy (ghepPhienMayChung).
import { one } from "./db.ts";
import type { May } from "./gia-dinh.ts";
import type { MoRong } from "./agent-windows.ts";
import type { Policy } from "./may-con.ts";
import { dungPhien, nhip, phienDang, thuongConLai, type KetNhip } from "./phien.ts";
import { khoaTuanThu } from "./tuan-thu.ts";
import { soDu } from "./vi.ts";

/** Trạng thái agent gửi trong dong-bo (chỉ các trường dùng cho nhịp phiên) — đọc từ THÂN yêu cầu, không từ devices.status đã gộp. */
export type TrangThaiNhip = { childSessionActive?: unknown; playSeconds?: unknown; playSessionId?: unknown };

/** Lượt dong-bo này có phải nhịp của vòng thực thi agent không (có `childSessionActive` boolean — mọi bản agent-win đều gửi; heartbeat thì không). */
export const laNhipThucThi = (st: TrangThaiNhip | undefined) => typeof st?.childSessionActive === "boolean";

/** Agent 0.2.4+ (gửi `playSeconds`). */
export const laAgentMoi = (st: TrangThaiNhip | undefined) => typeof st?.playSeconds === "number" && Number.isFinite(st.playSeconds);

/** «Đang dùng thật» của phiên `phienId` từ status:
 *  - Con không còn đăng nhập (childSessionActive false) ⇒ không dùng.
 *  - Agent mới: số giây thuộc ĐÚNG phiên này ⇒ phut = playSeconds/60; của phiên khác / chưa có phiên ⇒ 0. 0 ⇒ tạm dừng (3 phút ⇒ đóng).
 *  - Agent cũ ⇒ đang dùng, tính theo thời gian trôi như #58. */
export function dungTuStatus(st: TrangThaiNhip | undefined, phienId: string): { dangDung: boolean; phut?: number } {
  if (st?.childSessionActive === false) return { dangDung: false };
  if (laAgentMoi(st)) {
    // số giây của phiên khác / Policy chưa có phiên này (vừa mở, agent chưa nhận) ⇒ app chơi của phiên này chưa được thả ⇒ 0
    const phut = String(st!.playSessionId ?? "") === phienId ? Math.max(0, st!.playSeconds as number) / 60 : 0;
    return { dangDung: phut > 0, phut };
  }
  return { dangDung: true };
}

type PhienMay = { id: string; child_id: string; muc: string; device_id: string | null; trang_thai: string };

/** Phiên đang chạy/tạm mở trên máy này: `con` có ⇒ phiên của Con đó (phải mở trên máy này); không ⇒ (máy dùng chung) phiên mở trên
 *  máy này của một Con CÙNG gia đình với máy (một máy chỉ một phiên — phien.ts › xetMoPhien «may_dang_choi»). */
export async function phienCuaMay(may: May, con: string | null): Promise<PhienMay | undefined> {
  if (con) {
    const ph = await phienDang(con);
    return ph && ph.device_id === may.id ? { ...ph, child_id: con } : undefined;
  }
  return one<PhienMay>(
    `select s.id, s.child_id, s.muc, s.device_id, s.trang_thai from play_sessions s join children c on c.id = s.child_id
     where s.device_id = $1 and c.family_id = $2 and s.trang_thai in ('chay', 'tam') order by s.bat_dau desc limit 1`, [may.id, may.family_id]);
}

/** Máy dùng chung: Con của phiên còn đăng nhập PIN trên máy này không (kid_sessions còn hạn)? Hết ⇒ phiên phải đóng. */
const conDangNhapPin = async (con: string, mayId: string, now: Date) =>
  !!(await one(`select 1 from kid_sessions where child_id = $1 and device_id = $2 and expires_at > $3`, [con, mayId, now]));

/** Một lượt dong-bo của máy Windows ⇒ nhịp phiên (nếu có). Máy không tuân thủ ⇒ đóng phiên (ba_me_khoa). → kết quả nhịp hoặc null. */
export async function nhipPhienWindows(may: May, con: string | null, st: TrangThaiNhip | undefined, now = new Date()): Promise<KetNhip | null> {
  if (may.platform !== "windows" || !laNhipThucThi(st)) return null;
  if (!con && !laAgentMoi(st)) return null;                  // máy dùng chung + agent cũ: như #58 (không nhịp)
  const ph = await phienCuaMay(may, con);
  if (!ph) return null;
  // dungPhien «tính nốt» thời gian trôi như đang dùng ⇒ chốt sổ trước bằng nhịp đúng (PIN hết hạn: không tính phút sau đó; khoá: theo playSeconds).
  if (!con && !(await conDangNhapPin(ph.child_id, may.id, now))) {
    await nhip(ph.child_id, ph.id, false, now); await dungPhien(ph.child_id, ph.id, "het_dang_nhap", now); return null;
  }
  const d = dungTuStatus(st, ph.id);
  if ((await khoaTuanThu(may, now)).khoa) {
    await nhip(ph.child_id, ph.id, d.dangDung, now, { phut: d.phut }); await dungPhien(ph.child_id, ph.id, "ba_me_khoa", now); return null;
  }
  return nhip(ph.child_id, ph.id, d.dangDung, now, { phut: d.phut });
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

/** Phần mở rộng `play*` cho máy riêng: CHỈ khi phiên mở trên chính máy này (Con có 2 PC: PC2 không đếm/gửi bù cho phiên của PC1). */
export async function moRongPhienMay(may: May, con: string | null, now = new Date()): Promise<Pick<MoRong, "phienTien" | "conThuong"> | null> {
  if (!con) return null;
  const ph = await phienCuaMay(may, con);
  if (!ph) return null;
  return { phienTien: await tienPhien(ph.id), conThuong: await thuongConLai(con, now) };
}

/** Máy dùng chung có phiên mở trên máy (agent 0.2.4+): GHÉP chỉ phần phiên vào Policy chung — luật giải trí cho đúng mục của phiên (để
 *  agent-windows.ts thả app / trình duyệt + luật web cho tên miền), `phien`, số dư của Con đó (cho playOfflineMinutes). Lịch, khoá,
 *  app học, luật web khác giữ của máy. Không có phiên ⇒ null. */
export async function ghepPhienMayChung(may: May, pol: Policy, now = new Date()): Promise<{ pol: Policy; mo: Pick<MoRong, "phienTien" | "conThuong"> } | null> {
  const ph = await phienCuaMay(may, null);
  if (!ph || !(await conDangNhapPin(ph.child_id, may.id, now))) return null;
  const s = (await one<{ nhom: string; gia_phan_nghin: number; toi_da_phut: number; phut_dung: number }>(
    `select nhom, gia_phan_nghin, toi_da_phut, phut_dung from play_sessions where id = $1`, [ph.id]))!;
  const muc = ph.muc.toLowerCase();
  return {
    pol: {
      ...pol, soDu: await soDu(ph.child_id),
      phien: { id: ph.id, muc: ph.muc, conPhut: Math.max(0, Math.ceil(s.toi_da_phut - s.phut_dung)) },
      luat: [...pol.luat.filter((l) => l.muc.toLowerCase() !== muc), { muc, loai: "giai_tri", nhom: s.nhom, giaPhanNghin: s.gia_phan_nghin }],
    },
    mo: { phienTien: await tienPhien(ph.id), conThuong: await thuongConLai(ph.child_id, now) },
  };
}
