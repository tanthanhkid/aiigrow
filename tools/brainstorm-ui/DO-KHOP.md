# Đo độ khớp: HTML dựng lại ↔ ảnh chụp thật

Mỗi màn trên bàn brainstorm được dựng lại bằng HTML/CSS cho giống ảnh chụp thật, rồi so pixel để biết còn lệch bao nhiêu.

## Native (máy Con: Windows · Mac · Android · trang tải)

Màn dựng ở `web/hanh-trinh/that/*.js`, gom trong `that/index.js` (`THAT[key]`). `con-may-tinh.js` lấy toàn bộ màn từ đây;
`con-dien-thoai.js` thay 4 bước Android + thêm hành trình «Màn chính Android»; `bm-1.js` thay các bước trang tải (`bm1-web-tai-*`).

**Ảnh gốc** (`aiigrow-thiet-ke/`): `man-win-2510/100` (100% DPI, chụp lại 26/10 bằng workflow `chup-man-win.yml`; 4 màn khoá
giờ là toàn màn hình 1920×1080), `man-mac-2510` (@2x, dựng với `dsf: 2`), `man-android-2510` (1080×2400 ⇒ 360×800 @3x),
`chinchu-ios/sau-web-tai-*` (trang /tai).

**Cách đo:** render trong Chrome headless (profile tạm) đúng w×h×DPR của ảnh, rồi
- **PM** = % pixel khác theo pixelmatch (threshold 0.1) — số chính, mục tiêu ≤5%;
- **Ngoài chữ** = % pixel lệch nằm ngoài vùng chữ (khung, nền, nút, icon, ảnh) — bỏ phần lệch do khác font.

**Sàn lệch do font:** máy dựng là Mac, không có Segoe UI ⇒ màn Windows vẽ bằng Helvetica Neue (đo cùng bề rộng dòng với Segoe UI
±0,5%; Selawik thiếu dấu tiếng Việt). Vị trí và bề rộng từng dòng đã khớp ±2px, nhưng nét chữ khác nên màn nhiều chữ (bộ cài bước 3,
hộp thoại) còn 5–7,5% dù phần ngoài chữ chỉ ~1%. Mở trên Windows (có Segoe UI) sẽ khớp hơn. Mac dùng SF Pro/Helvetica Neue,
Android Roboto, trang tải Inter.

**Asset thật** (không nhúng ảnh chụp): `server.mjs` phục vụ `/assets/win/fluent|mascot/` (agent-win), `/assets/mac/fluent|mascot/`
(agent-mac), `/assets/android/` (agent-android `drawable-nodpi`).

Kết quả 26/10/2026 — 64 màn, **PM trung bình 3,26%**, ngoài chữ trung bình 1,05%; 7 màn >5% đều do sàn font (ngoài chữ ≤1,4%).
HTML cũ trước khi dựng lại lệch 6–53% (đo YIQ: bộ cài 6–19%, app 13–25%, khoá 39–53%, hộp thoại 25–46%, Mac 10–38%, Android 11–33%).

| key | PM % | ngoài chữ % |
|---|---|---|
| cai-chao | 3.22 | 0.53 |
| cai-dieu-khoan | 4.92 | 0.68 |
| cai-chon-tai-khoan | 7.52 | 0.71 |
| cai-tao-tai-khoan | 6.58 | 0.81 |
| cai-chi-mot-tai-khoan-quan-tri | 7.37 | 0.73 |
| cai-ma-ghep | 2.94 | 0.80 |
| cai-ma-ghep-sai | 3.08 | 0.79 |
| cai-dang-cai | 2.56 | 0.54 |
| cai-loi-ghep | 3.09 | 0.68 |
| cai-xong | 3.93 | 0.83 |
| hom-nay | 3.53 | 0.83 |
| nhiem-vu | 4.57 | 0.85 |
| nhiem-vu-loi-tai | 2.13 | 0.68 |
| phan-qua | 4.51 | 1.45 |
| vi-qua | 3.97 | 1.20 |
| tin-nhan | 4.21 | 0.88 |
| hom-nay-mat-mang | 4.43 | 1.27 |
| hom-nay-mo-bang-ma | 4.88 | 1.39 |
| hom-nay-dich-vu-tat | 4.27 | 1.48 |
| nop-bai-viet | 5.18 | 1.22 |
| nop-bai-anh-bo-sung | 4.55 | 0.91 |
| choi-bang-diem | 5.98 | 1.37 |
| chan-app | 3.79 | 0.56 |
| chan-app-het-diem | 3.85 | 0.45 |
| chan-app-mat-mang | 3.75 | 0.82 |
| xin-them-gio | 5.44 | 1.35 |
| xin-them-gio-tu-man-chan | 4.27 | 1.48 |
| khoa-het-gio-dem-nguoc | 0.74 | 0.08 |
| khoa-gio-ngu | 0.60 | 0.08 |
| khoa-ba-me-khoa | 0.62 | 0.11 |
| khoa-mat-mang | 0.78 | 0.08 |
| cap-nhat | 4.70 | 0.61 |
| cap-nhat-da-moi-nhat | 5.18 | 0.62 |
| khay-menu | 4.80 | 0.05 |
| mac-chao | 2.29 | 0.27 |
| mac-dieu-khoan | 0.90 | 0.19 |
| mac-ghep-may | 4.59 | 3.32 |
| mac-ghep-mot-cham | 3.01 | 1.53 |
| mac-nhac-5-phut | 2.10 | 1.17 |
| mac-tin-moi | 2.17 | 1.56 |
| mac-nop-bai | 3.46 | 2.50 |
| mac-xin-them | 1.38 | 0.33 |
| mac-xin-them-doi-diem | 1.31 | 0.29 |
| mac-xin-mo | 3.47 | 2.71 |
| mac-chan-app | 3.19 | 2.14 |
| mac-choi-bang-diem | 3.17 | 2.14 |
| mac-app-hom-nay | 2.75 | 1.55 |
| mac-app-nhiem-vu | 2.69 | 1.53 |
| mac-app-phan-qua | 2.68 | 1.89 |
| mac-app-tin-nhan | 2.47 | 1.71 |
| mac-dem-nguoc | 1.31 | 0.74 |
| mac-man-khoa | 0.94 | 0.50 |
| mac-man-khoa-ma-offline | 1.61 | 1.07 |
| android-nhac-5-phut | 4.95 | 4.46 |
| android-tre-webview | 1.98 | 1.48 |
| android-chinh-viec-cua-con | 2.86 | 1.65 |
| android-chinh-doi-diem | 2.67 | 1.97 |
| android-khoa-ma-da-mo | 3.18 | 1.68 |
| android-khoa-ma-offline | 3.41 | 1.95 |
| web-tai-windows-390 | 1.60 | 0.04 |
| web-tai-mac-390 | 1.78 | 0.04 |
| web-tai-android-390 | 2.70 | 0.08 |
| web-tai-iphone-390 | 1.47 | 0.04 |
| web-tai-windows-1440 | 0.71 | 0.03 |
