# AiiGrow cho Windows — cài một chạm, dịch vụ, gỡ từ xa

Phần này của tác tử Windows AiiGrow (chép từ agent AiiControl đã review rồi đổi thương hiệu, thêm phần khác biệt):
**cài một chạm**, **dịch vụ heartbeat/đồng bộ**, **gỡ từ xa**. Giữ đúng tinh thần sản phẩm kiểm soát của phụ huynh **công khai**:
biểu tượng khay luôn hiện, Con thấy rõ máy đang được AiiGrow quản lý, gỡ cần **mật khẩu Ba Mẹ** hoặc **quyền quản trị Windows**
(Con dùng tài khoản Standard). Không ẩn tiến trình, không chống gỡ lỗi, không cửa sau.

Phần áp Policy đầy đủ (khung giờ, Fun list, phiên điểm) và **màn chặn** đang chờ (một PR sau). Mốc này chỉ gồm 3 việc hạ tầng trên;
mã lớp thực thi (AppLockerController, AgentWorker, PipeServer, Tray) vẫn còn trong repo nhưng dịch vụ chưa đăng ký chạy (xem `Program.cs`).

## Thành phần
```
AiiGrow.Setup.exe    (quản trị) cài một chạm: đọc token nhúng → ghép máy → cài dịch vụ (+ SCM tự khởi động lại)
AiiGrow.Service.exe  (LocalSystem) HeartbeatWorker: đồng bộ định kỳ, gửi sự kiện (OfflineQueue), nhận lệnh gỡ từ xa
AiiGrow.Core         (thư viện) enrollment, HeartbeatClient/EnrollClient, SyncResult/lenh, OfflineQueue, SystemCleanup
```

## Cài MỘT CHẠM
Máy chủ sinh một bộ cài có **token ghép nhúng sẵn** (không phải nhập URL hay mã tay). Người dùng tải về, chạy — **UAC hỏi quyền quản trị
một lần** (`app.manifest` = requireAdministrator) — là xong:

- Chạy tay: nhấp đúp `AiiGrow-Setup.enroll-<gói>.exe` (hoặc bộ cài có trailer token).
- Chạy ngầm: `AiiGrow.Setup.exe /silent` (đọc token nhúng, không cửa sổ; ghi `%ProgramData%\AiiGrow\install.log`, mã thoát 0/2/3).

Token nhúng đọc theo thứ tự: tham số `--enroll=` / `/enroll:` → biến môi trường `AIIGROW_ENROLL` → **trailer** cuối tệp → **tên tệp**
`...enroll-<gói>.exe`. `<gói>` = base64url JSON `{server, token}` (hoặc `token@server`). Xem `docs/API.md` phần `ghep-goi`.

Các bước cài (tự động, không hỏi): ghép máy (`POST /api/device/ghep-goi`) → lưu token thiết bị ở `%ProgramData%\AiiGrow\config.json`
(DPAPI máy, thư mục chỉ SYSTEM/Administrators) → chép file + tạo **dịch vụ** `AiiGrowService` (StartupType Automatic) →
đặt **SCM failure actions** restart/restart/restart → đặt biểu tượng khay tự chạy + thông báo đăng nhập «Máy được Ba Mẹ quản lý».
Cài một chạm **không đụng tài khoản Windows** (máy dùng chung: Con chọn hồ sơ + PIN). Việc tạo/hạ quyền tài khoản của Con là luồng cài
có giao diện (chạy `AiiGrow.Setup.exe` không kèm token) hoặc do quản trị viên làm.

## Dịch vụ — heartbeat & tự khởi động lại
`HeartbeatWorker` (LocalSystem) lặp: dựng trạng thái → `POST /api/device/dong-bo` → đọc `nextCheckSec` và `lenh` → gửi hàng đợi
`OfflineQueue` khi có mạng lại. Mất mạng ⇒ xếp sự kiện `offline`, thử lại sau 30 giây. Token thiết bị bị từ chối ⇒ **không** tự gỡ
(tránh gỡ nhầm do lỗi thoáng qua), chờ lệnh gỡ tường minh.

Dịch vụ bị dừng/đổ ⇒ **Windows SCM tự khởi động lại** bằng failure actions đặt lúc cài (`sc.exe failure … actions= restart/5000/…`,
`failureflag 1`). Con dùng tài khoản Standard nên không dừng/xoá được dịch vụ.

## Gỡ
- **Gỡ từ xa (Ba Mẹ bấm trong app)**: máy chủ trả `lenh:[{id, loai:"go"}]` ở lần đồng bộ. Dịch vụ gỡ sạch (dịch vụ, Run, thông báo
  đăng nhập, luật AppLocker của AiiGrow, file + token) rồi `POST /api/device/lenh/:id/xong` báo «đã gỡ», rồi tự dừng.
- **Gỡ tay có mạng**: trên máy, `AiiGrow.Setup.exe --uninstall` — cần **quyền quản trị Windows** (UAC, mật khẩu Ba Mẹ). Con là Standard
  nên không tự gỡ được.
- **Gỡ khi offline**: không gọi được máy chủ để kiểm mật khẩu Ba Mẹ, nên **chỉ cần quyền quản trị Windows** (quyết định của master
  21/10). Con dùng Standard ⇒ vẫn không tự gỡ được; chỉ người có mật khẩu quản trị Windows (Ba Mẹ) mới gỡ offline.

Gỡ dùng chung lõi `SystemCleanup.Run` (Core) cho cả gỡ tay và gỡ từ xa. File đang chạy không xoá được ngay thì hẹn xoá bằng tác vụ
khởi động của Windows.

## Build & test (máy không chạy dịch vụ/trình cài thật)
```powershell
cd agent-win
dotnet build AiiGrow.sln -c Release
dotnet test  AiiGrow.sln -c Release
```
Logic tách bằng interface (`IEnroller`, `IHeartbeatApi`, `ISystemUninstaller`) nên test chạy không cần Windows service hay mạng
(dùng `HttpMessageHandler` giả và bản giả). **Không** cài dịch vụ hay chạy trình cài thật trên máy phát triển.

## Việc chờ thiết bị (chạy thật trên Windows, tài khoản Standard)
- Thử cài một chạm từ bộ cài có token nhúng (tên tệp + trailer), kiểm UAC hỏi đúng một lần, dịch vụ chạy, khay hiện.
- Dừng dịch vụ (tài khoản admin) ⇒ xác nhận SCM tự bật lại; thử với tài khoản Standard ⇒ không dừng được.
- Gỡ từ xa: Ba Mẹ bấm gỡ ⇒ máy nhận `lenh go` ⇒ gỡ sạch, app báo «đã gỡ».
- Gỡ offline bằng quyền quản trị Windows.
