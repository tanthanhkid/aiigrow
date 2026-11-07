// Bản native: Inter đã NHÚNG sẵn trong app lúc build (plugin expo-font trong app.json) ⇒ không tải gì lúc mở app, vẽ ngay khung đầu.
// Bản web: phong-chu.web.ts nạp @font-face lúc chạy.
// 06/11 (L16): Nunito cho phía Con bản «Dịu» (diu.ts › FD) nạp lúc chạy từ assets/fonts — KHÔNG chờ (chưa xong thì chữ hệ thống).
import { useFonts } from "expo-font";
import { PHONG_DIU } from "./phong-diu";

export function useNapPhongChu() {
  useFonts(PHONG_DIU);
}
