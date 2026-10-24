// Thời gian màn hình theo tuần (kiểu Screen Time): gộp phút dùng APP (bảng usage, agent gửi theo ngày) với giây ở TRANG WEB
// (web_nhat_ky, agent đọc lịch sử trình duyệt) rồi chia theo MỤC: Học tập · Trò chơi · Video & phim · Video ngắn · Mạng xã hội · Công cụ · Khác.
// Mục suy theo bản chất app/trang (bảng GOI_Y), trừ khi Ba Mẹ đã xếp nhóm Giải trí cụ thể (game / video ngắn / MXH / phim) — chỉ để thống kê,
// KHÔNG đổi luật chặn/mở. Thời gian trong trình duyệt đã tách ra theo trang web, nên app trình duyệt chỉ giữ phần dư (không đếm hai lần).
import { q } from "./db.ts";
import { congNgay, dauTuan, gioDiaPhuong } from "./gio.ts";
import { allowlistHieuLuc, chuanMuc, khoaSo, type NhomGiaiTri } from "./luat-app.ts";
import { kieuMuc } from "./chinh-sach.ts";

export type MucMH = "hoc" | "game" | "video" | "video_ngan" | "mxh" | "tien_ich" | "khac" | "chua_xep";
export const MUC_MH: MucMH[] = ["hoc", "game", "video", "video_ngan", "mxh", "tien_ich", "khac", "chua_xep"];

const G = (muc: MucMH, ds: string[]) => ds.map((x) => [x, muc] as const);
/** Bản chất app/trang phổ biến với trẻ (tên tệp Windows, gói Android, tên miền gốc — tên miền con khớp theo khoaSo). */
export const GOI_Y: ReadonlyMap<string, MucMH> = new Map([
  ...G("game", ["robloxplayerbeta.exe", "roblox.exe", "minecraft.exe", "minecraftlauncher.exe", "minecraft.windows.exe", "steam.exe", "epicgameslauncher.exe",
    "valorant.exe", "leagueclient.exe", "garena.exe", "fortniteclient-win64-shipping.exe", "genshinimpact.exe", "riotclientservices.exe",
    "com.roblox.client", "com.mojang.minecraftpe", "com.supercell.clashofclans", "com.supercell.brawlstars", "com.vng.pubgmobile",
    "com.garena.game.kgvn", "com.dts.freefireth", "com.mihoyo.genshinimpact",
    "roblox.com", "minecraft.net", "poki.com", "y8.com", "friv.com", "crazygames.com", "miniclip.com", "steampowered.com", "epicgames.com",
    "gamevui.vn", "game24h.vn", "chess.com", "lichess.org", "agar.io", "slither.io", "krunker.io"]),
  ...G("video", ["youtube.com", "youtu.be", "netflix.com", "fptplay.vn", "vieon.vn", "tv360.vn", "galaxyplay.vn", "twitch.tv", "bilibili.com", "bilibili.tv",
    "iq.com", "wetv.vip", "disneyplus.com", "nhaccuatui.com", "zingmp3.vn", "spotify.com", "spotify.exe", "netflix.exe",
    "com.google.android.youtube", "com.netflix.mediaclient", "com.spotify.music"]),
  ...G("video_ngan", ["tiktok.com", "tiktok.exe", "douyin.com", "likee.video", "com.zhiliaoapp.musically", "com.ss.android.ugc.trill"]),
  ...G("mxh", ["facebook.com", "messenger.com", "instagram.com", "threads.net", "x.com", "twitter.com", "reddit.com", "discord.com", "discord.exe",
    "zalo.me", "zalo.exe", "telegram.org", "telegram.exe", "whatsapp.com", "whatsapp.exe", "snapchat.com", "pinterest.com", "messenger.exe",
    "com.facebook.katana", "com.facebook.orca", "com.instagram.android", "com.zing.zalo", "org.telegram.messenger", "com.discord", "com.whatsapp"]),
  ...G("hoc", ["khanacademy.org", "duolingo.com", "scratch.mit.edu", "code.org", "wikipedia.org", "quizlet.com", "olm.vn", "hocmai.vn", "vietjack.com",
    "loigiaihay.com", "hoc247.net", "vndoc.com", "brilliant.org", "coursera.org", "edx.org", "udemy.com", "w3schools.com", "typing.com", "elsaspeak.com",
    "geogebra.org", "desmos.com", "codecombat.com", "tynker.com", "monkey.edu.vn", "aiirob.aiilab.vn", "aiilab.vn", "classroom.google.com", "laptrinhvoiai.com",
    "scratch 3.exe", "scratch.exe", "com.duolingo", "org.khanacademy.android", "vn.aiilab.aiigrow"]),
  ...G("tien_ich", ["google.com", "bing.com", "docs.google.com", "drive.google.com", "office.com", "zoom.us", "teams.microsoft.com", "chatgpt.com", "gemini.google.com",
    "explorer.exe", "notepad.exe", "winword.exe", "excel.exe", "powerpnt.exe", "zoom.exe", "teams.exe", "ms-teams.exe", "unikey.exe"]),
]);

