// App & web theo Con (#262 / #258, thiết kế chốt 14–15/11 — hành trình «Ứng dụng & web trên máy») — phần có CSDL: đổi chế độ «Mở hết» /
// «Theo danh sách», DANH SÁCH TRẮNG của Con (app + web, mỗi mục một nhóm «Tính phút» / «Không tính phút»): xem, thêm (lưới gợi ý, theo tên app,
// theo tên miền), đổi nhóm, bỏ khỏi danh sách; khớp app theo tên khi máy gửi danh sách app thật; Con «Xin Ba Mẹ mở» app / web chưa có.
// Phần thuần (chế độ, nhóm, lưới an toàn): lib/chan-co-ban.ts. Lời xin + 3 cách trả lời (Tính phút / Không tính phút / Bỏ qua): lib/yeu-cau.ts.
import { tenThanThien } from "./ten-than-thien.ts";
import { q, one, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { conCua, type May } from "./gia-dinh.ts";
import { allowlistHieuLuc, boMucChoCon, chuanMuc, datLuat, khoaSo, type NhomGiaiTri } from "./luat-app.ts";
import { kieuMuc } from "./chinh-sach.ts";
import { dsBoQua, guiYeuCau } from "./yeu-cau.ts";
import { gioDiaPhuong } from "./gio.ts";
import { tenMienSach } from "./web.ts";
import {
  cheDoChanCua, cheDoCua, loaiTuNhom, nhanCheDo, nhanNhom, nhomTuLoai, TEN_CHE_DO, TEN_NHOM_DS, type NhomDs,
} from "./chan-co-ban.ts";

/** POST /api/m/con/:id/che-do {cheDo: mo_het | theo_danh_sach} (đường cũ con/:id/che-do-chan, giá trị cũ chi_app_duoc_phep vẫn nhận).
 *  Máy nhận ở lần đồng bộ kế. → { cheDo, cheDoChan (giá trị cũ), ten }. */
export async function datCheDoChan(fam: string, con: string, v: unknown, nguoi?: string) {
  const moi = nhanCheDo(v);
  if (!moi) throw new LoiNghiepVu("che_do_sai", "Chọn «Mở hết» hoặc «Theo danh sách»");
  await conCua(fam, con);
  // #433 A10: đổi chế độ + sự kiện doi_che_do_chan trong MỘT giao dịch khoá dòng Con — phút chơi tính theo mốc sự kiện (so-sao.ts ›
  // phutTheoDanhSach), hai lần đổi song song không ghi lệch «tu».
  await tx(async (t) => {
    const r = (await t<{ che_do_chan: unknown }>(`select che_do_chan from children where id = $1 for update`, [con]))[0];
    const cu = cheDoCua(r?.che_do_chan);
    await t(`update children set che_do_chan = $2 where id = $1`, [con, moi]);
    if (cu !== moi) await ghiSuKien(fam, "doi_che_do_chan", { tu: cu, sang: moi }, { con, nguoi }, t);
  });
  return { cheDo: moi, cheDoChan: cheDoChanCua(moi), ten: TEN_CHE_DO[moi] };
}

// ---------------------------------------------------------------- lưới app gợi ý (màn «Con được dùng app nào?» / «Thêm app»)
// Mỗi app một mã + mọi định danh đã biết trên các nền (tệp .exe Windows, bundle macOS / iOS, gói Android, tên miền). Chọn app ⇒ ghi luật cho
// MỌI định danh (một lựa chọn chạy đúng trên mọi máy của Con). tinhGio: true = tính vào giờ chơi (giai_tri), false = app học, không tính giờ (hoc).
type AppGoiY = { ma: string; ten: string; tinhGio: boolean; nhom: NhomGiaiTri | null; muc: string[]; goiY?: ("nhi" | "teen")[] };
export const APP_GOI_Y: AppGoiY[] = [
  { ma: "youtube_kids", ten: "YouTube Kids", tinhGio: true, nhom: "video_ngan", goiY: ["nhi"],
    muc: ["youtubekids.com", "com.google.android.apps.youtube.kids", "com.google.ios.youtubekids"] },
  { ma: "roblox", ten: "Roblox", tinhGio: true, nhom: "game", goiY: ["nhi"],
    muc: ["robloxplayerbeta.exe", "roblox.exe", "com.roblox.robloxplayer", "com.roblox.client", "roblox.com"] },
  { ma: "minecraft", ten: "Minecraft", tinhGio: true, nhom: "game", goiY: ["nhi", "teen"],
    muc: ["minecraft.exe", "minecraftlauncher.exe", "microsoft.minecraftuwp", "com.mojang.minecraftpe", "com.mojang.minecraftlauncher"] },
  { ma: "aiirob", ten: "Học với AiiRob", tinhGio: false, nhom: null, goiY: ["nhi", "teen"], muc: ["aiirob.aiilab.vn"] },
  { ma: "tu_dien", ten: "Từ điển", tinhGio: false, nhom: null, muc: ["com.apple.dictionary", "dict.laban.vn", "tratu.soha.vn", "dictionary.cambridge.org"] },
  { ma: "google", ten: "Google", tinhGio: false, nhom: null, muc: ["google.com", "google.com.vn"] },
  { ma: "ve", ten: "Vẽ", tinhGio: false, nhom: null, muc: ["mspaint.exe", "freshpaint.exe", "com.adsk.sketchbook", "com.adsk.sketchbook.android"] },
  { ma: "lich", ten: "Lịch", tinhGio: false, nhom: null, muc: ["com.apple.ical", "com.google.android.calendar", "calendar.google.com"] },
  { ma: "scratch", ten: "Lập trình Scratch", tinhGio: false, nhom: null, muc: ["scratch.mit.edu", "scratch 3.exe", "edu.mit.scratch.scratch3"] },
  { ma: "duolingo", ten: "Duolingo", tinhGio: false, nhom: null, goiY: ["teen"], muc: ["duolingo.com", "com.duolingo", "com.duolingo.duolingoapp"] },
  { ma: "khan", ten: "Khan Academy", tinhGio: false, nhom: null, muc: ["khanacademy.org", "org.khanacademy.android", "org.khanacademy.khanacademyapp"] },
  { ma: "zoom", ten: "Zoom", tinhGio: false, nhom: null, muc: ["zoom.us", "zoom.exe", "us.zoom.xos", "us.zoom.videomeetings"] },
  { ma: "youtube", ten: "YouTube", tinhGio: true, nhom: "video_ngan", goiY: ["teen"],
    muc: ["youtube.com", "com.google.android.youtube", "com.google.ios.youtube"] },
  { ma: "tiktok", ten: "TikTok", tinhGio: true, nhom: "video_ngan", muc: ["tiktok.com", "tiktok.exe", "com.zhiliaoapp.musically", "com.ss.android.ugc.trill"] },
  { ma: "zalo", ten: "Zalo", tinhGio: true, nhom: "mxh", muc: ["zalo.exe", "com.zing.zalo", "chat.zalo.me", "com.vng.zalo"] },
  { ma: "capcut", ten: "CapCut", tinhGio: true, nhom: "khac", muc: ["capcut.exe", "com.lemon.lvoverseas", "com.lemon.lvoverseas.mac", "capcut.com"] },
];

/** Bỏ dấu, chữ thường, chỉ chữ + số — so tên app người gõ với tên app máy báo. */
const khoaTen = (s: unknown) => {
  const t = String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  // tên không có chữ Latin / số (抖音, emoji) ⇒ giữ nguyên ký tự, chỉ bỏ khoảng trắng — không để thành "" rồi khớp mọi app
  return t.replace(/[^a-z0-9]/g, "") || t.normalize("NFC").replace(/\s+/g, "");
};
const laHeThong = (muc: string, he = allowlistHieuLuc()) => khoaSo(chuanMuc(muc)).some((k) => he.includes(k));

/** GET /api/m/app-goi-y?con=… — lưới app; `chon` = Grow chọn sẵn theo nhóm tuổi của Con (nhi / teen). */
export async function luoiApp(fam: string, con?: string | null) {
  const nhom = con ? (await conCua(fam, con)).nhom : "nhi";
  return { ds: APP_GOI_Y.map((a) => ({ ma: a.ma, ten: a.ten, tinhGio: a.tinhGio, chon: !!a.goiY?.includes(nhom) })) };
}

/** `nhom` (#262): tinh_phut | khong_tinh_phut — đè `tinhGio` (cũ). Không gửi cả hai ⇒ theo lưới (app ngoài lưới ⇒ Tính phút). */
type AppVao = { ma?: unknown; ten?: unknown; tinhGio?: unknown; nhom?: unknown };

/** Cho Con dùng các app (thêm, không bỏ app đã cho): app trong lưới (theo `ma`, hoặc tên trùng tên lưới) ⇒ luật cho mọi định danh của app;
 *  app khác theo TÊN ⇒ khớp ngay với app thật máy của Con đã báo (app_may), chưa thấy thì chờ (app_theo_ten) tới khi máy báo danh sách app.
 *  → { daDat: [{ten, muc[]}], choKhop: [ten] }. */
export async function datAppChoPhep(fam: string, con: string, ds: unknown, nguoi?: string, t: Q = q, ghi = true) {
  if (!Array.isArray(ds)) throw new LoiNghiepVu("thieu_app", "Gửi danh sách app");
  const daDat: { ten: string; muc: string[] }[] = [], choKhop: string[] = [];
  const he = allowlistHieuLuc();
  let that: { muc: string; ten: string }[] | null = null;      // app thật máy của Con — đọc một lần
  for (const x of (ds as AppVao[]).slice(0, 60)) {
    const ma = x?.ma ? String(x.ma) : "", ten = String(x?.ten ?? "").trim().slice(0, 60);
    const goi = APP_GOI_Y.find((a) => (ma && a.ma === ma) || (!ma && ten && khoaTen(a.ten) === khoaTen(ten)));
    if (ma && !goi) throw new LoiNghiepVu("app_sai", `Không có app «${ma}» trong lưới`);
    if (!goi && !ten) continue;
    const nhomVao = x?.nhom !== undefined ? nhanNhom(x.nhom) : null;
    const tinhGio = nhomVao ? nhomVao === "tinh_phut" : x?.tinhGio === undefined ? goi?.tinhGio ?? true : x.tinhGio === true;
    const loai = tinhGio ? "giai_tri" : "hoc", nhom = tinhGio ? goi?.nhom ?? "khac" : undefined;
    if (goi) {
      const muc = goi.muc.filter((m) => !khoaSo(m).some((k) => he.includes(k)));     // mục hệ thống luôn mở sẵn
      for (const m of muc) await datLuat(fam, { con, muc: m, ten: goi.ten, loai, nhom }, t);
      daDat.push({ ten: goi.ten, muc });
      continue;
    }
    // «Thêm app khác»: app thật máy của Con đã báo có tên khớp ⇒ ghi luật ngay
    if (!khoaTen(ten)) continue;
    that ??= await t<{ muc: string; ten: string }>(
      `select distinct a.muc, a.ten from app_may a join devices d on d.id = a.device_id where d.family_id = $1 and exists (select 1 from device_children x where x.device_id = d.id and x.child_id = $2)`, [fam, con]);
    const khop = that.filter((a) => khoaTen(a.ten) === khoaTen(ten) && !laHeThong(a.muc, he));    // mục hệ thống luôn mở sẵn
    for (const a of khop) await datLuat(fam, { con, muc: a.muc, ten: a.ten, loai, nhom }, t);
    await t(`insert into app_theo_ten(child_id, family_id, ten, ten_khoa, tinh_gio, khop_luc) values ($1,$2,$3,$4,$5,$6)
             on conflict (child_id, ten_khoa) do update set ten = excluded.ten, tinh_gio = excluded.tinh_gio, khop_luc = coalesce(excluded.khop_luc, app_theo_ten.khop_luc)`,
      [con, fam, ten, khoaTen(ten), tinhGio, khop.length ? new Date() : null]);
    if (khop.length) daDat.push({ ten, muc: khop.map((a) => a.muc) }); else choKhop.push(ten);
  }
  if (ghi && (daDat.length || choKhop.length)) await ghiSuKien(fam, "cho_phep_app", { app: [...daDat.map((x) => x.ten), ...choKhop] }, { con, nguoi }, t);
  return { daDat, choKhop };
}

/** Máy vừa gửi danh sách app thật (POST /api/device/ung-dung) ⇒ khớp các app Ba Mẹ đã cho phép theo TÊN mà chưa khớp (của Con dùng máy này;
 *  máy dùng chung: của mọi Con trong nhà). Khớp ⇒ ghi luật thật, đánh dấu khop_luc (vẫn khớp tiếp máy khác về sau). → số luật ghi mới. */
export async function khopAppTheoTen(may: Pick<May, "id" | "family_id" | "child_id">) {
  const cho = await q<{ child_id: string; ten: string; ten_khoa: string; tinh_gio: boolean }>(
    `select child_id, ten, ten_khoa, tinh_gio from app_theo_ten where family_id = $1 and ($2::text is null or child_id = $2)`, [may.family_id, may.child_id]);
  if (!cho.length) return 0;
  const app = await q<{ muc: string; ten: string }>(`select muc, ten from app_may where device_id = $1`, [may.id]);
  let n = 0;
  for (const c of cho) {
    const khop = app.filter((a) => khoaTen(a.ten) === c.ten_khoa && !laHeThong(a.muc));
    if (!khop.length) continue;
    await tx(async (t) => {
      for (const a of khop) {
        const co = await t(`select 1 from app_rules where family_id = $1 and child_id = $2 and muc = $3`, [may.family_id, c.child_id, chuanMuc(a.muc)]);
        if (co.length) continue;                                        // Ba Mẹ đã xếp app này vào nhóm khác — không đè
        await datLuat(may.family_id, { con: c.child_id, muc: a.muc, ten: a.ten, loai: c.tinh_gio ? "giai_tri" : "hoc", nhom: c.tinh_gio ? "khac" : undefined }, t);
        n++;
      }
      await t(`update app_theo_ten set khop_luc = coalesce(khop_luc, now()) where child_id = $1 and ten_khoa = $2`, [c.child_id, c.ten_khoa]);
    });
  }
  return n;
}

// ---------------------------------------------------------------- Con «Xin Ba Mẹ mở» app / web chưa có trong danh sách

/** App / web ngoài danh sách ⇒ lời xin chờ Ba Mẹ (cai_app cho app, mo_web cho trang web) — Ba Mẹ trả lời Tính phút / Không tính phút / Bỏ qua
 *  (lib/yeu-cau.ts). Lý do không bắt buộc. Đã có lời xin chờ cho đúng mục ⇒ trả lời xin đó (bấm lại không gửi trùng). Bị bỏ qua thì xin lại được.
 *  → { id, trang_thai: "cho", daCo, loai, muc }. */
export async function xinDuyet(con: string, mayId: string | null, b: { muc?: unknown; ten?: unknown; lyDo?: unknown; kieu?: unknown }) {
  // #422 «Xin thêm app / web» (Hôm nay, menu khay): Con chọn thẻ «App trên máy» / «Trang web» ⇒ `kieu` quyết loại lời xin. Không gửi `kieu`
  // (màn chặn, agent cũ) ⇒ tự đoán như cũ.
  if (b.kieu !== undefined && b.kieu !== null && b.kieu !== "app" && b.kieu !== "web") throw new LoiNghiepVu("kieu_sai", "Chọn App trên máy hoặc Trang web");
  let muc: string, loai: "mo_web" | "cai_app", theoTen: boolean | undefined, tenApp: string | undefined;
  if (b.kieu === "web") {
    // thẻ Trang web: địa chỉ có / không có https://, đuôi ?… #… :cổng ⇒ tên miền (Con đã chọn «Trang web» ⇒ tin là trang, kể cả app.slack.com)
    const tho = String(b.muc ?? "").trim();
    let host = "";
    try { host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(tho) ? tho : `https://${tho.replace(/^\/\//, "")}`).hostname; } catch { /* để trống ⇒ web_sai */ }
    const mien = tenMienSach(host);
    if (!mien || mien.endsWith(".exe")) throw new LoiNghiepVu("web_sai", "Gõ địa chỉ trang web, ví dụ scratch.mit.edu");
    [muc, loai] = [mien, "mo_web"];
  } else {
    muc = chuanMuc(b.muc);
    if (!muc) throw new LoiNghiepVu("thieu_muc", "Thiếu tên app hoặc trang web");
    loai = b.kieu === "app" || kieuMuc(muc) === "app" ? "cai_app" : "mo_web";
    // thẻ App: Con chọn app trong lưới máy báo ⇒ `muc` = định danh thật (exe, id Store «microsoft.mspaint», bundle, package), `ten` = tên hiển thị
    // ⇒ khoá luật là `muc`. Con gõ tên trần («Minecraft», app iPhone) — không có `ten` khác `muc`, `muc` không phải dạng app ⇒ lời xin THEO TÊN:
    // giữ tên như Con thấy, Ba Mẹ đồng ý thì thêm app theo tên (datAppChoPhep: khớp app thật máy đã báo / chờ khớp).
    if (loai === "cai_app" && kieuMuc(muc) !== "app") {
      let ten = typeof b.ten === "string" ? b.ten.trim() : "";
      // «Xin lại» (màn Con xin) chỉ gửi `muc` ⇒ lấy lại tên + đường định danh của lời xin trước cùng mục (không rơi về đường theo tên / mã thô)
      const cu = ten ? null : await one<{ ten_app: string }>(`select ten_app from requests where child_id = $1 and loai = 'cai_app' and gia_tri = $2
                                     and theo_ten = false and ten_app is not null order by created_at desc limit 1`, [con, muc]);
      if (cu) ten = cu.ten_app;
      // định danh thật: máy của nhà đã báo mục này trong danh sách app (app_may); máy chưa báo kịp ⇒ có tên khác định danh, định danh không khoảng trắng
      const daBao = !!(await one(`select 1 from app_may a join devices d on d.id = a.device_id where lower(a.muc) = $1
                                   and d.family_id = (select family_id from children where id = $2) limit 1`, [muc, con]));
      if (cu || daBao || (!!ten && ten.toLowerCase() !== muc && !/\s/.test(muc))) { theoTen = false; tenApp = ten || undefined; }
      else { const tho = ten || String(b.muc).trim(); if (!/[/:]/.test(tho)) { muc = tho.slice(0, 60); theoTen = true; } }
    } else if (loai === "cai_app") theoTen = false;
  }
  const co = await one<{ id: string; loai: string }>(`select id, loai from requests where child_id = $1 and gia_tri = $2 and loai = $3 and trang_thai = 'cho' and het_han > now()
                                        order by created_at desc limit 1`, [con, muc, loai]);
  if (co) return { id: co.id, trang_thai: "cho", daCo: true, loai: co.loai, muc };
  const r = await guiYeuCau(con, mayId, { loai, giaTri: muc, lyDo: b.lyDo ?? "", theoTen,
    tenApp: theoTen === false ? tenApp ?? (typeof b.ten === "string" ? b.ten : undefined) : undefined });
  return { ...r, daCo: false, loai, muc };
}

