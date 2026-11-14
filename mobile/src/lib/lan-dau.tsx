// Thành phần dùng chung cho hành trình «Lần đầu dùng» + «Ghép thêm máy» của Ba Mẹ (thiết kế chốt 04/11 — docs/thiet-ke-chot/bm-lan-dau,
// bm-ghep-may). Chỉ dựng lại các mảnh thiết kế có mà kit chưa có: thanh 4 bước bằng icon, nút đăng nhập Google/Facebook (hình — nối OAuth ở
// dang-nhap-mxh.tsx), ô mật khẩu có mắt, mã ghép 6 số to, hàng chia sẻ link (Zalo / Tin nhắn / Messenger / Sao chép / Khác), 3 bước trên máy Con,
// ô icon app trong lưới, bánh xe chọn giờ. Màu / bóng / men lấy token Clay (mau.ts, clay.ts) — không chép CSS thô của HTML thiết kế.
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Image } from "expo-image";
import { ICON_3D, type Ten3D } from "./icon-3d";
import { Linking, Platform, Pressable, ScrollView, Share, Text, TextInput, useWindowDimensions, View, type TextInputProps } from "react-native";
import { router } from "expo-router";
import { SvgXml } from "react-native-svg";
import { BONG, BO_CLAY, KHOI, MEN } from "./clay";
import { saoChep } from "./luu-tep";
import { Chu, F, Icon, Icon3D, LopMen, M, NhanMen, Rob, type LinhVat, type TenIcon } from "./ui";

/** Ảnh icon 3D theo tên tệp (kể cả icon chỉ có bản 3D như «lap_lanh», không có trong bộ icon đặc). */
export const Anh3D = ({ ten, co = 22 }: { ten: Ten3D; co?: number }) => (
  <Image cachePolicy="memory-disk" source={ICON_3D[ten]} style={{ width: co, height: co }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
);

// ---------------------------------------------------------------- thanh bước + đầu màn

/** 4 bước Lần đầu (thiết kế: icon người · sao · đồng hồ · máy tính): bước xong hiện dấu tick, bước đang làm có viền ngọc. */
const BUOC_IC: TenIcon[] = ["nguoi", "sao", "dongho", "may_tinh"];
export function ThanhBuoc({ dang, ic }: { dang: number; /** đổi icon bước đang làm (vd «khien» ở màn Chọn app) */ ic?: TenIcon }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="progressbar" accessibilityLabel={`Bước ${dang + 1} trên 4`}>
      {BUOC_IC.map((t, i) => (
        <View key={t} style={[{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
          i === dang ? { backgroundColor: "#dcebe6", boxShadow: `0px 0px 0px 2.5px ${M.chinh}, ${BONG.nho}` } : { backgroundColor: "#e6e5e1", boxShadow: BONG.lom }]}>
          <View style={{ opacity: i <= dang ? 1 : 0.45 }}><Icon3D ten={i < dang ? "tick" : i === dang && ic ? ic : t} co={20} /></View>
        </View>
      ))}
    </View>
  );
}

/** Hàng đầu màn: nút lùi (mũi tên) bên trái + phần phải (thanh bước / «Cần giúp?»). `ve` = đường thay khi không lùi được. */
export function DauMan({ ve, phai, khongLui, bamLui, tieu }: { ve?: string; phai?: ReactNode; khongLui?: boolean; bamLui?: () => void; /** tiêu đề cạnh nút lùi */ tieu?: string }) {
  const lui = () => (bamLui ? bamLui() : router.canGoBack() ? router.back() : router.replace((ve ?? "/") as never));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingRight: 16, minHeight: 52 }}>
      {khongLui ? <View style={{ width: 44 }} /> : (
        <Pressable onPress={lui} accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={6} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Icon ten="trai" mau={M.chinhInk} co={24} />
        </Pressable>
      )}
      {tieu ? <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, minWidth: 0, fontFamily: F.rat, fontSize: 20, color: M.chu, letterSpacing: -0.3 }}>{tieu}</Text> : null}
      {phai}
    </View>
  );
}

/** Nút «?» tròn góc phải ⇒ chat AiiLab hỗ trợ (màn Ghép máy). */
export const NutHoi = () => (
  <Pressable onPress={() => router.push("/ho-tro")} accessibilityRole="button" accessibilityLabel="Cần giúp?" hitSlop={6}
    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...KHOI.nho }}>
    <Icon3D ten="dau_hoi" co={26} />
  </Pressable>
);

