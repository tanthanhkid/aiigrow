// con-cua-hang «Sao & quà» (FR-04.01, BRD 6.5, thiết kế 05/11 con-ngay-thuong «Sao & quà»): đủ sao thì món sáng lên, chưa đủ ⇒ «Còn thiếu X sao».
// Ô đầu: đổi sao lấy giờ chơi (10 sao = 10 phút, cộng vào quỹ hôm nay — màn Thêm giờ). Quà đổi xong ⇒ «Đã gửi Ba Mẹ», Ba Mẹ trao tay.
// 05/11 bỏ phiếu quà AiiCafe / mã QR (máy chủ đã ẩn — lọc thêm ở đây cho bản máy chủ cũ).
import { router } from "expo-router";
import { View } from "react-native";
import { BangMang, Canh, CanhGiua, ChoTai, Nhan, Nut } from "@/lib/ui";
import { DiemTren, ManTre, QuaO, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, lyDoKhoa, type NhaTreSao, type QuaTre } from "@/lib/api-tre";
import type { LinhVat } from "@/lib/ui";

const HINH_QUA: Record<string, [LinhVat, string]> = {
  dac_quyen: ["sao", "#eeeafe"], qua: ["xong", "#fde3dc"], tiet_kiem: ["canh-diem", "#e3efeb"], phut: ["cho", "#e3efeb"],
};

export default function CuaHang() {
  const { ten, nhom } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("cua-hang", async () => {
    const [ch, nha] = await Promise.all([kid.goi<{ soDu: number; sao?: number; qua: QuaTre[] }>("cua-hang"), kid.goi<NhaTreSao>("nha")]);
    return { ch, nha };
  });
  if (!d) return <ManTre tab="cua-hang"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const sao = d.ch.sao ?? d.ch.soDu;
  const qua = d.ch.qua.filter((q) => q.loai !== "voucher");
  const q = d.nha.quy;
  const doiGio = !!q && q.doiSao.bat;
  if (!qua.length && !doiGio) {
    return (
      <ManTre tab="cua-hang">
        <DiemTren n={sao} chuoi={d.nha.chuoiNgay} />
        <CanhGiua lv="canh-trong" tieu="Chưa có quà nào" loi={`Nhờ Ba Mẹ thêm quà cho ${ten} nhé.`}>
          <Nut chu="Về Hôm nay" bam={() => router.replace("/tre/nha")} />
        </CanhGiua>
      </ManTre>
    );
  }
  return (
    <ManTre tab="cua-hang" tai={tai} vongTai>
      <DiemTren n={sao} chuoi={d.nha.chuoiNgay} />
      {matMang || cu ? <BangMang chu={`Mất mạng — xem được quà nhưng chưa đổi được; sao của ${ten} không bị trừ.`} /> : null}
      <Canh lv="qua" mau="vang" tieu={`${ten} có ${sao} sao`} loi="Đổi sao lấy giờ chơi hoặc quà — đủ sao thì nút sáng lên!" thap />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {doiGio ? (
          <QuaO lv="cho" nen="#e3efeb" tieu={`${q!.tyLe.phut} phút chơi`} nhan={<Nhan chu={`${q!.tyLe.sao} sao`} loai="diem" />}
            phu={lyDoKhoa(q) ? "Lúc này không đổi được" : "Cộng vào giờ chơi hôm nay"} bam={() => router.push("/tre/them-gio")}
            nhanDoc={`Đổi ${q!.tyLe.sao} sao lấy ${q!.tyLe.phut} phút chơi`} />
        ) : null}
        {qua.map((x) => {
          const [lv, nen] = HINH_QUA[x.loai] ?? HINH_QUA.qua;
          const phu = !x.du ? `Còn thiếu ${x.conThieu} sao` : x.chi_cuoi_tuan ? "Chỉ cuối tuần" : undefined;
          return (
            <QuaO key={x.id} lv={lv} nen={nen} tieu={x.ten} mo={!x.du} nhan={<Nhan chu={`${x.diem} sao`} loai={x.du ? "diem" : "xam"} />} phu={phu}
              bam={x.du ? () => router.push(`/tre/doi/${x.id}`) : undefined} nhanDoc={`${x.ten}, ${x.diem} sao${phu ? `. ${phu}` : ""}`} />
          );
        })}
      </View>
      <Nut chu={`Quà của ${ten}`} ic="the_qua" loai="vien" rong bam={() => router.push("/tre/vi-qua")} />
      {nhom === "teen" ? <Nut chu="Quy tắc nhà mình" ic="sach" loai="ma" rong bam={() => router.push("/tre/quy-tac")} /> : null}
    </ManTre>
  );
}
