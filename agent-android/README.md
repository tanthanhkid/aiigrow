# AiiGrow Con — tác tử máy Con cho Android (Kotlin)

Gói `vn.aiilab.aiigrow.con` (khác app Ba Mẹ `vn.aiilab.aiigrow` ở `mobile/`). Máy chủ coi máy là `platform = "android"`.
Tinh thần như `agent-mac/THIET-KE.md`: chỉ dùng cơ chế chính thức của Android, không ẩn mình — thông báo thường trực
**«AiiGrow đang bật — Ba Mẹ quản lý máy này»** luôn hiện, Cài đặt ghi rõ «Thiết bị do tổ chức quản lý» / Trợ năng AiiGrow đang bật.

## Cấu trúc
| Tệp | Việc |
|---|---|
| `logic/ChinhSach.kt` | đọc phản hồi `POST /api/device/nhip` (ChinhSachChung + lenh + grantEndsAt) — thuần JVM |
| `logic/QuyetDinh.kt` | quyết trạng thái (bình thường / thêm giờ / hết giờ / ngoài khung / không tuân thủ / giờ ngủ / khoá ngay), gói phải chặn, phút còn, đếm ngược 60 giây |
| `logic/DemPhut.kt` | đếm phút tiền cảnh theo app từ sự kiện UsageStats; thân ghép / nhịp / xin thêm giờ |
| `DichVuNhip` | dịch vụ tiền cảnh: vòng 5 giây, gọi máy chủ mỗi 60 giây, đo → quyết → thực thi, thông báo thường trực, mở màn khoá |
| `NenTang.kt` | `UngDung` (hẹn WorkManager 15 phút), `ViecNhip`, `KhoiDong` (BOOT_COMPLETED), `ManCaiDat` (cài QR Android 10+) |
| `CapNhatApp.kt` · `logic/CapNhat.kt` | tự cập nhật (từ 0.2.2): manifest `ban-moi?platform=android`, tải + kiểm sha256 + chữ ký, PackageInstaller (mục «Tự cập nhật») |
| `QuanTri` | DeviceAdminReceiver `vn.aiilab.aiigrow.con/vn.aiilab.aiigrow.maycon.QuanTri` |
| `ThucThi` | Device Owner: `setPackagesSuspended`, `setLockTaskPackages`, hạn chế người dùng, Chrome `URLBlocklist`, DNS riêng tư, `lockNow`; gỡ từ xa |
| `TroNang` | AccessibilityService (đường không reset): app bị chặn lên tiền cảnh ⇒ về Home + phủ màn chặn; khoá cả máy ⇒ phủ màn khoá |
| `ManChinh` / `ManKhoa` | màn Con (còn phút, xin 30/60/120 + lời nhắn, đã dùng gì, ghép mã 6 số, cấp quyền) / màn khoá + đếm ngược |
| `Clay.kt` | ngôn ngữ «Clay gương» (`docs/THIET-KE-CLAY.md`) cho View: `ClayDrawable` (khối bo lớn, bóng kép, men gương, vệt men lướt), lò xo nhấn / vào lần lượt / ổ khoá đóng sập; tắt hoạt ảnh trong Trợ năng ⇒ không nảy |
| `res/drawable-nodpi/fl_*.png` | icon Fluent Emoji 3D (Microsoft, MIT — `app/src/main/assets/FLUENT-EMOJI-LICENSE.txt`, đóng gói vào APK) |
| `thu/` | chính sách giả cho chế độ thử cục bộ · `chup/` ảnh chụp emulator (Clay gương, chụp lại 25/10) |

## Hai đường cài (chọn lúc ghép)
**1. Device Owner bằng QR — mạnh nhất (máy mới hoặc khôi phục gốc).**
Ba Mẹ mở app Ba Mẹ › Thêm máy › Android › hiện QR (`huongDanCai("android")` — xem CAN-SERVER.md mục 1, phải đổi component).
Trên máy Con vừa khôi phục gốc: màn chào chạm 6 lần ⇒ quét QR ⇒ máy tự tải AiiGrow Con, thành Device Owner, tự ghép bằng token trong QR.
Có: app bị chặn hiện xám «Đã tạm dừng» (không mở được, không ẩn), màn khoá dạng lock task, chặn thêm người dùng / Safe Mode / đổi ngày giờ /
cài APK lạ, Chrome `URLBlocklist`, DNS riêng tư gia đình (`setGlobalPrivateDnsModeSpecifiedHost`), app mới cài ⇒ tạm dừng tới khi Ba Mẹ xếp.
Sau khi cài: bật «Truy cập dữ liệu sử dụng» cho AiiGrow Con (Android không cho Device Owner tự cấp quyền này).

