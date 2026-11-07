// «Đổi quà» (cửa hàng) bản «Dịu» (con-dt-ngay 16 cdt-cua-hang, Nghi chốt 06/11 — L14): quà theo bảng giá sao (50 / 100 / 200 / 200 / 300 /
// 500 / 800), mỗi quà: ô icon + tên + nhãn điều kiện nhỏ («Ba Mẹ trao», «Mã QR», «T7, CN», «Còn 1 bộ») + «Còn thiếu X sao» + thanh tới giá +
// giá sao; đủ sao ⇒ thẻ nổi «Đủ sao rồi! Bấm để đổi»; quà đang giữ sao ⇒ «chờ Ba Mẹ trao». Đổi phút ở nút riêng «Đổi 10 sao lấy 10 phút» (L2).
import { router } from "expo-router";
import { View } from "react-native";
import { kid, type NhaTreSao, type QuaTre } from "@/lib/api-tre";
import { nhanQua, phuQua } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { Icon3D, type TenIcon } from "@/lib/ui";
import { CamXuc, ChoD, ChuD, IcO, ManD, MatMangD, NutD, PillD, SaoD, TheD, ThanhD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

type QuaS3 = QuaTre & { hinh?: string | null; tonKho?: number | null; chiCuoiTuan?: boolean; choTraoTu?: string | null };
const HINH: Record<string, TenIcon> = { aiicafe: "coc", bua_toi: "chen", an_kem: "coc", do_choi: "game", phim: "tia", lego: "qua", dong_ho: "dongho" };
const icQua = (q: QuaS3): TenIcon => (q.hinh && HINH[q.hinh]) || (q.loai === "voucher" ? "the_qua" : q.loai === "dac_quyen" ? "ngoi_sao_nho" : q.loai === "tiet_kiem" ? "xu" : "qua");

export default function CuaHang() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("cua-hang", async () => {
    const [ch, nha] = await Promise.all([kid.goi<{ soDu: number; sao?: number; saoGiu?: number; qua: QuaS3[] }>("cua-hang"), kid.goi<NhaTreSao>("nha")]);
    return { ch, nha };
  });
  if (!d) return <ManD lui="/tre/vi-qua" tieu="Đổi quà"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const sao = d.ch.sao ?? d.ch.soDu;
  const qua = d.ch.qua.filter((q) => q.loai !== "phut");
  const q = d.nha.quy;
  const doiPhut = !!q && q.doiSao.bat;
  return (
    <ManD lui="/tre/vi-qua" tieu="Đổi quà" phai={<SaoD chu={`Có ${sao} sao`} />}
      day={doiPhut ? <><NutD chu={`Đổi ${q!.tyLe.sao} sao lấy ${q!.tyLe.phut} phút`} ic="dongho" bam={() => router.push("/tre/choi")} />
        <ChuD kieu="rat" co={13} mau={D.chu2} giua>Quà do Ba Mẹ đặt · đổi xong Ba Mẹ trao</ChuD></> : undefined}>
      {matMang || cu ? <MatMangD chu={`Mất mạng rồi — xem được quà nhưng chưa đổi được; sao của ${ten} không bị trừ.`} /> : null}
      {!qua.length ? (
        <CamXuc lv="canh-trong" co={130} tieu="Chưa có quà nào" phu={`Nhờ Ba Mẹ thêm quà cho ${ten} nhé.`} />
      ) : (
        <>
          <ChuD kieu="den" co={15}>Quà con đổi được</ChuD>
          {qua.map((x) => {
            const dangGiu = !!x.choTraoTu;
            const nhan = nhanQua(x) ?? (x.loai === "qua" || x.loai === "dac_quyen" ? "Ba Mẹ trao" : null);
            const bam = x.du && !dangGiu ? () => router.push(`/tre/doi/${x.id}`) : undefined;
            return (
              <TheD key={x.id} bam={bam} mong xanh={x.du && !dangGiu} nhanDoc={`${x.ten}, ${x.diem} sao. ${phuQua(x)}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <IcO ic={icQua(x)} co={52} nen={x.du && !dangGiu ? D.the : D.ic} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <ChuD kieu="rat" co={16.5} dong={1}>{x.ten}</ChuD>
                      {nhan ? <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: D.xamNhat, justifyContent: "center" }}>
                        <ChuD kieu="rat" co={11.5} mau={D.chu2}>{nhan}</ChuD></View> : null}
                    </View>
                    <ChuD kieu="rat" co={13} mau={x.du && !dangGiu ? D.xanhD : D.saoInk}>{phuQua(x)}</ChuD>
                    {!x.du && !dangGiu ? <ThanhD ti={x.diem ? sao / x.diem : 0} mau={D.sao} /> : null}
                    {dangGiu ? <PillD chu="⏳ Chờ Ba Mẹ trao" loai="cho" /> : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Icon3D ten="sao" co={18} />
                    <ChuD kieu="den" co={15} mau={D.saoInk} so>{String(x.diem)}</ChuD>
                  </View>
                </View>
              </TheD>
            );
          })}
        </>
      )}
    </ManD>
  );
}
