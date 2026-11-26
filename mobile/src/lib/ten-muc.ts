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
/** Khúc đầu của mã gói kiểu tên miền đảo (com.…, org.…, vn.…) — tên miền web thường KHÔNG bắt đầu bằng các khúc này (www.bbc.co.uk, m.youtube.com). */
const DAU_GOI = /^(com|org|net|io|vn|edu|gov|air|app|me|co|tv|de|uk|jp|kr|cn|in|us|ru|br|fr|it|es|info|biz)$/;

const hoaDau = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Mã gói Android / bundle id Mac (com.king.candycrushsaga, com.whatsapp): khúc đầu là đuôi tên miền đảo, ≥ 2 khúc, không khoảng trắng. */
export const laMaGoi = (s: string) => {
  const t = s.trim().toLowerCase();
  return /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(t) && DAU_GOI.test(t.split(".")[0]);
};

/** Tên đẹp từ định danh: roblox.exe → Roblox, com.mojang.minecraftpe → Minecraft (bảng). Có `ten` khác `muc` (máy chủ / agent gửi) thì dùng `ten`.
 *  Mã gói không có trong bảng ⇒ `laLa` (mặc định «App lạ») — không đoán tên từ khúc cuối (com.snapchat.android ⇒ «Android» là sai), không trả mã gói thô.
 *  Tên miền giữ nguyên; chữ / tên tiến trình khác viết hoa chữ đầu. */
export function tenMuc(muc: string, ten?: string | null, laLa = "App lạ"): string {
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
  if (laMaGoi(m)) return laLa;
  if (m.includes(".") || m.includes("/")) return goc;   // tên miền / đường dẫn web
  return hoaDau(goc);
}

/** Tên app từ tên TỆP CÀI Con tải về (#691 mục 3): bỏ «setup / installer / launcher» ở đầu hoặc cuối, bản sao «(1)», số phiên bản có dấu chấm, «-2».
 *  SetupRoblox.exe → Roblox · «Roblox Installer (1).exe» → Roblox · Minecraft-2.exe → Minecraft · vlc-3.0.20-win64.exe → VLC · «FIFA 23.exe» giữ «FIFA 23». */
export function tenTepCai(tep: string): string {
  let t = (tep ?? "").trim().replace(/\.(exe|msi|msix|apk|dmg|pkg)$/i, "");
  t = t.replace(/\s*\(\d+\)$/, "");                                  // bản sao trình duyệt: «x (1)»
  t = t.replace(/[-_ ]+v?\d+(\.\d+)+([-_ ].*)?$/i, "");              // phiên bản có dấu chấm: -3.0.20-win64, _v1.2
  t = t.replace(/[-_ ]*(x64|x86|win64|win32|amd64|arm64)$/i, "");
  t = t.replace(/-\d+$/, "");                                        // tệp tải trùng: Minecraft-2
  t = t.replace(/^(installer|install|setup)[-_ ]*/i, "").replace(/[-_ ]*(installer|install|setup|launcher)$/i, "");
  t = t.replace(/[-_.]+$/, "").trim();
  if (!t) return "App mới";
  return BIET[t.toLowerCase()] ?? hoaDau(t.replace(/[-_]+/g, " "));
}

/** Tên hiển thị của mục Con xin (#691 mục 4): tên app máy chủ gửi; thiếu thì tên đẹp từ định danh (không hiện «robloxplayerbeta.exe»). */
export const tenYc = (y: { gia_tri: string | null; ten_app?: string | null }): string | null =>
  y.ten_app || (y.gia_tri ? tenMuc(y.gia_tri, null, y.gia_tri) : y.gia_tri);   // mã gói lạ: Ba Mẹ cần định danh để nhận ra, giữ nguyên
