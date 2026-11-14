// «Giờ ngủ của <Con>» (thiết kế chốt 14/11, bm-gio-ho-so/02): máy khoá lúc / mở lại lúc, lưu = POST con/:id/gio-choi {gioNgu}.
// Giờ ngủ ở máy chủ áp MỌI ngày (lich.ngu không có ngày) ⇒ không có chip «Áp cho các ngày» của thiết kế (lệch ghi trong PR M2).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm, type ConChiTiet } from "@/lib/api";
import { ChonGio } from "@/lib/gio-chon";
import { CAU_TRONG_GIUP, gioGon, quyenToi, type GioChoi } from "@/lib/hang-ngay";
import { BaoLoi, baoKhiVe, Canh, ChoTai, Chu, M, Man, Nut, useLam, useTai } from "@/lib/ui";

export default function GioNgu() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, c, q] = await Promise.all([bm.goi<GioChoi>(`con/${con}/gio-choi`), bm.goi<ConChiTiet>(`con/${con}`), quyenToi()]);
    return { ngu: g.gioNgu, ten: c.ten, xem: q === "trong_giup" };
  });
  const [tu, setTu] = useState<string | null>(null);
  const [den, setDen] = useState<string | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Giờ chơi" }} tieu="Giờ ngủ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const a = tu ?? d.ngu.tu, b = den ?? d.ngu.den;
  const luu = () => lam(async () => {
    await bm.goi(`con/${con}/gio-choi`, { gioNgu: { tu: a, den: b } });
    baoKhiVe(`Đã lưu giờ ngủ ${gioGon(a)} – ${gioGon(b)} cho ${d.ten}`);
    router.back();
  }, { hangDoi: true });
  return (
    <Man lui={{ chu: "Giờ chơi" }} tieu={`Giờ ngủ của ${d.ten}`} day={d.xem ? <Chu co={13.5} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu giờ ngủ ${gioGon(a)} – ${gioGon(b)}`} rong dangChay={dangChay} tat={a === b} bam={luu} />
    </>}>
      <Canh lv="ngu" thap tieu="Tới giờ ngủ, máy tự khoá" loi="Con chỉ xin Ba Mẹ mở ngoại lệ được, không thêm giờ hay đổi sao." />
      <ChonGio nhan="Máy khoá lúc" gia={a} doi={setTu} tat={d.xem} />
      <ChonGio nhan="Mở lại lúc" gia={b} doi={setDen} tat={d.xem} />
      <Chu co={13.5} mau={M.chu3} style={{ marginHorizontal: 4 }}>Áp cho mọi ngày trong tuần.</Chu>
    </Man>
  );
}
