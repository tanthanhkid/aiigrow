// «Đã tạo hồ sơ <Con> · bước tiếp» (thiết kế 14/11 bm-ca-nha/03 them-fi17hb99, MỚI): sau «Thêm con» từ Cả nhà — Grow «Chào Khang! Còn 5 bước nữa nhé»,
// avatar con, «Đã tạo hồ sơ <Con>» · «PIN vào máy đã đặt», 5 bước (Một ngày · Quà · Chơi bằng sao · App & web · Ghép máy) mở thẳng màn tương ứng,
// «Bắt đầu: Một ngày của <Con>» · «Để sau» (về Cả nhà). Không lưu tiến độ riêng: Ba Mẹ làm bước nào thì mở màn đó.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet } from "@/lib/api";
import { mauCon, tenGoi } from "@/lib/hang-ngay";
import { OLomIcon } from "@/lib/ui-viec";
import { BONG, KHOI } from "@/lib/clay";
import { ChoTai, Chu, Icon, M, Man, Nut, Rob, useHoanTac, useTai, type TenIcon } from "@/lib/ui";

export default function BuocTiep() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ConChiTiet & { coPin?: boolean }>(`con/${id}`));
  const { noi } = useHoanTac();                      // nhận câu «báo khi quay về» (vd. «Chưa lưu được ảnh, thử lại sau»)
  const [rong, setRong] = useState(358);             // bề ngang khối đầu màn: Grow co lại ở màn hẹp để không đè bong bóng / ảnh chữ con
  if (!d) return <Man><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = tenGoi(d.ten);
  const buoc: [TenIcon, string, string, string][] = [
    ["lich", `Một ngày của ${ten}`, "Học · Vận động · Giúp Ba Mẹ", `/giao-nv?con=${id}`],
    ["qua", `Quà của ${ten}`, "Voucher hoặc Ba Mẹ tự điền", `/vi/qua?con=${id}`],
    // 15/11 (#264): bước «Chơi bằng sao» — màn bm2-gio đã bỏ ⇒ mở Ví sao của con (1 sao = 1 phút, sao khởi đầu đã tặng lúc tạo hồ sơ)
    ["sao", "Chơi bằng sao", "1 sao = 1 phút chơi · sao khởi đầu", `/vi/${id}`],
    ["khien", `App & web cho ${ten}`, "Mở hết hoặc Theo danh sách", `/app-web?con=${id}`],
    ["laptop", `Ghép máy cho ${ten}`, "Máy riêng hoặc máy dùng chung", `/may/them?con=${id}`],
  ];
  return (
    <Man noi={noi} day={<View style={{ gap: 2 }}>
      <Nut chu={`Bắt đầu: Một ngày của ${ten}`} rong bam={() => router.push(buoc[0][3] as never)} />
      <Pressable onPress={() => router.replace("/cai-dat")} accessibilityRole="button" style={{ minHeight: 46, alignItems: "center", justifyContent: "center" }}>
        <Chu kieu="rat" co={15} mau={M.chu2}>Để sau</Chu>
      </Pressable>
    </View>}>
      {/* bàn them-fi17hb99@v8: bong bóng trái (3 dòng) · Grow giữa-phải · ảnh chữ con góc phải — Grow đứng sau mép bong bóng, chữ không đè ảnh */}
      <View style={{ height: 170 }} onLayout={(e) => setRong(e.nativeEvent.layout.width)}>
        <View style={{ position: "absolute", left: 130, bottom: 0 }}><Rob ten="xong" co={Math.max(90, Math.min(150, rong - 130 - 64))} /></View>
        <View style={{ position: "absolute", left: 0, top: 40, maxWidth: 134, paddingVertical: 10, paddingHorizontal: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderBottomRightRadius: 20, borderBottomLeftRadius: 6, backgroundColor: "#fff", ...KHOI.the }}>
          <Chu kieu="rat" co={14} style={{ lineHeight: 19 }}>{`Chào ${ten}! Còn 5 bước nữa nhé`}</Chu>
        </View>
        <View style={{ position: "absolute", right: 0, top: 56, width: 60, height: 60, borderRadius: 30, backgroundColor: mauCon(d.avatar, 0), alignItems: "center", justifyContent: "center",
          boxShadow: BONG.nho }}>
          <Chu kieu="rat" co={26} mau="#fff">{ten.split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "?"}</Chu>
        </View>
      </View>
      <View style={{ alignItems: "center", gap: 2 }}>
        <Chu kieu="rat" co={24} style={{ letterSpacing: -0.4, textAlign: "center" }}>{`Đã tạo hồ sơ ${ten}`}</Chu>
        <Chu kieu="dam" co={14} mau={M.chu2}>{d.coPin ? "PIN vào máy đã đặt" : "Chưa đặt PIN vào máy"}</Chu>
      </View>
      <View style={[{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>
        {buoc.map(([ic, tieu, phu, den], k) => (
          <Pressable key={den} onPress={() => router.push(den as never)} accessibilityRole="button" accessibilityLabel={`Bước ${k + 1}: ${tieu}`}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62, borderTopWidth: k ? 1.5 : 0, borderTopColor: M.vien }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: M.xamSoft, boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}>
              <Chu kieu="rat" co={12.5} mau={M.chu2}>{String(k + 1)}</Chu>
            </View>
            <OLomIcon ic={ic} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={15} dong={1}>{tieu}</Chu>
              <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}>{phu}</Chu>
            </View>
            <Icon ten="phai" co={18} mau={M.chinhInk} />
          </Pressable>
        ))}
      </View>
    </Man>
  );
}
