// Bản web gộp vào máy chủ Next (một link cho bản thử): EXPO_BASE_URL=/app ⇒ app chạy dưới /app, xuất dạng SPA một trang
// (Next trả /app/index.html cho mọi đường dẫn con). Không đặt biến ⇒ giữ nguyên app.json (bản native, pha.mjs).
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = process.env.EXPO_BASE_URL;
  if (!base) return config as ExpoConfig;
  return { ...config, experiments: { ...config.experiments, baseUrl: base }, web: { ...config.web, output: "single" } } as ExpoConfig;
};
