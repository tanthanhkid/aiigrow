# Thiết kế đã chốt — xuất từ aiigrow-figma

Nguồn: bàn https://aiigrow-figma.aiilab.vn (Nghi chốt 03–04/11/2026), bản sao lưu `tanthanhkid/aiigrow-thiet-ke` brainstorm-ui.
Mỗi màn = HTML phiên bản hiện hành. `data-toi="<key>"` trên nút = màn đích khi bấm. Mở file .html trong trình duyệt để xem.
Tổng 436 màn, 21 hành trình.


## Ba Mẹ · Hằng ngày (`bm-hang-ngay`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-trang-chu`](bm-hang-ngay/01-bm2-trang-chu.html) | Trang chủ | 375×812 | Thẻ nhiệm vụ: 2 việc chờ duyệt mở thẳng màn bằng chứng; nút «Xem bằng chứng, duyệt 2 việc» (Đọc sách nộp ghi âm). Phần còn lại giữ nguyên. |
| 2 | [`them-1mnk3mjz`](bm-hang-ngay/02-them-1mnk3mjz.html) | Hôm nay · máy con mất mạng | 375×812 |  |
| 3 | [`them-sll7clha`](bm-hang-ngay/03-them-sll7clha.html) | Xác nhận khoá mọi máy | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 4 | [`them-6wjhze1d`](bm-hang-ngay/04-them-6wjhze1d.html) | Cho thêm giờ | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 5 | [`them-rz77kk45`](bm-hang-ngay/05-them-rz77kk45.html) | Mã mở máy cho Bảo Anh | 375×812 |  |
| 6 | [`them-s8nltlaa`](bm-hang-ngay/06-them-s8nltlaa.html) | Đã mở máy bằng mã | 375×812 |  |
| 7 | [`bm2-may-ds`](bm-hang-ngay/07-bm2-may-ds.html) | Máy của con | 375×812 | Làm lại Ghép thêm máy theo logic Sếp 03/11: ít chữ nhiều hình, ghép bằng mã 6 số/QR, máy mới chạy Chỉ app được phép, CTA nói kết quả. |
| 8 | [`bm2-may-m1`](bm-hang-ngay/08-bm2-may-m1.html) | Chi tiết máy (tuân thủ) | 375×812 | Thêm một hàng «Mã mở máy khi mất mạng» (→ màn Mã mở máy cho Bảo Anh, them-rz77kk45) giữa «Chỉ app Ba Mẹ cho phép» và «Con xin mở YouTube»; thu khối đầu lại một chút cho vừa khung. Phần còn lại giữ y. |
| 9 | [`them-tw6apkag`](bm-hang-ngay/09-them-tw6apkag.html) | Đổi tên Laptop | 375×812 |  |
| 10 | [`them-v4ovqk42`](bm-hang-ngay/10-them-v4ovqk42.html) | Gỡ Laptop? | 375×812 |  |
| 11 | [`bm2-may-m2`](bm-hang-ngay/11-bm2-may-m2.html) | Chi tiết máy (lệch chuẩn) | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 12 | [`them-4e4o5c72`](bm-hang-ngay/12-them-4e4o5c72.html) | Đổi tên iPad | 375×812 |  |
| 13 | [`them-18q14mik`](bm-hang-ngay/13-them-18q14mik.html) | Gỡ iPad? | 375×812 |  |
| 14 | [`them-slv33bgc`](bm-hang-ngay/14-them-slv33bgc.html) | Hướng dẫn sửa iPad | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 15 | [`bm2-gio`](bm-hang-ngay/15-bm2-gio.html) | Giờ dùng máy | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 16 | [`them-i3wcjm6v`](bm-hang-ngay/16-them-i3wcjm6v.html) | Chọn giờ ngủ | 375×812 | Tách khỏi Chọn giờ ngủ (Lần đầu): bản gộp mang nền Bước Giờ chơi + thanh bước của luồng Lần đầu. Về lại bản Hằng ngày v3. |
| 17 | [`them-3ima20g6`](bm-hang-ngay/17-them-3ima20g6.html) | Giờ học | 375×812 |  |
| 18 | [`bm2-ho-so`](bm-hang-ngay/18-bm2-ho-so.html) | Hồ sơ con | 375×812 | PIN 06/11 (xem trước): mục «Về Bảo Anh» thêm dòng «PIN vào máy · Đặt lại» → màn MỚI PIN · PIN của Bảo Anh (xem / đặt lại). Thêm thuần. |
| 19 | [`them-z2fyhohj`](bm-hang-ngay/19-them-z2fyhohj.html) | PIN của Bảo Anh (xem / đặt lại) | 375×812 | Ổ khoá thu nhỏ, lên góc trên phải, không đè «PIN của Bảo Anh». |
| 20 | [`them-vnl5rmnz`](bm-hang-ngay/20-them-vnl5rmnz.html) | Sửa hồ sơ Bảo Anh | 375×812 |  |
| 21 | [`them-y5iwt1fv`](bm-hang-ngay/21-them-y5iwt1fv.html) | Mã PIN của Bảo Anh | 375×812 |  |
| 22 | [`them-canktzlq`](bm-hang-ngay/22-them-canktzlq.html) | Xoá hồ sơ Bảo Anh? | 375×812 |  |
| 23 | [`them-a4nqjrmp`](bm-hang-ngay/23-them-a4nqjrmp.html) | Con xin dùng (chờ duyệt) | 375×812 |  |
| 24 | [`them-1ypcydle`](bm-hang-ngay/24-them-1ypcydle.html) | Đã cho mở YouTube | 375×812 |  |
| 25 | [`them-3wp5ty1o`](bm-hang-ngay/25-them-3wp5ty1o.html) | Đã cho thêm 20 phút | 375×812 |  |
| 26 | [`them-s093fsk4`](bm-hang-ngay/26-them-s093fsk4.html) | Đã không cho | 375×812 |  |
| 27 | [`them-nl1nwszs`](bm-hang-ngay/27-them-nl1nwszs.html) | Duyệt nhiệm vụ | 375×812 | Danh sách chờ duyệt: mỗi việc 1 thẻ có bằng chứng thu nhỏ (ảnh phòng / ghi âm 20:14), giờ nộp, sao; bấm thẻ mở màn bằng chứng; Duyệt cả 2 · +20 sao |
| 28 | [`them-qwuifjry`](bm-hang-ngay/28-them-qwuifjry.html) | Bằng chứng · Dọn phòng | 375×812 |  |
| 29 | [`them-nxclxlit`](bm-hang-ngay/29-them-nxclxlit.html) | Nhờ làm lại · Dọn phòng | 375×812 |  |
| 30 | [`them-d40e3495`](bm-hang-ngay/30-them-d40e3495.html) | Bằng chứng · Đọc sách | 375×812 |  |
| 31 | [`them-l0saosnz`](bm-hang-ngay/31-them-l0saosnz.html) | Nhờ làm lại · Đọc sách | 375×812 |  |
| 32 | [`them-4u3doee9`](bm-hang-ngay/32-them-4u3doee9.html) | Đã nhờ con làm lại | 375×812 |  |
| 33 | [`them-493dqo4i`](bm-hang-ngay/33-them-493dqo4i.html) | Duyệt xong · con nhận sao | 375×812 | Duyệt 1 việc (Dọn phòng): +10 sao, ví 30 → 40; lời khen đã chọn ở màn bằng chứng; nút Duyệt tiếp Đọc sách / Về Trang chủ |
| 34 | [`them-zj9gmh7t`](bm-hang-ngay/34-them-zj9gmh7t.html) | Duyệt xong cả 2 · 30 → 50 sao | 375×812 |  |
| 35 | [`them-oypre8gc`](bm-hang-ngay/35-them-oypre8gc.html) | Không còn việc chờ duyệt | 375×812 |  |
| 36 | [`them-rqioc0fd`](bm-hang-ngay/36-them-rqioc0fd.html) | Mất mạng khi đang duyệt | 375×812 |  |
| 37 | [`them-0xf9hrgn`](bm-hang-ngay/37-them-0xf9hrgn.html) | Thông báo | 375×812 | Giá quà theo bảng 06/11: thông báo Bảo Anh đổi 50 sao lấy «Chọn món bữa tối» |
| 38 | [`them-lsf4eews`](bm-hang-ngay/38-them-lsf4eews.html) | Cảnh báo: trang bị chặn | 375×812 |  |
| 39 | [`them-c95l1cwc`](bm-hang-ngay/39-them-c95l1cwc.html) | Hôm nay con dùng gì | 375×812 |  |
| 40 | [`them-e91jg28j`](bm-hang-ngay/40-them-e91jg28j.html) | Tab Nhiệm vụ | 375×812 | Giá quà theo bảng 06/11: quà chờ trao là «Chọn món bữa tối» 50 sao |
| 41 | [`them-e44cwmvu`](bm-hang-ngay/41-them-e44cwmvu.html) | Nhiệm vụ trống · Bảo Minh | 375×812 |  |
| 42 | [`them-ncq0jtzo`](bm-hang-ngay/42-them-ncq0jtzo.html) | Sửa việc «Dọn phòng» | 375×812 |  |
| 43 | [`them-4axhvgpl`](bm-hang-ngay/43-them-4axhvgpl.html) | Xoá việc «Dọn phòng»? | 375×812 |  |
| 44 | [`them-1akngbxb`](bm-hang-ngay/44-them-1akngbxb.html) | Ví sao của con | 375×812 | Giá quà theo bảng 06/11: Bảo Anh vừa đổi «Chọn món bữa tối» 50 sao, Đi ăn kem cần 100 sao |
| 45 | [`them-1jii7k19`](bm-hang-ngay/45-them-1jii7k19.html) | Giao việc theo bộ | 375×812 |  |
| 46 | [`them-0qial10f`](bm-hang-ngay/46-them-0qial10f.html) | Tự đặt việc | 375×812 |  |
| 47 | [`them-5otw85h4`](bm-hang-ngay/47-them-5otw85h4.html) | Trao quà cho con | 375×812 | Nghi chốt 06/11: quà chờ trao — Đi ăn kem · Bảo Anh · đang giữ 100 sao (chưa trừ). «Đã trao» mới trừ sao; thêm «Huỷ & hoàn 100 sao»; giữ «Chưa, để cuối tuần». |
| 48 | [`them-gftgyspn`](bm-hang-ngay/48-them-gftgyspn.html) | Tab Báo cáo | 375×812 |  |
| 49 | [`them-h60stad7`](bm-hang-ngay/49-them-h60stad7.html) | Tab Cả nhà | 375×812 | Tab Cả nhà: thêm ô «+ Mời người nhà» ngay trong mục Người lớn trông con, cùng kiểu ô Thêm con; chú thích 2 quyền bằng icon; bỏ nút nổi đáy; cho cuộn. |
| 50 | [`them-ncmuuqav`](bm-hang-ngay/50-them-ncmuuqav.html) | Tài khoản của bạn | 375×812 |  |
| 51 | [`them-o4k6oei0`](bm-hang-ngay/51-them-o4k6oei0.html) | Đổi mật khẩu | 375×812 |  |
| 52 | [`them-liz6hzww`](bm-hang-ngay/52-them-liz6hzww.html) | Rời nhà? | 375×812 |  |
| 53 | [`them-4vj35r7c`](bm-hang-ngay/53-them-4vj35r7c.html) | Xoá tài khoản? | 375×812 |  |
| 54 | [`them-473f52w6`](bm-hang-ngay/54-them-473f52w6.html) | Quà đổi bằng sao | 375×812 | Nghi chốt 06/11 (BRD FR-04): Danh sách quà của Bảo Anh — 7 quà mặc định đúng bảng giá (bữa tối 50, kem 100 Ba Mẹ trao, AiiCafe 20k 200, đồ chơi 200, phim 300 chỉ cuối tuần, AiiCafe 50k 500, Lego 800 còn 1 bộ), dạng dòng, chọn con, + Thêm quà, cuộn. Bỏ «Thêm 30 phút» (đổi phút ở nút riêng). |
| 55 | [`them-dlul0jlr`](bm-hang-ngay/55-them-dlul0jlr.html) | Thêm quà | 375×812 | Nghi chốt 06/11: Thêm quà từ thư viện mẫu — 5 loại (Thời gian chơi, Voucher AiiCafe, Quà vật lý, Đặc quyền, Tiết kiệm), mỗi mẫu có giá sao gợi ý, quà đã có đánh «Đã có», bấm + để chọn; «Tự đặt quà riêng» mở form Sửa quà. |
| 56 | [`them-79kgpij8`](bm-hang-ngay/56-them-79kgpij8.html) | Sửa quà | 375×812 | Nghi chốt 06/11: Sửa quà — giá sao chỉnh −/+ (Đi ăn kem 100 sao), điều kiện bật/tắt: chỉ cuối tuần, tối đa X lần/tháng, số lượng có sẵn (tồn kho), Ba Mẹ xác nhận khi trao; giữ Áp cho, Lưu, Xoá quà. |
| 57 | [`them-7vmoufz3`](bm-hang-ngay/57-them-7vmoufz3.html) | Thành viên | 375×812 |  |
| 58 | [`them-xnbiksmr`](bm-hang-ngay/58-them-xnbiksmr.html) | Mời Bà Hoa rời nhà? | 375×812 |  |
| 59 | [`them-9ozp26pq`](bm-hang-ngay/59-them-9ozp26pq.html) | Thêm con | 375×812 | PIN 06/11 (xem trước): form Thêm con có thêm ô PIN 4 số (Ba Mẹ đặt luôn lúc thêm con, có Ẩn/Hiện); lời Rob nói con chạm tên + PIN để vào máy. Thêm thuần. |
| 60 | [`them-8h2msmht`](bm-hang-ngay/60-them-8h2msmht.html) | App & web của con | 375×812 |  |
| 61 | [`them-2ru3t5iw`](bm-hang-ngay/61-them-2ru3t5iw.html) | Cài đặt thông báo | 375×812 |  |
| 62 | [`them-zxu4yvp3`](bm-hang-ngay/62-them-zxu4yvp3.html) | Hỏi AiiGrow | 375×812 |  |
| 63 | [`them-dmdjjhh1`](bm-hang-ngay/63-them-dmdjjhh1.html) | Nhắn tin AiiGrow | 375×812 | Gộp với AiiLab hỗ trợ (Cài đặt): thêm nút «Hay gặp ›» và 3 gợi ý nhanh (iPad báo lỗi, Ghép máy mới, Đổi sao ra phút) trên ô nhắn. |
| 64 | [`them-5hzkl6p5`](bm-hang-ngay/64-them-5hzkl6p5.html) | Mời người nhà | 375×812 |  |
| 65 | [`them-hfd2drjy`](bm-hang-ngay/65-them-hfd2drjy.html) | Đã gửi lời mời | 375×812 | Dòng «Điện thoại Ba Tuấn sẽ hiện / Xem bên máy Ba Tuấn» không xuống dòng, không chồng thẻ thông báo. |
| 66 | [`them-t49meex8`](bm-hang-ngay/66-them-t49meex8.html) | Xoá quà Đi ăn kem? | 375×812 |  |

