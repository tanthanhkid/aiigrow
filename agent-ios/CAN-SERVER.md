# Máy chủ cần thêm gì cho iPhone/iPad (agent-ios) — 24/10/2026

Đọc từ `server/lib/api-may.ts`, `nhip-may.ts`, `chuyen-doi.ts`, `gia-dinh.ts`, `lenh-may.ts`, `yeu-cau.ts`. App iOS **chạy được với máy chủ hiện tại**
(ghép mã 6 số / `ghep-goi` với `nen: "ios"`, `nhip`, `yeu-cau`, `lenh/:id/xong` đều có sẵn). Dưới đây là phần thiếu, xếp theo mức cần.

## Cần trước khi phát hành
1. **Universal link `/cai/<token>`** — `huongDanCai("ios")` đã in QR `…/cai/<token>` nhưng `server/app` chưa có trang `cai/` lẫn
   `/.well-known/apple-app-site-association`. Cần:
   - `GET /.well-known/apple-app-site-association` (JSON, không đuôi, `Content-Type: application/json`):
     `{"applinks":{"details":[{"appIDs":["<TEAM_ID>.vn.aiilab.aiigrow.con"],"components":[{"/":"/cai/*"}]}]}}`
   - `GET /cai/<token>`: trang dự phòng khi máy chưa cài app (nút App Store + «đã cài thì chạm lại link»); có thể thêm nút
     `aiigrowcon://cai/<token>` (scheme app đã khai báo).
2. **Hạn «thêm giờ đã duyệt» cho iOS** — duyệt `them_gio` từ máy iOS hiện chỉ cộng phút (`grants` không có `cua_so_den` vì
   `coTacTu("ios") = false`, `yeu-cau.ts` dòng ~102) ⇒ app iOS thấy qua `ngoaiLe.phutThemHomNay` và nâng trần phút, **nhưng ngoài khung giờ
   chơi vẫn không mở được**. Cần: với máy `ios`, duyệt `them_gio` cũng đặt `cua_so_den`, và `POST api/device/nhip` trả thêm
   `grantEndsAt` (= `hanMoCuaMay(may, con)`). App đã đọc sẵn `grantEndsAt` / `moDen` (ConCore/MoHinh.swift) ⇒ lập lịch DeviceActivity
   «themgio» kết thúc đúng hạn. «Khoá lại ngay» (`huyMoKhanCap`) cũng nên đóng cửa sổ này cho iOS.
3. **Lưu phần `ios` của nhịp** — app gửi `ios: {soAppHoc, soAppGiaiTri, soAppChan, soDanhMucGiaiTri, phutDaDung, uyQuyen}`; `nhanNhip`
   bỏ qua. Cần lưu vào trạng thái máy để app Ba Mẹ hiện «đã chọn 6 app giải trí, hôm nay dùng 55 phút», và **cảnh báo Ba Mẹ khi số app
   giải trí/chặn giảm** (Con có thể tự bỏ chọn trong FamilyActivityPicker — xem mục 5).

## Nên có
4. **Trần tuần + phút đã dùng** — iOS không gửi được thời lượng từng app (token mờ); máy chủ chỉ biết `ios.phutDaDung` của hôm nay.
   Để áp `tranTuanPhut` cần cộng `phutDaDung` theo ngày ở máy chủ và trả `tranConLaiHomNay` (= min(trần ngày + thêm, trần tuần − đã dùng tuần)).
   App sẽ dùng số này thay `tranNgayPhut + phutThemHomNay` nếu có.
5. **Xác nhận Ba Mẹ ngay trên máy Con** — màn «Chọn app học / giải trí» hiện không khoá. Đề xuất `POST api/device/xac-nhan-ba-me
   {matKhau | pin}` (token máy) trả `{duoc, hetLuc}` — cùng mức bảo vệ với `api/device/go` — để app chỉ mở FamilyActivityPicker khi Ba Mẹ nhập.
6. **Đẩy lệnh tức thời** — xem README mục «Khoá ngay». Cần: khoá APNs (.p8) của AiiLab + bảng `push_token` theo máy + endpoint
   `POST api/device/push-token {token}`; khi Ba Mẹ bấm Khoá ngay / duyệt thêm giờ ⇒ gửi **background push** (`content-available: 1`) để app
   đồng bộ trong vài giây. (Không tự tạo khoá — chờ Thanh.)
7. **`nhipGiay` iOS = 3600** và ngưỡng `mat_nhip_di_dong_phut` — BGAppRefreshTask không bảo đảm chu kỳ; nên để ngưỡng mất nhịp iOS
   ≥ 24 giờ để không báo «ngoài vòng kiểm soát» oan khi Con không mở app cả buổi.

## Đã kiểm, không cần sửa
- `ghepMay` / `doiGoiCai` nhận `platform = "ios"` (`NEN_TANG` có `ios`), trả `{deviceId, token, dungChung, childName}`.
- `nhipMay` trả `nenTang = chuyenDoi(cs, "ios")` đủ `cauHinh` app cần: `khung_gio.lichMo/tz`, `gio_ngu.ngu`, `tran_thoi_gian`,
  `chan_web.webDomainsChan/giaiTriCanPhien`, `khoa_ngay.khoaNgay`, `khoa_khong_tuan_thu.khoaGiaiTri/lyDo`; `chinhSach.ngoaiLe.moKhanCapDen`.
- `yeu-cau` (`them_gio`, phút 5–240 ⇒ 30/60/120 hợp lệ) và `GET yeu-cau/:id` lọc theo `device_id` — dùng được cho iOS.
- Lệnh `go` qua `nhip.lenh` + `lenh/:id/xong` — app thu hồi quyền, gỡ khiên/lịch, báo xong, quên token.
- Máy dùng chung (`dungChung = true`, chưa gán Con): `yeu-cau` trả 409 «Chọn hồ sơ…» — iPhone/iPad nên gán Con khi tạo mã; app chưa làm
  luồng chọn hồ sơ + PIN (`api/device/pin`, header `X-Phien-Con`).
