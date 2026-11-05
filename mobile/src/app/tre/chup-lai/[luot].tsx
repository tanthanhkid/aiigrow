// con-chup-lai «Ba Mẹ nhờ làm lại» (thiết kế 05/11 con-ngay-thuong «Ba Mẹ nhờ bổ sung bài» — L9): lời nhắn / lý do của Ba Mẹ, Con không mất sao
// nào, một nút nộp lại bằng chứng MỚI (ảnh / ghi âm / viết — theo cách nộp của việc). Ba Mẹ duyệt xong mới có sao.
import { router, useLocalSearchParams } from "expo-router";
import { BaoLoi, CanhGiua, ChoTai, Nut, useLam } from "@/lib/ui";
import { DiemTren, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, nopBai, type LuotTre, type NhaTre, type NvTreSao } from "@/lib/api-tre";

export default function ChupLai() {
  const { luot, nv } = useLocalSearchParams<{ luot: string; nv?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre(`lai-${luot}`, async () => {
    const [nha, ls, ds] = await Promise.all([kid.goi<NhaTre>("nha"), kid.goi<{ ds: LuotTre[] }>("luot"),
      kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1").catch(() => ({ ds: [] as NvTreSao[] }))]);
    return { nha, l: ls.ds.find((x) => x.id === luot) ?? null, v: ds.ds.find((x) => x.id === nv) ?? null };
  });
  const { dangChay, loi: loiNop, lam } = useLam();
  if (!d) return <ManTre tab="nhiem-vu"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const loiNhan = d.v?.loi_nhan?.trim() || d.l?.ly_do?.trim() || d.v?.ly_do?.trim();
  const bc = d.v?.bang_chung;
  const [chu, ic] = bc === "van_ban" ? ["Viết lại", "but"] as const : bc === "ghi_am" ? ["Ghi âm lại", "tin"] as const : ["Chụp lại", "camera"] as const;
  return (
    <ManTre tab="nhiem-vu">
      <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
      <CanhGiua lv="trong-loi" tieu="Ba Mẹ nhờ con làm lại"
        loi={`${loiNhan ? `Ba Mẹ nhắn: “${loiNhan}”. ` : ""}${d.l?.ten ? `Làm lại “${d.l.ten}” rồi nộp bài mới nhé` : "Làm lại rồi nộp bài mới nhé"} — ${ten} không mất sao nào!`}>
        <BaoLoi loi={loiNop} />
        {bc === "xong" ? (
          <Nut chu="Làm lại xong rồi!" ic="tick" dangChay={dangChay} bam={() => lam(async () => {
            const r = await nopBai(luot, {});
            router.replace(r.trang_thai === "duoc_duyet" ? `/tre/duoc-duyet/${luot}` : `/tre/cho-duyet${r.daXepHang ? "?xep=1" : ""}`);
          })} />
        ) : <Nut chu={chu} ic={ic} bam={() => router.push(`/tre/chup/${luot}?nv=${nv ?? ""}`)} />}
        <Nut chu="Để sau" loai="ma" bam={() => router.replace("/tre/nhiem-vu")} />
      </CanhGiua>
    </ManTre>
  );
}
