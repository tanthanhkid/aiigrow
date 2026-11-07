# E2E agent macOS trên GitHub Actions

Workflow `.github/workflows/agent-mac.yml` (PR/push đụng `agent-mac/**`, phần máy chủ agent dùng — như `agent-win.yml` — hoặc bấm tay). Repo public ⇒ runner `macos-15` miễn phí.
Không dùng secret ký / notarize: gói build ở chế độ `THU=1` (ký ad-hoc).

- **unit** — `swift test`.
- **build** — `build-pkg.sh` + `build-dmg.sh` với `THU=1` (universal). Artifact `goi-mac`.
- **chup-man** — `testChupManMac` chụp màn Mac; kiểm số ảnh + cỡ tệp. Artifact `man-mac`.
- **e2e** — `chay.sh <pkg> <bản>`: máy chủ `pnpm dev` (PGlite, OTP thử) + `sudo installer` thật trên runner, ghép một chạm bằng IPC (tên gói `AiiGrow_<token>.pkg`),
  đồng bộ, long-poll `cho-thay-doi`, chặn app thật (tiến trình `E2EChan` chạy dưới uid tài khoản `aiicon`), khoá, «Mở hết», gỡ bằng `go-cai.sh`.
  Mỗi kiểm tra in PASS / FAIL / BỎ; bảng ở Summary + `e2e-logs-mac/ket-qua.md`.

Đồ giả của harness (không phải mã sản phẩm): `config.json` đặt trước `mayChu = http://127.0.0.1:3310` (daemon không có tuỳ chọn đổi máy chủ khi chạy launchd); tài khoản `aiicon` tạo bằng `sysadminctl`;
`/Applications/E2EChan.app` (bản sao `sleep`) làm «app ngoài danh sách».

## Giới hạn của runner (không có phiên GUI của Con, không cấp được TCC)

BỎ có lý do: màn «chưa được mở» + thông báo (tray, quyền Thông báo), đếm thời gian dùng app theo app tiền cảnh + Screen Time (Accessibility/Screen Recording),
màn khoá toàn màn hình / ngắt phiên Con, hosts + Managed Preferences khi Con không ở màn hình. Tự cập nhật không kiểm (gói thử không có chữ ký Developer ID Installer).
