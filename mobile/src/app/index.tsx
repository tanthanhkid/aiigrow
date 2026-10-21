// M0: màn chào Ba Mẹ tối thiểu (bm-chao) — đủ để kiểm khung chạy. Màn thật theo thiết kế làm ở M2.
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { F, M } from "@/lib/mau";

export default function Chao() {
  return (
    <LinearGradient colors={[M.dauBaMe, M.nen]} locations={[0, 0.4]} style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
      <Image source={require("../../assets/linh-vat/rob-goc.webp")} style={{ width: 220, height: 220 }} contentFit="contain"
        accessibilityLabel="Rob vẫy tay chào" />
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ fontFamily: F.rat, fontSize: 30, color: M.chu, textAlign: "center" }}>AiiGrow</Text>
        <Text style={{ fontFamily: F.thuong, fontSize: 16, color: M.chu2, textAlign: "center" }}>
          Lớn lên bằng yêu thương, nhận bằng nỗ lực
        </Text>
      </View>
    </LinearGradient>
  );
}
