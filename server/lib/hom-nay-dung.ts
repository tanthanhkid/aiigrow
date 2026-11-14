// «Bảo Anh đã dùng gì» hôm nay (thiết kế chốt 14/11 — bm-bao-cao-ngay/03 them-c95l1cwc; khối «đã dùng gì hôm nay» của Trang chủ bm2-trang-chu):
//  · Giờ chơi đã dùng / quỹ hôm nay + Giờ học (phút app học hôm nay, khung giờ học)
//  · «Đã dùng»: từng app / trang web hôm nay — giờ bắt đầu (lần đầu thấy trong ngày), máy, phút, «Chơi» (tính giờ) hay «Học» (dùng thoải mái),
//    «Đang mở» khi đang có phiên chơi của app đó, «Mất mạng» khi máy đó mất mạng hôm nay.
//  · «Bị chặn hôm nay»: con xin mà Ba Mẹ chưa trả lời (Trả lời ›) / đã không cho (Chưa cho) · trang Grow chặn ở tầng DNS (Grow chặn).
// Chỉ tên app / tên miền + thời lượng — không nội dung (như man-hinh.ts).
import { one, q } from "./db.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { chuanMuc } from "./luat-app.ts";
import { tenDoc, TRINH_DUYET } from "./man-hinh.ts";
import { quyHomNay } from "./quy-gio.ts";
import { mayMatMang } from "./can-de-y.ts";
import { bangMang } from "./dns-gia-dinh.ts";

type Luat = { child_id: string; muc: string; ten: string; loai: string; nhom: string };
export type DongDung = { luc: string | null; ten: string; muc: string; kieu: "app" | "web"; may: string | null; nen: string | null; mayId: string | null;
  phut: number; tinhGio: boolean; dangMo: boolean; matMang: boolean };
export type DongChan = { luc: string; ten: string; may: string | null; ly: "dang_xin" | "chua_cho" | "grow_chan"; yeuCau: string | null; phut: number | null };

/** «Tính giờ» (đèn Vàng, trừ quỹ giờ chơi chung) hay «Dùng thoải mái» (đèn Xanh, luật hoc / cho_phep) — N3 14/11.
 *  Luật Đỏ «chan» không có giờ dùng (đã chặn) nhưng nếu có thì coi như tính giờ. App hệ thống / chưa xếp ⇒ theo `usage.loai` agent ghi. */
export function tinhGioCua(loaiUsage: string | null, luat: { loai: string } | undefined) {
  if (luat) return luat.loai !== "hoc";
  return loaiUsage !== "hoc" && loaiUsage !== "he_thong";
}

