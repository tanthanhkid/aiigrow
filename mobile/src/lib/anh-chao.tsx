// Nền màn Chào (bm1-welcome): ảnh intro AiiGrow phủ kín màn. App gốc chưa có mô-đun phát video (thêm expo-video cần bản dựng mới) ⇒ ảnh tĩnh;
// bản web phát đoạn intro 1 lần (anh-chao.web.tsx). Ảnh + video gốc: tools/brainstorm-ui/web/anh/welcome.
// Nội dung màn (nút, liên kết) là CON của khung nền — ảnh là nền của chính khung chứa chữ (thiết kế đặt nút lên ảnh), không phải hình nổi đè chữ.
import type { ReactNode } from "react";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export const ANH_CHAO = require("../../assets/chao/welcome-03.webp");

export function NenChao({ children }: { children?: ReactNode }) {
  return (
    <View style={[StyleSheet.absoluteFill, { top: -24 }]}>
      <Image source={ANH_CHAO} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="AiiGrow · Ươm mầm thói quen số" />
      <View style={[StyleSheet.absoluteFill, { top: 24 }]}>{children}</View>
    </View>
  );
}
