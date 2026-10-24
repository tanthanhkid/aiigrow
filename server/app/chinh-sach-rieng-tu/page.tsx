// Chính sách quyền riêng tư công khai (Apple TestFlight External / App Store đòi URL). Trang tĩnh, style inline, không phụ thuộc SPA.
// Nội dung đối chiếu mã nguồn 24/10/2026: schema (families/parents/children/devices/usage/web_nhat_ky/evidence/may_log), lib/log-may.ts (giữ 7 ngày), lib/web.ts (giữ 90 ngày).
export const metadata = { title: "Chính sách quyền riêng tư — AiiGrow", description: "Chính sách quyền riêng tư của AiiGrow / Privacy Policy of AiiGrow" };

const EMAIL = "hotro@aiilab.vn";
const h2 = { fontSize: 20, marginTop: 28, marginBottom: 6 } as const;
const ul = { lineHeight: 1.7, paddingLeft: 20, marginTop: 4 } as const;

export default function ChinhSachRiengTu() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px 64px", lineHeight: 1.6, color: "#1f2a2a" }}>
      <img src="/logo.png" alt="AiiGrow" width={72} height={72} style={{ borderRadius: 16 }} />
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Chính sách quyền riêng tư của AiiGrow</h1>
      <p style={{ color: "#5a6666", marginTop: 0 }}>Có hiệu lực từ 24/10/2026 · <a href="#english" style={{ color: "#1f8a70" }}>English version below</a></p>

      <h2 style={h2}>1. Ai vận hành AiiGrow</h2>
      <p>AiiGrow do Công ty AiiLab vận hành (76 Cách Mạng, phường Phú Thọ Hoà, TP. Hồ Chí Minh). Liên hệ về quyền riêng tư: <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a>.</p>
      <p>AiiGrow là ứng dụng để Ba Mẹ giúp Con quản lý thời gian dùng máy theo luật do chính Ba Mẹ đặt.</p>

      <h2 style={h2}>2. Dữ liệu chúng tôi thu thập</h2>
      <ul style={ul}>
        <li><b>Tài khoản Ba Mẹ:</b> số điện thoại hoặc email, tên hiển thị, vai trong gia đình, mật khẩu (chỉ lưu dạng băm, không lưu mật khẩu gốc).</li>
        <li><b>Hồ sơ Con:</b> tên, năm sinh, hình đại diện chọn trong app, mã PIN của Con (chỉ lưu dạng băm).</li>
        <li><b>Máy của Con do Ba Mẹ ghép:</b> tên máy, hệ điều hành, thời điểm máy kết nối gần nhất; ứng dụng/tiến trình đang dùng và số phút dùng mỗi ngày; tên miền các trang web đã vào (số lần, thời gian — nếu Ba Mẹ bật tính năng này; không lưu địa chỉ đầy đủ hay nội dung trang); nhật ký kỹ thuật ngắn do phần mềm trên máy tự ghi để hỗ trợ khi có lỗi (không chứa ảnh màn hình hay nội dung màn hình).</li>
        <li><b>Nhiệm vụ và phần thưởng:</b> nhiệm vụ Ba Mẹ giao, bài Con nộp, <b>ảnh minh chứng nhiệm vụ</b> do Con chụp/gửi, điểm, yêu cầu thêm giờ và các quyết định duyệt của Ba Mẹ.</li>
        <li><b>Dữ liệu kỹ thuật:</b> thông tin lỗi ẩn danh phục vụ sửa lỗi của máy chủ.</li>
      </ul>
      <p>Chúng tôi <b>không</b> thu thập vị trí, danh bạ, tin nhắn hay nội dung các ứng dụng khác của Con.</p>

      <h2 style={h2}>3. Mục đích sử dụng</h2>
      <p>Chỉ để vận hành AiiGrow: hiển thị cho Ba Mẹ thời gian Con dùng máy, áp dụng luật Ba Mẹ đặt (giới hạn giờ, chặn ứng dụng/trang web), quản lý nhiệm vụ, điểm thưởng, gửi thông báo và hỗ trợ kỹ thuật.</p>
      <p><b>Chúng tôi không bán dữ liệu, không hiển thị quảng cáo, không chia sẻ dữ liệu cho mục đích quảng cáo, và không dùng dữ liệu của bạn để huấn luyện mô hình AI.</b></p>

      <h2 style={h2}>4. Lưu trữ và thời hạn</h2>
      <ul style={ul}>
        <li>Dữ liệu lưu trên máy chủ do AiiLab quản lý, truyền qua kết nối mã hoá HTTPS.</li>
        <li>Nhật ký kỹ thuật của máy Con: giữ 7 ngày. Lịch sử tên miền đã vào: giữ 90 ngày.</li>
        <li>Các dữ liệu còn lại được giữ trong thời gian gia đình còn dùng AiiGrow; khi Ba Mẹ gỡ một máy khỏi danh sách thì dữ liệu gắn với máy đó bị xoá theo.</li>
      </ul>

      <h2 style={h2}>5. Quyền của bạn: xem, sửa, xoá</h2>
      <ul style={ul}>
        <li>Ba Mẹ xem và sửa hồ sơ Con, luật, nhiệm vụ ngay trong app.</li>
        <li><b>Gỡ máy:</b> trong app, vào Máy tính &amp; điện thoại → chọn máy → “An toàn &amp; gỡ cài đặt”. Máy tự gỡ AiiGrow và rời danh sách.</li>
        <li><b>Xoá tài khoản và toàn bộ dữ liệu gia đình:</b> gửi yêu cầu từ số điện thoại/email đã đăng ký tới <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a>; chúng tôi xử lý trong vòng 30 ngày.</li>
      </ul>

      <h2 style={h2}>6. Trẻ em</h2>
      <p>AiiGrow dành cho gia đình. <b>Con không tự tạo tài khoản</b>: Ba Mẹ là người tạo tài khoản, đồng ý cho thu thập dữ liệu của Con và ghép máy của Con. Ba Mẹ có thể xem, sửa hoặc yêu cầu xoá dữ liệu của Con bất cứ lúc nào qua mục 5. Nếu bạn cho rằng một trẻ đã được thêm mà không có sự đồng ý của phụ huynh, hãy liên hệ chúng tôi để xoá.</p>

      <h2 style={h2}>7. Thay đổi chính sách</h2>
      <p>Khi chính sách thay đổi, chúng tôi cập nhật trang này và ngày hiệu lực ở đầu trang.</p>

      <h2 style={h2}>8. Liên hệ</h2>
      <p>Công ty AiiLab · 76 Cách Mạng, phường Phú Thọ Hoà, TP. Hồ Chí Minh · <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a></p>

      <hr style={{ margin: "40px 0", border: 0, borderTop: "1px solid #d5dede" }} />

      <section id="english" lang="en">
        <h1 style={{ fontSize: 24 }}>AiiGrow Privacy Policy</h1>
        <p style={{ color: "#5a6666", marginTop: 0 }}>Effective October 24, 2026</p>
        <p>AiiGrow is operated by AiiLab Company, 76 Cach Mang, Phu Tho Hoa Ward, Ho Chi Minh City, Vietnam. Contact: <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a>. AiiGrow lets parents manage their child&apos;s device time under rules the parents set.</p>
        <h2 style={h2}>Data we collect</h2>
        <ul style={ul}>
          <li>Parent account: phone number or email, display name, family role, password (stored only as a hash).</li>
          <li>Child profile: name, birth year, chosen avatar, child PIN (stored only as a hash).</li>
          <li>Paired child devices (paired by the parent): device name and operating system, last connection time, apps/processes in use and daily minutes of use, domain names of websites visited (counts and duration; only if the parent enables it; no full URLs or page content), and short technical logs written by the AiiGrow software for support (no screenshots or screen content).</li>
          <li>Tasks and rewards: tasks assigned by parents, submissions, photos a child sends as proof of a task, points, extra-time requests and parent decisions.</li>
          <li>Technical error reports from our server for bug fixing.</li>
        </ul>
        <p>We do not collect location, contacts, messages, or the content of other apps.</p>
        <h2 style={h2}>How we use it</h2>
        <p>Only to run AiiGrow: show parents their child&apos;s device usage, apply the rules they set, manage tasks and rewards, send notifications, and provide support. <b>We do not sell data, show ads, share data for advertising, or use your data to train AI models.</b></p>
        <h2 style={h2}>Storage and retention</h2>
        <p>Data is stored on servers managed by AiiLab and transmitted over HTTPS. Technical device logs are kept 7 days; visited-domain history is kept 90 days; other data is kept while the family uses AiiGrow. Removing a device in the app deletes the data tied to that device.</p>
        <h2 style={h2}>Your rights</h2>
        <p>Parents can view and edit child profiles, rules and tasks in the app, and remove a device in the app (Devices, then the device, then &quot;Safe removal&quot;). To delete your account and all family data, email <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a> from the registered phone/email; we process requests within 30 days.</p>
        <h2 style={h2}>Children</h2>
        <p>Children do not create accounts. A parent creates the account, consents to the collection of the child&apos;s data, and pairs the child&apos;s device. Parents may review, edit or request deletion of their child&apos;s data at any time via the contact above.</p>
        <h2 style={h2}>Changes</h2>
        <p>We will update this page and its effective date when the policy changes.</p>
      </section>
    </main>
  );
}
