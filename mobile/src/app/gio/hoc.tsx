// «Giờ học của <Con>» (thiết kế chốt 14/11, bm-gio-ho-so/03): bắt đầu / kết thúc, áp cho các ngày, «Trong giờ học, máy chỉ mở N» — app Học
// (đèn Xanh, nhãn «Học», không trừ giờ chơi — N3); câu «<app chơi> tạm khoá 17:00 – 18:00. Giờ học không trừ giờ chơi.» Lưu = POST con/:id/gio-choi {gioHoc: {tu, den, thu}}; «Bỏ giờ học» = gioHoc null.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type ConChiTiet } from "@/lib/api";
import { ChonGio } from "@/lib/gio-chon";
import { CAU_TRONG_GIUP, gioGon, HangViec, quyenToi, TieuMuc, type GioChoi } from "@/lib/hang-ngay";
import { BaoLoi, baoKhiVe, Canh, ChoTai, Chips, Chu, M, Man, Nhan, Nut, The, useLam, useTai } from "@/lib/ui";

const NGAY = [1, 2, 3, 4, 5, 6, 0].map((x) => ({ gia: x, chu: x === 0 ? "CN" : `T${x + 1}` }));
type Luat = { ds: { child_id: string | null; muc: string; ten?: string | null; loai: string }[] };

export default function GioHocCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, c, q, l] = await Promise.all([bm.goi<GioChoi>(`con/${con}/gio-choi`), bm.goi<ConChiTiet>(`con/${con}`), quyenToi(),
      bm.goi<Luat>("luat").catch(() => null)]);
    const cua = (loai: string) => [...new Set(l?.ds.filter((x) => x.loai === loai && (!x.child_id || x.child_id === con)).map((x) => x.ten || x.muc) ?? [])];
    return { hoc: g.gioHoc, ten: c.ten, xem: q === "trong_giup", appHoc: cua("hoc").slice(0, 4), appChoi: cua("giai_tri").slice(0, 2) };
  });
  const [tu, setTu] = useState<string | null>(null);
  const [den, setDen] = useState<string | null>(null);
  const [thu, setThu] = useState<number[] | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Giờ chơi" }} tieu="Giờ học"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const a = tu ?? d.hoc?.tu ?? "17:00", b = den ?? d.hoc?.den ?? "18:00", ng = thu ?? d.hoc?.thu ?? [1, 2, 3, 4, 5];
  const luu = (bo?: boolean) => lam(async () => {
    await bm.goi(`con/${con}/gio-choi`, { gioHoc: bo ? null : { tu: a, den: b, thu: ng } });
    baoKhiVe(bo ? `Đã bỏ giờ học của ${d.ten}` : `Đã lưu giờ học ${gioGon(a)} – ${gioGon(b)} cho ${d.ten}`);
    router.back();
  }, { hangDoi: true });
  return (
    <Man lui={{ chu: "Giờ chơi" }} tieu={`Giờ học của ${d.ten}`} day={d.xem ? <Chu co={13.5} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu giờ học ${gioGon(a)} – ${gioGon(b)}`} rong dangChay={dangChay} tat={a === b || !ng.length} bam={() => luu()} />
      {d.hoc ? <Nut chu="Bỏ giờ học" loai="ma" rong bam={() => luu(true)} /> : null}
    </>}>
      <ChonGio nhan="Bắt đầu" gia={a} doi={setTu} tat={d.xem} />
      <ChonGio nhan="Kết thúc" gia={b} doi={setDen} tat={d.xem} />
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14}>Áp cho các ngày</Chu>
        <Chips ds={NGAY} chon={ng} doi={(v) => !d.xem && setThu(ng.includes(v) ? ng.filter((x) => x !== v) : [...ng, v])} />
      </View>
      <TieuMuc chu="Trong giờ học, máy chỉ mở" so={1 + d.appHoc.length} />
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="may_tinh" mau="xanh" tieu="Học với AiiRob" phu="Không trừ giờ chơi" phai={<Nhan chu="Học" loai="ok" />} />
        {d.appHoc.length ? d.appHoc.map((x) => <HangViec key={x} ic="sach" mau="xanh" tieu={x} phu="Không trừ giờ chơi" phai={<Nhan chu="Học" loai="ok" />} />)
          : <HangViec ic="sach" mau="xanh" tieu="App học Ba Mẹ đã xếp" phu="Không trừ giờ chơi" phai={<Nhan chu="Học" loai="ok" />} />}
      </The>
      <Canh lv="chi" thap tieu={`${d.appChoi.length ? d.appChoi.join(", ") : "App chơi"} tạm khoá ${gioGon(a)} – ${gioGon(b)}.`} loi="Giờ học không trừ giờ chơi." />
    </Man>
  );
}
