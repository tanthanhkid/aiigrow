// Các mảnh giao diện của trang /tai, /cai — dựng đúng từng khối HTML của Bàn thiết kế (hành trình web-tai, #307).
// Thuần trình bày (không hook) nên dùng được ở cả trang máy chủ và thành phần client.
import type { ReactNode } from "react";
import "./tai.css";

export type NenTai = "windows" | "mac" | "android" | "ios";
export const TEN: Record<NenTai, string> = { windows: "Windows", mac: "Mac", android: "Android", ios: "iPhone / iPad" };
/** Icon 3D của bàn theo từng nền (chip, pill đầu trang). */
export const ICON_NEN: Record<NenTai, string> = { windows: "laptop", mac: "may_tinh", android: "dt", ios: "tablet" };

export const Anh = ({ ten, co, ...r }: { ten: string; co?: number; alt?: string }) => <img src={`/assets/icon3d/${ten}.webp`} alt="" width={co} height={co} {...r} />;
export const Rob = ({ ten, co }: { ten: string; co: number }) => <img src={`/assets/rob/${ten}.webp`} alt="" width={co} height={co} />;

export const MuiTai = () => <svg viewBox="0 0 256 256" width="26" height="26" aria-hidden="true"><path d="M128 188a12 12 0 0 1-8.5-3.5l-56-56a12 12 0 0 1 17-17L116 143V32a12 12 0 0 1 24 0v111l31.5-31.5a12 12 0 0 1 17 17l-56 56A12 12 0 0 1 128 188ZM216 160a12 12 0 0 1 12 12v32a20 20 0 0 1-20 20H48a20 20 0 0 1-20-20v-32a12 12 0 0 1 24 0v28h152v-28a12 12 0 0 1 12-12Z" /></svg>;
export const MuiTiep = () => <svg viewBox="0 0 256 256" width="26" height="26" aria-hidden="true"><path d="M184.5 136.5l-80 80a12 12 0 0 1-17-17L159 128 87.5 56.5a12 12 0 0 1 17-17l80 80a12 12 0 0 1 0 17Z" /></svg>;
export const MuiVe = () => <svg viewBox="0 0 256 256" width="24" height="24" fill="#0a5246" aria-hidden="true"><path d="M168.5 199.5a12 12 0 0 1-17 17l-80-80a12 12 0 0 1 0-17l80-80a12 12 0 0 1 17 17L97 128Z" /></svg>;
export const Tay = () => <svg className="tb-tay" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="#0f1312" stroke="#fff" strokeWidth="1.4" d="M9 3.5a1.6 1.6 0 0 1 3.2 0V10l.4-.1a1.6 1.6 0 0 1 3 .6l.3-.1a1.6 1.6 0 0 1 2.9.8l.3-.1a1.5 1.5 0 0 1 2.4 1.2v4.3c0 3.4-2.6 5.9-5.9 5.9h-1.4c-2 0-3.5-.8-4.7-2.4l-3.7-5a1.6 1.6 0 0 1 2.4-2.1L9 14.5Z" /></svg>;

export function Bt({ ten, mau, c }: { ten: string; mau?: "lam" | "vang"; c?: number }) {
  return <span className={`tb-bt ${mau ?? ""}`} style={c ? ({ "--c": `${c}px` } as React.CSSProperties) : undefined}><Anh ten={ten} /></span>;
}

/** Hàng đầu trang: (mũi tên quay lại) · logo · AiiGrow · pill máy này; ở khổ máy tính thêm «Đang dùng điện thoại?» + 2 chip. */
export function Dau({ ve, onVe, may, dt }: { ve?: string; onVe?: (e: React.MouseEvent) => void; may?: NenTai; dt?: { android: string; ios: string } }) {
  return (
    <div className="tb-top">
      {ve ? <a className="tb-ve" href={ve} onClick={onVe} aria-label="Quay lại"><MuiVe /></a> : null}
      <img className="logo" src="/logo.png" alt="AiiGrow" width={48} height={48} /><b>AiiGrow</b>
      {may && !dt ? <span className="tb-may"><Anh ten={ICON_NEN[may]} />{TEN[may]}</span> : null}
      {dt ? (
        <>
          <span className="tb-hoi">Đang dùng điện thoại?</span>
          <a className="tb-chip tr" href={dt.android}><Anh ten="dt" />Android</a>
          <a className="tb-chip tr" href={dt.ios}><Anh ten="tablet" />iPhone / iPad</a>
        </>
      ) : null}
    </div>
  );
}

