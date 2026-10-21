// con-nhiem-vu «Làm gì để có điểm» (BRD 6.2): chọn một việc, làm xong chụp ảnh là xong. Đủ lượt hôm nay ⇒ mờ, mai làm tiếp.
import { router } from "expo-router";
import { View } from "react-native";
import { BangMang, Canh, CanhGiua, ChoTai, Nhan, Nut } from "@/lib/ui";
import { DiemTren, ManTre, TheNv, phuNv, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type NvTre } from "@/lib/api-tre";
import { NHOM_NV } from "@/lib/api";

const THU_TU: Record<NvTre["trang_thai_con"], number> = { can_bo_sung: 0, dang_lam: 1, san_sang: 2, du_hom_nay: 3, du_tuan: 4, da_xong: 5 };

export default function NhiemVu() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, dangTai, cu } = useTaiTre("nhiem-vu", async () => ({
    nha: await kid.goi<NhaTre>("nha"), ds: (await kid.goi<{ ds: NvTre[] }>("nhiem-vu")).ds,
  }));
  if (!d) return <ManTre tab="nhiem-vu"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  if (!d.ds.length) {
    return (
      <ManTre tab="nhiem-vu">
        <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
        <CanhGiua lv="canh-trong" tieu="Chưa có nhiệm vụ nào" loi={`Nhờ Ba Mẹ thêm nhiệm vụ cho ${ten} nhé.`}>
          <Nut chu="Xin Ba Mẹ thêm nhiệm vụ" ic="tin" bam={() => router.push(`/tre/xin-phep?loai=khac&gia=${encodeURIComponent("Thêm nhiệm vụ mới")}`)} />
        </CanhGiua>
      </ManTre>
    );
  }
  const ds = [...d.ds].sort((a, b) => THU_TU[a.trang_thai_con] - THU_TU[b.trang_thai_con]);
  return (
    <ManTre tab="nhiem-vu" tai={tai} dangTai={dangTai}>
      <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
      {matMang || cu ? <BangMang chu="Mất mạng — vẫn làm và chụp được, ảnh tự gửi khi có mạng." /> : null}
      <Canh lv="so-tay" tieu="Hôm nay làm gì nào?" loi="Chọn một việc, làm xong chụp ảnh là xong!" thap />
      <View style={{ gap: 10 }}>
        {ds.map((x) => {
          const n = NHOM_NV[x.nhom] ?? NHOM_NV.khac;
          const het = x.trang_thai_con === "du_hom_nay" || x.trang_thai_con === "du_tuan";
          const bam = het ? undefined : x.trang_thai_con === "can_bo_sung" ? () => router.push(`/tre/chup-lai/${x.luot_dang}?nv=${x.id}`)
            : x.trang_thai_con === "dang_lam" ? () => router.push(`/tre/dang/${x.luot_dang}?nv=${x.id}`) : () => router.push(`/tre/nv/${x.id}`);
          return (
            <TheNv key={x.id} ic={n.ic} mau={n.mau} tieu={x.ten} phu={phuNv(x)} diem={x.diem} het={het} bam={bam}
              nhan={x.trang_thai_con === "can_bo_sung" ? <Nhan chu="Chụp lại" loai="canh" ic="camera" />
                : x.dang_cho ? <Nhan chu={`${x.dang_cho} ảnh chờ Ba Mẹ duyệt`} loai="lam" /> : undefined} />
          );
        })}
      </View>
    </ManTre>
  );
}
