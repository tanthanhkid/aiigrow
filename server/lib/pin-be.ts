// PIN theo bé trên máy dùng chung — thiết kế chốt 06/11 (docs/KE-HOACH-KHOP-THIET-KE-0611.md L13, ĐẢO L5 «bỏ PIN» của 05/11).
//   • Ba Mẹ đặt PIN 4 số ở «Thêm con» và đặt lại ở Hồ sơ con («PIN vào máy · Đặt lại»); xem lại được («Hiện»).
//   • Máy khoá ⇒ «Ai đang dùng máy?» chọn tên ⇒ nhập PIN. Sai 5 lần ⇒ chờ 15 giây (đếm ở máy chủ, theo máy + bé). Bé chưa có PIN ⇒ vào thẳng.
//   • «Quên PIN» ⇒ báo Ba Mẹ (mục «Cần Ba Mẹ để ý»); Ba Mẹ đặt PIN mới thì báo đó tự xong.
//   • Ba Mẹ mở máy bằng MÃ MỞ MÁY của chính máy đó (lib/ma-offline.ts — cùng mã khi mất mạng) ⇒ «Ba Mẹ đang dùng máy»: không tính giờ con,
//     máy mở hết tới hạn (15 / 30 / 60 phút theo mã) hoặc tới khi bấm «Khoá lại».
//   • «Đổi bé / Đăng xuất» ⇒ máy về màn chọn tên. Giờ, sao, nhiệm vụ, phiên tính theo bé đang đăng nhập (devices.con_dang_dung — api-may.ts).
// Agent cũ (chọn tên không PIN — POST chon-con) vẫn chạy như trước.
import { createHmac, timingSafeEqual } from "node:crypto";
import { one, q } from "./db.ts";
import { sha, taoToken } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import { conCua, type May } from "./gia-dinh.ts";
import { biMatOfflineMay } from "./tuan-thu.ts";
import { kiemMaOfflinePhut } from "./ma-offline.ts";

export const PIN_SAI_TOI_DA = 5;
export const PIN_CHO_GIAY = 15;
export const MA_BA_ME_SAI_TOI_DA = 5;
export const MA_BA_ME_CHO_PHUT = 10;

/** Lỗi kèm trường phụ (conLan, choGiay…) — router trả `{error, message, ...them}`. */
export class LoiPin extends LoiNghiepVu {
  constructor(ma: string, msg: string, status: number, them: Record<string, unknown>) { super(ma, msg, status); this.them = them; }
}

/** PIN hợp lệ: đúng 4 chữ số. */
export function pinHopLe(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!/^\d{4}$/.test(s)) throw new LoiNghiepVu("pin_sai_dang", "PIN gồm đúng 4 chữ số");
  return s;
}

// ---------------------------------------------------------------- phía Ba Mẹ

/** Ba Mẹ đặt / đặt lại PIN của Con (Thêm con, Hồ sơ › PIN vào máy). `pin` null ⇒ bỏ PIN (bé chọn tên vào thẳng). Báo «quên PIN» đang chờ ⇒ xong. */
export async function datPin(fam: string, con: string, pin: unknown, nguoi?: string | null, now = new Date()) {
  const c = await conCua(fam, con);
  const ma = pin === null ? null : pinHopLe(pin);
  await q(`update children set pin_ma = $2, pin_dat_luc = $3 where id = $1`, [con, ma, ma ? now : null]);
  await q(`delete from pin_sai where khoa like $1`, [`pin:%:${con}`]);          // PIN mới ⇒ bộ đếm sai cũ hết ý nghĩa
  await q(`update alerts set da_doc = true where family_id = $1 and child_id = $2 and loai = 'quen_pin' and not da_doc`, [fam, con]);
  await ghiSuKien(fam, ma ? "dat_pin" : "bo_pin", {}, { con, nguoi });
  return { coPin: !!ma, pinDatLuc: ma ? now.toISOString() : null, ten: c.ten };
}

/** Màn «PIN của <Con>» (xem / đặt lại). */
export async function xemPin(fam: string, con: string) {
  const c = await conCua(fam, con);
  return { coPin: !!c.pin_ma, pin: c.pin_ma ?? null, pinDatLuc: c.pin_dat_luc ? new Date(c.pin_dat_luc).toISOString() : null, ten: c.ten };
}

