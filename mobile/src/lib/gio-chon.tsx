// Chọn giờ HH:MM bằng nút − / + (bước 15 phút) — màn Giờ ngủ, Giờ học (thiết kế bm-hang-ngay/13, 14: «Máy khoá lúc 21:30»).
// Không dùng bánh xe gốc của hệ điều hành để cùng một giao diện trên iOS / Android / web; giữ ngón để nhảy nhanh không cần.
import { View } from "react-native";
import { KHOI, MEN } from "./clay";
import { Chu, Icon, M, NhanMen } from "./ui";
import { gioGon } from "./hang-ngay";

const phutCua = (g: string) => { const [h, m] = g.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const gioCua = (p: number) => { const x = ((p % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
/** Cộng `buoc` phút, làm tròn về mốc 15 phút gần nhất theo hướng bấm. */
export const congGio = (g: string, buoc: number) => {
  const p = phutCua(g), le = p % 15;
  return gioCua(le ? (buoc > 0 ? p - le + 15 : p - le) : p + buoc);
};

export function ChonGio({ nhan, gia, doi, tat }: { nhan: string; gia: string; doi: (g: string) => void; tat?: boolean }) {
  const nut = (buoc: number) => (
    <NhanMen onPress={() => doi(congGio(gia, buoc))} disabled={tat} accessibilityRole="button" accessibilityLabel={`${nhan}: ${buoc > 0 ? "thêm" : "bớt"} 15 phút`}
      muc="chip" sang men={MEN.sang} style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: M.the, alignItems: "center", justifyContent: "center" }, KHOI.nho]}>
      <Icon ten={buoc > 0 ? "cong" : "tru"} mau={tat ? M.chu3 : M.chu} co={20} />
    </NhanMen>
  );
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 26, backgroundColor: M.the }, KHOI.the]}>
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ flex: 1 }}>{nhan}</Chu>
      {nut(-15)}
      <Chu kieu="rat" co={26} so style={{ minWidth: 76, textAlign: "center" }}>{gioGon(gia)}</Chu>
      {nut(15)}
    </View>
  );
}
