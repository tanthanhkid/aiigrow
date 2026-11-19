// Thành phần dùng chung cho hành trình «Lần đầu dùng» + «Ghép thêm máy» của Ba Mẹ (thiết kế chốt 04/11 — docs/thiet-ke-chot/bm-lan-dau,
// bm-ghep-may). Chỉ dựng lại các mảnh thiết kế có mà kit chưa có: thanh 4 bước bằng icon, nút đăng nhập Google/Facebook (hình — nối OAuth ở
// dang-nhap-mxh.tsx), ô mật khẩu có mắt, mã ghép 6 số to, hàng chia sẻ link (Zalo / Tin nhắn / Messenger / Sao chép / Khác), 3 bước trên máy Con,
// ô icon app trong lưới, bánh xe chọn giờ. Màu / bóng / men lấy token Clay (mau.ts, clay.ts) — không chép CSS thô của HTML thiết kế.
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Image } from "expo-image";
import { ICON_3D, type Ten3D } from "./icon-3d";
import { Linking, Platform, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { router } from "expo-router";
import { SvgXml } from "react-native-svg";
import { BONG, BO_CLAY, KHOI, KHOI_HERO, MEN, HERO } from "./clay";
import { saoChep } from "./luu-tep";
import { MAU_HO_SO } from "./mau";
import { Chu, F, Icon, Icon3D, LopMen, LV, M, NhanMen, Rob, type LinhVat, type TenIcon } from "./ui";

/** Màu chữ phụ của bàn «Ánh kim» (`--ink2` / `--ink3`) — chữ phụ lần đầu theo đúng bàn. */
export const INK2 = "#5b5248";

/** Ảnh icon 3D theo tên tệp (kể cả icon chỉ có bản 3D như «lap_lanh», không có trong bộ icon đặc). */
export const Anh3D = ({ ten, co = 22 }: { ten: Ten3D; co?: number }) => (
  <Image cachePolicy="memory-disk" source={ICON_3D[ten]} style={{ width: co, height: co }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
);

// ---------------------------------------------------------------- thanh bước + đầu màn

/** 4 bước Lần đầu (thiết kế: icon người · sao · đồng hồ · máy tính): bước xong hiện dấu tick, bước đang làm navy viền vàng mật (bàn Navy 17/11). */
const BUOC_IC: TenIcon[] = ["nguoi", "sao", "dongho", "may_tinh"];
export function ThanhBuoc({ dang, ic }: { dang: number; /** đổi icon bước đang làm (vd «khien» ở màn Chọn app) */ ic?: TenIcon }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="progressbar" accessibilityLabel={`Bước ${dang + 1} trên 4`}>
      {BUOC_IC.map((t, i) => (
        <View key={t} style={[{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
          i === dang ? { backgroundColor: M.chinh, boxShadow: `0px 0px 0px 2.5px ${M.diem}, ${BONG.nho}` } : { backgroundColor: M.ranh, boxShadow: BONG.lom }]}>
          <View style={{ opacity: i <= dang ? 1 : 0.45 }}><Icon3D ten={i < dang ? "tick" : i === dang && ic ? ic : t} co={20} /></View>
        </View>
      ))}
    </View>
  );
}

/** Hàng đầu màn: nút lùi (mũi tên) bên trái + phần phải (thanh bước / «Cần giúp?»). `ve` = đường thay khi không lùi được. */
export function DauMan({ ve, phai, khongLui, bamLui, tieu, giua }: { ve?: string; phai?: ReactNode; khongLui?: boolean; bamLui?: () => void; /** tiêu đề cạnh nút lùi */ tieu?: string;
  /** khối giữa thanh đầu (vd vạch tiến độ 2 bước — bàn them-2g3zpiie) */ giua?: ReactNode }) {
  const lui = () => (bamLui ? bamLui() : router.canGoBack() ? router.back() : router.replace((ve ?? "/") as never));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingRight: 16, minHeight: 48 }}>
      {khongLui ? <View style={{ width: 44 }} /> : (
        <Pressable onPress={lui} accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={6} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Icon ten="trai" mau={M.chinhInk} co={24} />
        </Pressable>
      )}
      {tieu ? <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, minWidth: 0, fontFamily: F.tieu, fontSize: 22, color: M.chu, letterSpacing: -0.4 }}>{tieu}</Text> : null}
      {giua ? <View style={{ flex: 1, alignItems: "center" }}>{giua}</View> : null}
      {phai}
    </View>
  );
}

/** Nút «?» tròn góc phải ⇒ chat AiiLab hỗ trợ (màn Ghép máy). */
// bàn bm1-ob-ghep v23: nút tròn trắng chữ «?» ngọc ⇒ «Hỏi AiiGrow» (them-zxu4yvp3)
export const NutHoi = () => (
  <Pressable onPress={() => router.push("/hoi-aiigrow")} accessibilityRole="button" accessibilityLabel="Cần giúp?" hitSlop={6}
    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.nho }}>
    <Chu kieu="rat" co={18} mau={M.chinhInk}>?</Chu>
  </Pressable>
);

/** Liên kết «Cần giúp?» góc phải đầu màn ⇒ chat AiiLab hỗ trợ. */
export const CanGiup = () => (
  <Pressable onPress={() => router.push("/ho-tro")} accessibilityRole="link" hitSlop={8} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
    <Chu kieu="rat" co={14} mau={M.chinhInk}>Cần giúp?</Chu>
  </Pressable>
);

/** Tiêu đề lớn của màn (thiết kế: 26–28px, đậm). */
export const TieuDe = ({ chu, phu, dam, giua, co = 27 }: { chu: string; phu?: string; /** phần in đậm nối sau `phu` (vd số điện thoại — bm1-otp) */ dam?: string;
  giua?: boolean; co?: number }) => (
  <View style={{ gap: 4, alignItems: giua ? "center" : undefined }}>
    <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: co, lineHeight: Math.round(co * 1.18), letterSpacing: -0.5, color: M.chu, textAlign: giua ? "center" : undefined }}>{chu}</Text>
    {phu ? <Chu co={15} mau={M.chu2} style={giua ? { textAlign: "center" } : undefined}>{phu}{dam ? <Chu kieu="rat" co={15} so>{dam}</Chu> : null}</Chu> : null}
  </View>
);

/** Cảnh đầu màn kiểu thiết kế mới: khối ngọc nhạt, bong bóng trắng (tiêu đề + 1 câu) bên trái, Grow bên phải.
 *  `chuTo`: kiểu «Đăng nhập» (bm-dang-nhap/01) — không bong bóng, tiêu đề 26/800 + câu 14.5 thẳng trên thẻ cao 176, Grow 150 tràn đáy. */
