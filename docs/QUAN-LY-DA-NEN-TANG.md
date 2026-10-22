# AiiGrow — quản lý đa nền tảng (M4b · M4c · M4b mạng)

Ngày 21/10/2026. Mục tiêu: MỘT chính sách cho Con, áp lên mọi máy (Windows, Android, iPhone/iPad, Mac, TV) bằng **cơ chế chính hãng**
mà Apple / Google / Microsoft cho phép — công khai, minh bạch, Con biết rõ quy tắc. Chỉ học **cách tổ chức** từ tài liệu công khai của
các hệ quản lý thiết bị doanh nghiệp / gia đình (Intune, Jamf, Workspace ONE, Android Enterprise, Apple Screen Time / Family Controls,
Google Family Link, Microsoft Family Safety, Qustodio); không chép mã, không dùng kỹ thuật ngoài tài liệu.

Giới hạn cứng: không ẩn mình · không chống gỡ trái phép (gỡ chính hãng luôn dùng được và được báo) · không tự cài lại lén · minh bạch với
Ba Mẹ và Con · qua được xét duyệt App Store / Google Play · không có «chế độ cục bộ» / mã chủ: mọi nới lỏng chỉ do Ba Mẹ duyệt qua máy chủ.

## 1. Cách tổ chức (học từ các hệ quản lý thiết bị)

| Hệ thống | Cách tổ chức học được | Ở AiiGrow |
|---|---|---|
| Microsoft Intune | Hồ sơ cấu hình trừu tượng ⇒ CSP từng nền tảng; *compliance policy* tách khỏi cấu hình; «Mark device noncompliant» ngay (0 ngày) + hành động theo lịch (báo, khoá, retire); Conditional Access chặn tài nguyên khi không tuân thủ | chính sách chung (`lib/chinh-sach.ts`) tách khỏi tuân thủ (`lib/tuan-thu.ts`); không tuân thủ ⇒ khoá giải trí ngay (fail-closed); «tài nguyên» bị chặn = phiên giải trí |
| Workspace ONE UEM | Luật «Device Last Seen — Not Within N» và «Compromised Status»; hành động: báo admin, gắn nhãn, chặn | mất nhịp quá `ngung_chay_phut` ⇒ «ngoài vòng kiểm soát» + cảnh báo một lần; lệch chuẩn (giờ sai, app tắt, admin lạ, không tới máy chủ) ⇒ hạ điểm |
| Jamf Pro | Nhóm thông minh theo lần kiểm kê cuối / thuộc tính ⇒ chính sách khắc phục | điểm tuân thủ tính lại mỗi nhịp; Ba Mẹ thấy danh sách máy + vấn đề (`GET /api/m/tuan-thu`) |
| Android Management API / Android Enterprise | Một *policy* JSON ở máy chủ, DPC trên máy dịch ra DevicePolicyManager; enrollment token nhúng trong QR | bộ chuyển đổi `android`; gói cài = token một lần nhúng trong QR Device Owner |
| Apple MDM + Screen Time API | Payload cấu hình theo nền tảng; Screen Time: FamilyControls (ủy quyền), ManagedSettings (khiên app / web), DeviceActivity (lịch, ngưỡng) | bộ chuyển đổi `ios` / `mac` / `tvos` |
| Family Link / Family Safety / Qustodio | Ba Mẹ đặt lịch, giới hạn, chặn app/web một chỗ cho mọi máy; mọi nới lỏng xin từ máy Con, Ba Mẹ duyệt trên điện thoại | đúng mô hình AiiGrow: yêu cầu / duyệt qua máy chủ, Con thấy bảng quy tắc công khai |

Ba lớp ở máy chủ:

1. **Chính sách chung** (`chinhSachChung`) — không phụ thuộc OS: giờ chơi (khung ngày thường / cuối tuần, giờ ngủ, trần ngày / tuần, phiên
   tối đa, nghỉ giữa), app & web (hệ thống / học / giải trí kèm giá điểm / chặn; chưa xếp = chặn), phiên điểm (số dư, phiên đang chạy, giá
   theo nhóm), khoá ngay, ngoại lệ (phút thêm hôm nay, luật tạm có hạn, mở khẩn cấp), tuân thủ, và **hiệu lực tổng hợp** (giải trí có mở
   không + vì sao). Dựng từ dữ liệu có sẵn (lịch, cau-hinh, app_rules, `taoPolicy`) — không lưu thêm.
