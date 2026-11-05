// bm1-welcome (thiết kế chốt 04/11): ảnh / đoạn intro AiiGrow phủ kín màn, một nút ngọc «Bắt đầu cho con nhà mình» (⇒ Tạo tài khoản Ba Mẹ),
// hai liên kết «Tôi đã có tài khoản» · «Tôi được mời vào nhà» (nhánh người được mời, không tạo Con).
// Bản web: đây cũng là trang chủ aiigrow.aiilab.vn (/ — index.tsx). App gốc chạy trên máy của Con vào /tre qua index.tsx (máy đã ghép).
import { router } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NenChao } from "@/lib/anh-chao";
import { BONG, BO_CLAY, MEN } from "@/lib/clay";
import { F, LopMen, M, NhanMen, useBaoKhiVe, useHoanTac } from "@/lib/ui";

export default function Chao() {
  const { bao, noi } = useHoanTac();
  useBaoKhiVe(bao);                     // «Đã xoá tài khoản…» sau khi xoá ở màn Gia đình
  return (
    <View style={{ flex: 1, backgroundColor: "#f3f3ef", overflow: "hidden" }}>
      <NenChao />
      <SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }} edges={["top", "bottom", "left", "right"]}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 6 }}>
          <NhanMen onPress={() => router.push("/tao-tai-khoan")} accessibilityRole="button" muc="nut" men={MEN.ngoc}
            style={{ minHeight: 58, borderRadius: BO_CLAY.nut, backgroundColor: M.chinh, boxShadow: BONG.ngoc, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
            <LopMen men={MEN.ngoc} bo={BO_CLAY.nut} />
            <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 17, color: "#fff" }}>Bắt đầu cho con nhà mình</Text>
          </NhanMen>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <LkChao chu="Tôi đã có tài khoản" bam={() => router.push("/dang-nhap")} canh="flex-end" />
            <View style={{ width: 20, alignItems: "center" }}><View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#a3a8a5" }} /></View>
            <LkChao chu="Tôi được mời vào nhà" bam={() => router.push("/moi")} canh="flex-start" />
          </View>
          {Platform.OS === "web" ? (
            // trang chủ web: lối sang trang tải bộ cài cho máy của con (thiết kế không vẽ — giữ chữ nhỏ)
            <LkChao chu="Tải AiiGrow cho máy của con" bam={() => globalThis.location?.assign("/tai")} canh="center" />
          ) : null}
          {Platform.OS !== "web" ? (
            // App gốc cũng là app của Con trên điện thoại / máy tính bảng chưa ghép (thiết kế không vẽ — giữ lối vào màn Con, chữ nhỏ)
            <LkChao chu="Đây là máy của con? Mở màn của con" bam={() => router.push("/tre")} canh="center" />
          ) : null}
        </View>
      </SafeAreaView>
      {noi ? <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: 140 }}>{noi}</View> : null}
    </View>
  );
}

const LkChao = ({ chu, bam, canh }: { chu: string; bam: () => void; canh: "flex-end" | "flex-start" | "center" }) => (
  <Pressable onPress={bam} accessibilityRole="link" style={{ flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: canh }}>
    <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 14, color: M.chinhInk, textDecorationLine: "underline" }}>{chu}</Text>
  </Pressable>
);
