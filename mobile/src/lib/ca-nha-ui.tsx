// Mảnh giao diện dùng chung các bảng «rời đi» của Cả nhà (#325 — bàn them-xnbiksmr «Mời Bà Hoa rời nhà?», them-liz6hzww «Rời khỏi nhà này?»,
// them-4vj35r7c «Xoá tài khoản …?»): một thẻ `.ds`, mỗi dòng ô icon 3D lõm 40 + câu 14.5/700, vạch mảnh giữa các dòng.
import { View } from "react-native";
import { KHOI } from "./clay";
import { OIcon } from "./ui-bm3";
import { Chu, M, type TenIcon } from "./ui";

export function DsBang({ ds }: { ds: { ic: TenIcon; chu: string }[] }) {
  return (
    <View style={[{ paddingVertical: 4, paddingHorizontal: 18, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>
      {ds.map((x, k) => (
        <View key={x.chu} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 8, borderTopWidth: k ? 1.5 : 0, borderTopColor: M.vien }}>
          <OIcon ic={x.ic} co={40} />
          <Chu kieu="dam" co={14.5} mau={M.chu2} style={{ flex: 1 }}>{x.chu}</Chu>
        </View>
      ))}
    </View>
  );
}
