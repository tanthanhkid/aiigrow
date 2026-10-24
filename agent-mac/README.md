# AiiGrow cho macOS

Thiết kế: `THIET-KE.md`. Gói cài: `goi/`.

## Build gói cài

```bash
cd agent-mac/goi
BAN=0.1.0 ./build-pkg.sh        # ra agent-mac/ra/AiiGrow-0.1.0.pkg (universal arm64 + x86_64)
ARCH=native BAN=0.1.0 ./build-pkg.sh   # chỉ kiến trúc máy này (nhanh hơn)
```

Gói chứa `/Applications/AiiGrow.app` (tray `AiiGrowTray` là CFBundleExecutable, `aiigrow-daemon` nằm cùng `Contents/MacOS`) và hai plist
trong `Contents/Resources`; `postinstall` chép chúng ra `/Library/LaunchDaemons` + `/Library/LaunchAgents`.
Kiểm gói không cần cài: `pkgutil --payload-files ra/AiiGrow-<BAN>.pkg`, `pkgutil --expand ra/AiiGrow-<BAN>.pkg /tmp/x`.

## Cài, cập nhật đè, gỡ

- **Cài**: Ba Mẹ mở `.pkg`, nhập mật khẩu quản trị một lần. `postinstall` tạo `/Library/Application Support/AiiGrow` (root 0700) và
  `/Library/Logs/AiiGrow`, nạp daemon (`launchctl bootstrap system`) và tray vào phiên GUI đang đăng nhập. Sau đó tray ở phiên admin hiện «Ghép máy».
- **Cập nhật đè**: chạy `.pkg` bản mới. `preinstall` dừng daemon + tray cũ; `config.json` (token, uid Con) không đụng nên không phải ghép lại.
- **Gỡ**: `sudo bash go-cai.sh` (gỡ daemon, tray, app, thư mục, khối `/etc/hosts` có mốc `# AiiGrow`, tệp Managed Preferences có chữ `AiiGrow`).
  Quy ước cho daemon: khối hosts mở bằng dòng `# AiiGrow ...` và đóng bằng dòng `# AiiGrow ... END`; tệp Managed Preferences do AiiGrow đặt phải chứa chữ `AiiGrow` (vd. một khoá đánh dấu).

## Ký và notarize (chưa làm — chưa có Developer ID)

Hiện ký ad-hoc (`codesign -s -`): chạy được trên máy cài, nhưng Gatekeeper cảnh báo khi mở gói tải về. Khi có chứng chỉ:

1. `codesign --force --options runtime --timestamp -s "Developer ID Application: <Tên> (<TEAMID>)"` cho `aiigrow-daemon` rồi cho `AiiGrow.app`.
2. `productbuild --sign "Developer ID Installer: <Tên> (<TEAMID>)" ...` (thêm vào lệnh productbuild cuối của `build-pkg.sh`).
3. `xcrun notarytool submit ra/AiiGrow-<BAN>.pkg --keychain-profile <hồ-sơ> --wait`, rồi `xcrun stapler staple ra/AiiGrow-<BAN>.pkg`.

Không cài thử trên máy phát triển (luật `THIET-KE.md` mục 6): chỉ kiểm cú pháp (`bash -n`) và build gói.