2. **Bộ chuyển đổi theo nền tảng** (`chuyenDoi(cs, nen)`, thuần) — mỗi nền tảng trả đủ 17 khả năng, mỗi khả năng: mức `du` / `mot_phan` /
   `khong` / `khong_ap_dung`, cơ chế chính hãng, cấu hình cụ thể, và khi không làm được: «không làm được X ⇒ thay bằng Y» + có chỉ báo Ba
   Mẹ không. Không gọi API thật của OS — agent từng nền tảng đọc mô tả rồi gọi API (việc chờ thiết bị / Xcode / Windows).
3. **Nhịp + tuân thủ** — agent gửi `POST /api/device/nhip`; máy chủ chấm điểm, khoá giải trí khi không tuân thủ, cảnh báo Ba Mẹ có khoá chống
   trùng, mở khẩn cấp có hạn do Ba Mẹ cấp (xem `docs/KE-HOACH.md` mục 3b, `docs/API.md`).

## 2. Bảng tính năng × OS

Ký hiệu: ✅ làm được bằng cơ chế chính hãng · ◐ một phần (có cách thay) · ✖ không làm được (cách thay / chỉ báo Ba Mẹ) · — không áp dụng.

| Khả năng | Windows | Android | iPhone / iPad | macOS |
|---|---|---|---|---|
| Khung giờ chơi | ✅ dịch vụ đóng app giải trí ngoài khung (giờ máy chủ) | ✅ `setPackagesSuspended` ngoài khung | ✅ `DeviceActivitySchedule` + khiên `ManagedSettings` | ✅ daemon + Screen Time Downtime |
| Giờ ngủ | ✅ giờ đăng nhập tài khoản (`net user /times`, theo giờ chẵn, nới ra ngoài) + dịch vụ khoá đúng phút | ✅ tạm dừng mọi app trừ hệ thống / học | ✅ lịch ngủ ⇒ khiên mọi app trừ hệ thống | ✅ Downtime |
| Trần ngày / tuần | ✅ đo app tiền cảnh, máy chủ là sổ | ✅ `UsageStatsManager` | ✅ `DeviceActivityEvent` ngưỡng | ✅ daemon đo |
| Phiên điểm (trừ theo phút) | ✅ nhịp phút | ✅ bỏ / đặt lại tạm dừng theo phiên | ◐ không đo phút sống ⇒ gỡ khiên bằng lịch ngắn đúng số phút đã mua | ✅ |
| Cho phép app | ✅ AppLocker Cho phép | ✅ bỏ tạm dừng | ◐ máy chủ không gửi được bundle id (token mờ) ⇒ Ba Mẹ chọn trên máy Con bằng `FamilyActivityPicker` | ◐ daemon đóng app ngoài danh sách |
| Chặn app | ✅ AppLocker Từ chối + đóng tiến trình | ✅ tạm dừng (app hiện xám, không ẩn) | ◐ như trên | ◐ đóng ngay khi mở + ghi sự kiện |
| Chặn web | ◐ chính sách Edge / Chrome / Firefox `URLBlocklist`; trình duyệt khác ⇒ AppLocker chặn | ◐ cấu hình quản lý Chrome; trình duyệt khác ⇒ tạm dừng; DNS riêng | ✅ `webContent.blockedByFilter` nhận tên miền | ✅ hồ sơ `com.apple.webcontent-filter` |
| Chưa xếp ⇒ chặn | ✅ AppLocker chặn tệp chạy ở thư mục người dùng | ✅ app mới ⇒ tạm dừng | ◐ khiên cả danh mục trừ app Học | ◐ daemon đóng |
| Khoá ngay | ✅ | ✅ (+ `lockNow()`) | ✅ khiên mọi danh mục giải trí | ✅ |
| Khoá khi không tuân thủ (fail-closed) | ✅ | ✅ | ✅ | ✅ |
| Chống đổi giờ | ◐ Standard không đổi giờ được, đổi múi giờ được ⇒ so giờ máy chủ + báo | ✅ `setAutoTimeEnabled` + `DISALLOW_CONFIG_DATE_TIME` | ✖ không ép «Đặt tự động» (chỉ máy giám sát) ⇒ so giờ máy chủ, khoá + báo | ✅ Standard không đổi ngày giờ |
| Chặn cài đặt | ✅ AppLocker Windows Installer | ✅ `DISALLOW_INSTALL_UNKNOWN_SOURCES_GLOBALLY` | ✅ `denyAppInstallation` + «Hỏi mua» | ◐ kéo .app vào ~/Applications ⇒ chưa xếp ⇒ đóng |
| Tài khoản khác / quản trị lạ | ◐ Standard không tạo được; agent liệt kê nhóm Administrators ⇒ admin chưa xác nhận: khoá + báo | ✅ `DISALLOW_ADD_USER` | — (một người dùng; thu hồi quyền ⇒ «app tắt») | ◐ liệt kê nhóm admin |
| Chế độ an toàn | ◐ dịch vụ chạy trong Safe Mode, AppLocker không bảo đảm ⇒ báo | ✅ `DISALLOW_SAFE_BOOT` | — | ◐ không bảo đảm daemon ⇒ mất nhịp ⇒ báo |
| Nhịp | ✅ 60 giây, báo trước khi tắt / ngủ | ◐ Doze ⇒ nhịp thưa, ngưỡng mất nhịp 180 phút | ◐ chạy nền giới hạn ⇒ ngưỡng 180 phút | ✅ 60 giây |
| Gỡ cài đặt | ✅ cần UAC + mật khẩu Ba Mẹ; gỡ từ xa | ✅ Device Owner (Cài đặt hiện «do AiiGrow quản lý»); gỡ từ xa | ✅ ủy quyền `.child`: gỡ / thu hồi cần Ba Mẹ (iOS quyết) | ✅ cần quyền quản trị; gỡ từ xa |
| Khôi phục gốc / cài lại OS | ✖ không chặn ⇒ chỉ báo (ngoài vòng) | ✖ không chặn (giới hạn cứng) ⇒ chỉ báo | ✖ chỉ báo | ✖ chỉ báo |