export function CanhRob({ lv, tieu, loi, ic, cao = 150, chuTo, robTrai, bongTo }: { lv: LinhVat; tieu: string; loi?: string; ic?: TenIcon; cao?: number; chuTo?: boolean;
  /** kiểu bàn bm1-dang-ky v11 `.hero`: thẻ cao 128, bong bóng (tiêu đề 18 + câu 13) chiếm phần còn lại, Grow to ~170 đứng mép phải tràn lên khỏi đỉnh thẻ */ bongTo?: boolean;
  /** Grow bên TRÁI, bong bóng bên phải (thiết kế «Đang chờ máy của con» bm-ghep-lan-dau/02, bm-ghep-may/04) */ robTrai?: boolean }) {
  if (bongTo) return (
    <View style={{ height: 128, marginTop: 36, borderRadius: 30, backgroundColor: M.nen, flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 96, ...KHOI.the }}>
      <View style={{ flex: 1, minWidth: 0, backgroundColor: M.the, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 14, boxShadow: BONG.nho }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: M.chu }}>{tieu}</Text>
        {loi ? <Chu co={13} mau={M.chu2} style={{ marginTop: 3, lineHeight: 18 }}>{loi}</Chu> : null}
      </View>
      {/* khung cắt phần trong suốt hai bên ảnh vuông 170 ⇒ chỉ thân Grow (~112) đứng cạnh bong bóng, không tính là đè chữ */}
      <View pointerEvents="none" style={{ position: "absolute", right: -4, bottom: -10, width: 112, height: 170, overflow: "hidden", alignItems: "center" }}>
        <View style={{ width: 170, height: 170 }}><Rob ten={lv} co={170} /></View>
      </View>
    </View>
  );
  if (chuTo) return (
    // bàn Navy 17/11 (.n-the.g): sân hero navy, tiêu đề trắng
    <View style={{ borderRadius: 34, height: 176, overflow: "hidden", ...KHOI_HERO }}>
      <View style={{ position: "absolute", left: 22, top: 40, right: 156 }}>
        <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.tieu, fontSize: 26, lineHeight: 31, letterSpacing: -0.5, color: HERO.chu }}>{tieu}</Text>
        {loi ? <Chu kieu="dam" co={14.5} mau="rgba(255,255,255,0.8)" style={{ marginTop: 6, lineHeight: 20 }}>{loi}</Chu> : null}
      </View>
      <View pointerEvents="none" style={{ position: "absolute", right: -4, bottom: -26 }}><Rob ten={lv} co={150} /></View>
    </View>
  );
  return (
    <View style={{ borderRadius: BO_CLAY.the, backgroundColor: M.dauBaMe, minHeight: cao, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: robTrai ? "flex-end" : undefined, ...KHOI.the }}>
      <LopMen men={MEN.vien} bo={BO_CLAY.the} />
      {ic ? <View style={{ position: "absolute", left: 14, bottom: 12 }}><Icon3D ten={ic} co={44} /></View> : null}
      <View style={{ maxWidth: robTrai ? "58%" : "64%", backgroundColor: M.the, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 18, boxShadow: BONG.nho, marginBottom: ic ? 40 : 0 }}>
        <Chu kieu="rat" co={16}>{tieu}</Chu>
        {loi ? <Chu co={13.5} mau={M.chu2} style={{ marginTop: 2 }}>{loi}</Chu> : null}
      </View>
      <View pointerEvents="none" style={{ position: "absolute", ...(robTrai ? { left: 4 } : { right: 4 }), bottom: 0, top: 4, width: "36%", alignItems: robTrai ? "flex-start" : "flex-end", justifyContent: "flex-end" }}>
        <Rob ten={lv} co={Math.min(cao - 6, 130)} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- tài khoản: Google / Facebook, ô mật khẩu

const G_SVG = `<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
const FB_SVG = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.4 19.5v-6.2h2.1l.3-2.5h-2.4V9.3c0-.7.2-1.2 1.2-1.2h1.3V5.9c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.8H8.7v2.5h2.1v6.2z"/></svg>`;

const FB_BAN = `<svg viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.54-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"/></svg>`;
const FB_TRON = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M15.1 12.9l.4-2.8h-2.7V8.3c0-.8.4-1.5 1.6-1.5h1.2V4.4s-1.1-.2-2.2-.2c-2.2 0-3.7 1.4-3.7 3.8v2.1H7.3v2.8h2.4V24h3.1V12.9z"/></svg>`;
const DT_BAN = `<svg viewBox="0 0 256 256" fill="#0A1629"><path d="M176,16H80A24,24,0,0,0,56,40V216a24,24,0,0,0,24,24h96a24,24,0,0,0,24-24V40A24,24,0,0,0,176,16ZM80,32h96a8,8,0,0,1,8,8v8H72V40A8,8,0,0,1,80,32Zm96,192H80a8,8,0,0,1-8-8v-8H184v8A8,8,0,0,1,176,224Z"/></svg>`;

/** Nút Google / Facebook (chỉ phần hình) — nối OAuth ở lib/dang-nhap-mxh.tsx › NutMxhThat.
 *  `to` = nút Google to của màn «Tạo tài khoản» (bàn bm1-chao `.nut.chinh`): vàng kim chữ navy, chữ G trong viên kem lõm 26. */
export function NutMxh({ loai, bam, to, bien }: { loai: "google" | "facebook"; bam: () => void; to?: boolean;
  /** `moi` = bàn them-ux0c23p4 (nút cao 56, chữ G trong viên trắng 30, chữ 17/16 đậm); `dn` = bàn bm1-dang-nhap (nút cao 54, chữ 15 đậm, Facebook tròn xanh) */ bien?: "moi" | "dn" }) {
  const ten = loai === "google" ? "Google" : "Facebook";
  if (bien) {
    const moi = bien === "moi";
    return (
      <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={`Tiếp tục với ${ten}`} muc="nut" sang men={moi && to ? MEN.vang : MEN.sang}
        style={[{ flexGrow: 1, flexBasis: 0, minHeight: moi ? 56 : 54, borderRadius: BO_CLAY.nut, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: moi ? 10 : 8, paddingHorizontal: 14 },
          moi && to ? { backgroundColor: M.diem, boxShadow: BONG.vang, alignSelf: "stretch" } : { backgroundColor: M.the, boxShadow: BONG.nho }]}>
        {moi && to ? (
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><SvgXml xml={G_SVG} width={18} height={18} /></View>
        ) : <SvgXml xml={loai === "google" ? G_SVG : moi ? FB_BAN : FB_TRON} width={22} height={22} />}
        <Text numberOfLines={1} style={{ fontFamily: moi ? F.dam7 : F.dam7, fontSize: moi ? (to ? 17 : 16) : 15, color: M.chu }}>{moi && to ? `Tiếp tục với ${ten}` : ten}</Text>
      </NhanMen>
    );
  }
  return (
    <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={`Tiếp tục với ${ten}`} muc="nut" sang men={to ? MEN.vang : MEN.sang}
      style={[{ flexGrow: 1, flexBasis: 0, minHeight: to ? 56 : 52, borderRadius: BO_CLAY.nut, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14 },
        to ? { backgroundColor: M.diem, boxShadow: BONG.vang, alignSelf: "stretch" } : { backgroundColor: M.the, boxShadow: BONG.nho }]}>
      {to ? (
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: M.the, alignItems: "center", justifyContent: "center", boxShadow: "inset 2px 2px 4px rgba(120,98,70,0.28), inset -2px -2px 4px #FFFBF5" }}>
          <SvgXml xml={G_SVG} width={18} height={18} />
        </View>
      ) : <SvgXml xml={loai === "google" ? G_SVG : FB_BAN} width={22} height={22} />}
      <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: to ? 16.5 : 15.5, color: M.chu }}>{to ? `Tiếp tục với ${ten}` : ten}</Text>
    </NhanMen>
  );
}

