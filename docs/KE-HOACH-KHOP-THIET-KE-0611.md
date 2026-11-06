# Kế hoạch: khớp thiết kế Nghi cập nhật 05–06/11 + 2 lỗi Nghi báo (06/11/2026)

Thanh 06/11: *«sau 19h lên plan và thực hiện hết chúng»*. Nối tiếp `KE-HOACH-KHOP-THIET-KE-0511.md` (luật L1–L12 vẫn
hiệu lực, trừ chỗ bị đảo ở dưới). Thiết kế xuất lại 06/11 19:30 vào `docs/thiet-ke-chot/` (436 màn, 21 hành trình — `INDEX.md`).
Xem màn nào đổi so với 05/11: `git diff 38f4082 -- docs/thiet-ke-chot/<hành-trình>/` (38f4082 = main trước lượt này).

**Thiết kế đã chốt thắng BRD / mã cũ.** Thiết kế không nói thì giữ hành vi cũ. Luật «các OS đồng bộ tính năng»: luật nghiệp vụ
mới áp cho Win/Mac/Android/iOS cùng lô.

## 1. Lỗi Nghi báo 06/11 (làm trước)

| # | Lỗi | Hướng |
|---|---|---|
| B1 | Ba Mẹ chọn **«Mở hết»** mà máy Con vẫn khoá như **«Chỉ app được phép»** | lần theo `che_do_chan` từ server (`/api/device/nhip`, `chuyen-doi.ts`) tới từng agent (Android `QuyetDinh.kt`, iOS `TinhKhien.swift`, Win, Mac); «Mở hết» = không chặn app nào trừ web người lớn/cờ bạc + giờ ngủ/hết giờ/khoá máy vẫn chặn. Test cho mỗi tầng |
| B2 | **Popup cập nhật nhảy ~mỗi 1 phút** | kiểm vòng tự cập nhật (Android `CapNhatApp.kt`/`logic/CapNhat.kt` gọi mỗi nhịp 60s; Win/Mac tương tự): chỉ hỏi khi có bản mới thật (so phiên bản đúng), người dùng đã bỏ qua/đang cài thì không hỏi lại trong ≥6 giờ, không hỏi lặp khi PackageInstaller đang chờ |

## 2. Luật nghiệp vụ mới (đọc từ thiết kế 05–06/11)

| # | Luật | Đảo/đổi |
|---|---|---|
| L13 | **PIN theo bé** trên máy dùng chung (Win, Mac, ĐT): máy khoá → **chọn tên → nhập PIN 4 số**; sai 5 lần chờ 15 giây; «Quên PIN» = gửi Ba Mẹ đặt lại; **Ba Mẹ mở máy bằng mã** (mã mở máy của máy đó) → trạng thái «Ba Mẹ đang dùng máy» (không tính giờ con); **«Đổi bé / Đăng xuất»** ở thanh bên/menu; **giờ, sao, nhiệm vụ tính theo bé đang đăng nhập**. Ba Mẹ đặt PIN ở form **Thêm con**; Hồ sơ con có dòng **«PIN vào máy · Đặt lại»**. Windows: sau cài máy khoá, nút «Mở màn chọn tên»; một tài khoản Windows giới hạn dùng chung cho các bé. Máy chỉ gán 1 bé: vẫn hỏi PIN khi mở khoá | **đảo L5** — giữ/khôi phục `children.pin_hash`, `pin_sai`, khoá tạm |
| L14 | **Quà = bảng giá sao.** 7 quà mặc định: Bữa tối con chọn món 50 · Kem 100 · AiiCafe 20k 200 · Đồ chơi nhỏ 200 · Xem phim (cuối tuần) 300 · AiiCafe 50k 500 · quà lớn 800 (lấy đúng tên/số trong màn). Con đổi ⇒ **sao bị giữ** chờ Ba Mẹ trao; Ba Mẹ **trao** (trừ hẳn) hoặc **huỷ** (hoàn sao). **Voucher AiiCafe có QR + hạn dùng** (bật lại phần voucher đã ẩn). **Thư viện mẫu 5 loại**; **điều kiện**: chỉ cuối tuần, tối đa X lần/tháng, tồn kho. «Thêm 30 phút» KHÔNG nằm trong danh sách quà — là nút đổi sao lấy phút riêng (L2) | **đảo L10** phần voucher |
| L15 | **Onboarding Ba Mẹ thêm bước «Chọn quà»** (màn `them-s416tfdj`), thanh tiến độ **5 chấm** | `thiet-lap/*` |
| L16 | **App Con trên điện thoại bản «Dịu»** (`con-dt-*`, 76 màn + `con-dt-android` 4 màn riêng Android): nền kem, MỘT màu nhấn xanh, vàng chỉ cho sao, chữ Nunito, nút cao 52px. Ghép bằng mã/QR → xin quyền Thời gian sử dụng → hằng ngày (giờ còn, nhiệm vụ, nộp ảnh/ghi âm/viết, quà, xin thêm, bị chặn, hết giờ/giờ ngủ, mất mạng) | thay giao diện Clay của phía Con trên ĐT |
| L17 | **Mac làm lại** (`con-cai-mac`, 60 màn): .dmg kéo vào Applications → Gatekeeper «Mở» → mã 6 số / một chạm / mã sai/hết hạn/mất mạng → bật quyền → xong → máy khoá, chọn tên + PIN (L13) → Hôm nay, nhiệm vụ, quà, giờ ngủ, giờ học, thông báo; khung Mac (thanh menu, Dock) | 05/11 ghi «Mac giữ nguyên» — nay bỏ, làm theo màn |
| L18 | **Trang tải `web-tai`** (8 màn): tự nhận hệ điều hành, nút tải đúng bộ cài, trạng thái «Đang tải», «Máy quá cũ», hướng dẫn sau tải | server trang `/tai` |
| L19 | Lặt vặt Ba Mẹ: chi tiết máy có **«Mã mở máy khi mất mạng»** (`them-rz77kk45`, `them-s8nltlaa`) = mã đổi theo thời gian máy con kiểm được khi offline; Hôm nay có dòng **«máy con mất mạng»**; chuông đếm đúng số mục Cần Ba Mẹ để ý; **Nhắn tin AiiGrow có gợi ý nhanh** | server + mobile |

