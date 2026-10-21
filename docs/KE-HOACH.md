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
| **M5 Quầy AiiCafe + Admin** | `/quay`: một nút quét QR (camera trình duyệt) hoặc gõ mã, kết quả to Hợp lệ / Đã dùng / Hết hạn, âm báo; `/admin`: dashboard, gia đình, ghi nạp quỹ, kho + đối soát voucher, thư viện mẫu, Allowlist hệ thống, tham số, nhật ký kiểm toán | test máy chủ cho quét một lần (song song 2 lượt quét ⇒ 1 thành công); cổng giao diện 0 lỗi cho `cafe-*` |
| **M6 Tích hợp + bản thử** | webhook AiiRob «bài đạt» ⇒ nhiệm vụ tự duyệt (một lần/bài, ngưỡng đạt), deploy bản thử (Vercel preview) | test webhook (chữ ký sai bị từ chối, gửi trùng không cộng đôi); link bản thử chạy được luồng đầu-cuối |

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
