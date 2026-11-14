// Bản web: nạp Inter bằng @font-face (tên họ Inter_400Regular… khớp F ở mau.ts). KHÔNG chờ tải xong: trên Safari/iOS (WebKit)
// useFonts không bao giờ báo xong dù font đã tải ⇒ chờ thì màn trắng; trình duyệt tự đổi sang Inter khi tải xong.
// 06/11 (L16): thêm Nunito cho phía Con bản «Dịu» (phong-diu.ts).
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { PHONG_DIU } from "./phong-diu";

export function useNapPhongChu() {
  useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, ...PHONG_DIU });
}
