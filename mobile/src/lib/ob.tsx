// Bộ khối cho LUỒNG BẮT ĐẦU — biến thể thử theo skill appllama-app-design-skill (nhánh thu/appllama-onboarding, KHÔNG merge).
// Luật khoá (anti-slop pre-flight của skill):
//  · Màu: chỉ màu ngữ nghĩa của hệ điều hành (label / secondaryLabel / systemGroupedBackground…) — sáng/tối tự đổi. MỘT màu nhấn: ngọc.
//  · Hình: nút = viên thuốc (capsule) · nhóm/ô nhập = 12 · ô mã = 12 — không bán kính nào khác. borderCurve continuous ở mọi khối bo.
//  · Icon: SF Symbols (expo-image `sf:`), không emoji, không icon 3D. Minh hoạ (Rob) chỉ ở cửa vào và màn Xong.
//  · Chữ: thang chữ iOS (Large Title 34 · Title2 22 · Headline 17 · Body 17 · Subhead 15 · Footnote 13), chữ hệ thống ⇒ Dynamic Type.
//  · Khoảng cách: bội 4/8, dùng `gap`. Đệm ScrollView đặt trong contentContainerStyle.
//  · Motion: chuyển cảnh native; nhấn nút = scale 0.97 trong 120 ms ease-out lúc press-IN; Reduce Motion ⇒ bỏ scale.
import { type ReactNode, useEffect, useRef } from "react";
import { ActivityIndicator, DynamicColorIOS, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput,
  type TextInputProps, type TextStyle, useColorScheme, View, type ViewStyle } from "react-native";
import { Color, useNavigation } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import SegmentedControlGoc, { type SegmentedControlProps } from "@react-native-segmented-control/segmented-control";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const IOS = process.env.EXPO_OS === "ios";
const dyn = (light: string, dark: string) => (IOS ? DynamicColorIOS({ light, dark }) : light);

/** Màu ngữ nghĩa. iOS: màu hệ thống thật (đổi theo sáng/tối, tương phản cao). Nền khác: bảng tương đương (sáng). */
export const C = {
  nen: IOS ? Color.ios.systemGroupedBackground : "#f2f2f7",
  khoi: IOS ? Color.ios.secondarySystemGroupedBackground : "#ffffff",
  chu: IOS ? Color.ios.label : "#000000",
  chu2: IOS ? Color.ios.secondaryLabel : "#3c3c4399",
  chu3: IOS ? Color.ios.tertiaryLabel : "#3c3c434d",
  goiY: IOS ? Color.ios.placeholderText : "#3c3c434d",
  ke: IOS ? Color.ios.separator : "#3c3c434a",
  lap: IOS ? Color.ios.tertiarySystemFill : "#7676801f",
  lapNhat: IOS ? Color.ios.quaternarySystemFill : "#74748014",
  loi: IOS ? Color.ios.systemRed : "#ff3b30",
  /** MỘT màu nhấn — ngọc. `nhan` để tô nền (chữ trắng ≥ 5:1 cả hai chế độ), `nhanChu` để làm chữ/link/icon. */
  nhan: dyn("#0f6b5c", "#117a69"),
  nhanChu: dyn("#0f6b5c", "#4cc9b5"),
  nhanNhat: dyn("#e3efeb", "#123a33"),
  diem: dyn("#7a4a00", "#f5c451"),
  diemNhat: dyn("#fff1c9", "#3a2c0a"),
} as const;
/** Màu chuỗi (cho Reanimated / thư viện cần chuỗi) theo chế độ hiện tại. */
export function useMauChuoi() {
  const toi = useColorScheme() === "dark";
  return { nhan: toi ? "#117a69" : "#0f6b5c", nhanChu: toi ? "#4cc9b5" : "#0f6b5c", chu: toi ? "#ffffff" : "#000000" };
}

