// Câu lỗi khi máy chủ / proxy trả mã lỗi mà KHÔNG kèm câu tiếng Việt (#694): nói phải làm gì, không lộ mã HTTP.
// Hàm thuần (node --test: cau-loi-ma.test.ts).

/** 413 ảnh / dữ liệu quá lớn · 429 bấm dồn · 401/403 hết quyền · 404/405/400 bản app cũ · 408/5xx máy chủ bận. */
export function cauLoiMa(ma: number): string {
  if (ma === 413) return "Ảnh hoặc dữ liệu quá lớn — chọn ảnh nhỏ hơn rồi thử lại.";
  if (ma === 429) return "Bấm hơi nhanh — đợi một chút rồi thử lại nhé.";
  if (ma === 401 || ma === 403) return "Phiên đăng nhập đã hết — đăng nhập lại nhé.";
  if (ma === 408 || ma >= 500) return "Máy chủ AiiGrow đang bận — thử lại sau ít phút.";
  if (ma >= 400) return "Chưa làm được việc này — cập nhật app lên bản mới rồi thử lại.";
  return "Chưa làm được — thử lại sau ít phút.";
}

/** Lỗi lấy ảnh (camera / thư viện): giữ câu tiếng Việt app tự ném; lỗi native (tiếng Anh) ⇒ câu cố định. */
export function cauLoiAnh(e: unknown): string {
  const m = e instanceof Error ? e.message : "";
  return m && /[À-ỹđĐ]/.test(m) && !/[A-Za-z]+Exception|Error:/.test(m) ? m : "Chưa lấy được ảnh — kiểm tra quyền Camera / Ảnh trong Cài đặt rồi thử lại.";
}