/** Rob + bong bóng thoại. */
export const Canh = ({ rob, co = 104, children, nho }: { rob: string; co?: number; children: ReactNode; nho?: string }) => (
  <div className="tb-canh"><Rob ten={rob} co={co} /><div className="tb-noi">{children}{nho ? <small>{nho}</small> : null}</div></div>
);

/** Nút ngọc lớn. */
export function NutTai({ href, onClick, children, lon, tiep }: { href?: string; onClick?: () => void; children: ReactNode; lon?: boolean; tiep?: boolean }) {
  const noi = <>{tiep ? null : <MuiTai />}<span>{children}</span>{tiep ? <MuiTiep /> : null}</>;
  return href
    ? <a className={`tb-tai${lon ? " lon" : ""}`} href={href} onClick={onClick}>{noi}</a>
    : <button type="button" className={`tb-tai${lon ? " lon" : ""}`} onClick={onClick}>{noi}</button>;
}

export const Chips = ({ ds }: { ds: { nen: NenTai; href: string; ten?: string }[] }) => (
  <div className="tb-chips">{ds.map((d) => <a key={d.nen} className="tb-chip" href={d.href}><Anh ten={ICON_NEN[d.nen]} />{d.ten ?? TEN[d.nen]}</a>)}</div>
);

/** «Không phải X? [chip các máy khác]». */
export const Khac = ({ nen, hrefHe }: { nen: NenTai; hrefHe: (x: NenTai) => string }) => (
  <div className="tb-khac"><span>Không phải {TEN[nen]}?</span><Chips ds={(["windows", "mac", "android", "ios"] as const).filter((x) => x !== nen).map((x) => ({ nen: x, href: hrefHe(x) }))} /></div>
);

/** Hàng 6 ô mã; chưa có mã ⇒ ô chấm. */
export function OMa({ ma }: { ma: string }) {
  const c = ma.length === 6 ? ma.split("") : ["•", "•", "•", "•", "•", "•"];
  return <div className="tb-ma" aria-label={ma ? `Mã ${ma}` : "Mã 6 số trong app Ba Mẹ"}>{c.map((x, i) => <i key={i}>{x}</i>)}</div>;
}

/** Thẻ một bước: số ngọc ở góc, ô lõm chứa hình, tiêu đề + dòng phụ. */
export const Buoc = ({ so, lo, ten, phu }: { so: number; lo: ReactNode; ten: string; phu: string }) => (
  <li className="tb-buoc"><span className="tb-so">{so}</span>{lo}<div><h3>{ten}</h3><p>{phu}</p></div></li>
);

const Dem = ({ children, hinh }: { children: ReactNode; hinh?: boolean }) => <div className={`tb-lo${hinh ? " hinh" : ""}`}>{children}</div>;