**2. Không cần khôi phục gốc (máy đang dùng).**
Cài APK ⇒ mở AiiGrow Con ⇒ nhập mã 6 số Ba Mẹ đưa ⇒ bật 3 quyền ngay trên màn chính: Quản trị thiết bị (khoá màn hình),
Truy cập dữ liệu sử dụng (đếm phút), Trợ năng «AiiGrow — màn chặn» (phủ màn chặn khi app bị chặn mở lên). Yếu hơn: app bị chặn vẫn mở được
một khoảnh khắc trước khi bị phủ; Con có thể tắt Trợ năng (nhịp báo `troNang=false` cho Ba Mẹ); không lọc web, không chặn đổi giờ / Safe Mode.

## Tự cập nhật (từ bản 0.2.2)
**Máy đang ở 0.2.0 / 0.2.1 chưa có mã tự cập nhật ⇒ phải cài tay MỘT lần lên 0.2.2** (mở `https://aiigrow.aiilab.vn/tai/aiigrow-con.apk` trên máy Con,
cài đè — cùng khoá ký nên giữ nguyên ghép / Device Owner / quyền). Từ 0.2.2 trở đi app tự lên bản mới:
- Hỏi `GET <máy chủ>/api/agent/ban-moi?platform=android` (server/lib/ban-agent.ts › `BAN_CON_ANDROID`: version, versionCode, url, sha256)
  mỗi lần tiến trình khởi động / mở app + mỗi 6 giờ (WorkManager, cần mạng). Chỉ cập nhật khi `versionCode` manifest > bản đang chạy.
- Tải qua https: chặng đầu phải cùng gốc với máy chủ đã ghép (`/tai/AiiGrow-Con-<bản>.apk`), các chặng chuyển hướng chỉ tới
  `github.com/tanthanhkid/aiigrow-tai/releases/download/…` hoặc `*.githubusercontent.com`; ≤ 200 MB.
- Kiểm sha256 = manifest, đúng gói `vn.aiilab.aiigrow.con`, versionCode = manifest, chữ ký APK chứa mọi chứng chỉ đang ký app (xoay khoá v3 vẫn qua).
  Sai bất kỳ bước nào ⇒ xoá tệp, không cài, lượt sau thử lại.
- Cài bằng PackageInstaller: **Device Owner ⇒ im lặng** (đã thử trên emulator API 35: 0.2.2 → bản cao hơn tự cài, Chrome vẫn tạm dừng, dịch vụ nhịp
  chạy lại, vẫn Device Owner). **Không phải Device Owner** ⇒ Android hiện hộp xác nhận + thông báo «Có bản AiiGrow mới»; chưa bật «Cho phép từ nguồn này»
  cho AiiGrow thì thông báo + thẻ trên màn chính dẫn Ba Mẹ vào đúng chỗ bật (một lần).
- Đang khoá / đếm ngược ⇒ hoãn 30 phút (cài đè làm app khởi động lại). App tạm dừng do hệ thống giữ qua lần cập nhật; `MY_PACKAGE_REPLACED` bật lại dịch vụ.
- Thử với máy chủ cục bộ: bản debug cho http tới `10.0.2.2` / `localhost` (src/debug, `mang_thu.xml`); đặt `mayChu` trong
  `shared_prefs/aiigrow_con.xml` (run-as, giết tiến trình trong cùng lệnh — Device Owner không `force-stop` được).

## Android không làm được
- Chặn khôi phục cài đặt gốc (máy biến mất ⇒ «ngoài vòng kiểm soát» + báo Ba Mẹ).
- Nhịp mỗi phút khi máy ngủ sâu (Doze): dịch vụ tiền cảnh + WorkManager 15 phút là tối đa không cần đẩy FCM.
- Device Owner không tự cấp «Truy cập dữ liệu sử dụng» và không tự bật Trợ năng.
- Lọc web chỉ trong Chrome (cấu hình quản lý); trình duyệt khác = app chưa xếp ⇒ tạm dừng. Chưa kiểm Chrome có áp `URLBlocklist` (đặt bằng `setApplicationRestrictions`, mảng chuỗi) — cần mở trang bị chặn trên máy thật.
- Không tạm dừng được app bắt buộc của hệ thống (Cài đặt, Điện thoại, trình khởi chạy) — `setPackagesSuspended` trả về gói lỗi.
- Phiên chơi bằng điểm (`phien/xet|mo|nhip`) chưa làm ở bản 0.1: giải trí mở trong khung giờ tới trần phút/ngày (+ phút Ba Mẹ thêm).

## Build
```
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
./gradlew testDebugUnitTest assembleDebug --max-workers=2 && ./gradlew --stop
# APK: app/build/outputs/apk/debug/app-debug.apk (ký debug)
```

