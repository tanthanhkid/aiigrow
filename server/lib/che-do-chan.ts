// Chặn app theo Con (L4, thiết kế chốt 05/11) — phần có CSDL: đổi chế độ, danh sách app được phép (lưới gợi ý + «Thêm app khác» theo tên),
// khớp app theo tên khi máy gửi danh sách app thật, Con «Xin Ba Mẹ duyệt» app / web lạ. Phần thuần (chế độ, web luôn chặn): lib/chan-co-ban.ts.
// Không dùng điểm / sao để mở app: app lạ chỉ mở khi Ba Mẹ duyệt (yêu cầu cai_app / mo_web — lib/yeu-cau.ts).
import { q, one, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { conCua, type May } from "./gia-dinh.ts";
import { allowlistHieuLuc, chuanMuc, datLuat, khoaSo, type NhomGiaiTri } from "./luat-app.ts";
import { kieuMuc } from "./chinh-sach.ts";
import { guiYeuCau } from "./yeu-cau.ts";
import { CHE_DO_CHAN, cheDoChanCua, laWebCam, TEN_CHE_DO_CHAN, WEB_CAM, type CheDoChan } from "./chan-co-ban.ts";

export { CHE_DO_CHAN, cheDoChanCua, laWebCam, TEN_CHE_DO_CHAN, WEB_CAM, type CheDoChan };

/** POST /api/m/con/:id/che-do-chan {cheDo: mo_het | chi_app_duoc_phep}. Máy nhận ở lần đồng bộ kế. */
export async function datCheDoChan(fam: string, con: string, v: unknown, nguoi?: string) {
  if (!(CHE_DO_CHAN as readonly string[]).includes(String(v))) throw new LoiNghiepVu("che_do_chan_sai", "Chọn «Mở hết» hoặc «Chỉ app được phép»");
  const c = await conCua(fam, con);
  const moi = v as CheDoChan, cu = cheDoChanCua((c as { che_do_chan?: unknown }).che_do_chan);
  await q(`update children set che_do_chan = $2 where id = $1`, [con, moi]);
  if (cu !== moi) await ghiSuKien(fam, "doi_che_do_chan", { tu: cu, sang: moi }, { con, nguoi });
  return { cheDoChan: moi, ten: TEN_CHE_DO_CHAN[moi] };
}

// ---------------------------------------------------------------- lưới app gợi ý (màn «Con được dùng app nào?» / «Thêm app»)
// Mỗi app một mã + mọi định danh đã biết trên các nền (tệp .exe Windows, bundle macOS / iOS, gói Android, tên miền). Chọn app ⇒ ghi luật cho
// MỌI định danh (một lựa chọn chạy đúng trên mọi máy của Con). tinhGio: true = tính vào giờ chơi (giai_tri), false = app học, không tính giờ (hoc).
export type AppGoiY = { ma: string; ten: string; tinhGio: boolean; nhom: NhomGiaiTri | null; muc: string[]; goiY?: ("nhi" | "teen")[] };
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
export const khoaTen = (s: unknown) => {
  const t = String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  // tên không có chữ Latin / số (抖音, emoji) ⇒ giữ nguyên ký tự, chỉ bỏ khoảng trắng — không để thành "" rồi khớp mọi app
  return t.replace(/[^a-z0-9]/g, "") || t.normalize("NFC").replace(/\s+/g, "");
};
const laHeThong = (muc: string, he = allowlistHieuLuc()) => khoaSo(chuanMuc(muc)).some((k) => he.includes(k));

/** GET /api/m/app-goi-y?con=… — lưới app; `chon` = Rob chọn sẵn theo nhóm tuổi của Con (nhi / teen). */
export async function luoiApp(fam: string, con?: string | null) {
  const nhom = con ? (await conCua(fam, con)).nhom : "nhi";
  return { ds: APP_GOI_Y.map((a) => ({ ma: a.ma, ten: a.ten, tinhGio: a.tinhGio, chon: !!a.goiY?.includes(nhom) })) };
}

export type AppVao = { ma?: unknown; ten?: unknown; tinhGio?: unknown };

/** Cho Con dùng các app (thêm, không bỏ app đã cho): app trong lưới (theo `ma`, hoặc tên trùng tên lưới) ⇒ luật cho mọi định danh của app;
 *  app khác theo TÊN ⇒ khớp ngay với app thật máy của Con đã báo (app_may), chưa thấy thì chờ (app_theo_ten) tới khi máy báo danh sách app.
 *  → { daDat: [{ten, muc[]}], choKhop: [ten] }. */
export async function datAppChoPhep(fam: string, con: string, ds: unknown, nguoi?: string, t: Q = q) {
  if (!Array.isArray(ds)) throw new LoiNghiepVu("thieu_app", "Gửi danh sách app");
  const daDat: { ten: string; muc: string[] }[] = [], choKhop: string[] = [];
  const he = allowlistHieuLuc();
  let that: { muc: string; ten: string }[] | null = null;      // app thật máy của Con — đọc một lần
  for (const x of (ds as AppVao[]).slice(0, 60)) {
    const ma = x?.ma ? String(x.ma) : "", ten = String(x?.ten ?? "").trim().slice(0, 60);
    const goi = APP_GOI_Y.find((a) => (ma && a.ma === ma) || (!ma && ten && khoaTen(a.ten) === khoaTen(ten)));
    if (ma && !goi) throw new LoiNghiepVu("app_sai", `Không có app «${ma}» trong lưới`);
    if (!goi && !ten) continue;
    const tinhGio = x?.tinhGio === undefined ? goi?.tinhGio ?? true : x.tinhGio === true;
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
      `select distinct a.muc, a.ten from app_may a join devices d on d.id = a.device_id where d.family_id = $1 and (d.child_id = $2 or d.dung_chung)`, [fam, con]);
    const khop = that.filter((a) => khoaTen(a.ten) === khoaTen(ten) && !laHeThong(a.muc, he));    // mục hệ thống luôn mở sẵn
    for (const a of khop) await datLuat(fam, { con, muc: a.muc, ten: a.ten, loai, nhom }, t);
    await t(`insert into app_theo_ten(child_id, family_id, ten, ten_khoa, tinh_gio, khop_luc) values ($1,$2,$3,$4,$5,$6)
             on conflict (child_id, ten_khoa) do update set ten = excluded.ten, tinh_gio = excluded.tinh_gio, khop_luc = coalesce(excluded.khop_luc, app_theo_ten.khop_luc)`,
      [con, fam, ten, khoaTen(ten), tinhGio, khop.length ? new Date() : null]);
    if (khop.length) daDat.push({ ten, muc: khop.map((a) => a.muc) }); else choKhop.push(ten);
  }
  if (daDat.length || choKhop.length) await ghiSuKien(fam, "cho_phep_app", { app: [...daDat.map((x) => x.ten), ...choKhop] }, { con, nguoi }, t);
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
        if (co.length) continue;                                        // Ba Mẹ đã xếp app này (có thể là «Chặn») — không đè
        await datLuat(may.family_id, { con: c.child_id, muc: a.muc, ten: a.ten, loai: c.tinh_gio ? "giai_tri" : "hoc", nhom: c.tinh_gio ? "khac" : undefined }, t);
        n++;
      }
      await t(`update app_theo_ten set khop_luc = coalesce(khop_luc, now()) where child_id = $1 and ten_khoa = $2`, [c.child_id, c.ten_khoa]);
    });
  }
  return n;
}