export const BO = { o: 12 } as const;          // nhóm, ô nhập, ô mã. Nút = viên thuốc (height/2).
const T = StyleSheet.create({
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 0.35 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.41 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.08 },
});
type Kieu = keyof typeof T;
export function Ch({ k = "body", mau = C.chu, style, children, so, ...p }: { k?: Kieu; mau?: TextStyle["color"]; style?: TextStyle | TextStyle[]; children: ReactNode; so?: boolean; selectable?: boolean; numberOfLines?: number }) {
  // push-out: iOS tránh để một chữ mồ côi ở dòng cuối (tiêu đề lớn) — dùng được ở mọi cỡ chữ, không phải chèn \n tay.
  return <Text lineBreakStrategyIOS="push-out" {...p} style={[T[k], { color: mau }, so && { fontVariant: ["tabular-nums"] }, style]}>{children}</Text>;
}

/** SF Symbol. Nền khác iOS: không vẽ (biến thể này chỉ thử trên iOS). */
export function Sym({ ten, co = 20, mau = C.nhanChu }: { ten: string; co?: number; mau?: TextStyle["color"] }) {
  if (!IOS) return <View style={{ width: co, height: co }} />;
  return <Image source={`sf:${ten}`} tintColor={mau as string} style={{ width: co, height: co }} contentFit="contain" accessibilityElementsHidden />;
}
/** Ô icon kiểu Cài đặt iOS: SF Symbol trắng trên ô màu nhấn bo 8 (thuộc thang: icon tile = 8 — ngoại lệ duy nhất, ghi rõ). */
export function OIcon({ ten }: { ten: string }) {
  return <View style={{ width: 30, height: 30, borderRadius: 8, borderCurve: "continuous", backgroundColor: C.nhan, alignItems: "center", justifyContent: "center" }}><Sym ten={ten} co={17} mau="#ffffff" /></View>;
}

const MO = Easing.bezier(0.23, 1, 0.32, 1);
/** Nút chính: viên thuốc tô màu nhấn, cao 50. Nhấn = scale 0.97 lúc press-in (120 ms), nhả = về 1 (150 ms). Haptic nhẹ khi bấm. */
export function NutChinh({ chu, bam, tat, dangChay, ic }: { chu: string; bam: () => void; tat?: boolean; dangChay?: boolean; ic?: string }) {
  const s = useSharedValue(1);
  const giam = useReducedMotion();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  const khoa = tat || dangChay;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={chu} accessibilityState={{ disabled: !!khoa, busy: !!dangChay }} disabled={khoa}
      onPressIn={() => { if (!giam) s.set(withTiming(0.97, { duration: 120, easing: MO })); }}
      onPressOut={() => { s.set(withTiming(1, { duration: 150, easing: MO })); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); bam(); }}>
      <Animated.View style={[st.nut, { backgroundColor: tat ? C.lap : C.nhan }, a]}>
        {dangChay ? <ActivityIndicator color="#ffffff" /> : (
          <>
            {ic ? <Sym ten={ic} co={18} mau={tat ? C.chu3 : "#ffffff"} /> : null}
            <Ch k="headline" mau={tat ? C.chu3 : "#ffffff"} numberOfLines={2} style={{ textAlign: "center", flexShrink: 1 }}>{chu}</Ch>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}
/** Nút chữ (plain) — opacity 0.4 khi nhấn (đúng UIButton plain). */
export function NutChu({ chu, bam, ic, nho, nhan = "button" }: { chu: string; bam: () => void; ic?: string; nho?: boolean; nhan?: "button" | "link" }) {
  return (
    <Pressable onPress={bam} accessibilityRole={nhan} accessibilityLabel={chu} hitSlop={4}
      style={({ pressed }) => [{ minHeight: 44, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, opacity: pressed ? 0.4 : 1 }]}>
      {ic ? <Sym ten={ic} co={nho ? 15 : 17} /> : null}
      <Ch k={nho ? "subhead" : "headline"} mau={C.nhanChu}>{chu}</Ch>
    </Pressable>
  );
}

/** Khung màn luồng bắt đầu: nền grouped, ScrollView gốc (contentInsetAdjustmentBehavior automatic — header native lo vùng trên),
 *  nút dính đáy vượt vạch home, bàn phím đẩy đáy lên (KeyboardAvoidingView padding). */
export function Khung({ children, day, dau, noi }: { children: ReactNode; day?: ReactNode; dau?: ReactNode; noi?: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.nen }} behavior={IOS ? "padding" : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 24 }}>
        {dau}
        {children}
      </ScrollView>
      {day ? <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(ins.bottom, 16), gap: 4, backgroundColor: C.nen }}>{day}</View> : null}
      {noi ? <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(ins.bottom, 16) + 76 }}>{noi}</View> : null}
    </KeyboardAvoidingView>
  );
}

