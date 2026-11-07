// Bộ thành phần bản «Dịu» cho phía Con trên điện thoại (L16, thiết kế chốt 06/11 `docs/thiet-ke-chot/con-dt-*`, kit-diu.css).
// Token ở diu.ts — không dùng token Clay của Ba Mẹ. Mỗi thành phần chép đúng một lớp của kit: .tl/.phu (chữ), .b (nút 52), .the (thẻ),
// .ic3 (ô icon 56), .vong (vòng giờ), .phim/.cham4 (bàn phím PIN), .pill/.hh2 (nhãn), thanh tab 4 mục, tấm trượt «Đổi bé / Đăng xuất».
import React, { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Icon, Icon3D, Rob, type LinhVat, type TenIcon } from "./ui";
import { BONG_D, D, FD, KT, mauAvt } from "./diu";
import { useTre } from "./ui-tre";
import { chuAvt } from "./con-diu";

// ---------------------------------------------------------------- chữ

type KieuD = "dam" | "rat" | "den";
/** Chữ Nunito: `dam` 700 (thân), `rat` 800 (dòng tiêu, nút), `den` 900 (tiêu đề màn, số to). */
export function ChuD({ children, kieu = "dam", co = 15, mau = D.chu, dong, giua, style, so }: {
  children: ReactNode; kieu?: KieuD; co?: number; mau?: string; dong?: number; giua?: boolean; style?: StyleProp<TextStyle>; so?: boolean;
}) {
  return (
    <Text numberOfLines={dong} style={[{ fontFamily: FD[kieu], fontSize: co, lineHeight: Math.round(co * (co >= 24 ? 1.2 : 1.35)), color: mau },
      giua && { textAlign: "center" }, so && { fontVariant: ["tabular-nums"] }, style]}>{children}</Text>
  );
}
/** Tiêu đề màn (.tl 26/900, `nho` 22). */
export const TieuD = ({ chu, nho, giua, mau }: { chu: string; nho?: boolean; giua?: boolean; mau?: string }) => (
  <ChuD kieu="den" co={nho ? 22 : 26} giua={giua} mau={mau} style={{ letterSpacing: -0.3 }}>{chu}</ChuD>
);
/** Dòng phụ (.phu 15, chu2). */
export const PhuD = ({ chu, giua, mau = D.chu2, co = 15 }: { chu: string; giua?: boolean; mau?: string; co?: number }) => <ChuD co={co} mau={mau} giua={giua}>{chu}</ChuD>;

// ---------------------------------------------------------------- nút

