"use client";
// Màn tải bộ cài máy tính (Windows / Mac) — Bàn web-tai: «Trang tải trên máy tính» (bm1-web-tai-may-tinh), «Tải cho Windows» / «Tải cho Mac»
// (Đang tải + làm theo hình) và «Tải không được». Ba trạng thái trên một trang: cho = nút tải đúng máy · tai = «Đang tải» · dung = «Tải không được».
// Trình duyệt tự tải tệp (thẻ <a>), trang không đo được % thật ⇒ KHÔNG vẽ thanh tiến độ giả (#775): «Đang tải» chỉ dẫn xem tiến độ ở trình duyệt,
// Ba Mẹ bấm «Tải xong rồi» ⇒ trạng thái «Đã tải xong» (pha xong).
import { useState } from "react";
import { Anh, Buoc, CHU, Canh, CanhBaoWin, Chips, Dau, HinhBuoc, Khac, Bt, NutTai, TEN, type NenTai } from "./Ban";
import Chep from "./Chep";

type Pha = "cho" | "tai" | "xong" | "dung";
type Props = {
  duPhong: string; nen: "windows" | "mac"; link: string; nut: string; tep: string; ma: string; tuGhep: boolean; dau: Pha;
  hrefHe: Record<NenTai, string>; duPhongHien: string;
};

