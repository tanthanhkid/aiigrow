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

### 3b. App «AiiGrow của Con» (ngang agent-win AppForm, 25/10/2026)
- Menu (phiên Con, đã ghép) «Mở AiiGrow của Con…» ⇒ cửa sổ 4 mục Hôm nay · Nhiệm vụ · Phần quà & điểm · Tin nhắn (`AppConViews.swift`, `AppConModel.swift`); nộp bài (ảnh nén ≤ 300 KB), chơi bằng điểm, màn «… chưa được mở», bảng tin mới (hỏi `hoc-vien/tin` mỗi 30 giây; nhiệm vụ mới ⇒ tự bật mục Nhiệm vụ theo `BatNhiemVu`).
- IPC: `hocVien(method, path, than)` ⇒ `.duLieu(json)` — daemon chỉ chuyển đường trong `HocVienPaths` tới `api/device/hoc-vien/*` bằng token máy (tray không giữ token). `choi(muc)` (phien/xet → phien/mo) / `choiThu(muc)` (phien/xet, nhớ 60/15 giây) ⇒ `.choi(trangThai, phut, chu)`; chỉ mục trong `Policy.playChoices`. Cả ba chỉ nhận từ uid Con.
- Nhịp phiên chơi: Policy có `playSessionId` (máy chủ chỉ gửi cho máy sở hữu phiên) ⇒ daemon gửi `phien/nhip {id, dangDung}` 30 giây/lần (`vongNhipChoi`, Task riêng); «ket_thuc» ⇒ đồng bộ ngay.
- `TrangThai` thêm (chỉ cho phiên Con): `dsChoi`, `chanSeq/chanApp/chanTen/chanLyDo` (app vừa bị đóng — tray hiện màn chặn khi `chanSeq` tăng). Số điểm CHỈ có trong dữ liệu `hocVien` (như Windows); menu / màn khoá vẫn không hiện điểm.

### 3c. Ngang các nền (BANG-TINH-NANG-OS mục 5, 25/10/2026)
- Mã mở offline (`MaOffline.swift`, TOTP như server/lib/ma-offline.ts): IPC `maOffline(ma)` từ uid Con; sai 5 lần/10 phút ⇒ chờ; một mã một lượt; có mạng lại ⇒ kết thúc. Màn khoá hiện ô nhập khi `TrangThai.nhapMaOffline`.
- Log + sự kiện (`NhatKyMay.swift`): mọi `ghiLog` vào bộ đệm, 5 phút gửi `api/device/log`; sự kiện (chan_app, mo/sai/het_ma_offline) lưu đĩa, gửi `su-kien` mã một lần.
- Lịch sử web (`LichSuWeb.swift`): Chromium `History` + Safari `History.db` (Safari cần Full Disk Access cho daemon, thiếu thì bỏ qua) ⇒ tổng theo (ngày, tên miền) ⇒ `web/lich-su`.
- Safari ở «chỉ cho phép» (không phải giờ học) bị đóng — hosts chỉ chặn được danh sách đen.
- Ghép một chạm: postinstall lấy token từ tên `AiiGrow_<token>.pkg` ⇒ `goi-cai-token` (root 0600) ⇒ cửa sổ Ghép chỉ hỏi tài khoản Con (`ghep-goi`); token hỏng ⇒ quay về mã 6 số.
- Hồ sơ DNS gia đình: menu Ba Mẹ «Cài hồ sơ DNS gia đình…» ⇒ IPC `hoSoDns` ⇒ lưu .mobileconfig vào Tải về và mở.
- Tray: icon thanh menu = Rob; Hôm nay theo app (`homNayTheoApp`); «Ba Mẹ dùng máy» (khoá màn hình); «Hoặc đổi điểm lấy giờ chơi» trong Xin thêm giờ; tin mới qua UNUserNotification (trong AiiGrow.app).

## 4. Ghép máy
Ba Mẹ cài `.pkg` (mật khẩu quản trị một lần) ⇒ tray trong phiên admin thấy `daGhep=false` ⇒ cửa sổ «Ghép máy»: chọn tài khoản Con
(liệt kê user thường trên máy) + mã 6 số ⇒ `ghep` ⇒ daemon gọi server pair (platform `mac`), lưu token, **hạ tài khoản Con về Standard**
nếu đang là admin (bắt buộc còn một admin khác), lưu uid Con.

