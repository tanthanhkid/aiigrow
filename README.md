# AiiGrow

«Grow with Love. Earn with Effort» — Con làm việc có ích, nộp bằng chứng, Ba Mẹ duyệt, điểm vào ví; Con dùng điểm đổi phút chơi, quà
hoặc phiếu quà AiiCafe. BRD: `tanthanhkid/aiigrow-thiet-ke` `docs/AiiGrow_BRD_v1.0.txt`; thiết kế đã duyệt: https://aiigrow-thiet-ke.netlify.app.

Kế hoạch + mốc: [`docs/KE-HOACH.md`](docs/KE-HOACH.md). API: [`docs/API.md`](docs/API.md).

| Thư mục | | Chạy |
|---|---|---|
| `server/` | Next.js + Postgres (Neon; PGlite khi test/dev) | `pnpm install && pnpm test && pnpm dev` (cổng 3310) |
| `mobile/` | Expo SDK 58 — app Ba Mẹ + màn Con | `npm install && npx tsc --noEmit && npx expo lint && npx expo start` |
| `agent-win/` | tác tử Windows (mốc M4) | |

## Phát hành APK app Ba Mẹ (Android)

Link cố định `https://aiigrow.aiilab.vn/tai/aiigrow.apk` ⇒ release cuộn `android-moi-nhat` ở `tanthanhkid/aiigrow-tai` (asset `AiiGrow-android.apk`).
Sau mỗi lần merge thay đổi trong `mobile/`, chạy một lệnh (Mac, cần JDK 17, Android SDK, `gh` đã đăng nhập):

```
bash mobile/scripts/phat-hanh-apk.sh        # build từ commit hiện tại + đăng
bash mobile/scripts/phat-hanh-apk.sh --thu  # chỉ build + kiểm, không đăng
```

versionCode = số commit (luôn tăng), versionName = `<version package.json>+<sha>`. Ký bằng `debug.keystore` của template Expo như bản 0.1.0
(script dừng nếu chứng chỉ khác bản 0.1.0, vì khác khoá thì không cài đè được). Mỗi lần đăng thêm một release prerelease riêng `android-<versionName>-<versionCode>`.

## Đưa lên prod theo lô (24/10) — máy chủ chạy trên VPS từ 06/11

**Từ 06/11/2026 prod `aiigrow.aiilab.vn` chạy trên VPS của Thanh, không còn Vercel** (team Vercel Hobby bị chặn mềm vì vượt fair-use CPU).
VPS: `ssh trinity-crm` (1 vCPU, 2 GB) — nginx `/etc/nginx/sites-enabled/aiigrow.conf` (TLS certbot) → pm2 `aiigrow` ở `127.0.0.1:3320`;
mã ở `/opt/aiigrow/releases/<sha>` (`current` trỏ bản đang chạy, giữ 3 bản); biến môi trường ở `/etc/aiigrow/aiigrow.env` (root, chmod 600, có `AIIGROW_BAT_BUOC_DB=1` ⇒ thiếu `DATABASE_URL` thì báo lỗi chứ không lặng lẽ dùng PGlite;
không nằm trong git); cron dọn kiểm toán ở `/etc/cron.d/aiigrow` (thay `crons` của `server/vercel.json`). CSDL vẫn là Neon.

Merge vào `main` **không** tự deploy. Làm xong một lô tính năng thì chạy `scripts/deploy-prod.sh --chi-kiem` trên bản sạch của `origin/main`
(test máy chủ + tsc + bản web chạy trên localhost: `pha.mjs` luồng + cổng giao diện), đạt rồi `scripts/deploy-vps.sh`: dựng trên Mac
(`AIIGROW_STANDALONE=1` ⇒ `output: "standalone"`), đẩy bằng tar qua ssh, pm2 chạy lại, tự kiểm `/api/m/cau-hinh-dang-nhap`.
**Không `next build` trên VPS** (máy nhỏ, từng OOM). Quay lui: trên VPS `pm2 delete aiigrow` rồi start lại `releases/<sha cũ>/server.js`
(lệnh đầy đủ trong script). `scripts/deploy-prod.sh` không flag vẫn deploy Vercel — chỉ dùng lại khi chuyển về Vercel.
Bản phát hành agent (manifest `server/lib/ban-agent.ts`) chỉ tới máy Con sau lần deploy này.

**Trước golive — đổi chu kỳ tự cập nhật về 6 giờ.** Agent Windows 0.2.12+ và agent Mac 0.1.6+ hỏi bản mới theo `chuKyKiemPhut` trong manifest
(một hằng chung `CHU_KY_KIEM_PHUT` ở `server/lib/ban-agent.ts` cho cả hai, agent kẹp [5, 1440] phút, không có trường ⇒ 6 giờ). Giai đoạn dev đặt **15**;
trước golive sửa thành **360** rồi chạy `scripts/deploy-prod.sh` — chỉ máy chủ, không phát lại agent; máy Con nhận chu kỳ mới ở lượt hỏi kế tiếp.

Cổng ~2,5 phút khi đã cài (25/10: trước ~10 phút): bỏ cài khi lockfile không đổi, nhánh máy chủ ∥ nhánh app, cache Metro riêng của cổng,
`pha.mjs` luồng ∥ cổng giao diện chia ba lượt (`PHA_MAN`) — chi tiết đầu `scripts/deploy-prod.sh`.
