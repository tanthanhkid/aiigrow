# AiiGrow Con — iPhone / iPad (iOS · iPadOS 16+)

App máy Con, Swift native, dùng **Screen Time API** của Apple (FamilyControls, ManagedSettings, DeviceActivity). Máy chủ coi máy này là
`platform = "ios"`; bảng ánh xạ chính sách: `server/lib/chuyen-doi.ts` (`case "ios"`). Cùng tinh thần bản Windows / macOS: chỉ cơ chế
chính hãng, không ẩn mình — app luôn hiện dòng «Ba Mẹ quản lý máy này bằng AiiGrow», màn chặn nói rõ lý do.

## Cấu trúc
| Thư mục | Target | Việc |
|---|---|---|
| `ConCore/` | framework `ConCore` (chỉ Foundation) | mô hình phản hồi `nhip`, **lập kế hoạch** nenTang ⇒ lịch DeviceActivity + sự kiện đo phút (`KeHoach.swift`), **suy khiên lúc này** (`TinhKhien.swift`), API client, link ghép, kho app group, một lượt đồng bộ sau protocol (`DongBo.swift`) |
| `HeThong/` | dịch vào app + Monitor | bản thật của protocol: `KhienThat` (ManagedSettingsStore), `LichThat` (DeviceActivityCenter), `UyQuyenThat` (AuthorizationCenter), `LuaChonApp` (FamilyActivitySelection trong app group), Keychain |
| `App/` | `AiiGrowCon` (vn.aiilab.aiigrow.con) | SwiftUI bản «Dịu» 06/11 (`docs/thiet-ke-chot/con-dt-*`, L16): Rob chào · chưa ghép · mã 6 số / QR (sai · hết hạn · mất mạng) · cấp quyền · **máy khoá: chọn tên + PIN** (sai 5 lần chờ 15 giây, Quên PIN, Ba Mẹ nhập mã, Ba Mẹ đang dùng, Đổi bé / Đăng xuất) · 4 tab Hôm nay / Nhiệm vụ (nộp ảnh · ghi âm · viết, mất mạng lưu ở máy) / Sao & quà (giữ sao, voucher QR, cửa hàng bảng giá) / Tin nhắn · đổi sao lấy phút · xin thêm giờ / ngoại lệ (mất mạng lưu lời xin) · màn khoá theo lý do · mở bằng mã · DNS · Ba Mẹ chọn app. BGAppRefreshTask `vn.aiilab.aiigrow.con.nhip` |
| `Monitor/` | DeviceActivityMonitor ext | chuông lịch / ngưỡng phút ⇒ ghi phút đã dùng ⇒ suy lại khiên (không gọi mạng) |
| `ShieldConfig/` | ShieldConfiguration ext | màn chặn tiếng Việt theo lý do + nút «Xin thêm giờ» |
| `ShieldAction/` | ShieldAction ext | «Xin thêm giờ» ⇒ thông báo cục bộ, chạm vào mở app ở màn xin giờ |
| `Tests/` | `ConCoreTests` | 33 test logic thuần + client/đồng bộ với bản giả |
| `App/Diu.swift` | — | ngôn ngữ «Dịu»: nền kem #fbf8f2, MỘT màu nhấn xanh #2f9e5f, vàng chỉ cho sao, thẻ trắng viền mảnh, nút 52pt, chữ `.rounded` (Nunito không có trong repo) |
| `TaiNguyen/` | app | `Diu.xcassets` (icon 3D Fluent Emoji MIT + Rob, chép PNG từ `mobile/assets/icon3d`, `linh-vat`); `Fluent.xcassets` cũ; màn chặn dùng icon ở `ShieldConfig/ManChan.xcassets` |
| `chup/diu/` | — | ảnh chụp simulator iPhone (iOS 26.5) các màn bản Dịu với `-demo <màn>` (06/11); `canh-cdt-chinh-ios.png` = thiết kế cạnh app. `chup/*.png` cũ = Clay 25/10 |

App group `group.vn.aiilab.aiigrow.con`; entitlement `com.apple.developer.family-controls` ở app + 3 extension; associated domain
`applinks:aiigrow.aiilab.vn`; scheme `aiigrowcon://`.