## 5. Áp chính sách (daemon)
- Đếm phút: chỉ khi Con là console user và màn không khoá; app theo báo của tray, tray tắt thì tính «Không rõ».
- Bundle id: máy chủ lưu luật app bằng chữ thường (`chuanMuc`) ⇒ tác tử so bundle id KHÔNG phân biệt hoa/thường ở mọi chỗ (chặn/cho phép app, đếm phút) và gửi usage bằng chữ thường. Riêng tên tệp plist chính sách trình duyệt giữ đúng chữ hoa của domain (`com.google.Chrome.plist`).
- App: `hoc` ⇒ chỉ app trong `allowedApps` + app hệ thống; app bị chặn ⇒ đóng (SIGTERM, 3 giây sau SIGKILL) tiến trình của uid Con.
- Web: chính sách trình duyệt (Chrome/Edge/Brave/Cốc Cốc `URLBlocklist`/`URLAllowlist`) + Safari: khối `/etc/hosts` có mốc `# AiiGrow`.
- Khoá: tray hiện màn khoá toàn màn hình + đếm ngược, hết đếm ngược daemon khoá/đăng xuất phiên Con.
- Mất mạng: chạy theo Policy nhớ, giờ còn lại tự trừ.

## 6. Tự cập nhật (từ bản 0.1.1)
`CapNhat.swift` (`BoCapNhat`, `LuatCapNhat`), gọi từ `BoMay.kiemCapNhatDinhKy` (Task riêng trong `main.swift`: +90 giây, rồi mỗi 6 giờ) và `BoMay.capNhatNgay` (IPC `capNhat`).
- **Quyết định**: manifest công khai, nhưng chỉ máy ĐÃ ghép mới tự cập nhật (chưa ghép thì nút «Kiểm tra cập nhật» ẩn); chỉ khi `version` > `PhienBan.hienTai` theo số x.y.z; cờ chống chạy chồng; đang `dangGo` thì bỏ (hỏi lại ngay trước khi cài).
- **An toàn**: URL gói https + host = host máy chủ đang dùng; chuyển hướng chỉ tới https `github.com/tanthanhkid/aiigrow-tai/releases/download/…`, đúng hai host `release-assets.githubusercontent.com` / `objects.githubusercontent.com`, và host máy chủ (đổi nơi phát hành ⇒ sửa `choPhepChuyenHuong`) (tối đa 5 lần, chặn bằng URLSessionTaskDelegate);
  tải vào `…/AiiGrow/cap-nhat` (0700, tệp 0600); sha256 khớp manifest; `pkgutil --check-signature` ra «signed by a developer certificate issued by Apple» + chứng chỉ đầu chuỗi
  «Developer ID Installer: TAN THANH TRAN (ADUL7HT969)»; `spctl -a -t install` mã 0. Sai bước nào ⇒ xoá tệp, ghi log, không cài.
- **Cài**: `HeThong.caiGoi` = `launchctl submit -l vn.aiilab.aiigrow.capnhat -- sh -c 'installer -pkg … -target /; rm gói; launchctl remove nhãn'` — phải là job launchd riêng vì
  preinstall `bootout` chính daemon. Nhãn tự gỡ ở cuối job nên `postinstall` không phải gỡ (gỡ trong postinstall sẽ giết installer giữa chừng).
- **Nút**: tray (chỉ phiên admin, không phải Con) «Kiểm tra cập nhật» ⇒ `YeuCauTray.capNhat` ⇒ `TraLoi.thongBao` («Đang là bản mới nhất (x)» / «Đang tải bản y…») hoặc `.loi`.
  `QuyenIPC`: Con (kể cả khi là admin) bị từ chối. Menu có dòng «AiiGrow bản x».
