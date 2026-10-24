// Máy đang mở trang /tai là gì — chọn nút tải chính cho đúng.
export type HeDieuHanh = "windows" | "mac" | "ios" | "android" | "khac";
/** Đoán theo User-Agent + Client Hint `sec-ch-ua-platform` (Chrome/Edge gửi sẵn). iPad bản mới báo «Macintosh» — vẫn rơi vào nhánh Mac, cùng một lời báo. */
export function heDieuHanh(ua: string, nen = ""): HeDieuHanh {
  const p = nen.replace(/"/g, "").toLowerCase();
  if (p === "windows") return "windows";
  if (p === "android" || /android/i.test(ua)) return "android";
  if (/iphone|ipod/i.test(ua) || p === "ios") return "ios";
  if (p === "macos" || /macintosh|mac os x/i.test(ua)) return "mac";
  if (/windows/i.test(ua)) return "windows";
  return "khac";
}
