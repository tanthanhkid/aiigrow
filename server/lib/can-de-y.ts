// «Cần Ba Mẹ để ý» + số trên chuông + cờ «máy con mất mạng hôm nay» — thiết kế chốt 06/11 (L19; màn them-0xf9hrgn «Thông báo»,
// them-1mnk3mjz «Hôm nay · máy con mất mạng»). Số trên chuông = ĐÚNG số mục «Cần Ba Mẹ để ý» (không đếm mục «Để biết»).
// Mục (mỗi mục một dòng, xếp mới trước): máy mất mạng (Con cần mã để mở máy) · Con quên PIN · cảnh báo chưa đọc (chú ý / nghiêm trọng) ·
// Con đang xin (gộp theo Con) · Con nộp bài chờ duyệt (gộp theo Con) · #508 Con CÀI app mới trên máy (app thấy sau danh sách đầu, chưa xếp — Con chưa mở được) · máy chưa được bảo vệ đủ.
import { one, q } from "./db.ts";
import { chiTietBaoVe, mucBaoVe, type May } from "./gia-dinh.ts";
import { gioDiaPhuong } from "./gio.ts";
import { dsChoYc } from "./yeu-cau.ts";
import { choDuyet } from "./nhiem-vu.ts";
import { allowlistHieuLuc, dsLuat, laAppAiiGrow } from "./luat-app.ts";
import { trangThaiApp } from "./app-may.ts";
import { mayMatMang, type MayMatMang } from "./may-mat-mang.ts";
import { hienThiCuaMay } from "./tuan-thu.ts";
import { LOAI_CHI_BIET } from "./hien-thi-may.ts";
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
    if (laAppAiiGrow(r.muc) || trangThaiApp(r.muc, r.dung_chung ? "" : r.child_id ?? "", luat, allow, r.ten).trangThai !== "chua_xep") continue;
    const m = theoMay.get(r.device_id) ?? { mayId: r.device_id, tenMay: r.ten_may, conId: r.child_id, tenCon: r.ten_con, luc: new Date(r.dau_luc).toISOString(), ds: [] };
    m.ds.push(r.ten);
    theoMay.set(r.device_id, m);
  }
  return [...theoMay.values()];
}

type MucCanDeY = { id: string; loai: "mat_mang" | "quen_pin" | "canh_bao" | "con_xin" | "nop_bai" | "app_moi" | "chua_bao_ve";
  tieu: string; phu: string; luc: string; con: string | null; may?: string; so: number; nut: string; den: string };

const hhmm = (d: Date, tz: string) => { const g = gioDiaPhuong(d, tz).phut; return `${String(Math.floor(g / 60)).padStart(2, "0")}:${String(g % 60).padStart(2, "0")}`; };

