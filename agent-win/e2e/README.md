# E2E agent Windows trên GitHub Actions

Workflow `.github/workflows/agent-win.yml` (chạy khi PR/push đụng `agent-win/**`, `server/**`, hoặc bấm tay):

- **unit** — `dotnet test agent-win/tests/AiiGrow.Tests` trên Windows thật (test DPAPI… không tự bỏ qua như trên Mac).
- **build** — `build-mot-file.sh` ba lần song song: bản đang phát (`Directory.Build.props`), `9.9.8`, `9.9.9` (sửa số bản trong job, không commit).
- **e2e** — `chay.ps1` (Windows PowerShell 5.1, quyền admin của runner): bật `pnpm dev` (PGlite, OTP chế độ thử), `proxy.mjs`, rồi chạy
  kịch bản KB1–KB10, mỗi kiểm tra in `PASS` / `FAIL` / `BỎ`, bảng tóm tắt ở Summary của run. Artifact `e2e-logs`: log máy chủ, proxy,
  `ProgramData\AiiGrow\*.log` (trước gỡ / sau gỡ / cuối), AppLocker XML, sự kiện AppLocker + SCM, `ket-qua.md`.

Chạy tay trên một máy ảo Windows (KHÔNG chạy trên máy thật đang dùng — kịch bản bật AppLocker, ghi chính sách trình duyệt, tạo tài khoản `aiicon`):

```powershell
powershell -ExecutionPolicy Bypass -File agent-win\e2e\chay.ps1 -SetupGoc .\goc\AiiGrow-Setup.exe -SetupMoi1 .\998\AiiGrow-Setup.exe `
  -SetupMoi2 .\999\AiiGrow-Setup.exe -BanGoc 0.2.2
```

## Đồ giả của harness (không phải mã sản phẩm)

- **proxy.mjs**: agent ghép với `http://127.0.0.1:3311` (proxy) thay vì thẳng Next `:3310`. Proxy chuyển nguyên văn mọi đường, chỉ
  đè `GET /api/agent/ban-moi` (`server/lib/ban-agent.ts` cố định, không có biến môi trường để đè). Mặc định trả bản `0.0.1` ⇒ agent không
  bao giờ tải bản phát hành thật trên Blob trong lúc thử. KB7b mới đặt manifest bản `9.9.9`.
- **https://127.0.0.1:3443**: phục vụ bộ cài `9.9.9` bằng chứng chỉ tự ký, đưa vào `LocalMachine\Root` — agent chỉ nhận URL https cùng host máy chủ.
- **Luật «quản trị» giả** đặt trước khi cài: luật AppLocker `QuanTri E2E: …` (AuditOnly, Allow Everyone — vô hại) và mục `1` trong
  `URLBlocklist` Chrome/Edge. Kiểm AiiGrow không xoá chúng ở KB6 và KB9.
- **Gắn tài khoản Con vào config (KB4.8)**: bộ cài một chạm không ghi `ChildUser/ChildSid` (xem KB4.7). Harness dừng dịch vụ, giải DPAPI
  `config.json`, điền `aiicon` + SID như luồng cài có giao diện (`Installer.RunAsync`) sẽ ghi, rồi chạy lại — để vẫn kiểm được đường AppLocker thật.
- **Giả lỗi (KB8)**: một tiến trình giữ `AiiGrow.Tray.exe` ở chế độ chỉ đọc, không chia sẻ ghi/xoá (như phần mềm diệt virus đang quét) ⇒ không ghi đè, không đổi tên được.

## Giới hạn của runner (Windows Server 2022, một phiên dịch vụ, không người dùng thật)

- **Không có phiên đăng nhập của Con**: không ai đăng nhập `aiicon` ⇒ `ChildSessionId = -1`. Vì vậy không kiểm được: màn khoá/đếm ngược,
  ngắt phiên (`WTSDisconnectSession`), đóng app ngoài danh sách trong phiên Con, đếm phút dùng app, và «lệnh ghi từ phiên không phải Con bị
  từ chối» (khi không có phiên Con, `QuyenPhien.LaPhienCon` cho mọi phiên — KB10.5 ghi lại quan sát, đánh dấu BỎ).
- **Không có khay**: khay là app WinForms chạy ở phiên người dùng (HKLM Run). Harness nói chuyện với dịch vụ qua named pipe `AiiGrow.Tray`
  giống khay (PipeRequest/PipeResponse JSON một dòng), nên kiểm được trạng thái, `sync-now`, `hoc-vien` — nhưng không thấy giao diện.
- **AppLocker được ÁP (có luật, Exe Enabled, AppIDSvc chạy)** nhưng không thử chặn một exe dưới tài khoản Con (cần phiên Con). Server 2022
  có AppLocker; máy gia đình Windows Home có thể không — xem `docs/KHA-THI.md`.
- **Thông báo trước đăng nhập, Safe Mode, khởi động lại máy**: không kiểm (runner không khởi động lại được giữa job).
- **Tự cập nhật** chờ `UpdateWorker` (2 phút sau khi dịch vụ chạy) — KB7b khởi động lại dịch vụ rồi chờ tối đa 8 phút.
- Máy chủ chạy `next dev` (biên dịch đường lần đầu chậm) — harness hâm nóng các đường trước khi cài vì agent chỉ chờ 20 giây mỗi request.