## Ba Mẹ · Lần đầu dùng (`bm-lan-dau`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-welcome`](bm-lan-dau/01-bm1-welcome.html) | Chốt 04/11 | 390×844 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 2 | [`bm1-chao`](bm-lan-dau/02-bm1-chao.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 3 | [`bm1-dang-ky`](bm-lan-dau/03-bm1-dang-ky.html) | Sửa tay | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 4 | [`them-ahk69dtl`](bm-lan-dau/04-them-ahk69dtl.html) | Số đã có tài khoản | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 5 | [`bm1-otp`](bm-lan-dau/05-bm1-otp.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 6 | [`them-rlfp7ijt`](bm-lan-dau/06-them-rlfp7ijt.html) | Ba hay Mẹ | 375×812 | Thay từ phương án Theo ý Nghi · Gọn (pa-mvvqf7bd-1), Nghi chốt 31/10 |
| 7 | [`bm1-ob-ten-con`](bm-lan-dau/07-bm1-ob-ten-con.html) | Chốt quà 06/11 · Tiến độ 5 chấm | 375×812 | Thanh tiến độ 5 chấm: Con (đang ở đây) → Nhiệm vụ → Quà → Giờ → Máy |
| 8 | [`them-4sujddkb`](bm-lan-dau/08-them-4sujddkb.html) | Thêm con thứ 2 | 375×812 | Thanh tiến độ 5 chấm: Con (đang ở đây) → Nhiệm vụ → Quà → Giờ → Máy |
| 9 | [`bm1-ob-may`](bm-lan-dau/09-bm1-ob-may.html) | Xoá màn khỏi hành trình | 375×812 | Thay từ phương án Theo ý Nghi · Gọn (pa-mvvqf7bd-1), Nghi chốt 31/10 |
| 10 | [`bm1-ob-ghep`](bm-lan-dau/10-bm1-ob-ghep.html) | Gộp dùng chung — nội dung của «Mã ghép 6 số» | 375×812 | Nghi 04/11: 1 nội dung đúng cho cả 2 luồng (Lần đầu + Ghép thêm máy) — mã 6 số + QR, hàng chia sẻ kiểu iPhone (Zalo, Tin nhắn, Messenger, Sao chép link, Khác…), nút chính «Đã gửi, chờ máy của con», phụ «Để sau», không ghi bước cứng. |
| 11 | [`them-w8q8hcfk`](bm-lan-dau/11-them-w8q8hcfk.html) | Xong rồi (chưa ghép máy) | 375×812 |  |
| 12 | [`them-3xbscpzm`](bm-lan-dau/12-them-3xbscpzm.html) | Bật thông báo | 375×812 | Thay từ phương án Theo ý Nghi · Gọn (pa-mvvqf7bd-1), Nghi chốt 31/10 |
| 13 | [`bm1-ob-mau`](bm-lan-dau/13-bm1-ob-mau.html) | Chốt quà 06/11 · Sang Chọn quà | 375×812 | Nghi chốt 06/11: sau Giao việc có bước Chọn quà (them-s416tfdj). Nút chính → «Giao 5 việc, sang chọn quà»; thanh bước thêm chấm Quà (5 chấm). Còn lại giữ nguyên. |
| 14 | [`them-s416tfdj`](bm-lan-dau/14-them-s416tfdj.html) | Bước · Chọn quà | 375×812 |  |
| 15 | [`them-bwlkjyw5`](bm-lan-dau/15-them-bwlkjyw5.html) | Thêm việc riêng | 375×812 | Nghi 04/11: Thêm việc riêng phải có nhiều tiêu chí — tên + gợi ý, hình, giao cho con nào, số sao, lặp lại, giờ nhắc, cách báo xong, duyệt hay tự cộng sao. |
| 16 | [`bm1-ob-gio`](bm-lan-dau/16-bm1-ob-gio.html) | Chốt quà 06/11 · Tiến độ 5 chấm | 375×812 | Thanh tiến độ 5 chấm: Con ✓ → Nhiệm vụ ✓ → Quà ✓ → Giờ (đang ở đây) → Máy |
| 17 | [`them-hijzsz0z`](bm-lan-dau/17-them-hijzsz0z.html) | Chọn giờ ngủ | 375×812 | Thanh tiến độ 5 chấm: Con ✓ → Nhiệm vụ ✓ → Quà ✓ → Giờ (đang ở đây) → Máy |
| 18 | [`them-mdujxlg2`](bm-lan-dau/18-them-mdujxlg2.html) | Con được dùng app nào? | 375×812 | Thanh tiến độ 5 chấm: Con ✓ → Nhiệm vụ ✓ → Quà ✓ → Giờ (đang ở đây) → Máy |
| 19 | [`them-at57ypdc`](bm-lan-dau/19-them-at57ypdc.html) | Thêm app khác | 375×812 |  |
| 20 | [`them-z8femhpg`](bm-lan-dau/20-them-z8femhpg.html) | Đang chờ máy của con | 375×812 | Thanh tiến độ 5 chấm: Con ✓ → Nhiệm vụ ✓ → Quà ✓ → Giờ ✓ → Máy (đang ở đây) |
| 21 | [`them-pxgipoxg`](bm-lan-dau/21-them-pxgipoxg.html) | Máy mới «Chặn thật» | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 22 | [`bm1-ob-xong`](bm-lan-dau/22-bm1-ob-xong.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 23 | [`them-o76iq8p5`](bm-lan-dau/23-them-o76iq8p5.html) | Ghép thêm máy | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 24 | [`them-xi3mihop`](bm-lan-dau/24-them-xi3mihop.html) | Mã ghép 6 số | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 25 | [`them-jfyrm0t5`](bm-lan-dau/25-them-jfyrm0t5.html) | Đang chờ máy của con | 375×812 | Bỏ thanh bước Lần đầu (z8femhpg đã tách); chữ «máy mới»; thêm lại «Mã hết hạn rồi? Lấy mã mới» của bản Ghép thêm máy. |
| 26 | [`them-43yoo1by`](bm-lan-dau/26-them-43yoo1by.html) | Đã ghép iPad của Bảo Anh | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 27 | [`bm1-dang-nhap`](bm-lan-dau/27-bm1-dang-nhap.html) | Liên kết «Cần giúp?» → AiiLab hỗ trợ (MCP) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 28 | [`them-yywse9ag`](bm-lan-dau/28-them-yywse9ag.html) | Quên mật khẩu | 390×844 | Làm lại Lần đầu dùng theo logic mới: tối giản, hình thay chữ, mỗi màn 1 việc + CTA nói rõ kết quả; chỉ phụ huynh đăng ký; bỏ Bật thông báo, Ba hay Mẹ; gộp Welcome+Chào, Thiết bị+Ghép máy; nhiệm vụ chọn theo bộ. |
| 29 | [`them-2g3zpiie`](bm-lan-dau/29-them-2g3zpiie.html) | Quên mật khẩu | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 30 | [`them-rwe0b1yq`](bm-lan-dau/30-them-rwe0b1yq.html) | Quên mật khẩu · Nhập mã | 375×812 | Nghi chọn gộp nhập mã vào màn Quên mật khẩu (phương án pa-mw007t65-1); màn tách riêng không dùng nữa |
| 31 | [`them-6aomy24b`](bm-lan-dau/31-them-6aomy24b.html) | Đặt mật khẩu mới | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 32 | [`them-rsbh0ep6`](bm-lan-dau/32-them-rsbh0ep6.html) | Nhận lời mời (thông báo) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 33 | [`them-ux0c23p4`](bm-lan-dau/33-them-ux0c23p4.html) | Chào (được mời) | 375×812 | Sửa thẻ lời mời bị cắt chữ (cho xuống dòng, cụm B M không co). |
| 34 | [`them-0zrwe8yz`](bm-lan-dau/34-them-0zrwe8yz.html) | Đăng ký (được mời) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 35 | [`them-pacl0mle`](bm-lan-dau/35-them-pacl0mle.html) | Nhập mã xác thực (được mời) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 36 | [`bm1-moi`](bm-lan-dau/36-bm1-moi.html) | Gộp dùng chung — nội dung của «Lời mời · A5 Ba Tuấn vào nhà (máy Ba Tuấn)» | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 37 | [`them-hjjdppuw`](bm-lan-dau/37-them-hjjdppuw.html) | MỚI PIN · Đặt PIN cho Bảo Anh | 375×812 | Chốt PIN 06/11: màn thừa |

## Ba Mẹ · Ứng dụng & web (`bm-ung-dung`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-ung-dung-may`](bm-ung-dung/01-bm2-ung-dung-may.html) | Ứng dụng trên máy | 375×812 | Làm lại Ứng dụng & web theo logic Sếp 03/11: chỉ 2 chế độ chặn, app mới xin Ba Mẹ duyệt, ít chữ nhiều hình, CTA nói kết quả, khớp số với Hằng ngày. |
| 2 | [`them-vw103x88`](bm-ung-dung/02-them-vw103x88.html) | Thêm app cho Bảo Anh | 375×812 |  |
| 3 | [`bm2-app-web`](bm-ung-dung/03-bm2-app-web.html) | Ứng dụng (chưa xếp) | 375×812 | Làm lại Ứng dụng & web theo logic Sếp 03/11: chỉ 2 chế độ chặn, app mới xin Ba Mẹ duyệt, ít chữ nhiều hình, CTA nói kết quả, khớp số với Hằng ngày. |
| 4 | [`them-f6uevhi9`](bm-ung-dung/04-them-f6uevhi9.html) | Đã chặn Roblox | 375×812 |  |
| 5 | [`bm2-web`](bm-ung-dung/05-bm2-web.html) | Trang web | 375×812 | Làm lại Ứng dụng & web theo logic Sếp 03/11: chỉ 2 chế độ chặn, app mới xin Ba Mẹ duyệt, ít chữ nhiều hình, CTA nói kết quả, khớp số với Hằng ngày. |
| 6 | [`them-yzl99l3y`](bm-ung-dung/06-them-yzl99l3y.html) | Thêm trang web cho Bảo Anh | 375×812 |  |
| 7 | [`them-1g0mpf21`](bm-ung-dung/07-them-1g0mpf21.html) | Luôn chặn | 375×812 | Làm lại Ứng dụng & web theo logic Sếp 03/11: chỉ 2 chế độ chặn, app mới xin Ba Mẹ duyệt, ít chữ nhiều hình, CTA nói kết quả, khớp số với Hằng ngày. |
| 8 | [`them-hppe9qh6`](bm-ung-dung/08-them-hppe9qh6.html) | Đã không cho | 375×812 | Làm lại Ứng dụng & web theo logic Sếp 03/11: chỉ 2 chế độ chặn, app mới xin Ba Mẹ duyệt, ít chữ nhiều hình, CTA nói kết quả, khớp số với Hằng ngày. |
| 9 | [`bm2-yeu-cau-web`](bm-ung-dung/09-bm2-yeu-cau-web.html) | Yêu cầu mở web | 375×812 | Làm lại Ứng dụng & web theo logic Sếp 03/11: chỉ 2 chế độ chặn, app mới xin Ba Mẹ duyệt, ít chữ nhiều hình, CTA nói kết quả, khớp số với Hằng ngày. |

## Con Windows · Bị chặn (`con-bi-chan`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-ngxcf4sq`](con-bi-chan/01-them-ngxcf4sq.html) | Desktop Windows của Bảo Anh | 1920×1080 |  |
| 2 | [`them-6e8fjgax`](con-bi-chan/02-them-6e8fjgax.html) | Desktop Windows của Bảo Anh | 800×500 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 3 | [`cmt-chan-app`](con-bi-chan/03-cmt-chan-app.html) | Xoá màn khỏi hành trình | 388×397 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 4 | [`them-vc4dmaei`](con-bi-chan/04-them-vc4dmaei.html) | App chưa được mở | 1920×1080 |  |
| 5 | [`them-sh9osdwe`](con-bi-chan/05-them-sh9osdwe.html) | Đã gửi Ba Mẹ (xin app) | 388×397 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 6 | [`them-cbdu6n78`](con-bi-chan/06-them-cbdu6n78.html) | Đã gửi Ba Mẹ (xin app) | 1920×1080 |  |
| 7 | [`them-6v9ousjb`](con-bi-chan/07-them-6v9ousjb.html) | Ba Mẹ đã cho phép app | 388×397 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 8 | [`them-jj6fglkl`](con-bi-chan/08-them-jj6fglkl.html) | Ba Mẹ đã cho phép app | 1920×1080 |  |
| 9 | [`them-kzlo6qyy`](con-bi-chan/09-them-kzlo6qyy.html) | Ba Mẹ chưa cho app | 388×397 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 10 | [`them-fliq9312`](con-bi-chan/10-them-fliq9312.html) | Ba Mẹ chưa cho app | 1920×1080 |  |
| 11 | [`cmt-chan-app-het-diem`](con-bi-chan/11-cmt-chan-app-het-diem.html) | Xoá màn khỏi hành trình | 388×352 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 12 | [`them-zxuekzer`](con-bi-chan/12-them-zxuekzer.html) | Hết giờ (popup) | 1920×1080 |  |
| 13 | [`cmt-xin-them-gio-tu-man-chan`](con-bi-chan/13-cmt-xin-them-gio-tu-man-chan.html) | Xoá màn khỏi hành trình | 428×402 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 14 | [`them-rgy15s87`](con-bi-chan/14-them-rgy15s87.html) | Xin thêm giờ từ màn chặn | 1920×1080 |  |
| 15 | [`them-afwui3ej`](con-bi-chan/15-them-afwui3ej.html) | Trang web Ba Mẹ đã chặn | 388×392 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 16 | [`them-dnm1pzqs`](con-bi-chan/16-them-dnm1pzqs.html) | Trang web Ba Mẹ đã chặn | 1920×1080 |  |
| 17 | [`them-40in6yjh`](con-bi-chan/17-them-40in6yjh.html) | Đã gửi Ba Mẹ (xin web) | 388×397 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 18 | [`them-bsnppls7`](con-bi-chan/18-them-bsnppls7.html) | Đã gửi Ba Mẹ (xin web) | 1920×1080 |  |
| 19 | [`them-q5wurp9z`](con-bi-chan/19-them-q5wurp9z.html) | Ba Mẹ mở trang web | 388×397 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 20 | [`them-0uw5wpyr`](con-bi-chan/20-them-0uw5wpyr.html) | Ba Mẹ mở trang web | 1920×1080 |  |
| 21 | [`them-irap20yn`](con-bi-chan/21-them-irap20yn.html) | Ba Mẹ chưa mở trang web | 388×397 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 22 | [`them-nle7pkdv`](con-bi-chan/22-them-nle7pkdv.html) | Ba Mẹ chưa mở trang web | 1920×1080 |  |
| 23 | [`cmt-mac-chan-app`](con-bi-chan/23-cmt-mac-chan-app.html) | Xoá màn khỏi hành trình | 400×360 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 24 | [`them-brenpy6m`](con-bi-chan/24-them-brenpy6m.html) | Đã gửi Ba Mẹ (Mac) | 400×360 | Dời sang hành trình Mac (Nghi ok 04/11) |

## Ba Mẹ · Duyệt (`bm-duyet`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm3-duyet-thong-bao`](bm-duyet/01-bm3-duyet-thong-bao.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 2 | [`bm3-duyet-cho-duyet`](bm-duyet/02-bm3-duyet-cho-duyet.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 3 | [`them-tvslfil9`](bm-duyet/03-them-tvslfil9.html) | Vừa cho thêm giờ · Hoàn tác | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 4 | [`bm3-duyet-canh-bao`](bm-duyet/04-bm3-duyet-canh-bao.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 5 | [`bm3-duyet-canh-bao-chi-tiet`](bm-duyet/05-bm3-duyet-canh-bao-chi-tiet.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 6 | [`bm3-duyet-them-gio`](bm-duyet/06-bm3-duyet-them-gio.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 7 | [`them-nbpdzbs6`](bm-duyet/07-them-nbpdzbs6.html) | Duyệt app, web mới | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 8 | [`bm3-duyet-nhiem-vu`](bm-duyet/08-bm3-duyet-nhiem-vu.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 9 | [`bm3-duyet-xong`](bm-duyet/09-bm3-duyet-xong.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 10 | [`bm3-duyet-trong`](bm-duyet/10-bm3-duyet-trong.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |
| 11 | [`bm3-duyet-mat-mang`](bm-duyet/11-bm3-duyet-mat-mang.html) | Xoá màn khỏi hành trình | 375×812 | Nghi ok 03/11: Hằng ngày đã thay |

## Ba Mẹ · Cài đặt & hỗ trợ (`bm-cai-dat`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-gia-dinh`](bm-cai-dat/01-bm2-gia-dinh.html) | Gia đình | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 2 | [`them-imxhxh6i`](bm-cai-dat/02-them-imxhxh6i.html) | Lời mời · 0 Sơ đồ luồng | 1200×640 | Sơ đồ luồng mời cũ, không phải màn app, không nút nào trỏ tới — Nghi cho xoá 04/11 |
| 3 | [`them-99ji705p`](bm-cai-dat/03-them-99ji705p.html) | Tab Cả nhà | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 4 | [`them-0uobhmvh`](bm-cai-dat/04-them-0uobhmvh.html) | Mời người nhà | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 5 | [`them-wewdno56`](bm-cai-dat/05-them-wewdno56.html) | Lời mời · A3 Đã mời, Ba Tuấn có app (Mẹ) | 375×812 | Dòng «Điện thoại Ba Tuấn sẽ hiện / Xem bên máy Ba Tuấn» không xuống dòng, không chồng thẻ thông báo. |
| 6 | [`them-dclemm2i`](bm-cai-dat/06-them-dclemm2i.html) | Lời mời · A4 Thông báo (máy Ba Tuấn) | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 7 | [`them-vpveq9u5`](bm-cai-dat/07-them-vpveq9u5.html) | Lời mời · A5 Ba Tuấn vào nhà (máy Ba Tuấn) | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 8 | [`them-mflye65x`](bm-cai-dat/08-them-mflye65x.html) | Lời mời · B3 Đã mời, Ba Tuấn chưa có app (Mẹ) | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 9 | [`them-6pl067n2`](bm-cai-dat/09-them-6pl067n2.html) | Lời mời · B4 Ba Tuấn nhận link (máy Ba Tuấn) | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 10 | [`them-3ajv6rd1`](bm-cai-dat/10-them-3ajv6rd1.html) | Đăng ký (được mời) | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 11 | [`them-8ohkxfrs`](bm-cai-dat/11-them-8ohkxfrs.html) | Lời mời · B6 Ba Tuấn vào nhà (máy Ba Tuấn) | 375×812 | Mồ côi: bước B6 cũ, trùng màn Vào nhà đã chốt (Nghi duyệt 04/11) |
| 12 | [`bm2-thanh-vien`](bm-cai-dat/12-bm2-thanh-vien.html) | Thành viên | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 13 | [`them-879pbi6w`](bm-cai-dat/13-them-879pbi6w.html) | Nhập mã mời (người được mời) | 375×812 | Anh Thành 03/11 bỏ mã mời; Nghi cho phép xoá |
| 14 | [`bm2-thong-bao`](bm-cai-dat/14-bm2-thong-bao.html) | Thông báo | 375×812 | Mồ côi, trùng màn Thông báo của Hằng ngày (them-0xf9hrgn) (Nghi duyệt 04/11) |
| 15 | [`bm2-thong-bao-cai-dat`](bm-cai-dat/15-bm2-thong-bao-cai-dat.html) | Cài đặt thông báo | 375×812 | Mồ côi sau khi xoá bm2-thong-bao, trùng them-2ru3t5iw Cài đặt thông báo (Nghi duyệt 04/11) |
| 16 | [`bm2-ho-tro`](bm-cai-dat/16-bm2-ho-tro.html) | AiiLab hỗ trợ | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 17 | [`bm2-quy`](bm-cai-dat/17-bm2-quy.html) | Quỹ phiếu quà | 375×812 | Nghi chốt 06/11 (BRD FR-04): Danh sách quà của Bảo Anh — 7 quà mặc định đúng bảng giá (bữa tối 50, kem 100 Ba Mẹ trao, AiiCafe 20k 200, đồ chơi 200, phim 300 chỉ cuối tuần, AiiCafe 50k 500, Lego 800 còn 1 bộ), dạng dòng, chọn con, + Thêm quà, cuộn. Bỏ «Thêm 30 phút» (đổi phút ở nút riêng). |
| 18 | [`bm2-admin-ho-tro`](bm-cai-dat/18-bm2-admin-ho-tro.html) | Hộp thư hỗ trợ (quản trị) | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |

## Con Windows · Xin thêm giờ / xin mở (`con-xin`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cmt-xin-them-gio`](con-xin/01-cmt-xin-them-gio.html) | Xoá màn khỏi hành trình | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 2 | [`them-xsmcu9jj`](con-xin/02-them-xsmcu9jj.html) | Xin thêm giờ | 1920×1080 |  |
| 3 | [`them-y2kh4uon`](con-xin/03-them-y2kh4uon.html) | Đã gửi Ba Mẹ (xin giờ) | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 4 | [`them-luui7gvq`](con-xin/04-them-luui7gvq.html) | Đã gửi Ba Mẹ (xin giờ) | 1920×1080 |  |
| 5 | [`them-g333ec9h`](con-xin/05-them-g333ec9h.html) | Ba Mẹ cho thêm giờ | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 6 | [`them-fsif1cbl`](con-xin/06-them-fsif1cbl.html) | Ba Mẹ cho thêm giờ | 1920×1080 |  |
| 7 | [`them-fyw99cr2`](con-xin/07-them-fyw99cr2.html) | Ba Mẹ chưa cho thêm giờ | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 8 | [`them-zo8kohea`](con-xin/08-them-zo8kohea.html) | Ba Mẹ chưa cho thêm giờ | 1920×1080 |  |
| 9 | [`them-x7u51du7`](con-xin/09-them-x7u51du7.html) | Xin mở app (YouTube) | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 10 | [`them-bxw40sw9`](con-xin/10-them-bxw40sw9.html) | Xin mở app (YouTube) | 1920×1080 |  |
| 11 | [`them-ddtplxnd`](con-xin/11-them-ddtplxnd.html) | Đã gửi Ba Mẹ (xin mở app) | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 12 | [`them-6tn8aozf`](con-xin/12-them-6tn8aozf.html) | Đã gửi Ba Mẹ (xin mở app) | 1920×1080 |  |
| 13 | [`them-v6n4ux2f`](con-xin/13-them-v6n4ux2f.html) | Ba Mẹ cho mở app | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 14 | [`them-359v1pre`](con-xin/14-them-359v1pre.html) | Ba Mẹ cho mở app | 1920×1080 |  |
| 15 | [`them-7cenz93o`](con-xin/15-them-7cenz93o.html) | Ba Mẹ chưa cho mở app | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 16 | [`them-vkdikuo0`](con-xin/16-them-vkdikuo0.html) | Ba Mẹ chưa cho mở app | 1920×1080 |  |
| 17 | [`cmt-mac-xin-them`](con-xin/17-cmt-mac-xin-them.html) | Xoá màn khỏi hành trình | 440×371 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 18 | [`cmt-mac-xin-them-doi-diem`](con-xin/18-cmt-mac-xin-them-doi-diem.html) | Xoá màn khỏi hành trình | 440×429 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 19 | [`cmt-mac-xin-mo`](con-xin/19-cmt-mac-xin-mo.html) | Xoá màn khỏi hành trình | 440×395 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 20 | [`them-4q7vywvi`](con-xin/20-them-4q7vywvi.html) | Đã gửi Ba Mẹ (Mac) | 440×352 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 21 | [`cmt-choi-bang-diem`](con-xin/21-cmt-choi-bang-diem.html) | Xoá màn khỏi hành trình | 465×378 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 22 | [`them-a7sh10qs`](con-xin/22-them-a7sh10qs.html) | Đổi sao lấy giờ | 1920×1080 |  |
| 23 | [`cmt-mac-choi-bang-diem`](con-xin/23-cmt-mac-choi-bang-diem.html) | Xoá màn khỏi hành trình | 420×438 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 24 | [`them-t75b4feq`](con-xin/24-them-t75b4feq.html) | Đã đổi: +30 phút chơi | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 25 | [`them-8e93d001`](con-xin/25-them-8e93d001.html) | Đã đổi: +10 phút | 1920×1080 |  |
| 26 | [`them-d0xs64q1`](con-xin/26-them-d0xs64q1.html) | Chưa đủ sao | 465×378 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 27 | [`them-l60r9s84`](con-xin/27-them-l60r9s84.html) | Chưa đủ sao | 1920×1080 |  |
| 28 | [`them-8ujv2jpx`](con-xin/28-them-8ujv2jpx.html) | Đã đổi: +30 phút chơi (Mac) | 420×330 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 29 | [`them-07bvyunz`](con-xin/29-them-07bvyunz.html) | Ba Mẹ cho thêm giờ (Mac) | 440×320 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 30 | [`them-hxaf8f3e`](con-xin/30-them-hxaf8f3e.html) | Ba Mẹ chưa cho thêm giờ (Mac) | 440×380 | Dời sang hành trình Mac (Nghi ok 04/11) |

## Con Windows · Ngày thường (`con-ngay-thuong`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-x8kmmyl5`](con-ngay-thuong/01-them-x8kmmyl5.html) | Chọn tên (máy khoá) | 1920×1080 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 2 | [`them-avcvmgti`](con-ngay-thuong/02-them-avcvmgti.html) | Nhập PIN | 1920×1080 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 3 | [`them-4trpyz1a`](con-ngay-thuong/03-them-4trpyz1a.html) | PIN chưa đúng | 1920×1080 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 4 | [`them-xfdsj5f9`](con-ngay-thuong/04-them-xfdsj5f9.html) | Sai 5 lần, chờ 15 giây | 1920×1080 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 5 | [`them-ggoenl0j`](con-ngay-thuong/05-them-ggoenl0j.html) | Quên PIN | 1920×1080 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 6 | [`them-kn2t9e31`](con-ngay-thuong/06-them-kn2t9e31.html) | Ba Mẹ nhập mã | 1920×1080 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 7 | [`them-81u7lml4`](con-ngay-thuong/07-them-81u7lml4.html) | Ba Mẹ đang dùng máy | 1920×1080 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 8 | [`them-7puhbc72`](con-ngay-thuong/08-them-7puhbc72.html) | Đổi bé / Đăng xuất | 1002×712 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 9 | [`cmt-hom-nay`](con-ngay-thuong/09-cmt-hom-nay.html) | Chốt PIN máy tính 06/11 | 1002×712 | Thanh bên có ảnh bé + «Đổi bé / Đăng xuất»; «Ba Mẹ dùng máy» thu nhỏ. |
| 10 | [`cmt-nhiem-vu-loi-tai`](con-ngay-thuong/10-cmt-nhiem-vu-loi-tai.html) | Liên kết «Ba Mẹ dùng máy» → MỚI PIN · Win · Ba Mẹ nhập mã (MCP) | 1002×712 | App của con 9 tuổi trên Windows, ít chữ nhiều hình, chỉ dùng «sao» (10 sao = 10 phút). Hôm nay: còn 18 phút (42/60), 30 sao, 5 nhiệm vụ bộ Tự lập. Nộp ảnh Dọn phòng, ghi âm Đọc sách (viết nếu cần) → chờ duyệt → +10 sao (30→40) hoặc nhờ làm lại. Sao & quà: đổi 10 sao lấy 10 phút, đổi quà gửi Ba Mẹ → Ba Mẹ trao quà. Tin nhắn của Mẹ Lan, Bà Hoa. Màn Mac giữ nguyên. |
| 11 | [`cmt-nhiem-vu`](con-ngay-thuong/11-cmt-nhiem-vu.html) | Liên kết «Ba Mẹ dùng máy» → MỚI PIN · Win · Ba Mẹ nhập mã (MCP) | 1002×712 | 3 việc «Chưa làm» có nút: Tự đánh răng/Tự xếp cặp «Nộp ảnh» → nộp ảnh; Học với AiiRob tự chấm → «Mở Học với AiiRob». |
| 12 | [`cmt-nop-bai-viet`](con-ngay-thuong/12-cmt-nop-bai-viet.html) | Xoá màn khỏi hành trình | 465×522 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 13 | [`them-1a8jjxnr`](con-ngay-thuong/13-them-1a8jjxnr.html) | Nộp bài: viết kể lại | 1920×1080 |  |
| 14 | [`them-8hxwk83c`](con-ngay-thuong/14-them-8hxwk83c.html) | Đã nộp bài · chờ Ba Mẹ | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 15 | [`them-5vkmq82e`](con-ngay-thuong/15-them-5vkmq82e.html) | Đã nộp bài · chờ Ba Mẹ | 1920×1080 |  |
| 16 | [`them-to3n4hoj`](con-ngay-thuong/16-them-to3n4hoj.html) | Ba Mẹ duyệt bài · cộng điểm | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 17 | [`them-bv15j9q4`](con-ngay-thuong/17-them-bv15j9q4.html) | Ba Mẹ duyệt · +10 sao | 1920×1080 |  |
| 18 | [`them-d42qt32g`](con-ngay-thuong/18-them-d42qt32g.html) | Ba Mẹ nhờ bổ sung bài | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 19 | [`them-52srshg0`](con-ngay-thuong/19-them-52srshg0.html) | Ba Mẹ nhờ bổ sung bài | 1920×1080 |  |
| 20 | [`them-zog8xsfj`](con-ngay-thuong/20-them-zog8xsfj.html) | Ba Mẹ nhờ chụp lại ảnh | 1920×1080 |  |
| 21 | [`cmt-nop-bai-anh-bo-sung`](con-ngay-thuong/21-cmt-nop-bai-anh-bo-sung.html) | Xoá màn khỏi hành trình | 465×522 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 22 | [`them-zeess8mf`](con-ngay-thuong/22-them-zeess8mf.html) | Nộp lại: chọn ảnh bổ sung | 1920×1080 |  |
| 23 | [`cmt-phan-qua`](con-ngay-thuong/23-cmt-phan-qua.html) | QUÀ 06/11 · Win Sao & quà giá mới | 1002×712 | Giữ nguyên kiểu Windows và 30 sao. Bảng quà theo giá Nghi chốt 06/11 (7 quà, có điều kiện), Đi ăn kem đang giữ 100 sao chờ Ba Mẹ trao; bỏ «Thêm 30 phút» khỏi cửa hàng (phút đổi bằng nút riêng); bữa tối nổi bật còn thiếu 20 sao → màn Đổi quà; danh sách cuộn, hàng cuối lấp ló. |
| 24 | [`cmt-vi-qua`](con-ngay-thuong/24-cmt-vi-qua.html) | Chốt quà 06/11 · Ví quà | 1002×712 | Giữ nguyên màn Windows. Đi ăn kem: đang giữ 100 sao, Ba Mẹ trao mới trừ. «Đã nhận» thay Xem phim 40 sao bằng Voucher AiiCafe 50k (500 sao) có mã QR bấm mở, hạn 25/12, còn 49 ngày. |
| 25 | [`cmt-tin-nhan`](con-ngay-thuong/25-cmt-tin-nhan.html) | Liên kết «Ba Mẹ dùng máy» → MỚI PIN · Win · Ba Mẹ nhập mã (MCP) | 1002×712 | App của con 9 tuổi trên Windows, ít chữ nhiều hình, chỉ dùng «sao» (10 sao = 10 phút). Hôm nay: còn 18 phút (42/60), 30 sao, 5 nhiệm vụ bộ Tự lập. Nộp ảnh Dọn phòng, ghi âm Đọc sách (viết nếu cần) → chờ duyệt → +10 sao (30→40) hoặc nhờ làm lại. Sao & quà: đổi 10 sao lấy 10 phút, đổi quà gửi Ba Mẹ → Ba Mẹ trao quà. Tin nhắn của Mẹ Lan, Bà Hoa. Màn Mac giữ nguyên. |
| 26 | [`them-8ae0e45r`](con-ngay-thuong/26-them-8ae0e45r.html) | Ba Mẹ dùng máy | 1920×1080 | Gộp vào them-kn2t9e31 (Ba Mẹ nhập mã, PIN 06/11) |
| 27 | [`cmt-mac-tin-moi`](con-ngay-thuong/27-cmt-mac-tin-moi.html) | Xoá màn khỏi hành trình | 360×185 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 28 | [`cmt-mac-app-hom-nay`](con-ngay-thuong/28-cmt-mac-app-hom-nay.html) | Xoá màn khỏi hành trình | 1000×760 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 29 | [`cmt-mac-app-nhiem-vu`](con-ngay-thuong/29-cmt-mac-app-nhiem-vu.html) | Xoá màn khỏi hành trình | 1000×760 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 30 | [`cmt-mac-nop-bai`](con-ngay-thuong/30-cmt-mac-nop-bai.html) | Xoá màn khỏi hành trình | 460×450 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 31 | [`cmt-mac-app-phan-qua`](con-ngay-thuong/31-cmt-mac-app-phan-qua.html) | Xoá màn khỏi hành trình | 1000×760 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 32 | [`cmt-mac-app-tin-nhan`](con-ngay-thuong/32-cmt-mac-app-tin-nhan.html) | Xoá màn khỏi hành trình | 1000×760 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 33 | [`them-s65giju3`](con-ngay-thuong/33-them-s65giju3.html) | Ba Mẹ đã trao quà | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 34 | [`them-dm6hkqqy`](con-ngay-thuong/34-them-dm6hkqqy.html) | Ba Mẹ đã trao quà | 1920×1080 |  |
| 35 | [`them-yrj2ibrt`](con-ngay-thuong/35-them-yrj2ibrt.html) | Đã gửi Ba Mẹ (đổi quà) | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 36 | [`them-jd003lxp`](con-ngay-thuong/36-them-jd003lxp.html) | Đã gửi Ba Mẹ (đổi quà) | 1920×1080 |  |
| 37 | [`them-jonn19rd`](con-ngay-thuong/37-them-jonn19rd.html) | Đổi quà bằng sao | 428×400 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 38 | [`them-1zxa6ip0`](con-ngay-thuong/38-them-1zxa6ip0.html) | Đổi quà bằng sao | 1920×1080 | Khớp bảng giá quà 06/11: hộp xác nhận đổi Chọn món bữa tối 50 sao (con có 30 sao, còn thiếu 20), danh sách quà đúng giá. |
| 39 | [`them-pxorppas`](con-ngay-thuong/39-them-pxorppas.html) | Mac: Đã nộp bài · chờ Ba Mẹ | 460×340 | Dời sang hành trình Mac (Nghi ok 04/11) |

## Con Windows · Mất mạng / sự cố (`con-mat-mang`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cmt-hom-nay-mat-mang`](con-mat-mang/01-cmt-hom-nay-mat-mang.html) | Liên kết «Ba Mẹ dùng máy» → MỚI PIN · Win · Ba Mẹ nhập mã (MCP) | 1002×712 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 2 | [`cmt-khoa-mat-mang`](con-mat-mang/02-cmt-khoa-mat-mang.html) | Vá rà Con Win 04/11 | 1920×1080 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 3 | [`them-y4zv21p3`](con-mat-mang/03-them-y4zv21p3.html) | Khoá khi mất mạng: mã sai | 1920×1080 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 4 | [`them-dsrf5ift`](con-mat-mang/04-them-dsrf5ift.html) | Đã lưu lời xin thêm giờ (màn khoá) | 1920×1080 |  |
| 5 | [`cmt-mac-man-khoa-ma-offline`](con-mat-mang/05-cmt-mac-man-khoa-ma-offline.html) | Xoá màn khỏi hành trình | 1280×1000 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 6 | [`them-rzhbtyhm`](con-mat-mang/06-them-rzhbtyhm.html) | Mac: đang mở tạm bằng mã | 400×360 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 7 | [`cmt-hom-nay-mo-bang-ma`](con-mat-mang/07-cmt-hom-nay-mo-bang-ma.html) | Liên kết «Ba Mẹ dùng máy» → MỚI PIN · Win · Ba Mẹ nhập mã (MCP) | 1002×712 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 8 | [`cmt-hom-nay-dich-vu-tat`](con-mat-mang/08-cmt-hom-nay-dich-vu-tat.html) | Liên kết «Ba Mẹ dùng máy» → MỚI PIN · Win · Ba Mẹ nhập mã (MCP) | 1002×712 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 9 | [`them-sfpz1iin`](con-mat-mang/09-them-sfpz1iin.html) | Hỏi AiiGrow (Con) | 428×420 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 10 | [`them-yzos9w9i`](con-mat-mang/10-them-yzos9w9i.html) | Hỏi AiiGrow (Con) | 1920×1080 |  |
| 11 | [`cmt-chan-app-mat-mang`](con-mat-mang/11-cmt-chan-app-mat-mang.html) | Xoá màn khỏi hành trình | 388×414 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 12 | [`them-wt782i6x`](con-mat-mang/12-them-wt782i6x.html) | Chặn app khi mất mạng | 1920×1080 |  |
| 13 | [`them-082bos3a`](con-mat-mang/13-them-082bos3a.html) | Đã lưu yêu cầu (chờ có mạng) | 388×414 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 14 | [`them-rn7iaunn`](con-mat-mang/14-them-rn7iaunn.html) | Đã lưu yêu cầu (chờ có mạng) | 1920×1080 |  |
| 15 | [`them-a86wn24i`](con-mat-mang/15-them-a86wn24i.html) | Đã lưu lời xin thêm giờ (mất mạng) | 1920×1080 |  |
| 16 | [`cmt-cap-nhat`](con-mat-mang/16-cmt-cap-nhat.html) | Xoá màn khỏi hành trình | 586×289 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 17 | [`them-yx0id8do`](con-mat-mang/17-them-yx0id8do.html) | Cập nhật AiiGrow | 1920×1080 |  |
| 18 | [`cmt-cap-nhat-da-moi-nhat`](con-mat-mang/18-cmt-cap-nhat-da-moi-nhat.html) | Xoá màn khỏi hành trình | 586×289 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 19 | [`them-o3lgj4dx`](con-mat-mang/19-them-o3lgj4dx.html) | Đã là bản mới nhất | 1920×1080 |  |
| 20 | [`cmt-khay-menu`](con-mat-mang/20-cmt-khay-menu.html) | Xoá màn khỏi hành trình | 335×172 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 21 | [`them-g4d1cfk1`](con-mat-mang/21-them-g4d1cfk1.html) | Menu khay hệ thống | 1920×1080 |  |

## Con Windows · Hết giờ / khoá (`con-het-gio`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cmt-mac-nhac-5-phut`](con-het-gio/01-cmt-mac-nhac-5-phut.html) | Xoá màn khỏi hành trình | 320×126 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 2 | [`cmt-mac-dem-nguoc`](con-het-gio/02-cmt-mac-dem-nguoc.html) | Xoá màn khỏi hành trình | 1280×900 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 3 | [`cmt-mac-man-khoa`](con-het-gio/03-cmt-mac-man-khoa.html) | Xoá màn khỏi hành trình | 1280×860 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 4 | [`them-rv293ums`](con-het-gio/04-them-rv293ums.html) | Nhắc còn 5 phút (Windows) | 400×236 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 5 | [`them-da3zy02w`](con-het-gio/05-them-da3zy02w.html) | Nhắc còn 5 phút (Windows) | 1920×1080 |  |
| 6 | [`cmt-khoa-het-gio-dem-nguoc`](con-het-gio/06-cmt-khoa-het-gio-dem-nguoc.html) | Chốt PIN máy tính 06/11 | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 7 | [`them-uqukvnas`](con-het-gio/07-them-uqukvnas.html) | Hết giờ chơi hôm nay (Windows) | 1920×1080 | Màn khoá hết giờ theo bé: nút nhỏ «Đổi bé» và «Ba Mẹ mở máy» (mã Ba Mẹ). |
| 8 | [`cmt-khoa-gio-ngu`](con-het-gio/08-cmt-khoa-gio-ngu.html) | Chốt PIN máy tính 06/11 | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 9 | [`them-gu5qu088`](con-het-gio/09-them-gu5qu088.html) | Giờ học: chỉ mở app học | 1920×1080 |  |
| 10 | [`cmt-khoa-ba-me-khoa`](con-het-gio/10-cmt-khoa-ba-me-khoa.html) | Chốt PIN máy tính 06/11 | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 11 | [`them-wcpckso8`](con-het-gio/11-them-wcpckso8.html) | Xin Ba Mẹ mở ngoại lệ | 428×400 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 12 | [`them-fexyjjes`](con-het-gio/12-them-fexyjjes.html) | Xin Ba Mẹ mở ngoại lệ | 1920×1080 |  |
| 13 | [`them-ccicio1r`](con-het-gio/13-them-ccicio1r.html) | Xin mở ngoại lệ (giờ học) | 1920×1080 |  |
| 14 | [`them-7p9l2fn2`](con-het-gio/14-them-7p9l2fn2.html) | Đã gửi Ba Mẹ (xin mở ngoại lệ) | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 15 | [`them-tig5bfve`](con-het-gio/15-them-tig5bfve.html) | Đã gửi Ba Mẹ (xin mở ngoại lệ) | 1920×1080 |  |
| 16 | [`them-umbm7vx6`](con-het-gio/16-them-umbm7vx6.html) | Ba Mẹ cho mở ngoại lệ | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 17 | [`them-ya6230ug`](con-het-gio/17-them-ya6230ug.html) | Ba Mẹ cho mở ngoại lệ | 1920×1080 |  |
| 18 | [`them-ndf8q3a7`](con-het-gio/18-them-ndf8q3a7.html) | Ba Mẹ chưa cho mở ngoại lệ | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 19 | [`them-agdu7c52`](con-het-gio/19-them-agdu7c52.html) | Ba Mẹ chưa cho mở ngoại lệ | 1920×1080 |  |

## Con Mac (giữ nguyên) (`con-cai-mac`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cmt-mac-chao`](con-cai-mac/01-cmt-mac-chao.html) | Thêm màn Mac 05/11 | 620×420 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 2 | [`cmt-mac-dieu-khoan`](con-cai-mac/02-cmt-mac-dieu-khoan.html) | Chốt 05/11 | 620×420 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 3 | [`cmt-mac-ghep-may`](con-cai-mac/03-cmt-mac-ghep-may.html) | Thêm màn Mac 05/11 | 460×416 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 4 | [`cmt-mac-ghep-mot-cham`](con-cai-mac/04-cmt-mac-ghep-mot-cham.html) | Chốt 05/11 | 460×414 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 5 | [`them-y68iyzp4`](con-cai-mac/05-them-y68iyzp4.html) | Mã ghép sai (Mac) | 460×416 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 6 | [`them-6vh6qq7u`](con-cai-mac/06-them-6vh6qq7u.html) | Mac: Mã ghép hết hạn | 460×416 |  |
| 7 | [`them-rc5ggdw2`](con-cai-mac/07-them-rc5ggdw2.html) | Mac: Mất mạng khi ghép | 460×416 |  |
| 8 | [`them-x9z1bmlp`](con-cai-mac/08-them-x9z1bmlp.html) | Bật quyền (Mac) | 460×416 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 9 | [`them-0ltdde49`](con-cai-mac/09-them-0ltdde49.html) | Cài xong (Mac) | 460×416 | Cài xong máy khoá lại, nút «Mở màn chọn tên»; giờ tính theo bé. |
| 10 | [`them-5i7p4nf8`](con-cai-mac/10-them-5i7p4nf8.html) | Chọn tên (máy khoá) | 1280×860 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 11 | [`them-yelcxzor`](con-cai-mac/11-them-yelcxzor.html) | Nhập PIN | 1280×860 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 12 | [`them-hw1hai50`](con-cai-mac/12-them-hw1hai50.html) | PIN chưa đúng | 1280×860 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 13 | [`them-g80on1v3`](con-cai-mac/13-them-g80on1v3.html) | Sai 5 lần, chờ 15 giây | 1280×860 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 14 | [`them-f7eaweai`](con-cai-mac/14-them-f7eaweai.html) | Quên PIN | 1280×860 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 15 | [`them-4ihu4j01`](con-cai-mac/15-them-4ihu4j01.html) | Ba Mẹ nhập mã | 1280×860 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 16 | [`them-kyy3xlrg`](con-cai-mac/16-them-kyy3xlrg.html) | Ba Mẹ đang dùng máy | 1280×860 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 17 | [`them-hoxcav7o`](con-cai-mac/17-them-hoxcav7o.html) | Đổi bé / Đăng xuất | 1000×760 | Đăng nhập theo bé: chọn tên + PIN; Ba Mẹ mở máy bằng mã |
| 18 | [`them-fp5wy2y5`](con-cai-mac/18-them-fp5wy2y5.html) | Thông báo tin mới | 360×200 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 19 | [`them-z86gsj81`](con-cai-mac/19-them-z86gsj81.html) | Mac: Hôm nay | 1000×760 | Thanh bên có ảnh bé + «Đổi bé / Đăng xuất»; bỏ hướng dẫn ⌃⌘Q. |
| 20 | [`them-o1pi9nla`](con-cai-mac/20-them-o1pi9nla.html) | Mac: Nhiệm vụ | 1000×760 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 21 | [`them-ixgnaoap`](con-cai-mac/21-them-ixgnaoap.html) | Mac: Nhiệm vụ không tải được | 1000×760 |  |
| 22 | [`them-2ozi68mq`](con-cai-mac/22-them-2ozi68mq.html) | Mac: Nộp bài | 460×450 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 23 | [`them-r6eya42m`](con-cai-mac/23-them-r6eya42m.html) | Mac: Sao & quà | 1000×760 | Danh sách quà Mac đúng bảng giá: kem 100, phim 300 (cuối tuần), bữa tối 50 (còn thiếu 20), đồ chơi 200; bỏ Thêm 30 phút khỏi danh sách quà, giữ nút đổi phút riêng. |
| 24 | [`them-3w616hjq`](con-cai-mac/24-them-3w616hjq.html) | Mac: Đổi quà bằng sao | 440×360 | Hộp đổi quà Mac: Thêm 30 phút bỏ khỏi quà, thay bằng Chọn món bữa tối 50 sao; con có 30 sao nên còn thiếu 20 sao, nút gửi mờ. |
| 25 | [`them-oe5faa6g`](con-cai-mac/25-them-oe5faa6g.html) | Mac: Đã gửi Ba Mẹ (đổi quà) | 440×320 | Màn đã gửi Ba Mẹ: quà là Chọn món bữa tối 50 sao, nói rõ 50 sao đang được giữ, Ba Mẹ trao mới trừ. |
| 26 | [`them-64xsl89l`](con-cai-mac/26-them-64xsl89l.html) | Mac: Ví quà & huy hiệu | 1000×760 | Ví quà: Đi ăn kem 100 sao đang được giữ chờ Ba Mẹ trao; quà đã nhận là Chọn món bữa tối 50 sao. |
| 27 | [`them-rn20lwi7`](con-cai-mac/27-them-rn20lwi7.html) | Mac: Tin nhắn | 1000×760 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 28 | [`them-3ve41yps`](con-cai-mac/28-them-3ve41yps.html) | Mac: Đã nộp bài · chờ Ba Mẹ | 460×340 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 29 | [`them-j77wjvqr`](con-cai-mac/29-them-j77wjvqr.html) | Mac: Ba Mẹ duyệt · +10 sao | 440×320 |  |
| 30 | [`them-m9decu4z`](con-cai-mac/30-them-m9decu4z.html) | Mac: Ba Mẹ nhờ chụp lại ảnh | 440×360 |  |
| 31 | [`them-4wmbhz9f`](con-cai-mac/31-them-4wmbhz9f.html) | Nhắc còn 5 phút | 320×200 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 32 | [`them-vbafecic`](con-cai-mac/32-them-vbafecic.html) | Đếm ngược trên Mac | 1280×900 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 33 | [`them-kofpo0dl`](con-cai-mac/33-them-kofpo0dl.html) | Mac: màn khoá hết giờ | 1280×860 | Màn khoá hết giờ theo bé: link nhỏ «Đổi bé» và «Ba Mẹ mở máy» thay ⌃⌘Q. |
| 34 | [`them-xe0zv9p7`](con-cai-mac/34-them-xe0zv9p7.html) | Mac: Ba Mẹ dùng máy | 440×430 | Gộp vào them-4ihu4j01 (Ba Mẹ nhập mã Mac, PIN 06/11) |
| 35 | [`them-tf7nd1l7`](con-cai-mac/35-them-tf7nd1l7.html) | Mac: Khoá giờ ngủ | 1280×860 |  |
| 36 | [`them-8yfbs3f3`](con-cai-mac/36-them-8yfbs3f3.html) | Mac: Xin mở ngoại lệ (giờ ngủ) | 1280×860 |  |
| 37 | [`them-kg2sqdng`](con-cai-mac/37-them-kg2sqdng.html) | Mac: Đã gửi Ba Mẹ (ngoại lệ, giờ ngủ) | 1280×860 |  |
| 38 | [`them-5kzjn4hf`](con-cai-mac/38-them-5kzjn4hf.html) | Mac: Ba Mẹ cho mở ngoại lệ (giờ ngủ) | 1280×860 |  |
| 39 | [`them-3gs80agp`](con-cai-mac/39-them-3gs80agp.html) | Mac: Ba Mẹ chưa cho ngoại lệ (giờ ngủ) | 1280×860 |  |
| 40 | [`them-dvo45hys`](con-cai-mac/40-them-dvo45hys.html) | Mac: Giờ học · chỉ app học | 1280×860 |  |
| 41 | [`them-2lgu2bbn`](con-cai-mac/41-them-2lgu2bbn.html) | Mac: Xin mở ngoại lệ (giờ học) | 1280×860 |  |
| 42 | [`them-e5g29hhd`](con-cai-mac/42-them-e5g29hhd.html) | Mac: Đã gửi Ba Mẹ (ngoại lệ, giờ học) | 1280×860 |  |
| 43 | [`them-8kunyc5s`](con-cai-mac/43-them-8kunyc5s.html) | Mac: Ba Mẹ cho mở ngoại lệ (giờ học) | 1280×860 |  |
| 44 | [`them-fy6o6c7c`](con-cai-mac/44-them-fy6o6c7c.html) | Mac: Ba Mẹ chưa cho ngoại lệ (giờ học) | 1280×860 |  |
| 45 | [`them-zsf6b45n`](con-cai-mac/45-them-zsf6b45n.html) | Xin thêm giờ (Mac) | 440×371 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 46 | [`them-s9zxgltm`](con-cai-mac/46-them-s9zxgltm.html) | Xin thêm giờ từ màn khoá (Mac) | 440×429 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 47 | [`them-shh2qdpw`](con-cai-mac/47-them-shh2qdpw.html) | Xin mở trang hoặc app | 440×395 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 48 | [`them-zkgjog14`](con-cai-mac/48-them-zkgjog14.html) | Đã gửi Ba Mẹ (Mac) | 440×352 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 49 | [`them-0k1r3wsl`](con-cai-mac/49-them-0k1r3wsl.html) | Đổi sao lấy giờ (Mac) | 420×438 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 50 | [`them-x3qk4kp9`](con-cai-mac/50-them-x3qk4kp9.html) | Đã đổi +10 phút (Mac) | 420×330 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 51 | [`them-51ahzmk9`](con-cai-mac/51-them-51ahzmk9.html) | Mac: Chưa đủ sao | 420×390 |  |
| 52 | [`them-8efbpmkb`](con-cai-mac/52-them-8efbpmkb.html) | Ba Mẹ cho thêm giờ (Mac) | 440×320 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 53 | [`them-39y24jad`](con-cai-mac/53-them-39y24jad.html) | Ba Mẹ chưa cho thêm giờ (Mac) | 440×380 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 54 | [`them-sw37ub0p`](con-cai-mac/54-them-sw37ub0p.html) | Mac: app chưa được mở | 400×360 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 55 | [`them-5ici9ysd`](con-cai-mac/55-them-5ici9ysd.html) | Đã gửi Ba Mẹ (Mac) | 400×360 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 56 | [`them-oduos66h`](con-cai-mac/56-them-oduos66h.html) | Mac: Ba Mẹ cho mở app | 440×320 |  |
| 57 | [`them-t66cmp4a`](con-cai-mac/57-them-t66cmp4a.html) | Mac: Ba Mẹ chưa cho mở app | 440×380 |  |
| 58 | [`them-2ndg9bu6`](con-cai-mac/58-them-2ndg9bu6.html) | Mac: khoá, nhập mã mở | 1280×1000 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 59 | [`them-qa6tsua3`](con-cai-mac/59-them-qa6tsua3.html) | Mac: Đã lưu lời xin (mất mạng) | 440×340 |  |
| 60 | [`them-45hk69p9`](con-cai-mac/60-them-45hk69p9.html) | Mac: đang mở tạm bằng mã | 400×360 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |

## Ba Mẹ · Ghép thêm máy (`bm-ghep-may`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-may-ds`](bm-ghep-may/01-bm1-may-ds.html) | Dùng chung · theo «Máy của con» v9 | 375×812 | Làm lại Ghép thêm máy theo logic Sếp 03/11: ít chữ nhiều hình, ghép bằng mã 6 số/QR, máy mới chạy Chỉ app được phép, CTA nói kết quả. |
| 2 | [`bm1-may-chon-loai`](bm-ghep-may/02-bm1-may-chon-loai.html) | Gộp dùng chung — nội dung của «Chọn loại máy» | 375×812 | Làm lại Ghép thêm máy theo logic Sếp 03/11: ít chữ nhiều hình, ghép bằng mã 6 số/QR, máy mới chạy Chỉ app được phép, CTA nói kết quả. |
| 3 | [`bm1-may-ghep`](bm-ghep-may/03-bm1-may-ghep.html) | Gộp dùng chung — nội dung của «Mã ghép 6 số» | 375×812 | Nghi 04/11: 1 nội dung đúng cho cả 2 luồng (Lần đầu + Ghép thêm máy) — mã 6 số + QR, hàng chia sẻ kiểu iPhone (Zalo, Tin nhắn, Messenger, Sao chép link, Khác…), nút chính «Đã gửi, chờ máy của con», phụ «Để sau», không ghi bước cứng. |
| 4 | [`them-mkcwr3q1`](bm-ghep-may/04-them-mkcwr3q1.html) | Đang chờ máy của con | 375×812 | Bỏ thanh bước Lần đầu (z8femhpg đã tách); chữ «máy mới»; thêm lại «Mã hết hạn rồi? Lấy mã mới» của bản Ghép thêm máy. |
| 5 | [`them-7ss7o7lz`](bm-ghep-may/05-them-7ss7o7lz.html) | Mã ghép máy hết hạn | 375×812 |  |
| 6 | [`bm1-may-moi`](bm-ghep-may/06-bm1-may-moi.html) | Vá 04/11 · chữ chung | 375×812 | Làm lại Ghép thêm máy theo logic Sếp 03/11: ít chữ nhiều hình, ghép bằng mã 6 số/QR, máy mới chạy Chỉ app được phép, CTA nói kết quả. |

## Con Windows · Bộ cài (`con-cai-win`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cmt-cai-chao`](con-cai-win/01-cmt-cai-chao.html) | Chốt Con Win 04/11 · vá | 723×672 | Dòng «Bảo Anh luôn thấy AiiGrow»: icon khoá → icon mắt. |
| 2 | [`cmt-cai-dieu-khoan`](con-cai-win/02-cmt-cai-dieu-khoan.html) | Chốt Con Win 04/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 3 | [`cmt-cai-chon-tai-khoan`](con-cai-win/03-cmt-cai-chon-tai-khoan.html) | Chốt PIN máy tính 06/11 | 723×672 | Các con dùng chung 1 tài khoản Windows giới hạn; AiiGrow nhận từng bé bằng tên + PIN (không mỗi bé 1 tài khoản). |
| 4 | [`cmt-cai-tao-tai-khoan`](con-cai-win/04-cmt-cai-tao-tai-khoan.html) | Chốt PIN máy tính 06/11 | 723×672 | Tạo 1 tài khoản giới hạn «con» cho cả các bé, Ba Mẹ giữ mật khẩu Windows; bé vào bằng tên + PIN. |
| 5 | [`cmt-cai-chi-mot-tai-khoan-quan-tri`](con-cai-win/05-cmt-cai-chi-mot-tai-khoan-quan-tri.html) | Chốt PIN máy tính 06/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 6 | [`cmt-cai-ma-ghep`](con-cai-win/06-cmt-cai-ma-ghep.html) | Chốt Con Win 04/11 · vá | 723×672 | Thêm dòng nhỏ «Thử: mã không đúng ›» sang màn Mã ghép không đúng. |
| 7 | [`cmt-cai-ma-ghep-sai`](con-cai-win/07-cmt-cai-ma-ghep-sai.html) | Vá rà Con Win 04/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 8 | [`them-3al4wwbt`](con-cai-win/08-them-3al4wwbt.html) | Mã ghép không đúng | 723×672 |  |
| 9 | [`cmt-cai-dang-cai`](con-cai-win/09-cmt-cai-dang-cai.html) | Chốt Con Win 04/11 · vá | 723×672 | Bỏ 2 nút demo «▶ Xem:». Thanh tiến độ + dòng chân → Xong; dòng nhỏ «Gặp lỗi? Mã hết hạn › · Mất mạng ›». |
| 10 | [`cmt-cai-loi-ghep`](con-cai-win/10-cmt-cai-loi-ghep.html) | Vá rà Con Win 04/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 11 | [`them-cm4qtbgw`](con-cai-win/11-them-cm4qtbgw.html) | Cài: máy mất mạng | 723×672 |  |
| 12 | [`cmt-cai-xong`](con-cai-win/12-cmt-cai-xong.html) | Chốt PIN máy tính 06/11 | 723×672 | Cài xong máy khoá lại, nút «Mở màn chọn tên»; giờ tính theo bé, PIN Ba Mẹ đặt. |

## web-tai (`web-tai`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-web-tai-may-tinh`](web-tai/01-bm1-web-tai-may-tinh.html) | Thêm nút chạy thử «▶ Máy cũ» | 1440×1135 | Giữ nguyên v2, chỉ thêm nút nhỏ «▶ Máy cũ» ở góc phải chân trang để chạy thử màn Máy quá cũ (them-aylf4ke2). |
| 2 | [`them-aylf4ke2`](web-tai/02-them-aylf4ke2.html) | Máy quá cũ | 1440×1135 |  |
| 3 | [`bm1-web-tai-windows`](web-tai/03-bm1-web-tai-windows.html) | Liên kết «Tải lại» → Tải không được (MCP) | 390×1459 | Tối giản 05/11: trang máy tính tự nhận Windows (nút chính đúng máy, link phụ «Tải bản cho Mac»); bấm tải → màn Đang tải + 3 hình mở file (Windows/Mac) → sang màn đầu bộ cài (cmt-cai-chao / cmt-mac-chao); «Tải bị dừng? Tải lại»; mở trên điện thoại → nói rõ bộ cài máy tính không chạy ở đây, chỉ app điện thoại + link cho máy tính; mã 6 số 482 017 khớp app Ba Mẹ, hạn 10 phút. |
| 4 | [`bm1-web-tai-mac`](web-tai/04-bm1-web-tai-mac.html) | Liên kết «Tải lại» → Tải không được (MCP) | 390×1420 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 5 | [`them-rreafg7p`](web-tai/05-them-rreafg7p.html) | Tải không được | 390×844 |  |
| 6 | [`bm1-web-tai-android`](web-tai/06-bm1-web-tai-android.html) | Liên kết «Cài cho máy tính?Mở link này trên máy tính của con aiigrow.a» → Tải cho Android (MCP) | 390×1909 | Tối giản 05/11: trang máy tính tự nhận Windows (nút chính đúng máy, link phụ «Tải bản cho Mac»); bấm tải → màn Đang tải + 3 hình mở file (Windows/Mac) → sang màn đầu bộ cài (cmt-cai-chao / cmt-mac-chao); «Tải bị dừng? Tải lại»; mở trên điện thoại → nói rõ bộ cài máy tính không chạy ở đây, chỉ app điện thoại + link cho máy tính; mã 6 số 482 017 khớp app Ba Mẹ, hạn 10 phút. |
| 7 | [`bm1-web-tai-iphone`](web-tai/07-bm1-web-tai-iphone.html) | Liên kết «Cài cho máy tính?Mở link này trên máy tính của con aiigrow.a» → Mở bằng iPhone (MCP) | 390×1686 | Tối giản 05/11: trang máy tính tự nhận Windows (nút chính đúng máy, link phụ «Tải bản cho Mac»); bấm tải → màn Đang tải + 3 hình mở file (Windows/Mac) → sang màn đầu bộ cài (cmt-cai-chao / cmt-mac-chao); «Tải bị dừng? Tải lại»; mở trên điện thoại → nói rõ bộ cài máy tính không chạy ở đây, chỉ app điện thoại + link cho máy tính; mã 6 số 482 017 khớp app Ba Mẹ, hạn 10 phút. |
| 8 | [`bm1-web-cai`](web-tai/08-bm1-web-cai.html) | Chốt 05/11 | 390×844 | Tối giản 05/11: trang máy tính tự nhận Windows (nút chính đúng máy, link phụ «Tải bản cho Mac»); bấm tải → màn Đang tải + 3 hình mở file (Windows/Mac) → sang màn đầu bộ cài (cmt-cai-chao / cmt-mac-chao); «Tải bị dừng? Tải lại»; mở trên điện thoại → nói rõ bộ cài máy tính không chạy ở đây, chỉ app điện thoại + link cho máy tính; mã 6 số 482 017 khớp app Ba Mẹ, hạn 10 phút. |

## con-dt-cai (`con-dt-cai`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cdt-chao`](con-dt-cai/01-cdt-chao.html) | Rob chào | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 2 | [`cdt-cai`](con-dt-cai/02-cdt-cai.html) | Xin cài phần mềm | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 3 | [`cdt-chua-ghep`](con-dt-cai/03-cdt-chua-ghep.html) | iPhone chưa ghép | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 4 | [`cdt-nhap-ma`](con-dt-cai/04-cdt-nhap-ma.html) | Nhập mã ghép | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 5 | [`them-4hu611yo`](con-dt-cai/05-them-4hu611yo.html) | Mã ghép chưa đúng | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 6 | [`them-x7v7px1j`](con-dt-cai/06-them-x7v7px1j.html) | Mã ghép hết hạn | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 7 | [`them-yp7fnry7`](con-dt-cai/07-them-yp7fnry7.html) | Mất mạng khi ghép | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 8 | [`them-z55cy897`](con-dt-cai/08-them-z55cy897.html) | Quét QR của Ba Mẹ | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 9 | [`cdt-quyen`](con-dt-cai/09-cdt-quyen.html) | Cấp quyền Thời gian sử dụng | 390×844 | PIN 06/11 (xem trước): ghép xong + cho phép giữ giờ → sang màn Chọn tên (máy khoá) thay vì vào thẳng màn chính; thêm 1 dòng «Xong thì Bảo Anh chạm tên + nhập PIN để vào máy.» |
| 10 | [`them-cz5mw9ha`](con-dt-cai/10-them-cz5mw9ha.html) | Chưa cho phép Thời gian sử dụng | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo bản đã chốt ở con-dt-ngay): nền kem phẳng, 1 màu chủ xanh lá cho nút chính/tab chọn/vòng giờ; vàng chỉ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép). Không PIN. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 11 | [`cdt-chinh-ios`](con-dt-cai/11-cdt-chinh-ios.html) | Màn chính iPhone | 390×844 | PIN 06/11 (xem trước): chip «Điện thoại của Bảo Anh» → «Bảo Anh ▾» (avatar + tên), chạm mở Đổi bé / Đăng xuất. Thêm thuần. |

