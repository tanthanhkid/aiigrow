// Bộ giao diện AiiGrow — dựng lại ĐÚNG các thành phần của bản thiết kế đã duyệt (aiigrow-thiet-ke: kit.py + tinh/app.css): cảnh mascot
// bong bóng thoại, nút (1 nút đặc mỗi màn · vien · ma · huy · vang), thẻ, danh sách nhóm, ô chọn, thanh chọn một, chip, báo, tiến độ.
// Khung trạng thái chung (đang tải / trống / lỗi / mất mạng) + tải dữ liệu, thao tác ghi, hoàn tác chép mẫu của AiiControl.
// Chuẩn: TIEU-CHUAN-GIAO-DIEN.md (WCAG 2.2 + Material 3) — nhãn nút một dòng, chạm ≥ 44, chữ không đè mascot.
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeOutDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import ICON from "./icon.json";
import { BO, F, M } from "./mau";
import { LoiApi } from "./api";

export { M, F, BO };
export type TenIcon = keyof typeof ICON;

// ---------------------------------------------------------------- chữ, icon, mascot

type Kieu = "thuong" | "dam" | "rat";
/** Line-height theo cỡ: ≤16 → 1.45–1.5 (dấu tiếng Việt không bị cắt), 20 → 1.25, ≥24 → 1.15. */
export function Chu({ children, kieu = "thuong", co = 15, mau = M.chu, style, so, dong }: {
  children: ReactNode; kieu?: Kieu; co?: number; mau?: string; style?: object; so?: boolean; dong?: number;
}) {
  const lh = Math.round(co * (co >= 24 ? 1.15 : co >= 18 ? 1.3 : 1.47));
  return (
    <Text numberOfLines={dong} style={[{ fontFamily: F[kieu], fontSize: co, color: mau, lineHeight: lh }, so && { fontVariant: ["tabular-nums"] }, style]}>
      {children}
    </Text>
  );
}

export function Icon({ ten, mau = M.chu2, co = 20, net = 2 }: { ten: TenIcon; mau?: string; co?: number; net?: number }) {
  const xml = `<svg viewBox="0 0 24 24" fill="none" stroke="${mau}" stroke-width="${net}" stroke-linecap="round" stroke-linejoin="round">${ICON[ten]}</svg>`;
  return <SvgXml xml={xml} width={co} height={co} />;
}

const LV = {
  "canh-cac-con": require("../../assets/linh-vat/canh-cac-con.webp"), "canh-diem": require("../../assets/linh-vat/canh-diem.webp"),
  "canh-hoc": require("../../assets/linh-vat/canh-hoc.webp"), "canh-tien-do": require("../../assets/linh-vat/canh-tien-do.webp"),
  "canh-trong": require("../../assets/linh-vat/canh-trong.webp"), chi: require("../../assets/linh-vat/chi.webp"), cho: require("../../assets/linh-vat/cho.webp"),
  hoc: require("../../assets/linh-vat/hoc.webp"), nghi: require("../../assets/linh-vat/nghi.webp"), ngu: require("../../assets/linh-vat/ngu.webp"),
  qua: require("../../assets/linh-vat/qua.webp"), "rob-goc": require("../../assets/linh-vat/rob-goc.webp"), sao: require("../../assets/linh-vat/sao.webp"),
  "so-tay": require("../../assets/linh-vat/so-tay.webp"), "trong-loi": require("../../assets/linh-vat/trong-loi.webp"), xong: require("../../assets/linh-vat/xong.webp"),
} as const;
export type LinhVat = keyof typeof LV;

