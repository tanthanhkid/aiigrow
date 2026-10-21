import type { ReactNode } from "react";

export const metadata = { title: "AiiGrow", description: "Grow with Love. Earn with Effort — Lớn lên bằng yêu thương, nhận bằng nỗ lực." };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fbf8f2", color: "#1f2a2a" }}>{children}</body>
    </html>
  );
}