// ---------------------------------------------------------------- Danh sách của Con (#262 — màn «App & web», «App của <Con>», «Web của <Con>»)

/** Luật hiển thị là TRANG WEB (hàng «Web») hay APP (hàng «App»): trang = tên miền mà tên hiển thị chính là tên miền (trang Ba Mẹ thêm / duyệt);
 *  tên miền đi cùng app trong lưới (roblox.com ⇒ «Roblox») thuộc app đó. Cùng luật với thiet-lap.ts › tomTatThietLap. */
const laMucWeb = (l: { muc: string; ten: string }) => l.ten === l.muc && kieuMuc(l.muc) === "web";

type DongDanhSach = {
  ten: string; kieu: "app" | "web"; nhom: NhomDs; muc: string[];
  /** phút dùng hôm nay (mọi máy) — nhóm Tính phút: = số sao đã trừ («Hôm nay trừ 39 phút · −39 sao») */ phutHomNay: number;
  /** có mục là luật CẢ NHÀ (đổi / bỏ ở đây chỉ áp cho Con này) */ theoCaNha: boolean;
  /** app thêm theo tên, máy của Con chưa báo app trùng tên (app_theo_ten) — chưa có định danh để máy mở */ choKhop?: boolean;
};

/** GET /api/m/con/:id/danh-sach — chế độ + danh sách trắng của Con (app / web, theo nhóm) + lời xin đang chờ + số lời xin đã bỏ qua. */
export async function danhSachCon(fam: string, con: string, now = new Date()) {
  const c = await conCua(fam, con);
  const tz = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))?.tz ?? "Asia/Ho_Chi_Minh";
  const ngay = gioDiaPhuong(now, tz).ngay;
  const [luat, choKhop, app, web, xin, boQua] = await Promise.all([
    q<{ child_id: string; muc: string; ten: string; loai: string }>(`select child_id, muc, ten, loai from app_rules where family_id = $1 and child_id in ('', $2)
       and loai in ('hoc', 'giai_tri', 'loai_tru') and (het is null or het > $3) order by ten, muc`, [fam, con, now]),
    q<{ ten: string; tinh_gio: boolean }>(`select ten, tinh_gio from app_theo_ten where child_id = $1 and khop_luc is null order by ten`, [con]),
    q<{ muc: string; phut: number }>(`select lower(muc) as muc, sum(phut)::int as phut from usage where child_id = $1 and ngay = $2 group by lower(muc)`, [con, ngay]),
    q<{ ten_mien: string; giay: number }>(`select w.ten_mien, sum(w.giay)::int as giay from web_nhat_ky w left join devices d on d.id = w.device_id
       where (w.child_id = $1 or (w.child_id is null and d.child_id = $1)) and w.ngay = $2 group by w.ten_mien`, [con, ngay]),
    q<{ id: string; loai: string; gia_tri: string | null; ten_app: string | null; ly_do: string; created_at: Date; may: string | null }>(
      `select r.id, r.loai, r.gia_tri, r.ten_app, r.ly_do, r.created_at, d.name as may from requests r left join devices d on d.id = r.device_id
        where r.child_id = $1 and r.loai in ('mo_web', 'cai_app') and r.trang_thai = 'cho' and r.het_han > $2 order by r.created_at`, [con, now]),
    dsBoQua(fam, con, now),                     // cùng điều kiện với màn «Lời xin đã bỏ qua» (yeu-cau.ts)
  ]);
  // luật riêng của Con đè luật cả nhà cùng mục
  const theoMuc = new Map<string, (typeof luat)[number]>();
  for (const l of [...luat].sort((a, b) => (a.child_id ? 1 : 0) - (b.child_id ? 1 : 0))) theoMuc.set(l.muc, l);
  for (const [k, l] of theoMuc) if (l.loai === "loai_tru") theoMuc.delete(k);       // mục cả nhà Ba Mẹ đã bỏ khỏi danh sách của Con này
  const phutApp = new Map(app.map((x) => [x.muc, x.phut]));
  const gop = new Map<string, DongDanhSach>();
  for (const l of theoMuc.values()) {
    const kieu = laMucWeb(l) ? "web" as const : "app" as const;
    const k = `${kieu}|${kieu === "app" ? l.ten.toLowerCase() : l.muc}`;
    const x = gop.get(k) ?? { ten: l.ten, kieu, nhom: nhomTuLoai(l.loai), muc: [], phutHomNay: 0, theoCaNha: false };
    x.muc.push(l.muc);
    if (!l.child_id) x.theoCaNha = true;
    // một app hai nhóm (hiếm: luật cũ lệch) ⇒ hiện «Tính phút» (an toàn: con không dùng tự do cái Ba Mẹ đã cho tính phút)
    if (l.loai === "giai_tri") x.nhom = "tinh_phut";
    gop.set(k, x);
  }
  for (const x of gop.values()) {
    const ds = new Set(x.muc);
    let phut = x.muc.reduce((a, m) => a + (phutApp.get(m) ?? 0), 0);
    for (const w of web) if (khoaSo(w.ten_mien).some((m) => ds.has(m))) phut += w.giay / 60;
    x.phutHomNay = Math.round(phut);
  }
  for (const a of choKhop) {
    if ([...gop.values()].some((x) => x.kieu === "app" && khoaTen(x.ten) === khoaTen(a.ten))) continue;
    gop.set(`app|cho|${a.ten}`, { ten: a.ten, kieu: "app", nhom: a.tinh_gio ? "tinh_phut" : "khong_tinh_phut", muc: [], phutHomNay: 0, theoCaNha: false, choKhop: true });
  }
  const tat = [...gop.values()].sort((a, b) => b.phutHomNay - a.phutHomNay || a.ten.localeCompare(b.ten, "vi"));
  const chia = (kieu: "app" | "web") => ({ tinhPhut: tat.filter((x) => x.kieu === kieu && x.nhom === "tinh_phut"),
    khongTinhPhut: tat.filter((x) => x.kieu === kieu && x.nhom === "khong_tinh_phut") });
  const cheDo = cheDoCua((c as { che_do_chan?: unknown }).che_do_chan);
  return {
    con: { id: c.id, ten: c.ten }, cheDo, cheDoChan: cheDoChanCua(cheDo), tenCheDo: TEN_CHE_DO[cheDo],
    /** «Mở hết»: danh sách vẫn giữ, «tạm nghỉ» */ tamNghi: cheDo === "mo_het",
    app: chia("app"), web: chia("web"),
    soMuc: { app: tat.filter((x) => x.kieu === "app").length, web: tat.filter((x) => x.kieu === "web").length, tinhPhut: tat.filter((x) => x.nhom === "tinh_phut").length },
    dangXin: xin.map((r) => ({ id: r.id, loai: r.loai, kieu: r.loai === "mo_web" ? "web" : "app", muc: r.gia_tri, ten: (r.loai === "cai_app" ? tenThanThien(r.gia_tri) : undefined) ?? r.ten_app ?? r.gia_tri, lyDo: r.ly_do || null,
      luc: new Date(r.created_at).toISOString(), may: r.may })),
    boQua: { so: boQua.ds.length },
    nhom: Object.entries(TEN_NHOM_DS).map(([ma, ten]) => ({ ma, ten })),
  };
}

