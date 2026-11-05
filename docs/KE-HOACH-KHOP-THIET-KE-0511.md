# Kế hoạch: làm app Ba Mẹ + Con Windows giống thiết kế đã chốt (05/11/2026)

Thanh 05/11: *«ok viết plan rồi cho multi sub agent làm cho giống design đi»*. Thiết kế Nghi chốt 03–04/11 trên bàn
aiigrow-figma, đã xuất ra `docs/thiet-ke-chot/` (305 màn, 13 hành trình — xem `INDEX.md`; mỗi màn là HTML bản hiện hành,
`data-toi` = màn đích khi bấm; cột «ý đồ» là ghi chú lúc Nghi thay màn). Xuất lại bằng
`python3 tools/thiet-ke-chot/xuat.py ~/OFFLINE_FILES/Code/aiigrow-thiet-ke/brainstorm-ui docs/thiet-ke-chot`.

**Thiết kế đã chốt thắng BRD / CHOT-BRD.md / mã cũ khi khác nhau.** Chỗ nào thiết kế không nói thì giữ hành vi cũ.
Màn Mac (`con-cai-mac`) giữ nguyên giao diện, nhưng luật nghiệp vụ mới (sao, 2 chế độ chặn, ngoại lệ) áp cho MỌI hệ điều hành
(luật «các OS đồng bộ tính năng»).

## 1. Luật nghiệp vụ mới (đọc từ thiết kế)

