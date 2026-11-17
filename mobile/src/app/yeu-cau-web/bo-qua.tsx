// «Đã bỏ qua YouTube» (bàn bm-ung-dung them-hppe9qh6@v11 — luồng #258): Grow, thẻ «Đã báo Bảo Anh trên Laptop · «Ba Mẹ chưa cho lúc này» ·
// 19:41» + «Không ghi gì vào danh sách · Con xin lại được bất cứ lúc nào», «Xong», «Hoàn tác, xem lại lời xin» (POST yeu-cau/:id/hoan-tac — trong 60
// giây; máy chủ chỉ báo Con sau 60 giây nên Hoàn tác kịp thì Con không thấy gì). 60 giây đếm theo ĐỒNG HỒ MÁY từ lúc bấm (lúc mở màn này) — không so
// giờ máy chủ (lệch đồng hồ). Trước 60 giây: «Sẽ báo <con> sau 60 giây»; sau đó: «Đã báo <con> trên <máy>». params: id, ten (mục), con (tên Con), may.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { hoanTacXin } from "@/lib/app-web";
import { KHOI, MEN } from "@/lib/clay";
import { OIcon, veHoac } from "@/lib/ui-bm3";
import { BaoLoi, Chu, gioPhut, M, Man, NhanMen, Nut, Rob, useLam } from "@/lib/ui";

export default function DaBoQua() {
  const p = useLocalSearchParams<{ id: string; ten?: string; con?: string; may?: string }>();
  const [luc] = useState(() => new Date());
  const han = luc.getTime() + 60_000;
  const [conGiay, setConGiay] = useState(60);
  useEffect(() => {
    if (conGiay <= 0) return;
    const t = setTimeout(() => setConGiay(Math.max(0, Math.ceil((han - Date.now()) / 1000))), 1000);
    return () => clearTimeout(t);
  }, [conGiay, han]);
  const { lam, loi, dangChay } = useLam();
  const ve = () => veHoac("/chan");
  const may = p.may?.replace(/ của .*$/, "");
  const hoan = () => lam(async () => {
    await hoanTacXin(p.id);
    router.replace({ pathname: "/yeu-cau-web/[id]", params: { id: p.id } });
  });
  return (
    <Man lui={{ chu: "", bam: ve }}>
      <View style={{ alignItems: "center", paddingTop: 6, gap: 4 }}>
        <Rob ten="cho" co={190} />
        <Chu kieu="rat" co={24} style={{ textAlign: "center", letterSpacing: -0.4 }}>{`Đã bỏ qua ${p.ten ?? "lời xin"}`}</Chu>
      </View>
      <View style={{ marginTop: 10, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 28, backgroundColor: "#f7f6f3", ...KHOI.the }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 8 }}>
          <OIcon ic="gui" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={15}>{conGiay > 0 ? `Sẽ báo ${p.con ?? "con"} sau 60 giây` : `Đã báo ${p.con ?? "con"}${may ? ` trên ${may}` : ""}`}</Chu>
            <Chu kieu="dam" co={12.5} mau={M.chu3}>{conGiay > 0 ? `«Ba Mẹ chưa cho lúc này» · còn ${conGiay} giây để hoàn tác` : `«Ba Mẹ chưa cho lúc này» · ${gioPhut(new Date(han))}`}</Chu>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 8, borderTopWidth: 1.5, borderTopColor: "rgba(0,0,0,0.06)" }}>
          <OIcon ic="tro_lai" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={15}>Không ghi gì vào danh sách</Chu>
            <Chu kieu="dam" co={12.5} mau={M.chu3}>Con xin lại được bất cứ lúc nào</Chu>
          </View>
        </View>
      </View>
      {/* bàn them-hppe9qh6@v11: «Xong» + «Hoàn tác, xem lại lời xin» (viên trắng cao 48, chữ xanh) nằm ngay dưới thẻ, không ghim đáy */}
      <BaoLoi loi={loi} />
      <View style={{ marginTop: 10, gap: 10 }}>
        <Nut chu="Xong" rong bam={ve} />
        {conGiay > 0 ? (
          <NhanMen onPress={hoan} disabled={dangChay} accessibilityRole="button" accessibilityLabel={`Hoàn tác, còn ${conGiay} giây`} accessibilityState={{ busy: dangChay }}
            muc="nut" sang men={MEN.sang} style={{ minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 24, backgroundColor: "#fff", ...KHOI.the }}>
            <Chu kieu="rat" co={15} mau={M.chinhInk} dong={1}>Hoàn tác, xem lại lời xin</Chu>
          </NhanMen>
        ) : null}
      </View>
    </Man>
  );
}
