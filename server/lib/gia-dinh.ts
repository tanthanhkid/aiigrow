// Gia đình, hồ sơ Con, thiết bị (FR-01.02, FR-01.03). Ghép máy chép cách làm của AiiControl (mã 6 số 15 phút, dùng một lần, khoá dòng
// mã trong giao dịch, token máy chỉ lưu băm). Thêm: máy dùng chung chọn Con bằng PIN, phiên Con (kid_sessions), mức bảo vệ.
import { newId, one, q, tx } from "./db.ts";
import { bamMatKhau, dungMatKhau, sha, taoToken } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";

export const NEN_TANG = ["windows", "mac", "ios", "android"] as const;
export type NenTang = (typeof NEN_TANG)[number];
export const TEN_NEN_TANG: Record<NenTang, string> = { windows: "Windows", mac: "Mac", ios: "iPhone/iPad", android: "Android" };

export type Con = {
  id: string; family_id: string; ten: string; nam_sinh: number | null; avatar: string; nhom: "nhi" | "teen";
  cau_hinh: Record<string, unknown>; lich: Record<string, unknown>; chao_luc: Date | null; created_at: Date;
};
export type May = {
  id: string; child_id: string | null; family_id: string; platform: NenTang; name: string; dung_chung: boolean;
  status: Record<string, any>; last_seen: Date | null; created_at: Date;
  /** giam-sat | chan (M4b, schema SCHEMA_M4B) — chế độ agent Ba Mẹ chọn từ xa. */
  che_do?: string;
};

/** Nhí (6–10) / Teen (11–16) đề xuất theo tuổi (FR-01.02); không rõ tuổi ⇒ Nhí. */
export function nhomTheoTuoi(namSinh: number | null, nam = new Date().getFullYear()) {
  return namSinh && nam - namSinh >= 11 ? "teen" : "nhi";
}

const PIN = /^\d{4,6}$/;

export async function taoCon(fam: string, b: { ten?: unknown; namSinh?: unknown; pin?: unknown; avatar?: unknown; nhom?: unknown }, nguoi?: string) {
  const ten = String(b.ten ?? "").trim().slice(0, 30);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Cho biết tên gọi của Con");
  const nam = Number(b.namSinh) || null;
  if (nam && (nam < new Date().getFullYear() - 18 || nam > new Date().getFullYear() - 3)) throw new LoiNghiepVu("nam_sinh_sai", "Năm sinh chưa đúng");
  const pin = b.pin === undefined || b.pin === null || b.pin === "" ? null : String(b.pin);
  if (pin !== null && !PIN.test(pin)) throw new LoiNghiepVu("pin_sai_dang", "Mã PIN của Con gồm 4–6 chữ số");
  const nhom = b.nhom === "teen" || b.nhom === "nhi" ? b.nhom : nhomTheoTuoi(nam);
  const id = newId();
  await q(`insert into children(id, family_id, ten, nam_sinh, avatar, nhom, pin_hash) values ($1,$2,$3,$4,$5,$6,$7)`,
    [id, fam, ten, nam, String(b.avatar ?? "rob").slice(0, 30), nhom, pin ? await bamMatKhau(pin) : null]);
  await ghiSuKien(fam, "tao_con", { ten, nhom }, { con: id, nguoi });
  return id;
}

export const dsCon = (fam: string) => q<Con>(`select * from children where family_id = $1 order by created_at`, [fam]);

/** Con của ĐÚNG gia đình này — gia đình khác ⇒ «không thấy» như không tồn tại (cách ly gia đình). */
export async function conCua(fam: string, id: string) {
  const c = await one<Con>(`select * from children where id = $1 and family_id = $2`, [id, fam]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return c;
}

export async function suaCon(fam: string, id: string, b: { ten?: unknown; avatar?: unknown; nhom?: unknown; pin?: unknown }, nguoi?: string) {
  await conCua(fam, id);
  if (b.ten !== undefined) {
    const ten = String(b.ten).trim().slice(0, 30);
    if (!ten) throw new LoiNghiepVu("thieu_ten", "Cho biết tên gọi của Con");
    await q(`update children set ten = $2 where id = $1`, [id, ten]);
  }
  if (b.avatar !== undefined) await q(`update children set avatar = $2 where id = $1`, [id, String(b.avatar).slice(0, 30)]);
  if (b.nhom === "nhi" || b.nhom === "teen") await q(`update children set nhom = $2 where id = $1`, [id, b.nhom]);
  if (b.pin !== undefined) {
    if (!PIN.test(String(b.pin))) throw new LoiNghiepVu("pin_sai_dang", "Mã PIN của Con gồm 4–6 chữ số");
    await q(`update children set pin_hash = $2 where id = $1`, [id, await bamMatKhau(String(b.pin))]);
    await q(`delete from kid_sessions where child_id = $1`, [id]);          // đặt lại PIN ⇒ đăng xuất Con ở mọi máy
    await ghiSuKien(fam, "dat_lai_pin", {}, { con: id, nguoi });
  }
}

// ---------------------------------------------------------------- ghép máy (FR-01.03)

/** Mã 6 số, hạn 15 phút. `con` null = máy dùng chung (chọn Con bằng PIN khi mở máy). */
export async function taoMaGhep(fam: string, con: string | null, platform: string) {
  if (!(NEN_TANG as readonly string[]).includes(platform)) throw new LoiNghiepVu("nen_tang_sai", "Chọn loại thiết bị");
  if (con) await conCua(fam, con);
  await q(`delete from pair_codes where expires_at < now() - interval '1 day'`);
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
    const r = await q(`insert into pair_codes(code, family_id, child_id, platform, expires_at) values ($1,$2,$3,$4, now() + interval '15 minutes')
                       on conflict (code) do nothing returning code`, [code, fam, con, platform]);
    if (r.length) return code;
  }
  throw new Error("Không tạo được mã ghép");
}