/** App trình duyệt: thời gian của nó đã được tách theo trang web. */
export const TRINH_DUYET = new Set(["chrome.exe", "msedge.exe", "brave.exe", "firefox.exe", "opera.exe", "vivaldi.exe", "coccoc.exe", "browser.exe",
  "com.android.chrome", "com.microsoft.emmx", "org.mozilla.firefox", "com.coccoc.trinhduyet", "com.brave.browser"]);

const TEN: Record<string, string> = {
  "robloxplayerbeta.exe": "Roblox", "roblox.exe": "Roblox", "minecraft.exe": "Minecraft", "minecraftlauncher.exe": "Minecraft", "minecraft.windows.exe": "Minecraft",
  "chrome.exe": "Chrome", "msedge.exe": "Edge", "brave.exe": "Brave", "firefox.exe": "Firefox", "coccoc.exe": "Cốc Cốc", "browser.exe": "Cốc Cốc",
  "winword.exe": "Word", "excel.exe": "Excel", "powerpnt.exe": "PowerPoint", "explorer.exe": "File Explorer", "steam.exe": "Steam",
  "epicgameslauncher.exe": "Epic Games", "leagueclient.exe": "Liên Minh Huyền Thoại", "com.garena.game.kgvn": "Liên Quân Mobile",
};

const NHOM_SANG_MUC: Record<NhomGiaiTri, MucMH> = { game: "game", video_ngan: "video_ngan", mxh: "mxh", phim_gd: "video", khac: "khac" };

type Luat = { child_id: string; muc: string; ten: string; loai: string; nhom: NhomGiaiTri };

/** Tên dễ đọc: «robloxplayerbeta.exe» → «Roblox», «com.zing.zalo» → «Zalo», tên miền giữ nguyên. */
export function tenDoc(muc: string, kieu: "app" | "web", tenLuat?: string) {
  if (kieu === "web") return muc;
  if (TEN[muc]) return TEN[muc];
  if (tenLuat && tenLuat !== muc) return tenLuat;
  const goc = muc.endsWith(".exe") ? muc.slice(0, -4) : /^[a-z0-9_]+(\.[a-z0-9_]+){2,}$/.test(muc) ? muc.split(".").pop()! : muc;
  return goc.charAt(0).toUpperCase() + goc.slice(1);
}