export const Rob = ({ ten, co = 72 }: { ten: LinhVat; co?: number }) => (
  <Image source={LV[ten]} style={{ width: co, height: co }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
);

const MAU_CANH = { xanh: M.chinhSoft, vang: "#ffeab0", hong: "#fde3dc", tim: M.timSoft, xam: "#ecece8" } as const;
export type MauCanh = keyof typeof MAU_CANH;

/** CẢNH đầu màn (kit.canh): bong bóng thoại trắng (tiêu đề + 1 câu) bên trái ≤ 56%, Rob to tràn mép dưới bên phải. `children` nằm
 * TRONG bong bóng (nhãn, nút nhỏ). Rob chờm 34 dưới cảnh ⇒ cảnh có marginBottom 26 + khoảng cách cột 12 để nội dung sau không bị đè. */
export function Canh({ lv, tieu, loi, mau = "xanh", thap, children }: { lv: LinhVat; tieu: string; loi?: string; mau?: MauCanh; thap?: boolean; children?: ReactNode }) {
  return (
    <View style={[s.canh, { backgroundColor: MAU_CANH[mau], minHeight: thap ? 140 : 172 }]}>
      <View style={s.bong}>
        <Chu kieu="rat" co={20} style={{ letterSpacing: -0.3 }}>{tieu}</Chu>
        {loi ? <Chu co={14.5} mau={M.chu2} style={{ marginTop: 4 }}>{loi}</Chu> : null}
        {children ? <View style={{ marginTop: 8, alignItems: "flex-start" }}>{children}</View> : null}
        <View style={s.duoiBong} />
      </View>
      <View pointerEvents="none" style={[s.canhRob, { width: thap ? "42%" : "50%", maxWidth: thap ? 160 : 200 }]}>
        <Image source={LV[lv]} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      </View>
    </View>
  );
}

/** Cảnh giữa màn cho trống / lỗi / chờ (kit.canh_giua): Rob lớn, bong bóng ngay dưới, nút hành động dưới nữa. */
export function CanhGiua({ lv, tieu, loi, children }: { lv: LinhVat; tieu: string; loi?: string; children?: ReactNode }) {
  return (
    <View style={{ flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 12 }}>
      <Image source={LV[lv]} style={{ width: "62%", maxWidth: 260, aspectRatio: 1 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <View style={[s.bong, { maxWidth: 310, alignItems: "center", paddingHorizontal: 18 }]}>
        <Chu kieu="rat" co={20} style={{ textAlign: "center" }}>{tieu}</Chu>
        {loi ? <Chu co={15} mau={M.chu2} style={{ marginTop: 4, textAlign: "center" }}>{loi}</Chu> : null}
        <View style={s.duoiBongTren} />
      </View>
      {children ? <View style={{ alignSelf: "stretch", alignItems: "center", gap: 8 }}>{children}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------- nút, nhãn, thẻ

type LoaiNut = "chinh" | "vien" | "ma" | "huy" | "vang";
const MAU_NUT: Record<LoaiNut, { nen: string; chu: string; vien?: string; bong?: string }> = {
  chinh: { nen: M.nut, chu: "#ffffff", bong: M.nutDam }, vien: { nen: M.the, chu: M.chu, vien: M.vien2 }, ma: { nen: "transparent", chu: M.chinhInk },
  huy: { nen: M.the, chu: M.huy, vien: "#f1c4bd" }, vang: { nen: M.diem, chu: "#3d2600", bong: "#c48f00" },
};

/** Nút (kit.nut). Nhãn MỘT dòng (Material 3): nút rộng theo chữ, thiếu chỗ thì `HaiNut` cho nút xuống hàng — không bẻ chữ. */
export function Nut({ chu, bam, loai = "chinh", nho, rong, ic, dangChay, tat, nhanDoc }: {
  chu: string; bam: () => void; loai?: LoaiNut; nho?: boolean; rong?: boolean; ic?: TenIcon; dangChay?: boolean; tat?: boolean; nhanDoc?: string;
}) {
  const m = MAU_NUT[loai];
  const giam = useReducedMotion();
  const y = useSharedValue(0);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const nhan = (v: number) => { if (!giam) y.set(withSpring(v, { damping: 18, stiffness: 500 })); };
  const mo = tat || dangChay;
  return (
    <Animated.View style={[st, rong ? { alignSelf: "stretch" } : { flexGrow: 1 }]}>
      <Pressable onPress={bam} onPressIn={() => nhan(2)} onPressOut={() => nhan(0)} disabled={mo} accessibilityRole="button"
        accessibilityLabel={nhanDoc ?? chu} accessibilityState={{ disabled: !!mo, busy: !!dangChay }}
        style={[s.nut, nho && s.nutNho, { backgroundColor: tat ? "#d4d5d1" : m.nen }, m.vien && !tat ? { borderWidth: 1.5, borderColor: m.vien } : null,
          m.bong && !tat ? { borderBottomWidth: 4, borderBottomColor: m.bong } : null]}>
        {dangChay ? <ActivityIndicator color={m.chu} /> : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "100%" }}>
            {ic ? <Icon ten={ic} mau={tat ? M.chu2 : m.chu} co={20} /> : null}
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.rat, fontSize: nho ? 14.5 : 16, color: tat ? M.chu2 : m.chu, lineHeight: nho ? 20 : 22 }}>{chu}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export const HaiNut = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;

export const The = ({ children, dem, style, thu }: { children: ReactNode; dem?: boolean; style?: ViewStyle; thu?: number }) =>
  thu === undefined ? <View style={[s.the, dem && { padding: 16 }, style]}>{children}</View>
    : <Animated.View entering={FadeInDown.delay(thu * 40).duration(320)} style={[s.the, dem && { padding: 16 }, style]}>{children}</Animated.View>;

type LoaiNhan = "ok" | "canh" | "loi" | "xam" | "lam" | "diem" | "tim";
const MAU_NHAN: Record<LoaiNhan, [string, string]> = {
  ok: [M.chinhSoft, M.chinhInk], canh: [M.canhSoft, M.canh], loi: [M.loiSoft, M.loi], xam: [M.xamSoft, M.chu2], lam: [M.lamSoft, M.lam],
  diem: [M.diemSoft, M.diemInk], tim: [M.timSoft, "#4b3cc4"],
};
export const Nhan = ({ chu, loai = "ok", cham, ic }: { chu: string; loai?: LoaiNhan; cham?: boolean; ic?: TenIcon }) => (
  <View style={[s.nhan, { backgroundColor: MAU_NHAN[loai][0] }]}>
    {cham ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MAU_NHAN[loai][1] }} /> : null}
    {ic ? <Icon ten={ic} mau={MAU_NHAN[loai][1]} co={14} /> : null}
    <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 12.5, color: MAU_NHAN[loai][1], lineHeight: 18 }}>{chu}</Text>
  </View>
);

export const DiemPill = ({ n }: { n: number }) => (
  <View style={s.diemPill}>
    <View style={s.xu}><Icon ten="sao" mau={M.diemInk} co={14} net={2.6} /></View>
    <Chu kieu="rat" co={15} mau={M.diemInk} so>{n} điểm</Chu>
  </View>
);

const MAU_BT = { xanh: [M.chinhSoft, M.chinhInk], vang: [M.diemSoft, M.diemInk], do: [M.loiSoft, M.loi], cam: [M.canhSoft, M.canh], lam: [M.lamSoft, M.lam], tim: [M.timSoft, "#4b3cc4"], xam: [M.xamSoft, M.chu2] } as const;
export type MauBt = keyof typeof MAU_BT;
export const BieuTron = ({ ic, mau = "xanh", lon }: { ic: TenIcon; mau?: MauBt; lon?: boolean }) => (
  <View style={[s.bieuTron, { backgroundColor: MAU_BT[mau][0] }, lon && { width: 56, height: 56, borderRadius: 18 }]}>
    <Icon ten={ic} mau={MAU_BT[mau][1]} co={lon ? 28 : 20} />
  </View>
);

/** Chữ trên nền màu: trắng hay chữ đậm — chọn bên tương phản cao hơn (WCAG 1.4.3). */
const doSang = (hex: string) => {
  const k = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
};
export const chuTren = (nen: string) => {
  if (!/^#[0-9a-f]{6}$/i.test(nen)) return "#ffffff";
  const l = doSang(nen);
  return 1.05 / (l + 0.05) >= (l + 0.05) / (doSang(M.chu) + 0.05) ? "#ffffff" : M.chu;
};
export const MAU_CON = ["#c2410c", "#4b6bdc", "#0f6b5c", "#6c5ce7", "#b45309", "#be185d"];
export const Avt = ({ ten, mau = MAU_CON[0], co = 44 }: { ten: string; mau?: string; co?: number }) => (
  <View style={{ width: co, height: co, borderRadius: co / 2, backgroundColor: mau, alignItems: "center", justifyContent: "center" }}>
    <Chu kieu="rat" mau={chuTren(mau)} co={co * 0.41}>{(ten.trim().split(/\s+/).pop() ?? "?").charAt(0).toUpperCase()}</Chu>
  </View>
);

// ---------------------------------------------------------------- danh sách, ô chọn

export const Nhom = ({ children }: { children: ReactNode }) => <View style={s.nhom}>{children}</View>;

export function NhomTieu({ chu, phai }: { chu: string; phai?: { chu: string; bam: () => void } }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 6, marginTop: 4, marginBottom: -4, gap: 8 }}>
      <Chu kieu="rat" co={13} mau={M.chu3} style={{ textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 1 }}>{chu}</Chu>
      {phai ? <Pressable onPress={phai.bam} hitSlop={10} accessibilityRole="button"><Chu kieu="rat" co={14} mau={M.chinhInk}>{phai.chu}</Chu></Pressable> : null}
    </View>
  );
}

