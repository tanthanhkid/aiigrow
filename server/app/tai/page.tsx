// Trang tải công khai /tai — 8 màn Bàn thiết kế aiigrow-figma, hành trình web-tai (#307; bản đang dùng ghi ở PR): tự nhận hệ điều hành theo User-Agent,
// MỘT nút tải đúng bộ cài (Windows .exe · Mac .pkg · Android .apk · iPhone/iPad mở trang /cai), «Đang tải», «Tải không được», «Máy quá cũ», hình mở file,
// «Không phải X?» chọn hệ khác (?os=). Link «Ghép máy» trong app Ba Mẹ là /tai?g=<token gói cài>&ma=<mã 6 số> (lib/ghep-may.ts): Windows ⇒ bộ cài mang sẵn
// gói (tự ghép, route tai/ghep/[g]); iPhone/iPad ⇒ nút mở thẳng app AiiGrow Con kèm token; mã 6 số hiện ở bước 3 làm dự phòng.
export const metadata = { title: "Tải AiiGrow — AiiGrow", robots: { index: false } };
export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS, BAN_CON_ANDROID } from "@/lib/ban-agent.ts";
import { heDieuHanh } from "@/lib/he-dieu-hanh.ts";
import { linkTaiWindowsGhep, thamSoTai, type NenTai } from "@/lib/trang-tai.ts";
import { Anh, Bt, Buoc, Canh, Chips, Dau, Khac, MuiTiep, NutTai, OMa, Tay } from "./Ban";
import Chep from "./Chep";
import TaiMay from "./TaiMay";

