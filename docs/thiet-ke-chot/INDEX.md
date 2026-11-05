# Thiết kế đã chốt — xuất từ aiigrow-figma

Nguồn: bàn https://aiigrow-figma.aiilab.vn (Nghi chốt 03–04/11/2026), bản sao lưu `tanthanhkid/aiigrow-thiet-ke` brainstorm-ui.
Mỗi màn = HTML phiên bản hiện hành. `data-toi="<key>"` trên nút = màn đích khi bấm. Mở file .html trong trình duyệt để xem.
Tổng 305 màn, 13 hành trình.


## Ba Mẹ · Hằng ngày (`bm-hang-ngay`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-trang-chu`](bm-hang-ngay/01-bm2-trang-chu.html) | Trang chủ | 375×812 | Thẻ nhiệm vụ: 2 việc chờ duyệt mở thẳng màn bằng chứng; nút «Xem bằng chứng, duyệt 2 việc» (Đọc sách nộp ghi âm). Phần còn lại giữ nguyên. |
| 2 | [`them-sll7clha`](bm-hang-ngay/02-them-sll7clha.html) | Xác nhận khoá mọi máy | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 3 | [`them-6wjhze1d`](bm-hang-ngay/03-them-6wjhze1d.html) | Cho thêm giờ | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 4 | [`bm2-may-ds`](bm-hang-ngay/04-bm2-may-ds.html) | Máy của con | 375×812 | Làm lại Ghép thêm máy theo logic Sếp 03/11: ít chữ nhiều hình, ghép bằng mã 6 số/QR, máy mới chạy Chỉ app được phép, CTA nói kết quả. |
| 5 | [`bm2-may-m1`](bm-hang-ngay/05-bm2-may-m1.html) | Chi tiết máy (tuân thủ) | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 6 | [`them-tw6apkag`](bm-hang-ngay/06-them-tw6apkag.html) | Đổi tên Laptop | 375×812 |  |
| 7 | [`them-v4ovqk42`](bm-hang-ngay/07-them-v4ovqk42.html) | Gỡ Laptop? | 375×812 |  |
| 8 | [`bm2-may-m2`](bm-hang-ngay/08-bm2-may-m2.html) | Chi tiết máy (lệch chuẩn) | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 9 | [`them-4e4o5c72`](bm-hang-ngay/09-them-4e4o5c72.html) | Đổi tên iPad | 375×812 |  |
| 10 | [`them-18q14mik`](bm-hang-ngay/10-them-18q14mik.html) | Gỡ iPad? | 375×812 |  |
| 11 | [`them-slv33bgc`](bm-hang-ngay/11-them-slv33bgc.html) | Hướng dẫn sửa iPad | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 12 | [`bm2-gio`](bm-hang-ngay/12-bm2-gio.html) | Giờ dùng máy | 375×812 | Làm lại Hằng ngày theo logic Sếp 03/11: mỗi màn 1 việc, ít chữ nhiều hình, CTA nói kết quả. Trang chủ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ ngay trên thẻ) → con đang xin (quyết ngay) → máy chưa bảo vệ → nhiệm vụ chờ duyệt (ra sao). Khoá máy và Cho thêm giờ là bảng trượt. Máy của con = thẻ hình máy + trạng thái màu. Giờ chơi: quỹ phút mỗi ngày + sao đổi ra phút + giờ ngủ. Hồ sơ con = 4 ô lớn. |
| 13 | [`them-i3wcjm6v`](bm-hang-ngay/13-them-i3wcjm6v.html) | Chọn giờ ngủ | 375×812 | Tách khỏi Chọn giờ ngủ (Lần đầu): bản gộp mang nền Bước Giờ chơi + thanh bước của luồng Lần đầu. Về lại bản Hằng ngày v3. |
| 14 | [`them-3ima20g6`](bm-hang-ngay/14-them-3ima20g6.html) | Giờ học | 375×812 |  |
| 15 | [`bm2-ho-so`](bm-hang-ngay/15-bm2-ho-so.html) | Hồ sơ con | 375×812 | Hồ sơ con làm lại: bỏ PIN; chip đổi con; đầu màn ảnh+tên+tuổi+sao, tóm tắt hôm nay; mỗi cài đặt 1 dòng có giá trị hiện tại; sửa/xoá hồ sơ ở cuối. |
| 16 | [`them-vnl5rmnz`](bm-hang-ngay/16-them-vnl5rmnz.html) | Sửa hồ sơ Bảo Anh | 375×812 |  |
| 17 | [`them-y5iwt1fv`](bm-hang-ngay/17-them-y5iwt1fv.html) | Mã PIN của Bảo Anh | 375×812 |  |
| 18 | [`them-canktzlq`](bm-hang-ngay/18-them-canktzlq.html) | Xoá hồ sơ Bảo Anh? | 375×812 |  |
| 19 | [`them-a4nqjrmp`](bm-hang-ngay/19-them-a4nqjrmp.html) | Con xin dùng (chờ duyệt) | 375×812 |  |
| 20 | [`them-1ypcydle`](bm-hang-ngay/20-them-1ypcydle.html) | Đã cho mở YouTube | 375×812 |  |
| 21 | [`them-3wp5ty1o`](bm-hang-ngay/21-them-3wp5ty1o.html) | Đã cho thêm 20 phút | 375×812 |  |
| 22 | [`them-s093fsk4`](bm-hang-ngay/22-them-s093fsk4.html) | Đã không cho | 375×812 |  |
| 23 | [`them-nl1nwszs`](bm-hang-ngay/23-them-nl1nwszs.html) | Duyệt nhiệm vụ | 375×812 | Danh sách chờ duyệt: mỗi việc 1 thẻ có bằng chứng thu nhỏ (ảnh phòng / ghi âm 20:14), giờ nộp, sao; bấm thẻ mở màn bằng chứng; Duyệt cả 2 · +20 sao |
| 24 | [`them-qwuifjry`](bm-hang-ngay/24-them-qwuifjry.html) | Bằng chứng · Dọn phòng | 375×812 |  |
| 25 | [`them-nxclxlit`](bm-hang-ngay/25-them-nxclxlit.html) | Nhờ làm lại · Dọn phòng | 375×812 |  |
| 26 | [`them-d40e3495`](bm-hang-ngay/26-them-d40e3495.html) | Bằng chứng · Đọc sách | 375×812 |  |
| 27 | [`them-l0saosnz`](bm-hang-ngay/27-them-l0saosnz.html) | Nhờ làm lại · Đọc sách | 375×812 |  |
| 28 | [`them-4u3doee9`](bm-hang-ngay/28-them-4u3doee9.html) | Đã nhờ con làm lại | 375×812 |  |
| 29 | [`them-493dqo4i`](bm-hang-ngay/29-them-493dqo4i.html) | Duyệt xong · con nhận sao | 375×812 | Duyệt 1 việc (Dọn phòng): +10 sao, ví 30 → 40; lời khen đã chọn ở màn bằng chứng; nút Duyệt tiếp Đọc sách / Về Trang chủ |
| 30 | [`them-zj9gmh7t`](bm-hang-ngay/30-them-zj9gmh7t.html) | Duyệt xong cả 2 · 30 → 50 sao | 375×812 |  |
| 31 | [`them-oypre8gc`](bm-hang-ngay/31-them-oypre8gc.html) | Không còn việc chờ duyệt | 375×812 |  |
| 32 | [`them-rqioc0fd`](bm-hang-ngay/32-them-rqioc0fd.html) | Mất mạng khi đang duyệt | 375×812 |  |
| 33 | [`them-0xf9hrgn`](bm-hang-ngay/33-them-0xf9hrgn.html) | Thông báo | 375×812 |  |
| 34 | [`them-lsf4eews`](bm-hang-ngay/34-them-lsf4eews.html) | Cảnh báo: trang bị chặn | 375×812 |  |
| 35 | [`them-c95l1cwc`](bm-hang-ngay/35-them-c95l1cwc.html) | Hôm nay con dùng gì | 375×812 |  |
| 36 | [`them-e91jg28j`](bm-hang-ngay/36-them-e91jg28j.html) | Tab Nhiệm vụ | 375×812 | Việc chờ duyệt mở thẳng màn bằng chứng (ảnh / ghi âm); Đọc sách nộp ghi âm; chip Bảo Minh → trạng thái trống; bấm Dọn phòng → Sửa việc |
| 37 | [`them-e44cwmvu`](bm-hang-ngay/37-them-e44cwmvu.html) | Nhiệm vụ trống · Bảo Minh | 375×812 |  |
| 38 | [`them-ncq0jtzo`](bm-hang-ngay/38-them-ncq0jtzo.html) | Sửa việc «Dọn phòng» | 375×812 |  |
| 39 | [`them-4axhvgpl`](bm-hang-ngay/39-them-4axhvgpl.html) | Xoá việc «Dọn phòng»? | 375×812 |  |
| 40 | [`them-1akngbxb`](bm-hang-ngay/40-them-1akngbxb.html) | Ví sao của con | 375×812 |  |
| 41 | [`them-1jii7k19`](bm-hang-ngay/41-them-1jii7k19.html) | Giao việc theo bộ | 375×812 |  |
| 42 | [`them-0qial10f`](bm-hang-ngay/42-them-0qial10f.html) | Tự đặt việc | 375×812 |  |
| 43 | [`them-5otw85h4`](bm-hang-ngay/43-them-5otw85h4.html) | Trao quà cho con | 375×812 |  |
| 44 | [`them-gftgyspn`](bm-hang-ngay/44-them-gftgyspn.html) | Tab Báo cáo | 375×812 |  |
| 45 | [`them-h60stad7`](bm-hang-ngay/45-them-h60stad7.html) | Tab Cả nhà | 375×812 | Tab Cả nhà: thêm ô «+ Mời người nhà» ngay trong mục Người lớn trông con, cùng kiểu ô Thêm con; chú thích 2 quyền bằng icon; bỏ nút nổi đáy; cho cuộn. |
| 46 | [`them-ncmuuqav`](bm-hang-ngay/46-them-ncmuuqav.html) | Tài khoản của bạn | 375×812 |  |
| 47 | [`them-o4k6oei0`](bm-hang-ngay/47-them-o4k6oei0.html) | Đổi mật khẩu | 375×812 |  |
| 48 | [`them-liz6hzww`](bm-hang-ngay/48-them-liz6hzww.html) | Rời nhà? | 375×812 |  |
| 49 | [`them-4vj35r7c`](bm-hang-ngay/49-them-4vj35r7c.html) | Xoá tài khoản? | 375×812 |  |
| 50 | [`them-473f52w6`](bm-hang-ngay/50-them-473f52w6.html) | Quà đổi bằng sao | 375×812 |  |
| 51 | [`them-dlul0jlr`](bm-hang-ngay/51-them-dlul0jlr.html) | Thêm quà | 375×812 |  |
| 52 | [`them-79kgpij8`](bm-hang-ngay/52-them-79kgpij8.html) | Sửa quà | 375×812 |  |
| 53 | [`them-7vmoufz3`](bm-hang-ngay/53-them-7vmoufz3.html) | Thành viên | 375×812 |  |
| 54 | [`them-xnbiksmr`](bm-hang-ngay/54-them-xnbiksmr.html) | Mời Bà Hoa rời nhà? | 375×812 |  |
| 55 | [`them-9ozp26pq`](bm-hang-ngay/55-them-9ozp26pq.html) | Thêm con | 375×812 |  |
| 56 | [`them-8h2msmht`](bm-hang-ngay/56-them-8h2msmht.html) | App & web của con | 375×812 |  |
| 57 | [`them-2ru3t5iw`](bm-hang-ngay/57-them-2ru3t5iw.html) | Cài đặt thông báo | 375×812 |  |
| 58 | [`them-zxu4yvp3`](bm-hang-ngay/58-them-zxu4yvp3.html) | Hỏi AiiGrow | 375×812 |  |
| 59 | [`them-dmdjjhh1`](bm-hang-ngay/59-them-dmdjjhh1.html) | Nhắn tin AiiGrow | 375×812 | Gộp với AiiLab hỗ trợ (Cài đặt): thêm nút «Hay gặp ›» và 3 gợi ý nhanh (iPad báo lỗi, Ghép máy mới, Đổi sao ra phút) trên ô nhắn. |
| 60 | [`them-5hzkl6p5`](bm-hang-ngay/60-them-5hzkl6p5.html) | Mời người nhà | 375×812 |  |
| 61 | [`them-hfd2drjy`](bm-hang-ngay/61-them-hfd2drjy.html) | Đã gửi lời mời | 375×812 | Dòng «Điện thoại Ba Tuấn sẽ hiện / Xem bên máy Ba Tuấn» không xuống dòng, không chồng thẻ thông báo. |
| 62 | [`them-t49meex8`](bm-hang-ngay/62-them-t49meex8.html) | Xoá quà Đi ăn kem? | 375×812 |  |

