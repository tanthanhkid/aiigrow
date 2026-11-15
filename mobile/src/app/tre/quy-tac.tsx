// «Quy tắc nhà mình» bản «Dịu» (con-dt-khac 01 cdt-quy-tac, 15/11 #262–#264): «1 sao = 1 phút chơi · App Tính phút trả bằng sao», «Làm nhiệm vụ
// để có sao · Hết sao: xin Ba Mẹ cho vay», «Theo danh sách Ba Mẹ · Ngoài danh sách: xin Ba Mẹ mở» (chế độ Mở hết ⇒ «Hôm nay Mở hết · app, web
// dùng tự do»), «Sao vay là nợ · Sao nhiệm vụ trả nợ trước». «Con hiểu rồi». Bỏ quỹ 60 / 90 phút, giờ ngủ, giờ học. Công khai (BRD 8.1, FR-06.05).
import { router } from "expo-router";
import { View } from "react-native";
import { kid, type ToiTre } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { useTai } from "@/lib/ui";
import { ChuD, IcO, ManD, NutD, TheD } from "@/lib/ui-diu";
import { ChipBe } from "@/lib/man-con";

export default function QuyTacNha() {
  const toi = useTai(() => kid.goi<ToiTre>("toi").catch(() => null));
  const moHet = toi.d?.cheDo === "mo_het";
  const dong: [Parameters<typeof IcO>[0]["ic"], string, string][] = [
    ["dongho", "1 sao = 1 phút chơi", "App Tính phút trả bằng sao"],
    ["sao", "Làm nhiệm vụ để có sao", "Hết sao: xin Ba Mẹ cho vay"],
    moHet ? ["khien", "Hôm nay Mở hết", "App, web dùng tự do · không trừ sao"] : ["khien", "Theo danh sách Ba Mẹ", "Ngoài danh sách: xin Ba Mẹ mở"],
    ["tin", "Sao vay là nợ", "Sao nhiệm vụ trả nợ trước"],
  ];
  return (
    <ManD lui="/tre/nha" phai={<ChipBe />} day={<NutD chu="Con hiểu rồi" bam={() => router.replace("/tre/nha")} />}>
      <View>
        <ChuD kieu="den" co={26}>Quy tắc</ChuD>
        <ChuD kieu="den" co={26} mau={D.xanhD}>nhà mình</ChuD>
      </View>
      <TheD style={{ gap: 0, paddingVertical: 6 }}>
        {dong.map(([ic, a, b], i) => (
          <View key={a} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: D.vien }}>
            <IcO ic={ic} co={44} />
            <View style={{ flex: 1 }}>
              <ChuD kieu="rat" co={16}>{a}</ChuD>
              <ChuD co={13.5} mau={D.chu2}>{b}</ChuD>
            </View>
          </View>
        ))}
      </TheD>
    </ManD>
  );
}
