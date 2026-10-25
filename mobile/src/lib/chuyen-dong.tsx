// Chuyển động «vui» + «ánh men» (Thanh chốt 24/10 — docs/THIET-KE-CLAY.md §3, thông số lấy từ đầu docs/clay/M-vui.js và M-anh-men.css).
// Chỉ transform + opacity, 150–450ms. Reduce Motion (useReducedMotion) ⇒ bỏ nảy / vệt men / confetti / bay điểm / rung, chỉ còn fade.
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, FadeIn, type SharedValue, FadeInDown, FadeOut, Keyframe, LinearTransition, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { VET } from "./clay";
import { M, F } from "./mau";

/** Lò xo (M-vui.js): THẢ nảy vượt ~8% · VÀO mượt · BẬT (badge, ví) nảy nhanh. */
export const SP = {
  tha: { stiffness: 420, damping: 14, mass: 1 },
  vao: { stiffness: 260, damping: 17, mass: 1 },
  bat: { stiffness: 500, damping: 16, mass: 1 },
} as const;
/** Đường cong (M-anh-men.css): MEN ease-out men · VAO chuẩn · BAY điểm bay. */
export const EASE = {
  men: Easing.bezier(0.2, 0.7, 0.2, 1),
  vao: Easing.bezier(0.4, 0, 0.2, 1),
  bay: Easing.bezier(0.45, 0, 0.25, 1),
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

/** Khối vào lần lượt (bọc một khối của màn). */
export function Vao({ thu, children, style }: { thu: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const giam = useReducedMotion();
  const vao = useMemo(() => vaoLanLuot(thu, giam), [thu, giam]);
  return <Animated.View entering={vao} style={style}>{children}</Animated.View>;
}

/** Hàng việc rời danh sách: trượt phải 40 + thu nhỏ + mờ (220ms), hàng dưới dồn lên bằng LinearTransition (240ms). */
export const roiDi = (giam?: boolean) => giam ? FadeOut.duration(180).reduceMotion(ReduceMotion.Never)
  : new Keyframe({
    0: { opacity: 1, transform: [{ translateX: 0 }, { scale: 1 }, { rotate: "0deg" }] },
    100: { opacity: 0, transform: [{ translateX: 40 }, { scale: 0.9 }, { rotate: "2deg" }], easing: Easing.in(Easing.cubic) },
  }).duration(220);
export const donLen = LinearTransition.duration(240).easing(Easing.bezier(0.2, 0.8, 0.2, 1));
/** Hàng việc quay lại (Hoàn tác): bật vào từ 0.85. */
export const quayLai = (giam?: boolean) => giam ? FadeIn.duration(180).reduceMotion(ReduceMotion.Never)
  : new Keyframe({ 0: { opacity: 0, transform: [{ scale: 0.85 }] }, 60: { opacity: 1, transform: [{ scale: 1.04 }] }, 100: { opacity: 1, transform: [{ scale: 1 }] } }).duration(360);

/** Ổ khoá đóng sập (M-vui.js KHOÁ MÁY): nhấc -9 phóng 1.3 → đập xuống 0.85/1.1 → 1.08/0.94 → 1, 380ms. */
export const khoaSap = (giam?: boolean) => giam ? FadeIn.duration(180).reduceMotion(ReduceMotion.Never)
  : new Keyframe({
    0: { opacity: 0, transform: [{ translateY: -9 }, { scaleX: 1.3 }, { scaleY: 1.3 }] },
    40: { opacity: 1, transform: [{ translateY: -9 }, { scaleX: 1.3 }, { scaleY: 1.3 }] },
    55: { opacity: 1, transform: [{ translateY: 2 }, { scaleX: 1.1 }, { scaleY: 0.85 }], easing: Easing.in(Easing.quad) },
    78: { opacity: 1, transform: [{ translateY: 0 }, { scaleX: 0.94 }, { scaleY: 1.08 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }] },
  }).duration(380);

/** Thẻ giật xuống 3px lúc ổ khoá đập (t≈200ms) rồi nảy về. */
export function useGiat() {
  const y = useSharedValue(0);
  const giam = useReducedMotion();
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const giat = useCallback(() => { if (!giam) y.set(withDelay(200, withSequence(withTiming(3, { duration: 70 }), withSpring(0, SP.tha)))); }, [giam, y]);
  return { st, giat };
}

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

// ---------------------------------------------------------------- ăn mừng: confetti ngọc/vàng + «+N» bay vào ví

type Diem = { x: number; y: number };
type Phat = { id: number; tu: Diem; den: Diem | null; n: number };
export type AnMungRef = { ban: (tu: Diem, n: number) => void };
const MAU_HAT = [M.chinh, M.chinhSang, M.diem, "#ffd75e", M.chinhDam, "#f5b70a"];

/** Lớp ăn mừng phủ cả màn (pointerEvents none). `dich()` trả toạ độ (trong cửa sổ) của ví/hộp quà để «+N» bay vào; `toi()` khi tới nơi. */
export const LopAnMung = forwardRef<AnMungRef, { dich?: () => Promise<Diem | null>; toi?: () => void }>(function LopAnMung({ dich, toi }, ref) {
  const giam = useReducedMotion();
  const goc = useRef<React.ComponentRef<typeof View>>(null);
  const [ds, setDs] = useState<Phat[]>([]);
  const so = useRef(0);
  const hen = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => { const h = hen.current; return () => h.forEach(clearTimeout); }, []);
  useImperativeHandle(ref, () => ({
    ban: async (tu, n) => {
      if (giam) return;
      const lech = await new Promise<Diem>((ok) => goc.current ? goc.current.measureInWindow((x, y) => ok({ x, y })) : ok({ x: 0, y: 0 }));
      const d = dich ? await dich() : null;
      const id = ++so.current;
      setDs((a) => [...a, { id, n, tu: { x: tu.x - lech.x, y: tu.y - lech.y }, den: d ? { x: d.x - lech.x, y: d.y - lech.y } : null }]);
      const t = setTimeout(() => { hen.current.delete(t); setDs((a) => a.filter((p) => p.id !== id)); }, 1100);
      hen.current.add(t);
    },
  }), [giam, dich]);
  return (
    <View ref={goc} pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      {ds.map((p) => <Phao key={p.id} p={p} toi={toi} />)}
    </View>
  );
});

function Phao({ p, toi }: { p: Phat; toi?: () => void }) {
  const t = useSharedValue(0);       // MỘT tiến trình cho cả 20 hạt (mỗi hạt tự giãn thời gian theo hệ số riêng)
  useEffect(() => { t.set(withTiming(1, { duration: 455, easing: Easing.linear })); }, [t]);
  return (
    <>
      {Array.from({ length: 20 }, (_, i) => <Hat key={i} i={i} tu={p.tu} t={t} />)}
      <BayDiem tu={p.tu} den={p.den} n={p.n} toi={toi} />
    </>
  );
}

function Hat({ i, tu, t }: { i: number; tu: Diem; t: SharedValue<number> }) {
  const goc = (i / 20) * Math.PI * 2 + (i % 3) * 0.3, xa = 34 + ((i * 37) % 30), co = 5 + (i % 3) * 2, k = 455 / (380 + (i % 4) * 25);
  const st = useAnimatedStyle(() => {
    const x = Math.min(1, t.value * k), p = 1 - (1 - x) * (1 - x);       // Easing.out(quad), 380–455ms theo hạt
    return {
      opacity: 1 - p * p,
      transform: [{ translateX: Math.cos(goc) * xa * p }, { translateY: Math.sin(goc) * xa * p + 30 * p * p }, { rotate: `${p * 220 * (i % 2 ? 1 : -1)}deg` }],
    };
  });
  return <Animated.View style={[{ position: "absolute", left: tu.x - co / 2, top: tu.y - co / 2, width: co, height: i % 2 ? co : co * 1.6, borderRadius: i % 3 ? co : 1.5, backgroundColor: MAU_HAT[i % MAU_HAT.length] }, st]} />;
}

function BayDiem({ tu, den, n, toi }: { tu: Diem; den: Diem | null; n: number; toi?: () => void }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: den ? 450 : 600, easing: den ? EASE.bay : EASE.men }));
    if (den && toi) { const h = setTimeout(toi, 450); return () => clearTimeout(h); }
  }, [den, toi, t]);
  const d = den ?? { x: tu.x, y: tu.y - 60 };
  // Bézier bậc 2: điểm điều khiển nhô lên trên đường nối
  const c = { x: (tu.x + d.x) / 2 + (den ? 40 : 0), y: Math.min(tu.y, d.y) - 70 };
  const st = useAnimatedStyle(() => {
    const k = t.value, u = 1 - k;
    const x = u * u * tu.x + 2 * u * k * c.x + k * k * d.x, y = u * u * tu.y + 2 * u * k * c.y + k * k * d.y;
    return { opacity: k < 0.85 ? 1 : (1 - k) / 0.15, transform: [{ translateX: x - 34 }, { translateY: y - 16 }, { scale: 0.8 + 0.4 * Math.sin(Math.PI * Math.min(1, k * 1.4)) }] };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: 68, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: M.diem,
      boxShadow: "0px 6px 10px -4px rgba(150,100,0,0.55), inset 0px 1px 0px rgba(255,255,255,0.7)" }, st]}>
      <Animated.Text style={{ fontFamily: F.rat, fontSize: 15, color: "#3d2600" }}>{`+${n}`}</Animated.Text>
    </Animated.View>
  );
}
