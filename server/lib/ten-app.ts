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
/** Khúc đầu của mã gói kiểu tên miền đảo — tên miền web thường không bắt đầu bằng các khúc này (www.bbc.co.uk, m.youtube.com). */
const DAU_GOI = /^(com|org|net|io|vn|edu|gov|air|app|me|co|tv|de|uk|jp|kr|cn|in|us|ru|br|fr|it|es|info|biz)$/;
/** Mã gói Android / bundle id Mac (com.king.candycrushsaga, com.whatsapp): khúc đầu là đuôi tên miền đảo, ≥ 2 khúc, không khoảng trắng. */
/** Khúc cuối là đuôi tên miền ⇒ tên miền web (fr.wikipedia.org, tv.zing.vn), không phải mã gói. */
const DUOI_WEB = /^(com|org|net|io|vn|edu|gov|info|biz|me|co|tv|app|uk|us|jp|kr|cn|de|fr|ru|br|it|es|in|xyz|online|site|dev)$/;
export const laMaGoi = (s: string) => {
  const t = s.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(t)) return false;
  const k = t.split(".");
  return DAU_GOI.test(k[0]) && !DUOI_WEB.test(k[k.length - 1]);
};

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
  return muc;
}

/** Tên cho thẻ «Đang chơi» (#691): tên THẬT agent gửi (`am.tenAppThat`, khoá chữ thường) › bảng › mã gói lạ thành «App lạ» (không đoán từ khúc cuối, không lộ mã gói). */
export function tenHienThi(muc: string, tenThat?: Map<string, string>): string {
  const t = tenThat?.get(muc.trim().toLowerCase()) ?? tenApp(muc);
  return laMaGoi(t) ? "App lạ" : t;
}