/** Nút «Số điện thoại» cạnh nút Facebook (bàn bm1-chao: icon điện thoại đặc 22, chữ 15.5). */
export function NutSdt({ bam, bien }: { bam: () => void; bien?: "moi" }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="button" muc="nut" sang men={MEN.sang}
      style={{ flexGrow: 1, flexBasis: 0, minHeight: bien ? 56 : 52, borderRadius: BO_CLAY.nut, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14, backgroundColor: M.the, boxShadow: BONG.nho }}>
      <SvgXml xml={DT_BAN} width={22} height={22} />
      <Text numberOfLines={1} style={{ fontFamily: bien ? F.dam7 : F.rat, fontSize: bien ? 16 : 15.5, color: M.chu }}>Số điện thoại</Text>
    </NhanMen>
  );
}

/** Vàng nâu của liên kết trong bàn «Ánh kim» (#8a6a2b) — sậm hơn một nấc để chữ 14 đạt tương phản 4,5:1 trên nền kem. */
export const VANG_NAU = "#7a5c22";

/** «Tiếp tục là đồng ý Điều khoản và Quyền riêng tư» (bàn `.ghi`: cao 32, chữ 12,5 thường + hai cụm đậm 800 navy). */
export const DieuKhoan = ({ vang }: { /** bàn them-ux0c23p4: hai cụm đậm 600 màu vàng nâu */ vang?: boolean }) => (
  <View style={{ minHeight: 32, alignItems: "center", justifyContent: "center" }}>
    <Chu co={12.5} mau={M.chu3} style={{ textAlign: "center" }}>
      Tiếp tục là đồng ý <Chu kieu={vang ? "dam" : "rat"} co={12.5} mau={vang ? VANG_NAU : M.chinhInk}>Điều khoản</Chu> và <Chu kieu={vang ? "dam" : "rat"} co={12.5} mau={vang ? VANG_NAU : M.chinhInk}>Quyền riêng tư</Chu>
    </Chu>
  </View>
);

/** Ô nhập kiểu lòng chảo (thiết kế: nền xám lõm, không viền) + nhãn trái / ghi chú phải + nút mắt cho mật khẩu. */
const TICK_BAN = `<svg viewBox="0 0 256 256" fill="#0A1629"><path d="M104,208a12,12,0,0,1-8.49-3.51l-56-56a12,12,0,0,1,17-17L104,179l89.51-89.52a12,12,0,0,1,17,17l-98,98A12,12,0,0,1,104,208Z"/></svg>`;
const MAT_BAN = `<svg viewBox="0 0 256 256" fill="#5b5248"><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"/></svg>`;
/** `lon` = ô theo bàn «Ánh kim» (bm1-dang-ky `.lom`): cao 58, bo 29, nền kem lõm #E3D9CB, chữ 20 đậm, nhãn 14 đậm cách ô 8, `dau` cách phía trên 26 (ô đầu) / 20. */
export function OLom({ nhan, ghi, ghiOk, matKhau, lon, dau, cach, nenO, ...p }: TextInputProps & { nhan: string; ghi?: string; ghiOk?: boolean; matKhau?: boolean; lon?: boolean; dau?: boolean; /** đè khoảng cách phía trên nhãn (bàn bm1-dang-nhap: 24 / 18) */ cach?: number; /** nền ô lõm (bàn bm1-dang-ky #E3D9CB; bm1-dang-nhap = nền kem) */ nenO?: string }) {
  const [an, setAn] = useState(true);
  const [dang, setDang] = useState(false);
  if (lon) return (
    <View style={{ marginTop: cach ?? (dau ? 14 : 20) }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginLeft: 6, marginBottom: 8 }}>
        <Text style={{ fontFamily: F.dam7, fontSize: 14, color: M.chu, lineHeight: 18 }}>{nhan}</Text>
        {ghi ? (ghiOk ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginRight: 6 }}>
            <SvgXml xml={TICK_BAN} width={14} height={14} />
            <Text style={{ fontFamily: F.rat, fontSize: 12, color: M.chu, lineHeight: 16 }}>{ghi}</Text>
          </View>
        ) : <Text style={{ fontFamily: F.dam, fontSize: 12, color: M.chu3, marginRight: 6, lineHeight: 16 }}>{ghi}</Text>) : null}
      </View>
      <View style={[{ flexDirection: "row", alignItems: "center", height: 58, borderRadius: 29, backgroundColor: nenO ?? "#E3D9CB", boxShadow: "inset 3px 3px 6px rgba(120,98,70,0.28), inset -3px -3px 6px #FFFBF5", paddingLeft: 20, paddingRight: 6 },
        dang && { boxShadow: `inset 3px 3px 6px rgba(120,98,70,0.28), inset -3px -3px 6px #FFFBF5, 0px 0px 0px 2px ${M.chinh}` }]}>
        <TextInput placeholderTextColor={M.chu3} accessibilityLabel={nhan} secureTextEntry={matKhau && an} {...p}
          onFocus={(e) => { setDang(true); p.onFocus?.(e); }} onBlur={(e) => { setDang(false); p.onBlur?.(e); }}
          style={{ flex: 1, minWidth: 0, height: 52, fontFamily: F.dam7, fontSize: 20, letterSpacing: matKhau && an ? 4 : 0.4, color: M.chu, outlineStyle: "none" } as never} />
        {matKhau ? (
          <Pressable onPress={() => setAn((x) => !x)} accessibilityRole="button" accessibilityLabel={an ? "Hiện mật khẩu" : "Ẩn mật khẩu"} hitSlop={6}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: an ? 1 : 0.7 }}>
            <SvgXml xml={MAT_BAN} width={22} height={22} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
        <Chu kieu="rat" co={14}>{nhan}</Chu>
        {ghi ? <Chu kieu={ghiOk ? "rat" : "thuong"} co={12.5} mau={ghiOk ? M.chinhInk : M.chu3}>{ghiOk ? `✓ ${ghi}` : ghi}</Chu> : null}
      </View>
      <View style={[{ flexDirection: "row", alignItems: "center", minHeight: 54, borderRadius: 27, backgroundColor: M.ranh, boxShadow: BONG.lom, paddingLeft: 18, paddingRight: 6 },
        dang && { boxShadow: `${BONG.lom}, 0px 0px 0px 2px ${M.chinh}` }]}>
        <TextInput placeholderTextColor={M.chu3} accessibilityLabel={nhan} secureTextEntry={matKhau && an} {...p}
          onFocus={(e) => { setDang(true); p.onFocus?.(e); }} onBlur={(e) => { setDang(false); p.onBlur?.(e); }}
          style={{ flex: 1, minWidth: 0, fontFamily: F.dam, fontSize: 17, color: M.chu, paddingVertical: 12, outlineStyle: "none" } as never} />
        {matKhau ? (
          <Pressable onPress={() => setAn((x) => !x)} accessibilityRole="button" accessibilityLabel={an ? "Hiện mật khẩu" : "Ẩn mật khẩu"} hitSlop={6}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: an ? 0.7 : 1 }}>
            <Icon ten="mat" mau={M.chu2} co={20} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Ô nhập trần (không nhãn, không nền) — đặt trong một khối lõm tự dựng (ô số + nút «Gửi mã»). */