/** Hình trong ô lõm theo nền + bước + «đã tải xong hay chưa». */
export function HinhBuoc({ nen, b, xong, ma }: { nen: "windows" | "mac"; b: 1 | 2 | 3; xong: boolean; ma: string }) {
  const win = nen === "windows";
  const tep = win ? "AiiGrow-Setup.exe" : "AiiGrow.pkg";
  if (b === 1) {
    if (!xong) return (
      <Dem><div className="tb-hop"><div className="tb-ghi" style={{ marginBottom: 12 }}>{win ? "Đang tải xuống" : "Tải về"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Bt ten="tai" c={48} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{tep}</div><div className="tb-vach" style={{ marginTop: 9 }}><i /></div></div></div></div></Dem>
    );
    return win ? (
      <Dem><div className="tb-hop"><div className="tb-ghi" style={{ marginBottom: 8 }}>Tệp đã tải xuống</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Bt ten="tai" c={42} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800 }}>{tep}</div><div className="tb-ghi" style={{ fontWeight: 600, fontSize: 11.5 }}>Xong</div></div></div>
        <div style={{ marginTop: 10 }}><span className="tb-mn ok">Mở tệp</span></div><Tay /></div></Dem>
    ) : (
      <Dem><div className="tb-hop"><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><span className="tb-tl"><i /><i /><i /></span><span className="tb-ghi">Tải về</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="tb-bt" style={{ ["--c" as string]: "44px" }}><img src="/logo.png" alt="" style={{ borderRadius: 8, width: 30, height: 30 }} /></span><div><div style={{ fontSize: 13, fontWeight: 800 }}>{tep}</div><div className="tb-ghi" style={{ fontWeight: 600, fontSize: 11.5 }}>Bấm đúp để mở</div></div></div><Tay /></div></Dem>
    );
  }
  if (b === 2) return win ? (
    <Dem><div className="tb-hop"><div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.3 }}>Cho phép ứng dụng này thay đổi thiết bị?</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 12px" }}><img src="/logo.png" alt="" width={28} height={28} style={{ borderRadius: 8 }} /><span style={{ fontSize: 12, fontWeight: 700, color: "#3a403d" }}>AiiGrow · AiiLab</span></div>
      <div style={{ display: "flex", gap: 8 }}><span className="tb-mn ok" style={{ flex: 1 }}>Có</span><span className="tb-mn" style={{ flex: 1 }}>Không</span></div><Tay /></div></Dem>
  ) : (
    <Dem><div className="tb-hop" style={{ textAlign: "center" }}><img src="/logo.png" alt="" width={40} height={40} style={{ borderRadius: 10, display: "block", margin: "0 auto 6px" }} />
      <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>«AiiGrow.pkg» tải từ Internet.<br />Bạn có muốn mở?</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}><span className="tb-mn" style={{ flex: 1 }}>Huỷ</span><span className="tb-mn ok" style={{ flex: 1 }}>Mở</span></div><Tay /></div></Dem>
  );
  // bước 3: trước khi tải xong = nhập mã 6 số; sau = cửa sổ «Chào Ba Mẹ!» của bộ cài
  if (!xong) return <Dem><span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#3a403d" }}><Anh ten="dt" co={32} />Trên điện thoại Ba Mẹ</span><OMa ma={ma} /></Dem>;
  return (
    <Dem><div className="tb-hop" style={{ height: 118, display: "flex", flexDirection: "column", padding: "10px 14px", borderRadius: 16 }}>
      {win ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, fontSize: 11, fontWeight: 800, color: "#8c918e" }}><span>—</span><span>✕</span></div> : <span className="tb-tl"><i /><i /><i /></span>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}><Rob ten="rob-goc" co={58} /><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800 }}>Chào Ba Mẹ!</div><div className="tb-ghi" style={{ fontWeight: 600, fontSize: 11.5 }}>Cài AiiGrow cho máy của con</div></div></div>
      <div style={{ textAlign: "right" }}><span className="tb-mn ok" style={{ height: 28, fontSize: 12.5 }}>{win ? "Bắt đầu" : "Tiếp tục"}</span></div></div></Dem>
  );
}

export const CHU: Record<"windows" | "mac", { truoc: [string, string][]; sau: [string, string][] }> = {
  windows: {
    truoc: [["Tải bộ cài", "Bấm nút xanh ở trên"], ["Mở file, bấm «Có»", "Windows hỏi một lần"], ["Nhập mã 6 số", "Mã dùng được 10 phút"]],
    sau: [["Bấm «Mở tệp»", "Ở góc trên trình duyệt"], ["Bấm «Có»", "Windows hỏi một lần"], ["Làm theo bộ cài", "Có bước nhập mã 6 số trên điện thoại Ba Mẹ"]],
  },
  mac: {
    truoc: [["Tải bộ cài", "Bấm nút xanh ở trên"], ["Mở file, bấm «Mở»", "Mac hỏi một lần"], ["Nhập mã 6 số", "Mã dùng được 10 phút"]],
    sau: [["Bấm đúp file AiiGrow.pkg", "Trong mục Tải về"], ["Bấm «Mở»", "Mac hỏi một lần"], ["Làm theo bộ cài", "Có bước nhập mã 6 số trên điện thoại Ba Mẹ"]],
  },
};
