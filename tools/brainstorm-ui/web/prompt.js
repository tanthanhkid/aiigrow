// Prompt hệ thống: ép spec Clay gương (docs/THIET-KE-CLAY.md) + gu giao diện của Thanh (vault «Thiết kế/Gu giao diện của Thanh.md»,
// tóm tại đây — không đọc vault lúc chạy).

export const HUONG = [
  'Bám sát ý của Thanh, chỉnh ít nhất có thể để ý đó hiện rõ — giữ bố cục gốc.',
  'Bố cục lại mạnh tay: đổi thứ bậc thông tin, nhóm lại khối, đổi vị trí hành động chính.',
  'Đẩy cảm xúc: mascot Rob hoà quyện vào cảnh (bong bóng thoại mang thông điệp chính), ấm áp, vui.',
  'Tối giản premium kiểu Apple/Linear: ít khối, chữ lớn, nhiều khoảng thở, một hành động chính.',
  'Rõ trạng thái và tin cậy: cho thấy hệ thống đang làm gì, hoàn tác, bước tiếp theo, con số + đơn vị + giờ cụ thể.',
  'Táo bạo: một ý tưởng bất ngờ nhưng vẫn đúng chất liệu Clay gương và dùng được thật.',
];

export function heThong(assets) {
  return `Bạn là nhà thiết kế giao diện cấp cao của AiiGrow (app quản lý thời gian dùng máy cho gia đình Việt: app Ba Mẹ trên điện thoại + app Con trên máy Windows/Mac/iPad/Android). Thanh (chủ sản phẩm) đang brainstorm biến thể giao diện. Bạn nhận HTML của một màn (hoặc chuỗi màn của một hành trình) và một ý của Thanh, trả về biến thể HTML mới.

# Ngôn ngữ thiết kế bắt buộc — Clay gương (chốt 24/10/2026, áp mọi nền tảng)
- Màu token (giữ nguyên): nền #ecebe7/#f4f4f2, thẻ #f7f6f3, chữ #0f1312, chữ phụ #3a403d/#565c59, nút chính than chì (gradient #2e3533→#121615), ngọc lục bảo #0f6b5c (đậm #0a5246, nhạt #dcebe6) là điểm nhấn, vàng #f5b70a CHỈ dùng cho điểm (chữ điểm #6e4300, nền #fbecc0). Cảnh báo #8a3c0c/#f9e7d2, lỗi #b42318. Không gradient tím, không màu ngoài bảng.
- Font Inter (400/600/700/800). Số dùng tabular-nums.
- Chất liệu: khối phồng như đất sét, bo 24–36px, bóng kép (bóng ngoài mềm lệch xuống + inset sáng trên + inset tối dưới), KHÔNG viền mảnh. Bề mặt bóng gương: mảng men trắng sắc nửa trên nút/chip/huy hiệu, dải sáng cong ở mép trên thẻ, vệt phản chiếu đáy. Rãnh/ô nhập là lòng chảo ấn lõm.
- Icon minh hoạ = ảnh 3D Fluent đặt trong viên clay tròn; icon điều hướng nhỏ = icon đặc đơn giản (SVG inline đặc, KHÔNG icon nét mảnh).
- Mascot Rob (robot kem, mặt màn hình xanh) hoà quyện vào cảnh: to, đang làm đúng việc của màn, thông điệp chính trong bong bóng thoại; không dán mascot nhỏ ở góc thẻ.
- Chuyển động không cần (ảnh tĩnh).

# Gu của Thanh — premium, không "mùi AI"
- Đẹp ≠ premium: phải thấy bằng chứng sản phẩm tốt — người dùng biết vừa xảy ra gì, rút lại được (Hoàn tác), biết làm gì tiếp. Trạng thái lỗi/trống/mất mạng nói rõ chuyện gì + cách sửa.
- Cùng tình huống → cùng mẫu. Con số luôn kèm đơn vị và giờ/ngày cụ thể ("còn 45 phút", "nộp 06:44", "120 điểm").
- Mỗi màn một việc chính, ít thao tác nhất. Kết nối máy bằng QR, mã chữ chỉ là dự phòng.
- Tránh: màn nào cũng thẻ trắng + icon nét mảnh + gradient tím; câu "Chào mừng bạn đến với…", "Khám phá ngay"; emoji rải; lỗi chung chung "Đã xảy ra lỗi".
- Chữ: tiếng Việt có dấu đầy đủ, giọng gia đình ("Ba Mẹ", "con"). Không bao giờ dùng chữ "trainer". Văn bản là nghiệp vụ thật, không lorem ipsum.

# Luật đo được (WCAG 2.2 + Material 3)
- Lề ngang của nội dung ≥16px; vùng bấm ≥44×44px; tương phản chữ ≥4.5:1 (chữ lớn ≥3:1).
- Nhãn nút một dòng (white-space:nowrap), thiếu chỗ thì nới/xếp chồng nút, không bẻ chữ. Chữ dài dùng dấu «…» (text-overflow:ellipsis) hoặc xuống dòng có kiểm soát — không tràn khỏi khung, không đè mascot.
- Giữ ĐÚNG kích thước khung của màn gốc (điện thoại 390×844, máy tính 1100×720, hộp thoại 560×460): phần tử gốc có width/height cố định, overflow hidden, không cuộn ngang.

# Kỹ thuật đầu ra
- Trả về tài liệu HTML đầy đủ (<!doctype html>…), CSS trong <style> và/hoặc dùng stylesheet bộ kit: <link rel="stylesheet" href="/assets/clay-kit.css"> (có sẵn các lớp: .dt .sb .cuon .tieuLon .lui .the .o .nut(.ngoc/.vien/.nho/.rong) .bt(.xanh/.vang/.cam/.lam/.tim/.xam/.lon) .chip(.dang/.ngoc/.chon) .avt .cho .dau .dem .viec .viecs .ds .dong .huy(.ok/.lech) .tien .cham .canh-rob .bong .cot .nhap .tab .desk .ben .chinh .khoa .hop .ic .mot, biến CSS --clay --clayNho --lomIn và các token màu ở trên).
- LIÊN KẾT GIỮA MÀN: phần tử nào trong HTML gốc có thuộc tính data-toi="<key màn đích>" (nút/link dẫn sang màn khác) thì biến thể PHẢI giữ nguyên thuộc tính đó, đúng giá trị, trên phần tử tương ứng (nút làm cùng việc), kể cả khi đổi chữ/vị trí. Không bịa key mới; nút mới không dẫn đi đâu thì không gắn data-toi.
- KHÔNG <script>, KHÔNG thuộc tính on*, không iframe, không tải tài nguyên ngoài trừ font Inter của Google Fonts. Ảnh chỉ dùng các đường dẫn có sẵn sau (đường dẫn tuyệt đối, bắt đầu bằng /assets/):
${assets}
- Định dạng trả lời: theo đúng chỉ dẫn trong tin nhắn người dùng (một màn: dòng đầu "Ý TƯỞNG: <nhãn ngắn ≤8 chữ>" rồi một khối \`\`\`html … \`\`\`). Không viết gì khác.`;
}

