// Chuyển động «vui» + «ánh men» (Thanh chốt 24/10 — docs/THIET-KE-CLAY.md §3, thông số lấy từ đầu docs/clay/M-vui.js và M-anh-men.css).
// Chỉ transform + opacity, 150–450ms. Reduce Motion (useReducedMotion) ⇒ bỏ nảy / vệt men / confetti / bay điểm / rung, chỉ còn fade.
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, FadeIn, type SharedValue, FadeInDown, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { VET } from "./clay";

/** Lò xo (M-vui.js): THẢ nảy vượt ~8% · VÀO mượt · BẬT (badge, ví) nảy nhanh. */
export const SP = {
  tha: { stiffness: 420, damping: 14, mass: 1 },
  vao: { stiffness: 260, damping: 17, mass: 1 },
  bat: { stiffness: 500, damping: 16, mass: 1 },
} as const;
/** Đường cong (M-anh-men.css): VAO chuẩn · EP bẹp khi nhấn · QUET vệt men lướt. */
export const EASE = {
  vao: Easing.bezier(0.4, 0, 0.2, 1),
  ep: Easing.bezier(0.3, 0, 0.5, 1),
  quet: Easing.bezier(0.3, 0.6, 0.2, 1),
} as const;

// ---------------------------------------------------------------- nhấn: bẹp-nảy + vệt men lướt chéo

const APressable = Animated.createAnimatedComponent(Pressable);
/** Mức bẹp khi nhấn: nút «thạch bị ép» rõ, chip vừa, khối lớn (thẻ, ô lưới) nhẹ để chữ không nhảy. */
const EP = { nut: [0.95, 0.9], chip: [0.95, 0.92], khoi: [0.985, 0.975] } as const;

export type NhanMenProps = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>; children?: ReactNode; muc?: keyof typeof EP; /** vệt men sáng (khối nền sáng) hay vệt trắng (nút tối) */ sang?: boolean;
  /** lớp men tĩnh (MEN.*) nằm dưới nội dung */ men?: string;
};

/** Lớp men tĩnh dưới nội dung của một khối (đặt làm con ĐẦU TIÊN). `bo` = bo góc của khối; `goc` = bo riêng từng góc (đuôi bong bóng chat). */
export const LopMen = ({ men, bo = 0, goc }: { men?: string; bo?: number; goc?: ViewStyle }) =>
  men ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: bo, backgroundImage: men }, goc]} /> : null;

/** Lớp vệt men lướt chéo của NhanMen — chỉ gắn vào nút từ lần nhấn đầu (màn có ~30 nút ⇒ bớt 2 view + 1 style động mỗi nút lúc mở màn). */
function VetMen({ q, w, sang, bo }: { q: SharedValue<number>; w: SharedValue<number>; sang?: boolean; bo: number }) {
  const vet = useAnimatedStyle(() => ({ opacity: q.value > -1.15 && q.value < 1.15 ? 1 : 0, transform: [{ translateX: q.value * w.value }, { skewX: "-8deg" }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden", borderRadius: bo }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundImage: sang ? VET.sang : VET.toi }, vet]} />
    </View>
  );
}

/** Pressable có phản hồi clay: nhấn xuống bẹp 110ms, thả ra nảy lò xo THẢ, một vệt men lướt chéo 420ms. Thay cho Pressable ở mọi chỗ bấm được. */
export function NhanMen({ style, children, muc = "nut", sang, men, onPressIn, onPressOut, onLayout, disabled, ...p }: NhanMenProps) {
  const bo = (StyleSheet.flatten(style)?.borderRadius as number | undefined) ?? 0;
  const giam = useReducedMotion();
  const sx = useSharedValue(1), sy = useSharedValue(1), q = useSharedValue(-2), w = useSharedValue(0), mo = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ opacity: mo.value, transform: [{ scaleX: sx.value }, { scaleY: sy.value }] }));
  const [coVet, setCoVet] = useState(false);
  const [a, b] = EP[muc];
  const vao = (e: GestureResponderEvent) => {
    if (!giam && !disabled) {
      if (!coVet) setCoVet(true);
      sx.set(withTiming(a, { duration: 110, easing: EASE.ep }));
      sy.set(withTiming(b, { duration: 110, easing: EASE.ep }));
      q.set(withSequence(withTiming(-1.15, { duration: 0 }), withTiming(1.15, { duration: muc === "khoi" ? 450 : 420, easing: EASE.quet })));
    } else if (giam && !disabled) mo.set(withTiming(0.7, { duration: 80 }));   // Reduce Motion: phản hồi nhấn chỉ bằng độ mờ
    onPressIn?.(e);
  };
  const ra = (e: GestureResponderEvent) => {
    if (!giam) { sx.set(withSpring(1, SP.tha)); sy.set(withSpring(1, SP.tha)); } else mo.set(withTiming(1, { duration: 150 }));
    onPressOut?.(e);
  };
  return (
    <APressable {...p} disabled={disabled} onPressIn={vao} onPressOut={ra}
      onLayout={(e: LayoutChangeEvent) => { w.set(e.nativeEvent.layout.width); onLayout?.(e); }} style={[st, style]}>
      <LopMen men={men} bo={bo} />
      {children}
      {coVet ? <VetMen q={q} w={w} sang={sang} bo={bo} /> : null}
    </APressable>
  );
}

// ---------------------------------------------------------------- vào trang: các khối vào lần lượt

/** Hiệu ứng vào của khối thứ `thu` (stagger 55ms, lò xo VÀO từ dưới 26px). Reduce Motion ⇒ chỉ fade 180ms. */
export const vaoLanLuot = (thu: number, giam?: boolean) =>
  giam ? FadeIn.duration(180).reduceMotion(ReduceMotion.Never)
    : FadeInDown.delay(Math.min(thu, 12) * 55).springify().stiffness(SP.vao.stiffness).damping(SP.vao.damping).mass(1);

/** Rung chuông (450ms, xoay quanh đỉnh: 0 → -18 → 14 → -9 → 5 → 0). */
export function useRung() {
  const r = useSharedValue(0);
  const giam = useReducedMotion();
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }], transformOrigin: "50% 8%" }));
  const rung = useCallback(() => {
    if (giam) return;
    const t = { duration: 75, easing: Easing.inOut(Easing.quad) };
    r.set(withSequence(withTiming(-18, t), withTiming(14, t), withTiming(-9, t), withTiming(5, t), withTiming(0, { duration: 150 })));
  }, [giam, r]);
  return { st, rung };
}

/** Gọi `fn` khi `so` TĂNG so với lần trước. `so` = null khi chưa tải; lần tải đầu chỉ ghi mốc (mở app với 3 việc cũ thì không rung / nảy). */
export function useKhiTang(so: number | null, fn: () => void) {
  const truoc = useRef<number | null>(null);
  useEffect(() => { if (so === null) return; if (truoc.current !== null && so > truoc.current) fn(); truoc.current = so; }, [so, fn]);
}

/** Bật (pop) một khối: scale 1 → 1.12 → lò xo BẬT về 1 — ví nhận điểm, huy hiệu số đổi. */
export function useBat() {
  const s = useSharedValue(1);
  const giam = useReducedMotion();
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const bat = useCallback(() => { if (!giam) s.set(withSequence(withTiming(1.12, { duration: 90 }), withSpring(1, SP.bat))); }, [giam, s]);
  return { st, bat };
}
