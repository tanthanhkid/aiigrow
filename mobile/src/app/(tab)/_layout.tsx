// Thanh điều hướng Ba Mẹ (kit.tab_bm): bốn mục — Trang chủ (bảng điều khiển) · Chờ duyệt · Nhiệm vụ & quà · Gia đình. «Báo cáo» không còn là tab
// (route thường /bao-cao, mở từ Thời gian màn hình); số đỏ ở Chờ duyệt = nhiệm vụ + yêu cầu đang chờ của mọi Con.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated as RNAnimated, Platform, Text, View, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/tabs";
import { bm } from "@/lib/api";
import { F, Icon, LopMen, M, NhanMen, napTruoc, type TenIcon } from "@/lib/ui";
import { KHOA_TAB, napChoDuyet, napDiemQua, napGiaDinh } from "@/lib/tab-ba-me";
import { BONG, MEN } from "@/lib/clay";
import { useBat, useKhiTang } from "@/lib/chuyen-dong";
import Animated, { useReducedMotion } from "react-native-reanimated";

// ---------------------------------------------------------------- chuyển tab: trượt ngang theo hướng tab
// Vị trí mỗi tab theo TÊN (-1 bên trái · 0 đang mở · 1 bên phải), chạy native driver. Không dùng tiến trình có sẵn của bộ điều hướng: nó gắn theo
// khoá route, mà tab mở lần đầu đổi khoá (route giữ chỗ → route thật) ⇒ tiến trình mới đứng sẵn ở 0, màn hiện bụp không trượt.
const VI_TRI: Record<string, RNAnimated.Value> = {};
const viTri = (ten: string) => (VI_TRI[ten] ??= new RNAnimated.Value(ten === "hom-nay" ? 0 : 1));
/** Lò xo chuyển tab (docs/THIET-KE-CLAY.md §3 «vui»: lò xo VÀO, không nảy lố — ζ ≈ 0,93, yên sau ~300ms). Bộ điều hướng chạy cùng lò xo này
 *  cho tiến trình của nó ⇒ màn cũ còn được vẽ tới khi trượt hết. Reduce Motion ⇒ mờ chéo 180ms. */
const LO_XO = { stiffness: 260, damping: 30, mass: 1, restDisplacementThreshold: 0.001, restSpeedThreshold: 0.001 };
const SPEC_TRUOT = { animation: "spring", config: LO_XO } as const;
const SPEC_MO = { animation: "timing", config: { duration: 180 } } as const;

function useChuyenTab(ds: string[], dang: number, giam: boolean) {
  const truoc = useRef<number | null>(null);
  // layout effect: chạy trong cùng lần commit với đổi tab, trước khi vẽ — cùng nhịp với lò xo của bộ điều hướng; lần dựng đầu (mở thẳng một tab,
  // đăng nhập lại) đặt đúng vị trí mọi tab trước khung đầu tiên
  useLayoutEffect(() => {
    const cu = truoc.current;
    truoc.current = dang;
    ds.forEach((ten, i) => {
      const toi = i === dang ? 0 : i > dang ? 1 : -1, v = viTri(ten);
      // chỉ màn cũ và màn mới chạy; tab khác đặt thẳng về đúng phía (lần dựng đầu: mọi tab đặt thẳng)
      if (cu === null || cu === dang || (i !== dang && i !== cu)) { v.setValue(toi); return; }
      const nd = Platform.OS !== "web";   // web không có native driver
      (giam ? RNAnimated.timing(v, { toValue: toi, duration: 180, useNativeDriver: nd }) : RNAnimated.spring(v, { toValue: toi, ...LO_XO, useNativeDriver: nd })).start();
    });
  }, [ds, dang, giam]);
}

const MUC: Record<string, { ic: TenIcon; chu: string }> = {
  "hom-nay": { ic: "nha", chu: "Trang chủ" }, "cho-duyet": { ic: "chuong", chu: "Chờ duyệt" }, "diem-qua": { ic: "sao", chu: "Nhiệm vụ & quà" },
  "cai-dat": { ic: "nguoi", chu: "Gia đình" },
};

function ThanhTab({ state, navigateToTab }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  const [nap, setSo] = useState<number | null>(null);
  const so = nap ?? 0;
  const { st: stSo, bat } = useBat();
  useKhiTang(nap, bat);
  const ten = state.routes.map((r) => r.name).join("|");
  const dsTab = useMemo(() => ten.split("|"), [ten]);
  useChuyenTab(dsTab, state.index, !!useReducedMotion());
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
  const rong = useWindowDimensions().width;
  const giam = useReducedMotion();
  // Nạp trước dữ liệu ba tab còn lại khi Trang chủ đã lên: mở tab lần đầu là có nội dung ngay, trượt vào không chớp khung xương.
  useEffect(() => {
    const t = setTimeout(() => { napTruoc(KHOA_TAB.choDuyet, napChoDuyet); napTruoc(KHOA_TAB.diemQua, napDiemQua); napTruoc(KHOA_TAB.giaDinh, napGiaDinh); }, 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <Tabs tabBar={(p) => <ThanhTab {...p} />} screenOptions={({ route }) => {
      const v = viTri(route.name);
      return {
        headerShown: false, sceneStyle: { backgroundColor: M.nen }, transitionSpec: giam ? SPEC_MO : SPEC_TRUOT,
        sceneStyleInterpolator: () => ({ sceneStyle: giam ? { opacity: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }) }
          : { transform: [{ translateX: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [-rong, 0, rong] }) }] } }),
      };
    }}>
      <Tabs.Screen name="hom-nay" />
      <Tabs.Screen name="cho-duyet" />
      <Tabs.Screen name="diem-qua" />
      <Tabs.Screen name="cai-dat" />
    </Tabs>
  );
}
