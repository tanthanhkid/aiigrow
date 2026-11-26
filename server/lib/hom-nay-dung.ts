// «Bảo Anh đã dùng gì» hôm nay (thiết kế chốt 14/11 — bm-bao-cao-ngay/03 them-c95l1cwc; khối «đã dùng gì hôm nay» của Trang chủ bm2-trang-chu):
//  · Giờ chơi đã dùng / quỹ hôm nay + Giờ học (phút app học hôm nay, khung giờ học)
//  · «Đã dùng»: từng app / trang web hôm nay — giờ bắt đầu (lần đầu thấy trong ngày), máy, phút, «Chơi» (tính giờ) hay «Học» (dùng thoải mái),
//    «Đang mở» khi đang có phiên chơi của app đó, «Mất mạng» khi máy đó mất mạng hôm nay.
//  · «Bị chặn hôm nay»: con xin mà Ba Mẹ chưa trả lời (Trả lời ›) / đã bỏ qua (Chưa cho). #258: bỏ dòng «web người lớn · Grow chặn» (DNS).
//  · #262: «Giờ học» ⇒ «Không tính phút» (`khongTinhPhut` = phút app / web nhóm Không tính phút; `hoc` giữ cho app cũ, khung luôn null).
// Chỉ tên app / tên miền + thời lượng — không nội dung (như man-hinh.ts).
import { one, q } from "./db.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { chuanMuc, laAppAiiGrow, laTienTrinhNenWindows } from "./luat-app.ts";
import { tenDoc, TRINH_DUYET } from "./man-hinh.ts";
import { quyHomNay, soHomNay } from "./quy-gio.ts";
import { mayMatMang } from "./can-de-y.ts";
import { LA_APP } from "./so-sao.ts";
import { mucGop, tenThanThien } from "./ten-than-thien.ts";

type Luat = { child_id: string; muc: string; ten: string; loai: string; nhom: string };
type DongDung = { luc: string | null; ten: string; muc: string; kieu: "app" | "web"; may: string | null; nen: string | null; mayId: string | null;
  phut: number; tinhGio: boolean; chuaXep: boolean; dangMo: boolean; matMang: boolean };
/** `ly` «grow_chan» (cũ) không còn trả từ #258. */
type DongChan = { luc: string; ten: string; may: string | null; ly: "dang_xin" | "chua_cho" | "grow_chan"; yeuCau: string | null; phut: number | null };

/** «Tính giờ» (đèn Vàng, trừ quỹ giờ chơi chung) hay «Dùng thoải mái» (đèn Xanh, luật hoc / cho_phep) — N3 14/11.
 *  #623: chỉ TRỪ SAO khi đúng như ví (may-con.ts): luật giai_tri / chan, hoặc không luật mà `usage.loai` = giai_tri. Không luật + loại chưa phân loại
 *  (vd applicationframehost, searchapp) ⇒ «Chưa xếp» (`chuaXepCua`), không ước tính «−N sao» vì ví không trừ. */
export function tinhGioCua(loaiUsage: string | null, luat: { loai: string } | undefined) {
  if (luat && luat.loai !== "loai_tru") return luat.loai !== "hoc";
  return loaiUsage === "giai_tri";
}
/** Không luật, không phải giai_tri / hoc / he_thong ⇒ chưa ai xếp (không tính giờ, không trừ sao). */
export function chuaXepCua(loaiUsage: string | null, luat: { loai: string } | undefined) {
  if (luat && luat.loai !== "loai_tru") return false;
  return loaiUsage !== "giai_tri" && loaiUsage !== "hoc" && loaiUsage !== "he_thong";
}

