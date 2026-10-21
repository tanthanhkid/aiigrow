# AiiGrow — hợp đồng API (M1)

Mọi lỗi trả `{ "error": "<mã>", "message": "<câu cho người dùng, tiếng Việt>" }` kèm HTTP status. JSON vào/ra, `cache-control: no-store`.
Xử lý nằm ở `server/lib/api-m.ts`, `api-con.ts`, `api-may.ts` (route Next chỉ chuyển tiếp) — test: `server/lib/api.test.ts`.

## App Ba Mẹ — `/api/m/*` (Bearer = token phiên Ba Mẹ; vai `xem` chỉ GET)

| Nhóm | Đường |
|---|---|
| Tài khoản | `POST otp {dinhDanh, mucDich}` → `{guiDen, ma?}` (ma chỉ ở chế độ thử) · `POST dang-ky {dinhDanh, ma, ten, matKhau}` → `{token}` · `POST dang-nhap {dinhDanh, matKhau}` · `POST quen-mat-khau {dinhDanh, ma, matKhauMoi}` · `GET toi` · `POST dang-xuat` |
| Gia đình | `GET gia-dinh` → `{ten, quyVoucher, choDuyet, canhBao, con[]}` (mỗi Con: số dư, chờ duyệt, phút chơi hôm nay/trần, «Hôm nay con đã») · `GET/POST cau-hinh` (tham số mục 10, kẹp min–max) |
| Con | `POST con {ten, namSinh?, pin?, avatar?, nhom?}` · `GET con/:id` (ví, cấp độ, lịch, tham số, thiết bị + mức bảo vệ + lệch giờ) · `POST con/:id/sua` · `POST con/:id/lich {ngayThuong[], cuoiTuan[], ngu}` · `POST con/:id/cau-hinh` · `POST con/:id/khoa {khoa}` (Khoá ngay / Mở lại) · `POST con/:id/diem {delta, lyDo}` · `GET con/:id/vi` · `GET con/:id/bao-cao` · `GET con/:id/thanh-tich` · `POST con/:id/loi-khen {noiDung}` |
| Thiết bị | `POST ma-ghep {con?, nen}` → `{ma}` (con trống = máy dùng chung) · `POST may/:id/go` |
| Nhiệm vụ | `GET/POST nhiem-vu` · `POST nhiem-vu/mau {nhom: nhi\|teen}` · `POST nhiem-vu/:id` (sửa, bật/tắt) |
| Chờ duyệt | `GET cho-duyet` → `{nhiemVu[], yeuCau[]}` · `GET luot/:id/anh` · `POST luot/:id/duyet {diem?, loiKhen?}` · `POST luot/:id/tu-choi {lyDo, boSung?}` · `POST duyet-hang-loat {ids[]}` |
| Yêu cầu | `GET yeu-cau/:id/xem-truoc` → cảnh báo ngoại lệ trước khi xác nhận · `POST yeu-cau/:id/dong-y {truDiem?, phut?, phanLoai?, nhom?, phamVi?}` · `POST yeu-cau/:id/tu-choi {lyDo}` |
| Phần thưởng | `GET/POST qua` · `POST qua/mau` · `POST qua/:id` · `GET phieu` (chờ trao / chờ xác nhận) · `POST phieu/:id/xac-nhan` · `POST phieu/:id/huy` · `GET quy` |
| Phân loại | `GET luat` → luật gia đình + Allowlist hệ thống · `POST luat {con?, muc, ten?, loai: hoc\|giai_tri\|chan, nhom?}` |
| Theo dõi | `GET canh-bao` · `POST canh-bao/:id/doc` · `GET nhat-ky?con=` |

## Màn Con — `/api/kid/*` (Bearer = phiên PIN của Con, hoặc token thiết bị riêng của Con)

`GET toi` (Con, ví, hôm nay, lời khen) · `POST chao` (điểm chào mừng một lần) · `GET nhiem-vu` · `POST nhiem-vu/:id/bat-dau` → `{luot}` ·
`POST luot/:id/nop {anh: [{mime, base64}], ghiChu?}` · `GET luot` · `GET cua-hang` · `POST doi/:quaId` · `GET vi-qua` · `GET lich-su` ·
`GET thanh-tich` · `GET/POST yeu-cau {loai, phut?, giaTri?, lyDo}` · `POST yeu-cau/:id/huy` · `GET quy-tac` (bảng công khai) ·
`POST loi-khen/:id/phan-hoi {phanHoi}`

## Agent thiết bị — `/api/device/*` (Bearer = token thiết bị)