export async function ghepMay(code: string, platform: string, tenMay: string) {
  return tx(async (t) => {
    const m = (await t<{ family_id: string; child_id: string | null; platform: NenTang; expires_at: Date; used_at: Date | null }>(
      `select family_id, child_id, platform, expires_at, used_at from pair_codes where code = $1 for update`, [String(code ?? "").trim()]))[0];
    if (!m) throw new LoiNghiepVu("ma_sai", "Mã ghép không đúng", 404);
    if (m.used_at) throw new LoiNghiepVu("ma_da_dung", "Mã này đã dùng rồi — xin Ba Mẹ mã mới", 409);
    if (new Date(m.expires_at) < new Date()) throw new LoiNghiepVu("ma_het_han", "Mã đã hết hạn — xin Ba Mẹ mã mới", 410);
    if (m.platform !== platform) throw new LoiNghiepVu("sai_nen_tang", `Mã này dành cho ${TEN_NEN_TANG[m.platform]}`, 409);
    const id = newId(), token = taoToken();
    await t(`insert into devices(id, child_id, family_id, platform, name, token_hash, dung_chung, last_seen) values ($1,$2,$3,$4,$5,$6,$7, now())`,
      [id, m.child_id, m.family_id, platform, String(tenMay ?? "").trim().slice(0, 80) || TEN_NEN_TANG[platform], sha(token), !m.child_id]);
    await t(`update pair_codes set used_at = now(), device_id = $2 where code = $1`, [code, id]);
    await ghiSuKien(m.family_id, "ghep_may", { platform, ten: tenMay }, { con: m.child_id, may: id }, t);
    return { deviceId: id, token, dungChung: !m.child_id };
  });
}

export const mayTuToken = (token: string) => one<May>(`select * from devices where token_hash = $1`, [sha(token)]);

export async function goMay(fam: string, mayId: string, nguoi?: string) {
  const d = await one<{ id: string; child_id: string | null; name: string }>(`select id, child_id, name from devices where id = $1 and family_id = $2`, [mayId, fam]);
  if (!d) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  await q(`delete from devices where id = $1`, [d.id]);
  await ghiSuKien(fam, "go_may", { ten: d.name }, { con: d.child_id, nguoi });
}

/** Mức bảo vệ (FR-01.03): agent báo `status.quyen` = { [quyền]: true/false }; đủ hết ⇒ Đầy đủ, thiếu một phần ⇒ Một phần, chưa báo ⇒ Chưa bảo vệ. */
export function mucBaoVe(may: Pick<May, "status" | "last_seen">): "day_du" | "mot_phan" | "chua" {
  const qy = may.status?.quyen as Record<string, boolean> | undefined;
  if (!may.last_seen || !qy || !Object.keys(qy).length) return "chua";
  return Object.values(qy).every(Boolean) ? "day_du" : "mot_phan";
}

// ---------------------------------------------------------------- PIN của Con trên máy dùng chung / web Con

const PIN_SAI_TOI_DA = 5;

/** Con nhập PIN trên máy `may` (dùng chung, hoặc máy riêng của chính Con). Sai 5 lần ⇒ khoá 5 phút. → token phiên Con (12 giờ). */
export async function dangNhapPin(may: May, con: string, pin: string) {
  const c = await one<{ id: string; family_id: string; pin_hash: string | null }>(`select id, family_id, pin_hash from children where id = $1`, [con]);
  if (!c || c.family_id !== may.family_id || (may.child_id && may.child_id !== c.id))
    throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ này trên máy", 404);
  const khoa = `${may.id}:${c.id}`;
  const s = await one<{ so_lan: number; khoa_den: Date | null }>(`select so_lan, khoa_den from pin_sai where khoa = $1`, [khoa]);
  if (s?.khoa_den && new Date(s.khoa_den) > new Date()) throw new LoiNghiepVu("pin_tam_khoa", "Nhập sai nhiều lần — đợi 5 phút hoặc nhờ Ba Mẹ", 429);
  if (!c.pin_hash || !(await dungMatKhau(String(pin ?? ""), c.pin_hash))) {
    await q(`insert into pin_sai(khoa, so_lan) values ($1, 1) on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1,
             khoa_den = case when pin_sai.so_lan + 1 >= $2 then now() + interval '5 minutes' else null end`, [khoa, PIN_SAI_TOI_DA]);
    throw new LoiNghiepVu("pin_sai", c.pin_hash ? "Mã PIN chưa đúng" : "Ba Mẹ chưa đặt mã PIN cho Con", 401);
  }
  await q(`delete from pin_sai where khoa = $1`, [khoa]);
  const t = taoToken();
  await q(`insert into kid_sessions(id, child_id, device_id, expires_at) values ($1,$2,$3, now() + interval '12 hours')`, [sha(t), c.id, may.id]);
  return t;
}

export const conTuPhien = (token: string) =>
  one<Con & { device_id: string | null }>(`select c.*, k.device_id from kid_sessions k join children c on c.id = k.child_id
                                           where k.id = $1 and k.expires_at > now()`, [sha(token)]);