/** Một mục Ba Mẹ thêm: app trong lưới (`ma`) / app theo tên (`ten`, không `muc`) / tên miền hoặc định danh app (`muc`). */
type MucThem = { nhom?: unknown; ma?: unknown; ten?: unknown; muc?: unknown; kieu?: unknown };

/** POST /api/m/con/:id/danh-sach {nhom, ma? | ten? | muc?} hoặc {ds: [...]} — thêm vào danh sách của Con (đã có thì đổi sang nhóm mới).
 *  → { daDat: [{ten, muc[], nhom}], choKhop: [ten] }. */
export async function themVaoDanhSach(fam: string, con: string, b: MucThem & { ds?: unknown }, nguoi?: string) {
  await conCua(fam, con);
  const ds = (Array.isArray(b.ds) ? b.ds : [b]).slice(0, 60) as MucThem[];
  if (!ds.length) throw new LoiNghiepVu("thieu_muc", "Chọn app hoặc trang web để thêm");
  return tx(async (t) => {
    const daDat: { ten: string; muc: string[]; nhom: NhomDs }[] = [], choKhop: string[] = [];
    for (const x of ds) {
      const nhom = nhanNhom(x?.nhom);
      if (!nhom) throw new LoiNghiepVu("nhom_sai", "Chọn «Tính phút» hoặc «Không tính phút»");
      if (x.muc !== undefined && x.muc !== null && String(x.muc).trim()) {
        const tho = String(x.muc);
        const laWeb = x.kieu === "web" || (x.kieu !== "app" && kieuMuc(chuanMuc(tho)) === "web");
        const muc = laWeb ? tenMienSach(tho) : chuanMuc(tho);
        if (!muc) throw new LoiNghiepVu("ten_mien_sai", "Nhập tên miền dạng ten.com (dán link cũng được)");
        // trang web: tên hiển thị = tên miền (hàng «Web»); app theo định danh: tên Ba Mẹ gõ hoặc chính định danh
        const ten = laWeb ? muc : String(x.ten ?? muc).trim().slice(0, 60) || muc;
        await datLuat(fam, { con, muc, ten, loai: loaiTuNhom(nhom), nhom: nhom === "tinh_phut" ? "khac" : undefined }, t);
        daDat.push({ ten, muc: [muc], nhom });
        continue;
      }
      const r = await datAppChoPhep(fam, con, [{ ma: x.ma, ten: x.ten, nhom }], nguoi, t, false);
      for (const d of r.daDat) daDat.push({ ...d, nhom });
      choKhop.push(...r.choKhop);
    }
    if (daDat.length || choKhop.length)
      await ghiSuKien(fam, "them_vao_danh_sach", { ds: [...daDat.map((d) => ({ ten: d.ten, nhom: d.nhom })), ...choKhop.map((ten) => ({ ten, nhom: null }))] }, { con, nguoi }, t);
    return { daDat, choKhop };
  });
}