/** Xếp mục cho một app/trang theo bộ luật đã nạp sẵn (cùng thứ tự ưu tiên với phanLoai: cụ thể hơn thắng, luật của Con thắng luật gia đình). */
export function xepMuc(mucTho: string, luat: Luat[], allow: string[] = allowlistHieuLuc()): { muc: MucMH; tenLuat?: string } {
  const m = chuanMuc(mucTho);
  const khoa = khoaSo(m);
  const r = luat.filter((l) => khoa.includes(l.muc))
    .sort((a, b) => b.muc.length - a.muc.length || (b.child_id ? 1 : 0) - (a.child_id ? 1 : 0))[0];
  // Ba Mẹ đã xếp nhóm Giải trí cụ thể ⇒ dùng đúng nhóm đó; xếp APP vào «Học tập» ⇒ Học tập.
  // Trang web «Cho phép» cũng lưu loai hoc nhưng chỉ nghĩa là được mở (YouTube cho phép vẫn là Video) ⇒ theo bản chất.
  if (r?.loai === "giai_tri" && r.nhom !== "khac") return { muc: NHOM_SANG_MUC[r.nhom] ?? "khac", tenLuat: r.ten };
  if (r?.loai === "hoc" && kieuMuc(r.muc) !== "web") return { muc: "hoc", tenLuat: r.ten };
  if (TRINH_DUYET.has(m)) return { muc: "tien_ich", tenLuat: r?.ten };
  const gy = khoa.map((k) => GOI_Y.get(k)).find(Boolean);
  if (gy) return { muc: gy, tenLuat: r?.ten };
  if (khoa.some((k) => allow.includes(k))) return { muc: "tien_ich" };
  if (r) return { muc: r.loai === "hoc" ? "hoc" : "khac", tenLuat: r.ten };
  return { muc: "chua_xep" };
}

/** Mọi thời lượng trả về bằng GIÂY (làm tròn một lần khi hiển thị) ⇒ tổng, mục, danh sách và bộ lọc ngày luôn khớp nhau. */
export type MucDung = { id: string; ten: string; kieu: "app" | "web"; muc: MucMH; giay: number; soLan: number; theoNgay: number[] };

const NGAY_GIAY = 86_400;

async function tuan(fam: string, con: string, dau: string, luat: Luat[]) {
  const het = congNgay(dau, 7);
  const ngayDs = Array.from({ length: 7 }, (_, i) => congNgay(dau, i));
  const [app, web] = await Promise.all([
    q<{ device_id: string; ngay: string; muc: string; phut: number }>(
      `select device_id, ngay, muc, sum(phut)::int as phut from usage where child_id = $1 and ngay >= $2 and ngay < $3 group by device_id, ngay, muc`, [con, dau, het]),
    q<{ device_id: string; ngay: string; ten_mien: string; so_lan: number; giay: number }>(
      `select w.device_id, w.ngay, w.ten_mien, sum(w.so_lan)::int as so_lan, sum(w.giay)::int as giay
         from web_nhat_ky w left join devices d on d.id = w.device_id
        where (w.child_id = $1 or (w.child_id is null and d.child_id = $1)) and d.family_id = $2 and w.ngay >= $3 and w.ngay < $4
        group by w.device_id, w.ngay, w.ten_mien`, [con, fam, dau, het]),
  ]);
  const allow = allowlistHieuLuc();
  const ds = new Map<string, Omit<MucDung, "giay" | "theoNgay"> & { g: number[] }>();
  const cong = (kieu: "app" | "web", mucTho: string, ngay: string, giay: number, soLan = 0) => {
    const i = ngayDs.indexOf(ngay);
    if (i < 0 || (giay <= 0 && soLan <= 0)) return;
    const id = chuanMuc(mucTho);
    const k = `${kieu}:${id}`;
    let x = ds.get(k);
    if (!x) {
      const { muc, tenLuat } = xepMuc(id, luat, allow);
      x = { id, ten: tenDoc(id, kieu, tenLuat), kieu, muc, soLan: 0, g: Array(7).fill(0) };
      ds.set(k, x);
    }
    x.g[i] += Math.max(0, giay); x.soLan += soLan;
  };
  // Trình duyệt: phần thời gian đã có trong lịch sử web CỦA CÙNG MÁY thì tính cho trang web; app trình duyệt chỉ giữ phần dư của (máy, ngày).
  // Máy không gửi lịch sử web (vd điện thoại) ⇒ giữ nguyên giờ trình duyệt.
  const webMay = new Map<string, number>(), tdMay = new Map<string, number>();
  for (const w of web) webMay.set(`${w.device_id}|${w.ngay}`, (webMay.get(`${w.device_id}|${w.ngay}`) ?? 0) + w.giay);
  for (const a of app) if (TRINH_DUYET.has(chuanMuc(a.muc))) tdMay.set(`${a.device_id}|${a.ngay}`, (tdMay.get(`${a.device_id}|${a.ngay}`) ?? 0) + a.phut * 60);
  for (const a of app) {
    const id = chuanMuc(a.muc);
    if (!TRINH_DUYET.has(id)) { cong("app", id, a.ngay, a.phut * 60); continue; }
    const k = `${a.device_id}|${a.ngay}`, td = tdMay.get(k) ?? 0, du = Math.max(0, td - (webMay.get(k) ?? 0));
    cong("app", id, a.ngay, td ? (a.phut * 60 * du) / td : 0);
  }
  for (const w of web) cong("web", w.ten_mien, w.ngay, w.giay, w.so_lan);
  // Lịch sử trình duyệt tính cả tab mở nền ⇒ một ngày có thể vượt 24 giờ: thu nhỏ đều mọi mục của ngày đó về đúng 24 giờ.
  for (let i = 0; i < 7; i++) {
    const t = [...ds.values()].reduce((a, x) => a + x.g[i], 0);
    if (t > NGAY_GIAY) for (const x of ds.values()) x.g[i] = (x.g[i] * NGAY_GIAY) / t;
  }

  const muc: MucDung[] = [...ds.values()].map(({ g, ...x }) => {
    const theoNgay = g.map((v) => Math.round(v));
    return { ...x, theoNgay, giay: theoNgay.reduce((a, b) => a + b, 0) };
  }).sort((a, b) => b.giay - a.giay || b.soLan - a.soLan || a.ten.localeCompare(b.ten));
  const theoNgay = ngayDs.map((ngay, i) => {
    const theoMuc: Partial<Record<MucMH, number>> = {};
    for (const x of muc) if (x.theoNgay[i]) theoMuc[x.muc] = (theoMuc[x.muc] ?? 0) + x.theoNgay[i];
    return { ngay, giay: Object.values(theoMuc).reduce((a, b) => a + (b ?? 0), 0), theoMuc };
  });
  const theoMuc = MUC_MH.map((m) => ({ muc: m, giay: theoNgay.reduce((a, d) => a + (d.theoMuc[m] ?? 0), 0), soMuc: muc.filter((x) => x.muc === m).length }))
    .filter((x) => x.giay > 0).sort((a, b) => b.giay - a.giay);
  return { theoNgay, theoMuc, ds: muc.slice(0, 200), tatCa: muc.length, tongGiay: theoNgay.reduce((a, d) => a + d.giay, 0) };
}

