// «Trang này chưa mở» bản «Dịu» (con-dt-chan 01 cdt-chan-web, 02 «Trang này luôn bị chặn», BRD 6.4, FR-05.01): «Ba Mẹ chưa cho phép trang này.
// Con xin thử nhé!», thẻ «youtube.com · Cần Ba Mẹ cho phép · Chưa mở», «Xin Ba Mẹ mở YouTube» (1 chạm mở form điền sẵn, 1 chạm gửi) / «Về trang
// chính». `?cam=1` (web người lớn / cờ bạc — máy chủ trả `web_cam`) ⇒ «AiiGrow luôn chặn trang này. Không xin mở được.» + «Thấy lạ? Nhắn Ba Mẹ».
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { D } from "@/lib/diu";
import { CamXuc, ChuD, IcO, ManD, NutD, PillD, TheD } from "@/lib/ui-diu";

export default function ChanWeb() {
  const { url, cam } = useLocalSearchParams<{ url?: string; cam?: string }>();
  const trang = (url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "Trang này";
  const ten = trang.replace(/^www\./, "").split(/[./]/)[0];
  const tenDep = ten ? ten.charAt(0).toUpperCase() + ten.slice(1) : "trang này";
  if (cam) {
    return (
      <ManD lui="/tre/nha" giua day={<><NutD chu="Về trang chính" bam={() => router.replace("/tre/nha")} />
        <NutD chu="Thấy lạ? Nhắn Ba Mẹ" loai="chu" bam={() => router.push("/tre/tin")} /></>}>
        <CamXuc lv="trong-loi" co={140} tieu="Trang này luôn bị chặn" />
        <View style={{ alignSelf: "center" }}><PillD chu="Trang dành cho người lớn" loai="loi" /></View>
        <ChuD kieu="rat" co={15} mau={D.chu2} giua>{"AiiGrow luôn chặn trang này.\nKhông xin mở được."}</ChuD>
      </ManD>
    );
  }
  return (
    <ManD lui="/tre/nha" day={<><NutD chu={`Xin Ba Mẹ mở ${tenDep}`} ic="tin" bam={() => router.replace(`/tre/xin-phep?loai=mo_web&gia=${encodeURIComponent(trang)}&tu=chan-web`)} />
      <NutD chu="Về trang chính" loai="chu" bam={() => router.replace("/tre/nha")} /></>}>
      <CamXuc lv="chi" co={130} tieu="Trang này chưa mở" phu="Ba Mẹ chưa cho phép trang này. Con xin thử nhé!" />
      <TheD>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IcO ic="web" co={52} />
          <View style={{ flex: 1, gap: 4 }}>
            <ChuD kieu="den" co={17} dong={1}>{trang}</ChuD>
            <ChuD co={13.5} mau={D.chu2}>Cần Ba Mẹ cho phép</ChuD>
          </View>
          <PillD chu="Chưa mở" />
        </View>
      </TheD>
    </ManD>
  );
}