- **Chỉ khi đã ghép**: chưa ghép / `dangGo` / có dấu `/var/db/aiigrow-da-go` (tuGo + go-cai.sh ghi NGAY ĐẦU; ghép lại thành công thì xoá) ⇒ không kiểm, không cài; hỏi lại NGAY trước khi giao installer.
  go-cai.sh chờ job `…capnhat` xong (≤ ~5 phút) rồi mới gỡ; sau vòng chờ go-cai.sh luôn `launchctl remove` nhãn capnhat + xoá dấu; `DuongDan.dangCapNhat` chứa PID của sh job — postinstall thấy `da-go` + PID đó còn sống (cài tự động) thì không nạp lại daemon/tray (cài tay thì xoá `da-go`, chạy bình thường).
  Gói cài nằm trong thư mục `cap-nhat` (`$1` của postinstall) mà còn `da-go` hoặc mất `config.json` ⇒ cũng không nạp lại (installd cài tiếp sau khi go-cai đã giết job).
  Cài tay (Installer.app hay `installer` dòng lệnh) không bao giờ nằm trong `cap-nhat` nên luôn cài bình thường, kể cả ngay sau một lượt gỡ. Job cài ghi PID rồi kiểm `da-go` ngay trước `installer` (có thì không cài); daemon không bao giờ `launchctl remove` job đang chạy (tránh cài nửa chừng).
- **Chống vòng cài lại**: trước installer ghi `cap-nhat-da-thu.json` (version, sha256, giờ; root 0600). Cùng sha256 ⇒ thử lại tối đa 3 lần (có đếm `lan`), mỗi lần cách ≥ 6 giờ ở vòng định kỳ; quá 3 lần thì 24 giờ mới thử
  một lần (log «cài xong mà bản không đổi»); gói hỏng (sha256/chữ ký/spctl) cũng tính lượt nhưng ghi `daGiao: false`; nút Ba Mẹ thử được sau > 1 giờ (gói hỏng: sau 5 phút); manifest đổi sha256 thì cài tiếp. Nhãn `…capnhat` đang chạy thì không `launchctl remove` (không giết installer).
- **Nút không chờ**: IPC `capNhat` trả «Đang kiểm tra…» ngay, kiểm/tải/cài chạy nền; kết quả ở `TrangThai.capNhat` (+`capNhatLuc`, không trả cho phiên Con) — menu tray hiện dòng đó.
- Gói tải về băm sha256 theo luồng (khúc 1 MiB) rồi mới chuyển vào thư mục 0700 — không đọc cả gói vào bộ nhớ.
- Phát hành bản mới: `BAN=… KY_APP=… KY_PKG=… NOTARY=1 build-pkg.sh` (không ký thì script từ chối, trừ `THU=1`) → release `mac-<bản>` → điền `BAN_AGENT_MAC` (server/lib/ban-agent.ts) gồm sha256 của đúng tệp. Bản 0.1.0 không tự cập nhật, cài tay một lần.

## 7. Luật khi phát triển trên máy Thanh
KHÔNG sudo, KHÔNG nạp daemon/LaunchAgent, KHÔNG kill tiến trình thật, KHÔNG sửa `/etc/hosts` hay Managed Preferences. Mọi tác động hệ thống
đi qua protocol để test bằng bản giả; daemon có cờ `--thu` (chỉ in việc sẽ làm). Build riêng: `swift build --scratch-path .build-<tên> -j 2`.

## 8. Giao diện — Clay gương (từ 24/10/2026)
Theo `docs/THIET-KE-CLAY.md`. `Sources/AiiGrowTray/Clay.swift`: token màu, thẻ clay (bo 26–32, bóng kép, dải men mép trên), ô lõm, nút kẹo
`NutClayStyle` (ngọc / than chì / sứ sáng / kính trên nền tối; bẹp .95×.90 rồi spring 420/14 + vệt men lướt), vào lần lượt (stagger 55ms),
ổ khoá đóng sập, đồng hồ rung. Reduce Motion ⇒ chỉ fade. Icon minh hoạ = Fluent Emoji 3D (MIT, `microsoft/fluentui-emoji` commit
`1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`, 128px) ở `Sources/AiiGrowTray/Fluent/` kèm `LICENSE-fluentui-emoji.txt`; gói cài chép vào
`AiiGrow.app/Contents/Resources/Fluent` (thiếu tệp ⇒ SF Symbol). Chụp duyệt: `CHUP_CLAY=<thư mục> swift test --filter ChupClay`.
