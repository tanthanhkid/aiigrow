"use client";
// Hàng «dùng máy tính khác»: link /tai (mang mã gia đình nếu có) + nút Sao chép.
import { useState } from "react";

export default function SaoChep({ url, hien }: { url: string; hien: string }) {
  const [da, setDa] = useState(false);
  const chep = async () => {
    try { await navigator.clipboard.writeText(url); setDa(true); setTimeout(() => setDa(false), 2000); } catch { setDa(false); }
  };
  return (
    <div className="tai-chep">
      <code>{hien}</code>
      <button type="button" className="nut vien nho" onClick={chep} aria-live="polite">{da ? "Đã chép" : "Sao chép"}</button>
    </div>
  );
}