export async function homNayDung(fam: string, con: string, now = new Date(), o: { gioiHan?: number } = {}) {
  const [f, c] = await Promise.all([one<{ tz: string }>(`select tz from families where id = $1`, [fam]),
    one<{ ten: string }>(`select ten from children where id = $1 and family_id = $2`, [con, fam])]);
  const tz = f?.tz ?? "Asia/Ho_Chi_Minh";
  const ngay = gioDiaPhuong(now, tz).ngay, tu = dauNgayUtc(ngay, tz);
  const [app, web, luat, phien, may, mm, yc, qy] = await Promise.all([
    q<{ device_id: string; muc: string; loai: string; phut: number; dau_luc: Date | null }>(
      `select device_id, muc, loai, phut, dau_luc from usage where child_id = $1 and ngay = $2 and phut > 0`, [con, ngay]),
    q<{ device_id: string; ten_mien: string; giay: number; dau_luc: Date | null; lan_cuoi: Date | null }>(
      `select w.device_id, w.ten_mien, w.giay, w.dau_luc, w.lan_cuoi from web_nhat_ky w left join devices d on d.id = w.device_id
        where (w.child_id = $1 or (w.child_id is null and d.child_id = $1)) and d.family_id = $2 and w.ngay = $3 and w.giay > 0`, [con, fam, ngay]),
    q<Luat>(`select child_id, muc, ten, loai, nhom from app_rules where family_id = $1 and child_id in ('', $2) and (het is null or het > $3)`, [fam, con, now]),
    q<{ muc: string; device_id: string | null }>(`select muc, device_id from play_sessions where child_id = $1 and trang_thai = 'chay'`, [con]),
    q<{ id: string; name: string; platform: string }>(`select id, name, platform from devices where family_id = $1`, [fam]),
    mayMatMang(fam, now),
    q<{ id: string; loai: string; gia_tri: string | null; ten_app: string | null; phut: number | null; trang_thai: string; device_id: string | null; created_at: Date }>(
      `select id, loai, gia_tri, ten_app, phut, trang_thai, device_id, created_at from requests where child_id = $1 and created_at >= $2
        and loai in ('mo_web', 'cai_app') and (trang_thai in ('tu_choi', 'bo_qua') or (trang_thai = 'cho' and het_han > $3))
        order by created_at desc limit 20`, [con, tu, now]),   // lời xin «cho» đã quá hạn (con thôi chờ) không còn là «đang xin»
    quyHomNay(con, now),
  ]);
  const tenMay = new Map(may.map((m) => [m.id, m]));
  const matMang = new Set(mm.map((m) => m.mayId));
  const dangMo = new Set(phien.map((p) => chuanMuc(p.muc)));
  const luatCua = (muc: string) => {
    const m = chuanMuc(muc);
    return luat.filter((l) => m === l.muc || m.endsWith(`.${l.muc}`) || m === mucGop(l.muc)).sort((a, b) => b.muc.length - a.muc.length || (b.child_id ? 1 : 0) - (a.child_id ? 1 : 0))[0];
  };
  // gộp theo app / trang (một app dùng ở 2 máy ⇒ một dòng, máy = máy dùng nhiều nhất, giờ = lần đầu sớm nhất)
  const gop = new Map<string, DongDung & { _phutMay: number }>();
  const them = (kieu: "app" | "web", muc0: string, mayId: string, phut: number, dau: Date | null, loaiUsage: string | null) => {
    const muc = kieu === "app" ? mucGop(chuanMuc(muc0)) : chuanMuc(muc0);   // #659: tên trùng (OneDrive / Microsoft OneDrive…) về một mục
    const l = luatCua(muc);
    const k = `${kieu}:${muc}`;
    const m = tenMay.get(mayId);
    const x = gop.get(k);
    if (!x) {
      gop.set(k, { luc: dau ? new Date(dau).toISOString() : null, ten: tenDoc(muc, kieu, l?.ten), muc, kieu,
        may: m?.name ?? null, nen: m?.platform ?? null, mayId: m?.id ?? null, phut, tinhGio: tinhGioCua(loaiUsage, l), chuaXep: chuaXepCua(loaiUsage, l), dangMo: kieu === "app" && dangMo.has(muc),
        matMang: matMang.has(mayId), _phutMay: phut });
      return;
    }
    x.phut += phut;
    // cùng mục ở máy khác có loại khác ⇒ gộp theo nhóm «mạnh» nhất (tính giờ > không tính > chưa xếp), không theo thứ tự dòng
    if (tinhGioCua(loaiUsage, l)) { x.tinhGio = true; x.chuaXep = false; } else if (!chuaXepCua(loaiUsage, l)) x.chuaXep = false;
    if (dau && (!x.luc || new Date(dau).getTime() < new Date(x.luc).getTime())) x.luc = new Date(dau).toISOString();
    if (phut > x._phutMay) { x._phutMay = phut; x.may = m?.name ?? x.may; x.nen = m?.platform ?? x.nen; x.mayId = m?.id ?? x.mayId; x.matMang = matMang.has(mayId); }
  };
  for (const a of app) if (!laAppAiiGrow(a.muc) && !TRINH_DUYET.has(chuanMuc(a.muc)) && a.loai !== "he_thong" && !(laTienTrinhNenWindows(a.muc) && !luatCua(chuanMuc(a.muc)))) them("app", a.muc, a.device_id, a.phut, a.dau_luc, a.loai);
  // #704: phút web cộng theo GIÂY (nhiều máy / nhiều lần cùng tên miền) rồi mới làm tròn một lần ở dòng — như phút «Giờ chơi» (quy-gio › phutDaDung)
  for (const w of web) them("web", w.ten_mien, w.device_id, Number(w.giay) / 60, w.dau_luc ?? w.lan_cuoi, null);
  const tatCa = [...gop.values()].map(({ _phutMay, ...x }) => ({ ...x, _phut: x.phut, phut: x.kieu === "web" ? Math.round(x.phut) : x.phut })).filter((x) => x.phut > 0);
  // #704: tổng «Không tính phút» + số mục «Đã dùng» tính trên CẢ ngày (trước khi cắt danh sách), tổng phút cộng số lẻ rồi làm tròn một lần
  const phutHoc = Math.round(tatCa.filter((x) => !x.tinhGio && !x.chuaXep).reduce((s, x) => s + x._phut, 0));
  const dung = tatCa.map(({ _phut, ...x }) => x)
    // mới trước (dòng chưa biết giờ xuống cuối), cùng giờ thì dùng nhiều trước
    .sort((a, b) => (b.luc ? new Date(b.luc).getTime() : 0) - (a.luc ? new Date(a.luc).getTime() : 0) || b.phut - a.phut).slice(0, o.gioiHan ?? 50);

  const biChan: DongChan[] = [
    ...yc.map((r) => ({ luc: new Date(r.created_at).toISOString(), ten: (r.loai === "cai_app" ? tenThanThien(r.gia_tri) : undefined) || r.ten_app || r.gia_tri || (r.loai === "cai_app" ? "App mới" : r.loai === "mo_web" ? "Trang web" : "Mở máy"),
      may: r.device_id ? tenMay.get(r.device_id)?.name ?? null : null, ly: (r.trang_thai === "cho" ? "dang_xin" : "chua_cho") as DongChan["ly"], yeuCau: r.id, phut: r.phut })),
  ];
  return {
    ten: c?.ten ?? "", ngay,
    // 15/11: conPhut = sao tiêu được (1 sao = 1 phút) · sao = sổ sao (số dư âm được, nợ)
    // #705/#700: daChoi / gioiHanNgay / conNgay = một nguồn với máy Con (quy-gio › soHomNay); daDung (phút đo, số lẻ) giữ cho app cũ
    choi: { daDung: qy.daDung, tongPhut: qy.tongPhut, conPhut: qy.conPhut, sao: qy.soSao, ...soHomNay(qy) },
    khongTinhPhut: { phut: phutHoc },
    /** (cũ) = khongTinhPhut; giờ học đã bỏ (#258) ⇒ khung luôn null */ hoc: { phut: phutHoc, khung: null },
    /** #704: số mục đã dùng cả ngày (danh sách `dung` chỉ gọn 50 dòng mới nhất) */ soDung: tatCa.length,
    dung, biChan,
  };
}