/** `nguyHiem`: việc không đảo được (Xoá tài khoản) — tiêu đề màu M.loi. */
export function Dong({ tieu, phu, trai, phai, bam, dau, nguyHiem }: { tieu: string; phu?: string; trai?: ReactNode; phai?: ReactNode; bam?: () => void; dau?: boolean; nguyHiem?: boolean }) {
  const noi = (
    <View style={[s.dong, !dau && s.dongVien]}>
      {trai}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15.5} mau={nguyHiem ? M.loi : undefined}>{tieu}</Chu>
        {phu ? <Chu co={13.5} mau={M.chu3}>{phu}</Chu> : null}
      </View>
      {phai ?? (bam ? <Icon ten="phai" mau="#b3b5b1" co={18} /> : null)}
    </View>
  );
  return bam ? <Pressable onPress={bam} accessibilityRole="button" style={({ pressed }) => pressed && { backgroundColor: M.xamSoft }}>{noi}</Pressable> : noi;
}

export function OChon({ chon, bam, trai, tieu, phu }: { chon: boolean; bam: () => void; trai?: ReactNode; tieu: string; phu?: string }) {
  return (
    <Pressable onPress={bam} accessibilityRole="radio" accessibilityState={{ checked: chon }}
      style={[s.oChon, chon && { borderColor: M.chinh, backgroundColor: "#eef5f2" }]}>
      {trai}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15.5}>{tieu}</Chu>
        {phu ? <Chu co={13} mau={M.chu3}>{phu}</Chu> : null}
      </View>
      <View style={[s.tron, chon && { borderColor: M.chinh, backgroundColor: M.chinh }]}>{chon ? <View style={s.tronTam} /> : null}</View>
    </Pressable>
  );
}