/** Danh sách «Cần Ba Mẹ để ý» + `soChuong` (= số mục). */
/** `san`: dữ liệu người gọi đã đọc (GET gia-dinh) ⇒ không đọc lại (dsChoYc / choDuyet có ghi phụ: hết hạn lời xin, tự duyệt quá hạn). */
export async function canDeY(fam: string, now = new Date(), san: { yc?: Awaited<ReturnType<typeof dsChoYc>>; nv?: Awaited<ReturnType<typeof choDuyet>>;
  mm?: MayMatMang[] } = {}) {
  const tz = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))?.tz ?? "Asia/Ho_Chi_Minh";
  const [mm, yc, nv, cb, may, appMoi] = await Promise.all([san.mm ?? mayMatMang(fam, now), san.yc ?? dsChoYc(fam, now, { ghi: false }), san.nv ?? choDuyet(fam),
    q<{ id: string; child_id: string | null; device_id: string | null; loai: string; muc: string; noi_dung: string; created_at: Date; ten_con: string | null; ten_may: string | null }>(
      `select a.id, a.child_id, a.device_id, a.loai, a.muc, a.noi_dung, a.created_at, c.ten as ten_con, d.name as ten_may from alerts a
         left join children c on c.id = a.child_id left join devices d on d.id = a.device_id
        where a.family_id = $1 and not a.da_doc and (a.loai = 'quen_pin' or a.muc in ('chu_y', 'nghiem_trong')) and a.loai <> all($3::text[]) and a.created_at > $2
        order by a.created_at desc limit 40`, [fam, new Date(now.getTime() - 7 * 86_400_000), LOAI_CHI_BIET]),
    q<May & { ten_con: string | null }>(`select d.*, c.ten as ten_con from devices d left join children c on c.id = d.child_id where d.family_id = $1`, [fam]),
    appMoiCaiMay(fam, now)]);
  const ds: MucCanDeY[] = [];
  const matMang = new Set(mm.map((x) => x.mayId));
  for (const m of mm) ds.push({ id: `mat_mang:${m.mayId}`, loai: "mat_mang", tieu: `${m.ten} mất mạng`, phu: `${hhmm(new Date(m.tu), tz)} · Con cần mã để mở máy`,
    luc: m.tu, con: m.conId, may: m.mayId, so: 1, nut: "Lấy mã", den: `/may/${m.mayId}/ma-offline` });
  // #657: cùng nội dung + cùng máy chỉ một dòng (cb xếp mới trước)
  const daCo = new Set<string>();
  for (const a of cb) {
    const khoaTrung = `${a.loai}|${a.noi_dung}|${a.device_id ?? ""}|${a.child_id ?? ""}`;
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
  const theoCon = <T extends { child_id: string; ten_con: string }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) m.set(x.child_id, [...(m.get(x.child_id) ?? []), x]);
    return [...m.values()];
  };
  for (const g of theoCon(yc)) {
    const moi = g.reduce((a, b) => (new Date(b.created_at) > new Date(a.created_at) ? b : a));
    ds.push({ id: `con_xin:${g[0].child_id}`, loai: "con_xin", tieu: `${g[0].ten_con} xin ${g.length} việc`,
      phu: g.slice(0, 3).map((r) => (r.loai === "them_gio" ? `thêm ${r.phut ?? ""} phút`.replace("  ", " ") : r.gia_tri ? `Mở ${r.gia_tri}` : "xin phép")).join(" · "),
      luc: new Date(moi.created_at).toISOString(), con: g[0].child_id, so: g.length, nut: "Trả lời", den: "/cho-duyet" });
  }
  for (const g of theoCon(nv)) {
    const moi = g.reduce((a, b) => (new Date(b.nop_luc) > new Date(a.nop_luc) ? b : a));
    ds.push({ id: `nop_bai:${g[0].child_id}`, loai: "nop_bai", tieu: `${g[0].ten_con} nộp bài ${g.length} việc`, phu: hhmm(new Date(moi.nop_luc), tz),
      luc: new Date(moi.nop_luc).toISOString(), con: g[0].child_id, so: g.length, nut: "Duyệt", den: "/cho-duyet" });
  }
  for (const m of appMoi) {
    const ten = m.tenCon ?? m.tenMay;
    ds.push({ id: `app_moi:${m.mayId}`, loai: "app_moi", tieu: `${ten} cài ${m.ds.length} app mới`,
      phu: `${m.ds.slice(0, 2).join(", ")}${m.ds.length > 2 ? "…" : ""} · chờ Ba Mẹ chọn`, luc: m.luc, con: m.conId, may: m.mayId, so: m.ds.length, nut: "Chọn",
      den: m.conId ? `/ung-dung/them?con=${m.conId}` : `/ung-dung/${m.mayId}` });
  }
  // máy chưa bảo vệ đủ: máy riêng của Con / máy dùng chung đã kết nối (máy chưa từng kết nối ⇒ màn «Đang chờ máy», không phải việc phải để ý)
  // #657: chỉ máy mà màn Máy xếp «Cần sửa» (cùng hienThiMay) — máy mất mạng / đang tắt / đang gỡ đã có dòng riêng hoặc không có gì để sửa
  for (const m of may) {
    if (!m.last_seen || mucBaoVe(m) === "day_du") continue;
    if ((await hienThiCuaMay(m, matMang, now)) !== "can_sua") continue;
    const ct = chiTietBaoVe(m);
    ds.push({ id: `chua_bao_ve:${m.id}`, loai: "chua_bao_ve", tieu: `${m.name} chưa được bảo vệ`, phu: ct.thieu[0]?.ten ?? ct.cau,
      luc: new Date(m.last_seen).toISOString(), con: m.child_id, may: m.id, so: 1, nut: "Sửa", den: `/may/${m.id}` });
  }
  const thu: Record<MucCanDeY["loai"], number> = { mat_mang: 0, quen_pin: 1, canh_bao: 2, con_xin: 3, app_moi: 4, nop_bai: 5, chua_bao_ve: 6 };
  ds.sort((a, b) => thu[a.loai] - thu[b.loai] || Date.parse(b.luc) - Date.parse(a.luc));
  return { ds, soChuong: ds.length };
}