type AppHomNay = { ten: string; muc: string; kieu: "app" | "web"; phut: number; nhom: "tinh_phut" | "khong_tinh_phut"; sao: number;
  dangMo: boolean; may: string | null };

/** Màn Con «Đang chơi» (`kid/sao` › appHomNay): phút từng app / trang hôm nay + số sao đã trừ cho app đó («Roblox 30 phút · −30 sao»).
 *  Phút = «đã dùng gì» của Ba Mẹ (homNayDung, ĐỦ mọi mục — không cắt 50 — gộp mọi máy của Con); `sao` = tổng dòng sổ `choi` hôm nay của mục
 *  (ref `choi:<ngày>:<mục>`) ⇒ «Không tính phút» / «Mở hết» / phút mở bằng mã = 0 sao. iPhone/iPad của bé (một bé — #267; Apple không cho biết tên
 *  app) ⇒ một dòng «Tính phút trên <máy>». Mục chỉ có trong sổ (phiên app Con…) hiện riêng; dòng sổ không mục / máy đã gỡ ⇒ gom một dòng «Khác».
 *  ⇒ tổng `sao` = `phutChoiHomNay`. `c` (family_id, tz) truyền vào để khỏi tra lại. */
export async function appHomNayCon(con: string, now = new Date(), c0?: { family_id: string; tz: string } | null): Promise<AppHomNay[]> {
  const c = c0 ?? await one<{ family_id: string; tz: string }>(`select c.family_id, f.tz from children c join families f on f.id = c.family_id where c.id = $1`, [con]);
  if (!c) return [];
  const ngay = gioDiaPhuong(now, c.tz).ngay, goc = `choi:${ngay}:`;
  const [hn, so, ios] = await Promise.all([
    homNayDung(c.family_id, con, now, { gioiHan: Infinity }),
    // mọi dòng `choi` từ nửa đêm (đúng tập của phutDaTruHomNay); ref khác dạng ⇒ mục rỗng (vào «Khác»)
    q<{ muc: string; sao: number }>(`select case when left(coalesce(ref, ''), $4::int) = $3 then substr(ref, $4::int + 1) else '' end as muc,
        coalesce(-sum(delta), 0)::int as sao from points where child_id = $1 and loai = 'choi' and created_at >= $2 group by 1`,
      [con, dauNgayUtc(ngay, c.tz), goc, goc.length]),
    q<{ id: string; name: string; status: Record<string, unknown> | null }>(
      `select id, name, status from devices where family_id = $2 and platform = 'ios' and child_id = $1`, [con, c.family_id]),
  ]);
  const saoMuc = new Map<string, number>();
  for (const r of so) {
    const k = !r.muc ? "" : r.muc.startsWith("ios:") ? r.muc : mucGop(chuanMuc(r.muc));
    saoMuc.set(k, (saoMuc.get(k) ?? 0) + Number(r.sao));
  }
  const ra: AppHomNay[] = hn.dung.map((x) => {
    const sao = saoMuc.get(x.muc) ?? 0;
    saoMuc.delete(x.muc);
    return { ten: x.ten, muc: x.muc, kieu: x.kieu, phut: x.phut, nhom: x.tinhGio ? "tinh_phut" : "khong_tinh_phut", sao, dangMo: x.dangMo, may: x.may };
  });
  for (const m of ios) {
    const st = (m.status?.ios ?? null) as { phutDaDung?: number; luc?: string } | null;
    const phut = st?.luc && gioDiaPhuong(new Date(st.luc), c.tz).ngay === ngay ? Math.max(0, Math.round(Number(st.phutDaDung) || 0)) : 0;
    const k = `ios:${m.id}`, sao = saoMuc.get(k) ?? 0;
    saoMuc.delete(k);
    if (phut > 0 || sao > 0) ra.push({ ten: `Tính phút trên ${m.name}`, muc: k, kieu: "app", phut: Math.max(phut, sao), nhom: "tinh_phut", sao, dangMo: false, may: m.name });
  }
  let khac = 0;
  for (const [muc, sao] of saoMuc) {
    if (!(sao > 0)) continue;
    if (!muc || muc.startsWith("ios:")) { khac += sao; continue; }
    const kieu = LA_APP.test(muc) ? "app" : "web";
    ra.push({ ten: tenDoc(muc, kieu), muc, kieu, phut: sao, nhom: "tinh_phut", sao, dangMo: false, may: null });
  }
  ra.sort((a, b) => b.phut - a.phut || b.sao - a.sao);
  if (khac > 0) ra.push({ ten: "Khác", muc: "", kieu: "app", phut: khac, nhom: "tinh_phut", sao: khac, dangMo: false, may: null });
  return ra;
}