## con-dt-khac (`con-dt-khac`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cdt-quy-tac`](con-dt-khac/01-cdt-quy-tac.html) | Quy tắc nhà mình | 375×812 | PIN 06/11 (xem trước): dòng cuối «Máy của cả nhà / Chung một giờ chơi» → «Vào máy bằng tên + PIN / Giờ chơi tính riêng cho con» (bỏ link sang màn cả nhà); chip «Điện thoại của Bảo Anh» → «Bảo Anh ▾» mở Đổi bé / Đăng xuất. |
| 2 | [`cdt-pin-ghep`](con-dt-khac/02-cdt-pin-ghep.html) | Ghép máy | 375×812 | PIN 06/11 (xem trước): bỏ «Máy của cả nhà / Ba Mẹ chọn Cả nhà» → «Máy dùng chung»: giờ chơi riêng từng bé, chạm tên + PIN, không ai vào thì máy khoá (Ba Mẹ mở bằng mã Ba Mẹ). |
| 3 | [`them-b3prchz2`](con-dt-khac/03-them-b3prchz2.html) | Cho phép giữ giờ · Máy cả nhà | 375×812 | PIN 06/11 (xem trước): bỏ «Máy của cả nhà / giờ chung» → «Máy dùng chung», giờ chơi đếm riêng từng bé; cho phép xong → màn Chọn tên (không còn «Ai đang dùng máy?» quỹ chung). |
| 4 | [`cdt-pin-ai`](con-dt-khac/04-cdt-pin-ai.html) | Ai đang dùng máy? | 375×812 | Chốt PIN 06/11: màn thừa |
| 5 | [`them-28ir0qe4`](con-dt-khac/05-them-28ir0qe4.html) | Chọn tên (máy khoá) | 375×812 |  |
| 6 | [`them-b3l7ubu5`](con-dt-khac/06-them-b3l7ubu5.html) | Nhập PIN | 375×812 |  |
| 7 | [`them-zw8cwyzr`](con-dt-khac/07-them-zw8cwyzr.html) | Nhập PIN (Bảo Minh) | 375×812 |  |
| 8 | [`them-2ljthd3f`](con-dt-khac/08-them-2ljthd3f.html) | PIN chưa đúng | 375×812 |  |
| 9 | [`them-8l4fb6yf`](con-dt-khac/09-them-8l4fb6yf.html) | Sai 5 lần · chờ 15 giây | 375×812 |  |
| 10 | [`them-bwdspoi7`](con-dt-khac/10-them-bwdspoi7.html) | Quên PIN | 375×812 | Nút lùi thành phần tử có data-toi về Nhập PIN. |
| 11 | [`them-q72t4no4`](con-dt-khac/11-them-q72t4no4.html) | Ba Mẹ nhập mã | 375×812 |  |
| 12 | [`them-f2mt6vfr`](con-dt-khac/12-them-f2mt6vfr.html) | Ba Mẹ đang dùng máy | 375×812 |  |
| 13 | [`them-j424uyis`](con-dt-khac/13-them-j424uyis.html) | Đổi bé / Đăng xuất | 375×812 |  |
| 14 | [`them-t161rgrf`](con-dt-khac/14-them-t161rgrf.html) | MỚI PIN · Mở khẩn cấp | 375×812 | Chốt PIN 06/11: màn thừa |
| 15 | [`them-xheyulq1`](con-dt-khac/15-them-xheyulq1.html) | MỚI PIN · Đã mở khẩn cấp | 375×812 | Chốt PIN 06/11: màn thừa |

