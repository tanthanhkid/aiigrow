// Biểu đồ dùng chung — chất «Clay gương» (docs/THIET-KE-CLAY.md): cột / thanh là khối đất sét bo tròn đầy, bóng mềm + lớp men (MEN.cot / MEN.ong),
// đặt trong RÃNH LÕM (M.ranh + BONG.lom); vòng tiến độ là ỐNG đất sét có vệt sáng. Màu chỉ lấy từ token M; chất từ clay.ts.
// Chuyển động «vui» + «ánh men»: cột mọc từ chân bằng lò xo vượt nhẹ (so le 45ms), xong thì một vệt men lướt một lần; thanh ngang dài ra
// rồi vệt men lướt chéo; vòng quét tới giá trị. Reduce Motion ⇒ không mọc / không lướt, chỉ fade (docs/clay/M-anh-men.css cuối khối thông số).
// Một bộ cho mọi chỗ: Báo cáo tuần (cột đôi học / giải trí), Thời gian màn hình (cột chồng theo mục + thanh theo mục), Tien (thanh tiến độ),
// vòng đồng hồ của Con. Chỉ dùng react-native-reanimated + react-native-svg có sẵn.
import React, { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  FadeIn, ReduceMotion, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { BONG, MEN, VET } from "./clay";
import { EASE } from "./chuyen-dong";
import { F, M } from "./mau";

/** Lò xo «mọc»: vượt ~6% rồi về (vui nhưng không lắc lâu). */
const MOC = { stiffness: 230, damping: 15, mass: 1 } as const;
const SO_LE = 45;

// ---------------------------------------------------------------- cột

export type PhanCot = { gia: number; mau: string; /** làm mờ (đang lọc mục khác) */ mo?: boolean };
export type CotNgay = { khoa: string; nhan: string; /** đọc cho trình đọc màn hình */ doc: string; phan: PhanCot[] };

/**
 * Biểu đồ cột clay. `kieu="doi"`: mỗi phần một cột đứng cạnh nhau (Báo cáo: học / giải trí). `kieu="chong"`: các phần chồng thành một cột
 * (Thời gian màn hình: theo mục, phần lớn nhất ở chân). `max` = giá trị ứng với đỉnh rãnh. `chon` + `bam`: chạm một ngày để lọc.
 */
export function CotClay({ ds, max, kieu = "doi", cao = 120, chon = null, bam, tat, nhanDoc }: {
  ds: CotNgay[]; max: number; kieu?: "doi" | "chong"; cao?: number; chon?: number | null; bam?: (i: number) => void;
  /** ngày không bấm được (tương lai) */ tat?: (i: number) => boolean; nhanDoc?: string;
}) {
  const giam = useReducedMotion();
  const dinh = Math.max(1, max);
  return (
    <Animated.View entering={giam ? FadeIn.duration(200).reduceMotion(ReduceMotion.Never) : undefined}
      accessibilityLabel={nhanDoc} style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
      {ds.map((x, i) => {
        const dangChon = chon === i, mo = chon !== null && chon !== undefined && !dangChon;
        const noi = (
          <>
            <View style={[s.ranh, { height: cao }, dangChon && { backgroundColor: M.chinhSoft }]}>
              {kieu === "chong"
                ? <Cot thu={i} cao={Math.min(1, x.phan.reduce((a, p) => a + p.gia, 0) / dinh) * (cao - 8)} phan={x.phan} giam={giam} />
                : x.phan.map((p, k) => <Cot key={k} thu={i} cao={Math.min(1, p.gia / dinh) * (cao - 8)} phan={[p]} giam={giam} />)}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={2}
              style={{ fontFamily: dangChon ? F.rat : F.dam, fontSize: 12, lineHeight: 17, color: dangChon ? M.chu : M.chu3, textAlign: "center", alignSelf: "stretch" }}>
              {x.nhan}
            </Text>
          </>
        );
        const st = { flex: 1, minWidth: 0, alignItems: "center" as const, gap: 6, opacity: mo ? 0.45 : 1 };
        return bam ? (
          <Pressable key={x.khoa} disabled={tat?.(i)} onPress={() => bam(i)} accessibilityRole="button" accessibilityState={{ selected: dangChon }}
            accessibilityLabel={x.doc} hitSlop={{ top: 6, bottom: 6 }} style={st}>{noi}</Pressable>
        ) : <View key={x.khoa} accessible accessibilityLabel={x.doc} style={st}>{noi}</View>;
      })}
    </Animated.View>
  );
}

/** Một cột clay: mọc từ chân (lò xo MOC, so le theo `thu`), xong một vệt men lướt dọc từ chân lên đỉnh. */
function Cot({ thu, cao, phan, giam }: { thu: number; cao: number; phan: PhanCot[]; giam: boolean }) {
  const h = cao <= 0 ? 0 : Math.max(8, cao);
  const p = useSharedValue(giam ? 1 : 0), q = useSharedValue(0);
  useEffect(() => {
    if (giam) { p.set(1); return; }
    p.set(withDelay(thu * SO_LE, withSpring(1, MOC)));
    q.set(withDelay(thu * SO_LE + 380, withTiming(1, { duration: 520, easing: EASE.quet })));
  }, [giam, thu, p, q]);
  const stCot = useAnimatedStyle(() => ({ height: h * Math.max(0, p.value) }));
  const stVet = useAnimatedStyle(() => ({ opacity: q.value > 0 && q.value < 1 ? 1 : 0, transform: [{ translateY: (1 - 2 * q.value) * h }] }));
  const tong = phan.reduce((a, x) => a + x.gia, 0) || 1;
  if (!h) return <View style={{ flex: 1 }} />;
  return (
    <Animated.View style={[{ flex: 1, maxWidth: 30, borderRadius: 999, boxShadow: BONG.cot }, stCot]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: 999, overflow: "hidden", justifyContent: "flex-end" }]}>
        {phan.length === 1 ? <View style={{ flex: 1, backgroundColor: phan[0].mau, opacity: phan[0].mo ? 0.28 : 1 }} />
          : phan.map((x, k) => <View key={k} style={{ height: `${(x.gia / tong) * 100}%`, backgroundColor: x.mau, opacity: x.mo ? 0.28 : 1 }} />)}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundImage: MEN.cot }]} />
        {giam ? null : <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundImage: VET.doc }, stVet]} />}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------- thanh ngang