export const OLomTran = (p: TextInputProps) => (
  <TextInput placeholderTextColor={M.chu3} accessibilityLabel="Số điện thoại" keyboardType="phone-pad" autoComplete="tel" placeholder="0912 345 678" {...p}
    style={{ fontFamily: F.dam, fontSize: 17, color: M.chu, paddingVertical: 12, outlineStyle: "none" } as never} />
);

/** Liên kết chữ ngọc đứng giữa (thiết kế .lk). */
export const LienKet = ({ chu, bam, gach, co = 14.5, mau, kieu = "rat", phai }: { chu: string; bam: () => void; gach?: boolean; co?: number; mau?: string; kieu?: "rat" | "dam"; /** đứng sát phải (padding ngang 8) */ phai?: boolean }) => (
  <Pressable onPress={bam} accessibilityRole="link" hitSlop={4} style={{ minHeight: 44, alignItems: phai ? "flex-end" : "center", justifyContent: "center", paddingHorizontal: phai ? 8 : 0 }}>
    <Chu kieu={kieu} co={co} mau={mau ?? M.chinhInk} style={gach ? { textDecorationLine: "underline" } : undefined}>{chu}</Chu>
  </Pressable>
);

// ---------------------------------------------------------------- ghép máy: mã to, chia sẻ, 3 bước

/** «482017» ⇒ «482 017». */
/** Ô nhập số / email: chữ chỉ gồm số và dấu cách ⇒ bỏ dấu cách (giá trị gửi máy chủ là số liền); email giữ nguyên. */
export const boCach = (v: string) => (/^[\d\s+]*$/.test(v) ? v.replace(/\s/g, "") : v);
/** «0912345678» ⇒ «0912 345 678» (số 10 chữ số; dạng khác — email, +84… — giữ nguyên). */
export const hienSo = (s = "") => (/^\d{10}$/.test(s) ? s.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3") : s);
/** Ô nhập SĐT/email: lúc đang gõ giữ nguyên chữ người dùng (không dựng lại ⇒ xoá dấu cách được, con trỏ không nhảy); rời ô mới tách
 * «0912 345 678». Giá trị lưu luôn là `boCach(chữ)`. Trả props cho TextInput / OLom / OLomTran. */
export function useOSo(gia: string, doi: (v: string) => void) {
  const [dangGo, setDangGo] = useState<string | null>(null);
  return {
    value: dangGo ?? hienSo(gia),
    onChangeText: (t: string) => { setDangGo(t); doi(boCach(t)); },
    onFocus: () => setDangGo(hienSo(gia)),
    onBlur: () => setDangGo(null),
  };
}
export const hienMa = (ma: string) => (ma.length === 6 ? `${ma.slice(0, 3)} ${ma.slice(3)}` : ma);
/** «https://aiigrow.aiilab.vn/tai?g=…» ⇒ «aiigrow.aiilab.vn/tai» (chữ ngắn trên màn). */
export const linkNgan = (lienKet: string) => lienKet.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
/** Giây ⇒ «9:42». */
export const demNguoc = (giay: number) => `${Math.floor(Math.max(0, giay) / 60)}:${String(Math.max(0, giay) % 60).padStart(2, "0")}`;

type ChiaSe = { tieuDe: string; noiDung: string; lienKet: string };
// glyph đơn sắc navy (fill M.chinhInk); phần khoét (chữ Z, nếp thư…) tô đúng màu nền ô chứa glyph là M.chinhSoft #E3D9CB, không phải M.the — ô chia sẻ dùng nen: M.chinhSoft
const G = (d: string) => `<svg viewBox="0 0 24 24" fill="${M.chinhInk}">${d}</svg>`;
const BONG_CHAT = '<path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.6 1.4 4.9 3.6 6.5L5 21.5l4-2.1c.9.2 1.9.3 3 .3 5.5 0 10-3.8 10-8.5S17.5 3 12 3z"/>';
const GLYPH = {
  zalo: G(`${BONG_CHAT}<path d="M8 8.5h7.5v1.6l-4.9 5h4.9v1.6H7.8v-1.6l4.9-5H8z" fill="${M.chinhSoft}"/>`),
  mes: G(`${BONG_CHAT}<path d="M6.5 13.8l4-4.2 2.4 2.1 4.6-2.4-4 4.2-2.4-2.1z" fill="${M.chinhSoft}"/>`),
  tin: G(`<path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 4v-4a2 2 0 01-2-2V6a2 2 0 012-2z"/><path d="M7 9h10v2H7zM7 12.5h6v2H7z" fill="${M.chinhSoft}"/>`),
  mail: G(`<path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M3.5 7.2L12 12.6l8.5-5.4v2.2L12 14.8 3.5 9.4z" fill="${M.chinhSoft}"/>`),
  tele: G('<path d="M21.5 3.5L2.8 10.7c-1 .4-1 1.1-.2 1.4l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.4-1.3z"/>'),
  chep: G('<path d="M3.9 12c0-1.7 1.4-3.1 3.1-3.1h4V7H7a5 5 0 000 10h4v-1.9H7c-1.7 0-3.1-1.4-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.7 0 3.1 1.4 3.1 3.1s-1.4 3.1-3.1 3.1h-4V17h4a5 5 0 000-10z"/>'),
  them: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2l-4.5 4.5 1.4 1.4L11 5.8V15h2V5.8l2.1 2.1 1.4-1.4z"/><path d="M6 9h3v2H6v9h12v-9h-3V9h3a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2z"/></svg>',
};

/** Mở bảng chia sẻ của hệ điều hành; web không có navigator.share ⇒ chép vào bộ nhớ tạm. → true nếu đã CHÉP (để báo). */
async function chiaSeHeThong(c: ChiaSe) {
  if (Platform.OS === "web") {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share) { try { await nav.share({ title: c.tieuDe, text: c.noiDung }); return false; } catch { /* huỷ / không hỗ trợ ⇒ chép */ } }
    return saoChep(c.noiDung);
  }
  await Share.share({ title: c.tieuDe, message: c.noiDung }).catch(() => {});
  return false;
}


/** Hàng chia sẻ (thiết kế chốt 14/11 bm1-ob-ghep): cuộn ngang Zalo · Messenger · Tin nhắn · Email · Telegram · Sao chép, ô «Thêm…» đứng yên bên
 *  phải (bảng chia sẻ của máy — gửi qua mọi app). Zalo không có đường chia sẻ chữ ra ngoài ⇒ bảng chia sẻ của máy (chọn Zalo) — web: chép sẵn
 *  nội dung để dán. `bao` hiện toast; `daGui` gọi sau khi đã mở app gửi (màn Ghép chuyển sang «Đang chờ máy của con»). */
