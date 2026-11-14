// Thanh điều hướng Ba Mẹ (thiết kế chốt 14/11 — N1): năm mục — Hôm nay · Nhiệm vụ · Chặn (icon khiên, bm-ung-dung) · Báo cáo · Cả nhà. «Chờ duyệt» vẫn là route trong nhóm
// tab (/cho-duyet, mở từ Thông báo / Hôm nay) nhưng không có nút trên thanh; số đỏ ở Nhiệm vụ = nhiệm vụ + quà đang chờ, ở Hôm nay = lời xin của mọi Con.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated as RNAnimated, Platform, Text, View, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "expo-router/tabs";
import { bm } from "@/lib/api";
import { F, Icon3D, M, NhanMen, napTruoc, type TenIcon } from "@/lib/ui";
import { KHOA_CA_NHA, napCaNha } from "@/lib/ca-nha";
import { KHOA_NV_TAB, napNvTab } from "@/lib/nv-tab";
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

// Thiết kế chốt 14/11 (mọi màn tab bm-*: .tab): thanh PHẲNG sát đáy cao 84 (6 trên · 24 dưới), nền #f7f6f3, viền trên 1px #e4e3df + bóng mờ lên trên;
// icon 3D 26 (Fluent — nha · sao · khien · lich · nguoi), chưa chọn mờ 50%; chữ 11 đậm #565c59, đang chọn #0a5246 ExtraBold. Bản cũ (phiến clay nổi
// + icon Phosphor + ô chọn lõm) lệch thiết kế rõ nhất trên iOS (Nghi 14/11) ⇒ đổi theo HTML chốt; THIET-KE-CLAY §2 «icon tab Phosphor» bị HTML 14/11 thay.
// Số đỏ chờ duyệt / lời xin giữ như cũ (thiết kế không vẽ, hành vi cũ giữ — KE-HOACH-KHOP-THIET-KE-1411 §0).
const MUC: Record<string, { ic: TenIcon; chu: string }> = {
  "hom-nay": { ic: "nha", chu: "Hôm nay" }, "diem-qua": { ic: "sao", chu: "Nhiệm vụ" }, chan: { ic: "khien", chu: "Chặn" }, "bao-cao": { ic: "lich", chu: "Báo cáo" },     // thiết kế 05/11: Chờ duyệt không còn là tab (route ẩn /cho-duyet)
  "cai-dat": { ic: "nguoi", chu: "Cả nhà" },
};

function ThanhTab({ state, navigateToTab }: BottomTabBarProps) {
  const ins = useSafeAreaInsets();
  const [nap, setSo] = useState<number | null>(null);
  const so = nap ?? 0;
  // lời xin của con (thêm giờ, ngoại lệ, app/web) hiện ở Hôm nay ⇒ số đỏ riêng trên tab Hôm nay (review PR #183)
  const [soXin, setSoXin] = useState(0);
  const { st: stSo, bat } = useBat();
  useKhiTang(nap, bat);
  const ten = state.routes.map((r) => r.name).join("|");
  const dsTab = useMemo(() => ten.split("|"), [ten]);
  useChuyenTab(dsTab, state.index, !!useReducedMotion());
  useEffect(() => {
    bm.goi<{ nhiemVu: unknown[]; yeuCau: unknown[]; phieu?: unknown[] }>("cho-duyet").then((r) => { setSo(r.nhiemVu.length + (r.phieu?.length ?? 0)); setSoXin(r.yeuCau.length); }).catch(() => {});
  }, [state.index]);       // đổi tab là cập nhật số chờ duyệt
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: "#f7f6f3", paddingHorizontal: 4, paddingTop: 6,
      // đáy: thiết kế 24 trên khung có thanh home 34 ⇒ chừa (inset − 10), máy không có thanh home vẫn 10
      paddingBottom: ins.bottom > 0 ? Math.max(ins.bottom - 10, 10) : 10,
      boxShadow: "0px -1px 0px #e4e3df, 0px -12px 18px -12px rgba(28,32,30,0.25)" }}>
      {state.routes.map((r, i) => {
        const m = MUC[r.name];
        if (!m) return null;
        const dang = state.index === i;
        const soDo = r.name === "diem-qua" ? so : r.name === "hom-nay" ? soXin : 0;
        return (
          <NhanMen key={r.key} onPress={() => navigateToTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: dang }} muc="chip"
            accessibilityLabel={r.name === "diem-qua" && so ? `${m.chu}, ${so} việc chờ duyệt` : r.name === "hom-nay" && soXin ? `${m.chu}, ${soXin} lời xin` : m.chu}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 54, minWidth: 0 }}>
            <View style={{ opacity: dang ? 1 : 0.5 }}><Icon3D ten={m.ic} co={26} /></View>
            <Text numberOfLines={1} style={{ fontFamily: dang ? F.den : F.dam7, fontSize: 11, lineHeight: 15, color: dang ? M.chinhInk : "#565c59" }}>{m.chu}</Text>
            {soDo ? (
              <Animated.View style={[{ position: "absolute", top: 0, left: "54%", backgroundColor: M.huy, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
                alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#f7f6f3" }, stSo]}>
                <Text style={{ fontFamily: F.rat, fontSize: 10.5, lineHeight: 13, color: "#fff" }}>{soDo}</Text>
              </Animated.View>
            ) : null}
          </NhanMen>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const rong = useWindowDimensions().width;
  const giam = useReducedMotion();
  // Nạp trước dữ liệu ba tab còn lại khi Trang chủ đã lên: mở tab lần đầu là có nội dung ngay, trượt vào không chớp khung xương.
  useEffect(() => {
    const t = setTimeout(() => { napTruoc(KHOA_NV_TAB, napNvTab); napTruoc(KHOA_CA_NHA, napCaNha); }, 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    // detachInactiveScreens={false}: KHÔNG để react-native-screens tự gỡ / gắn màn tab theo tiến trình của bộ điều hướng. Có chuyển động
    // (transitionSpec) thì «màn tab còn gắn hay không» là phép nội suy trên tiến trình chạy native driver; bản native không đẩy giá trị cuối
    // về prop activityState ⇒ màn tab vừa rời (vd Chờ duyệt) vẫn GẮN, nằm TRÊN Trang chủ (vùng chứa xếp theo thứ tự tab, bỏ qua zIndex):
    // trong suốt vì nội dung đã trượt ra ngoài nhưng nuốt mọi chạm ⇒ Trang chủ «đứng», không bấm / không cuộn được (TestFlight build 10).
    // Tắt tách màn ⇒ mỗi tab là View thường, màn đang mở zIndex 0 trên các màn khác (-1) ⇒ chạm luôn tới màn đang thấy.
    <Tabs detachInactiveScreens={false} tabBar={(p) => <ThanhTab {...p} />} screenOptions={({ route }) => {
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
      <Tabs.Screen name="chan" />
      <Tabs.Screen name="bao-cao" />
      <Tabs.Screen name="cai-dat" />
    </Tabs>
  );
}
