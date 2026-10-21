import type { ReactNode } from "react";
import "./nen.css";
import "./quay.css";

export const metadata = { title: "Quầy AiiCafe · AiiGrow", robots: { index: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