const dsMuc = (v: unknown) => [...new Set((Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]).map((m) => chuanMuc(m)).filter(Boolean))].slice(0, 60);

/** POST /api/m/con/:id/danh-sach/doi {muc: string | string[], nhom, ten?} — đổi nhóm một hàng (mọi định danh của app đó). `ten` (app chờ khớp
 *  theo tên, chưa có `muc`) ⇒ đổi nhóm lời chờ khớp. → { muc[], nhom }. */
export async function doiNhomDanhSach(fam: string, con: string, b: { muc?: unknown; nhom?: unknown; ten?: unknown }, nguoi?: string) {
  await conCua(fam, con);
  const nhom = nhanNhom(b.nhom);
  if (!nhom) throw new LoiNghiepVu("nhom_sai", "Chọn «Tính phút» hoặc «Không tính phút»");
  const ds = dsMuc(b.muc);
  if (!ds.length && !b.ten) throw new LoiNghiepVu("thieu_muc", "Chọn app hoặc trang web");
  return tx(async (t) => {
    const doi: string[] = [];
    for (const muc of ds) {
      const cu = (await t<{ child_id: string; ten: string }>(`select child_id, ten from app_rules where family_id = $1 and child_id in ('', $2) and muc = $3
        and (het is null or het > now()) order by child_id desc limit 1`, [fam, con, muc]))[0];
      if (!cu) continue;
      await datLuat(fam, { con, muc, ten: cu.ten, loai: loaiTuNhom(nhom), nhom: nhom === "tinh_phut" ? "khac" : undefined }, t);
      doi.push(muc);
    }
    if (b.ten) await t(`update app_theo_ten set tinh_gio = $3 where child_id = $1 and ten_khoa = $2`, [con, khoaTen(b.ten), nhom === "tinh_phut"]);
    if (!doi.length && !b.ten) throw new LoiNghiepVu("khong_thay", "Mục này không còn trong danh sách", 404);
    await ghiSuKien(fam, "doi_nhom_danh_sach", { muc: doi, ten: b.ten ? String(b.ten).slice(0, 60) : null, nhom }, { con, nguoi }, t);
    return { muc: doi, nhom };
  });
}

