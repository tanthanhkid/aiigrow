# Thiết kế đã chốt — xuất từ aiigrow-figma

Nguồn: bàn https://aiigrow-figma.aiilab.vn (Nghi chốt 03–04/11/2026), bản sao lưu `tanthanhkid/aiigrow-thiet-ke` brainstorm-ui.
Mỗi màn = HTML phiên bản hiện hành. `data-toi="<key>"` trên nút = màn đích khi bấm. Mở file .html trong trình duyệt để xem.
Tổng 392 màn, 32 hành trình.


## Ba Mẹ · Hằng ngày (`bm-hang-ngay`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-trang-chu`](bm-hang-ngay/01-bm2-trang-chu.html) | Trang chủ | 375×812 | Nghi chốt tên tab Chặn 14/11; chỉ đổi nhãn tab, phần còn lại giữ nguyên v29 |
| 2 | [`them-0kwhgpq6`](bm-hang-ngay/02-them-0kwhgpq6.html) | MỚI · Trang chủ · máy đang khoá | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 3 | [`them-b75sn2x1`](bm-hang-ngay/03-them-b75sn2x1.html) | MỚI · Trang chủ · Bảo Minh | 375×812 |  |
| 4 | [`them-1mnk3mjz`](bm-hang-ngay/04-them-1mnk3mjz.html) | Hôm nay · máy con mất mạng | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 5 | [`them-sll7clha`](bm-hang-ngay/05-them-sll7clha.html) | Xác nhận khoá mọi máy | 375×812 | Đồng bộ kiểu Trang chủ: sheet nổi trên Trang chủ làm mờ; máy và giờ khớp cảnh (Roblox từ 19:02, Máy ảnh iPad 18:40; khoá tới 20:10/20:40/6:30); «Thôi» thành nút phụ trắng. |
| 6 | [`them-6wjhze1d`](bm-hang-ngay/06-them-6wjhze1d.html) | Cho thêm giờ | 375×812 | Đồng bộ kiểu Trang chủ: sheet nổi trên Trang chủ làm mờ; dòng phụ «Đang còn 18 phút»; ô chọn phút dạng lõm (chọn = teal); thẻ vàng sao thành chip sao nhỏ; «Thôi» thành nút phụ trắng; CTA nói kết quả. |
| 7 | [`them-rz77kk45`](bm-hang-ngay/07-them-rz77kk45.html) | Mã mở máy cho Bảo Anh | 375×812 | Màn con theo kiểu them-c95l1cwc: back + tiêu đề 22px, bỏ tab bar; thẻ mã to; chọn thời gian kèm giờ khoá lại (19:40 → 20:10); 2 dòng nói rõ sau đó ra sao; nút đáy cố định: chính than chì «Gửi mã, mở 30 phút», phụ trắng «Sao chép mã». |
| 8 | [`them-s8nltlaa`](bm-hang-ngay/08-them-s8nltlaa.html) | Đã mở máy bằng mã | 375×812 | Đồng bộ kiểu Trang chủ: sheet nổi trên Trang chủ làm mờ; bỏ «Có mạng lại 19:52» (sau giờ cảnh) → «Mở tới 20:10 · chưa có mạng»; icon mở khoá; «Đóng» thành nút phụ trắng. |
| 9 | [`them-0xf9hrgn`](bm-hang-ngay/09-them-0xf9hrgn.html) | Thông báo | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 10 | [`them-lsf4eews`](bm-hang-ngay/10-them-lsf4eews.html) | Cảnh báo: trang bị chặn | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 11 | [`them-c4ldnqj8`](bm-hang-ngay/11-them-c4ldnqj8.html) | MỚI · Cảnh báo: Grow bị tắt trên Laptop | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 12 | [`them-y5iwt1fv`](bm-hang-ngay/12-them-y5iwt1fv.html) | MỚI · Cảnh báo: iPad mất liên lạc hơn 1 ngày | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 13 | [`them-41qllcvh`](bm-hang-ngay/13-them-41qllcvh.html) | MỚI · Trang chủ màu thương hiệu | 375×812 |  |
| 14 | [`them-uwrfhf4a`](bm-hang-ngay/14-them-uwrfhf4a.html) | MỚI · Trang chủ gọn: để ý + đang chặn · | 375×812 |  |

## Ba Mẹ · Lần đầu dùng (`bm-lan-dau`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-welcome`](bm-lan-dau/01-bm1-welcome.html) | Chốt 04/11 | 390×844 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 2 | [`bm1-chao`](bm-lan-dau/02-bm1-chao.html) | Đổi tên Rob → Grow | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 3 | [`bm1-dang-ky`](bm-lan-dau/03-bm1-dang-ky.html) | Sửa tay | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 4 | [`them-ahk69dtl`](bm-lan-dau/04-them-ahk69dtl.html) | Số đã có tài khoản | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 5 | [`bm1-otp`](bm-lan-dau/05-bm1-otp.html) | Chốt 04/11 | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |

## Ba Mẹ · Ứng dụng & web (`bm-ung-dung`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-ung-dung-may`](bm-ung-dung/01-bm2-ung-dung-may.html) | Ứng dụng trên máy | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web → «Chặn app & web»; Grow dời xuống để tên dài không đè |
| 2 | [`them-98obxv7x`](bm-ung-dung/02-them-98obxv7x.html) | Chặn · đang Mở hết | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 3 | [`them-g7g1cel5`](bm-ung-dung/03-them-g7g1cel5.html) | App của Bảo Anh (danh sách) | 375×812 | Nghi 14/11: tính giờ chỉ ghi là tính giờ, không ghi thêm; App và Web cùng một kiểu |
| 4 | [`them-vw103x88`](bm-ung-dung/04-them-vw103x88.html) | Thêm app cho Bảo Anh | 375×812 | Nghi 14/11: Thêm app làm hết trong 1 màn. Ô tìm không nhảy màn; chạm ＋ → app lên khối «Đã chọn» ở trên, chọn ngay Dùng thoải mái / Tính giờ; Lưu → về danh sách App. |
| 5 | [`bm2-app-web`](bm-ung-dung/05-bm2-app-web.html) | Ứng dụng (chưa xếp) | 375×812 | App và Web cùng chữ; bỏ CSS thừa của ô quỹ giờ |
| 6 | [`them-f6uevhi9`](bm-ung-dung/06-them-f6uevhi9.html) | Đã chặn Roblox | 375×812 | Nghi 14/11: lưu xong quay lại danh sách App, bỏ màn Đã chặn |
| 7 | [`bm2-web`](bm-ung-dung/07-bm2-web.html) | Trang web | 375×812 | Nghi 14/11: trang web cũng theo đèn — Xanh vào thoải mái, Vàng tính giờ, Đỏ đang chặn có nút Gỡ chặn; Luôn chặn tách riêng (không gỡ được) |
| 8 | [`them-2nupeqju`](bm-ung-dung/08-them-2nupeqju.html) | Chi tiết trang web (đèn) | 375×812 |  |
| 9 | [`them-z5tok79i`](bm-ung-dung/09-them-z5tok79i.html) | Đã chặn trang web | 375×812 | Nghi 14/11: lưu xong quay lại danh sách Web, bỏ màn Đã chặn |
| 10 | [`them-yzl99l3y`](bm-ung-dung/10-them-yzl99l3y.html) | Thêm trang web cho Bảo Anh | 375×812 | Nghi 14/11: Thêm web làm hết trong 1 màn, ngang với Thêm app. Dán địa chỉ + Thêm hoặc chạm ＋ → trang lên khối «Đã chọn», chọn Vào thoải mái / Tính giờ; Lưu → về danh sách Web. |
| 11 | [`them-1g0mpf21`](bm-ung-dung/11-them-1g0mpf21.html) | Luôn chặn | 375×812 | Khớp màn chính tab Chặn: nút «Xong, về App của Bảo Anh» → «Xong» (về tab Chặn) |
| 12 | [`them-hppe9qh6`](bm-ung-dung/12-them-hppe9qh6.html) | Đã không cho | 375×812 | Nghi 14/11: không ghi còn bao nhiêu phút/tổng; dòng 2 nói YouTube vẫn chặn |
| 13 | [`bm2-yeu-cau-web`](bm-ung-dung/13-bm2-yeu-cau-web.html) | Yêu cầu mở web | 375×812 | Nghi 14/11: không ghi còn bao nhiêu phút/tổng |