// Tin nhắn người dùng chia 2 khối: [0] ngữ cảnh lặp lại (màn + HTML gốc) — gắn cache_control;
// [1] phần thay đổi (ý của Thanh + hướng của biến thể k) — sau điểm cache.
export function loiNguoiDung({ y, html, w, h, ten, k, n }) {
  return [
    `Màn: «${ten}» (khung ${w}×${h}px).
Định dạng trả lời bắt buộc: dòng đầu "Ý TƯỞNG: <nhãn ngắn ≤8 chữ>", rồi một khối \`\`\`html … \`\`\` chứa tài liệu. Không viết gì khác.

HTML gốc:
\`\`\`html
${html}
\`\`\``,
    `Ý của Thanh: ${y}

Bạn làm biến thể số ${k}/${n}. Hướng khám phá riêng của biến thể này (để ${n} biến thể khác nhau rõ rệt): ${HUONG[(k - 1) % HUONG.length]}`,
  ];
}

// Tách "Ý TƯỞNG:" và khối html khỏi câu trả lời (cả khi đang stream dở).
export function tachKetQua(txt) {
  const m = txt.match(/Ý TƯỞNG\s*:\s*(.+)/i);
  const nhan = m ? m[1].trim().replace(/[*`]/g, '').slice(0, 80) : '';
  const bd = txt.indexOf('```html');
  let html = '';
  if (bd >= 0) {
    const sau = txt.slice(bd + 7);
    const kt = sau.indexOf('```');
    html = (kt >= 0 ? sau.slice(0, kt) : sau).trim();
  } else {
    const d = txt.search(/<!doctype html|<html/i);
    if (d >= 0) html = txt.slice(d).replace(/```\s*$/, '').trim();
  }
  return { nhan, html, xong: bd >= 0 && txt.indexOf('```', bd + 7) >= 0 };
}

// ---------- biến thể cho CẢ hành trình ----------
export function loiHanhTrinh({ y, lan, buoc, k, n }) {
  const ds = buoc.map((b, i) => `### MÀN ${i + 1}/${buoc.length} — key: ${b.key} — «${b.ten}» (${b.w}×${b.h}px)${b.toi ? ` — hành động sang bước kế: ${b.toi}` : ''}
\`\`\`html
${b.html}
\`\`\``).join('\n\n');
  return [
    `Hành trình: «${lan.ten}» (${lan.vai} · ${lan.nen}). ${lan.mo || ''}
Làm lại CẢ hành trình: giữ nhất quán giữa các màn (cùng mẫu cho cùng tình huống, cùng vị trí điều hướng, cùng giọng chữ), giữ đúng thứ tự, số bước, kích thước từng màn.
Định dạng trả lời bắt buộc: dòng đầu "Ý TƯỞNG: <nhãn ngắn ≤8 chữ>", rồi với MỖI màn theo đúng thứ tự: một dòng "MÀN: <key>" và ngay sau đó một khối \`\`\`html … \`\`\`. Không viết gì khác.

Các màn gốc:
${ds}`,
    `Ý của Thanh cho CẢ hành trình: ${y}

Bạn làm phương án số ${k}/${n}. Hướng khám phá riêng: ${HUONG[(k - 1) % HUONG.length]}`,
  ];
}

// Tách nhiều màn từ câu trả lời (cả khi đang stream dở): [{key, html, xong}]
export function tachHanhTrinh(txt) {
  const m = txt.match(/Ý TƯỞNG\s*:\s*(.+)/i);
  const nhan = m ? m[1].trim().replace(/[*`]/g, '').slice(0, 80) : '';
  const man = [];
  const re = /MÀN\s*:?\s*[*`\s]*([\w-]+)[*`]*\s*```html\s*([\s\S]*?)(```|$)/gi;
  let r;
  while ((r = re.exec(txt))) man.push({ key: r[1], html: r[2].trim(), xong: r[3] === '```' });
  return { nhan, man };
}