/** POST /api/m/con/:id/danh-sach/bo {muc: string | string[], ten?} — bỏ khỏi danh sách (Con xin lại được). Luật cả nhà ⇒ chỉ bỏ cho Con này
 *  bằng luật riêng «loai_tru» (luat-app.ts › boMucChoCon) — luật cả nhà giữ cho máy dùng chung + Con khác + Con tạo sau.
 *  `ten`: bỏ cả lời chờ khớp app theo tên. → { bo: số mục đã bỏ }. */
export async function boKhoiDanhSach(fam: string, con: string, b: { muc?: unknown; ten?: unknown }, nguoi?: string) {
  await conCua(fam, con);
  const ds = dsMuc(b.muc);
  if (!ds.length && !b.ten) throw new LoiNghiepVu("thieu_muc", "Chọn app hoặc trang web");
  return tx(async (t) => {
    let n = 0;
    for (const muc of ds) if (await boMucChoCon(t, fam, con, muc)) n++;
    if (b.ten) n += (await t(`delete from app_theo_ten where child_id = $1 and ten_khoa = $2 returning ten`, [con, khoaTen(b.ten)])).length;
    await ghiSuKien(fam, "bo_khoi_danh_sach", { muc: ds, ten: b.ten ? String(b.ten).slice(0, 60) : null }, { con, nguoi }, t);
    return { bo: n };
  });
}
