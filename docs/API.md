# AiiGrow — hợp đồng API (M1)

Mọi lỗi trả `{ "error": "<mã>", "message": "<câu cho người dùng, tiếng Việt>" }` kèm HTTP status. JSON vào/ra, `cache-control: no-store`.
Xử lý nằm ở `server/lib/api-m.ts`, `api-con.ts`, `api-may.ts` (route Next chỉ chuyển tiếp) — test: `server/lib/api.test.ts`.

## App Ba Mẹ — `/api/m/*` (Bearer = token phiên Ba Mẹ; quyền «Người trông giúp» POST chỉ xem / duyệt / khoá máy — xem mục «S2 thiết kế 05/11»)

| Nhóm | Đường |
|---|---|
| Tài khoản | `POST otp {dinhDanh, mucDich}` → `{guiDen, ma?}` (ma chỉ ở chế độ thử) · `POST dang-ky {dinhDanh, ma, ten, matKhau}` → `{token}` · `POST dang-nhap {dinhDanh, matKhau}` · `POST quen-mat-khau {dinhDanh, ma, matKhauMoi}` · `GET toi` · `POST dang-xuat` · `POST xoa-tai-khoan {kiemTra: true}` → `{duoc: true}` hoặc 409 chặn (không cần mật khẩu, app hỏi trước) · `POST xoa-tai-khoan {matKhau}` → `{xoa: "tai_khoan"}` (không phải chủ: vai `roi`, bỏ định danh + mật khẩu + phiên) hoặc `{xoa: "gia_dinh", soCon}` (chủ là người lớn cuối, không còn máy: xoá cả gia đình). Mọi vai kể cả Chỉ xem. Lỗi: `sai_mat_khau` 401 · `tam_khoa` 429 (sai 5 lần, bộ đếm riêng) · `con_thanh_vien` 409 (mời ra trước) · `con_may` 409 (gỡ máy trước) |
| Gia đình | `GET gia-dinh` → `{ten, quyVoucher, choDuyet (nhiệm vụ + yêu cầu + phiếu quà), canhBao, con[]}` (mỗi Con: số dư, chờ duyệt, `phieuCho` (quà chờ trao), phút chơi hôm nay/trần, «Hôm nay con đã») · `GET/POST cau-hinh` (tham số mục 10, kẹp min–max) |
| Con | `POST con {ten, namSinh?, pin?, avatar?, nhom?}` · `GET con/:id` (ví, cấp độ, lịch, tham số, thiết bị + mức bảo vệ + lệch giờ) · `POST con/:id/sua` · `POST con/:id/lich {ngayThuong[], cuoiTuan[], ngu}` · `POST con/:id/cau-hinh` · `POST con/:id/khoa {khoa}` (Khoá ngay / Mở lại) · `POST con/:id/diem {delta, lyDo}` · `GET con/:id/vi` (`lichSu[]` có `nguoi` = id Ba Mẹ và `ten_nguoi` = tên để hiện) · `GET con/:id/bao-cao` · `GET con/:id/thanh-tich` · `POST con/:id/loi-khen {noiDung}` |
| Thiết bị | `POST ma-ghep {con?, nen}` → `{ma}` (con trống = máy dùng chung) · `POST may/:id/go {matKhau, xoaHan?}` (gỡ an toàn — xem mục «An toàn & gỡ cài đặt») |
| Nhiệm vụ | `GET/POST nhiem-vu` · `POST nhiem-vu/mau {nhom: nhi\|teen}` · `POST nhiem-vu/:id` (sửa, bật/tắt) |
| Chờ duyệt | `GET cho-duyet` → `{nhiemVu[], yeuCau[], phieu[] (quà Con đổi đang chờ trao/xác nhận: `POST phieu/:id/xac-nhan` · `POST phieu/:id/huy`), tuDong[]}` · `GET luot/:id/anh` · `POST luot/:id/duyet {diem?, loiKhen?}` · `POST luot/:id/tu-choi {lyDo, boSung?}` · `POST duyet-hang-loat {ids[]}` |
| Quản trị trong app | `GET toi` có thêm `laAdmin` (`parents.id` nằm trong env `AIIGROW_ADMIN_ID`, cách nhau dấu phẩy; không so email/SĐT; không đặt env ⇒ không ai là admin; lấy id bằng `GET toi` → `baMe.id`) · `GET admin/ho-tro` → `{ds[{family_id, ten, tu, noi_dung, created_at, chua_tra_loi}]}` · `GET admin/ho-tro/:fam` → `{ten, tin[]}` · `POST admin/ho-tro/:fam {noiDung}`. Ba Mẹ thường gọi ⇒ 403 `khong_du_quyen` |
| Yêu cầu | `GET yeu-cau/:id/xem-truoc` → cảnh báo ngoại lệ trước khi xác nhận · `POST yeu-cau/:id/dong-y {truDiem?, phut?, phanLoai?, nhom?, phamVi?}` · `POST yeu-cau/:id/tu-choi {lyDo}` |
| Phần thưởng | `GET/POST qua` · `POST qua/mau` · `POST qua/:id` · `GET phieu` (chờ trao / chờ xác nhận) · `POST phieu/:id/xac-nhan` · `POST phieu/:id/huy` · `GET quy` |
| Phân loại | `GET luat` → luật gia đình + Allowlist hệ thống · `POST luat {con?, muc, ten?, loai: hoc\|giai_tri\|chan, nhom?}` |
| Theo dõi | `GET canh-bao` · `POST canh-bao/:id/doc` · `GET nhat-ky?con=` |

## Màn Con — `/api/kid/*` (Bearer = phiên Con (chọn tên + PIN trên máy dùng chung — PIN theo bé từ 06/11, xem mục «S3»), hoặc token thiết bị riêng của Con)

`GET toi` (Con, ví, hôm nay, lời khen) · `POST chao` (điểm chào mừng một lần) · `GET nhiem-vu` · `POST nhiem-vu/:id/bat-dau` → `{luot}` ·
`POST luot/:id/nop {anh: [{mime, base64}], ghiChu?}` · `GET luot` · `GET cua-hang` · `POST doi/:quaId` · `GET vi-qua` · `GET lich-su` ·
`GET thanh-tich` · `GET/POST yeu-cau {loai, phut?, giaTri?, lyDo}` · `POST yeu-cau/:id/huy` · `GET quy-tac` (bảng công khai) ·
`POST loi-khen/:id/phan-hoi {phanHoi}`

## Agent thiết bị — `/api/device/*` (Bearer = token thiết bị)

