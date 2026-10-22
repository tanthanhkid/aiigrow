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

## Chế độ, fail-open, gỡ (an toàn — Ba Mẹ luôn tắt được hạn chế và gỡ sạch được)
- **Chế độ** `giam-sat` | `chan`: Ba Mẹ chọn trên app ⇒ `dong-bo.windows.cheDo`, **thắng** `CheDo` cục bộ (`Setup --che-do=`), lưu lại cho lúc mất mạng.
  Máy chủ không gửi (Ba Mẹ chưa chọn) ⇒ giữ cục bộ. Agent báo chế độ THẬT đang áp trong `status.cheDo`. Giám sát = không AppLocker (đổi sang là gỡ
  ngay), không đóng app, không ngắt phiên, không màn khoá/màn chặn ở khay — chỉ ghi log. Lõi thuần: `Core/AnToan.cs` (`CheDoHieuLuc`).
- **Fail-open** (`MoCoi`): 401/403 liên tục > 6 giờ (mốc lưu trong cấu hình, qua khởi động lại vẫn tính) ⇒ giám sát, gỡ luật AppLocker, bỏ
  `LastPolicyJson`, khay báo «máy đã rời gia đình». Vẫn đồng bộ tiếp; đồng bộ được lại là hết. Lỗi mạng không tính.
- **Gỡ từ xa**: lệnh `go` ⇒ `POST lenh/:id/xong` TRƯỚC (token riêng 30 s, không theo token dừng dịch vụ; mất mạng ⇒ chưa gỡ, lần sau làm lại)
  ⇒ `SystemCleanup.Run(ops, tuDichVu: true)`: tắt failure actions + `start= disabled` ⇒ hẹn tác vụ `AiiGrow-Dontay` (SYSTEM, chạy ngay + lúc khởi động)
  chờ dịch vụ thoát rồi `sc delete`, xoá `Program Files\AiiGrow` + `ProgramData\AiiGrow`, tự xoá tác vụ ⇒ gỡ AppLocker, khay, thông báo đăng nhập,
  mục Ứng dụng, cấu hình ⇒ dịch vụ tự dừng (không `Stop-Service` chính mình).
- **Gỡ tại máy**: bộ cài chép `AiiGrow.Setup.exe` vào `Program Files\AiiGrow` và đăng ký `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AiiGrow`
  (UninstallString `"…\AiiGrow.Setup.exe" --uninstall`, Publisher AiiLab, NoModify/NoRepair) ⇒ Cài đặt › Ứng dụng › AiiGrow › Gỡ cài đặt, UAC hỏi mật
  khẩu quản trị (Con là Standard nên không tự gỡ). `--uninstall` gọi `POST /api/device/da-go` trước khi xoá token (máy rời gia đình trên app ngay),
  rồi `SystemCleanup.Run(ops, tuDichVu: false)`. Mỗi bước bọc riêng, chạy lại bao nhiêu lần cũng được.

## Lọc web theo tên miền + ghi lịch sử web (22/10)
- **Chặn** (`Core/WebGuard.cs`, `Service/WebGuardWorker.cs`): đọc `windows.web` trong Policy cuối đã lưu, ghi chính sách quản lý của trình duyệt
  `HKLM\SOFTWARE\Policies\Google\Chrome` · `Microsoft\Edge` · `BraveSoftware\Brave` → `URLBlocklist` / `URLAllowlist` (tên miền gồm tên miền con;
  chế độ «Chỉ cho phép» = chặn `*` + cho phép danh sách + trang `chrome://`, `edge://` và máy chủ AiiGrow). Kèm cờ DWORD tắt ẩn danh / InPrivate, xoá lịch sử, chế độ khách.
  Chỉ ghi giá trị **của AiiGrow** (tên số > 90000), mục người khác đặt giữ nguyên. Chỉ áp ở chế độ **Chặn thật**; Giám sát, máy mồ côi, đang gỡ,
  Con đang mở tạm bằng mã offline, máy chưa ghép ⇒ **gỡ hết**. Kiểm lại mỗi 30 giây, không ghi lại khi chưa đổi. Gỡ AiiGrow (từ xa / tại máy / tác vụ dọn tách rời) xoá luôn chính sách này.
- **Ghi lịch sử** (`Core/WebHistory.cs`, `Service/ChromiumHistorySource.cs`, `WebHistoryWorker.cs`): đọc bản sao tệp `History` của Chrome / Edge / Brave trong hồ sơ của Con
  (theo SID / tên tài khoản; máy dùng chung không gán cho ai), gộp theo (ngày, tên miền gốc), gửi `POST /api/device/web/lich-su` mỗi 5 phút. Chỉ tên miền + đếm rời máy.
- **Giới hạn**: Firefox / Opera / Vivaldi không đọc và không lọc (nên chặn cài/đổi mặc định ở phần AppLocker); thời gian tính theo lúc trang mở nên chỉ gần đúng (mỗi lượt tối đa 3 giờ);
  trang bị chặn là trang «do tổ chức của bạn chặn» mặc định của trình duyệt; chế độ ẩn danh bị tắt ở chế độ chặn nhưng không ghi lại nếu đang ở Giám sát; lọc ở tầng DNS là phần riêng.
- **Thử thật trên máy Windows** (chưa kiểm được ở máy phát triển — không có Windows/.NET): trên app chặn `gamek.vn` cho Con ⇒ đặt máy ở «Chặn thật» ⇒ đợi ≤ 1 phút ⇒
  mở `chrome://policy` thấy `URLBlocklist` có `gamek.vn` (Status OK) và mở gamek.vn ra trang bị chặn; bỏ chặn trên app ⇒ ≤ 1 phút sau mở được lại. Chú ý: Chrome nhận chính sách HKLM
  trên máy KHÔNG vào domain Windows cần kiểm thực tế (có bản chỉ áp khi máy «được quản lý»; nếu `chrome://policy` báo «không được quản lý» thì cần phương án khác).

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
