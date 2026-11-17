// «Giờ trên máy bị lệch» bản «Dịu» (con-dt-gio 01 cdt-gio-may, FR-01.05): «Giờ chơi tạm dừng đếm đến khi chỉnh lại», «Máy đang để 15:10 ·
// Sai 4 tiếng 20 phút» / «Giờ đúng 19:30 · Theo máy chủ AiiGrow», hướng dẫn «Cài đặt › Giờ · Bật «Đặt tự động»», «Đã chỉnh xong, thử lại» /
// «Nhờ Ba Mẹ giúp» (gửi yêu cầu kèm số phút lệch). Agent mở `/tre/gio-may?lech=<phút>`.
import { useState } from "react";
import { Linking, Platform, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { kid } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { useLam } from "@/lib/ui";
import { BuocD, CamXuc, ChuD, LoiD, ManD, NutD, PillD, TheD } from "@/lib/ui-diu";
import { gioCua } from "@/lib/ui-tre";

const tieng = (p: number) => (p >= 60 ? `${Math.floor(p / 60)} tiếng${p % 60 ? ` ${p % 60} phút` : ""}` : `${p} phút`);

export default function GioMay() {
  const { lech } = useLocalSearchParams<{ lech?: string }>();
  const lechPhut = Math.round(Number(lech) || 0);
  const phut = Math.abs(lechPhut);
  const [daNhan, setDaNhan] = useState(false);
  const { dangChay, loi, lam } = useLam();
  const may = new Date();
  const dung = new Date(may.getTime() - lechPhut * 60_000);
  const chinh = () => {
    if (Platform.OS === "android") Linking.sendIntent("android.settings.DATE_SETTINGS").catch(() => {});
    else router.replace("/tre/nha");
  };
  const nhan = () => lam(async () => {
    await kid.goi("yeu-cau", { loai: "khac", giaTri: phut ? `Giờ máy lệch ${tieng(phut)} — nhờ Ba Mẹ kiểm tra` : "Giờ máy không đúng — nhờ Ba Mẹ kiểm tra", lyDo: "Giờ máy không đúng" });
    setDaNhan(true);
  });
  return (
    <ManD lui="/tre/nha" day={<><LoiD loi={loi} /><NutD chu="Đã chỉnh xong, thử lại" bam={chinh} />
      {daNhan ? <View style={{ alignSelf: "center" }}><PillD chu="Đã báo Ba Mẹ" loai="xanh" ic="tick" /></View> : <NutD chu="Nhờ Ba Mẹ giúp" loai="chu" bam={nhan} dangChay={dangChay} />}</>}>
      <CamXuc lv="trong-loi" co={120} tieu="Giờ trên máy bị lệch" phu="Giờ chơi tạm dừng đếm đến khi chỉnh lại." />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TheD style={{ flex: 1, alignItems: "center" }}>
          <ChuD kieu="rat" co={13} mau={D.chu2}>Máy đang để</ChuD>
          <ChuD kieu="den" co={28} mau={D.loi} so>{gioCua(may.toISOString())}</ChuD>
          {phut ? <ChuD kieu="rat" co={12.5} mau={D.loi} giua>{`Sai ${tieng(phut)}`}</ChuD> : null}
        </TheD>
        <TheD style={{ flex: 1, alignItems: "center" }}>
          <ChuD kieu="rat" co={13} mau={D.chu2}>Giờ đúng</ChuD>
          <ChuD kieu="den" co={28} mau={D.xanhD} so>{gioCua(dung.toISOString())}</ChuD>
          <ChuD kieu="rat" co={12.5} mau={D.chu2} giua>Theo máy chủ AiiGrow</ChuD>
        </TheD>
      </View>
      <TheD style={{ gap: 12 }}>
        <BuocD n={1} tieu="Cài đặt › Ngày và giờ" />
        <BuocD n={2} tieu="Bật «Đặt tự động»" cuoi />
      </TheD>
      <ChuD co={13} mau={D.chu3} giua>AiiGrow chỉ kiểm đồng hồ, không đọc nội dung của con.</ChuD>
    </ManD>
  );
}