## Cách áp chính sách
- **Ghép**: mã 6 số ⇒ `POST api/device/ghep {ma, nen:"ios"}`; link/QR `https://aiigrow.aiilab.vn/cai/<token>` ⇒ `POST api/device/ghep-goi`.
  Token máy nằm trong Keychain.
- **Quyền**: `requestAuthorization(for: .child)` khi máy dùng Apple ID của Con trong Chia sẻ trong gia đình (Ba Mẹ duyệt, gỡ app cần Ba Mẹ),
  không thì `.individual`. Lỗi (kể cả trên Simulator) hiện câu giải thích, không crash.
- **Ba Mẹ chọn app** bằng FamilyActivityPicker ngay trên máy Con, gắn nhãn Học / Giải trí / Chặn. Token mờ chỉ ở app group; máy chủ
  nhận **số lượng** (`ios.soApp…`).
- **Đồng bộ**: khi mở app + BGAppRefreshTask ⇒ `POST api/device/nhip` ⇒ `LapKeHoach.tu(nenTang)`:
  - khung giờ chơi ⇒ DeviceActivitySchedule theo từng thứ (chung một lịch nếu mọi ngày giống nhau); giờ ngủ ⇒ lịch lặp qua nửa đêm;
  - trần phút ⇒ lịch «ngay» 00:00–23:59 + DeviceActivityEvent «dung.N» mỗi 5 phút (nới khi trần lớn) và «tran»;
  - thêm giờ đã duyệt (`grantEndsAt` / `moKhanCapDen`) ⇒ lịch không lặp kết thúc đúng hạn;
  - web ⇒ `webContent.blockedByFilter = .specific(WebDomain)` (≤ 50 tên miền: web chặn + web giải trí khi đang đóng);
  - Khoá ngay / giờ ngủ ⇒ khiên **mọi** danh mục (app hệ thống iOS tự miễn); ngoài giờ / hết phút / không tuân thủ ⇒ khiên app giải trí
    (trừ app học); luôn `denyAppInstallation`.
- **Phiên «Chơi bằng điểm»** (`chinhSach.phienDiem.phien`): lịch không lặp «phiendiem» gỡ khiên giải trí đúng `conPhut`, neo từ lần đầu app
  thấy phiên (đồng bộ lại không kéo dài). App AiiGrow (màn Con) mở phiên xong thì mở `aiigrowcon://choi` ⇒ app này đồng bộ ngay.
- **Nhắc còn 5 phút**: sự kiện «nhac5» (trần − 5 phút) + `warningTime` 5 phút của lịch thêm giờ / phiên điểm / mở bằng mã ⇒ Monitor gửi thông báo cục bộ.
- **Mã mở offline** (`ConCore/MaOffline.swift`, cùng TOTP với `server/lib/ma-offline.ts`, `agent-win MaOffline.cs`): nhịp mang `maOfflineBiMat`
  (gửi lại khi vân `maOfflineVan` lệch) ⇒ Keychain; Con gõ 6 số Ba Mẹ đọc ⇒ mở 60 phút (lịch «mooffline»), sai 5 lần / 10 phút thì chờ;
  có mạng lại ⇒ hết lượt mở; sự kiện `mo_ma_offline` / `sai_ma_offline` / `het_ma_offline` gửi `su-kien`.
- **Nhiệm vụ & quà**: `POST api/device/phien-web` ⇒ mở app AiiGrow ở `aiigrow://tre?phien=…` (chưa cài ⇒ web `/tre?phien=…`); xin giờ có lối
  «Đổi điểm lấy giờ chơi» (`/tre/choi`).
- **DNS gia đình**: «Dành cho Ba Mẹ › Cài lọc web gia đình» ⇒ `ho-so-dns` ⇒ app phục vụ `.mobileconfig` ở 127.0.0.1 vài phút ⇒ Safari tải ⇒
  Cài đặt › Đã tải về hồ sơ (iOS không cho app tự cài hồ sơ).
- Lịch chỉ là chuông: mỗi lần chuông kêu extension gọi `TinhKhien.lucNay(kếHoạch, giờ)` — cùng hàm app dùng ⇒ không lệch.
  Thứ tự thắng: mở bằng mã offline (Ba Mẹ đọc mã ⇒ gỡ mọi khoá tới hạn) > Khoá ngay > giờ ngủ > thêm giờ > phiên Chơi bằng điểm > không tuân thủ > hết phút > ngoài khung.

