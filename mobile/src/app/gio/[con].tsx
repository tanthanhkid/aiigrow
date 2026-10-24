// bm-gio «Giờ dùng máy» (mở từ Trang chủ): Khoá máy ngay có hạn giờ / Mở lại (FR-02.04, hiệu lực ở lần đồng bộ kế), khung ngày thường / cuối tuần / giờ ngủ,
// phiên tối đa + nghỉ, trần mỗi ngày (tính gộp mọi máy, FR-02.05).
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type ConChiTiet, type Khung } from "@/lib/api";
import { SuaKhung } from "@/lib/sua-gio";
import { BangKhoa, cauKhoa, cauMoTam, conHan, moLaiMay } from "@/lib/khoa-may";
import { BaoLoi, BieuTron, Canh, ChoTai, ChonMot, Chu, Dong, gioPhut, HaiNut, Man, Nhom, Nut, useHoanTac, useLam, useTai } from "@/lib/ui";

type Sua = "ngayThuong" | "cuoiTuan" | "ngu";

export default function GioChoi() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ConChiTiet>(`con/${con}`));
  const [sua, setSua] = useState<Sua | null>(null);
  const [moKhoa, setMoKhoa] = useState(false);
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man lui={{ chu: "Trang chủ" }} tieu="Giờ dùng máy"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const k = (x: Sua): Khung => (x === "ngu" ? d.lich.ngu : d.lich[x][0] ?? { tu: "17:00", den: "20:00" });
  const luuLich = (x: Sua, v: Khung) => lam(async () => {
    await bm.goi(`con/${con}/lich`, x === "ngu" ? { ...d.lich, ngu: v } : { ...d.lich, [x]: [v] });
    bao("Đã lưu — máy của Con nhận ở lần đồng bộ kế");
    await tai();
  }, { hangDoi: true });
  const cauHinh = (them: Record<string, number>) => lam(async () => { await bm.goi(`con/${con}/cau-hinh`, them); await tai(); }, { hangDoi: true });
  const moLai = () => lam(async () => { await moLaiMay(con, d.ten, bao, tai); await tai(); }, { hangDoi: true });
  const dangKhoa = d.khoaNgay && conHan(d.khoaDen);
  const moTam = dangKhoa ? cauMoTam(d.moTamDen, d.khoaDen) : null;
  return (
    <Man lui={{ chu: "Trang chủ" }} tieu="Giờ dùng máy" noi={noi}>
      <Canh lv={dangKhoa && !moTam ? "nghi" : "cho"} thap tieu={moTam ? `Máy của ${d.ten}: ${moTam}` : dangKhoa ? `Máy của ${d.ten}: ${cauKhoa(d.khoaDen).toLowerCase()}` : `${d.ten} dùng máy theo lịch`}
        loi={moTam ? `Ba Mẹ đã cho thêm giờ lúc máy đang khoá. ${d.khoaDen ? `Khoá tự hết lúc ${gioPhut(d.khoaDen)}.` : "Khoá giữ tới khi Ba Mẹ mở lại."}` : dangKhoa ? `Mọi trò chơi đóng ở lần đồng bộ kế. Máy Windows ở chế độ «Chặn thật» khoá hẳn (cả ứng dụng học) ${d.khoaDen ? `tới ${gioPhut(d.khoaDen)}, rồi tự mở` : "tới khi Ba Mẹ mở lại"}.` : `Trần ${d.thamSo.tran_ngay} phút mỗi ngày, tính gộp mọi máy.`} />
      <BaoLoi loi={loiLam} />
      <HaiNut>
        {dangKhoa ? <Nut chu="Mở lại máy" ic="mo_khoa" dangChay={dangChay} bam={moLai} />
          : <Nut chu="Khoá máy ngay" ic="khoa" loai="huy" bam={() => setMoKhoa(true)} />}
      </HaiNut>
      <Nhom>
        <Dong dau tieu="Ngày thường" phu={`${k("ngayThuong").tu} – ${k("ngayThuong").den}`} trai={<BieuTron ic="dongho" />} bam={() => setSua("ngayThuong")} />
        <Dong tieu="Cuối tuần" phu={`${k("cuoiTuan").tu} – ${k("cuoiTuan").den}`} trai={<BieuTron ic="lich" />} bam={() => setSua("cuoiTuan")} />
        <Dong tieu="Giờ ngủ" phu={`${d.lich.ngu.tu} – ${d.lich.ngu.den} · khoá mọi trò chơi`} trai={<BieuTron ic="trang_ngu" mau="tim" />} bam={() => setSua("ngu")} />
      </Nhom>
      <View style={{ gap: 6 }}>
        <Chu kieu="rat" co={14}>{`Mỗi phiên tối đa · sau phiên nghỉ ${d.thamSo.nghi_giua} phút`}</Chu>
        <ChonMot ds={[20, 30, 45, 60].map((x) => ({ gia: x, chu: `${x} phút` }))} gia={d.thamSo.phien_toi_da} doi={(v) => cauHinh({ phien_toi_da: v })} />
      </View>
      <View style={{ gap: 6 }}>
        <Chu kieu="rat" co={14}>Trần mỗi ngày · tính gộp mọi máy</Chu>
        <ChonMot ds={[60, 90, 120, 180].map((x) => ({ gia: x, chu: `${x} phút` }))} gia={d.thamSo.tran_ngay} doi={(v) => cauHinh({ tran_ngay: v })} />
      </View>
      <BangKhoa mo={moKhoa} dong={() => setMoKhoa(false)} con={con} ten={d.ten} xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} />
      {sua ? <SuaKhung mo tieu={sua === "ngu" ? "Giờ ngủ" : sua === "ngayThuong" ? "Giờ chơi ngày thường" : "Giờ chơi cuối tuần"} khung={k(sua)} dong={() => setSua(null)}
        luu={(v) => luuLich(sua, v)} /> : null}
    </Man>
  );
}
