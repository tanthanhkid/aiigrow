// «Cần Ba Mẹ để ý» + số trên chuông + cờ «máy con mất mạng hôm nay» — thiết kế chốt 06/11 (L19; màn them-0xf9hrgn «Thông báo»,
// them-1mnk3mjz «Hôm nay · máy con mất mạng»). Số trên chuông = ĐÚNG số mục «Cần Ba Mẹ để ý» (không đếm mục «Để biết»).
// Mục (mỗi mục một dòng, xếp mới trước): máy mất mạng (Con cần mã để mở máy) · Con quên PIN · cảnh báo chưa đọc (chú ý / nghiêm trọng) ·
// Con đang xin (gộp theo Con) · Con nộp bài chờ duyệt (gộp theo Con) · máy chưa được bảo vệ đủ.
import { one, q } from "./db.ts";
import { chiTietBaoVe, mucBaoVe, type May } from "./gia-dinh.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { dsChoYc } from "./yeu-cau.ts";
import { choDuyet } from "./nhiem-vu.ts";

/** Máy im lặng quá chừng này (phút) trong hôm nay ⇒ «mất mạng». Agent nhịp 30–120 giây nên 10 phút là chắc. */
export const MAT_MANG_PHUT = 10;
/** Nền có nhịp nền đều đặn (iPhone/iPad không chạy nền liên tục ⇒ im lặng không có nghĩa là mất mạng). */
const NEN_NHIP_DEU = ["windows", "mac", "android"];

export type MayMatMang = { mayId: string; ten: string; nen: string; conId: string | null; tenCon: string | null; tu: string; phut: number };

/** Máy con mất mạng HÔM NAY: đã liên lạc trong hôm nay (giờ nhà) mà im lặng > MAT_MANG_PHUT, không phải tắt / ngủ sạch (agent báo trước).
 *  Máy dùng chung tính cho bé đang dùng (devices.con_dang_dung). */
export async function mayMatMang(fam: string, now = new Date()): Promise<MayMatMang[]> {
  const tz = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))?.tz ?? "Asia/Ho_Chi_Minh";
  const dau = dauNgayUtc(gioDiaPhuong(now, tz).ngay, tz);
  const ds = await q<{ id: string; name: string; platform: string; child_id: string | null; con_dang_dung: string | null; last_seen: Date; tat_luc: Date | null;
    ten_con: string | null }>(
    `select d.id, d.name, d.platform, d.child_id, d.con_dang_dung, d.last_seen, t.tat_luc, c.ten as ten_con
       from devices d left join tuan_thu_may t on t.device_id = d.id left join children c on c.id = coalesce(d.child_id, d.con_dang_dung)
      where d.family_id = $1 and d.last_seen is not null and d.last_seen >= $2 and d.last_seen < $3 and d.platform = any($4::text[])
      order by d.last_seen desc`, [fam, dau, new Date(now.getTime() - MAT_MANG_PHUT * 60_000), NEN_NHIP_DEU]);
  return ds.filter((d) => !(d.tat_luc && new Date(d.last_seen).getTime() <= new Date(d.tat_luc).getTime() + 60_000))
    .map((d) => ({ mayId: d.id, ten: d.name, nen: d.platform, conId: d.child_id ?? d.con_dang_dung, tenCon: d.ten_con,
      tu: new Date(d.last_seen).toISOString(), phut: Math.floor((now.getTime() - new Date(d.last_seen).getTime()) / 60_000) }));
}

export type MucCanDeY = { id: string; loai: "mat_mang" | "quen_pin" | "canh_bao" | "con_xin" | "nop_bai" | "chua_bao_ve";
  tieu: string; phu: string; luc: string; con: string | null; may?: string; so: number; nut: string; den: string };

const hhmm = (d: Date, tz: string) => { const g = gioDiaPhuong(d, tz).phut; return `${String(Math.floor(g / 60)).padStart(2, "0")}:${String(g % 60).padStart(2, "0")}`; };

/** Danh sách «Cần Ba Mẹ để ý» + `soChuong` (= số mục). */
/** `san`: dữ liệu người gọi đã đọc (GET gia-dinh) ⇒ không đọc lại (dsChoYc / choDuyet có ghi phụ: hết hạn lời xin, tự duyệt quá hạn). */
export async function canDeY(fam: string, now = new Date(), san: { yc?: Awaited<ReturnType<typeof dsChoYc>>; nv?: Awaited<ReturnType<typeof choDuyet>>;
  mm?: MayMatMang[] } = {}) {
  const tz = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))?.tz ?? "Asia/Ho_Chi_Minh";
  const [mm, yc, nv, cb, may] = await Promise.all([san.mm ?? mayMatMang(fam, now), san.yc ?? dsChoYc(fam, now), san.nv ?? choDuyet(fam),
    q<{ id: string; child_id: string | null; device_id: string | null; loai: string; muc: string; noi_dung: string; created_at: Date; ten_con: string | null; ten_may: string | null }>(
      `select a.id, a.child_id, a.device_id, a.loai, a.muc, a.noi_dung, a.created_at, c.ten as ten_con, d.name as ten_may from alerts a
         left join children c on c.id = a.child_id left join devices d on d.id = a.device_id
        where a.family_id = $1 and not a.da_doc and (a.loai = 'quen_pin' or a.muc in ('chu_y', 'nghiem_trong')) and a.created_at > $2
        order by a.created_at desc limit 20`, [fam, new Date(now.getTime() - 7 * 86_400_000)]),
    q<May & { ten_con: string | null }>(`select d.*, c.ten as ten_con from devices d left join children c on c.id = d.child_id where d.family_id = $1`, [fam])]);
  const ds: MucCanDeY[] = [];
  for (const m of mm) ds.push({ id: `mat_mang:${m.mayId}`, loai: "mat_mang", tieu: `${m.ten} mất mạng`, phu: `${hhmm(new Date(m.tu), tz)} · Con cần mã để mở máy`,
    luc: m.tu, con: m.conId, may: m.mayId, so: 1, nut: "Lấy mã", den: `/may/${m.mayId}/ma-offline` });
  for (const a of cb) {
    if (a.loai === "quen_pin") ds.push({ id: `a:${a.id}`, loai: "quen_pin", tieu: `${a.ten_con ?? "Con"} quên PIN vào máy`,
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
  // máy chưa bảo vệ đủ: máy riêng của Con / máy dùng chung đã kết nối (máy chưa từng kết nối ⇒ màn «Đang chờ máy», không phải việc phải để ý)
  for (const m of may) {
    if (!m.last_seen || mucBaoVe(m) === "day_du") continue;
    const ct = chiTietBaoVe(m);
    ds.push({ id: `chua_bao_ve:${m.id}`, loai: "chua_bao_ve", tieu: `${m.name} chưa được bảo vệ`, phu: ct.thieu[0]?.ten ?? ct.cau,
      luc: new Date(m.last_seen).toISOString(), con: m.child_id, may: m.id, so: 1, nut: "Sửa", den: `/may/${m.id}` });
  }
  const thu: Record<MucCanDeY["loai"], number> = { mat_mang: 0, quen_pin: 1, canh_bao: 2, con_xin: 3, nop_bai: 4, chua_bao_ve: 5 };
  ds.sort((a, b) => thu[a.loai] - thu[b.loai] || Date.parse(b.luc) - Date.parse(a.luc));
  return { ds, soChuong: ds.length };
}
