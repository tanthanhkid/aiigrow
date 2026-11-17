# #325 đợt 2 · Con iPhone / iPad (`agent-ios/`) so với Bàn (bản sáng 17/11)

Hành trình: con-dt-cai, con-dt-ngay, con-dt-gio, con-dt-xin, con-dt-chan, con-dt-khac. Bỏ con-dt-android và màn chỉ Android.
iPhone/iPad chỉ một bé (#267): màn máy chung / PIN nhiều bé (cdt-pin-ghep, them-28ir0qe4, them-b3l7ubu5, them-zw8cwyzr, them-2ljthd3f, them-8l4fb6yf, them-bwdspoi7, them-q72t4no4, them-f2mt6vfr, them-j424uyis) không áp cho iOS.

## Bảng
| key@vN | Màn / tệp | Kết quả |
|---|---|---|
| cdt-chao@v4, cdt-chua-ghep@v3, cdt-nhap-ma@v4, them-4hu611yo@v2, them-x7v7px1j@v2, them-yp7fnry7@v2, them-z55cy897@v4 | `ManCai.swift` ManChao/ManChuaGhep/ManNhapMa/ManQuetQR | Khớp |
| them-3s04rjes@v1 (Máy này của bé nào?) | `ManCai.swift` ManChonBeGhep | **Lệch → đã sửa**: chọn một bé (dấu chọn) + «Tiếp tục với <tên>», câu «Mã ghép có N bé…», «Chọn một bé thôi · Muốn đổi thì gỡ máy rồi ghép lại» (trước: chạm tên là ghép ngay) |
| cdt-quyen@v7 / them-b3prchz2@v4 | `ManCai.swift` ManQuyen | Khớp them-b3prchz2 (iOS một bé, «Cho phép đếm phút chơi»). cdt-quyen@v7 là bản Android máy chung (PIN) — không áp |
| them-cz5mw9ha | ManQuyen.chuaChoPhep | Không đọc được bản bàn (tệp ảnh chụp lỗi) — chưa đối chiếu |
| cdt-chinh-ios@v7 | `ManNgay.swift` ManHomNay | **Lệch → đã sửa**: thêm nút «?» ⇒ Quy tắc nhà mình; còn lại khớp |
| cdt-quy-tac@v7 | `ManGio.swift` ManQuyTac | **Chưa có → đã làm** (đúng chữ bàn) |
| cdt-nha-chinh@v8, them-uero9k5x@v1 | ManHomNay | **Lệch → đã sửa**: thêm nút «Chơi bằng sao · 1 sao = 1 phút»; «Mở hết» khớp |
| cdt-choi@v5 | `ManGio.swift` ManChoiBangSao | **Chưa có → đã làm một phần**: số sao, «= N phút chơi · 1 sao = 1 phút», nhóm Tính phút / Không tính phút (hiện «N app», Apple không cho đọc tên app), chữ cuối. Bỏ nút «Chơi ngay» (không có phiên chơi trong app, Thời gian sử dụng tự đếm) |
| cdt-cai@v6 | `ManGio.swift` ManXinCai | **Lệch → đã sửa**: nhãn «Theo danh sách App & web» (trước «Theo danh sách của Ba Mẹ») |
| cdt-nhiem-vu@v2, cdt-nv-chi-tiet@v2, cdt-dang-lam@v2, cdt-chup@v3, them-pgpfq8of@v3, them-qqzb3lnt@v3, them-r6lv8p5v@v2 | `ManNgay.swift` ManNhiemVu, `ManNop.swift` | Khớp (chữ tên mẫu thay bằng dữ liệu thật) |
| cdt-cho-duyet@v2 | ManNop.choDuyet | **Lệch → đã sửa**: nhãn «⏳ Chờ duyệt» + dòng «<việc> · Nộp HH:MM · Ba Mẹ đã nhận». «Đổi ảnh» / «Rút lại»: Chưa có (cần API, ngoài phạm vi giao diện) |
| them-6t2vvx7d@v2 | ManNop.daLuu | **Lệch → đã sửa**: «Mất mạng rồi. Ảnh vẫn còn nhé!» khi nộp ảnh |
| cdt-chup-lai@v2 | ManNop.lamLai | Lệch nhỏ, chưa sửa: bàn «Chụp lại ảnh bàn học» + «Nhắn Mẹ Lan»; app «Làm lại & nộp» (nút nhắn cần API) |
| cdt-duoc-duyet@v3 | (không có màn riêng) | Chưa có: bàn có màn «Giỏi quá! Ba Mẹ duyệt…» + trả nợ; app báo qua Tin nhắn / số sao |
| cdt-vi-qua@v4, cdt-cua-hang@v5, cdt-doi-qua@v5, them-l9qeq0np@v3 | `ManNgay.swift` ManSaoQua/ManCuaHang | Khớp (nợ, vay, «Thiếu sao? Xin Ba Mẹ cho vay sao»). Dòng «Huy hiệu» trong Ví quà: Chưa có |
| cdt-huy-hieu@v2 | — | Chưa có: bàn cần tiến độ huy hiệu («Còn 2 ngày», «Còn 3 việc»), API chỉ trả huy hiệu đã đạt (`huyHieu[]`) |
| cdt-nha@v2 (Tin nhắn) | ManTin | Khớp (câu trả lời nhanh khác tên mẫu) |
| cdt-gio-may@v2 (Giờ máy lệch) | — | Chưa có: iOS dùng Thời gian sử dụng của Apple, không tự phát hiện giờ máy lệch |
| cdt-phien@v4, cdt-nhac-5-phut@v3 | — | Chưa có / thay bằng cơ chế Apple: không có màn «Đang chơi» đếm lùi; nhắc 5 phút là thông báo cục bộ (DeviceActivity) |
| cdt-het-phien@v7, them-4e5fwl16@v5, cdt-xin-phep@v3 | `ManNgay.swift` TheKhoa, `ShieldConfig`, `ManGio.swift` | Khớp |
| cdt-chan-web@v4 | `ShieldConfigurationExtension.swift` | **Lệch → đã sửa**: «Trang này chưa có trong danh sách» + «Con xin Ba Mẹ mở nhé!» |
| them-xxgu8hk6@v3 (web chưa thêm · Xin lại) | ManConDangXin.ketQuaApp | Lệch nhỏ, chưa sửa: dùng màn «Ba Mẹ chưa thêm <tên>» chung, thiếu ô «Lý do» và câu riêng của web |
| cdt-webview@v4 | — | Chưa có: iOS không có trình duyệt trong app (chặn web bằng Thời gian sử dụng) |
| cdt-ma-offline@v4, them-a16j4hh8@v5, them-mvld82p8@v5, cdt-ma-da-mo@v4, them-qpj5mdyr@v4, cdt-ios-ma-offline@v4 | `ManGio.swift` ManMaOffline | Khớp; **sửa** dòng cuối «Điện thoại của <tên> · Ba Mẹ quản lý bằng AiiGrow» + «Dành cho Ba Mẹ: lọc web ›» |
| them-djha85wh | ManMaOffline.daMo | Không đọc được bản bàn (tệp ảnh chụp lỗi) — chưa đối chiếu |
| cdt-ios-xin-them@v3, cdt-yeu-cau@v6, them-0p8dmjan@v4, them-j4g2mtm8@v1, them-w8po32o6@v2, them-5nxwuaxz@v4 | ManXinThem, ManConDangXin | Khớp |
| cdt-ios-dns@v3 | ManDns | Khớp |
| cdt-gio-ngu@v5, them-ioje1spu@v5, cdt-ios-choi-diem@v4, them-4atwdaqy@v3, them-bw8y2ta0@v3 | — | Bàn lệch issue (xem dưới) — không làm |
| cdt-android-khoa@v4 | — | Màn Android — bỏ |

## Bàn lệch issue
- cdt-gio-ngu@v5, them-ioje1spu@v5 (giờ ngủ / giờ học): bàn đã ghi «Xoá màn khỏi hành trình» 14/11 nhưng vẫn còn trong danh sách.
- cdt-ios-choi-diem@v4, them-4atwdaqy@v3, them-bw8y2ta0@v3 (Đổi sao lấy giờ, «Chưa đủ sao»): bàn ghi xoá 15/11 nhưng còn trong danh sách.
- cdt-ma-da-mo@v4: còn dòng «Hết 30 phút máy khoá lại» đúng; không còn luật cũ.
- cdt-quyen@v7 / cdt-pin-ghep@v6: nói «nhập PIN để vào máy» cho cả «Điện thoại» — iOS một bé, không PIN (#267); chỉ áp Android.

## Bàn có – code chưa làm được
cdt-huy-hieu (thiếu tiến độ từ API) · dòng Huy hiệu ở cdt-vi-qua · cdt-gio-may (iOS không tự đo giờ máy) · cdt-phien / cdt-nhac-5-phut (Apple tự đếm, không có phiên trong app) · cdt-webview · «Đổi ảnh» / «Rút lại» (cdt-cho-duyet) · nút «Nhắn Mẹ Lan» (cdt-chup-lai) · màn cdt-duoc-duyet · ô «Lý do» + màn riêng cho web chưa thêm (them-xxgu8hk6) · tên app thật trong cdt-choi (Apple chỉ cho token mờ).

## Code có – bàn không có
Màn «Ba Mẹ chọn app» (FamilyActivityPicker) · màn PIN / chọn tên / «Ba Mẹ đang dùng máy» (ManPin, ManMayKhoa, ManBaMeDung — còn trong code cho máy dùng chung kiểu cũ, #267 chốt iOS một bé) · «Đã gỡ AiiGrow» (ManDaGo) · màn quét QR (bàn có them-z55cy897, có) · khung nghỉ giữa lượt «Nghỉ một chút» / «Hôm nay chơi đủ rồi» (#302).

## Test và ảnh
- `xcodebuild build -scheme AiiGrowCon` (generic iOS Simulator, CODE_SIGNING_ALLOWED=NO, giữ build.lock): **BUILD SUCCEEDED**.
- Không có Package.swift; test ConCore (`Tests/ConCoreTests.swift`) không chạy — thay đổi chỉ ở lớp SwiftUI/chữ, không đụng ConCore.
- Ảnh app thật: **chưa chụp** (không mở simulator trong đợt này); chưa có ảnh bàn cạnh app. Chữ bàn/iOS đối chiếu ở `chu-chung-ios.md` (phiên chính).