/** Thanh chọn một (kit.chon_mot): ô rộng theo chữ, nhãn một dòng, thiếu chỗ thì ô xuống hàng. */
export function ChonMot<T extends string | number>({ ds, gia, doi }: { ds: { gia: T; chu: string }[]; gia: T; doi: (v: T) => void }) {
  return (
    <View style={s.chonMot} accessibilityRole="radiogroup">
      {ds.map((x) => (
        <Pressable key={String(x.gia)} onPress={() => doi(x.gia)} accessibilityRole="radio" accessibilityState={{ checked: x.gia === gia }}
          style={[s.chonO, x.gia === gia && s.chonOChon]}>
          <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 14, color: x.gia === gia ? M.chinhInk : M.chu2, lineHeight: 20 }}>{x.chu}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Chips<T extends string | number>({ ds, chon, doi }: { ds: { gia: T; chu: string }[]; chon: T[]; doi: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {ds.map((x) => {
        const c = chon.includes(x.gia);
        return (
          <Pressable key={String(x.gia)} onPress={() => doi(x.gia)} accessibilityRole="checkbox" accessibilityState={{ checked: c }}
            style={[s.chip, c && { borderColor: M.chinh, backgroundColor: "#eef5f2" }]}>
            <Text numberOfLines={1} style={{ fontFamily: F.dam, fontSize: 14.5, color: c ? M.chinhInk : M.chu2, lineHeight: 20 }}>{x.chu}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CongTac({ bat, doi, nhan }: { bat: boolean; doi: (v: boolean) => void; nhan: string }) {
  return (
    <Pressable onPress={() => doi(!bat)} accessibilityRole="switch" accessibilityLabel={nhan} accessibilityState={{ checked: bat }} hitSlop={8}
      style={[s.congTac, bat && { backgroundColor: M.chinh }]}>
      <View style={[s.congTacNut, { left: bat ? 23 : 3 }]} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- báo, tiến độ, số

const MAU_BAO = { canh: [M.canhSoft, "#6b3209"], loi: [M.loiSoft, "#7a1a12"], ok: [M.chinhSoft, "#0a5246"], lam: [M.lamSoft, "#1e3a8a"] } as const;
export function Bao({ loai = "canh", tieu, loi, ic = "canh_bao", children }: { loai?: keyof typeof MAU_BAO; tieu: string; loi?: string; ic?: TenIcon; children?: ReactNode }) {
  const [nen, chu] = MAU_BAO[loai];
  return (
    <View style={[s.bao, { backgroundColor: nen }]} accessibilityRole={loai === "loi" ? "alert" : undefined}>
      <View style={{ marginTop: 1 }}><Icon ten={ic} mau={chu} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Chu kieu="rat" co={14.5} mau={chu}>{tieu}</Chu>
        {loi ? <Chu co={14.5} mau={chu}>{loi}</Chu> : null}
        {children}
      </View>
    </View>
  );
}

export function TickDong({ chu, trang = "xong", phu }: { chu: string; trang?: "xong" | "cho" | "sau" | "x"; phu?: string }) {
  const dau = trang === "xong" ? <View style={[s.dauTd, { backgroundColor: M.chinh }]}><Icon ten="tick" mau="#fff" co={15} net={3} /></View>
    : trang === "cho" ? <View style={[s.dauTd, { borderWidth: 3, borderColor: "#d9d9d4", borderTopColor: M.chinh }]} />
      : trang === "sau" ? <View style={[s.dauTd, { borderWidth: 2, borderColor: "#c9cac6", borderStyle: "dashed" }]} />
        : <View style={[s.dauTd, { backgroundColor: M.canhSoft }]}><Chu kieu="rat" mau={M.canh}>!</Chu></View>;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, paddingHorizontal: 2 }}>
      {dau}
      <View style={{ flex: 1 }}><Chu co={15}>{chu}</Chu>{phu ? <Chu co={13} mau={M.chu3}>{phu}</Chu> : null}</View>
    </View>
  );
}

export function Buoc({ n, tong, nhan }: { n: number; tong: number; nhan?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 4 }}>
      <View style={{ flex: 1, flexDirection: "row", gap: 5 }}>
        {Array.from({ length: tong }, (_, k) => <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: k < n ? M.chinh : "#e4e4e0" }} />)}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 13, color: M.chu3 }}>{nhan ?? `Bước ${n}/${tong}`}</Text>
    </View>
  );
}

export const Tien = ({ ti, mau = M.chinh }: { ti: number; mau?: string }) => (
  <View style={s.tien} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, ti)) * 100) }}>
    <View style={{ width: `${Math.min(100, Math.max(0, ti * 100))}%`, height: "100%", borderRadius: 5, backgroundColor: mau }} />
  </View>
);

export function OSo({ nho, so, don, phu, noi, bam, children }: { nho: string; so: string | number; don?: string; phu?: string; noi?: boolean; bam?: () => void; children?: ReactNode }) {
  const nd = (
    <View style={[s.oSo, noi && { borderColor: "#f3c8bf", backgroundColor: "#fff8f6" }]}>
      <Chu kieu="dam" co={13} mau={M.chu3}>{nho}</Chu>
      <Text style={{ fontFamily: F.rat, fontSize: 24, color: M.chu, letterSpacing: -0.5, fontVariant: ["tabular-nums"], lineHeight: 30 }}>
        {so}{don ? <Text style={{ fontFamily: F.dam, fontSize: 14, color: M.chu3, letterSpacing: 0 }}>{don}</Text> : null}
      </Text>
      {phu ? <Chu co={13} mau={M.chu3}>{phu}</Chu> : null}
      {children}
    </View>
  );
  return bam ? <Pressable onPress={bam} accessibilityRole="button" style={{ flex: 1 }}>{nd}</Pressable> : <View style={{ flex: 1 }}>{nd}</View>;
}

