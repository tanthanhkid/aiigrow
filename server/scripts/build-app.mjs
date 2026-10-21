// Xuất app Expo (mobile/) dạng web vào server/public/app để Next phục vụ cùng nguồn với /api (bản thử một link, không cần CORS).
// Dùng: `pnpm build:app` (cần `npm ci` trong mobile/ trước). Vercel: buildCommand gọi script này rồi `next build`.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const mobile = fileURLToPath(new URL("../../mobile/", import.meta.url));
const ra = fileURLToPath(new URL("../public/app", import.meta.url));
rmSync(ra, { recursive: true, force: true });
execSync(`npx expo export -p web --output-dir "${ra}"`, {
  cwd: mobile, stdio: "inherit",
  env: { ...process.env, EXPO_BASE_URL: "/app", EXPO_PUBLIC_API: "/" },   // "/" ⇒ GOC = "" ⇒ gọi /api/... cùng nguồn
});
