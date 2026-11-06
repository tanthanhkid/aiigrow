// «Hết giờ chơi rồi» bản «Dịu» (con-dt-gio 05 cdt-het-phien, L3): «Hôm nay đã chơi 70 / 70 phút», «Từ điển, AiiRob vẫn mở», «Con có 30 sao» +
// «Đổi 10 sao lấy 10 phút» · «Làm nhiệm vụ kiếm sao» · «Xin Ba Mẹ thêm giờ»; «Ba Mẹ mở máy» (mã Ba Mẹ — PIN 06/11). Chân màn «AiiGrow · Bảo Anh ·
// Ba Mẹ quản lý». Còn giờ ⇒ về Giờ chơi; giờ ngủ / khoá / học ⇒ màn khoá tương ứng. (Đường cũ /tre/het-phien của agent vẫn dùng.)
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { kid, lyDoKhoa, type QuyCon } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { Icon3D } from "@/lib/ui";
import { CamXuc, ChoD, ChuD, ManD, NutD, TheD } from "@/lib/ui-diu";
import { ChanMan } from "@/lib/man-con";
import { useTaiTre, useTre } from "@/lib/ui-tre";
import { may } from "@/lib/api-tre";

export default function HetPhien() {
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("quy", () => kid.goi<QuyCon>("quy"));
  if (!d) return <ManD><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const q = d.quy;
  const ly = lyDoKhoa(q);
  if (ly) return <Redirect href={`/tre/gio-ngu?ly=${ly}`} />;
  if (q.conPhut > 0) return <Redirect href="/tre/gio" />;
  const doiDuoc = q.doiSao.bat && q.doiSao.conDoiDuoc > 0;
  return (
    <ManD day={<>
      {doiDuoc ? <NutD chu={`Đổi ${q.tyLe.sao} sao lấy ${q.tyLe.phut} phút`} ic="dongho" bam={() => router.push("/tre/choi")} /> : null}
      <NutD chu="Làm nhiệm vụ kiếm sao" loai={doiDuoc ? "phu" : "chinh"} ic="sao" bam={() => router.push("/tre/nhiem-vu")} />
      {q.choXinThem ? <NutD chu="Xin Ba Mẹ thêm giờ" loai="chu" bam={() => router.push("/tre/them-gio")} /> : null}
      {may.co() ? <NutD chu="Ba Mẹ mở máy" loai="chu" bam={() => router.push("/tre/ba-me")} /> : null}
      <ChanMan chu={`AiiGrow · ${ten} · Ba Mẹ quản lý`} />
    </>}>
      <CamXuc lv="nghi" co={150} tieu="Hết giờ chơi rồi" phu={`Hôm nay đã chơi ${q.daDung} / ${q.tongPhut} phút`} />
      <ChuD kieu="rat" co={14} mau={D.xanhD} giua>App học, AiiRob vẫn mở</ChuD>
      <TheD vang mong>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" }}>
          <Icon3D ten="sao" co={30} />
          <ChuD kieu="den" co={17} mau={D.saoInk}>{`Con có ${d.sao} sao`}</ChuD>
        </View>
      </TheD>
    </ManD>
  );
}