const LINK_APK = "/tai/aiigrow.apk";
const LINK_APK_CON = "/tai/aiigrow-con.apk";

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
  const hrefAll: Record<NenTai, string> = { windows: hrefHe("windows"), mac: hrefHe("mac"), android: hrefHe("android"), ios: hrefHe("ios") };

  const MayTinh = () => (
    <div className="tb-the">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Bt ten="laptop" mau="vang" c={56} /><div><div className="tb-t1" style={{ fontSize: 18 }}>Cài cho máy tính?</div><div className="tb-t2">Mở link này trên máy tính của con</div></div></div>
      <Chep url={linkChia} />
    </div>
  );

  // ---- Máy quá cũ (them-aylf4ke2) ----
  if (t.man === "cu") {
    return (
      <div className="tb"><div className="tb-pg">
        <Dau ve={hrefHe(t.nen)} />
        <div className="tb-hero cu">
          <div className="tb-h">
            <span className="tb-may tren"><Anh ten="canh_bao" />Máy này: {t.tenCu}</span>
            <h1>Máy này cũ quá,<br />AiiGrow chưa chạy được</h1>
            <p className="tb-sub">AiiGrow cần một trong hai:</p>
            <div className="tb-can"><span><Anh ten="laptop" />Windows 10 trở lên</span><span><Anh ten="may_tinh" />macOS 13 trở lên</span></div>
          </div>
          <Canh rob="trong-loi" co={200} nho="Ba Mẹ chọn 1 trong 2 cách bên dưới nhé.">Mình chưa vào được máy này.</Canh>
        </div>
        <div className="tb-cachs">
          <div className="tb-cach">
            <div className="dau"><Bt ten="laptop" c={72} /><div><h3>Dùng máy tính khác</h3><p>Mở link này trên máy Windows 10/11 hoặc Mac</p></div></div>
            <Chep url={linkChia} />
          </div>
          <div className="tb-cach">
            <div className="dau"><Bt ten="dt" mau="lam" c={72} /><div><h3>Cài cho điện thoại của con</h3><p>Điện thoại hoặc máy tính bảng của con</p></div></div>
            <Chips ds={[{ nen: "android", href: hrefHe("android") }, { nen: "ios", href: hrefHe("ios") }]} />
          </div>
        </div>
        <div className="tb-cuoi"><Bt ten="khien" c={44} /><span className="ft">Cài xong trên máy khác, máy đó tự báo về điện thoại Ba Mẹ.</span></div>
      </div></div>
    );
  }

  // ---- Android (bm1-web-tai-android) ----
  if (t.nen === "android") {
    return (
      <div className="tb"><div className="tb-pg hep">
        <Dau may="android" />
        <Canh rob="chi" co={104} nho="Bộ cài máy tính không chạy ở đây.">Đây là điện thoại Android.</Canh>
        <div className="tb-the" style={{ padding: "18px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><Bt ten="dt" mau="lam" c={56} /><div><div className="tb-t1">Cài cho điện thoại này</div><div className="tb-t2">Khi đây là máy của con</div></div></div>
          <NutTai href={LINK_APK_CON}>Tải AiiGrow Con cho Android</NutTai>
          <p className="tb-nho" style={{ marginTop: 8 }}>AiiGrow-Con-{BAN_CON_ANDROID.version}.apk · cài trên điện thoại của con</p>
        </div>
        <ol className="tb-cac">
          <Buoc so={1} lo={<div className="tb-lo hinh"><Bt ten="tai" mau="lam" c={120} /></div>} ten="Tải" phu="Bấm nút xanh ở trên" />
          <Buoc so={2} lo={
            <div className="tb-lo" style={{ ["--lo" as string]: "170px" }}>
              <div className="tb-hop" style={{ width: "min(260px,100%)", borderRadius: 20, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src="/logo.png" alt="" width={34} height={34} style={{ borderRadius: 9 }} /><div style={{ fontSize: 14, fontWeight: 800 }}>AiiGrow Con</div></div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2E3A50", margin: "10px 0 14px", lineHeight: 1.35 }}>Cho phép cài ứng dụng từ nguồn này?</div>
                <div style={{ display: "flex", gap: 8 }}><span className="tb-mn" style={{ flex: 1 }}>Huỷ</span><span className="tb-mn ok" style={{ flex: 1 }}>Cho phép</span></div>
                <Tay />
              </div>
            </div>} ten="Bấm «Cho phép»" phu="Android hỏi một lần" />
          <Buoc so={3} lo={<div className="tb-lo"><span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 800, color: "#2E3A50" }}><Anh ten="dt" co={28} />Trên điện thoại Ba Mẹ</span><OMa ma={t.ma} /></div>} ten="Nhập mã 6 số" phu="Mã dùng được 10 phút" />
        </ol>
        <MayTinh />
        <a className="tb-the" href={LINK_APK} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 26, padding: "12px 14px", minHeight: 72 }}>
          <Bt ten="nguoi" c={48} />
          <span style={{ flex: 1 }}><b style={{ display: "block", fontSize: 16, fontWeight: 800 }}>Đây là máy của Ba Mẹ?</b><span className="tb-t2" style={{ marginTop: 0 }}>Cài app Ba Mẹ thay vì app Con</span></span>
          <span style={{ fill: "#7A5A1C", display: "flex" }}><MuiTiep /></span>
        </a>
        <Khac nen="android" hrefHe={hrefHe} />
      </div></div>
    );
  }

  // ---- iPhone / iPad (bm1-web-tai-iphone) ----
  if (t.nen === "ios") {
    return (
      <div className="tb"><div className="tb-pg hep">
        <Dau may="ios" />
        <Canh rob="chi" co={104} nho="Không cần tải file. Máy này chỉ dùng cho một bé.">Đây là iPhone / iPad.</Canh>
        <div className="tb-the" style={{ padding: "18px 16px 16px" }}>
          {/* #267: iPhone / iPad không đổi người dùng ⇒ chỉ một bé (máy dùng chung: Windows, Mac, Android) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><Bt ten="tablet" mau="lam" c={56} /><div><div className="tb-t1">Cài cho máy này</div><div className="tb-t2">Máy riêng của một bé · iPhone, iPad không dùng chung được</div></div></div>
          {t.moApp
            ? <NutTai href={t.moApp}>Mở trang cài cho iPhone</NutTai>
            : <p className="tb-t2">Nhờ Ba Mẹ gửi link «Ghép máy» trong app Ba Mẹ, mở link đó trên máy này để cài. Đang thử qua TestFlight, nhắn AiiLab để nhận lời mời.</p>}
        </div>
        <ol className="tb-cac">
          <Buoc so={1} lo={<div className="tb-lo hinh"><Bt ten="tai" mau="lam" c={120} /></div>} ten="Cài app AiiGrow Con" phu="Từ App Store" />
          <Buoc so={2} lo={<div className="tb-lo hinh"><Bt ten="khien" mau="vang" c={120} /></div>} ten="Cài hồ sơ" phu="Bấm «Cho phép» rồi «Cài đặt»" />
          <Buoc so={3} lo={<div className="tb-lo hinh"><Bt ten="dongho" c={120} /></div>} ten="Cho phép Thời gian sử dụng" phu="Ba Mẹ xác nhận một lần" />
        </ol>
        <MayTinh />
        <Khac nen="ios" hrefHe={hrefHe} />
      </div></div>
    );
  }

  // ---- Windows / Mac: Chính · Đang tải · Tải không được ----
  const mac = t.nen === "mac";
  const tuGhep = !mac && !!t.g;
  const link = tuGhep ? linkTaiWindowsGhep(t.g) : mac ? BAN_AGENT_MAC.url : BAN_AGENT_WINDOWS.url;
  const tep = mac ? `Bản ${BAN_AGENT_MAC.version} · macOS 13 trở lên` : `Bản ${BAN_AGENT_WINDOWS.version} · Windows 10/11`;
  return (
    <div className="tb">
      <TaiMay duPhong={`/tai/du-phong?os=${t.nen}${duoi ? `&${duoi.slice(1)}` : ""}`} duPhongHien={`${host}/tai/du-phong`} nen={mac ? "mac" : "windows"} link={link}
        nut={mac ? "Tải bộ cài cho Mac" : "Tải bộ cài cho Windows"} tep={tep} ma={t.ma} tuGhep={tuGhep}
        dau={t.man === "dang-tai" ? "tai" : t.man === "dung" ? "dung" : "cho"} hrefHe={hrefAll} />
    </div>
  );
}
