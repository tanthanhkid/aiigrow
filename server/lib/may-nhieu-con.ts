// #267 «Mô hình máy»: một Con một máy, một Con nhiều máy, một máy nhiều Con — bảng nối `device_children` (máy ⇄ Con).
//   • Máy nối 1 Con = máy RIÊNG; nối ≥ 2 Con = máy CHUNG (Windows / Mac / Android): mở máy, bé chọn tên + PIN (lib/pin-be.ts), chưa ai vào ⇒ khoá.
//     Chỉ Con trong danh sách nối mới hiện ở «Ai đang dùng máy?» và đăng nhập được (dang-nhap-be, chon-con, X-Phien-Con).
//   • iPhone / iPad (platform ios / ipados) chỉ nối ĐÚNG MỘT Con (hệ điều hành không đổi người dùng) ⇒ gán thêm bị từ chối `ios_mot_con` (409).
//   • Luật đi theo Con: sao, nợ, chế độ app & web, danh sách là của Con; máy chỉ biết «Con nào đang dùng» (devices.con_dang_dung) và áp luật Con đó.
//   • Khoá theo máy = devices.khoa_may (lib/khoa-may.ts — mọi Con trên máy đó); khoá theo Con = children.cau_hinh (mọi máy của Con; máy chung chỉ
//     khoá lúc Con đó đang dùng) — cả hai gộp ở may-con.ts › taoPolicy, không đổi ở đây.
//
// GIAI ĐOẠN CHUYỂN (tương thích ngược agent + app cũ): cột cũ devices.child_id / devices.dung_chung GIỮ, là BẢN SAO SUY RA từ bảng nối —
//   child_id = Con duy nhất khi nối đúng 1 Con (null khi 0 hoặc ≥ 2), dung_chung = nối ≠ 1 Con (0 Con cũng «chung» ⇒ canChonCon, máy khoá
//   chờ Ba Mẹ gán — không bao giờ chạy tự do). CHỈ ghi qua `dongBoCotCu` (mọi chỗ đổi nối gọi nó);
//   mã cũ đọc child_id («máy riêng của ai») / dung_chung («máy chung») vẫn đúng. Bỏ hai cột khi: (1) mã máy chủ đọc hết từ device_children
//   (chỗ còn đọc: grep `child_id|dung_chung` trên bảng devices), (2) app Ba Mẹ đọc `conDs` thay `con` / `dungChung`, (3) mọi agent đang chạy báo
//   phiên bản phát hành sau #267 (tuan_thu_may.phien_ban) — sớm nhất 2 bản phát hành sau bản kèm #267.
// Chuyển dữ liệu (lib/schema.ts › SCHEMA_S3, chạy lại được): máy riêng cũ ⇒ nối child_id; máy dùng chung cũ ⇒ nối MỌI Con trong nhà (iPhone/iPad
//   dùng chung cũ ⇒ một Con: bé đang dùng, không thì bé đăng nhập gần nhất, không thì bé tạo trước) ⇒ đồng bộ cột cũ. Máy cũ không phải ghép lại.
import { one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { trangThaiSao } from "./so-sao.ts";
import { dangKhoa, khoaDen } from "./cau-hinh.ts";
import { gioDiaPhuong } from "./gio.ts";
import { docDongDung, phutTheoMay } from "./phut-dung.ts";

/** Nền tảng chỉ một Con mỗi máy. NEN_TANG chỉ có "ios"; "ipados" nhận phòng agent sau này báo riêng. */
const NEN_MOT_CON = ["ios", "ipados"] as const;
export const laMotCon = (nen: unknown) => (NEN_MOT_CON as readonly string[]).includes(String(nen ?? ""));

const LY_DO_MOT_CON = "iPhone, iPad chỉ dùng cho một bé: hệ điều hành của Apple không cho đổi người dùng trên máy. Muốn bé khác dùng, gỡ máy rồi ghép lại cho bé đó.";
export const loiMotCon = (them?: Record<string, unknown>) => {
  const e = new LoiNghiepVu("ios_mot_con", LY_DO_MOT_CON, 409);
  if (them) e.them = them;
  return e;
};

/** Cột cũ devices.child_id / dung_chung = bản sao suy ra từ bảng nối (xem đầu tệp). Gọi sau MỌI lần đổi nối, trong cùng giao dịch. */
export async function dongBoCotCu(t: Q, mayId: string) {
  // 0 Con ⇒ dung_chung true: Policy canChonCon, không bé nào vào được (hoSoMay rỗng) ⇒ máy khoá chờ Ba Mẹ gán
  await t(`update devices d set child_id = x.mot, dung_chung = x.n <> 1
             from (select count(*)::int as n, case when count(*) = 1 then min(child_id) end as mot from device_children where device_id = $1) x
            where d.id = $1 and (d.child_id is distinct from x.mot or d.dung_chung <> (x.n <> 1))`, [mayId]);
}

/** id các Con nối với máy (thứ tự nối). */
export const idConMay = async (mayId: string, t: Q = q) =>
  (await t<{ child_id: string }>(`select child_id from device_children where device_id = $1 order by created_at, child_id`, [mayId])).map((r) => r.child_id);

/** Con `con` có trong danh sách nối của máy? */
export const coNoi = async (mayId: string, con: string, t: Q = q) =>
  (await t(`select 1 from device_children where device_id = $1 and child_id = $2`, [mayId, con])).length > 0;

/** Danh sách id Con từ body: chuỗi (một Con) hoặc mảng; bỏ trùng / rỗng. */
export function dsConVao(v: unknown): string[] {
  const mang = Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v];
  return [...new Set(mang.map((x) => String(x ?? "").trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
}

/** Mọi id phải là Con của nhà `fam` ⇒ 404 nếu không. */
export async function kiemConNha(t: Q, fam: string, ds: string[]) {
  if (!ds.length) return;
  const co = new Set((await t<{ id: string }>(`select id from children where family_id = $1 and id = any($2::text[])`, [fam, ds])).map((r) => r.id));
  if (ds.some((x) => !co.has(x))) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
}

/** Ghi danh sách nối (thay toàn bộ) trong giao dịch `t` + đồng bộ cột cũ. Không kiểm quyền / số lượng — người gọi kiểm. → {them, bo}. */
export async function ghiNoi(t: Q, may: { id: string; family_id: string }, ds: string[]) {
  const cu = await idConMay(may.id, t);
  const bo = cu.filter((x) => !ds.includes(x)), them = ds.filter((x) => !cu.includes(x));
  if (bo.length) await t(`delete from device_children where device_id = $1 and child_id = any($2::text[])`, [may.id, bo]);
  for (const c of them)
    await t(`insert into device_children(device_id, child_id, family_id) values ($1,$2,$3) on conflict do nothing`, [may.id, c, may.family_id]);
  await dongBoCotCu(t, may.id);
  return { them, bo, cu };
}

/** Kết thúc phiên chơi đang chạy của `con` trên máy `mayId` («Đổi người» / bỏ gán / đăng xuất): phút của bé trước dừng tính. Lỗi không chặn việc chính. */
export async function ketThucPhienTrenMay(mayId: string, con: string | null | undefined, now = new Date()) {
  if (!con) return 0;
  const ds = await q<{ id: string }>(`select id from play_sessions where child_id = $1 and device_id = $2 and trang_thai in ('chay', 'tam')`, [con, mayId]);
  if (!ds.length) return 0;
  const { dungPhien } = await import("./phien.ts");          // nhập động: phien.ts → … → gia-dinh.ts → tệp này (tránh vòng nhập lúc nạp)
  let n = 0;
  for (const p of ds) {
    try { if (await dungPhien(con, p.id, "het_dang_nhap", now)) n++; } catch (e) { console.error("ketThucPhienTrenMay", e); }
  }
  return n;
}

// ---------------------------------------------------------------- phía Ba Mẹ

type MayNoi = { id: string; family_id: string; platform: string; name: string; con_dang_dung: string | null };

/** POST /api/m/may/:id/con {ds: string[]} — đặt danh sách Con dùng máy (≥ 1; iPhone/iPad đúng 1). Con bị bỏ gán đang dùng máy ⇒ thả ra
 *  (phiên Con trên máy xoá, phiên chơi dừng). → chi tiết `conMay`. */
export const datConMay = (fam: string, mayId: string, dsVao: unknown, nguoi?: string | null, now = new Date()) =>
  doiConMay(fam, mayId, () => dsConVao(dsVao), nguoi, now);

/** Đổi danh sách nối: `tinh(cu)` chạy SAU khi khoá dòng máy (select … for update) ⇒ hai lần gán / bỏ gán song song nối đuôi, không mất lần nào. */
async function doiConMay(fam: string, mayId: string, tinh: (cu: string[], m: MayNoi) => string[], nguoi?: string | null, now = new Date()) {
  const kq = await tx(async (t) => {
    const m = (await t<MayNoi>(`select id, family_id, platform, name, con_dang_dung from devices where id = $1 and family_id = $2 for update`, [mayId, fam]))[0];
    if (!m) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
    const ds = tinh(await idConMay(m.id, t), m);
    if (!ds.length) throw new LoiNghiepVu("can_mot_con", "Máy cần ít nhất một bé dùng — muốn bỏ hẳn thì gỡ máy", 400);
    await kiemConNha(t, fam, ds);
    if (laMotCon(m.platform) && ds.length > 1) throw loiMotCon({ toiDa: 1 });
    const r = await ghiNoi(t, m, ds);
    if (!r.them.length && !r.bo.length) return { ...r, m, thaRa: null as string | null };
    // bé bị bỏ gán ⇒ không còn vào máy: xoá phiên Con trên máy, thả «bé đang dùng»
    let thaRa: string | null = null;
    if (r.bo.length) {
      await t(`delete from kid_sessions where device_id = $1 and child_id = any($2::text[])`, [m.id, r.bo]);
      if (m.con_dang_dung && r.bo.includes(m.con_dang_dung)) {
        thaRa = m.con_dang_dung;
        await t(`update devices set con_dang_dung = null, dang_nhap_luc = null where id = $1`, [m.id]);
      }
      await t(`delete from pin_sai where khoa = any($1::text[])`, [r.bo.map((c) => `pin:${m.id}:${c}`)]);
    }
    await ghiSuKien(fam, "doi_con_may", { ten: m.name, ds, them: r.them, bo: r.bo }, { con: ds.length === 1 ? ds[0] : null, may: m.id, nguoi: nguoi ?? undefined }, t);
    return { ...r, m, thaRa };
  });
  for (const c of kq.bo) await ketThucPhienTrenMay(mayId, c, now);
  return { ok: true, them: kq.them, bo: kq.bo, ...(await conMay(fam, mayId, now)) };
}

/** POST /api/m/may/:id/con/:con/gan — gán thêm một Con (máy riêng thành máy chung). iPhone/iPad đã có Con ⇒ 409 ios_mot_con. */
export const ganThemCon = (fam: string, mayId: string, con: string, nguoi?: string | null, now = new Date()) =>
  doiConMay(fam, mayId, (cu, m) => {
    if (cu.includes(con)) return cu;
    if (laMotCon(m.platform) && cu.length >= 1) throw loiMotCon({ toiDa: 1 });
    return [...cu, con];
  }, nguoi, now);

/** POST /api/m/may/:id/con/:con/bo — bỏ gán một Con. Con cuối cùng ⇒ 400 can_mot_con (muốn bỏ hẳn: gỡ máy). */
export const boGanCon = (fam: string, mayId: string, con: string, nguoi?: string | null, now = new Date()) =>
  doiConMay(fam, mayId, (cu) => cu.filter((x) => x !== con), nguoi, now);

/** Con MỚI tạo ⇒ tự nối vào máy chung sẵn có của nhà (máy nối ≠ 1 Con — ≥ 2, hoặc 0 đang khoá chờ Con; không phải iPhone/iPad) — như trước
 *  #267 máy dùng chung «cả nhà» tự có bé mới. Ba Mẹ bỏ gán được. → số máy được nối. */
export async function noiConMoiVaoMayChung(fam: string, con: string) {
  return tx(async (t) => {
    const ds = await t<{ id: string }>(`select d.id from devices d where d.family_id = $1 and d.platform not in ('ios', 'ipados')
        and (select count(*) from device_children x where x.device_id = d.id) <> 1 for update`, [fam]);
    for (const m of ds) {
      await t(`insert into device_children(device_id, child_id, family_id) values ($1,$2,$3) on conflict do nothing`, [m.id, con, fam]);
      await dongBoCotCu(t, m.id);
    }
    return ds.length;
  });
}

/** Bé đang dùng máy (con_dang_dung còn phiên Con trên máy) — như api-may.ts / pin-be.ts › hoSoMay. Máy riêng ⇒ Con của máy khi Ba Mẹ không dùng. */
async function dangDungCua(ds: { id: string; con_dang_dung?: string | null }[], now: Date) {
  const ids = ds.filter((m) => m.con_dang_dung).map((m) => m.id);
  if (!ids.length) return new Set<string>();
  return new Set((await q<{ d: string }>(`select distinct device_id || ':' || child_id as d from kid_sessions where device_id = any($1::text[]) and expires_at > $2`,
    [ids, now])).map((x) => x.d));
}

type ConNgan = { id: string; ten: string; avatar: string };

/** Danh sách máy (dsTuanThu / con/:id): mỗi máy → {conDs, dangDung, motCon}. Một lần đọc cho cả nhà. */
export async function tomTatNoi(fam: string, ds: { id: string; platform: string; con_dang_dung?: string | null; ba_me_den?: Date | null }[], now = new Date()) {
  const noi = await q<{ device_id: string; id: string; ten: string; avatar: string }>(
    `select x.device_id, c.id, c.ten, c.avatar from device_children x join children c on c.id = x.child_id
      where x.family_id = $1 and x.device_id = any($2::text[]) order by x.created_at, c.created_at`, [fam, ds.map((m) => m.id)]);
  const theoMay = new Map<string, ConNgan[]>();
  for (const r of noi) theoMay.set(r.device_id, [...(theoMay.get(r.device_id) ?? []), { id: r.id, ten: r.ten, avatar: r.avatar }]);
  const phien = await dangDungCua(ds, now);
  const out = new Map<string, { conDs: ConNgan[]; dangDung: (ConNgan & { tu?: string | null }) | null; motCon: boolean; soCon: number }>();
  for (const m of ds) {
    const conDs = theoMay.get(m.id) ?? [];
    const bm = m.ba_me_den && new Date(m.ba_me_den).getTime() > now.getTime();
    const ai = bm ? null : conDs.length === 1 ? conDs[0].id : m.con_dang_dung && phien.has(`${m.id}:${m.con_dang_dung}`) ? m.con_dang_dung : null;
    const c = ai ? conDs.find((x) => x.id === ai) ?? null : null;
    out.set(m.id, { conDs, dangDung: c, motCon: laMotCon(m.platform), soCon: conDs.length });
  }
  return out;
}

/** GET /api/m/may/:id/con — «Máy này ai dùng?» + «Máy cả nhà · chi tiết»: mọi Con trong nhà kèm đã gán chưa, bé đang dùng, sao, phút hôm nay
 *  trên máy này, lần cuối dùng máy này, khoá theo Con, máy riêng khác của bé; khoá theo máy. iPhone/iPad: Con chưa gán ⇒ ganDuoc false + lyDo. */
export async function conMay(fam: string, mayId: string, now = new Date()) {
  const m = await one<{ id: string; name: string; platform: string; con_dang_dung: string | null; dang_nhap_luc: Date | null; ba_me_den: Date | null;
    khoa_may: Record<string, unknown> | null; tz: string }>(
    `select d.id, d.name, d.platform, d.con_dang_dung, d.dang_nhap_luc, d.ba_me_den, d.khoa_may, f.tz from devices d join families f on f.id = d.family_id
      where d.id = $1 and d.family_id = $2`, [mayId, fam]);
  if (!m) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  const con = await q<{ id: string; ten: string; avatar: string; cau_hinh: Record<string, unknown>; pin_ma: string | null }>(
    `select id, ten, avatar, cau_hinh, pin_ma from children where family_id = $1 order by created_at`, [fam]);
  const gan = await idConMay(m.id);
  const tom = (await tomTatNoi(fam, [m], now)).get(m.id)!;
  const ngay = gioDiaPhuong(now, m.tz).ngay;
  // #810: phút của Con trên máy này = cùng nguồn với «Đã dùng gì» (lib/phut-dung): không cộng trình duyệt / tiến trình hệ thống, có cả phút web
  const phut = new Map(await Promise.all(con.map(async (c) => [c.id, phutTheoMay(await docDongDung(fam, c.id, ngay, now)).get(m.id) ?? 0] as const)));
  const lanCuoi = new Map((await q<{ child_id: string; luc: Date }>(
    `select child_id, max(created_at) as luc from events where family_id = $1 and device_id = $2 and loai = 'doi_nguoi_may' and child_id is not null
      group by child_id`, [fam, m.id])).map((r) => [r.child_id, r.luc]));
  const mayKhac = await q<{ child_id: string; id: string; name: string; platform: string; n: number }>(
    `select x.child_id, d.id, d.name, d.platform, (select count(*)::int from device_children y where y.device_id = d.id) as n
       from device_children x join devices d on d.id = x.device_id where x.family_id = $1 and x.device_id <> $2 order by d.created_at`, [fam, m.id]);
  const motCon = laMotCon(m.platform);
  const ds = await Promise.all(con.map(async (c) => {
    const daGan = gan.includes(c.id);
    const ganDuoc = daGan || !motCon || gan.length === 0;
    return {
      id: c.id, ten: c.ten, avatar: c.avatar, coPin: !!c.pin_ma, gan: daGan, dangDung: tom.dangDung?.id === c.id,
      // 15/11 sổ sao: số dư Con thấy (ÂM khi nợ) + nợ
      ...(await (async () => { const st = await trangThaiSao(c.id); return { sao: st.sao, no: st.no }; })()),
      phutHomNay: phut.get(c.id) ?? 0,
      lanCuoi: lanCuoi.get(c.id) ? new Date(lanCuoi.get(c.id)!).toISOString() : null,
      khoaCon: { khoa: dangKhoa(c.cau_hinh, now), den: khoaDen(c.cau_hinh, now) },
      mayKhac: mayKhac.filter((x) => x.child_id === c.id).map((x) => ({ id: x.id, ten: x.name, nen: x.platform, rieng: x.n === 1 })),
      ganDuoc, ...(ganDuoc ? {} : { lyDo: LY_DO_MOT_CON }),
    };
  }));
  return {
    may: { id: m.id, ten: m.name, nen: m.platform, motCon, soCon: gan.length, mayChung: gan.length >= 2, mayRieng: gan.length === 1 },
    dangDung: tom.dangDung ? { ...tom.dangDung, tu: gan.length >= 2 && m.dang_nhap_luc ? new Date(m.dang_nhap_luc).toISOString() : null,
      phutHomNay: phut.get(tom.dangDung.id) ?? 0 } : null,
    baMeDungDen: m.ba_me_den && new Date(m.ba_me_den).getTime() > now.getTime() ? new Date(m.ba_me_den).toISOString() : null,
    khoaMay: { khoa: dangKhoa(m.khoa_may, now), den: khoaDen(m.khoa_may, now) },
    ds,
  };
}

// ---------------------------------------------------------------- ghép máy

/** Con nối cho máy vừa ghép: mã mang danh sách (con_ds, ≥ 2) / một Con (child_id) / không Con (mã cũ = máy dùng chung CẢ NHÀ ⇒ mọi Con).
 *  iPhone/iPad mà danh sách > 1 ⇒ agent gửi `chon` (một id trong danh sách) — không gửi / sai ⇒ 409 ios_mot_con kèm `conChon`. */
export async function conChoMayMoi(t: Q, fam: string, platform: string, ma: { child_id: string | null; con_ds?: unknown }, chon?: unknown): Promise<string[]> {
  const tuMa = dsConVao(ma.con_ds);
  let ds: string[];
  if (tuMa.length) ds = (await t<{ id: string }>(`select id from children where family_id = $1 and id = any($2::text[]) order by created_at`, [fam, tuMa])).map((r) => r.id);
  else if (ma.child_id) ds = [ma.child_id];
  else ds = (await t<{ id: string }>(`select id from children where family_id = $1 order by created_at`, [fam])).map((r) => r.id);
  if (laMotCon(platform) && ds.length > 1) {
    const c = String(chon ?? "").trim();
    if (c && ds.includes(c)) return [c];
    const conChon = await t<ConNgan>(`select id, ten, avatar from children where id = any($1::text[]) order by created_at`, [ds]);
    throw loiMotCon({ conChon, canChon: true });
  }
  return ds;
}

// ---------------------------------------------------------------- phía máy / Con

/** «Ai đang dùng máy?» — Con nối với máy (tên, avatar, PIN, sao). */
export const conNoiMay = (mayId: string) =>
  q<{ id: string; ten: string; avatar: string; pin_ma: string | null }>(
    `select c.id, c.ten, c.avatar, c.pin_ma from device_children x join children c on c.id = x.child_id where x.device_id = $1 order by c.created_at`, [mayId]);