export const Luoi2 = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>{children}</View>;

// ---------------------------------------------------------------- ô nhập

export function ONhap({ nhan, loi, ...p }: TextInputProps & { nhan: string; loi?: string | null }) {
  const [dang, setDang] = useState(false);
  return (
    <View>
      <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>{nhan}</Chu>
      <TextInput placeholderTextColor={M.chu3} accessibilityLabel={nhan} onFocus={() => setDang(true)} onBlur={() => setDang(false)}
        {...p} style={[s.o, dang && s.oDang, loi && s.oSai, p.style]} />
      {loi ? <Chu kieu="dam" co={13.5} mau={M.loi} style={{ marginTop: 6 }}>{loi}</Chu> : null}
    </View>
  );
}

/** Ô mã 6 số (kit .ma6): một ô nhập ẩn phía dưới, 6 ô hiển thị — bàn phím số, tự điền mã từ tin nhắn (oneTimeCode). */
export function Ma6({ gia, doi, nhan = "Mã xác thực 6 số" }: { gia: string; doi: (v: string) => void; nhan?: string }) {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={nhan} style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: 6 }, (_, k) => (
        <View key={k} style={[s.ma6, k === Math.min(gia.length, 5) && s.oDang]}><Chu kieu="rat" co={24} so>{gia[k] ?? ""}</Chu></View>
      ))}
      <TextInput ref={ref} value={gia} onChangeText={(t) => doi(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code"
        textContentType="oneTimeCode" maxLength={6} accessibilityLabel={nhan} autoFocus
        style={{ position: "absolute", opacity: 0.011, width: "100%", height: "100%", color: "transparent" }} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- khung màn

const NEN = { bm: [M.dauBaMe, M.nen], nhi: [M.dauNhi, M.nen], teen: [M.dauTeen, "#fbfbfd"] } as const;

/** Khung một màn (kit.man): nền gradient đầu màn, đầu (lùi / tiêu đề / bên phải) hoặc tiêu đề lớn, thân cuộn, nút dính đáy, nút chat nổi. */
export function Man({ children, nen = "bm", lui, tieu, tieuLon, phai, dau, day, tai, dangTai, chat, noi, khongCuon, cuonCuoi }: {
  children: ReactNode; nen?: keyof typeof NEN; lui?: { chu: string; ve?: string; bam?: () => void }; tieu?: string; tieuLon?: string; phai?: ReactNode;
  dau?: ReactNode; day?: ReactNode; tai?: () => void; dangTai?: boolean; chat?: boolean; noi?: ReactNode; khongCuon?: boolean; /** màn chat: luôn cuộn tới cuối khi nội dung / bàn phím đổi */ cuonCuoi?: boolean;
}) {
  const cuon = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {      // bàn phím mở ⇒ khung co lại: cuộn lại tới tin mới nhất
    if (!cuonCuoi) return;
    const sk = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setTimeout(() => cuon.current?.scrollToEnd({ animated: true }), 60));
    return () => sk.remove();
  }, [cuonCuoi]);
  const ve = () => (lui?.bam ? lui.bam() : lui?.ve ? router.replace(lui.ve as never) : router.canGoBack() ? router.back() : router.replace("/"));
  const dauMan = lui || tieu || phai ? (
    <View style={s.dau}>
      {lui ? (
        <Pressable onPress={ve} accessibilityRole="button" accessibilityLabel={lui.chu} hitSlop={6} style={s.lui}>
          <Icon ten="trai" mau={M.chinhInk} />
          <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 16, color: M.chinhInk }}>{lui.chu}</Text>
        </Pressable>
      ) : null}
      {tieu ? <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", fontFamily: F.rat, fontSize: 17, color: M.chu, paddingRight: lui ? 44 : 0 }}>{tieu}</Text> : <View style={{ flex: 1 }} />}
      {phai ? <View style={{ marginLeft: "auto", flexDirection: "row", gap: 4, alignItems: "center" }}>{phai}</View> : null}
    </View>
  ) : null;
  const than = (
    <>
      {tieuLon ? <Text style={s.tieuLon} accessibilityRole="header">{tieuLon}</Text> : null}
      {children}
    </>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: M.nen }} edges={["top", "left", "right"]}>
      <LinearGradient colors={NEN[nen] as unknown as [string, string]} locations={[0, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300 }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>   {/* Android: app.json để softwareKeyboardLayoutMode mặc định (resize) — hệ điều hành đã co cửa sổ, KAV thêm sẽ co hai lần */}
      {dauMan}
      {dau}
      {khongCuon ? <View style={[s.than, { flex: 1 }]}>{than}</View> : (
        <ScrollView ref={cuon} contentContainerStyle={[s.than, chat && { paddingBottom: 96 }]} keyboardShouldPersistTaps="handled"
          onContentSizeChange={cuonCuoi ? () => cuon.current?.scrollToEnd({ animated: true }) : undefined}
          refreshControl={tai ? <RefreshControl refreshing={!!dangTai} onRefresh={tai} tintColor={M.chinh} /> : undefined}>
          {than}
        </ScrollView>
      )}
      {day ? <View style={s.day}>{day}</View> : null}
      </KeyboardAvoidingView>
      {chat ? <NutChat coDay={!!day} /> : null}
      {noi ? <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: day ? 120 : 100, zIndex: Z.toast }}>{noi}</View> : null}
    </SafeAreaView>
  );
}

