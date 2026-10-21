# AiiGrow

«Grow with Love. Earn with Effort» — Con làm việc có ích, nộp bằng chứng, Ba Mẹ duyệt, điểm vào ví; Con dùng điểm đổi phút chơi, quà
hoặc phiếu quà AiiCafe. BRD: `tanthanhkid/aiigrow-thiet-ke` `docs/AiiGrow_BRD_v1.0.txt`; thiết kế đã duyệt: https://aiigrow-thiet-ke.netlify.app.

Kế hoạch + mốc: [`docs/KE-HOACH.md`](docs/KE-HOACH.md). API: [`docs/API.md`](docs/API.md).

| Thư mục | | Chạy |
|---|---|---|
| `server/` | Next.js + Postgres (Neon; PGlite khi test/dev) | `pnpm install && pnpm test && pnpm dev` (cổng 3310) |
| `mobile/` | Expo SDK 58 — app Ba Mẹ + màn Con | `npm install && npx tsc --noEmit && npx expo lint && npx expo start` |
| `agent-win/` | tác tử Windows (mốc M4) | |
