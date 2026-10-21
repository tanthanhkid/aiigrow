import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  agentRules: false,
  // App Ba Mẹ / màn Con (bản web Expo, xuất vào public/app bằng `pnpm build:app`) là SPA: đường dẫn nào không phải tệp tĩnh thì trả index.html.
  async rewrites() {
    return { beforeFiles: [], afterFiles: [], fallback: [{ source: "/app/:duong*", destination: "/app/index.html" }] };
  },
};

export default config;
