// Universal link cho app AiiGrow Con (iPhone/iPad): `huongDanCai("ios")` in QR `<máy chủ>/cai/<token>` (lib/chuyen-doi.ts).
// iOS chỉ mở thẳng app khi máy chủ phục vụ apple-app-site-association (AASA) khớp appID; chưa cài app thì rơi vào trang /cai/<token>.
export const BUNDLE_APP_CON = "vn.aiilab.aiigrow.con";
// Team ID của tài khoản Apple Developer AiiLab (không phải bí mật — nằm trong mọi appID công khai). Đổi bằng env APPLE_TEAM_ID khi đổi tài khoản.
const TEAM_MAC_DINH = "ADUL7HT969";

export const teamId = (env: Record<string, string | undefined> = process.env) => (env.APPLE_TEAM_ID ?? "").trim() || TEAM_MAC_DINH;

export function aasa(env: Record<string, string | undefined> = process.env) {
  return { applinks: { details: [{ appIDs: [`${teamId(env)}.${BUNDLE_APP_CON}`], components: [{ "/": "/cai/*" }] }] } };
}

/** Token trong đường /cai/<token>: chỉ giữ ký tự an toàn (token gói cài là chuỗi base64url/hex) — tránh chèn chữ lạ vào trang. */
export const chuanToken = (t: unknown): string => String(t ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 200);
export const lienKetApp = (token: string) => `aiigrowcon://cai/${chuanToken(token)}`;