export function HangChiaSe({ chiaSe, bao, daGui }: { chiaSe: ChiaSe; bao: (chu: string) => void; daGui?: () => void }) {
  const chep = (chu: string, cau: string) => saoChep(chu).then((ok) => { if (ok) bao(cau); });
  const mo = (url: string, duPhong: string) => Linking.openURL(url).then(() => daGui?.(), () => chep(chiaSe.noiDung, duPhong));
  const muc: { ten: string; nen: string; ve: ReactNode; bam: () => void }[] = [
    { ten: "Zalo", nen: M.chinhSoft, ve: <SvgXml xml={GLYPH.zalo} width={24} height={24} />,
      bam: () => (Platform.OS === "web" ? chep(chiaSe.noiDung, "Đã chép link — mở Zalo, dán gửi sang máy của con") : chiaSeHeThong(chiaSe).then(() => daGui?.())) },
    { ten: "Messenger", nen: M.chinhSoft, ve: <SvgXml xml={GLYPH.mes} width={24} height={24} />,
      bam: () => {
        if (Platform.OS === "web") { chep(chiaSe.noiDung, "Đã chép link — mở Messenger, dán gửi sang máy của con"); return; }
        Linking.openURL(`fb-messenger://share/?link=${encodeURIComponent(chiaSe.lienKet)}`).then(() => daGui?.(), () => chiaSeHeThong(chiaSe));
      } },
    { ten: "Tin nhắn", nen: M.chinhSoft, ve: <SvgXml xml={GLYPH.tin} width={24} height={24} />,
      bam: () => { mo(`sms:${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(chiaSe.noiDung)}`, "Đã chép link — dán vào tin nhắn"); } },
    { ten: "Email", nen: M.chinhSoft, ve: <SvgXml xml={GLYPH.mail} width={24} height={24} />,
      bam: () => { mo(`mailto:?subject=${encodeURIComponent(chiaSe.tieuDe)}&body=${encodeURIComponent(chiaSe.noiDung)}`, "Đã chép link — dán vào email"); } },
    { ten: "Telegram", nen: M.chinhSoft, ve: <SvgXml xml={GLYPH.tele} width={24} height={24} />,
      bam: () => { mo(`https://t.me/share/url?url=${encodeURIComponent(chiaSe.lienKet)}&text=${encodeURIComponent(chiaSe.tieuDe)}`, "Đã chép link — dán vào Telegram"); } },
    { ten: "Sao chép", nen: M.chinhSoft, ve: <SvgXml xml={GLYPH.chep} width={24} height={24} />, bam: () => chep(chiaSe.lienKet, "Đã chép link ghép máy") },
  ];
  const o = (m: { ten: string; nen: string; ve: ReactNode; bam: () => void }) => (
    <Pressable key={m.ten} onPress={m.bam} accessibilityRole="button" accessibilityLabel={m.ten === "Sao chép" ? "Sao chép link" : m.ten === "Thêm…" ? "Thêm cách chia sẻ" : `Gửi qua ${m.ten}`}
      style={{ width: 64, alignItems: "center", gap: 6, minHeight: 44 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: m.nen, alignItems: "center", justifyContent: "center", overflow: "hidden",
        boxShadow: m.ten === "Thêm…" ? "0px 8px 14px -8px rgba(18,22,21,0.7), inset 0px 2px 2px rgba(255,255,255,0.25), inset 0px -3px 5px rgba(0,0,0,0.4)"
          : "0px 8px 14px -8px rgba(10,82,70,0.5), inset 0px 2px 2px rgba(255,255,255,0.9), inset 0px -3px 5px rgba(10,82,70,0.18)" }}>{m.ve}</View>
      <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 11.5, lineHeight: 14, color: M.chu, textAlign: "center" }}>{m.ten}</Text>
    </Pressable>
  );
  return (
    // bàn bm1-ob-ghep v23 / bm1-may-ghep: ô tròn ngọc nhạt, glyph đơn sắc ngọc; «Thêm…» tròn than chì glyph trắng
    // (thẻ nền của thiết kế bỏ: hàng cuộn ngang tràn mép thẻ — cổng LE-THE)
    <View style={{ flexDirection: "row", alignItems: "flex-start" }} accessibilityLabel="Chia sẻ link ghép máy">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 4, paddingRight: 16, paddingVertical: 4 }}>
        {muc.map(o)}
      </ScrollView>
      <View style={{ width: 1, alignSelf: "stretch", marginVertical: 8, backgroundColor: M.vien }} />
      {o({ ten: "Thêm…", nen: M.nut, ve: <SvgXml xml={GLYPH.them} width={24} height={24} />,
        bam: () => chiaSeHeThong(chiaSe).then((chep) => { if (chep) bao("Đã chép nội dung — dán vào ứng dụng Ba Mẹ muốn gửi"); else daGui?.(); }) })}
    </View>
  );
}

/** Màn trạng thái ghép (MỚI 14/11 them-q44uxha5 «Mã đã hết hạn», them-ytmgijqo «Chưa thấy máy của con»): Grow + icon, tiêu đề, câu phụ,
 *  nội dung (thẻ / danh sách), nút chính + liên kết. Dùng chung cho màn Ghép (Lần đầu, Ghép thêm máy) và «Đang chờ». */
export function KhoiTrangThaiGhep({ lv, ic, tieu, phu, children }: { lv: LinhVat; ic: TenIcon; tieu: string; phu: string; children?: ReactNode }) {
  // bàn them-q44uxha5 v2 / them-ytmgijqo v3 `.san`: thẻ «sân» cao 260 nền cam nhạt, Grow 160 giữa + icon 64 chếch phải, tiêu đề 23 + câu phụ cam đậm ở đáy thẻ
  return (
    <View style={{ gap: 14 }}>
      <View style={{ height: 284, borderRadius: 36, overflow: "hidden", backgroundColor: M.nen,
        alignItems: "center", ...KHOI.the }}>
        <View style={{ marginTop: 10 }}><Rob ten={lv} co={160} /></View>
        <View pointerEvents="none" style={{ position: "absolute", top: 20, left: "50%", marginLeft: 30 }}><Icon3D ten={ic} co={64} /></View>
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 18, alignItems: "center", gap: 6 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.tieu, fontSize: 23, letterSpacing: -0.4, color: M.chu, textAlign: "center" }}>{tieu}</Text>
          <Chu kieu="rat" co={14} mau="#7a2f00" style={{ textAlign: "center" }}>{phu}</Chu>{/* cam sẫm hơn canh: nền đào đáy cảnh (pixel xấu nhất ~rgb(200,179,161) khi bóng Grow lan xuống) cần ≥ 4,5 — #7a2f00 4,7:1 */}
        </View>
      </View>
      {children}
    </View>
  );
}

/** Một dòng thẻ trạng thái (bàn `.the`): ô tròn ngọc nhạt 48 + icon 30, chữ 15/800 (+ dòng phụ 12.5). */
export function DongTrangThai({ ic, chu, phu }: { ic: TenIcon; chu: string; phu?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 26, backgroundColor: M.the, ...KHOI.the }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: M.chinhSoft, alignItems: "center", justifyContent: "center", boxShadow: BONG.nho }}><Icon3D ten={ic} co={30} /></View>
      <View style={{ flex: 1 }}><Chu kieu="rat" co={15}>{chu}</Chu>{phu ? <Chu kieu="dam" co={12.5} mau={M.chu3}>{phu}</Chu> : null}</View>
    </View>
  );
}

