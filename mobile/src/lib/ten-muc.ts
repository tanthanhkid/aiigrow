// Tên app cho người đọc từ định danh kỹ thuật (#691): tệp Windows «msedge.exe», mã gói Android/Mac «com.mojang.minecraftpe», tệp cài «SetupRoblox.exe».
// Hàm thuần (node --test: ten-muc.test.ts). Máy chủ gửi tên thật thì tên đó thắng; ở đây chỉ là đường lùi khi thiếu tên — không bao giờ trả mã gói thô.

/** App phổ biến (khớp bảng máy chủ server/lib/ten-app.ts phần hay gặp ở máy Con). Khoá: chữ thường, không «.exe». */
const BIET: Record<string, string> = {
  msedge: "Microsoft Edge", chrome: "Google Chrome", firefox: "Firefox", brave: "Brave", coccoc: "Cốc Cốc", opera: "Opera",
  roblox: "Roblox", robloxplayerbeta: "Roblox", robloxplayerlauncher: "Roblox", minecraft: "Minecraft", minecraftlauncher: "Minecraft", javaw: "Java (thường là Minecraft)",
  "fortniteclient-win64-shipping": "Fortnite", steam: "Steam", epicgameslauncher: "Epic Games", discord: "Discord", spotify: "Spotify", vlc: "VLC",
  zalo: "Zalo", telegram: "Telegram", tiktok: "TikTok", netflix: "Netflix", mspaint: "Paint", notepad: "Notepad", calc: "Máy tính", calculatorapp: "Máy tính",
  winword: "Word", excel: "Excel", powerpnt: "PowerPoint", teams: "Microsoft Teams", "ms-teams": "Microsoft Teams", explorer: "File Explorer",
  "com.google.android.youtube": "YouTube", "com.google.android.apps.youtube.kids": "YouTube Kids", "com.zhiliaoapp.musically": "TikTok", "com.ss.android.ugc.trill": "TikTok",
  "com.roblox.client": "Roblox", "com.mojang.minecraftpe": "Minecraft", "com.supercell.clashofclans": "Clash of Clans", "com.supercell.brawlstars": "Brawl Stars",
  "com.king.candycrushsaga": "Candy Crush Saga", "com.facebook.katana": "Facebook", "com.facebook.orca": "Messenger", "com.instagram.android": "Instagram",
  "com.zing.zalo": "Zalo", "com.android.chrome": "Google Chrome", "com.google.chrome": "Google Chrome", "com.apple.safari": "Safari", "com.spotify.music": "Spotify",
  "com.dts.freefireth": "Free Fire", "com.garena.game.kgvn": "Liên Quân Mobile", "com.vng.pubgmobile": "PUBG Mobile", "com.tencent.ig": "PUBG Mobile",
};
/** Đuôi tên gói không mang nghĩa (minecraftpe → minecraft). */
const DUOI_GOI = /(pe|android|client|mobile|app|free|lite|hd|global|vn)$/;
/** Tên miền thường (youtube.com, m.youtube.com, vtv.vn) — giữ nguyên, không phải mã gói. */
const TEN_MIEN = /\.(com|vn|net|org|edu|io|gov|info|tv|me|co|app|dev)$/;

const hoaDau = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Mã gói Android / bundle id Mac (com.king.candycrushsaga): ≥ 3 khúc, không khoảng trắng, không phải tên miền. */
export const laMaGoi = (s: string) => /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$/i.test(s.trim()) && !TEN_MIEN.test(s.trim().toLowerCase());

/** Tên đẹp từ định danh: roblox.exe → Roblox, com.mojang.minecraftpe → Minecraft, com.king.candycrushsaga → Candy Crush Saga (bảng) / tên khúc cuối.
 *  Có `ten` khác `muc` (máy chủ / agent gửi) thì dùng `ten`. Chữ tự do (có khoảng trắng), tên miền, đường dẫn giữ nguyên. */
export function tenMuc(muc: string, ten?: string | null): string {
  if (ten && ten.trim() && ten !== muc) return ten.trim();
  const goc = (muc ?? "").trim();
  const m = goc.toLowerCase();
  if (!m) return "App này";
  if (BIET[m]) return BIET[m];
  if (m.endsWith(".exe")) {
    const k = m.slice(0, -4);
    if (BIET[k]) return BIET[k];
    return hoaDau(k.replace(/[-_.]+/g, " ").trim()) || goc;
  }
  if (laMaGoi(m)) {
    const cuoi = m.split(".").pop()!;
    const bo = cuoi.replace(DUOI_GOI, "");
    return hoaDau(bo.length >= 3 ? bo : cuoi);
  }
  return goc;
}

/** Tên app từ tên TỆP CÀI Con tải về (#691 mục 3): bỏ «setup / installer / launcher» ở đầu hoặc cuối, bản sao «(1)», số phiên bản, «-2».
 *  SetupRoblox.exe → Roblox · «Roblox Installer (1).exe» → Roblox · Minecraft-2.exe → Minecraft · vlc-3.0.20-win64.exe → VLC. */
export function tenTepCai(tep: string): string {
  let t = (tep ?? "").trim().replace(/\.(exe|msi|msix|apk|dmg|pkg)$/i, "");
  t = t.replace(/\s*\(\d+\)$/, "");                                         // bản sao trình duyệt: «x (1)»
  t = t.replace(/[-_ ]+(v?\d+([._]\d+)*)([-_ ].*)?$/i, "");                   // phiên bản / «-2» / «-win64»
  t = t.replace(/[-_ ]*(x64|x86|win64|win32|amd64|arm64)$/i, "");
  t = t.replace(/^(setup|install|installer)[-_ ]*/i, "").replace(/[-_ ]*(setup|installer|install|launcher)$/i, "");
  t = t.replace(/[-_.]+$/, "").trim();
  if (!t) return "App mới";
  return BIET[t.toLowerCase()] ?? hoaDau(t.replace(/[-_]+/g, " "));
}

/** Tên hiển thị của mục Con xin (#691 mục 4): tên app máy chủ gửi; thiếu thì tên đẹp từ định danh (không hiện «robloxplayerbeta.exe»). */
export const tenYc = (y: { gia_tri: string | null; ten_app?: string | null }): string | null =>
  y.ten_app || (y.gia_tri ? tenMuc(y.gia_tri) : y.gia_tri);
