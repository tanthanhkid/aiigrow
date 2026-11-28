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
import { TRINH_DUYET, tenDoc } from "./man-hinh.ts";
import { LA_APP } from "./so-sao.ts";
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

// ---------------------------------------------------------------- #810 (test 28/11): sao trừ = sổ `points` loại `choi` — MỘT nguồn

/** Khoá mục của dòng sổ `choi` (ref `choi:<ngày>:<mục>`) — cùng cách chuẩn hoá với dòng «Đã dùng gì» (app: mucGop, web: tên miền chuẩn). */
export const khoaMucSao = (muc: string) => (!muc ? "" : muc.startsWith("ios:") ? muc : mucGop(chuanMuc(muc)));

export type DongSao = { muc: string; may: string | null; sao: number };

/** Sổ `choi` hôm nay của Con theo (mục, máy) — tổng các dòng = «Hôm nay đã chơi N phút · −N sao» (so-sao › phutDaTruHomNay, quy-gio › soHomNay.daChoi).
 *  Mọi màn đọc «sao trừ» / «phút đã chơi» từ đây: «Đã dùng gì», app Con, trang máy. Ref khác dạng ⇒ mục rỗng. */
export async function docSaoHomNay(con: string, ngay: string, tu: Date): Promise<DongSao[]> {
  const goc = `choi:${ngay}:`;
  const ds = await q<{ muc: string; may: string | null; sao: number }>(
    `select case when left(coalesce(ref, ''), $4::int) = $3 then substr(ref, $4::int + 1) else '' end as muc, device_id as may,
        coalesce(-sum(delta), 0)::int as sao from points where child_id = $1 and loai = 'choi' and created_at >= $2 group by 1, 2`,
    [con, tu, goc, goc.length]);
  return ds.map((r) => ({ muc: khoaMucSao(r.muc), may: r.may ?? null, sao: Number(r.sao) })).filter((r) => r.sao !== 0);
}

/** Phút ĐÃ CHƠI (trừ sao) của Con trên từng máy = sổ `choi` theo device_id. Dòng sổ cũ chưa có máy ⇒ máy dùng mục đó nhiều nhất hôm nay
 *  (usage / web_nhat_ky), mục `ios:<id>` ⇒ chính máy đó; không suy được ⇒ bỏ (không gán bừa). Một máy ⇒ = Hôm nay «Đã dùng N phút». */
export function saoTheoMay(sao: DongSao[], d: { app: DongApp[]; web: DongWeb[] }): Map<string, number> {
  const nhieuNhat = new Map<string, { may: string; phut: number }>();
  const ghi = (muc: string, may: string, phut: number) => { const x = nhieuNhat.get(muc); if (!x || phut > x.phut) nhieuNhat.set(muc, { may, phut }); };
  for (const a of d.app) ghi(khoaMucSao(a.muc), a.device_id, Number(a.phut));
  for (const w of d.web) ghi(khoaMucSao(w.ten_mien), w.device_id, Number(w.giay) / 60);
  const t = new Map<string, number>();
  for (const r of sao) {
    const may = r.may ?? (r.muc.startsWith("ios:") ? r.muc.slice(4) : nhieuNhat.get(r.muc)?.may ?? null);
    if (may) t.set(may, (t.get(may) ?? 0) + r.sao);
  }
  return t;
}

/** Khay Windows «đã dùng hôm nay theo app» (Policy › sao.appHomNay): từng mục ĐÃ TRỪ SAO hôm nay theo sổ (mọi máy, cả web) — cùng tên + số với
 *  «Đã dùng gì» của Ba Mẹ (cột sao) và app Con; tổng = sao.phutChoiHomNay. `luat` (muc, ten) ⇒ tên Ba Mẹ đặt. Dòng `ios:` / không mục ⇒ «Khác». */
export async function appTheoSo(con: string, ngay: string, tu: Date, luat: { muc: string; ten: string }[] = []) {
  const theoMuc = new Map<string, number>();
  for (const r of await docSaoHomNay(con, ngay, tu)) {
    const k = !r.muc || r.muc.startsWith("ios:") ? "" : r.muc;
    theoMuc.set(k, (theoMuc.get(k) ?? 0) + r.sao);
  }
  return [...theoMuc].filter(([, sao]) => sao > 0)
    .map(([muc, sao]) => ({ muc, ten: muc ? tenDoc(muc, LA_APP.test(muc) ? "app" : "web", chonLuat(luat.map((l) => ({ child_id: "", ...l })), muc)?.ten) : "Khác", sao }))
    .sort((a, b) => (+(a.muc === "") - +(b.muc === "")) || b.sao - a.sao).slice(0, 12);
}
