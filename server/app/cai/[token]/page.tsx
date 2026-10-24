// Trang dự phòng của link cài /cai/<token> khi mở bằng trình duyệt (máy chưa cài app AiiGrow Con, hoặc không phải iPhone/iPad).
// Giao diện Clay gương (docs/THIET-KE-CLAY.md).
import { chuanToken, lienKetApp } from "@/lib/ios-link.ts";
import { I3d } from "../../_clay/Icon";

export const metadata = { title: "Cài AiiGrow cho iPhone/iPad của Con — AiiGrow", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TrangCai({ params }: { params: Promise<{ token: string }> }) {
  const token = chuanToken((await params).token);
  return (
    <div className="ag">
      <main className="trang vao">
        <header className="dau-trang">
          <img className="logo" src="/logo.png" alt="AiiGrow" width={88} height={88} />
          <h1>Cài AiiGrow Con cho iPhone/iPad</h1>
          <p className="phu-de">Đây là link ghép máy của Con vào gia đình. Làm theo 3 bước:</p>
        </header>
        <ol className="buoc">
          <li>Trên máy của Con, cài app <b>AiiGrow Con</b> từ App Store.</li>
          <li>Quay lại link này (hoặc quét lại mã QR) — máy sẽ mở thẳng app và tự ghép, không cần nhập mã.</li>
          <li>Ba Mẹ duyệt quyền Screen Time bằng Apple ID của Ba Mẹ (một lần).</li>
        </ol>
        {token ? (
          <section className="the the-tai">
            <I3d ten="mobile-phone" mau="xanh" co={56} />
            <a className="nut" href={lienKetApp(token)}>Đã cài rồi — mở app AiiGrow Con</a>
            <p className="ghi-tep">
              Mã gói cài: <code className="ma-token">{token}</code>
              <br />Mã dùng được một lần và có hạn; hết hạn thì nhờ Ba Mẹ tạo gói mới trong app Ba Mẹ.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