/** Tiêu đề nội dung của bước (Title1) + một câu giải thích. Tiêu đề thanh điều hướng do navigator giữ. */
export function TieuDe({ tieu, loi }: { tieu: string; loi?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Ch k="title1" style={{}} >{tieu}</Ch>
      {loi ? <Ch k="body" mau={C.chu2}>{loi}</Ch> : null}
    </View>
  );
}

/** Thanh tiến độ bước (n/tong) — mảnh, màu nhấn. */
export function TienDo({ n, tong }: { n: number; tong: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`Bước ${n} trên ${tong}`} accessibilityValue={{ min: 0, max: tong, now: n }}
      style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: tong }, (_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < n ? C.nhan : C.lap }} />)}
    </View>
  );
}

/** Nhóm kiểu inset-grouped của iOS: tiêu đề nhóm (footnote hoa) trên, chú thích dưới, hàng ngăn bằng separator thụt lề. */
export function Nhom({ tieu, chuThich, children }: { tieu?: string; chuThich?: string; children: ReactNode }) {
  const ds = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={{ gap: 6 }}>
      {tieu ? <Ch k="footnote" mau={C.chu2} style={{ paddingHorizontal: 16, textTransform: "uppercase" }}>{tieu}</Ch> : null}
      <View style={{ backgroundColor: C.khoi, borderRadius: BO.o, borderCurve: "continuous", overflow: "hidden" }}>
        {ds.map((c, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.ke, marginLeft: 16 }} /> : null}
            {c}
          </View>
        ))}
      </View>
      {chuThich ? <Ch k="footnote" mau={C.chu2} style={{ paddingHorizontal: 16 }}>{chuThich}</Ch> : null}
    </View>
  );
}

/** Một hàng trong Nhom. Có `bam` ⇒ nền highlight khi nhấn (KHÔNG scale — luật hàng danh sách). */
export function Hang({ tieu, phu, trai, phai, bam, chon, a11y }: { tieu: string; phu?: string; trai?: ReactNode; phai?: ReactNode; bam?: () => void; chon?: boolean; a11y?: string }) {
  const noi = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16 }}>
      {trai}
      <View style={{ flex: 1, gap: 2 }}>
        <Ch k="body">{tieu}</Ch>
        {phu ? <Ch k="footnote" mau={C.chu2}>{phu}</Ch> : null}
      </View>
      {phai}
      {chon !== undefined ? <View style={{ width: 22, alignItems: "flex-end" }}>{chon ? <Sym ten="checkmark" co={17} /> : null}</View> : null}
    </View>
  );
  if (!bam) return noi;
  return (
    <Pressable onPress={bam} accessibilityRole={chon !== undefined ? "radio" : "button"} accessibilityState={chon !== undefined ? { selected: chon } : undefined}
      accessibilityLabel={a11y ?? (phu ? `${tieu}, ${phu}` : tieu)}
      style={({ pressed }) => ({ backgroundColor: pressed ? C.lapNhat : "transparent" })}>
      {noi}
    </Pressable>
  );
}