/** Một bước làm trên máy Con (thẻ: số tròn ngọc + icon 3D + tiêu đề + dòng phụ). */
export function BuocMayCon({ n, ic, tieu, phu, gach }: { n: number; ic: TenIcon; tieu: ReactNode; phu: string; gach?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>
      <LopMen men={MEN.the} bo={24} />
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center", boxShadow: BONG.ngoc }}>
        <Chu kieu="rat" co={14} mau="#FFFBF5">{n}</Chu>
      </View>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}><Icon3D ten={ic} co={30} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof tieu === "string" ? <Chu kieu="rat" co={15.5} style={gach ? { textDecorationLine: "line-through" } : undefined}>{tieu}</Chu> : tieu}
        <Chu co={13} mau={M.chu3}>{phu}</Chu>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- ô icon app (lưới Chọn app)

const YT = `<svg viewBox="0 0 24 24"><path fill="#fff" d="M9 7.5v9l7.5-4.5z"/></svg>`;
const RB = `<svg viewBox="0 0 24 24"><path fill="#fff" d="M6.2 2 22 6.2 17.8 22 2 17.8zM10.4 9.1l-1.3 4.8 4.8 1.3 1.3-4.8z"/></svg>`;
const MC = `<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="#6cc04a" d="M0 0h8v3H0z"/><path fill="#8b5a2b" d="M0 3h8v5H0z"/><path fill="#4e9a2f" d="M1 1h2v1H1zM5 0h2v1H5zM3 2h1v2H3zM6 2h1v2H6z"/><path fill="#6b4220" d="M2 5h1v1H2zM5 4h1v1H5zM4 6h1v1H4z"/></svg>`;
const TT = `<svg viewBox="0 0 24 24"><path fill="#fff" d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z"/></svg>`;
type HinhApp = { nen: string; svg?: string; ic?: TenIcon; rob?: boolean; chu?: string };
const HINH_APP: Record<string, HinhApp> = {
  youtube_kids: { nen: "#ff2a2a", svg: YT }, youtube: { nen: "#ff0000", svg: YT }, roblox: { nen: "#1f2321", svg: RB }, minecraft: { nen: "#e9efe4", svg: MC },
  aiirob: { nen: M.chinhSoft, rob: true }, tu_dien: { nen: M.chinhSoft, ic: "sach" }, google: { nen: "#FFFBF5", svg: G_SVG }, ve: { nen: M.canhSoft, ic: "but" },
  lich: { nen: M.chinhSoft, ic: "lich" }, tiktok: { nen: M.nut, svg: TT }, zalo: { nen: "#0068ff", chu: "Zalo" }, scratch: { nen: M.diemSoft, ic: "game" },
  duolingo: { nen: "#58cc02", chu: "D" }, khan: { nen: "#14bf96", chu: "K" }, zoom: { nen: "#2d8cff", chu: "Z" }, capcut: { nen: M.nut, chu: "C" },
};

/** Ô icon một app: hình theo mã app trong lưới (server/lib/che-do-chan.ts › APP_GOI_Y); app «Thêm app khác» ⇒ chữ cái đầu. */
export function OApp({ ma, ten, chon, bam, nhanDoc, rong = "25%" }: { ma?: string; ten: string; chon?: boolean; bam?: () => void; nhanDoc?: string; /** bề ngang ô (lưới 4 cột) */ rong?: `${number}%` | number }) {
  const h: HinhApp = (ma && HINH_APP[ma]) || { nen: M.chinhSoft, chu: (ten || nhanDoc || "").trim().charAt(0).toUpperCase() || "?" };
  const tat = chon === false;
  const o = (
    <View style={{ alignItems: "center", gap: 6, width: "100%" }}>
      <View style={{ width: 60, height: 60 }}>
        <View style={[{ width: 60, height: 60, borderRadius: 20, backgroundColor: h.nen, alignItems: "center", justifyContent: "center", overflow: "hidden", ...KHOI.nho }, tat && { opacity: 0.45 }]}>
          {h.svg ? <SvgXml xml={h.svg} width={28} height={28} /> : h.rob ? <Rob ten="hoc" co={46} /> : h.ic ? <Icon3D ten={h.ic} co={38} />
            : <Chu kieu="rat" co={h.chu && h.chu.length > 2 ? 15 : 24} mau={h.nen === M.chinhSoft ? M.chu : "#FFFBF5"}>{h.chu}</Chu>}
        </View>
        {chon !== undefined ? (
          <View style={{ position: "absolute", right: -5, bottom: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: chon ? M.chinh : "#1b2b47",
            boxShadow: `0px 0px 0px 2.5px ${M.nen}`, alignItems: "center", justifyContent: "center" }}>
            <Icon ten={chon ? "tick" : "tru"} mau="#FFFBF5" co={13} />
          </View>
        ) : null}
      </View>
      {ten ? <Chu kieu="rat" co={12} mau={tat ? M.chu3 : M.chu} dong={2} style={{ textAlign: "center", lineHeight: 15, minHeight: 30 }}>{ten}</Chu> : null}
    </View>
  );
  return bam ? (
    <Pressable onPress={bam} accessibilityRole="switch" accessibilityLabel={nhanDoc ?? ten} accessibilityState={{ checked: !!chon }} style={{ width: rong, paddingHorizontal: 2, minHeight: 44 }}>{o}</Pressable>
  ) : <View style={{ width: rong, paddingHorizontal: 2 }}>{o}</View>;
}

/** Ô «+ Thêm app khác» trong lưới (viền gạch ngọc, nền lõm). */
export function OThemApp({ bam }: { bam: () => void }) {
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel="Thêm app khác" style={{ width: "25%", paddingHorizontal: 2, alignItems: "center", gap: 6 }}>
      <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: M.xamSoft, boxShadow: BONG.lom, borderWidth: 2, borderStyle: "dashed", borderColor: M.oNhap, alignItems: "center", justifyContent: "center" }}>
        <Chu kieu="rat" co={28} mau={M.chinhInk}>+</Chu>
      </View>
      <Chu kieu="rat" co={12} mau={M.chinhInk} style={{ textAlign: "center", lineHeight: 15 }}>Thêm app khác</Chu>
    </Pressable>
  );
}

// ---------------------------------------------------------------- bánh xe chọn giờ