## Con Windows · Bị chặn (`con-bi-chan`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-ngxcf4sq`](con-bi-chan/01-them-ngxcf4sq.html) | Desktop Windows của Bảo Anh | 1920×1080 | Nghi chốt 09/11 tên chế độ dễ hiểu; đồng bộ toàn bàn |
| 2 | [`them-vc4dmaei`](con-bi-chan/02-them-vc4dmaei.html) | App chưa được mở | 1920×1080 |  |
| 3 | [`them-cbdu6n78`](con-bi-chan/03-them-cbdu6n78.html) | Đã gửi Ba Mẹ (xin app) | 1920×1080 |  |
| 4 | [`them-jj6fglkl`](con-bi-chan/04-them-jj6fglkl.html) | Ba Mẹ đã cho phép app | 1920×1080 |  |
| 5 | [`them-fliq9312`](con-bi-chan/05-them-fliq9312.html) | Ba Mẹ chưa cho app | 1920×1080 |  |
| 6 | [`them-zxuekzer`](con-bi-chan/06-them-zxuekzer.html) | Hết giờ (popup) | 1920×1080 |  |
| 7 | [`them-rgy15s87`](con-bi-chan/07-them-rgy15s87.html) | Xin thêm giờ từ màn chặn | 1920×1080 |  |
| 8 | [`them-dnm1pzqs`](con-bi-chan/08-them-dnm1pzqs.html) | Trang web Ba Mẹ đã chặn | 1920×1080 |  |
| 9 | [`them-bsnppls7`](con-bi-chan/09-them-bsnppls7.html) | Đã gửi Ba Mẹ (xin web) | 1920×1080 |  |
| 10 | [`them-0uw5wpyr`](con-bi-chan/10-them-0uw5wpyr.html) | Ba Mẹ mở trang web | 1920×1080 |  |
| 11 | [`them-nle7pkdv`](con-bi-chan/11-them-nle7pkdv.html) | Ba Mẹ chưa mở trang web | 1920×1080 |  |

## Ba Mẹ · Duyệt (`bm-duyet`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|

## Ba Mẹ · Cài đặt & hỗ trợ (`bm-cai-dat`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-gia-dinh`](bm-cai-dat/01-bm2-gia-dinh.html) | Gia đình | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 2 | [`them-99ji705p`](bm-cai-dat/02-them-99ji705p.html) | Tab Cả nhà | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 3 | [`them-0uobhmvh`](bm-cai-dat/03-them-0uobhmvh.html) | Mời người nhà | 375×812 | Đồng bộ kiểu mẫu: thanh trên back 44px + tiêu đề 22px, nút gửi ngay dưới nội dung (bỏ khoảng trống lớn), cùng trông 4 con |
| 4 | [`them-wewdno56`](bm-cai-dat/04-them-wewdno56.html) | Lời mời · A3 Đã mời, Ba Tuấn có app (Mẹ) | 375×812 | Đồng bộ kiểu Hằng ngày đã chốt: chấm chờ đổi vàng sang cam (vàng chỉ cho sao), bớt khoảng trống trên nút, «Xem bên máy Ba Tuấn» bấm được, lời mời nói 4 bé |
| 5 | [`them-dclemm2i`](bm-cai-dat/05-them-dclemm2i.html) | Lời mời · A4 Thông báo (máy Ba Tuấn) | 375×812 | Khớp cảnh mẫu: giờ 19:40 thứ Ba 3/11; lời mời nói 4 bé như màn Đã mời |
| 6 | [`them-vpveq9u5`](bm-cai-dat/06-them-vpveq9u5.html) | Lời mời · A5 Ba Tuấn vào nhà (máy Ba Tuấn) | 375×812 | Đồng bộ kiểu Hằng ngày: viền vàng quanh avatar Ba Tuấn đổi teal (vàng chỉ cho sao); nhà có 4 bé, bỏ dòng lặp; bớt khoảng trống trên nút |
| 7 | [`them-mflye65x`](bm-cai-dat/07-them-mflye65x.html) | Lời mời · B3 Đã mời, Ba Tuấn chưa có app (Mẹ) | 375×812 | Thanh trên theo kiểu chốt: nút back teal 44px + tiêu đề 22px cùng hàng («Mời Ba Tuấn»); giữ Rob và nội dung |
| 8 | [`them-6pl067n2`](bm-cai-dat/08-them-6pl067n2.html) | Lời mời · B4 Ba Tuấn nhận link (máy Ba Tuấn) | 375×812 | Khớp cảnh mẫu: giờ tin 19:38; thẻ link có đủ 4 bé; viền vàng quanh Ba Tuấn đổi teal (vàng chỉ cho sao) |
| 9 | [`them-3ajv6rd1`](bm-cai-dat/09-them-3ajv6rd1.html) | Đăng ký (được mời) | 375×812 | Thẻ lời mời gọn: tiêu đề 1 dòng, «Cùng trông 4 bé» + 4 avatar con dưới; thanh trên back + tiêu đề cùng hàng |
| 10 | [`bm2-thanh-vien`](bm-cai-dat/10-bm2-thanh-vien.html) | Thành viên | 375×812 | Đồng bộ kiểu mẫu: thanh trên back 44px + tên 22px, danh sách .lg, sửa icon vỡ, bỏ khoảng trống trên nút, nút «Mời rời nhà» vùng chạm 46px |
| 11 | [`bm2-ho-tro`](bm-cai-dat/11-bm2-ho-tro.html) | AiiLab hỗ trợ | 375×812 | Làm lại Cài đặt & hỗ trợ theo logic Sếp 03/11: màn trùng Hằng ngày dùng đúng HTML gốc, dãy lời mời giữ nguyên, hỗ trợ dạng chat đơn giản, sao thay điểm, không phân biệt Ba/Mẹ. |
| 12 | [`bm2-quy`](bm-cai-dat/12-bm2-quy.html) | Quỹ phiếu quà | 375×812 | Back + tiêu đề 22px cùng hàng; bỏ emoji và màu xanh dương ngoài bảng → icon 3D trong ô lõm, giá tiền xám, sao vàng; «Mua» nhãn teal nhạt; vùng cuộn chừa đệm để vé cuối không bị nút Xong che. |
| 13 | [`bm2-admin-ho-tro`](bm-cai-dat/13-bm2-admin-ho-tro.html) | Hộp thư hỗ trợ (quản trị) | 375×812 | Đồng bộ kiểu Hằng ngày: tiêu đề tab 28px; tên phụ huynh 1 dòng, «nhà …» xuống dòng phụ, không rớt chữ; Ba Tuấn thuộc nhà Bảo Anh |

