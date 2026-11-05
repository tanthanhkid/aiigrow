// them-pxgipoxg (Lần đầu) / bm1-may-moi (Ghép thêm máy) «Đã ghép máy của X!» — máy mới được bảo vệ ngay; «Máy chạy sẵn» Mở hết /
// Chỉ app được phép (đổi được tại chỗ — POST con/:id/che-do-chan), 3 ô: phút mỗi ngày · app được phép · giờ đi ngủ (GET con/:id/thiet-lap).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { tomTat } from "@/lib/ghep-may";
import { DauMan, gioGon, LienKet, TieuDe } from "@/lib/lan-dau";
import { BaoLoi, Chu, Icon, Icon3D, LopMen, M, Man, Nut, Rob, The, useLam, useTai } from "@/lib/ui";

export default function DaGhep() {
  const p = useLocalSearchParams<{ con?: string; may?: string; nguon?: string }>();
  const con = String(p.con ?? "");
  const nguon = p.nguon === "them" ? "them" : "lan-dau";
  const { d, setD } = useTai(() => (con ? tomTat(con) : Promise.resolve(null)));
  const [cho, setCho] = useState<string | null>(null);
  const { lam, loi } = useLam();
  const ten = d?.ten ?? "con";
  const doiCheDo = (cheDo: "mo_het" | "chi_app_duoc_phep") => {
    if (!d || d.cheDoChan === cheDo) return;
    setCho(cheDo);
    lam(async () => { await bm.goi(`con/${con}/che-do-chan`, { cheDo }); setD({ ...d, cheDoChan: cheDo }); }).finally(() => setCho(null));
  };
  const xong = () => (nguon === "lan-dau" ? router.replace({ pathname: "/thiet-lap/xong", params: { con } }) : router.replace({ pathname: "/may", params: con ? { con } : {} }));
  const o = (so: string, nhan: string) => (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 22, backgroundColor: "#fff", ...KHOI.the }}>
      <Chu kieu="rat" co={19} so>{so}</Chu><Chu co={12} mau={M.chu3}>{nhan}</Chu>
    </View>
  );
  return (
    <Man dau={<DauMan ve="/" khongLui={nguon === "lan-dau"} />}
      day={<><BaoLoi loi={loi} /><Nut chu="Xong rồi" ic="tick" rong bam={xong} />
        <LienKet chu="+ Ghép thêm máy khác" bam={() => router.push({ pathname: "/may/them", params: con ? { con } : {} })} /></>}>
      <View style={{ borderRadius: 32, backgroundColor: "#dcebe6", paddingTop: 12, paddingBottom: 18, paddingHorizontal: 16, alignItems: "center", ...KHOI.the }}>
        <LopMen men={MEN.vien} bo={32} />
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Rob ten="xong" co={150} />
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center", marginLeft: -20, marginBottom: 70, boxShadow: BONG.ngoc }}>
            <Icon ten="tick" mau="#fff" co={28} />
          </View>
        </View>
        <TieuDe chu={`Đã ghép máy của ${ten}!`} giua co={22} />
        <Chu kieu="rat" co={14} mau={M.chinhInk}>Máy mới đã được bảo vệ</Chu>
      </View>
      <Chu kieu="rat" co={14} mau={M.chu2} style={{ paddingHorizontal: 4 }}>Máy chạy sẵn</Chu>
      <View style={{ flexDirection: "row", gap: 6, padding: 5, borderRadius: 26, backgroundColor: "#ebeae6", boxShadow: BONG.lom }} accessibilityRole="radiogroup">
        {([["mo_het", "Mở hết"], ["chi_app_duoc_phep", "Chỉ app được phép"]] as const).map(([v, t]) => {
          const c = (cho ?? d?.cheDoChan) === v;
          return (
            <Pressable key={v} onPress={() => doiCheDo(v)} accessibilityRole="radio" accessibilityState={{ checked: c }}
              style={{ flex: 1, minHeight: 50, borderRadius: 21, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", ...(c ? { backgroundColor: "#fff", ...KHOI.nho } : {}) }}>
              {v === "chi_app_duoc_phep" ? <Icon3D ten="khoa" co={20} /> : null}
              <Chu kieu="rat" co={14.5} mau={c ? M.chinhInk : M.chu2}>{t}</Chu>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {o(d?.gioChoi.ngayThuong != null ? `${d.gioChoi.ngayThuong} phút` : "—", "mỗi ngày")}
        {o(d?.cheDoChan === "mo_het" ? "Mọi app" : `${d?.soApp ?? 0} app`, "được phép")}
        {o(d ? gioGon(d.ngu.tu) : "—", "máy đi ngủ")}
      </View>
      <The>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon3D ten="gui" co={30} /><Chu kieu="rat" co={14.5} style={{ flex: 1 }}>App mới con tải sẽ xin Ba Mẹ duyệt</Chu>
        </View>
      </The>
    </Man>
  );
}
