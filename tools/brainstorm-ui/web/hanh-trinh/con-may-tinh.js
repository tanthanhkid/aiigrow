// Hành trình máy Con (Windows / Mac) — tiền tố key `cmt-`. Mọi màn dựng KHỚP ẢNH CHỤP THẬT trong that/*.js
// (aiigrow-thiet-ke/man-win-2510/100 ảnh 100% DPI, man-mac-2510 ảnh @2x), chữ thật từ agent-win / agent-mac,
// đo pixel từng màn (tools/brainstorm-ui/DO-KHOP.md mục Native). Ở đây chỉ còn thứ tự bước, tên bước và gợi ý thao tác.
import { THAT } from './that/index.js';

// key: key màn trong that/*.js (key hành trình = 'cmt-' + key); toi: chữ «…» trùng nút trên màn ⇒ app.js gắn data-toi
const S = (key, ten, toi) => {
  const m = THAT[key];
  if (!m) throw new Error('thiếu màn khớp ảnh thật: ' + key);
  return { key: 'cmt-' + key, ten, w: m.w, h: m.h, html: m.html, anh: m.anh, ...(toi ? { toi } : {}) };
};

export default [
  { id: 'con-cai-win', vai: 'Con', nen: 'Windows', ten: 'Cài trên Windows', mo: 'Ba Mẹ chạy bộ cài trên máy của Con: đồng ý điều khoản, chọn tài khoản giới hạn cho Con, nhập mã ghép 6 số rồi cài xong.',
    buoc: [
      S('cai-chao', 'Chào Ba Mẹ', 'Bấm «Bắt đầu»'),
      S('cai-dieu-khoan', 'Điều khoản', 'Tick đồng ý, bấm «Tiếp»'),
      S('cai-chon-tai-khoan', 'Chọn tài khoản của Con', 'Chọn «Máy chưa có tài khoản riêng cho Con»'),
      S('cai-tao-tai-khoan', 'Tạo tài khoản cho Con', 'Bấm «Tạo tài khoản»'),
      S('cai-chi-mot-tai-khoan-quan-tri', 'Chỉ có một tài khoản quản trị', 'Bấm «Quay lại chọn» (khi Con đang dùng tài khoản toàn quyền duy nhất)'),
      S('cai-ma-ghep', 'Nhập mã ghép máy', 'Bấm «Ghép và cài đặt»'),
      S('cai-ma-ghep-sai', 'Mã ghép thiếu số', 'Nhập đủ 6 số rồi ghép'),
      S('cai-dang-cai', 'Đang cài', 'Cài xong tự sang bước cuối'),
      S('cai-loi-ghep', 'Lỗi ghép: mã hết hạn', 'Xin mã mới trên điện thoại, bấm «Thử lại»'),
      S('cai-xong', 'Cài xong'),
    ] },

  { id: 'con-cai-mac', vai: 'Con', nen: 'Mac', ten: 'Cài trên Mac', mo: 'Ba Mẹ cài AiiGrow lên Mac của Con rồi ghép máy bằng mã 6 số, hoặc một chạm nếu gói cài đã mang mã gia đình.',
    buoc: [
      S('mac-chao', 'Chào mừng', 'Đọc «Chào mừng đến với AiiGrow» rồi bấm Tiếp tục của trình cài'),
      S('mac-dieu-khoan', 'Điều khoản', 'Đồng ý «Điều khoản» và cài, rồi mở AiiGrow trên thanh menu'),
      S('mac-ghep-may', 'Ghép máy bằng mã 6 số', 'Gói cài đã mang mã gia đình thì chỉ cần một chạm'),
      S('mac-ghep-mot-cham', 'Ghép máy một chạm'),
    ] },

  { id: 'con-ngay-thuong', vai: 'Con', nen: 'Windows', ten: 'Ngày thường', mo: 'Con mở app: xem giờ còn lại, làm nhiệm vụ, nộp bài, đổi quà, đọc tin nhắn của Ba Mẹ. Mac giống bố cục này.',
    buoc: [
      S('hom-nay', 'Hôm nay', 'Chọn «Nhiệm vụ»'),
      S('nhiem-vu-loi-tai', 'Nhiệm vụ: chưa tải được', 'Bấm «Thử lại»'),
      S('nhiem-vu', 'Nhiệm vụ', 'Bấm «Nộp bài»'),
      S('phan-qua', 'Phần quà & điểm', 'Bấm «Đổi quà», rồi xem Ví quà'),
      S('vi-qua', 'Ví quà & huy hiệu', 'Sang «Tin nhắn»'),
      S('tin-nhan', 'Tin nhắn', 'Có tin mới thì hiện thông báo ở góc màn hình (Mac)'),
    ] },

  { id: 'con-het-gio', vai: 'Con', nen: 'Windows', ten: 'Sắp hết giờ', mo: 'Máy nhắc còn 5 phút, đếm ngược rồi khoá khi hết giờ, giờ ngủ hoặc Ba Mẹ khoá; Con có thể xin thêm giờ.',
    buoc: [
      S('khoa-het-gio-dem-nguoc', 'Đếm ngược trên Windows', 'Hết đếm ngược'),
      S('khoa-gio-ngu', 'Khoá giờ nghỉ / giờ ngủ', 'Ba Mẹ bấm khoá từ điện thoại'),
      S('khoa-ba-me-khoa', 'Ba Mẹ khoá máy'),
    ] },

  { id: 'con-xin', vai: 'Con', nen: 'Windows', ten: 'Xin thêm giờ · xin mở · chơi bằng điểm', mo: 'Con xin Ba Mẹ thêm giờ, xin mở trang hoặc app, hoặc tự đổi điểm lấy giờ chơi.',
    buoc: [
    ] },

  { id: 'con-bi-chan', vai: 'Con', nen: 'Windows', ten: 'Bị chặn app/web', mo: 'Con mở app chưa được Ba Mẹ phân loại thì bị chặn; Con dùng điểm, xin phép hoặc xin thêm giờ.',
    buoc: [
    ] },

  { id: 'con-mat-mang', vai: 'Con', nen: 'Windows', ten: 'Mất mạng & sự cố', mo: 'Khi máy mất mạng hoặc dịch vụ AiiGrow tắt: máy vẫn chạy theo giờ đã lưu, Con nhập mã mở của Ba Mẹ, thử kết nối lại hoặc cập nhật.',
    buoc: [
      S('hom-nay-mat-mang', 'Hôm nay khi mất mạng', 'Hết giờ lúc đang mất mạng'),
      S('khoa-mat-mang', 'Khoá khi mất mạng: nhập mã', 'Trên Mac: nhập mã 6 số của Ba Mẹ'),
      S('hom-nay-mo-bang-ma', 'Đang mở tạm bằng mã', 'Dịch vụ AiiGrow bị tắt'),
      S('hom-nay-dich-vu-tat', 'Dịch vụ AiiGrow không chạy', 'Mất mạng khi bị chặn app'),
    ] },
];
