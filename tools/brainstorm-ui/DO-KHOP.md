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


## iPhone: app Ba Mẹ + màn Con `/tre` (Expo)

**Cách làm.** Không dựng tay: chạy bản web thật của app (`npx expo export --platform web`), dữ liệu giả lấy từ kịch bản
`mobile/scripts/pha.mjs` / `pha-tre.mjs`, mở trong Chrome headless (hồ sơ tạm) khổ iPhone 13 mini 375×812 @2.88 với safe area
50/34, đồng hồ trang đặt theo giờ của ảnh thật. Mỗi màn được chụp DOM đã render thành **HTML tĩnh tự đứng**: chỉ giữ luật CSS
khớp phần tử, bỏ toàn bộ script, `<button>` đổi thành `div` (giữ `role`), ảnh/font chép ra `web/that/a/` (tên theo băm).
Thanh trạng thái iOS và bàn phím số hệ thống (màn ghép PIN) là phần của iOS, không có trong DOM — cắt từ ảnh thật thành PNG
nền trong suốt rồi đặt đè. Nút dẫn sang bước kế được gắn sẵn `data-toi`.

`web/hanh-trinh/index.js` đọc `web/that/ds.json`: bước nào có bản chụp thì thay HTML dựng tay bằng `web/that/html/<key>.html`,
khổ 375×812, lớp «Ảnh thật» trỏ tới ảnh đã dùng để đo. Tái tạo: `chup-that/vong.sh bm|con '<regex>'` rồi `chup-that/gen.mjs`.

**Đo.** Render từng HTML trong Chrome headless đúng khổ ảnh thật (1080×2340), pixelmatch threshold 0.1 (bỏ khử răng cưa),
% = điểm ảnh khác / tổng. «Cũ» = HTML dựng tay trước đây render ở 390×844 cùng cỡ ảnh.

Kết quả 26/10/2026 — **72 màn có ảnh thật: trung bình 2,68%** (cũ 21,3%); 24 màn ≤2%, 69 màn ≤5%.
- **Con `/tre` (26 màn): trung bình 1,64%**, 21 màn ≤2%.
- **Ba Mẹ (46 màn): trung bình 3,26%**, 44 màn ≤5%. Phần còn lệch gần như toàn là chữ trượt 1–3 pt dồn dần xuống dưới: Yoga
  trên iOS làm tròn bố cục theo lưới điểm ảnh 1/3 pt và UIKit đặt đường cơ sở chữ khác Chrome; khung, màu, ảnh, icon trùng khít.
- `bm1-otp` 7,1%: ảnh thật `sau-bm-otp.png` thực ra chụp nhầm màn Đăng ký (đã điền) — không có ảnh OTP thật để so.
- `cdt-pin-ai` 5,8%: ảnh tham chiếu là bản chụp web cũ 647×1400 (jpg), không phải iPhone.
- 5 màn không có ảnh thật nhưng vẫn là DOM thật: `bm2-ung-dung-may`, `bm3-duyet-trong`, `bm3-duyet-mat-mang`, `bm3-nv-trao-qua`, `bm3-nv-trong`.
- Chưa thay (giữ HTML dựng tay): màn iOS native của Con (SwiftUI — `cdt-chua-ghep`, `cdt-nhap-ma`, `cdt-quyen`, `cdt-chinh-ios`,
  `cdt-ios-xin-them`, `cdt-ios-choi-diem`, `cdt-ios-ma-offline`, `cdt-ios-dns`), trang tải/cài trên server (`bm1-web-*`), màn Android native.

