import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  agentRules: false,
  // App Ba Mẹ / màn Con (bản web Expo, xuất vào public/app bằng `pnpm build:app`) là SPA phục vụ NGAY Ở GỐC: / là màn chào/đăng nhập,
  // /dang-nhap, /dang-ky, /otp… đường ngắn (Thanh 22/10). Tệp tĩnh vẫn nằm trong public/app; /_expo, /assets trỏ vào đó.
  // Đường nào không phải trang Next (/tai, /admin, /quay) hay /api thì trả index.html để tải lại trang (F5) không 404.
  // Link cũ /app/* ⇒ 308 sang đường ngắn.
  async redirects() {
    return [
      { source: "/app", destination: "/", permanent: true },
      { source: "/app/:duong*", destination: "/:duong*", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/app/index.html" }],
      afterFiles: [
        { source: "/_expo/:duong*", destination: "/app/_expo/:duong*" },
        { source: "/assets/:duong*", destination: "/app/assets/:duong*" },
      ],
      fallback: [{ source: "/:duong((?!api(?:/|$)|_next/).*)", destination: "/app/index.html" }],
    };
  },
};

export default config;
