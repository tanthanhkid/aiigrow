// «Đổi quà» xác nhận + «Đã gửi Ba Mẹ» bản «Dịu» (con-dt-ngay 17–18, Nghi chốt 06/11 — L14): quà + giá, «50 → 0 sao», «Sao được giữ lại ·
// Ba Mẹ trao xong mới trừ», mô tả quà; «Gửi Ba Mẹ đổi quà» / «Để dành sao». Gửi xong: «Đang giữ 50 sao · còn 0 sao · ⏳ Chờ Ba Mẹ trao»,
// «Ba Mẹ trao quà thì mới trừ sao. Ba Mẹ huỷ thì 50 sao về lại cho con.» Mất mạng ⇒ chưa đổi, không giữ sao.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { LoiApi } from "@/lib/api";
import { kid, type QuaTre } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { Icon3D, laMatMang, useLam } from "@/lib/ui";
import { ChoD, ChuD, IcO, LoiD, ManD, NutD, PillD, TheD, TieuD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

type QuaS3 = QuaTre & { moTa?: string | null };

export default function DoiQua() {
  const { qua } = useLocalSearchParams<{ qua: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre(`doi-${qua}`, async () => {
    const ch = await kid.goi<{ soDu: number; sao?: number; qua: QuaS3[] }>("cua-hang");
    const q = ch.qua.find((x) => x.id === qua);
    if (!q) throw new LoiApi("khong_thay", "Món quà này không còn nữa.", 404);
    return { sao: ch.sao ?? ch.soDu, q };
  });
  const [daGui, setDaGui] = useState<{ giu: number; con: number } | null>(null);
  const { dangChay, loi: loiDoi, lam } = useLam();
  if (!d) return <ManD lui="/tre/cua-hang" tieu="Đổi quà"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const { q } = d;
  if (daGui) {
    return (
      <ManD lui="/tre/vi-qua" giua day={<><NutD chu="Về Sao & quà" bam={() => router.replace("/tre/vi-qua")} />
        <NutD chu="Làm nhiệm vụ kiếm sao" loai="chu" bam={() => router.replace("/tre/nhiem-vu")} /></>}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <IcO ic="gui" co={96} />
          <TieuD chu="Đã gửi Ba Mẹ" giua />
          <ChuD kieu="den" co={18} giua>{q.ten}</ChuD>
          <ChuD kieu="rat" co={14.5} mau={D.saoInk} giua>{`Đang giữ ${q.diem} sao · còn ${daGui.con} sao`}</ChuD>
          <PillD chu="⏳ Chờ Ba Mẹ trao" loai="cho" />
        </View>
        <TheD>
          <ChuD kieu="rat" co={15}>Ba Mẹ trao quà thì mới trừ sao.</ChuD>
          <ChuD co={14.5} mau={D.chu2}>{`Ba Mẹ huỷ thì ${q.diem} sao về lại cho con.`}</ChuD>
        </TheD>
      </ManD>
    );
  }
  const doi = () => lam(async () => {
    try {
      const r = await kid.goi<{ saoGiu?: number }>(`doi/${q.id}`, {});
      setDaGui({ giu: r.saoGiu ?? q.diem, con: Math.max(0, d.sao - q.diem) });
    } catch (e) {
      if (laMatMang(e)) throw new LoiApi("mat_mang", `Mất mạng — chưa đổi được, sao của ${ten} không bị giữ.`, 0);
      throw e;
    }
  });
  return (
    <ManD lui="/tre/cua-hang" tieu="Đổi quà" day={<><LoiD loi={loiDoi} /><NutD chu="Gửi Ba Mẹ đổi quà" ic="gui" bam={doi} dangChay={dangChay} />
      <NutD chu="Để dành sao" loai="chu" bam={() => router.replace("/tre/cua-hang")} /></>}>
      <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
        <IcO ic={q.loai === "voucher" ? "the_qua" : "qua"} co={96} />
        <TieuD chu={q.ten} nho giua />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon3D ten="sao" co={22} />
          <ChuD kieu="den" co={18} mau={D.saoInk}>{`${q.diem} sao`}</ChuD>
        </View>
      </View>
      <TheD vang>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ChuD kieu="den" co={28} mau={D.saoInk} so>{String(d.sao)}</ChuD>
          <ChuD kieu="den" co={22} mau={D.saoInk}>→</ChuD>
          <ChuD kieu="den" co={28} mau={D.saoInk} so>{`${Math.max(0, d.sao - q.diem)} sao`}</ChuD>
        </View>
        <ChuD kieu="rat" co={13.5} mau={D.saoInk} giua>Sao được giữ lại · Ba Mẹ trao xong mới trừ</ChuD>
      </TheD>
      {q.moTa ? <ChuD co={15} mau={D.chu2} giua>{q.moTa}</ChuD> : null}
    </ManD>
  );
}