/** Liên kết «Cần giúp?» góc phải đầu màn ⇒ chat AiiLab hỗ trợ. */
export const CanGiup = () => (
  <Pressable onPress={() => router.push("/ho-tro")} accessibilityRole="link" hitSlop={8} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }}>
    <Chu kieu="rat" co={14} mau={M.chinhInk}>Cần giúp?</Chu>
  </Pressable>
);

/** Tiêu đề lớn của màn (thiết kế: 26–28px, đậm). */
export const TieuDe = ({ chu, phu, giua, co = 27 }: { chu: string; phu?: string; giua?: boolean; co?: number }) => (
  <View style={{ gap: 4, alignItems: giua ? "center" : undefined }}>
    <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: co, lineHeight: Math.round(co * 1.18), letterSpacing: -0.5, color: M.chu, textAlign: giua ? "center" : undefined }}>{chu}</Text>
    {phu ? <Chu co={15} mau={M.chu2} style={giua ? { textAlign: "center" } : undefined}>{phu}</Chu> : null}
  </View>
);

/** Cảnh đầu màn kiểu thiết kế mới: khối ngọc nhạt, bong bóng trắng (tiêu đề + 1 câu) bên trái, Grow bên phải. */
export function CanhRob({ lv, tieu, loi, ic, cao = 150 }: { lv: LinhVat; tieu: string; loi?: string; ic?: TenIcon; cao?: number }) {
  return (
    <View style={{ borderRadius: BO_CLAY.the, backgroundColor: "#dcebe6", minHeight: cao, padding: 14, flexDirection: "row", alignItems: "center", ...KHOI.the }}>
      <LopMen men={MEN.vien} bo={BO_CLAY.the} />
      {ic ? <View style={{ position: "absolute", left: 14, bottom: 12 }}><Icon3D ten={ic} co={44} /></View> : null}
      <View style={{ maxWidth: "64%", backgroundColor: "#fff", borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14, boxShadow: BONG.nho, marginBottom: ic ? 40 : 0 }}>
        <Chu kieu="rat" co={16}>{tieu}</Chu>
        {loi ? <Chu co={13.5} mau={M.chu2} style={{ marginTop: 2 }}>{loi}</Chu> : null}
      </View>
      <View pointerEvents="none" style={{ position: "absolute", right: 4, bottom: 0, top: 4, width: "36%", alignItems: "flex-end", justifyContent: "flex-end" }}>
        <Rob ten={lv} co={Math.min(cao - 6, 130)} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- tài khoản: Google / Facebook, ô mật khẩu

const G_SVG = `<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
const FB_SVG = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M13.4 19.5v-6.2h2.1l.3-2.5h-2.4V9.3c0-.7.2-1.2 1.2-1.2h1.3V5.9c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.8H8.7v2.5h2.1v6.2z"/></svg>`;

/** Nút Google / Facebook (chỉ phần hình) — nối OAuth ở lib/dang-nhap-mxh.tsx › NutMxhThat. */
export function NutMxh({ loai, bam, to }: { loai: "google" | "facebook"; bam: () => void; to?: boolean }) {
  const ten = loai === "google" ? "Google" : "Facebook";
  return (
    <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={`Tiếp tục với ${ten}`} muc="nut" sang={!to} men={to ? MEN.toi : MEN.sang}
      style={[{ flexGrow: 1, flexBasis: 0, minHeight: to ? 56 : 52, borderRadius: BO_CLAY.nut, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14 },
        to ? { backgroundColor: M.nut, boxShadow: BONG.toi, alignSelf: "stretch" } : { backgroundColor: M.the, boxShadow: BONG.nho }]}>
      <View style={to ? { width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" } : undefined}>
        <SvgXml xml={loai === "google" ? G_SVG : FB_SVG} width={to ? 18 : 22} height={to ? 18 : 22} />
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: to ? 16.5 : 15.5, color: to ? "#fff" : M.chu }}>{to ? `Tiếp tục với ${ten}` : ten}</Text>
    </NhanMen>
  );
}

/** Nút «Số điện thoại» cạnh nút Facebook. */
export function NutSdt({ bam }: { bam: () => void }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="button" muc="nut" sang men={MEN.sang}
      style={{ flexGrow: 1, flexBasis: 0, minHeight: 52, borderRadius: BO_CLAY.nut, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14, backgroundColor: M.the, boxShadow: BONG.nho }}>
      <Icon ten="dt" mau={M.chu} co={20} />
      <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 15.5, color: M.chu }}>Số điện thoại</Text>
    </NhanMen>
  );
}

export const DieuKhoan = () => (
  <Chu co={12.5} mau={M.chu3} style={{ textAlign: "center" }}>
    Tiếp tục là đồng ý <Chu kieu="rat" co={12.5} mau={M.chinhInk}>Điều khoản</Chu> và <Chu kieu="rat" co={12.5} mau={M.chinhInk}>Quyền riêng tư</Chu>
  </Chu>
);

