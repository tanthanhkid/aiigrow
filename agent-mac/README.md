# AiiGrow cho macOS

Thiết kế: `THIET-KE.md`. Gói cài: `goi/`.

## Build gói cài

```bash
cd agent-mac/goi
BAN=0.1.1 ./build-pkg.sh        # ra agent-mac/ra/AiiGrow-0.1.1.pkg (universal arm64 + x86_64)
ARCH=native BAN=0.1.1 ./build-pkg.sh   # chỉ kiến trúc máy này (nhanh hơn)
```

Gói chứa `/Applications/AiiGrow.app` (tray `AiiGrowTray` là CFBundleExecutable, `aiigrow-daemon` nằm cùng `Contents/MacOS`) và hai plist
trong `Contents/Resources`; `postinstall` chép chúng ra `/Library/LaunchDaemons` + `/Library/LaunchAgents`.
Kiểm gói không cần cài: `pkgutil --payload-files ra/AiiGrow-<BAN>.pkg`, `pkgutil --expand ra/AiiGrow-<BAN>.pkg /tmp/x`.

## Cài, cập nhật đè, gỡ

- **Cài**: Ba Mẹ mở `.pkg`, nhập mật khẩu quản trị một lần. `postinstall` tạo `/Library/Application Support/AiiGrow` (root 0700) và
  `/Library/Logs/AiiGrow`, nạp daemon (`launchctl bootstrap system`) và tray vào phiên GUI đang đăng nhập. Sau đó tray ở phiên admin hiện «Ghép máy».
- **Tự cập nhật** (từ bản 0.1.1; bản 0.1.0 phải cài tay một lần): xem mục dưới.
- **Cập nhật đè**: chạy `.pkg` bản mới. `preinstall` dừng daemon + tray cũ; `config.json` (token, uid Con) không đụng nên không phải ghép lại.
- **Gỡ**: `sudo bash go-cai.sh` (gỡ daemon, tray, app, thư mục, khối `/etc/hosts` có mốc `# AiiGrow`, tệp Managed Preferences có chữ `AiiGrow`).
  Quy ước cho daemon: khối hosts mở bằng dòng `# AiiGrow ...` và đóng bằng dòng `# AiiGrow ... END`; tệp Managed Preferences do AiiGrow đặt phải chứa chữ `AiiGrow` (vd. một khoá đánh dấu).

## Tự cập nhật

Daemon hỏi `GET /api/agent/ban-moi?platform=mac` lúc khởi động (+90 giây) rồi mỗi 6 giờ, ở Task riêng (không chặn vòng áp/đồng bộ). Bản máy chủ > bản đang chạy
(so theo số x.y.z) thì: tải `.pkg` vào `/Library/Application Support/AiiGrow/cap-nhat` (root 0700), kiểm sha256 theo manifest, `pkgutil --check-signature`
(phải là «Developer ID Installer: TAN THANH TRAN (ADUL7HT969)») + `spctl -a -t install`, rồi cài đè bằng `installer` chạy như job launchd `vn.aiilab.aiigrow.capnhat`
(log `/Library/Logs/AiiGrow/capnhat.log`). Sai bước nào là xoá gói, ghi log, không cài. Không cài khi đang gỡ từ xa. Ghép máy được giữ (`config.json` không đụng).
Nút: menu tray của phiên Ba Mẹ có «Kiểm tra cập nhật» (Con không thấy, daemon cũng từ chối uid Con). Chi tiết: `THIET-KE.md` mục 7.

## Ký và notarize (chưa làm — chưa có Developer ID)

Hiện ký ad-hoc (`codesign -s -`): chạy được trên máy cài, nhưng Gatekeeper cảnh báo khi mở gói tải về. Khi có chứng chỉ:

1. `codesign --force --options runtime --timestamp -s "Developer ID Application: <Tên> (<TEAMID>)"` cho `aiigrow-daemon` rồi cho `AiiGrow.app`.
2. `productbuild --sign "Developer ID Installer: <Tên> (<TEAMID>)" ...` (thêm vào lệnh productbuild cuối của `build-pkg.sh`).
3. `xcrun notarytool submit ra/AiiGrow-<BAN>.pkg --keychain-profile <hồ-sơ> --wait`, rồi `xcrun stapler staple ra/AiiGrow-<BAN>.pkg`.

Không cài thử trên máy phát triển (luật `THIET-KE.md` mục 6): chỉ kiểm cú pháp (`bash -n`) và build gói.
