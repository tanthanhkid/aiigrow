# Đăng nhập Google / Facebook — app Ba Mẹ

Mã: máy chủ `server/lib/dang-nhap-mxh.ts` (test `dang-nhap-mxh.test.ts`), app `mobile/src/lib/dang-nhap-mxh.tsx`, đích quay về
`mobile/src/app/oauthredirect.tsx`, scheme native `mobile/app.config.ts`. Hợp đồng API: `docs/API.md` › «Đăng nhập Google / Facebook».

Luồng: app mở cửa sổ đăng nhập của Google / Facebook (`expo-auth-session`) ⇒ nhận **id_token** (Google) hoặc **access token** (Facebook) ⇒
gửi máy chủ ⇒ máy chủ tự xác minh (JWKS Google; Graph `debug_token` của Facebook) ⇒ tìm / tạo Ba Mẹ theo **mã người dùng** của Google /
Facebook ⇒ trả phiên như đăng nhập thường. Google: lời mời người nhà gửi tới đúng email đó tự hiện (`loiMoi[]`). Facebook: định danh riêng
`fb:<id>`, email Facebook chỉ lưu tham khảo (mục 4). Thiếu env ⇒ nút tự ẩn, endpoint trả 503 `mxh_chua_bat`.

Các giá trị cố định của app (tra từ repo):

| Mục | Giá trị | Nguồn |
|---|---|---|
| Tên miền prod | `https://aiigrow.aiilab.vn` | `mobile/scripts/phat-hanh-apk.sh`, `testflight.sh`, `README.md` |
| iOS bundle id | `vn.aiilab.aiigrow` | `mobile/app.json` |
| Android package | `vn.aiilab.aiigrow` | `mobile/app.json` |
| Android SHA-1 (APK đang phát hành) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` | APK ký bằng `debug.keystore` của template Expo (`phat-hanh-apk.sh`); đo bằng `keytool -list -v -keystore android/app/debug.keystore -storepass android` |
| Android key hash cho Facebook (base64 của SHA-1 trên) | `Xo8WBi6jzSxKDVR4drqm84yr9iU=` | |
| Trang quyền riêng tư | `https://aiigrow.aiilab.vn/chinh-sach-rieng-tu` | `server/app/chinh-sach-rieng-tu` |

> Đổi khoá ký Android (khoá phát hành riêng, hoặc Google Play App Signing) ⇒ thêm SHA-1 / key hash MỚI vào cả Google lẫn Facebook.

## 1. Google Cloud Console — phiên trình duyệt khai báo

Một project (vd «AiiGrow»), **APIs & Services**:

1. **OAuth consent screen** (Google Auth Platform › Branding / Audience / Data access)
   - User type: **External**; App name: **AiiGrow**; User support email + Developer contact: email của Thanh / AiiLab.
   - App domain: Home page `https://aiigrow.aiilab.vn`, Privacy policy `https://aiigrow.aiilab.vn/chinh-sach-rieng-tu`.
   - Authorized domains: **`aiilab.vn`**.
   - Scopes: chỉ `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (không nhạy cảm ⇒ không phải thẩm định bảo mật).
   - Publishing status: **In production** (để «Testing» thì chỉ test user đăng nhập được).
2. **Credentials › Create OAuth client ID** — tạo BA client:
   - **Web application** «AiiGrow web»
     - Authorized JavaScript origins: `https://aiigrow.aiilab.vn` (thêm khi cần thử ở máy: `http://localhost:8081`, `http://localhost:3310`)
     - Authorized redirect URIs: `https://aiigrow.aiilab.vn/oauthredirect` (thử ở máy: `http://localhost:8081/oauthredirect`, `http://localhost:3310/oauthredirect`)
   - **iOS** «AiiGrow iOS» — Bundle ID `vn.aiilab.aiigrow` (App Store ID / Team ID để trống được).
   - **Android** «AiiGrow Android» — Package `vn.aiilab.aiigrow`, SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
     Mở **Advanced settings › bật «Enable custom URI scheme»** (Google tắt mặc định cho client Android mới; app quay về bằng
     `vn.aiilab.aiigrow:/oauthredirect`). Nếu không bật được tuỳ chọn này ⇒ ghi lại để chuyển Android sang `@react-native-google-signin`.