## PIN theo bé (L13, 06/11 — `ConCore/PinBe.swift`, docs/API.md mục «S3»)
- Ghép xong ⇒ máy khoá (`PhienMay.chua`) ⇒ «Ai đang dùng máy?» (`GET ho-so`) ⇒ PIN (`POST dang-nhap-be`). Bé chưa có PIN chạm tên vào thẳng.
- Máy khoá / chưa ai vào ⇒ `TinhKhien` khiên MỌI app, lý do `chua_vao` (màn chặn «Máy đang khoá»). Ba Mẹ đang dùng (mã 15/30/60) ⇒ gỡ khoá tới hạn, lịch «bame» khoá lại đúng giờ.
- Mất mạng: PIN kiểm bằng `vanPin` (HMAC-SHA256 với bí mật mã offline), tự đếm 5 lần / 15 giây; mã Ba Mẹ kiểm TOTP biến thể 60 → 30 → 15 (`MaOffline.kiemPhut`);
  đăng nhập / đăng xuất làm lúc mất mạng xếp hàng, phát lại trước `nhip`. Máy riêng vừa «Đăng xuất» tại máy: giữ khoá tới khi nhập lại PIN.
- Hằng ngày qua `/api/device/hoc-vien/*` (`ConCore/HocVien.swift`) — không còn mở app AiiGrow / web `/tre` cho nhiệm vụ & quà.
- «Mở hết» (B1): iOS chỉ khiên app Giải trí khi hết quỹ / ngủ / khoá + app Ba Mẹ gắn «Chặn» ⇒ không cần sửa; test `testMoHetKhongKhoaApp`.

## Build / test (máy Mac)
```bash
cd agent-ios && xcodegen generate
xcodebuild -scheme AiiGrowCon -destination 'generic/platform=iOS Simulator' -derivedDataPath .build-dd -jobs 2 build
xcodebuild -scheme AiiGrowCon -destination 'generic/platform=iOS' -derivedDataPath .build-dd -jobs 2 CODE_SIGNING_ALLOWED=NO build
xcodebuild -scheme AiiGrowCon -destination 'platform=iOS Simulator,name=AiiGrow Con iPhone' -derivedDataPath .build-dd -jobs 2 test
# chụp màn với dữ liệu giả: xcrun simctl launch <sim> vn.aiilab.aiigrow.con -demo <màn> (MoHinhApp.napDemo: chao chuaGhep nhapMa maGhepSai
#   quetQR quyen chuaChoPhep chonTen nhapPin pinSai choPin quenPin baMeMa baMeDung doiBe chinh nhiemVu nvChiTiet saoQua cuaHang tin doiSao xinThem
#   conDangXin xinCai hetGio gioNgu khoaMay maOffline luuXin matMang dns daGo)
```
Kết quả 24/10: build Simulator ✅, build máy thật không ký ✅, 33/33 test ✅ (25/10: 37/37). Chạy trên máy thật: đặt `DEVELOPMENT_TEAM` trong
`project.yml`, đăng ký app group + 4 bundle id trong tài khoản Apple Developer.

## ⚠️ Entitlement Family Controls — Thanh phải xin Apple
Bản **Development** dùng `com.apple.developer.family-controls` được ngay (cài thử qua Xcode). Bản **phân phối** (TestFlight / App Store)
cần Apple duyệt: Thanh nộp form *Family Controls (Distribution)* tại developer.apple.com/contact/request/family-controls-distribution
cho **cả 4 bundle id**: `vn.aiilab.aiigrow.con`, `.monitor`, `.shieldconfig`, `.shieldaction`. Duyệt thường mất vài ngày – vài tuần;
chưa duyệt thì archive bản phân phối sẽ báo thiếu entitlement.