| Đường | Ý |
|---|---|
| `POST ghep {ma, nen, tenMay}` | → `{deviceId, token, dungChung}` (không cần Bearer) |
| `POST dong-bo {status?, clientTime?, usage?: [{muc, phut, day?}]}` | → Policy: `serverTime`, `gioMaySai`, `con`, `canChonCon`, `allowlistHeThong`, `luat[]` (mục, loại, nhóm, giá phần nghìn điểm/phút), `lich`, `khoaNgay`, `soDu`, `phien` |
| `POST ho-so` / `POST pin {con, pin}` | máy dùng chung: danh sách hồ sơ / đăng nhập PIN → `{phienCon}`, gửi kèm header `X-Phien-Con` ở các lệnh sau |
| `POST phien/xet {muc}` | xét trước «Dùng điểm để chơi?» → `{duoc, lyDo?, cau?, phutToiDa, giaPhanNghin, soDu}` |
| `POST phien/mo {muc}` · `POST phien/nhip {id, dangDung}` · `POST phien/dung {id}` | phiên giải trí; nhịp mỗi phút → `{trangThai, conPhut, canhBao: 5\|1\|null, lyDoKet?, nghiDen?}` |
| `POST yeu-cau {loai, phut?, giaTri?, lyDo}` | gửi từ màn chặn |

Không có lệnh «mở khoá», «cộng điểm» hay «kết thúc nghỉ» nào cho thiết bị: điểm, phiên, phê duyệt chỉ máy chủ quyết (KE-HOACH 3b, dòng 7).

## Agent Windows — cài một chạm, heartbeat, gỡ từ xa (M4 cài một chạm)

Mốc «cài một chạm + service + gỡ từ xa». Agent E làm phần máy chủ (token gói cài + lệnh gỡ); hợp đồng đề xuất bên dưới, **lệch thì sửa theo máy chủ**.

| Đường | Ý |
|---|---|
| `POST ghep-goi {token, nen, tenMay}` | Ghép bằng token NHÚNG SẴN trong bộ cài (một chạm, không cần Bearer) → `{deviceId, token, dungChung, childName?}`. `token` = token gói cài do máy chủ sinh (một lần); trả về token thiết bị. |
| `POST dong-bo … → { …, nextCheckSec, lenh?: [{id, loai}] }` | Heartbeat. Agent chỉ đọc thêm `lenh`: `loai = "go"` ⇒ gỡ máy khỏi gia đình. |
| `POST lenh/:id/xong` | Agent báo đã thực thi xong lệnh (gỡ sạch xong). Nên để máy chủ giữ thiết bị tới khi nhận ack rồi mới xoá hẳn. |

Token gói cài nhúng vào bộ cài theo một trong các cách (agent đọc tự động, không hỏi người dùng):
- **Tên tệp**: `AiiGrow-Setup.enroll-<gói>.exe`.
- **Trailer**: nối `<payload><4 byte độ dài LE><"AIIGROW-ENROLL1">` vào cuối `.exe/.msi`.
- **Tham số / biến môi trường**: `--enroll=<gói>` / `/enroll:<gói>` / `AIIGROW_ENROLL`.

`<gói>` = base64url của JSON `{ "server": "<địa chỉ máy chủ>", "token": "<token gói cài>" }` (hoặc dạng gọn `token@server`). Máy chủ biết `server`, nên người cài không phải nhập URL.
## Quầy AiiCafe — `/api/quay/*` (M5; Bearer = phiên nhân viên, bảng `staff` riêng — token Ba Mẹ / thiết bị / Con không dùng được)

`POST dang-nhap {tenDangNhap, matKhau}` → `{token}` (sai 5 lần ⇒ khoá 15 phút) · `GET toi` → `{nhanVien: {ten, vai, quay}}` · `POST dang-xuat` ·
`POST quet {ma}` → `{ketQua: hop_le|da_dung|het_han|chua_phat_hanh|thu_hoi|khong_thay, ma, menhGia?, tenCon?, tenGiaDinh?, dungLuc?, quayDung?, hetHan?, luc}`.
`ma` nhận cả chữ thường, có gạch/cách, hoặc chuỗi QR chứa mã. Hợp lệ ⇒ đánh dấu «Đã dùng» ngay, một lần (hai lượt cùng lúc chỉ một hợp lệ).
Mọi lượt quét vào nhật ký kiểm toán. Màn web: `/quay`.

## Quản trị AiiLab — `/api/admin/*` (M5; Bearer = phiên vai `admin`; nhân viên quầy ⇒ 403)

