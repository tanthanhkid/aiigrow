// «Đang chơi» bản «Dịu» (con-dt-gio 03 cdt-phien, sổ sao 15/11 #264 #265): «● Bảo Anh» (sao, phút tính riêng cho bé đang đăng nhập — L13),
// vòng «28 sao còn lại», «Còn 28 sao = 28 phút chơi», «Hôm nay chơi 42 phút», «Hôm nay · 1 sao = 1 phút»: app Tính phút (trừ sao) / app học,
// AiiRob «không tính phút» (máy chủ mới: kid/sao › appHomNay «Roblox 30 phút · −30 sao»); «Xin Ba Mẹ cho vay sao». Hết sao ⇒ «Hết sao rồi»;
// Ba Mẹ khoá máy ⇒ màn khoá; chế độ «Mở hết» ⇒ không đếm, không «Hết sao».
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { kid, taiCheDo, taiSao, tenMuc, type TroChoi } from "@/lib/api-tre";
import { soVN, tiVong } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { ChoD, ChuD, ManD, MatMangD, NutD, PillD, TheD, VongD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

export default function DangChoi() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("sao", taiSao);
  const cd = useTaiTre("che-do", taiCheDo);
  const tc = useTaiTre("tro-choi", () => kid.goi<{ ds: TroChoi[] }>("tro-choi").catch(() => ({ ds: [] as TroChoi[] })));
  if (!d) return <ManD lui="/tre/nha" tieu="Đang chơi"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  if (d.khoa) return <Redirect href="/tre/gio-ngu?ly=ba_me_khoa" />;
  const moHet = cd.d === "mo_het";
  if (d.hetSao && !moHet) return <Redirect href="/tre/het-phien" />;
  const app = [...new Set((tc.d?.ds ?? []).map((x) => tenMuc(x.muc, x.ten)))];
  // máy chủ mới: phút từng app hôm nay + sao đã trừ; cũ: danh sách app Tính phút (chưa có số)
  const dong: (readonly [string, string, boolean])[] = d.appHomNay
    ? [...d.appHomNay.map((x) => [x.ten, x.nhom === "tinh_phut" && !moHet ? `${x.phut} phút · \u2212${soVN(x.sao)} sao` : `${x.phut} phút · không tính phút`, x.nhom !== "tinh_phut"] as const),
      ...(d.appHomNay.some((x) => x.ten === "AiiRob") ? [] : [["AiiRob", "không tính phút", true] as const])]
    : [...app.map((a) => [a, moHet ? "không tính phút" : "tính phút · trừ sao", moHet] as const), ["App học · AiiRob", "không tính phút", true] as const];
  return (
    <ManD lui="/tre/nha" tieu="Đang chơi" phai={ten ? <PillD chu={`● ${ten}`} loai="xanh" /> : undefined}
      day={moHet ? undefined : <NutD chu="Xin Ba Mẹ cho vay sao" ic="tin" bam={() => router.push("/tre/them-gio")} />}>
      {matMang || cu ? <MatMangD chu="Mất mạng rồi — phút chơi vẫn tính như thường." /> : null}
      {moHet ? (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 6 }}>
          <ChuD kieu="den" co={20}>Hôm nay Mở hết</ChuD>
          <ChuD kieu="rat" co={15} mau={D.chu2} giua>Ba Mẹ để mở hết: app, web dùng tự do, chơi không trừ sao.</ChuD>
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 6 }}>
          <VongD ti={tiVong(d)} so={soVN(d.phutCon)} don="sao còn lại" co={180} day={15} />
          <ChuD kieu="den" co={18}>{`Còn ${soVN(d.phutCon)} sao = ${soVN(d.phutCon)} phút chơi`}</ChuD>
          <ChuD kieu="rat" co={15} mau={D.chu2}>{`Hôm nay chơi ${d.phutHomNay} phút`}</ChuD>
        </View>
      )}
      <ChuD kieu="den" co={15}>{moHet ? "Hôm nay · không tính phút" : "Hôm nay · 1 sao = 1 phút"}</ChuD>
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
