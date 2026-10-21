// con-doi-voucher «Đổi phiếu quà AiiCafe» (BRD 6.5): xác nhận đổi — điểm hiện có, −giá, còn lại. Quỹ phiếu quà của nhà thiếu ⇒ điểm giữ nguyên,
// Rob đã báo Ba Mẹ. Mất mạng ⇒ chưa đổi, không trừ điểm.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { BaoLoi, Canh, CanhGiua, ChoTai, Chu, M, Nut, The, laMatMang, useLam } from "@/lib/ui";
import { DiemTren, GhiChu, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type QuaTre } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

const LUI = { chu: "Cửa hàng", ve: "/tre/cua-hang" };
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
    const q = ch.qua.find((x) => x.id === qua);
    if (!q) throw new LoiApi("khong_thay", "Món quà này không còn trong Cửa hàng.", 404);
    return { soDu: ch.soDu, q, chuoi: nha.chuoiNgay };
  });
  const [quyThieu, setQuyThieu] = useState(false);
  const { dangChay, loi: loiDoi, lam } = useLam();
  if (!d) return <ManTre lui={LUI}><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  if (quyThieu) {
    return (
      <ManTre lui={LUI}>
        <CanhGiua lv="cho" tieu="Đợi Ba Mẹ nạp quỹ nhé" loi={`Quỹ phiếu quà của nhà mình đang thiếu. Điểm của ${ten} vẫn giữ nguyên.`}>
          <Nut chu="Về cửa hàng" bam={() => router.replace("/tre/cua-hang")} />
        </CanhGiua>
      </ManTre>
    );
  }
  const { q } = d;
  const voucher = q.loai === "voucher";
  const doi = () => lam(async () => {
    try {
      await kid.goi(`doi/${q.id}`, {});
      router.replace("/tre/vi-qua");
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "quy_thieu") { setQuyThieu(true); return; }
      if (laMatMang(e)) throw new LoiApi("mat_mang", `Mất mạng — chưa đổi được, điểm của ${ten} không bị trừ.`, 0);
      throw e;
    }
  });
  return (
    <ManTre lui={LUI} day={<><BaoLoi loi={loiDoi} /><Nut chu={`Đổi ${q.diem} điểm`} loai="vang" ic="qua" rong bam={doi} dangChay={dangChay} /></>}>
      <DiemTren n={d.soDu} chuoi={d.chuoi} />
      <Canh lv="qua" mau="vang" tieu={q.ten} loi={voucher ? "Dùng tại quầy AiiCafe · hạn 60 ngày." : `Ba Mẹ trao quà cho ${ten} sau khi đổi.`} />
      <The dem style={{ gap: 8 }}>
        <DongSo chu={`Điểm của ${ten}`} so={String(d.soDu)} />
        <DongSo chu={voucher ? "Đổi phiếu quà" : "Đổi quà"} so={`−${q.diem}`} />
        <View style={{ height: 1, backgroundColor: M.vien }} />
        <DongSo chu="Còn lại" so={`${d.soDu - q.diem} điểm`} dam />
      </The>
      <GhiChu giua>{`Rob báo Ba Mẹ ngay khi ${ten} đổi.`}</GhiChu>
    </ManTre>
  );
}
