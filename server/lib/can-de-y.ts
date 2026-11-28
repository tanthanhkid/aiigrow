// «Cần Ba Mẹ để ý» + số trên chuông + cờ «máy con mất mạng hôm nay» — thiết kế chốt 06/11 (L19; màn them-0xf9hrgn «Thông báo»,
// them-1mnk3mjz «Hôm nay · máy con mất mạng»). Số trên chuông = ĐÚNG số mục «Cần Ba Mẹ để ý» (không đếm mục «Để biết»).
// Mục (mỗi mục một dòng, xếp mới trước): máy mất mạng (Con cần mã để mở máy) · Con quên PIN · cảnh báo chưa đọc (chú ý / nghiêm trọng) ·
// mỗi lời xin của Con một dòng · mỗi bài Con nộp chờ duyệt một dòng (#727) · #508 Con CÀI app mới trên máy (app thấy sau danh sách đầu, chưa xếp — Con chưa mở được) · máy chưa được bảo vệ đủ.
import { one, q } from "./db.ts";
import { chiTietBaoVe, mucBaoVe, type May } from "./gia-dinh.ts";
import { gioDiaPhuong } from "./gio.ts";
import { dsChoYc } from "./yeu-cau.ts";
import { choDuyet } from "./nhiem-vu.ts";
import { allowlistHieuLuc, dsLuat, laAppAiiGrow, laCongCuHeThong, laTienTrinhNenWindows } from "./luat-app.ts";
import { tenAppDep } from "./ten-app.ts";
import { trangThaiApp } from "./app-may.ts";
import { mayMatMang, type MayMatMang } from "./may-mat-mang.ts";
import { hienThiCuaMay } from "./tuan-thu.ts";
import { LOAI_CHI_BIET } from "./hien-thi-may.ts";
import { cauQuanTriTrong, LOAI_QUAN_TRI_TRONG, quanTriTrongHieuLuc } from "./quan-tri-trong.ts";
export { mayMatMang };

/** #508: app Con CÀI MỚI trên máy — máy chủ thấy sau danh sách đầu tiên của máy (cách ≥ 2 phút), trong 14 ngày, chưa được Ba Mẹ xếp (không «Tính phút» / «Không tính phút»),
 *  không phải app hệ thống / chính AiiGrow. Gộp theo máy. App đã có trong danh sách đầu (lúc ghép máy) KHÔNG tính — Ba Mẹ xếp ở bước App của Lần đầu. */
async function appMoiCaiMay(fam: string, now = new Date()) {
  const rows = await q<{ device_id: string; ten: string; muc: string; dau_luc: Date; ten_may: string; child_id: string | null; dung_chung: boolean; ten_con: string | null }>(
    `select a.device_id, a.ten, a.muc, a.dau_luc, d.name as ten_may, d.child_id, d.dung_chung, c.ten as ten_con
       from app_may a join devices d on d.id = a.device_id left join children c on c.id = d.child_id
      where d.family_id = $1 and a.dau_luc is not null and d.app_dau_luc is not null and a.dau_luc > d.app_dau_luc + interval '2 minutes'
        and a.dau_luc > $2 order by a.dau_luc desc limit 300`, [fam, new Date(now.getTime() - 14 * 86_400_000)]);
  if (!rows.length) return [];
  const luat = await dsLuat(fam);
  const allow = allowlistHieuLuc();
  const theoMay = new Map<string, { mayId: string; tenMay: string; conId: string | null; tenCon: string | null; luc: string; ds: string[] }>();
  for (const r of rows) {
    // #727: tiến trình nền / công cụ hệ thống không phải «app mới» Con cài
    if (laAppAiiGrow(r.muc) || laTienTrinhNenWindows(r.muc) || laCongCuHeThong(r.muc, r.ten) || trangThaiApp(r.muc, r.dung_chung ? "" : r.child_id ?? "", luat, allow, r.ten).trangThai !== "chua_xep") continue;
    const m = theoMay.get(r.device_id) ?? { mayId: r.device_id, tenMay: r.ten_may, conId: r.child_id, tenCon: r.ten_con, luc: new Date(r.dau_luc).toISOString(), ds: [] };
    m.ds.push(tenAppDep(r.muc, r.ten));
    theoMay.set(r.device_id, m);
  }
  return [...theoMay.values()];
}

