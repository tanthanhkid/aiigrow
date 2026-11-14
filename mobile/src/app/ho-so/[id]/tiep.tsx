// «Đã tạo hồ sơ <Con> · bước tiếp» (thiết kế 14/11 bm-ca-nha/03 them-fi17hb99, MỚI): sau «Thêm con» từ Cả nhà — Grow «Chào Khang! Còn 5 bước nữa nhé»,
// avatar con, «Đã tạo hồ sơ <Con>» · «PIN vào máy đã đặt», 5 bước (Một ngày · Quà · Giờ chơi & giờ ngủ · App & web · Ghép máy) mở thẳng màn tương ứng,
// «Bắt đầu: Một ngày của <Con>» · «Để sau» (về Cả nhà). Không lưu tiến độ riêng: Ba Mẹ làm bước nào thì mở màn đó.
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet } from "@/lib/api";
import { mauCon } from "@/lib/hang-ngay";
import { OLomIcon } from "@/lib/ui-viec";
import { BONG, KHOI } from "@/lib/clay";
import { Chu, Icon, M, Man, Nut, Rob, useTai, type TenIcon } from "@/lib/ui";

export default function BuocTiep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d } = useTai(() => bm.goi<ConChiTiet & { coPin?: boolean }>(`con/${id}`));
  const ten = d?.ten.trim().split(/\s+/).slice(-2).join(" ") ?? "con";
  const buoc: [TenIcon, string, string, string][] = [
    ["lich", `Một ngày của ${ten}`, "Học · Vận động · Giúp Ba Mẹ", `/giao-nv?con=${id}`],
    ["qua", `Quà của ${ten}`, "Voucher hoặc Ba Mẹ tự điền", `/vi/qua?con=${id}`],
    ["dongho", "Giờ chơi & giờ ngủ", "Ba Mẹ tự chọn", `/gio/${id}`],
    ["khien", `App & web cho ${ten}`, "Mở hết hoặc Chặn app & web", `/app-web?con=${id}`],
    ["laptop", `Ghép máy cho ${ten}`, "Máy riêng hoặc máy dùng chung", `/may/them?con=${id}`],
  ];
  return (
    <Man day={<View style={{ gap: 2 }}>
      <Nut chu={`Bắt đầu: Một ngày của ${ten}`} rong bam={() => router.push(buoc[0][3] as never)} />
      <Pressable onPress={() => router.replace("/cai-dat")} accessibilityRole="button" style={{ minHeight: 46, alignItems: "center", justifyContent: "center" }}>
        <Chu kieu="rat" co={15} mau={M.chu2}>Để sau</Chu>
      </Pressable>
    </View>}>
      <View style={{ height: 170, alignItems: "center", justifyContent: "flex-end" }}>
        <Rob ten="xong" co={150} />
        <View style={{ position: "absolute", left: 0, top: 26, maxWidth: 140, paddingVertical: 10, paddingHorizontal: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderBottomRightRadius: 20, borderBottomLeftRadius: 6, backgroundColor: "#fff", ...KHOI.the }}>
          <Chu kieu="rat" co={14} style={{ lineHeight: 19 }}>{`Chào ${ten}! Còn 5 bước nữa nhé`}</Chu>
        </View>
        <View style={{ position: "absolute", right: 12, top: 52, width: 60, height: 60, borderRadius: 30, backgroundColor: mauCon(d?.avatar, 0), alignItems: "center", justifyContent: "center",
          boxShadow: BONG.nho }}>
          <Chu kieu="rat" co={26} mau="#fff">{ten.split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "?"}</Chu>
        </View>
      </View>
      <View style={{ alignItems: "center", gap: 2 }}>
        <Chu kieu="rat" co={24} style={{ letterSpacing: -0.4, textAlign: "center" }}>{`Đã tạo hồ sơ ${ten}`}</Chu>
        <Chu kieu="dam" co={14} mau={M.chu2}>{d?.coPin === false ? "Chưa đặt PIN vào máy" : "PIN vào máy đã đặt"}</Chu>
      </View>
      <View style={[{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 28, backgroundColor: "#f7f6f3" }, KHOI.the]}>
        {buoc.map(([ic, tieu, phu, den], k) => (
          <Pressable key={den} onPress={() => router.push(den as never)} accessibilityRole="button" accessibilityLabel={`Bước ${k + 1}: ${tieu}`}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62, borderTopWidth: k ? 1.5 : 0, borderTopColor: "#ecebe7" }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#ecebe7", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}>
              <Chu kieu="rat" co={12.5} mau={M.chu2}>{String(k + 1)}</Chu>
            </View>
            <OLomIcon ic={ic} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={15} dong={1}>{tieu}</Chu>
              <Chu kieu="dam" co={12.5} mau="#565c59" dong={1}>{phu}</Chu>
            </View>
            <Icon ten="phai" co={18} mau={M.chinhInk} />
          </Pressable>
        ))}
      </View>
    </Man>
  );
}
