// Khối sóng âm tĩnh (thẻ ghi âm thu nhỏ + thẻ nghe ghi âm, bm-hang-ngay/23, 26) — dùng chung cho nghe-ghi-am (web + native).
import { View } from "react-native";
import { M } from "./ui";

export type NgheGhiAmProps = { mime: string; base64: string; /** dòng trên cùng, vd «Ghi âm Bảo Anh đọc» */ nhan?: string };

/** giây → «4:26» */
export const phutGiay = (g: number) => `${Math.floor(Math.max(0, g) / 60)}:${String(Math.floor(Math.max(0, g) % 60)).padStart(2, "0")}`;

const CAO = [10, 18, 26, 14, 30, 22, 12, 28, 20, 34, 16, 24, 12, 30, 18, 26, 10, 22, 28, 14];
/** `ti` 0–1: phần đã nghe tô đậm. `cot` số cột. */
export function SongAm({ ti = 0, cot = 20, cao = 36, mau = M.chinh }: { ti?: number; cot?: number; cao?: number; mau?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: cao }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: cot }, (_, k) => (
        <View key={k} style={{ flex: 1, height: Math.round((CAO[k % CAO.length] / 34) * cao), borderRadius: 2, backgroundColor: mau, opacity: k / cot < ti ? 1 : 0.45 }} />
      ))}
    </View>
  );
}