Cơ chế nền mỗi OS:

- **Windows** — Windows Service AiiGrow (LocalSystem, tự khởi động lại), Con dùng tài khoản **Standard**, **AppLocker** (thực thi trên mọi
  phiên bản Windows 10 2004+ / Windows 11 sau KB5024351), chính sách cục bộ: chính sách trình duyệt (HKLM\SOFTWARE\Policies), giờ đăng nhập.
- **Android** — **Android Enterprise Device Owner** (DPC AiiGrow, cài bằng QR trên máy vừa khôi phục gốc); `DevicePolicyManager`:
  `setPackagesSuspended`, `addUserRestriction`, `setAutoTimeEnabled` (API 30+), `lockNow`, `setApplicationRestrictions` cho Chrome;
  `UsageStatsManager`. Máy đang dùng (không khôi phục gốc được): APK / Play + quét QR ⇒ mức bảo vệ «Một phần».
- **iPhone / iPad** — **Screen Time API**: `FamilyControls` (ủy quyền `.child` qua Chia sẻ trong gia đình, cần Apple cấp entitlement
  `com.apple.developer.family-controls`), `ManagedSettings` (khiên app / web, `denyAppInstallation`), `DeviceActivity` (lịch, ngưỡng).
  Tuỳ chọn: hồ sơ MDM khi máy được giám sát.
- **macOS** — tài khoản **Standard**, LaunchDaemon AiiGrow (hiện trong Cài đặt › Mục đăng nhập), Screen Time qua Chia sẻ trong gia đình,
  hồ sơ cấu hình (bộ lọc web). FamilyControls trên Mac chỉ qua Mac Catalyst — cần thử trên Xcode (việc chờ).

## 3. Smart TV

Mẫu số chung: **kiểm soát ở TẦNG MẠNG** — router / DNS theo thiết bị: chặn Internet theo địa chỉ MAC ngoài lịch mở / giờ ngủ / khi Khoá
ngay, lọc DNS kiểu NextDNS / Pi-hole (chặn tên miền bị chặn; tên miền giải trí chỉ mở trong lịch). Máy chủ sinh luật dạng mô tả, test được
không cần TV / router: `GET /api/m/con/:id/luat-mang?mac=&nen=` (bộ chuyển đổi `mang` + `tvos` / `android_tv` / `tizen` / `webos`).