## Con Windows · Xin thêm giờ / xin mở (`con-xin`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-xsmcu9jj`](con-xin/01-them-xsmcu9jj.html) | Xin thêm giờ | 1920×1080 |  |
| 2 | [`them-luui7gvq`](con-xin/02-them-luui7gvq.html) | Đã gửi Ba Mẹ (xin giờ) | 1920×1080 |  |
| 3 | [`them-fsif1cbl`](con-xin/03-them-fsif1cbl.html) | Ba Mẹ cho thêm giờ | 1920×1080 |  |
| 4 | [`them-zo8kohea`](con-xin/04-them-zo8kohea.html) | Ba Mẹ chưa cho thêm giờ | 1920×1080 |  |
| 5 | [`them-bxw40sw9`](con-xin/05-them-bxw40sw9.html) | Xin mở app (YouTube) | 1920×1080 |  |
| 6 | [`them-6tn8aozf`](con-xin/06-them-6tn8aozf.html) | Đã gửi Ba Mẹ (xin mở app) | 1920×1080 |  |
| 7 | [`them-359v1pre`](con-xin/07-them-359v1pre.html) | Ba Mẹ cho mở app | 1920×1080 |  |
| 8 | [`them-vkdikuo0`](con-xin/08-them-vkdikuo0.html) | Ba Mẹ chưa cho mở app | 1920×1080 |  |
| 9 | [`them-a7sh10qs`](con-xin/09-them-a7sh10qs.html) | Đổi sao lấy giờ | 1920×1080 |  |
| 10 | [`them-8e93d001`](con-xin/10-them-8e93d001.html) | Đã đổi: +10 phút | 1920×1080 |  |
| 11 | [`them-l60r9s84`](con-xin/11-them-l60r9s84.html) | Chưa đủ sao | 1920×1080 |  |

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
| 12 | [`them-1a8jjxnr`](con-ngay-thuong/12-them-1a8jjxnr.html) | Nộp bài: viết kể lại | 1920×1080 |  |
| 13 | [`them-5vkmq82e`](con-ngay-thuong/13-them-5vkmq82e.html) | Đã nộp bài · chờ Ba Mẹ | 1920×1080 |  |
| 14 | [`them-bv15j9q4`](con-ngay-thuong/14-them-bv15j9q4.html) | Ba Mẹ duyệt · +10 sao | 1920×1080 |  |
| 15 | [`them-52srshg0`](con-ngay-thuong/15-them-52srshg0.html) | Ba Mẹ nhờ bổ sung bài | 1920×1080 |  |
| 16 | [`them-zog8xsfj`](con-ngay-thuong/16-them-zog8xsfj.html) | Ba Mẹ nhờ chụp lại ảnh | 1920×1080 |  |
| 17 | [`them-zeess8mf`](con-ngay-thuong/17-them-zeess8mf.html) | Nộp lại: chọn ảnh bổ sung | 1920×1080 |  |
| 18 | [`cmt-phan-qua`](con-ngay-thuong/18-cmt-phan-qua.html) | QUÀ 06/11 · Win Sao & quà giá mới | 1002×712 | Giữ nguyên kiểu Windows và 30 sao. Bảng quà theo giá Nghi chốt 06/11 (7 quà, có điều kiện), Đi ăn kem đang giữ 100 sao chờ Ba Mẹ trao; bỏ «Thêm 30 phút» khỏi cửa hàng (phút đổi bằng nút riêng); bữa tối nổi bật còn thiếu 20 sao → màn Đổi quà; danh sách cuộn, hàng cuối lấp ló. |
| 19 | [`cmt-vi-qua`](con-ngay-thuong/19-cmt-vi-qua.html) | Chốt quà 06/11 · Ví quà | 1002×712 | Giữ nguyên màn Windows. Đi ăn kem: đang giữ 100 sao, Ba Mẹ trao mới trừ. «Đã nhận» thay Xem phim 40 sao bằng Voucher AiiCafe 50k (500 sao) có mã QR bấm mở, hạn 25/12, còn 49 ngày. |
| 20 | [`cmt-tin-nhan`](con-ngay-thuong/20-cmt-tin-nhan.html) | Liên kết «Ba Mẹ dùng máy» → MỚI PIN · Win · Ba Mẹ nhập mã (MCP) | 1002×712 | App của con 9 tuổi trên Windows, ít chữ nhiều hình, chỉ dùng «sao» (10 sao = 10 phút). Hôm nay: còn 18 phút (42/60), 30 sao, 5 nhiệm vụ bộ Tự lập. Nộp ảnh Dọn phòng, ghi âm Đọc sách (viết nếu cần) → chờ duyệt → +10 sao (30→40) hoặc nhờ làm lại. Sao & quà: đổi 10 sao lấy 10 phút, đổi quà gửi Ba Mẹ → Ba Mẹ trao quà. Tin nhắn của Mẹ Lan, Bà Hoa. Màn Mac giữ nguyên. |
| 21 | [`them-dm6hkqqy`](con-ngay-thuong/21-them-dm6hkqqy.html) | Ba Mẹ đã trao quà | 1920×1080 |  |
| 22 | [`them-jd003lxp`](con-ngay-thuong/22-them-jd003lxp.html) | Đã gửi Ba Mẹ (đổi quà) | 1920×1080 |  |
| 23 | [`them-1zxa6ip0`](con-ngay-thuong/23-them-1zxa6ip0.html) | Đổi quà bằng sao | 1920×1080 | Khớp bảng giá quà 06/11: hộp xác nhận đổi Chọn món bữa tối 50 sao (con có 30 sao, còn thiếu 20), danh sách quà đúng giá. |
| 24 | [`them-8ae0e45r`](con-ngay-thuong/24-them-8ae0e45r.html) | MỚI · Con định tắt/gỡ AiiGrow (Windows) | 1920×1080 | FR-01.05: con cố thoát/gỡ AiiGrow trên Windows → phải có mã của Ba Mẹ, Ba Mẹ được báo |
| 25 | [`them-jonn19rd`](con-ngay-thuong/25-them-jonn19rd.html) | MỚI · Chuỗi 5 ngày · lên Cấp 3 (Windows) | 428×400 | FR-03.06; 5 ngày liền T6→T3 (hôm nay Thứ Ba như màn Hôm nay) |

## Con Windows · Mất mạng / sự cố (`con-mat-mang`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`cmt-hom-nay-mat-mang`](con-mat-mang/01-cmt-hom-nay-mat-mang.html) | Đổi tên chế độ: Chỉ app Ba Mẹ chọn / Dùng mọi app | 1002×712 | Nghi chốt 09/11 tên chế độ dễ hiểu; đồng bộ toàn bàn |
| 2 | [`cmt-khoa-mat-mang`](con-mat-mang/02-cmt-khoa-mat-mang.html) | Vá rà Con Win 04/11 | 1920×1080 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 3 | [`them-y4zv21p3`](con-mat-mang/03-them-y4zv21p3.html) | Khoá khi mất mạng: mã sai | 1920×1080 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 4 | [`them-dsrf5ift`](con-mat-mang/04-them-dsrf5ift.html) | Đã lưu lời xin thêm giờ (màn khoá) | 1920×1080 |  |
| 5 | [`cmt-hom-nay-mo-bang-ma`](con-mat-mang/05-cmt-hom-nay-mo-bang-ma.html) | Liên kết «Ba Mẹ dùng máy» → MỚI PIN · Win · Ba Mẹ nhập mã (MCP) | 1002×712 | Mất mạng/sự cố vẫn giữ luật (vẫn tính giờ, vẫn chặn); câu ngắn trấn an, mỗi màn 1 việc; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có nút Gọi Ba Mẹ / Hỏi AiiGrow. Mac giữ nguyên. |
| 6 | [`cmt-hom-nay-dich-vu-tat`](con-mat-mang/06-cmt-hom-nay-dich-vu-tat.html) | Đổi tên chế độ: Chặn app & web | 1002×712 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 7 | [`them-yzos9w9i`](con-mat-mang/07-them-yzos9w9i.html) | Hỏi AiiGrow (Con) | 1920×1080 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 8 | [`them-wt782i6x`](con-mat-mang/08-them-wt782i6x.html) | Chặn app khi mất mạng | 1920×1080 |  |
| 9 | [`them-rn7iaunn`](con-mat-mang/09-them-rn7iaunn.html) | Đã lưu yêu cầu (chờ có mạng) | 1920×1080 |  |
| 10 | [`them-a86wn24i`](con-mat-mang/10-them-a86wn24i.html) | Đã lưu lời xin thêm giờ (mất mạng) | 1920×1080 | Nghi chốt 09/11 tên chế độ dễ hiểu; đồng bộ toàn bàn |
| 11 | [`them-yx0id8do`](con-mat-mang/11-them-yx0id8do.html) | Cập nhật AiiGrow | 1920×1080 |  |
| 12 | [`them-o3lgj4dx`](con-mat-mang/12-them-o3lgj4dx.html) | Đã là bản mới nhất | 1920×1080 |  |
| 13 | [`them-g4d1cfk1`](con-mat-mang/13-them-g4d1cfk1.html) | Menu khay hệ thống | 1920×1080 |  |

