// Chính sách quyền riêng tư công khai (Apple TestFlight External / App Store đòi URL). Trang tĩnh, style inline, không phụ thuộc SPA.
// Nội dung đối chiếu mã nguồn 24/10/2026: schema (families/parents/children/devices/usage/web_nhat_ky/evidence/may_log), lib/log-may.ts (giữ 7 ngày), lib/web.ts (giữ 90 ngày), lib/xoa-tai-khoan.ts (audit gia đình đã xoá giữ 90 ngày, cron /api/cron/don-kiem-toan).
export const metadata = { title: "Chính sách quyền riêng tư — AiiGrow", description: "Chính sách quyền riêng tư của AiiGrow / Privacy Policy of AiiGrow" };

const EMAIL = "info@aiilab.vn";
const NGAY_VI = "24/10/2026", NGAY_EN = "October 24, 2026"; // sửa nội dung thì đổi cả hai ngày
const h2 = { fontSize: 20, marginTop: 28, marginBottom: 6 } as const;
const ul = { lineHeight: 1.7, paddingLeft: 20, marginTop: 4 } as const;

export default function ChinhSachRiengTu() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px 64px", lineHeight: 1.6, color: "#1f2a2a" }}>
      <img src="/logo.png" alt="AiiGrow" width={72} height={72} style={{ borderRadius: 16 }} />
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Chính sách quyền riêng tư của AiiGrow</h1>
      <p style={{ color: "#5a6666", marginTop: 0 }}>Có hiệu lực từ {NGAY_VI} · <a href="#english" style={{ color: "#1f8a70" }}>English version below</a></p>

      <h2 style={h2}>1. Ai vận hành AiiGrow</h2>
      <p>AiiGrow do Công ty AiiLab vận hành (76 Cách Mạng, phường Phú Thọ Hoà, TP. Hồ Chí Minh). Liên hệ về quyền riêng tư: <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a>.</p>
      <p>AiiGrow là ứng dụng để Ba Mẹ giúp Con quản lý thời gian dùng máy theo luật do chính Ba Mẹ đặt.</p>

      <h2 style={h2}>2. Dữ liệu chúng tôi thu thập</h2>
      <ul style={ul}>
        <li><b>Tài khoản Ba Mẹ:</b> số điện thoại hoặc email, tên hiển thị, vai trong gia đình, mật khẩu (chỉ lưu dạng băm, không lưu mật khẩu gốc).</li>
        <li><b>Hồ sơ Con:</b> tên, năm sinh, hình đại diện chọn trong app, mã PIN của Con (chỉ lưu dạng băm).</li>
        <li><b>Máy của Con do Ba Mẹ ghép:</b> tên máy, hệ điều hành, thời điểm máy kết nối gần nhất; ứng dụng/tiến trình đang dùng và số phút dùng mỗi ngày; tên miền các trang web đã vào (số lần, thời gian — nếu Ba Mẹ bật tính năng này; không lưu địa chỉ đầy đủ hay nội dung trang); nhật ký kỹ thuật ngắn do phần mềm trên máy tự ghi để hỗ trợ khi có lỗi (không chứa ảnh màn hình hay nội dung màn hình).</li>
        <li><b>Nhiệm vụ và phần thưởng:</b> nhiệm vụ Ba Mẹ giao, bài Con nộp, <b>ảnh minh chứng nhiệm vụ</b> do Con chụp/gửi, điểm, yêu cầu thêm giờ và các quyết định duyệt của Ba Mẹ.</li>
        <li><b>Lọc mạng (nếu Ba Mẹ bật):</b> nhật ký tóm tắt theo ngày gồm tên miền, số lần truy vấn và số lần bị chặn của các thiết bị đi qua bộ lọc DNS của gia đình (máy, TV, console); không lưu địa chỉ đầy đủ hay nội dung.</li>
        <li><b>Dữ liệu kỹ thuật:</b> báo cáo lỗi của máy chủ, gửi tới nhà cung cấp theo dõi lỗi Sentry để sửa lỗi (có thể kèm thông tin kỹ thuật của yêu cầu gây lỗi).</li>
      </ul>
      <p>Chúng tôi <b>không</b> thu thập vị trí, danh bạ, tin nhắn hay nội dung các ứng dụng khác của Con.</p>

      <h2 style={h2}>3. Mục đích sử dụng</h2>
      <p>Chỉ để vận hành AiiGrow: hiển thị cho Ba Mẹ thời gian Con dùng máy, áp dụng luật Ba Mẹ đặt (giới hạn giờ, chặn ứng dụng/trang web), quản lý nhiệm vụ, điểm thưởng, gửi thông báo và hỗ trợ kỹ thuật.</p>
      <p><b>Chúng tôi không bán dữ liệu, không hiển thị quảng cáo, không chia sẻ dữ liệu cho mục đích quảng cáo, và không dùng dữ liệu của bạn để huấn luyện mô hình AI.</b></p>

      <h2 style={h2}>4. Lưu trữ và thời hạn</h2>
      <ul style={ul}>
        <li>Dữ liệu lưu trên máy chủ do AiiLab quản lý, truyền qua kết nối mã hoá HTTPS. Chúng tôi chỉ dùng nhà cung cấp hạ tầng và theo dõi lỗi để vận hành dịch vụ, không chia sẻ cho bên thứ ba vì mục đích khác.</li>
        <li>Nhật ký kỹ thuật của máy Con: giữ tối đa 7 ngày. Lịch sử tên miền đã vào: giữ tối đa 90 ngày (được dọn mỗi khi máy kết nối).</li>
        <li>Các dữ liệu còn lại được giữ trong thời gian gia đình còn dùng AiiGrow; Ba Mẹ có thể yêu cầu xoá dữ liệu của Con hoặc của một máy qua mục 5.</li>
        <li>Sau khi gia đình xoá tài khoản: nhật ký giao dịch (nạp quỹ phiếu quà, quét phiếu quà tại quầy AiiCafe) và mã phiếu quà được giữ tối đa 90 ngày để xử lý khiếu nại, sau đó xoá hẳn.</li>
      </ul>

      <h2 style={h2}>5. Quyền của bạn: xem, sửa, xoá</h2>
      <ul style={ul}>
        <li>Ba Mẹ xem và sửa hồ sơ Con, luật, nhiệm vụ ngay trong app.</li>
        <li><b>Gỡ máy:</b> trong app, vào Máy tính &amp; điện thoại → chọn máy → “An toàn &amp; gỡ cài đặt”. Với máy hỗ trợ, phần mềm AiiGrow được gỡ khỏi máy và máy rời danh sách.</li>
        <li><b>Xoá tài khoản ngay trong app:</b> <b>Gia đình → Xoá tài khoản</b>, nhập lại mật khẩu. Chủ gia đình là người lớn cuối cùng ⇒ xoá luôn toàn bộ dữ liệu gia đình (hồ sơ Con, nhiệm vụ, ảnh bằng chứng, điểm, luật) — riêng nhật ký giao dịch quỹ và phiếu quà được giữ tối đa 90 ngày để xử lý khiếu nại rồi xoá hẳn (mục 4); trước đó cần gỡ các máy đã ghép để AiiGrow rời máy của Con. Ba/Mẹ khác ⇒ chỉ xoá tài khoản của mình (xoá số điện thoại/email, mật khẩu, tin nhắn hỗ trợ và lời khen bạn đã viết; gia đình chỉ giữ tên gọi của bạn trong lịch sử duyệt). Việc xoá có hiệu lực ngay và không khôi phục được. Không vào được app? Gửi yêu cầu từ số điện thoại/email đã đăng ký tới <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a>; chúng tôi xử lý trong vòng 30 ngày.</li>
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
        <p style={{ color: "#5a6666", marginTop: 0 }}>Effective {NGAY_EN}</p>
        <p>AiiGrow is operated by AiiLab Company, 76 Cach Mang, Phu Tho Hoa Ward, Ho Chi Minh City, Vietnam. Contact: <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a>. AiiGrow lets parents manage their child&apos;s device time under rules the parents set.</p>
        <h2 style={h2}>Data we collect</h2>
        <ul style={ul}>
          <li>Parent account: phone number or email, display name, family role, password (stored only as a hash).</li>
          <li>Child profile: name, birth year, chosen avatar, child PIN (stored only as a hash).</li>
          <li>Paired child devices (paired by the parent): device name and operating system, last connection time, apps/processes in use and daily minutes of use, domain names of websites visited (counts and duration; only if the parent enables it; no full URLs or page content), and short technical logs written by the AiiGrow software for support (no screenshots or screen content).</li>
          <li>Tasks and rewards: tasks assigned by parents, submissions, photos a child sends as proof of a task, points, extra-time requests and parent decisions.</li>
          <li>Network filtering (if the parent enables it): a daily summary of domain names, query counts and blocked counts for devices using the family DNS filter; no full URLs or content.</li>
          <li>Technical error reports from our server, sent to our error-monitoring provider (Sentry) for bug fixing; they may include technical details of the failing request.</li>
        </ul>
        <p>We do not collect location, contacts, messages, or the content of other apps.</p>
        <h2 style={h2}>How we use it</h2>
        <p>Only to run AiiGrow: show parents their child&apos;s device usage, apply the rules they set, manage tasks and rewards, send notifications, and provide support. <b>We do not sell data, show ads, share data for advertising, or use your data to train AI models.</b></p>
        <h2 style={h2}>Storage and retention</h2>
        <p>Data is stored on servers managed by AiiLab and transmitted over HTTPS. Technical device logs are kept up to 7 days and visited-domain history up to 90 days (cleaned up whenever the device connects); other data is kept while the family uses AiiGrow. After a family deletes its account, transaction logs (gift-voucher fund top-ups, voucher scans at the AiiCafe counter) and voucher codes are kept for up to 90 days to handle disputes, then permanently deleted. Parents can ask us to delete a child's or a device's data as described below. We use infrastructure and error-monitoring providers only to run the service and do not share data with third parties for other purposes.</p>
        <h2 style={h2}>Your rights</h2>
        <p>Parents can view and edit child profiles, rules and tasks in the app, and remove a device in the app (where supported, the AiiGrow software is uninstalled and the device leaves the list). To delete your account in the app, go to <b>Gia đình (Family) → Xoá tài khoản (Delete account)</b> and re-enter your password: if you are the family owner and the last adult, all family data (child profiles, tasks, photo evidence, points, rules) is deleted, except transaction logs and voucher codes, which are kept for up to 90 days to handle disputes and then permanently deleted — remove paired devices first so AiiGrow leaves your child&apos;s devices; other parents delete only their own account (your phone/email, password, support messages and praise notes are deleted; the family keeps only your display name in its approval history). Deletion is immediate and cannot be undone. If you cannot sign in, email <a href={`mailto:${EMAIL}`} style={{ color: "#1f8a70" }}>{EMAIL}</a> from the registered phone/email; we process requests within 30 days.</p>
        <h2 style={h2}>Children</h2>
        <p>Children do not create accounts. A parent creates the account, consents to the collection of the child&apos;s data, and pairs the child&apos;s device. Parents may review, edit or request deletion of their child&apos;s data at any time via the contact above.</p>
        <h2 style={h2}>Changes</h2>
        <p>We will update this page and its effective date when the policy changes.</p>
      </section>
    </main>
  );
}
