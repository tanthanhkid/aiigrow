// «Đang chơi» bản «Dịu» (con-dt-gio 03 cdt-phien, sổ sao 15/11 #264 #265): «● Bảo Anh» (sao, phút tính riêng cho bé đang đăng nhập — L13),
// vòng «28 sao còn lại», «Còn 28 sao = 28 phút chơi», «Hôm nay chơi 42 phút», «Hôm nay · 1 sao = 1 phút»: app Tính phút (trừ sao) / app học,
// AiiRob «không tính phút»; «Xin Ba Mẹ cho vay sao». Hết sao ⇒ «Hết sao rồi»; Ba Mẹ khoá máy ⇒ màn khoá.
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { kid, taiSao, tenMuc, type TroChoi } from "@/lib/api-tre";
import { soVN } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { ChoD, ChuD, ManD, MatMangD, NutD, PillD, TheD, VongD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

export default function DangChoi() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("sao", taiSao);
  const tc = useTaiTre("tro-choi", () => kid.goi<{ ds: TroChoi[] }>("tro-choi").catch(() => ({ ds: [] as TroChoi[] })));
  if (!d) return <ManD lui="/tre/nha" tieu="Đang chơi"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  if (d.khoa) return <Redirect href="/tre/gio-ngu?ly=ba_me_khoa" />;
  if (d.hetSao) return <Redirect href="/tre/het-phien" />;
  const app = [...new Set((tc.d?.ds ?? []).map((x) => tenMuc(x.muc, x.ten)))];
  const dong = [...app.map((a) => [a, "tính phút · trừ sao", false] as const), ["App học · AiiRob", "không tính phút", true] as const];
  return (
    <ManD lui="/tre/nha" tieu="Đang chơi" phai={ten ? <PillD chu={`● ${ten}`} loai="xanh" /> : undefined}
      day={<NutD chu="Xin Ba Mẹ cho vay sao" ic="tin" bam={() => router.push("/tre/them-gio")} />}>
      {matMang || cu ? <MatMangD chu="Mất mạng rồi — phút chơi vẫn tính như thường." /> : null}
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 6 }}>
        <VongD ti={d.phutCon / Math.max(1, d.phutCon + d.phutHomNay)} so={soVN(d.phutCon)} don="sao còn lại" co={180} day={15} />
        <ChuD kieu="den" co={18}>{`Còn ${soVN(d.phutCon)} sao = ${soVN(d.phutCon)} phút chơi`}</ChuD>
        <ChuD kieu="rat" co={15} mau={D.chu2}>{`Hôm nay chơi ${d.phutHomNay} phút`}</ChuD>
      </View>
      <ChuD kieu="den" co={15}>Hôm nay · 1 sao = 1 phút</ChuD>
      <TheD style={{ gap: 0, paddingVertical: 4 }}>
        {dong.map(([a, phu, xanh], i) => (
          <View key={a} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderTopWidth: i ? 1 : 0, borderTopColor: D.vien }}>
            <ChuD kieu="rat" co={16} style={{ flex: 1 }} dong={1}>{a}</ChuD>
            <ChuD kieu="rat" co={13.5} mau={xanh ? D.xanhD : D.chu2}>{phu}</ChuD>
          </View>
        ))}
      </TheD>
    </ManD>
  );
}
