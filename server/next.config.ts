import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  agentRules: false,
  // App Ba Mẹ / màn Con (bản web Expo, xuất vào public/app bằng `pnpm build:app`) là SPA phục vụ NGAY Ở GỐC: / là màn chào/đăng nhập,
  // /dang-nhap, /dang-ky, /otp… đường ngắn (Thanh 22/10). Tệp tĩnh vẫn nằm trong public/app; /_expo, /assets trỏ vào đó.
  // Đường nào không phải trang Next (/tai, /admin, /quay) hay /api thì trả index.html để tải lại trang (F5) không 404.
  // Link cũ /app/* ⇒ 308 sang đường ngắn (trừ tệp service worker: trình duyệt không theo chuyển hướng khi cập nhật service worker).
  // Service worker cũ (nếu máy còn) ⇒ public/sw.js tự huỷ. HTML không cache ⇒ deploy mới là F5 thấy ngay; /_expo, /assets có hash ⇒ cache dài.
  async redirects() {
    return [
      // Bộ cài agent Windows nằm ở GitHub Release repo public tanthanhkid/aiigrow-tai (lib/ban-agent.ts); link giữ trên tên miền máy chủ.
      {
        source: "/tai/AiiGrow-Setup-:ban(\\d+\\.\\d+\\.\\d+).exe",
        destination: "https://github.com/tanthanhkid/aiigrow-tai/releases/download/v:ban/AiiGrow-Setup-:ban.exe",
        permanent: false,
      },
      // Tác tử máy Con macOS (.pkg ký Developer ID + notarize) — GitHub Release mac-<bản> (lib/ban-agent.ts).
      {
        source: "/tai/AiiGrow-:ban(\\d+\\.\\d+\\.\\d+).pkg",
        destination: "https://github.com/tanthanhkid/aiigrow-tai/releases/download/mac-:ban/AiiGrow-:ban.pkg",
        permanent: false,
      },
      // App Con Android tự cập nhật (lib/ban-agent.ts › BAN_CON_ANDROID): tên tệp có số bản ⇒ sha256 trong manifest không lệch khi phát bản sau.
      {
        source: "/tai/AiiGrow-Con-:ban(\\d+\\.\\d+\\.\\d+).apk",
        destination: "https://github.com/tanthanhkid/aiigrow-tai/releases/download/con-android-:ban/AiiGrow-Con-android.apk",
        permanent: false,
      },
      // Tác tử máy Con Android (vn.aiilab.aiigrow.con, ký khoá phát hành aiigrow-con) — QR Device Owner + trang /tai trỏ /tai/aiigrow-con.apk ⇒ GitHub Release con-android-<bản>.
      {
        source: "/tai/aiigrow-con.apk",
        destination: "https://github.com/tanthanhkid/aiigrow-tai/releases/download/con-android-0.2.2/AiiGrow-Con-android.apk",
        permanent: false,
      },
      // App Ba Mẹ cho Android: release cuộn android-moi-nhat (asset tên cố định, mobile/scripts/phat-hanh-apk.sh ghi đè mỗi lần phát hành) — không có redirect thì /tai/aiigrow.apk rơi vào index.html của SPA.
      { source: "/tai/aiigrow.apk", destination: "https://github.com/tanthanhkid/aiigrow-tai/releases/download/android-moi-nhat/AiiGrow-android.apk", permanent: false },
      // Chính sách quyền riêng tư: URL ngắn tiếng Anh cho cửa hàng ứng dụng.
      { source: "/privacy", destination: "/chinh-sach-rieng-tu", permanent: false },
      { source: "/app", destination: "/", permanent: true },
      { source: "/app/:duong((?!sw\\.js$|service-worker\\.js$).*)", destination: "/:duong", permanent: true },
    ];
  },
  async headers() {
    const khongCache = [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }];
    return [
      { source: "/((?!api/|_expo/|assets/|_next/static/|linh-vat/|phong/|icon3d/).*)", headers: khongCache },
      { source: "/:tep(sw\\.js|service-worker\\.js)", headers: [...khongCache, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/app/:tep(sw\\.js|service-worker\\.js)", headers: khongCache },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/app/index.html" },
        { source: "/app/:tep(sw\\.js|service-worker\\.js)", destination: "/:tep" },
      ],
      afterFiles: [
        { source: "/_expo/:duong*", destination: "/app/_expo/:duong*" },
        { source: "/assets/:duong*", destination: "/app/assets/:duong*" },
      ],
      fallback: [{ source: "/:duong((?!api(?:/|$)|_next/).*)", destination: "/app/index.html" }],
    };
  },
};

export default config;
