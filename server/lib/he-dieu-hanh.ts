// Máy đang mở trang /tai là gì — chọn nút tải chính cho đúng.
export type HeDieuHanh = "windows" | "mac" | "ios" | "android" | "khac";
/** Đoán theo User-Agent + Client Hint `sec-ch-ua-platform` (Chrome/Edge gửi sẵn). iPad cũ báo «iPad» ⇒ ios; iPad bản mới báo «Macintosh» — vẫn rơi vào nhánh Mac, cùng một lời báo. */
export function heDieuHanh(ua: string, nen = ""): HeDieuHanh {
  const p = nen.replace(/"/g, "").toLowerCase();
  if (p === "windows") return "windows";
  if (p === "android" || /android/i.test(ua)) return "android";
  if (/iphone|ipod|ipad/i.test(ua) || p === "ios") return "ios";
  if (p === "macos" || /macintosh|mac os x/i.test(ua)) return "mac";
  if (/windows/i.test(ua)) return "windows";
  return "khac";
}

/** Máy quá cũ để chạy AiiGrow (màn «Máy quá cũ»): Windows trước 10 (NT 6.x trở xuống) hoặc Mac báo rõ macOS ≤ 10.14.
 *  Chrome/Edge mới đóng băng UA ở «Windows NT 10.0» và «Mac OS X 10_15_7» nên chỉ bắt được máy cũ khai thật phiên bản; máy lạ ⇒ false (không chặn oan). */
export function mayQuaCu(ua: string): boolean {
  const w = /Windows NT (\d+)\.(\d+)/i.exec(ua);
  if (w) return Number(w[1]) < 10;
  if (/Windows (98|XP|Vista|ME|CE)/i.test(ua)) return true;
  const m = /Mac OS X 10[_.](\d+)/i.exec(ua);
  if (m && !/iphone|ipad|ipod/i.test(ua)) return Number(m[1]) <= 14;
  return false;
}

/** Tên hệ điều hành cũ để nói trên màn «Máy này: Windows 8.1»; không rõ ⇒ tên chung. */
export function tenMayCu(ua: string): string {
  const w = /Windows NT (\d+)\.(\d+)/i.exec(ua);
  if (w) {
    const t: Record<string, string> = { "6.3": "Windows 8.1", "6.2": "Windows 8", "6.1": "Windows 7", "6.0": "Windows Vista", "5.1": "Windows XP", "5.2": "Windows XP" };
    return t[`${w[1]}.${w[2]}`] ?? "Windows";
  }
  const m = /Mac OS X 10[_.](\d+)/i.exec(ua);
  return m ? `macOS 10.${m[1]}` : "máy này";
}
