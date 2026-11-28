// Lời mời vào nhà (L6, thiết kế 05/11): kiểu dữ liệu xem trước lời mời + thẻ lời mời dùng ở /moi và /moi/vao.
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { BONG } from "./clay";
import { INK2 } from "./lan-dau";
import { F, LV, M } from "./ui";

export type XemMoi = { tenGiaDinh: string; nguoiMoi: string | null; quyen?: "ba_me" | "trong_giup"; tenQuyen?: string; tenGoi: string; tenCon?: string[]; het: string };
export type NhaCu = { soBe: number; soMay: number; soNguoiLon: number; laNguoiLonDuyNhat: boolean; laChu: boolean; tenBe: string[]; tenNha: string };
/** «Nhà của bạn đang có 1 bé, 1 máy, 1 người lớn» (#877). */
export const cauNhaCu = (n: Pick<NhaCu, "soBe" | "soMay" | "soNguoiLon">) => `Nhà của bạn đang có ${n.soBe} bé, ${n.soMay} máy, ${n.soNguoiLon} người lớn`;
export const ma0 = (m?: string) => String(m ?? "").replace(/[^A-Za-z0-9_-]/g, "");

/** «Bảo Anh, Bảo Minh» / «Bảo Anh và Bảo Minh». */
export const noiTen = (ds: string[] = [], va = false) => (ds.length < 2 ? ds.join("") : va ? `${ds.slice(0, -1).join(", ")} và ${ds[ds.length - 1]}` : ds.join(", "));

/** «Cùng trông Bảo Anh và Bảo Minh» (≤ 2 bé) / «Cùng trông 4 bé nhà mình» (thiết kế 14/11 them-ux0c23p4, bm1-moi — nhà nhiều con không kể hết tên). */
export const cauTrong = (ds: string[] = [], va = false) => (ds.length > 2 ? `Cùng trông ${ds.length} bé nhà mình` : `Cùng trông ${noiTen(ds, va)}`);

/** Chữ cái đầu của TÊN gọi (từ cuối): «Mẹ Lan» ⇒ L, «Bảo Anh» ⇒ A. */
export const dauTen = (t: string) => (t.trim().split(/\s+/).pop()?.charAt(0) || "?").toUpperCase();
const LOM_NHO = "inset 3px 3px 6px rgba(120,98,70,0.28), inset -3px -3px 6px #FFFBF5";

/** Sân tối của màn «Vào nhà cùng …» (bàn them-ux0c23p4 `.san`): cao 372 bo 36 navy viền vàng mờ, thẻ kem nổi trên cùng (chữ cái người mời + «… mời bạn vào nhà» +
 *  «Cùng trông N bé» + chữ cái các bé), Grow chỉ tay 220 rộng đứng đáy lệch phải 4 %. Ảnh Grow cắt dưới thẻ để chữ không tính là đè lên ảnh. */
export function SanMoi({ ai, dong1, dong2, tre }: { ai: string; dong1: string; dong2: string; tre: string[] }) {
  return (
    <View style={{ height: 372, marginTop: 8, borderRadius: 36, backgroundColor: M.chu, overflow: "hidden", boxShadow: `${BONG.the}, inset 0px 0px 0px 1px rgba(244,199,106,0.35)` }}>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 92, bottom: 0, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" }}>
        <Image cachePolicy="memory-disk" source={LV.chi} style={{ width: 220, height: 220 * 707 / 520, marginBottom: 4, transform: [{ translateX: 0.04 * 220 }] }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      </View>
      <View style={{ position: "absolute", left: 14, right: 14, top: 16, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 24, backgroundColor: M.nen, boxShadow: BONG.nho }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: M.nen, alignItems: "center", justifyContent: "center", boxShadow: LOM_NHO }}>
          <Text style={{ fontFamily: F.rat, fontSize: 19, color: M.chu }}>{dauTen(ai)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 16, lineHeight: 21, color: M.chu }}>{dong1}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.dam, fontSize: 13, color: INK2 }}>{dong2}</Text>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {tre.slice(0, 4).map((t, i) => (
                <View key={t + i} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: M.nen, alignItems: "center", justifyContent: "center", boxShadow: LOM_NHO }}>
                  <Text style={{ fontFamily: F.rat, fontSize: 11.5, color: M.chu }}>{dauTen(t)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