/** Ô soạn tin dính đáy cho màn chat (đặt trong `day` của Man để tránh bàn phím). */
export function OChat({ gia, doi, gui, dangChay, nhan }: { gia: string; doi: (t: string) => void; gui: () => void; dangChay?: boolean; nhan: string }) {
  const co = !!gia.trim();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1.5, borderColor: M.oNhap, borderRadius: 16, paddingLeft: 14, minHeight: 52 }}>
      <TextInput value={gia} onChangeText={doi} placeholder="Nhập tin nhắn…" placeholderTextColor={M.chu3} multiline maxLength={1000} accessibilityLabel={nhan}
        style={{ flex: 1, fontFamily: F.thuong, fontSize: 16, color: M.chu, paddingVertical: 12, maxHeight: 120 }} />
      <Pressable onPress={gui} disabled={!co || dangChay} accessibilityRole="button" accessibilityLabel="Gửi"
        style={{ width: 44, height: 44, borderRadius: 15, margin: 4, backgroundColor: co ? M.chinh : M.chinhSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon ten="gui" mau={co ? "#fff" : M.chinhInk} />
      </Pressable>
    </View>
  );
}

/** Nút nổi DUY NHẤT (kit .noi-chat): mặt Rob mở chat hỗ trợ với người thật của AiiLab. */
function NutChat({ coDay }: { coDay: boolean }) {
  return (
    <Pressable onPress={() => router.push("/ho-tro")} accessibilityRole="button" accessibilityLabel="Chat với AiiLab"
      style={[s.chat, { bottom: coDay ? 112 : 16 }]}>
      <Image source={LV["rob-goc"]} style={{ width: 90, height: 90, marginTop: -2 }} contentFit="cover" contentPosition="top" />
      <View style={s.chatCham} />
    </Pressable>
  );
}

/** Bảng trượt từ đáy (kit .phu + .bang-truot): nền phía sau tối mờ, bấm nền để đóng. */
export function BangTruot({ mo, dong, tieu, children }: { mo: boolean; dong: () => void; tieu: string; children: ReactNode }) {
  return (
    <Modal visible={mo} transparent animationType="slide" onRequestClose={dong}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(16,35,31,.38)" }} onPress={dong} accessibilityLabel="Đóng" />
      <View style={s.bangTruot}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: "#d4d5d1", alignSelf: "center" }} />
        <Chu kieu="rat" co={21} style={{ marginTop: 4, letterSpacing: -0.3 }}>{tieu}</Chu>
        {children}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------- trạng thái chung: đang tải / lỗi / mất mạng

export const cauLoi = (e: unknown) => (e instanceof LoiApi ? e.message : "AiiGrow gặp lỗi lạ khi làm việc này — thử lại; nếu vẫn vậy, chat với AiiLab.");
export const laMatMang = (e: unknown) => e instanceof LoiApi && e.ma === "mat_mang";

/** Khung xương đang tải (kit .xuong). */
export function XuongTai() {
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Đang tải" accessibilityRole="progressbar">
      <View style={[s.xuong, { height: 150, borderRadius: 28 }]} />
      <View style={[s.xuong, { height: 64 }]} />
      <View style={{ flexDirection: "row", gap: 10 }}><View style={[s.xuong, { flex: 1, height: 90 }]} /><View style={[s.xuong, { flex: 1, height: 90 }]} /></View>
      <View style={[s.xuong, { height: 120 }]} />
    </View>
  );
}

export const BangMang = ({ chu }: { chu: string }) => (
  <View style={s.bangMang} accessibilityRole="alert" accessibilityLiveRegion="polite">
    <Icon ten="wifi" mau="#f5c94a" />
    <Chu kieu="dam" co={13.5} mau="#fff" style={{ flex: 1 }}>{chu}</Chu>
  </View>
);

/** Chưa có dữ liệu: đang tải ⇒ khung xương; tải hỏng ⇒ cảnh lỗi + Thử lại (không quay mãi); mất mạng ⇒ Rob chờ + câu nói rõ. */
export function ChoTai({ loi, matMang, tai }: { loi?: string | null; matMang?: boolean; tai: () => void }) {
  if (!loi) return <XuongTai />;
  return (
    <CanhGiua lv={matMang ? "cho" : "trong-loi"} tieu={matMang ? "Đang chờ mạng" : "Chưa tải được"} loi={loi}>
      <Nut chu="Thử lại" bam={tai} loai="vien" rong />
    </CanhGiua>
  );
}

