# Ngôn ngữ thiết kế AiiGrow — Clay gương (Thanh chốt 24/10/2026)

Áp cho **MỌI nền tảng có giao diện**: app mobile (phụ huynh + Con), web máy chủ (`server/app`: trang chủ, /tai, /cai, /chinh-sach-rieng-tu, /admin), agent Windows (tray, màn khoá), agent Mac (tray), app Con iOS (`agent-ios`, shield), app Con Android (`agent-android`).
Thanh 24/10: *"chọn 6 … vui và ánh men"* · *"rồi ghi lại đi áp dụng cho giao diện tất cả nền tảng"*.

## 1. Chất liệu — Clay A · màu gốc · bóng gương
- Màu GIỮ token hiện tại (`mobile/src/lib/mau.ts`): nền `#f4f4f2`, chữ `#0f1312`, nút chính than chì `#0f1312`, ngọc lục bảo `#0f6b5c` điểm nhấn, vàng `#f5b70a` CHỈ cho điểm. Font Inter.
- Khối phồng như đất sét: bo 24–36, **bóng kép** (bóng ngoài mềm lệch xuống + inset sáng trên-trái + inset tối dưới-phải), không viền mảnh.
- **Bóng gương** (tráng men): mảng men trắng sắc nửa trên nút/chip/huy hiệu, vệt phản chiếu ở đáy, dải sáng cong mép trên thẻ, bóng đổ rõ hơn satin.
- Mẫu chuẩn: `docs/clay/A-goc-guong.png` + `clay-a-goc-guong.css` (CSS dùng thẳng cho web).

## 2. Icon — Fluent Emoji 3D (MIT)
- Icon minh hoạ (trong viên clay: chuông, khoá, địa cầu, đồng hồ, máy tính, quà, ứng dụng…) = PNG 3D của `microsoft/fluentui-emoji` — đóng gói vào app/web, không tải CDN lúc chạy.
- Icon điều hướng nhỏ (thanh tab, mũi tên, cộng) = icon đặc đơn giản (Phosphor Fill).
- Mẫu: `docs/clay/I-fluent-3d.png` + `I-fluent-3d.html`.

## 3. Chuyển động — «vui» + «ánh men»
- Nhấn: bẹp-nảy (scale ~0.96 → spring vượt nhẹ) + vệt sáng men lướt chéo qua khối.
- Thành công (duyệt, nhận điểm): confetti nhỏ ngọc/vàng, «+N» bay theo đường cong vào ví, ví nảy, số lăn lên.
- Rời danh sách: trượt/mờ + thu chiều cao; toast «Hoàn tác».
- Trạng thái: khoá máy = ổ khoá đóng sập; chuông rung khi có việc mới; tải trang = các khối vào lần lượt (stagger); đổi ngữ cảnh = trượt/cross-fade.
- Thời lượng 150–450ms, transform/opacity. **Reduce Motion ⇒ chỉ fade.** Thông số: đầu file `docs/clay/M-vui.js`, `M-anh-men.css`.
- Mobile: `react-native-reanimated`. Web: CSS/JS như mẫu. Native (SwiftUI/Compose/WPF): spring tương đương.

## 4. Không đổi
Tương phản chữ ≥4.5:1, vùng chạm ≥44, các luật `docs/UI-FOUNDATIONS.md`, cổng `pha.mjs --giao-dien` vẫn áp.
