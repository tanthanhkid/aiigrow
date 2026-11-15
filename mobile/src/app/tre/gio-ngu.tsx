// «Ba Mẹ đang khoá máy» bản «Dịu» (con-dt-gio 09 — L3): sao giữ nguyên, «Ba Mẹ mở máy» bằng mã Ba Mẹ (PIN 06/11 — không trừ sao), «Nhắn Ba Mẹ».
// 14/11–15/11 (#262 #265): bỏ giờ ngủ, giờ học, bỏ «Xin Ba Mẹ mở ngoại lệ» ⇒ `?ly=gio_ngu | gio_hoc` cũ về Hôm nay; hết sao ⇒ «Hết sao rồi».
// Giữ tên đường cũ /tre/gio-ngu (agent + màn khác trỏ vào).
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { may, taiSao } from "@/lib/api-tre";
import { soSao } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { CamXuc, ChoD, ChuD, ManD, MatMangD, NutD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

export default function BaMeKhoa() {
  const p = useLocalSearchParams<{ ly?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("sao", taiSao);
  if (!d) return <ManD><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  if (!d.khoa && p.ly !== "ba_me_khoa") return <Redirect href={d.hetSao ? "/tre/het-phien" : "/tre/nha"} />;
  if (!d.khoa && !matMang && !cu) return <Redirect href="/tre/nha" />;
  return (
    <ManD giua day={<>
      <NutD chu="Nhắn Ba Mẹ" ic="tin" bam={() => router.push("/tre/tin")} />
      {may.co() ? <NutD chu="Ba Mẹ mở máy" loai="chu" bam={() => router.push("/tre/ba-me")} /> : null}
      <ChuD kieu="rat" co={12.5} mau={D.chu3} giua>{`Vẫn gọi được Ba Mẹ · ${ten}`}</ChuD>
    </>}>
      {matMang || cu ? <MatMangD chu="Mất mạng rồi — máy vẫn giữ như Ba Mẹ đặt." /> : null}
      <CamXuc lv="nghi" co={150} tieu="Ba Mẹ đang khoá máy" phu="Đọc sách hoặc ra ngoài chơi nhé!" />
      <ChuD kieu="rat" co={14} mau={D.xanhD} giua>{`${soSao(d.sao)} vẫn giữ nguyên`}</ChuD>
    </ManD>
  );
}
