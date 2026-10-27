# Bàn brainstorm giao diện AiiGrow

Canvas kiểu Figma chạy trên máy: mọi màn AiiGrow (Clay gương) xếp theo hành trình, Claude sinh biến thể theo ý, Play bấm thử như prototype.

```bash
cd tools/brainstorm-ui && npm install && npm run brainstorm   # → http://127.0.0.1:5178/  (thử không key: ?mock=1)
```

- Section (như Pages của Figma): thanh bên chia theo vai + nền tảng (Ba Mẹ · Lần đầu & ghép máy, Ba Mẹ · Hằng ngày, Con · Windows, Con · Điện thoại, Bộ cài…). Canvas chỉ dựng section đang mở; section nhớ trong URL `#<id>` và localStorage nên F5 về đúng chỗ.
- Ảo hoá: chỉ khung trong viewport (+500px) và zoom ≥ 40% mới có iframe sống; còn lại là ảnh thu nhỏ (chụp nền, một khung một lúc) hoặc khung xám. Mũi tên chỉ tính cho khung đang thấy; số đo nút `data-toi` được giữ theo mã băm HTML nên mũi tên không mất khi iframe bị gỡ.
- **Quy trình** (nút «Quy trình» hoặc phím B; hash `#qt:<section>`): sơ đồ kiểu BPMN lai giao diện cho section đang mở. Pool chia lane theo vai (Con · Máy của Con · Máy chủ AiiGrow · Ba Mẹ, chỉ hiện lane có dùng). Có sự kiện bắt đầu/kết thúc/hẹn giờ/tin, gateway có nhãn, việc hệ thống là khối chữ, việc có giao diện mang ảnh thu nhỏ của màn thật (gần và zoom ≥ 40% thì là iframe sống). Mũi tên liền là luồng trong một lane, mũi tên đứt là message flow giữa các lane. Bấm một màn để Play từ bước đó; «Xuất SVG/PNG» xuất sơ đồ của section. Các quy trình chính khai báo trong `web/hanh-trinh/quy-trinh.js`; hành trình chưa khai báo thì tự sinh một lane từ chuỗi màn. Bố trí tự động: hạng theo đường dài nhất (bỏ cạnh lùi), trái sang phải theo thời gian, không chồng.
- ⚙ Cài đặt: dán API key Claude. Key chỉ nằm trong localStorage của trình duyệt, trình duyệt gọi thẳng `api.anthropic.com`; máy chủ cục bộ không thấy key.
- Chọn màn → gõ ý → Sinh biến thể (3–6, xếp dưới màn). Bấm tên hành trình → biến thể cho cả hành trình (mỗi phương án một hàng).
- ▶ Play (P): bấm nút có `data-toi` để đi giữa các màn. L: bật/tắt mũi tên liên kết. «Ảnh thật»: phủ ảnh chụp thật (thư mục `aiigrow-thiet-ke/` cạnh repo, đổi bằng `BS_THIET_KE`).
- ✎ Sửa (E, `web/che-do-sua.js`): sửa trực tiếp khung đang chọn (iframe luôn sống khi sửa). Rê = viền xanh, bấm = chọn (nhãn thẻ + W×H, cây phần tử), ↑ chọn cha, Esc bỏ chọn/thoát. Kéo = đổi thứ tự trong cha flex/grid hoặc sang khối khác (vạch chỉ chỗ thả); Alt+kéo = dịch tự do (translate, bước 4px); tay nắm 8 hướng đổi cỡ (bước 4, Shift 8); bấm đúp/Enter sửa chữ; Alt+rê đo khoảng cách. Bảng phải: padding/margin/gap (gõ hoặc kéo nhãn), màu chữ/nền theo token Clay + màu trong màn, cỡ/độ đậm chữ, bo góc, bóng Clay, căn flex, Nhân bản (⌘D, giữ `data-toi`) / Xoá (⌫). ⌘Z / ⇧⌘Z theo khung. «Lưu thành biến thể» (khung mới dưới gốc), «Áp vào khung này» (khung đã là biến thể), «✨ Làm mượt bằng Claude» (gửi HTML đã sửa + danh sách thao tác; khối ngữ cảnh trùng luồng biến thể nên đọc lại cache).
- Màn máy Con (Windows/Mac/Android) và trang tải dựng khớp ảnh chụp thật trong `web/hanh-trinh/that/` (asset thật qua `/assets/win|mac|android/`); số đo từng màn ở `DO-KHOP.md`.
- Prompt caching: system + HTML ngữ cảnh gắn `cache_control` (ttl 1h); yêu cầu đầu ghi cache, các yêu cầu sau đọc cache. Số token hiện trên khung.
- **Thay màn**: biến thể ổn bấm «✓ Thay màn» (trên khung, bảng bên, hoặc trong Chế độ Sửa) → màn gốc hiển thị bản đó ở mọi nơi (bảng, Play, Quy trình, ảnh thu nhỏ); biến thể hỏng bấm «✕ Xoá» (có Hoàn tác / ⌘Z). Mỗi màn có «vN · Lịch sử»: xem từng bản, «Khôi phục» thêm bản mới (không xoá lịch sử). Kho phiên bản nằm ngoài git: `~/OFFLINE_FILES/Code/aiigrow-thiet-ke/brainstorm-ui/phien-ban/<key>/` (đổi bằng `BS_PHIEN_BAN`), ai mở bàn (kể cả qua tunnel) đều thấy; ghi qua tunnel chỉ nhận tên miền tin cậy (trycloudflare.com, phanmemtrinity.com, aiilab.vn, thêm bằng `BS_HOST=a.com`). Xuất PNG/HTML tự đứng ở mục «Tải về…».
- Thanh hành trình bên trái ẩn/hiện bằng nút ‹ / › hoặc phím `\` (⌘\).
- Màn gốc: `web/hanh-trinh/*.js` (mỗi bước: key, ten, w, h, html, anh, toi).
- Màn iPhone Ba Mẹ + Con `/tre`: DOM chụp từ app Expo chạy thật ở `web/that/` (thay HTML dựng tay khi có) — cách làm và % lệch so với ảnh thật trong `DO-KHOP.md`.

## Kho biến thể chung (máy chủ)

- Mọi biến thể màn lẻ và phương án hành trình lưu trên máy chủ, kho ngoài git `aiigrow-thiet-ke/brainstorm-ui/bien-the/` (đổi bằng `BS_BIEN_THE`): `k/<id>.json` + `k/<id>.html` (+ `k/<id>.phu`: bản sửa tay của khung «Làm mượt»), `l/<id>.json`. Máy chủ giữ chỉ mục thông tin trong bộ nhớ (quét lại mỗi phút). Ghi atomic, tối đa 200 mục/lần ghi (vượt thì 413, không cắt lặng lẽ), giới hạn 3 MB HTML/khung, 4000 mục/loại, 900 lần ghi/phút/IP; ghi kiểm Origin/Host như kho phiên bản.
- Ai mở bàn (127.0.0.1 hay qua tên miền) cũng thấy cùng một bộ; sinh/xoá/khôi phục của người này hiện ngay bên người kia qua realtime, kể cả khung «đang sinh» (người sinh làm mới mỗi 45 giây; quá 2,5 phút không làm mới thì hiện «bị gián đoạn»). Hai tiến trình dùng chung kho (5178, 5181) thấy thay đổi của nhau qua `fs.watch` + quét mỗi phút.
- Client gửi kèm `tSuaCu` (bản máy chủ nó dựa vào); máy chủ đã có bản mới hơn thì không đè mà trả `xungDot`, client lấy bản mới nhất. Mục máy chủ không nhận (`tuChoi`) không bị coi là đã lưu và không gửi lại tới khi đổi; lúc di trú thì giữ riêng ở `bs.v2.khong-nhan`.
- Xoá = xoá mềm: vào `rac/`, giữ 7 ngày, khôi phục ở «🗑 Thùng rác».
- localStorage chỉ còn cài đặt, key, tên, khung nhìn. Lần đầu mở bản này, biến thể cũ trong localStorage (`bs.v2`) tự chuyển lên máy chủ (chỉ thêm mục chưa có) rồi được dọn.

## Góp ý (chia sẻ để review)

- Đầu mỗi hành trình có «💬 Chia sẻ để góp ý»: chụp đóng băng các màn (phiên bản đang dùng) + sơ đồ Quy trình thành link `/r/<mã 128 bit>` (v1, v2… theo hành trình, có ghi chú, thu hồi được ở tab «Chia sẻ»).
- Người review mở `/r/<mã>`: xem theo thứ tự hành trình, Play, Quy trình; ghim góp ý (toạ độ % + selector) hoặc góp ý chung; Lỗi/Đề xuất/Câu hỏi; trả lời theo luồng. Góp ý gắn phiên bản: link mới vẫn thấy góp ý cũ («từ v1»). Màn được «Thay màn»/Khôi phục trên bàn chính SAU khi chia sẻ: trang `/r/` hiện bản hiện hành (Xem, Play, Ghim, biến thể theo góp ý; dấu «mới», đổi theo realtime), nút «✨ Đang xem bản mới nhất ↔ 🕘 bản lúc chia sẻ» để đối chiếu; sơ đồ Quy trình vẫn là ảnh lúc chia sẻ.
- **Xoá màn / liên kết** (27/10): chủ quản bấm 🗑 trên khung màn gốc để xoá màn khỏi hành trình — xoá mềm, ghi thành phiên bản mới có cờ `xoa` (audit `man.xoa`), khung mờ đi kèm nút «↺ Khôi phục màn». Play/Quy trình/link `/r/` bỏ qua màn đã xoá; nút dẫn tới nó hiện «⚠ N liên kết hỏng» trên khung nguồn. Nút 🔗 mở bảng liên kết của màn: đổi màn đích / gỡ từng nút, hoặc bật «Hiện cả nút chưa nối» để tạo liên kết mới — mỗi thay đổi là một phiên bản mới của màn nguồn (audit `man.lien-ket`, quyền như Thay màn), realtime báo mọi bàn và `/r/`. Liên kết đã sửa tay đánh dấu `data-lk-sua` trên `<body>` để không tự gắn lại theo nhãn bước.
- Bàn chính và `/r/` tự đối chiếu phiên bản màn với máy chủ khi nối lại realtime, khi mở Play và khi quay lại tab — tin «Thay màn» lỡ lúc WebSocket rớt (deploy, máy ngủ) không làm Play kẹt bản cũ.
- Gửi góp ý xong hỏi «Tạo biến thể theo góp ý này?» — dùng key Claude của CHÍNH người review (lưu trong trình duyệt, chỉ gửi api.anthropic.com); không có key thì gửi «Yêu cầu biến thể». Biến thể ưng thì «Đề xuất áp dụng» → đề xuất Chờ duyệt, thiết kế gốc KHÔNG đổi.
- Bàn chính: nút «💬 Góp ý» (lọc theo hành trình/người, «Tới» ghim, Đã xử lý, ✨ Sửa theo góp ý, xuất Markdown), tab «Đề xuất» (gốc | đề xuất | chênh lệch; Accept changes = Thay màn ghi tác giả + góp ý; Từ chối kèm lý do; Sửa tiếp trong Chế độ Sửa).
- **Ẩn đã xử lý** (`web/an-xu-ly.js`): góp ý «Đã xử lý» và đề xuất đã Accept/Từ chối mặc định ẩn ở bảng Góp ý, tab Đề xuất, danh sách + ghim trang `/r/`; số đếm chỉ tính góp ý mở. Công tắc «Hiện đã xử lý (N)» ở đầu danh sách (nhớ trong trình duyệt) hiện lại, làm mờ. Đánh dấu xử lý thì thẻ trượt ra + toast «Hoàn tác»; người khác xử lý thì ẩn theo realtime. Trả lời mới sau khi xử lý KHÔNG tự mở lại — chỉ chấm cam trên công tắc (tắt khi đã bật xem) và chip «↩ N trả lời sau khi xử lý».
- Kho ngoài git: `aiigrow-thiet-ke/brainstorm-ui/review/` (đổi bằng `BS_REVIEW`).
- **Quyền chủ quản** (kiểm ở máy chủ): mở bàn ở `127.0.0.1` là chủ quản. Qua tên miền/tunnel cần mã trong `aiigrow-thiet-ke/brainstorm-ui/chu-quan.json` (ngoài git, đổi bằng `BS_CHU_QUAN`): `{"ma": "<≥8 ký tự>", "khoaBang": false}`; bàn sẽ hỏi mã khi mở «Góp ý». Chưa đặt mã thì quyền chủ quản chỉ có trên 127.0.0.1. `khoaBang: true` thì qua tên miền Thay màn/Khôi phục và ghi kho biến thể (sinh/xoá/khôi phục) cũng cần mã; realtime bàn chính của người chưa có mã chỉ còn con trỏ/nhìn/tên. Thay màn do máy chủ báo cho mọi bàn. Link `/r/` không bao giờ có quyền Accept/Thay màn. **Lưu ý:** khi `khoaBang` tắt, ai biết tên miền của bàn (kể cả người nhận link `/r/`) vẫn mở được bàn chính và Thay màn như cộng tác viên — chia sẻ link `/r/` cho người ngoài nhóm thì bật `khoaBang: true`.
- **Mật khẩu chung** (`cong-vao.mjs`, cổng đứng trước mọi đường): khi `chu-quan.json` có `matKhau` (≥8 ký tự) và `biMatPhien` (≥32 ký tự, ngẫu nhiên),
  vào qua tên miền phải đăng nhập ở `/__dang-nhap` — áp cho trang, `/api`, `/ref`, `/assets`, link `/r/`, realtime `/ws`. Đúng ⇒ cookie `bs_phien`
  (HttpOnly, Secure, SameSite=Lax, 30 ngày, ký HMAC-SHA256 bằng `biMatPhien` + băm mật khẩu: đổi mật khẩu là mọi phiên cũ hết hiệu lực). Sai mật khẩu: giới hạn
  10 lần/phút/IP (bộ đếm riêng), audit `quyen.sai-mat-khau` (chỉ độ dài); gõ đúng không bị ngưỡng chung chặn. Thiếu `biMatPhien` thì máy chủ tự sinh;
  `chu-quan.json` hỏng ⇒ cổng đóng (503), không mở toang. Phiên hết hạn khi đang mở bàn ⇒ dải báo «Đăng nhập lại» (không tự chuyển trang). `127.0.0.1` gõ thẳng không cần. `/mcp` nhận `Bearer <maMcp>` hoặc cookie phiên (cookie chỉ khi đã đặt `maMcp`). Đăng xuất: `/__dang-xuat`.
  Mật khẩu chung chỉ là cổng vào — Accept/Thay màn khi `khoaBang` vẫn cần mã chủ quản `x-bs-chu-quan`.

## Lịch sử thay đổi (audit)

Mọi thao tác ghi phía máy chủ được ghi vào nhật ký **append-only** — biến thể (tạo/sửa/xoá/khôi phục/xoá vĩnh viễn khi dọn thùng rác/di trú
localStorage), phương án, phiên bản màn (Thay màn, khôi phục, Accept đề xuất), góp ý (tạo/trả lời/sửa/xoá/đổi trạng thái/đổi mức/yêu cầu biến thể),
đề xuất (tạo/Accept/Sửa tiếp/từ chối), link `/r/` (tạo/thu hồi), đổi `chu-quan.json` và thử mã chủ quản sai.

- Lưu ở `aiigrow-thiet-ke/brainstorm-ui/audit/<YYYY-MM-DD>.jsonl` (đổi bằng `BS_AUDIT`): một dòng một sự kiện `{i, t, loai, dt, ai, truoc, sau, ghiChu, p}`,
  ghi nối + fsync. `ai` = tên hiển thị, vai (`chu-quan`/`cong-tac`/`reviewer`), mã `/r/`, IP thật (`cf-connecting-ip`, chỉ tin khi đến từ cloudflared trên máy),
  user-agent rút gọn. **Không bao giờ** ghi mã chủ quản hay key Claude.
- Chuỗi băm: `p` = sha256 của dòng ngay trước (liền qua các ngày). Kiểm: `node tools/brainstorm-ui/audit-kiem.mjs [thư mục] [--blob]` — thoát 1 và chỉ
  tệp:dòng nếu có dòng bị sửa/xoá/chèn.
- Nội dung lớn (HTML > 2 KB) lưu theo băm ở `audit/blob/<sha256>.html.gz`, không bao giờ xoá (kể cả khi dọn thùng rác) ⇒ mọi trạng thái cũ dựng lại được.
- Xem: nút **🕘 Lịch sử** trên thanh trên (chỉ chủ quản) — lọc theo người/loại/màn/hành trình/id/ngày, xem trước ↔ sau (HTML + diff chữ),
  **Khôi phục trạng thái này** cho biến thể/phương án/màn/góp ý (ghi thành sự kiện MỚI, lịch sử cũ giữ nguyên), xuất CSV/JSONL theo khoảng ngày.
  Mỗi khung có **🕘 Nhật ký** ở bảng bên phải, mỗi góp ý có **🕘 Lịch sử**.
- Không có API sửa/xoá audit. Sao lưu: thư mục `brainstorm-ui/audit` (trong `aiigrow-thiet-ke`).

## MCP (cho Claude Code / client MCP)

Endpoint **Streamable HTTP `/mcp`** ngay trong `server.mjs` (cùng cổng — `mcp.mjs`, stateless, chỉ POST). Máy chủ **không gọi AI**: AI là của người dùng qua MCP.

```bash
# trên máy Thanh (127.0.0.1 = chủ quản, không cần mật khẩu)
claude mcp add --transport http aiigrow-figma http://127.0.0.1:5181/mcp
# qua tên miền: bắt buộc mật khẩu MCP; thao tác của chủ quản thêm mã chủ quản
claude mcp add --transport http aiigrow-figma https://aiigrow-figma.aiilab.vn/mcp \
  --header "Authorization: Bearer <maMcp>" [--header "x-bs-chu-quan: <mã chủ quản>"] [--header "x-bs-nguoi: <tên hiện trong audit>"]
```

- **Mật khẩu MCP**: trường `maMcp` (≥8 ký tự) trong `chu-quan.json` (ngoài git, `BS_CHU_QUAN`). Qua tên miền thiếu/sai Bearer ⇒ 401; sai mã dùng chung giới hạn
  với mã chủ quản (10 lần/phút/IP, 100 lần/phút cả máy chủ), lần sai ghi audit `quyen.sai-ma-mcp` (chỉ độ dài, không ghi mã). Chưa đặt `maMcp` ⇒ /mcp chỉ dùng
  được từ 127.0.0.1. Có `maMcp` = quyền cộng tác viên; thao tác riêng của chủ quản (Accept, góp ý, audit, Thay màn khi `khoaBang`…) cần thêm header `x-bs-chu-quan`.
- **Quyền & audit**: mỗi tool đi qua CHÍNH đường xử lý API web bằng một yêu cầu nội bộ mang danh tính người gọi (Host, IP thật, header cloudflared, mã chủ quản)
  ⇒ kiểm `khoaBang`, giới hạn tốc độ, realtime phát cho người đang xem bàn, audit đủ như web; audit có `ai.nguon = "mcp"`.
- **Chống DNS rebinding**: Host phải là 127.0.0.1/localhost hoặc tên miền tin cậy (`BS_HOST`); có Origin thì phải trùng Host tin cậy.
- **Ảnh**: Chrome đã cài trên Mac (`BS_CHROME` để đổi; không tải Chromium) chạy headless qua `puppeteer-core`, một trình duyệt dùng chung, mở khi cần, tự đóng
  sau 2 phút rảnh, hồ sơ tạm riêng; ảnh cache theo băm HTML. HTML màn đưa cho Chrome qua `/__mcp/trang/<mã một lần>` (chỉ loopback, CSP cấm script).
  `lamSach` (web/claude.js) và `ganToi` (web/gan-toi.js) chạy nguyên mã web trong trang của Chrome đó.

**26 tool:**

| Tool | Việc |
|---|---|
| `ds_hanh_trinh` | hành trình + màn (key, tên, w×h hiện hành, phiên bản, ảnh thật, `data-toi`, số biến thể, phương án) |
| `doc_man` | HTML hiện hành (hoặc bản `v`) + lịch sử phiên bản |
| `anh_man` | PNG đúng khung w×h (tuỳ `v`, `anh_that` kèm ảnh chụp thật, `ti_le`) |
| `anh_hanh_trinh` | ảnh cả hành trình / một phương án — ghép một ảnh (mặc định) hoặc từng ảnh |
| `ds_bien_the`, `doc_bien_the`, `xoa_bien_the` | kho biến thể chung (đọc kèm ảnh; xoá mềm) |
| `thay_man`, `khoi_phuc_phien_ban` | Thay màn bằng biến thể/HTML; khôi phục bản cũ |
| `xoa_man`, `khoi_phuc_man` | xoá mềm một màn khỏi hành trình / khôi phục (chỉ chủ quản; là phiên bản mới có cờ `xoa`, audit `man.xoa` / `man.khoi-phuc-xoa`) |
| `ds_lien_ket`, `ds_lien_ket_hong`, `sua_lien_ket` | liên kết `data-toi` của một màn (kèm nút chưa nối khi `tat_ca`); liên kết hỏng cả bàn (trỏ tới màn đã xoá/không còn); tạo/đổi/gỡ liên kết (chọn nút theo `phan_tu`, `chu` hoặc `toi_cu`) — lưu thành phiên bản mới của màn nguồn, audit `man.lien-ket`, quyền như Thay màn |
| `ds_gop_y`, `them_gop_y`, `tra_loi_gop_y`, `doi_trang_thai_gop_y` | góp ý (mặc định ẩn Đã xử lý; thêm góp ý qua link `/r/` mới nhất đang mở) |
| `doc_de_xuat`, `chap_nhan_de_xuat`, `tu_choi_de_xuat` | đề xuất của reviewer |
| `nhat_ky` | audit gần đây (HTML lớn rút gọn) |
| `ngu_canh_bien_the` → `tao_bien_the` | biến thể một màn, 2 bước (truyền lại `dot` để k=1..n xếp chung một hàng): ngữ cảnh y hệt bàn web (system `heThong`, `loiNguoiDung` theo k/n, kit CSS, ảnh màn, góp ý mở) → lưu HTML/câu trả lời do client sinh (lamSach, so `data-toi`, trả id + ảnh) |
| `ngu_canh_hanh_trinh` → `tao_phuong_an` | như trên cho CẢ hành trình (`loiHanhTrinh` / `tachHanhTrinh`) |

## Bản Cloudflare (aiigrow-figma.aiilab.vn)

Bản chạy thật nằm trên Cloudflare, không phụ thuộc Mac (`cf/`). Lõi xử lý là `ung-dung.mjs` (`taoUngDung`), dùng chung cho `server.mjs` (Mac) và `cf/worker.mjs`.

- **Worker** (`cf/worker.mjs`): cổng mật khẩu chung cho mọi đường; tệp tĩnh lấy từ Workers Static Assets (`cf/dist`, do `cf/dung.mjs` dựng: web/, ảnh asset, và chỉ những ảnh «thật» mà hành trình dùng).
- **Durable Object `Ban`** (một bản `bang`): `/api`, `/mcp`, `/ws`, `/__*` chạy NGUYÊN lõi `ung-dung.mjs`. Lõi gọi `node:fs` nhưng wrangler alias trỏ nó về `cf/fs-do.mjs` (fs đồng bộ trên SQLite của DO). Realtime dùng WebSocket ngủ đông (`cf/realtime-do.mjs`, cùng giao thức với `realtime.mjs`). Ảnh màn MCP chụp bằng Browser Rendering (`@cloudflare/puppeteer`).
- **Chi phí**: Durable Object, Static Assets và Browser Rendering đều nằm trong hạn mức gói Workers Paid (5 USD/tháng) ở mức dùng của vài người. Không bật Containers.
- **Bí mật** (`wrangler secret`, không nằm trong repo): `MAT_KHAU` (mật khẩu chung), `BI_MAT_PHIEN` (khoá ký cookie, ≥32 ký tự), `MA_CHU_QUAN`, `MA_MCP`. Biến thường đặt trong `cf/wrangler.jsonc`: `KHOA_BANG`, `HOST_THEM`, `GOC` (tên miền chính, dùng cho trang chụp ảnh MCP). Thiếu `MAT_KHAU`/`BI_MAT_PHIEN` thì mọi đường trả 503 (đóng, không mở).

```bash
cd tools/brainstorm-ui && npm install && cd cf && npm install
# tài khoản Cloudflare: CLOUDFLARE_API_TOKEN, hoặc CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL, và CLOUDFLARE_ACCOUNT_ID
npm run dung                       # dựng cf/dist (ảnh thật đọc từ BS_THIET_KE, mặc định ~/OFFLINE_FILES/Code/aiigrow-thiet-ke)
npm run deploy                     # dựng + Worker + DO + custom domain aiigrow-figma.aiilab.vn (routes trong wrangler.jsonc)
npx wrangler secret bulk <tệp.json> # đặt 4 bí mật một lần (tệp JSON tạm, xoá ngay sau đó)
npx wrangler tail                  # xem log
```

- **Dữ liệu** (biến thể, phiên bản, góp ý, audit) nằm trong DO. Dùng `cf/kho.mjs` để chuyển giữa DO và thư mục Mac (chỉ chủ quản; mật khẩu và mã đọc từ `BS_MAT_KHAU`/`BS_MA_CHU_QUAN` hoặc `chu-quan.json` của thư mục):
  - `node cf/kho.mjs nap https://aiigrow-figma.aiilab.vn <thư mục brainstorm-ui>` — di trú lên Cloudflare (ghi đè, đứt thì chạy lại). Nạp đủ thì tự chốt, đường nạp đóng hẳn, nên audit trên Cloudflare không bị bản Mac cũ đè.
  - `node cf/kho.mjs keo https://aiigrow-figma.aiilab.vn <thư mục brainstorm-ui>` — kéo về Mac. Job sao lưu git (`tro_ly/jobs/brainstorm-sao-luu/sao-luu.sh`) chạy lệnh này trước khi commit. Nếu sắp xoá > 20% tệp cục bộ, lệnh vẫn tải tệp mới nhưng không xoá và thoát 1; kiểm rồi chạy tay với `--cho-xoa`.
- **Mac chỉ đọc**: chạy `server.mjs` với `BS_CHI_DOC=https://aiigrow-figma.aiilab.vn` thì mọi lệnh ghi `/api` trả 423 và chỉ tới bản Cloudflare. Như vậy không có hai nguồn dữ liệu.
- **MCP qua Cloudflare**:
  `claude mcp add --transport http aiigrow-figma https://aiigrow-figma.aiilab.vn/mcp --header "Authorization: Bearer <maMcp>" [--header "x-bs-chu-quan: <mã chủ quản>"]`.
  Trên Cloudflare không có «127.0.0.1 = chủ quản»: thao tác của chủ quản luôn cần mã chủ quản.
- **Khác bản Mac**: tệp audit theo ngày đặt tên theo giờ UTC; trạng thái con trỏ realtime mất khi DO ngủ đông (người dùng gửi lại ngay khi di chuột).