export type LoaiNutD = "chinh" | "phu" | "chu" | "vang";
/** Nút (.b): `chinh` xanh đặc cao 52 · `phu` trắng viền mảnh · `chu` liên kết chữ (≥ 44) · `vang` (chỉ cho sao). */
export function NutD({ chu, bam, loai = "chinh", ic, dangChay, tat, nho, nhanDoc, style }: {
  chu: string; bam?: () => void; loai?: LoaiNutD; ic?: TenIcon; dangChay?: boolean; tat?: boolean; nho?: boolean; nhanDoc?: string; style?: StyleProp<ViewStyle>;
}) {
  const khoa = tat || dangChay || !bam;
  if (loai === "chu") {
    return (
      <Pressable onPress={bam} disabled={khoa} accessibilityRole="button" accessibilityLabel={nhanDoc ?? chu} hitSlop={6}
        style={[{ minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, style]}>
        <ChuD kieu="rat" co={15} mau={tat ? D.chu3 : D.chu2} giua>{chu}</ChuD>
      </Pressable>
    );
  }
  const nen = loai === "chinh" ? D.xanh : loai === "vang" ? D.sao : D.the;
  const mauChu = loai === "chinh" ? "#fff" : loai === "vang" ? "#3a2a00" : D.chu;
  return (
    <Pressable onPress={bam} disabled={khoa} accessibilityRole="button" accessibilityLabel={nhanDoc ?? chu} accessibilityState={{ disabled: !!tat, busy: !!dangChay }}
      style={({ pressed }) => [{ height: nho ? KT.nutNho : KT.nut, borderRadius: (nho ? KT.nutNho : KT.nut) / 2, backgroundColor: nen, flexDirection: "row",
        alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16, alignSelf: "stretch",
        boxShadow: loai === "phu" ? BONG_D.the : loai === "chinh" ? BONG_D.nut : undefined, borderWidth: loai === "phu" ? 1 : 0, borderColor: D.vien,
        opacity: tat ? 0.5 : pressed ? 0.88 : 1, transform: [{ scale: pressed && !khoa ? 0.98 : 1 }] }, style]}>
      {dangChay ? <ActivityIndicator color={mauChu} /> : ic ? <Icon3D ten={ic} co={26} /> : null}
      <ChuD kieu="rat" co={nho ? 15.5 : 17} mau={mauChu} dong={1}>{chu}</ChuD>
    </Pressable>
  );
}

/** Nút tròn lùi (.lui 46). */
export function NutLui({ ve, bam }: { ve?: string; bam?: () => void }) {
  const lui = bam ?? (() => (ve ? router.replace(ve as never) : router.canGoBack() ? router.back() : router.replace("/tre/nha")));
  return (
    <Pressable onPress={lui} accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={6}
      style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: D.the, borderWidth: 1, borderColor: D.vien, alignItems: "center", justifyContent: "center",
        boxShadow: "0px 1px 3px rgba(30,30,20,0.08)" }}>
      <Icon ten="trai" co={20} mau={D.chu} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- thẻ, ô icon, nhãn

/** Thẻ trắng (.the): bo 24, viền mảnh, bóng xám mềm. `vang` = thẻ vàng nhạt (sao) — tối đa một thẻ màu mỗi màn. */
export function TheD({ children, vang, xanh, mong, bam, style, nhanDoc }: {
  children: ReactNode; vang?: boolean; xanh?: boolean; mong?: boolean; bam?: () => void; style?: StyleProp<ViewStyle>; nhanDoc?: string;
}) {
  const st: StyleProp<ViewStyle> = [{ padding: mong ? 12 : 16, paddingHorizontal: mong ? 14 : 16, borderRadius: KT.bo, borderWidth: 1, gap: 10,
    backgroundColor: vang ? D.vang : xanh ? D.xanhN : D.the, borderColor: vang ? D.vangVien : xanh ? "#cfe8d9" : D.vien,
    boxShadow: vang || xanh ? undefined : BONG_D.the }, style];
  if (!bam) return <View style={st} accessibilityLabel={nhanDoc}>{children}</View>;
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={nhanDoc} style={({ pressed }) => [st, pressed && { opacity: 0.9 }]}>{children}</Pressable>
  );
}

/** Ô icon (.ic3): vuông bo 18 nền kem đậm, icon 3D 40. */
export const IcO = ({ ic, co = 56, nen = D.ic }: { ic: TenIcon; co?: number; nen?: string }) => (
  <View style={{ width: co, height: co, borderRadius: co * 0.32, backgroundColor: nen, alignItems: "center", justifyContent: "center" }}>
    <Icon3D ten={ic} co={co * 0.7} />
  </View>
);

/** Dòng thẻ: ô icon + tiêu đề 17/800 + dòng phụ 14 + phần phải. */
export function DongD({ ic, tieu, phu, phai, bam, nhan, mo }: { ic?: TenIcon; tieu: string; phu?: string; phai?: ReactNode; bam?: () => void; nhan?: ReactNode; mo?: boolean }) {
  return (
    <TheD bam={bam} mong nhanDoc={phu ? `${tieu}. ${phu}` : tieu}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: mo ? 0.6 : 1 }}>
        {ic ? <IcO ic={ic} co={52} /> : null}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <ChuD kieu="rat" co={17} dong={1}>{tieu}</ChuD>
          {phu ? <ChuD co={14} mau={D.chu2} dong={2}>{phu}</ChuD> : null}
          {nhan ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>{nhan}</View> : null}
        </View>
        {phai}
        {bam && !phai ? <Icon ten="phai" co={18} mau={D.chu3} /> : null}
      </View>
    </TheD>
  );
}