/** Thanh clay ngang trong rãnh lõm (tiến độ, tỉ lệ theo mục). Dài ra bằng lò xo rồi một vệt men lướt chéo. `ti` 0..1. */
export function ThanhClay({ ti, mau = M.chinh, cao = 14, tre = 0, nhanDoc }: { ti: number; mau?: string; cao?: number; tre?: number; nhanDoc?: string }) {
  const giam = useReducedMotion();
  const t = Math.min(1, Math.max(0, ti || 0));
  const dem = cao >= 12 ? 2 : 1.5;
  const [w, setW] = useState(0);
  const p = useSharedValue(giam ? 1 : 0), q = useSharedValue(0);
  useEffect(() => {
    if (giam) { p.set(1); return; }
    p.set(withDelay(tre, withSpring(1, MOC)));
    q.set(withDelay(tre + 360, withTiming(1, { duration: 420, easing: EASE.quet })));
  }, [giam, tre, p, q]);
  const rong = Math.max(t > 0 ? cao - dem * 2 : 0, (w - dem * 2) * t);
  const stThanh = useAnimatedStyle(() => ({ width: rong * Math.max(0, p.value) }));
  const stVet = useAnimatedStyle(() => ({ opacity: q.value > 0 && q.value < 1 ? 1 : 0, transform: [{ translateX: (2.2 * q.value - 1.1) * Math.max(rong, 1) }, { skewX: "-8deg" }] }));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} accessibilityRole="progressbar" accessibilityLabel={nhanDoc}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(t * 100) }}
      style={{ height: cao, borderRadius: cao / 2, backgroundColor: M.ranh, padding: dem, boxShadow: BONG.lom, justifyContent: "center" }}>
      {w > 0 && rong > 0 ? (
        <Animated.View style={[{ height: "100%", borderRadius: cao / 2, boxShadow: BONG.cot }, stThanh]}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: cao / 2, overflow: "hidden", backgroundColor: mau }]}>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundImage: MEN.ong }]} />
            {giam ? null : <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundImage: VET.toi }, stVet]} />}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- vòng