const CAO_O = 40;
/** Bánh xe một cột (giờ hoặc phút): cuộn dừng đúng ô, bấm một ô cũng chọn (web không có quán tính cuộn). */
export function BanhXe({ ds, gia, doi, nhan }: { ds: string[]; gia: string; doi: (v: string) => void; nhan: string }) {
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const i = Math.max(0, ds.indexOf(gia));
  useEffect(() => { ref.current?.scrollTo({ y: i * CAO_O, animated: false }); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hen.current) clearTimeout(hen.current); }, []);
  const chot = (y: number) => { const k = Math.min(ds.length - 1, Math.max(0, Math.round(y / CAO_O))); if (ds[k] !== gia) doi(ds[k]); };
  // chốt khi cuộn đã dừng 150 ms (sau quán tính trên máy thật; web không có sự kiện quán tính)
  const khiCuon = (y: number) => { if (hen.current) clearTimeout(hen.current); hen.current = setTimeout(() => chot(y), 150); };
  return (
    <View style={{ height: CAO_O * 5, width: 76 }} accessibilityLabel={nhan}>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} snapToInterval={CAO_O} decelerationRate="fast" nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: CAO_O * 2 }} scrollEventThrottle={32}
        onScroll={(e) => khiCuon(e.nativeEvent.contentOffset.y)}>
        {ds.map((x) => (
          <Pressable key={x} onPress={() => { doi(x); ref.current?.scrollTo({ y: ds.indexOf(x) * CAO_O, animated: true }); }} accessibilityRole="button" accessibilityLabel={`${nhan} ${x}`}
            style={{ height: CAO_O, alignItems: "center", justifyContent: "center" }}>
            <Chu kieu={x === gia ? "rat" : "dam"} co={x === gia ? 26 : 19} mau={x === gia ? M.chinhInk : M.chu3} so>{x}</Chu>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Bánh xe «HH : MM» (phút bước 5). */
export function BanhXeGio({ gio, doi }: { gio: string; doi: (g: string) => void }) {
  const [h, m] = gio.split(":");
  const gioDs = Array.from({ length: 24 }, (_, k) => String(k).padStart(2, "0"));
  const phutDs = Array.from({ length: 12 }, (_, k) => String(k * 5).padStart(2, "0"));
  const mm = phutDs.includes(m) ? m : phutDs[Math.floor(Number(m) / 5) % 12];   // làm tròn XUỐNG: 21:58 ⇒ 21:55 (tròn lên 60 không cộng giờ ⇒ nhảy về 21:00)
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: CAO_O * 2, height: CAO_O, borderRadius: 14, backgroundColor: M.chinhSoft }} />
      <BanhXe ds={gioDs} gia={h} doi={(x) => doi(`${x}:${mm}`)} nhan="Giờ" />
      <Chu kieu="rat" co={24}>:</Chu>
      <BanhXe ds={phutDs} gia={mm} doi={(x) => doi(`${h}:${x}`)} nhan="Phút" />
    </View>
  );
}

/** «06:30» ⇒ «6:30» như thiết kế. */
export const gioGon = (g: string) => g.replace(/^0(\d):/, "$1:");

/** Khối minh hoạ lớn đầu màn: nền ngọc nhạt bo tròn, Grow to giữa, bong bóng thoại góc trên trái (tuỳ chọn), `tren` = thẻ nổi phía trên. */
export function KhoiRob({ lv = "rob-goc", thoai, tren, cao = 300 }: { lv?: LinhVat; thoai?: string; tren?: ReactNode; cao?: number }) {
  // Bong bóng thoại / thẻ phía trên nằm TRONG dòng chảy, Grow lấp phần còn lại bên dưới — không chồng lên hình (cổng DE-ANH): đo chiều cao
  // khối trên rồi thu Grow cho vừa (thẻ lời mời có tên con dài ở 320px cao tới 4–5 dòng).
  const [hTren, setHTren] = useState(thoai || tren ? 72 : 0);
  // ảnh Grow dọc (520×740) vẽ trong ô vuông `co` ⇒ chừa đáy 4 như thiết kế (.rob bottom:4), không trừ thêm 30 (Grow bé hơn HTML — vòng 2)
  const coRob = Math.max(110, cao - 8 - (thoai || tren ? hTren + 12 : 0));
  return (
    <View style={{ minHeight: cao, borderRadius: 34, backgroundColor: M.chinhSoft, alignItems: "center", justifyContent: "flex-end", overflow: "hidden", ...KHOI.the }}>
      <LopMen men={MEN.vien} bo={34} />
      {thoai || tren ? (
        <View onLayout={(e) => setHTren(Math.ceil(e.nativeEvent.layout.height))} style={{ alignSelf: "stretch", paddingHorizontal: 12, paddingTop: 12 }}>
          {thoai ? (
            <View style={{ alignSelf: "flex-start", marginLeft: 6, marginTop: 8, maxWidth: 220, backgroundColor: M.the, borderRadius: 22, paddingVertical: 11, paddingHorizontal: 16, boxShadow: BONG.nho }}>
              <Chu kieu="dam7" co={15} style={{ lineHeight: 20 }}>{thoai}</Chu>
            </View>
          ) : null}
          {tren}
        </View>
      ) : null}
      <View style={{ flex: 1, justifyContent: "flex-end" }}><Rob ten={lv} co={coRob} /></View>
    </View>
  );
}

/** Sân Grow của màn «Tạo tài khoản» (bàn bm1-chao `.san`): thẻ cao 360 bo 36 nền kem sáng ở giữa, bong bóng thoại trên trái, Grow 200 rộng đứng đáy lệch trái 4 %. */
export function SanRob({ thoai, lv = "rob-goc" }: { thoai: string; lv?: LinhVat }) {
  return (
    <View style={{ height: 360, borderRadius: 36, overflow: "hidden", backgroundColor: M.nen, backgroundImage: "radial-gradient(70% 55% at 50% 45%, #F4EEE5, #ECE4D9)", boxShadow: BONG.the }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 96, bottom: 0, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" }} pointerEvents="none">
        <Image cachePolicy="memory-disk" source={LV[lv]} style={{ width: 200, height: 285, transform: [{ translateX: 0.04 * 200 }] }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      </View>
      <View style={{ position: "absolute", left: 18, top: 20, maxWidth: 210, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.the, boxShadow: BONG.nho }}>
        <Text style={{ fontFamily: F.rat, fontSize: 15, lineHeight: 21, color: M.chu }}>{thoai}</Text>
      </View>
    </View>
  );
}

/** Tiêu đề dưới sân Grow (bàn bm1-chao `.chu`: h1 28/34 đậm giãn −0,6, câu 15/21 xám nâu). */
export const TieuSan = ({ chu, phu }: { chu: string; phu: string }) => (
  <View style={{ marginTop: 8, alignItems: "center", paddingHorizontal: 4 }}>
    <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: M.chu, textAlign: "center" }}>{chu}</Text>
    <Text style={{ marginTop: 6, fontFamily: F.thuong, fontSize: 15, lineHeight: 21, color: INK2, textAlign: "center" }}>{phu}</Text>
  </View>
);

