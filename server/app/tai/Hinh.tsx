// Hình minh hoạ từng bước của trang /tai (thiết kế docs/thiet-ke-chot/web-tai/): khung «hộp thoại» thu nhỏ, vẽ bằng HTML + token Clay.
// Thuần trình bày (không hook) nên dùng được ở cả trang máy chủ và thành phần client.
import type { ReactNode } from "react";

export type NenMay = "windows" | "mac";

const Hop = ({ children, rong }: { children: ReactNode; rong?: boolean }) => <div className={`tai-hop${rong ? " rong" : ""}`}>{children}</div>;

/** Hàng 6 ô mã; chưa có mã ⇒ ô chấm. */
export function OMaNho({ ma }: { ma: string }) {
  const c = ma.length === 6 ? ma.split("") : ["•", "•", "•", "•", "•", "•"];
  return <div className="tai-ma" aria-label={ma ? `Mã ${ma}` : "Mã 6 số trong app Ba Mẹ"}>{c.map((x, i) => <i key={i}>{x}</i>)}</div>;
}

/** Hình của 3 bước sau khi tải, theo máy. Bước 3 = bộ cài vừa mở (có nhập mã 6 số hay tự ghép). */
export function HinhBuoc({ nen, b }: { nen: NenMay; b: 1 | 2 | 3 }) {
  const win = nen === "windows";
  if (b === 1) return win ? (
    <Hop><b className="tai-t">Tệp đã tải xuống</b><div className="tai-tep"><span>AiiGrow-Setup.exe<small>Xong</small></span><span className="tai-mn ok">Mở tệp</span></div></Hop>
  ) : (
    <Hop><b className="tai-t">Tải về</b><div className="tai-tep"><span>AiiGrow.pkg<small>Bấm đúp để mở</small></span></div></Hop>
  );
  if (b === 2) return win ? (
    <Hop><b className="tai-t">Cho phép ứng dụng này thay đổi thiết bị?</b><small className="tai-ph">AiiGrow · AiiLab</small><div className="tai-nut2"><span className="tai-mn ok">Có</span><span className="tai-mn">Không</span></div></Hop>
  ) : (
    <Hop><b className="tai-t">«AiiGrow.pkg» tải từ Internet. Bạn có muốn mở?</b><div className="tai-nut2"><span className="tai-mn">Huỷ</span><span className="tai-mn ok">Mở</span></div></Hop>
  );
  return (
    <Hop><b className="tai-t">Chào Ba Mẹ!</b><small className="tai-ph">Cài AiiGrow cho máy của con</small><div className="tai-nut2"><span className="tai-mn ok">{win ? "Bắt đầu" : "Tiếp tục"}</span></div></Hop>
  );
}

export const CHU_BUOC: Record<NenMay, [string, string][]> = {
  windows: [["Bấm «Mở tệp»", "Ở góc trên trình duyệt"], ["Bấm «Có»", "Windows hỏi một lần"], ["Làm theo bộ cài", "Có bước nhập mã 6 số trên điện thoại Ba Mẹ"]],
  mac: [["Bấm đúp file AiiGrow.pkg", "Trong mục Tải về"], ["Bấm «Mở»", "Mac hỏi một lần"], ["Làm theo bộ cài", "Có bước nhập mã 6 số trên điện thoại Ba Mẹ"]],
};

/** Một thẻ bước: số ngọc ở góc, hình, tiêu đề, dòng phụ. */
export function TheBuoc({ so, hinh, ten, phu }: { so: number; hinh: ReactNode; ten: string; phu: string }) {
  return (
    <li className="tai-buoc the"><span className="tai-so">{so}</span><div className="tai-lo">{hinh}</div><div><h3>{ten}</h3><p>{phu}</p></div></li>
  );
}
