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

### Màn Con — bổ sung M3 (`server/lib/choi-tre.ts`, test `choi-tre.test.ts`)

`GET nha` (số dư, chuỗi ngày, mục tiêu «còn thiếu X điểm», nhiệm vụ mở / cần chụp lại, phút chơi còn lại hôm nay, khung giờ + giờ mở lại, nghỉ đến, phiên đang chạy) ·
`GET tro-choi` (trò chơi Ba Mẹ cho phép + giá điểm/phút) · `POST phien/xet {muc}` → `{duoc, lyDo?, cau, phutToiDa, giaPhanNghin, soDu, nghiDen?}` ·
`POST phien/mo {muc}` · `POST phien/nhip {id, dangDung}` → như agent + `{muc, toiDaPhut, giaPhanNghin}` · `POST phien/dung {id}` → `{diemTru, nghiDen, soDu}` ·
`POST dang-xuat` (xoá phiên PIN — «Đổi người»). Phiên dùng đúng `phien.ts` của agent (một Con một phiên trên mọi thiết bị).
App Con (web) nhận phiên PIN qua `…/tre?phien=<phiên Con>` (agent Windows mở khung Kid), đọc rồi xoá khỏi URL.
