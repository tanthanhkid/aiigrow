// Bản web của PHONG_BM (#564): cùng tên họ với phong-bm.ts nhưng là WOFF2 (assets/fonts/web — chuyển nguyên từ đúng tệp TTF, đủ mọi glyph, OFL 1.1)
// ⇒ ~180 KB thay ~690 KB TTF. Bỏ Fraunces 700 (không chỗ nào dùng; F.logo = Fraunces 600). font-display: swap đặt ở phong-chu.web.ts.
// Native vẫn dùng TTF nhúng sẵn qua plugin expo-font (app.json) — không đổi.
/* eslint-disable @typescript-eslint/no-require-imports -- eslint-config-expo chưa có .woff2 trong danh sách đuôi asset (metro thì có) */
export const PHONG_BM = {
  BeVietnamPro_400Regular: require("../../assets/fonts/web/BeVietnamPro_400Regular.woff2"),
  BeVietnamPro_600SemiBold: require("../../assets/fonts/web/BeVietnamPro_600SemiBold.woff2"),
  BeVietnamPro_700Bold: require("../../assets/fonts/web/BeVietnamPro_700Bold.woff2"),
  BeVietnamPro_800ExtraBold: require("../../assets/fonts/web/BeVietnamPro_800ExtraBold.woff2"),
  Fraunces_600SemiBold: require("../../assets/fonts/web/Fraunces_600SemiBold.woff2"),
};
