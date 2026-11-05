# Máy chủ ↔ tác tử Android — hiện trạng (cập nhật 05/11/2026, K1)

Tác tử máy Con dùng gói **`vn.aiilab.aiigrow.con`**. Mục cũ (24/10) đã làm ở máy chủ: QR Device Owner trỏ đúng gói +
`LEAVE_ALL_SYSTEM_APPS_ENABLED`, nhịp Android trả `grantEndsAt` ở gốc, lưu `phutDungHomNay` + `thanhPhan` (`luuAndroidNhip`), lệnh gỡ từ xa.

## Luật 05/11 tác tử đã đọc (`nhip` › `chinhSach`, server/lib/chinh-sach.ts)
- `quy {ngayPhut, themPhut, daDung, conPhut, dangHoc, tyLe}` — có `quy` ⇒ luật mới: quỹ phút ngày thay trần + khung giờ chơi
  (`logic/QuyetDinh.kt › quyetDinhQuy`). Phút còn = quỹ − max(`daDung`, phút giải trí đo tại chỗ) ⇒ mất mạng vẫn đếm lùi. Không có `quy`
  (máy chủ cũ) ⇒ luật cũ.
- `gioHoc {tu, den, thu}` ⇒ trạng thái `GIO_HOC` (chỉ app Học). `ngoaiLeMo[]` lọc `nhom` = `android`: `muc` null = cả máy (thắng giờ ngủ /
  khoá), `muc` = gói ⇒ chỉ mở gói đó lúc ngủ / khoá.
- `ungDung.chuaXep = cho_phep` («Mở hết») ⇒ app chưa xếp được dùng; mặc định «Chỉ app được phép» ⇒ tạm dừng + màn chặn «Xin Ba Mẹ duyệt»
  (`POST /api/device/xin-duyet {muc, ten}`). `ungDung.webLuonChan` cộng vào URLBlocklist.
- Hết giờ: «Dùng sao» `POST /api/device/hoc-vien/doi-sao {phut}` (15/30/60) hoặc «Xin Ba Mẹ thêm giờ» (`yeu-cau them_gio`).
  Giờ ngủ / khoá: chỉ `yeu-cau {loai: ngoai_le, phamVi: ca_may, phut, lyDo?}`.

## Còn thiếu / nên có
1. **Ngoại lệ một app trên Android chỉ khớp khi `muc` là tên gói** — Ba Mẹ duyệt ngoại lệ theo tên app («Minecraft») thì tác tử không biết gói.
   Nên để máy chủ dịch `ngoaiLeMo[].muc` sang gói thật của máy (như `goiThat` của luật app).
2. Tác tử chưa gửi lời xin ngoại lệ **một app** (`phamVi: app`) — màn xin chỉ có «cả máy».
