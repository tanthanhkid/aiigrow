// «Trang web chưa có trong danh sách» bản «Dịu» (con-dt-chan 01 cdt-chan-web, App & web 15/11 #262 #258): «Trang này chưa
// có trong danh sách. Con xin Ba Mẹ mở nhé!», thẻ «youtube.com · Chưa có trong danh sách», «Xin Ba Mẹ mở YouTube» (1 chạm mở form điền sẵn, 1 chạm gửi) / «Về trang
// chính». Không còn nhánh web cấm cứng (máy chủ bỏ lưới `web_cam`).
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { D } from "@/lib/diu";
import { CamXuc, ChuD, IcO, ManD, NutD, TheD } from "@/lib/ui-diu";

export default function ChanWeb() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const trang = (url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "Trang này";
  const ten = trang.replace(/^www\./, "").split(/[./]/)[0];
  const tenDep = ten ? ten.charAt(0).toUpperCase() + ten.slice(1) : "trang này";
  return (
    <ManD lui="/tre/nha" day={<><NutD chu={`Xin Ba Mẹ mở ${tenDep}`} ic="tin" bam={() => router.replace(`/tre/xin-phep?loai=mo_web&gia=${encodeURIComponent(trang)}&tu=chan-web`)} />
      <NutD chu="Về trang chính" loai="chu" bam={() => router.replace("/tre/nha")} /></>}>
      <CamXuc lv="chi" co={130} tieu="Trang web" phu="Trang này chưa có trong danh sách. Con xin Ba Mẹ mở nhé!" />
      <TheD>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IcO ic="web" co={52} />
          <View style={{ flex: 1, gap: 4 }}>
            <ChuD kieu="den" co={17} dong={1}>{trang}</ChuD>
            <ChuD co={13.5} mau={D.chu2}>Chưa có trong danh sách</ChuD>
          </View>
        </View>
      </TheD>
    </ManD>
  );
}
