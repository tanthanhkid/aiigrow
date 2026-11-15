// «Còn 5 sao = 5 phút chơi» bản «Dịu» (con-dt-gio 04 cdt-nhac-5-phut, sổ sao 15/11 #264): «Lưu bài đang chơi nhé.», đồng hồ đếm «4:59»,
// «Còn 5 sao · hết sao là dừng», «Làm nhiệm vụ kiếm sao» · «Xin Ba Mẹ cho vay sao» · «Đã hiểu, chơi tiếp» (bỏ nút đổi sao). Hết ⇒ «Hết sao
// rồi». Agent mở `/tre/nhac?phut=5`.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { taiSao } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { CamXuc, ChuD, ManD, NutD, VongD, mmss, useDemNguoc } from "@/lib/ui-diu";
import { amBao, useTaiTre } from "@/lib/ui-tre";

export default function Nhac() {
  const p = useLocalSearchParams<{ phut?: string }>();
  const { d } = useTaiTre("sao", taiSao);
  const phut = Math.max(1, Math.min(60, Number(p.phut) || d?.phutCon || 5));
  const [den] = useState(() => Date.now() + phut * 60_000);
  const con = useDemNguoc(den);
  useEffect(() => { amBao(); }, []);
  useEffect(() => { if (con === 0) router.replace("/tre/het-phien"); }, [con]);
  return (
    <ManD giua day={<>
      <NutD chu="Làm nhiệm vụ kiếm sao" ic="sao" bam={() => router.replace("/tre/nhiem-vu")} />
      <NutD chu="Xin Ba Mẹ cho vay sao" loai="phu" bam={() => router.replace("/tre/them-gio")} />
      <NutD chu="Đã hiểu, chơi tiếp" loai="chu" bam={() => (router.canGoBack() ? router.back() : router.replace("/tre/nha"))} />
    </>}>
      <CamXuc tieu={`Còn ${phut} sao = ${phut} phút chơi`} phu="Lưu bài đang chơi nhé." />
      <View style={{ alignItems: "center" }}><VongD ti={con / (phut * 60)} so={mmss(con)} co={170} day={14} /></View>
      <ChuD kieu="rat" co={14.5} mau={D.chu2} giua>{`Còn ${phut} sao · hết sao là dừng`}</ChuD>
    </ManD>
  );
}
