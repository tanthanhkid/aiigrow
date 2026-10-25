// Trang 404 của máy chủ (Clay gương, docs/THIET-KE-CLAY.md). Đường lạ ngoài /api thường rơi vào app SPA (next.config.ts fallback),
// nên trang này chủ yếu hiện cho /api/<đường không có> mở bằng trình duyệt và trang Next gọi notFound().
import { I3d, Ph } from "./_clay/Icon";

export const metadata = { title: "Không tìm thấy trang — AiiGrow", robots: { index: false } };

export default function KhongThay() {
  return (
    <div className="ag">
      <main className="trang vao">
        <section className="the trang-loi">
          <div className="dau-tai"><I3d ten="eyes" mau="vang" co={56} /><h1>Không tìm thấy trang này</h1></div>
          <p className="phu-de">Đường dẫn có thể đã đổi hoặc gõ nhầm. Mã lỗi 404.</p>
          <a className="nut" href="/"><Ph ten="arrow-left" co={20} />Về app AiiGrow</a>
        </section>
      </main>
    </div>
  );
}
