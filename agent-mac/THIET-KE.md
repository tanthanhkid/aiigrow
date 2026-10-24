# AiiGrow cho macOS — thiết kế (24/10/2026)

Thanh 24/10: *"làm cho máy Mac luôn đi"*. Cùng tinh thần bản Windows (`agent-win/README.md`): chỉ cơ chế chính thức của macOS,
không ẩn mình, Con luôn biết máy được quản lý. Server coi máy này là `platform = "mac"`.

## 1. Thành phần (Swift package này)
| Phần | Chạy ở | Việc |
|---|---|---|
| `AiiGrowCore` (thư viện) | — | `IPC.swift` (chỗ nối, đã chốt), API client, cấu hình, Policy, đếm giờ |
| `aiigrow-daemon` | LaunchDaemon root `vn.aiilab.aiigrow.daemon`, KeepAlive | sync server, áp chính sách: đóng app ngoài danh sách / app bị chặn trong phiên Con, chặn web, khoá phiên, đếm phút; socket IPC |
| `AiiGrowTray` | LaunchAgent `vn.aiilab.aiigrow.tray` (Aqua, mọi phiên) — app `AiiGrow.app` LSUIElement | menu bar: giờ còn lại, xin thêm giờ, màn chặn/hết giờ/đếm ngược toàn màn hình; báo app tiền cảnh; phiên admin chưa ghép ⇒ cửa sổ Ghép máy |
| `goi/` | build máy Mac | `build-pkg.sh` ⇒ `ra/AiiGrow-<bản>.pkg`: dựng `AiiGrow.app` (tray + daemon trong Contents/MacOS), plist, postinstall nạp daemon + tray, `go-cai.sh` |

## 2. Đường dẫn — `DuongDan` trong `IPC.swift`

## 3. Daemon ⇄ tray
Unix socket, một dòng JSON yêu cầu (`YeuCauTray`) ⇒ một dòng JSON trả lời (`TraLoi`). Kiểm `getpeereid`:
lệnh của Con chỉ nhận từ uid Con; `ghep` chỉ từ uid nhóm admin và khi chưa ghép. Tray hỏi `trangThai` mỗi 5 giây.

## 4. Ghép máy
Ba Mẹ cài `.pkg` (mật khẩu quản trị một lần) ⇒ tray trong phiên admin thấy `daGhep=false` ⇒ cửa sổ «Ghép máy»: chọn tài khoản Con
(liệt kê user thường trên máy) + mã 6 số ⇒ `ghep` ⇒ daemon gọi server pair (platform `mac`), lưu token, **hạ tài khoản Con về Standard**
nếu đang là admin (bắt buộc còn một admin khác), lưu uid Con.

## 5. Áp chính sách (daemon)
- Đếm phút: chỉ khi Con là console user và màn không khoá; app theo báo của tray, tray tắt thì tính «Không rõ».
- App: `hoc` ⇒ chỉ app trong `allowedApps` + app hệ thống; app bị chặn ⇒ đóng (SIGTERM, 3 giây sau SIGKILL) tiến trình của uid Con.
- Web: chính sách trình duyệt (Chrome/Edge/Brave/Cốc Cốc `URLBlocklist`/`URLAllowlist`) + Safari: khối `/etc/hosts` có mốc `# AiiGrow`.
- Khoá: tray hiện màn khoá toàn màn hình + đếm ngược, hết đếm ngược daemon khoá/đăng xuất phiên Con.
- Mất mạng: chạy theo Policy nhớ, giờ còn lại tự trừ.

## 6. Luật khi phát triển trên máy Thanh
KHÔNG sudo, KHÔNG nạp daemon/LaunchAgent, KHÔNG kill tiến trình thật, KHÔNG sửa `/etc/hosts` hay Managed Preferences. Mọi tác động hệ thống
đi qua protocol để test bằng bản giả; daemon có cờ `--thu` (chỉ in việc sẽ làm). Build riêng: `swift build --scratch-path .build-<tên> -j 2`.
