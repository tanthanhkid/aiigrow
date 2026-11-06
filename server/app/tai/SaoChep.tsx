"use client";
// Hàng «dùng máy tính khác»: link /tai (mang mã gia đình nếu có) + nút Sao chép.
import { useState } from "react";

export default function SaoChep({ url, hien }: { url: string; hien: string }) {
  const [da, setDa] = useState(false);
  const [loi, setLoi] = useState(false);
  const chep = async () => {
    try { await navigator.clipboard.writeText(url); setDa(true); setTimeout(() => setDa(false), 2000); } catch { setLoi(true); }
  };
  return (
    <div className="tai-chep">
      <code style={{ userSelect: "all" }}>{hien}</code>
      <button type="button" className="nut vien nho" onClick={chep}>{da ? "Đã chép" : "Sao chép"}</button>
      {loi ? <p className="ghi-loi" role="status">Trình duyệt không cho chép tự động, hãy chọn link rồi chép tay.</p> : null}
    </div>
  );
}
