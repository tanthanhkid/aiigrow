// «Khoá riêng máy này» (thiết kế 14/11 bm-hang-ngay «Khoá máy <Con>?» liệt kê từng máy): khoá / mở MỘT máy con, không đụng hồ sơ Con.
// Lưu ở devices.khoa_may cùng dạng khoá của Con ({khoa_ngay, khoa_den} — lib/cau-hinh.ts › dangKhoa / khoaDen đọc được nguyên xi) và
// may-con.ts › taoPolicy GỘP vào trường `khoaNgay` (+ `khoaHetLuc`, nhịp tới hạn) mà agent Windows / Mac / Android / iOS / hồ sơ DNS đã đọc
// ⇒ agent hiện tại khỏi phát lại. Ba Mẹ bấm ⇒ api-m.ts đánh thức long-poll (cho-thay-doi) ⇒ máy áp ≤ 5 giây như «Khoá ngay» của Con.
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { dangKhoa, khoaDen } from "./cau-hinh.ts";
import { hanKhoa } from "./may-con.ts";

/** `hanVao`: "sang" = 6:30 sáng mai giờ gia đình (như khoá Con) · Date = mở lại lúc đó · null = tới khi Ba Mẹ mở. → trạng thái khoá mới của máy. */
export async function khoaMay(fam: string, mayId: string, khoa: boolean, nguoi: string, hanVao: Date | "sang" | null = null, now = new Date()) {
  const m = await one<{ name: string; child_id: string | null; tz: string }>(
    `select d.name, d.child_id, f.tz from devices d join families f on f.id = d.family_id where d.id = $1 and d.family_id = $2`, [mayId, fam]);
  if (!m) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  const den = khoa ? hanKhoa(m.tz, hanVao, now) : null;
  const cfg = khoa ? { khoa_ngay: true, ...(den ? { khoa_den: den.toISOString() } : {}) } : {};
  await q(`update devices set khoa_may = $3::text::jsonb where id = $1 and family_id = $2`, [mayId, fam, JSON.stringify(cfg)]);
  await ghiSuKien(fam, khoa ? "khoa_may" : "mo_khoa_may", { ten: m.name, ...(den ? { den: den.toISOString() } : {}) }, { con: m.child_id, may: mayId, nguoi });
  return trangThaiKhoaMay(cfg, now);
}

/** {khoa, den} để app hiện «Đang khoá · tới 6:30» — hạn đã qua ⇒ khoa false (tự hết, không cần tiến trình nền). Là khoá Ba Mẹ ĐẶT:
 *  lúc Ba Mẹ đang dùng máy bằng mã (ba_me_den) Policy tạm không khoá, hết lượt dùng thì khoá lại — app tự hiện «Ba Mẹ đang dùng» từ `baMeDungDen`. */
export function trangThaiKhoaMay(cfg: Record<string, unknown> | null | undefined, now = new Date()) {
  return { khoa: dangKhoa(cfg, now), den: khoaDen(cfg, now) };
}