/** Ô nhập: nhãn ở TRÊN (không dùng placeholder làm nhãn), lỗi ở dưới màu đỏ hệ thống. */
export function ONhap({ nhan, loi, ...p }: TextInputProps & { nhan: string; loi?: string | null; ref?: React.Ref<React.ComponentRef<typeof TextInput>> }) {
  return (
    <View style={{ gap: 6 }}>
      <Ch k="footnote" mau={C.chu2} style={{ paddingHorizontal: 4 }}>{nhan}</Ch>
      <TextInput placeholderTextColor={C.goiY as string} accessibilityLabel={nhan} clearButtonMode="while-editing" {...p}
        style={[T.body, { color: C.chu, backgroundColor: C.khoi, borderRadius: BO.o, borderCurve: "continuous", paddingHorizontal: 16, minHeight: 50 },
          loi ? { borderWidth: 1, borderColor: C.loi } : null, p.style as TextStyle]} />
      {loi ? <Ch k="footnote" mau={C.loi} style={{ paddingHorizontal: 4 }}>{loi}</Ch> : null}
    </View>
  );
}
/** Dùng cho chuỗi ô nhập: ref + chuyển ô kế bằng phím Return. */
export const useO = () => useRef<React.ComponentRef<typeof TextInput>>(null);
/** Ô đầu tiên nhận focus SAU KHI chuyển cảnh xong (không dùng autoFocus): autoFocus bật bàn phím giữa lúc push ⇒ khung đầu của chuyển cảnh
 *  bị vẽ lại (tua khung vòng 5 bắt được một khung «nhảy» ở đầu push sang Tạo tài khoản). */
export function useOFocusSauChuyen() {
  const o = useO();
  const nav = useNavigation();
  useEffect(() => nav.addListener("transitionEnd" as never, (e: { data?: { closing?: boolean } }) => { if (!e?.data?.closing) o.current?.focus(); }), [nav, o]);
  return o;
}

/** Ô mã 6 số: một TextInput thật (oneTimeCode, số) phủ trên 6 ô hiển thị; đủ 6 số ⇒ gọi `du`. */
export function Ma6({ gia, doi, du, nhan = "Mã xác thực 6 số" }: { gia: string; doi: (v: string) => void; du?: (v: string) => void; nhan?: string }) {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={nhan} style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
      {Array.from({ length: 6 }, (_, k) => {
        const dang = k === Math.min(gia.length, 5);
        return (
          <View key={k} style={{ flex: 1, maxWidth: 52, height: 60, borderRadius: BO.o, borderCurve: "continuous", backgroundColor: C.khoi,
            borderWidth: dang ? 2 : 0, borderColor: C.nhan, alignItems: "center", justifyContent: "center" }}>
            <Ch k="title1" so>{gia[k] ?? ""}</Ch>
          </View>
        );
      })}
      <TextInput ref={ref} value={gia} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} accessibilityLabel={nhan} autoFocus
        onChangeText={(t) => { const v = t.replace(/\D/g, "").slice(0, 6); doi(v); if (v.length === 6) du?.(v); }}
        style={{ position: "absolute", opacity: 0.011, width: "100%", height: "100%", color: "transparent" }} />
    </Pressable>
  );
}

/** Lỗi ngay tại chỗ, cụ thể, ở lại tới khi sửa. */
export const LoiTaiCho = ({ loi }: { loi?: string | null }) => (loi ? (
  <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4 }}>
    <Sym ten="exclamationmark.circle.fill" co={17} mau={C.loi} />
    <Ch k="footnote" mau={C.loi} style={{ flex: 1 }}>{loi}</Ch>
  </View>
) : null);

/** Ghi chú phụ (footnote + SF symbol), dùng cho «Bản thử: mã là…», «Mã tự điền». */
export const GhiChu = ({ ic, chu, mau = C.chu2 }: { ic: string; chu: string; mau?: TextStyle["color"] }) => (
  <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4 }}>
    <Sym ten={ic} co={15} mau={mau} />
    <Ch k="footnote" mau={mau} style={{ flex: 1 }}>{chu}</Ch>
  </View>
);

export const haptic = {
  chon: () => Haptics.selectionAsync().catch(() => {}),
  ok: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  loi: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};

const st = StyleSheet.create({
  nut: { minHeight: 50, borderRadius: 25, borderCurve: "continuous", paddingHorizontal: 20, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" } as ViewStyle,
});

/** SegmentedControl native (UISegmentedControl). Ép kiểu: kiểu lớp của thư viện chưa khớp @types/react 19. */
export const Seg = SegmentedControlGoc as unknown as React.ComponentType<SegmentedControlProps>;
