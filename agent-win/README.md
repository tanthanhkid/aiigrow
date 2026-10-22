# AiiGrow cho Windows (tác tử máy con)

Tác tử Windows của AiiGrow: tính giờ dùng máy của con, áp chính sách do bố mẹ đặt, và **luôn nói rõ cho con biết**
máy đang được quản lý. Chỉ dùng cơ chế chính thức của Windows (tài khoản Standard, dịch vụ hệ thống, AppLocker,
khoá phiên). Không ẩn mình, không né hệ điều hành. Căn cứ và phần chưa xác minh: [`docs/KHA-THI.md`](../docs/KHA-THI.md) mục 4,
API máy con: [`docs/PLAN.md`](../docs/PLAN.md) mục 3 và 5.

## Kiến trúc

```
AiiGrow.Setup.exe   (quản trị, chạy một lần)  ghép máy, hạ quyền con, cài dịch vụ, đặt Run cho tray
AiiGrow.Service.exe (LocalSystem, dịch vụ)    sync, AppLocker, đóng app ngoài danh sách, khoá phiên
AiiGrow.Tray.exe    (phiên của con, HKLM Run) khay, xin thêm giờ, màn chặn, màn hết giờ
AiiGrow.Core        (thư viện)                API client, DPAPI, Policy, AppLocker XML, pipe, WTS
```

- **Core**: client `POST /api/pair`, `POST /api/device/sync`, `POST /api/device/requests`, `GET /api/device/requests/:id`
  (Bearer). Cấu hình + token ở `%ProgramData%\AiiGrow\config.json`, mã hoá DPAPI `LocalMachine`, thư mục chỉ
  SYSTEM/Administrators đọc. Nhớ Policy cuối để chạy khi mất mạng (giờ còn lại tự trừ theo phút đã dùng).
- **Service**: vòng lặp 5 giây; sync mỗi `nextCheckSec`.
  - `mode = hoc`: sinh XML AppLocker và gọi `Set-AppLockerPolicy -XmlPolicy` (PowerShell), bật `AppIDSvc`.
    Luật: Allow cho Everyone + **Deny riêng SID của con**, trừ ngoại lệ (thư mục Windows, `%PROGRAMFILES%\AiiGrow`,
    Windows Defender, Common Files, và từng `allowedApps` dạng `*\ten.exe`). Mọi luật có tiền tố `AiiGrow:`;
    rời chế độ học thì gỡ đúng các luật đó, luật của người khác giữ nguyên.
  - Dự phòng: đóng tiến trình trong phiên con không thuộc danh sách (app đã chạy từ trước, hoặc AppLocker chưa áp).
  - `locked`: tray hiện màn khoá toàn màn hình và đếm ngược (60 giây khi hết giờ, 10 giây các lý do khác), sau đó
    dịch vụ `WTSDisconnectSession` phiên của con; tray cũng gọi `LockWorkStation`.
  - Đếm phút theo app: tray báo app tiền cảnh của phiên con qua pipe. Nếu tray bị tắt, dịch vụ vẫn tính giờ
    phiên con dưới tên "Không rõ" (không dừng được đồng hồ bằng cách tắt tray).
  - Service và tray nói chuyện qua named pipe `\\.\pipe\AiiGrow.Tray`, ACL: SYSTEM + Administrators toàn quyền,
    người dùng đã đăng nhập đọc/ghi; lệnh gửi lời xin và báo app chỉ nhận từ phiên của con.
- **Tray** (WinForms, Segoe UI, xanh lá `#15803d`): biểu tượng "AiiGrow đang bật" + thời gian còn lại; cửa sổ Xin thêm
  thời gian (30 phút / 1 giờ / 2 giờ + lời nhắn) rồi chờ bố mẹ; nút Đổi điểm chỉ hiện khi `canExchangePoints`
  (**không bao giờ hiện số điểm**, tray cũng không nhận số điểm); màn "chưa được bố mẹ cho mở"; màn hết giờ;
  đếm ngược khi được thêm giờ; nhắc còn 5 phút / 1 phút.
- **Setup** (3 bước theo thiết kế tre-win-1..3): quyền quản trị, chọn/tạo tài khoản của con (đang là Administrator thì
  hạ xuống Users, bắt buộc còn một quản trị viên khác), nhập mã 6 số. Đồng thời đặt thông báo trước khi đăng nhập
  (`LegalNoticeCaption/Text`). Gỡ: `AiiGrow.Setup.exe --uninstall`.

## Build

Cần .NET 8 SDK. Trên Windows:

```powershell
cd agent-win
dotnet build AiiGrow.sln -c Release
dotnet test  AiiGrow.sln -c Release
foreach ($p in 'Service','Tray','Setup') {
  dotnet publish src/AiiGrow.$p -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o publish
}
```