export async function homNayDung(fam: string, con: string, now = new Date()) {
  const [f, c] = await Promise.all([one<{ tz: string }>(`select tz from families where id = $1`, [fam]),
    one<{ ten: string }>(`select ten from children where id = $1 and family_id = $2`, [con, fam])]);
  const tz = f?.tz ?? "Asia/Ho_Chi_Minh";
  const ngay = gioDiaPhuong(now, tz).ngay, tu = dauNgayUtc(ngay, tz);
  await bangMang();   // bảng DNS tạo lười (dns-gia-dinh.ts)
  const [app, web, luat, phien, may, mm, yc, dns, qy] = await Promise.all([
    q<{ device_id: string; muc: string; loai: string; phut: number; dau_luc: Date | null }>(
      `select device_id, muc, loai, phut, dau_luc from usage where child_id = $1 and ngay = $2 and phut > 0`, [con, ngay]),
    q<{ device_id: string; ten_mien: string; giay: number; dau_luc: Date | null; lan_cuoi: Date | null }>(
      `select w.device_id, w.ten_mien, w.giay, w.dau_luc, w.lan_cuoi from web_nhat_ky w left join devices d on d.id = w.device_id
        where (w.child_id = $1 or (w.child_id is null and d.child_id = $1)) and d.family_id = $2 and w.ngay = $3 and w.giay >= 30`, [con, fam, ngay]),
    q<Luat>(`select child_id, muc, ten, loai, nhom from app_rules where family_id = $1 and child_id in ('', $2) and (het is null or het > $3)`, [fam, con, now]),
    q<{ muc: string; device_id: string | null }>(`select muc, device_id from play_sessions where child_id = $1 and trang_thai = 'chay'`, [con]),
    q<{ id: string; name: string; platform: string }>(`select id, name, platform from devices where family_id = $1`, [fam]),
    mayMatMang(fam, now),
    q<{ id: string; loai: string; gia_tri: string | null; phut: number | null; trang_thai: string; device_id: string | null; created_at: Date }>(
      `select id, loai, gia_tri, phut, trang_thai, device_id, created_at from requests where child_id = $1 and created_at >= $2
        and loai in ('mo_web', 'cai_app', 'ngoai_le', 'ngoai_gio') and (trang_thai = 'tu_choi' or (trang_thai = 'cho' and het_han > $3))
        order by created_at desc limit 20`, [con, tu, now]),   // lời xin «cho» đã quá hạn (con thôi chờ) không còn là «đang xin»
    q<{ ten_mien: string; ten: string; so_lan_chan: number; device_id: string | null }>(
      `select n.ten_mien, t.ten, n.so_lan_chan, t.device_id from dns_nhat_ky n join dns_thiet_bi t on t.id = n.thiet_bi_id
        where t.family_id = $1 and t.child_id = $2 and n.ngay = $3 and n.so_lan_chan > 0 order by n.so_lan_chan desc limit 10`, [fam, con, ngay]),
    quyHomNay(con, now),
  ]);
  const tenMay = new Map(may.map((m) => [m.id, m]));
  const matMang = new Set(mm.map((m) => m.mayId));
  const dangMo = new Set(phien.map((p) => chuanMuc(p.muc)));
  const luatCua = (muc: string) => {
    const m = chuanMuc(muc);
    return luat.filter((l) => m === l.muc || m.endsWith(`.${l.muc}`)).sort((a, b) => b.muc.length - a.muc.length || (b.child_id ? 1 : 0) - (a.child_id ? 1 : 0))[0];
  };
  // gộp theo app / trang (một app dùng ở 2 máy ⇒ một dòng, máy = máy dùng nhiều nhất, giờ = lần đầu sớm nhất)
  const gop = new Map<string, DongDung & { _phutMay: number }>();
  const them = (kieu: "app" | "web", muc0: string, mayId: string, phut: number, dau: Date | null, loaiUsage: string | null) => {
    const muc = chuanMuc(muc0);
    const l = luatCua(muc);
    const k = `${kieu}:${muc}`;
    const m = tenMay.get(mayId);
    const x = gop.get(k);
    if (!x) {
      gop.set(k, { luc: dau ? new Date(dau).toISOString() : null, ten: tenDoc(muc, kieu, l?.ten), muc, kieu,
        may: m?.name ?? null, nen: m?.platform ?? null, mayId: m?.id ?? null, phut, tinhGio: tinhGioCua(loaiUsage, l), dangMo: kieu === "app" && dangMo.has(muc),
        matMang: matMang.has(mayId), _phutMay: phut });
      return;
    }
    x.phut += phut;
    if (dau && (!x.luc || new Date(dau).getTime() < new Date(x.luc).getTime())) x.luc = new Date(dau).toISOString();
    if (phut > x._phutMay) { x._phutMay = phut; x.may = m?.name ?? x.may; x.nen = m?.platform ?? x.nen; x.mayId = m?.id ?? x.mayId; x.matMang = matMang.has(mayId); }
  };
  for (const a of app) if (!TRINH_DUYET.has(chuanMuc(a.muc)) && a.loai !== "he_thong") them("app", a.muc, a.device_id, a.phut, a.dau_luc, a.loai);
  for (const w of web) them("web", w.ten_mien, w.device_id, Math.round(w.giay / 60), w.dau_luc ?? w.lan_cuoi, null);
  const dung = [...gop.values()].filter((x) => x.phut > 0).map(({ _phutMay, ...x }) => x)
    // mới trước (dòng chưa biết giờ xuống cuối), cùng giờ thì dùng nhiều trước
    .sort((a, b) => (b.luc ? new Date(b.luc).getTime() : 0) - (a.luc ? new Date(a.luc).getTime() : 0) || b.phut - a.phut).slice(0, 50);

  const biChan: DongChan[] = [
    ...yc.map((r) => ({ luc: new Date(r.created_at).toISOString(), ten: r.gia_tri || (r.loai === "cai_app" ? "App mới" : r.loai === "mo_web" ? "Trang web" : "Mở máy"),
      may: r.device_id ? tenMay.get(r.device_id)?.name ?? null : null, ly: (r.trang_thai === "cho" ? "dang_xin" : "chua_cho") as DongChan["ly"], yeuCau: r.id, phut: r.phut })),
    ...dns.map((x) => ({ luc: tu.toISOString(), ten: x.ten_mien, may: x.device_id ? tenMay.get(x.device_id)?.name ?? x.ten : x.ten, ly: "grow_chan" as const, yeuCau: null, phut: null })),
  ];
  const phutHoc = dung.filter((x) => !x.tinhGio).reduce((s, x) => s + x.phut, 0);
  return {
    ten: c?.ten ?? "", ngay,
    choi: { daDung: qy.daDung, tongPhut: qy.tongPhut, conPhut: qy.conPhut },
    hoc: { phut: phutHoc, khung: qy.gioHoc ? { tu: qy.gioHoc.tu, den: qy.gioHoc.den } : null },
    dung, biChan,
  };
}