## Con Windows · Hết giờ / khoá (`con-het-gio`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-da3zy02w`](con-het-gio/01-them-da3zy02w.html) | Nhắc còn 5 phút (Windows) | 1920×1080 |  |
| 2 | [`cmt-khoa-het-gio-dem-nguoc`](con-het-gio/02-cmt-khoa-het-gio-dem-nguoc.html) | Chốt PIN máy tính 06/11 | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 3 | [`them-uqukvnas`](con-het-gio/03-them-uqukvnas.html) | Hết giờ chơi hôm nay (Windows) | 1920×1080 | Màn khoá hết giờ theo bé: nút nhỏ «Đổi bé» và «Ba Mẹ mở máy» (mã Ba Mẹ). |
| 4 | [`cmt-khoa-gio-ngu`](con-het-gio/04-cmt-khoa-gio-ngu.html) | Chốt PIN máy tính 06/11 | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 5 | [`them-gu5qu088`](con-het-gio/05-them-gu5qu088.html) | Giờ học: chỉ mở app học | 1920×1080 |  |
| 6 | [`cmt-khoa-ba-me-khoa`](con-het-gio/06-cmt-khoa-ba-me-khoa.html) | Chốt PIN máy tính 06/11 | 1920×1080 | Con 9 tuổi trên Windows, ít chữ nhiều hình, dùng «sao» (10 sao = 10 phút, con có 30 sao). Đếm ngược 0:45 → Hết giờ chơi 60/60 (đổi sao / xin Ba Mẹ / ngoại lệ) → Giờ ngủ 21:30 → Ba Mẹ khoá máy (Mẹ Lan) → xin mở ngoại lệ Học với AiiRob 15 phút → chờ → Ba Mẹ cho / chưa cho. Màn Mac giữ nguyên HTML. |
| 7 | [`them-fexyjjes`](con-het-gio/07-them-fexyjjes.html) | Xin Ba Mẹ mở ngoại lệ | 1920×1080 |  |
| 8 | [`them-ccicio1r`](con-het-gio/08-them-ccicio1r.html) | Xin mở ngoại lệ (giờ học) | 1920×1080 |  |
| 9 | [`them-tig5bfve`](con-het-gio/09-them-tig5bfve.html) | Đã gửi Ba Mẹ (xin mở ngoại lệ) | 1920×1080 |  |
| 10 | [`them-ya6230ug`](con-het-gio/10-them-ya6230ug.html) | Ba Mẹ cho mở ngoại lệ | 1920×1080 |  |
| 11 | [`them-agdu7c52`](con-het-gio/11-them-agdu7c52.html) | Ba Mẹ chưa cho mở ngoại lệ | 1920×1080 |  |

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
| 34 | [`them-tf7nd1l7`](con-cai-mac/34-them-tf7nd1l7.html) | Mac: Khoá giờ ngủ | 1280×860 |  |
| 35 | [`them-8yfbs3f3`](con-cai-mac/35-them-8yfbs3f3.html) | Mac: Xin mở ngoại lệ (giờ ngủ) | 1280×860 |  |
| 36 | [`them-kg2sqdng`](con-cai-mac/36-them-kg2sqdng.html) | Mac: Đã gửi Ba Mẹ (ngoại lệ, giờ ngủ) | 1280×860 |  |
| 37 | [`them-5kzjn4hf`](con-cai-mac/37-them-5kzjn4hf.html) | Mac: Ba Mẹ cho mở ngoại lệ (giờ ngủ) | 1280×860 |  |
| 38 | [`them-3gs80agp`](con-cai-mac/38-them-3gs80agp.html) | Mac: Ba Mẹ chưa cho ngoại lệ (giờ ngủ) | 1280×860 |  |
| 39 | [`them-dvo45hys`](con-cai-mac/39-them-dvo45hys.html) | Mac: Giờ học · chỉ app học | 1280×860 |  |
| 40 | [`them-2lgu2bbn`](con-cai-mac/40-them-2lgu2bbn.html) | Mac: Xin mở ngoại lệ (giờ học) | 1280×860 |  |
| 41 | [`them-e5g29hhd`](con-cai-mac/41-them-e5g29hhd.html) | Mac: Đã gửi Ba Mẹ (ngoại lệ, giờ học) | 1280×860 |  |
| 42 | [`them-8kunyc5s`](con-cai-mac/42-them-8kunyc5s.html) | Mac: Ba Mẹ cho mở ngoại lệ (giờ học) | 1280×860 |  |
| 43 | [`them-fy6o6c7c`](con-cai-mac/43-them-fy6o6c7c.html) | Mac: Ba Mẹ chưa cho ngoại lệ (giờ học) | 1280×860 |  |
| 44 | [`them-zsf6b45n`](con-cai-mac/44-them-zsf6b45n.html) | Xin thêm giờ (Mac) | 440×371 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 45 | [`them-s9zxgltm`](con-cai-mac/45-them-s9zxgltm.html) | Xin thêm giờ từ màn khoá (Mac) | 440×429 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 46 | [`them-shh2qdpw`](con-cai-mac/46-them-shh2qdpw.html) | Xin mở trang hoặc app | 440×395 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 47 | [`them-zkgjog14`](con-cai-mac/47-them-zkgjog14.html) | Đã gửi Ba Mẹ (Mac) | 440×352 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 48 | [`them-0k1r3wsl`](con-cai-mac/48-them-0k1r3wsl.html) | Đổi sao lấy giờ (Mac) | 420×438 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 49 | [`them-x3qk4kp9`](con-cai-mac/49-them-x3qk4kp9.html) | Đã đổi +10 phút (Mac) | 420×330 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 50 | [`them-51ahzmk9`](con-cai-mac/50-them-51ahzmk9.html) | Mac: Chưa đủ sao | 420×390 |  |
| 51 | [`them-8efbpmkb`](con-cai-mac/51-them-8efbpmkb.html) | Ba Mẹ cho thêm giờ (Mac) | 440×320 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 52 | [`them-39y24jad`](con-cai-mac/52-them-39y24jad.html) | Ba Mẹ chưa cho thêm giờ (Mac) | 440×380 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 53 | [`them-sw37ub0p`](con-cai-mac/53-them-sw37ub0p.html) | Mac: app chưa được mở | 400×360 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 54 | [`them-5ici9ysd`](con-cai-mac/54-them-5ici9ysd.html) | Đã gửi Ba Mẹ (Mac) | 400×360 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 55 | [`them-oduos66h`](con-cai-mac/55-them-oduos66h.html) | Mac: Ba Mẹ cho mở app | 440×320 |  |
| 56 | [`them-t66cmp4a`](con-cai-mac/56-them-t66cmp4a.html) | Mac: Ba Mẹ chưa cho mở app | 440×380 |  |
| 57 | [`them-2ndg9bu6`](con-cai-mac/57-them-2ndg9bu6.html) | Mac: khoá, nhập mã mở | 1280×1000 | Nối màn Mac mới (pkg, Ba Mẹ dùng máy, quà, giờ ngủ/học...) |
| 58 | [`them-qa6tsua3`](con-cai-mac/58-them-qa6tsua3.html) | Mac: Đã lưu lời xin (mất mạng) | 440×340 |  |
| 59 | [`them-45hk69p9`](con-cai-mac/59-them-45hk69p9.html) | Mac: đang mở tạm bằng mã | 400×360 | Mac · Tối giản 05/11: bước cài Mac đủ (kéo .dmg vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai → bật quyền Thời gian sử dụng, Thông báo, Mở cùng máy → xong sang Ba Mẹ). Màn dùng hằng ngày lấy đúng nội dung + số liệu bản Con – Windows đã chốt (18 phút, 42/60, 30 sao, 10 sao = 10 phút, Bộ Tự lập 5 việc), đổi khung Mac: nút đỏ-vàng-xanh, thanh menu, Dock, Control+⌘+Q. |
| 60 | [`them-xe0zv9p7`](con-cai-mac/60-them-xe0zv9p7.html) | MỚI · Con định tắt/gỡ AiiGrow (Mac) | 440×430 | FR-01.05: con thoát/kéo AiiGrow vào Thùng rác trên Mac → cần mã Ba Mẹ, Ba Mẹ được báo |

## Ba Mẹ · Ghép thêm máy (`bm-ghep-may`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-may-ds`](bm-ghep-may/01-bm1-may-ds.html) | Đổi tên chế độ: Chặn app & web | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 2 | [`bm1-may-chon-loai`](bm-ghep-may/02-bm1-may-chon-loai.html) | Đổi tên chế độ: Chặn app & web | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 3 | [`bm1-may-ghep`](bm-ghep-may/03-bm1-may-ghep.html) | Dùng chung · theo «Bước 3 · Ghép máy» v20 | 375×812 | Khớp cảnh mẫu (19:40): mã 10 phút hết hạn lúc 19:50 thay 20:52; giữ nguyên bố cục, chữ phụ nhỏ nhất 11.5px |
| 4 | [`them-mkcwr3q1`](bm-ghep-may/04-them-mkcwr3q1.html) | Đang chờ máy của con | 375×812 | Bỏ thanh bước Lần đầu (z8femhpg đã tách); chữ «máy mới»; thêm lại «Mã hết hạn rồi? Lấy mã mới» của bản Ghép thêm máy. |
| 5 | [`them-7ss7o7lz`](bm-ghep-may/05-them-7ss7o7lz.html) | Mã ghép máy hết hạn | 375×812 |  |
| 6 | [`bm1-may-moi`](bm-ghep-may/06-bm1-may-moi.html) | Đổi tên chế độ: Chặn app & web | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |

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
| 1 | [`cdt-chao`](con-dt-cai/01-cdt-chao.html) | Rob chào | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 2 | [`cdt-cai`](con-dt-cai/02-cdt-cai.html) | Xin cài phần mềm | 375×812 | Nghi chốt 09/11 tên chế độ dễ hiểu; đồng bộ toàn bàn |
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
| 1 | [`cdt-quy-tac`](con-dt-khac/01-cdt-quy-tac.html) | Quy tắc nhà mình | 375×812 | Nghi chốt 09/11 tên chế độ dễ hiểu; đồng bộ toàn bàn |
| 2 | [`cdt-pin-ghep`](con-dt-khac/02-cdt-pin-ghep.html) | Ghép máy | 375×812 | PIN 06/11 (xem trước): bỏ «Máy của cả nhà / Ba Mẹ chọn Cả nhà» → «Máy dùng chung»: giờ chơi riêng từng bé, chạm tên + PIN, không ai vào thì máy khoá (Ba Mẹ mở bằng mã Ba Mẹ). |
| 3 | [`them-b3prchz2`](con-dt-khac/03-them-b3prchz2.html) | Cho phép giữ giờ · Máy cả nhà | 375×812 | PIN 06/11 (xem trước): bỏ «Máy của cả nhà / giờ chung» → «Máy dùng chung», giờ chơi đếm riêng từng bé; cho phép xong → màn Chọn tên (không còn «Ai đang dùng máy?» quỹ chung). |
| 4 | [`them-28ir0qe4`](con-dt-khac/04-them-28ir0qe4.html) | Chọn tên (máy khoá) | 375×812 |  |
| 5 | [`them-b3l7ubu5`](con-dt-khac/05-them-b3l7ubu5.html) | Nhập PIN | 375×812 |  |
| 6 | [`them-zw8cwyzr`](con-dt-khac/06-them-zw8cwyzr.html) | Nhập PIN (Bảo Minh) | 375×812 |  |
| 7 | [`them-2ljthd3f`](con-dt-khac/07-them-2ljthd3f.html) | PIN chưa đúng | 375×812 |  |
| 8 | [`them-8l4fb6yf`](con-dt-khac/08-them-8l4fb6yf.html) | Sai 5 lần · chờ 15 giây | 375×812 |  |
| 9 | [`them-bwdspoi7`](con-dt-khac/09-them-bwdspoi7.html) | Quên PIN | 375×812 | Nút lùi thành phần tử có data-toi về Nhập PIN. |
| 10 | [`them-q72t4no4`](con-dt-khac/10-them-q72t4no4.html) | Ba Mẹ nhập mã | 375×812 |  |
| 11 | [`them-f2mt6vfr`](con-dt-khac/11-them-f2mt6vfr.html) | Ba Mẹ đang dùng máy | 375×812 |  |
| 12 | [`them-j424uyis`](con-dt-khac/12-them-j424uyis.html) | Đổi bé / Đăng xuất | 375×812 |  |

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
| 8 | [`them-4e5fwl16`](con-dt-gio/08-them-4e5fwl16.html) | App chưa được phép | 375×812 | Nghi chốt 09/11 tên chế độ dễ hiểu; đồng bộ toàn bàn |
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

