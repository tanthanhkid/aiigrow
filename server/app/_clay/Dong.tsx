"use client";
// Chuyển động Clay cho web máy chủ — «vui» + «ánh men» (docs/THIET-KE-CLAY.md mục 3, thông số đầu docs/clay/M-vui.js + M-anh-men.css):
// - Nhấn: bẹp (scale .95/.90 trong 110ms) rồi thả bằng lò xo vượt nhẹ (CSS var --sp-tha), highlight men theo ngón (--mx/--my),
//   vệt men lướt chéo 420ms khi thả. Áp cho mọi phần tử «bấm được» bằng một bộ nghe sự kiện duy nhất (gồm phần tử sinh sau).
// - Tải trang: các khối trong .vao nảy vào lần lượt — thuần CSS (clay.css), không cần JS.
// - Thành công (quầy quét phiếu hợp lệ): phaoGiay() — 20 hạt ngọc/vàng.
// - prefers-reduced-motion: không bẹp/lướt/confetti; CSS chỉ còn fade.
import { useEffect } from "react";

const BAM = ".nut, .chip, a.o-so, a.dong, button.dong, nav.muc a, .lui, .cong-tac, .chip-x button";
const giamDong = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function quet(el: HTMLElement) {
  if (giamDong()) return;
  el.classList.remove("quet"); void el.offsetWidth; el.classList.add("quet");
  window.clearTimeout(Number(el.dataset.q)); el.dataset.q = String(window.setTimeout(() => el.classList.remove("quet"), 520));
}

export function DongClay() {
  useEffect(() => {
    let dang: HTMLElement | null = null;
    const tha = () => { if (!dang) return; const el = dang; dang = null; el.classList.remove("an"); quet(el); };
    const xuong = (e: PointerEvent) => {
      if (e.button > 0) return;
      const el = (e.target as Element | null)?.closest?.(BAM) as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x.toFixed(1)}%`); el.style.setProperty("--my", `${y.toFixed(1)}%`);
      if (giamDong()) return;
      dang = el; el.classList.add("an");
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = (e.target as Element | null)?.closest?.(BAM) as HTMLElement | null;
      if (el) quet(el);
    };
    document.addEventListener("pointerdown", xuong, { passive: true });
    document.addEventListener("pointerup", tha, { passive: true });
    document.addEventListener("pointercancel", tha, { passive: true });
    window.addEventListener("blur", tha);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("pointerdown", xuong); document.removeEventListener("pointerup", tha);
      document.removeEventListener("pointercancel", tha); window.removeEventListener("blur", tha); document.removeEventListener("keydown", phim);
    };
  }, []);
  return null;
}

/** Pháo giấy nhỏ ngọc/vàng bung từ tâm phần tử (M-vui: 20 hạt 380–450ms ease-out + rơi 30px). Reduced motion ⇒ bỏ. */
export function phaoGiay(goc: HTMLElement | null) {
  if (!goc || giamDong() || typeof goc.animate !== "function") return;
  const lop = document.createElement("div");
  lop.className = "phao-giay"; lop.setAttribute("aria-hidden", "true");
  goc.appendChild(lop);
  const r = goc.getBoundingClientRect(), cx = r.width / 2, cy = Math.min(r.height * 0.32, 180);
  const MAU = ["#0f6b5c", "#14826f", "#f5b70a", "#ffd447", "#8fe3cf"];
  for (let i = 0; i < 20; i++) {
    const h = document.createElement("i");
    h.className = i % 3 ? "hat" : "hat tron";
    h.style.background = MAU[i % MAU.length];
    lop.appendChild(h);
    const goc2 = (i / 20) * Math.PI * 2 + Math.random() * 0.4, xa = 70 + Math.random() * 90;
    const dx = Math.cos(goc2) * xa, dy = Math.sin(goc2) * xa * 0.7;
    h.animate([
      { transform: `translate(${cx}px,${cy}px) rotate(0) scale(.6)`, opacity: 1 },
      { transform: `translate(${cx + dx}px,${cy + dy}px) rotate(${180 + i * 23}deg) scale(1)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${cx + dx * 1.05}px,${cy + dy + 30}px) rotate(${260 + i * 23}deg) scale(.9)`, opacity: 0 },
    ], { duration: 380 + Math.random() * 70 + 260, easing: "cubic-bezier(.25,.46,.45,.94)", fill: "forwards" });
  }
  window.setTimeout(() => lop.remove(), 900);
}
