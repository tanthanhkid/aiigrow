// Xuất app Expo (mobile/) dạng web vào server/public/app để Next phục vụ cùng nguồn với /api (bản thử một link, không cần CORS).
// Đường của app ở GỐC (không tiền tố /app — next.config.ts chuyển /_expo, /assets và đường lạ vào public/app).
// Dùng: `pnpm build:app` (cần `npm ci` trong mobile/ trước). Vercel: buildCommand gọi script này rồi `next build`.
import { execSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const mobile = fileURLToPath(new URL("../../mobile/", import.meta.url));
const ra = fileURLToPath(new URL("../public/app", import.meta.url));
rmSync(ra, { recursive: true, force: true });
execSync(`npx expo export -p web --output-dir "${ra}"`, {
  cwd: mobile, stdio: "inherit",
  env: { ...process.env, EXPO_BASE_URL: "", EXPO_PUBLIC_API: "/" },   // "/" ⇒ GOC = "" ⇒ gọi /api/... cùng nguồn
});

// #552: CSP <meta> trong index.html của SPA — chặt như header SPA (next.config.ts › csp(false)) về script / kết nối. Trình duyệt áp CẢ header
// lẫn meta ⇒ đường nào lỡ nhận CSP nới của trang Next (Next so khớp không phân biệt hoa thường: /Admin/x trả SPA) SPA vẫn không chạy script nội tuyến.
const tepIndex = `${ra}/index.html`;
const html = readFileSync(tepIndex, "utf8");
const meta = `<meta http-equiv="Content-Security-Policy" content="script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'" />`;
if (!html.includes("<head>")) throw new Error("index.html không có <head> — không chèn được CSP");
writeFileSync(tepIndex, html.replace("<head>", `<head>\n    ${meta}`));