## Ba Mẹ · Lần đầu dùng (`bm-lan-dau`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-welcome`](bm-lan-dau/01-bm1-welcome.html) | Chốt 04/11 | 390×844 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 2 | [`bm1-chao`](bm-lan-dau/02-bm1-chao.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 3 | [`bm1-dang-ky`](bm-lan-dau/03-bm1-dang-ky.html) | Sửa tay | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 4 | [`them-ahk69dtl`](bm-lan-dau/04-them-ahk69dtl.html) | Số đã có tài khoản | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 5 | [`bm1-otp`](bm-lan-dau/05-bm1-otp.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 6 | [`them-rlfp7ijt`](bm-lan-dau/06-them-rlfp7ijt.html) | Ba hay Mẹ | 375×812 | Thay từ phương án Theo ý Nghi · Gọn (pa-mvvqf7bd-1), Nghi chốt 31/10 |
| 7 | [`bm1-ob-ten-con`](bm-lan-dau/07-bm1-ob-ten-con.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 8 | [`them-4sujddkb`](bm-lan-dau/08-them-4sujddkb.html) | Thêm con thứ 2 | 375×812 |  |
| 9 | [`bm1-ob-may`](bm-lan-dau/09-bm1-ob-may.html) | Xoá màn khỏi hành trình | 375×812 | Thay từ phương án Theo ý Nghi · Gọn (pa-mvvqf7bd-1), Nghi chốt 31/10 |
| 10 | [`bm1-ob-ghep`](bm-lan-dau/10-bm1-ob-ghep.html) | Gộp dùng chung — nội dung của «Mã ghép 6 số» | 375×812 | Nghi 04/11: 1 nội dung đúng cho cả 2 luồng (Lần đầu + Ghép thêm máy) — mã 6 số + QR, hàng chia sẻ kiểu iPhone (Zalo, Tin nhắn, Messenger, Sao chép link, Khác…), nút chính «Đã gửi, chờ máy của con», phụ «Để sau», không ghi bước cứng. |
| 11 | [`them-w8q8hcfk`](bm-lan-dau/11-them-w8q8hcfk.html) | Xong rồi (chưa ghép máy) | 375×812 |  |
| 12 | [`them-3xbscpzm`](bm-lan-dau/12-them-3xbscpzm.html) | Bật thông báo | 375×812 | Thay từ phương án Theo ý Nghi · Gọn (pa-mvvqf7bd-1), Nghi chốt 31/10 |
| 13 | [`bm1-ob-mau`](bm-lan-dau/13-bm1-ob-mau.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 14 | [`them-bwlkjyw5`](bm-lan-dau/14-them-bwlkjyw5.html) | Thêm việc riêng | 375×812 | Nghi 04/11: Thêm việc riêng phải có nhiều tiêu chí — tên + gợi ý, hình, giao cho con nào, số sao, lặp lại, giờ nhắc, cách báo xong, duyệt hay tự cộng sao. |
| 15 | [`bm1-ob-gio`](bm-lan-dau/15-bm1-ob-gio.html) | Sửa tay | 375×812 | Nghi 04/11: Giờ chơi phải có lại phần chặn app — khối «Chặn app» 2 chế độ Mở hết / Chỉ app được phép (mặc định), dòng «Chọn app con được dùng ›». Màn cho cuộn. |
| 16 | [`them-hijzsz0z`](bm-lan-dau/16-them-hijzsz0z.html) | Chọn giờ ngủ | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 17 | [`them-mdujxlg2`](bm-lan-dau/17-them-mdujxlg2.html) | Con được dùng app nào? | 375×812 | Nghi 04/11: cho Ba Mẹ nhập thêm app — ô tìm/gõ tên app + nút «Thêm app» + ô «Thêm app khác» trong lưới → màn Thêm app khác. Chế độ chặn chuyển sang Giờ chơi, ở đây chỉ nhắc chế độ đang chọn. Cho cuộn. |
| 18 | [`them-at57ypdc`](bm-lan-dau/18-them-at57ypdc.html) | Thêm app khác | 375×812 |  |
| 19 | [`them-z8femhpg`](bm-lan-dau/19-them-z8femhpg.html) | Đang chờ máy của con | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 20 | [`them-pxgipoxg`](bm-lan-dau/20-them-pxgipoxg.html) | Máy mới «Chặn thật» | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 21 | [`bm1-ob-xong`](bm-lan-dau/21-bm1-ob-xong.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 22 | [`them-o76iq8p5`](bm-lan-dau/22-them-o76iq8p5.html) | Ghép thêm máy | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 23 | [`them-xi3mihop`](bm-lan-dau/23-them-xi3mihop.html) | Mã ghép 6 số | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 24 | [`them-jfyrm0t5`](bm-lan-dau/24-them-jfyrm0t5.html) | Đang chờ máy của con | 375×812 | Bỏ thanh bước Lần đầu (z8femhpg đã tách); chữ «máy mới»; thêm lại «Mã hết hạn rồi? Lấy mã mới» của bản Ghép thêm máy. |
| 25 | [`them-43yoo1by`](bm-lan-dau/25-them-43yoo1by.html) | Đã ghép iPad của Bảo Anh | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 26 | [`bm1-dang-nhap`](bm-lan-dau/26-bm1-dang-nhap.html) | Liên kết «Cần giúp?» → AiiLab hỗ trợ (MCP) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 27 | [`them-yywse9ag`](bm-lan-dau/27-them-yywse9ag.html) | Quên mật khẩu | 390×844 | Làm lại Lần đầu dùng theo logic mới: tối giản, hình thay chữ, mỗi màn 1 việc + CTA nói rõ kết quả; chỉ phụ huynh đăng ký; bỏ Bật thông báo, Ba hay Mẹ; gộp Welcome+Chào, Thiết bị+Ghép máy; nhiệm vụ chọn theo bộ. |
| 28 | [`them-2g3zpiie`](bm-lan-dau/28-them-2g3zpiie.html) | Quên mật khẩu | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 29 | [`them-rwe0b1yq`](bm-lan-dau/29-them-rwe0b1yq.html) | Quên mật khẩu · Nhập mã | 375×812 | Nghi chọn gộp nhập mã vào màn Quên mật khẩu (phương án pa-mw007t65-1); màn tách riêng không dùng nữa |
| 30 | [`them-6aomy24b`](bm-lan-dau/30-them-6aomy24b.html) | Đặt mật khẩu mới | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 31 | [`them-rsbh0ep6`](bm-lan-dau/31-them-rsbh0ep6.html) | Nhận lời mời (thông báo) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 32 | [`them-ux0c23p4`](bm-lan-dau/32-them-ux0c23p4.html) | Chào (được mời) | 375×812 | Sửa thẻ lời mời bị cắt chữ (cho xuống dòng, cụm B M không co). |
| 33 | [`them-0zrwe8yz`](bm-lan-dau/33-them-0zrwe8yz.html) | Đăng ký (được mời) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 34 | [`them-pacl0mle`](bm-lan-dau/34-them-pacl0mle.html) | Nhập mã xác thực (được mời) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 35 | [`bm1-moi`](bm-lan-dau/35-bm1-moi.html) | Gộp dùng chung — nội dung của «Lời mời · A5 Ba Tuấn vào nhà (máy Ba Tuấn)» | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |

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
| 17 | [`bm2-quy`](bm-cai-dat/17-bm2-quy.html) | Quỹ phiếu quà | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
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
| 1 | [`cmt-hom-nay`](con-ngay-thuong/01-cmt-hom-nay.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1002×712 | App của con 9 tuổi trên Windows, ít chữ nhiều hình, chỉ dùng «sao» (10 sao = 10 phút). Hôm nay: còn 18 phút (42/60), 30 sao, 5 nhiệm vụ bộ Tự lập. Nộp ảnh Dọn phòng, ghi âm Đọc sách (viết nếu cần) → chờ duyệt → +10 sao (30→40) hoặc nhờ làm lại. Sao & quà: đổi 10 sao lấy 10 phút, đổi quà gửi Ba Mẹ → Ba Mẹ trao quà. Tin nhắn của Mẹ Lan, Bà Hoa. Màn Mac giữ nguyên. |
| 2 | [`cmt-nhiem-vu-loi-tai`](con-ngay-thuong/02-cmt-nhiem-vu-loi-tai.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1002×712 | App của con 9 tuổi trên Windows, ít chữ nhiều hình, chỉ dùng «sao» (10 sao = 10 phút). Hôm nay: còn 18 phút (42/60), 30 sao, 5 nhiệm vụ bộ Tự lập. Nộp ảnh Dọn phòng, ghi âm Đọc sách (viết nếu cần) → chờ duyệt → +10 sao (30→40) hoặc nhờ làm lại. Sao & quà: đổi 10 sao lấy 10 phút, đổi quà gửi Ba Mẹ → Ba Mẹ trao quà. Tin nhắn của Mẹ Lan, Bà Hoa. Màn Mac giữ nguyên. |
| 3 | [`cmt-nhiem-vu`](con-ngay-thuong/03-cmt-nhiem-vu.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1002×712 | 3 việc «Chưa làm» có nút: Tự đánh răng/Tự xếp cặp «Nộp ảnh» → nộp ảnh; Học với AiiRob tự chấm → «Mở Học với AiiRob». |
| 4 | [`cmt-nop-bai-viet`](con-ngay-thuong/04-cmt-nop-bai-viet.html) | Xoá màn khỏi hành trình | 465×522 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 5 | [`them-1a8jjxnr`](con-ngay-thuong/05-them-1a8jjxnr.html) | Nộp bài: viết kể lại | 1920×1080 |  |
| 6 | [`them-8hxwk83c`](con-ngay-thuong/06-them-8hxwk83c.html) | Đã nộp bài · chờ Ba Mẹ | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 7 | [`them-5vkmq82e`](con-ngay-thuong/07-them-5vkmq82e.html) | Đã nộp bài · chờ Ba Mẹ | 1920×1080 |  |
| 8 | [`them-to3n4hoj`](con-ngay-thuong/08-them-to3n4hoj.html) | Ba Mẹ duyệt bài · cộng điểm | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 9 | [`them-bv15j9q4`](con-ngay-thuong/09-them-bv15j9q4.html) | Ba Mẹ duyệt · +10 sao | 1920×1080 |  |
| 10 | [`them-d42qt32g`](con-ngay-thuong/10-them-d42qt32g.html) | Ba Mẹ nhờ bổ sung bài | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 11 | [`them-52srshg0`](con-ngay-thuong/11-them-52srshg0.html) | Ba Mẹ nhờ bổ sung bài | 1920×1080 |  |
| 12 | [`them-zog8xsfj`](con-ngay-thuong/12-them-zog8xsfj.html) | Ba Mẹ nhờ chụp lại ảnh | 1920×1080 |  |
| 13 | [`cmt-nop-bai-anh-bo-sung`](con-ngay-thuong/13-cmt-nop-bai-anh-bo-sung.html) | Xoá màn khỏi hành trình | 465×522 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 14 | [`them-zeess8mf`](con-ngay-thuong/14-them-zeess8mf.html) | Nộp lại: chọn ảnh bổ sung | 1920×1080 |  |
| 15 | [`cmt-phan-qua`](con-ngay-thuong/15-cmt-phan-qua.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1002×712 | App của con 9 tuổi trên Windows, ít chữ nhiều hình, chỉ dùng «sao» (10 sao = 10 phút). Hôm nay: còn 18 phút (42/60), 30 sao, 5 nhiệm vụ bộ Tự lập. Nộp ảnh Dọn phòng, ghi âm Đọc sách (viết nếu cần) → chờ duyệt → +10 sao (30→40) hoặc nhờ làm lại. Sao & quà: đổi 10 sao lấy 10 phút, đổi quà gửi Ba Mẹ → Ba Mẹ trao quà. Tin nhắn của Mẹ Lan, Bà Hoa. Màn Mac giữ nguyên. |
| 16 | [`cmt-vi-qua`](con-ngay-thuong/16-cmt-vi-qua.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1002×712 | App của con 9 tuổi trên Windows, ít chữ nhiều hình, chỉ dùng «sao» (10 sao = 10 phút). Hôm nay: còn 18 phút (42/60), 30 sao, 5 nhiệm vụ bộ Tự lập. Nộp ảnh Dọn phòng, ghi âm Đọc sách (viết nếu cần) → chờ duyệt → +10 sao (30→40) hoặc nhờ làm lại. Sao & quà: đổi 10 sao lấy 10 phút, đổi quà gửi Ba Mẹ → Ba Mẹ trao quà. Tin nhắn của Mẹ Lan, Bà Hoa. Màn Mac giữ nguyên. |
| 17 | [`cmt-tin-nhan`](con-ngay-thuong/17-cmt-tin-nhan.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1002×712 | App của con 9 tuổi trên Windows, ít chữ nhiều hình, chỉ dùng «sao» (10 sao = 10 phút). Hôm nay: còn 18 phút (42/60), 30 sao, 5 nhiệm vụ bộ Tự lập. Nộp ảnh Dọn phòng, ghi âm Đọc sách (viết nếu cần) → chờ duyệt → +10 sao (30→40) hoặc nhờ làm lại. Sao & quà: đổi 10 sao lấy 10 phút, đổi quà gửi Ba Mẹ → Ba Mẹ trao quà. Tin nhắn của Mẹ Lan, Bà Hoa. Màn Mac giữ nguyên. |
| 18 | [`them-8ae0e45r`](con-ngay-thuong/18-them-8ae0e45r.html) | Ba Mẹ dùng máy | 1920×1080 |  |
| 19 | [`cmt-mac-tin-moi`](con-ngay-thuong/19-cmt-mac-tin-moi.html) | Xoá màn khỏi hành trình | 360×185 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 20 | [`cmt-mac-app-hom-nay`](con-ngay-thuong/20-cmt-mac-app-hom-nay.html) | Xoá màn khỏi hành trình | 1000×760 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 21 | [`cmt-mac-app-nhiem-vu`](con-ngay-thuong/21-cmt-mac-app-nhiem-vu.html) | Xoá màn khỏi hành trình | 1000×760 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 22 | [`cmt-mac-nop-bai`](con-ngay-thuong/22-cmt-mac-nop-bai.html) | Xoá màn khỏi hành trình | 460×450 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 23 | [`cmt-mac-app-phan-qua`](con-ngay-thuong/23-cmt-mac-app-phan-qua.html) | Xoá màn khỏi hành trình | 1000×760 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 24 | [`cmt-mac-app-tin-nhan`](con-ngay-thuong/24-cmt-mac-app-tin-nhan.html) | Xoá màn khỏi hành trình | 1000×760 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 25 | [`them-s65giju3`](con-ngay-thuong/25-them-s65giju3.html) | Ba Mẹ đã trao quà | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 26 | [`them-dm6hkqqy`](con-ngay-thuong/26-them-dm6hkqqy.html) | Ba Mẹ đã trao quà | 1920×1080 |  |
| 27 | [`them-yrj2ibrt`](con-ngay-thuong/27-them-yrj2ibrt.html) | Đã gửi Ba Mẹ (đổi quà) | 428×345 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 28 | [`them-jd003lxp`](con-ngay-thuong/28-them-jd003lxp.html) | Đã gửi Ba Mẹ (đổi quà) | 1920×1080 |  |
| 29 | [`them-jonn19rd`](con-ngay-thuong/29-them-jonn19rd.html) | Đổi quà bằng sao | 428×400 | Thay bằng màn đủ khung (Nghi ok 04/11) |
| 30 | [`them-1zxa6ip0`](con-ngay-thuong/30-them-1zxa6ip0.html) | Đổi quà bằng sao | 1920×1080 |  |
| 31 | [`them-pxorppas`](con-ngay-thuong/31-them-pxorppas.html) | Mac: Đã nộp bài · chờ Ba Mẹ | 460×340 | Dời sang hành trình Mac (Nghi ok 04/11) |

## Con Windows · Mất mạng / sự cố (`con-mat-mang`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cmt-hom-nay-mat-mang`](con-mat-mang/01-cmt-hom-nay-mat-mang.html) | Liên kết «Ba Mẹ dùng máy», «Xin Ba Mẹ thêm giờ» (2 nút) (MCP) | 1002×712 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 2 | [`cmt-khoa-mat-mang`](con-mat-mang/02-cmt-khoa-mat-mang.html) | Vá rà Con Win 04/11 | 1920×1080 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 3 | [`them-y4zv21p3`](con-mat-mang/03-them-y4zv21p3.html) | Khoá khi mất mạng: mã sai | 1920×1080 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 4 | [`them-dsrf5ift`](con-mat-mang/04-them-dsrf5ift.html) | Đã lưu lời xin thêm giờ (màn khoá) | 1920×1080 |  |
| 5 | [`cmt-mac-man-khoa-ma-offline`](con-mat-mang/05-cmt-mac-man-khoa-ma-offline.html) | Xoá màn khỏi hành trình | 1280×1000 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 6 | [`them-rzhbtyhm`](con-mat-mang/06-them-rzhbtyhm.html) | Mac: đang mở tạm bằng mã | 400×360 | Dời sang hành trình Mac (Nghi ok 04/11) |
| 7 | [`cmt-hom-nay-mo-bang-ma`](con-mat-mang/07-cmt-hom-nay-mo-bang-ma.html) | Liên kết «Ba Mẹ dùng máy», «Xin Ba Mẹ thêm giờ» (2 nút) (MCP) | 1002×712 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 8 | [`cmt-hom-nay-dich-vu-tat`](con-mat-mang/08-cmt-hom-nay-dich-vu-tat.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1002×712 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
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
| 6 | [`cmt-khoa-het-gio-dem-nguoc`](con-het-gio/06-cmt-khoa-het-gio-dem-nguoc.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 7 | [`them-uqukvnas`](con-het-gio/07-them-uqukvnas.html) | Hết giờ chơi hôm nay (Windows) | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 8 | [`cmt-khoa-gio-ngu`](con-het-gio/08-cmt-khoa-gio-ngu.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 9 | [`them-gu5qu088`](con-het-gio/09-them-gu5qu088.html) | Giờ học: chỉ mở app học | 1920×1080 |  |
| 10 | [`cmt-khoa-ba-me-khoa`](con-het-gio/10-cmt-khoa-ba-me-khoa.html) | Liên kết «Ba Mẹ dùng máy» → Ba Mẹ dùng máy (MCP) | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
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
| 1 | [`cmt-mac-ghep-may`](con-cai-mac/01-cmt-mac-ghep-may.html) | Liên kết «Ghép máy» → Đang cài (Mac) (MCP) | 460×416 |  |
| 2 | [`cmt-mac-ghep-mot-cham`](con-cai-mac/02-cmt-mac-ghep-mot-cham.html) | Liên kết «Ghép máy», «Dùng mã 6 số thay vì gói cài» (2 nút) (MCP) | 460×414 |  |
| 3 | [`them-y68iyzp4`](con-cai-mac/03-them-y68iyzp4.html) | Mã ghép sai (Mac) | 460×416 |  |
| 4 | [`them-x9z1bmlp`](con-cai-mac/04-them-x9z1bmlp.html) | Đang cài (Mac) | 460×416 |  |
| 5 | [`them-0ltdde49`](con-cai-mac/05-them-0ltdde49.html) | Cài xong (Mac) | 460×416 |  |
| 6 | [`them-fp5wy2y5`](con-cai-mac/06-them-fp5wy2y5.html) | Thông báo tin mới | 360×200 |  |
| 7 | [`them-z86gsj81`](con-cai-mac/07-them-z86gsj81.html) | Mac: Hôm nay | 1000×760 |  |
| 8 | [`them-o1pi9nla`](con-cai-mac/08-them-o1pi9nla.html) | Mac: Nhiệm vụ | 1000×760 |  |
| 9 | [`them-2ozi68mq`](con-cai-mac/09-them-2ozi68mq.html) | Mac: Nộp bài | 460×450 |  |
| 10 | [`them-r6eya42m`](con-cai-mac/10-them-r6eya42m.html) | Mac: Phần quà & điểm | 1000×760 |  |
| 11 | [`them-rn20lwi7`](con-cai-mac/11-them-rn20lwi7.html) | Mac: Tin nhắn | 1000×760 |  |
| 12 | [`them-3ve41yps`](con-cai-mac/12-them-3ve41yps.html) | Mac: Đã nộp bài · chờ Ba Mẹ | 460×340 |  |
| 13 | [`them-4wmbhz9f`](con-cai-mac/13-them-4wmbhz9f.html) | Nhắc còn 5 phút | 320×200 |  |
| 14 | [`them-vbafecic`](con-cai-mac/14-them-vbafecic.html) | Đếm ngược trên Mac | 1280×900 |  |
| 15 | [`them-kofpo0dl`](con-cai-mac/15-them-kofpo0dl.html) | Mac: màn khoá hết giờ | 1280×860 |  |
| 16 | [`them-zsf6b45n`](con-cai-mac/16-them-zsf6b45n.html) | Xin thêm giờ (Mac) | 440×371 |  |
| 17 | [`them-s9zxgltm`](con-cai-mac/17-them-s9zxgltm.html) | Xin thêm giờ (Mac) + đổi điểm | 440×429 |  |
| 18 | [`them-shh2qdpw`](con-cai-mac/18-them-shh2qdpw.html) | Xin mở trang hoặc app | 440×395 |  |
| 19 | [`them-zkgjog14`](con-cai-mac/19-them-zkgjog14.html) | Đã gửi Ba Mẹ (Mac) | 440×352 |  |
| 20 | [`them-0k1r3wsl`](con-cai-mac/20-them-0k1r3wsl.html) | Chơi bằng điểm (Mac) | 420×438 |  |
| 21 | [`them-x3qk4kp9`](con-cai-mac/21-them-x3qk4kp9.html) | Đã đổi: +30 phút chơi (Mac) | 420×330 |  |
| 22 | [`them-8efbpmkb`](con-cai-mac/22-them-8efbpmkb.html) | Ba Mẹ cho thêm giờ (Mac) | 440×320 |  |
| 23 | [`them-39y24jad`](con-cai-mac/23-them-39y24jad.html) | Ba Mẹ chưa cho thêm giờ (Mac) | 440×380 |  |
| 24 | [`them-sw37ub0p`](con-cai-mac/24-them-sw37ub0p.html) | Mac: app chưa được mở | 400×360 |  |
| 25 | [`them-5ici9ysd`](con-cai-mac/25-them-5ici9ysd.html) | Đã gửi Ba Mẹ (Mac) | 400×360 |  |
| 26 | [`them-2ndg9bu6`](con-cai-mac/26-them-2ndg9bu6.html) | Mac: khoá, nhập mã mở | 1280×1000 |  |
| 27 | [`them-45hk69p9`](con-cai-mac/27-them-45hk69p9.html) | Mac: đang mở tạm bằng mã | 400×360 |  |

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
| 3 | [`cmt-cai-chon-tai-khoan`](con-cai-win/03-cmt-cai-chon-tai-khoan.html) | Chốt Con Win 04/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 4 | [`cmt-cai-tao-tai-khoan`](con-cai-win/04-cmt-cai-tao-tai-khoan.html) | Chốt Con Win 04/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 5 | [`cmt-cai-chi-mot-tai-khoan-quan-tri`](con-cai-win/05-cmt-cai-chi-mot-tai-khoan-quan-tri.html) | Chốt Con Win 04/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 6 | [`cmt-cai-ma-ghep`](con-cai-win/06-cmt-cai-ma-ghep.html) | Chốt Con Win 04/11 · vá | 723×672 | Thêm dòng nhỏ «Thử: mã không đúng ›» sang màn Mã ghép không đúng. |
| 7 | [`cmt-cai-ma-ghep-sai`](con-cai-win/07-cmt-cai-ma-ghep-sai.html) | Vá rà Con Win 04/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 8 | [`them-3al4wwbt`](con-cai-win/08-them-3al4wwbt.html) | Mã ghép không đúng | 723×672 |  |
| 9 | [`cmt-cai-dang-cai`](con-cai-win/09-cmt-cai-dang-cai.html) | Chốt Con Win 04/11 · vá | 723×672 | Bỏ 2 nút demo «▶ Xem:». Thanh tiến độ + dòng chân → Xong; dòng nhỏ «Gặp lỗi? Mã hết hạn › · Mất mạng ›». |
| 10 | [`cmt-cai-loi-ghep`](con-cai-win/10-cmt-cai-loi-ghep.html) | Vá rà Con Win 04/11 | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
| 11 | [`them-cm4qtbgw`](con-cai-win/11-them-cm4qtbgw.html) | Cài: máy mất mạng | 723×672 |  |
| 12 | [`cmt-cai-xong`](con-cai-win/12-cmt-cai-xong.html) | Liên kết «Để sau» → Menu khay hệ thống (MCP) | 723×672 | Tối giản 04/11: Ba Mẹ chạy bộ cài trên Laptop của Bảo Anh. Mỗi màn 1 việc, câu ngắn nói với Ba Mẹ, icon 3D + Rob thay chữ, CTA nói rõ kết quả. Ghép bằng mã 6 số (482 017, 10 phút) hiện trên điện thoại Ba Mẹ (bm1-ob-ghep); link Ba Mẹ gửi thì tự ghép. Màn cuối cho con thấy máy đã sẵn sàng. |
