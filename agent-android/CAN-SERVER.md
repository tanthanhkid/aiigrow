# Cần sửa phía máy chủ cho tác tử Android (24/10/2026)

Tác tử máy Con dùng gói **`vn.aiilab.aiigrow.con`** (app Ba Mẹ Expo đã giữ `vn.aiilab.aiigrow`). Máy chủ chưa đổi gì — dưới đây là việc cần làm.

## 1. Đổi component trong QR Device Owner — BẮT BUỘC
`server/lib/chuyen-doi.ts › huongDanCai("android")` đang trỏ `vn.aiilab.aiigrow/.QuanTri` (gói của app Ba Mẹ ⇒ QR cài sai app).
Đổi thành:
```
"android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "vn.aiilab.aiigrow.con/vn.aiilab.aiigrow.maycon.QuanTri",
"android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": `${g}/tai/aiigrow-con.apk`,
```
- `PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM`: base64url SHA-256 chứng chỉ khoá phát hành `7WW8vTHg1Vu0clik_OQmB0gVrxb9rlj-Uku-tq8JxZM` — ĐÃ có (khoá aiigrow-con tạo 25/10/2026, agent-android/README.md; KHÔNG tạo khoá thứ hai).
- `PROVISIONING_ADMIN_EXTRAS_BUNDLE` giữ nguyên `{ aiigrow_token, aiigrow_may_chu }` — tác tử đọc trong `ManCaiDat` (ADMIN_POLICY_COMPLIANCE) rồi gọi `POST /api/device/ghep-goi {token, nen:"android", tenMay}`.
- `duPhong`: sửa lời "cài APK / Play" ⇒ tên app «AiiGrow Con»; máy đang dùng ghép bằng mã 6 số (`POST /api/device/ghep {ma, nen:"android", tenMay}`) — đã chạy được, không cần sửa.
- Nên thêm `"android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true` (giữ Chrome, Camera… của máy).

## 2. «Thêm giờ được duyệt» chưa tới máy Android
`grantEndsAt` / `hanMoCuaMay` chỉ trả trong `dong-bo.windows` và chỉ cho `coTacTu(platform)` = windows | mac. Nhịp Android (`POST /api/device/nhip`)
nhận `ngoaiLe.moKhanCapDen` (mở khẩn cấp) nhưng KHÔNG có hạn của lời xin «thêm giờ» đã duyệt. Cần một trong hai:
- (gọn nhất) `nhipMay` trả thêm `grantEndsAt: (await hanMoCuaMay(may, con))?.toISOString()` ở gốc phản hồi; hoặc
- thêm `"android"` vào `coTacTu` và cho máy Android gọi `dong-bo` (kéo theo cả logic phiên Windows — không khuyên).
Tác tử đã đọc `grantEndsAt` ở gốc và ở `windows.grantEndsAt`. Hiện tại thêm giờ vẫn tới qua `ngoaiLe.phutThemHomNay` (cộng vào trần ngày).

## 3. Phút dùng theo app — máy chủ là sổ sách
`tran_thoi_gian: "UsageStatsManager đo phút; máy chủ là sổ sách"` nhưng `NhipVao` chưa có chỗ nhận phút. Tác tử gửi thêm trong nhịp:
`phutDungHomNay: { "<gói>": phút }` (tổng từ 0 giờ theo `tz` gia đình) và `thanhPhan: { dichVu, quyenQuanLy, deviceOwner, troNang, usageStats }`.
Cần `nhanNhip` lưu `phutDungHomNay` (và trừ trần ngày ở máy chủ, thay vì tác tử tự trừ như bây giờ) + coi `troNang=false` / `usageStats=false`
trên máy không Device Owner là `app_tat` (lệch chuẩn).

## 4. Chính sách Android phân biệt hai đường cài
`chuyenDoi(cs, "android")` đang mô tả đường Device Owner. Máy cài đường không reset (Device Admin + Trợ năng) yếu hơn:
`chan_app`/`chua_xep` = màn phủ (mot_phan), không có `chong_doi_gio`, `tai_khoan_khac`, `che_do_an_toan`, `chan_cai_dat`, `chan_web`.
Đề xuất: đọc `thanhPhan.deviceOwner` ở nhịp ⇒ lưu `devices.status.deviceOwner` ⇒ bộ chuyển đổi trả bảng «khongLamDuoc» đúng đường để Ba Mẹ thấy.

## 5. Lời xin 120 phút
`guiYeuCau` cho phút 5–240 (120 hợp lệ) nhưng câu lỗi ghi «Chọn 15, 30 hoặc 60 phút». Màn Con Android có 30 / 60 / 120 ⇒ sửa câu.

## 6. Lệnh gỡ từ xa
Tác tử xử lý `lenh: [{loai:"go"}]` ở nhịp: báo `POST /api/device/lenh/<id>/xong` ⇒ thả mọi chặn ⇒ `clearDeviceOwnerApp()` ⇒ mở hộp gỡ app.
Không cần sửa máy chủ; chỉ ghi để đối chiếu `CACH_GO_TU_XA.android`.
