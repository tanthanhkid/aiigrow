# Kế hoạch: khớp thiết kế Nghi sửa 07–14/11 (14/11/2026)

Nghi 14/11: «xong thiết kế, qua code — sửa hết, không riêng luồng Chặn». Thiết kế xuất lại 14/11 vào `docs/thiet-ke-chot/`
(392 màn, 32 hành trình — `INDEX.md`). **Danh sách màn đổi / mới / xoá so với 06/11: `docs/thiet-ke-chot/DOI-1411.md`.**
Bản cũ của một màn: `git show 650b79b:docs/thiet-ke-chot/<hành-trình-cũ>/<nn>-<key>.html` (tìm tệp theo key bằng `git ls-tree -r --name-only 650b79b docs/thiet-ke-chot | grep <key>`).

**Thiết kế đã chốt thắng BRD / mã cũ.** Thiết kế không nói ⇒ giữ hành vi cũ. Luật «các OS đồng bộ tính năng» vẫn áp.
Luật cũ L1–L19 (`KE-HOACH-KHOP-THIET-KE-0511.md`, `-0611.md`) vẫn hiệu lực trừ chỗ bị đảo dưới đây.

## 1. Quyết định nghiệp vụ mới (07–14/11) — đọc đủ trước khi code

Chi tiết từng quyết định nằm ở ghi nhớ của Nghi: `C:\Users\Kim Nghi\.claude\projects\E--tro-ly-AiiGrow\memory\<tệp>.md` (chỉ ĐỌC).

| # | Luật | Ghi nhớ |
|---|---|---|
| N1 | Tab **«Chặn»** cho Ba Mẹ: thanh **5 tab** Hôm nay · Nhiệm vụ · Chặn · Báo cáo · Cả nhà (icon khiên). Chế độ đang bật thấy ĐẦU TIÊN. | luong-ung-dung-web-lam-lai |
| N2 | Hai chế độ tên **«Mở hết» / «Chặn app & web»** (thay «Chỉ app được phép», «Chặn app lạ», «Chỉ app Ba Mẹ chọn») ở MỌI chỗ hiển thị, kể cả server (`TEN_CHE_DO_CHAN`), thông báo, app Con. Mã nội bộ `chi_app_duoc_phep` giữ nguyên. | che-do-chan-2-kieu |
| N3 | **Đèn 3 màu** cho từng app VÀ từng trang web (ngang chức năng): Xanh «Dùng thoải mái» (web: «Vào thoải mái») = luật `hoc`/`cho_phep`, KHÔNG trừ giờ chơi · Vàng «Tính giờ» = `giai_tri`, trừ vào **quỹ giờ chơi chung** (không giới hạn phút riêng từng app; hết quỹ thì mọi app vàng khoá) · Đỏ «Chặn» = `chan`. Chỉ ghi «Tính giờ»/«Trừ vào giờ chơi», KHÔNG ghi còn bao nhiêu phút / tổng. | luong-ung-dung-web-lam-lai, gio-choi-va-diem, hang-ngay-dong-bo-lan-dau |
| N4 | Danh sách App / Web chia 3 nhóm đèn; nhóm Đang chặn có nút **«Gỡ chặn»** (mở màn chọn đèn). Chọn đèn → **Lưu → về danh sách**. Bỏ màn «Đã chặn …». | luong-ung-dung-web-lam-lai |
| N5 | **Thêm app / Thêm web = tìm trước, làm hết trong 1 màn**: gõ đúng tên/địa chỉ mới hiện kết quả + app/trang tương tự; chạm 1 cái → ngay dưới hiện chọn Dùng/Vào thoải mái hoặc Tính giờ → Lưu. Không còn danh sách gợi ý theo nhóm. | luong-ung-dung-web-lam-lai |
| N6 | Mascot tên **«Grow»** trong mọi chữ hiển thị (không «Rob»). Giữ «Roblox», «AiiRob», đường dẫn ảnh `/rob/`. | mascot-ten-grow |
| N7 | **User riêng từng bé** (anh Thành 06/11): giờ tính theo user; đăng nhập chọn tên + PIN; đăng xuất máy vẫn khoá; bỏ «Cả nhà» dùng chung. | khong-pin-may-thuoc-1-con |
| N8 | Trang chủ không lặp tab: Trang chủ = Cần để ý (1 + Tất cả), đang chặn gì, con vừa làm xong ≤3. | trang-chu-khong-lap-tab |
| N9 | Nhà nhiều con (mẫu Bảo Anh + Bảo Minh); «Áp cho» khi >1 con. | nha-nhieu-con |
| N10 | Đăng ký: chỉ phụ huynh đăng ký; thông báo mặc định bật; nhiệm vụ chọn theo bộ. OTP chỉ lúc đăng ký/quên mật khẩu (Zalo/SMS), không đăng nhập Apple. | logic-dang-ky-va-bo-nhiem-vu, gia-otp-aiigrow |
| N11 | Nhận xét anh Lực 08/11 Nghi chốt: giữ đăng ký, năm sinh nhiều bản, con giáp, quà admin bán, app/web 2 màn, làm lại Ghép máy, màn lịch sử. | nhan-xet-anh-luc-0811 |
| N12 | Danh sách quà 7 mặc định + giá sao theo BRD; Ba Mẹ có màn Danh sách quà. | danh-sach-qua |
| N13 | Màu: GIỮ màu Clay hiện có (huỷ đổi Navy/Golden). Màn Ba Mẹ vẫn Clay; màn Con tươi, Clay/3D, robot dẫn. | mau-aiigrow-theo-aiihouse, man-ba-me-khong-tre-con, man-con-hop-lua-tuoi |

