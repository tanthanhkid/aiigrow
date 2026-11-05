// Bản web của nền màn Chào: phát đoạn intro (tắt tiếng, một lần, dừng ở khung cuối), ảnh tĩnh làm poster khi chưa tải / không tự phát được.
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
// @ts-ignore — react-native-web không kèm kiểu; chỉ dùng hàm tạo thẻ DOM <video>
import { unstable_createElement } from "react-native-web";

const ANH = require("../../assets/chao/welcome-03.webp");
const VIDEO = require("../../assets/chao/welcome-03-intro.mp4");
const nguon = (x: unknown) => (typeof x === "string" ? x : (x as { uri?: string; default?: string })?.uri ?? (x as { default?: string })?.default ?? "");

export function NenChao() {
  return (
    <View style={[StyleSheet.absoluteFill, { top: -24 }]} accessibilityLabel="AiiGrow · Ươm mầm thói quen số">
      <Image source={ANH} style={StyleSheet.absoluteFill} contentFit="cover" />
      {unstable_createElement("video", {
        src: nguon(VIDEO), poster: nguon(ANH), autoPlay: true, muted: true, playsInline: true, preload: "auto",
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" },
      })}
    </View>
  );
}