/** Thẻ đầu màn «Tạo tài khoản Ba Mẹ» (bàn bm1-dang-ky `.hero`): cao 128 bo 30, bong bóng 226 rộng (tiêu đề 18 + câu 13, một dòng), Grow sổ tay 104 rộng tràn lên khỏi đỉnh thẻ. */
export function HeroBan({ tieu, loi, lv = "so-tay" }: { tieu: string; loi: string; lv?: LinhVat }) {
  const { width } = useWindowDimensions();
  const mot = width >= 360;       // bàn: chữ một dòng, tràn nhẹ ra lề phải bong bóng; màn hẹp (320) cho xuống dòng để khỏi đè Grow
  return (
    <View style={{ height: 128, borderRadius: 30, backgroundColor: M.nen, boxShadow: BONG.the }}>
      <View style={{ position: "absolute", right: 0, bottom: -10, width: 104, height: 159, zIndex: 2 }} pointerEvents="none">
        <Image cachePolicy="memory-disk" source={LV[lv]} style={{ width: 104, height: 159 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      </View>
      <View style={{ position: "absolute", left: 14, top: 24, width: mot ? 240 : 226, maxWidth: "88%", zIndex: 3, paddingVertical: 12, paddingLeft: 16, paddingRight: mot ? 4 : 16, borderRadius: 24, backgroundColor: M.the, boxShadow: BONG.nho }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: M.chu }}>{tieu}</Text>
        <Text style={[{ marginTop: 3, fontFamily: F.thuong, fontSize: 13, lineHeight: 18, color: INK2 }, undefined]}>{loi}</Text>
      </View>
    </View>
  );
}

/** Thẻ đầu màn «Đăng nhập» (bàn bm1-dang-nhap `.san`): cao 176 bo 34 kem nổi, tiêu đề 26/31 + câu 14,5 trái (trái 22, trên 40), Grow chỉ tay 150 rộng tràn đáy phải. */
export function SanDangNhap({ tieu, loi }: { tieu: string; loi: string }) {
  const { width } = useWindowDimensions();
  const hep = width < 360;
  const w = hep ? 104 : 150;
  return (
    <View style={{ height: 176, borderRadius: 34, backgroundColor: M.nen, boxShadow: BONG.the, overflow: "hidden" }}>
      <View pointerEvents="none" style={{ position: "absolute", right: -4, bottom: -26, width: w, height: w * 707 / 520 }}>
        <Image cachePolicy="memory-disk" source={LV.chi} style={{ width: w, height: w * 707 / 520 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      </View>
      <View style={{ position: "absolute", left: 22, top: 40 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: hep ? 22 : 26, lineHeight: hep ? 27 : 31, letterSpacing: -0.5, color: M.chu }}>{tieu}</Text>
        <Text style={{ marginTop: 6, fontFamily: F.dam, fontSize: 14.5, lineHeight: 20, color: INK2 }}>{loi}</Text>
      </View>
    </View>
  );
}

const KHOA_BAN = `<svg viewBox="0 0 24 24" fill="none" stroke="#0A1629" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>`;
const TICK_VANG = `<svg viewBox="0 0 256 256" fill="#F4C76A"><path d="M104,208a12,12,0,0,1-8.49-3.51l-56-56a12,12,0,0,1,17-17L104,179l89.51-89.52a12,12,0,0,1,17,17l-98,98A12,12,0,0,1,104,208Z"/></svg>`;

/** Thẻ đầu màn «Quên mật khẩu» (bàn them-2g3zpiie `.san`): cao 200 bo 36, bong bóng thoại trái trên, viên khoá tròn 50 dưới trái, Grow sổ tay 160 tràn đáy phải. */
export function SanQuenMk({ thoai }: { thoai: string }) {
  const { width } = useWindowDimensions();
  const hep = width < 360;
  const w = hep ? 110 : 160;
  return (
    <View style={{ height: 200, marginTop: 4, borderRadius: 36, backgroundColor: M.nen, boxShadow: BONG.the, overflow: "hidden" }}>
      <View pointerEvents="none" style={{ position: "absolute", right: 0, bottom: -20, width: w, height: w * 793 / 520 }}>
        <Image cachePolicy="memory-disk" source={LV["so-tay"]} style={{ width: w, height: w * 793 / 520 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      </View>
      <View style={{ position: "absolute", left: 18, top: 28, maxWidth: hep ? 140 : 170, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.nen, boxShadow: BONG.nho }}>
        <Text style={{ fontFamily: F.dam7, fontSize: 15, lineHeight: 20, color: M.chu }}>{thoai}</Text>
      </View>
      <View style={{ position: "absolute", left: 28, bottom: 22, width: 50, height: 50, borderRadius: 25, backgroundColor: M.nen, boxShadow: BONG.nho, alignItems: "center", justifyContent: "center" }}>
        <SvgXml xml={KHOA_BAN} width={26} height={26} />
      </View>
    </View>
  );
}

/** Nhãn bước «1 Nhập số đã đăng ký…» (bàn them-2g3zpiie `.nhan`): viên tròn 22 navy số vàng + chữ 14 đậm. */
export const NhanBuoc = ({ n, chu, cach = 0 }: { n: number; chu: string; cach?: number }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 6, marginTop: cach, marginBottom: 8 }}>
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: M.chu, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.rat, fontSize: 12, color: "#F4C76A" }}>{n}</Text></View>
    <Text style={{ fontFamily: F.dam7, fontSize: 14, color: M.chu }}>{chu}</Text>
  </View>
);

/** Ô số điện thoại + nút «Gửi mã / Đã gửi mã» navy chữ vàng (bàn them-2g3zpiie `.lom` cao 60 + `.gui` cao 46). */
export function OSoGui({ da, dangChay, tat, bam, ...p }: TextInputProps & { da: boolean; dangChay?: boolean; tat?: boolean; bam: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 60, borderRadius: 30, backgroundColor: M.nen, boxShadow: "inset 3px 3px 6px rgba(120,98,70,0.28), inset -3px -3px 6px #FFFBF5", paddingLeft: 20, paddingRight: 7 }}>
      <TextInput placeholderTextColor={M.chu3} accessibilityLabel="Số điện thoại đã đăng ký" keyboardType="phone-pad" autoComplete="tel" placeholder="0912 345 678" {...p}
        style={{ flex: 1, minWidth: 0, height: 52, fontFamily: F.rat, fontSize: 20, letterSpacing: 0.3, color: M.chu, outlineStyle: "none" } as never} />
      {da ? (
        <View style={{ height: 46, paddingHorizontal: 14, borderRadius: 23, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: M.chu }}>
          <SvgXml xml={TICK_VANG} width={15} height={15} /><Text style={{ fontFamily: F.rat, fontSize: 14, color: "#F4C76A" }}>Đã gửi mã</Text>
        </View>
      ) : (
        <Pressable onPress={bam} disabled={tat || dangChay} accessibilityRole="button" accessibilityLabel="Gửi mã" accessibilityState={{ disabled: !!tat || !!dangChay }}
          style={{ height: 46, paddingHorizontal: 18, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: M.chu, opacity: tat || dangChay ? 0.45 : 1 }}>
          <Text style={{ fontFamily: F.rat, fontSize: 14, color: "#F4C76A" }}>Gửi mã</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- hồ sơ Con: màu + tuổi

/** 5 màu hồ sơ (thiết kế «Màu của con»): [màu đậm, nền thẻ nhạt]. Lưu ở `children.avatar` dạng «mau-<số>». */
// MAU_HO_SO (bảng màu hồ sơ con duy nhất) nay ở ./mau — ui.tsx cần sinh MAU_CON từ đó mà lan-dau đã import ui (tránh vòng import); re-export để chỗ cũ không đổi.
export { MAU_HO_SO };
export const mauHoSo = (avatar?: string | null) => { const k = Number(/^mau-(\d)(?:\||$)/.exec(avatar ?? "")?.[1]); return MAU_HO_SO[Number.isInteger(k) && k < MAU_HO_SO.length ? k : 0]; };
/** «9 tuổi · khoảng lớp 4» (lớp = tuổi − 5, chỉ 6–17 tuổi). */
export const cauTuoi = (namSinh: number | null) => {
  if (!namSinh) return null;
  const t = new Date().getFullYear() - namSinh;
  if (t < 1 || t > 25) return null;
  return t >= 6 && t <= 17 ? `${t} tuổi · khoảng lớp ${t - 5}` : `${t} tuổi`;
};
