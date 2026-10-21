# AiiGrow — hợp đồng API (bản M0)

Mọi lỗi trả `{ "error": "<mã>", "message": "<câu cho người dùng, tiếng Việt>" }` kèm HTTP status. JSON vào/ra, `cache-control: no-store`.

## Máy chủ

| Đường | Ý |
|---|---|
| `GET /api/suc-khoe` | `{ ok, ten, luc }` — máy chủ sống, mở được CSDL |

## App Ba Mẹ — `/api/m/*` (Bearer = token phiên Ba Mẹ)

| Đường | Vào | Ra | Lỗi chính |
|---|---|---|---|
| `POST otp` | `{ dinhDanh, mucDich: "dang_ky" \| "quen_mk" }` | `{ guiDen, ma? }` — `ma` chỉ có ở chế độ thử (chưa có nhà cung cấp SMS/email) | `dinh_danh_sai`, `da_co_tai_khoan` (409), `otp_chua_mo` (503) |
| `POST dang-ky` | `{ dinhDanh, ma, ten, matKhau }` | `{ token, moi: true }` — tạo gia đình, Ba Mẹ là Chủ gia đình | `otp_sai`, `otp_het_han`, `otp_qua_so_lan`, `mk_ngan`, `thieu_ten` |
| `POST dang-nhap` | `{ dinhDanh, matKhau }` | `{ token }` | `sai_dang_nhap` (401), `tam_khoa` (429, sau 5 lần sai) |
| `POST quen-mat-khau` | `{ dinhDanh, ma, matKhauMoi }` | `{ ok }` — đăng xuất mọi máy | như `dang-ky` |
| `GET toi` | — | `{ baMe: { id, ten, dinhDanh, vai } }` | `chua_dang_nhap` (401) |
| `POST dang-xuat` | — | `{ ok }` | |

`dinhDanh` = số điện thoại Việt Nam (0…, +84…, 84…, có dấu cách/chấm đều nhận) hoặc email. Các nhóm `/api/kid/*` (màn Con) và
`/api/device/*` (agent) thêm ở M1/M4.
