# #325 đợt 2 · rà app Con trên Mac theo Bàn (17/11/2026)

Phạm vi: hành trình `con-cai-mac` (69 màn, ảnh chụp Bàn sáng 17/11) trong `agent-mac/` (tray, màn khoá, bộ cài). Chỉ sửa giao diện/chữ.
Ảnh: `docs/khop-325/mac/<key>-ban.png` (Bàn) cạnh `<key>-app.png` (app thật, chụp bằng `ChupClayTests`, `CHUP_CLAY=<thư mục> swift test`).
Menu thanh trên cùng là NSMenu hệ thống nên không chụp được bằng bộ này (ghi «không chụp» ở bảng).

Phương pháp: so khớp từng chuỗi chữ của 69 màn Bàn với mã (grep tự động) rồi đọc mã các chỗ lệch; «Khớp» = chữ khớp sau bước đó, bố cục chưa đo từng pixel (chỉ mở ảnh cho các màn đã sửa).

Ký hiệu: Khớp = chữ + luồng khớp (khác biệt bố cục nhỏ ghi kèm) · Lệch-đã-sửa · Chưa có · Bàn lệch issue = luật cũ, KHÔNG dựng.

| key@vN | Màn / tệp code | Kết quả |
|---|---|---|
| cmt-mac-chao@v2, cmt-mac-dieu-khoan@v1 | Hướng dẫn cài (trang tải) — bộ cài thật là `goi/chao.html`, `dieu-khoan.html` trong Installer | Chưa có: Bàn vẽ hướng dẫn thao tác (bấm đúp .pkg, hộp «Mở», «Vẫn mở»), không phải nội dung khung Installer; giữ nguyên `goi/*` |
| cmt-mac-ghep-may@v4 | `GhepMayView.nhap` (Views.swift) | Khớp chữ; Lệch bố cục: Bàn ô 6 số rời + hình điện thoại, code một ô gõ; «Mã không nhận? ›», nút «Quay lại» chưa có; tên bé chưa biết lúc ghép nên «Ghép Mac của con» |
| cmt-mac-ghep-mot-cham@v3 | `GhepMayView` (coGoiCai) | Khớp chữ; «Nhà của con» / «Ghép vào nhà mình» (tên nhà chưa biết trước khi ghép) |
| them-y68iyzp4@v4 | `.maSai` | Khớp (tiêu đề, phụ, «Gõ lại mã»); Lệch nhỏ: chưa vẽ 6 ô tô màu số sai |
| them-6vh6qq7u@v1 | `.hetHan` | Khớp |
| them-rc5ggdw2@v1 | `.matMang` | Khớp |
| them-x9z1bmlp@v2 | `.batQuyen` | Lệch đã sửa: «Để giữ giờ chơi», «Để nhắc «còn 5 phút»» (trước «tính phút chơi bằng sao», «còn 5 sao»). Lệch bố cục: «Chưa bật · Mở» code tách hai phần; 3 bước «Cách bật» một dòng |
| them-0ltdde49@v6, them-aff60lnt@v3 | `.xong` + `ManMac.chuXong` | Lệch đã sửa: ba thẻ trắng (tiêu đề + dòng phụ) đúng chữ Bàn; máy riêng «X mở máy là vào thẳng.», «Sao của X · 1 sao = 1 phút». Nút «▶ …» là lối xem thử của Bàn, không làm |
| them-5i7p4nf8@v3 | `ManChonTenView` chọn tên | Khớp |
| them-yelcxzor@v2, them-hw1hai50@v2, them-g80on1v3@v2 | PIN · chưa đúng · sai 5 lần | Khớp |
| them-f7eaweai@v2 | Quên PIN | Khớp |
| them-4ihu4j01@v3 | Ba Mẹ nhập mã | Lệch đã sửa: «Ba Mẹ dùng thì không trừ sao của con» (trước «giờ») |
| them-kyy3xlrg@v3 | `BaMeDangDungView` | Lệch đã sửa: «Không trừ sao của con» |
| them-hoxcav7o@v4 | `AppConView.doiBeSheet` | Khớp |
| them-fp5wy2y5@v3 | `TinMoiView` | Khớp |
| them-z86gsj81@v9, them-02wt8s99@v2, them-ncml9v7v@v2 | Hôm nay (`homNay`, `theSao`) | Khớp: chữ theo dữ liệu thật; viên «Đã kết nối · HH:mm» đã có |
| them-o1pi9nla@v6 | Nhiệm vụ | Khớp; chip «Bộ Tự lập · 5 việc» chưa có (máy chủ không trả tên bộ việc) |
| them-ixgnaoap@v4 | Nhiệm vụ không tải được | Lệch đã sửa: «Sao vẫn trừ như bình thường» và viên «Mất mạng · sao vẫn trừ» (trước «tính») |
| them-2ozi68mq@v3 | `NopBaiView` | Khớp chữ; Lệch: Bàn ba tab Ảnh/Ghi âm/Viết, code một ô ghi chú + chọn ảnh (đổi luồng, không làm) |
| them-3ve41yps@v4, them-j77wjvqr@v2, them-m9decu4z@v1 | Đã nộp · duyệt · chụp lại | Khớp (thông báo + `TinMoiView`/`NopBai`) |
| them-r6eya42m@v8, them-r12v4x2d@v1 | Sao & quà (`theSaoQua`) | Khớp |
| them-3w616hjq@v3, them-oe5faa6g@v3 | `DoiQuaView` | Khớp |
| them-64xsl89l@v5 | `ViQuaView` | Khớp |
| them-rn20lwi7@v6 | Tin nhắn | Khớp |
| them-4wmbhz9f@v3, them-vbafecic@v7 | `NhacView` · đếm ngược | Khớp |
| them-kofpo0dl@v6 | `ManKhoaView` Hết sao rồi | Lệch đã sửa: «Từ điển vẫn mở được · không tính phút» (tên app «Không tính phút» đầu danh sách; trước «App không tính phút vẫn mở được.») |
| them-2ndg9bu6@v9 | `MaOfflineView` (màn khoá, mất mạng) | Lệch đã sửa: «Ba Mẹ ở cạnh con?», «Nhờ Ba Mẹ đọc mã 6 số…», nút «Mở máy bằng mã của Ba Mẹ» xanh đậm cả bề ngang, dòng «Có mạng lại, sổ sao tự cập nhật.»; chưa có 6 ô rời |
| them-qa6tsua3@v2 | `XinVayView` đã lưu lời xin | Khớp |
| them-45hk69p9@v3 | Cửa sổ «Mở tạm» sau khi nhập mã | Chưa có: máy chỉ báo một dòng chữ khi mã đúng, chưa có cửa sổ «Ba Mẹ đã mở máy bằng mã · N phút · Vào AiiGrow» |
| them-zsf6b45n@v4, them-s9zxgltm@v3 | `XinVayView` | Khớp |
| them-zkgjog14@v4 | Đã gửi Ba Mẹ (vay) | Khớp |
| them-0k1r3wsl@v4 | `SaoLaPhutView` | Khớp (tên Roblox/YouTube trong Bàn là ví dụ — code nêu theo nhóm) |
| them-8efbpmkb@v4, them-39y24jad@v4 | `VayKetQuaView` | Khớp |
| them-shh2qdpw@v3, them-sw37ub0p@v4, them-5ici9ysd@v7 | Xin mở app · chưa có trong danh sách · đã gửi | Khớp |
| them-oduos66h@v2, them-paetepsf@v1 | `AppKetQuaView` | Khớp |
| them-t66cmp4a@v2 | `AppKetQuaView` chưa thêm | Lệch chưa sửa: Bàn có thêm nút «Mở YouTube Kids» (app còn lại trong danh sách) + dòng «… vẫn trong danh sách», code chỉ «Nhắn Ba Mẹ» / «Về Hôm nay» (cần chọn app thay thế — đổi luồng) |
| them-xe0zv9p7@v4 | `ThoatMacView` | Khớp |
| them-xaqxn0as@v1 | `HoiAiiGrowView` | Khớp |
| them-1goe18ih@v1 | `GioiLamView` | Khớp |
| them-9n52pmqh@v1 | Xin app khi mất mạng | Khớp phần chữ chính (`ChuaCoDanhSachView` + `MaOfflineView`) |
| them-hyj1eryo@v2 | Menu thanh trên cùng (`TrayApp.dungMenu`) | Lệch đã sửa: dòng đầu «● Đã kết nối · còn 18 sao = 18 phút chơi», mục «Đồng bộ ngay» (mới, hỏi daemon + tải lại), «Mở AiiGrow», chân «Máy này do Ba Mẹ quản lý bằng AiiGrow». Không chụp (NSMenu) |
| them-tf7nd1l7, 8yfbs3f3, kg2sqdng, 5kzjn4hf, 3gs80agp (giờ ngủ) · them-dvo45hys, 2lgu2bbn, e5g29hhd, 8kunyc5s, fy6o6c7c (giờ học + ngoại lệ) · them-x3qk4kp9 (+10 phút) · them-51ahzmk9 (chưa đủ sao) | — | Bàn lệch issue — không dựng (luật cũ: giờ ngủ, giờ học, ngoại lệ, đổi sao lấy giờ) |

