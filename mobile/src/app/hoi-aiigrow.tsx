// «Hỏi AiiGrow» (thiết kế 14/11 bm-ca-nha/13 them-zxu4yvp3): Grow «Ba Mẹ cần giúp gì ạ?», thẻ lớn «Nhắn tin AiiGrow · Hỏi gì cũng được, có người trả lời»
// (⇒ chat /ho-tro, bm-ca-nha/14), «Ba Mẹ hay hỏi» — mỗi câu mở thẳng màn trả lời: máy chưa bảo vệ ⇒ Máy của con · sao đổi ra phút ⇒ Ví sao của con ·
// mời ông bà ⇒ Mời người nhà · ghép thêm máy ⇒ Máy của con.
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { OIcon } from "@/lib/ui-bm3";
import { Chu, Icon, M, Man, NhanMen, Rob, useTai, type TenIcon } from "@/lib/ui";

export default function HoiAiiGrow() {
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh").catch(() => null));
  const con = g.d?.con[0]?.id;
  const HAY_HOI: { chu: string; ic: TenIcon; toi: string }[] = [
    { chu: "Máy con báo «chưa bảo vệ» thì làm sao?", ic: "khien", toi: "/may" },
    { chu: "Sao đổi ra phút chơi thế nào?", ic: "sao", toi: con ? `/vi/${con}` : "/diem-qua" },
    { chu: "Mời ông bà cùng trông con", ic: "nguoi", toi: "/moi-nguoi-nha" },
    { chu: "Ghép thêm máy cho con", ic: "laptop", toi: "/may" },
  ];
  return (
    <Man lui={{ chu: "Cả nhà" }} tieu="Hỏi AiiGrow">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
        <Rob ten="so-tay" co={140} />
        <View style={[{ flex: 1, padding: 14, borderRadius: 22, borderBottomLeftRadius: 8, backgroundColor: M.the }, KHOI.nho]}>
          <Chu kieu="rat" co={20} style={{ lineHeight: 26 }}>Ba Mẹ cần giúp gì ạ?</Chu>
        </View>
      </View>
      <NhanMen onPress={() => router.push("/ho-tro")} accessibilityRole="button" accessibilityLabel="Nhắn tin AiiGrow" muc="khoi" sang
        style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 28, backgroundColor: "#f7f6f3" }, KHOI.the]}>
        <OIcon ic="tin" co={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={17}>Nhắn tin AiiGrow</Chu>
          <Chu kieu="dam" co={13} mau="#565c59">Hỏi gì cũng được, có người trả lời</Chu>
        </View>
        <Icon ten="phai" mau={M.chinhInk} co={18} />
      </NhanMen>
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ paddingHorizontal: 6, marginTop: 6 }}>Ba Mẹ hay hỏi</Chu>
      {/* thiết kế: một thẻ, các câu cách nhau bằng vạch mảnh */}
      <View style={[{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 28, backgroundColor: "#f7f6f3" }, KHOI.the]}>
        {HAY_HOI.map((x, k) => (
          <Pressable key={x.chu} onPress={() => router.push(x.toi as never)} accessibilityRole="button" accessibilityLabel={x.chu}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, borderTopWidth: k ? 1.5 : 0, borderTopColor: "#ecebe7" }}>
            <OIcon ic={x.ic} />
            <Chu kieu="rat" co={15} style={{ flex: 1 }}>{x.chu}</Chu>
            <Icon ten="phai" mau="#b3b5b1" co={18} />
          </Pressable>
        ))}
      </View>
    </Man>
  );
}
