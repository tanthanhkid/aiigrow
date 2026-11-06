// Trang tải công khai /tai — 8 màn thiết kế docs/thiet-ke-chot/web-tai/ (L18, 06/11): tự nhận hệ điều hành theo User-Agent, MỘT nút tải đúng bộ cài
// (Windows .exe · Mac .pkg · Android .apk · iPhone/iPad mở app), «Đang tải», «Tải bị dừng», «Máy quá cũ», hình mở file, «Không phải X?» chọn hệ khác (?os=).
// Link «Ghép máy» trong app Ba Mẹ là /tai?g=<token gói cài>&ma=<mã 6 số> (lib/ghep-may.ts): Windows ⇒ bộ cài mang sẵn gói (tự ghép, route tai/ghep/[g]);
// iPhone/iPad ⇒ nút mở thẳng app AiiGrow Con kèm token; mã 6 số hiện ở bước 3 làm dự phòng. Giao diện Clay (docs/THIET-KE-CLAY.md).
export const metadata = { title: "Tải AiiGrow — AiiGrow", robots: { index: false } };
export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS, BAN_CON_ANDROID } from "@/lib/ban-agent.ts";
import { heDieuHanh } from "@/lib/he-dieu-hanh.ts";
import { linkTaiWindowsGhep, thamSoTai, type NenTai } from "@/lib/trang-tai.ts";
import { F3, I3d, Ph } from "../_clay/Icon";
import { OMaNho, TheBuoc } from "./Hinh";
import SaoChep from "./SaoChep";
import TaiMay from "./TaiMay";

const LINK_APK = "/tai/aiigrow.apk";
const LINK_APK_CON = "/tai/aiigrow-con.apk";
const TEN: Record<NenTai, string> = { windows: "Windows", mac: "Mac", android: "Android", ios: "iPhone / iPad" };

