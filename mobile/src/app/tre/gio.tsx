// «Giờ chơi» bản «Dịu» (con-dt-gio 03 cdt-phien): «● Bảo Anh» (giờ tính riêng cho bé đang đăng nhập — L13), vòng «28 phút còn lại»,
// «Đã chơi 42 / 70 phút», «App được mở» (app giải trí Ba Mẹ cho phép dùng chung quỹ — «tính giờ»; app học «không tính»), «Xin Ba Mẹ thêm giờ».
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { kid, lyDoKhoa, tenMuc, type QuyCon, type TroChoi } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { ChoD, ChuD, ManD, MatMangD, NutD, PillD, TheD, VongD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

export default function Gio() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("gio", async () => {
    const [quy, tc] = await Promise.all([kid.goi<QuyCon>("quy"), kid.goi<{ ds: TroChoi[] }>("tro-choi").catch(() => ({ ds: [] as TroChoi[] }))]);
    return { quy, tc: tc.ds };
  });
  if (!d) return <ManD lui="/tre/nha" tieu="Giờ chơi"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const q = d.quy.quy;
  const ly = lyDoKhoa(q);
  if (ly) return <Redirect href={`/tre/gio-ngu?ly=${ly}`} />;
  if (q.conPhut <= 0) return <Redirect href="/tre/het-phien" />;
  const app = [...new Set(d.tc.map((x) => tenMuc(x.muc, x.ten)))];
  return (
    <ManD lui="/tre/nha" tieu="Giờ chơi" phai={ten ? <PillD chu={`● ${ten}`} loai="xanh" /> : undefined}
      day={q.choXinThem ? <NutD chu="Xin Ba Mẹ thêm giờ" ic="tin" bam={() => router.push("/tre/them-gio")} /> : undefined}>
      {matMang || cu ? <MatMangD chu="Mất mạng rồi — giờ chơi vẫn tính như thường." /> : null}
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 6 }}>
        <VongD ti={q.tongPhut ? q.conPhut / q.tongPhut : 0} so={String(q.conPhut)} don="phút còn lại" co={180} day={15} />
        <ChuD kieu="rat" co={15} mau={D.chu2}>{`Đã chơi ${q.daDung} / ${q.tongPhut} phút`}</ChuD>
      </View>
      <ChuD kieu="den" co={15}>App được mở</ChuD>
      <TheD style={{ gap: 0, paddingVertical: 4 }}>
        {app.length ? app.map((a, i) => (
          <View key={a} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderTopWidth: i ? 1 : 0, borderTopColor: D.vien }}>
            <ChuD kieu="rat" co={16} style={{ flex: 1 }} dong={1}>{a}</ChuD>
            <ChuD kieu="rat" co={13.5} mau={D.chu2}>tính giờ</ChuD>
          </View>
        )) : <ChuD co={14} mau={D.chu2} style={{ paddingVertical: 12 }}>Ba Mẹ chưa xếp app chơi nào.</ChuD>}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderTopWidth: app.length ? 1 : 0, borderTopColor: D.vien }}>
          <ChuD kieu="rat" co={16} style={{ flex: 1 }}>App học · AiiRob</ChuD>
          <ChuD kieu="rat" co={13.5} mau={D.xanhD}>không tính</ChuD>
        </View>
      </TheD>
    </ManD>
  );
}