## 3. Chia việc (mỗi agent một worktree + nhánh + PR; luật làm việc = mục 3 kế hoạch 0511)

**Đợt 1 (song song):**

| Agent | Model | Phạm vi |
|---|---|---|
| B `loi-0611` | Opus | B1 + B2, mọi tầng (server + 4 agent). Sửa nhỏ, có test, PR riêng |
| S3 `pin-qua-may-chu` | Opus | server: L13 (PIN theo bé: đặt/đặt lại, kiểm PIN qua `/api/device/*`, khoá 5 lần/15s, quên PIN → yêu cầu Ba Mẹ, mã mở máy Ba Mẹ, đăng nhập/đổi bé trên máy, giờ+sao tính theo bé), L14 (quà, giữ/trao/huỷ hoàn, voucher QR+hạn, mẫu, điều kiện, 7 quà mặc định khi tạo con/nhà), L19 phần máy chủ (mã mở máy offline theo máy, cờ mất mạng hôm nay, đếm chuông). `docs/API.md` đủ mọi trường mới |
| T `web-tai` | Sonnet | L18 trang `/tai` trong `server/app` theo `docs/thiet-ke-chot/web-tai/` |

**Đợt 2 (sau S3 merge; build nặng xếp hàng qua `tools/thiet-ke-chot/nang.sh`):**

| Agent | Model | Hành trình | Nơi sửa |
|---|---|---|---|
| M4 | Opus | `bm-lan-dau`, `bm-hang-ngay`, `bm-cai-dat` (màn đổi) | mobile Ba Mẹ: bước Chọn quà + 5 chấm, PIN ở Thêm con + Hồ sơ, quản lý quà (bảng giá, mẫu, điều kiện, trao/huỷ, voucher), mã mở máy, mất mạng, chuông, gợi ý chat |
| D1 | Opus | `con-dt-*` | mobile `tre/*` (phía Con trên ĐT Android/web) theo bản Dịu + PIN chọn tên; agent-android 4 màn `con-dt-android` |
| D2 | Opus | `con-dt-*` | agent-ios `App/` SwiftUI theo bản Dịu + PIN |
| W3 | Opus | `con-cai-win`, `con-het-gio`, `con-ngay-thuong`, `con-mat-mang`, `con-bi-chan` (màn đổi) | agent-win: chọn tên + PIN, Ba Mẹ mở máy, Đổi bé, quà bảng giá |
| C1 | Opus | `con-cai-mac` | agent-mac làm lại theo 60 màn |

## 4. Sau cùng (phiên chính)

Dựng localhost từ `origin/main`, đi lại hành trình đổi; deploy VPS một lần `scripts/deploy-vps.sh`; build lại APK Ba Mẹ +
agent Android, TestFlight (Ba Mẹ + Con iOS), bộ cài Win (artifact `setup-goc`) và Mac; báo Thanh, nhắn Nghi thử.

## 5. Câu còn mở (làm theo mặc định trong ngoặc)

1. Bé cũ chưa có PIN (máy hỏi PIN lần đầu ⇒ Ba Mẹ đặt; trước khi đặt, chọn tên vào thẳng).
2. Sao đang giữ khi quà bị xoá (hoàn sao).
3. Voucher AiiCafe: mã QR do máy chủ sinh, hạn 30 ngày, quầy quét bằng trang đã có (nếu chưa có thì chỉ hiện mã + hạn).
