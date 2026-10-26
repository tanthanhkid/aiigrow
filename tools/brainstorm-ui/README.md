# Bàn brainstorm giao diện AiiGrow

Canvas kiểu Figma chạy trên máy: mọi màn AiiGrow (Clay gương) xếp theo hành trình, Claude sinh biến thể theo ý, Play bấm thử như prototype.

```bash
cd tools/brainstorm-ui && npm install && npm run brainstorm   # → http://127.0.0.1:5178/  (thử không key: ?mock=1)
```

- Section (như Pages của Figma): thanh bên chia theo vai + nền tảng (Ba Mẹ · Lần đầu & ghép máy, Ba Mẹ · Hằng ngày, Con · Windows, Con · Điện thoại, Bộ cài…). Canvas chỉ dựng section đang mở; section nhớ trong URL `#<id>` và localStorage nên F5 về đúng chỗ.
- Ảo hoá: chỉ khung trong viewport (+500px) và zoom ≥ 40% mới có iframe sống; còn lại là ảnh thu nhỏ (chụp nền, một khung một lúc) hoặc khung xám. Mũi tên chỉ tính cho khung đang thấy; số đo nút `data-toi` được giữ theo mã băm HTML nên mũi tên không mất khi iframe bị gỡ.
- ⚙ Cài đặt: dán API key Claude. Key chỉ nằm trong localStorage của trình duyệt, trình duyệt gọi thẳng `api.anthropic.com`; máy chủ cục bộ không thấy key.
- Chọn màn → gõ ý → Sinh biến thể (3–6, xếp dưới màn). Bấm tên hành trình → biến thể cho cả hành trình (mỗi phương án một hàng).
- ▶ Play (P): bấm nút có `data-toi` để đi giữa các màn. L: bật/tắt mũi tên liên kết. «Ảnh thật»: phủ ảnh chụp thật (thư mục `aiigrow-thiet-ke/` cạnh repo, đổi bằng `BS_THIET_KE`).
- Prompt caching: system + HTML ngữ cảnh gắn `cache_control` (ttl 1h); yêu cầu đầu ghi cache, các yêu cầu sau đọc cache. Số token hiện trên khung.
- Ghim & lưu → `tools/brainstorm-ui/da-luu/` (đã .gitignore). Xuất PNG/HTML tự đứng.
- Màn gốc: `web/hanh-trinh/*.js` (mỗi bước: key, ten, w, h, html, anh, toi).
