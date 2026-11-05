// Bản web của nền màn Chào: phát đoạn intro (tắt tiếng, một lần, dừng ở khung cuối), ảnh tĩnh làm poster khi chưa tải / không tự phát được.
// Ảnh + video là con TRỰC TIẾP của khung nền, nội dung màn (nút, liên kết) cũng nằm trong khung ⇒ ảnh là nền của khung chứa chữ (thiết kế
// bm1-welcome đặt nút lên ảnh phủ kín màn), không phải hình nổi đè chữ.
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
// @ts-ignore — react-native-web không kèm kiểu; chỉ dùng hàm tạo thẻ DOM <img> / <video>
import { unstable_createElement } from "react-native-web";

const ANH = require("../../assets/chao/welcome-03.webp");
const VIDEO = require("../../assets/chao/welcome-03-intro.mp4");
const nguon = (x: unknown) => (typeof x === "string" ? x : (x as { uri?: string; default?: string })?.uri ?? (x as { default?: string })?.default ?? "");
const PHU = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } as const;

export function NenChao({ children }: { children?: ReactNode }) {
  return (
    <View style={[StyleSheet.absoluteFill, { top: -24 }]}>
      {unstable_createElement("img", { src: nguon(ANH), alt: "AiiGrow · Ươm mầm thói quen số", style: PHU })}
      {unstable_createElement("video", {
        src: nguon(VIDEO), poster: nguon(ANH), autoPlay: true, muted: true, playsInline: true, preload: "auto",
        style: { ...PHU, pointerEvents: "none" },
      })}
      <View style={[StyleSheet.absoluteFill, { top: 24 }]}>{children}</View>
    </View>
  );
}
