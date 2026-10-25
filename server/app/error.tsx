"use client";
// Trang lỗi khi một trang Next (/tai, /cai, /admin, /quay…) hỏng lúc chạy — Clay gương thay màn lỗi trắng mặc định của Next.
import { useEffect } from "react";
import { I3d, Ph } from "./_clay/Icon";

export default function Loi({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="ag">
      <main className="trang vao">
        <section className="the trang-loi">
          <div className="dau-tai"><I3d ten="shield" mau="cam" co={56} /><h1>Trang gặp lỗi</h1></div>
          <p className="phu-de">Thử tải lại; nếu vẫn lỗi, nhắn AiiLab qua mục Hỗ trợ trong app{error.digest ? <> kèm mã lỗi <code>{error.digest}</code></> : null}.</p>
          <div className="hai-nut">
            <button className="nut" type="button" onClick={() => reset()}>Thử lại</button>
            <a className="nut vien" href="/"><Ph ten="arrow-left" co={20} />Về app AiiGrow</a>
          </div>
        </section>
      </main>
    </div>
  );
}