| Đường | Ý |
|---|---|
| `POST ghep {ma, nen, tenMay}` | → `{deviceId, token, dungChung}` (không cần Bearer) |
| `POST dong-bo {status?, clientTime?, usage?: [{muc, phut, day?}]}` | → Policy: `serverTime`, `gioMaySai`, `con`, `canChonCon`, `allowlistHeThong`, `luat[]` (mục, loại, nhóm, giá phần nghìn điểm/phút), `lich`, `khoaNgay`, `soDu`, `phien` |
| `POST ho-so` / `POST chon-con {con}` (bí danh cũ `POST pin {con, pin}` — pin bỏ qua) | máy dùng chung: danh sách hồ sơ / Con chọn tên (agent cũ, không PIN) → `{phienCon}`, gửi kèm header `X-Phien-Con` ở các lệnh sau. **06/11: agent mới dùng `POST dang-nhap-be {con, pin}` (PIN theo bé) — mục «S3»** |
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
hoặc chữ ký sai ⇒ 401; thiếu biến môi trường ⇒ 503. Thân `{suKien: "bai_dat", giaDinh, con, maBai, tenBai, diemSo}` → `{ok, congDiem, lyDo}`.
Đạt ngưỡng `aiirob_nguong` ⇒ +`aiirob_diem` tự duyệt, một lần mỗi bài (gửi trùng / cùng lúc không cộng đôi).
Liên kết (M6): Ba Mẹ lấy mã `GET /api/m/con/:id/lien-ket-aiirob` → `{ma: "<family_id>.<child_id>"}` (màn hồ sơ Con, mục «Liên kết AiiRob») và dán vào AiiRob.
AiiRob gửi lại `giaDinh` (= phần trước dấu chấm) + `con` (= phần sau). `giaDinh` **bắt buộc**: thiếu, `null`, rỗng hoặc không phải
chuỗi ⇒ 400 `thieu_truong`; không khớp gia đình của Con ⇒ 404 `khong_thay`, giống hệt Con không tồn tại. Không có nhánh tương thích
"thiếu `giaDinh` vẫn nhận" (bên gửi dulich-mvp #224 ra đời cùng lúc và luôn gửi `giaDinh`).
**Mã liên kết là định danh, không phải bí mật.** Mã tất định, không hết hạn, không thu hồi được và không cần giấu: nó chỉ nói webhook
nhắm vào Con nào của gia đình nào. Bảo vệ thật là chữ ký HMAC bằng `AIIROB_WEBHOOK_SECRET`, khoá chung chỉ máy chủ AiiRob và AiiGrow
giữ: người có mã mà không có khoá không gửi được điểm. `giaDinh` chỉ chặn nhầm Con (dán sai mã, id Con trùng ngẫu nhiên), không phải
chứng minh quyền. Nếu sau này cần mã ghép nối là bí mật (cho bên thứ ba khác AiiRob) thì phải đổi sang mã ngẫu nhiên có hạn + bảng lưu.

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
| `POST dong-bo {status: {…, cheDo?}}` | như cũ, thêm `lenh: [{id, loai}]` (lệnh đang chờ, vd gỡ từ xa) và `windows` (Policy dịch cho agent-win; `cheDo` chỉ có khi Ba Mẹ đã chọn hoặc đang gỡ). agent-win gửi `status.cheDo` = chế độ THẬT đang áp; gửi thêm `status.quyen` = `{dichVu, khay, chanThat, appLocker?}` (true = có) ⇒ máy chủ tính «mức bảo vệ» + liệt kê quyền còn thiếu và cách khắc phục (`con/:id` → `may[].baoVeThieu`, `baoVeCau`). Máy cũ chưa gửi `quyen` thì máy chủ suy ra từ `status` thô. `windows.mode = "tu_do"` + `windows.grantEndsAt` = Ba Mẹ đang «mở» có hạn (mở khẩn cấp, hoặc «thêm giờ» duyệt cho lời xin từ máy Windows): agent gỡ AppLocker tới hạn đó. `nextCheckSec`: 120 giây nhàn rỗi, 30 giây khi có phiên / đang mở / còn thưởng (agent kẹp 10–600) |
| `POST da-go` | Ba Mẹ gỡ ngay tại máy (Cài đặt › Ứng dụng › AiiGrow / `AiiGrow.Setup.exe --uninstall`): bộ gỡ gọi TRƯỚC khi xoá token ⇒ `{ok: true}`, máy rời gia đình như ack lệnh gỡ (lệnh `go` đang chờ ⇒ `xong`, sự kiện `go_may {cach: "tai_may"}` + cảnh báo). Gọi lại ⇒ 401 `token_sai` |
| `POST lenh/:id/xong` | agent báo đã làm xong lệnh (Bearer = token máy). Lệnh `go` ⇒ máy «đã gỡ» (xoá khỏi gia đình, token hết hiệu lực, hết cảnh báo mất nhịp). Gọi lại ⇒ `{ok: true, lapLai: true}`, không ghi đôi |
| `POST phien/xet` · `phien/mo` · `phien/nhip` | máy KHÔNG tuân thủ (đã từng gửi nhịp) ⇒ `phien/xet` → `{duoc: false, lyDo: "khong_tuan_thu", cau}` · `phien/mo` → 409 `khong_mo_duoc` · `phien/nhip` → kết thúc phiên, `{trangThai: "ket_thuc", lyDoKet: "khong_tuan_thu"}` |

### Khay học viên (máy Con) — `/api/device/hoc-vien/*` (Bearer = token máy riêng của Con)

Cổng mỏng cho ứng dụng khay của agent-win (`AppForm` — cửa sổ app to của Con), dùng lại luật của màn Con (`/api/kid/*`): tần suất, thời gian tối thiểu, ảnh trùng, trừ điểm, tồn kho đều do máy chủ quyết. Máy dùng chung chưa có PIN trong khay ⇒ `409 chua_chon_con`. Khay chỉ được gọi các đường dưới đây (agent-win `HocVienPaths.Allowed`).

| Đường | Ý |
|---|---|
| `GET tong-quan` | `{con, soDu, tongKiem, capDo{cap, diemCapSau, conThieu}, diemChoDuyet, nhiemVu[{id, ten, moTa, diem, bangChung, kieu, han, phutToiThieu, trangThai: san_sang\|dang_lam\|can_bo_sung\|du_hom_nay\|du_tuan, luot, dangCho, giaoRieng, lyDo}], gan[] (lượt 14 ngày), loiKhen[], phieuCho[]}` |
| `GET tin?sau=ISO` | thông báo cho Con: `{ds[{id, loai, tieu, noi, luc}], bay}`. Loại: `giao_nhiem_vu` · `nhiem_vu_moi` (việc mở cho cả nhà) · `duyet_nhiem_vu` · `tu_duyet_nhiem_vu` · `tu_choi_nhiem_vu` · `can_bo_sung` · `loi_khen` · `xac_nhan_qua` · `huy_qua` · `huy_hieu`. Không có `sau` ⇒ 7 ngày gần nhất. Máy chủ **lùi `sau` 5 phút** (sự kiện mang giờ mở giao dịch) ⇒ khay lọc trùng theo `id` (`TinTracker`) và truyền `bay` làm `sau` lần kế |
| `POST nhiem-vu/:id/bat-dau` | Con nhận việc ⇒ `{luot}` (bấm lại trả cùng lượt). Ghi sự kiện `bat_dau_nhiem_vu` ⇒ Ba Mẹ thấy «Ken đã nhận …». Lỗi: `du_hom_nay` · `du_tuan` · `da_xong` · `qua_han` 409 |
| `POST luot/:id/nop {ghiChu?, anh?: [{mime, base64}]}` | nộp bài ⇒ `{trangThai: cho_duyet\|duoc_duyet, nghiTrung}`. Ảnh ≤ 400 KB (khay nén JPEG ≤ 300 KB, cạnh dài ≤ 1280). Lỗi: `thieu_anh` · `thieu_chu` · `chua_du_gio` · `da_nop` · `anh_qua_lon` |
| `GET cua-hang` | `{soDu, qua[{id, ten, loai, diem, menhGia, chiCuoiTuan, du, conThieu}]}` |
| `POST doi/:quaId` | đổi quà ⇒ `{phieu, trangThai: cho_trao\|cho_xac_nhan\|da_phat_hanh, voucher?{ma, hetHan}}`. Lỗi: `khong_du_diem` · `het_hang` · `chi_cuoi_tuan` · `du_thang` · `quy_thieu` 409 |
| `POST loi-khen/:id/phan-hoi {phanHoi}` | Con nhắn lại Ba Mẹ (≤ 60 ký tự) ⇒ `{ok}`; sự kiện `phan_hoi_con` ⇒ thông báo «Ken nhắn lại Ba Mẹ» ở app Ba Mẹ |

### App Ba Mẹ — `/api/m/*`

| Đường | Ý |
|---|---|
| `POST goi-cai {con?, nen}` | tạo gói cài: token enroll một lần, hạn `goi_cai_gio` (48 giờ), lưu băm ⇒ `{token, het, cai: {nen, cach, buoc[], quyenAdmin, chiTiet}}` (`chiTiet`: lệnh cài im lặng Windows, tên tệp .pkg, QR Android Device Owner, liên kết iOS…). `con` trống = máy dùng chung |
| `GET tuan-thu` | mọi máy của gia đình: trạng thái, điểm, vấn đề, khoá giải trí, mở khẩn cấp, lần cuối, phiên bản, tài khoản quản trị đã xác nhận, lệnh chờ (quét mất nhịp trước) |
| `GET may/:id/tuan-thu` | như trên cho một máy + 50 sự kiện tuân thủ gần nhất |
| `GET may/:id/cau-hinh-nen-tang` | `{chinhSach, nenTang}` — máy nhận cấu hình gì, OS không làm được gì |
| `POST may/:id/mo-khan-cap {phut, lyDo?}` | mở khẩn cấp (5–`mo_khan_cap_toi_da_phut` = 120 phút) ⇒ `{den, phut}`; chỉ gỡ khoá do không tuân thủ (khoá ngay / giờ ngủ / điểm vẫn giữ); ghi nhật ký + báo. `POST may/:id/mo-khan-cap/huy` |
| `GET may/:id/ma-offline` | mã mở khi máy MẤT MẠNG ⇒ `{ma (6 số), conGiay, hieuLucPhut, phutMo}`. Ba Mẹ đọc cho Con gõ vào màn khoá; máy tự kiểm bằng bí mật TOTP chung (`lib/ma-offline.ts`, cấp lúc ghép + qua `dong-bo.windows.maOfflineBiMat`). Mỗi mã sống ~5–15 phút; ghi nhật ký `xem_ma_offline`. Chỉ máy Windows. Máy nhận mã (`agent-win` `MoTamOffline`): mở 60 phút, gỡ MỌI khoá (hết giờ, giờ ngủ, khoá ngay) — mã do Ba Mẹ đọc và khi mất mạng đây là đường duy nhất mở máy, không để máy kẹt (khác mở khẩn cấp online vốn giữ giờ ngủ/khoá ngay); sai 5 lần / 10 phút thì chờ; mỗi mã một lượt; mã chỉ dành cho lúc mất mạng: lần đồng bộ thành công đầu tiên kết thúc lượt mở (sự kiện `het_ma_offline`, `ket_thuc: co_mang`, chỉ ghi nhật ký); có mạng lại gửi sự kiện `mo_ma_offline` / `sai_ma_offline` / `het_ma_offline` (`su-kien`) |
| `POST may/:id/tai-khoan-tin-cay {ten, tinCay?}` | xác nhận (hoặc bỏ, `tinCay: false`) tài khoản quản trị trên máy là của Ba Mẹ ⇒ `{adminTinCay}` |
| `POST may/:id/go-tu-xa {matKhau}` | chỉ **chủ gia đình**, xác thực lại bằng mật khẩu ⇒ `{id, lapLai, cach}`; ghi lệnh `go` cho máy. Lỗi: `sai_mat_khau` 401 · `chi_chu` 403 · `khong_thay` 404 |
| `POST may/:id/che-do {cheDo: "giam-sat"\|"chan"}` | chế độ agent do Ba Mẹ chọn từ xa ⇒ `{cheDo, doi}` (`doi: false` khi không đổi). Vai Chỉ xem 403 `chi_xem` · `che_do_sai` 400 · `khong_thay` 404. Ghi nhật ký `doi_che_do {tu, sang}` (+ người) và cảnh báo cho Ba Mẹ trong gia đình |
| `POST may/:id/doi-ten {ten}` | Ba Mẹ đổi tên hiển thị của máy (1–80 ký tự, NFC + gộp khoảng trắng) ⇒ `{ok, ten, doi}` (`doi: false` = tên không đổi, không ghi nhật ký). Rỗng `thieu_ten` · dài `ten_qua_dai` 400 · máy nhà khác `khong_thay` 404 · Chỉ xem 403. Ghi nhật ký `doi_ten_may {tu, den}`. Đổi tên Con: `POST con/:id/sua {ten}` và tạo Con (1–30 ký tự sau NFC + gộp khoảng trắng; tạo Con cho phép trùng tên, chỉ đổi tên (`con/:id/sua`) mới `ten_trung` nếu trùng Con khác trong nhà; ghi `doi_ten_con`) |
| `POST may/:id/go {matKhau, xoaHan?}` | **gỡ an toàn** — xem mục «An toàn & gỡ cài đặt» bên dưới |
| `GET con/:id/luat-mang?mac=&ten=&nen=tvos\|android_tv\|tizen\|webos\|mang` | TV / thiết bị không có agent: luật router (chặn Internet theo MAC + lịch) + DNS (NextDNS / Pi-hole) dựng từ chính sách chung của Con |

### An toàn & gỡ cài đặt (22/10 — Ba Mẹ luôn tắt được hạn chế và gỡ sạch được, không để AiiGrow «dính» trên máy Con)

Xử lý: `server/lib/lenh-may.ts` (`datCheDo`, `goMayAnToan`, `trangThaiGo`). Test: `an-toan-go.test.ts`. Màn: app Ba Mẹ › máy › «An toàn & gỡ cài đặt».

- **Chế độ**: `giam-sat` = chỉ ghi lại việc sẽ chặn, không chặn, không màn khoá · `chan` = chặn thật.
  `devices.che_do` + `devices.che_do_ba_me` (Ba Mẹ đã chọn chưa). **Máy Windows/Mac riêng của Con ghép từ 25/10 vào thẳng Chặn thật** (máy dùng chung chưa gán Con thì không): lúc ghép ghi sẵn
  `che_do = chan`, `che_do_ba_me = true` ⇒ lần đồng bộ đầu đã gửi `windows.cheDo = "chan"` (agent hiện có đổi ngay, không cần bản mới); máy ghép trước
  giữ nguyên (chưa chọn). Ba Mẹ vẫn chuyển «Chỉ theo dõi» bằng `POST may/:id/che-do`. Chưa chọn ⇒ máy chủ **không** gửi `windows.cheDo` (agent giữ chế độ lúc cài) và
  app hiện chế độ agent báo (`status.cheDo`) — máy cài sẵn «chặn» không bị hiện nhầm «giám sát», cũng không lặng lẽ tụt về giám sát.
  Đã chọn ⇒ `dong-bo.windows.cheDo` mang lựa chọn; agent-win: giá trị máy chủ thắng `CheDo` cục bộ (`--che-do=` của Setup), lưu lại cho lúc mất mạng;
  đổi sang `giam-sat` ⇒ agent gỡ ngay luật AppLocker, thôi đóng app / ngắt phiên / màn khoá. Máy đang có lệnh gỡ chờ ⇒ luôn `giam-sat`.
  Agent cũ bỏ qua trường này và không gửi `status.cheDo` (app ghi «máy chưa báo chế độ — bản cũ»).
- **Fail-open (agent-win)**: `dong-bo` bị từ chối token (401/403) liên tục > 6 giờ (máy bị xoá khỏi gia đình mà chưa gỡ) ⇒ agent về giám sát,
  gỡ luật AppLocker, bỏ Policy cuối (không khoá giờ ngủ / allowlist cũ, kể cả sau khởi động lại), khay báo «gỡ ở Cài đặt › Ứng dụng»; vẫn thử đồng bộ.
  Lỗi mạng không tính (mất mạng vẫn chạy theo Policy cuối như cũ).
- **Gỡ từ xa (agent-win)**: nhận `go` ⇒ `POST lenh/:id/xong` TRƯỚC (không theo token huỷ của dịch vụ; mất mạng ⇒ chưa gỡ, lần sau nhận lại) ⇒ tắt khôi phục SCM +
  `start= disabled` ⇒ hẹn tác vụ `AiiGrow-Dontay` (SYSTEM, tách rời) chờ dịch vụ thoát rồi `sc delete` + xoá tệp ⇒ gỡ AppLocker, khay, thông báo,
  mục Ứng dụng, cấu hình ⇒ dịch vụ tự dừng. Không `Stop-Service` chính mình.
- **`POST may/:id/go {matKhau, xoaHan?}`** — chỉ **chủ gia đình**, nhập lại mật khẩu (như `go-tu-xa`, vì gỡ = bỏ bảo vệ):
  - máy đã từng đồng bộ (đã gọi `dong-bo` hoặc gửi `nhip`) ⇒ ghi lệnh `go` (cùng lệnh với `go-tu-xa`, bấm lại không tạo lệnh mới) ⇒
    `{trangThai: "dang_go", id, lapLai, cach}`. Máy **không** bị xoá ngay: chỉ rời gia đình khi agent `POST lenh/:id/xong`.
  - máy chưa đồng bộ lần nào ⇒ 409 `can_xoa_han` (app hỏi lại) · gửi `xoaHan: true` ⇒ xoá ngay ⇒ `{trangThai: "da_xoa", canGoTaiMay: false}`.
  - `xoaHan: true` khi đang gỡ: chỉ được nếu lệnh gỡ đã chờ > 7 ngày **và** máy không liên lạc (dong-bo / nhịp) > 7 ngày ⇒ lệnh chờ chuyển `huy`,
    máy xoá, `{trangThai: "da_xoa", canGoTaiMay: true}` (app nhắc gỡ tại máy). Chưa đủ điều kiện ⇒ 409 `chua_duoc_xoa_han`.
  - Lỗi khác: `sai_mat_khau` 401 · `chi_chu` 403 · `khong_thay` 404. Sự kiện: `lenh_go` · `go_may {cach: tu_xa | xoa_han}`.
- `GET tuan-thu` / `GET may/:id/tuan-thu` thêm: `cheDo` (hiển thị; `null` = chưa biết), `cheDoMay` (agent báo; `null` = chưa báo), `cheDoBaMeChon`
  (`null` = chưa chọn), `daDongBo`, `dangGo: {lenhId, tu} | null`, `coTheXoaHan`.
- **Gỡ tại máy** (Windows): Cài đặt → Ứng dụng → AiiGrow → Gỡ cài đặt — mục `HKLM\…\Uninstall\AiiGrow` trỏ `"C:\Program Files\AiiGrow\AiiGrow.Setup.exe" --uninstall`
  (Setup xin quyền quản trị ⇒ Windows hỏi mật khẩu của Ba Mẹ). Bộ gỡ gọi `POST /api/device/da-go` trước khi xoá token, rồi gỡ sạch (dịch vụ, khay,
  AppLocker, thông báo đăng nhập, mục Ứng dụng, ProgramData). Máy cài bản cũ (chưa có mục này / chưa chép Setup.exe): tải bộ cài ở `/tai`, chạy
  `AiiGrow.Setup.exe --uninstall` bằng quyền quản trị.

Tham số mới (cau-hinh, kẹp min–max): `mat_nhip_di_dong_phut` 180 (30–1440) · `tuan_thu_nguong` 80 (0–100) · `mo_khan_cap_toi_da_phut` 120
(15–720) · `goi_cai_gio` 48 (1–168). Ngưỡng mất nhịp máy tính dùng `ngung_chay_phut` 15 có sẵn.

## M4b kiểm soát mạng — hồ sơ DNS gia đình, máy con loại mạng (chỉ thêm)

Xử lý: `server/lib/dns-gia-dinh.ts`, `ho-so-dns.ts` (thuần), `huong-dan-mang.ts` (dữ liệu), `api-dns.ts`. Test: `dns.test.ts`.
Chi tiết + giới hạn của DNS: `docs/QUAN-LY-DA-NEN-TANG.md` mục 5.

### App Ba Mẹ — `/api/m/*`

| Đường | Ý |
|---|---|
| `GET dns` | `{nhaCungCap, thietBi[{id, ten, loai, con, mayId, mac, nhan, truyVanCuoi, trangThai: qua_bo_loc\|mat_truy_van\|chua_thay}], huongDan}` |
| `GET dns/huong-dan` | `{chiMotLan, router[], tv[], gioiHan[], loaiThietBi}` — dắt tay đặt DNS ở router (TP-Link, Viettel, FPT, VNPT, Tenda, ASUS) / TV, console |
| `POST dns/nha-cung-cap {loai: tu_host\|nextdns, hoSo?}` | chọn nhà cung cấp; NextDNS cần mã hồ sơ Ba Mẹ tự tạo (không lưu khoá API) |
| `POST dns/thiet-bi {con?, ten, loai: tv\|console\|khac, mac?}` | thêm máy con loại mạng → `{id}` |
| `GET dns/thiet-bi/:id/ho-so` | `{thietBi, nhaCungCap, diemCuoi{dohUrl, dotHost, ipv4, ghiChu}, apple{mobileconfig, tep}, android{privateDns, buoc}, windows{mauDoh, powerShell, netsh}, dnsThuong}` |
| `GET dns/thiet-bi/:id/mobileconfig` | tệp `.mobileconfig` (`application/x-apple-aspen-config`) |
| `GET dns/thiet-bi/:id/nhat-ky?ngay=` | tóm tắt: `{ngay, ds[{tenMien, soLan, soLanChan, ngoaiGio}], tong}` |
| `POST dns/thiet-bi/:id/day` | đẩy chính sách lên nhà cung cấp → `{cheDo: khong_can\|gia\|that, yeuCau[]}` |
| `POST dns/thiet-bi/:id/xoa` | |
| `GET may/:id/ho-so-dns` | hồ sơ DNS cho máy có agent |

### Agent — `/api/device/*`

`POST ho-so-dns` → hồ sơ DNS của chính máy (trình cài một chạm tự cài: mobileconfig / Private DNS / DoH Windows).

### Resolver tự host — `/api/dns/*` (Bearer = `AIIGROW_DNS_BI_MAT`; chưa đặt ⇒ 503)

`GET chinh-sach/:nhan` → `{thietBi, tz, chan[], giaiTri[], choPhep[], lichMo, chanTatCaNgoaiGio, khoaNgay, giaiTriDuocMo}` ·
`POST nhat-ky {nhan, ds: [{tenMien, soLan, soLanChan, ngoaiGio}]}` hoặc `{nextdns: [{domain, status, device: {name}}]}` → `{nhan}` ·
`POST quet` → quét thiết bị mất truy vấn.

Tham số mới: `dns_mat_truy_van_phut` 180 (30–1440) · `dns_vuot_gio_nguong` 20 (1–1000).

## Thành viên gia đình + thông báo trong app (FR-01.04, FR-08.01 — chỉ thêm)

> **Phần thành viên dưới đây đã được thay bởi thiết kế 05/11** — xem mục «S2 thiết kế chốt 05/11» cuối tệp (2 quyền, mời bằng SĐT / email, link). Phần thông báo giữ nguyên.

Xử lý: `server/lib/thanh-vien.ts`, `thong-bao.ts`, router `api-gia-dinh.ts` (api-m chuyển tiếp). Test: `thanh-vien.test.ts`.

| Đường | Ý |
|---|---|
| `GET moi/:ma` (không cần đăng nhập) | xem trước lời mời → `{tenGiaDinh, nguoiMoi, vai: duyet\|xem, tenVai, tenGoi, het}`. Lỗi: `ma_moi_sai` 404 · `ma_moi_da_dung` 409 · `ma_moi_het_han` 410 |
| `POST moi/dang-ky {ma, dinhDanh, otp, ten, matKhau}` (không cần đăng nhập) | tạo tài khoản bằng lời mời (OTP lấy như đăng ký: `POST otp {dinhDanh, mucDich: "dang_ky"}`) → `{token}`; vào đúng gia đình, đúng vai. `ma` nhận cả link `…/moi?ma=…`, chữ thường, có gạch |
| `POST moi/nhan {ma}` | tài khoản đã đăng nhập nhưng còn TRỐNG (chưa có Con, máy, thành viên) nhận lời mời ⇒ chuyển sang gia đình mời → `{vai}`. Lỗi `gia_dinh_co_du_lieu` 409, `da_trong_gia_dinh` 409 |
| `GET thanh-vien` | `{ds[{id, ten, vai, dinh_danh, laToi}], loiMoi[{id, vai, tenGoi, het}], toi{id, vai}, hanGio: 72}` (người đã mời ra không hiện) |
| `POST thanh-vien/moi {vai: duyet\|xem, tenGoi?}` | chỉ **Chủ gia đình** → `{id, ma: "ABCD-2345", lienKet, vai, tenGoi, het}` — mã chỉ trả MỘT lần (lưu băm), hạn 72 giờ, dùng một lần; tối đa 5 lời mời chờ, 8 người lớn |
| `POST thanh-vien/moi/:id/huy` | Chủ huỷ lời mời |
| `POST thanh-vien/:id/vai {vai}` | Chủ đổi quyền thành viên (không đổi Chủ, không tự đổi) → `{vai}` |
| `POST thanh-vien/:id/moi-ra` | Chủ mời ra: vai `roi` (giữ tên cho lịch sử «ai duyệt»), xoá mọi phiên, không đăng nhập lại được |
| `GET thong-bao` | dòng thời gian 14 ngày của RIÊNG Ba Mẹ đang gọi → `{ds[{id, nhom, muc, tieu, phu, luc, con, den, so, moi, day, imLang}], chuaDoc, caiDat, nhom[]}`. Dựng từ nhật ký + cảnh báo; nộp nhiệm vụ cùng Con cách nhau ≤ 60 phút gộp một dòng («Ken vừa nộp 3 nhiệm vụ»); việc chính mình làm không báo, việc Ba Mẹ khác làm thì báo. `den` = đường app để mở. `day` = có đẩy push không (giờ yên lặng / nhóm tắt ⇒ false, trừ `nghiem_trong`) |
| `POST thong-bao/doc {den?}` | đánh dấu đã đọc tới `den` (mặc định bây giờ) |
| `GET/POST thong-bao/cai-dat {yenLang?: {bat, tu: "HH:MM", den: "HH:MM"}, tat?: nhom[]}` | thiết lập riêng từng Ba Mẹ; `nhom`: `nhiem_vu · yeu_cau · qua · thanh_tich · ba_me_khac · canh_bao · gia_dinh` |

`thong-bao*` đi trước chặn «Chỉ xem» (vai xem vẫn đánh dấu đọc / đặt giờ yên lặng được). Push thật (Expo / APNs / FCM): chờ thiết bị.

### Đóng băng chuỗi ngày (FR-03.06) + xuất CSV báo cáo tuần (FR-06.02) — chỉ thêm

Xử lý: `server/lib/dong-bang.ts`, `xuat-csv.ts`. Test: `dong-bang.test.ts`.

| Đường | Ý |
|---|---|
| `GET con/:id/thanh-tich` | thêm `dongBang: {ngay, duocDung, daDung[]}` — `ngay` = ngày sẽ được giữ nếu bấm (hôm qua bỏ lỡ mà trước đó còn chuỗi, không thì hôm nay), null = không cần |
| `POST con/:id/dong-bang-chuoi` | Ba Mẹ (Phê duyệt / Chủ) giữ chuỗi ngày cho ngày đó → `{ngay}`; tối đa 1 lần mỗi tuần (T2–CN giờ gia đình). Ngày đóng băng không đứt chuỗi, không cộng thêm ngày, không ra điểm. Lỗi `da_dong_bang_tuan` 409 · `khong_can_dong_bang` 409 |
| `GET con/:id/bao-cao/csv` | `{tenTep, noiDung}` — CSV (BOM UTF-8, CRLF) của báo cáo tuần: theo ngày (giải trí / học), tổng so tuần trước, dùng nhiều nhất, điểm theo nhóm nhiệm vụ, duyệt / từ chối, ngoại lệ. Không có nội dung, ảnh, tin nhắn |

## Giám sát và lọc web theo tên miền (22/10) — chỉ thêm

Xử lý: `server/lib/web.ts`, bảng `web_nhat_ky` (thiết bị, ngày, tên miền → số lượt, giây, lần cuối). Test: `web.test.ts`. Agent: `agent-win` (`WebGuard`, `WebHistory`).
Chỉ lưu **tên miền gốc + đếm**, không URL đầy đủ, không tiêu đề trang. Luật dùng lại bảng `app_rules` (`hoc` = Cho phép, `chan` = Chặn, `giai_tri` = chặn trừ khi đang có phiên chơi bằng điểm đúng trang đó); allowlist hệ thống (classroom.google.com, zoom.us…) luôn mở.

| Đường | Ý |
|---|---|
| `POST /api/device/web/lich-su {ds:[{ngay, tenMien, soLan, giay, lanCuoi}]}` | agent gửi TỔNG theo (ngày, tên miền) mỗi ~5 phút (hôm qua + hôm nay, mỗi lần). Máy chủ lấy giá trị **lớn hơn** (`greatest`) nên gửi lại không cộng đôi; tối đa 400 dòng/lần; giữ 90 ngày. Tên miền sai bị bỏ |
| `GET /api/m/con/:id/web?ngay=7` | `{soNgay, homNay{giay,soLan,soTrang}, theoNgay[], tongGiay, top[{tenMien, giay, soLan, lanCuoi, trangThai: cho_phep\|chan\|giai_tri\|he_thong\|chua_xep, nguon}], tatCa, luat[], cheDoWeb: mo\|chi_cho_phep, heThong[], mayLoc[{id, ten, cheDo, lanCuoi}]}` — `mayLoc` là máy Windows có thể lọc web, `cheDo` giam-sat ⇒ chưa chặn thật |
| `POST /api/m/con/:id/web/trang {muc, trangThai: cho_phep\|chan\|mac_dinh, caNha?}` | đặt/bỏ luật cho một tên miền (một Con, hoặc `caNha: true` cho cả gia đình). 409 `he_thong` nếu là trang hệ thống; ghi sự kiện `doi_luat_web` |
| `POST /api/m/con/:id/cau-hinh {web_chi_cho_phep: 0\|1}` | tham số mới (mặc định 0): 1 = chỉ vào trang Cho phép (chặn `*`, cho phép danh sách) |
| `dong-bo.windows.web` | `{cheDo: mo\|chi_cho_phep, chan[], cho[]}` cho agent Windows. Agent chỉ ghi vào Chrome/Edge/Brave khi chế độ là **Chặn thật** |

## Danh sách app thật (25/10) — Ba Mẹ chặn / cho phép đúng app ĐÃ CÀI trên máy Con, kèm icon thật (`server/lib/app-may.ts`, test `app-may.test.ts`)

Thanh: *"danh sách ứng dụng load trực tiếp từ máy thực tế để phụ huynh chọn đúng app muốn chặn, không chặn chủ quan từ trên app xuống"*.

### Agent — `/api/device/*`
- `POST ung-dung` — đủ `{du: true, bam, ds: [App]}` hoặc phần đổi `{du: false, bamTruoc, bam, them: [App], bo: [khoa]}`. `bamTruoc` khác bam máy chủ
  giữ ⇒ **409 `can_gui_du`** (agent gửi đủ). 200 `{ok, bam, soApp}`. ≤ 1500 app/máy; icon > 16 KB base64 bị bỏ icon.
  App: `khoa` (duy nhất trong máy: Win32 `exe:<đường dẫn>`, Store `appx:<PackageFamilyName>`, bundle id, package), `muc` (định danh để xếp/chặn — tên exe
  chính / Name gói Store / bundle id / package; máy chủ hạ chữ thường), `ten`, `nguon` (registry | start | store | applications | user-applications | launcher),
  `nhaPhatHanh`, `teamId` (Mac), `duongDan`, `thuMuc` (Windows: thư mục cài, không gửi thư mục quá rộng), `phienBan`, `sha256` (exe Windows), `icon` (PNG base64 icon THẬT trích từ máy, 96 px, ≤ 64 KB base64), `iconBam` (SHA-256 hex của byte PNG).
  Icon theo băm: chỉ gửi `icon` khi app mới / icon đổi; gửi `iconBam` không kèm ảnh mà băm trùng ⇒ máy chủ giữ ảnh cũ. 200 có `thieuIcon: [khoa]` (băm có, ảnh chưa) ⇒ lượt sau gửi kèm ảnh.
- `dong-bo` (Win/Mac) và `nhip` (Android) trả thêm ở gốc `danhSachApp: {bam, yeuCau}` — `yeuCau` đổi (Ba Mẹ bấm Làm mới) ⇒ gửi đủ; `bam` lệch ⇒ gửi phần đổi/đủ.
- `dong-bo.windows.blockedApps: [{muc, duongDan?, thuMuc?, sha256?, nhaPhatHanh?, teamId?}]` — app Ba Mẹ đặt Chặn, kèm định danh thật của CHÍNH máy này;
  agent đóng ở mọi mode (kể cả `tu_do`) khi chế độ «chan». Android chặn theo `chinhSach.ungDung.chan` (gói lạ như `ru.*` nay có `kieu: "app"` nhờ danh sách thật).

### App Ba Mẹ — `/api/m/*`
- `GET may/:id/ung-dung` → `{may, capNhatLuc, yeuCauLuc, ds: [{khoa, muc, ten, nguon, nhaPhatHanh, teamId, duongDan, phienBan, icon, trangThai, nhom, theoCaNha, tamThoi?}]}`;
  `trangThai`: he_thong | cho_phep | hoc | giai_tri | chan | chua_xep (Allowlist hệ thống → luật riêng Con dùng máy → luật cả nhà).
- `POST may/:id/ung-dung/dat {khoa, trangThai: cho_phep|hoc|giai_tri|chan|bo, nhom?}` → `{muc, con, truoc}` — `muc` lấy từ danh sách của máy (app không còn ⇒ 404
  `khong_thay_app`). Máy riêng ⇒ luật riêng của Con; máy dùng chung ⇒ luật cả nhà. «Cho phép» = `loai hoc` + `nhom cho_phep` (thời gian màn hình tính Tiện ích).
  Hoàn tác: `luat` với `truoc` / `luat/xoa` khi `truoc` null.
- `POST may/:id/ung-dung/lam-moi` → `{yeuCauLuc}`.

## S2 thiết kế chốt 05/11 — gia đình 2 quyền, chặn 2 chế độ, bỏ PIN, lần đầu, ghép máy (L4–L8, `docs/KE-HOACH-KHOP-THIET-KE-0511.md`)

Xử lý: `server/lib/quyen.ts`, `thanh-vien.ts`, `chan-co-ban.ts`, `che-do-chan.ts`, `thiet-lap.ts`, `ghep-may.ts`. Test: `s2-gia-dinh-chan.test.ts`, `thanh-vien.test.ts`, `agent-windows.test.ts`.
Lược đồ: `SCHEMA_S2` (cuối `schema.ts`). Hợp đồng cũ giữ chạy cho app / agent bản trước; chỗ đổi nghĩa ghi rõ dưới.

### Quyền (L6)

- `parents.vai`: **`ba_me`** (làm được hết) · **`trong_giup`** (Người trông giúp) · `roi`. Dữ liệu cũ đã đổi: `chu`, `duyet` ⇒ `ba_me`; `xem` ⇒ `trong_giup`. Người tạo nhà: `families.chu_id` (chỉ người này xoá được cả nhà; không ai đổi quyền / mời ra người này).
- `GET toi` → `baMe {id, ten, dinhDanh, quyen, laChuNha, vai}` — `vai` là giá trị **kiểu cũ** cho app bản trước (`chu` = người tạo nhà, `duyet` = Ba Mẹ khác, `xem` = Người trông giúp).
- Người trông giúp: mọi `GET`; `POST` chỉ: `con/:id/khoa`, `con/:id/loi-khen`, `luot/:id/duyet|tu-choi|hoan-tac`, `duyet-hang-loat`, `yeu-cau/:id/dong-y|tu-choi`, `phieu/:id/xac-nhan|huy`, `phien/:id/dung`, `thong-bao/*`, `moi/nhan`, `thanh-vien/roi-nha`, `dang-xuat`, `xoa-tai-khoan` (danh sách: `quyen.ts` › `trongGiupDuoc` — đường POST mới thuộc loại «xem / duyệt / khoá máy» phải thêm vào đây). Còn lại ⇒ 403 `chi_xem`. `GET may/:id/ma-offline` mở cho cả Người trông giúp.
- Gỡ máy (`may/:id/go`, `go-tu-xa`) và gỡ tại máy bằng mật khẩu: mọi **Ba Mẹ** (trước: chỉ Chủ).

### Mời người nhà (L6) — bỏ mã gõ tay

| Đường | Ý |
|---|---|
| `POST thanh-vien/moi {dinhDanh, quyen: ba_me\|trong_giup, tenGoi?}` | Ba Mẹ mời bằng SĐT / email → `{id, ma, lienKet, quyen, vai, tenGoi, dinhDanh, het, chiaSe{tieuDe, noiDung, lienKet}}`. `ma` = token 16 ký tự trong link (trả MỘT lần, lưu băm, hạn 72 giờ). Mời lại đúng SĐT / email ⇒ huỷ lời mời cũ. Lỗi: `dinh_danh_sai` · `da_trong_nha` 409 · `quyen_sai` · `qua_nhieu_loi_moi` 409 (5) · `du_thanh_vien` 409 (8). App cũ gửi `{vai: duyet\|xem}` không định danh vẫn được (lời mời chỉ qua link). Máy chủ chưa gửi SMS / email — app chia sẻ `chiaSe` qua Zalo / Tin nhắn / Messenger / Sao chép |
| `GET thanh-vien` | `{ds[{id, ten, quyen, tenQuyen, laChuNha, vai(cũ), dinh_danh, laToi}], loiMoi[{id, quyen, vai(cũ), tenGoi, dinhDanh, het, guiLuc}] (đang chờ, còn hạn), toi{id, quyen, vai, laChuNha}, hanGio}` |
| `POST thanh-vien/moi/:id/gui-lai` | «Gửi lại»: link MỚI (link cũ chết), hạn thêm 72 giờ — kể cả lời mời đã quá hạn; đã nhận / đã huỷ ⇒ 404 |
| `POST thanh-vien/moi/:id/huy` | huỷ |
| `POST thanh-vien/:id/quyen {quyen}` (bí danh `/vai {vai}`) | đổi quyền → `{quyen, vai}`. Lỗi `khong_doi_chu` 409 (người tạo nhà), `khong_tu_doi` 409 |
| `POST thanh-vien/:id/moi-ra` | mời ra (vai `roi`, xoá phiên). Không mời ra người tạo nhà |
| `POST thanh-vien/roi-nha` | «Rời nhà?»: người không phải người tạo nhà rời đi, giữ tài khoản — sang một nhà trống mới của mình. Người tạo nhà ⇒ 409 `chu_khong_roi` (dùng xoá tài khoản) |
| `GET moi/:ma` (không đăng nhập) | xem trước → `{tenGiaDinh, nguoiMoi, quyen, tenQuyen, tenGoi, tenCon[], het, vai(cũ), tenVai}` |
| `POST moi/dang-ky {ma, dinhDanh, otp, ten, matKhau}` (không đăng nhập) | tạo tài khoản bằng link → `{token}` |
| `POST dang-ky` / `POST dang-nhap` | trả thêm `loiMoi[]` = lời mời đang chờ gửi tới đúng SĐT / email này ⇒ app rẽ nhánh «Vào nhà cùng …» (không tạo Con) |
| `GET moi/cho-toi` | lời mời đang chờ cho SĐT / email của người đang đăng nhập → `{ds[{id, tenGiaDinh, nguoiMoi, quyen, tenQuyen, tenGoi, tenCon[], het}], chiQuaLink}`. `chiQuaLink: true` = tài khoản tạo bằng Facebook (định danh `fb:<id>`, không có SĐT / email để khớp): `ds` luôn rỗng, chỉ nhận qua link mời (`moi/nhan {ma}`; `{id}` ⇒ 403 `can_link_moi`) |
| `POST moi/nhan {id}` hoặc `{ma}` | «Vào nhà» một lệnh: `id` (lời mời gửi tới đúng định danh của mình) hoặc `ma` (token link) → `{quyen, vai}`. Tài khoản phải còn trống (chưa Con / máy / người lớn khác) — `gia_dinh_co_du_lieu` 409 |

### Đăng nhập Google / Facebook (05/11 — `lib/dang-nhap-mxh.ts`, cách tạo app OAuth + env: `docs/OAUTH.md`)

| Đường (không cần đăng nhập) | Ý |
|---|---|
| `GET cau-hinh-dang-nhap` | `{google: bool, facebook: bool}` — app ẩn nút nào `false` (thiếu env `GOOGLE_CLIENT_IDS` / `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`) |
| `POST dang-nhap/google {idToken}` | id_token Google (kiểm chữ ký JWKS, `iss`, `aud` ∈ `GOOGLE_CLIENT_IDS`, hạn, `email_verified`) → `{token, moi?, loiMoi[]}` |
| `POST dang-nhap/facebook {accessToken}` | access token Facebook (Graph `debug_token` đúng app, `/me` lấy id + email tham khảo) → `{token, moi?, loiMoi[]}` |
| `POST lien-ket/google {idToken, matKhau}` · `POST lien-ket/facebook {accessToken, matKhau}` | (đăng nhập + mật khẩu hiện tại) gắn tài khoản Google / Facebook vào CHÍNH tài khoản đang đăng nhập → `{ok, nguon}`; lỗi `chua_co_mat_khau` 409 · `sai_mat_khau` 401 · `mxh_da_gan` 409 (đã gắn tài khoản khác) · `mxh_da_gan_khac` 409 (tài khoản này đã gắn một cái cùng nguồn) · `qua_nhieu_lan` 429 (5 / Ba Mẹ + 10 / IP mỗi 15 phút) |

Danh tính = (nguồn, mã người dùng Google/Facebook) — bảng `ba_me_mxh`. Lần đầu ⇒ tạo nhà mới, Ba Mẹ là người tạo nhà, không mật khẩu
(`moi: true`). Google: định danh = email (đã xác minh); email ĐÃ có tài khoản ⇒ 409 `mxh_da_co_tai_khoan` (không tự gắn theo email — chống
chiếm trước). Facebook: định danh riêng `fb:<id>` (`GET toi` › `dinhDanh: "Facebook"`, `laFacebook: true`), email Facebook chỉ lưu tham khảo — không khớp, không
giữ chỗ, không chặn ai đăng ký email / Google đó; không có email vẫn vào được. Gắn vào tài khoản có sẵn: `lien-ket/*` khi đang đăng nhập.
`loiMoi[]` như `dang-nhap`: email khớp `loi_moi.dinh_danh` ⇒ thấy lời mời — chỉ Google (email_verified); tài khoản tạo bằng Facebook luôn `[]`
(chỉ nhận qua link mời). Lỗi: `mxh_chua_bat` 503 · `mxh_sai` 401 · `mxh_khong_email` 400 (Google) · `mxh_mang` 502 · `qua_nhieu_lan` 429 (30 lượt hỏng / IP,
10 lượt / tài khoản MXH mỗi 15 phút; `dat-mat-khau` 5 / Ba Mẹ + 10 / IP). `quen-mat-khau` cho tài khoản chưa từng có mật khẩu ⇒ 409 `chua_co_mat_khau`.
`GET toi` › `baMe.coMatKhau` (false = tài khoản Google/Facebook chưa đặt mật khẩu). Gỡ máy / xoá tài khoản khi chưa có mật khẩu ⇒ 409
`chua_co_mat_khau`. `POST dat-mat-khau {matKhauMoi, idToken | accessToken}` (đăng nhập; xác minh lại bằng đúng tài khoản Google/Facebook đã gắn)
⇒ `{ok}`; lỗi `mk_ngan` · `mxh_khong_khop` 403 · `da_co_mat_khau` 409.

### Chặn app 2 chế độ (L4)

| Đường | Ý |
|---|---|
| `GET con/:id` | thêm `cheDoChan: chi_app_duoc_phep\|mo_het`; `coPin` luôn `false` |
| `POST con/:id/che-do-chan {cheDo}` | Ba Mẹ đổi chế độ → `{cheDoChan, ten}`. Lỗi `che_do_chan_sai` |
| `POST con/:id/app-cho-phep {apps: [{ma} \| {ten, tinhGio?}]}` | cho Con dùng thêm app (không bỏ app cũ). `ma` = app trong lưới ⇒ luật cho MỌI định danh (exe / bundle / gói / tên miền). `{ten}` («Thêm app khác») ⇒ khớp tên với app thật máy của Con đã báo; chưa thấy thì chờ (`app_theo_ten`) và tự khớp khi máy gửi `POST /api/device/ung-dung`. `tinhGio`: true ⇒ `giai_tri` (tính vào giờ chơi), false ⇒ `hoc`. → `{daDat[{ten, muc[]}], choKhop[ten]}` |
| `GET app-goi-y?con=` | lưới app → `{ds[{ma, ten, tinhGio, chon}]}` (`chon` = Rob chọn sẵn theo nhóm tuổi) |
| `GET luon-chan` | `{nhom[{ma: nguoi_lon\|co_bac\|bao_luc, ten, soTrang}], cheDo[{ma, ten}]}` |
| `POST luat` | web luôn chặn với `loai` ≠ `chan` ⇒ 409 `web_cam` |
| `POST may/:id/che-do {cheDo}` | chỉ còn `chan`; `giam-sat` ⇒ 409 `che_do_bo` |

Agent: `POST /api/device/xin-duyet {muc, ten?, lyDo?}` và `POST /api/kid/xin-duyet` (cùng thân) — Con «Xin Ba Mẹ mở …» app / web lạ ⇒ yêu cầu `cai_app` (app) / `mo_web` (web) chờ duyệt → `{id, trang_thai: "cho", daCo, loai, muc}`; đã có lời xin chờ cho đúng mục ⇒ trả lời xin đó (`daCo: true`); web luôn chặn ⇒ 409 `web_cam`. `POST yeu-cau` loại `mo_web` / `cai_app`: `lyDo` không bắt buộc nữa. Ba Mẹ duyệt như cũ (`yeu-cau/:id/dong-y {phanLoai, phamVi}`) — không trừ điểm.

Policy (`POST /api/device/dong-bo`): thêm `cheDoChan`, `webLuonChan[]` (tên miền luôn chặn, gồm tên miền con); `webChiChoPhep` = (Con có chế độ rõ ⇒ `cheDoChan === chi_app_duoc_phep`; Con cũ `che_do_chan` null ⇒ tham số `web_chi_cho_phep` như trước).
`windows` (Windows + Mac): `cheDo` **luôn `chan`** (trừ máy đang có lệnh gỡ ⇒ `giam-sat`); Con «Mở hết» ⇒ `mode: tu_do` không `grantEndsAt` (khoá ngay / giờ ngủ vẫn `khoa`), `web.cheDo: mo`, trang Giải trí mở; `web.chan` luôn chứa `webLuonChan`, `web.cho` không bao giờ chứa chúng; `blockedApps` vẫn áp.
Chính sách chung (`chinh-sach.ts`, Android / iOS / DNS): `ungDung.cheDoChan`, `ungDung.webLuonChan`, `ungDung.chuaXep: chan\|cho_phep` (Mở hết ⇒ `cho_phep`).

### Bỏ PIN hồ sơ Con (L5) — **ĐÃ ĐẢO 06/11 (L13, mục «S3» cuối tệp): PIN theo bé quay lại**

`POST con` / `con/:id/sua`: `pin` bỏ qua (không lưu, không lỗi). Agent: `POST /api/device/chon-con {con}` (bí danh `pin`, `pin` bỏ qua) → `{phienCon}`. Máy riêng của Con chỉ chọn được chính Con đó.

### Thiết lập lần đầu (L7)

`POST thiet-lap {con: {id?, ten, namSinh?, avatar?}, gioChoi?: {ngayThuong, cuoiTuan}, ngu?: {tu: "HH:MM", den: "HH:MM"}, cheDoChan?, apps?: [...]}` — một lệnh cho màn tên Con + Giờ chơi + Chọn app. Gửi lại với `con.id` ⇒ sửa, không tạo Con thứ hai. → `{conId, ten, cheDoChan, gioChoi{ngayThuong, cuoiTuan}, ngu{tu, den}, soApp, app{daDat, choKhop}}`. `GET con/:id/thiet-lap` → cùng tóm tắt (màn «Đã ghép máy» / «Xong rồi»).
**Quỹ giờ chơi** lưu ở `children.cau_hinh`: `quy_ngay_thuong`, `quy_cuoi_tuan` (phút / ngày, 0–480 ở thiết lập; tham số mục 10 — S1 tính quỹ, xem mục «Thiết kế chốt 05/11 — sao, quỹ giờ chơi»). `ghep-may.ts` chép nguyên `cau_hinh`. Giờ ngủ ghi `children.lich.ngu`.
Lỗi: `phut_sai`, `gio_sai`, `che_do_chan_sai`, `app_sai`. Nhánh «Tôi được mời vào nhà» không gọi đường này (xem `moi/cho-toi`, `moi/nhan`).

### Ghép máy (L8)

| Đường | Ý |
|---|---|
| `POST ghep-may {con?, giongMay?, nen?}` | một lần «Ghép máy» → `{ma, maHien: "482 017", het, hanPhut: 10, conGiay, lienKet, qr, tokenGoi, hetGoi, con, giongMay, chiaSe{tieuDe, noiDung, lienKet}}`. `nen` bỏ trống (mặc định) = không gắn loại máy. `lienKet` = `<gốc>/tai?g=<tokenGoi>&ma=<ma>`: trang tải tự nhận loại máy, trao `g` cho bộ cài ⇒ bộ cài gọi `POST /api/device/ghep-goi {token: g, nen, tenMay}` là tự ghép (hạn `goi_cai_gio`, mặc định 48 giờ); mã 6 số là dự phòng (`POST /api/device/ghep {ma, nen, tenMay}`). Máy ghép bằng đường nào thì đường kia hết dùng. `giongMay` = id máy trong nhà ⇒ «Cài giống máy trước»: lúc ghép chép chế độ chặn, giờ ngủ + khung giờ, cấu hình (quỹ phút…), luật app/web lâu dài, app chờ khớp tên của Con dùng máy đó sang Con của máy mới (cùng Con thì không cần chép; luật riêng sẵn có của Con đích giữ) |
| `GET ghep-may/:ma` | màn «Đang chờ máy của con» → `{daGhep, hetHan, conGiay, con, may{id, ten, nen}\|null}` |
| `POST ma-ghep {con?, nen?}` | đường cũ: `{ma, hanPhut: 10}`; `nen` trống ⇒ không gắn loại máy |

Máy Windows / Mac mới ghép ⇒ `che_do = chan` ngay (kể cả máy dùng chung).

## Thiết kế chốt 05/11 — sao, quỹ giờ chơi, ngoại lệ, nhiệm vụ theo bộ, quà trao tay (S1, chỉ thêm)

Xử lý: `server/lib/quy-gio.ts` (quỹ + đổi sao + cài đặt giờ chơi), `bo-nhiem-vu.ts`, `api-sao.ts` (router các đường mới — api-m / api-con /
api-may gọi trước đường cũ), sửa `phien.ts`, `yeu-cau.ts`, `nhiem-vu.ts`, `phan-thuong.ts`, `agent-windows.ts`. Test: `sao-gio-choi.test.ts`.
Luật: `docs/KE-HOACH-KHOP-THIET-KE-0511.md` L1 L2 L3 L9 L10 — thiết kế thắng BRD / CHOT-BRD khi khác.

**Sao (L1).** Sao = điểm cũ (cột `diem`, bảng `points` giữ tên; 1 điểm = 1 sao). Trả thêm `sao` song song `soDu` / `diem` (một bản rồi bỏ):
`tomTatVi` (+`sao`, `saoChoDuyet` — có trong `GET con/:id`, `con/:id/vi`, `gia-dinh` › `con[]`, `kid/toi`), `kid/nha` (`sao`),
`hoc-vien/tong-quan` (`sao`, `saoChoDuyet`, mỗi việc `sao`), `cua-hang` (`sao`, mỗi quà `sao`), `cho-duyet` › `nhiemVu[].sao`,
`luot/:id/duyet` (`sao`, `soSao`). Lý do điểm mới `points.loai = doi_gio` (đổi sao lấy giờ / «trừ sao» khi Ba Mẹ duyệt thêm giờ).

**Quỹ giờ chơi (L2).** Mỗi ngày Con có QUỸ phút chơi; MỌI app/web Giải trí Ba Mẹ cho phép dùng chung quỹ; app Học («Từ điển») không tính.
Phút đã dùng = tổng các máy, mỗi máy lấy lớn hơn của (phút phiên chơi cũ) và (usage app `giai_tri` + giây `web_nhat_ky` của tên miền Giải trí).
Quỹ hôm nay = quỹ ngày (`quy_ngay_thuong` 60 · `quy_cuoi_tuan` 90) + phút cộng thêm hôm nay (`grants.nguon`: `xin` Ba Mẹ duyệt lời xin ·
`doi_sao` Con đổi sao · `ba_me` Ba Mẹ bấm «Cho thêm giờ» · `qua` Ba Mẹ trao quà phút). Giờ ngủ (`lich.ngu`) + **giờ học** (mới:
`lich.hoc = {tu, den, thu: [0..6]}` — chỉ app Học) khoá giải trí. **Bỏ**: giá điểm/phút theo nhóm (`giaPhanNghin` luôn 0, phiên không trừ sao),
trần ngày/tuần (`tran_ngay`, `tran_tuan` không còn chặn), khung giờ chơi (`lich.ngayThuong/cuoiTuan` không còn chặn — giữ để app cũ đọc),
nghỉ giữa hai phiên (Con tự dừng không bị bắt nghỉ). Phiên (`phien/*`) vẫn chạy cho agent / khay cũ: tối đa = quỹ còn (tới giờ ngủ / giờ học),
phiên tự dài ra khi quỹ tăng giữa chừng, hết quỹ ⇒ `lyDoKet: het_thoi_gian`; `phien/xet` lý do mới `het_gio`, `gio_hoc`.

Tham số mới (cau-hinh, kẹp min–max; Ba Mẹ đặt cho từng Con qua `con/:id/gio-choi` hoặc `con/:id/cau-hinh`):
`quy_ngay_thuong` 60 (0–600) · `quy_cuoi_tuan` 90 (0–720) · `phut_10_sao` 10 (1–60: 10 sao đổi được X phút) · `doi_sao_bat` 1 (0/1) ·
`doi_sao_toi_da_ngay` 30 (0–480 phút) · `cho_xin_them_gio` 1 (0/1) · `ngoai_le_toi_da_phut` 60 (5–240).

Đối tượng `quy` (trả ở nhiều đường): `{ngay, cuoiTuan, quyNgayPhut, themPhut, doiSaoPhut, daDung, conPhut, tongPhut, dangNgu, dangHoc, khoa,
gioNgu: {tu, den}, gioHoc: {tu, den, thu[]} | null, phutToiNgu, phutToiHoc | null, tyLe: {sao: 10, phut}, doiSao: {bat, toiDaNgay, conDoiDuoc},
choXinThem}`. «Hôm nay: còn 18 phút (42/60)» = `conPhut` (`daDung` / `tongPhut`).

**Hết giờ / ngoại lệ (L3).** Hết quỹ: Con «Dùng sao» (`doi-sao`) hoặc «Xin Ba Mẹ thêm giờ» (`yeu-cau {loai: them_gio, phut, lyDo?}` — lời nhắn
không bắt buộc; Ba Mẹ tắt `cho_xin_them_gio` ⇒ 409 `khong_cho_xin`). Ba Mẹ cho ⇒ phút cộng vào QUỸ hôm nay (mọi máy) — **không còn cửa sổ mở tự do**
(`cua_so_den`) cho thêm giờ. Giờ ngủ / Ba Mẹ khoá / giờ học: `them_gio` và `doi-sao` ⇒ 409 (`chi_ngoai_le` / `khong_them_gio`); Con chỉ xin
`yeu-cau {loai: ngoai_le, phamVi: ca_may | app, giaTri?: <app khi phamVi app>, phut ≤ ngoai_le_toi_da_phut, lyDo?}` (`ngoai_gio` của app cũ vượt tối đa ⇒ kẹp, không lỗi; ngoại lệ gửi được cả khi chỉ hết giờ — «Không trừ giờ chơi») («Không trừ giờ chơi, không trừ sao»).
Ba Mẹ đồng ý (`yeu-cau/:id/dong-y {phut?}`) ⇒ `grants.nguon = ngoai_le` tới hạn: **cả máy** = cửa sổ cho nhóm máy của lời xin (máy tính /
iPhone / Android — `hanMoCuaMay`, như mở khẩn cấp) và **thắng giờ ngủ / khoá** trên agent; Ba Mẹ đang «Khoá ngay» thì gỡ khoá tạm tới hạn (như cũ);
**một app** = chỉ app đó + app hệ thống (cả lúc ngủ / khoá). Ngoại lệ không cộng vào quỹ. `requests.pham_vi` của ngoại lệ = `ca_may` | `app`.
`dong-y` trả thêm `grantId` (Hoàn tác thêm giờ). `yeu-cau/:id` (Ba Mẹ) trả thêm `sao`, `phutDoiDuoc` («Con có 30 sao, tự đổi được 30 phút»).
«Trừ sao» khi duyệt thêm giờ (`truDiem: true`) tính theo tỷ lệ sao (`phut_10_sao`), không còn theo `gia_khac`.

### App Ba Mẹ — `/api/m/*`

| Đường | Ý |
|---|---|
| `GET con/:id/gio-choi` | «Giờ chơi của <Con>» (bm2-gio) ⇒ `{quyNgayThuong, quyCuoiTuan, phut10Sao, doiSaoBat, doiSaoToiDaNgay, choXinThemGio, ngoaiLeToiDaPhut, gioNgu, gioHoc, homNay: quy}` |
| `POST con/:id/gio-choi {quyNgayThuong?, quyCuoiTuan?, phut10Sao?, doiSaoBat?, doiSaoToiDaNgay?, choXinThemGio?, ngoaiLeToiDaPhut?, gioNgu?: {tu, den}, gioHoc?: {tu, den, thu[]} \| null}` | chỉ khoá gửi lên; số kẹp min–max; giờ sai ⇒ 400 `gio_sai`; ghi nhật ký `doi_gio_choi` ⇒ như GET |
| `GET con/:id/quy` | `{quy, sao, ngoaiLe: [{id, den, muc \| null, nhom}]}` — thẻ «Bảo Anh còn chơi 18 phút trong 60 phút hôm nay» |
| `POST con/:id/them-gio {phut: 5–240}` | Ba Mẹ «Cho thêm giờ» (15 / 30 / 60) — chỉ hôm nay ⇒ `{id, phut, quy}`; nhật ký `them_gio` (khay Con nhận tin «Ba Mẹ cho thêm giờ») |
| `POST them-gio/:id/hoan-tac` | «Hoàn tác» trong 60 giây, đúng người cho (cả grant duyệt lời xin — lời xin về «chờ»). Quá hạn ⇒ 409 `het_hoan_tac` |
| `GET nhiem-vu/bo` | bộ nhiệm vụ (Tự lập, Phụ việc nhà, Học tập, Khoẻ mạnh) ⇒ `{ds: [{ma, ten, tuoi, soViec, saoToiDaNgay, viec: [{ten, moTa, sao, bangChung, tuCham, lapLai, hinh, nhan, toiDaNgay}]}]}` |
| `POST nhiem-vu/bo {bo, con?, chon?: [tên việc giữ tick]}` | «Giao N việc cho <Con>» ⇒ `{taoMoi, ids}`; việc trùng tên đã có / việc AiiRob tự chấm đã có thì bỏ qua. 400 `bo_sai` |
| `POST nhiem-vu {…, hinh?, lap_lai?, gio_nhac?, giao_cho?: id \| id[]}` | «Thêm việc riêng»: `giao_cho` mảng ⇒ một việc mỗi Con ⇒ `{id, ids}`. `lap_lai`: `mot_lan \| hang_ngay \| ngay_thuong \| cuoi_tuan \| thu:1,3,5` (0 = CN; sai ⇒ 400 `lap_lai_sai`) · `gio_nhac` «HH:MM» (sai ⇒ `gio_nhac_sai`) · `hinh` mã hình ≤ 40 ký tự · `bang_chung`: `anh \| ghi_am \| xong` (bấm «Xong») `\| viet` (= `van_ban`) `\| tu_cham` (= `tu_dong`, AiiRob) · `tu_duyet` = «Tự cộng sao». Cũng nhận ở `POST nhiem-vu/:id` |
| `POST luot/:id/lam-lai {lyDo?, loiNhan?}` | «Nhờ làm lại» ⇒ `{trangThai: "lam_lai"}`; Con chưa nhận sao, phải nộp bằng chứng MỚI rồi Ba Mẹ duyệt tiếp. Nhật ký `lam_lai_nhiem_vu` |
| `GET luot/:id/bang-chung` | `{ds: [{id, mime, loai: anh \| ghi_am, base64, chupLuc}]}` (đường cũ `luot/:id/anh` vẫn trả mọi tệp) |
| `POST duyet-hang-loat {ids[], loiKhen?}` | «Duyệt cả 2 · +20 sao» ⇒ `{daDuyet, sao}` (cùng lời khen cho mọi lượt) |
| `GET cho-duyet` | `nhiemVu[]` thêm `sao, bang_chung, hinh, so_ghi_am` |
| `POST phieu/:id/trao` | Ba Mẹ «Đã trao, báo cho con» (= `phieu/:id/xac-nhan`) ⇒ `{ok, trangThai: "da_trao", phut?}` — quà «Thêm N phút chơi» cộng N phút vào quỹ hôm nay |
| `POST qua {ten, loai: qua \| dac_quyen \| tiet_kiem \| phut, diem, phut? (loai phut, 5–240)}` | `loai: voucher` ⇒ 400 `voucher_ngung`. Mẫu `qua/mau` mới: Thêm 30 phút chơi (30), Đi ăn kem (50), Xem phim cả nhà (40), Đồ chơi nhỏ (100) |
| `GET quy` | **410 `da_bo`** — quỹ phiếu AiiCafe ngừng (05/11). Voucher cũ còn hạn vẫn quét ở quầy (`/api/quay`), Admin vẫn đối soát |

### Màn Con — `/api/kid/*` và khay `/api/device/hoc-vien/*` (cùng đường)

| Đường | Ý |
|---|---|
| `GET quy` | `{quy, sao, phutDoiDuoc, ngoaiLe[], yeuCauCho: [{id, loai, phut, gia_tri, pham_vi, ly_do, created_at}]}` (lời xin thêm giờ / ngoại lệ đang chờ) |
| `POST doi-sao {phut}` | «Đổi 10 sao lấy 10 phút» ⇒ `{id, phut, sao, soDu, conPhut}`. Lỗi 409: `khong_du_sao` («còn thiếu X sao») · `vuot_toi_da_doi` · `khong_cho_doi` (Ba Mẹ tắt) · `khong_them_gio` (giờ ngủ / khoá / giờ học) |
| `GET nhiem-vu?tuCham=1` | như `nhiem-vu` + việc AiiRob tự chấm (`tu_cham: true` — nút «Mở Học với AiiRob»). Mỗi việc thêm `sao, lam_lai, ly_do, loi_nhan, tu_cham, hinh, lap_lai, gio_nhac`; việc ngoài ngày lặp lại (vd «Tự xếp cặp» T2–T6) không hiện. `lam_lai` hiện `trang_thai_con: can_bo_sung` (khay cũ hiểu) + `lam_lai: true` |
| `POST luot/:id/nop {anh?, ghiChu?, ghiAm?: {mime: audio/*, base64}}` | ghi âm ≤ 2 MB (`ghi_am_sai`, `ghi_am_qua_lon` 413); việc `ghi_am` thiếu ghi âm ⇒ `thieu_ghi_am` CHỈ khi app gửi `ghiAmDuoc: true` (khay Windows/Mac chưa ghi âm được ⇒ nộp không kèm vẫn được, Ba Mẹ duyệt); việc `xong` không cần bằng chứng; nộp từ `lam_lai` phải kèm bằng chứng mới |
| `GET cua-hang` · `POST doi/:quaId` | ẩn / chặn phiếu AiiCafe (`voucher_ngung` 409). Quà thêm `sao`, `choTraoTu` (lúc đổi, đang chờ Ba Mẹ trao) |
| `GET vi-qua` | thêm `daTrao[]` («Quà của con» đã trao) |
| `hoc-vien/tong-quan` | thêm `sao, saoChoDuyet, quy {conPhut, daDung, tongPhut, quyNgayPhut, themPhut, dangNgu, dangHoc, khoa, gioNgu, gioHoc, tyLe, doiSao, choXinThem}`; việc thêm `sao, hinh, lapLai, gioNhac, lamLai, loiNhan` |
| `hoc-vien/vi-qua` (chỉ khay) | `{daTrao[{id, ten, loai, diem, xu_ly_luc}], voucher[], phieu[]}` — «Quà của con» trên khay Windows (W1). `tong-quan` › `nhiemVu[]` thêm `bo` (mã bộ: tu_lap…) |
| `hoc-vien/tin` | loại mới `lam_lai_nhiem_vu` («Ba Mẹ nhờ con làm lại»), `them_gio` («Ba Mẹ cho thêm giờ»); `xac_nhan_qua` = «Ba Mẹ đã trao quà!» (+N phút); chữ «điểm» ⇒ «sao» |

Quyền (L6 của S2): **Người trông giúp** gọi được `luot/:id/lam-lai`, `con/:id/them-gio`, `them-gio/:id/hoan-tac`, `phieu/:id/trao` (xem / duyệt / trao); `con/:id/gio-choi` (POST), `nhiem-vu/bo` (POST), `qua` (POST) là đổi cài đặt ⇒ chỉ Ba Mẹ (`lib/quyen.ts` › `trongGiupDuoc`).

### Agent — Policy (`dong-bo`, `nhip`)

- Policy gốc thêm `quy: {ngayPhut, themPhut, daDung, conPhut, dangNgu, dangHoc, phutToiNgu, phutToiHoc, tyLe} | null` (null = máy dùng chung chưa
  chọn Con), `ngoaiLe: [{id, den, muc | null, nhom}]`, `lich.hoc`. `luat[].giaPhanNghin` của mục Giải trí = 0. Chính sách chung (`nhip` › `chinhSach`)
  thêm `quy`, `gioHoc`, `ngoaiLeMo` (Android / iOS đọc thay `phienDiem`).
- `dong-bo.windows` (Windows + Mac): **còn quỹ, không ngủ / khoá / giờ học / giờ máy sai ⇒ MỌI app Giải trí vào `allowedApps`** (không cần phiên),
  trang Giải trí mở trong trình duyệt; hết quỹ ⇒ rời danh sách. Trường mới: `quyConPhut` (0 khi không được chơi), `quyTongPhut`, `quyDaDung`,
  `appTinhGio[]` (app đang được thả nhờ quỹ — agent mới đếm lùi `quyConPhut` khi chúng ở tiền cảnh, cả lúc mất mạng; «Mở hết» mà hết quỹ ⇒ vẫn gửi app Giải trí với `quyConPhut` 0 để agent đóng chúng trong mode `tu_do` — 06/11), `gioNgu`, `gioHoc`, `dangGioHoc`,
  `ngoaiLe: [{den, app | null}]`. Ngoại lệ cả máy ⇒ `mode: tu_do` + `grantEndsAt` (thắng giờ ngủ / khoá); ngoại lệ một app ⇒ `locked: false`, `mode: hoc`,
  `allowedApps` = app hệ thống + app đó. `khoaKhiHetNgoaiLe: "khoa" | "ngu"` khi ngoại lệ mở lúc máy đang bị khoá (Ba Mẹ khoá / giờ ngủ) ⇒ agent
  tự khoá lại đúng lý do khi MỌI ngoại lệ hết hạn (cả lúc mất mạng — agent-win `QuyTaiCho`). `nextCheckSec` ≤ 60 khi quỹ còn ≤ 10 phút. `playOfflineMinutes` = min(quỹ còn, tới giờ ngủ / giờ học).
- **Agent cũ** (không đọc `quyConPhut`): vẫn chạy — app Giải trí vào/ra `allowedApps` theo quỹ ở mỗi lần đồng bộ (trễ ≤ 1–2 phút); mất mạng thì
  agent cũ không tự đếm quỹ (giữ danh sách cuối tới khi có mạng). Khay cũ «Chơi bằng điểm» vẫn mở phiên (giá 0, giới hạn theo quỹ).

## S3 thiết kế chốt 06/11 — PIN theo bé, quà bảng giá, mã mở máy, chuông (L13 L14 L19, `docs/KE-HOACH-KHOP-THIET-KE-0611.md`)

Xử lý: `server/lib/pin-be.ts` (PIN, máy dùng chung, Ba Mẹ dùng máy), `qua-bang-gia.ts` (quà mặc định, thư viện, xoá hoàn sao), `can-de-y.ts`
(mất mạng + chuông), `api-s3.ts` (router — api-m / api-con / api-may gọi TRƯỚC đường cũ), sửa `phan-thuong.ts` (voucher trao tay, «Áp cho»),
`ma-offline.ts` (mã mang số phút), `api-may.ts` (bé đang đăng nhập, Ba Mẹ dùng máy). Test: `s3-pin-qua.test.ts`.
Lược đồ: `SCHEMA_S3` (cuối `schema.ts`): `children.pin_ma, pin_dat_luc` · `devices.con_dang_dung, dang_nhap_luc, ba_me_den, ba_me_tu` ·
`rewards.mo_ta, hinh, ap_cho, mau` · `families.qua_seed_luc` · `vouchers.trao_tay`. Lỗi có trường phụ trả cạnh `{error, message}` (vd `conLan`, `choGiay`).

### PIN theo bé (L13 — đảo L5)

PIN = đúng 4 chữ số (`pin_sai_dang` 400). Lưu thẳng (Ba Mẹ «Hiện» lại được); chống dò bằng bộ đếm máy chủ: sai 5 lần ⇒ chờ 15 giây (theo máy + bé).
Bé **chưa có PIN** ⇒ chạm tên vào thẳng (`canDatPin: true` — máy nhắc Ba Mẹ đặt). Máy chỉ gán 1 bé vẫn hỏi PIN khi mở khoá.

**App Ba Mẹ `/api/m/*`**

| Đường | Ý |
|---|---|
| `POST con {ten, …, pin?: "4821"}` | «Thêm con» đặt PIN luôn (bỏ trống = chưa có PIN). Cũng nhận ở `con/:id/sua {pin}` |
| `GET con/:id/pin` | màn «PIN của Bảo Anh» → `{coPin: true, pin: "4821", pinDatLuc: "2026-11-06T12:30:00.000Z", ten: "Bảo Anh"}` (mọi quyền xem được) |
| `POST con/:id/pin {pin: "4821" \| null}` | «Lưu PIN mới» (chỉ Ba Mẹ; Người trông giúp 403) → `{coPin, pinDatLuc, ten}`. `null` = bỏ PIN. Xoá bộ đếm sai + mục «quên PIN» đang chờ |
| `GET con/:id` | `coPin` thật (trước luôn false) + `pinDatLuc`; `may[]` thêm `dangDung` (id bé đang đăng nhập máy dùng chung), `baMeDungDen` (ISO \| null), `matMang` (bool) |
| `GET may/:id/nguoi-dung` | ai đang dùng máy → `{dangDung: {id, ten, avatar, tu} \| null, baMeDung: {den, tu} \| null, mayRieng, con: [{id, ten, avatar, coPin, khoaDen?, choGiay?}]}` |

**Agent `/api/device/*`** (Bearer = token máy; máy dùng chung Windows / Mac / điện thoại)

| Đường | Ý |
|---|---|
| `GET\|POST ho-so` (bí danh `nguoi-dung`) | «Ai đang dùng máy?» → ví dụ dưới. `vanPin` = HMAC-SHA256(khoá = bí mật mã offline của máy `maOfflineBiMat`, chuỗi `"<id bé>:<PIN>"`) hex — agent nhớ để tự kiểm PIN khi MẤT MẠNG (tự đếm 5 lần / 15 giây). `khoaDen`/`choGiay` khi bé đang bị chờ |
| `POST dang-nhap-be {con, pin?}` | chạm tên + PIN → `{phienCon, con: {id, ten, avatar}, coPin, canDatPin?}`; máy ghi «bé đang dùng» (`devices.con_dang_dung`). Lỗi: `pin_sai` 401 `{conLan: 4…1}` («Chưa đúng · còn 3 lần thử») · `pin_tam_khoa` 429 `{choGiay: 15, khoaDen}` (lần sai thứ 5, và mọi lần thử trong 15 giây) · `can_pin` 400 (bé có PIN mà không gửi) · `khong_thay` 404 (bé nhà khác / máy riêng của bé khác) |
| `POST quen-pin {con}` | «Báo Ba Mẹ giúp con» → `{daGui: true, lapLai}` (`lapLai: true` = đã báo, chưa xử lý — không báo trùng). Ba Mẹ thấy mục `quen_pin` trong «Cần Ba Mẹ để ý»; đặt PIN mới ⇒ mục tự xong |
| `POST ba-me-mo {ma}` | «Ba Mẹ nhập mã»: mã mở máy 6 số của CHÍNH máy này (cùng mã `GET /api/m/may/:id/ma-offline`) → `{baMeDung: {den, tu}, phut}` — «Ba Mẹ đang dùng máy» trong số phút mã mang (15 / 30 / 60). Bé đang dùng bị đăng xuất. **Mỗi mã một lượt** (Con thấy mã Ba Mẹ gõ cũng không dùng lại được sau «Khoá lại»). Lỗi `ma_sai` 401 `{conLan}` · `ma_tam_khoa` 429 `{choGiay}` (sai 5 lần ⇒ chờ 10 phút) · `ma_da_dung` 409 |
| `POST dang-xuat` · `POST khoa-lai` | «Đổi bé / Đăng xuất» của bé, «Khoá lại» của Ba Mẹ → `{ok: true, khoa: true}`: bỏ bé đang dùng + xoá phiên Con của máy + hết «Ba Mẹ dùng» ⇒ máy về màn chọn tên |
| `POST chon-con {con}` · `POST pin {con, pin}` | agent CŨ — vẫn chạy y như trước, KHÔNG kiểm PIN (tương thích, theo yêu cầu giữ agent đang chạy); KHÔNG ghi «bé đang dùng» (agent cũ không header = không bé nào). Khi mọi agent đã lên bản có PIN thì khoá đường này cho bé có PIN |

```json
// GET /api/device/ho-so
{ "con": [ { "id": "c1", "ten": "Bảo Anh", "avatar": "rob", "coPin": true, "vanPin": "9f2c…" },
           { "id": "c2", "ten": "Bảo Minh", "avatar": "rob", "coPin": false, "khoaDen": "2026-11-06T12:40:15.000Z", "choGiay": 11 } ],
  "mayRieng": false, "dangDung": { "id": "c1", "ten": "Bảo Anh", "avatar": "rob", "tu": "2026-11-06T12:30:00.000Z" },
  "baMeDung": null, "pinSaiToiDa": 5, "pinChoGiay": 15 }
```

Lượt sai cũ hơn 15 phút không cộng dồn. Mã «Ba Mẹ nhập mã» chính là mã mở máy khi mất mạng (đúng thiết kế) — Ba Mẹ đọc mã cho Con lúc mất mạng thì mã đó cũng mở được chế độ Ba Mẹ trong hạn của nó (≤ 15 phút). Lượt thử PIN / mã được GIỮ CHỖ trước khi so (một upsert nguyên tử) ⇒ gửi song song cũng chỉ 5 lượt được so mỗi đợt.
`vanPin` dùng chung khoá với `maOfflineBiMat` — ai đọc được bí mật của máy vốn đã tự tính được mã mở máy, nên vân PIN không mở thêm lỗ nào; đổi lại máy kiểm được PIN khi mất mạng.

**Giờ, sao, nhiệm vụ, phiên tính theo bé đang đăng nhập.** Thứ tự xác định bé của một lệnh: máy riêng ⇒ chủ máy · header `X-Phien-Con` ·
không header ⇒ `devices.con_dang_dung` (chỉ khi phiên Con của bé đó trên máy còn hạn 12 giờ; đăng xuất / hết hạn ⇒ máy thả ra như trước).
⇒ `dong-bo`, `nhip`, `hoc-vien/*`, `yeu-cau`, `xin-duyet`, `phien/*` không cần header vẫn đúng bé.

`dong-bo` và `nhip` trả thêm `nguoiDung`: `{loai: "con", con: {id, ten, coPin}}` | `{loai: "ba_me", den}` | `{loai: "chua"}` (máy dùng chung chưa ai vào ⇒ màn chọn tên).
**Ba Mẹ đang dùng máy** (`baMeDung: {den}` ở gốc): không bé nào (kể cả máy riêng — `hoc-vien/*`, `phien/*` ⇒ 409 `chua_chon_con`), không tính giờ con (máy chủ bỏ `usage`, nhịp phiên, web theo Con); `dong-bo.windows`: `mode: "tu_do"`,
`locked: false`, `grantEndsAt = den` (thắng giờ ngủ / Ba Mẹ khoá — Ba Mẹ mở bằng mã), không `quyConPhut`, `appTinhGio: []`, web mở Giải trí (web luôn
chặn vẫn chặn); `nhip`: `grantEndsAt` / `moDen` = max(cửa sổ cũ, `den`). Hết `den` ⇒ máy về màn chọn tên (agent tự khoá, không chờ mạng).

### Mã mở máy theo từng máy (L19)

`GET /api/m/may/:id/ma-offline?phut=15|30|60` (mặc định 60; giá trị khác ⇒ 60) — màn «Mã mở máy cho Bảo Anh» (them-rz77kk45):

```json
{ "ma": "731594", "maHien": "731 594", "phutMo": 30, "chonPhut": [15, 30, 60], "doiSauGiay": 212, "conGiay": 512, "hieuLucPhut": 15,
  "may": { "id": "d1", "ten": "Laptop", "nen": "windows" } }
```

Số phút nằm TRONG mã (agent kiểm offline, không cần máy chủ): TOTP RFC 6238 HMAC-SHA1, bước 300 giây, 6 số, dung sai ±1 bước;
**60 phút** = bí mật gốc (y hệt mã cũ — agent cũ hiểu, mở 60 phút); **30 / 15 phút** = bí mật `"<bí mật>|30"` / `"<bí mật>|15"`. Agent mới thử 60 → 30 → 15,
mở đúng số phút của biến thể khớp (`lib/ma-offline.ts` › `kiemMaOfflinePhut`). Bí mật cấp qua `dong-bo.windows.maOfflineBiMat` (Windows/Mac) và
`nhip.maOfflineBiMat` (Android/iOS, gửi khi `maOfflineVan` lệch) như cũ. Cùng mã gõ ở màn «Ba Mẹ nhập mã» (có mạng ⇒ `POST /api/device/ba-me-mo`;
mất mạng ⇒ agent tự kiểm rồi gửi sự kiện `mo_ma_offline` khi có mạng lại). Mọi máy có tác tử (Windows, Mac, Android, iPhone/iPad).

### Máy con mất mạng + chuông (L19)

**Mất mạng hôm nay** = máy Windows / Mac / Android đã liên lạc trong hôm nay (giờ nhà) mà im lặng > 10 phút, không phải tắt / ngủ sạch (agent báo
`nguon: sap_tat|sap_ngu`). iPhone/iPad không tính (không chạy nền liên tục). Máy dùng chung tính cho bé đang dùng.

| Đường | Ý |
|---|---|
| `GET gia-dinh` | thêm `soChuong` (số trên chuông) và mỗi `con[]`: `coPin`, `matMang: [{mayId, ten, nen, tu, phut}]` (dòng «Máy mất mạng · Laptop ›» + nút «Lấy mã mở máy») |
| `GET may-mat-mang` | `{ds: [{mayId, ten, nen, conId, tenCon, tu, phut}]}` |
| `GET can-de-y` | «Cần Ba Mẹ để ý» → `{ds: [...], soChuong}` — `soChuong` = `ds.length` (đúng số mục, không đếm «Để biết») |
| `GET thong-bao` | như cũ + `canDeY` (= `can-de-y.ds`) + `soChuong`. Các dòng cũ (`ds`) là phần «Để biết» |

Mục `can-de-y.ds[]`: `{id, loai, tieu, phu, luc, con, may?, so, nut, den}` — xếp theo loại rồi mới trước:
`mat_mang` («Laptop của Bảo Anh mất mạng» · «19:30 · Con cần mã để mở máy» · nút «Lấy mã» → `/may/<id>/ma-offline`) · `quen_pin` («Bảo Anh quên PIN vào máy» →
`/ho-so/<con>/pin`) · `canh_bao` (cảnh báo chú ý / nghiêm trọng chưa đọc 7 ngày: «Cảnh báo: Bảo Anh mở trang bị chặn» → `/canh-bao/<id>`) ·
`con_xin` (gộp theo Con: «Bảo Anh xin 2 việc», `so: 2` → `/cho-duyet`) · `nop_bai` (gộp theo Con: «Bảo Anh nộp bài 2 việc» → `/cho-duyet`) ·
`chua_bao_ve` («iPad chưa được bảo vệ» · việc thiếu đầu tiên → `/may/<id>`). Đọc cảnh báo (`canh-bao/:id/doc`) / xử lý việc ⇒ mục tự hết.

```json
{ "ds": [ { "id": "mat_mang:d1", "loai": "mat_mang", "tieu": "Laptop của Bảo Anh mất mạng", "phu": "19:30 · Con cần mã để mở máy",
            "luc": "2026-11-06T12:30:00.000Z", "con": "c1", "may": "d1", "so": 1, "nut": "Lấy mã", "den": "/may/d1/ma-offline" },
          { "id": "con_xin:c1", "loai": "con_xin", "tieu": "Bảo Anh xin 2 việc", "phu": "Mở youtube.com · thêm 20 phút",
            "luc": "2026-11-06T12:20:00.000Z", "con": "c1", "so": 2, "nut": "Trả lời", "den": "/cho-duyet" } ],
  "soChuong": 2 }
```

### Quà = bảng giá sao (L14 — đảo L10 phần voucher)

**7 quà mặc định** (đúng tên + sao trong màn `them-s416tfdj` / `them-473f52w6`), gieo MỘT lần khi nhà tạo Con mà chưa có quà nào
(`families.qua_seed_luc`; Ba Mẹ xoá hết thì không gieo lại): Chọn món bữa tối 50 (`bua_toi`) · Đi ăn kem 100 (`an_kem`) · AiiCafe 20k 200 (`aiicafe_20k`,
voucher 20.000đ) · Đồ chơi nhỏ 200 (`do_choi_nho`) · Đi xem phim 300 (`xem_phim`, chỉ cuối tuần) · AiiCafe 50k 500 (`aiicafe_50k`) · Bộ Lego 800 (`lego`, còn 1 bộ).
«Thêm 30 phút» **không phải quà** — là nút đổi sao lấy phút (`POST /api/kid/doi-sao`, L2). Quà `loai: phut` cũ vẫn chạy cho dữ liệu cũ.

**Giữ / trao / huỷ.** Con đổi ⇒ sao bị GIỮ (ghi trừ tạm, phiếu `giu`) — ví trả `saoGiu` («Con đang có 0 sao · Đang giữ 50 sao»: `tomTatVi`, `GET con/:id/vi`,
`gia-dinh.con[]`, `kid/toi`, `cua-hang`). Ba Mẹ «Đã trao» (`POST phieu/:id/trao` → `{trangThai, saoTru, voucher?}`) = trừ hẳn; «Huỷ & hoàn sao» (`phieu/:id/huy`) = hoàn;
**quà bị xoá ⇒ hoàn mọi phiếu đang giữ**.

**Voucher AiiCafe bật lại** (trao tay, KHÔNG cần quỹ phiếu): Con đổi ⇒ `cho_trao`, chưa có mã; Ba Mẹ trao ⇒ phát mã: `voucher: {ma, qr, hetHan, menhGia}` —
`qr` = chuỗi mã hoá vào QR (= mã phiếu; quầy `/quay` quét / gõ như cũ), hạn = lúc trao + `voucher_han_ngay` (**60 ngày** — đúng chữ «Voucher QR · 60 ngày» trong màn;
tham số mục 10, 30–365). `GET /api/kid/vi-qua` › `voucher[]`: chỉ phiếu đã phát, thêm `qr`, `conNgay` («Còn 49 ngày»), `ten`. Huỷ phiếu đang giữ ⇒ voucher `thu_hoi`.

**Điều kiện** (màn «Sửa quà»): chỉ cuối tuần (`chiCuoiTuan` ⇒ 409 `chi_cuoi_tuan`), tối đa X lần / tháng (`toiDaThang` ⇒ 409 `du_thang`), số lượng có sẵn
(`tonKho`, hết ⇒ ẩn khỏi cửa hàng, 409 `het_hang`), «Ba Mẹ xác nhận khi trao» (`canXacNhan`), **«Áp cho»** từng Con (`apCho: [id Con] | null` = mọi Con — quà
áp cho Con khác thì không hiện ở cửa hàng, đổi ⇒ 404).

| Đường (`/api/m/*`) | Ý |
|---|---|
| `GET qua?con=` | danh sách quà (`con` ⇒ chỉ quà áp cho Con đó) → `{ds: [quà]}` (ví dụ dưới; giữ cả khoá snake_case cũ) |
| `POST qua {ten, loai: qua\|dac_quyen\|voucher\|tiet_kiem, sao, menhGia? (voucher ≥ 1000), moTa?, hinh?, chiCuoiTuan?, toiDaThang?, tonKho?, canXacNhan?, apCho?}` | «Tự đặt quà riêng» → `{id}` (nhận cả `diem`, `menh_gia`… kiểu cũ). Voucher không còn `voucher_ngung` |
| `POST qua/:id {…cùng khoá, chỉ khoá gửi lên}` | «Lưu quà» → `{ok, qua}`. `apCho` có id lạ ⇒ 404 |
| `POST qua/:id/xoa` | «Xoá quà này» → `{ok, hoanPhieu, hoanSao}` |
| `GET qua/mac-dinh` | 7 quà Rob chọn sẵn cho bước «Chọn quà» → `{ds: [{ma, ten, moTa, hinh, sao, loai, menhGia, chiCuoiTuan, tonKho, daCo}]}` |
| `POST qua/mac-dinh {chon?: [ma]}` | «Lưu 7 quà, sang giờ chơi»: tạo quà được tick còn thiếu, bỏ quà mặc định bị bỏ tick (chưa ai đổi) → như `GET qua`. Thiếu `chon` = cả 7. Mã lạ ⇒ 400 `mau_sai` |
| `POST qua/mau` | (app cũ) thêm quà mặc định còn thiếu → `{taoMoi, ds}` |
| `GET qua/thu-vien?con=` | «Thêm quà từ thư viện», 5 nhóm → ví dụ dưới; `daCo` = nhà (hoặc Con) đã có quà cùng mã / cùng tên |
| `POST qua/thu-vien {mau: [ma], con?}` | «Thêm N quà cho Bảo Anh» → `{taoMoi, ids}` (mẫu đã có bỏ qua; `con` ⇒ áp cho riêng Con đó). Mã lạ ⇒ 400 `mau_sai` |
| `GET phieu/:id` | màn «Trao quà cho con» → `{id, con: {id, ten}, ten, loai, sao, trangThai, dangGiu, doiLuc, voucher: {menhGia, trangThai, ma?, qr?, hetHan?} \| null}` |

```json
// một phần tử GET /api/m/qua › ds
{ "id": "r1", "ten": "AiiCafe 20k", "loai": "voucher", "sao": 200, "diem": 200, "moTa": "Voucher QR · 60 ngày", "hinh": "aiicafe",
  "menhGia": 20000, "tonKho": null, "toiDaThang": null, "chiCuoiTuan": false, "canXacNhan": false, "apCho": null, "mau": "aiicafe_20k",
  "dangGiu": 1, "laVoucher": true, "bat": true }
// GET /api/m/qua/thu-vien
{ "nhom": [ { "ma": "thoi_gian", "ten": "Thời gian chơi", "phu": "giá gợi ý",
              "ds": [ { "ma": "thuc_them_30", "ten": "Thức thêm 30 phút", "moTa": "Tối thứ 7", "hinh": "dong_ho", "sao": 100, "loai": "dac_quyen",
                        "menhGia": null, "chiCuoiTuan": false, "tonKho": null, "canXacNhan": false, "daCo": false } ] },
            { "ma": "voucher", "ten": "Voucher AiiCafe", "phu": "mã QR · 60 ngày", "ds": [ "AiiCafe 20k 200 · 50k 500 · 100k 1.000 (Ba Mẹ duyệt khi con đổi)" ] },
            { "ma": "qua_vat_ly", "ten": "Quà vật lý", "phu": "Ba Mẹ mua", "ds": [ "Sách mới con chọn 150 · Đồ chơi nhỏ 200 · Bộ Lego 800" ] },
            { "ma": "dac_quyen", "ten": "Đặc quyền", "phu": "trải nghiệm cả nhà", "ds": [ "Chọn món bữa tối 50 · Đi ăn kem 100 · Đi xem phim cuối tuần 300 · Ngủ nướng Chủ nhật 80" ] },
            { "ma": "tiet_kiem", "ten": "Tiết kiệm", "phu": "sao thành tiền heo đất", "ds": [ "Bỏ heo đất 10.000đ 100 · Góp quỹ mua xe đạp 300" ] } ] }
```

**Màn Con** `/api/kid/cua-hang` và khay `/api/device/hoc-vien/cua-hang`: voucher hiện lại; mỗi quà thêm `moTa, hinh, menhGia, chiCuoiTuan, toiDaThang, tonKho`;
gốc thêm `saoGiu`. `POST /api/kid/doi/:id` → `{phieu, trang_thai: "cho_trao", saoGiu, …}` (voucher cũng `cho_trao`); khay `hoc-vien/doi/:id` → `{phieu, trangThai, saoGiu, voucher: null}`.
Quyền: mọi `POST qua*`, `con/:id/pin` = đổi cài đặt ⇒ chỉ Ba Mẹ; `phieu/:id/trao|huy` Người trông giúp làm được (như S1).