| TV | Cơ chế chính hãng | Giới hạn | AiiGrow |
|---|---|---|---|
| Apple TV (tvOS) | Giới hạn (Restrictions): mật mã 4 số, xếp hạng nội dung, mua / cài app; MDM khi Apple TV được giám sát (Apple Configurator / Apple Business Manager) | tvOS **chưa có** lịch / giới hạn giờ Screen Time như iPhone; FamilyControls không có trên tvOS; giới hạn có thể không áp vào app tải về | lịch giờ bằng tầng mạng; Ba Mẹ đặt mật mã Giới hạn; MDM giám sát — việc chờ máy chủ MDM |
| Android TV / Google TV | Hồ sơ trẻ em Google TV do Family Link quản (giới hạn giờ / giờ ngủ, duyệt app); Device Owner chỉ hợp cho thiết bị chuyên dụng | AiiGrow không đẩy được lịch vào Family Link (không có API công khai) | tầng mạng + Ba Mẹ bật hồ sơ trẻ em |
| Samsung (Tizen) | Khoá PIN theo xếp hạng nội dung trên TV; quản lý tập trung chỉ ở màn hình thương mại (MagicINFO / VXT) — Knox trên TV gia đình là lớp bảo mật, không phải MDM | không có MDM công khai cho TV gia đình | tầng mạng |
| LG (webOS) | Khoá PIN theo xếp hạng; quản lý tập trung chỉ ở dòng thương mại (LG Business) | như trên | tầng mạng |

Luật mạng sinh ra (`luatMang`): `router[]` (MAC, «chặn Internet», T2–T6 / T7–CN, từ–đến), `dns.chan` / `dns.chanNgoaiGio` / `dns.choPhep`,
bản NextDNS (denylist / allowlist), bản Pi-hole (nhóm client theo MAC, domainlist), `hienTai` (Internet đang mở / chặn + lý do theo giờ máy
chủ). Không làm được ở tầng mạng: đếm phút dùng thật, phân biệt app, ngăn đổi MAC (MAC riêng / ngẫu nhiên ⇒ tắt «địa chỉ riêng» cho Wi-Fi
nhà, thiết bị lạ ⇒ báo). Đẩy luật tự động vào router / NextDNS cần API từng hãng + khoá do Ba Mẹ cấp — việc chờ; hiện tại app Ba Mẹ hiện
hướng dẫn một bước.

## 4. Cài MỘT CHẠM + GỠ TỪ XA (yêu cầu cứng)

Không nhập URL / mã tay. Ba Mẹ bấm «Thêm máy» trong app ⇒ máy chủ tạo **gói cài** (`POST /api/m/goi-cai {con, nen}`): token enroll MỘT lần,
có hạn (`goi_cai_gio` = 48 giờ), chỉ lưu băm ⇒ token nhúng sẵn trong tệp tải hoặc QR; trình cài đổi token lấy token máy
(`POST /api/device/ghep-goi`). Xin quyền quản trị MỘT lần.

| OS | Trình cài | Token nhúng ở đâu | Quyền quản trị | Gỡ từ xa |
|---|---|---|---|---|
| Windows | `AiiGrowSetup.exe /silent` (hoặc `msiexec /i AiiGrow.msi /qn GHEP_TOKEN=…`) tự tạo dịch vụ + đăng ký | thẻ trong vùng chữ ký Authenticode (cách trình cài Chrome / Omaha), dự phòng tên tệp | UAC một lần | dịch vụ nhận lệnh `go` ⇒ báo xong ⇒ `msiexec /x /qn` (gỡ dịch vụ, khay, luật AppLocker, chính sách trình duyệt) |
| macOS | `.pkg` (+ hồ sơ MDM tuỳ chọn) | tên tệp `AiiGrow_<token>.pkg` (postinstall đọc `$PACKAGE_PATH`) | mật khẩu quản trị một lần (+ duyệt hồ sơ / Mục nền) | daemon tự gỡ (`launchctl bootout`); MDM `RemoveProfile` |
| Android | QR Device Owner trên màn chào (chạm 6 lần) hoặc APK / Play + QR | `PROVISIONING_ADMIN_EXTRAS_BUNDLE` trong QR | không cần — Device Owner cấp khi cài | DPC báo xong ⇒ `clearDeviceOwnerApp()` (không xoá dữ liệu) ⇒ tự gỡ |
| iPhone / iPad | App Store + quét QR (universal link `/cai/<token>`); hồ sơ MDM khi giám sát | QR / liên kết | Ba Mẹ duyệt Screen Time bằng Apple ID một lần | `revokeAuthorization` (+ MDM `RemoveProfile`); iOS không cho app tự xoá ⇒ hướng dẫn xoá biểu tượng |
| Apple TV | hồ sơ MDM (giám sát) hoặc chỉ tầng mạng | — | — | MDM `RemoveProfile` / xoá luật mạng |
| TV không MDM | hướng dẫn một bước tầng mạng: chọn TV trong danh sách thiết bị router (MAC) | — | quyền quản trị router | xoá luật MAC + nhóm DNS |

