// Thanh điều hướng Ba Mẹ (kit.tab_bm): năm mục cố định; số đỏ ở Chờ duyệt = nhiệm vụ + yêu cầu đang chờ của mọi Con.
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/tabs";
import { bm } from "@/lib/api";
import { F, Icon, M, type TenIcon } from "@/lib/ui";

const MUC: Record<string, { ic: TenIcon; chu: string }> = {
  "hom-nay": { ic: "nha", chu: "Hôm nay" }, "cho-duyet": { ic: "chuong", chu: "Chờ duyệt" }, "diem-qua": { ic: "sao", chu: "Điểm & quà" },
  "bao-cao": { ic: "cot", chu: "Báo cáo" }, "cai-dat": { ic: "banhrang", chu: "Cài đặt" },
};

function ThanhTab({ state, navigateToTab }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  const [so, setSo] = useState(0);
  useEffect(() => {
    bm.goi<{ nhiemVu: unknown[]; yeuCau: unknown[]; phieu?: unknown[] }>("cho-duyet").then((r) => setSo(r.nhiemVu.length + r.yeuCau.length + (r.phieu?.length ?? 0))).catch(() => {});
  }, [state.index]);       // đổi tab là cập nhật số chờ duyệt
  return (
    <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,.97)", borderTopWidth: 1, borderTopColor: M.vien, paddingTop: 8, paddingBottom: Math.max(ins.bottom, 12) }}
      accessibilityRole="tablist">
      {state.routes.map((r, i) => {
        const m = MUC[r.name];
        if (!m) return null;
        const dang = state.index === i;
        return (
          <Pressable key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: dang }}
            accessibilityLabel={r.name === "cho-duyet" && so ? `${m.chu}, ${so} việc` : m.chu}
            style={{ flex: 1, alignItems: "center", gap: 3, minHeight: 48, minWidth: 0 }}>
            <Icon ten={m.ic} co={24} mau={dang ? M.chinhInk : M.chu3} net={dang ? 2.4 : 2} />
            <Text numberOfLines={1} style={{ fontFamily: F.dam, fontSize: 11.5, color: dang ? M.chinhInk : M.chu3 }}>{m.chu}</Text>
            {r.name === "cho-duyet" && so ? (
              <View style={{ position: "absolute", top: -4, left: "56%", backgroundColor: M.huy, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.rat, fontSize: 11, color: "#fff" }}>{so}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(p) => <ThanhTab {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: M.nen } }}>
      <Tabs.Screen name="hom-nay" />
      <Tabs.Screen name="cho-duyet" />
      <Tabs.Screen name="diem-qua" />
      <Tabs.Screen name="bao-cao" />
      <Tabs.Screen name="cai-dat" />
    </Tabs>
  );
}