## con-dt-android (`con-dt-android`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cdt-android-viec`](con-dt-android/01-cdt-android-viec.html) | Việc của con | 360×800 | PIN 06/11 (xem trước): thêm chip «Bảo Anh ▾» dưới lời chào, chạm mở Đổi bé / Đăng xuất. Thêm thuần. |
| 2 | [`cdt-android-doi-diem`](con-dt-android/02-cdt-android-doi-diem.html) | Đổi điểm | 360×800 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 3 | [`them-sxjv8qfx`](con-dt-android/03-them-sxjv8qfx.html) | Đã đổi +10 phút | 360×800 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 4 | [`them-n4iivj6d`](con-dt-android/04-them-n4iivj6d.html) | Chưa đủ sao | 360×800 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |

## con-dt-ngay (`con-dt-ngay`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cdt-nha`](con-dt-ngay/01-cdt-nha.html) | Nhà — nhận điểm | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 2 | [`cdt-nha-chinh`](con-dt-ngay/02-cdt-nha-chinh.html) | Nhà | 375×812 | PIN 06/11 (xem trước): chip «Máy của Bảo Anh» → «Bảo Anh ▾» (avatar + tên), chạm mở Đổi bé / Đăng xuất. Thêm thuần, giữ nguyên phần còn lại. |
| 3 | [`cdt-nhiem-vu`](con-dt-ngay/03-cdt-nhiem-vu.html) | Nhiệm vụ | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 4 | [`cdt-nv-chi-tiet`](con-dt-ngay/04-cdt-nv-chi-tiet.html) | Chi tiết nhiệm vụ | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 5 | [`cdt-dang-lam`](con-dt-ngay/05-cdt-dang-lam.html) | Đang làm | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 6 | [`cdt-chup`](con-dt-ngay/06-cdt-chup.html) | Chụp ảnh | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 7 | [`them-pgpfq8of`](con-dt-ngay/07-them-pgpfq8of.html) | Ảnh 2/2 · Bàn học | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 8 | [`them-6t2vvx7d`](con-dt-ngay/08-them-6t2vvx7d.html) | Chưa gửi được (mất mạng) | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 9 | [`them-qqzb3lnt`](con-dt-ngay/09-them-qqzb3lnt.html) | Ghi âm nộp bài | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 10 | [`them-r6lv8p5v`](con-dt-ngay/10-them-r6lv8p5v.html) | Viết nộp bài | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 11 | [`cdt-cho-duyet`](con-dt-ngay/11-cdt-cho-duyet.html) | Chờ Ba Mẹ duyệt | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 12 | [`cdt-duoc-duyet`](con-dt-ngay/12-cdt-duoc-duyet.html) | Được duyệt | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 13 | [`cdt-chup-lai`](con-dt-ngay/13-cdt-chup-lai.html) | Chụp lại | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 14 | [`cdt-vi-qua`](con-dt-ngay/14-cdt-vi-qua.html) | Ví quà | 375×812 | Nghi chốt 06/11: Ví quà khớp bảng giá — 40 sao, thanh tới mốc gần nhất «Chọn món bữa tối 50 sao» (còn 10); Đi ăn kem đang giữ 100 sao chờ Ba Mẹ trao; thêm Voucher AiiCafe 50k có mã QR, hạn 60 ngày; giữ Đổi 10 sao lấy 10 phút, Huy hiệu, Xem quà đổi được, tab bar. |
| 15 | [`them-bw8y2ta0`](con-dt-ngay/15-them-bw8y2ta0.html) | Đã đổi 10 sao lấy 10 phút | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |
| 16 | [`cdt-cua-hang`](con-dt-ngay/16-cdt-cua-hang.html) | Cửa hàng | 375×812 | Nghi chốt 06/11: cửa hàng Con theo bảng giá (50/100/200/200/300/500/800 sao), Bảo Anh có 40 sao → mọi quà «Còn thiếu X sao», món gần nhất (bữa tối) nổi bật «Còn thiếu 10 sao»; điều kiện chip nhỏ; Đi ăn kem đang giữ 100 sao chờ trao; đổi phút ở nút riêng «Đổi 10 sao lấy 10 phút». Danh sách cuộn. |
| 17 | [`cdt-doi-qua`](con-dt-ngay/17-cdt-doi-qua.html) | Đổi quà | 375×812 | Nghi chốt 06/11: đổi quà rẻ nhất «Chọn món bữa tối 50 sao» thay «Xem phim cả nhà 40 sao» (phim giờ 300 sao, chỉ cuối tuần). Sao được giữ, Ba Mẹ trao xong mới trừ. Lúc đổi Bảo Anh có 50 sao (đã thêm 10 sao sau màn Cửa hàng 40 sao). |
| 18 | [`them-l9qeq0np`](con-dt-ngay/18-them-l9qeq0np.html) | Đã gửi đổi quà | 375×812 | Nghi chốt 06/11: sau khi gửi đổi «Chọn món bữa tối» — sao bị giữ (50 sao), chờ Ba Mẹ trao mới trừ; huỷ thì hoàn sao. Khớp màn Đổi quà biến thể. |
| 19 | [`cdt-huy-hieu`](con-dt-ngay/19-cdt-huy-hieu.html) | Huy hiệu | 375×812 | Con ĐT tuổi nhỏ — bản DỊU: nền kem phẳng, 1 màu chủ xanh lá (nút chính, tab chọn, thanh tiến độ), vàng chỉ cho sao/thưởng; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; font Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở được duyệt và đổi phút; camera/ghi âm nền gần đen. Giữ nội dung, số liệu, data-toi. Kit: condt-tre/kit-diu.css. |