Gỡ từ xa (máy chủ xong): chủ gia đình xác thực lại bằng mật khẩu (`POST /api/m/may/:id/go-tu-xa`) ⇒ máy chủ ghi lệnh `go` ⇒ agent lấy lệnh
qua `dong-bo` / `nhip` (`lenh: [{id, loai: "go"}]`) ⇒ `POST /api/device/lenh/:id/xong` ⇒ máy «đã gỡ» (xoá khỏi gia đình, token hết hiệu lực,
ngừng cảnh báo mất nhịp); báo xong lần hai trả `lapLai: true`, không ghi đôi. Vai không phải chủ ⇒ 403; sai mật khẩu ⇒ 401 + nhật ký; máy
nhà khác ⇒ 404.

## 5. Kiểm soát MẠNG — hồ sơ DNS gia đình, router / TV, máy con loại mạng (M4b mạng)

Ý: mọi thiết bị trong nhà đi qua MỘT bộ lọc DNS của gia đình (resolver lọc theo thiết bị, kiểu NextDNS). Máy có agent thì trình cài một
chạm tự cài hồ sơ DNS (gắn theo thiết bị, không cần router); thiết bị không cài được (TV, console) thì Ba Mẹ đặt DNS ở router MỘT lần
hoặc trong phần Mạng của TV. Chỉ cơ chế chính hãng (hồ sơ cấu hình Apple, DNS riêng tư Android, DoH của Windows, cài đặt mạng của router /
TV), minh bạch: hồ sơ hiện rõ tên «AiiGrow — DNS gia đình», gỡ được trong Cài đặt; Ba Mẹ thấy thiết bị nào đang qua bộ lọc.

### 5.1 Thiết bị cài được agent — hồ sơ DNS gắn theo thiết bị

Mỗi thiết bị có một **nhãn** ngắn (`dns_thiet_bi.nhan`) nằm trong địa chỉ resolver ⇒ resolver biết thiết bị nào, áp chính sách của Con.

| OS | Hồ sơ | Máy chủ sinh | Cài |
|---|---|---|---|
| iPhone / iPad / Mac | `.mobileconfig` payload `com.apple.dnsSettings.managed`, `DNSProtocol = HTTPS`, `ServerURL = <DoH>`; `PayloadRemovalDisallowed = false` (gỡ được); UUID ổn định theo thiết bị (cài lại thay thế, không nhân bản) | `GET /api/m/dns/thiet-bi/:id/mobileconfig` (tệp) · `GET /api/device/ho-so-dns` | mở tệp ⇒ Cài đặt › Đã tải hồ sơ › Cài (iOS bắt người dùng xác nhận — không có cách cài lặng lẽ, đúng tinh thần minh bạch) |
| Android | DNS riêng tư (DoT) — hostname `<nhãn>.<gốc resolver>` | `android.privateDns` | máy Device Owner: DPC tự đặt (`setGlobalPrivateDnsModeSpecifiedHost`); máy thường: Cài đặt › Mạng và Internet › DNS riêng tư |
| Windows 11 | DoH: đăng ký IP resolver + mẫu DoH (`Add-DnsClientDohServerAddress … -AllowFallbackToUdp $False -AutoUpgrade $True`, hoặc `netsh dns add encryption …`), đặt DNS của card mạng về IP đó | `windows.powerShell` / `windows.netsh` | trình cài agent-win chạy bằng quyền SYSTEM khi cài (đã xin quyền quản trị một lần) |

