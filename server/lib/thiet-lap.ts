// Thiết lập lần đầu của Ba Mẹ (L7, thiết kế chốt 05/11 — docs/thiet-ke-chot/bm-lan-dau): chỉ phụ huynh đăng ký; bỏ bước «Bật thông báo»,
// bỏ «Ba hay Mẹ». Luồng: tên Con → Giờ chơi (+ khối chặn 2 chế độ) → Chọn app → Ghép máy (lib/ghep-may.ts) → Đang chờ → Đã ghép → Xong.
// Nhánh «Tôi được mời vào nhà» KHÔNG gọi API này (không tạo Con) — đi lib/thanh-vien.ts (moi/cho-toi, moi/nhan).
// POST /api/m/thiet-lap gom một lần: tạo (hoặc sửa, khi gửi lại `con.id`) hồ sơ Con + sao tặng khởi đầu + chế độ (Mở hết / Theo danh sách) +
// app / web vào danh sách (#262; giờ ngủ bỏ — #258).
// 15/11 (#264, bm1-ob-gio): bỏ quỹ giờ chơi mỗi ngày — `gioChoi` (cũ) gửi lên bị bỏ qua; `saoKhoiDau` 0…200 bước 10 (mặc định 30) tặng MỘT lần
// khi tạo Con («chơi máy bằng sao tự kiếm», 1 sao = 1 phút) — docs/API.md › «Thiết lập lần đầu».
import { one, q, tx } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { conCua, suaCon, taoCon } from "./gia-dinh.ts";
import { lichCua } from "./cau-hinh.ts";
import { datAppChoPhep, datCheDoChan } from "./che-do-chan.ts";
import { cheDoChanCua, cheDoCua, nhanCheDo, nhanNhom, type NhomDs } from "./chan-co-ban.ts";
import { APP_GOI_Y } from "./che-do-chan.ts";
import { allowlistHieuLuc, datLuat, khoaSo, xoaLuat } from "./luat-app.ts";
import { kieuMuc } from "./chinh-sach.ts";
import { tenMienSach } from "./web.ts";
import { saoKhoiDauHopLe, tangSaoKhoiDau } from "./so-sao.ts";
import { phanGhi } from "./gioi-han-choi.ts";
import { gioiHanBm, luuGioiHan } from "./quy-gio.ts";


type ThietLapVao = {
  con?: { id?: unknown; ten?: unknown; namSinh?: unknown; avatar?: unknown };
  /** (cũ) quỹ phút mỗi ngày — bỏ 15/11, gửi lên bị bỏ qua */ gioChoi?: { ngayThuong?: unknown; cuoiTuan?: unknown };
  /** 15/11: sao tặng khởi đầu 0…200 bước 10 (không gửi ⇒ 30). Chỉ tặng khi TẠO Con (gửi lại với con.id không tặng thêm). */
  saoKhoiDau?: unknown;
  /** #302: giới hạn tối đa mỗi ngày (ngày thường / T7–CN) + mỗi lượt tối đa — phút, 0 = không giới hạn (lib/gioi-han-choi.ts) */
  gioiHanNgayThuong?: unknown; gioiHanCuoiTuan?: unknown; phutMoiLuot?: unknown;
  /** (cũ) giờ ngủ — #258 bỏ: gửi lên được nhận, không lưu */ ngu?: { tu?: unknown; den?: unknown };
  /** #262: mo_het | theo_danh_sach (cũ: `cheDoChan` mo_het | chi_app_duoc_phep — vẫn nhận) */ cheDo?: unknown;
  cheDoChan?: unknown;
  /** app được thêm — [{ma?, ten?, nhom?: tinh_phut | khong_tinh_phut, tinhGio? (cũ)}] (che-do-chan.ts › datAppChoPhep) */ apps?: unknown;
  /** Thiết kế chốt 14/11 (them-3xbscpzm «Web cho <Con>»): trang Ba Mẹ chọn — [{muc: tên miền, nhom? | tinhGio? (cũ)}] hoặc ["ten.com"]. */
  web?: unknown;
};