## con-dt-gio (`con-dt-gio`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cdt-gio-may`](con-dt-gio/01-cdt-gio-may.html) | Giờ máy lệch | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 2 | [`cdt-choi`](con-dt-gio/02-cdt-choi.html) | Chơi trò chơi? | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 3 | [`cdt-phien`](con-dt-gio/03-cdt-phien.html) | Đang chơi | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 4 | [`cdt-nhac-5-phut`](con-dt-gio/04-cdt-nhac-5-phut.html) | Nhắc còn 5 phút | 360×800 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 5 | [`cdt-het-phien`](con-dt-gio/05-cdt-het-phien.html) | Hết phiên — nghỉ | 375×812 | Thêm nút nhỏ «Khẩn cấp» → MỚI PIN · Mở khẩn cấp (chỉ thêm, không đổi gì khác) |
| 6 | [`cdt-gio-ngu`](con-dt-gio/06-cdt-gio-ngu.html) | Giờ ngủ | 375×812 | Thêm nút nhỏ «Khẩn cấp» → MỚI PIN · Mở khẩn cấp (chỉ thêm, không đổi gì khác) |
| 7 | [`them-ioje1spu`](con-dt-gio/07-them-ioje1spu.html) | Giờ học | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 8 | [`them-4e5fwl16`](con-dt-gio/08-them-4e5fwl16.html) | App chưa được phép | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 9 | [`cdt-android-khoa`](con-dt-gio/09-cdt-android-khoa.html) | Máy đang khoá | 390×844 | Thêm nút nhỏ «Khẩn cấp» → MỚI PIN · Mở khẩn cấp (chỉ thêm, không đổi gì khác) |

