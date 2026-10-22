// Lưu / chia sẻ một tệp chữ (CSV báo cáo tuần — FR-06.02). Web: tải tệp về máy. Điện thoại: bảng Chia sẻ của hệ điều hành (gửi qua
// Zalo, email, lưu vào Tệp…) với nội dung CSV — không cần quyền ghi bộ nhớ.
// saoChep: web ⇒ bộ nhớ tạm (true); máy thật ⇒ bảng Chia sẻ của hệ điều hành (có «Sao chép») — không thêm mô-đun gốc.
import { Platform, Share } from "react-native";

export async function luuTepChu(tenTep: string, noiDung: string, mime = "text/csv;charset=utf-8") {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const url = URL.createObjectURL(new Blob([noiDung], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = tenTep;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  await Share.share({ title: tenTep, message: noiDung });
}

export async function saoChep(chu: string) {
  try {
    if (Platform.OS === "web") { await navigator.clipboard.writeText(chu); return true; }
    await Share.share({ message: chu });
    return false;
  } catch { return false; }
}
