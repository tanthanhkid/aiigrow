// Bản web: nạp Be Vietnam Pro bằng @font-face (tên họ BeVietnamPro_400Regular… khớp F ở mau.ts). KHÔNG chờ tải xong: trên Safari/iOS (WebKit)
// useFonts không bao giờ báo xong dù font đã tải ⇒ chờ thì màn trắng; trình duyệt tự đổi sang font khi tải xong.
// 17/11 (#363): Be Vietnam Pro thay Inter cho phía Ba Mẹ. Nunito cho phía Con bản «Dịu» (phong-diu.ts) giữ nguyên.
import { useFonts } from "expo-font";
import { PHONG_BM } from "./phong-bm";
import { PHONG_DIU } from "./phong-diu";

export function useNapPhongChu() {
  useFonts({ ...PHONG_BM, ...PHONG_DIU });
}
