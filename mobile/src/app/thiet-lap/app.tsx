// them-mdujxlg2 «App cho X» (thiết kế chốt 14/11, chế độ «Chặn app & web»): thanh tìm «🔍 Tìm app trên máy con… + Thêm» ⇒ them-at57ypdc,
// «Đã chọn N app · App không chọn sẽ khoá», danh mục chia nhóm (lib/danh-muc-lan-dau.ts) mỗi nhóm «Chọn tất cả», dòng chạm ＋ / ✓.
// Không chọn sẵn. App gửi lên máy chủ theo TÊN (máy chủ khớp lưới app-goi-y / app thật máy Con báo — docs/API.md › app-cho-phep):
// nhóm «Giải trí · Ba Mẹ cân nhắc» tính vào giờ chơi (vàng «Tính giờ» — N3), các nhóm khác dùng thoải mái (xanh, không trừ giờ).
// «Tiếp: chọn web cho con» ⇒ them-3xbscpzm (/thiet-lap/web). Lưu một lần ở màn Web (POST thiet-lap).
import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { DM_APP, type MucDm } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { boDau, DauNhom, DongChon, DongDem, theoNhom, ThanhTimGia, TheDs, tinhGioDm } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, type AppChon } from "@/lib/thiet-lap";
import { Chu, M, Man, Nut } from "@/lib/ui";

export default function ChonApp() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [apps, setApps] = useState<AppChon[]>(tl.apps ?? []);
  useFocusEffect(useCallback(() => { setApps(layTl().apps ?? []); }, []));     // quay về từ «Thêm app» ⇒ đọc lại
  const nhom = useMemo(() => theoNhom(DM_APP), []);
  const co = (t: string) => apps.some((a) => boDau(a.ten) === boDau(t));
  const doi = (ds: MucDm[], bat: boolean) => {
    const k = new Set(ds.map((x) => boDau(x.ten)));
    const moi = [...apps.filter((a) => !k.has(boDau(a.ten))), ...(bat ? ds.map((x) => ({ ten: x.ten, tinhGio: tinhGioDm(x) })) : [])];
    setApps(moi);
    datTl({ apps: moi });
  };
  // app Ba Mẹ gõ thêm (ngoài danh mục) — hiện đầu danh sách để bỏ được
  const rieng = apps.filter((a) => !DM_APP.some((x) => boDau(x.ten) === boDau(a.ten)));
  return (
    <Man dau={<DauMan ve="/thiet-lap/che-do" phai={<ThanhBuoc5 dang={4} ic="khien" />} />}
      day={<Nut chu="Tiếp: chọn web cho con" rong bam={() => { datTl({ apps }); router.push("/thiet-lap/web"); }} />}>
      <Chu kieu="rat" co={26} style={{ letterSpacing: -0.5 }}>{`App cho ${ten}`}</Chu>
      <ThanhTimGia chu="🔍 Tìm app trên máy con…" nhan="Tìm hoặc thêm app trên máy con" bam={() => router.push("/thiet-lap/them-app")} />
      <DongDem trai={`Đã chọn ${apps.length} app`} phai="App không chọn sẽ khoá" />
      {rieng.length ? (
        <View style={{ gap: 6 }}>
          <DauNhom chu="➕ Ba Mẹ thêm" />
          <TheDs>{rieng.map((a, i) => <DongChon key={a.ten} dau={!i} e="📱" ten={a.ten} phu={"tinhGio" in a && a.tinhGio ? "Tính vào giờ chơi" : "Dùng thoải mái"} chon bam={() => {
            const moi = apps.filter((x) => x !== a); setApps(moi); datTl({ apps: moi });
          }} />)}</TheDs>
        </View>
      ) : null}
      {nhom.map((g) => {
        const het = g.ds.every((x) => co(x.ten));
        return (
          <View key={g.nhom} style={{ gap: 6 }}>
            <DauNhom chu={`${g.eN} ${g.nhom}`} het={het} bam={() => doi(g.ds, !het)} />
            <TheDs>{g.ds.map((x, i) => <DongChon key={x.ten} dau={!i} e={x.e} ten={x.ten} phu={x.phu} chon={co(x.ten)} bam={() => doi([x], !co(x.ten))} />)}</TheDs>
          </View>
        );
      })}
      <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>AiiGrow không đề xuất: TikTok, Facebook, Instagram, YouTube bản thường — chỉ dành cho từ 13 tuổi.</Chu>
    </Man>
  );
}
