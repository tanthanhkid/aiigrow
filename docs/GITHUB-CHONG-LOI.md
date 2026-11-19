# Tính năng GitHub chống lỗi (bật 19/11/2026)

Luật giữ nguyên: PR merge + deploy ngay, **không** chờ CI — không required status checks, không merge queue, không branch protection chặn merge.
Mọi thứ dưới đây chỉ **báo** hoặc **chặn phát bản cài**, không chặn merge.

| Thứ | Ở đâu | Làm gì |
|---|---|---|
| Chạy đêm | `.github/workflows/dem.yml` (19:15 UTC = 02:15 VN, + chạy tay `gh workflow run dem --ref main`) | Gọi lại đủ agent-win, agent-mac, agent-ios, agent-android, chup-man-win, mobile, server trên main. Đỏ ⇒ issue «CI đêm trên main đỏ» nhãn `loi` + `ci-dem` (đã mở thì comment), kèm link run + artifact ảnh `man-*`. Xanh ⇒ comment + đóng issue `ci-dem`. |
| Báo đỏ sau merge | `.github/workflows/bao-do.yml` (`workflow_run`, main, push, failure) | Comment vào PR ra commit đỏ: workflow, job đỏ, link, lệnh `git revert` sẵn. Không tự revert. Thử: `gh workflow run bao-do -f run_id=<id>`. |
| Cổng phát bản | `scripts/ci/kiem-ci.sh <workflow>` | Commit đang phát có run ĐỎ ở workflow đó ⇒ dừng + link. Đang chạy / chưa có run ⇒ cảnh báo, cho qua (không chờ CI). `--bo-kiem-ci` (hoặc `BO_KIEM_CI=1`) khi sửa gấp. Gắn sẵn: `mobile/scripts/testflight.sh`, `mobile/scripts/phat-hanh-apk.sh` (workflow `mobile`), `agent-mac/goi/build-pkg.sh` khi `NOTARY=1` (`agent-mac`). Win và Con Android phát tay: README từng agent ghi bước chạy `kiem-ci.sh agent-win` / `agent-android`. |
| CodeQL | Settings › Code security, *default setup* | Quét mã mỗi push/PR + hằng tuần. Cảnh báo ở tab Security › Code scanning. |
| Secret scanning + push protection | Settings › Code security | Đẩy commit chứa khoá lộ bị GitHub chặn ngay lúc push. |
| Dependabot | Settings › Code security + `.github/dependabot.yml` | Cảnh báo lỗ hổng + tự mở PR vá bảo mật. PR nâng bản thường tắt (`open-pull-requests-limit: 0`), riêng github-actions gom một PR mỗi tháng. |
| Mẫu issue | `.github/ISSUE_TEMPLATE/` | «Báo lỗi» (tự gắn `loi`), «Đề xuất thay đổi thiết kế» (`de-xuat`); vẫn viết issue trống được. |

Thêm workflow CI mới cần chạy đêm + báo đỏ: thêm `workflow_call:` vào `on:` của nó, một job `uses:` trong `dem.yml` (tên job = tên workflow,
`kiem-ci.sh` dựa vào đó để đọc lượt đêm) và tên vào `workflows:` của `bao-do.yml`.

## Khi đóng repo private

Repo đang public tạm (chạy Actions Windows/macOS miễn phí). Chuyển private (trước golive) thì:

- **CodeQL và secret scanning cần GitHub Advanced Security** (Code Security / Secret Protection, tính theo người commit) — gói free private
  **không có**: hai mục này tự tắt. Dependabot alerts + security updates vẫn miễn phí.
- **Phút Actions tính tiền**: free 2.000 phút/tháng; runner Windows ×2, **macOS ×10**. Một lượt đêm đủ bộ ≈ 3 h Windows (e2e 60′) + vài giờ macOS
  (agent-mac 4 job, agent-ios 4 job) ⇒ vài nghìn phút quy đổi **mỗi đêm** — vượt quota ngay ngày đầu.
- Thu hẹp: bỏ `schedule` của `dem.yml` (hoặc còn 1 lần/tuần), cắt job macOS khỏi lượt đêm, push main chỉ còn job Linux; giữ
  Dependabot (miễn phí) + `bao-do.yml` (Linux, vài giây). Cổng `kiem-ci.sh` vẫn chạy nhưng thường rơi vào «chưa có run» ⇒ chỉ cảnh báo.