// ---------------------------------------------------------------- phía máy

type MayS3 = May;

/** Ba Mẹ đang dùng máy (còn hạn) ⇒ hạn; không ⇒ null. */
export const baMeDen = (may: MayS3, now = new Date()) =>
  may.ba_me_den && new Date(may.ba_me_den).getTime() > now.getTime() ? new Date(may.ba_me_den) : null;

/** Vân PIN để agent tự kiểm khi MẤT MẠNG: HMAC-SHA256(khoá = bí mật mã offline của máy, «<id Con>:<PIN>») hex. Máy khác bí mật ⇒ vân khác. */
export const vanPin = (biMat: string, con: string, pin: string) => createHmac("sha256", biMat).update(`${con}:${pin}`).digest("hex");

/** «Ai đang dùng máy?» — danh sách bé của máy + ai đang dùng. Máy riêng của Con ⇒ chỉ Con đó (vẫn hỏi PIN khi mở khoá). */
export async function hoSoMay(may: MayS3, now = new Date()) {
  const ds = await q<{ id: string; ten: string; avatar: string; pin_ma: string | null }>(
    `select id, ten, avatar, pin_ma from children where family_id = $1 order by created_at`, [may.family_id]);
  const bm = await biMatOfflineMay(may.id);
  const khoa = await q<{ khoa: string; khoa_den: Date }>(`select khoa, khoa_den from pin_sai where khoa like $1 and khoa_den > $2`, [`pin:${may.id}:%`, now]);
  const khoaTheo = new Map(khoa.map((k) => [k.khoa.split(":")[2], new Date(k.khoa_den)]));
  // bé đang dùng = devices.con_dang_dung còn phiên Con trên máy này (hết 12 giờ / đăng xuất ⇒ không còn)
  const conPhien = may.con_dang_dung && await one(`select 1 from kid_sessions where device_id = $1 and child_id = $2 and expires_at > $3 limit 1`,
    [may.id, may.con_dang_dung, now]) ? may.con_dang_dung : null;
  const dangDung = may.child_id ?? conPhien;
  const den = baMeDen(may, now);
  const con = ds.filter((c) => !may.child_id || c.id === may.child_id).map((c) => {
    const k = khoaTheo.get(c.id);
    return { id: c.id, ten: c.ten, avatar: c.avatar, coPin: !!c.pin_ma, ...(c.pin_ma && bm ? { vanPin: vanPin(bm, c.id, c.pin_ma) } : {}),
      ...(k ? { khoaDen: k.toISOString(), choGiay: Math.ceil((k.getTime() - now.getTime()) / 1000) } : {}) };
  });
  const tenDung = dangDung ? ds.find((c) => c.id === dangDung) : undefined;
  return {
    con, mayRieng: !!may.child_id,
    dangDung: !den && tenDung && (!may.child_id || conPhien === may.child_id) ? { id: tenDung.id, ten: tenDung.ten, avatar: tenDung.avatar,
      tu: may.dang_nhap_luc ? new Date(may.dang_nhap_luc).toISOString() : null } : null,
    baMeDung: den ? { den: den.toISOString(), tu: may.ba_me_tu ? new Date(may.ba_me_tu).toISOString() : null } : null,
    pinSaiToiDa: PIN_SAI_TOI_DA, pinChoGiay: PIN_CHO_GIAY,
  };
}