export type LoaiPill = "xam" | "xanh" | "cho" | "vang" | "loi";
/** Nhãn nhỏ (.pill / .hh2): `cho` = ⏳ chờ (xám đặc chữ trắng), `xanh` = xong, `vang` = sao. */
export function PillD({ chu, loai = "xam", ic }: { chu: string; loai?: LoaiPill; ic?: TenIcon }) {
  const [nen, mau] = loai === "cho" ? [D.cho, "#fff"] : loai === "xanh" ? [D.xanhN, D.xanhD] : loai === "vang" ? [D.vang, D.saoInk]
    : loai === "loi" ? [D.loiN, D.loi] : [D.xamNhat, D.chu2];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: nen, alignSelf: "flex-start" }}>
      {ic ? <Icon3D ten={ic} co={16} /> : null}
      <ChuD kieu="den" co={13} mau={mau} dong={1}>{chu}</ChuD>
    </View>
  );
}

/** Viên sao «★ +10» / «★ 50» (vàng chỉ cho sao). */
export const SaoD = ({ chu, mo }: { chu: string; mo?: boolean }) => (
  <View accessibilityLabel={`${chu} sao`} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingLeft: 6, paddingRight: 10, borderRadius: 16,
    backgroundColor: mo ? D.xamNhat : D.vang, borderWidth: 1, borderColor: mo ? D.vien : D.vangVien }}>
    <Icon3D ten="sao" co={20} />
    <ChuD kieu="den" co={14} mau={mo ? D.chu2 : D.saoInk} so>{chu}</ChuD>
  </View>
);

/** Chip tròn nhẹ (.pill 32): «Giờ học 17:00–18:00», «Ngủ 21:30». */
export const ChipD = ({ chu, ic, bam }: { chu: string; ic?: TenIcon; bam?: () => void }) => {
  const nd = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: D.xamNhat }}>
      {ic ? <Icon3D ten={ic} co={20} /> : null}
      <ChuD kieu="rat" co={13.5} mau={D.chu2} dong={1}>{chu}</ChuD>
    </View>
  );
  return bam ? <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={chu} style={{ minHeight: 44, justifyContent: "center" }}>{nd}</Pressable> : nd;
};

// ---------------------------------------------------------------- avatar, chip tên «Bảo Anh ▾»

/** Avatar chữ cái đầu (.av): tròn, viền trắng 4, màu theo thứ tự bé. */
export const AvtD = ({ ten, i = 0, co = 96, chu }: { ten: string; i?: number; co?: number; chu?: string }) => (
  <View style={{ width: co, height: co, borderRadius: co / 2, backgroundColor: mauAvt(i), alignItems: "center", justifyContent: "center",
    borderWidth: co >= 60 ? 4 : 2, borderColor: "#fff", boxShadow: co >= 60 ? "0px 4px 12px rgba(30,30,20,0.14)" : undefined }}>
    <Text style={{ fontFamily: FD.den, fontSize: co * 0.46, color: "#fff", lineHeight: co * 0.6 }}>{chu ?? chuAvt(ten)}</Text>
  </View>
);

/** Chip «Bảo Anh ▾» dưới lời chào: chạm mở tấm «Đổi bé / Đăng xuất» (PIN 06/11 — them-j424uyis). */
export function ChipTen({ ten, i = 0, doiBe, dangXuat }: { ten: string; i?: number; doiBe: () => void | Promise<void>; dangXuat: () => void | Promise<void> }) {
  const [mo, setMo] = useState(false);
  return (
    <>
      <Pressable onPress={() => setMo(true)} accessibilityRole="button" accessibilityLabel={`${ten} — đổi bé hoặc đăng xuất`}
        style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingLeft: 4, paddingRight: 12, borderRadius: 20,
          backgroundColor: D.the, borderWidth: 1, borderColor: D.vien, boxShadow: BONG_D.the }}>
        <AvtD ten={ten} i={i} co={32} />
        <ChuD kieu="rat" co={15}>{ten}</ChuD>
        <Text style={{ fontFamily: FD.rat, fontSize: 13, color: D.chu2 }}>▾</Text>
      </Pressable>
      <TamTruot mo={mo} dong={() => setMo(false)} nhan="Đổi bé hoặc đăng xuất">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AvtD ten={ten} i={i} co={52} />
          <View style={{ flex: 1 }}>
            <ChuD kieu="den" co={18}>{ten}</ChuD>
            <ChuD co={14} mau={D.chu2}>Đang dùng máy này</ChuD>
          </View>
        </View>
        <NutD chu="Đổi bé" loai="phu" ic="nguoi" bam={() => { setMo(false); doiBe(); }} />
        <NutD chu="Đăng xuất" ic="thoat" bam={() => { setMo(false); dangXuat(); }} />
        <ChuD co={13.5} mau={D.chu2} giua>{"Đăng xuất thì máy khoá lại.\nVào lại bằng tên + PIN."}</ChuD>
        <NutD chu="Ở lại" loai="chu" bam={() => setMo(false)} />
      </TamTruot>
    </>
  );
}