## bm-thiet-lap-con (`bm-thiet-lap-con`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-ob-ten-con`](bm-thiet-lap-con/01-bm1-ob-ten-con.html) | Sửa tay | 375×812 | Chip dưới tên con: giữ icon con giáp, chữ đổi thành tuổi («🐓 9 tuổi»), không ghi tên con giáp; mọi thứ khác giữ nguyên. |
| 2 | [`them-hjjdppuw`](bm-thiet-lap-con/02-them-hjjdppuw.html) | Chọn năm sinh | 375×812 | Nghi 09/11: bấm ô Năm sinh ở Thêm con → bảng chọn năm kiểu lưới (như app khác) trượt lên từ đáy, form mờ phía sau. Không kèm con giáp. Huỷ / Chọn → về màn Thêm con. |
| 3 | [`them-4sujddkb`](bm-thiet-lap-con/03-them-4sujddkb.html) | Thêm con thứ 2 | 375×812 | Chip dưới tên con: giữ icon con giáp, chữ đổi thành tuổi («🐭 6 tuổi»), không ghi tên con giáp; mọi thứ khác giữ nguyên. |
| 4 | [`bm1-ob-mau`](bm-thiet-lap-con/04-bm1-ob-mau.html) | Tách khỏi nhóm dùng chung — giữ bản hiện tại làm bản riêng | 375×812 | Danh sách dài theo từng mục: Học 7, Vận động 10, Giúp Ba Mẹ 100 chia 10 chủ đề; mỗi mục/chủ đề «Chọn tất cả», nút ＋ từng dòng |
| 5 | [`them-bwlkjyw5`](bm-thiet-lap-con/05-them-bwlkjyw5.html) | Thêm việc riêng | 375×812 | Đồng bộ kiểu đã chốt (màn gốc dùng chung với them-6pjz1stu): sheet «Ba Mẹ tự thêm» nổi trên danh sách làm mờ; tiêu đề mục .muc 15/800; ô nhập lõm không icon; gợi ý cao 44; emoji → icon 3D trong ô lõm; ô chọn = teal nhạt (vàng chỉ ở sao); «Con nộp bằng» thành danh sách .lg trong 1 thẻ; nút than chì có chừa đệm. Giữ 3 data-toi bm1-ob-mau. |
| 6 | [`them-s416tfdj`](bm-thiet-lap-con/06-them-s416tfdj.html) | Bước · Chọn quà | 375×812 | Bỏ danh sách dài; tab Voucher AiiGrow (mua sẵn) và tab Ba Mẹ tự điền quà |
| 7 | [`bm1-ob-gio`](bm-thiet-lap-con/07-bm1-ob-gio.html) | Thay qua MCP | 375×812 | Làm thêm phần cho người dùng có thể tùy chọn giờ chơi để khóa máy. Căn chỉnh lại khung màn hình hoặc có thể thiết kế sao cho màn hình oke hơn |
| 8 | [`them-hijzsz0z`](bm-thiet-lap-con/08-them-hijzsz0z.html) | Chọn giờ ngủ | 375×812 | Đồng bộ Trang chủ 12/11 (màn gốc nhóm dùng chung Chọn giờ ngủ): sheet trên nền mờ của màn Giờ chơi kiểu mới (không còn thẻ vàng); bánh xe giờ giữ nguyên; chip ngày cao 44 teal; nút than chì 52. |
| 9 | [`them-mdujxlg2`](bm-thiet-lap-con/09-them-mdujxlg2.html) | Con được dùng app nào? | 375×812 | Giống màn Web đã chốt: tìm app, đếm đã chọn, nhóm có Chọn tất cả, chạm ＋ từng app, không chọn sẵn |
| 10 | [`them-at57ypdc`](bm-thiet-lap-con/10-them-at57ypdc.html) | Thêm app khác | 375×812 | Ô tìm, kết quả ＋ / Đã thêm, Xong |
| 11 | [`them-3xbscpzm`](bm-thiet-lap-con/11-them-3xbscpzm.html) | Web con được vào | 375×812 | Cùng 26 trang theo loại nhưng chưa chọn gì: ＋ từng trang, «Chọn tất cả» từng loại |
| 12 | [`them-ubomxl31`](bm-thiet-lap-con/12-them-ubomxl31.html) | MỚI · Thêm web khác | 375×812 | Gõ tên hoặc dán link, kết quả ＋ / Đã thêm |
| 13 | [`them-5e30929l`](bm-thiet-lap-con/13-them-5e30929l.html) | MỚI · Danh sách nhiệm vụ trong bộ | 375×812 |  |
| 14 | [`them-wv4igjxs`](bm-thiet-lap-con/14-them-wv4igjxs.html) | MỚI · Bộ Vận động | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 15 | [`them-ws974ond`](bm-thiet-lap-con/15-them-ws974ond.html) | MỚI · 100 việc phụ giúp Ba Mẹ | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 16 | [`them-3bu0b5nu`](bm-thiet-lap-con/16-them-3bu0b5nu.html) | MỚI · Phụ giúp 1/10 · Bếp núc | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 17 | [`them-rbztsvs7`](bm-thiet-lap-con/17-them-rbztsvs7.html) | MỚI · Phụ giúp 2/10 · Dọn bếp | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 18 | [`them-bhxgctcp`](bm-thiet-lap-con/18-them-bhxgctcp.html) | MỚI · Phụ giúp 3/10 · Phòng khách | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 19 | [`them-uufduy11`](bm-thiet-lap-con/19-them-uufduy11.html) | MỚI · Phụ giúp 4/10 · Giặt giũ | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 20 | [`them-xipb5s1j`](bm-thiet-lap-con/20-them-xipb5s1j.html) | MỚI · Phụ giúp 5/10 · Phòng ngủ | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 21 | [`them-h5290k60`](bm-thiet-lap-con/21-them-h5290k60.html) | MỚI · Phụ giúp 6/10 · Nhà tắm | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 22 | [`them-g7ylll9e`](bm-thiet-lap-con/22-them-g7ylll9e.html) | MỚI · Phụ giúp 7/10 · Cây & thú cưng | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 23 | [`them-0c0eiw75`](bm-thiet-lap-con/23-them-0c0eiw75.html) | MỚI · Phụ giúp 8/10 · Mua sắm | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 24 | [`them-l3367wg2`](bm-thiet-lap-con/24-them-l3367wg2.html) | MỚI · Phụ giúp 9/10 · Chăm Ba Mẹ | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 25 | [`them-y8wvc5xt`](bm-thiet-lap-con/25-them-y8wvc5xt.html) | MỚI · Phụ giúp 10/10 · Việc vặt | 375×812 | Nghi 10/11: tab Học tập/Vận động/Phụ giúp bấm qua được; xem hết 100 việc theo 10 chủ đề |
| 26 | [`them-hn2754ce`](bm-thiet-lap-con/26-them-hn2754ce.html) | MỚI · Quà Ba Mẹ mua · chi tiết | 375×812 |  |
| 27 | [`them-bbxb64oc`](bm-thiet-lap-con/27-them-bbxb64oc.html) | MỚI · Thanh toán quà | 375×812 |  |
| 28 | [`them-j1zshjyw`](bm-thiet-lap-con/28-them-j1zshjyw.html) | MỚI · Đã mua quà | 375×812 |  |
| 29 | [`them-u60j9p7w`](bm-thiet-lap-con/29-them-u60j9p7w.html) | MỚI · Ba Mẹ tạo quà nhà | 375×812 | Cùng thanh trên + tab với màn Quà đổi bằng sao; bỏ emoji → icon 3D; chip gợi ý và ô sao cao 44; danh sách quà theo mẫu .lg; vùng cuộn chừa đệm cho nút Xong. |
| 30 | [`them-x9x2u07e`](bm-thiet-lap-con/30-them-x9x2u07e.html) | MỚI · Quà · tab Ba Mẹ tự điền | 375×812 |  |
| 31 | [`them-zbb9m9ry`](bm-thiet-lap-con/31-them-zbb9m9ry.html) | MỚI · Giờ chơi · bánh xe chọn giờ | 375×812 |  |
| 32 | [`them-e7k5bi9g`](bm-thiet-lap-con/32-them-e7k5bi9g.html) | MỚI · Giờ chơi · tuỳ chỉnh từng ngày | 375×812 |  |
| 33 | [`them-2dhlfuik`](bm-thiet-lap-con/33-them-2dhlfuik.html) | MỚI · Giờ nghỉ ban đêm | 375×812 |  |
| 34 | [`them-35vyl4cx`](bm-thiet-lap-con/34-them-35vyl4cx.html) | MỚI · Bảo Anh dùng được gì? (app & web) | 375×812 |  |

