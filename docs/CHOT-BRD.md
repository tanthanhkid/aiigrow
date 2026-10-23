# Chốt các chỗ BRD v1.0 chưa rõ

Nguồn: issue #56 (QA Nghi rà test case, 23/10/2026). Khi BRD và mã khác nhau, file này là bản chốt; Hồ sơ QA lấy kết quả mong đợi theo đây.

| # | Câu | Chốt | Mã |
|---|---|---|---|
| 1 | Đồng hồ máy Con lệch bao nhiêu thì khoá | **10 phút** (sửa BRD FR-01.05 + mục 10: mặc định 10, cấu hình 1–30). 5 phút dễ khoá oan máy đồng bộ giờ chậm | `cau-hinh.ts` `lech_gio_phut` |
| 2 | Mất mạng có mở phiên giải trí mới không | **Không mở phiên mới** (theo 4.1 + mục 9). Phiên đang chạy lúc mất mạng chạy tiếp, không vượt số điểm đã đồng bộ, có mạng lại thì gửi bù (đây là nghĩa của 6.7). Hiện agent Windows mới làm vế đầu (mở phiên phải qua máy chủ); vế «chạy tiếp + gửi bù» máy chủ có sẵn (`phien/bu`) nhưng agent chưa gọi ⇒ test phần này để «Chưa làm» | agent: `phien/xet` + `phien/mo`; máy chủ: `may-con.ts` `buPhien` |
| 3 | Mã ghép máy | Mã 6 số, **hết hạn 15 phút**, **dùng 1 lần cho 1 máy** (Con nhiều máy ⇒ Ba Mẹ tạo mỗi máy một mã). **Mỗi IP tối đa 10 lần sai trong một khung 15 phút**, quá thì khoá tới hết khung (≤ 15 phút); ghép đúng không tính lượt sai | `gia-dinh.ts` `taoMaGhep`, `ghepMay` |
| 4 | Ba Mẹ sai mật khẩu 5 lần | **Tự mở sau 15 phút**; hoặc đặt lại mật khẩu bằng OTP thì mở ngay. **OTP hết hạn 10 phút**, nhập sai OTP 5 lần ⇒ phải gửi mã mới | `auth.ts` `KHOA_PHUT`, `OTP_PHUT`, `OTP_SAI_TOI_DA` |
| 5 | Cảnh báo mạnh khi cho ngoại lệ | **> 6 lần/tuần** (lần thứ 7 mới cảnh báo mạnh). Sửa ví dụ ở BRD 6.6 | `ngoai-le.ts` |
| 6 | Phạm vi «Lần này» | **1 giờ kể từ lúc Ba Mẹ duyệt**. «Hôm nay» = tới hết ngày theo giờ gia đình | `yeu-cau.ts` |
| 7 | Tạm dừng game có tính 3 phút tự đóng không | **Có**: tạm dừng (khoá màn hình / rời app) liên tục 3 phút (`tu_dong_dong`), tính từ nhịp tạm dừng đầu tiên ⇒ phiên kết thúc «không hoạt động»; dùng lại trước 3 phút thì đếm lại; lúc tạm dừng không trừ điểm. (Sửa trong PR #57: trước đó nhịp tạm dừng mỗi phút làm phiên không bao giờ tự đóng) | `phien.ts` `nhip`, cột `tam_tu` |
| 8 | Voucher «Chờ xác nhận» | **Có dùng**: voucher mệnh giá ≥ `voucher_xac_nhan_tu` (100.000đ) chờ Ba Mẹ xác nhận, điểm giữ, quỹ chưa trừ. Bổ sung trạng thái này vào FR-09.02 | `phan-thuong.ts` |
| 9 | Ba Mẹ xoá dữ liệu thì nhật ký kiểm toán | **Giữ nhật ký nhưng ẩn danh hoá** (bỏ tên, SĐT/email, ảnh; giữ loại hành động, thời điểm, mã gia đình đã băm) đủ thời hạn lưu rồi mới xoá. Thời hạn lưu cấu hình **12–36 tháng** (sàn 12 theo FR-06.04, sửa mục 10 bỏ 6–11). Chức năng «xoá dữ liệu» **chưa có trong mã** ⇒ TC-135 để «Chưa làm» | chưa có |
| 10 | Hạn mức gói Miễn phí | **Tạm chốt, chờ anh Thanh duyệt giá**: Miễn phí 1 Con, tối đa 2 thiết bị, đủ khoá/nhiệm vụ/điểm/cửa hàng; trả phí thêm Con, thiết bị không giới hạn, báo cáo nâng cao, AI đánh giá. Mã **chưa có giới hạn gói** | chưa có |