Hồ sơ ký số (để iOS hiện «Đã xác minh») cần chứng chỉ ký của AiiLab — việc chờ (CẦN ANH).

### 5.2 Thiết bị không cài được (TV, console) — làm MỘT lần, phủ cả nhà

(a) **Đặt DNS ở router một lần**: dữ liệu dắt tay theo hãng phổ biến ở VN (`GET /api/m/dns/huong-dan`): TP-Link (web + app Tether / Deco),
Viettel, FPT (Hi FPT), VNPT (iGate), Tenda, ASUS — địa chỉ trang quản trị, từng màn, lưu ý (modem nhà mạng có thể khoá mục DNS ⇒ nhờ tổng
đài hoặc đặt trên router riêng phía sau). Ba Mẹ đăng nhập router bằng tài khoản quản trị của chính mình.
**Tự cấu hình router** chỉ khi hãng có API chính thức VÀ Ba Mẹ tự nhập mật khẩu router trong app (dùng một lần, không lưu). AiiGrow không
dò, không đoán, không thử mật khẩu. Hiện chưa hãng nào trong danh sách có API chính thức cho người dùng ⇒ `tuCauHinh: false` hết; mốc này
chỉ có mô tả + giao diện dữ liệu.
(b) **Đổi DNS trong phần Mạng của TV / console**: Samsung (Tizen), LG (webOS), Google TV / Android TV (Sony, TCL, Xiaomi), Apple TV,
PlayStation 5, Xbox, Nintendo Switch — từng màn trong `HUONG_DAN_TV`.

**Chỉ làm 1 lần, phủ cả nhà**: đặt ở router thì mọi thiết bị dùng Wi-Fi nhà đi qua bộ lọc. DNS thường (IP, cổng 53) nhận diện theo IP công
cộng của nhà ⇒ không tách từng TV; muốn tách thì dùng router gán DNS theo thiết bị (vd ASUS DNS Director) hoặc đặt DNS trên chính TV.

### 5.3 «Máy con loại mạng»

TV / console là máy con loại mạng (`dns_thiet_bi.loai = tv | console | khac`, gắn Con): giờ chơi + lọc nội dung thực thi ở TẦNG DNS —
`chinhSachDns`: `chan` (luôn chặn), `giaiTri` (chỉ mở trong lịch), `choPhep` (hệ thống + học, luôn mở), `lichMo` (khung chơi − giờ ngủ),
`chanTatCaNgoaiGio = true` (ngoài lịch chặn mọi tên miền trừ danh sách cho phép), khoá ngay. Resolver xét từng truy vấn bằng `xetTruyVan`.
Báo Ba Mẹ:
- **vượt giờ**: số truy vấn ngoài lịch trong ngày ≥ `dns_vuot_gio_nguong` (20) ⇒ cảnh báo một lần / ngày / thiết bị;
- **không còn đi qua resolver**: thiết bị đã từng có truy vấn mà im lặng quá `dns_mat_truy_van_phut` (180) ⇒ cảnh báo một lần mỗi lần mất
  («nếu thiết bị đang bật, có thể DNS đã bị đổi»); có truy vấn lại ⇒ ghi sự kiện.

### 5.4 Máy chủ (xong, test không cần thiết bị)

- Chính sách DNS theo gia đình / thiết bị, dựng từ chính sách chung (`lib/ho-so-dns.ts`, `lib/dns-gia-dinh.ts`).
- Nhật ký truy vấn TÓM TẮT: chỉ tên miền + số lần (+ số lần bị chặn, ngoài giờ) theo ngày (`dns_nhat_ky`); không lưu URL, nội dung, giờ
  từng truy vấn, không lưu IP.
- Lớp **nhà cung cấp DNS** có adapter:
  - **tự host** (mặc định): resolver nhẹ của AiiGrow kéo `GET /api/dns/chinh-sach/:nhan`, gửi `POST /api/dns/nhat-ky` (kiểu webhook),
    Bearer = bí mật chung `AIIGROW_DNS_BI_MAT`; chưa đặt ⇒ 503. Địa chỉ: `AIIGROW_DNS_GOC`, `AIIGROW_DNS_IPV4`;
  - **NextDNS** (API công khai): hồ sơ do Ba Mẹ tự tạo trong tài khoản của mình, Ba Mẹ nhập mã hồ sơ; DoH `https://dns.nextdns.io/<hồ sơ>/<tên>`,
    DoT `<tên>-<hồ sơ>.dns.nextdns.io`; đẩy denylist / allowlist qua `api.nextdns.io` với `X-Api-Key` lấy từ biến môi trường. **Không có
    khoá ⇒ chế độ giả** (trả danh sách yêu cầu sẽ gửi, không gửi gì). AiiGrow KHÔNG đăng ký tài khoản / tạo khoá NextDNS.