## bm-ghep-lan-dau (`bm-ghep-lan-dau`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-ob-ghep`](bm-ghep-lan-dau/01-bm1-ob-ghep.html) | Mã ghép: hạn 19:50 khớp cảnh 19:40 | 375×812 | Khớp cảnh mẫu (19:40): mã 10 phút hết hạn lúc 19:50 thay 20:52; giữ nguyên bố cục, chữ phụ nhỏ nhất 11.5px |
| 2 | [`them-z8femhpg`](bm-ghep-lan-dau/02-them-z8femhpg.html) | Đang chờ máy của con | 375×812 | Thanh tiến độ 5 chấm: Con ✓ → Nhiệm vụ ✓ → Quà ✓ → Giờ ✓ → Máy (đang ở đây) |
| 3 | [`them-pxgipoxg`](bm-ghep-lan-dau/03-them-pxgipoxg.html) | Máy mới «Chặn thật» | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 4 | [`them-w8q8hcfk`](bm-ghep-lan-dau/04-them-w8q8hcfk.html) | Xong rồi (chưa ghép máy) | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 5 | [`bm1-ob-xong`](bm-ghep-lan-dau/05-bm1-ob-xong.html) | Đổi tên Rob → Grow | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 6 | [`them-o76iq8p5`](bm-ghep-lan-dau/06-them-o76iq8p5.html) | Ghép thêm máy | 375×812 | Nhánh trùng: Ghép thêm máy đã có hành trình riêng (Nghi chốt 12/11) |
| 7 | [`them-xi3mihop`](bm-ghep-lan-dau/07-them-xi3mihop.html) | Mã ghép 6 số | 375×812 | Trùng Bước 3 · Ghép máy (Nghi chốt 12/11) |
| 8 | [`them-jfyrm0t5`](bm-ghep-lan-dau/08-them-jfyrm0t5.html) | Đang chờ máy của con | 375×812 | Bỏ thanh bước Lần đầu (z8femhpg đã tách); chữ «máy mới»; thêm lại «Mã hết hạn rồi? Lấy mã mới» của bản Ghép thêm máy. |
| 9 | [`them-43yoo1by`](bm-ghep-lan-dau/09-them-43yoo1by.html) | Đã ghép iPad của Bảo Anh | 375×812 | Thuộc nhánh Ghép thêm máy trùng, không còn đường vào (Nghi chốt 12/11) |
| 10 | [`them-q44uxha5`](bm-ghep-lan-dau/10-them-q44uxha5.html) | MỚI · Mã ghép hết hạn | 375×812 |  |
| 11 | [`them-ytmgijqo`](bm-ghep-lan-dau/11-them-ytmgijqo.html) | MỚI · Chưa ghép được máy | 375×812 |  |

## bm-dang-nhap (`bm-dang-nhap`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm1-dang-nhap`](bm-dang-nhap/01-bm1-dang-nhap.html) | Liên kết «Cần giúp?» → AiiLab hỗ trợ (MCP) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 2 | [`them-2g3zpiie`](bm-dang-nhap/02-them-2g3zpiie.html) | Quên mật khẩu | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 3 | [`them-6aomy24b`](bm-dang-nhap/03-them-6aomy24b.html) | Đặt mật khẩu mới | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |

## bm-duoc-moi (`bm-duoc-moi`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-rsbh0ep6`](bm-duoc-moi/01-them-rsbh0ep6.html) | Nhận lời mời (thông báo) | 375×812 | Khớp cảnh mẫu: giờ 19:40 thứ Ba 3/11; lời mời nói 4 bé như màn Đã mời |
| 2 | [`them-ux0c23p4`](bm-duoc-moi/02-them-ux0c23p4.html) | Chào (được mời) | 375×812 | Thẻ lời mời gọn: tiêu đề 1 dòng, «Cùng trông 4 bé» + 4 avatar con dưới; thanh trên back + tiêu đề cùng hàng |
| 3 | [`them-0zrwe8yz`](bm-duoc-moi/03-them-0zrwe8yz.html) | Đăng ký (được mời) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 4 | [`them-pacl0mle`](bm-duoc-moi/04-them-pacl0mle.html) | Nhập mã xác thực (được mời) | 375×812 | Góp ý Nghi 03/11 chiều: nhánh «Tôi được mời vào nhà» riêng (Chào → Đăng ký → Mã xác thực → bm1-moi, không tạo con); Bước Giờ chơi làm lại (ô nhập phút + chip 30/60/90, ngày thường/cuối tuần, giờ ngủ chỉnh bằng bánh xe) → màn Chọn app (2 chế độ, lưới icon) → Ghép máy (Zalo/Tin nhắn/Sao chép/QR) → Đang chờ → Đã ghép → Xong; Ghép thêm máy không chọn loại máy (Máy mới của ai + Cài giống máy trước). |
| 5 | [`bm1-moi`](bm-duoc-moi/05-bm1-moi.html) | Dùng chung · theo «Lời mời · A5 Ba Tuấn vào nhà (máy Ba Tuấn)» v5 | 375×812 | Đồng bộ kiểu Hằng ngày: viền vàng quanh avatar Ba Tuấn đổi teal (vàng chỉ cho sao); nhà có 4 bé, bỏ dòng lặp; bớt khoảng trống trên nút |

## bm-may-con (`bm-may-con`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-may-ds`](bm-may-con/01-bm2-may-ds.html) | Máy của con | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 2 | [`bm2-may-m1`](bm-may-con/02-bm2-may-m1.html) | Chi tiết máy (tuân thủ) | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 3 | [`them-tmezw761`](bm-may-con/03-them-tmezw761.html) | Xác nhận khoá Laptop | 375×812 |  |
| 4 | [`them-tw6apkag`](bm-may-con/04-them-tw6apkag.html) | Đổi tên Laptop | 375×812 | Như k=1 nhưng bỏ hàng chip gợi ý tên bị tràn: thanh trên 1 hàng; ghi chú vàng → cam giữ Rob; nút Lưu ngay dưới ô. |
| 5 | [`them-v4ovqk42`](bm-may-con/05-them-v4ovqk42.html) | Gỡ Laptop? | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 6 | [`bm2-may-m2`](bm-may-con/06-bm2-may-m2.html) | Chi tiết máy (lệch chuẩn) | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 7 | [`them-4e4o5c72`](bm-may-con/07-them-4e4o5c72.html) | Đổi tên iPad | 375×812 | Đồng bộ Trang chủ 12/11 (cùng mẫu Đổi tên Laptop): thanh trên 1 hàng; ảnh máy trong ô clay; ghi chú vàng → cam giữ Rob; nút Lưu ngay dưới, bỏ khoảng trống. |
| 8 | [`them-18q14mik`](bm-may-con/08-them-18q14mik.html) | Gỡ iPad? | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 9 | [`them-slv33bgc`](bm-may-con/09-them-slv33bgc.html) | Hướng dẫn sửa iPad | 375×812 | Đồng bộ Trang chủ 12/11: back + «Sửa trên iPad» 22px cùng hàng; 3 bước trong thẻ clay, ảnh trong ô lõm, số bước teal; nút chính ngay dưới, link hỏi AiiGrow cao 44. |

