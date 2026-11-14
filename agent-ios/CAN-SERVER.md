# Máy chủ ↔ app iPhone/iPad (agent-ios) — hiện trạng (cập nhật 05/11/2026, K1)

Đã có ở máy chủ (mục cũ 24/10): trang `/cai/<token>` + `/.well-known/apple-app-site-association`, nhịp iOS trả `grantEndsAt`/`moDen`,
lưu phần `ios` của nhịp (`luuIosNhip`).

## Luật 05/11 app đã đọc (`nhip` › `chinhSach`)
- `quy {ngayPhut, themPhut, daDung}` ⇒ trần hôm nay = quỹ ngày + phút cộng thêm; khung giờ chơi không còn chặn (không lập lịch `mo.*`).
  Phút đã dùng = max(phút DeviceActivity đo trên máy, `daDung` máy chủ — mọi máy của Con). Không có `quy` ⇒ luật cũ.
- `gioHoc {tu, den, thu}` ⇒ lịch `hoc.t<thu>` + lý do khiên `gio_hoc` (khiên app Giải trí). `ngoaiLeMo[]` nhóm `ios`, `muc` null ⇒ lịch
  không lặp `ngoaile`, thắng giờ ngủ / khoá. `ungDung.webLuonChan` vào danh sách web chặn.
- Giờ ngủ / khoá: màn chặn + app chỉ «Xin Ba Mẹ mở ngoại lệ» (`yeu-cau {loai: ngoai_le, phamVi: ca_may}`, 15/30/60). Hết giờ: «Dùng sao»
  mở màn Con (`/tre/nha` › Thêm giờ) hoặc xin thêm giờ.

## Giới hạn của iOS / còn thiếu
1. **2 chế độ chặn chưa áp trên iPhone**: Screen Time chỉ biết app Ba Mẹ chọn trong FamilyActivityPicker (token mờ) — app lạ không tự
   «Xin Ba Mẹ duyệt» được. «Chặn app & web» cần khiên `.all(except: app học + giải trí đã chọn)`; chưa làm (cần thử trên máy thật).
2. Ngoại lệ **một app**: iOS không ánh xạ được tên app ⇒ token ⇒ bỏ qua (chỉ ngoại lệ cả máy).
3. Đếm quỹ dùng chung nhiều máy: ngưỡng DeviceActivity chỉ đo máy này ⇒ phút dùng ở máy khác chỉ trừ khi app đồng bộ (mở app / nền).
4. Vẫn nên có: background push (APNs) để Ba Mẹ khoá / duyệt tới ngay; `nhipGiay` iOS ≥ 3600 + ngưỡng mất nhịp ≥ 24 giờ.