`POST dang-nhap` · `GET toi` · `POST dang-xuat` · `GET tong-quan` · `GET gia-dinh?tim=` · `GET gia-dinh/:id` (Ba Mẹ, Con + số dư, giao dịch quỹ,
phiếu quà — KHÔNG có ảnh bằng chứng) · `POST gia-dinh/:id/nap-quy {soTien, ghiChu}` → `{soDu}` · `GET voucher?trangThai=&tim=` ·
`GET doi-soat?tu=YYYY-MM-DD&den=` (giờ VN) → `{ds[], tong}` · `GET ho-tro` · `GET/POST ho-tro/:familyId {noiDung}` (ghi tin `tu: "aiilab"`) ·
`GET/POST mau` · `POST mau/:id {bat}` · `GET/POST allowlist {muc, bo?}` · `GET/POST tham-so {<khoá mục 10>: số | null}` (kẹp min–max) ·
`GET nhat-ky?loai=`. Mọi thao tác ghi vào bảng `audit`. Màn web: `/admin`. Tài khoản: `pnpm tao-tai-khoan` (mật khẩu từ biến môi trường).

## Webhook AiiRob — `POST /api/aiirob` (M6)

Header `X-AiiRob-Timestamp: <giây Unix>`, `X-AiiRob-Signature: sha256=<hex HMAC-SHA256(AIIROB_WEBHOOK_SECRET, "<timestamp>.<thân>")>`; lệch > 5 phút
hoặc chữ ký sai ⇒ 401; thiếu biến môi trường ⇒ 503. Thân `{suKien: "bai_dat", con, maBai, tenBai, diemSo}` → `{ok, congDiem, lyDo}`.
Đạt ngưỡng `aiirob_nguong` ⇒ +`aiirob_diem` tự duyệt, một lần mỗi bài (gửi trùng / cùng lúc không cộng đôi).

### Màn Con — bổ sung M3 (`server/lib/choi-tre.ts`, test `choi-tre.test.ts`)

`GET nha` (số dư, chuỗi ngày, mục tiêu «còn thiếu X điểm», nhiệm vụ mở / cần chụp lại, phút chơi còn lại hôm nay, khung giờ + giờ mở lại, nghỉ đến, phiên đang chạy) ·
`GET tro-choi` (trò chơi Ba Mẹ cho phép + giá điểm/phút) · `POST phien/xet {muc}` → `{duoc, lyDo?, cau, phutToiDa, giaPhanNghin, soDu, nghiDen?}` ·
`POST phien/mo {muc}` · `POST phien/nhip {id, dangDung}` → như agent + `{muc, toiDaPhut, giaPhanNghin}` · `POST phien/dung {id}` → `{diemTru, nghiDen, soDu}` ·
`POST dang-xuat` (xoá phiên PIN — «Đổi người»). Phiên dùng đúng `phien.ts` của agent (một Con một phiên trên mọi thiết bị).
App Con (web) nhận phiên PIN qua `…/tre?phien=<phiên Con>` (agent Windows mở khung Kid), đọc rồi xoá khỏi URL.

## M4b — độ bền máy con + M4c cài một chạm / gỡ từ xa (chỉ thêm; hợp đồng cũ giữ nguyên)

Xử lý: `server/lib/tuan-thu.ts` (nhịp, tuân thủ, mở khẩn cấp), `chinh-sach.ts` (chính sách chung), `chuyen-doi.ts` (bộ chuyển đổi
nền tảng, thuần), `lenh-may.ts` (gói cài, lệnh gỡ), `nhip-may.ts`. Test: `tuan-thu.test.ts`, `chuyen-doi.test.ts`, `lenh-may.test.ts`.
Bảng tính năng × OS: `docs/QUAN-LY-DA-NEN-TANG.md`.

### Agent — `/api/device/*`

