// «Còn 5 phút chơi» bản «Dịu» (con-dt-gio 04 cdt-nhac-5-phut): «Lưu bài đang chơi nhé.», đồng hồ đếm «4:59», «Con có 30 sao» +
// «Đổi 10 sao lấy 10 phút» · «Xin Ba Mẹ thêm giờ» · «Đã hiểu, chơi tiếp». Hết giờ ⇒ «Hết giờ chơi rồi». Agent mở `/tre/nhac?phut=5`.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { kid, type QuyCon } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { Icon3D } from "@/lib/ui";
import { CamXuc, ChuD, ManD, NutD, TheD, VongD, mmss, useDemNguoc } from "@/lib/ui-diu";
import { amBao, useTaiTre } from "@/lib/ui-tre";

export default function Nhac() {
  const p = useLocalSearchParams<{ phut?: string }>();
  const { d } = useTaiTre("quy", () => kid.goi<QuyCon>("quy"));
  const phut = Math.max(1, Math.min(60, Number(p.phut) || d?.quy.conPhut || 5));
  const [den] = useState(() => Date.now() + phut * 60_000);
  const con = useDemNguoc(den);
  useEffect(() => { amBao(); }, []);
  useEffect(() => { if (con === 0) router.replace("/tre/het-phien"); }, [con]);
  const q = d?.quy;
  return (
    <ManD giua day={<>
      {q?.doiSao.bat ? <NutD chu={`Đổi ${q.tyLe.sao} sao lấy ${q.tyLe.phut} phút`} ic="dongho" bam={() => router.replace("/tre/choi")} /> : null}
      {q?.choXinThem !== false ? <NutD chu="Xin Ba Mẹ thêm giờ" loai="phu" bam={() => router.replace("/tre/them-gio")} /> : null}
      <NutD chu="Đã hiểu, chơi tiếp" loai="chu" bam={() => (router.canGoBack() ? router.back() : router.replace("/tre/nha"))} />
    </>}>
      <CamXuc tieu={`Còn ${phut} phút chơi`} phu="Lưu bài đang chơi nhé." />
      <View style={{ alignItems: "center" }}><VongD ti={con / (phut * 60)} so={mmss(con)} co={170} day={14} /></View>
      {d ? (
        <TheD vang mong>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" }}>
            <Icon3D ten="sao" co={28} />
            <ChuD kieu="den" co={16} mau={D.saoInk}>{`Con có ${d.sao} sao`}</ChuD>
          </View>
        </TheD>
      ) : null}
    </ManD>
  );
}