| # | Luật mới | Mã hiện tại phải đổi |
|---|---|---|
| L1 | **Sao thay điểm** ở mọi chữ hiển thị. Con làm nhiệm vụ được sao; **10 sao = 10 phút** (1 sao = 1 phút, cấu hình được) | chữ «điểm» ~246 tệp; cột DB `diem` giữ tên, chỉ đổi nghĩa/nhãn; API thêm trường `sao` song song `diem` một bản rồi bỏ |
| L2 | **Quỹ giờ chơi mỗi ngày** (ngày thường / cuối tuần riêng, chip 30/60/90 hoặc gõ phút) + **giờ ngủ** (bánh xe). Mọi app được phép dùng chung quỹ. Đổi sao → phút **cộng vào quỹ hôm nay**. **Bỏ trừ điểm theo từng app / phiên điểm có giá** | `play_sessions` (gia_phan_nghin, diem_tru), luật `phien_diem`, `tran_thoi_gian`, `chuyen-doi.ts`, `choi-tre.ts`, agent playOfflineMinutes |
| L3 | **Hết giờ**: con chọn «Dùng sao» (15/30/60) hoặc «Xin Ba Mẹ» (+ lời nhắn). **Giờ ngủ / Ba Mẹ khoá máy**: không thêm giờ, chỉ «Xin Ba Mẹ mở ngoại lệ» (1 app hoặc cả máy, có hạn phút) → chờ → được / chưa được | `requests` có `ngoai_le`, `pham_vi` — sửa luồng + màn |
| L4 | **Chặn app chỉ 2 chế độ: «Mở hết» / «Chỉ app được phép» (mặc định, máy mới cũng vậy)**. App/web lạ ⇒ con «Xin Ba Mẹ duyệt» (lý do không bắt buộc), tự gửi yêu cầu, chờ, kết quả. **Không dùng điểm/sao để mở app.** Web cờ bạc/người lớn luôn chặn | thêm `che_do_chan` theo con; UI bỏ «Chế độ: Tự do», bỏ «Giám sát/Chặn thật» khỏi màn Ba Mẹ (máy luôn chặn thật) |
| L5 | **Bỏ PIN hồ sơ con** | `children.pin_hash`, `pin_sai`, màn `tre/pin.tsx`, phiên PIN trên máy dùng chung (đổi người bằng chọn tên) |
| L6 | **Bỏ mã mời, bỏ vai Ba/Mẹ.** Mời người nhà bằng **SĐT hoặc email** → link mời; người được mời đăng ký/đăng nhập bằng Google/Facebook/SĐT đều tự thấy lời mời, một nút «Vào nhà cùng <tên>». Chỉ **2 quyền: Ba Mẹ** (làm được hết) / **Người trông giúp** (xem, duyệt, khoá máy; không đổi cài đặt). Danh sách «Đang chờ nhận lời · Gửi lại» | `parents.vai` chu/duyet/xem → `ba_me`/`trong_giup` (chu+duyet→ba_me, xem→trong_giup; vẫn giữ người tạo nhà làm chủ để xoá nhà); `loi_moi` thêm `dinh_danh`, bỏ nhập mã |
| L7 | **Lần đầu dùng**: chỉ phụ huynh đăng ký; bỏ «Bật thông báo», bỏ «Ba hay Mẹ»; gộp Welcome+Chào, Thiết bị+Ghép máy; tên con → Giờ chơi (+ khối chặn 2 chế độ) → Chọn app (lưới icon, «Thêm app khác») → Ghép máy → Đang chờ → Đã ghép → Xong. Nhánh «Tôi được mời vào nhà» riêng (không tạo con) | `thiet-lap/*` |
| L8 | **Ghép máy**: một nội dung cho cả Lần đầu và Ghép thêm máy — **mã 6 số hạn 10 phút** + QR + hàng chia sẻ (Zalo, Tin nhắn, Messenger, Sao chép link, Khác), «Đã gửi, chờ máy của con». Link bộ cài mang sẵn mã gia đình ⇒ tự ghép; mã 6 số là dự phòng. Ghép thêm máy: «Máy mới của ai» + «Cài giống máy trước», không chọn loại máy | `taoMaGhep` 15 → 10 phút, `goi_cai`, sao chép luật máy trước |
| L9 | **Nhiệm vụ theo bộ** (vd bộ «Tự lập»). Con nộp **ảnh / ghi âm / viết**; «Học với AiiRob» tự chấm. Ba Mẹ duyệt (+sao, lời khen) hoặc **nhờ làm lại**; duyệt cả loạt. **Thêm việc riêng** có: tên + gợi ý, hình, giao con nào, số sao, lặp lại, giờ nhắc, cách báo xong, duyệt hay tự cộng sao | `tasks` thêm `hinh`, `lap_lai`, `gio_nhac`, `bo`; `bang_chung` thêm `ghi_am`/`viet`/`tu_cham`; trạng thái `lam_lai` |
| L10 | **Quà đổi bằng sao** → «Đã gửi Ba Mẹ» → Ba Mẹ trao (chờ trao / đã trao). **Bỏ phiếu AiiCafe, mã QR, quà «30 phút Minecraft»** | `rewards`/`redemptions` giữ; ẩn API/UI voucher + quỹ (không xoá bảng) |
| L11 | **Mất mạng**: vẫn tính giờ, vẫn chặn; bài nộp lúc mất mạng tự gửi khi có mạng; lỗi cần người lớn có «Gọi Ba Mẹ / Hỏi AiiGrow» | agent-win + tre |
| L12 | Trang chủ Ba Mẹ «Hôm nay» xếp theo mức gấp: con đang làm gì + còn bao nhiêu phút (Khoá máy / Cho thêm giờ trên thẻ, bảng trượt) → con đang xin → máy chưa bảo vệ → nhiệm vụ chờ duyệt. Hồ sơ con = ảnh+tên+tuổi+sao, mỗi cài đặt 1 dòng. Hỗ trợ dạng chat + gợi ý nhanh | màn mobile |

Phong cách chung mọi màn: mỗi màn một việc, ít chữ nhiều hình (icon 3D + Rob), CTA nói rõ kết quả, gọi «Ba Mẹ» (không «bố mẹ»),
con mẫu Bảo Anh 9 tuổi. HTML trong `docs/thiet-ke-chot/` là chuẩn bố cục/chữ; dùng token Clay sẵn có (`docs/THIET-KE-CLAY.md`), không chép CSS thô.

## 2. Chia việc (sub agent, mỗi agent một worktree + một nhánh + PR)

**Đợt 1 — nền nghiệp vụ máy chủ (song song, Opus):**

| Agent | Phạm vi | Luật |
|---|---|---|
| S1 `sao-gio-choi` | server: sao, quỹ phút ngày + đổi sao, bỏ phiên điểm theo app, hết giờ/ngoại lệ (L3 phần máy chủ), nhiệm vụ theo bộ + bằng chứng ghi âm/viết + làm lại, quà trao tay, ẩn voucher; Policy gửi agent (quỹ phút, ngưỡng offline mới) | L1 L2 L3 L9 L10 |
| S2 `gia-dinh-chan` | server: 2 quyền + mời SĐT/email + nhận lời qua link, bỏ PIN, `che_do_chan` 2 chế độ + app lạ tự xin + web cấm luôn chặn, ghép máy 10 phút/QR/«cài giống máy trước»/link bộ cài tự ghép, onboarding chỉ phụ huynh | L4 L5 L6 L7 L8 |

