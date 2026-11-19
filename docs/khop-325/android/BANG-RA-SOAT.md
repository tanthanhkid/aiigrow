# #325 đợt 2 · rà app Con Android theo Bàn (17/11)
Ảnh app: không chụp (không có Robolectric/Paparazzi/emulator; không mở emulator trên máy 16 GB). Ảnh bàn: chưa lưu.

| key@vN | màn code | Kết quả |
|---|---|---|
| cdt-android-viec@v5, them-uero9k5x@v1 | ManChinh (dungManDaGhep) | Khớp chữ chính; Lệch: thanh Hôm nay/Nhiệm vụ/Sao & quà/Tin nhắn bàn vs lối tắt «Nhiệm vụ · Sao & quà · Quà của con» (đổi điều hướng, chưa sửa) |
| cdt-android-doi-diem@v4, them-n4iivj6d@v3 | ManChinh (moSaoCuaCon), GiaoDien khoá | Khớp |
| cdt-android-khoa@v4 | GiaoDien.ManKhoaView | Khớp; Chưa có: tên người khoá «Mẹ Lan khoá lúc 19:40» |
| cdt-ma-offline@v4 | ManKhoaView theMa | Lệch đã sửa: nút «Mở tạm bằng mã» (bàn «Mở tạm 30 phút bằng mã», số phút do mã quyết định 60/30/15 nên không ghi cứng 30). Chưa có: link «Xin Ba Mẹ cho vay sao · gửi khi có mạng», chân «Bảo Anh · Ba Mẹ quản lý bằng AiiGrow» |
| them-a16j4hh8@v5, them-mvld82p8@v5 | cauMoOffline | Khớp chữ, khác bố cục (bàn tách tiêu đề/phụ; code một dòng); Chưa có: «Mã chỉ dùng 10 phút» |
| cdt-ma-da-mo@v4, them-djha85wh@v5 | cauMoOffline DA_MO | Lệch chưa sửa: code «Đã mở N phút (tới HH:mm). Chơi vui nhé!» vs bàn tách «Máy mở rồi!/Chơi tới/Hết N phút máy khoá lại/Có mạng lại, AiiGrow báo Ba Mẹ» (đổi test logic) |
| them-qpj5mdyr@v4 | DichVuNhip.xinVay | Khớp ý («Đã lưu lời xin… Có mạng là gửi Ba Mẹ ngay!») |
| them-q72t4no4@v2 | ManPin BA_ME | Lệch đã sửa: nút «Mở máy cho Ba Mẹ» (đã có), «Mã 6 số · đổi sau 10 phút» |
| them-f2mt6vfr@v2 | ManChinh.dungManBaMe | Lệch đã sửa: «Không trừ sao của con» (trước «giờ») |
| them-j424uyis@v3 | ManChinh.hoiDoiBe | Lệch đã sửa: «Đang dùng Máy cả nhà · Android», «Đổi người hay đăng xuất đều dừng tính phút của <tên>. Vào lại bằng tên + PIN.» |
| them-28ir0qe4, b3l7ubu5, 2ljthd3f, 8l4fb6yf, bwdspoi7 | ManPin | Khớp |
| cdt-nhac-5-phut@v3 | logic/NhacGio | Khớp ý |
| cdt-het-phien@v7 | ManKhoaView | Khớp |
| cdt-webview, cdt-gio-may, cdt-phien, cdt-chan-web (web), them-xxgu8hk6 | — | Chưa có (Android không có trình duyệt lọc/màn «Đang chơi»/«Giờ máy lệch») |
| cdt-yeu-cau, them-0p8dmjan, j4g2mtm8, w8po32o6, 5nxwuaxz | mobile/src/app/tre/yeu-cau.tsx | Khớp chữ (tên/giờ/lời Ba Mẹ mẫu thay bằng dữ liệu thật) |
| cdt-xin-phep, them-4e5fwl16 | tre/xin-phep.tsx, chan-app.tsx | Khớp |
| cdt-vi-qua, cdt-cua-hang, cdt-doi-qua, them-l9qeq0np, cdt-huy-hieu | tre/vi-qua, cua-hang, doi/[qua], huy-hieu | Khớp khung chữ; lệch nhỏ chưa sửa: dòng sổ «Ba Mẹ cho vay 50 sao · Chọn món bữa tối», «Đổi hôm nay · bằng 50 sao vay Ba Mẹ» (code «Đổi dd/mm · đang giữ N sao»), huy hiệu «sắp có thêm 1» (code «làm nhiệm vụ để có thêm»; cần dữ liệu huy hiệu sắp đạt) |
| cdt-quy-tac | tre/quy-tac.tsx | Khớp |
| cdt-pin-ghep, them-3s04rjes | — | Chưa có trên Android (màn iOS: một máy một bé) |
| cdt-nhiem-vu, nv-chi-tiet, dang-lam, chup, them-pgpfq8of, qqzb3lnt, r6lv8p5v, chup-lai | tre/nhiem-vu, nv, dang, chup, chup-lai | Khớp; lệch nhỏ chưa sửa: chữ nút «Xong · chụp ảnh nộp» (bàn «Dọn xong · chụp ảnh nộp»), «Ảnh 1/2 · Giường» (code «Ảnh · tên việc», chưa đếm số ảnh) |
| cdt-cho-duyet@v2 | tre/cho-duyet.tsx | Khớp chữ; Chưa có: nút «Đổi ảnh», «Rút lại» (đổi logic) |
| them-6t2vvx7d@v2 | tre/cho-duyet.tsx | Lệch đã sửa: nộp ảnh ⇒ «Mất mạng rồi. Ảnh vẫn còn nhé!» / «Ảnh không mất» (trước luôn «Bài»; ghi âm/viết vẫn «Bài») |
| cdt-gio-may@v2 | tre/gio-may.tsx | Lệch đã sửa: «Giờ chơi tạm dừng đếm đến khi chỉnh lại.» (trước «Phút chơi…»); bước «Cài đặt › Ngày và giờ» giữ (tên Android thật) |
| cdt-het-phien@v7 (phần WebView) | tre/het-phien.tsx | Lệch nhỏ chưa sửa: «App học, AiiRob vẫn mở» vs bàn «Từ điển, AiiRob vẫn mở» (tên app mẫu); thiếu «1 nhiệm vụ = +10 sao», «Mất mạng? Nhập mã của Ba Mẹ» |
| cdt-nha-chinh, cdt-nha, them-uero9k5x, cdt-choi, cdt-cai, cdt-chan-web | tre/nha, tin, choi, cai, chan-web | Khớp |
| mo_ta_quan_tri / EXTRA_ADD_EXPLANATION | strings.xml, ManChinh | Lệch đã sửa: bỏ «hoặc tới giờ ngủ» (giờ ngủ bỏ từ #258) |

## Bàn lệch issue (không dựng)
them-bw8y2ta0 (đổi sao lấy giờ), them-sxjv8qfx (+10 phút), them-4atwdaqy (chưa đủ sao đổi phút), cdt-gio-ngu, them-ioje1spu (giờ học).

## Bàn có – code chưa làm được
Tab «Tin nhắn»; link xin vay ở màn nhập mã; tên người khoá; tách bố cục Mã sai/hết hạn/đã mở; «Mã chỉ dùng 10 phút».

## Code có – bàn không có
Nhánh «Đến giờ ngủ rồi» (GiaoDien.kt:90, QuyetDinh.kt:150) chỉ chạy với máy chủ cũ — không sửa. Lối tắt «Quà của con».
