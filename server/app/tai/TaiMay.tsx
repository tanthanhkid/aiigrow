"use client";
// Màn tải bộ cài máy tính (Windows / Mac) — thiết kế web-tai 01, 03, 04, 05. Ba trạng thái trên một trang:
//  cho = nút tải đúng máy · tai = «Đang tải» + hình mở file · dung = «Tải bị dừng» (kiểm wifi, Tải lại, link dự phòng).
// Trình duyệt tự tải tệp (thẻ <a>), trang không đo được % thật ⇒ thanh «Đang tải» chạy liên tục, không bịa số.
import { useState } from "react";
import { F3, Ph } from "../_clay/Icon";
import { CHU_BUOC, HinhBuoc, OMaNho, TheBuoc, type NenMay } from "./Hinh";

type Pha = "cho" | "tai" | "dung";
type Props = { duPhong: string; nen: NenMay; link: string; nut: string; tep: string; ma: string; tuGhep: boolean; dau: Pha; khac: { nen: string; ten: string; href: string }[] };

export default function TaiMay({ duPhong, nen, link, nut, tep, ma, tuGhep, dau, khac }: Props) {
  const [pha, setPha] = useState<Pha>(dau);
  const tenTep = nen === "windows" ? "AiiGrow-Setup.exe" : "AiiGrow.pkg";
  const Duong = () => (
    <p className="tai-khac">Không phải {nen === "windows" ? "Windows" : "Mac"}? {khac.map((k, i) => <span key={k.nen}>{i ? " · " : ""}<a href={k.href}>{k.ten}</a></span>)}</p>
  );

  if (pha === "dung") return (
    <>
      <section className="the tai-the-loi">
        <F3 ten="mobile-phone" co={56} />
        <h1>Tải bị dừng</h1><p className="phu-de">Mạng chập chờn hoặc vừa mất mạng.</p>
        <div className="tai-vach dung" role="img" aria-label="Đã dừng"><i /></div>
        <p className="ghi-chu">Đã dừng · tải lại sẽ tải tiếp từ chỗ dừng nếu trình duyệt cho phép</p>
      </section>
      <ol className="buoc-hinh">
        <li><span className="so">1</span><F3 ten="eyes" co={40} className="hinh" /><div><b className="t">Kiểm tra wifi</b><small>Thử mở một trang web khác</small></div></li>
        <li><span className="so">2</span><F3 ten="inbox-tray" co={40} className="hinh" /><div><b className="t">Bấm «Tải lại»</b><small>Tải tiếp từ chỗ dừng</small></div></li>
      </ol>
      <a className="nut ngoc rong tai-nut-lon" href={link} onClick={() => setPha("tai")}><Ph ten="download-simple" co={22} />Tải lại</a>
      <p className="ghi-chu tai-giua">Vẫn không được? Dùng link dự phòng: <a href={duPhong}>Tải từ đây</a></p>
      <Duong />
    </>
  );

  return (
    <>
      <header className="dau-trang">
        {pha === "cho" ? <h1>Cài AiiGrow lên máy của con</h1> : <h1>Đang tải…</h1>}
        {tuGhep ? <p className="phu-de">Ba Mẹ vừa gửi link này để ghép máy vào gia đình, bộ cài tự ghép, không cần gõ mã.</p> : null}
      </header>

      {pha === "cho" ? (
        <section className="the the-tai">
          <a className="nut ngoc rong tai-nut-lon" href={link} onClick={() => setPha("tai")}><Ph ten="download-simple" co={22} />{nut}</a>
          <p className="ghi-tep">{tep}</p>
          {khac[0] && nen === "windows" ? <p className="tai-khac">Máy Mac? <a className="chip" href={khac[0].href}>Tải bản cho Mac</a></p> : null}
        </section>
      ) : (
        <section className="the tai-the-tai" aria-live="polite">
          <b>Đang tải… {tenTep}</b>
          <div className="tai-vach" role="progressbar" aria-label="Đang tải"><i /></div>
          <p className="ghi-chu">Trình duyệt đang tải tệp, tiến độ xem ở góc trên trình duyệt.</p>
          <p className="ghi-chu">Tải bị dừng? <a href={link} onClick={(e) => { e.preventDefault(); setPha("dung"); }}>Tải lại</a></p>
        </section>
      )}

      <h2 className="tai-tieu-de">{pha === "tai" ? "Tải xong, làm theo hình:" : "Làm 3 bước là xong"}</h2>
      <ol className="tai-cac-buoc">
        {CHU_BUOC[nen].map(([ten, phu], i) => (
          <TheBuoc key={i} so={i + 1}
            ten={i === 0 && pha === "cho" ? "Tải bộ cài" : i === 2 && tuGhep ? "Bộ cài tự ghép máy" : ten}
            phu={i === 0 && pha === "cho" ? "Bấm nút xanh ở trên" : i === 2 && tuGhep ? "Không cần gõ mã. Link hết hạn thì gõ mã 6 số trên điện thoại Ba Mẹ" : phu}
            hinh={i === 2 && ma ? <OMaNho ma={ma} /> : <HinhBuoc nen={nen} b={(i + 1) as 1 | 2 | 3} />} />
        ))}
      </ol>
      {pha === "tai" ? <p className="ghi-chu tai-giua"><b>Bộ cài mở rồi, cài tiếp.</b> {tep}</p> : null}
      <Duong />
    </>
  );
}
