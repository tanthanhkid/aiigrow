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
- Người review mở `/r/<mã>`: xem theo thứ tự hành trình, Play, Quy trình; ghim góp ý (toạ độ % + selector) hoặc góp ý chung; Lỗi/Đề xuất/Câu hỏi; trả lời theo luồng. Góp ý gắn phiên bản: link mới vẫn thấy góp ý cũ («từ v1»).
- Gửi góp ý xong hỏi «Tạo biến thể theo góp ý này?» — dùng key Claude của CHÍNH người review (lưu trong trình duyệt, chỉ gửi api.anthropic.com); không có key thì gửi «Yêu cầu biến thể». Biến thể ưng thì «Đề xuất áp dụng» → đề xuất Chờ duyệt, thiết kế gốc KHÔNG đổi.
- Bàn chính: nút «💬 Góp ý» (lọc theo hành trình/người, «Tới» ghim, Đã xử lý, ✨ Sửa theo góp ý, xuất Markdown), tab «Đề xuất» (gốc | đề xuất | chênh lệch; Accept changes = Thay màn ghi tác giả + góp ý; Từ chối kèm lý do; Sửa tiếp trong Chế độ Sửa).
- **Ẩn đã xử lý** (`web/an-xu-ly.js`): góp ý «Đã xử lý» và đề xuất đã Accept/Từ chối mặc định ẩn ở bảng Góp ý, tab Đề xuất, danh sách + ghim trang `/r/`; số đếm chỉ tính góp ý mở. Công tắc «Hiện đã xử lý (N)» ở đầu danh sách (nhớ trong trình duyệt) hiện lại, làm mờ. Đánh dấu xử lý thì thẻ trượt ra + toast «Hoàn tác»; người khác xử lý thì ẩn theo realtime. Trả lời mới sau khi xử lý KHÔNG tự mở lại — chỉ chấm cam trên công tắc (tắt khi đã bật xem) và chip «↩ N trả lời sau khi xử lý».
- Kho ngoài git: `aiigrow-thiet-ke/brainstorm-ui/review/` (đổi bằng `BS_REVIEW`).
- **Quyền chủ quản** (kiểm ở máy chủ): mở bàn ở `127.0.0.1` là chủ quản. Qua tên miền/tunnel cần mã trong `aiigrow-thiet-ke/brainstorm-ui/chu-quan.json` (ngoài git, đổi bằng `BS_CHU_QUAN`): `{"ma": "<≥8 ký tự>", "khoaBang": false}`; bàn sẽ hỏi mã khi mở «Góp ý». Chưa đặt mã thì quyền chủ quản chỉ có trên 127.0.0.1. `khoaBang: true` thì qua tên miền Thay màn/Khôi phục và ghi kho biến thể (sinh/xoá/khôi phục) cũng cần mã; realtime bàn chính của người chưa có mã chỉ còn con trỏ/nhìn/tên. Thay màn do máy chủ báo cho mọi bàn. Link `/r/` không bao giờ có quyền Accept/Thay màn. **Lưu ý:** khi `khoaBang` tắt, ai biết tên miền của bàn (kể cả người nhận link `/r/`) vẫn mở được bàn chính và Thay màn như cộng tác viên — chia sẻ link `/r/` cho người ngoài nhóm thì bật `khoaBang: true`.

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
