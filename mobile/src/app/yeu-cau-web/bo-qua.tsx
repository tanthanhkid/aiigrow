// «Đã bỏ qua YouTube» (thiết kế chốt 15/11 bm-ung-dung/12 them-hppe9qh6 — luồng #258): Grow, thẻ «Đã báo Bảo Anh trên Laptop · «Ba Mẹ chưa cho lúc này» ·
// 19:41» + «Không ghi gì vào danh sách · Con xin lại được bất cứ lúc nào», «Xong», «Hoàn tác, xem lại lời xin» (POST yeu-cau/:id/hoan-tac — trong 60
// giây; máy chủ chỉ báo Con sau 60 giây nên Hoàn tác kịp thì Con không thấy gì). params: id, ten (mục), con (tên Con), may, den (hạn hoàn tác ISO).
import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { hoanTacXin } from "@/lib/app-web";
import { KHOI } from "@/lib/clay";
import { OIcon, veHoac } from "@/lib/ui-bm3";
import { BaoLoi, Chu, gioPhut, M, Man, Nut, Rob, useLam } from "@/lib/ui";

export default function DaBoQua() {
  const p = useLocalSearchParams<{ id: string; ten?: string; con?: string; may?: string; den?: string }>();
  const [luc] = useState(() => new Date());
  const han = p.den ? new Date(p.den).getTime() : luc.getTime() + 60_000;
  const [con, setCon] = useState(() => Math.max(0, Math.ceil((han - Date.now()) / 1000)));
  useEffect(() => {
    if (con <= 0) return;
    const t = setTimeout(() => setCon(Math.max(0, Math.ceil((han - Date.now()) / 1000))), 1000);
    return () => clearTimeout(t);
  }, [con, han]);
  const { lam, loi, dangChay } = useLam();
  const ve = () => veHoac("/chan");
  const may = p.may?.replace(/ của .*$/, "");
  const hoan = () => lam(async () => {
    await hoanTacXin(p.id);
    router.replace({ pathname: "/yeu-cau-web/[id]", params: { id: p.id } });
  });
  return (
    <Man lui={{ chu: "", bam: ve }} day={<>
      <BaoLoi loi={loi} />
      <Nut chu="Xong" rong bam={ve} />
      {con > 0 ? <Nut chu="Hoàn tác, xem lại lời xin" loai="vien" rong dangChay={dangChay} bam={hoan} nhanDoc={`Hoàn tác, còn ${con} giây`} /> : null}
    </>}>
      <View style={{ alignItems: "center", paddingTop: 24, gap: 6 }}>
        <Rob ten="xong" co={200} />
        <Chu kieu="rat" co={24} style={{ textAlign: "center", letterSpacing: -0.4 }}>{`Đã bỏ qua ${p.ten ?? "lời xin"}`}</Chu>
      </View>
      <View style={{ marginTop: 12, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 8 }}>
          <OIcon ic="gui" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={15}>{`Đã báo ${p.con ?? "con"}${may ? ` trên ${may}` : ""}`}</Chu>
            <Chu kieu="dam" co={12.5} mau={M.chu3}>{`«Ba Mẹ chưa cho lúc này» · ${gioPhut(luc)}`}</Chu>
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
    </Man>
  );
}
