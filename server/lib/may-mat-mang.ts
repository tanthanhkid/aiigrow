// Máy con «mất mạng hôm nay» — một nguồn cho Cần Ba Mẹ để ý, Hôm nay con dùng gì, trạng thái máy (hien-thi-may.ts).
import { one, q } from "./db.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";

/** Máy im lặng quá chừng này (phút) trong hôm nay ⇒ «mất mạng». Agent nhịp 30–120 giây nên 10 phút là chắc. */
const MAT_MANG_PHUT = 10;
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

