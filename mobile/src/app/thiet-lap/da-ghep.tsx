// them-pxgipoxg (Lần đầu) / bm1-may-moi (Ghép thêm máy) «Máy X đã ghép!» (thiết kế chốt 14/11): tiêu đề «Ghép máy», dấu tick + Grow,
// «Máy con đã nhận luật» — 3 ô phút mỗi ngày · số app được mở · giờ khoá máy (GET con/:id/thiet-lap), thẻ chế độ «Chặn app & web · App, web mới
// con phải xin Ba Mẹ» (hoặc «Mở hết»). Bỏ công tắc «Máy chạy sẵn» bản 04/11 (thiết kế 14/11 không còn — đổi chế độ ở tab Chặn).
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { tomTat } from "@/lib/ghep-may";
import { DauMan, gioGon, LienKet } from "@/lib/lan-dau";
import { Chu, F, Icon, Icon3D, LopMen, M, Man, Nut, Rob, useTai, type TenIcon } from "@/lib/ui";

export default function DaGhep() {
  const p = useLocalSearchParams<{ con?: string; may?: string; nguon?: string }>();
  const con = String(p.con ?? "");
  const nguon = p.nguon === "them" ? "them" : "lan-dau";
  const { d } = useTai(() => (con ? tomTat(con) : Promise.resolve(null)));
  const ten = d?.ten ?? "con";
  const moHet = d?.cheDoChan === "mo_het";
  const xong = () => (nguon === "lan-dau" ? router.replace({ pathname: "/thiet-lap/xong", params: { con } }) : router.replace({ pathname: "/may", params: con ? { con } : {} }));
  const o = (ic: TenIcon, so: string, nhan: string) => (
    <View style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 22, backgroundColor: "#fff", ...KHOI.the }}>
      <Icon3D ten={ic} co={28} />
      <Chu kieu="rat" co={18} so dong={1}>{so}</Chu><Chu co={12} mau={M.chu3} dong={1}>{nhan}</Chu>
    </View>
  );
  return (
    <Man dau={<DauMan tieu="Ghép máy" ve="/" khongLui={nguon === "lan-dau"} />}
      day={<><Nut chu="Xong rồi" ic="tick" rong bam={xong} />
        <LienKet chu="+ Ghép thêm máy khác" bam={() => router.push({ pathname: "/may/them", params: con ? { con } : {} })} /></>}>
      <View style={{ borderRadius: 32, backgroundColor: "#dcebe6", paddingTop: 12, paddingBottom: 8, alignItems: "center", ...KHOI.the }}>
        <LopMen men={MEN.vien} bo={32} />
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Rob ten="xong" co={150} />
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center", marginLeft: -20, marginBottom: 70, boxShadow: BONG.ngoc }}>
            <Icon ten="tick" mau="#fff" co={28} />
          </View>
        </View>
      </View>
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 25, letterSpacing: -0.4, color: M.chu, textAlign: "center" }}>{`Máy ${ten} đã ghép!`}</Text>
        <Chu kieu="rat" co={14} mau={M.chinhInk}>Máy con đã nhận luật</Chu>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {o("dongho", d?.gioChoi.ngayThuong != null ? `${d.gioChoi.ngayThuong} phút` : "—", "mỗi ngày")}
        {o("game", moHet ? "Mọi app" : `${d?.soApp ?? 0} app`, "được mở")}
        {o("trang_ngu", d ? gioGon(d.ngu.tu) : "—", "khoá máy")}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#eeede9", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}><Icon3D ten="khien" co={28} /></View>
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={15.5}>{moHet ? "Mở hết" : "Chặn app & web"}</Chu>
          <Chu co={13} mau={M.chu3}>{moHet ? "Mọi app, web đều mở · chỉ tính giờ chơi" : "App, web mới con phải xin Ba Mẹ"}</Chu>
        </View>
      </View>
    </Man>
  );
}
