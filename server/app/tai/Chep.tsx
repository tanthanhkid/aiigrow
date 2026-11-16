"use client";
// Ô «link /tai» + nút Sao chép (màn Android, iPhone, Máy quá cũ).
import { useState } from "react";

export default function Chep({ url, ten = "lap" }: { url: string; ten?: string }) {
  const [da, setDa] = useState(false);
  const [loi, setLoi] = useState(false);
  const chep = async () => {
    try { await navigator.clipboard.writeText(url); setDa(true); setTimeout(() => setDa(false), 2000); } catch { setLoi(true); }
  };
  return (
    <>
      <div className="tb-du"><code title={url} style={{ userSelect: "all" }}>{url}</code><button type="button" className="tb-mn" onClick={chep}><img src={`/assets/icon3d/${ten}.webp`} alt="" width={22} height={22} />{da ? "Đã chép" : "Sao chép"}</button></div>
      {loi ? <p className="tb-loi" role="status">Trình duyệt không cho chép tự động, hãy chọn link rồi chép tay.</p> : null}
    </>
  );
}