3. Ghi lại **3 client ID** (dạng `xxxx.apps.googleusercontent.com`). Không cần client secret (không dùng tới — đừng tải về).

## 2. Meta for Developers — phiên trình duyệt khai báo

1. **Create app** › use case **«Authenticate and request data from users with Facebook Login»**, app type **Consumer**, tên **AiiGrow**.
2. **App settings › Basic**: App domains `aiilab.vn`; Privacy Policy URL `https://aiigrow.aiilab.vn/chinh-sach-rieng-tu`;
   User data deletion: «Data deletion instructions URL» = `https://aiigrow.aiilab.vn/chinh-sach-rieng-tu` (app có Xoá tài khoản trong
   Cả nhà › Xoá tài khoản); Category: Education / Lifestyle; icon 1024².
   - **Add platform › Website**: Site URL `https://aiigrow.aiilab.vn/`.
   - **Add platform › iOS**: Bundle ID `vn.aiilab.aiigrow`.
   - **Add platform › Android**: Package `vn.aiilab.aiigrow`, Class name `vn.aiilab.aiigrow.MainActivity`, Key hash `Xo8WBi6jzSxKDVR4drqm84yr9iU=`.
3. **Facebook Login › Settings**: Client OAuth login **Yes**, Web OAuth login **Yes**, Enforce HTTPS **Yes**, Use Strict Mode **Yes**,
   Valid OAuth Redirect URIs: `https://aiigrow.aiilab.vn/oauthredirect` (thử ở máy thêm `http://localhost:8081/oauthredirect` —
   Facebook chỉ nhận localhost khi app ở chế độ Development). Allowed Domains for the JavaScript SDK: `https://aiigrow.aiilab.vn/`.
   (Native quay về bằng `fb<APP_ID>://authorize` — scheme đã khai trong `app.config.ts`, không phải điền ở đây.)
4. **Permissions**: `public_profile` + `email` (cả hai là quyền mặc định, KHÔNG cần App Review).
5. Chuyển app sang **Live** (cần Privacy Policy URL + Data deletion ở bước 2). Development mode thì chỉ admin / tester của app đăng nhập được.
6. Ghi lại **App ID** và **App Secret** (App settings › Basic). App Secret là bí mật — chỉ đặt vào Vercel (bên dưới), không commit.

## 3. Biến môi trường

Máy chủ (Vercel project `aiigrow`, môi trường **Production**; thiếu biến nào thì nút tương ứng tự ẩn):

| Tên | Giá trị |
|---|---|
| `GOOGLE_CLIENT_IDS` | 3 client ID Google cách nhau dấu phẩy: `<web>,<ios>,<android>` (thứ tự không quan trọng — máy chủ nhận id_token có `aud` là bất kỳ cái nào) |
| `FACEBOOK_APP_ID` | App ID Facebook |
| `FACEBOOK_APP_SECRET` | App Secret Facebook (đánh dấu Sensitive) |

App (giá trị CÔNG KHAI, gắn lúc dựng bundle — `EXPO_PUBLIC_*`):

| Tên | Giá trị | Đặt ở đâu |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | client Web | Vercel Production (bản web dựng trên Vercel: `server/scripts/build-app.mjs`) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | client iOS | `mobile/.env.local` trên máy dựng (`testflight.sh`) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | client Android | `mobile/.env.local` trên máy dựng (`phat-hanh-apk.sh`) |
| `EXPO_PUBLIC_FACEBOOK_APP_ID` | App ID Facebook | cả Vercel Production lẫn `mobile/.env.local` (native còn cần nó lúc prebuild để có scheme `fb<id>`) |

`mobile/.env.local` bị `.gitignore` bỏ qua; Expo CLI tự nạp khi `expo prebuild` / dựng bundle. Đặt đủ 4 dòng trên ở checkout chính
`~/OFFLINE_FILES/Code/aiigrow/mobile/.env.local` (worktree mới thì chép sang). Đổi `EXPO_PUBLIC_*` ⇒ phải dựng lại (web: deploy; iOS / Android: bản mới).