**Bộ cài MỘT file** (bản phát hành cho phụ huynh): `./build-mot-file.sh` (Mac/Linux, cần .NET 8 SDK) → `ra/AiiGrow-Setup.exe`
(~180 MB, tự chứa .NET; Service + Tray nhúng bên trong, bộ cài tự giải ra `Program Files\AiiGrow`). Tệp exe đặt cạnh bộ cài vẫn được ưu tiên
(bản zip cũ chạy như trước). Bộ cài là wizard 5 bước: Chào → Điều khoản → Tài khoản của Con → Ghép máy (mã 6 số) → Cài.

Trên Mac chỉ build/test được logic: thêm `-p:EnableWindowsTargeting=true` (test DPAPI tự bỏ qua ngoài Windows).
CI: `.github/workflows/agent-win.yml` (`windows-latest`, build + test + publish, artifact `AiiGrow-win-x64`).

## Cập nhật đè và tự cập nhật (từ 0.2.0)

- **Chạy lại `AiiGrow-Setup.exe` trên máy đã cài** (dịch vụ có + config đã ghép) ⇒ màn «Cập nhật AiiGrow lên bản X»: dừng dịch vụ + khay,
  sao lưu `Program Files\AiiGrow` sang `AiiGrow.sao-luu`, chép bản mới, chạy lại, ghi số bản ở mục Ứng dụng. Config/token, tài khoản Con,
  luật AppLocker (ProgramData / chính sách Windows) không đụng ⇒ không ghép lại. Lỗi giữa chừng ⇒ chép bản sao lưu trở lại.
  Cùng bản hoặc bản cũ hơn ⇒ «Đã là bản mới nhất» (Mở lại · Sửa cài đặt). `--sua` ép chạy wizard cài như cũ.
- **Tự cập nhật**: dịch vụ (`UpdateWorker`) hỏi `GET /api/agent/ban-moi` sau 2 phút rồi mỗi 6 giờ → `{version, url, sha256}`. Chỉ nhận bản
  mới hơn, URL https cùng host máy chủ hoặc `*.public.blob.vercel-storage.com`; tải về `ProgramData\AiiGrow\cap-nhat`, sha256 sai ⇒ xoá.
  Đúng ⇒ chạy `AiiGrow-Setup.exe --capnhat --im-lang` bằng tác vụ SYSTEM `AiiGrowCapNhat` (mã thoát 0 ok · 7 lỗi đã khôi phục · 8 lỗi chưa khôi phục).
  Khay báo «AiiGrow đã cập nhật lên bản X» một lần. Mỗi request gửi header `X-AiiGrow-Ban`.
- **Phát bản mới**: tăng `<Version>` ở `Directory.Build.props` → `./build-mot-file.sh` → tải `ra/AiiGrow-Setup.exe` lên Blob
  `tai/AiiGrow-Setup-<ver>.exe` (không thêm đuôi ngẫu nhiên) → sửa `server/lib/ban-agent.ts` (version, url, sha256) → merge.
- TODO: khay gợi ý «có bản mới» cho máy không tự cập nhật được (mạng chặn Blob…).

## Cài thử (máy Windows thật hoặc máy ảo)

1. Có sẵn một tài khoản quản trị của bố mẹ và một tài khoản của con (Administrator hay Standard đều được).
2. Chép thư mục `publish` sang máy; (tuỳ chọn) tạo `server.txt` cạnh `AiiGrow.Setup.exe` chứa địa chỉ máy chủ,
   hoặc đặt biến môi trường `AIIGROW_SERVER`.
3. Chạy `AiiGrow-Setup.exe` (hoặc `AiiGrow.Setup.exe` bản zip) bằng quản trị viên, làm theo từng bước, nhập mã 6 số lấy ở app Ba Mẹ.
4. Đăng xuất, con đăng nhập: thấy thông báo "Máy được bố mẹ quản lý" và biểu tượng AiiGrow ở khay.
5. Đổi chế độ ở app bố mẹ rồi quan sát: `Get-AppLockerPolicy -Local -Xml` (luật `AiiGrow:`), nhật ký dịch vụ trong Event Viewer.

## Nghiệm thu trong môi trường cách ly (VM / Windows Sandbox)

> **CHƯA CHẠY.** Máy phát triển hiện tại là máy công ty, KHÔNG cài dịch vụ / bật AppIDSvc / áp AppLocker trên đó.
> Mốc M4 mới chỉ `dotnet build` + `dotnet test` + dry-run (sinh XML/kế hoạch ra thư mục tạm rồi kiểm bằng test,
> xem `AppLockerBlockListTests`, `InstallPlanTests`). Các bước dưới đây là kịch bản để chạy **khi có máy ảo**.

