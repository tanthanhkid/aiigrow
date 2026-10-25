# AiiGrow — hợp đồng API (M1)

Mọi lỗi trả `{ "error": "<mã>", "message": "<câu cho người dùng, tiếng Việt>" }` kèm HTTP status. JSON vào/ra, `cache-control: no-store`.
Xử lý nằm ở `server/lib/api-m.ts`, `api-con.ts`, `api-may.ts` (route Next chỉ chuyển tiếp) — test: `server/lib/api.test.ts`.

## App Ba Mẹ — `/api/m/*` (Bearer = token phiên Ba Mẹ; vai `xem` chỉ GET)

| Nhóm | Đường |
|---|---|
| Tài khoản | `POST otp {dinhDanh, mucDich}` → `{guiDen, ma?}` (ma chỉ ở chế độ thử) · `POST dang-ky {dinhDanh, ma, ten, matKhau}` → `{token}` · `POST dang-nhap {dinhDanh, matKhau}` · `POST quen-mat-khau {dinhDanh, ma, matKhauMoi}` · `GET toi` · `POST dang-xuat` · `POST xoa-tai-khoan {kiemTra: true}` → `{duoc: true}` hoặc 409 chặn (không cần mật khẩu, app hỏi trước) · `POST xoa-tai-khoan {matKhau}` → `{xoa: "tai_khoan"}` (không phải chủ: vai `roi`, bỏ định danh + mật khẩu + phiên) hoặc `{xoa: "gia_dinh", soCon}` (chủ là người lớn cuối, không còn máy: xoá cả gia đình). Mọi vai kể cả Chỉ xem. Lỗi: `sai_mat_khau` 401 · `tam_khoa` 429 (sai 5 lần, bộ đếm riêng) · `con_thanh_vien` 409 (mời ra trước) · `con_may` 409 (gỡ máy trước) |
| Gia đình | `GET gia-dinh` → `{ten, quyVoucher, choDuyet (nhiệm vụ + yêu cầu + phiếu quà), canhBao, con[]}` (mỗi Con: số dư, chờ duyệt, `phieuCho` (quà chờ trao), phút chơi hôm nay/trần, «Hôm nay con đã») · `GET/POST cau-hinh` (tham số mục 10, kẹp min–max) |
| Con | `POST con {ten, namSinh?, pin?, avatar?, nhom?}` · `GET con/:id` (ví, cấp độ, lịch, tham số, thiết bị + mức bảo vệ + lệch giờ) · `POST con/:id/sua` · `POST con/:id/lich {ngayThuong[], cuoiTuan[], ngu}` · `POST con/:id/cau-hinh` · `POST con/:id/khoa {khoa}` (Khoá ngay / Mở lại) · `POST con/:id/diem {delta, lyDo}` · `GET con/:id/vi` · `GET con/:id/bao-cao` · `GET con/:id/thanh-tich` · `POST con/:id/loi-khen {noiDung}` |
| Thiết bị | `POST ma-ghep {con?, nen}` → `{ma}` (con trống = máy dùng chung) · `POST may/:id/go {matKhau, xoaHan?}` (gỡ an toàn — xem mục «An toàn & gỡ cài đặt») |
| Nhiệm vụ | `GET/POST nhiem-vu` · `POST nhiem-vu/mau {nhom: nhi\|teen}` · `POST nhiem-vu/:id` (sửa, bật/tắt) |
| Chờ duyệt | `GET cho-duyet` → `{nhiemVu[], yeuCau[], phieu[] (quà Con đổi đang chờ trao/xác nhận: `POST phieu/:id/xac-nhan` · `POST phieu/:id/huy`), tuDong[]}` · `GET luot/:id/anh` · `POST luot/:id/duyet {diem?, loiKhen?}` · `POST luot/:id/tu-choi {lyDo, boSung?}` · `POST duyet-hang-loat {ids[]}` |
| Quản trị trong app | `GET toi` có thêm `laAdmin` (`parents.id` nằm trong env `AIIGROW_ADMIN_ID`, cách nhau dấu phẩy; không so email/SĐT; không đặt env ⇒ không ai là admin; lấy id bằng `GET toi` → `baMe.id`) · `GET admin/ho-tro` → `{ds[{family_id, ten, tu, noi_dung, created_at, chua_tra_loi}]}` · `GET admin/ho-tro/:fam` → `{ten, tin[]}` · `POST admin/ho-tro/:fam {noiDung}`. Ba Mẹ thường gọi ⇒ 403 `khong_du_quyen` |
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
