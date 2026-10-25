// Biểu đồ dùng chung — chất «Clay gương» (docs/THIET-KE-CLAY.md): cột / thanh là khối đất sét bo tròn đầy, bóng mềm + lớp men (MEN.cot / MEN.ong),
// đặt trong RÃNH LÕM (M.ranh + BONG.lom); vòng tiến độ là ỐNG đất sét có vệt sáng. Màu chỉ lấy từ token M; chất từ clay.ts.
// Chuyển động «vui» + «ánh men»: cột mọc từ chân bằng lò xo vượt nhẹ (so le 45ms), xong thì một vệt men lướt một lần; thanh ngang dài ra
// rồi vệt men lướt chéo; vòng quét tới giá trị. Reduce Motion ⇒ không mọc / không lướt, chỉ fade (docs/clay/M-anh-men.css cuối khối thông số).
// «Mọc» chỉ dùng transform (Thanh duyệt 25/10): cột / thanh có kích thước cuối ngay từ đầu rồi scale từ chân (transformOrigin), nên mỗi khung
// không phải tính lại bố cục. Đánh đổi đã chấp nhận: trong ~400ms mọc, đầu bo + lớp men hơi giãn theo; mọc xong (scale 1) y hệt bản tĩnh.
// Một bộ cho mọi chỗ: Báo cáo tuần (cột đôi học / giải trí), Thời gian màn hình (cột chồng theo mục + thanh theo mục), Tien (thanh tiến độ),
// vòng đồng hồ của Con. Chỉ dùng react-native-reanimated + react-native-svg có sẵn.
import React, { useEffect, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn, ReduceMotion, type SharedValue, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { BONG, MEN, VET } from "./clay";
import { EASE } from "./chuyen-dong";
import { F, M } from "./mau";

/** Lò xo «mọc»: ζ = 22 / (2·√230) ≈ 0,73 ⇒ vượt ~4% rồi về (vui nhưng không lắc lâu). */
const MOC = { stiffness: 230, damping: 22, mass: 1 } as const;
const SO_LE = 45;
/** Lò xo vượt tối đa ~4% (MOC) ⇒ cột cao nhất chỉ chiếm 1/1,05 rãnh để lúc nảy không trồi khỏi rãnh. */
const VUOT = 1.05;

/** Tiến trình «mọc» `p` (lò xo MOC sau `tre` ms) + «vệt men» `q` (0→1 một lần, bắt đầu `treVet` ms sau khi mọc). Chạy lại khi `lai` đổi
 * (vd thanh từ 0 lên có số khi dữ liệu về). Reduce Motion ⇒ p = 1 ngay, không vệt. */
function useMoc(giam: boolean, tre: number, treVet: number, tgVet: number, lai: unknown) {
  const p = useSharedValue(giam ? 1 : 0), q = useSharedValue(0);
  useEffect(() => {
    if (giam) { p.set(1); q.set(0); return; }
    p.set(0); q.set(0);
    p.set(withDelay(tre, withSpring(1, MOC)));
    q.set(withDelay(tre + treVet, withTiming(1, { duration: tgVet, easing: EASE.quet })));
  }, [giam, tre, treVet, tgVet, lai, p, q]);
  return { p, q };
}

// ---------------------------------------------------------------- cột

export type PhanCot = { gia: number; mau: string; /** làm mờ (đang lọc mục khác) */ mo?: boolean };
export type CotNgay = { khoa: string; nhan: string; /** đọc cho trình đọc màn hình */ doc: string; phan: PhanCot[];
  /** cột chồng: tổng thật của ngày (mặc định = tổng các phần); phần chưa chia mục hiện màu M.vien2 */ tong?: number };

/**
 * Biểu đồ cột clay. `kieu="doi"`: mỗi phần một cột đứng cạnh nhau (Báo cáo: học / giải trí). `kieu="chong"`: các phần chồng thành một cột
 * (Thời gian màn hình: theo mục, phần lớn nhất ở chân). `max` = giá trị ứng với đỉnh rãnh. `chon` + `bam`: chạm một ngày để lọc.
 */
export function CotClay({ ds, max, kieu = "doi", cao = 120, chon = null, bam, tat, nhanDoc }: {
  ds: CotNgay[]; max: number; kieu?: "doi" | "chong"; cao?: number; chon?: number | null; bam?: (i: number) => void;
  /** ngày không bấm được (tương lai) */ tat?: (i: number) => boolean; nhanDoc?: string;
}) {
  const giam = useReducedMotion();
  const dinh = Math.max(1, max), dai = (cao - 8) / VUOT;
  return (
    <Animated.View entering={giam ? FadeIn.duration(200).reduceMotion(ReduceMotion.Never) : undefined}
      // không bấm được ⇒ cả biểu đồ là MỘT phần tử đọc: tóm tắt + từng ngày; bấm được ⇒ mỗi ngày một nút (nhãn riêng)
      accessible={!bam} accessibilityLabel={!bam ? [nhanDoc, ...ds.map((x) => x.doc)].filter(Boolean).join("; ") : undefined}
      style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
      {ds.map((x, i) => {
        // chỉ làm mờ ngày khác khi đang LỌC (có bam); không bấm được thì `chon` chỉ đánh dấu (vd hôm nay). Nhãn không mờ — giữ tương phản chữ.
        const dangChon = chon === i, mo = !!bam && chon !== null && chon !== undefined && !dangChon;
        const noi = (
          <>
            <View style={[s.ranh, { height: cao }, dangChon && { backgroundColor: M.chinhSoft }, mo && { opacity: 0.45 }]}>
              {kieu === "chong"
                ? <Cot thu={i} cao={Math.min(1, tongCot(x) / dinh) * dai} phan={phanChong(x)} giam={giam} />
                : x.phan.map((p, k) => <Cot key={k} thu={i} cao={Math.min(1, p.gia / dinh) * dai} phan={[p]} giam={giam} />)}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} maxFontSizeMultiplier={2}
              style={{ fontFamily: dangChon ? F.rat : F.dam, fontSize: 12, lineHeight: 17, color: dangChon ? M.chu : M.chu3, textAlign: "center", alignSelf: "stretch" }}>
              {x.nhan}
            </Text>
          </>
        );
        const st = { flex: 1, minWidth: 0, alignItems: "center" as const, gap: 6 };
        return bam ? (
          <Pressable key={x.khoa} disabled={tat?.(i)} onPress={() => bam(i)} accessibilityRole="button" accessibilityState={{ selected: dangChon }}
            accessibilityLabel={x.doc} hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }} style={st}>{noi}</Pressable>
        ) : <View key={x.khoa} style={st}>{noi}</View>;
      })}
    </Animated.View>
  );
}

