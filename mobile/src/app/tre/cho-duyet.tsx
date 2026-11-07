// «Đã gửi Ba Mẹ · Ba Mẹ đang xem nha!» (con-dt-ngay 11 cdt-cho-duyet) và «Chưa gửi được — mất mạng, ảnh vẫn còn nhé!» (08 them-6t2vvx7d):
// bài nộp lúc mất mạng nằm trong hàng chờ trên máy, tự gửi khi có mạng (thử lại mỗi 5 giây; «Thử gửi lại» gửi ngay). Con không cần làm lại.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { guiHangCho, soViecCho } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { CamXuc, ChuD, ManD, MatMangD, NutD, PillD, SaoD, TheD } from "@/lib/ui-diu";
import { gioCua } from "@/lib/ui-tre";

export default function ChoDuyet() {
  const { diem, xep, ten } = useLocalSearchParams<{ diem?: string; xep?: string; ten?: string }>();
  const [cho, setCho] = useState(xep ? Math.max(1, soViecCho()) : 0);
  const [luc] = useState(() => gioCua(new Date().toISOString()));
  const [dangGui, setDangGui] = useState(false);
  const thu = () => { setDangGui(true); guiHangCho().then(setCho).catch(() => {}).finally(() => setDangGui(false)); };
  useEffect(() => {
    if (!cho) return;
    const t = setInterval(() => { guiHangCho().then(setCho).catch(() => {}); }, 5000);
    return () => clearInterval(t);
  }, [cho]);
  if (cho) {
    return (
      <ManD lui="/tre/nhiem-vu" day={<><NutD chu="Thử gửi lại" bam={thu} dangChay={dangGui} /><NutD chu="Làm nhiệm vụ khác" loai="chu" bam={() => router.replace("/tre/nhiem-vu")} /></>}>
        <CamXuc lv="trong-loi" co={130} tieu="Chưa gửi được" phu="Mất mạng rồi. Bài vẫn còn nhé!" />
        <MatMangD chu="Mất mạng" />
        <TheD>
          <ChuD kieu="den" co={16}>{ten || "Bài nộp của con"}</ChuD>
          <ChuD co={14} mau={D.chu2}>Lưu ở máy, gửi khi có mạng</ChuD>
          <PillD chu="Bài không mất" loai="xanh" ic="tick" />
        </TheD>
      </ManD>
    );
  }
  return (
    <ManD lui="/tre/nhiem-vu" day={<NutD chu="Làm nhiệm vụ khác" bam={() => router.replace("/tre/nhiem-vu")} />}>
      <CamXuc lv="cho" co={150} tieu="Đã gửi Ba Mẹ" phu="Ba Mẹ đang xem nha!" />
      <TheD>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <PillD chu="⏳ Chờ duyệt" loai="cho" />
          <ChuD kieu="den" co={16}>{ten || "Bài nộp của con"}</ChuD>
        </View>
        <ChuD co={14} mau={D.chu2}>{`Nộp ${luc} · Ba Mẹ đã nhận`}</ChuD>
        {diem ? <SaoD chu={`+${diem} sao khi Ba Mẹ duyệt`} /> : null}
      </TheD>
    </ManD>
  );
}