async function demSai(khoa: string, toiDa: number, choGiay: number, now: Date) {
  const r = (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan) values ($1, 1)
    on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1 returning so_lan`, [khoa]))[0];
  if (r.so_lan >= toiDa) {
    await q(`update pin_sai set so_lan = 0, khoa_den = $2 where khoa = $1`, [khoa, new Date(now.getTime() + choGiay * 1000)]);
    return { khoa: true, conLan: 0 };
  }
  return { khoa: false, conLan: toiDa - r.so_lan };
}

async function dangKhoa(khoa: string, now: Date) {
  const r = await one<{ khoa_den: Date | null }>(`select khoa_den from pin_sai where khoa = $1`, [khoa]);
  return r?.khoa_den && new Date(r.khoa_den).getTime() > now.getTime() ? new Date(r.khoa_den) : null;
}

const bang = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Bé chạm tên (+ PIN nếu có) ⇒ phiên Con 12 giờ + máy ghi «bé đang dùng». Sai ⇒ 401 `pin_sai` {conLan}; sai đủ 5 ⇒ 429 `pin_tam_khoa` {choGiay}. */
export async function dangNhapBe(may: MayS3, conId: string, pin: unknown, now = new Date()) {
  const c = await one<{ id: string; family_id: string; ten: string; avatar: string; pin_ma: string | null }>(
    `select id, family_id, ten, avatar, pin_ma from children where id = $1`, [conId]);
  if (!c || c.family_id !== may.family_id || (may.child_id && may.child_id !== c.id))
    throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ này trên máy", 404);
  const khoa = `pin:${may.id}:${c.id}`;
  if (c.pin_ma) {
    const den = await dangKhoa(khoa, now);
    if (den) { const g = Math.ceil((den.getTime() - now.getTime()) / 1000);
      throw new LoiPin("pin_tam_khoa", `Sai ${PIN_SAI_TOI_DA} lần rồi — chờ ${g} giây rồi thử lại nhé`, 429, { choGiay: g, khoaDen: den.toISOString() }); }
    const vao = String(pin ?? "").trim();
    if (!vao) throw new LoiPin("can_pin", "Nhập PIN 4 số nhé", 400, { coPin: true });
    if (!bang(vao, c.pin_ma)) {
      const s = await demSai(khoa, PIN_SAI_TOI_DA, PIN_CHO_GIAY, now);
      await ghiSuKien(may.family_id, "sai_pin", { conLan: s.conLan }, { con: c.id, may: may.id });
      if (s.khoa) throw new LoiPin("pin_tam_khoa", `Sai ${PIN_SAI_TOI_DA} lần rồi — chờ ${PIN_CHO_GIAY} giây rồi thử lại nhé`, 429,
        { choGiay: PIN_CHO_GIAY, khoaDen: new Date(now.getTime() + PIN_CHO_GIAY * 1000).toISOString() });
      throw new LoiPin("pin_sai", `Chưa đúng · còn ${s.conLan} lần thử`, 401, { conLan: s.conLan });
    }
    await q(`delete from pin_sai where khoa = $1`, [khoa]);
  }
  const t = taoToken();
  await q(`insert into kid_sessions(id, child_id, device_id, expires_at) values ($1,$2,$3, $4::timestamptz + interval '12 hours')`, [sha(t), c.id, may.id, now.toISOString()]);
  await q(`update devices set con_dang_dung = $2, dang_nhap_luc = $3, ba_me_den = null, ba_me_tu = null where id = $1`, [may.id, c.id, now]);
  await ghiSuKien(may.family_id, "doi_nguoi_may", { pin: !!c.pin_ma }, { con: c.id, may: may.id });
  return { phienCon: t, con: { id: c.id, ten: c.ten, avatar: c.avatar }, coPin: !!c.pin_ma, ...(c.pin_ma ? {} : { canDatPin: true }) };
}

/** Agent cũ (chọn tên không PIN — gia-dinh.ts › chonCon): ghi thêm «bé đang dùng» để Ba Mẹ thấy và nhịp không header vẫn đúng bé. */
export const ghiConDangDung = (mayId: string, con: string, now = new Date()) =>
  q(`update devices set con_dang_dung = $2, dang_nhap_luc = $3 where id = $1`, [mayId, con, now]);

/** «Đổi bé / Đăng xuất» (bé) hoặc «Khoá lại» (Ba Mẹ đang dùng) ⇒ máy về màn chọn tên: bỏ bé đang dùng, xoá phiên Con của máy, hết «Ba Mẹ dùng». */
export async function roiMay(may: MayS3, now = new Date()) {
  const ai = may.con_dang_dung ?? null, baMe = !!baMeDen(may, now);
  await q(`update devices set con_dang_dung = null, dang_nhap_luc = null, ba_me_den = null, ba_me_tu = null where id = $1`, [may.id]);
  await q(`delete from kid_sessions where device_id = $1`, [may.id]);
  await ghiSuKien(may.family_id, baMe ? "ba_me_khoa_lai" : "dang_xuat_may", {}, { con: ai, may: may.id });
  return { ok: true, khoa: true };
}

/** «Quên PIN» ⇒ báo Ba Mẹ (cảnh báo loai quen_pin — mục «Cần Ba Mẹ để ý»). Đang có báo chưa xử lý ⇒ không báo trùng. */
export async function quenPin(may: MayS3, conId: string) {
  const c = await one<{ id: string; family_id: string; ten: string }>(`select id, family_id, ten from children where id = $1`, [conId]);
  if (!c || c.family_id !== may.family_id || (may.child_id && may.child_id !== c.id)) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ này trên máy", 404);
  const co = await one(`select 1 from alerts where family_id = $1 and child_id = $2 and loai = 'quen_pin' and not da_doc`, [c.family_id, c.id]);
  if (!co) {
    await canhBao(c.family_id, "quen_pin", "chu_y", `${c.ten} quên PIN vào máy — đặt PIN mới trong hồ sơ con`, { con: c.id, may: may.id, chiTiet: { may: may.name } });
    await ghiSuKien(c.family_id, "quen_pin", { may: may.name }, { con: c.id, may: may.id });
  }
  return { daGui: true, lapLai: !!co };
}

/** «Ba Mẹ nhập mã» trên máy: mã mở máy (cùng mã khi mất mạng) ⇒ «Ba Mẹ đang dùng máy» trong số phút mã mang (15 / 30 / 60).
 *  Sai 5 lần ⇒ chờ 10 phút (theo máy). Không tính giờ con trong lúc đó (api-may.ts bỏ usage / nhịp phiên). */
export async function baMeMoMay(may: MayS3, ma: unknown, now = new Date()) {
  const khoa = `bmma:${may.id}`;
  const den = await dangKhoa(khoa, now);
  if (den) throw new LoiPin("ma_tam_khoa", "Nhập sai mã nhiều lần — đợi một lúc rồi thử lại", 429, { choGiay: Math.ceil((den.getTime() - now.getTime()) / 1000) });
  const bm = await biMatOfflineMay(may.id);
  const phut = bm ? kiemMaOfflinePhut(bm, String(ma ?? ""), now) : null;
  if (!phut) {
    const s = await demSai(khoa, MA_BA_ME_SAI_TOI_DA, MA_BA_ME_CHO_PHUT * 60, now);
    await ghiSuKien(may.family_id, "sai_ma_ba_me", { conLan: s.conLan }, { may: may.id });
    if (s.khoa) throw new LoiPin("ma_tam_khoa", "Nhập sai mã nhiều lần — đợi một lúc rồi thử lại", 429, { choGiay: MA_BA_ME_CHO_PHUT * 60 });
    throw new LoiPin("ma_sai", `Mã chưa đúng · còn ${s.conLan} lần thử`, 401, { conLan: s.conLan });
  }
  await q(`delete from pin_sai where khoa = $1`, [khoa]);
  const het = new Date(now.getTime() + phut * 60_000);
  await q(`update devices set ba_me_den = $2, ba_me_tu = $3, con_dang_dung = null, dang_nhap_luc = null where id = $1`, [may.id, het, now]);
  await q(`delete from kid_sessions where device_id = $1`, [may.id]);
  await ghiSuKien(may.family_id, "ba_me_mo_may", { phut }, { con: may.child_id, may: may.id });
  return { baMeDung: { den: het.toISOString(), tu: now.toISOString() }, phut };
}

/** Khối «ai đang dùng máy» gắn vào phản hồi dong-bo / nhip: loai = con | ba_me | chua (máy dùng chung chưa ai vào). */
export async function nguoiDungMay(may: MayS3, con: string | null, now = new Date()) {
  const den = baMeDen(may, now);
  if (den) return { loai: "ba_me" as const, den: den.toISOString() };
  if (!con) return { loai: "chua" as const };
  const c = await one<{ ten: string; pin_ma: string | null }>(`select ten, pin_ma from children where id = $1`, [con]);
  return { loai: "con" as const, con: { id: con, ten: c?.ten ?? "", coPin: !!c?.pin_ma } };
}