### Bản phát hành (ký release)
Khoá phát hành DUY NHẤT: `~/.aiigrow-android/aiigrow-con-release.jks` (alias `aiigrow-con`, RSA 4096, hạn tới 2054; tạo 25/10/2026 với sự đồng ý của Thanh).
Mật khẩu + đường dẫn ở `~/.aiigrow-android/ky.env` (chmod 600) — không commit, không in ra. Mất khoá này thì máy đã cài KHÔNG cập nhật đè được (Device Owner phải khôi phục gốc) ⇒ giữ bản sao an toàn.
SHA-256 chứng chỉ: `ED:65:BC:BD:31:E0:D5:5B:B4:72:58:A4:FC:E4:26:07:48:15:AF:16:FD:AE:58:FE:52:4B:BE:B6:AF:09:C5:93`.
```
set -a; . ~/.aiigrow-android/ky.env; set +a     # AIIGROW_CON_KEYSTORE, _KEYSTORE_PASSWORD, _KEY_ALIAS, _KEY_PASSWORD
./gradlew assembleRelease --max-workers=2 && ./gradlew --stop
# APK: app/build/outputs/apk/release/app-release.apk — thiếu tệp khoá hoặc mật khẩu thì assembleRelease/bundleRelease DỪNG (không ra gói chưa ký) ⇒ máy không có khoá chạy `assembleDebug`/`testDebugUnitTest`, đừng chạy `./gradlew build`
```
Phát hành: tăng `versionCode`/`versionName` trong `app/build.gradle.kts` → `gh release create con-android-<bản> -R tanthanhkid/aiigrow-tai` kèm tệp `AiiGrow-Con-android.apk`
→ tải lại tệp từ Release, `shasum -a 256` → điền `BAN_CON_ANDROID` (version, versionCode, url `/tai/AiiGrow-Con-<bản>.apk`, sha256) trong `server/lib/ban-agent.ts`
→ sửa chuyển hướng `/tai/aiigrow-con.apk` trong `server/next.config.ts` sang release đó (test `ban-agent.test.ts` bắt hai chỗ phải cùng bản).
Gradle 8.10.2 · AGP 8.7.3 · Kotlin 2.0.21 · minSdk 26 · targetSdk 35. Phụ thuộc: core-ktx, work-runtime-ktx.

## Thử trên emulator (không gọi máy chủ)
```
emulator -avd aiigrow-con -no-window -no-audio -no-boot-anim -memory 2048 &
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell dpm set-device-owner vn.aiilab.aiigrow.con/vn.aiilab.aiigrow.maycon.QuanTri
adb shell appops set vn.aiilab.aiigrow.con GET_USAGE_STATS allow
# chế độ thử: bản debug đọc chính sách giả từ files/thu-chinh-sach.json (run-as), không ghép / không nhịp máy chủ
adb shell "run-as vn.aiilab.aiigrow.con sh -c 'cat > files/thu-chinh-sach.json'" < thu/chinh-sach-binh-thuong.json
adb shell am start -n vn.aiilab.aiigrow.con/vn.aiilab.aiigrow.maycon.ManChinh
adb shell pm list packages --suspended        # gói trong "chan" phải có ở đây
adb shell "run-as vn.aiilab.aiigrow.con sh -c 'cat > files/thu-chinh-sach.json'" < thu/chinh-sach-khoa-ngay.json   # màn khoá + đếm ngược
adb emu kill
```
Lời xin thêm giờ ở chế độ thử ghi vào `files/thu-yeu-cau.jsonl`. Thêm `"grantEndsAt"` / `"privateDns"` ở gốc tệp thử để thử thêm giờ / DNS.

## Kết quả thử 24/10 (emulator API 35, Device Owner)
- 16 unit test JVM đạt; `assembleDebug` đạt.
- Dịch vụ tiền cảnh chạy (`systemExempted`), thông báo «AiiGrow đang bật — Ba Mẹ quản lý máy này».
- Chặn `com.android.chrome` ⇒ `suspended=true`; dùng YouTube 1 phút ⇒ màn chính còn 89/90 phút.
- Khoá ngay ⇒ màn khoá «Khoá sau 0:59» (`chup/man-khoa-dem-nguoc.png`) ⇒ hết đếm ngược: YouTube tạm dừng, `lockNow`, lock task LOCKED (`chup/man-khoa.png`).
- `grantEndsAt` +30 phút ⇒ thoát lock task, YouTube mở, Chrome vẫn chặn, «Còn 30 phút».
- DNS riêng tư `dns.google` ⇒ `private_dns_mode=hostname`.
- CHƯA thử: đường không reset (Trợ năng + màn phủ), ghép thật với máy chủ, cài bằng QR, lệnh gỡ.
