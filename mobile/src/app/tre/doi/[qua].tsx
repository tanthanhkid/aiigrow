// «Đổi quà bằng sao» (BRD 6.5, thiết kế 05/11 con-ngay-thuong): xác nhận đổi — sao hiện có, −giá, còn lại ⇒ «Đã gửi Ba Mẹ», Ba Mẹ trao tay.
// 05/11 bỏ phiếu quà AiiCafe (không còn quỹ thiếu). Mất mạng ⇒ chưa đổi, không trừ sao.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { BaoLoi, Canh, CanhGiua, ChoTai, Chu, M, Nut, The, laMatMang, useLam } from "@/lib/ui";
import { DiemTren, GhiChu, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type QuaTre } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

const LUI = { chu: "Sao & quà", ve: "/tre/cua-hang" };
const DongSo = ({ chu, so, dam }: { chu: string; so: string; dam?: boolean }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
    <Chu co={15} kieu={dam ? "rat" : "thuong"}>{chu}</Chu>
    <Chu kieu="rat" co={15} so>{so}</Chu>
  </View>
);

export default function DoiQua() {
  const { qua } = useLocalSearchParams<{ qua: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre(`doi-${qua}`, async () => {
    const [ch, nha] = await Promise.all([kid.goi<{ soDu: number; qua: QuaTre[] }>("cua-hang"), kid.goi<NhaTre>("nha")]);
    const q = ch.qua.find((x) => x.id === qua && x.loai !== "voucher");
    if (!q) throw new LoiApi("khong_thay", "Món quà này không còn nữa.", 404);
    return { soDu: ch.soDu, q, chuoi: nha.chuoiNgay };
  });
  const [daGui, setDaGui] = useState(false);
  const { dangChay, loi: loiDoi, lam } = useLam();
  if (!d) return <ManTre lui={LUI}><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const { q } = d;
  if (daGui) {
    return (
      <ManTre lui={LUI}>
        <DiemTren n={d.soDu - q.diem} chuoi={d.chuoi} />
        <CanhGiua lv="cho" tieu="Đã gửi Ba Mẹ!" loi={`${q.ten} — Ba Mẹ trao tận tay cho ${ten} nhé.`}>
          <Nut chu={`Xem quà của ${ten}`} bam={() => router.replace("/tre/vi-qua")} />
        </CanhGiua>
      </ManTre>
    );
  }
  const doi = () => lam(async () => {
    try {
      await kid.goi(`doi/${q.id}`, {});
      setDaGui(true);
    } catch (e) {
      if (laMatMang(e)) throw new LoiApi("mat_mang", `Mất mạng — chưa đổi được, sao của ${ten} không bị trừ.`, 0);
      throw e;
    }
  });
  return (
    <ManTre lui={LUI} day={<><BaoLoi loi={loiDoi} /><Nut chu={`Đổi ${q.diem} sao`} loai="vang" ic="qua" rong bam={doi} dangChay={dangChay} /></>}>
      <DiemTren n={d.soDu} chuoi={d.chuoi} />
      <Canh lv="qua" mau="vang" tieu={q.ten} loi={q.loai === "phut" ? `Ba Mẹ trao xong là cộng vào giờ chơi hôm nay.` : `Ba Mẹ trao quà cho ${ten} sau khi đổi.`} />
      <The dem style={{ gap: 8 }}>
        <DongSo chu={`Sao của ${ten}`} so={String(d.soDu)} />
        <DongSo chu="Đổi quà" so={`−${q.diem}`} />
        <View style={{ height: 1, backgroundColor: M.vien }} />
        <DongSo chu="Còn lại" so={`${d.soDu - q.diem} sao`} dam />
      </The>
      <GhiChu giua>{`Rob báo Ba Mẹ ngay khi ${ten} đổi.`}</GhiChu>
    </ManTre>
  );
}
