// bm-chao: lần đầu mở app — vòng giá trị 3 câu, bắt đầu bằng số điện thoại. (Đăng nhập Apple/Google: chờ khoá OAuth — KE-HOACH 5.)
// Bản web: đây cũng là trang chủ aiigrow.aiilab.vn (/ — xem index.tsx); link nhỏ «Tải cho máy của Con» sang trang /tai (trang Next, tải hẳn trang).
import { router } from "expo-router";
import { Linking, Platform, Pressable, View } from "react-native";
import { LINK_TAI } from "@/lib/api";
import { Canh, Chu, M, Man, Nut, The, TickDong, useBaoKhiVe, useHoanTac } from "@/lib/ui";

export default function Chao() {
  const { bao, noi } = useHoanTac();
  useBaoKhiVe(bao);                     // «Đã xoá tài khoản…» sau khi xoá ở màn Gia đình
  return (
    <Man noi={noi} day={
      <>
        <Nut chu="Bắt đầu bằng số điện thoại" ic="dt" rong bam={() => router.push("/dang-ky")} />
        <Pressable onPress={() => router.push("/dang-nhap")} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Chu co={13} mau={M.chu3}>Đã có tài khoản? <Chu kieu="rat" co={13} mau={M.chinhInk}>Đăng nhập</Chu></Chu>
        </Pressable>
        <Pressable onPress={() => router.push("/moi")} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Chu co={13} mau={M.chu3}>Được Ba/Mẹ trong nhà mời? <Chu kieu="rat" co={13} mau={M.chinhInk}>Nhập mã mời</Chu></Chu>
        </Pressable>
        <Pressable onPress={moTai} accessibilityRole="link" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Chu kieu="rat" co={13} mau={M.chinhInk}>Tải cho máy của Con →</Chu>
        </Pressable>
      </>
    }>
      <Canh lv="rob-goc" tieu="Con lớn lên bằng yêu thương" loi="Và nhận quyền lợi bằng nỗ lực của chính mình." />
      <The dem>
        <View style={{ gap: 12 }}>
          <TickDong chu="Con làm việc có ích → nộp ảnh → Ba Mẹ duyệt → điểm vào ví" />
          <TickDong chu="Điểm đổi phút chơi trò chơi, quà, phiếu quà AiiCafe" />
          <TickDong chu="Ngoài quy tắc thì Con xin phép, Ba Mẹ duyệt trong vài giây" />
        </View>
      </The>
    </Man>
  );
}

/** Web: cùng nguồn ⇒ sang /tai trong tab này (bản thử/preview vẫn đúng máy chủ). Điện thoại: mở trang tải công khai. */
function moTai() {
  if (Platform.OS === "web" && globalThis.location) { globalThis.location.assign("/tai"); return; }
  Linking.openURL(LINK_TAI).catch(() => {});
}
