// Trang tải công khai: hướng dẫn tải và cài trình cài AiiGrow cho máy Windows của Con.
// Nhận diện máy đang mở trang (Thanh 24/10: mở bằng MacBook vẫn thấy nút Windows) — Mac có nút .pkg làm nút chính; iPhone chưa có bản máy Con nên báo rõ.
export const metadata = { title: "Tải AiiGrow — AiiGrow" };

import { headers } from "next/headers";
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";
import { heDieuHanh } from "@/lib/he-dieu-hanh.ts";

const LINK_TAI = BAN_AGENT_WINDOWS.url;
const LINK_APK = "/tai/aiigrow.apk";

const BAO_MAC = {
  ios: "Bạn đang mở trang bằng iPhone. Trên iPhone, AiiGrow là app của Ba Mẹ (đang thử qua TestFlight — nhắn AiiLab để nhận lời mời). Máy của Con hiện cài được trên Windows.",
} as const;

export default async function TrangTai() {
  const h = await headers();
  const os = heDieuHanh(h.get("user-agent") ?? "", h.get("sec-ch-ua-platform") ?? "");
  const nutPhu = { display: "inline-block", marginTop: 8, marginRight: 8, padding: "12px 18px", fontSize: 15, fontWeight: 600, color: "#1f8a70", border: "1px solid #b9d9cf", borderRadius: 12, textDecoration: "none", minHeight: 44, boxSizing: "border-box" } as const;
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px" }}>
      <img src="/logo.png" alt="AiiGrow" width={96} height={96} style={{ borderRadius: 22 }} />
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Tải AiiGrow cho máy của Con</h1>
      {os === "mac" ? (
        <>
          <a href={BAN_AGENT_MAC.url} style={{ display: "inline-block", marginTop: 16, marginBottom: 6, padding: "16px 28px", fontSize: 18, fontWeight: 600, background: "#1f8a70", color: "#fff", borderRadius: 14, textDecoration: "none" }}>
            ⬇ Tải AiiGrow cho máy Mac
          </a>
          <p style={{ fontSize: 13, color: "#7a8585", marginTop: 0 }}>Tệp AiiGrow-{BAN_AGENT_MAC.version}.pkg · macOS 13 trở lên</p>
          <ol style={{ lineHeight: 1.75, marginTop: 12, paddingLeft: 20 }}>
            <li>Trên máy Mac của Con, đăng nhập tài khoản quản trị của Ba Mẹ, mở tệp .pkg vừa tải, bấm <b>Tiếp tục</b> rồi nhập mật khẩu quản trị.</li>
            <li>Khi macOS hỏi về <b>Mục nền</b> (Background Items), bấm cho phép AiiGrow.</li>
            <li>Bấm biểu tượng AiiGrow trên thanh menu → <b>Ghép máy</b>: chọn tài khoản của Con và nhập mã ghép 6 số tạo trong app Ba Mẹ.</li>
          </ol>
        </>
      ) : null}
      {os === "ios" ? (
        <div style={{ margin: "16px 0", padding: "14px 16px", background: "#fff6e5", border: "1px solid #f1d9a8", borderRadius: 12, fontSize: 15, color: "#3d3020" }}>
          {BAO_MAC[os]}
          <br />
          Mở trang này trên máy Windows của Con để tải, hoặc tải sẵn bên dưới.
        </div>
      ) : null}
      {os === "android" ? (
        <>
          <a href={LINK_APK} style={{ display: "inline-block", marginTop: 16, marginBottom: 6, padding: "16px 28px", fontSize: 18, fontWeight: 600, background: "#1f8a70", color: "#fff", borderRadius: 14, textDecoration: "none" }}>
            ⬇ Tải app Ba Mẹ cho Android
          </a>
          <p style={{ fontSize: 13, color: "#7a8585", marginTop: 0 }}>Tệp aiigrow.apk (bản thử) · app để Ba Mẹ quản lý. AiiGrow cho điện thoại Android của Con đang làm; máy Windows của Con tải bên dưới.</p>
        </>
      ) : null}
      <p style={{ color: "#4a5555", marginTop: 0 }}>
        Cài trên máy tính Windows để đồng hành cùng Con. Mặc định chỉ{" "}
        <b>giám sát</b>, không khoá máy.
      </p>

      {os === "windows" || os === "khac" ? null : <h2 style={{ fontSize: 18, marginTop: 28 }}>Máy Windows của Con</h2>}
      <a
        href={LINK_TAI}
        style={os === "windows" || os === "khac" ? {
          display: "inline-block",
          marginTop: 16,
          marginBottom: 6,
          padding: "16px 28px",
          fontSize: 18,
          fontWeight: 600,
          background: "#1f8a70",
          color: "#fff",
          borderRadius: 14,
          textDecoration: "none",
        } : nutPhu}
      >
        ⬇ Tải AiiGrow cho Windows
      </a>
      <p style={{ fontSize: 13, color: "#7a8585", marginTop: 0 }}>
        Một tệp AiiGrow-Setup.exe (bản {BAN_AGENT_WINDOWS.version}, ~182 MB) · Windows 10/11
      </p>

      <ol style={{ lineHeight: 1.75, marginTop: 24, paddingLeft: 20 }}>
        <li>
          Chạy <code>AiiGrow-Setup.exe</code> vừa tải, bấm <b>Yes</b> khi Windows hỏi
          quyền quản trị.
          <br />
          <span style={{ color: "#7a8585", fontSize: 14 }}>
            Nếu hiện “Windows protected your PC”: bấm <b>More info → Run anyway</b>{" "}
            (bản thử chưa ký số).
          </span>
        </li>
        <li>
          <b>Máy đã cài AiiGrow:</b> bộ cài tự cập nhật đè lên bản cũ, giữ nguyên ghép
          máy — không cần nhập lại mã. Từ bản này máy tự tải bản mới.
        </li>
        <li>
          <b>Máy mới:</b> làm theo từng bước, nhập <b>mã 6 số</b> lấy trong app AiiGrow:
          Trang chủ → “Máy tính &amp; điện thoại” → <b>Ghép thêm máy</b>.
        </li>
      </ol>

      <div
        style={{
          marginTop: 24,
          padding: "14px 16px",
          background: "#eef6f3",
          borderRadius: 12,
          fontSize: 14,
          color: "#2a3b3b",
        }}
      >
        Sau khi ghép, máy chạy ở chế độ <b>giám sát</b> (ghi nhận, không khoá).
        Ba Mẹ bật “chặn thật” khi cần, ngay trong app.
      </div>

      {os === "android" ? null : (
        <p style={{ marginTop: 20, fontSize: 14, color: "#4a5555" }}>
          App Ba Mẹ cho điện thoại Android: <a href={LINK_APK} style={{ color: "#1f8a70" }}>tải aiigrow.apk</a> (bản thử).
        </p>
      )}

      <p style={{ marginTop: 28 }}>
        <a href="/" style={{ color: "#1f8a70" }}>
          ← Về app AiiGrow
        </a>
      </p>
    </main>
  );
}
