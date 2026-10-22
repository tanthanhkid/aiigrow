// bm-chao: lần đầu mở app — vòng giá trị 3 câu, bắt đầu bằng số điện thoại. (Đăng nhập Apple/Google: chờ khoá OAuth — KE-HOACH 5.)
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Canh, Chu, M, Man, Nut, The, TickDong } from "@/lib/ui";

export default function Chao() {
  return (
    <Man day={
      <>
        <Nut chu="Bắt đầu bằng số điện thoại" ic="dt" rong bam={() => router.push("/dang-ky")} />
        <Pressable onPress={() => router.push("/dang-nhap")} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Chu co={13} mau={M.chu3}>Đã có tài khoản? <Chu kieu="rat" co={13} mau={M.chinhInk}>Đăng nhập</Chu></Chu>
        </Pressable>
        <Pressable onPress={() => router.push("/moi")} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Chu co={13} mau={M.chu3}>Được Ba/Mẹ trong nhà mời? <Chu kieu="rat" co={13} mau={M.chinhInk}>Nhập mã mời</Chu></Chu>
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
