// Trang tải công khai: hướng dẫn tải và cài trình cài AiiGrow cho máy Windows của Con.
// Nhận diện máy đang mở trang (Thanh 24/10: mở bằng MacBook vẫn thấy nút Windows) — Mac có nút .pkg làm nút chính; iPhone chưa có bản máy Con nên báo rõ.
// Giao diện Clay gương (docs/THIET-KE-CLAY.md): khối đất sét, các bước là lòng chảo đánh số, icon Fluent 3D đóng gói ở public/icon3d.
export const metadata = { title: "Tải AiiGrow — AiiGrow" };

import { headers } from "next/headers";
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";
import { heDieuHanh } from "@/lib/he-dieu-hanh.ts";
import { I3d, Ph } from "../_clay/Icon";

const LINK_TAI = BAN_AGENT_WINDOWS.url;
const LINK_APK = "/tai/aiigrow.apk";
const LINK_APK_CON = "/tai/aiigrow-con.apk";

const BAO_MAC = {
  ios: "Bạn đang mở trang bằng iPhone. Trên iPhone, AiiGrow là app của Ba Mẹ (đang thử qua TestFlight — nhắn AiiLab để nhận lời mời). Máy của Con cài được trên Windows, máy Mac và điện thoại Android (link tải bên dưới).",
} as const;

const ChanLuon = () => (
  <div className="bao ok-b">
    <I3d ten="key" mau="xanh" />
    <div>Cài xong trên máy của Con là <b>chặn luôn</b>: app chưa xếp loại không mở được, giờ ngủ thì khoá. Ba Mẹ muốn tạm chỉ theo dõi (ghi nhận, không chặn) thì chọn “Chỉ theo dõi” ngay trong app.</div>
  </div>
);