| Đường | Ý |
|---|---|
| `POST ghep-goi {token, nen, tenMay}` | đổi token gói cài (một lần, có hạn) ⇒ `{deviceId, token, dungChung, childName?}`. Không cần Bearer. Bí danh: `POST ghep {token, nen, tenMay}` (cách cũ `{ma}` giữ nguyên). Lỗi: `ma_sai` 404 · `ma_da_dung` 409 · `ma_het_han` 410 · `sai_nen_tang` 409 |
| `POST nhip {phienBan?, clientTime?, trangThaiKhoa?, taiKhoan?: {ten, laAdmin}, taiKhoanAdmin?: string[], appQuanLyBat?, thanhPhan?: {[tên]: bool}, matKetNoiPhut?, nguon?: bat\|sap_tat\|sap_ngu}` | nhịp + tuân thủ ⇒ `{serverTime, tuanThu: {trangThai: tuan_thu\|lech_chuan\|ngoai_vong\|tat_may\|chua_co_nhip, diem, vanDe[{loai, tru, cauBaMe, cauCon, chiTiet}], khoaGiaiTri, moKhanCapDen}, chinhSach (chính sách chung), nenTang (cấu hình đã chuyển cho nền tảng của máy: muc[], khongLamDuoc[], viecCho[], nhipGiay), lenh: [{id, loai: "go"}]}`. `vanDe.loai`: `gio_sai` (−40) · `app_tat` (−50) · `admin_la` (−40) · `khong_toi_may_chu` (−30) · `ngoai_vong` (−100). Điểm < `tuan_thu_nguong` (80) ⇒ `khoaGiaiTri` |
| `POST dong-bo` | như cũ, thêm `lenh: [{id, loai}]` (lệnh đang chờ, vd gỡ từ xa) |
| `POST lenh/:id/xong` | agent báo đã làm xong lệnh (Bearer = token máy). Lệnh `go` ⇒ máy «đã gỡ» (xoá khỏi gia đình, token hết hiệu lực, hết cảnh báo mất nhịp). Gọi lại ⇒ `{ok: true, lapLai: true}`, không ghi đôi |
| `POST phien/xet` · `phien/mo` · `phien/nhip` | máy KHÔNG tuân thủ (đã từng gửi nhịp) ⇒ `phien/xet` → `{duoc: false, lyDo: "khong_tuan_thu", cau}` · `phien/mo` → 409 `khong_mo_duoc` · `phien/nhip` → kết thúc phiên, `{trangThai: "ket_thuc", lyDoKet: "khong_tuan_thu"}` |

### App Ba Mẹ — `/api/m/*`

| Đường | Ý |
|---|---|
| `POST goi-cai {con?, nen}` | tạo gói cài: token enroll một lần, hạn `goi_cai_gio` (48 giờ), lưu băm ⇒ `{token, het, cai: {nen, cach, buoc[], quyenAdmin, chiTiet}}` (`chiTiet`: lệnh cài im lặng Windows, tên tệp .pkg, QR Android Device Owner, liên kết iOS…). `con` trống = máy dùng chung |
| `GET tuan-thu` | mọi máy của gia đình: trạng thái, điểm, vấn đề, khoá giải trí, mở khẩn cấp, lần cuối, phiên bản, tài khoản quản trị đã xác nhận, lệnh chờ (quét mất nhịp trước) |
| `GET may/:id/tuan-thu` | như trên cho một máy + 50 sự kiện tuân thủ gần nhất |
| `GET may/:id/cau-hinh-nen-tang` | `{chinhSach, nenTang}` — máy nhận cấu hình gì, OS không làm được gì |
| `POST may/:id/mo-khan-cap {phut, lyDo?}` | mở khẩn cấp (5–`mo_khan_cap_toi_da_phut` = 120 phút) ⇒ `{den, phut}`; chỉ gỡ khoá do không tuân thủ (khoá ngay / giờ ngủ / điểm vẫn giữ); ghi nhật ký + báo. `POST may/:id/mo-khan-cap/huy` |
| `POST may/:id/tai-khoan-tin-cay {ten, tinCay?}` | xác nhận (hoặc bỏ, `tinCay: false`) tài khoản quản trị trên máy là của Ba Mẹ ⇒ `{adminTinCay}` |
| `POST may/:id/go-tu-xa {matKhau}` | chỉ **chủ gia đình**, xác thực lại bằng mật khẩu ⇒ `{id, lapLai, cach}`; ghi lệnh `go` cho máy. Lỗi: `sai_mat_khau` 401 · `chi_chu` 403 · `khong_thay` 404 |
| `GET con/:id/luat-mang?mac=&ten=&nen=tvos\|android_tv\|tizen\|webos\|mang` | TV / thiết bị không có agent: luật router (chặn Internet theo MAC + lịch) + DNS (NextDNS / Pi-hole) dựng từ chính sách chung của Con |

Tham số mới (cau-hinh, kẹp min–max): `mat_nhip_di_dong_phut` 180 (30–1440) · `tuan_thu_nguong` 80 (0–100) · `mo_khan_cap_toi_da_phut` 120
(15–720) · `goi_cai_gio` 48 (1–168). Ngưỡng mất nhịp máy tính dùng `ngung_chay_phut` 15 có sẵn.
