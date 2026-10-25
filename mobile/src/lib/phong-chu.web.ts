// Bản web: nạp Inter bằng @font-face (tên họ Inter_400Regular… khớp F ở mau.ts). KHÔNG chờ tải xong: trên Safari/iOS (WebKit)
// useFonts không bao giờ báo xong dù font đã tải ⇒ chờ thì màn trắng; trình duyệt tự đổi sang Inter khi tải xong.
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";

export function useNapPhongChu() {
  useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
}