const ACircle = Animated.createAnimatedComponent(Circle);

/** Vòng tiến độ dạng ống đất sét: rãnh lõm (vòng xám + mép sáng ngoài + bóng trong), ống màu có vệt men chạy dọc, đĩa giữa là khối clay. */
export function VongClay({ ti, co = 200, day, mau = M.chinhSang, children, nhanDoc }: {
  ti: number; co?: number; day?: number; mau?: string; children?: ReactNode; nhanDoc?: string;
}) {
  const giam = useReducedMotion();
  const sw = day ?? Math.max(5, Math.round(co * 0.08));
  const r = co / 2 - sw / 2 - 1, cv = 2 * Math.PI * r, t = Math.min(1, Math.max(0, ti || 0)), c = co / 2;
  const p = useSharedValue(giam ? 1 : 0);
  useEffect(() => { if (!giam) p.set(withTiming(1, { duration: 700, easing: EASE.men })); else p.set(1); }, [giam, p]);
  const ong = useAnimatedProps(() => ({ strokeDashoffset: cv * (1 - t * p.value) }));
  const dia = co - sw * 2 - 4;
  return (
    <View style={{ width: co, height: co, alignItems: "center", justifyContent: "center" }} accessibilityRole="progressbar" accessibilityLabel={nhanDoc}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(t * 100) }}>
      <View style={{ position: "absolute", width: co, height: co, borderRadius: co / 2, boxShadow: co >= 80 ? BONG.nho : undefined }} />
      <Svg width={co} height={co} style={{ position: "absolute" }}>
        {/* rãnh lõm: xám + bóng trong (vòng tối mảnh phía trong) + mép sáng ngoài */}
        <Circle cx={c} cy={c} r={r} stroke={M.ranh} strokeWidth={sw} fill="none" />
        <Circle cx={c} cy={c} r={r - sw * 0.28} stroke="rgba(40,44,42,0.10)" strokeWidth={sw * 0.38} fill="none" />
        <Circle cx={c} cy={c} r={r + sw * 0.42} stroke="rgba(255,255,255,0.95)" strokeWidth={Math.max(1, sw * 0.14)} fill="none" />
        {t > 0 ? (
          <>
            <ACircle cx={c} cy={c} r={r} stroke={mau} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${cv} ${cv}`}
              transform={`rotate(-90 ${c} ${c})`} animatedProps={ong} />
            {/* ống: chân tối phía trong + vệt men trắng phía ngoài, cùng độ dài cung */}
            <ACircle cx={c} cy={c} r={r - sw * 0.3} stroke="rgba(0,0,0,0.16)" strokeWidth={sw * 0.26} fill="none" strokeLinecap="round"
              strokeDasharray={`${cv} ${cv}`} transform={`rotate(-90 ${c} ${c})`} animatedProps={ong} />
            <ACircle cx={c} cy={c} r={r + sw * 0.16} stroke="rgba(255,255,255,0.55)" strokeWidth={sw * 0.22} fill="none" strokeLinecap="round"
              strokeDasharray={`${cv} ${cv}`} transform={`rotate(-90 ${c} ${c})`} animatedProps={ong} />
          </>
        ) : null}
      </Svg>
      {children ? (
        <View style={{ width: dia, height: dia, borderRadius: dia / 2, backgroundColor: M.the, alignItems: "center", justifyContent: "center", boxShadow: BONG.nho, overflow: "hidden" }}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: dia / 2, backgroundImage: MEN.the }]} />
          {children}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- chú giải

/** Chú giải gọn: viên clay màu + nhãn, xuống dòng khi chữ lớn. */
export function ChuGiai({ ds }: { ds: { chu: string; mau: string }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 }}>
      {ds.map((x) => (
        <View key={x.chu} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: x.mau, boxShadow: BONG.cot, backgroundImage: MEN.vien }} />
          <Text style={{ fontFamily: F.dam, fontSize: 13, lineHeight: 19, color: M.chu2 }}>{x.chu}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  ranh: { alignSelf: "stretch", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 3, padding: 4, borderRadius: 999, backgroundColor: M.ranh, boxShadow: BONG.lom },
});