type MucCanDeY = { id: string; loai: "mat_mang" | "quen_pin" | "canh_bao" | "con_xin" | "nop_bai" | "app_moi" | "chua_bao_ve";
  tieu: string; phu: string; luc: string; con: string | null; may?: string; so: number; nut: string; den: string };

const hhmm = (d: Date, tz: string) => { const g = gioDiaPhuong(d, tz).phut; return `${String(Math.floor(g / 60)).padStart(2, "0")}:${String(g % 60).padStart(2, "0")}`; };

/** #727: MỘT hàm đếm cho thẻ «Cần Ba Mẹ để ý» (Trang chủ), chuông (Cần trả lời), chấm tab Hôm nay — số = đúng số dòng/thẻ hiện ra.
 *  `con`: chỉ mục của Con đó + mục cả nhà (không gắn Con) · `boNopBai`: bỏ «Con nộp bài» (có chỗ riêng ở Việc & quà / Chờ duyệt). */
export function demCanDeY(ds: readonly { loai: string; con: string | null }[], o: { con?: string; boNopBai?: boolean } = {}): number {
  return ds.filter((x) => !(o.boNopBai && x.loai === "nop_bai") && (!o.con || !x.con || x.con === o.con)).length;
}

/** Danh sách «Cần Ba Mẹ để ý» + `soChuong` (= số mục, qua demCanDeY). */
/** `san`: dữ liệu người gọi đã đọc (GET gia-dinh) ⇒ không đọc lại (dsChoYc / choDuyet có ghi phụ: hết hạn lời xin, tự duyệt quá hạn). */
export async function canDeY(fam: string, now = new Date(), san: { yc?: Awaited<ReturnType<typeof dsChoYc>>; nv?: Awaited<ReturnType<typeof choDuyet>>;
  mm?: MayMatMang[] } = {}) {
  const tz = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))?.tz ?? "Asia/Ho_Chi_Minh";
  const [mm, yc, nv, cb, may, appMoi] = await Promise.all([san.mm ?? mayMatMang(fam, now), san.yc ?? dsChoYc(fam, now, { ghi: false }), san.nv ?? choDuyet(fam),
    q<{ id: string; child_id: string | null; device_id: string | null; loai: string; muc: string; noi_dung: string; created_at: Date; ten_con: string | null; ten_may: string | null }>(
      `select a.id, a.child_id, a.device_id, a.loai, a.muc, a.noi_dung, a.created_at, c.ten as ten_con, d.name as ten_may from alerts a
         left join children c on c.id = a.child_id left join devices d on d.id = a.device_id
        where a.family_id = $1 and not a.da_doc and (a.loai in ('quen_pin', 'pin_bi_do') or a.muc in ('chu_y', 'nghiem_trong')) and a.loai <> all($3::text[]) and a.created_at > $2
        order by a.created_at desc limit 40`, [fam, new Date(now.getTime() - 7 * 86_400_000), [...LOAI_CHI_BIET, LOAI_QUAN_TRI_TRONG]]),   // #861: dòng riêng theo máy ở dưới
    q<May & { ten_con: string | null }>(`select d.*, c.ten as ten_con from devices d left join children c on c.id = d.child_id where d.family_id = $1`, [fam]),
    appMoiCaiMay(fam, now)]);
  const ds: MucCanDeY[] = [];
  const matMang = new Set(mm.map((x) => x.mayId));
  for (const m of mm) ds.push({ id: `mat_mang:${m.mayId}`, loai: "mat_mang", tieu: `${m.ten} mất mạng`, phu: `${hhmm(new Date(m.tu), tz)} · Con cần mã để mở máy`,
    luc: m.tu, con: m.conId, may: m.mayId, so: 1, nut: "Lấy mã", den: `/may/${m.mayId}/ma-offline` });
  // #657: cùng nội dung + cùng máy chỉ một dòng (cb xếp mới trước)
  const daCo = new Set<string>();
  for (const a of cb) {
    const khoaTrung = `${a.loai}|${a.noi_dung}|${a.child_id ?? ""}`;   // cùng khoá với boLapCanhBao (nhat-ky.ts)
    if (daCo.has(khoaTrung)) continue;
    daCo.add(khoaTrung);
    // #555: PIN bị nhập sai quá trần ⇒ cùng lối «Đặt PIN» như quên PIN (đặt PIN mới mở khoá ngay)
    if (a.loai === "pin_bi_do") ds.push({ id: `a:${a.id}`, loai: "quen_pin", tieu: `PIN của ${a.ten_con ?? "Con"} bị nhập sai nhiều lần`,
      phu: `${hhmm(new Date(a.created_at), tz)}${a.ten_may ? ` · ${a.ten_may}` : ""} · đặt PIN mới`, luc: new Date(a.created_at).toISOString(), con: a.child_id,
      ...(a.device_id ? { may: a.device_id } : {}), so: 1, nut: "Đặt PIN", den: a.child_id ? `/ho-so/${a.child_id}/pin` : "/thong-bao" });
    else if (a.loai === "quen_pin") ds.push({ id: `a:${a.id}`, loai: "quen_pin", tieu: `${a.ten_con ?? "Con"} quên PIN vào máy`,
      phu: `${hhmm(new Date(a.created_at), tz)}${a.ten_may ? ` · ${a.ten_may}` : ""} · đặt PIN mới`, luc: new Date(a.created_at).toISOString(), con: a.child_id,
      ...(a.device_id ? { may: a.device_id } : {}), so: 1, nut: "Đặt PIN", den: a.child_id ? `/ho-so/${a.child_id}/pin` : "/thong-bao" });
    else ds.push({ id: `a:${a.id}`, loai: "canh_bao", tieu: `Cảnh báo: ${a.noi_dung}`, phu: `${hhmm(new Date(a.created_at), tz)}${a.ten_may ? ` · ${a.ten_may}` : ""}`,
      luc: new Date(a.created_at).toISOString(), con: a.child_id, ...(a.device_id ? { may: a.device_id } : {}), so: 1, nut: "Xem", den: `/canh-bao/${a.id}` });
  }
  // #727: MỖI lời xin một dòng (cùng đơn vị với Chờ duyệt: lời xin) — số trên chuông, thẻ Trang chủ, chấm tab đều đếm cùng một thứ
  for (const r of yc) {
    const vay = r.loai !== "mo_web" && r.loai !== "cai_app" && r.loai !== "khac";
    const ten = r.loai === "mo_web" ? (r.gia_tri ?? "trang web") : tenAppDep(r.gia_tri, r.ten_app);
    ds.push({ id: `con_xin:${r.id}`, loai: "con_xin", tieu: r.loai === "mo_web" ? `Xin mở ${ten}` : r.loai === "cai_app" ? `Xin mở ${ten}`
        : vay ? (r.phut ? `Xin vay ${r.phut} sao` : "Xin vay sao") : "Xin phép",
      phu: `${r.ten_con} · ${hhmm(new Date(r.created_at), tz)}`, luc: new Date(r.created_at).toISOString(), con: r.child_id, so: 1, nut: "Trả lời", den: "/cho-duyet" });
  }
  for (const r of nv) {
    ds.push({ id: `nop_bai:${r.id}`, loai: "nop_bai", tieu: `${r.ten_con} nộp «${r.ten}»`, phu: hhmm(new Date(r.nop_luc), tz),
      luc: new Date(r.nop_luc).toISOString(), con: r.child_id, so: 1, nut: "Duyệt", den: "/cho-duyet" });
  }
  for (const m of appMoi) {
    const ten = m.tenCon ?? m.tenMay;
    ds.push({ id: `app_moi:${m.mayId}`, loai: "app_moi", tieu: `${ten} cài ${m.ds.length} app mới`,
      phu: `${m.ds.slice(0, 2).join(", ")}${m.ds.length > 2 ? "…" : ""} · chờ Ba Mẹ chọn`, luc: m.luc, con: m.conId, may: m.mayId, so: m.ds.length, nut: "Chọn",
      den: m.conId ? `/ung-dung/them?con=${m.conId}` : `/ung-dung/${m.mayId}` });
  }
  // #861: máy Windows còn tài khoản quản trị chưa có mật khẩu (agent báo trong status.quanTriTrong) — tính từ trạng thái máy hiện tại
  // (không từ cảnh báo đã ghi): tự hết khi máy báo [] hoặc máy bị gỡ, tên máy / Con luôn đúng, không hết hạn khi máy vẫn còn trống mật khẩu
  // `luc` = lúc máy bắt đầu báo trống (status.quanTriTrongTu), không nhảy lên đầu mỗi lượt đồng bộ.
  for (const m of may) {
    const qtt = quanTriTrongHieuLuc(m, now);
    if (!qtt.length) continue;
    const tu = typeof m.status?.quanTriTrongTu === "string" && Number.isFinite(Date.parse(m.status.quanTriTrongTu)) ? new Date(m.status.quanTriTrongTu) : new Date(m.last_seen!);
    ds.push({ id: `quan_tri_trong:${m.id}`, loai: "canh_bao", tieu: `Cảnh báo: ${cauQuanTriTrong(m.name, qtt)}`, phu: "Đặt mật khẩu trên máy Con",
      luc: tu.toISOString(), con: m.child_id, may: m.id, so: 1, nut: "Xem", den: `/may/${m.id}` });
  }
  // máy chưa bảo vệ đủ: máy riêng của Con / máy dùng chung đã kết nối (máy chưa từng kết nối ⇒ màn «Đang chờ máy», không phải việc phải để ý)
  // #657: chỉ máy mà màn Máy xếp «Cần sửa» (cùng hienThiMay) — máy mất mạng / đang tắt / đang gỡ đã có dòng riêng hoặc không có gì để sửa
  const hien = await Promise.all(may.map(async (m) => (!m.last_seen || mucBaoVe(m) === "day_du" ? null : await hienThiCuaMay(m, matMang, now))));
  for (const [i, m] of may.entries()) {
    if (hien[i] !== "can_sua") continue;
    const ct = chiTietBaoVe(m);
    ds.push({ id: `chua_bao_ve:${m.id}`, loai: "chua_bao_ve", tieu: `${m.name} chưa được bảo vệ`, phu: ct.thieu[0]?.ten ?? ct.cau,
      luc: new Date(m.last_seen!).toISOString(), con: m.child_id, may: m.id, so: 1, nut: "Sửa", den: `/may/${m.id}` });
  }
  const thu: Record<MucCanDeY["loai"], number> = { mat_mang: 0, quen_pin: 1, canh_bao: 2, con_xin: 3, app_moi: 4, nop_bai: 5, chua_bao_ve: 6 };
  ds.sort((a, b) => thu[a.loai] - thu[b.loai] || Date.parse(b.luc) - Date.parse(a.luc));
  // #727: số ở tiêu đề «Cần Ba Mẹ để ý» của Trang chủ từng Con (không tính bài nộp) — client KHÔNG tự đếm; Con không có dòng riêng ⇒ soCaNha (mục không gắn Con)
  const soTheoCon: Record<string, number> = {};
  for (const c of new Set(ds.map((x) => x.con).filter((x): x is string => !!x))) soTheoCon[c] = demCanDeY(ds, { con: c, boNopBai: true });
  return { ds, soChuong: demCanDeY(ds), soTab: demCanDeY(ds, { boNopBai: true }), soTheoCon, soCaNha: ds.filter((x) => !x.con && x.loai !== "nop_bai").length };
}