Kiểm sau khi đặt: `curl https://aiigrow.aiilab.vn/api/m/cau-hinh-dang-nhap` ⇒ `{"google":true,"facebook":true}`.

## 4. Hành vi tài khoản

- Danh tính = (nguồn, `sub` Google / `id` Facebook) trong bảng `ba_me_mxh`; lần sau vào bằng đúng tài khoản đó ⇒ đúng Ba Mẹ đó.
- Lần đầu (tài khoản MXH chưa gắn ai) ⇒ tạo nhà mới, người vào là Ba Mẹ + người tạo nhà (L7), tên lấy từ Google/Facebook,
  **không mật khẩu** (`GET toi` › `coMatKhau: false`).
  - **Google**: bắt buộc `email_verified`; định danh (`parents.dinh_danh`) = email chữ thường. Email ĐÃ có tài khoản (đăng ký SĐT/email +
    mật khẩu, hoặc Google khác) ⇒ 409 `mxh_da_co_tai_khoan`, chỉ cách đăng nhập cũ — không tự gắn theo email (email đăng ký bằng OTP thử chưa
    chắc là của chủ thật).
  - **Facebook** (vá 05/11): Graph không cam kết email đã xác minh — ai cũng tạo được Facebook mang email người khác. Nên tài khoản tạo bằng
    Facebook có định danh **riêng `fb:<id Facebook>`**; email Facebook (nếu có) chỉ lưu tham khảo ở `ba_me_mxh.email`, **không** dùng để
    khớp / khoá tài khoản ⇒ không giữ chỗ email của ai: chủ thật vẫn đăng ký email đó (OTP) hoặc vào bằng Google bình thường, hai tài khoản
    tách biệt. Facebook không trả email vẫn vào được. App hiện định danh là «Facebook» (`GET toi` › `dinhDanh`, danh sách thành viên).
    Không đăng nhập bằng mật khẩu qua `fb:<id>` được (`dang-nhap` chỉ nhận SĐT / email) — vào bằng nút Facebook.
  - Bấm Facebook mà đã có tài khoản SĐT/email ⇒ ra tài khoản MỚI (không gắn theo email). Muốn dùng nút Facebook cho tài khoản sẵn có:
    đăng nhập tài khoản đó rồi gắn (dưới).
- **Gắn Google / Facebook vào tài khoản có sẵn** chỉ khi ĐANG đăng nhập tài khoản đó VÀ nhập đúng mật khẩu hiện tại (phiên thôi chưa đủ —
  người cầm máy không gắn được Facebook của mình): `POST lien-ket/facebook {accessToken, matKhau}` | `lien-ket/google {idToken, matKhau}`
  (dòng `ba_me_mxh.lien_ket = true`; mỗi tài khoản tối đa một dòng mỗi nguồn — chỉ mục `ba_me_mxh_mot_nguon`). Chưa có mật khẩu ⇒ 409
  `chua_co_mat_khau`, sai ⇒ 401 `sai_mat_khau`. Định danh của tài khoản giữ nguyên. Tài khoản MXH đã gắn chỗ khác (kể cả
  tài khoản tự tạo lúc bấm nút trước đó — xoá tài khoản kia trước) ⇒ 409 `mxh_da_gan`; tài khoản đã gắn một tài khoản cùng nguồn khác ⇒ 409
  `mxh_da_gan_khac`. Giới hạn 5 lượt / Ba Mẹ + 10 / IP mỗi 15 phút.
- **Chuyển dữ liệu** (`schema.ts` › `SCHEMA_S2`, chạy lại vô hại): tài khoản Facebook tạo trước bản vá (dòng `ba_me_mxh` nguồn facebook, không
  `lien_ket`) mang email Facebook làm định danh ⇒ email sang `ba_me_mxh.email`, định danh đổi thành `fb:<id>`. Cron hằng ngày
  (`donBoDemMxh` › `chuyenFbCu`) chạy lại câu này — dọn tài khoản do bản cũ còn chạy song song lúc deploy tạo ra. Họ vẫn vào bằng nút Facebook như
  cũ (phiên, nhà, Con giữ nguyên); ai trong số đó đã đặt mật khẩu thì không đăng nhập «email + mật khẩu» bằng email Facebook được nữa.
