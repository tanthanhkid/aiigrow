// Dòng quà có số lượng «Đang có: N» + nút − / ＋ (bàn them-s416tfdj / them-u60j9p7w; #502: dùng chung bước quà Lần đầu và «Thêm quà» Hằng ngày).
// Quà «Ba Mẹ mua» có số lượng; hết (N = 0) thì «Hết» + «Mua thêm» bên Ba Mẹ (bên Con ẩn).
import { Pressable, View } from "react-native";
import { BONG, MEN } from "./clay";
import { Chu, IconNet, LopMen, M } from "./ui";

/** Một dòng quà: tên + dòng phụ + viên «Đang có: N» + nút − / ＋ (＋ vàng kim). `khoa` = quà đã có sẵn (chỉ hiện, không đổi số); `tran` = số tối đa.
 *  `het` ⇒ viên «Hết» thay «Đang có: 0»; `muaThem` ⇒ nút «Mua thêm» (cộng 1 món) khi hết. */
export function DongQua({ i, ten, phu, n, dat, xem, khoa, tran = 9, het, muaThem }: { i: number; ten: string; phu: string; n: number; dat: (n: number) => void; xem?: () => void;
  khoa?: boolean; tran?: number; het?: boolean; muaThem?: () => void }) {
  const nut = (chu: "−" | "＋", bam: () => void, tat: boolean, nhan: string) => (
    <Pressable onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={`${nhan} ${ten}`} hitSlop={4}
      style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: tat ? 0.4 : 1, overflow: "hidden" },
        chu === "＋" ? { backgroundColor: M.diem, boxShadow: BONG.vang } : { backgroundColor: M.the, boxShadow: BONG.nho }]}>
      {chu === "＋" ? <LopMen men={MEN.vang} bo={22} /> : null}
      <IconNet ten={chu === "＋" ? "cong" : "tru"} co={20} mau={M.chinh} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: M.ranh }}>
      <Pressable onPress={xem} disabled={!xem} accessibilityRole={xem ? "button" : undefined} accessibilityLabel={xem ? `Xem chi tiết ${ten}` : undefined} style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Chu kieu="rat" co={15.5} dong={2}>{ten}</Chu>
        <Chu kieu="dam" co={12.5} mau={M.chu2} dong={2}>{phu}</Chu>
        <View style={{ alignSelf: "flex-start", minHeight: 22, paddingHorizontal: 10, borderRadius: 11, justifyContent: "center", backgroundColor: n ? M.chinh : M.xamSoft, boxShadow: n ? undefined : BONG.nho }}>
          <Chu kieu="rat" co={12} mau={n ? M.diem : M.chinh} so>{het && !n ? "Hết" : `Đang có: ${n}`}</Chu>
        </View>
      </Pressable>
      {het && muaThem ? (
        <Pressable onPress={muaThem} accessibilityRole="button" accessibilityLabel={`Mua thêm ${ten}`} hitSlop={4}
          style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: M.diem, boxShadow: BONG.vang, overflow: "hidden" }}>
          <LopMen men={MEN.vang} bo={22} /><Chu kieu="rat" co={14} mau={M.chinh}>Mua thêm</Chu>
        </Pressable>
      ) : <>
        {nut("−", () => dat(n - 1), n <= 0 || (!!khoa && n <= 1), "Bớt 1")}
        {nut("＋", () => dat(n + 1), !!khoa || n >= tran, "Thêm 1")}
      </>}
    </View>
  );
}