Chạy trên một **máy ảo Windows riêng** (Hyper-V / VirtualBox) hoặc **Windows Sandbox**, đăng nhập bằng **tài khoản Standard** (không phải máy công ty):

1. **Chuẩn bị exe vô hại giả tên game**: chép `notepad.exe` thành `game-thu.exe`
   (`Copy-Item C:\Windows\System32\notepad.exe $env:USERPROFILE\Desktop\game-thu.exe`). Không cần phần mềm game thật.
2. **Cài**: chạy `AiiGrow.Setup.exe` (bộ cài tự xin quyền quản trị MỘT lần qua `app.manifest`), dùng token nhúng sẵn để ghép máy,
   cài dịch vụ (LocalSystem), đặt recovery, dựng AppLocker. Đăng nhập lại bằng tài khoản con.
3. **Ngoài giờ ⇒ bị chặn**: ở app Ba Mẹ đặt lịch sao cho đang là giờ nghỉ. Mở `game-thu.exe` ⇒ mong đợi màn chặn hiện
   tên app + lý do «Ngoài giờ dùng máy», chỉ có nút «Xin phép Ba Mẹ». Kiểm `Get-AppLockerPolicy -Local -Xml` thấy luật `AiiGrow:`.
4. **«Dùng điểm để chơi» ⇒ mở được**: chuyển sang tình huống chặn giải trí (hết điểm / chưa phân loại). Bấm «Dùng điểm để chơi»
   ⇒ dịch vụ gọi `phien/xet` → `phien/mo`; máy chủ cho ⇒ phiên bắt đầu, `game-thu.exe` chạy được.
5. **Hết phiên ⇒ bị đóng**: để phiên chạy tới hết số phút đã đổi ⇒ mong đợi `game-thu.exe` bị đóng và màn chặn hiện lại.
6. **Thu bằng chứng**: lưu `Get-AppLockerPolicy -Local -Xml > applocker.xml`, nhật ký dịch vụ trong Event Viewer, nhật ký
   `%ProgramData%\AiiGrow\install.log`, và **ảnh chụp** màn chặn + lúc mở được + lúc hết phiên. Ghi kết quả vào `docs/DO-BEN.md`.

Lưu ý an toàn: toàn bộ bước 2–5 chỉ chạy trong máy ảo/Sandbox; **không** chạy trên máy công ty.
Khi chưa áp được AppLocker (Windows Home), còn lớp dự phòng đóng tiến trình (`ProcessEnforcer`) — vẫn đóng được `game-thu.exe`.

## Giới hạn và việc cần thử (xem KHA-THI mục 4 và 7)

- **Chưa chạy thử trên Windows thật.** Mã mới chỉ build và test logic (sinh XML AppLocker, phân tích Policy, đếm phút).
- AppLocker trên **Windows Home**: `Set-AppLockerPolicy` có chạy và có enforce không là việc **chưa xác minh** (KHA-THI 4.2).
  Cần thử cả việc `AppIDSvc` có bật được bằng `Set-Service`/`Start-Service` hay không; chưa bật được thì chỉ còn lớp dự phòng (đóng tiến trình).
- Cú pháp ngoại lệ `*\ten.exe` và luật Deny theo SID có ngoại lệ cần xác nhận trên máy thật.
- **Khác bản yêu cầu một chút**: không cho phép nguyên `%PROGRAMFILES%` (nếu cho thì Chrome, game cài ở đó đều chạy được,
  trái với "Chỉ app học"). Chỉ cho Windows, AiiGrow, Windows Defender, Common Files và `allowedApps`.
  App Store (Appx) chưa có luật; app cài trong thư mục khác thì cần có tên trong `allowedApps`.
- Lớp dự phòng đóng tiến trình dựa trên thư mục nên có thể đóng nhầm helper của app lạ; helper cùng thư mục với app được phép thì được giữ.
- Tray là tiến trình của con nên con tắt được; khi đó dịch vụ vẫn tính giờ và khoá, nhưng không có màn hình báo. Tray tự chạy lại ở lần đăng nhập sau (HKLM Run).
- Số phút chưa gửi lên máy chủ không được lưu khi dịch vụ khởi động lại giữa chừng.
- Chạy offline: giờ còn lại tính theo phút đã đếm từ lần sync cuối; không tự đổi ngày/lịch ngủ khi mất mạng.
- Safe Mode với tài khoản Standard, kiểm `LegalNoticeText` trên Home: thuộc danh sách cần thử trên máy thật (KHA-THI mục 7).
- Chưa ký số (code signing): Windows SmartScreen sẽ cảnh báo bộ cài; cần chứng chỉ trước khi phát hành.
