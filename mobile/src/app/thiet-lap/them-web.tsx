// them-ubomxl31 «Thêm web cho X» (MỚI 14/11): «Gõ tên hoặc dán link» ⇒ «Kết quả N» — trang trong danh mục khớp chữ gõ (DM_WEB) + tên miền rút
// từ link Ba Mẹ dán (https://www.khanacademy.org/math ⇒ khanacademy.org) khi chưa có trong danh mục; ＋ / «✓ Đã thêm». «Xong» ⇒ về Web cho X.
// Trang ngoài danh mục tính vào giờ chơi (như app thêm tay — them-at57ypdc). Mọi trang con của tên miền đều vào được (máy chủ khớp tên miền con).
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { DM_WEB } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { boDau, DongKetQua, tenMien, TheDs, tinhGioDm, WEB_TOI_DA } from "@/lib/lan-dau-ds";
import { bm } from "@/lib/api";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, type WebChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, F, Icon3D, M, Man, Nut, useLam } from "@/lib/ui";

export default function ThemWeb() {
  const ten = layTl().tenCon ?? "con";
  const [go, setGo] = useState("");
  const [webs, setWebs] = useState<WebChon[]>(layTl().webs ?? []);
  const { lam, loi, setLoi } = useLam();
  const k = boDau(go), mien = tenMien(go);
  const tim = (mien ?? k).replace(/^https?:\/\//, "");
  const khop = tim ? DM_WEB.filter((w) => w.ten.includes(tim) || boDau(w.phu).includes(k)) : [];
  const ds: { muc: string; e: string; phu: string; tinhGio: boolean }[] = [
    ...khop.map((w) => ({ muc: w.ten, e: w.e, phu: w.phu, tinhGio: tinhGioDm(w) })),
    ...(mien && !khop.some((w) => w.ten === mien) ? [{ muc: mien, e: "🔗", phu: "Trang Ba Mẹ dán · tính vào giờ chơi", tinhGio: true }] : []),
  ];
  const co = (m: string) => webs.some((w) => w.muc === m);
  const ghi = (moi: WebChon[]) => { setWebs(moi); datTl({ webs: moi }); };
  // bỏ: ngay. Thêm: tối đa 60 trang; trang Ba Mẹ dán (ngoài danh mục) hỏi máy chủ trước — trang luôn chặn / địa chỉ sai báo ngay ở đây,
  // không để cả lượt lưu Lần đầu (màn Web) hỏng vì một trang
  const doi = (x: (typeof ds)[number]) => {
    setLoi(null);
    if (co(x.muc)) { ghi(webs.filter((w) => w.muc !== x.muc)); return; }
    if (webs.length >= WEB_TOI_DA) { setLoi(`Chọn tối đa ${WEB_TOI_DA} trang web.`); return; }
    if (DM_WEB.some((w) => w.ten === x.muc)) { ghi([...webs, { muc: x.muc, tinhGio: x.tinhGio }]); return; }
    lam(async () => {
      const r = await bm.goi<{ muc: string }>("thiet-lap/kiem-web", { muc: x.muc });
      const cu = layTl().webs ?? [];
      if (!cu.some((w) => w.muc === r.muc)) ghi([...cu, { muc: r.muc, tinhGio: x.tinhGio }]);
    });
  };
  return (
    <Man dau={<DauMan ve="/thiet-lap/web" phai={<ThanhBuoc5 dang={4} ic="khien" />} />}
      day={<Nut chu="Xong" rong bam={() => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/web"))} />}>
      <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: M.chu }}>{`Thêm web\ncho ${ten}`}</Text>
      <View style={{ borderRadius: 26, backgroundColor: "#fcefc9", backgroundImage: "linear-gradient(#fdf3dc, #fbe9b8)", padding: 16, gap: 10, ...KHOI.the }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon3D ten="web" co={20} /><Chu kieu="rat" co={14.5} mau={M.chu2}>Gõ tên hoặc dán link</Chu></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, borderRadius: 26, backgroundColor: "#fffaf0", boxShadow: BONG.lom, paddingLeft: 16, paddingRight: 6 }}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput value={go} onChangeText={setGo} autoFocus placeholder="khanacademy, olm.vn…" placeholderTextColor={M.chu3} accessibilityLabel="Tên hoặc link trang web"
            autoCorrect={false} autoCapitalize="none" keyboardType="url" style={{ flex: 1, fontFamily: F.dam, fontSize: 16, color: M.chu, paddingVertical: 10, outlineStyle: "none" } as never} />
          {go ? <Pressable onPress={() => setGo("")} accessibilityRole="button" hitSlop={6} style={{ minHeight: 40, paddingHorizontal: 10, justifyContent: "center" }}>
            <Chu kieu="rat" co={13} mau={M.chinhInk}>Xoá</Chu></Pressable> : null}
        </View>
      </View>
      <BaoLoi loi={loi} />
      {k ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
            <Chu kieu="rat" co={16} style={{ flex: 1 }}>Kết quả</Chu><Chu kieu="dam" co={13} mau={M.chu3}>{ds.length}</Chu>
          </View>
          {ds.length ? <TheDs>{ds.map((x, i) => <DongKetQua key={x.muc} dau={!i} e={x.e} ten={x.muc} phu={x.phu} da={co(x.muc)} bam={() => doi(x)} />)}</TheDs>
            : <Chu co={13} mau={M.chu2} style={{ paddingHorizontal: 4 }}>Chưa thấy trang nào. Gõ đủ tên miền, ví dụ olm.vn.</Chu>}
        </>
      ) : null}
      <Chu co={13} mau={M.chu2} style={{ paddingHorizontal: 4 }}>
        Dán được cả đường link, ví dụ <Chu kieu="rat" co={13}>https://khanacademy.org</Chu>. Mọi trang con trong web đó đều vào được.
      </Chu>
    </Man>
  );
}