export default async function TrangTai() {
  const h = await headers();
  const os = heDieuHanh(h.get("user-agent") ?? "", h.get("sec-ch-ua-platform") ?? "");
  const winChinh = os === "windows" || os === "khac";
  return (
    <div className="ag">
      <main className="trang vao">
        <header className="dau-trang">
          <img className="logo" src="/logo.png" alt="AiiGrow" width={88} height={88} />
          <h1>Tải AiiGrow cho máy của Con</h1>
        </header>

        {os === "mac" ? (
          <>
            <section className="the the-tai">
              <I3d ten="laptop" mau="xam" co={56} />
              <a className="nut" href={BAN_AGENT_MAC.url}><Ph ten="download-simple" co={22} />Tải AiiGrow cho máy Mac</a>
              <p className="ghi-tep">Tệp AiiGrow-{BAN_AGENT_MAC.version}.pkg · macOS 13 trở lên · chỉ cài trên máy Mac (iPad không dùng tệp này)</p>
            </section>
            <ol className="buoc">
              <li>Máy Mac cần <b>tài khoản riêng cho Con</b> và một <b>tài khoản quản trị của Ba Mẹ</b> (Cài đặt hệ thống → Người dùng &amp; Nhóm).</li>
              <li>Đăng nhập tài khoản của Ba Mẹ, mở tệp .pkg vừa tải, bấm <b>Tiếp tục</b> rồi nhập mật khẩu quản trị.</li>
              <li>Cửa sổ <b>Ghép máy</b> tự mở (hoặc bấm biểu tượng AiiGrow trên thanh menu → <b>Ghép máy với Con…</b>): chọn tài khoản của Con, nhập <b>mã 6 số</b> lấy trong app AiiGrow: Trang chủ → “Máy tính &amp; điện thoại” → <b>Ghép thêm máy</b>.</li>
              <li>macOS báo “Đã thêm mục nền” là bình thường — đừng tắt AiiGrow trong Mục đăng nhập.</li>
            </ol>
            <ChanLuon />
            <p className="duong-phu">Máy Windows của Con: <a href={LINK_TAI}>tải AiiGrow-Setup.exe</a>.</p>
          </>
        ) : null}

        {os === "ios" ? (
          <div className="bao canh-b">
            <I3d ten="mobile-phone" mau="vang" />
            <div>
              {BAO_MAC[os]}
              <br />
              Mở trang này trên máy tính (Windows hoặc Mac) của Con để tải, hoặc tải sẵn bên dưới.
            </div>
          </div>
        ) : null}

        {os === "android" ? (
          <section className="the the-tai">
            <I3d ten="mobile-phone" mau="xanh" co={56} />
            <a className="nut" href={LINK_APK_CON}><Ph ten="download-simple" co={22} />Điện thoại của Con: tải AiiGrow Con</a>
            <p className="ghi-tep">Tệp AiiGrow-Con-android.apk · cài trên điện thoại của Con (Android hỏi thì cho phép «Cài ứng dụng không rõ nguồn gốc» với trình duyệt), mở app rồi nhập <b>mã 6 số</b> lấy trong app Ba Mẹ: Trang chủ → “Máy tính &amp; điện thoại” → <b>Ghép thêm máy</b>. Cài tay là mức bảo vệ Một phần; máy mới khôi phục gốc thì quét QR trong app Ba Mẹ để có đủ bảo vệ.</p>
            <a className="nut" href={LINK_APK}><Ph ten="download-simple" co={22} />Điện thoại của Ba Mẹ: tải app Ba Mẹ</a>
            <p className="ghi-tep">Tệp aiigrow.apk (bản thử) · app để Ba Mẹ quản lý, cài trên điện thoại của Ba Mẹ. Luôn là bản mới nhất — có bản mới thì tải lại link này và cài đè, không cần gỡ. Máy Windows của Con tải bên dưới.</p>
          </section>
        ) : null}

        {os === "mac" ? null : (<>
          <p className="phu-de">Cài trên máy tính Windows để đồng hành cùng Con. Cài xong trên máy của Con là <b>chặn luôn</b>; Ba Mẹ chuyển sang chỉ theo dõi được trong app.</p>

          <section className="the the-tai">
            <div className="dau-tai">
              <I3d ten="desktop-computer" mau="lam" co={winChinh ? 56 : 44} />
              {winChinh ? null : <h2>Máy Windows của Con</h2>}
            </div>
            <a className={winChinh ? "nut" : "nut vien"} href={LINK_TAI}><Ph ten="download-simple" co={22} />Tải AiiGrow cho Windows</a>
            <p className="ghi-tep">Một tệp AiiGrow-Setup.exe (bản {BAN_AGENT_WINDOWS.version}, ~182 MB) · Windows 10/11</p>
          </section>

          <ol className="buoc">
            <li>
              Chạy <code>AiiGrow-Setup.exe</code> vừa tải, bấm <b>Yes</b> khi Windows hỏi quyền quản trị.
              <br />
              <span className="phu-nho">Nếu hiện “Windows protected your PC”: bấm <b>More info → Run anyway</b> (bản thử chưa ký số).</span>
            </li>
            <li><b>Máy đã cài AiiGrow:</b> bộ cài tự cập nhật đè lên bản cũ, giữ nguyên ghép máy — không cần nhập lại mã. Từ bản này máy tự tải bản mới.</li>
            <li><b>Máy mới:</b> làm theo từng bước, nhập <b>mã 6 số</b> lấy trong app AiiGrow: Trang chủ → “Máy tính &amp; điện thoại” → <b>Ghép thêm máy</b>.</li>
          </ol>

          <ChanLuon />

          <p className="duong-phu">
            Máy Mac của Con: <a href={BAN_AGENT_MAC.url}>tải AiiGrow-{BAN_AGENT_MAC.version}.pkg</a> (mở trang này trên máy Mac để xem cách cài).
          </p>
        </>)}

        {os === "android" ? null : (
          <p className="duong-phu">App Ba Mẹ cho điện thoại Android: <a href={LINK_APK}>tải aiigrow.apk</a> (bản thử). Điện thoại Android của Con: <a href={LINK_APK_CON}>tải AiiGrow-Con-android.apk</a>.</p>
        )}

        <a className="nut vien nho nut-lui" href="/"><Ph ten="arrow-left" co={18} />Về app AiiGrow</a>
      </main>
    </div>
  );
}