Cả hai sửa `server/lib/schema.ts` (chỉ THÊM `alter table … add column if not exists` ở cuối, không sửa dòng cũ) và cập nhật
`docs/API.md` cho mọi trường/đường mới — đợt 2 đọc API từ đây. Ai merge sau thì rebase.

**Đợt 2 — giao diện (song song sau khi đợt 1 merge):**

| Agent | Hành trình (`docs/thiet-ke-chot/<id>/`) | Nơi sửa |
|---|---|---|
| M1 | `bm-lan-dau`, `bm-ghep-may` (+ trang tải bộ cài `bm1-web-*`) | mobile `chao`, `dang-ky`, `dang-nhap`, `otp`, `moi`, `thiet-lap/*`, `may/*`; server trang `/tai` |
| M2 | `bm-hang-ngay`, `bm-duyet` | mobile `(tab)/hom-nay`, `cho-duyet`, `diem-qua`, `duyet/*`, `gio/*`, `ho-so/*`, `vi/*`, `yeu-cau/*`, `giao-nv`, `canh-bao/*`, `bao-cao` |
| M3 | `bm-ung-dung`, `bm-cai-dat` | mobile `app-web`, `ung-dung/*`, `web/*`, `(tab)/cai-dat`, `thanh-vien`, `ho-tro`, `admin-ho-tro`, `thong-bao/*`, `quy` |
| W1 | `con-ngay-thuong`, `con-xin` | agent-win khay `AppForm.cs` (Hôm nay, Nhiệm vụ, Nộp bài, Sao & quà, Tin nhắn, hộp Thêm giờ chơi) |
| W2 | `con-cai-win`, `con-bi-chan`, `con-het-gio`, `con-mat-mang` | agent-win `SetupForm.cs`, `BlockScreenView`, màn khoá/đếm ngược/giờ ngủ, `KetNoiView`, cập nhật |
| K1 | logic con trên OS khác (giao diện giữ nguyên bố cục) | mobile `tre/*` (Android/web), agent-mac, agent-android, agent-ios: chữ sao, 2 chế độ, đổi sao lấy phút, xin ngoại lệ, bỏ PIN |

Thành phần dùng chung của mobile (`src/lib`, `src/components`): chỉ THÊM, không đổi chữ ký cái đang dùng; cần đổi thì làm trong
nhánh riêng nhỏ, merge trước.

## 3. Luật làm việc cho mọi agent

- Model: chỉ Opus/Sonnet. Mỗi agent một worktree `~/OFFLINE_FILES/Code/aiigrow-wt-<tên>` từ `origin/main`, không `git checkout` ở thư mục người khác.
- **Máy 16 GB — việc nặng phải xếp hàng:** mọi `npm test`, `next build`, `tsc`, `gradlew`, `xcodebuild`, `dotnet` chạy qua
  `tools/thiet-ke-chot/nang.sh <lệnh>` (khoá chung, chờ tối đa 15 phút). Không chạy Docker, không deploy.
- Mọi vòng chờ có hạn ≤15 phút; không chờ CI. Xong: PR → skill `code-review` (≤3 lượt) → merge squash → báo và DỪNG.
  CI main đỏ ⇒ `git revert` commit merge của mình.
- Nghiệm thu: test cục bộ xanh + (UI) chụp màn hình bản dựng, đặt cạnh HTML thiết kế, ghi lệch còn lại vào PR.
- Không deploy hosting/Worker/store. Deploy theo lô sau khi phiên chính kiểm localhost.

## 4. Sau cùng (phiên chính)

Dựng localhost từ `origin/main`, đi lại 13 hành trình so với `docs/thiet-ke-chot/`, rồi deploy một lần theo `deploy-prod.sh`.
Agent Windows: lấy artifact `setup-goc` khi job build xong, Thanh cài thử trên máy Con.

## 5. Câu còn mở (không chặn việc — làm theo mặc định trong ngoặc)

1. Người dùng cũ đang có điểm: đổi 1 điểm = 1 sao (giữ nguyên số).
2. «Giám sát / Chặn thật» bỏ khỏi UI Ba Mẹ (máy luôn chặn thật; agent cũ vẫn nhận `cheDo: chan`).
3. Voucher AiiCafe đã phát còn hạn: vẫn dùng được ở quầy, không phát mới.
