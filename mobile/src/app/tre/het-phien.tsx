// «Hết sao rồi» bản «Dịu» (con-dt-gio 05 cdt-het-phien, sổ sao 15/11 #264 #263): «Còn 0 sao = 0 phút chơi», «App học, AiiRob vẫn mở»,
// đang nợ ⇒ «Đang nợ Ba Mẹ 20 sao»; «Làm nhiệm vụ» · «Xin Ba Mẹ cho vay sao» · «Ba Mẹ mở máy» (mã Ba Mẹ — không trừ sao). Chân màn «AiiGrow ·
// Bảo Anh · Ba Mẹ quản lý». Còn sao ⇒ về «Đang chơi»; Ba Mẹ khoá ⇒ màn khoá. (Đường cũ /tre/het-phien của agent vẫn dùng.)
import { Redirect, router } from "expo-router";
import { may, taiCheDo, taiSao } from "@/lib/api-tre";
import { soSao } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { CamXuc, ChoD, ChuD, ManD, NutD } from "@/lib/ui-diu";
import { ChanMan, NO, VienSao } from "@/lib/man-con";
import { useTaiTre, useTre } from "@/lib/ui-tre";
import { View } from "react-native";

export default function HetSao() {
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("sao", taiSao);
  const cd = useTaiTre("che-do", taiCheDo);
  if (!d) return <ManD><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  if (d.khoa) return <Redirect href="/tre/gio-ngu?ly=ba_me_khoa" />;
  if (!d.hetSao || cd.d === "mo_het") return <Redirect href="/tre/gio" />;     // «Mở hết»: không tính phút ⇒ không có «Hết sao»
  return (
    <ManD day={<>
      <NutD chu="Làm nhiệm vụ" ic="sao" bam={() => router.push("/tre/nhiem-vu")} />
      <NutD chu="Xin Ba Mẹ cho vay sao" loai="phu" ic="tin" bam={() => router.push("/tre/them-gio")} />
      {may.co() ? <NutD chu="Ba Mẹ mở máy" loai="chu" bam={() => router.push("/tre/ba-me")} /> : null}
      <ChanMan chu={`AiiGrow · ${ten} · Ba Mẹ quản lý`} />
    </>}>
      <CamXuc lv="nghi" co={150} tieu="Hết sao rồi" phu="Còn 0 sao = 0 phút chơi" />
      <ChuD kieu="rat" co={14} mau={D.xanhD} giua>App học, AiiRob vẫn mở</ChuD>
      <View style={{ alignItems: "center", gap: 6 }}>
        <VienSao sao={d.sao} chu={soSao(d.sao)} />
        {d.cau.no ? <ChuD kieu="rat" co={13.5} mau={NO.chu} giua>{`${d.cau.no} · sao nhiệm vụ trả nợ trước`}</ChuD> : null}
      </View>
    </ManD>
  );
}
