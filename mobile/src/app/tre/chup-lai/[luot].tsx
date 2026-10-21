// con-chup-lai «Cần chụp lại» (từ chối nhẹ): nói lý do của Ba Mẹ, Con không mất điểm nào, một nút Chụp lại.
import { router, useLocalSearchParams } from "expo-router";
import { CanhGiua, ChoTai, Nut } from "@/lib/ui";
import { DiemTren, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type LuotTre, type NhaTre } from "@/lib/api-tre";

export default function ChupLai() {
  const { luot, nv } = useLocalSearchParams<{ luot: string; nv?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre(`lai-${luot}`, async () => {
    const [nha, ls] = await Promise.all([kid.goi<NhaTre>("nha"), kid.goi<{ ds: LuotTre[] }>("luot")]);
    return { nha, l: ls.ds.find((x) => x.id === luot) ?? null };
  });
  if (!d) return <ManTre tab="nhiem-vu"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const lyDo = d.l?.ly_do?.trim();
  return (
    <ManTre tab="nhiem-vu">
      <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
      <CanhGiua lv="trong-loi" tieu={lyDo ? `${lyDo.charAt(0).toUpperCase()}${lyDo.slice(1)}` : "Ảnh cần chụp lại một chút"}
        loi={`Ba Mẹ muốn thấy rõ hơn${d.l?.ten ? ` “${d.l.ten}”` : ""}. Chụp lại là được — ${ten} không mất điểm nào!`}>
        <Nut chu="Chụp lại" ic="camera" bam={() => router.push(`/tre/chup/${luot}?nv=${nv ?? ""}`)} />
      </CanhGiua>
    </ManTre>
  );
}