const WEB_TOI_DA = 60;
/** Kiểm + chuẩn hoá danh sách web Lần đầu: tên miền sạch, không trùng. → [{muc, tinhGio}]. */
export function webLanDau(v: unknown): { muc: string; tinhGio: boolean; nhom: NhomDs }[] {
  if (!Array.isArray(v)) throw new LoiNghiepVu("thieu_web", "Gửi danh sách trang web");
  if (v.length > WEB_TOI_DA) throw new LoiNghiepVu("qua_nhieu_web", `Chọn tối đa ${WEB_TOI_DA} trang web`);
  const ra = new Map<string, boolean>();
  for (const x of v) {
    const o = (typeof x === "string" ? { muc: x } : x ?? {}) as { muc?: unknown; tinhGio?: unknown; nhom?: unknown };
    const muc = tenMienSach(o.muc);
    if (!muc) throw new LoiNghiepVu("ten_mien_sai", `«${String(o.muc ?? "").slice(0, 60)}» không phải địa chỉ web (dạng ten.com)`);
    ra.set(muc, o.nhom !== undefined ? nhanNhom(o.nhom) === "tinh_phut" : o.tinhGio === true);
  }
  return [...ra].map(([muc, tinhGio]) => ({ muc, tinhGio, nhom: (tinhGio ? "tinh_phut" : "khong_tinh_phut") as NhomDs }));
}

/** POST /api/m/thiet-lap — một lần cho cả màn tên Con + Giờ chơi + Chọn app. Gửi lại (mất phản hồi) với `con.id` ⇒ sửa, không tạo Con thứ hai. */
export async function thietLapLanDau(fam: string, b: ThietLapVao, nguoi: string) {
  const vaoCon = b.con ?? {};
  // Kiểm MỌI dữ liệu TRƯỚC khi tạo Con: lỗi giữa chừng không để lại Con (app chưa nhận con.id ⇒ gửi lại sẽ tạo Con thứ hai)
  const saoKhoiDau = saoKhoiDauHopLe(b.saoKhoiDau);
  phanGhi(b as Record<string, unknown>);            // #302: giới hạn sai ⇒ lỗi trước khi tạo Con
  const cheDoVao = b.cheDo ?? b.cheDoChan;
  if (cheDoVao !== undefined && !nhanCheDo(cheDoVao)) throw new LoiNghiepVu("che_do_sai", "Chọn «Mở hết» hoặc «Theo danh sách»");
  if (b.apps !== undefined) {
    if (!Array.isArray(b.apps)) throw new LoiNghiepVu("thieu_app", "Gửi danh sách app");
    for (const a of b.apps as { ma?: unknown }[]) if (a?.ma && !APP_GOI_Y.some((x) => x.ma === String(a.ma))) throw new LoiNghiepVu("app_sai", `Không có app «${a.ma}» trong lưới`);
  }
  const web = b.web !== undefined ? webLanDau(b.web) : null;
  let conId: string;
  let daTang = 0;
  if (vaoCon.id) {
    conId = (await conCua(fam, String(vaoCon.id))).id;
    await suaCon(fam, conId, { ten: vaoCon.ten, avatar: vaoCon.avatar }, nguoi);
    // Lần đầu: Con tạo ở bước tên (saoKhoiDau 0), bước «Chơi bằng sao» chọn sau ⇒ gửi kèm con.id thì tặng lúc này — tangSaoKhoiDau chỉ tặng MỘT lần mỗi Con
    if (b.saoKhoiDau !== undefined && b.saoKhoiDau !== null && b.saoKhoiDau !== "") daTang = await tangSaoKhoiDau(conId, saoKhoiDau, nguoi);
  } else {
    conId = await taoCon(fam, { ten: vaoCon.ten, namSinh: vaoCon.namSinh, avatar: vaoCon.avatar, saoKhoiDau }, nguoi);
  }
  await luuGioiHan(fam, conId, b as Record<string, unknown>, nguoi);
  const cheDo = cheDoVao !== undefined ? (await datCheDoChan(fam, conId, cheDoVao, nguoi)).cheDo : null;
  const app = b.apps !== undefined ? await tx((t) => datAppChoPhep(fam, conId, b.apps, nguoi, t)) : { daDat: [], choKhop: [] };
  // trang web Ba Mẹ chọn: «Không tính phút» (hoc, vào thoải mái) / «Tính phút» (giai_tri, trừ sao) — #262; tên hiển thị = tên miền (ten = muc).
  // Trang hệ thống (luôn mở sẵn) bỏ qua — datLuat từ chối «he_thong». Danh sách trang Lần đầu đã ghi giữ ở cau_hinh.web_lan_dau: gửi lại với
  // con.id ⇒ gỡ luật trang ĐÃ bỏ tick (chỉ trang Lần đầu ghi — không đụng trang Ba Mẹ duyệt / xếp ở nơi khác).
  let soWebGhi = 0;
  if (web) {
    const he = allowlistHieuLuc();
    const ghi = web.filter((w) => !khoaSo(w.muc).some((k) => he.includes(k)));
    soWebGhi = ghi.length;
    await tx(async (t) => {
      const cu = (await t<{ ds: unknown }>(`select cau_hinh->'web_lan_dau' as ds from children where id = $1`, [conId]))[0]?.ds;
      const moi = new Set(ghi.map((w) => w.muc));
      const bo = (Array.isArray(cu) ? cu.map(String) : []).filter((m) => !moi.has(m));
      // chỉ gỡ khi luật vẫn là luật Lần đầu đã ghi (ten = muc, không hạn)
      const con = bo.length ? await t<{ muc: string }>(`select muc from app_rules where family_id = $1 and child_id = $2 and muc = any($3::text[])
        and ten = muc and het is null`, [fam, conId, bo]) : [];
      for (const r of con) await xoaLuat(fam, { con: conId, muc: r.muc }, t);
      for (const w of ghi) await datLuat(fam, { con: conId, muc: w.muc, ten: w.muc, loai: w.tinhGio ? "giai_tri" : "hoc" }, t);
      await t(`update children set cau_hinh = cau_hinh || jsonb_build_object('web_lan_dau', $2::jsonb) where id = $1`, [conId, JSON.stringify([...moi])]);
    });
  }
  await ghiSuKien(fam, "thiet_lap_lan_dau", { sao_khoi_dau: vaoCon.id ? daTang : saoKhoiDau, che_do: cheDo, so_app: app.daDat.length + app.choKhop.length, so_web: soWebGhi }, { con: conId, nguoi });
  return tomTatThietLap(fam, conId, app);
}

