// «Chi tiết nhiệm vụ» bản «Dịu» (con-dt-ngay 04 cdt-nv-chi-tiet): tên việc + «+10 sao», dòng phụ, «Ba Mẹ muốn xem» (cách nộp: ảnh / ghi âm /
// viết / bấm Xong), «Bắt đầu <việc>» / «Để sau». «Học với AiiRob» — AiiRob tự chấm, không có nút Bắt đầu.
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { LoiApi, NHOM_NV } from "@/lib/api";
import { kid, type NvTreSao } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { useLam } from "@/lib/ui";
import { ChoD, ChuD, DongD, IcO, LoiD, ManD, NutD, SaoD, TieuD } from "@/lib/ui-diu";
import { batDauLuc, useTaiTre } from "@/lib/ui-tre";

const thuong = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const XEM: Record<string, [Parameters<typeof IcO>[0]["ic"], string, string]> = {
  anh: ["camera", "Ảnh việc đã làm", "Chụp rõ, đủ sáng"], video: ["camera", "Ảnh việc đã làm", "Chụp rõ, đủ sáng"],
  ghi_am: ["tin", "Bản ghi âm", "Kể lại hoặc đọc to cho Ba Mẹ nghe"], van_ban: ["but", "Vài câu kể lại", "Con viết 2 câu là đủ"],
  xong: ["tick", "Bấm «Xong»", "Không cần ảnh"],
};

export default function ChiTietNv() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTaiTre(`nv-${id}`, async () => {
    const x = (await kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1")).ds.find((n) => n.id === id);
    if (!x) throw new LoiApi("khong_thay", "Nhiệm vụ này không còn nữa — chọn việc khác nhé.", 404);
    return x;
  });
  const { dangChay, loi: loiLam, lam } = useLam();
  if (!d) return <ManD lui="/tre/nhiem-vu"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const tuCham = d.tu_cham || d.bang_chung === "tu_dong";
  const ic = NHOM_NV[d.nhom]?.ic ?? NHOM_NV.khac.ic;
  const batDau = () => lam(async () => {
    const r = await kid.goi<{ luot: string }>(`nhiem-vu/${d.id}/bat-dau`, {});
    batDauLuc(r.luot);
    router.replace(`/tre/dang/${r.luot}?nv=${d.id}`);
  });
  const xem = XEM[d.bang_chung] ?? XEM.anh;
  const phu = [d.phut_toi_thieu ? `Làm ít nhất ${d.phut_toi_thieu} phút` : null, d.toi_da_ngay ? `Hôm nay đã làm ${d.hom_nay}/${d.toi_da_ngay} lần` : null]
    .filter(Boolean).join(" · ");
  return (
    <ManD lui="/tre/nhiem-vu" day={tuCham ? undefined : <><LoiD loi={loiLam} /><NutD chu={`Bắt đầu ${thuong(d.ten)}`} bam={batDau} dangChay={dangChay} />
      <NutD chu="Để sau" loai="chu" bam={() => router.replace("/tre/nhiem-vu")} /></>}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <IcO ic={ic} co={72} />
        <View style={{ flex: 1, gap: 6 }}>
          <TieuD chu={d.ten} nho />
          <SaoD chu={`+${d.sao ?? d.diem} sao`} />
        </View>
      </View>
      {d.mo_ta || phu ? <ChuD co={15} mau={D.chu2}>{[d.mo_ta, phu].filter(Boolean).join(" · ")}</ChuD> : null}
      {tuCham ? (
        <DongD ic="mu" tieu="Học với AiiRob" phu="Mở app AiiRob để học — đạt là AiiRob tự cộng sao. Không cần nộp ở đây." />
      ) : (
        <>
          <ChuD kieu="den" co={15} style={{ marginTop: 4 }}>Ba Mẹ muốn xem</ChuD>
          <DongD ic={xem[0]} tieu={xem[1]} phu={xem[2]} />
        </>
      )}
    </ManD>
  );
}
