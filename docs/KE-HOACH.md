# AiiGrow — kế hoạch build bản chạy thật

Ngày 21/10/2026. Nguồn yêu cầu: `docs/AiiGrow_BRD_v1.0.txt` (repo `tanthanhkid/aiigrow-thiet-ke`, commit c0be9df, chỉ đọc) và bản
thiết kế đã duyệt https://aiigrow-thiet-ke.netlify.app (57 màn: 31 màn Ba Mẹ `bm-*`, 24 màn Con `con-*`, 2 màn quầy `cafe-*`; mỗi
màn 5 trạng thái Bình thường · Đang tải · Trống · Lỗi · Mất mạng). Chuẩn giao diện: `TIEU-CHUAN-GIAO-DIEN.md` của repo thiết kế +
Gu giao diện của Thanh. Người làm: phiên aiilab-pc (máy Windows 16 GB, không chạy được python, không Docker).

## 1. Kiến trúc

```
aiigrow/
  server/      Next.js (App Router) + Postgres: Neon khi chạy thật, PGlite trong bộ nhớ khi test/dev
               /api/m/*       API app Ba Mẹ (Bearer phiên)
               /api/kid/*     API màn Con (Bearer token máy hoặc phiên PIN)
               /api/device/*  agent máy con: ghép, đồng bộ Policy, báo dùng máy, báo phiên, ack lệnh
               /quay          màn quầy AiiCafe (web, vai «Nhân viên AiiCafe»)
               /admin         cổng quản trị AiiLab (web)
  mobile/      Expo SDK 58 (expo-router), MỘT dự án, hai nhóm màn:
               (bm)  app Ba Mẹ — iOS/Android/Web
               (con) màn Con   — Android (bản native) + Web (nhúng vào agent Windows bằng WebView2)
  agent-win/   .NET (dịch vụ LocalSystem + khay + Setup), thực thi chính sách trên Windows
  docs/        kế hoạch, hợp đồng API, trạng thái
```

Một nguồn sự thật cho điểm và quy tắc: **máy chủ**. Agent chỉ thực thi và báo cáo; phiên chơi trừ điểm theo phút do máy chủ ghi sổ
(agent gửi nhịp «đang chơi» mỗi phút, offline thì xếp hàng và chỉ dùng tối đa số điểm đã đồng bộ — BRD 6.7).

## 2. Tái dùng từ AiiControl (`tanthanhkid/aiicontrol`, main 08a81f7) — chép rồi đổi tên, không phụ thuộc chéo

| Phần | Chép từ AiiControl | Đổi / thêm cho AiiGrow |
|---|---|---|
| Hạ tầng server | `lib/db.ts` (Neon/PGlite), `api.ts`, `loi.ts`, `auth.ts` (scrypt, phiên), `oauth.ts` (Google/Apple), `dang-nhap-apple.ts`, `ho-tro.ts`, `xoa-tai-khoan.ts`, hook test `next-esm.mjs` | thêm đăng ký SĐT + OTP (xem CẦN ANH) |
| Ghép máy | `ghep-qr.ts`, `taoMaGhep/ghepMay`, token máy băm sha256 | thêm chọn hồ sơ Con bằng PIN trên máy dùng chung (FR-01.03) |
| Đồng bộ máy con | `dong-bo.ts` (lệch giờ, offline, gửi bù), `lenh.ts` (lệnh + ack), `policy.ts` (khung giờ, ngủ, trần) | Policy thêm Allowlist hệ thống / gia đình / Fun list theo nhóm + giá điểm/phút; lệch giờ > 5 phút ⇒ khoá Fun list (FR-01.05) |
| Lời xin + duyệt | `taoLoiXin`, `duyet`, `tuChoi`, kiểm số dư lúc duyệt | 6 loại yêu cầu, lý do nhanh, giới hạn 3 chờ / 10 ngày, hết hạn 24 giờ / 7 ngày, phạm vi Lần này/Hôm nay/Vĩnh viễn |
| Điểm | bảng `points` (sổ cái), `soDiem` | ví không âm, điểm chờ duyệt, điều chỉnh tay có lý do, cấp độ trọn đời |
| App Ba Mẹ | `mobile/src/lib/ui.tsx` (thành phần, Z, hoàn tác, chạm 44, chuTren), `api.ts`, `phien.tsx`, `ho-tro.ts`, `lenh.tsx`, màn ghép/QR/hỗ trợ/xoá tài khoản | toàn bộ màn theo thiết kế `bm-*`; bảng màu/kit theo `tinh/app.css` + `kit.py` của thiết kế |
| Cổng giao diện | `mobile/scripts/pha.mjs` + `giao-dien.mjs` (5 luật, 320 / 390 / 390 giãn chữ) | danh sách màn = 57 màn thiết kế × 5 trạng thái |
| Agent Windows | `agent-win/` (Service + Tray + Setup, AppLocker, khoá phiên, pipe, DPAPI) | phiên chơi bằng điểm, màn chặn «Dùng điểm để chơi / Xin phép Ba Mẹ», chặn file cài đặt, khung Kid bằng WebView2 |

