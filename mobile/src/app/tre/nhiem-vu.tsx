// con-nhiem-vu «Nhiệm vụ hôm nay» (BRD 6.2, thiết kế 05/11 con-ngay-thuong): chọn một việc, làm xong nộp
// ảnh / ghi âm / viết kể lại / bấm «Xong»; «Học với AiiRob» thì AiiRob tự chấm. Ba Mẹ nhờ làm lại ⇒ lên đầu danh sách. Đủ lượt hôm nay ⇒ mờ, mai làm tiếp.
import { router } from "expo-router";
import { View } from "react-native";
import { BangMang, Canh, CanhGiua, ChoTai, Nhan, Nut } from "@/lib/ui";
import { DiemTren, ManTre, TheNv, phuNv, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type NvTre, type NvTreSao } from "@/lib/api-tre";
import { NHOM_NV } from "@/lib/api";

const THU_TU: Record<NvTre["trang_thai_con"], number> = { can_bo_sung: 0, dang_lam: 1, san_sang: 2, du_hom_nay: 3, du_tuan: 4, da_xong: 5 };

export default function NhiemVu() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("nhiem-vu", async () => ({
    nha: await kid.goi<NhaTre>("nha"), ds: (await kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1")).ds,
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
    <ManTre tab="nhiem-vu" tai={tai} vongTai>
      <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
      {matMang || cu ? <BangMang chu="Mất mạng — vẫn làm và chụp được, ảnh tự gửi khi có mạng." /> : null}
      <Canh lv="so-tay" tieu="Hôm nay làm gì nào?" loi="Chọn một việc, làm xong nộp bài là có sao!" thap />
      <View style={{ gap: 10 }}>
        {ds.map((x) => {
          const n = NHOM_NV[x.nhom] ?? NHOM_NV.khac;
          const het = x.trang_thai_con === "du_hom_nay" || x.trang_thai_con === "du_tuan";
          const bam = het ? undefined : x.trang_thai_con === "can_bo_sung" ? () => router.push(`/tre/chup-lai/${x.luot_dang}?nv=${x.id}`)
            : x.trang_thai_con === "dang_lam" ? () => router.push(`/tre/dang/${x.luot_dang}?nv=${x.id}`) : () => router.push(`/tre/nv/${x.id}`);
          return (
            <TheNv key={x.id} ic={n.ic} mau={n.mau} tieu={x.ten} phu={phuNv(x)} diem={x.sao ?? x.diem} het={het} bam={bam}
              nhan={x.trang_thai_con === "can_bo_sung" ? <Nhan chu="Làm lại" loai="canh" ic="camera" />
                : x.dang_cho ? <Nhan chu={`${x.dang_cho} bài chờ Ba Mẹ duyệt`} loai="lam" />
                  : x.tu_cham || x.bang_chung === "tu_dong" ? <Nhan chu="AiiRob tự chấm" loai="lam" /> : undefined} />
          );
        })}
      </View>
    </ManTre>
  );
}