## bm-gio-ho-so (`bm-gio-ho-so`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`bm2-gio`](bm-gio-ho-so/01-bm2-gio.html) | Giờ dùng máy | 375×812 | Thẻ đầu ghi rõ hôm nay Thứ Ba 60 phút: đã dùng 42, còn 18 (vạch). Bỏ 4 chip 30/60/90 (chip 90p dễ hiểu nhầm ngày thường); 2 dòng chỉnh ±15: «Thứ 2 – Thứ 6: 60 phút» và «Thứ 7, CN: 90 phút» — 90 chỉ nằm ở dòng này. Nút «Lưu giờ chơi». |
| 2 | [`them-i3wcjm6v`](bm-gio-ho-so/02-them-i3wcjm6v.html) | Chọn giờ ngủ | 375×812 | Đồng bộ Trang chủ 12/11 (màn gốc nhóm dùng chung Chọn giờ ngủ): sheet trên nền mờ của màn Giờ chơi kiểu mới (không còn thẻ vàng); bánh xe giờ giữ nguyên; chip ngày cao 44 teal; nút than chì 52. |
| 3 | [`them-3ima20g6`](bm-gio-ho-so/03-them-3ima20g6.html) | Giờ học | 375×812 | Đồng bộ Trang chủ 12/11: thanh trên giữ 1 hàng; 2 ô giờ bắt đầu/kết thúc; danh sách .lg với nhãn Học; ghi chú vàng → cam giữ Rob, chỉ nêu app có thật (Roblox, Máy ảnh tạm khoá); nút Lưu ngay dưới, bỏ khoảng trống. |
| 4 | [`bm2-ho-so`](bm-gio-ho-so/04-bm2-ho-so.html) | Hồ sơ con | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 5 | [`them-z2fyhohj`](bm-gio-ho-so/05-them-z2fyhohj.html) | PIN của Bảo Anh (xem / đặt lại) | 375×812 | PIN của con hiện số, không che |
| 6 | [`them-vnl5rmnz`](bm-gio-ho-so/06-them-vnl5rmnz.html) | Sửa hồ sơ Bảo Anh | 375×812 | Thanh trên 1 hàng kiểu Trang chủ; tên + năm sinh trong 1 thẻ; 4 màu đúng 4 con (Bảo Anh cam) + 1 màu thêm, chấm 44px; chọn ảnh dạng chip, chọn = teal nhạt; nút Lưu ngay dưới nội dung. |
| 7 | [`them-canktzlq`](bm-gio-ho-so/07-them-canktzlq.html) | Xoá hồ sơ Bảo Anh? | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 8 | [`them-8h2msmht`](bm-gio-ho-so/08-them-8h2msmht.html) | App & web của con | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |

## bm-con-xin (`bm-con-xin`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-a4nqjrmp`](bm-con-xin/01-them-a4nqjrmp.html) | Con xin dùng (chờ duyệt) | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 2 | [`them-1ypcydle`](bm-con-xin/02-them-1ypcydle.html) | Đã cho mở YouTube | 375×812 | Đồng bộ kiểu Trang chủ: sheet nổi trên Trang chủ làm mờ (không nền xám đặc); giờ khớp 19:40 (mở tới 20:10); Hoàn tác thành nút phụ trắng 50px. |
| 3 | [`them-3wp5ty1o`](bm-con-xin/03-them-3wp5ty1o.html) | Đã cho thêm 20 phút | 375×812 | Đồng bộ kiểu Trang chủ: sheet nổi trên Trang chủ làm mờ; số khớp cảnh (còn 18 + 20 = 38 phút, hôm nay 80 phút); Hoàn tác thành nút phụ trắng. |
| 4 | [`them-s093fsk4`](bm-con-xin/04-them-s093fsk4.html) | Đã không cho | 375×812 | Đồng bộ kiểu Trang chủ: sheet nổi trên Trang chủ làm mờ; tiêu đề một dòng; dấu X xám thay dấu tích; sao chỉ là chip vàng; Hoàn tác thành nút phụ trắng. |

## bm-viec-duyet (`bm-viec-duyet`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-e91jg28j`](bm-viec-duyet/01-them-e91jg28j.html) | Tab Nhiệm vụ | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 2 | [`them-e44cwmvu`](bm-viec-duyet/02-them-e44cwmvu.html) | Nhiệm vụ trống · Bảo Minh | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 3 | [`them-1jii7k19`](bm-viec-duyet/03-them-1jii7k19.html) | Giao việc theo bộ | 375×812 | Đồng bộ kiểu đã chốt: back teal + tiêu đề 22px cùng hàng; icon 3D thay emoji; nút ＋ và «Chọn tất cả» chạm 44px; chữ nhỏ nhất 11.5px; vùng cuộn chừa đệm dưới cho nút đáy. Giữ nguyên toàn bộ danh sách việc. |
| 4 | [`them-6pjz1stu`](bm-viec-duyet/04-them-6pjz1stu.html) | Thêm việc riêng | 375×812 | Đồng bộ kiểu đã chốt (màn gốc dùng chung với them-6pjz1stu): sheet «Ba Mẹ tự thêm» nổi trên danh sách làm mờ; tiêu đề mục .muc 15/800; ô nhập lõm không icon; gợi ý cao 44; emoji → icon 3D trong ô lõm; ô chọn = teal nhạt (vàng chỉ ở sao); «Con nộp bằng» thành danh sách .lg trong 1 thẻ; nút than chì có chừa đệm. Giữ 3 data-toi bm1-ob-mau. |
| 5 | [`them-0qial10f`](bm-viec-duyet/05-them-0qial10f.html) | Tự đặt việc | 375×812 |  |
| 6 | [`them-ncq0jtzo`](bm-viec-duyet/06-them-ncq0jtzo.html) | Sửa việc «Dọn phòng» | 375×812 |  |
| 7 | [`them-4axhvgpl`](bm-viec-duyet/07-them-4axhvgpl.html) | Xoá việc «Dọn phòng»? | 375×812 | Đổi thành sheet xác nhận trên nền mờ của màn Sửa việc (không nền đặc); tiêu đề không rớt chữ; 3 hệ quả trong ô lõm; «Giữ lại» cao 46px. |
| 8 | [`them-nl1nwszs`](bm-viec-duyet/08-them-nl1nwszs.html) | Duyệt nhiệm vụ | 375×812 | Đồng bộ kiểu đã chốt: nền teal nhạt thay vàng, giữ Rob và 2 thẻ bằng chứng, chữ nhỏ nhất 11.5px, nút đáy 52px, vùng cuộn chừa đệm dưới để thẻ cuối không bị che. |
| 9 | [`them-qwuifjry`](bm-viec-duyet/09-them-qwuifjry.html) | Bằng chứng · Dọn phòng | 375×812 | Đồng bộ kiểu đã chốt: nền teal nhạt thay vàng, giữ ảnh trước/sau và lời khen, «Việc 1/2» dạng nhãn teal nhạt, nút đáy 52px trên nền mờ dần, vùng cuộn chừa đệm dưới để chip khen không bị che. |
| 10 | [`them-nxclxlit`](bm-viec-duyet/10-them-nxclxlit.html) | Nhờ làm lại · Dọn phòng | 375×812 | Sheet trên nền mờ của màn Dọn phòng (không nền xám đặc), tiêu đề mục .muc, ô nhắn lõm, ghi chú cam, nút phụ trắng cao 46px. |
| 11 | [`them-d40e3495`](bm-viec-duyet/11-them-d40e3495.html) | Bằng chứng · Đọc sách | 375×812 | Đồng bộ kiểu đã chốt (cùng mẫu màn Dọn phòng): nền teal nhạt thay vàng, «Việc 2/2» nhãn teal nhạt, giữ trình phát ghi âm, nút đáy 52px trên nền mờ dần, vùng cuộn chừa đệm dưới. |
| 12 | [`them-l0saosnz`](bm-viec-duyet/12-them-l0saosnz.html) | Nhờ làm lại · Đọc sách | 375×812 | Sheet nằm trên màn Đọc sách làm mờ (không xám đặc), chữ ghi chú không dùng vàng, ô nhắn lõm chuẩn, nút than chì 52px. |
| 13 | [`them-4u3doee9`](bm-viec-duyet/13-them-4u3doee9.html) | Đã nhờ con làm lại | 375×812 | Giữ bố cục Rob + tiêu đề, thẻ 2 dòng theo kiểu danh sách chuẩn (icon lõm 40, chữ 15/800, dòng phụ 12.5), nút than chì 52 trên nền mờ dần. |
| 14 | [`them-493dqo4i`](bm-viec-duyet/14-them-493dqo4i.html) | Duyệt xong · con nhận sao | 375×812 | Bỏ nền vàng cả màn → nền teal nhạt như Trang chủ; vàng chỉ còn ở ô sao. Thẻ khen và việc còn chờ theo kiểu danh sách chuẩn, nút than chì 52. |
| 15 | [`them-zj9gmh7t`](bm-viec-duyet/15-them-zj9gmh7t.html) | Duyệt xong cả 2 · 30 → 50 sao | 375×812 | Cùng mẫu màn «Duyệt xong · con nhận sao»: nền teal nhạt, vàng chỉ ở ô sao, thẻ 2 việc theo danh sách chuẩn, nút than chì 52. |
| 16 | [`them-oypre8gc`](bm-viec-duyet/16-them-oypre8gc.html) | Không còn việc chờ duyệt | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 17 | [`them-rqioc0fd`](bm-viec-duyet/17-them-rqioc0fd.html) | Mất mạng khi đang duyệt | 375×812 | Nền đầu màn teal nhạt, thẻ mất mạng dùng cam chuẩn #f9e7d2/#8a3c0c, danh sách theo mẫu .lg, nút than chì 52 đặt ngay dưới nội dung để không còn khoảng trống. |