// ---------------------------------------------------------------- Con «Xin Ba Mẹ duyệt» app / web lạ (L4)

/** App / web chưa được phép ⇒ yêu cầu chờ Ba Mẹ (cai_app cho app, mo_web cho trang web). Lý do không bắt buộc. Đã có lời xin chờ cho đúng mục
 *  ⇒ trả lời xin đó (bấm lại không gửi trùng). Web luôn chặn (người lớn / cờ bạc / bạo lực) ⇒ 409 web_cam, không gửi Ba Mẹ.
 *  → { id, trang_thai: "cho", daCo, loai, muc }. */
export async function xinDuyet(con: string, mayId: string | null, b: { muc?: unknown; ten?: unknown; lyDo?: unknown }) {
  const muc = chuanMuc(b.muc);
  if (!muc) throw new LoiNghiepVu("thieu_muc", "Thiếu tên app hoặc trang web");
  if (laWebCam(muc)) throw new LoiNghiepVu("web_cam", "Trang này luôn bị chặn để an toàn cho con", 409);
  const loai = kieuMuc(muc) === "web" ? "mo_web" : "cai_app";
  const co = await one<{ id: string }>(`select id from requests where child_id = $1 and gia_tri = $2 and loai = $3 and trang_thai = 'cho' and het_han > now()
                                        order by created_at desc limit 1`, [con, muc, loai]);
  if (co) return { id: co.id, trang_thai: "cho", daCo: true, loai, muc };
  const r = await guiYeuCau(con, mayId, { loai, giaTri: muc, lyDo: b.lyDo ?? "" });
  return { ...r, daCo: false, loai, muc };
}
