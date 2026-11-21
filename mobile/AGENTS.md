This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Quy trình PR / cổng kiểm (mobile + server)

- **Trước mở PR**: `bash mobile/scripts/cong-pr.sh` (lint mobile đúng lệnh CI + tsc mobile + tsc server + test server liên quan + `pha-theo-diff`: pha chỉ trên màn / kịch bản
  liên quan tới diff ở 320 + 390px). Đỏ bước nào thoát ≠ 0, tóm tắt ở cuối. Cần `mobile/node_modules` (`cp -cR`, không symlink) và `server/node_modules` (`pnpm install --frozen-lockfile`).
- **Lượt `--giao-dien` ĐỦ chạy trên CI, không chạy trên Mac**: workflow `mobile` có job `giao-dien` chia 6 shard (`PHA_SHARD=i/6`) chạy song song, chạy trên `pull_request`
  và `workflow_dispatch`; job `giao-dien-tong` đỏ nếu shard nào đỏ. Agent đẩy nhánh và MỞ PR (nhánh chưa có PR thì không có lượt CI; hoặc `gh workflow run mobile --ref <nhánh>`) rồi chờ (`gh run watch`, ~10–15 phút) thay vì chạy lượt đủ 60–90 phút trên Mac.
  Kích tay: `gh workflow run mobile --ref <nhánh>`; log/ảnh: `gh run download <id> -n giao-dien-<i>`.
- **Đổi chữ giao diện (nhãn nút, tiêu đề, câu thông báo) ⇒ sửa kịch bản pha (`mobile/scripts/pha.mjs`) trong CÙNG PR**; kịch bản mới đặt trong hàm / khối riêng cho dễ rebase.
- **Test không dùng đồng hồ thật** (`Date.now()`, `new Date()` trần): truyền thời điểm vào hàm hoặc dùng `node:test` mock timers, kẻo test đỏ theo giờ / ngày chạy.
- `pha.mjs` có watchdog: màn / kịch bản quá `PHA_HAN_GIAY` (mặc định 90) ghi `TREO <tên>`, đóng việc dở (khởi động lại Chrome nếu cần), chạy tiếp; cuối lượt thoát mã 3.
  Mac tự bọc `caffeinate -i`. Biến soát nhanh: `PHA_MAN` (tên màn), `PHA_KB` (tên kịch bản), `PHA_RONG` (một khổ), `PHA_SHARD=i/n`, `PHA_DUONG` (đường dẫn màn).