/** Thời gian màn hình một tuần của Con (giây). `lui` = 0 tuần này, 1 tuần trước… (tối đa 12). */
export async function thoiGianManHinh(fam: string, con: string, lui = 0, now = new Date()) {
  const [f, c] = await Promise.all([
    q<{ tz: string }>(`select tz from families where id = $1`, [fam]),
    q<{ ten: string }>(`select ten from children where id = $1 and family_id = $2`, [con, fam]),
  ]);
  const tz = f[0]?.tz ?? "Asia/Ho_Chi_Minh";
  const hom = gioDiaPhuong(now, tz).ngay;
  const n = Math.max(0, Math.min(12, Math.round(Number(lui)) || 0));
  const dau = congNgay(dauTuan(hom), -7 * n);
  const luat = await q<Luat>(
    `select child_id, muc, ten, loai, nhom from app_rules where family_id = $1 and child_id in ('', $2) and (het is null or het > $3)`, [fam, con, now]);
  const [nay, truoc] = await Promise.all([tuan(fam, con, dau, luat), tuan(fam, con, congNgay(dau, -7), luat)]);
  // trung bình theo số ngày đã qua của tuần (tuần này tính tới hôm nay)
  const soNgayQua = n === 0 ? nay.theoNgay.filter((d) => d.ngay <= hom).length : 7;
  return {
    ten: c[0]?.ten ?? "", lui: n, dau, cuoi: congNgay(dau, 6), homNay: hom,
    ...nay, tbNgayGiay: Math.round(nay.tongGiay / Math.max(1, soNgayQua)), tuanTruocGiay: truoc.tongGiay,
  };
}
