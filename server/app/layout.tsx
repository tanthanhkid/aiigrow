import type { ReactNode } from "react";
import "./clay.css";
import { DongClay } from "./_clay/Dong";

export const metadata = { title: "AiiGrow", description: "Grow with Love. Earn with Effort — Lớn lên bằng yêu thương, nhận bằng nỗ lực." };
export const viewport = { themeColor: "#ecebe7" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>{children}<DongClay /></body>
    </html>
  );
}