## con-dt-xin (`con-dt-xin`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cdt-xin-phep`](con-dt-xin/01-cdt-xin-phep.html) | Xin phép | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 2 | [`cdt-yeu-cau`](con-dt-xin/02-cdt-yeu-cau.html) | Yêu cầu của con | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 3 | [`them-0p8dmjan`](con-dt-xin/03-them-0p8dmjan.html) | Ba Mẹ cho rồi | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 4 | [`them-5nxwuaxz`](con-dt-xin/04-them-5nxwuaxz.html) | Ba Mẹ chưa cho | 375×812 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 5 | [`cdt-ios-xin-them`](con-dt-xin/05-cdt-ios-xin-them.html) | iPhone: xin thêm giờ | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 6 | [`cdt-ios-choi-diem`](con-dt-xin/06-cdt-ios-choi-diem.html) | iPhone: chơi bằng điểm | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |
| 7 | [`them-4atwdaqy`](con-dt-xin/07-them-4atwdaqy.html) | Chưa đủ sao | 390×844 | Con ĐT tuổi nhỏ — bản DỊU (theo con-dt-ngay đã chốt): nền kem phẳng, 1 màu chủ xanh lá, vàng chỉ cho sao; thẻ trắng bóng xám mềm, ≤1 thẻ màu nhạt/màn; nút 52px màu đặc; Nunito; robot chỉ ở màn có cảm xúc; confetti nhẹ chỉ ở đổi phút; giờ ngủ nền tối dịu. Giữ nội dung, số liệu, data-toi, khung. Kit: condt-tre/kit-diu.css. |