/** Tấm trượt từ đáy (nền mờ, thẻ trắng bo 28 trên, tay nắm). */
export function TamTruot({ mo, dong, nhan, children }: { mo: boolean; dong: () => void; nhan: string; children: ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={mo} transparent animationType="slide" onRequestClose={dong} accessibilityViewIsModal>
      <Pressable onPress={dong} accessibilityLabel="Đóng" style={{ flex: 1, backgroundColor: "rgba(31,42,55,0.38)" }} />
      <View accessibilityLabel={nhan} style={{ backgroundColor: D.the, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: KT.le, paddingTop: 10,
        paddingBottom: Math.max(ins.bottom, 16), gap: 12 }}>
        <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: D.vien2, marginBottom: 4 }} />
        {children}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------- vòng giờ, thanh tiến độ

/** Vòng giờ (.vong): rãnh kem + cung xanh, số to ở giữa («18» / «phút»). `toi` = nền đêm. */
export function VongD({ ti, so, don, co = 112, day = 12, toi }: { ti: number; so: string; don?: string; co?: number; day?: number; toi?: boolean }) {
  const r = co / 2 - day / 2, c = co / 2, cv = 2 * Math.PI * r, t = Math.min(1, Math.max(0, ti || 0));
  return (
    <View style={{ width: co, height: co, alignItems: "center", justifyContent: "center" }} accessibilityRole="progressbar"
      accessibilityLabel={`${so} ${don ?? ""}`.trim()} accessibilityValue={{ min: 0, max: 100, now: Math.round(t * 100) }}>
      <Svg width={co} height={co} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={c} cy={c} r={r} stroke={toi ? D.demThe : D.ranh} strokeWidth={day} fill="none" />
        {t > 0 ? <Circle cx={c} cy={c} r={r} stroke={D.xanh} strokeWidth={day} fill="none" strokeDasharray={`${cv * t} ${cv}`} strokeLinecap="round" /> : null}
      </Svg>
      <Text style={{ fontFamily: FD.den, fontSize: co * 0.34, lineHeight: co * 0.38, color: toi ? D.demChu : D.chu, fontVariant: ["tabular-nums"] }}>{so}</Text>
      {don ? <ChuD kieu="rat" co={Math.max(12, co * 0.12)} mau={toi ? D.demChu2 : D.chu2}>{don}</ChuD> : null}
    </View>
  );
}

