// Thiết lập lần đầu của Ba Mẹ (L7, thiết kế chốt 05/11 — docs/thiet-ke-chot/bm-lan-dau): chỉ phụ huynh đăng ký; bỏ bước «Bật thông báo»,
// bỏ «Ba hay Mẹ». Luồng: tên Con → Giờ chơi (+ khối chặn 2 chế độ) → Chọn app → Ghép máy (lib/ghep-may.ts) → Đang chờ → Đã ghép → Xong.
// Nhánh «Tôi được mời vào nhà» KHÔNG gọi API này (không tạo Con) — đi lib/thanh-vien.ts (moi/cho-toi, moi/nhan).
// POST /api/m/thiet-lap gom một lần: tạo (hoặc sửa, khi gửi lại `con.id`) hồ sơ Con + quỹ giờ chơi + giờ ngủ + chế độ chặn + app được phép.
// Quỹ giờ chơi (L2) do nhánh S1 làm phần tính; ở đây chỉ LƯU vào children.cau_hinh theo khoá rõ ràng:
//   quy_ngay_thuong, quy_cuoi_tuan (phút / ngày, 0–480) — docs/API.md › «Thiết lập lần đầu».
import { one, q, tx } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { conCua, suaCon, taoCon } from "./gia-dinh.ts";
import { lichCua } from "./cau-hinh.ts";
import { datAppChoPhep, datCheDoChan } from "./che-do-chan.ts";
import { CHE_DO_CHAN, cheDoChanCua } from "./chan-co-ban.ts";
import { APP_GOI_Y } from "./che-do-chan.ts";
import { allowlistHieuLuc, datLuat, khoaSo } from "./luat-app.ts";
import { laWebCam } from "./chan-co-ban.ts";
import { tenMienSach } from "./web.ts";

export const QUY_PHUT_TOI_DA = 480;
const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;

const phutHopLe = (v: unknown, ten: string) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > QUY_PHUT_TOI_DA) throw new LoiNghiepVu("phut_sai", `Giờ chơi ${ten} từ 0 đến ${QUY_PHUT_TOI_DA} phút`);
  return n;
};

/** Lưu quỹ giờ chơi mỗi ngày (ngày thường / T7–CN) vào cấu hình Con. */
export async function datQuyGio(con: string, b: { ngayThuong?: unknown; cuoiTuan?: unknown }) {
  const moi: Record<string, number> = {};
  if (b.ngayThuong !== undefined) moi.quy_ngay_thuong = phutHopLe(b.ngayThuong, "ngày thường");
  if (b.cuoiTuan !== undefined) moi.quy_cuoi_tuan = phutHopLe(b.cuoiTuan, "cuối tuần");
  if (Object.keys(moi).length) await q(`update children set cau_hinh = cau_hinh || $2::text::jsonb where id = $1`, [con, JSON.stringify(moi)]);
  return moi;
}

/** Giờ ngủ {tu, den} (bánh xe) — ghi vào children.lich.ngu, giữ khung giờ chơi đang có. */
export async function datGioNgu(con: string, ngu: { tu?: unknown; den?: unknown }) {
  const tu = String(ngu?.tu ?? ""), den = String(ngu?.den ?? "");
  if (!GIO.test(tu) || !GIO.test(den) || tu === den) throw new LoiNghiepVu("gio_sai", "Giờ ngủ dạng HH:MM, giờ khoá khác giờ mở");
  await q(`update children set lich = lich || jsonb_build_object('ngu', jsonb_build_object('tu', $2::text, 'den', $3::text)) where id = $1`, [con, tu, den]);
  return { tu, den };
}

export type ThietLapVao = {
  con?: { id?: unknown; ten?: unknown; namSinh?: unknown; avatar?: unknown };
  gioChoi?: { ngayThuong?: unknown; cuoiTuan?: unknown };
  ngu?: { tu?: unknown; den?: unknown };
  cheDoChan?: unknown;
  apps?: unknown;
  /** Thiết kế chốt 14/11 (them-3xbscpzm «Web cho <Con>»): trang Ba Mẹ chọn — [{muc: tên miền, tinhGio?}] hoặc ["ten.com"]. */
  web?: unknown;
};

const WEB_TOI_DA = 60;
/** Kiểm + chuẩn hoá danh sách web Lần đầu: tên miền sạch, không thuộc nhóm luôn chặn, không trùng. → [{muc, tinhGio}]. */
export function webLanDau(v: unknown): { muc: string; tinhGio: boolean }[] {
  if (!Array.isArray(v)) throw new LoiNghiepVu("thieu_web", "Gửi danh sách trang web");
  const ra = new Map<string, boolean>();
  for (const x of v.slice(0, WEB_TOI_DA)) {
    const o = (typeof x === "string" ? { muc: x } : x ?? {}) as { muc?: unknown; tinhGio?: unknown };
    const muc = tenMienSach(o.muc);
    if (!muc) throw new LoiNghiepVu("ten_mien_sai", `«${String(o.muc ?? "").slice(0, 60)}» không phải địa chỉ web (dạng ten.com)`);
    if (laWebCam(muc)) throw new LoiNghiepVu("web_cam", `Trang ${muc} thuộc nhóm luôn chặn (người lớn, cờ bạc, bạo lực) — không mở được`, 409);
    ra.set(muc, o.tinhGio === true);
  }
  return [...ra].map(([muc, tinhGio]) => ({ muc, tinhGio }));
}

