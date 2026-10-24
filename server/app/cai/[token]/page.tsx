// Trang dự phòng của link cài /cai/<token> khi mở bằng trình duyệt (máy chưa cài app AiiGrow Con, hoặc không phải iPhone/iPad).
import { chuanToken, lienKetApp } from "@/lib/ios-link.ts";

export const metadata = { title: "Cài AiiGrow cho iPhone/iPad của Con — AiiGrow", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TrangCai({ params }: { params: Promise<{ token: string }> }) {
  const token = chuanToken((await params).token);
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 16px" }}>
      <img src="/logo.png" alt="AiiGrow" width={96} height={96} style={{ borderRadius: 22 }} />
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Cài AiiGrow Con cho iPhone/iPad</h1>
      <p style={{ color: "#4a5555", marginTop: 0 }}>Đây là link ghép máy của Con vào gia đình. Làm theo 3 bước:</p>
      <ol style={{ lineHeight: 1.7, paddingLeft: 20 }}>
        <li>Trên máy của Con, cài app <b>AiiGrow Con</b> từ App Store.</li>
        <li>Quay lại link này (hoặc quét lại mã QR) — máy sẽ mở thẳng app và tự ghép, không cần nhập mã.</li>
        <li>Ba Mẹ duyệt quyền Screen Time bằng Apple ID của Ba Mẹ (một lần).</li>
      </ol>
      {token ? (
        <>
          <a href={lienKetApp(token)} style={{ display: "inline-block", margin: "12px 0", padding: "14px 24px", fontSize: 17, fontWeight: 600, background: "#1f8a70", color: "#fff", borderRadius: 14, textDecoration: "none" }}>
            Đã cài rồi — mở app AiiGrow Con
          </a>
          <p style={{ color: "#4a5555", fontSize: 14 }}>
            Mã gói cài: <code style={{ wordBreak: "break-all" }}>{token}</code>
            <br />Mã dùng được một lần và có hạn; hết hạn thì nhờ Ba Mẹ tạo gói mới trong app Ba Mẹ.
          </p>
        </>
      ) : null}
    </main>
  );
}