**Mới hoàn toàn**: nhiệm vụ + bằng chứng ảnh, phiên giải trí trừ điểm theo phút, cửa hàng phần thưởng, voucher AiiCafe (quỹ trả trước,
QR dùng một lần, quầy quét), huy hiệu / chuỗi ngày / cấp độ, lời khen, cảnh báo ngoại lệ + gợi ý, báo cáo tuần, nhật ký hoạt động,
cổng admin, màn quầy.

## 3. Mốc (mỗi mốc: commit + push nhánh, PR cho master review, test xanh; mốc có giao diện thì cổng giao diện 0 lỗi)

| Mốc | Nội dung | Tiêu chí xong |
|---|---|---|
| **M0 Khung** | repo, `server/` + `mobile/` chép khung từ AiiControl, đổi tên/brand AiiGrow, `docs/API.md` bản đầu | `npm test` xanh, `tsc` sạch cả hai, app web mở được màn chào |
| **M1 Lõi máy chủ** (FR-01, 03, 04, 05, 07, 09.02) | schema + logic: gia đình/Ba Mẹ (Chủ, thành viên duyệt/chỉ xem), hồ sơ Con (PIN, Nhí/Teen), thiết bị + mức bảo vệ; nhiệm vụ (mẫu theo tuổi, giao, tần suất, thời gian tối thiểu, trạng thái A.1, bằng chứng ảnh + phát hiện trùng bằng băm); ví điểm (sổ cái, không âm, chờ duyệt, điều chỉnh tay); phần thưởng (phút chơi, voucher, quà giữ điểm, đặc quyền); phiên giải trí A.3 (giá/phút theo nhóm, tối đa 30', nghỉ 60', tự đóng 3', 1 phiên liên thiết bị, trần ngày/tuần); yêu cầu A.2; ngoại lệ + cảnh báo mềm/mạnh; voucher A.4 + quỹ; huy hiệu/streak/cấp độ; lời khen; nhật ký; tham số mục 10 ở một bảng cấu hình | mỗi quy tắc nghiệp vụ trong BRD mục 4 có ít nhất một test; mọi ví dụ tiêu chí chấp nhận (25 điểm Roblox, 60+30 phút trần, voucher 50k từ quỹ 200k, quét QR lần 2…) là một test; cách ly gia đình có test |
| **M2 App Ba Mẹ** (31 màn `bm-*`) | đăng ký/đăng nhập, trình hướng dẫn 5 bước, Hôm nay, Chờ duyệt (gom theo Con, duyệt hàng loạt, hoàn tác), duyệt/từ chối/bổ sung kèm lời khen, giao nhiệm vụ, yêu cầu web/app/thêm giờ + cảnh báo ngoại lệ, ví, nhiệm vụ & quà, quỹ voucher, cảnh báo & gợi ý, báo cáo tuần, khung giờ, phân loại app/web, hồ sơ Con & thiết bị, cài đặt, lời khen, hỗ trợ | `pha.mjs` (kịch bản luồng chính + mất mạng) đạt; cổng giao diện 0 lỗi trên mọi màn × 3 chế độ; soi ảnh từng màn so với thiết kế |
| **M3 Màn Con** (24 màn `con-*`) | chọn hồ sơ/PIN, Rob chào + 10 điểm chào mừng, Nhà của Con (Điểm – Nhiệm vụ – Cửa hàng), nhiệm vụ → đang làm → chụp bằng chứng (camera trong app, hàng đợi offline) → chờ → ăn mừng / chụp lại, dùng điểm để chơi, đang chơi/hết phiên/hết giờ, chặn web, xin phép + yêu cầu, giờ máy sai, cửa hàng, đổi voucher, ví quà (QR), bảng quy tắc, huy hiệu; Nhí/Teen | như M2; nộp nhiệm vụ ≤ 3 chạm (kịch bản đếm chạm) |
| **M4 Agent Windows** | từ agent AiiControl: Policy mới, đo Fun list theo cửa sổ tiền cảnh, phiên điểm (nhịp phút, cảnh báo 5'/1', dừng sớm, tự đóng), màn chặn + nút, chặn .exe/.msi lạ (AppLocker), lệch giờ ⇒ khoá Fun list + cảnh báo, khung Kid WebView2, chống gỡ (dịch vụ + mật khẩu Ba Mẹ) | `dotnet test` xanh; chạy thật trên máy Windows thử với tài khoản Standard: mở game ⇒ hỏi dùng điểm ⇒ trừ đúng phút ⇒ hết phiên khoá (ghi lại video/ảnh) |
| **M4b Độ bền máy con** (master 21/10) | giả định Con sẽ tìm cách tự gỡ giới hạn. Tổ chức theo các hệ quản lý thiết bị (Intune, Jamf, Workspace ONE, Android Enterprise, Screen Time / Family Link / Family Safety): (1) **chính sách chung** không phụ thuộc OS ở máy chủ (`lib/chinh-sach.ts`, dựng từ lịch, cau-hinh, app_rules, taoPolicy); (2) **bộ chuyển đổi theo nền tảng** thuần, test được (`lib/chuyen-doi.ts`: windows · mac · ios · android · tvos · android_tv · tizen · webos · tầng mạng) — khả năng OS không làm được ghi rõ «thay bằng / chỉ báo Ba Mẹ»; (3) **nhịp + tuân thủ** (`lib/tuan-thu.ts`): mất nhịp ⇒ ngoài vòng kiểm soát + cảnh báo một lần, lệch chuẩn ⇒ hạ điểm tuân thủ + khoá giải trí (fail-closed), mở khẩn cấp chỉ do Ba Mẹ qua app (có hạn, nhật ký). Bảng tính năng × OS: `docs/QUAN-LY-DA-NEN-TANG.md`. Phần máy chủ xong; agent từng OS gọi API thật — việc chờ thiết bị / Xcode / Windows | máy chủ: `node --test` mỗi tình huống (mất nhịp, giờ sai, app tắt, admin lạ, không tới máy chủ, mở khẩn cấp hết hạn, cách ly gia đình, bộ chuyển đổi mỗi OS); agent: mỗi dòng mục 3b có ≥ 1 test (`dotnet test`), chạy thật trên Windows tài khoản Standard từng cách lách, ghi `docs/DO-BEN.md` |
| **M4c Cài một chạm + gỡ từ xa** (yêu cầu cứng, master 21/10) | **Enroll**: mỗi OS một trình cài, token ghép (enrollment token một lần, có hạn, băm khi lưu) nhúng sẵn trong tệp tải hoặc QR một lần — không nhập URL / mã tay, xin quyền quản trị MỘT lần (Windows .exe/.msi `/silent` tự tạo dịch vụ + đăng ký; macOS .pkg (+ hồ sơ MDM); Android QR Device Owner hoặc APK + QR; iOS / Apple TV app + QR / hồ sơ MDM; TV không MDM: một bước tầng mạng). Máy chủ: `POST /api/m/goi-cai` ⇒ token, `POST /api/device/ghep-goi` đổi lấy token máy (tái dùng ghepMay). **Unenroll**: chủ gia đình xác thực lại mật khẩu ⇒ lệnh «go» ⇒ agent lấy qua `dong-bo` / `nhip` (`lenh[]`) ⇒ `POST /api/device/lenh/:id/xong` ⇒ máy «đã gỡ», hết cảnh báo mất nhịp. Cơ chế gỡ từng OS: MDM RemoveProfile, Android clearDeviceOwnerApp, Windows gỡ dịch vụ (msiexec /x) | máy chủ: test sai mật khẩu, khác gia đình, vai không phải chủ, báo đã gỡ hai lần, token gói cài dùng lại / hết hạn / sai nền tảng; agent: cài im lặng trên máy sạch + gỡ từ xa chạy thật (việc chờ thiết bị) |
| **M4b mạng — kiểm soát mạng** (master 21/10) | hồ sơ DNS gia đình theo thiết bị (iOS/macOS .mobileconfig, Android DNS riêng tư, Windows DoH) cài trong trình cài một chạm; TV / console là «máy con loại mạng»: giờ + lọc ở tầng DNS, đặt DNS ở router / TV MỘT lần (dắt tay theo hãng VN); nhật ký tóm tắt (tên miền + đếm), báo vượt giờ / mất truy vấn; lớp nhà cung cấp DNS (tự host, NextDNS — chế độ giả khi chưa có khoá). Chi tiết + giới hạn DNS: `docs/QUAN-LY-DA-NEN-TANG.md` mục 5 | máy chủ: `dns.test.ts` (nội dung hồ sơ, xét truy vấn, adapter giả, vượt giờ, mất truy vấn, cách ly gia đình); resolver tự host + thiết bị thật: việc chờ |
| **M5 Quầy AiiCafe + Admin** | `/quay`: một nút quét QR (camera trình duyệt) hoặc gõ mã, kết quả to Hợp lệ / Đã dùng / Hết hạn, âm báo; `/admin`: dashboard, gia đình, ghi nạp quỹ, kho + đối soát voucher, thư viện mẫu, Allowlist hệ thống, tham số, nhật ký kiểm toán | test máy chủ cho quét một lần (song song 2 lượt quét ⇒ 1 thành công); cổng giao diện 0 lỗi cho `cafe-*` |
| **M6 Tích hợp + bản thử** | webhook AiiRob «bài đạt» ⇒ nhiệm vụ tự duyệt (một lần/bài, ngưỡng đạt), deploy bản thử (Vercel preview) | test webhook (chữ ký sai bị từ chối, gửi trùng không cộng đôi); link bản thử chạy được luồng đầu-cuối |

### 3a. Bảng trạng thái (rà soát 22/10 — KE-HOACH, API.md, BRD mục 4)

«Chờ thiết bị» = cần máy thật (Windows Standard, Android, iPhone/Mac), chứng chỉ ký số, tài khoản Apple / Google, push thật (APNs / FCM)
hoặc nhà cung cấp SMS / email — làm khi có, không chặn bản thử.

| Mốc | Trạng thái | Còn lại |
|---|---|---|
| M0 Khung | **xong** (#1) | — |
| M1 Lõi máy chủ | **xong** (#5, #14) | các FR «chưa làm» ở bảng dưới |
| M2 App Ba Mẹ | **xong** — 31 màn thiết kế (#8, #10) + thành viên gia đình, thông báo trong app, giữ chuỗi ngày, xuất CSV (PR rà soát 22/10) | push thật + duyệt từ màn khoá: **chờ thiết bị**. Màn An toàn thiết bị (tuân thủ, mở khẩn cấp, gỡ từ xa): xong (#22) |
| M3 Màn Con | **xong** bản web (#12) | bản native Android + camera thật trên máy Con: **chờ thiết bị** |
| M4 Agent Windows | **xong** mã + bản thử chế độ giám sát (#7, #11, #18, #19, #20) | nghiệm thu chặn thật trên máy Con tài khoản Standard, video: **chờ thiết bị**; ký số trình cài: **chờ chứng chỉ**; nút khay đổi chế độ: master đang làm |
| M4b Độ bền máy con | **xong** phần máy chủ (#13) | agent từng OS (mac / iOS / Android / TV) + `docs/DO-BEN.md` chạy thật: **chờ thiết bị** (Mac / Xcode / tài khoản Apple) |
| M4c Cài một chạm + gỡ từ xa | **xong** phần máy chủ + Windows (#11, #18) | cài im lặng trên máy sạch, gỡ từ xa chạy thật, .pkg / MDM / Android Device Owner / iOS: **chờ thiết bị** |
| M4b mạng | **xong** phần máy chủ (#15) | resolver tự host chạy thật, đặt DNS router / TV thật, NextDNS thật: **chờ thiết bị** |
| M5 Quầy + Admin | **xong** (#9) | — |
| M6 Tích hợp + bản thử | **xong** webhook (#9) + bản thử https://aiigrow.aiilab.vn | trang `/tai` tải trình cài Windows: xong (#25); bí mật chung `AIIROB_WEBHOOK_SECRET`: chờ master; nâng cấp webhook: agent khác đang làm |

FR theo BRD mục 4 còn chưa trọn (mọi FR khác đã có ở máy chủ + màn):

| FR | Phần còn thiếu | Trạng thái |
|---|---|---|
| FR-01.01 | đăng nhập Apple / Google; OTP gửi SMS / email thật; 2FA (khuyến nghị) | Apple / Google, SMS: **chờ thiết bị / tài khoản** (khoá OAuth, nhà cung cấp SMS); 2FA: chưa làm |
| FR-01.01 | một tài khoản là Thành viên của NHIỀU gia đình | giai đoạn này mỗi tài khoản một gia đình (tài khoản còn trống nhận lời mời thì chuyển nhà được) — CẦN ANH quyết |
| FR-01.04 | mời Ba / Ông Bà quyền Phê duyệt / Chỉ xem, link / mã / QR, hết hạn 72 giờ, đổi quyền, mời ra | **xong** (PR rà soát 22/10) |
| FR-01.04 | «cần cả hai người duyệt» cho loại yêu cầu lớn | chưa làm (Should) |
| FR-01.05, 02.01–02.03 | thực thi trên máy Con (chặn, AppLocker, bộ lọc trình duyệt) | Windows có mã; chạy thật: **chờ thiết bị** |
| FR-02.04 | chế độ nghỉ hè (lịch khác), «Tạm mở» thủ công | chưa làm (Khoá ngay / Mở lại đã có) |
| FR-02.06 | Chế độ Tập trung | chưa làm (Should); phần thực thi trên máy: **chờ thiết bị** |
| FR-03.02 | bằng chứng video ≤ 30 giây, ghi âm | **chờ thiết bị** (camera / micro thật) |
| FR-03.05 | tuỳ chọn hết hạn điểm (mặc định tắt) | chưa làm |
| FR-03.06 | Ba Mẹ đóng băng chuỗi ngày 1 lần / tuần | **xong** (PR rà soát 22/10) |
| FR-04.04 | «nhận xét cảm ơn» khi nhận quà | chưa làm (không bắt buộc) |
| FR-05.02 | đồng ý / từ chối ngay trên thông báo màn khoá | **chờ thiết bị** (push thật) |
| FR-06.02 | xuất CSV | **xong** (PR rà soát 22/10); PDF: chưa làm; email tóm tắt tuần: **chờ** nhà cung cấp email |
| FR-07.02 | cảnh báo nghiêm trọng qua push + email / SMS | **chờ thiết bị** / nhà cung cấp |
| FR-08.01 | thông báo trong app: danh sách, gộp «Ken vừa nộp 3 nhiệm vụ», chưa đọc, giờ yên lặng, tắt từng nhóm (riêng mỗi Ba Mẹ) | **xong** (PR rà soát 22/10); push (Expo / APNs / FCM): **chờ thiết bị** |
| FR-09.06 | quản lý phiên bản agent, canary, bản tối thiểu | chưa làm (Should) |
| FR-09.07, 10.03 | gói trả phí, nhập Screen Time / Family Link | ngoài giai đoạn (mục 5.5) |
| FR-10.01 | SSO AiiGrow ↔ AiiRob, tiến độ học | chờ AiiRob (webhook bài đạt đã có) |

### 3b. Độ bền máy con — cách lách → biện pháp

Giới hạn cứng: KHÔNG ẩn mình, không chống gỡ trái phép (không thủ đoạn giữ app khi người có quyền gỡ — gỡ chính hãng luôn dùng được và
được báo), không tự cài lại lén, minh bạch với Ba Mẹ VÀ với Con (Con thấy rõ máy đang được AiiGrow quản lý, vì sao đang khoá), qua được
xét duyệt App Store / Google Play. Chỉ cơ chế chính hãng Apple / Google / Microsoft cho phép (Windows: tài khoản Standard, Windows Service
LocalSystem, AppLocker, chính sách cục bộ; Android: Android Enterprise Device Owner / DevicePolicyManager; iOS / macOS: Screen Time API
FamilyControls / ManagedSettings / DeviceActivity, hồ sơ MDM) + phát hiện và báo Ba Mẹ. Không có mã chủ / cửa sau / «chế độ cục bộ» nào:
mọi nới lỏng chỉ do Ba Mẹ duyệt qua máy chủ.

Khung chung (cách Intune compliance / Workspace ONE «Device Last Seen» / Jamf nhóm thông minh): agent gửi **nhịp** `POST /api/device/nhip`
(còn sống, phiên bản, trạng thái khoá, giờ máy, tài khoản đang đăng nhập + nhóm quản trị, app quản lý còn bật không, đã mất kết nối bao
lâu, sắp tắt / ngủ) ⇒ máy chủ chấm **điểm tuân thủ** = 100 − tổng điểm trừ (giờ sai 40, app quản lý tắt 50, admin lạ 40, không tới máy chủ
30, ngoài vòng 100); dưới `tuan_thu_nguong` (80) ⇒ **khoá giải trí** (fail-closed: `phien/xet`, `phien/mo` từ chối, phiên đang chạy dừng ở
nhịp kế tiếp); Ba Mẹ **mở khẩn cấp** qua app (≤ `mo_khan_cap_toi_da_phut` = 120, ghi nhật ký, báo Ba Mẹ khác; hết hạn ⇒ khoá lại).
Mất nhịp quá `ngung_chay_phut` (15; điện thoại `mat_nhip_di_dong_phut` = 180 vì OS giới hạn chạy nền) mà không báo tắt / ngủ sạch ⇒ máy
**ngoài vòng kiểm soát** + cảnh báo nghiêm trọng MỘT lần cho mỗi lần mất nhịp.

| # | Cách lách | Biện pháp | Test |
|---|---|---|---|
| 1 | Đóng / tắt app, kill tiến trình | Windows: dịch vụ LocalSystem (Con là Standard nên không dừng / kill được), tự khởi động lại khi lỗi, dịch vụ mở lại khay; Android: Device Owner; iOS: ủy quyền FamilyControls `.child`. Agent báo `thanhPhan` / `appQuanLyBat` mỗi nhịp; máy chủ: thành phần tắt ⇒ trừ 50 + khoá + cảnh báo; im lặng quá ngưỡng ⇒ ngoài vòng + cảnh báo một lần | máy chủ ✅ `tuan-thu.test.ts` (app tắt, mất nhịp ⇒ một cảnh báo, tắt sạch không báo); agent: khay chết ⇒ dịch vụ mở lại |
| 2 | Đổi / lùi đồng hồ máy | giờ thật lấy từ máy chủ (`serverTime`); lệch > `lech_gio_phut` (10) ⇒ trừ 40 + khoá giải trí, màn «Giờ máy không đúng», cảnh báo (chung khoá chống trùng với dong-bo); Android ép giờ tự động (setAutoTimeEnabled); iOS không ép được ⇒ chỉ so + báo | máy chủ ✅ giờ sai ⇒ hạ điểm + khoá + một cảnh báo; agent: lùi giờ khi offline vẫn trừ đúng phút |
| 3 | Gỡ cài đặt / xoá app | gỡ chính hãng cần quyền quản trị (Con là Standard) + mật khẩu AiiGrow của Ba Mẹ, hoặc gỡ từ xa (M4c, chủ gia đình xác thực lại); thử gỡ sai ⇒ sự kiện + cảnh báo; thiết bị biến mất ⇒ ngoài vòng + cảnh báo; iOS thu hồi quyền ⇒ app quản lý tắt | máy chủ ✅ gỡ sai mật khẩu (M4), gỡ từ xa (`lenh-may.test.ts`), ngoài vòng |
| 4 | Tạo / dùng tài khoản khác, đăng nhập bằng tài khoản quản trị | Standard không tạo được tài khoản; agent gửi nhóm Administrators + tài khoản đang dùng mỗi nhịp; tài khoản quản trị Ba Mẹ chưa xác nhận (`POST /api/m/may/:id/tai-khoan-tin-cay`) ⇒ trừ 40 + khoá + cảnh báo; chính sách áp cho MỌI tài khoản không phải quản trị | máy chủ ✅ admin lạ ⇒ khoá tới khi Ba Mẹ xác nhận; agent: luật AppLocker phủ tài khoản mới |
| 5 | Chặn mạng / tắt Wi-Fi / VPN, proxy, chặn máy chủ AiiGrow | mất mạng ⇒ giữ chính sách cuối, không mở phiên quá số điểm đã đồng bộ, sự kiện xếp hàng gửi sau; agent báo `matKetNoiPhut` ⇒ quá ngưỡng: trừ 30 + khoá + cảnh báo; im lặng ⇒ ngoài vòng; VPN / proxy lạ ⇒ sự kiện + báo | máy chủ ✅ không tới máy chủ ⇒ khoá; gửi bù không mất (M4); agent: offline không mở phiên khi hết điểm |
| 6 | Khởi động chế độ an toàn | Windows: dịch vụ đăng ký chạy trong Safe Mode, ghi sự kiện + báo; Android: DISALLOW_SAFE_BOOT; macOS: không bảo đảm ⇒ mất nhịp ⇒ ngoài vòng | agent: phát hiện cờ khởi động an toàn ⇒ sự kiện; máy chủ ✅ bộ chuyển đổi ghi rõ từng OS |
| 7 | Tự mở khoá / tự cộng điểm (sửa cấu hình, gửi API giả) | cấu hình + token mã hoá DPAPI, thư mục chỉ SYSTEM/Admin; điểm, phiên, mở khoá chỉ máy chủ quyết; API máy con không có lệnh «mở khoá» nào; **không có mã mở khẩn cấp offline / chế độ cục bộ** — mở khẩn cấp chỉ Ba Mẹ cấp qua máy chủ, có hạn, ghi nhật ký | máy chủ ✅ token máy không gọi được API Ba Mẹ (M1); mở khẩn cấp hết hạn ⇒ khoá lại; vai Chỉ xem không mở được |
| 8 | Khôi phục gốc / cài lại OS / đổi MAC (TV, tầng mạng) | không chặn (giới hạn cứng) ⇒ máy mất nhịp ⇒ ngoài vòng + báo Ba Mẹ; TV: tắt «địa chỉ riêng» Wi-Fi, thiết bị lạ ⇒ báo | máy chủ ✅ ngoài vòng; bộ chuyển đổi `khoi_phuc_goc` = «chỉ báo Ba Mẹ» mọi OS |

Ngoài giai đoạn này (ghi `docs/VIEC-CHO.md`): macOS agent + iOS màn Con (cần Mac/Xcode, Screen Time API), Android agent native (quyền
Usage Access/Accessibility), thanh toán gói, nhập Screen Time/Family Link, OTP SMS thật.

## 4. Luật làm việc

- Không tạo API key/token/tài khoản dịch vụ mới; không Docker; một việc nặng (build/test) một lúc; không deploy PROD.
- Chữ trên màn: tiếng Việt đủ dấu, gọi «Ba Mẹ», «Con»; không dùng chữ «trainer». Mascot/ảnh lấy từ `tinh/linh-vat/` của thiết kế; ảnh mới
  (5 cảnh trong README thiết kế) xin master tạo bằng Gemini — chưa có thì dùng ảnh gần nhất đã có, không vẽ SVG thay mascot.
- Máy này không chạy python ⇒ mọi test viết bằng `node --test` (server) và `dotnet test` (agent).

## 5. Cần master quyết (đề xuất mặc định trong ngoặc — chưa trả lời thì làm theo đề xuất)

1. **OTP đăng ký** (BRD bắt buộc): chưa có nhà cung cấp SMS/email ⇒ (làm sẵn luồng OTP, chế độ thử hiện mã trên màn; gắn nhà cung cấp khi
   master có khoá).
2. **Lưu ảnh bằng chứng**: chưa có kho tệp ⇒ (lưu trong Postgres dạng bytea, nén ≤ 300 KB/ảnh, xoá sau 90 ngày; đổi sang Vercel Blob khi
   master cấp).
3. **CSDL bản thử**: (master tạo một DB Neon riêng cho AiiGrow preview và đặt `DATABASE_URL` trên Vercel; trước đó bản thử dùng PGlite,
   không giữ dữ liệu giữa các lần khởi động).
4. **AiiRob ⇒ AiiGrow**: cần một bí mật chung để ký webhook ⇒ (master đặt `AIIROB_WEBHOOK_SECRET` cả hai bên; M6 mới cần).
5. Câu hỏi mở BRD 11.4 ⇒ (giai đoạn 1: Windows + Android cho Con, Ba Mẹ iOS/Android/Web; voucher chỉ trả trước; cấm ứng điểm (chỉ ngoại
   lệ thêm giờ không trừ điểm); điểm không hết hạn; Admin không xem ảnh bằng chứng; chưa làm gói trả phí).