### 5.5 Giới hạn của DNS (nói rõ với Ba Mẹ trong app)

- Chỉ lọc được **tên miền**; không thấy, không lọc nội dung **bên trong app** hay trang (một video, một kênh).
- Không đếm phút dùng thật ⇒ giờ chơi TV / console = chặn tên miền ngoài lịch.
- App dùng DNS riêng / DoH riêng hoặc kết nối thẳng IP thì không qua bộ lọc.
- **TV / console đổi DNS tay** (hoặc đặt lại gốc, dùng 4G phát từ điện thoại) **là vượt được** ⇒ AiiGrow chỉ phát hiện «mất truy vấn» và báo
  Ba Mẹ, không ngăn được.

Nguồn thêm: Apple DNS Settings payload — https://developer.apple.com/documentation/devicemanagement/dnssettings ·
Android DNS riêng tư / `setGlobalPrivateDnsModeSpecifiedHost` — https://developer.android.com/reference/android/app/admin/DevicePolicyManager ·
Windows DoH — https://learn.microsoft.com/en-us/windows-server/networking/dns/doh-client-support ·
NextDNS API — https://nextdns.github.io/api/

## 6. Trạng thái bản thử (21/10) và việc chờ

### 6.1 Đã chạy được

| Phần | Trạng thái |
|---|---|
| Web Ba Mẹ / Con / quầy / admin | https://aiigrow.aiilab.vn (`/` màn chào · đăng nhập, `/tre`, `/tai`, `/quay`, `/admin`; link cũ `/app/*` chuyển 308). API 0,4–1,2 giây (function iad1 cạnh DB). Luồng chính đầu-cuối đạt trên production |
| Agent Windows (bản thử) | Gói cài: https://frsxuiwqryvwsq70.public.blob.vercel-storage.com/tai/AiiGrow-Windows-thu.zip (chưa ký số ⇒ «More info → Run anyway»). Ghép bằng mã 6 số lấy trong app (Hồ sơ & máy của Con → «Ghép thêm máy»). **Mặc định GIÁM SÁT** (chỉ ghi log việc sẽ chặn). Chặn thật: `AiiGrow.Setup.exe --che-do=chan`; quay lại `--che-do=giam-sat`; gỡ `--uninstall` hoặc gỡ từ xa |
| Log agent | `C:\ProgramData\AiiGrow\logs\agent-yyyyMMdd.log` + `POST /api/device/log`; đọc: `GET /api/m/may/:id/log` (Ba Mẹ), `GET /api/admin/may/:id/log` (Admin) |
| Máy chủ: chính sách chung, bộ chuyển đổi 9 nền tảng, tuân thủ, DNS gia đình | Có test, không cần thiết bị |

### 6.2 Chờ Thanh / chờ quyết (không chặn bản thử)

- **Windows**: nghiệm thu chặn thật trên máy Con (tài khoản Standard) — Thanh chạy ở chế độ giám sát trước, đọc log, rồi mới bật `chan`.
  Màn app Ba Mẹ cho gỡ từ xa / gói cài một chạm / mở khẩn cấp, mã khẩn cấp offline, nút đổi chế độ trên khay: **chờ người viết tay**
  (agent tự động dừng ở các phần này theo bộ lọc an toàn; API máy chủ đã có). Ký số trình cài: chờ chứng chỉ ký code của AiiLab.
- **AiiRob**: webhook `/api/aiirob` sẵn sàng; production trả 503 tới khi đặt `AIIROB_WEBHOOK_SECRET` và chốt AiiRob gửi định danh Con thế nào.
- **Quầy / admin trên production**: tạo tài khoản bằng `pnpm tao-tai-khoan` (cần DATABASE_URL production — master/chỉ huy).

### 6.3 Gọi API thật từng OS (việc chờ thiết bị)