## 2. Chia việc (mỗi agent một worktree + nhánh + PR, Opus)

| Agent | Phạm vi (hành trình trong `DOI-1411.md`) | Sở hữu riêng |
|---|---|---|
| `chan` | `bm-ung-dung` + N1, N2 (đổi tên toàn repo: mobile, server, agent-*), N6 (đổi «Rob»→«Grow» toàn repo phần chữ hiển thị) | `mobile/src/app/(tab)/_layout.tsx` (thanh 5 tab), route tab mới, `lib/ui-bm3.tsx` |
| `lan-dau` | `bm-lan-dau`, `bm-ghep-lan-dau`, `bm-thiet-lap-con`, `bm-dang-nhap`, `bm-duoc-moi`, `bm-ghep-may` | `app/thiet-lap/*`, `dang-ky`, `dang-nhap`, `moi/*`, `may/them` |
| `hang-ngay` | `bm-hang-ngay`, `bm-may-con`, `bm-gio-ho-so`, `bm-con-xin`, `bm-bao-cao-ngay` | `(tab)/hom-nay`, `(tab)/bao-cao`, `may/*`, `gio/*`, `ho-so/*`, `yeu-cau/*` |
| `duyet-ca-nha` | `bm-viec-duyet`, `bm-sao-qua`, `bm-ca-nha`, `bm-cai-dat` | `(tab)/diem-qua`, `(tab)/cai-dat`, `duyet/*`, `giao-nv/*`, `vi/*`, `thanh-vien`, `quy`, `thong-bao/*` |
| `con` | mọi `con-*` (Windows `agent-win`, Mac `agent-mac`, app Con ĐT `mobile/src/app/tre/*`) | `agent-*`, `mobile/src/app/tre/*` |

Màn dùng chung giữa hành trình: agent sở hữu tệp code làm; agent khác chỉ ghi vào PR của mình «cần X sửa Y».
Thanh 5 tab chỉ agent `chan` sửa — agent khác KHÔNG đụng `(tab)/_layout.tsx`.

## 3. Luật làm việc cho mọi agent

- Worktree `E:\tro_ly\AiiGrow\wt-<tên>` tạo từ `origin/main` mới kéo (`git -C E:\tro_ly\AiiGrow\aiigrow fetch origin` rồi
  `git worktree add -b khop-1411/<tên> E:\tro_ly\AiiGrow\wt-<tên> origin/main`). Không `git checkout` trong thư mục người khác.
  Cần `node_modules` thì `npm ci` trong worktree của mình (mobile / server).
- Đọc HTML màn trong `docs/thiet-ke-chot/` (nhánh `docs/thiet-ke-1411`, hoặc thư mục gốc `E:\tro_ly\AiiGrow\aiigrow\docs\thiet-ke-chot`).
  So bản cũ để biết đổi gì. Màn «MỚI» = tính năng/trạng thái mới cần code.
- Màn đã XOÁ khỏi bàn: tính năng/màn tương ứng trong code thì bỏ hoặc nối lại theo thiết kế mới, đừng để đường bấm chết.
- Cần đổi server/API: sửa trong cùng PR, có test (`server`: `npm test`), ghi `docs/API.md`.
- Trước khi xong: `npx tsc --noEmit`, `npx expo lint` (mobile), test liên quan xanh. UI: chụp bản dựng web (`npx expo start --web`
  hoặc công cụ chụp có sẵn trong `mobile/scripts`) đặt cạnh HTML thiết kế; ghi lệch còn lại vào mô tả PR.
- Push nhánh, mở **PR vào main** (tiêu đề tiếng Việt), mô tả: màn đã khớp, màn chưa khớp + lý do, thay đổi server. **KHÔNG merge, KHÔNG deploy**, không chạy Docker, không ssh.
- Không đọc/ghi mật khẩu, token, tệp cấu hình bí mật. Không gửi tin cho ai.
- Báo lại phiên chính ≤ 20 dòng: số PR, màn xong / chưa xong, câu cần Nghi quyết.

## 4. Sau cùng (phiên chính)

Rà từng PR (code-review), dựng localhost, đi lại các hành trình so với thiết kế, báo Nghi. Nghi ok ⇒ merge + deploy
(server theo cách 07/11 trong `server-aiigrow`; app Ba Mẹ/Con theo cách phát hành hiện có), ghi nhật ký sửa code.