export const BaoLoi = ({ loi }: { loi?: string | null }) => (loi ? <Bao loai="loi" tieu={loi} ic="canh_bao" /> : null);

const CHO_MANG_MS = 5000;

/** Tải dữ liệu mỗi lần màn được mở lại. Mất mạng ⇒ `matMang`, tự tải lại mỗi 5 giây khi màn còn mở. */
export function useTai<T>(fn: () => Promise<T>) {
  const [d, setD] = useState<T | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [matMang, setMatMang] = useState(false);
  const [dangTai, setDangTai] = useState(false);
  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      setD(await fn());
      setLoi(null);
      setMatMang(false);
    } catch (e) {
      const mm = laMatMang(e);
      setMatMang(mm);
      setLoi(mm ? "Mất kết nối mạng — AiiGrow tự tải lại khi có mạng. Kiểm tra Wi‑Fi hoặc 4G." : cauLoi(e));
    } finally {
      setDangTai(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(useCallback(() => { tai(); }, [tai]));
  useFocusEffect(useCallback(() => {
    if (!matMang) return;
    const t = setInterval(tai, CHO_MANG_MS);
    return () => clearInterval(t);
  }, [matMang, tai]));
  return { d, loi, matMang, tai, dangTai, setD };
}

/** Một thao tác ghi: trạng thái đang chạy + lỗi hiện ngay dưới form. `hangDoi` CHỈ cho thao tác đặt trạng thái (gửi lại cùng kết quả). */
export function useLam() {
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const conMo = useRef(true);
  useEffect(() => () => { conMo.current = false; }, []);
  const lam = useCallback(async (fn: () => Promise<unknown>, o?: { hangDoi?: boolean }) => {
    setDangChay(true);
    setLoi(null);
    const het = Date.now() + 120_000;
    try {
      for (;;) {
        try {
          await fn();
          return true;
        } catch (e) {
          if (!conMo.current) return false;
          if (laMatMang(e) && o?.hangDoi && Date.now() < het) {
            setLoi("Mất kết nối mạng — chưa gửi được. AiiGrow đang chờ mạng và sẽ tự gửi lại; đừng thoát màn này.");
            await new Promise((r) => setTimeout(r, CHO_MANG_MS));
            if (!conMo.current) return false;
            continue;
          }
          setLoi(laMatMang(e) ? "Mất kết nối mạng — chưa gửi được, chưa có gì thay đổi. Có mạng lại thì bấm lần nữa." : cauLoi(e));
          return false;
        }
      }
    } finally {
      if (conMo.current) setDangChay(false);
    }
  }, []);
  return { dangChay, loi, lam, setLoi };
}

// ---------------------------------------------------------------- hoàn tác + báo khi quay về

const HOAN_TAC_MS = 8000;

/** Toast «Hoàn tác (n)» (kit .toast): `bao(chu, hoan?)` sau thao tác đã chạy; `guiCham(chu, lam)` cho thao tác không đảo được — gửi sau 8 giây. */
export function useHoanTac() {
  const [tb, setTb] = useState<{ chu: string; hoan?: () => void } | null>(null);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cho = useRef<(() => void) | null>(null);
  useEffect(() => () => { if (hen.current) clearTimeout(hen.current); cho.current?.(); }, []);
  const tat = () => { if (hen.current) clearTimeout(hen.current); hen.current = null; setTb(null); };
  /** Toast mới đè toast đang chờ gửi ⇒ gửi ngay việc đang chờ (không để mất lặng lẽ). */
  const guiNgay = () => { const f = cho.current; cho.current = null; f?.(); };
  const bao = useCallback((chu: string, hoan?: () => void) => {
    if (hen.current) clearTimeout(hen.current);
    guiNgay();
    setTb({ chu, hoan });
    hen.current = setTimeout(() => { hen.current = null; setTb(null); }, HOAN_TAC_MS);
  }, []);
  const guiCham = useCallback((chu: string, lam: () => void, huy?: () => void) => {
    if (hen.current) clearTimeout(hen.current);
    guiNgay();
    cho.current = lam;
    setTb({ chu, hoan: () => { cho.current = null; huy?.(); } });
    hen.current = setTimeout(() => { hen.current = null; setTb(null); const f = cho.current; cho.current = null; f?.(); }, HOAN_TAC_MS);
  }, []);
  const noi = tb ? (
    <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(120)} style={s.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon ten="tick" mau="#fff" />
      <Chu kieu="dam" co={14.5} mau="#fff" style={{ flex: 1 }}>{tb.chu}</Chu>
      {tb.hoan ? (
        <Pressable onPress={() => { const h = tb.hoan; tat(); h?.(); }} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 6 }}>
          <Chu kieu="rat" co={14.5} mau="#7fe0cf">Hoàn tác</Chu>
        </Pressable>
      ) : null}
    </Animated.View>
  ) : null;
  return { bao, guiCham, noi };
}

let baoSau: string | null = null;
export const baoKhiVe = (chu: string) => { baoSau = chu; };
export function useBaoKhiVe(bao: (chu: string) => void) {
  useFocusEffect(useCallback(() => {
    if (!baoSau) return;
    bao(baoSau);
    baoSau = null;
  }, [bao]));
}

