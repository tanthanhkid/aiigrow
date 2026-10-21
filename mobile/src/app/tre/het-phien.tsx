// con-het-phien «Hết phiên — nghỉ 60 phút» (BRD 6.3): trò chơi mở lại lúc nào; gợi ý làm nhiệm vụ để có thêm điểm, hoặc xin thêm giờ.
// Mất mạng: giờ nghỉ vẫn đếm trên máy, mở lại đúng giờ.
import { router, useLocalSearchParams } from "expo-router";
import { BangMang, CanhGiua, ChoTai, Nut } from "@/lib/ui";
import { DiemTren, ManTre, gioCua, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre } from "@/lib/api-tre";

export default function HetPhien() {
  const p = useLocalSearchParams<{ nghiDen?: string; ly?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("nha", () => kid.goi<NhaTre>("nha"));
  if (!d) return <ManTre tab="nha"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const nghiDen = p.nghiDen || d.nghiDen;
  const hetDiem = p.ly === "het_diem";
  return (
    <ManTre tab="nha">
      <DiemTren n={d.soDu} chuoi={d.chuoiNgay} />
      {matMang || cu ? <BangMang chu={`Mất mạng — giờ nghỉ vẫn đếm trên máy, mở lại đúng ${gioCua(nghiDen)}.`} /> : null}
      <CanhGiua lv="nghi" tieu={hetDiem ? "Hết điểm rồi!" : nghiDen ? `Nghỉ ${d.nghiGiua} phút nhé!` : "Hết phiên chơi rồi!"}
        loi={hetDiem ? `Làm một nhiệm vụ để ${ten} có thêm điểm nào?`
          : `Trò chơi mở lại lúc ${nghiDen ? gioCua(nghiDen) : "sau"}. Làm một nhiệm vụ để có thêm điểm nào?`}>
        <Nut chu="Làm nhiệm vụ" ic="sao" bam={() => router.replace("/tre/nhiem-vu")} />
        <Nut chu="Xin thêm giờ" loai="vien" bam={() => router.push("/tre/xin-phep?loai=them_gio")} />
      </CanhGiua>
    </ManTre>
  );
}
