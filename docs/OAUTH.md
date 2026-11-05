# Đăng nhập Google / Facebook — app Ba Mẹ

Mã: máy chủ `server/lib/dang-nhap-mxh.ts` (test `dang-nhap-mxh.test.ts`), app `mobile/src/lib/dang-nhap-mxh.tsx`, đích quay về
`mobile/src/app/oauthredirect.tsx`, scheme native `mobile/app.config.ts`. Hợp đồng API: `docs/API.md` › «Đăng nhập Google / Facebook».

Luồng: app mở cửa sổ đăng nhập của Google / Facebook (`expo-auth-session`) ⇒ nhận **id_token** (Google) hoặc **access token** (Facebook) ⇒
gửi máy chủ ⇒ máy chủ tự xác minh (JWKS Google; Graph `debug_token` của Facebook) ⇒ tìm / tạo Ba Mẹ theo **email** ⇒ trả phiên như đăng nhập
thường. Lời mời người nhà gửi tới đúng email đó tự hiện (`loiMoi[]`). Thiếu env ⇒ nút tự ẩn, endpoint trả 503 `mxh_chua_bat`.

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
- Lần đầu: email (chữ thường) chưa có tài khoản ⇒ tạo nhà mới, người vào là Ba Mẹ + người tạo nhà (L7), tên lấy từ Google/Facebook,
  **không mật khẩu** (`GET toi` › `coMatKhau: false`). Google bắt buộc `email_verified`; Facebook không trả email ⇒ 400 `mxh_khong_email`.
- Email ĐÃ có tài khoản (đăng ký SĐT/email + mật khẩu, hoặc đã vào bằng nhà cung cấp kia) ⇒ 409 `mxh_da_co_tai_khoan`, chỉ cách đăng nhập
  cũ. Không tự gắn theo email: email đăng ký bằng OTP thử chưa chắc là của chủ thật, email Facebook không chắc đã xác minh.
- Gỡ máy / xoá tài khoản / gỡ trên máy Con cần mật khẩu ⇒ tài khoản chưa có mật khẩu nhận 409 `chua_co_mat_khau`, app mở màn «Đặt mật khẩu»
  (`/dat-mat-khau`): nhập mật khẩu mới rồi xác nhận lại bằng Google/Facebook (`POST dat-mat-khau`).
- Người được mời (`loi_moi.dinh_danh` = email) vào bằng Google/Facebook cùng email ⇒ `loiMoi[]` có lời mời ⇒ màn Lời mời (`/moi/vao`).
  **Rủi ro còn mở (cần Thanh chốt):** Graph không cam kết email Facebook đã xác minh. Ai tạo Facebook mang email người được mời
  (chưa xác minh) thì thấy VÀ nhận được lời mời đó (`moi/nhan {id}`). Muốn chặn: không khớp lời mời theo email cho tài khoản Facebook
  (người được mời bấm link mời — đường `ma` vẫn chạy), hoặc chỉ khớp lời mời gửi bằng SĐT.
- Người bị mời ra (`moi-ra`) hoặc xoá tài khoản ⇒ xoá liên kết `ba_me_mxh`; vào lại bằng Google/Facebook là tài khoản mới.