## con-dt-chan (`con-dt-chan`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cdt-chan-web`](con-dt-chan/01-cdt-chan-web.html) | Trang web bị chặn | 375×812 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 2 | [`them-xxgu8hk6`](con-dt-chan/02-them-xxgu8hk6.html) | Trang luôn bị chặn | 375×812 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 3 | [`cdt-webview`](con-dt-chan/03-cdt-webview.html) | Không tải được | 360×800 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 4 | [`cdt-ma-offline`](con-dt-chan/04-cdt-ma-offline.html) | Khoá — nhập mã offline | 360×800 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 5 | [`them-a16j4hh8`](con-dt-chan/05-them-a16j4hh8.html) | Mã mở máy chưa đúng | 360×800 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 6 | [`them-mvld82p8`](con-dt-chan/06-them-mvld82p8.html) | Mã mở máy hết hạn | 360×800 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 7 | [`cdt-ma-da-mo`](con-dt-chan/07-cdt-ma-da-mo.html) | Đã mở bằng mã | 360×800 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 8 | [`them-qpj5mdyr`](con-dt-chan/08-them-qpj5mdyr.html) | Đã lưu lời xin (mất mạng) | 360×800 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 9 | [`them-djha85wh`](con-dt-chan/09-them-djha85wh.html) | Đang mở tạm bằng mã | 360×800 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 10 | [`cdt-ios-ma-offline`](con-dt-chan/10-cdt-ios-ma-offline.html) | iPhone: mở bằng mã | 390×844 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
| 11 | [`cdt-ios-dns`](con-dt-chan/11-cdt-ios-dns.html) | iPhone: lọc web DNS | 390×844 | Con ĐT tuổi nhỏ — bản DỊU cho Bị chặn & mất mạng: dùng nguyên kit-diu (nền kem phẳng, 1 màu chủ xanh lá, thẻ trắng viền mảnh, nút 52px, Nunito). Màn khoá: robot nghỉ ngơi nhẹ nhàng, ô mã 6 số + bàn phím to, 1 nút chính «Mở thêm 30 phút bằng mã». Mất mạng: robot lo nhẹ + vòng giờ chơi. Trang luôn chặn: khiên, không robot. Lọc web iPhone (cho Ba Mẹ): 3 bước đánh số, không robot. Giữ nội dung, data-toi, khung. |
