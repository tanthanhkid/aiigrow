"use client";
// Lỗi ngay ở layout gốc (error.tsx không bắt được) — thay màn trắng mặc định của Next bằng khối Clay tối giản.
import { useEffect } from "react";
import "./clay.css";

export default function LoiGoc({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="vi">
      <body>
        <div className="ag">
          <main className="trang">
            <section className="the trang-loi">
              <h1>AiiGrow gặp lỗi</h1>
              <p className="phu-de">Thử tải lại; nếu vẫn lỗi, nhắn AiiLab qua mục Hỗ trợ trong app{error.digest ? <> kèm mã lỗi <code>{error.digest}</code></> : null}.</p>
              <button className="nut" type="button" onClick={() => reset()}>Thử lại</button>
            </section>
          </main>
        </div>
      </body>
    </html>
  );
}
