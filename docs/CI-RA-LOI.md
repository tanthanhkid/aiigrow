# CI rà lỗi app Ba Mẹ

Workflow `.github/workflows/mobile.yml` (ubuntu-latest). Chạy khi `pull_request` hoặc push `main` đụng `mobile/**`, `server/**` hoặc chính tệp workflow, và chạy tay được (`workflow_dispatch`).
Lượt cũ cùng nhánh bị huỷ khi có lượt mới (`concurrency`).

| Job | Kiểm gì | Thời gian |
|---|---|---|
| `kiem` | mobile: `expo install --check`, `tsc`, `expo lint`, `node --test`; server: `tsc`, toàn bộ test (PGlite trong tiến trình); seed CI trên **Postgres 16 thật** (service) + kiểm seed bị chặn khi `NODE_ENV=production` / thiếu cờ | ~6 phút |
| `web` | `expo export --platform web` với `EXPO_PUBLIC_API=/` (giống cổng localhost `scripts/deploy-prod.sh --chi-kiem`) → artifact `web-dist` | ~1–2 phút |
| `giao-dien (1/6 … 6/6)` | `mobile/scripts/pha.mjs` trên Chrome headless, `PHA_SHARD=i/6` (chia xoay vòng danh sách màn và kịch bản): mỗi shard chạy cổng giao diện (màn × 320/390/390 giãn + lượt chữ dài) rồi kịch bản luồng của phần mình, song song 6 job. Có SAI / lỗi giao diện / TREO ⇒ job đỏ | xem bảng đo trong PR #tang-toc-pha |
| `giao-dien-tong` | đỏ nếu bất kỳ shard nào đỏ / bị huỷ | ~10 giây |

`pha.mjs` chặn mọi `/api` bằng CDP và trả dữ liệu giả — không cần máy chủ. Máy chủ thật + dữ liệu thật dùng seed bên dưới.

## Agent kiểm bằng CI thay vì chạy lượt đủ trên Mac

Đẩy nhánh + mở PR ⇒ workflow `mobile` tự chạy (hoặc `gh workflow run mobile -R tanthanhkid/aiigrow --ref <nhánh>`); chờ bằng `gh run watch <id>` (hoặc vòng ≤15 phút);
đỏ thì `gh run download <id> -n giao-dien-<i>` đọc `pha-*.txt`. Trước đó chạy `bash mobile/scripts/cong-pr.sh` ở máy. Watchdog `PHA_HAN_GIAY` (90 s) bắt màn treo: `TREO <tên>`, mã thoát 3.

## Chạy tay

```sh
gh workflow run mobile -R tanthanhkid/aiigrow --ref <nhánh>                 # mặc định chụp MỌI màn
gh workflow run mobile -R tanthanhkid/aiigrow --ref <nhánh> -f chup_tat_ca=false   # chỉ chụp màn lỗi
gh run list -R tanthanhkid/aiigrow -w mobile -L 5
```

## Artifact

- `giao-dien-<i>` (i = 1..6): `pha-giao-dien-<i>.txt` + `pha-luong-<i>.txt` (log đủ) + `anh/*.png` (màn lỗi; chạy tay thì mọi màn). Tóm tắt lỗi nằm ở Summary của lượt chạy.
- `web-dist`: bản web Expo đã dựng (giữ 3 ngày).

```sh
gh run download <run-id> -R tanthanhkid/aiigrow -n giao-dien-1 -D /tmp/gd-1
```

## Dữ liệu thử + đăng nhập không OTP (cho kiểm e2e trên máy chủ thật)

`server/scripts/seed-ci.ts` (logic ở `server/lib/seed-ci.ts`) tạo một nhà Ba Mẹ đi qua đúng API của app/agent:
Ba Mẹ «Mẹ Lan» `0900000001` / mật khẩu `aiigrow-ci-123`; 3 con (Nguyễn Ngọc Bảo Anh, Bill — đang nợ 15 sao, Na);
3 máy con đã ghép (2 Windows, 1 Android); 3 việc chờ duyệt; bộ quà mẫu; lời xin mở web `scratch.mit.edu` + cài app `Minecraft` đang chờ.

```sh
cd server
AIIGROW_CI_LOGIN=1 DATABASE_URL=postgres://postgres:postgres@localhost:5432/aiigrow \
  SEED_CI_RA=/tmp/seed.json node --import ./lib/test-fixtures/next-esm.mjs scripts/seed-ci.ts
```

In/ghi JSON: `dinhDanh`, `matKhau`, `token` (phiên Ba Mẹ — dùng thẳng `Authorization: Bearer`), `con[]`, `may[]` (token máy con),
`luotChoDuyet[]`, `yeuCauCho[]`, `conNo`. Đổi số/mật khẩu: `SEED_CI_SDT`, `SEED_CI_MAT_KHAU`.

Đăng nhập không OTP = **mật khẩu thường** (`POST /api/m/dang-nhap`) — máy chủ không có đường cửa sau nào. OTP chỉ dùng lúc đăng ký,
và seed lấy mã ở chế độ thử (không phải production). Seed **từ chối chạy** (mã thoát 2) khi: thiếu `AIIGROW_CI_LOGIN=1`, `NODE_ENV=production`,
có `VERCEL`, `AIIGROW_BAT_BUOC_DB=1`, hoặc `DATABASE_URL` không trỏ `localhost` / `127.0.0.1` / `::1`. Test: `server/lib/seed-ci.test.ts`;
job `kiem` chạy lại hai trường hợp bị chặn trên runner.
