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
  "photos.exe": "Ảnh", "windowscamera.exe": "Camera", "systemsettings.exe": "Cài đặt Windows",
  "com.google.chrome": "Google Chrome", "com.apple.safari": "Safari", "com.apple.finder": "Finder", "org.mozilla.firefox": "Firefox", "com.microsoft.edgemac": "Microsoft Edge",
  "com.spotify.client": "Spotify", "com.hnc.discord": "Discord", "com.valvesoftware.steam": "Steam", "com.roblox.robloxplayer": "Roblox",
  "com.google.android.youtube": "YouTube", "com.zhiliaoapp.musically": "TikTok", "com.roblox.client": "Roblox", "com.mojang.minecraftpe": "Minecraft",
  "com.facebook.katana": "Facebook", "com.instagram.android": "Instagram", "com.supercell.clashofclans": "Clash of Clans",
};

/** Tên hiển thị của một mục (đã chuẩn hoá chữ thường như lưu trong `usage` / `app_rules`). */
export function tenApp(muc: string): string {
  const k = muc.trim().toLowerCase();
  if (BIET[k]) return BIET[k];
  if (k.endsWith(".exe")) {
    const goc = k.slice(0, -4).replace(/[-_.]+/g, " ").trim();
    return goc ? goc.charAt(0).toUpperCase() + goc.slice(1) : muc;
  }
  return muc;
}
