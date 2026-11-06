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
          <h1>Cài cho iPhone / iPad: 3 bước là xong!</h1>
          <p className="phu-de">Làm trên máy của con.</p>
        </header>
        <ol className="buoc">
          <li><b>Cài app AiiGrow Con</b> từ App Store.</li>
          <li><b>Cài hồ sơ:</b> bấm «Cho phép» rồi «Cài đặt».</li>
          <li><b>Cho phép Thời gian sử dụng:</b> Ba Mẹ xác nhận một lần.</li>
        </ol>
        {token ? (
          <section className="the the-tai">
            <div className="dau-tai"><I3d ten="mobile-phone" mau="xanh" co={56} /><h2>Mở AiiGrow Con, nhập mã</h2></div>
            <a className="nut" href={lienKetApp(token)}>Mở app AiiGrow Con</a>
            <p className="ghi-tep">
              Mã gói cài: <code className="ma-token">{token}</code>
              <br />Mã 6 số trên điện thoại Ba Mẹ · dùng được 10 phút. Mở từ link này thì máy tự ghép, không cần gõ mã; hết hạn thì nhờ Ba Mẹ tạo gói mới trong app Ba Mẹ.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
