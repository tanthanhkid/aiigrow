// con-gio-ngu «Hết giờ chơi hôm nay» (ngoài khung giờ / giờ ngủ / đủ trần): mở lại lúc nào, điểm Rob giữ nguyên.
import { router, useLocalSearchParams } from "expo-router";
import { CanhGiua, ChoTai, Nut } from "@/lib/ui";
import { DiemTren, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre } from "@/lib/api-tre";

export default function GioNgu() {
  const { ly } = useLocalSearchParams<{ ly?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("nha", () => kid.goi<NhaTre>("nha"));
  if (!d) return <ManTre tab="nha"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const { moLai, moMai } = d.khung;
  const chuaToi = ly === "ngoai_khung" && moLai && !moMai && !d.gioNgu;
  const tieu = d.gioNgu || ly === "gio_ngu" ? "Đến giờ ngủ rồi" : chuaToi ? "Chưa tới giờ chơi" : ly === "dat_tran_tuan" ? "Tuần này chơi đủ rồi" : "Hết giờ chơi hôm nay rồi";
  const khi = moLai ? `${moLai}${moMai || !chuaToi ? " ngày mai" : ""} mở lại.` : "Ba Mẹ chưa đặt giờ chơi.";
  return (
    <ManTre tab="nha">
      <DiemTren n={d.soDu} chuoi={d.chuoiNgay} />
      <CanhGiua lv="ngu" tieu={tieu} loi={`${khi} ${ten} còn ${d.soDu} điểm, Rob giữ nguyên cho ${ten}.`}>
        <Nut chu={chuaToi ? "Làm nhiệm vụ" : "Xem mai làm gì"} loai="vien" bam={() => router.replace("/tre/nhiem-vu")} />
      </CanhGiua>
    </ManTre>
  );
}
