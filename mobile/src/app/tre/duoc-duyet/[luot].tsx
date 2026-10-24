// con-duoc-duyet «Được duyệt — ăn mừng»: +10 điểm, lời khen của Ba Mẹ, Con gửi lại một biểu cảm (phản hồi lời khen). Hiện một lần mỗi lượt.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { CanhGiua, ChoTai, M, Nut } from "@/lib/ui";
import { DiemTren, ManTre, useTaiTre } from "@/lib/ui-tre";
import { ghiDaXem, kid, type LuotTre, type NhaTre, type ToiTre } from "@/lib/api-tre";

const BIEU_CAM = ["😍", "🤗", "💪"];

export default function DuocDuyet() {
  const { luot } = useLocalSearchParams<{ luot: string }>();
  const { d, loi, matMang, tai } = useTaiTre(`duyet-${luot}`, async () => {
    const [nha, ls, toi] = await Promise.all([kid.goi<NhaTre>("nha"), kid.goi<{ ds: LuotTre[] }>("luot"), kid.goi<ToiTre>("toi")]);
    const l = ls.ds.find((x) => x.id === luot) ?? null;
    const khen = l?.loi_khen ? toi.loiKhen.find((x) => x.noi_dung === l.loi_khen) ?? null : null;
    return { nha, l, khen };
  });
  const [chon, setChon] = useState<string | null>(null);
  useEffect(() => { ghiDaXem(luot); }, [luot]);
  if (!d) return <ManTre tab="nha"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const diem = d.l?.diem ?? 0;
  const camOn = async () => {
    if (chon && d.khen) await kid.goi(`loi-khen/${d.khen.id}/phan-hoi`, { phanHoi: chon }).catch(() => {});
    router.replace("/tre/nha");
  };
  return (
    <ManTre tab="nha">
      <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
      <CanhGiua lv="xong" tieu={`+${diem} điểm!`} loi={d.l?.loi_khen ? `Ba Mẹ nhắn: “${d.l.loi_khen}”` : `Ba Mẹ đã duyệt “${d.l?.ten ?? "nhiệm vụ"}”`}>
        <Nut chu="Cảm ơn Ba Mẹ ♥" loai="vang" bam={camOn} />
        {d.khen && !d.khen.phan_hoi ? (
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }} accessibilityRole="radiogroup" accessibilityLabel="Gửi biểu cảm cho Ba Mẹ">
            {BIEU_CAM.map((e) => (
              <Pressable key={e} onPress={() => setChon(e === chon ? null : e)} accessibilityRole="radio" accessibilityState={{ checked: e === chon }}
                style={{ minHeight: 44, minWidth: 56, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, alignItems: "center", justifyContent: "center",
                  borderColor: e === chon ? M.chinh : M.vien2, backgroundColor: e === chon ? "#eef5f2" : "#fff" }}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </CanhGiua>
    </ManTre>
  );
}
