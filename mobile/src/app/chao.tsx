// bm-chao (biến thể appllama): cửa vào. Một hero (Rob — minh hoạ duy nhất của luồng), Large Title, 3 giá trị với SF Symbols,
// MỘT nút chính; các lối phụ là nút chữ — mỗi ý một nhãn. Đăng nhập / Mã mời mở dạng modal (việc tự đứng, có Huỷ).
// Bản web: đây cũng là trang chủ aiigrow.aiilab.vn (/ — xem index.tsx); link «Tải cho máy của Con» sang trang /tai.
import { router } from "expo-router";
import { Linking, Platform, ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LINK_TAI } from "@/lib/api";
import { useBaoKhiVe, useHoanTac } from "@/lib/ui";
import { C, Ch, NutChinh, NutChu, Sym } from "@/lib/ob";

const GIA_TRI = [
  { ic: "camera.fill", chu: "Con làm việc có ích, nộp ảnh — Ba Mẹ duyệt, điểm vào ví" },
  { ic: "gift.fill", chu: "Điểm đổi phút chơi trò chơi, quà, phiếu quà AiiCafe" },
  { ic: "hand.raised.fill", chu: "Ngoài quy tắc thì Con xin phép, Ba Mẹ duyệt trong vài giây" },
] as const;

export default function Chao() {
  const { bao, noi } = useHoanTac();
  useBaoKhiVe(bao);                     // «Đã xoá tài khoản…» sau khi xoá ở màn Gia đình
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.nen }}>
      <StatusBar style="auto" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: ins.top + 8, paddingBottom: 16, gap: 28 }}>
        <Image source={require("../../assets/linh-vat/rob-goc.webp")} style={{ width: 168, height: 168, alignSelf: "center" }} contentFit="contain"
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <View style={{ gap: 8 }}>
          <Ch k="largeTitle" style={{ textAlign: "center" }}>Con lớn lên bằng yêu thương</Ch>
          <Ch k="body" mau={C.chu2} style={{ textAlign: "center" }}>Và nhận quyền lợi bằng nỗ lực của chính mình.</Ch>
        </View>
        <View style={{ gap: 20 }}>
          {GIA_TRI.map((g) => (
            <View key={g.ic} style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
              <View style={{ width: 32, alignItems: "center" }}><Sym ten={g.ic} co={26} /></View>
              <Ch k="subhead" style={{ flex: 1 }}>{g.chu}</Ch>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", columnGap: 4 }}>
          <NutChu nho chu="Nhập mã mời" bam={() => router.push("/moi")} />
          {Platform.OS !== "web" ? <NutChu nho chu="Đây là máy của Con" bam={() => router.push("/tre")} /> : null}
          <NutChu nho nhan="link" chu="Tải cho máy của Con" bam={moTai} />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: Math.max(ins.bottom, 16), gap: 4 }}>
        <NutChinh chu="Bắt đầu bằng số điện thoại" bam={() => router.push("/dang-ky")} />
        <NutChu chu="Tôi đã có tài khoản" bam={() => router.push("/dang-nhap")} />
      </View>
      {noi ? <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: 140 }}>{noi}</View> : null}
    </View>
  );
}

/** Web: cùng nguồn ⇒ sang /tai trong tab này. Điện thoại: mở trang tải công khai. */
function moTai() {
  if (Platform.OS === "web" && globalThis.location) { globalThis.location.assign("/tai"); return; }
  Linking.openURL(LINK_TAI).catch(() => {});
}
