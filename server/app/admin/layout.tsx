import type { ReactNode } from "react";
import "../quay/nen.css";
import "./admin.css";

export const metadata = { title: "Quản trị AiiLab · AiiGrow", robots: { index: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
