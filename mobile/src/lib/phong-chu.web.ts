// Bản web: nạp Be Vietnam Pro + Fraunces bằng @font-face (tên họ BeVietnamPro_400Regular… khớp F ở mau.ts và FD ở diu.ts). KHÔNG chờ tải xong: trên Safari/iOS
// (WebKit) useFonts không bao giờ báo xong dù font đã tải ⇒ chờ thì màn trắng; trình duyệt tự đổi sang font khi tải xong.
// 17/11 (#363): Be Vietnam Pro thay Inter cho phía Ba Mẹ. 18/11 (#396 #397): phía Con cũng sang Be Vietnam Pro + Fraunces (phong cách E), bỏ Nunito.
import { useFonts } from "expo-font";
import { PHONG_BM } from "./phong-bm";

export function useNapPhongChu() {
  useFonts(PHONG_BM);
}