## bm-sao-qua (`bm-sao-qua`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-1akngbxb`](bm-sao-qua/01-them-1akngbxb.html) | Ví sao của con | 375×812 | Đầu màn teal nhạt như Trang chủ, vàng chỉ còn ở thẻ ví sao; link «Sửa quà ›» cao 44; số sao vào/ra là nhãn bo tròn; dòng phụ 12.5. |
| 2 | [`them-473f52w6`](bm-sao-qua/02-them-473f52w6.html) | Quà đổi bằng sao | 375×812 | Back + tiêu đề 22px cùng hàng; bỏ emoji và màu xanh dương ngoài bảng → icon 3D trong ô lõm, giá tiền xám, sao vàng; «Mua» nhãn teal nhạt; vùng cuộn chừa đệm để vé cuối không bị nút Xong che. |
| 3 | [`them-sp8ijd1b`](bm-sao-qua/03-them-sp8ijd1b.html) | Chi tiết quà Ba Mẹ mua | 375×812 | Bỏ nền xanh dương + emoji → nền teal nhạt, icon 3D trong ô lõm; số sao khớp ví (30, thiếu 170); nút than chì 52 trên nền mờ dần, vùng cuộn chừa đệm. |
| 4 | [`them-dlul0jlr`](bm-sao-qua/04-them-dlul0jlr.html) | Thêm quà | 375×812 | Bỏ nền xanh dương/kem và emoji → thẻ #f7f6f3 + icon 3D trong ô lõm; giá tiền chữ xám; nút than chì 52 trên nền mờ dần, vùng cuộn chừa đệm để quà cuối và «Tự đặt quà nhà» không bị che. |
| 5 | [`them-79kgpij8`](bm-sao-qua/05-them-79kgpij8.html) | Sửa quà | 375×812 | Vùng cuộn chừa đệm để «Áp cho» không bị nút che; ô hình đang chọn dùng teal nhạt (vàng chỉ ở giá sao); tiêu đề mục .muc 15/800; «Áp cho» đủ 4 bé; «Xoá quà này» đỏ chuẩn, cao 44. |
| 6 | [`them-t49meex8`](bm-sao-qua/06-them-t49meex8.html) | Xoá quà Đi ăn kem? | 375×812 | Bỏ nền hồng + khoảng trống lớn → sheet đáy trên màn Sửa quà làm mờ; Rob + tiêu đề 1 dòng; nút xoá đỏ 52, nút «Giữ lại quà» nền trắng 48. |
| 7 | [`them-5otw85h4`](bm-sao-qua/07-them-5otw85h4.html) | Trao quà cho con | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 8 | [`them-f0fnp733`](bm-sao-qua/08-them-f0fnp733.html) | MỚI · Ba Mẹ tạo quà | 375×812 | Cùng thanh trên + tab với màn Quà đổi bằng sao; bỏ emoji → icon 3D; chip gợi ý và ô sao cao 44; danh sách quà theo mẫu .lg; vùng cuộn chừa đệm cho nút Xong. |

## bm-bao-cao-ngay (`bm-bao-cao-ngay`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-gftgyspn`](bm-bao-cao-ngay/01-them-gftgyspn.html) | Tab Báo cáo | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 2 | [`them-w04gcohs`](bm-bao-cao-ngay/02-them-w04gcohs.html) | MỚI · Báo cáo · Bảo Minh | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 3 | [`them-c95l1cwc`](bm-bao-cao-ngay/03-them-c95l1cwc.html) | Hôm nay con dùng gì | 375×812 | Mascot đổi tên Grow theo tên app AiiGrow |
| 4 | [`them-r3dsl3py`](bm-bao-cao-ngay/04-them-r3dsl3py.html) | MỚI · Nhật ký cả nhà | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |

## bm-ca-nha (`bm-ca-nha`)

| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |
|---|---|---|---|---|
| 1 | [`them-h60stad7`](bm-ca-nha/01-them-h60stad7.html) | Tab Cả nhà | 375×812 | Nghi 14/11: tab Chặn giữa Nhiệm vụ và Báo cáo |
| 2 | [`them-9ozp26pq`](bm-ca-nha/02-them-9ozp26pq.html) | Thêm con | 375×812 | Đồng bộ kiểu mẫu: thanh trên back 44px + tiêu đề 22px «Thêm con», nút đáy chừa đệm để thẻ cuối không bị che |
| 3 | [`them-fi17hb99`](bm-ca-nha/03-them-fi17hb99.html) | MỚI · Đã tạo hồ sơ Khang · bước tiếp | 375×812 | Nghi 14/11: chế độ chặn cả app lẫn web |
| 4 | [`them-5hzkl6p5`](bm-ca-nha/04-them-5hzkl6p5.html) | Mời người nhà | 375×812 | Đồng bộ kiểu mẫu: thanh trên back 44px + tiêu đề 22px, nút gửi ngay dưới nội dung (bỏ khoảng trống lớn), cùng trông 4 con |
| 5 | [`them-hfd2drjy`](bm-ca-nha/05-them-hfd2drjy.html) | Đã gửi lời mời | 375×812 | Đồng bộ kiểu Hằng ngày đã chốt: chấm chờ đổi vàng sang cam (vàng chỉ cho sao), bớt khoảng trống trên nút, «Xem bên máy Ba Tuấn» bấm được, lời mời nói 4 bé |
| 6 | [`them-7vmoufz3`](bm-ca-nha/06-them-7vmoufz3.html) | Thành viên | 375×812 | Đồng bộ kiểu mẫu: thanh trên back 44px + tên 22px, danh sách .lg, sửa icon vỡ, bỏ khoảng trống trên nút, nút «Mời rời nhà» vùng chạm 46px |
| 7 | [`them-xnbiksmr`](bm-ca-nha/07-them-xnbiksmr.html) | Mời Bà Hoa rời nhà? | 375×812 | Sheet xác nhận theo mẫu: nền là màn Bà Hoa mờ phía sau (bỏ xám đặc), nút phụ 46px, icon trong ô lõm 40px |
| 8 | [`them-ncmuuqav`](bm-ca-nha/08-them-ncmuuqav.html) | Tài khoản của bạn | 375×812 | Đồng bộ kiểu mẫu: thanh trên mẫu, vùng cuộn chừa đệm dưới để nút Lưu không che «Xoá tài khoản», danh sách .lg, cùng trông 4 con |
| 9 | [`them-o4k6oei0`](bm-ca-nha/09-them-o4k6oei0.html) | Đổi mật khẩu | 375×812 | Đồng bộ kiểu mẫu: thẻ gợi ý Rob bỏ vàng (teal nhạt), nút Lưu ngay dưới ô nhập (bỏ khoảng trống lớn) |
| 10 | [`them-liz6hzww`](bm-ca-nha/10-them-liz6hzww.html) | Rời nhà? | 375×812 | Sheet xác nhận theo mẫu: nền màn Tài khoản mờ phía sau (bỏ xám đặc), tiêu đề 1 dòng không rớt chữ, nút phụ 46px |
| 11 | [`them-4vj35r7c`](bm-ca-nha/11-them-4vj35r7c.html) | Xoá tài khoản? | 375×812 | Sheet xoá tài khoản theo mẫu: nền mờ, tiêu đề 1 dòng, nút phụ 48px |
| 12 | [`them-2ru3t5iw`](bm-ca-nha/12-them-2ru3t5iw.html) | Cài đặt thông báo | 375×812 | Đồng bộ kiểu Trang chủ: đầu màn teal thay hồng, tiêu đề rõ là cài đặt, icon quà đúng |
| 13 | [`them-zxu4yvp3`](bm-ca-nha/13-them-zxu4yvp3.html) | Hỏi AiiGrow | 375×812 | Đồng bộ kiểu: thanh trên màn con có tiêu đề, giữ Rob, danh sách .lg có icon, gọn không trống |
| 14 | [`them-dmdjjhh1`](bm-ca-nha/14-them-dmdjjhh1.html) | Nhắn tin AiiGrow | 375×812 | Gộp với AiiLab hỗ trợ (Cài đặt): thêm nút «Hay gặp ›» và 3 gợi ý nhanh (iPad báo lỗi, Ghép máy mới, Đổi sao ra phút) trên ô nhắn. |