/** Ô nhập kiểu lòng chảo (thiết kế: nền xám lõm, không viền) + nhãn trái / ghi chú phải + nút mắt cho mật khẩu. */
export function OLom({ nhan, ghi, ghiOk, matKhau, ...p }: TextInputProps & { nhan: string; ghi?: string; ghiOk?: boolean; matKhau?: boolean }) {
  const [an, setAn] = useState(true);
  const [dang, setDang] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
        <Chu kieu="rat" co={14}>{nhan}</Chu>
        {ghi ? <Chu kieu={ghiOk ? "rat" : "thuong"} co={12.5} mau={ghiOk ? M.chinhInk : M.chu3}>{ghiOk ? `✓ ${ghi}` : ghi}</Chu> : null}
      </View>
      <View style={[{ flexDirection: "row", alignItems: "center", minHeight: 54, borderRadius: 27, backgroundColor: "#e9e8e4", boxShadow: BONG.lom, paddingLeft: 18, paddingRight: 6 },
        dang && { boxShadow: `${BONG.lom}, 0px 0px 0px 2px ${M.chinh}` }]}>
        <TextInput placeholderTextColor={M.chu3} accessibilityLabel={nhan} secureTextEntry={matKhau && an} onFocus={() => setDang(true)} onBlur={() => setDang(false)} {...p}
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
export const LienKet = ({ chu, bam, gach }: { chu: string; bam: () => void; gach?: boolean }) => (
  <Pressable onPress={bam} accessibilityRole="link" hitSlop={4} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
    <Chu kieu="rat" co={14.5} mau={M.chinhInk} style={gach ? { textDecorationLine: "underline" } : undefined}>{chu}</Chu>
  </Pressable>
);

// ---------------------------------------------------------------- ghép máy: mã to, chia sẻ, 3 bước

/** «482017» ⇒ «482 017». */
export const hienMa = (ma: string) => (ma.length === 6 ? `${ma.slice(0, 3)} ${ma.slice(3)}` : ma);
/** «https://aiigrow.aiilab.vn/tai?g=…» ⇒ «aiigrow.aiilab.vn/tai» (chữ ngắn trên màn). */
export const linkNgan = (lienKet: string) => lienKet.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
/** Giây ⇒ «9:42». */
export const demNguoc = (giay: number) => `${Math.floor(Math.max(0, giay) / 60)}:${String(Math.max(0, giay) % 60).padStart(2, "0")}`;

type ChiaSe = { tieuDe: string; noiDung: string; lienKet: string };
const ZALO = `<svg viewBox="0 0 48 48"><text x="24" y="30" text-anchor="middle" font-family="Inter,Arial" font-weight="800" font-size="15" fill="#fff">Zalo</text></svg>`;
const TIN = `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11c0 2.5 1.4 4.7 3.7 6.2L5 21l4-2.2c1 .3 2 .4 3 .4 5.5 0 10-3.6 10-8.1S17.5 3 12 3z"/></svg>`;
const MES = `<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 2.5C6.6 2.5 2.5 6.4 2.5 11.4c0 2.7 1.2 5 3.1 6.6V21l2.9-1.6c1.1.3 2.3.5 3.5.5 5.4 0 9.5-3.9 9.5-8.9S17.4 2.5 12 2.5zm1 11.8-2.4-2.6-4.7 2.6 5.2-5.5 2.5 2.6 4.6-2.6z"/></svg>`;

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

/** Hàng chia sẻ kiểu iPhone: Zalo · Tin nhắn · Messenger · Sao chép link · Khác…  Zalo không có đường chia sẻ chữ ra ngoài ⇒ bảng chia sẻ
 *  của máy (chọn Zalo) — web: chép sẵn nội dung để dán. `bao` hiện toast. */
export function HangChiaSe({ chiaSe, bao }: { chiaSe: ChiaSe; bao: (chu: string) => void }) {
  const chep = (chu: string, cau: string) => saoChep(chu).then((ok) => { if (ok) bao(cau); });
  const muc: { ten: string; nen: string; ve: ReactNode; bam: () => void }[] = [
    { ten: "Zalo", nen: "#0068ff", ve: <SvgXml xml={ZALO} width={44} height={44} />,
      bam: () => (Platform.OS === "web" ? chep(chiaSe.noiDung, "Đã chép link — mở Zalo, dán gửi sang máy của con") : chiaSeHeThong(chiaSe)) },
    { ten: "Tin nhắn", nen: "#34c759", ve: <SvgXml xml={TIN} width={28} height={28} />,
      bam: () => { Linking.openURL(`sms:${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(chiaSe.noiDung)}`).catch(() => chep(chiaSe.noiDung, "Đã chép link — dán vào tin nhắn")); } },
    { ten: "Messenger", nen: "#7b5cff", ve: <SvgXml xml={MES} width={28} height={28} />,
      bam: () => {
        if (Platform.OS === "web") { chep(chiaSe.noiDung, "Đã chép link — mở Messenger, dán gửi sang máy của con"); return; }
        Linking.openURL(`fb-messenger://share/?link=${encodeURIComponent(chiaSe.lienKet)}`).catch(() => chiaSeHeThong(chiaSe));
      } },
    { ten: "Chép link", nen: M.the, ve: <Icon3D ten="lap" co={28} />, bam: () => chep(chiaSe.lienKet, "Đã chép link ghép máy") },
    { ten: "Khác…", nen: M.the, ve: <View style={{ flexDirection: "row", gap: 4 }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: M.chu2 }} />)}</View>,
      bam: () => chiaSeHeThong(chiaSe).then((chep) => { if (chep) bao("Đã chép nội dung — dán vào ứng dụng Ba Mẹ muốn gửi"); }) },
  ];
  // Khổ hẹp (< 60 px mỗi ô — máy 320–360 px): 3 ô một hàng, «Messenger» không gãy 2 dòng; khổ rộng: một hàng 5 ô như bảng chia sẻ iPhone.
  // trước lần đo đầu: ước theo bề ngang cửa sổ (lề màn + thẻ ≈ 64 px) ⇒ khung đầu tiên đã đúng kiểu, không nháy từ 1 hàng sang 3 + 2
  const { width: cuaSo, fontScale: cuaSoCo } = useWindowDimensions();
  const [rong, setRong] = useState(0);
  // ngưỡng nhân cỡ chữ hệ thống (Dynamic Type / font scale): chữ to hơn thì cần ô rộng hơn mới giữ «Messenger» một dòng
  const hep = (rong || cuaSo - 64) / muc.length < 60 * Math.max(1, cuaSoCo);
  return (
    <View onLayout={(e) => setRong(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: hep ? "wrap" : "nowrap", justifyContent: hep ? "center" : "space-between", rowGap: 12 }}
      accessibilityLabel="Chia sẻ link ghép máy">
      {muc.map((m) => (
        <Pressable key={m.ten} onPress={m.bam} accessibilityRole="button" accessibilityLabel={m.ten} style={[{ alignItems: "center", gap: 6, minHeight: 44 }, hep ? { width: "33.33%" } : { flex: 1 }]}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: m.nen, alignItems: "center", justifyContent: "center", boxShadow: BONG.nho, overflow: "hidden" }}>{m.ve}</View>
          <Text numberOfLines={1} style={{ fontFamily: F.dam, fontSize: 11, lineHeight: 14, color: M.chu, textAlign: "center" }}>{m.ten}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Một bước làm trên máy Con (thẻ: số tròn ngọc + icon 3D + tiêu đề + dòng phụ). */
export function BuocMayCon({ n, ic, tieu, phu, gach }: { n: number; ic: TenIcon; tieu: ReactNode; phu: string; gach?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>
      <LopMen men={MEN.the} bo={24} />
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center", boxShadow: BONG.ngoc }}>
        <Chu kieu="rat" co={14} mau="#fff">{n}</Chu>
      </View>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#eeede9", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}><Icon3D ten={ic} co={30} /></View>
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
  aiirob: { nen: "#e3efeb", rob: true }, tu_dien: { nen: "#e8f0ff", ic: "sach" }, google: { nen: "#ffffff", svg: G_SVG }, ve: { nen: "#fff4e0", ic: "but" },
  lich: { nen: "#ffffff", ic: "lich" }, tiktok: { nen: "#111414", svg: TT }, zalo: { nen: "#0068ff", chu: "Zalo" }, scratch: { nen: "#fff1c9", ic: "game" },
  duolingo: { nen: "#58cc02", chu: "D" }, khan: { nen: "#14bf96", chu: "K" }, zoom: { nen: "#2d8cff", chu: "Z" }, capcut: { nen: "#111414", chu: "C" },
};

/** Ô icon một app: hình theo mã app trong lưới (server/lib/che-do-chan.ts › APP_GOI_Y); app «Thêm app khác» ⇒ chữ cái đầu. */
export function OApp({ ma, ten, chon, bam, nhanDoc, rong = "25%" }: { ma?: string; ten: string; chon?: boolean; bam?: () => void; nhanDoc?: string; /** bề ngang ô (lưới 4 cột) */ rong?: `${number}%` | number }) {
  const h: HinhApp = (ma && HINH_APP[ma]) || { nen: "#dfe9f7", chu: (ten || nhanDoc || "").trim().charAt(0).toUpperCase() || "?" };
  const tat = chon === false;
  const o = (
    <View style={{ alignItems: "center", gap: 6, width: "100%" }}>
      <View style={{ width: 60, height: 60 }}>
        <View style={[{ width: 60, height: 60, borderRadius: 20, backgroundColor: h.nen, alignItems: "center", justifyContent: "center", overflow: "hidden", ...KHOI.nho }, tat && { opacity: 0.45 }]}>
          {h.svg ? <SvgXml xml={h.svg} width={28} height={28} /> : h.rob ? <Rob ten="hoc" co={46} /> : h.ic ? <Icon3D ten={h.ic} co={38} />
            : <Chu kieu="rat" co={h.chu && h.chu.length > 2 ? 15 : 24} mau={h.nen === "#dfe9f7" ? M.lam : "#fff"}>{h.chu}</Chu>}
        </View>
        {chon !== undefined ? (
          <View style={{ position: "absolute", right: -5, bottom: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: chon ? M.chinh : "#2e3533",
            boxShadow: "0px 0px 0px 2.5px #f7f6f3", alignItems: "center", justifyContent: "center" }}>
            <Icon ten={chon ? "tick" : "tru"} mau="#fff" co={13} />
          </View>
        ) : null}
      </View>
      {ten ? <Chu kieu="rat" co={12} mau={tat ? "#565c59" : M.chu} dong={2} style={{ textAlign: "center", lineHeight: 15, minHeight: 30 }}>{ten}</Chu> : null}
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
      <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: "#ecebe7", boxShadow: BONG.lom, borderWidth: 2, borderStyle: "dashed", borderColor: "#9fb8b0", alignItems: "center", justifyContent: "center" }}>
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
            <Chu kieu={x === gia ? "rat" : "dam"} co={x === gia ? 26 : 19} mau={x === gia ? M.chu : "#9a9f9c"} so>{x}</Chu>
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
  const mm = phutDs.includes(m) ? m : phutDs[Math.round(Number(m) / 5) % 12];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: CAO_O * 2, height: CAO_O, borderRadius: 14, backgroundColor: "#e3efeb" }} />
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
  const coRob = Math.max(110, cao - 30 - (thoai || tren ? hTren + 12 : 0));
  return (
    <View style={{ minHeight: cao, borderRadius: 34, backgroundColor: "#dcebe6", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", ...KHOI.the }}>
      <LopMen men={MEN.vien} bo={34} />
      {thoai || tren ? (
        <View onLayout={(e) => setHTren(Math.ceil(e.nativeEvent.layout.height))} style={{ alignSelf: "stretch", paddingHorizontal: 12, paddingTop: 12 }}>
          {thoai ? (
            <View style={{ alignSelf: "flex-start", marginLeft: 4, marginTop: 4, maxWidth: "80%", backgroundColor: "#fff", borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, boxShadow: BONG.nho }}>
              <Chu kieu="rat" co={14}>{thoai}</Chu>
            </View>
          ) : null}
          {tren}
        </View>
      ) : null}
      <View style={{ flex: 1, justifyContent: "flex-end" }}><Rob ten={lv} co={coRob} /></View>
    </View>
  );
}

// ---------------------------------------------------------------- hồ sơ Con: màu + tuổi

/** 5 màu hồ sơ (thiết kế «Màu của con»): [màu đậm, nền thẻ nhạt]. Lưu ở `children.avatar` dạng «mau-<số>». */
export const MAU_HO_SO: [string, string][] = [["#f29a4a", "#fde3c8"], ["#6aa3ef", "#dce9fb"], ["#ec8db2", "#fbe0ea"], ["#5bbf95", "#d9f1e6"], ["#a98bea", "#e9e1fb"]];
export const mauHoSo = (avatar?: string | null) => { const k = Number(/^mau-(\d)$/.exec(avatar ?? "")?.[1]); return MAU_HO_SO[Number.isInteger(k) && k < MAU_HO_SO.length ? k : 0]; };
/** «9 tuổi · khoảng lớp 4» (lớp = tuổi − 5, chỉ 6–17 tuổi). */
export const cauTuoi = (namSinh: number | null) => {
  if (!namSinh) return null;
  const t = new Date().getFullYear() - namSinh;
  if (t < 1 || t > 25) return null;
  return t >= 6 && t <= 17 ? `${t} tuổi · khoảng lớp ${t - 5}` : `${t} tuổi`;
};