const tongCot = (x: CotNgay) => Math.max(x.tong ?? 0, x.phan.reduce((a, p) => a + p.gia, 0));
/** Phần chồng + phần «chưa chia mục» (tong lớn hơn tổng các phần) ở đỉnh. */
const phanChong = (x: CotNgay): PhanCot[] => {
  const du = tongCot(x) - x.phan.reduce((a, p) => a + p.gia, 0);
  return du > 0 ? [{ gia: du, mau: M.vien2, mo: x.phan.some((p) => p.mo) }, ...x.phan] : x.phan;   // khác màu «Chưa phân loại» (oNhap)
};

/** Một cột clay: mọc từ chân (lò xo MOC, so le theo `thu`), xong một vệt men lướt dọc từ chân lên đỉnh. */
function Cot({ thu, cao, phan, giam }: { thu: number; cao: number; phan: PhanCot[]; giam: boolean }) {
  const h = cao <= 0 ? 0 : Math.max(8, cao);
  const { p, q } = useMoc(giam, thu * SO_LE, 380, 450, h > 0);
  const stCot = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.max(0, p.value) }] }));
  const stVet = useAnimatedStyle(() => ({ opacity: q.value > 0 && q.value < 1 ? 1 : 0, transform: [{ translateY: (1 - 2 * q.value) * h }] }));
  const tong = phan.reduce((a, x) => a + x.gia, 0) || 1;
  // giá trị 0: một nụ nhỏ mờ giữ chỗ (cột đôi vẫn thấy đủ cặp Học / Giải trí)
  if (!h) return <View style={{ flex: 1, maxWidth: 30, height: 6, borderRadius: 3, backgroundColor: phan[0]?.mau, opacity: 0.3 }} />;
  return (
    <Animated.View style={[{ flex: 1, maxWidth: 30, height: h, borderRadius: 999, boxShadow: BONG.cot, transformOrigin: "bottom" }, stCot]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: 999, overflow: "hidden", justifyContent: "flex-end" }]}>
        {phan.map((x, k) => <View key={k} style={{ height: `${(x.gia / tong) * 100}%`, backgroundColor: x.mau, opacity: x.mo ? 0.28 : 1 }} />)}
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
  // chạy lại «dài ra» khi thanh từ trống lên có số (dữ liệu vừa về), không chạy lại mỗi lần số nhích (đồng hồ đếm)
  const { p, q } = useMoc(giam, tre, 360, 420, t > 0);
  // dài sẵn t·100%, scale từ mép trái; gần đầy thì kẹp lò xo vượt để không tràn rãnh (như bản cũ kẹp 100%)
  const vuotToiDa = t >= 1 ? 1 : Math.min(1.06, 1 / t);
  const stThanh = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.min(vuotToiDa, Math.max(0, p.value)) }] }));
  const stVet = useAnimatedStyle(() => ({ opacity: q.value > 0 && q.value < 1 ? 1 : 0, transform: [{ translateX: `${(2.4 * q.value - 1.2) * 100}%` }] }));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={nhanDoc} accessibilityValue={{ min: 0, max: 100, now: Math.round(t * 100) }}
      style={{ height: cao, borderRadius: cao / 2, backgroundColor: M.ranh, padding: dem, boxShadow: BONG.lom, justifyContent: "center" }}>
      {t > 0 ? (
        <Animated.View style={[{ height: "100%", width: `${t * 100}%`, minWidth: cao - dem * 2, borderRadius: cao / 2, boxShadow: BONG.cot, transformOrigin: "left" }, stThanh]}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: cao / 2, overflow: "hidden", backgroundColor: mau }]}>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundImage: MEN.ong }]} />
            {giam ? null : <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, bottom: 0, width: "100%", backgroundImage: VET.toi }, stVet]} />}
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
  const r = co / 2 - sw / 2 - 1, t = Math.min(1, Math.max(0, ti || 0)), c = co / 2;
  const p = useSharedValue(giam ? 1 : 0);
  const coSo = t > 0;
  useEffect(() => { if (giam) p.set(1); else { p.set(0); p.set(withTiming(1, { duration: 450, easing: EASE.men })); } }, [giam, coSo, p]);
  // ống màu + chân tối phía trong + vệt men phía ngoài: mỗi cung bán kính riêng (chu vi riêng) để cùng phủ một góc
  const cung = [{ r, mau, w: sw }, { r: r - sw * 0.3, mau: "rgba(0,0,0,0.16)", w: sw * 0.26 }, { r: r + sw * 0.16, mau: "rgba(255,255,255,0.55)", w: sw * 0.22 }];
  const dia = co - sw * 2 - 4;
  return (
    <View style={{ width: co, height: co, alignItems: "center", justifyContent: "center" }}
      {...(nhanDoc ? { accessibilityRole: "progressbar" as const, accessibilityLabel: nhanDoc, accessibilityValue: { min: 0, max: 100, now: Math.round(t * 100) } }
        : { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" as const })}>
      <View style={{ position: "absolute", width: co, height: co, borderRadius: co / 2, boxShadow: co >= 80 ? BONG.nho : undefined }} />
      <Svg width={co} height={co} style={{ position: "absolute" }}>
        {/* rãnh lõm: xám + bóng trong (vòng tối mảnh phía trong) + mép sáng ngoài */}
        <Circle cx={c} cy={c} r={r} stroke={M.ranh} strokeWidth={sw} fill="none" />
        <Circle cx={c} cy={c} r={r - sw * 0.28} stroke="rgba(40,44,42,0.10)" strokeWidth={sw * 0.38} fill="none" />
        <Circle cx={c} cy={c} r={r + sw * 0.42} stroke="rgba(255,255,255,0.95)" strokeWidth={Math.max(1, sw * 0.14)} fill="none" />
        {t > 0 ? cung.map((x, k) => <Cung key={k} c={c} t={t} p={p} {...x} />) : null}
      </Svg>
      {children ? (
        <View style={{ width: dia, height: dia, borderRadius: dia / 2, backgroundColor: M.the, alignItems: "center", justifyContent: "center", boxShadow: BONG.nho }}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: dia / 2, backgroundImage: MEN.the }]} />
          {children}
        </View>
      ) : null}
    </View>
  );
}

/** Một cung của vòng: dash theo chu vi của chính nó, quét theo `p`; có strokeDashoffset tĩnh cho web. */
function Cung({ c, r, mau, w, t, p }: { c: number; r: number; mau: string; w: number; t: number; p: SharedValue<number> }) {
  const cv = 2 * Math.PI * r;
  const ap = useAnimatedProps(() => ({ strokeDashoffset: cv * (1 - t * p.value) }));
  return <ACircle cx={c} cy={c} r={r} stroke={mau} strokeWidth={w} fill="none" strokeLinecap="round" strokeDasharray={`${cv} ${cv}`}
    strokeDashoffset={Platform.OS === "web" ? cv * (1 - t) : undefined} transform={`rotate(-90 ${c} ${c})`} animatedProps={ap} />;
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