/** Tóm tắt cho màn «Đã ghép máy» / «Xong rồi»: chế độ (`cheDo` mới + `cheDoChan` cũ), số app / web trong danh sách. `ngu` (cũ) luôn giờ ngủ «tắt». */
export async function tomTatThietLap(fam: string, conId: string, app?: { daDat: { ten: string }[]; choKhop: string[] }) {
  const c = await one<{ ten: string; che_do_chan: string | null; cau_hinh: Record<string, unknown>; lich: Record<string, unknown> }>(
    `select ten, che_do_chan, cau_hinh, lich from children where id = $1 and family_id = $2`, [conId, fam]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  // Đếm app / web: luật web = mục dạng tên miền (kieuMuc «web») mà tên hiển thị chính là tên miền (trang Ba Mẹ chọn / duyệt). App có tên
  // miền trong lưới (duolingo.com ⇒ «Duolingo») vẫn là app. Gói / .exe (kể cả luật duyệt «cai_app» có ten = muc) luôn là app.
  const luat = await q<{ muc: string; ten: string }>(`select muc, ten from app_rules where family_id = $1 and child_id = $2 and loai in ('hoc', 'giai_tri') and het is null`, [fam, conId]);
  const laWeb = (l: { muc: string; ten: string }) => l.ten === l.muc && kieuMuc(l.muc) === "web";
  const dem = { app: new Set(luat.filter((l) => !laWeb(l)).map((l) => l.ten)).size, web: luat.filter(laWeb).length };
  const soApp = dem.app + (await one<{ n: number }>(`select count(*)::int as n from app_theo_ten where child_id = $1 and khop_luc is null`, [conId]))!.n;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return { conId, ten: c.ten, cheDo: cheDoCua(c.che_do_chan), cheDoChan: cheDoChanCua(c.che_do_chan),
    // 15/11: quỹ ngày bỏ — gioChoi (cũ) luôn null; saoKhoiDau = sao đã tặng khởi đầu · sao = số dư hiện tại
    gioChoi: { ngayThuong: null, cuoiTuan: null },
    saoKhoiDau: (await one<{ s: number }>(`select coalesce(sum(delta), 0)::int as s from points where child_id = $1 and loai = 'khoi_dau'`, [conId]))!.s,
    ngu: lichCua(c.lich as never).ngu, soApp, soWeb: dem.web, ...(app ? { app } : {}),
    ...gioiHanBm(c.cau_hinh ?? {}) };
}
