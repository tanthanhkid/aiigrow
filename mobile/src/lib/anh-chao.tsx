// Nền màn Chào (bm1-welcome): ảnh intro AiiGrow phủ kín màn. App gốc chưa có mô-đun phát video (thêm expo-video cần bản dựng mới) ⇒ ảnh tĩnh;
// bản web phát đoạn intro 1 lần (anh-chao.web.tsx). Ảnh + video gốc: tools/brainstorm-ui/web/anh/welcome.
import { Image } from "expo-image";
import { StyleSheet } from "react-native";

export const ANH_CHAO = require("../../assets/chao/welcome-03.webp");

export function NenChao() {
  return <Image source={ANH_CHAO} style={[StyleSheet.absoluteFill, { top: -24 }]} contentFit="cover" accessibilityLabel="AiiGrow · Ươm mầm thói quen số" />;
}