export default async function TrangTai({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const q = await searchParams;
  const t = thamSoTai(q, heDieuHanh(ua, h.get("sec-ch-ua-platform") ?? ""), ua);
  // gốc link chia sẻ: AIIGROW_APP_URL nếu cấu hình (cùng nguồn với tai/ghep), không tin header client gửi lên (link mang token gói cài)
  const goc = (process.env.AIIGROW_APP_URL || "https://aiigrow.aiilab.vn").replace(/\/+$/, "");
  const host = goc.replace(/^https?:\/\//, "");
  const duoi = t.g ? `?g=${encodeURIComponent(t.g)}${t.ma ? `&ma=${t.ma}` : ""}` : "";    // link chia sẻ mang sẵn mã gia đình ⇒ máy kia tự ghép
  const linkChia = `${goc}/tai${duoi}`;
  const hrefHe = (x: NenTai) => `/tai?os=${x}${duoi ? `&${duoi.slice(1)}` : ""}`;
  const khacCua = (nen: NenTai) => (["windows", "mac", "android", "ios"] as const).filter((x) => x !== nen);

  const Dau = ({ may }: { may?: string }) => (
    <div className="tai-dau">
      <img className="logo" src="/logo.png" alt="" width={44} height={44} /><b>AiiGrow</b>
      {may ? <span className="chip tai-may">{may}</span> : null}
    </div>
  );
  const DuongKhac = ({ nen }: { nen: NenTai }) => (
    <p className="tai-khac">Không phải {TEN[nen]}? {khacCua(nen).map((x, i) => <span key={x}>{i ? " · " : ""}<a href={hrefHe(x)}>{TEN[x]}</a></span>)}</p>
  );
  const MayKhac = () => (
    <section className="the tai-the-may">
      <div className="dau-tai"><I3d ten="desktop-computer" mau="lam" co={48} /><div><h2>Cài cho máy tính?</h2><p className="ghi-chu">Mở link này trên máy tính của con</p></div></div>
      <SaoChep url={linkChia} hien={`${host}/tai`} />
    </section>
  );

  // ---- Máy quá cũ (02) ----
  if (t.man === "cu") {
    return (
      <div className="ag"><main className="trang vao tai-trang">
        <Dau may={`Máy này: ${t.tenCu}`} />
        <header className="dau-trang">
          <h1>Máy này cũ quá, AiiGrow chưa chạy được</h1>
          <p className="phu-de">AiiGrow cần một trong hai: <b>Windows 10 trở lên</b> hoặc <b>macOS 13 trở lên</b>.</p>
        </header>
        <div className="bao canh-b"><I3d ten="eyes" mau="vang" /><div>Mình chưa vào được máy này. Ba Mẹ chọn 1 trong 2 cách bên dưới nhé.</div></div>
        <MayKhac />
        <section className="the tai-the-may">
          <div className="dau-tai"><I3d ten="mobile-phone" mau="xanh" co={48} /><div><h2>Cài cho điện thoại của con</h2><p className="ghi-chu">Điện thoại hoặc máy tính bảng của con</p></div></div>
          <div className="hai-nut"><a className="nut vien" href={hrefHe("android")}>Android</a><a className="nut vien" href={hrefHe("ios")}>iPhone / iPad</a></div>
        </section>
        <p className="ghi-chu tai-giua">Cài xong trên máy khác, máy đó tự báo về điện thoại Ba Mẹ.</p>
      </main></div>
    );
  }

  // ---- Android (06) ----
  if (t.nen === "android") {
    return (
      <div className="ag"><main className="trang vao tai-trang">
        <Dau may="Android" />
        <header className="dau-trang"><h1>Đây là điện thoại Android.</h1><p className="phu-de">Bộ cài máy tính không chạy ở đây.</p></header>
        <section className="the the-tai">
          <div className="dau-tai"><I3d ten="mobile-phone" mau="xanh" co={48} /><div><h2>Cài cho điện thoại này</h2><p className="ghi-chu">Khi đây là máy của con</p></div></div>
          <a className="nut ngoc rong tai-nut-lon" href={LINK_APK_CON}><Ph ten="download-simple" co={22} />Tải AiiGrow Con cho Android</a>
          <p className="ghi-tep">AiiGrow-Con-{BAN_CON_ANDROID.version}.apk · cài trên điện thoại của con</p>
        </section>
        <ol className="tai-cac-buoc">
          <TheBuoc so={1} ten="Tải" phu="Bấm nút xanh ở trên" hinh={<div className="tai-hop"><b className="tai-t">Đang tải xuống</b><div className="tai-vach"><i /></div></div>} />
          <TheBuoc so={2} ten="Bấm «Cho phép»" phu="Android hỏi một lần" hinh={<div className="tai-hop"><b className="tai-t">AiiGrow Con</b><small className="tai-ph">Cho phép cài ứng dụng từ nguồn này?</small><div className="tai-nut2"><span className="tai-mn">Huỷ</span><span className="tai-mn ok">Cho phép</span></div></div>} />
          <TheBuoc so={3} ten="Nhập mã 6 số" phu="Mã dùng được 10 phút" hinh={<OMaNho ma={t.ma} />} />
        </ol>
        <MayKhac />
        <p className="duong-phu">Đây là máy của Ba Mẹ? <a href={LINK_APK}>Cài app Ba Mẹ</a> thay vì app Con.</p>
        <DuongKhac nen="android" />
      </main></div>
    );
  }

  // ---- iPhone / iPad (07) ----
  if (t.nen === "ios") {
    return (
      <div className="ag"><main className="trang vao tai-trang">
        <Dau may="iPhone / iPad" />
        <header className="dau-trang"><h1>Đây là iPhone / iPad.</h1><p className="phu-de">Không cần tải file, mình dẫn từng bước.</p></header>
        <section className="the the-tai">
          <div className="dau-tai"><I3d ten="mobile-phone" mau="tim" co={48} /><div><h2>Cài cho máy này</h2><p className="ghi-chu">Khi đây là máy của con</p></div></div>
          {t.moApp
            ? <a className="nut ngoc rong tai-nut-lon" href={t.moApp}><Ph ten="download-simple" co={22} />Mở trang cài cho iPhone</a>
            : <p className="ghi-chu">Nhờ Ba Mẹ gửi link «Ghép máy» trong app Ba Mẹ, mở link đó trên máy này để cài. Đang thử qua TestFlight, nhắn AiiLab để nhận lời mời.</p>}
        </section>
        <ol className="tai-cac-buoc">
          <TheBuoc so={1} ten="Cài app AiiGrow Con" phu="Từ App Store" hinh={<F3 ten="inbox-tray" co={64} />} />
          <TheBuoc so={2} ten="Cài hồ sơ" phu="Bấm «Cho phép» rồi «Cài đặt»" hinh={<F3 ten="scroll" co={64} />} />
          <TheBuoc so={3} ten="Cho phép Thời gian sử dụng" phu="Ba Mẹ xác nhận một lần" hinh={<F3 ten="shield" co={64} />} />
        </ol>
        <MayKhac />
        <DuongKhac nen="ios" />
      </main></div>
    );
  }

  // ---- Windows / Mac: Chính · Đang tải · Tải bị dừng (01, 03, 04, 05) ----
  const mac = t.nen === "mac";
  const tuGhep = !mac && !!t.g;
  const link = tuGhep ? linkTaiWindowsGhep(t.g) : mac ? BAN_AGENT_MAC.url : BAN_AGENT_WINDOWS.url;
  const tep = mac ? `Bản ${BAN_AGENT_MAC.version} · macOS 13 trở lên` : `Bản ${BAN_AGENT_WINDOWS.version} · Windows 10/11`;
  const khac = (mac ? (["windows", "android", "ios"] as const) : (["mac", "android", "ios"] as const)).map((x) => ({ nen: x, ten: TEN[x], href: hrefHe(x) }));
  return (
    <div className="ag"><main className="trang vao tai-trang">
      <Dau may={`Máy này: ${mac ? "Mac" : "Windows"}`} />
      <TaiMay duPhong={`/tai/du-phong?os=${t.nen}${duoi ? `&${duoi.slice(1)}` : ""}`} nen={mac ? "mac" : "windows"} link={link} nut={mac ? "Tải bộ cài cho Mac" : "Tải bộ cài cho Windows"} tep={tep} ma={t.ma} tuGhep={tuGhep}
        dau={t.man === "dang-tai" ? "tai" : t.man === "dung" ? "dung" : "cho"} khac={khac} />
      <div className="tai-chan"><I3d ten="shield" mau="xanh" co={40} /><span>Cài xong, máy của con tự báo về điện thoại Ba Mẹ.</span></div>
      <p className="duong-phu"><a href="/">Về app AiiGrow</a></p>
    </main></div>
  );
}