export default function TaiMay({ duPhong, nen, link, nut, tep, ma, tuGhep, dau, hrefHe, duPhongHien }: Props) {
  const [pha, setPha] = useState<Pha>(dau);
  const tenTep = nen === "windows" ? "AiiGrow-Setup.exe" : "AiiGrow.pkg";
  const kia: NenTai = nen === "windows" ? "mac" : "windows";
  const hre = (x: NenTai) => hrefHe[x];
  const veCho = (e: React.MouseEvent) => { e.preventDefault(); setPha("cho"); };

  const ThongDiep = () => tuGhep ? <p className="tb-nho" style={{ marginTop: 0 }}>Ba Mẹ vừa gửi link này để ghép máy vào gia đình, bộ cài tự ghép, không cần gõ mã.</p> : null;

  // ---- Tải không được (them-rreafg7p) ----
  if (pha === "dung") return (
    <div className="tb-pg hep">
      <Dau ve={hre(nen)} />
      <Canh rob="trong-loi" co={104} nho="Mạng chập chờn hoặc vừa mất mạng.">Tải bị dừng</Canh>
      <ThongDiep />
      <div className="tb-the">
        <div className="tb-vach" role="img" aria-label="Đã dừng"><i /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><span className="tb-ghi" style={{ color: "#A2412C" }}>Đã dừng</span></div>
        <div className="tb-ds" style={{ marginTop: 16 }}>
          <div className="tb-dong"><Bt ten="wifi" mau="lam" c={48} /><div><div className="tb-t1">Kiểm tra wifi</div><div className="tb-t2">Thử mở một trang web khác</div></div></div>
          <div className="tb-dong"><Bt ten="tai" c={48} /><div><div className="tb-t1">Bấm «Tải lại»</div><div className="tb-t2">Tải tiếp từ chỗ dừng nếu trình duyệt cho phép</div></div></div>
        </div>
      </div>
      <NutTai href={link} onClick={() => setPha("tai")}>Tải lại</NutTai>
      <div className="tb-the" style={{ padding: "14px 16px" }}>
        <div className="tb-t1" style={{ fontSize: 15.5 }}>Vẫn không được? Dùng link dự phòng</div>
        <div className="tb-du"><span>{duPhongHien}</span><a className="tb-mn ok" href={duPhong} style={{ height: 44, borderRadius: 16, fontSize: 14 }}>Tải từ đây</a></div>
      </div>
      <div className="tb-khac"><span>Máy {TEN[kia]}?</span><Chips ds={[{ nen: kia, href: hre(kia), ten: `Tải bản cho ${TEN[kia]}` }]} /></div>
    </div>
  );

  // ---- Đang tải + làm theo hình (Tải cho Windows / Tải cho Mac) ----
  if (pha === "tai" || pha === "xong") { const xong = pha === "xong"; return (
    <div className="tb-pg hep">
      <Dau ve={hre(nen)} onVe={veCho} may={nen} />
      <div className="tb-the" style={{ padding: "16px 18px 18px" }} aria-live="polite">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={xong ? "/assets/rob/rob-goc.webp" : "/assets/rob/cho.webp"} alt="" width={78} height={78} style={{ flex: "none", filter: "drop-shadow(0 8px 8px rgba(120,98,70,.28))" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>{xong ? "Đã tải xong" : "Trình duyệt đang tải"}</div>
            <div className="tb-t2" style={{ fontSize: 14 }}>{tenTep} · {xong ? "làm theo các bước bên dưới" : "xem tiến độ ở góc trên trình duyệt"}</div>
          </div>
        </div>
        {xong ? null : <div style={{ marginTop: 14 }}><NutTai tiep onClick={() => setPha("xong")}>Tôi tải xong rồi</NutTai></div>}
        <div className="tb-dung"><span className="tb-ghi" style={{ fontSize: 13.5, color: "#2E3A50" }}>{xong ? "Chưa tải xong?" : "Tải bị dừng?"}</span>{xong ? <button type="button" className="tb-lk" onClick={() => setPha("tai")}>Quay lại</button> : null}<a className="tb-lk" href={link} onClick={(e) => { e.preventDefault(); setPha("dung"); }}>Tải lại</a></div>
      </div>
      <ThongDiep />
      <p className="tb-tieu">Tải xong, làm theo hình:</p>
      <ol className="tb-cac" id="tb-cai">
        {CHU[nen].sau.map(([ten, phu], i) => (
          <Buoc key={i} so={i + 1} lo={<HinhBuoc nen={nen} b={(i + 1) as 1 | 2 | 3} xong={i < 2 || tuGhep} ma={ma} />}
            ten={i === 2 && tuGhep ? "Bộ cài tự ghép máy" : ten}
            phu={i === 2 && tuGhep ? "Không cần gõ mã. Link hết hạn thì gõ mã 6 số trên điện thoại Ba Mẹ" : phu} />
        ))}
      </ol>
      {nen === "windows" ? <CanhBaoWin /> : null}
      <div><NutTai tiep onClick={() => { document.querySelector("#tb-cai li:last-child")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Bộ cài mở rồi, cài tiếp</NutTai><p className="tb-nho">{tep}</p></div>
      <Khac nen={nen} hrefHe={hre} />
    </div>
  ); }

  // ---- Trang tải trên máy tính (bm1-web-tai-may-tinh) ----
  return (
    <div className="tb-pg">
      <Dau may={nen} dt={{ android: hre("android"), ios: hre("ios") }} />
      <div className="tb-hero">
        <div className="tb-h">
          <span className="tb-may tren"><Anh ten={nen === "windows" ? "laptop" : "may_tinh"} />Máy này: {TEN[nen]}</span>
          <h1>Cài AiiGrow lên<br />máy của con</h1>
          {tuGhep ? <p className="tb-sub" style={{ fontSize: 16 }}>Ba Mẹ vừa gửi link này để ghép máy vào gia đình, bộ cài tự ghép, không cần gõ mã.</p> : null}
          <div className="tb-thu" style={{ marginTop: 28 }}>
            <NutTai lon href={link} onClick={() => setPha("tai")}>{nut}</NutTai>
            <p className="tb-nho">{tep}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#2E3A50" }}>Máy {TEN[kia]}?</span>
              <a className="tb-chip" href={hre(kia)}><Anh ten={ kia === "windows" ? "laptop" : "may_tinh"} />Tải bản cho {TEN[kia]}</a>
            </div>
          </div>
        </div>
        <Canh rob="rob-goc" co={260} nho="Bấm nút vàng là tải đúng bản.">Máy {TEN[nen]} đây rồi!</Canh>
      </div>
      <ol className="tb-cac3 tb-cac" style={{ padding: 0 }}>
        {CHU[nen].truoc.map(([ten, phu], i) => (
          <Buoc key={i} so={i + 1} lo={<HinhBuoc nen={nen} b={(i + 1) as 1 | 2 | 3} xong={false} ma={ma} />}
            ten={i === 2 && tuGhep ? "Bộ cài tự ghép máy" : ten}
            phu={i === 2 && tuGhep ? "Không cần gõ mã. Link hết hạn thì gõ mã 6 số trên điện thoại Ba Mẹ" : phu} />
        ))}
      </ol>
      {nen === "windows" ? <CanhBaoWin /> : null}
      <div className="tb-cuoi"><Bt ten="khien" c={44} /><span className="ft">Cài xong, máy của con tự báo về điện thoại Ba Mẹ.</span></div>
    </div>
  );
}
