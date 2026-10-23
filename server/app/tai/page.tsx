// Trang tải công khai: hướng dẫn tải và cài trình cài AiiGrow cho máy Windows của Con.
export const metadata = { title: "Tải AiiGrow cho Windows — AiiGrow" };

import { BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";

const LINK_TAI = BAN_AGENT_WINDOWS.url;

export default function TrangTai() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px" }}>
      <img src="/logo.svg" alt="AiiGrow" width={140} />
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Tải AiiGrow cho máy của Con</h1>
      <p style={{ color: "#4a5555", marginTop: 0 }}>
        Cài trên máy tính Windows để đồng hành cùng Con. Mặc định chỉ{" "}
        <b>giám sát</b>, không khoá máy.
      </p>

      <a
        href={LINK_TAI}
        style={{
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
        }}
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
          Cài đặt → “Hồ sơ &amp; máy của Con” → <b>Ghép thêm máy</b>.
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

      <p style={{ marginTop: 28 }}>
        <a href="/" style={{ color: "#1f8a70" }}>
          ← Về app AiiGrow
        </a>
      </p>
    </main>
  );
}
