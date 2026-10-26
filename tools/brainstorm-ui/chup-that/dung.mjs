// node dung.mjs <pha.mjs|pha-tre.mjs> <phần thêm .mjs> <ra.mjs>
// Ghép: phần đầu kịch bản phá (máy chủ tĩnh + dữ liệu giả + Chrome/CDP) đến trước «cổng chuẩn giao diện» + phần chụp của mình.
import { readFileSync, writeFileSync } from "node:fs";
const [goc, them, ra] = process.argv.slice(2);
let s = readFileSync(goc, "utf8");
const cat = s.indexOf("// ---------------------------------------------------------------- cổng chuẩn giao diện");
if (cat < 0) throw new Error("không thấy mốc cổng giao diện");
s = s.slice(0, cat);
const thay = (a, b) => { if (!s.includes(a)) throw new Error("không thấy: " + a); s = s.replace(a, b); };
thay("const bay = Date.now()", "const bay = Number(process.env.PHA_BAY ?? Date.now())");
thay('"C:/Program Files/Google/Chrome/Application/chrome.exe"', '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"');
s = s.replace(/await goi\("Emulation\.setDeviceMetricsOverride", \{[^}]*\}\);/, `await goi("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2.88, mobile: true });
await goi("Emulation.setTimezoneOverride", { timezoneId: "Asia/Ho_Chi_Minh" }).catch?.(() => {});
const kqSafe = await goi("Emulation.setSafeAreaInsetsOverride", { insets: { top: 50, bottom: 34, left: 0, right: 0 } });
if (kqSafe && kqSafe.code) console.log("(không đặt được safe area)", JSON.stringify(kqSafe));`);
// icon-that.json nằm cạnh kịch bản gốc
s = s.replace(`new URL("./icon-that.json", import.meta.url)`, JSON.stringify(goc.replace(/[^/]+$/, "icon-that.json")));
writeFileSync(ra, s + "\n" + readFileSync(them, "utf8"));