/** POST /api/m/thiet-lap — một lần cho cả màn tên Con + Giờ chơi + Chọn app. Gửi lại (mất phản hồi) với `con.id` ⇒ sửa, không tạo Con thứ hai. */
export async function thietLapLanDau(fam: string, b: ThietLapVao, nguoi: string) {
  const vaoCon = b.con ?? {};
  // Kiểm MỌI dữ liệu TRƯỚC khi tạo Con: lỗi giữa chừng không để lại Con (app chưa nhận con.id ⇒ gửi lại sẽ tạo Con thứ hai)
  if (b.gioChoi) { if (b.gioChoi.ngayThuong !== undefined) phutHopLe(b.gioChoi.ngayThuong, "ngày thường"); if (b.gioChoi.cuoiTuan !== undefined) phutHopLe(b.gioChoi.cuoiTuan, "cuối tuần"); }
  if (b.ngu) { const tu = String(b.ngu.tu ?? ""), den = String(b.ngu.den ?? ""); if (!GIO.test(tu) || !GIO.test(den) || tu === den) throw new LoiNghiepVu("gio_sai", "Giờ ngủ dạng HH:MM, giờ khoá khác giờ mở"); }
  if (b.cheDoChan !== undefined && !(CHE_DO_CHAN as readonly string[]).includes(String(b.cheDoChan))) throw new LoiNghiepVu("che_do_chan_sai", "Chọn «Mở hết» hoặc «Chỉ app được phép»");
  if (b.apps !== undefined) {
    if (!Array.isArray(b.apps)) throw new LoiNghiepVu("thieu_app", "Gửi danh sách app");
    for (const a of b.apps as { ma?: unknown }[]) if (a?.ma && !APP_GOI_Y.some((x) => x.ma === String(a.ma))) throw new LoiNghiepVu("app_sai", `Không có app «${a.ma}» trong lưới`);
  }
  const web = b.web !== undefined ? webLanDau(b.web) : null;
  let conId: string;
  if (vaoCon.id) {
    conId = (await conCua(fam, String(vaoCon.id))).id;
    await suaCon(fam, conId, { ten: vaoCon.ten, avatar: vaoCon.avatar }, nguoi);
  } else {
    conId = await taoCon(fam, { ten: vaoCon.ten, namSinh: vaoCon.namSinh, avatar: vaoCon.avatar }, nguoi);
  }
  const quy = b.gioChoi ? await datQuyGio(conId, b.gioChoi) : {};
  const ngu = b.ngu ? await datGioNgu(conId, b.ngu) : null;
  const cheDo = b.cheDoChan !== undefined ? (await datCheDoChan(fam, conId, b.cheDoChan, nguoi)).cheDoChan : null;
  const app = b.apps !== undefined ? await tx((t) => datAppChoPhep(fam, conId, b.apps, nguoi, t)) : { daDat: [], choKhop: [] };
  // trang web Ba Mẹ chọn: xanh «Vào thoải mái» (hoc, không trừ giờ chơi) / vàng «Tính giờ» (giai_tri) — N3; tên hiển thị = tên miền (ten = muc)
  // trang hệ thống (luôn mở sẵn) bỏ qua — datLuat từ chối «he_thong»
  const he = allowlistHieuLuc();
  if (web?.length) await tx(async (t) => { for (const w of web) if (!khoaSo(w.muc).some((k) => he.includes(k))) await datLuat(fam, { con: conId, muc: w.muc, ten: w.muc, loai: w.tinhGio ? "giai_tri" : "hoc" }, t); });
  await ghiSuKien(fam, "thiet_lap_lan_dau", { quy, ngu, che_do_chan: cheDo, so_app: app.daDat.length + app.choKhop.length, so_web: web?.length ?? 0 }, { con: conId, nguoi });
  return tomTatThietLap(fam, conId, app);
}

/** Tóm tắt cho màn «Đã ghép máy» / «Xong rồi»: chế độ, phút mỗi ngày, số app được phép, giờ ngủ. */
export async function tomTatThietLap(fam: string, conId: string, app?: { daDat: { ten: string }[]; choKhop: string[] }) {
  const c = await one<{ ten: string; che_do_chan: string | null; cau_hinh: Record<string, unknown>; lich: Record<string, unknown> }>(
    `select ten, che_do_chan, cau_hinh, lich from children where id = $1 and family_id = $2`, [conId, fam]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  // luật trang web (ten = muc — tên miền) đếm riêng ở soWeb, không cộng vào số app (thiết kế 14/11: app và web 2 màn)
  const dem = (await one<{ app: number; web: number }>(`select count(distinct ten) filter (where ten <> muc)::int as app, count(*) filter (where ten = muc)::int as web
    from app_rules where family_id = $1 and child_id = $2 and loai <> 'chan' and het is null`, [fam, conId]))!;
  const soApp = dem.app + (await one<{ n: number }>(`select count(*)::int as n from app_theo_ten where child_id = $1 and khop_luc is null`, [conId]))!.n;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return { conId, ten: c.ten, cheDoChan: cheDoChanCua(c.che_do_chan),
    gioChoi: { ngayThuong: num(c.cau_hinh.quy_ngay_thuong), cuoiTuan: num(c.cau_hinh.quy_cuoi_tuan) },
    ngu: lichCua(c.lich as never).ngu, soApp, soWeb: dem.web, ...(app ? { app } : {}) };
}
