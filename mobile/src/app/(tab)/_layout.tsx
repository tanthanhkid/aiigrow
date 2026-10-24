// Thanh điều hướng Ba Mẹ (kit.tab_bm): bốn mục — Trang chủ (bảng điều khiển) · Chờ duyệt · Nhiệm vụ & quà · Gia đình. «Báo cáo» không còn là tab
// (route thường /bao-cao, mở từ Thời gian màn hình); số đỏ ở Chờ duyệt = nhiệm vụ + yêu cầu đang chờ của mọi Con.
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/tabs";
import { bm } from "@/lib/api";
import { F, Icon, LopMen, M, NhanMen, type TenIcon } from "@/lib/ui";
import { BONG, MEN } from "@/lib/clay";
import { useBat } from "@/lib/chuyen-dong";
import Animated from "react-native-reanimated";

const MUC: Record<string, { ic: TenIcon; chu: string }> = {
  "hom-nay": { ic: "nha", chu: "Trang chủ" }, "cho-duyet": { ic: "chuong", chu: "Chờ duyệt" }, "diem-qua": { ic: "sao", chu: "Nhiệm vụ & quà" },
  "cai-dat": { ic: "nguoi", chu: "Gia đình" },
};

function ThanhTab({ state, navigateToTab }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  const [so, setSo] = useState(0);
  const { st: stSo, bat } = useBat();
  const truoc = useRef(0);
  useEffect(() => { if (so > truoc.current) bat(); truoc.current = so; }, [so, bat]);
  useEffect(() => {
    bm.goi<{ nhiemVu: unknown[]; yeuCau: unknown[]; phieu?: unknown[] }>("cho-duyet").then((r) => setSo(r.nhiemVu.length + r.yeuCau.length + (r.phieu?.length ?? 0))).catch(() => {});
  }, [state.index]);       // đổi tab là cập nhật số chờ duyệt
  return (
    <View style={{ backgroundColor: M.nen, paddingHorizontal: 10, paddingTop: 6, paddingBottom: Math.max(ins.bottom - 6, 10) }}>
    {/* phiến đất sét nổi (docs/clay: .tab) — ô đang chọn ấn lõm màu ngọc nhạt */}
    <View style={{ flexDirection: "row", backgroundColor: M.the, borderRadius: 34, padding: 6, boxShadow: BONG.noi }}
      accessibilityRole="tablist">
      <LopMen men={MEN.the} bo={34} />
      {state.routes.map((r, i) => {
        const m = MUC[r.name];
        if (!m) return null;
        const dang = state.index === i;
        return (
          <NhanMen key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: dang }} muc="chip" sang men={dang ? MEN.day : undefined}
            accessibilityLabel={r.name === "cho-duyet" && so ? `${m.chu}, ${so} việc` : m.chu}
            style={[{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 58, minWidth: 0, borderRadius: 26 },
              dang && { backgroundColor: M.chinhSoft, boxShadow: BONG.lom }]}>
            <Icon ten={m.ic} co={24} mau={dang ? M.chinhInk : M.chu3} />
            <Text numberOfLines={1} style={{ fontFamily: F.dam, fontSize: 11.5, color: dang ? M.chinhInk : M.chu3 }}>{m.chu}</Text>
            {r.name === "cho-duyet" && so ? (
              <Animated.View style={[{ position: "absolute", top: 3, left: "56%", backgroundColor: M.huy, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 5,
                alignItems: "center", justifyContent: "center", boxShadow: BONG.do }, stSo]}>
                <Text style={{ fontFamily: F.rat, fontSize: 11, color: "#fff" }}>{so}</Text>
              </Animated.View>
            ) : null}
          </NhanMen>
        );
      })}
    </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(p) => <ThanhTab {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: M.nen } }}>
      <Tabs.Screen name="hom-nay" />
      <Tabs.Screen name="cho-duyet" />
      <Tabs.Screen name="diem-qua" />
      <Tabs.Screen name="cai-dat" />
    </Tabs>
  );
}
