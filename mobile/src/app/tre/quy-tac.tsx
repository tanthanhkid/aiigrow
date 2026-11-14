// «Quy tắc nhà mình» bản «Dịu» (con-dt-khac 01 cdt-quy-tac, PIN 06/11): chip «Bảo Anh ▾»; giờ chơi 60 phút / cuối tuần 90; 10 sao = 10 phút
// (làm nhiệm vụ để có sao); giờ học (chỉ mở app học); giờ ngủ (máy nghỉ); «Chặn app & web · app mới xin Ba Mẹ»; «Vào máy bằng tên + PIN ·
// Giờ chơi tính riêng cho con». «Con hiểu rồi». Công khai — ai cũng thấy giống nhau (BRD 8.1, FR-06.05).
import { router } from "expo-router";
import { View } from "react-native";
import { kid, type NhaTreSao, type QuyTac } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { ChoD, ChuD, IcO, ManD, NutD, TheD } from "@/lib/ui-diu";
import { ChipBe } from "@/lib/man-con";
import { useTaiTre } from "@/lib/ui-tre";

type QuyTacSao = QuyTac & { quyNgayThuong?: number; quyCuoiTuan?: number; phut10Sao?: number };

export default function QuyTacNha() {
  const { d, loi, matMang, tai } = useTaiTre("quy-tac", async () => {
    const [qt, nha] = await Promise.all([kid.goi<QuyTacSao>("quy-tac"), kid.goi<NhaTreSao>("nha").catch(() => null)]);
    return { qt, nha };
  });
  if (!d) return <ManD lui="/tre/nha"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const { qt } = d;
  const hoc = d.nha?.quy?.gioHoc;
  const dong: [Parameters<typeof IcO>[0]["ic"], string, string][] = [
    ["dongho", `Giờ chơi ${qt.quyNgayThuong ?? qt.tranNgay} phút`, `Cuối tuần ${qt.quyCuoiTuan ?? qt.quyNgayThuong ?? qt.tranNgay} phút`],
    ["sao", `10 sao = ${qt.phut10Sao ?? 10} phút`, "Làm nhiệm vụ để có sao"],
    ...(hoc ? [["sach", `Giờ học ${hoc.tu} – ${hoc.den}`, "Chỉ mở app học"] as [Parameters<typeof IcO>[0]["ic"], string, string]] : []),
    ["trang_ngu", `Giờ ngủ ${qt.lich.ngu.tu} – ${qt.lich.ngu.den}`, "Máy nghỉ"],
    ["khien", "Chặn app & web", "App mới xin Ba Mẹ"],
    ["nguoi", "Vào máy bằng tên + PIN", "Giờ chơi tính riêng cho con"],
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