- Gỡ trên máy Con (`goCoMatKhau`): Ba Mẹ tạo bằng Facebook gõ email Facebook của mình (Facebook không có email: gõ `facebook`) + mật khẩu —
  chỉ chọn Ba Mẹ trong CHÍNH gia đình của máy đó, nhiều người khớp thì thử mật khẩu từng người; mật khẩu vẫn phải đúng.
- Tài khoản tạo bằng Facebook không có SĐT / email cho «Quên mật khẩu» ⇒ `POST dat-mat-khau` đặt được cả khi ĐÃ có mật khẩu (đặt lại),
  miễn xác minh lại đúng Facebook đã gắn; đặt lại thì đăng xuất mọi máy. Tài khoản khác vẫn 409 `da_co_mat_khau`.
- Gỡ máy / xoá tài khoản / gỡ trên máy Con cần mật khẩu ⇒ tài khoản chưa có mật khẩu nhận 409 `chua_co_mat_khau`, app mở màn «Đặt mật khẩu»
  (`/dat-mat-khau`): nhập mật khẩu mới rồi xác nhận lại bằng Google/Facebook (`POST dat-mat-khau`).
- Lời mời theo email (**đã chốt 05/11, hướng an toàn**):
  - **Google**: chỉ nhận `id_token` có `email_verified = true` (không thì 400 `mxh_khong_email`) ⇒ tài khoản Google luôn mang email đã
    xác minh ⇒ khớp lời mời theo email như đăng nhập thường: `loiMoi[]` có lời mời ⇒ màn Lời mời (`/moi/vao`), `moi/nhan {id}` nhận được.
  - **Tài khoản tạo bằng Facebook** (định danh `fb:<id>`): **KHÔNG khớp lời mời theo email**: `loiMoi[]` và `GET moi/cho-toi` trả rỗng
    (`chiQuaLink: true`), `moi/nhan {id}` ⇒ 403 `can_link_moi`. Chỉ nhận lời mời qua **link mời** (`moi/nhan {ma}`, token trong link).
    Tài khoản SĐT/email chỉ GẮN thêm Facebook vẫn khớp lời mời theo định danh của chính nó. (lib/thanh-vien.ts › `emailChuaXacMinh`.)
- Quên mật khẩu (OTP) **không** đặt mật khẩu cho tài khoản chưa từng có mật khẩu (vào bằng Google/Facebook): `otp {mucDich: quen_mk}` không
  phát mã (trả y như số/email không có tài khoản — không lộ), `quen-mat-khau` ⇒ 409 `chua_co_mat_khau`. Muốn có mật khẩu: đăng nhập bằng
  đúng Google/Facebook đó rồi «Đặt mật khẩu» (`POST dat-mat-khau`, xác minh lại bằng chính tài khoản MXH đã gắn).
- Giới hạn lượt (bảng `pin_sai`, khung 15 phút cố định như ghép máy; quá trần ⇒ 429 `qua_nhieu_lan`):
  - `POST dang-nhap/google|facebook`: 30 lượt / IP (đếm trước khi gọi Google/Facebook; vào được thì trả lượt — chỉ lượt hỏng bị tính),
    10 lượt / tài khoản MXH (nguồn + `sub`, sau xác minh). Bộ đếm khung cũ dọn trong cron hằng ngày `/api/cron/don-kiem-toan`.
  - `POST dat-mat-khau`: 10 lượt / IP, 5 lượt / Ba Mẹ; đặt được thì xoá bộ đếm của Ba Mẹ đó.
  - IP = `x-real-ip` (Vercel đặt) rồi `x-forwarded-for`, IPv6 gộp /64 (gia-dinh.ts › `nguonGoi`).
- App (iOS/Android): Google trả `code`, app tự đổi mã lấy `id_token` (`shouldAutoExchangeCode: false`, mobile/src/lib/doi-ma-google.ts) —
  đổi lỗi / quá 20 giây / không có `id_token` ⇒ hiện câu báo rõ, không đứng im.
- Người bị mời ra (`moi-ra`) hoặc xoá tài khoản ⇒ xoá liên kết `ba_me_mxh`; vào lại bằng Google/Facebook là tài khoản mới.
