// Trang dự phòng của link cài /cai/<token> khi mở bằng trình duyệt (máy chưa cài app AiiGrow Con, hoặc không phải iPhone/iPad).
// Theo Bàn thiết kế web-tai «Cài cho iPhone/iPad (/cai)» (bm1-web-cai, #307).
import { chuanToken, lienKetApp } from "@/lib/ios-link.ts";
import { Bt, Canh, MuiTiep, MuiVe } from "../../tai/Ban";

export const metadata = { title: "Cài AiiGrow cho iPhone/iPad của Con — AiiGrow", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TrangCai({ params }: { params: Promise<{ token: string }> }) {
  const token = chuanToken((await params).token);
  return (
    <div className="tb"><div className="tb-pg hep" style={{ minHeight: "100vh" }}>
      <div className="tb-top"><a className="tb-ve" href="/tai?os=ios" aria-label="Quay lại"><MuiVe /></a><b>Cài cho iPhone / iPad</b></div>
      <Canh rob="chi" co={110} nho="Làm trên máy của con.">3 bước là xong!</Canh>
      <div className="tb-ds">
        {/* #267: iPhone / iPad chỉ một bé — máy dùng chung là Windows, Mac, Android */}
        <div className="tb-dong mot"><Bt ten="tablet" /><div><h3>Máy này chỉ dùng cho một bé</h3><p>iPhone, iPad không đổi bé được. Máy dùng chung: Windows, Mac, Android.</p></div></div>
        <div className="tb-dong"><span className="tb-so">1</span><div><h3>Cài app AiiGrow Con</h3><p>Từ App Store</p></div><Bt ten="tai" mau="lam" /></div>
        <div className="tb-dong"><span className="tb-so">2</span><div><h3>Cài hồ sơ</h3><p>Bấm «Cho phép» rồi «Cài đặt»</p></div><Bt ten="khien" mau="vang" /></div>
        <div className="tb-dong"><span className="tb-so">3</span><div><h3>Cho phép Thời gian sử dụng</h3><p>Ba Mẹ xác nhận một lần</p></div><Bt ten="dongho" /></div>
      </div>
      <div style={{ marginTop: "auto" }}>
        {token ? (
          <>
            <a className="tb-tai" href={lienKetApp(token)} style={{ minHeight: 70 }}><span>Mở AiiGrow Con, nhập mã</span><MuiTiep /></a>
            <p className="tb-nho">Mã 6 số trên điện thoại Ba Mẹ · dùng được 10 phút<br />Mở AiiGrow Con từ nút trên thì máy tự ghép, không cần gõ mã. Mã gói cài: <code>{token}</code></p>
          </>
        ) : <p className="tb-nho">Mã 6 số trên điện thoại Ba Mẹ · dùng được 10 phút</p>}
      </div>
    </div></div>
  );
}
