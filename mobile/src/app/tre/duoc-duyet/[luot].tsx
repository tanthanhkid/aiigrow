// «Được duyệt» bản «Dịu» (con-dt-ngay 12 cdt-duoc-duyet): «+10 sao» to, «Giỏi quá! Ba Mẹ duyệt <việc> rồi!», sao cũ → sao mới, lời Ba Mẹ
// trong thẻ, «Đổi 10 sao lấy 10 phút» / «Về Hôm nay»; Con gửi lại một biểu cảm (phản hồi lời khen). Hiện một lần mỗi lượt.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { ghiDaXem, kid, type LuotTre, type NhaTreSao, type ToiTre } from "@/lib/api-tre";
import { D, FD } from "@/lib/diu";
import { Rob } from "@/lib/ui";
import { ChoD, ChuD, ManD, NutD, TheD, TieuD } from "@/lib/ui-diu";
import { gioCua, useTaiTre } from "@/lib/ui-tre";

const BIEU_CAM = ["😍", "🤗", "💪"];

export default function DuocDuyet() {
  const { luot } = useLocalSearchParams<{ luot: string }>();
  const { d, loi, matMang, tai } = useTaiTre(`duyet-${luot}`, async () => {
    const [nha, ls, toi] = await Promise.all([kid.goi<NhaTreSao>("nha"), kid.goi<{ ds: LuotTre[] }>("luot"), kid.goi<ToiTre>("toi")]);
    const l = ls.ds.find((x) => x.id === luot) ?? null;
    const khen = l?.loi_khen ? toi.loiKhen.find((x) => x.noi_dung === l.loi_khen) ?? null : null;
    return { nha, l, khen };
  });
  const [chon, setChon] = useState<string | null>(null);
  useEffect(() => { ghiDaXem(luot); }, [luot]);
  if (!d) return <ManD><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const diem = d.l?.diem ?? 0;
  const sao = d.nha.sao ?? d.nha.soDu;
  const q = d.nha.quy;
  const ve = async (den: string) => {
    if (chon && d.khen) await kid.goi(`loi-khen/${d.khen.id}/phan-hoi`, { phanHoi: chon }).catch(() => {});
    router.replace(den as never);
  };
  return (
    <ManD giua day={<>
      {q?.doiSao.bat ? <NutD chu={`Đổi ${q.tyLe.sao} sao lấy ${q.tyLe.phut} phút`} ic="dongho" bam={() => ve("/tre/choi")} /> : null}
      <NutD chu="Về Hôm nay" loai={q?.doiSao.bat ? "chu" : "chinh"} bam={() => ve("/tre/nha")} />
    </>}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Rob ten="xong" co={150} />
        <Text style={{ fontFamily: FD.den, fontSize: 44, color: D.saoInk }}>{`+${diem} sao`}</Text>
        <TieuD chu={`Giỏi quá! Ba Mẹ duyệt ${d.l?.ten ?? "nhiệm vụ"} rồi!`} nho giua />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
          <ChuD kieu="den" co={20} mau={D.chu3} so>{String(Math.max(0, sao - diem))}</ChuD>
          <ChuD kieu="den" co={18} mau={D.chu3}>→</ChuD>
          <ChuD kieu="den" co={22} mau={D.saoInk} so>{`${sao} sao`}</ChuD>
        </View>
      </View>
      {d.l?.loi_khen ? (
        <TheD>
          <ChuD kieu="rat" co={13.5} mau={D.chu2}>{d.khen ? `Ba Mẹ · ${gioCua(d.khen.created_at)}` : "Ba Mẹ nhắn"}</ChuD>
          <ChuD kieu="rat" co={17}>{`«${d.l.loi_khen}»`}</ChuD>
          {d.khen && !d.khen.phan_hoi ? (
            <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Gửi biểu cảm cho Ba Mẹ">
              {BIEU_CAM.map((e) => (
                <Pressable key={e} onPress={() => setChon(e === chon ? null : e)} accessibilityRole="radio" accessibilityState={{ checked: e === chon }}
                  style={{ minHeight: 44, minWidth: 56, paddingHorizontal: 14, borderRadius: 22, borderWidth: e === chon ? 2 : 1, alignItems: "center", justifyContent: "center",
                    borderColor: e === chon ? D.xanh : D.vien, backgroundColor: e === chon ? D.xanhN : D.the }}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </TheD>
      ) : null}
    </ManD>
  );
}
