// «Ba Mẹ nhờ làm lại» bản «Dịu» (con-dt-ngay 13 cdt-chup-lai, L9): «Sửa chút xíu là xong. Cố lên!», thẻ việc + «↺ Làm lại», lời Ba Mẹ,
// «Làm lại xong vẫn được +10 sao», nút nộp lại bằng chứng MỚI (ảnh / ghi âm / viết theo cách nộp của việc) + «Nhắn Ba Mẹ».
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { kid, nopBai, type LuotTre, type NvTreSao } from "@/lib/api-tre";
import { useLam } from "@/lib/ui";
import { CamXuc, ChoD, ChuD, LoiD, ManD, NutD, PillD, SaoD, TheD } from "@/lib/ui-diu";
import { useTaiTre } from "@/lib/ui-tre";

export default function ChupLai() {
  const { luot, nv } = useLocalSearchParams<{ luot: string; nv?: string }>();
  const { d, loi, matMang, tai } = useTaiTre(`lai-${luot}`, async () => {
    const [ls, ds] = await Promise.all([kid.goi<{ ds: LuotTre[] }>("luot"),
      kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1").catch(() => ({ ds: [] as NvTreSao[] }))]);
    return { l: ls.ds.find((x) => x.id === luot) ?? null, v: ds.ds.find((x) => x.id === nv) ?? null };
  });
  const { dangChay, loi: loiNop, lam } = useLam();
  if (!d) return <ManD lui="/tre/nhiem-vu"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const loiNhan = d.v?.loi_nhan?.trim() || d.l?.ly_do?.trim() || d.v?.ly_do?.trim();
  const bc = d.v?.bang_chung;
  const chu = bc === "van_ban" ? "Viết lại" : bc === "ghi_am" ? "Ghi âm lại" : bc === "xong" ? "Làm lại xong rồi!" : "Chụp lại ảnh";
  const tenViec = d.l?.ten ?? d.v?.ten ?? "Nhiệm vụ";
  const diem = d.v?.sao ?? d.v?.diem;
  const nop = () => (bc === "xong" ? lam(async () => {
    const r = await nopBai(luot, {});
    router.replace(r.trang_thai === "duoc_duyet" ? `/tre/duoc-duyet/${luot}` : `/tre/cho-duyet?ten=${encodeURIComponent(tenViec)}${r.daXepHang ? "&xep=1" : ""}`);
  }) : router.push(`/tre/chup/${luot}?nv=${nv ?? ""}`));
  return (
    <ManD lui="/tre/nhiem-vu" day={<><LoiD loi={loiNop} /><NutD chu={chu} bam={nop} dangChay={dangChay} />
      <NutD chu="Nhắn Ba Mẹ" loai="chu" bam={() => router.push("/tre/tin")} /></>}>
      <CamXuc lv="chi" co={130} tieu="Ba Mẹ nhờ làm lại" phu="Sửa chút xíu là xong. Cố lên!" />
      <TheD>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <ChuD kieu="den" co={16} style={{ flex: 1 }}>{tenViec}</ChuD>
          <PillD chu="↺ Làm lại" loai="loi" />
        </View>
        {loiNhan ? <ChuD kieu="rat" co={16}>{`Ba Mẹ: «${loiNhan}»`}</ChuD> : null}
      </TheD>
      {diem ? <View style={{ alignSelf: "center" }}><SaoD chu={`Làm lại xong vẫn được +${diem} sao`} /></View> : null}
    </ManD>
  );
}
