import { tenThanThien } from "./ten-than-thien.ts";
// Tên dễ hiểu cho app Ba Mẹ thấy trong danh sách «đã thấy trên máy Con» (DX-028, QA 24/10: gõ «Edge» ra «edge», tên đúng là msedge.exe).
// Tên tệp chạy Windows / mã gói macOS·Android → tên hiển thị. Không biết thì làm đẹp tên tệp (bỏ .exe, tách chữ), tên miền giữ nguyên.
const BIET: Record<string, string> = {
  "msedge.exe": "Microsoft Edge", "chrome.exe": "Google Chrome", "firefox.exe": "Firefox", "brave.exe": "Brave", "coccoc.exe": "Cốc Cốc", "opera.exe": "Opera",
  "roblox.exe": "Roblox", "robloxplayerbeta.exe": "Roblox", "minecraft.exe": "Minecraft", "javaw.exe": "Java (thường là Minecraft)", "fortniteclient-win64-shipping.exe": "Fortnite",
  "steam.exe": "Steam", "epicgameslauncher.exe": "Epic Games", "discord.exe": "Discord", "spotify.exe": "Spotify", "vlc.exe": "VLC",
  "zalo.exe": "Zalo", "telegram.exe": "Telegram", "whatsapp.exe": "WhatsApp", "skype.exe": "Skype", "tiktok.exe": "TikTok", "netflix.exe": "Netflix",
  "notepad.exe": "Notepad", "mspaint.exe": "Paint", "calc.exe": "Máy tính", "calculatorapp.exe": "Máy tính", "cmd.exe": "Command Prompt", "powershell.exe": "PowerShell",
  "winword.exe": "Word", "excel.exe": "Excel", "powerpnt.exe": "PowerPoint", "onenote.exe": "OneNote", "outlook.exe": "Outlook", "teams.exe": "Microsoft Teams", "ms-teams.exe": "Microsoft Teams",
  "msedgewebview2.exe": "Trình duyệt nhúng của Windows (WebView2)", "explorer.exe": "File Explorer", "taskmgr.exe": "Task Manager", "snippingtool.exe": "Snipping Tool",
  "photos.exe": "Ảnh", "microsoft.photos.exe": "Ảnh", "windowscamera.exe": "Camera", "systemsettings.exe": "Cài đặt Windows",
  "com.google.chrome": "Google Chrome", "com.apple.safari": "Safari", "com.apple.finder": "Finder", "org.mozilla.firefox": "Firefox", "com.microsoft.edgemac": "Microsoft Edge",
  "com.spotify.client": "Spotify", "com.hnc.discord": "Discord", "com.valvesoftware.steam": "Steam", "com.roblox.robloxplayer": "Roblox",
  "com.google.android.youtube": "YouTube", "com.zhiliaoapp.musically": "TikTok", "com.roblox.client": "Roblox", "com.mojang.minecraftpe": "Minecraft",
  "com.facebook.katana": "Facebook", "com.instagram.android": "Instagram", "com.supercell.clashofclans": "Clash of Clans",
  "com.google.android.apps.youtube.kids": "YouTube Kids", "com.ss.android.ugc.trill": "TikTok", "com.supercell.brawlstars": "Brawl Stars",
  "com.king.candycrushsaga": "Candy Crush Saga", "com.facebook.orca": "Messenger", "com.zing.zalo": "Zalo", "com.android.chrome": "Google Chrome",
  "com.dts.freefireth": "Free Fire", "com.garena.game.kgvn": "Liên Quân Mobile", "robloxplayerlauncher.exe": "Roblox", "minecraftlauncher.exe": "Minecraft",
};
/** Tên miền thường (youtube.com, m.youtube.com) — giữ nguyên, không phải mã gói. */
const TEN_MIEN = /\.(com|vn|net|org|edu|io|gov|info|tv|me|co|app|dev)$/;
/** Mã gói Android / bundle id Mac (com.king.candycrushsaga): ≥ 3 khúc, không khoảng trắng, không phải tên miền. */
export const laMaGoi = (s: string) => /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$/i.test(s.trim()) && !TEN_MIEN.test(s.trim().toLowerCase());

/** Tên hiển thị của một mục (đã chuẩn hoá chữ thường như lưu trong `usage` / `app_rules`). */
export function tenApp(muc: string): string {
  const k = muc.trim().toLowerCase();
  if (BIET[k]) return BIET[k];
  const tt = tenThanThien(k);   // #659: tên kỹ thuật Microsoft Store (BingWeather…) mà bảng trên chưa có
  if (tt) return tt;
  if (k.endsWith(".exe")) {
    const goc = k.slice(0, -4).replace(/[-_.]+/g, " ").trim();
    return goc ? goc.charAt(0).toUpperCase() + goc.slice(1) : muc;
  }
  if (laMaGoi(k)) {   // #691: gói lạ ⇒ khúc cuối bỏ đuôi vô nghĩa (com.vendor.superpuzzlepe → Superpuzzle), không trả mã gói thô
    const cuoi = k.split(".").pop()!, bo = cuoi.replace(/(pe|android|client|mobile|app|free|lite|hd|global|vn)$/, "");
    const t = bo.length >= 3 ? bo : cuoi;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return muc;
}

/** Tên cho màn Ba Mẹ / Con: tên THẬT agent gửi trong danh sách app của máy (`am.tenAppThat`) thắng tên đoán từ mục. */
export const tenHienThi = (muc: string, tenThat?: Map<string, string>) => tenThat?.get(muc.trim().toLowerCase()) ?? tenThat?.get(muc) ?? tenApp(muc);