| key | ảnh thật | cũ % | mới % |
|---|---|---|---|
| bm1-chao | chinchu-ios/sau-bm-chao.png | 25.47 | 2.75 |
| bm1-dang-ky | chinchu-ios/sau-bm-dang-ky.png | 15.34 | 2.72 |
| bm1-otp | chinchu-ios/sau-bm-otp.png | 16.1 | 7.12 |
| bm1-ob-ten-con | chinchu-ios/sau-bm-ob-ten-con.png | 21.1 | 3.01 |
| bm1-ob-may | chinchu-ios/sau-bm-ob-may.png | 17.57 | 4.4 |
| bm1-ob-ghep | chinchu-ios/sau-bm-ob-ghep.png | 12.4 | 2.92 |
| bm1-ob-mau | chinchu-ios/sau-bm-ob-mau.png | 19.05 | 2.66 |
| bm1-ob-gio | chinchu-ios/sau-bm-ob-gio.png | 21.3 | 3.34 |
| bm1-ob-xong | chinchu-ios/sau-bm-ob-xong.png | 13.68 | 1.19 |
| bm1-dang-nhap | chinchu-ios/sau-bm-dang-nhap.png | 13.53 | 1.61 |
| bm1-moi | chinchu-ios/sau-bm-moi.png | 12.93 | 2.74 |
| bm1-may-ds | chinchu-ios/hieu-nang-2/sau/8-ds-may.png | 15 | 2.58 |
| bm1-may-chon-loai | chinchu-ios/sau-bm-ob-may.png | 17.41 | 4.4 |
| bm1-may-ghep | chinchu-ios/sau-bm-ob-ghep.png | 12.34 | 2.92 |
| bm1-may-moi | chinchu-ios/hieu-nang-2/sau/9-may.png | 15.21 | 2.63 |
| bm2-trang-chu | chinchu-ios/hieu-nang-2/sau/1-trang-chu.png | 26.17 | 2.92 |
| bm2-may-ds | chinchu-ios/hieu-nang-2/sau/8-ds-may.png | 15.65 | 2.58 |
| bm2-may-m1 | chinchu-ios/hieu-nang-2/sau/9-may.png | 21.07 | 2.63 |
| bm2-may-m2 | chinchu-ios/sau-bm-may-m2.png | 13.67 | 2.23 |
| bm2-gio | chinchu-ios/sau-bm-gio.png | 16.69 | 2.42 |
| bm2-ho-so | chinchu-ios/sau-bm-ho-so-con.png | 17.32 | 3.5 |
| bm2-ung-dung-may | — | — | — |
| bm2-app-web | chinchu-ios/sau-bm-app-web.png | 11.23 | 3.86 |
| bm2-web | chinchu-ios/sau-bm-web.png | 11.4 | 3.3 |
| bm2-yeu-cau-web | chinchu-ios/sau-bm-yeu-cau-web.png | 26.2 | 3.42 |
| bm2-bao-cao | chinchu-ios/hieu-nang-2/sau/6-bao-cao.png | 23.49 | 2.32 |
| bm2-man-hinh | chinchu-ios/hieu-nang-2/sau/7-man-hinh.png | 17.96 | 3.89 |
| bm2-vi | chinchu-ios/sau-bm-vi.png | 14.87 | 3.76 |
| bm2-gia-dinh | chinchu-ios/hieu-nang-2/sau/5-gia-dinh.png | 19.25 | 2.58 |
| bm2-thanh-vien | chinchu-ios/sau-bm-thanh-vien.png | 18.59 | 3.08 |
| bm2-thong-bao | chinchu-ios/sau-bm-thong-bao.png | 13.55 | 4.66 |
| bm2-thong-bao-cai-dat | chinchu-ios/sau-bm-thong-bao-cai-dat.png | 10.83 | 5.72 |
| bm2-ho-tro | chinchu-ios/sau-bm-ho-tro.png | 7.64 | 2.66 |
| bm2-quy | chinchu-ios/sau-bm-quy.png | 19.95 | 3.42 |
| bm2-admin-ho-tro | chinchu-ios/sau-bm-admin-ho-tro.png | 7.06 | 0.49 |
| bm3-duyet-thong-bao | chinchu-ios/sau-bm-thong-bao.png | 85.37 | 4.66 |
| bm3-duyet-cho-duyet | chinchu-ios/hieu-nang-2/sau/3-cho-duyet.png | 28.89 | 3 |
| bm3-duyet-canh-bao | chinchu-ios/sau-bm-canh-bao.png | 20.55 | 4.43 |
| bm3-duyet-canh-bao-chi-tiet | chinchu-ios/sau-bm-canh-bao-chi-tiet.png | 20.88 | 2.49 |
| bm3-duyet-them-gio | chinchu-ios/sau-bm-yeu-cau-them-gio.png | 19.88 | 4.64 |
| bm3-duyet-nhiem-vu | chinchu-ios/sau-bm-duyet-nv.png | 27.6 | 4.57 |
| bm3-duyet-xong | chinchu-ios/sau-bm-duyet-xong.png | 29.52 | 2.1 |
| bm3-duyet-trong | — | — | — |
| bm3-duyet-mat-mang | — | — | — |
| bm3-nv-qua | chinchu-ios/hieu-nang-2/sau/4-diem-qua.png | 30.94 | 2.49 |
| bm3-nv-giao | chinchu-ios/sau-bm-giao-nv.png | 19.51 | 4.09 |
| bm3-nv-duyet | chinchu-ios/sau-bm-duyet-nv.png | 29.49 | 4.57 |
| bm3-nv-loi-khen | chinchu-ios/sau-bm-loi-khen.png | 24.34 | 2.88 |
| bm3-nv-vi | chinchu-ios/sau-bm-vi.png | 20.72 | 3.76 |
| bm3-nv-trao-qua | — | — | — |
| bm3-nv-trong | — | — | — |
| cdt-chao | chinchu-ios/sau-con-chao.png | 23.45 | 1.47 |
| cdt-cai | chinchu-ios/sau-con-cai.png | 21.42 | 1.58 |
| cdt-nha | chinchu-ios/sau-con-nha.png | 21.08 | 0.97 |
| cdt-nha-chinh | chinchu-ios/sau-con-nha-cuon.png | 19.58 | 0.95 |
| cdt-nhiem-vu | chinchu-ios/sau-con-nhiem-vu.png | 20.52 | 2.51 |
| cdt-nv-chi-tiet | chinchu-ios/sau-con-nv-chi-tiet.png | 19.69 | 1.78 |
| cdt-dang-lam | chinchu-ios/sau-con-nv-dang.png | 11.58 | 1.14 |
| cdt-chup | chinchu-ios/sau-con-chup.png | 13.19 | 0.49 |
| cdt-cho-duyet | chinchu-ios/sau-con-cho-duyet.png | 13.04 | 0.83 |
| cdt-duoc-duyet | chinchu-ios/sau-con-duoc-duyet.png | 20.09 | 0.97 |
| cdt-chup-lai | chinchu-ios/sau-con-chup-lai.png | 19.71 | 0.94 |
| cdt-vi-qua | chinchu-ios/sau-con-vi-qua.png | 25.73 | 1.76 |
| cdt-cua-hang | chinchu-ios/sau-con-cua-hang.png | 20.38 | 3.12 |
| cdt-doi-qua | chinchu-ios/sau-con-doi-qua.png | 18.46 | 1.85 |
| cdt-huy-hieu | chinchu-ios/sau-con-huy-hieu.png | 17.97 | 3.19 |
| cdt-gio-may | chinchu-ios/sau-con-gio-may.png | 22.04 | 2 |
| cdt-choi | chinchu-ios/sau-con-choi.png | 74.93 | 0.77 |
| cdt-phien | chinchu-ios/sau-con-phien.png | 87.46 | 0.49 |
| cdt-het-phien | chinchu-ios/sau-con-het-phien.png | 19.53 | 1.34 |
| cdt-gio-ngu | chinchu-ios/sau-con-gio-ngu.png | 12.23 | 0.81 |
| cdt-xin-phep | chinchu-ios/sau-con-xin-phep.png | 28.94 | 2.08 |
| cdt-yeu-cau | chinchu-ios/sau-con-yeu-cau.png | 14.54 | 1.99 |
| cdt-chan-web | chinchu-ios/sau-con-chan-web.png | 18.82 | 0.59 |
| cdt-quy-tac | chinchu-ios/sau-con-quy-tac.png | 13.82 | 1.85 |
| cdt-pin-ghep | chinchu-ios/sau-con-pin.png | 21.21 | 1.45 |
| cdt-pin-ai | man-dienthoai-2510/expo-con-pin.jpg | 11.95 | 5.75 |