## «Khoá ngay» chỉ áp ở lần đồng bộ kế
Không có APNs nên app chỉ biết Ba Mẹ bấm Khoá ngay / duyệt thêm giờ khi: Con mở app, hoặc iOS cho chạy BGAppRefreshTask (iOS quyết thời
điểm — có khi vài giờ, ít khi máy pin yếu / Con hay vuốt tắt app). Đề xuất, theo thứ tự nên làm:
1. **Background push (APNs, `content-available: 1`)** khi Ba Mẹ đổi luật ⇒ app thức dậy vài giây, gọi `nhip`, áp khiên. Cần khoá APNs
   .p8 của AiiLab (Thanh tạo) + endpoint lưu push token (CAN-SERVER mục 6). iOS vẫn có thể hoãn push nền nhưng thường tới trong vài giây–phút.
2. **Thông báo thường (alert push) + Notification Service Extension**: chắc tới hơn push nền; extension có thể gọi `nhip` rồi áp
   ManagedSettings trước khi hiện thông báo «Ba Mẹ vừa tạm khoá máy».
3. **Chia sẻ trong gia đình của Apple**: Ba Mẹ có thể đặt Downtime ngay lập tức từ iPhone của Ba Mẹ (song song, không qua AiiGrow).
4. Dài hạn: **MDM** cho máy giám sát (supervised) — lệnh tức thời qua APNs MDM, cần máy chủ MDM + chứng chỉ APNs MDM.

## iOS không làm được so với Windows
| Việc | Windows | iPhone / iPad |
|---|---|---|
| Danh sách app từ máy chủ (tên tệp / bundle id) | ✅ AppLocker theo tên | ❌ chỉ token mờ ⇒ Ba Mẹ phải chọn app **trên máy Con** |
| Đo phút từng app, gửi máy chủ | ✅ | ❌ chỉ biết tổng phút nhóm giải trí theo mốc 5 phút (sự kiện DeviceActivity); không biết app nào |
| Chặn app chưa xếp | ✅ AppLocker mặc định chặn | ⚠️ chỉ khiên theo **danh mục**; app mới thuộc danh mục chưa chọn vẫn mở; chặn cài mới bằng `denyAppInstallation` |
| Lệnh tức thời (Khoá ngay, thêm giờ) | ✅ nhịp 60 giây | ⚠️ lần đồng bộ kế (xem trên) |
| Nhịp đều để biết máy còn chịu luật | ✅ mỗi phút | ⚠️ BGAppRefreshTask thưa, không bảo đảm |
| Chống đổi giờ máy | ⚠️ so serverTime | ❌ không ép «Đặt tự động» (chỉ máy giám sát) — so giờ ở máy chủ |
| Phiên điểm (đổi điểm lấy phút chơi) | ✅ | ⚠️ chưa làm — sẽ là lịch ngắn như «thêm giờ» |
| Gỡ từ xa | ✅ gỡ hẳn | ⚠️ thu hồi quyền + gỡ khiên; app không tự xoá được ⇒ màn hướng dẫn xoá biểu tượng |
| Chặn web | ✅ chính sách trình duyệt | ⚠️ tối đa 50 tên miền; giờ ngủ / khoá ngay khiên cả danh mục web |
| Số lịch | — | ⚠️ ~20 lịch DeviceActivity cùng lúc; lịch chơi quá nhiều khung ⇒ phần dư chỉ áp khi Con mở app (app hiện cảnh báo cho Ba Mẹ) |
| Giờ theo múi giờ gia đình | ✅ | ⚠️ lịch DeviceActivity theo giờ **máy**; nếu máy khác múi giờ gia đình, chuông lệch nhưng trạng thái suy lại vẫn theo giờ gia đình |
| Con tự bỏ chọn app trong màn Ba Mẹ | — | ⚠️ màn chọn app chưa khoá bằng mật khẩu Ba Mẹ (CAN-SERVER mục 5); với `.individual`, Con có thể thu hồi quyền trong Cài đặt — máy chủ thấy qua nhịp (`appQuanLyBat=false`) |

## Chưa làm / việc chờ
- Huy hiệu (cdt-huy-hieu), Quy tắc nhà mình, hoàn tác đổi sao (máy chủ chưa có đường cho Con), tên app bị khiên (iOS chỉ có token mờ ⇒ Con gõ tên khi xin).
- Chạy thật trên iPhone/iPad (cần team ký + entitlement); chưa cài lên máy của Thanh, chưa đẩy TestFlight.