/** Thanh tiến độ xanh (rãnh kem). */
export const ThanhD = ({ ti, mau = D.xanh }: { ti: number; mau?: string }) => (
  <View style={{ height: 8, borderRadius: 4, backgroundColor: D.ranh, overflow: "hidden" }} accessibilityRole="progressbar"
    accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, ti)) * 100) }}>
    <View style={{ width: `${Math.round(Math.min(1, Math.max(0, ti)) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: mau }} />
  </View>
);

// ---------------------------------------------------------------- PIN, mã 6 số, bàn phím số

/** Bốn chấm PIN (.cham4): chấm đã gõ tô xanh; `loi` = viền đỏ nhạt. */
export const Cham4 = ({ n, tong = 4, loi }: { n: number; tong?: number; loi?: boolean }) => (
  <View style={{ flexDirection: "row", gap: 20, justifyContent: "center" }} accessibilityLabel={`Đã nhập ${n} trên ${tong} số`}>
    {Array.from({ length: tong }, (_, k) => (
      <View key={k} style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: loi ? D.loi : k < n ? D.xanh : D.vien2,
        backgroundColor: k < n ? (loi ? D.loi : D.xanh) : "transparent" }} />
    ))}
  </View>
);

/** Ô mã 6 số (nhập mã ghép / mã Ba Mẹ): số gõ hiện rõ (mã đọc từ máy Ba Mẹ, không bí mật). */
export const O6 = ({ gia, loi, so = 6 }: { gia: string; loi?: boolean; so?: number }) => (
  <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }} accessibilityLabel={`Mã đã gõ: ${gia.split("").join(" ") || "trống"}`}>
    {Array.from({ length: so }, (_, k) => (
      <View key={k} style={{ width: 46, height: 58, borderRadius: 14, backgroundColor: D.the, borderWidth: k === Math.min(gia.length, so - 1) && !loi ? 2 : 1.5,
        borderColor: loi ? D.loi : k === Math.min(gia.length, so - 1) ? D.xanh : D.vien, alignItems: "center", justifyContent: "center", boxShadow: BONG_D.phim }}>
        <Text style={{ fontFamily: FD.den, fontSize: 28, color: loi ? D.loi : D.chu }}>{gia[k] ?? ""}</Text>
      </View>
    ))}
  </View>
);

/** Bàn phím số to (.phim 3×4, phím tròn 74): `go(so)` mỗi số, `xoa()` lùi một số. `nho` = phím 64 cho màn thấp. */
export function BanPhim({ go, xoa, tat, nho }: { go: (k: string) => void; xoa: () => void; tat?: boolean; nho?: boolean }) {
  const co = nho ? 64 : 74;
  const phim = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "x"];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", width: co * 3 + 28 * 2, columnGap: 28, rowGap: nho ? 10 : 12, alignSelf: "center", opacity: tat ? 0.45 : 1 }}>
      {phim.map((k, i) => !k ? <View key={i} style={{ width: co, height: co }} /> : (
        <Pressable key={i} disabled={tat} onPress={() => (k === "x" ? xoa() : go(k))} accessibilityRole="keyboardkey" accessibilityLabel={k === "x" ? "Xoá một số" : k}
          style={({ pressed }) => [{ width: co, height: co, borderRadius: co / 2, alignItems: "center", justifyContent: "center" },
            k !== "x" && { backgroundColor: pressed ? D.xanhN : D.the, borderWidth: 1, borderColor: D.vien, boxShadow: BONG_D.phim }]}>
          {k === "x" ? <Text style={{ fontFamily: FD.den, fontSize: 26, color: D.chu2 }}>⌫</Text>
            : <Text style={{ fontFamily: FD.rat, fontSize: nho ? 26 : 30, color: D.chu }}>{k}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

/** Bước đánh số (1 · 2 · 3) của màn hướng dẫn: số tròn xanh nhạt + tiêu + phụ. */
export const BuocD = ({ n, tieu, phu, cuoi }: { n: number; tieu: string; phu?: string; cuoi?: boolean }) => (
  <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", paddingBottom: cuoi ? 0 : 4 }}>
    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: D.xanhN, alignItems: "center", justifyContent: "center" }}>
      <ChuD kieu="den" co={15} mau={D.xanhD}>{String(n)}</ChuD>
    </View>
    <View style={{ flex: 1, gap: 1, paddingTop: 3 }}>
      <ChuD kieu="rat" co={16}>{tieu}</ChuD>
      {phu ? <ChuD co={14} mau={D.chu2}>{phu}</ChuD> : null}
    </View>
  </View>
);

/** Chọn MỘT trong vài chip lớn (10 sao · 20 sao · 30 sao / 15 · 30 · 60 phút): chọn = nền xanh nhạt viền xanh. */
export function ChonD<T extends string | number>({ ds, gia, doi, nhan }: { ds: { gia: T; chu: string; tat?: boolean }[]; gia: T | null; doi: (v: T) => void; nhan: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }} accessibilityRole="radiogroup" accessibilityLabel={nhan}>
      {ds.map((x) => {
        const c = x.gia === gia;
        return (
          <Pressable key={String(x.gia)} onPress={() => doi(x.gia)} disabled={x.tat} accessibilityRole="radio" accessibilityState={{ checked: c, disabled: !!x.tat }}
            style={{ flexGrow: 1, flexBasis: 0, minWidth: 84, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: c ? 2 : 1,
              borderColor: c ? D.xanh : D.vien, backgroundColor: c ? D.xanhN : D.the, opacity: x.tat ? 0.45 : 1, boxShadow: c ? undefined : BONG_D.the }}>
            <ChuD kieu="den" co={16} mau={c ? D.xanhD : D.chu}>{x.chu}</ChuD>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- khung màn + thanh tab

export type TabD = "nha" | "nhiem-vu" | "vi-qua" | "tin";
const MUC_TAB: { ma: TabD; ic: TenIcon; chu: string }[] = [
  { ma: "nha", ic: "nha", chu: "Hôm nay" }, { ma: "nhiem-vu", ic: "sao", chu: "Nhiệm vụ" },
  { ma: "vi-qua", ic: "qua", chu: "Sao & quà" }, { ma: "tin", ic: "tin", chu: "Tin nhắn" },
];

/** Thanh tab 4 mục (Hôm nay · Nhiệm vụ · Sao & quà · Tin nhắn): thẻ trắng nổi, mục đang chọn nền xanh chữ trắng. */
export function ThanhTabD({ dang, soTin: so }: { dang: TabD; soTin?: number }) {
  const ins = useSafeAreaInsets();
  const { soTin: soCtx } = useTre();
  const soTin = so ?? soCtx;
  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: Math.max(ins.bottom - 4, 10), backgroundColor: D.nen }}>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: D.the, borderRadius: 26, padding: 6, gap: 4, borderWidth: 1, borderColor: D.vien,
        boxShadow: BONG_D.noi }}>
        {MUC_TAB.map((m) => {
          const d = m.ma === dang;
          return (
            <Pressable key={m.ma} onPress={() => (d ? null : router.replace(`/tre/${m.ma}` as never))} accessibilityRole="tab" accessibilityState={{ selected: d }}
              accessibilityLabel={m.ma === "tin" && soTin ? `${m.chu}, ${soTin} tin mới` : m.chu}
              style={{ flex: 1, minWidth: 0, minHeight: 56, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: d ? D.xanh : "transparent" }}>
              <View><Icon3D ten={m.ic} co={26} />
                {m.ma === "tin" && soTin ? (
                  <View style={{ position: "absolute", right: -10, top: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#e5484d", alignItems: "center",
                    justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: D.the }}>
                    <Text style={{ fontFamily: FD.den, fontSize: 10, color: "#fff" }}>{soTin}</Text>
                  </View>
                ) : null}
              </View>
              <ChuD kieu="rat" co={12} mau={d ? "#fff" : D.chu2} dong={1}>{m.chu}</ChuD>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Khung màn Dịu: nền kem phẳng, đầu màn (nút lùi + tiêu đề + phần phải), thân cuộn (lề 16, khoảng 12), vùng nút dưới, thanh tab.
 *  `toi` = giờ ngủ (nền đêm dịu). `giua` = thân căn giữa dọc (màn cảm xúc: chào, chờ, lỗi). */
export function ManD({ children, lui, tieu, tieuNho, phai, tab, soTin, day, toi, giua, cuon = true }: {
  children?: ReactNode; lui?: string | true | (() => void); tieu?: string; tieuNho?: boolean; phai?: ReactNode; tab?: TabD; soTin?: number; day?: ReactNode;
  toi?: boolean; giua?: boolean; cuon?: boolean;
}) {
  const nen = toi ? D.dem : D.nen;
  const coDau = !!(lui || tieu || phai);
  const dau = coDau ? (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 }}>
      {lui ? <NutLui ve={typeof lui === "string" ? lui : undefined} bam={typeof lui === "function" ? lui : undefined} /> : null}
      {tieu ? <View style={{ flex: 1, minWidth: 0 }}><TieuD chu={tieu} nho={tieuNho || !!lui} mau={toi ? D.demChu : undefined} /></View> : <View style={{ flex: 1 }} />}
      {phai}
    </View>
  ) : null;
  const than = (
    <View style={[{ gap: KT.khoang, paddingHorizontal: KT.le, paddingTop: 2, paddingBottom: 14 }, giua && { flexGrow: 1, justifyContent: "center" }]}>{children}</View>
  );
  return (
    <SafeAreaView edges={tab ? ["top"] : ["top", "bottom"]} style={{ flex: 1, backgroundColor: nen }}>
      {dau ? <View style={{ paddingHorizontal: KT.le, paddingTop: 4 }}>{dau}</View> : null}
      {cuon ? <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{than}</ScrollView>
        : <View style={{ flex: 1 }}>{than}</View>}
      {day ? <View style={{ paddingHorizontal: KT.le, paddingTop: 8, paddingBottom: tab ? 4 : 12, gap: 8, backgroundColor: nen }}>{day}</View> : null}
      {tab ? <ThanhTabD dang={tab} soTin={soTin} /> : null}
    </SafeAreaView>
  );
}

/** Màn cảm xúc căn giữa: Rob (chỉ ở màn chào / chờ / lỗi / xong) + tiêu đề + câu phụ + phần thêm. */
export function CamXuc({ lv, ic, tieu, phu, children, co = 150, toi }: { lv?: LinhVat; ic?: TenIcon; tieu: string; phu?: string; children?: ReactNode; co?: number; toi?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      {lv ? <Rob ten={lv} co={co} /> : ic ? <IcO ic={ic} co={84} nen={toi ? D.demThe : D.ic} /> : null}
      <TieuD chu={tieu} giua mau={toi ? D.demChu : undefined} />
      {phu ? <PhuD chu={phu} giua mau={toi ? D.demChu2 : D.chu2} /> : null}
      {children}
    </View>
  );
}

/** Băng mất mạng (nhẹ, xám ấm + wifi): «Mất mạng rồi. Ảnh vẫn còn nhé!». */
export const MatMangD = ({ chu }: { chu: string }) => (
  <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 18, backgroundColor: D.xamNhat }}>
    <Icon3D ten="wifi" co={26} />
    <ChuD kieu="rat" co={14} mau={D.chu2} style={{ flex: 1 }}>{chu}</ChuD>
  </View>
);

/** Lỗi ngắn dưới nút (đỏ dịu). */
export const LoiD = ({ loi }: { loi?: string | null }) => (loi ? (
  <View accessibilityRole="alert" style={{ padding: 12, borderRadius: 16, backgroundColor: D.loiN }}>
    <ChuD kieu="rat" co={14} mau={D.loi} giua>{loi}</ChuD>
  </View>
) : null);

/** Đang tải / lỗi tải (thay ChoTai của Ba Mẹ). */
export function ChoD({ loi, matMang, tai }: { loi?: string | null; matMang?: boolean; tai: () => void }) {
  if (!loi && !matMang) return <View style={{ paddingVertical: 80, alignItems: "center" }}><ActivityIndicator color={D.xanh} size="large" /></View>;
  return (
    <View style={{ paddingVertical: 40, gap: 16 }}>
      <CamXuc lv="trong-loi" co={130} tieu={matMang ? "Mất mạng rồi" : "Chưa tải được"} phu={matMang ? "Không sao, máy vẫn chạy nha! Bật Wi‑Fi rồi thử lại." : loi ?? ""} />
      <NutD chu="Thử lại" bam={tai} />
    </View>
  );
}

/** Đếm ngược giây (chờ 15 giây sau 5 lần sai PIN, mã còn N phút…). → số giây còn lại, 0 khi hết. */
export function useDemNguoc(denMs: number | null) {
  const [bay, setBay] = useState(() => Date.now());
  useEffect(() => {
    if (!denMs) return;
    // dừng hẳn khi đã qua mốc (không vẽ lại 4 lần/giây mãi)
    const t = setInterval(() => { const b = Date.now(); setBay(b); if (b >= denMs) clearInterval(t); }, 250);
    return () => clearInterval(t);
  }, [denMs]);
  return denMs ? Math.max(0, Math.ceil((denMs - bay) / 1000)) : 0;
}

/** «0:15» / «12:04». */
export const mmss = (giay: number) => `${Math.floor(giay / 60)}:${String(Math.floor(giay % 60)).padStart(2, "0")}`;
