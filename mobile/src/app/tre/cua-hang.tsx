// con-cua-hang «Cửa hàng» (FR-04.01, BRD 6.5): đủ điểm thì món sáng lên, chưa đủ ⇒ «Còn thiếu X». Phút chơi đổi bằng điểm ở ô đầu.
import { router } from "expo-router";
import { View } from "react-native";
import { BangMang, Canh, CanhGiua, ChoTai, Nhan, Nut } from "@/lib/ui";
import { DiemTren, ManTre, QuaO, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type QuaTre, type TroChoi } from "@/lib/api-tre";
import type { LinhVat } from "@/lib/ui";

const HINH_QUA: Record<QuaTre["loai"], [LinhVat, string]> = {
  voucher: ["qua", "#ffeab0"], dac_quyen: ["sao", "#eeeafe"], qua: ["xong", "#fde3dc"], tiet_kiem: ["canh-diem", "#e3efeb"],
};

export default function CuaHang() {
  const { ten, nhom } = useTre();
  const { d, loi, matMang, tai, dangTai, cu } = useTaiTre("cua-hang", async () => {
    const [ch, nha, tc] = await Promise.all([kid.goi<{ soDu: number; qua: QuaTre[] }>("cua-hang"), kid.goi<NhaTre>("nha"), kid.goi<{ ds: TroChoi[] }>("tro-choi")]);
    return { ch, nha, tc: tc.ds };
  });
  if (!d) return <ManTre tab="cua-hang"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const gia = d.tc.length ? Math.min(...d.tc.map((x) => x.giaPhut)) : 0;
  const phut = d.nha.phienToiDa;
  if (!d.ch.qua.length && !d.tc.length) {
    return (
      <ManTre tab="cua-hang">
        <DiemTren n={d.ch.soDu} chuoi={d.nha.chuoiNgay} />
        <CanhGiua lv="canh-trong" tieu="Cửa hàng đang trống" loi={`Nhờ Ba Mẹ thêm quà cho ${ten} nhé.`}>
          <Nut chu="Về nhà" bam={() => router.replace("/tre/nha")} />
        </CanhGiua>
      </ManTre>
    );
  }
  return (
    <ManTre tab="cua-hang" tai={tai} dangTai={dangTai}>
      <DiemTren n={d.ch.soDu} chuoi={d.nha.chuoiNgay} />
      {matMang || cu ? <BangMang chu={`Mất mạng — xem được quà nhưng chưa đổi được; điểm của ${ten} không bị trừ.`} /> : null}
      <Canh lv="qua" mau="vang" tieu={`${ten} đổi gì nào?`} loi="Đủ điểm thì nút sáng lên!" thap />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {d.tc.length ? (
          <QuaO lv="cho" nen="#e3efeb" tieu={`${phut} phút chơi`} nhan={<Nhan chu={`${Math.ceil(phut * gia)} điểm`} loai="diem" />}
            phu={`${String(gia).replace(".", ",")} điểm/phút · chỉ trừ khi chơi`} bam={() => router.push("/tre/choi")} nhanDoc={`${phut} phút chơi — dùng điểm để chơi`} />
        ) : null}
        {d.ch.qua.map((q) => {
          const [lv, nen] = HINH_QUA[q.loai] ?? HINH_QUA.qua;
          const phu = !q.du ? `Còn thiếu ${q.conThieu}` : q.chi_cuoi_tuan ? "Chỉ cuối tuần" : undefined;
          return (
            <QuaO key={q.id} lv={lv} nen={nen} tieu={q.ten} mo={!q.du} nhan={<Nhan chu={`${q.diem} điểm`} loai={q.du ? "diem" : "xam"} />} phu={phu}
              bam={q.du ? () => router.push(`/tre/doi/${q.id}`) : undefined} nhanDoc={`${q.ten}, ${q.diem} điểm${phu ? `. ${phu}` : ""}`} />
          );
        })}
      </View>
      <Nut chu={`Ví quà của ${ten}`} ic="the_qua" loai="vien" rong bam={() => router.push("/tre/vi-qua")} />
      {nhom === "teen" ? <Nut chu="Bảng giá chi tiết" ic="sach" loai="ma" rong bam={() => router.push("/tre/quy-tac")} /> : null}
    </ManTre>
  );
}
