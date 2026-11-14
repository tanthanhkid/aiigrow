// them-at57ypdc «Thêm app cho X» (thiết kế chốt 14/11): «Gõ tên app trên máy con» ⇒ «Kết quả N» — app trong danh mục khớp chữ gõ
// (lib/danh-muc-lan-dau.ts) + đúng tên Ba Mẹ gõ (khi không trùng danh mục); mỗi dòng ＋ / «✓ Đã thêm» (chạm lại để bỏ). «Xong» ⇒ về App cho X.
// App ngoài danh mục gửi theo tên, tính vào giờ chơi (thiết kế: «App thêm vào cũng tính vào giờ chơi»); máy chủ khớp với app thật máy Con báo.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { DM_APP } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { boDau, DongKetQua, TheDs, tinhGioDm } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, type AppChon } from "@/lib/thiet-lap";
import { Chu, F, Icon3D, M, Man, Nut } from "@/lib/ui";

export default function ThemApp() {
  const ten = layTl().tenCon ?? "con";
  const [go, setGo] = useState("");
  const [apps, setApps] = useState<AppChon[]>(layTl().apps ?? []);
  const k = boDau(go);
  const khop = k ? DM_APP.filter((a) => boDau(a.ten).includes(k) || boDau(a.phu).includes(k)) : [];
  const ds: { ten: string; e: string; phu: string; tinhGio: boolean }[] = [
    ...khop.map((a) => ({ ten: a.ten, e: a.e, phu: a.phu, tinhGio: tinhGioDm(a) })),
    ...(k && !khop.some((a) => boDau(a.ten) === k) ? [{ ten: go.trim().slice(0, 60), e: "📱", phu: "Đúng tên Ba Mẹ gõ · tính vào giờ chơi", tinhGio: true }] : []),
  ];
  const co = (t: string) => apps.some((a) => boDau(a.ten) === boDau(t));
  const doi = (x: (typeof ds)[number]) => {
    const moi = co(x.ten) ? apps.filter((a) => boDau(a.ten) !== boDau(x.ten)) : [...apps, { ten: x.ten, tinhGio: x.tinhGio }];
    setApps(moi);
    datTl({ apps: moi });
  };
  return (
    <Man dau={<DauMan ve="/thiet-lap/app" phai={<ThanhBuoc5 dang={4} ic="khien" />} />}
      day={<Nut chu="Xong" rong bam={() => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/app"))} />}>
      <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: M.chu }}>{`Thêm app\ncho ${ten}`}</Text>
      <View style={{ borderRadius: 26, backgroundColor: "#f7f6f3", padding: 14, gap: 10, ...KHOI.the }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon3D ten="tim_kiem" co={20} /><Chu kieu="rat" co={14.5} mau={M.chu2}>Gõ tên app trên máy con</Chu></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, borderRadius: 26, backgroundColor: "#ecebe7", boxShadow: BONG.lom, paddingLeft: 16, paddingRight: 6 }}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput value={go} onChangeText={setGo} autoFocus placeholder="Duolingo, Zoom, Khan Academy…" placeholderTextColor={M.chu3} accessibilityLabel="Tên app" autoCorrect={false}
            style={{ flex: 1, fontFamily: F.dam, fontSize: 16, color: M.chu, paddingVertical: 10, outlineStyle: "none" } as never} />
          {go ? <Pressable onPress={() => setGo("")} accessibilityRole="button" hitSlop={6} style={{ minHeight: 40, paddingHorizontal: 10, justifyContent: "center" }}>
            <Chu kieu="rat" co={13} mau={M.chinhInk}>Xoá</Chu></Pressable> : null}
        </View>
      </View>
      {k ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
            <Chu kieu="rat" co={16} style={{ flex: 1 }}>Kết quả</Chu><Chu kieu="dam" co={13} mau={M.chu3}>{ds.length}</Chu>
          </View>
          <TheDs>{ds.map((x, i) => <DongKetQua key={x.ten} dau={!i} e={x.e} ten={x.ten} phu={x.phu} da={co(x.ten)} bam={() => doi(x)} />)}</TheDs>
        </>
      ) : null}
      <Chu co={13} mau={M.chu2} style={{ paddingHorizontal: 4 }}>
        Không thấy? Gõ <Chu kieu="rat" co={13}>đúng tên app</Chu> như trên máy con. App thêm vào cũng tính vào giờ chơi.
      </Chu>
    </Man>
  );
}
