// Mảnh giao diện dùng chung các bảng «rời đi» của Cả nhà (#325 — bàn them-xnbiksmr «Mời Bà Hoa rời nhà?», them-liz6hzww «Rời khỏi nhà này?»,
// them-4vj35r7c «Xoá tài khoản …?»): một thẻ `.ds`, mỗi dòng ô icon 3D lõm 40 + câu 14.5/700, vạch mảnh giữa các dòng.
import { View } from "react-native";
import { KHOI } from "./clay";
import { OIcon } from "./ui-bm3";
import { IC_QUYEN, MO_TA_QUYEN, TEN_QUYEN, VIEC_QUYEN, type Quyen } from "./ca-nha";
import { Chu, Icon, IconNet, M, NhanMen, type TenIcon } from "./ui";

/** Hai thẻ chọn vai «Như Ba Mẹ» | «Chỉ trông con» (bàn bm2-thanh-vien, them-0uobhmvh): thẻ đang chọn viền vàng + dấu ✓ tròn vàng.
 *  `doi` bỏ trống ⇒ chỉ xem (người xem không đổi được vai). */
export function HaiTheVai({ quyen, doi }: { quyen: Quyen; doi?: (q: Quyen) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }} accessibilityRole="radiogroup">
      {(["ba_me", "trong_giup"] as const).map((q) => {
        const chon = quyen === q;
        return (
          <NhanMen key={q} onPress={doi ? () => doi(q) : undefined} disabled={!doi} accessibilityRole="radio" accessibilityState={{ selected: chon, disabled: !doi }}
            accessibilityLabel={`${TEN_QUYEN[q]}. ${MO_TA_QUYEN[q]}`} muc="khoi" sang
            style={[{ flex: 1, minHeight: 124, padding: 14, borderRadius: 28, backgroundColor: M.the, gap: 4, borderWidth: 2, borderColor: chon ? M.chinh : "transparent" }, KHOI.the]}>
            <OIcon ic={IC_QUYEN[q]} co={40} />
            <Chu kieu="rat" co={16} style={{ marginTop: 10 }}>{TEN_QUYEN[q]}</Chu>
            <Chu kieu="dam" co={13} mau={M.chu2} style={{ lineHeight: 17 }}>{MO_TA_QUYEN[q]}</Chu>
            {chon ? (
              <View style={{ position: "absolute", top: 10, right: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: M.diem, alignItems: "center", justifyContent: "center" }}>
                <Icon ten="tick" mau={M.chu} co={14} />
              </View>
            ) : null}
          </NhanMen>
        );
      })}
    </View>
  );
}

/** Hàng ✓ / ✕ «Xem con chơi · Duyệt việc · Cho vay sao · Đổi luật · Mua quà» theo vai đang chọn. */
export function HangViecVai({ quyen }: { quyen: Quyen }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 6, marginHorizontal: 6 }}>
      {VIEC_QUYEN.map((v) => {
        const duoc = quyen === "ba_me" ? v.baMe : v.trongGiup;
        return (
          <View key={v.chu} style={{ flexDirection: "row", alignItems: "center", gap: 5 }} accessible accessibilityLabel={`${v.chu}: ${duoc ? "được" : "không được"}`}>
            <IconNet ten={duoc ? "tick" : "x"} co={13} mau={duoc ? M.chu : M.chu3} />
            <Chu kieu={duoc ? "rat" : "dam"} co={13} mau={duoc ? M.chu : M.chu3}>{v.chu}</Chu>
          </View>
        );
      })}
    </View>
  );
}

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