/** Mốc thời gian cụ thể: hôm nay «19:32», ngày khác «21/10 19:32». */
export function gioPhut(d: Date | string | null | undefined): string {
  if (!d) return "";
  const t = new Date(d);
  const hh = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  return t.toDateString() === new Date().toDateString() ? hh : `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")} ${hh}`;
}
export const truoc = (d: Date | string | null | undefined) => {
  if (!d) return "";
  const p = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return p < 1 ? "vừa xong" : p < 60 ? `${p} phút trước` : p < 1440 ? `${Math.floor(p / 60)} giờ trước` : `${Math.floor(p / 1440)} ngày trước`;
};
export const tien = (n: number) => `${Math.round(n).toLocaleString("vi-VN").replace(/,/g, ".")}đ`;

export const Z = { base: 0, sticky: 10, dropdown: 20, modal: 30, toast: 40 } as const;

const s = StyleSheet.create({
  than: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 12 },
  dau: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingTop: 2, minHeight: 48 },
  lui: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, paddingHorizontal: 6 },
  tieuLon: { marginTop: 4, marginBottom: 6, marginHorizontal: 4, fontSize: 30, lineHeight: 34, fontFamily: F.rat, color: M.chu, letterSpacing: -0.6 },
  day: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 8, backgroundColor: M.nen },
  canh: { position: "relative", borderRadius: 28, padding: 18, marginBottom: 26, flexDirection: "row", alignItems: "center" },
  bong: { position: "relative", zIndex: 3, backgroundColor: "#fff", borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, maxWidth: "56%",
    shadowColor: M.chu, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  duoiBong: { position: "absolute", right: -7, top: "50%", marginTop: -8, width: 16, height: 16, backgroundColor: "#fff", transform: [{ rotate: "45deg" }], borderRadius: 3 },
  duoiBongTren: { position: "absolute", top: -7, left: "50%", marginLeft: -8, width: 16, height: 16, backgroundColor: "#fff", transform: [{ rotate: "45deg" }], borderRadius: 3 },
  canhRob: { position: "absolute", right: -4, bottom: -34, aspectRatio: 1, zIndex: 2 },
  nut: { minHeight: 52, paddingHorizontal: 20, borderRadius: BO.vua, alignItems: "center", justifyContent: "center" },
  nutNho: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14 },
  the: { backgroundColor: M.the, borderRadius: BO.the, borderWidth: 1, borderColor: M.vien,
    shadowColor: M.chu, shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  nhan: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, alignSelf: "flex-start" },
  diemPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: M.diemSoft, borderRadius: 99, paddingLeft: 6, paddingRight: 12, paddingVertical: 4, alignSelf: "flex-start" },
  xu: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#f5b70a", alignItems: "center", justifyContent: "center" },
  bieuTron: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  nhom: { backgroundColor: M.the, borderRadius: BO.the, overflow: "hidden", borderWidth: 1, borderColor: M.vien,
    shadowColor: M.chu, shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  dong: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 60 },
  dongVien: { borderTopWidth: 1, borderTopColor: "#efefec" },
  oChon: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, borderWidth: 1.5, borderColor: M.vien, backgroundColor: M.the },
  tron: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: M.oNhap, alignItems: "center", justifyContent: "center" },
  tronTam: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#fff" },
  chonMot: { flexDirection: "row", flexWrap: "wrap", gap: 4, backgroundColor: M.xamSoft, padding: 4, borderRadius: 16 },
  chonO: { flexGrow: 1, minHeight: 40, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  chonOChon: { backgroundColor: "#fff", shadowColor: M.chu, shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, borderColor: M.vien2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  congTac: { width: 50, height: 30, borderRadius: 99, backgroundColor: "#8a8f8c" },
  congTacNut: { position: "absolute", top: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  bao: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18 },
  dauTd: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  tien: { height: 10, borderRadius: 5, backgroundColor: "#e7e7e3", overflow: "hidden" },
  oSo: { padding: 14, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: M.vien, gap: 4, flexGrow: 1, minWidth: 140,
    shadowColor: M.chu, shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  o: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: M.oNhap, borderRadius: 16, paddingHorizontal: 14, minHeight: 52, fontSize: 16, fontFamily: F.thuong, color: M.chu },
  oDang: { borderColor: M.chinh, shadowColor: M.chinh, shadowOpacity: 0.16, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  oSai: { borderColor: M.loi },
  ma6: { width: 42, height: 54, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: M.vien2, alignItems: "center", justifyContent: "center" },
  chat: { position: "absolute", right: 14, width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff", overflow: "hidden", zIndex: 25, alignItems: "center",
    borderWidth: 2, borderColor: M.chinhSoft, shadowColor: M.chu, shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  chatCham: { position: "absolute", right: 4, bottom: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: M.chinh, borderWidth: 2, borderColor: "#fff" },
  bangTruot: { backgroundColor: M.nen, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 18, paddingBottom: 34, gap: 12 },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: M.chu, borderRadius: 18, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, minHeight: 52,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  xuong: { borderRadius: 20, backgroundColor: "#ecece8" },
  bangMang: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: M.chu, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
});
