// Máy đang khoá giải trí bản «Dịu» (con-dt-gio 06 «Đến giờ ngủ rồi» — nền đêm dịu, 07 «Giờ học rồi!», 09 «Ba Mẹ đang khoá máy» — L3):
// mở lại lúc nào, sao giữ nguyên. KHÔNG thêm giờ được (không đổi sao, không xin thêm giờ) — chỉ «Xin Ba Mẹ mở ngoại lệ» (cả máy / một app,
// có hạn phút); «Ba Mẹ mở máy» bằng mã Ba Mẹ (PIN 06/11). Giờ học: app học vẫn dùng + «Học 1 bài với AiiRob».
// Đường cũ `?ly=ngoai_khung | dat_tran_ngay | dat_tran_tuan` ⇒ hết quỹ ⇒ màn «Hết giờ chơi».
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { kid, lyDoKhoa, may, type NhaTreSao } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { Icon3D, Rob } from "@/lib/ui";
import { CamXuc, ChoD, ChuD, ManD, MatMangD, NutD, TheD } from "@/lib/ui-diu";
import { ChanMan } from "@/lib/man-con";
import { useTaiTre, useTre } from "@/lib/ui-tre";

export default function GioNgu() {
  const p = useLocalSearchParams<{ ly?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("nha", () => kid.goi<NhaTreSao>("nha"));
  if (!d) return <ManD><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const q = d.quy;
  const ly = lyDoKhoa(q) ?? p.ly;
  if (ly !== "gio_ngu" && ly !== "ba_me_khoa" && ly !== "gio_hoc") return <Redirect href="/tre/het-phien" />;
  const mangBang = matMang || cu ? <MatMangD chu="Mất mạng rồi — máy vẫn giữ giờ ngủ và giờ chơi như Ba Mẹ đặt." /> : null;
  const baMe = may.co() ? <NutD chu="Ba Mẹ mở máy" loai="chu" bam={() => router.push("/tre/ba-me")} /> : null;

  if (ly === "gio_ngu") {
    return (
      <ManD toi giua day={<>
        <NutD chu="Xin Ba Mẹ thêm 15 phút" loai="phu" bam={() => router.push("/tre/ngoai-le?ly=gio_ngu")} />
        {baMe}
        <ChuD kieu="rat" co={12.5} mau={D.demChu2} giua>{`Vẫn gọi được Ba Mẹ · ${ten}`}</ChuD>
      </>}>
        {mangBang}
        <View style={{ alignItems: "center", gap: 10 }}>
          <Rob ten="ngu" co={170} />
          <ChuD kieu="den" co={26} mau={D.demChu} giua>Đến giờ ngủ rồi</ChuD>
          <ChuD co={15} mau={D.demChu2} giua>{`Chúc ${ten} ngủ ngon!`}</ChuD>
          <View style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: D.demThe, marginTop: 6 }}>
            <ChuD kieu="den" co={22} mau={D.demChu} giua so>{q ? `${q.gioNgu.tu} – ${q.gioNgu.den}` : "Giờ ngủ"}</ChuD>
          </View>
          <ChuD kieu="rat" co={14} mau={D.demChu2} giua>{`Sáng mai máy mở lúc ${q?.gioNgu.den ?? "sáng mai"}`}</ChuD>
        </View>
      </ManD>
    );
  }
  if (ly === "gio_hoc") {
    const hoc = q?.gioHoc;
    return (
      <ManD day={<>
        <NutD chu="Học 1 bài với AiiRob" ic="mu" bam={() => router.push("/tre/nhiem-vu")} />
        <NutD chu="Xin Ba Mẹ mở app khác" loai="phu" bam={() => router.push("/tre/ngoai-le?ly=gio_hoc")} />
        <NutD chu="Về trang chính" loai="chu" bam={() => router.replace("/tre/nha")} />
        <ChanMan chu={`AiiGrow · ${ten}${hoc ? ` · ${hoc.den} máy mở lại` : ""}`} />
      </>}>
        {mangBang}
        <CamXuc lv="hoc" co={140} tieu="Giờ học rồi!" phu={hoc ? `${hoc.tu} – ${hoc.den}${q?.phutToiHoc ? "" : ""}` : "Đang giờ học"} />
        <TheD style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {([["mu", "AiiRob"], ["sach", "Từ điển"], ["tin", "Sách nói"]] as const).map(([ic, t]) => (
            <View key={t} style={{ alignItems: "center", gap: 4 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: D.ic, alignItems: "center", justifyContent: "center" }}><Icon3D ten={ic} co={34} /></View>
              <ChuD kieu="rat" co={12.5} mau={D.chu2}>{t}</ChuD>
            </View>
          ))}
        </TheD>
        <ChuD kieu="rat" co={14.5} mau={D.chu2} giua>Chỉ mở app học. Học xong được chơi tiếp.</ChuD>
      </ManD>
    );
  }
  // Ba Mẹ khoá máy
  return (
    <ManD giua day={<>
      <NutD chu="Xin Ba Mẹ mở máy" bam={() => router.push("/tre/ngoai-le?ly=ba_me_khoa")} />
      {baMe}
      <ChuD kieu="rat" co={12.5} mau={D.chu3} giua>{`Vẫn gọi được Ba Mẹ · ${ten}`}</ChuD>
    </>}>
      {mangBang}
      <CamXuc lv="nghi" co={150} tieu="Ba Mẹ đang khoá máy" phu="Đọc sách hoặc ra ngoài chơi nhé!" />
      <ChuD kieu="rat" co={14} mau={D.xanhD} giua>{`${d.sao ?? d.soDu} sao vẫn giữ nguyên`}</ChuD>
    </ManD>
  );
}