## Bàn lệch issue (không dựng)
them-tf7nd1l7, them-8yfbs3f3, them-kg2sqdng, them-5kzjn4hf, them-3gs80agp (giờ ngủ + xin ngoại lệ) · them-dvo45hys, them-2lgu2bbn, them-e5g29hhd, them-8kunyc5s, them-fy6o6c7c (giờ học + xin ngoại lệ) · them-x3qk4kp9 («Đã đổi +10 phút») · them-51ahzmk9 («Chưa đủ sao · đổi phút»). Thêm: nút «Xin Ba Mẹ mở ngoại lệ» trong các màn khoá của Bàn; chữ «Giờ tính theo từng bé» ở them-0ltdde49 theo Bàn (còn nhắc «giờ» nhưng không chặn luật).

## Bàn có – code chưa làm được
- 6 ô số rời + hình điện thoại ở «Ghép máy» (them-y68iyzp4…), «Mã không nhận? ›», nút «Quay lại» từng bước ghép.
- Cửa sổ «Ba Mẹ đã mở máy bằng mã · N phút» (them-45hk69p9).
- Nút «Mở YouTube Kids» ở them-t66cmp4a; chip «Bộ Tự lập · 5 việc» ở Nhiệm vụ (máy chủ chưa trả tên bộ việc).
- Trang hướng dẫn cài (cmt-mac-chao/dieu-khoan) — thuộc trang tải web, không phải khung Installer.
- Nút «Xin Ba Mẹ cho vay sao…» trong menu đã có; «Đồng bộ ngay» mới thêm.

## Code có – Bàn không có
Mục menu «Đổi người / Đăng xuất», «Xin mở trang hoặc app…», «Cài hồ sơ DNS gia đình…», dòng bản đang chạy; dòng chân «Máy khoá lại; …» dưới nút ở màn «Máy đã sẵn sàng»; banner «Hỏi AiiGrow cách sửa ›»; cảnh báo «Đã ghép máy, NHƯNG…» ở bước Bật quyền.

## Ảnh
Cặp Bàn/app (chụp sau khi sửa): them-0ltdde49 (ảnh app = biến thể chưa có hồ sơ máy của ChupClay), them-2ndg9bu6, them-x9z1bmlp, them-kofpo0dl, them-4ihu4j01. them-hyj1eryo chỉ có ảnh Bàn (NSMenu không chụp được).

## Test
`swift build` OK; `swift test` 294 test, 0 lỗi (5 bỏ qua), giữ khoá build.lock.
