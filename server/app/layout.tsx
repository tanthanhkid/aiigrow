import type { ReactNode } from "react";
import "./clay.css";
import { DongClay } from "./_clay/Dong";

const MO_TA = "Grow with Love. Earn with Effort — Lớn lên bằng yêu thương, nhận bằng nỗ lực.";
export const metadata = {
  metadataBase: new URL("https://aiigrow.aiilab.vn"),
  title: "AiiGrow",
  description: MO_TA,
  manifest: "/manifest.webmanifest",
  openGraph: { title: "AiiGrow", description: MO_TA, siteName: "AiiGrow", locale: "vi_VN", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "AiiGrow" }] },
  twitter: { card: "summary_large_image", title: "AiiGrow", description: MO_TA, images: ["/og.png"] },
};
export const viewport = { themeColor: "#ECE4D9" };

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
