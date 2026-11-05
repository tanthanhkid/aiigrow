// Bản web gộp vào máy chủ Next (một link cho bản thử): EXPO_BASE_URL=/app ⇒ app chạy dưới /app, xuất dạng SPA một trang
// (Next trả /app/index.html cho mọi đường dẫn con). Không đặt biến ⇒ giữ nguyên app.json (bản native, pha.mjs).
// Đăng nhập Google / Facebook (docs/OAUTH.md): bản native cần thêm scheme quay về — `vn.aiilab.aiigrow` (Google: <bundle/package>:/oauthredirect)
// và `fb<EXPO_PUBLIC_FACEBOOK_APP_ID>` (Facebook: fb<id>://authorize). Scheme chính `aiigrow` giữ ở đầu (link sâu cũ).
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const fb = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  const goc = [config.scheme ?? "aiigrow"].flat();
  const scheme = [...new Set([...goc, "vn.aiilab.aiigrow", ...(fb ? [`fb${fb}`] : [])])];
  const c = { ...config, scheme } as ExpoConfig;
  const base = process.env.EXPO_BASE_URL;
  if (!base) return c;
  return { ...c, experiments: { ...c.experiments, baseUrl: base }, web: { ...c.web, output: "single" } } as ExpoConfig;
};
