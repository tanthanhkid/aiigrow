// #810: MỘT nguồn «phút đã dùng hôm nay» cho mọi màn (Trang chủ / «Đã dùng gì» / trang máy / danh sách app-web của Con / nhật ký / app bé).
// Trước đây mỗi màn tự cộng `usage` + `web_nhat_ky` với bộ lọc riêng (trang máy cộng cả trình duyệt + tiến trình hệ thống, danh sách app cộng cả
// Edge lẫn tên miền đã mở trong Edge ⇒ lệch 15 / 12 / 33 / 53 phút). Giờ:
//   · docDongDung  — đọc đúng một lần: dòng `usage` (app) + `web_nhat_ky` (web, theo GIÂY) của Con hôm nay + luật của Con
//   · laDongTinhPhut — bộ lọc duy nhất: bỏ app AiiGrow, trình duyệt (phút của nó đã nằm ở dòng web), mục hệ thống, tiến trình nền Windows không luật
//   · chonLuat — luật khớp một mục (luật Con thắng luật cả nhà, tên miền cha / gốc)
//   · phutTheoMay — phút của Con trên từng máy (cộng số lẻ rồi làm tròn MỘT lần)
// Sao trừ = phút của nhóm «Tính phút» trong cùng tập dòng này (1 sao = 1 phút; sổ `points` loại `choi` ghi cùng số — lib/so-sao.ts).
import { q } from "./db.ts";
import { chuanMuc, laAppAiiGrow, laTienTrinhNenWindows } from "./luat-app.ts";
import { TRINH_DUYET } from "./man-hinh.ts";
import { mucGop } from "./ten-than-thien.ts";

export type LuatDung = { child_id: string; muc: string; ten: string; loai: string; nhom: string };
export type DongApp = { device_id: string; muc: string; loai: string; phut: number; dau_luc: Date | null };
export type DongWeb = { device_id: string; ten_mien: string; giay: number; dau_luc: Date | null; lan_cuoi: Date | null };

/** Luật khớp mục `muc` (đã chuẩn hoá): khớp thẳng / tên miền cha / tên miền gốc thắng luật tên miền con; luật riêng Con thắng luật cả nhà.
 *  #813: nhật ký web gộp theo tên miền gốc (wikipedia.org) còn Ba Mẹ thêm luật cho tên miền con (vi.wikipedia.org) ⇒ luật con cũng xếp đúng nhóm tên miền gốc. */
export function chonLuat<L extends { child_id: string; muc: string }>(luat: L[], muc: string, kieu: "app" | "web" = "app"): L | undefined {
  const m = chuanMuc(muc);
  const laCon = (l: { muc: string }) => kieu === "web" && l.muc !== m && l.muc.endsWith(`.${m}`);
  return luat.filter((l) => m === l.muc || m.endsWith(`.${l.muc}`) || m === mucGop(l.muc) || (kieu === "web" && l.muc.endsWith(`.${m}`)))
    .sort((a, b) => (+laCon(a) - +laCon(b)) || b.muc.length - a.muc.length || (b.child_id ? 1 : 0) - (a.child_id ? 1 : 0))[0];
}

/** Bộ lọc DUY NHẤT cho dòng app `usage` được cộng vào phút đã dùng. `coLuat` = mục này có luật khớp. */
export function laDongTinhPhut(a: { muc: string; loai: string }, coLuat: boolean): boolean {
  return !laAppAiiGrow(a.muc) && !TRINH_DUYET.has(chuanMuc(a.muc)) && a.loai !== "he_thong" && !(laTienTrinhNenWindows(a.muc) && !coLuat);
}

/** Đọc dòng dùng hôm nay của Con (`ngay` = ngày gia đình) + luật còn hiệu lực lúc `now`. */
export async function docDongDung(fam: string, con: string, ngay: string, now: Date) {
  const [app, web, luat] = await Promise.all([
    q<DongApp>(`select device_id, muc, loai, phut, dau_luc from usage where child_id = $1 and ngay = $2 and phut > 0`, [con, ngay]),
    q<DongWeb>(`select w.device_id, w.ten_mien, w.giay, w.dau_luc, w.lan_cuoi from web_nhat_ky w left join devices d on d.id = w.device_id
        where (w.child_id = $1 or (w.child_id is null and d.child_id = $1)) and d.family_id = $2 and w.ngay = $3 and w.giay > 0`, [con, fam, ngay]),
    q<LuatDung>(`select child_id, muc, ten, loai, nhom from app_rules where family_id = $1 and child_id in ('', $2) and (het is null or het > $3)`, [fam, con, now]),
  ]);
  return { app: app.filter((a) => laDongTinhPhut(a, !!chonLuat(luat, chuanMuc(a.muc)))), web, luat };
}

/** Phút của Con trên từng máy (app + web, số lẻ cộng trước, làm tròn một lần ở mỗi máy). */
export function phutTheoMay(d: { app: DongApp[]; web: DongWeb[] }): Map<string, number> {
  const t = new Map<string, number>();
  for (const a of d.app) t.set(a.device_id, (t.get(a.device_id) ?? 0) + Number(a.phut));
  for (const w of d.web) t.set(w.device_id, (t.get(w.device_id) ?? 0) + Number(w.giay) / 60);
  return new Map([...t].map(([k, v]) => [k, Math.round(v)]));
}
