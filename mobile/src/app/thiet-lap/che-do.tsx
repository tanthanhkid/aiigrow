// them-35vyl4cx «X dùng được gì?» (MỚI 14/11, giữa Giờ chơi và Chọn app): 2 chế độ áp cho cả app và web trên máy con.
//  · «Chặn app & web» (chi_app_duoc_phep — thiết kế ghi «Chỉ những gì Ba Mẹ chọn»; N2 đổi tên hiển thị) ⇒ Tiếp: App ⇒ Web ⇒ Ghép máy.
//  · «Mở hết» (mo_het — thiết kế «Dùng tất cả») ⇒ không cần chọn app/web: lưu một lần (POST thiet-lap) rồi sang Ghép máy.
// Đã chọn: tiêu đề theo tên chế độ N2 (luật «ở MỌI chỗ hiển thị»), câu giải thích lấy nguyên văn thiết kế 34.
import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { luuThietLap, napCaiDatCon } from "@/lib/ghep-may";
import { DauMan } from "@/lib/lan-dau";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BaoLoi, Chu, F, M, Man, Nut, useLam } from "@/lib/ui";

type CheDo = "chi_app_duoc_phep" | "mo_het";
const O: { v: CheDo; tieu: string; phu: string; loi: string; app: [string, boolean][] }[] = [
  { v: "chi_app_duoc_phep", tieu: "Chặn app & web", phu: "Chỉ những gì Ba Mẹ chọn", loi: "Cái khác khoá. Con muốn dùng thì bấm xin, Ba Mẹ duyệt.",
    app: [["📚", true], ["🦜", true], ["🧮", true], ["🎮", false], ["▶️", false]] },
  { v: "mo_het", tieu: "Mở hết", phu: "Dùng tất cả", loi: "Không khoá app, web nào. Chỉ tính vào giờ chơi.",
    app: [["📚", true], ["🦜", true], ["🧮", true], ["🎮", true], ["▶️", true]] },
];

export default function ObCheDo() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [cheDo, setCheDo] = useState<CheDo>(tl.cheDoChan ?? "chi_app_duoc_phep");
  const daBam = useRef(!!tl.cheDoChan);        // Ba Mẹ đã chọn (lần này hoặc trước) ⇒ chế độ nạp từ máy chủ không được đè
  const { lam, loi, dangChay } = useLam();
  // đi lại Lần đầu cho Con đã có chế độ ⇒ hiện đúng chế độ đang có — chỉ khi Ba Mẹ chưa bấm chọn
  useFocusEffect(useCallback(() => { napCaiDatCon().then(() => { const n = layTl().cheDoChan; if (n && !daBam.current) setCheDo(n); }).catch(() => {}); }, [setCheDo]));
  const chon = (v: CheDo) => { daBam.current = true; setCheDo(v); };
  const tiep = () => {
    datTl({ cheDoChan: cheDo });
    if (cheDo === "chi_app_duoc_phep") { router.push("/thiet-lap/app"); return; }
    lam(async () => {
      const con = await luuThietLap();
      router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } });
    }, { hangDoi: true });
  };
  return (
    <Man dau={<DauMan ve="/thiet-lap/gio" phai={<ThanhBuoc5 dang={4} ic="khien" />} />}
      day={<><BaoLoi loi={loi} /><Nut chu={cheDo === "mo_het" ? "Tiếp: ghép máy của con" : "Tiếp"} rong dangChay={dangChay} bam={tiep} /></>}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: "#dcebe6", alignItems: "center", justifyContent: "center", ...KHOI.the }}>
          <Text style={{ fontSize: 42, lineHeight: 52 }}>🛡️</Text>
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 26, letterSpacing: -0.5, color: M.chu, textAlign: "center" }}>{`${ten} dùng được gì?`}</Text>
        <Chu co={14} mau={M.chu2} style={{ textAlign: "center" }}>Áp dụng cho cả app và web trên máy con.</Chu>
      </View>
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {O.map((o) => {
          const on = cheDo === o.v;
          return (
            <Pressable key={o.v} onPress={() => chon(o.v)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${o.tieu}: ${o.phu}. ${o.loi}`}
              style={{ borderRadius: 26, padding: 16, gap: 10, backgroundColor: on ? "#f3faf7" : "#f7f6f3", ...KHOI.the, ...(on ? { boxShadow: `0px 0px 0px 2.5px ${M.chinh}, ${BONG.the}` } : {}) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", ...(on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: "#e6e5e1", boxShadow: BONG.lom }) }}>
                  {on ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "#fff" }} /> : null}
                </View>
                <View style={{ flex: 1 }}><Chu kieu="rat" co={16.5}>{o.tieu}</Chu><Chu kieu="dam" co={12.5} mau={M.chu3}>{o.phu}</Chu></View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, paddingLeft: 34 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {o.app.map(([e, ok], i) => (
                  <View key={i} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: ok ? "#fff" : "#e9e8e4", alignItems: "center", justifyContent: "center", boxShadow: ok ? BONG.nho : BONG.lom }}>
                    <Text style={{ fontSize: 20, lineHeight: 26, opacity: ok ? 1 : 0.45 }}>{e}</Text>
                    <View style={{ position: "absolute", right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: ok ? M.chinh : "#5b605d" }}>
                      <Text style={{ fontSize: 9, lineHeight: 12, color: "#fff" }}>{ok ? "✓" : "🔒"}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Chu co={13.5} mau={M.chu2} style={{ paddingLeft: 34 }}>{o.loi}</Chu>
            </Pressable>
          );
        })}
      </View>
    </Man>
  );
}
