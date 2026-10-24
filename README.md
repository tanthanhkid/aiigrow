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

## Đưa lên prod theo lô (24/10)

Merge vào `main` **không** tự deploy (`server/vercel.json` → `git.deploymentEnabled: false`). Làm xong một lô tính năng thì chạy
`scripts/deploy-prod.sh` trên bản sạch của `origin/main`: test máy chủ + tsc + bản web chạy trên localhost (`pha.mjs` luồng + cổng giao diện),
đạt mới `vercel deploy --prod`. Chỉ kiểm, không deploy: `scripts/deploy-prod.sh --chi-kiem`. Bản phát hành agent (manifest `server/lib/ban-agent.ts`)
chỉ tới máy Con sau lần deploy này.