- Windows: AppLocker, chính sách trình duyệt, `net user /times`, cài im lặng + gỡ từ xa — việc chờ máy Windows thử tài khoản Standard (agent-win).
- Android: DPC Device Owner — việc chờ điện thoại khôi phục gốc; băm chữ ký APK cho QR; FCM cho lệnh tức thời — việc chờ dự án Firebase.
- iOS / macOS: xin Apple entitlement Family Controls; app iOS + agent macOS — việc chờ Mac / Xcode + iPhone thật; MDM cần máy chủ MDM + chứng chỉ APNs.
- TV / router: đẩy luật tự động qua API router / NextDNS — việc chờ thiết bị + khoá API do Ba Mẹ cấp.
- DNS gia đình: dựng resolver tự host (DoH / DoT + cổng 53, đọc `/api/dns/chinh-sach`, gửi `/api/dns/nhat-ky`), tên miền + IP resolver, chứng chỉ ký .mobileconfig — việc chờ hạ tầng (CẦN ANH).

## 7. Nguồn tham khảo (tài liệu công khai)

- Intune — tổng quan tuân thủ: https://learn.microsoft.com/en-us/intune/device-security/compliance/overview
- Intune — hành động khi không tuân thủ: https://learn.microsoft.com/en-us/intune/device-security/compliance/configure-noncompliance-actions
- Workspace ONE UEM — luật và hành động tuân thủ (Device Last Seen, Compromised): https://docs.vmware.com/en/VMware-Workspace-ONE-UEM/2302/UEM_Managing_Devices/GUID-CompliancePolicyRulesAndActions.html
- Jamf — theo dõi máy không tuân thủ: https://docs.jamf.com/technical-papers/jamf-pro/microsoft-endpoint-manager/10.25.0/Monitoring_for_Non-Compliant_Devices.html
- AppLocker — yêu cầu (mọi phiên bản sau KB5024351): https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/applocker/requirements-to-use-applocker
- Windows Services: https://learn.microsoft.com/en-us/windows/win32/services/services
- Chính sách Microsoft Edge (URLBlocklist / URLAllowlist): https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies
- Chính sách Chrome Enterprise: https://chromeenterprise.google/policies/
- Android DevicePolicyManager: https://developer.android.com/reference/android/app/admin/DevicePolicyManager
- Android — xây DPC: https://developer.android.com/work/dpc/build-dpc
- Android Management API — cài đặt / QR enrollment: https://developers.google.com/android/management/provision-device
- Android UsageStatsManager: https://developer.android.com/reference/android/app/usage/UsageStatsManager
- Samsung Knox — tạo QR Device Owner (tham số QR): https://docs.samsungknox.com/dev/knox-sdk/kbas/how-to-create-a-qr-code-to-enroll-a-device-into-android-enterprise-device-owner-do-mode/
- Apple FamilyControls: https://developer.apple.com/documentation/familycontrols
- Apple ManagedSettings (ApplicationSettings: denyAppInstallation / denyAppRemoval): https://developer.apple.com/documentation/managedsettings/applicationsettings
- Apple DeviceActivity: https://developer.apple.com/documentation/deviceactivity
- Apple Device Management (MDM): https://developer.apple.com/documentation/devicemanagement
- Apple Platform Deployment: https://support.apple.com/guide/deployment/welcome/web
- Apple TV — Giới hạn nội dung (tvOS): https://support.apple.com/guide/tv/atvb9d6ff281/tvos
- Bài báo 9/2026 về giới hạn quản lý của Apple TV: https://www.iphoneincanada.ca/2026/09/29/apples-new-parental-controls-still-leave-apple-tv-behind/
- Omnissa — quản lý tvOS: https://docs.omnissa.com/tvOS-DeviceManagement-V2406/IntroductiontoAppletvOS
- Google TV — hồ sơ trẻ em / Family Link: https://9to5google.com/2021/03/08/google-tv-kids-profile-chromecast/ · https://families.google/familylink/
- Samsung Knox — bảng khả dụng theo OS: https://docs.samsungknox.com/admin/knox-guard/kbas/knox-solution-availability-by-samsung-os-type/
- Microsoft Family Safety: https://www.microsoft.com/en-us/microsoft-365/family-safety
- NextDNS: https://nextdns.io · Pi-hole: https://docs.pi-hole.net/
