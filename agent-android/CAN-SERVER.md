# Máy chủ ↔ tác tử Android — hiện trạng (cập nhật 05/11/2026, K1)

Tác tử máy Con dùng gói **`vn.aiilab.aiigrow.con`**. Mục cũ (24/10) đã làm ở máy chủ: QR Device Owner trỏ đúng gói +
`LEAVE_ALL_SYSTEM_APPS_ENABLED`, nhịp Android trả `grantEndsAt` ở gốc, lưu `phutDungHomNay` + `thanhPhan` (`luuAndroidNhip`), lệnh gỡ từ xa.

## Luật 05/11 tác tử đã đọc (`nhip` › `chinhSach`, server/lib/chinh-sach.ts)
- `quy {ngayPhut, themPhut, daDung, conPhut, dangHoc, tyLe}` — có `quy` ⇒ luật mới: quỹ phút ngày thay trần + khung giờ chơi
  (`logic/QuyetDinh.kt › quyetDinhQuy`). Phút còn = quỹ − max(`daDung`, phút giải trí đo tại chỗ) ⇒ mất mạng vẫn đếm lùi. Không có `quy`
  (máy chủ cũ) ⇒ luật cũ.
- (15/11: `quy`, `gioHoc`, `ngoaiLeMo`, «thêm giờ», «ngoại lệ» đã gỡ khỏi agent; chỉ còn sổ sao `sao`.)
- App & web (#258/#262): `ungDung.cheDo` = `mo_het` (hoặc `chuaXep = cho_phep`) ⇒ không đặt gì; `theo_danh_sach` ⇒ app ngoài danh sách tạm dừng +
  màn «chưa có trong danh sách» với «Xin Ba Mẹ mở <app>» (`POST /api/device/xin-duyet {muc, ten, lyDo?}` → `{id}`; lời nhắn Con = `lyDo` ≤ 100 ký tự).
  Kết quả: `GET /api/device/yeu-cau/:id` → `ketQua` (cho | da_them | mo_tam | chua_them | het_han | huy) + `nhom` (tinh_phut | khong_tinh_phut);
  agent hỏi mỗi 3 giây (tối đa 5 phút) rồi hiện «Ba Mẹ đã thêm X» / «Ba Mẹ chưa thêm X lúc này. Con xin lại sau được nhé · Xin lại».
- **Web (Chrome, Device Owner)**: «Theo danh sách» ⇒ `URLBlocklist ["*"]` + `URLAllowlist` = các mục `kieu: web` của `ungDung.hoc` + `ungDung.giaiTri`
  (cả 2 nhóm) + tên miền máy chủ AiiGrow; «Mở hết» ⇒ không đặt. `ungDung.webLuonChan` bỏ qua (máy chủ gửi `[]`; không còn lưới web cấm cứng).
- Hết sao: «Xin Ba Mẹ cho vay sao» (`hoc-vien/xin-vay`). Ba Mẹ khoá máy: chỉ «Xin Ba Mẹ mở máy».

## Còn thiếu / nên có
1. **Ngoại lệ một app trên Android chỉ khớp khi `muc` là tên gói** — Ba Mẹ duyệt ngoại lệ theo tên app («Minecraft») thì tác tử không biết gói.
   Nên để máy chủ dịch `ngoaiLeMo[].muc` sang gói thật của máy (như `goiThat` của luật app).
2. Tác tử chưa gửi lời xin ngoại lệ **một app** (`phamVi: app`) — màn xin chỉ có «cả máy».
