// «<Con> đang xin phép» — một lời xin app / web (bàn bm-ung-dung khuôn them-a4nqjrmp@v17, luồng #258 · #490): thẻ xin DÙNG CHUNG với tab App & web và danh sách
// App / Web (lib/hom-nay-xin › TheXin dangXin truc): icon · tên · «máy · con đang chờ» · giờ; ô lõm lời con; «Tính phút» (vàng kim) | «Không tính phút» ngang nhau,
// «Bỏ qua» chữ nhỏ ≥ 44. Tính phút / Không tính phút ⇒ POST yeu-cau/:id/dong-y ⇒ màn «Đã thêm …» (/yeu-cau/xong); Bỏ qua ⇒ POST yeu-cau/:id/bo-qua (hoàn tác 60 giây).
// Người trông giúp cũng trả lời được (quyen.ts › trongGiupDuoc).
import { useLocalSearchParams } from "expo-router";
import { bm, laChiXem, tenYc, type ConChiTiet, type YeuCau } from "@/lib/api";
import type { YeuCauMoi } from "@/lib/hang-ngay";
import { TheXin } from "@/lib/hom-nay-xin";
import { veHoac } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Man, The, useLam, useTai } from "@/lib/ui";

type Yc = YeuCau & { device_id?: string | null };

export default function YeuCauWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cd, xem] = await Promise.all([bm.goi<{ yeuCau: Yc[] }>("cho-duyet"), laChiXem()]);
    const y = cd.yeuCau.find((x) => x.id === id) ?? null;
    const ct = y ? await bm.goi<ConChiTiet>(`con/${y.child_id}`).catch(() => null) : null;
    return { y, ct, xem, luc: Date.now() };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = () => veHoac("/chan");
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.y) return <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở"><ChoTai loi="Lời xin này đã được trả lời (hoặc đã hết hạn)." tai={ve} /></Man>;
  const y = d.y, ten = tenYc(y) ?? (y.loai === "mo_web" ? "Trang web" : "App mới"), tenCon = d.ct?.ten ?? y.ten_con;
  const may = y.device_id ? d.ct?.may.find((m) => m.id === y.device_id)?.ten ?? null : null;
  // bàn them-a4nqjrmp@v17: «<Con> đang xin phép» — thẻ xin dùng chung với tab App & web / danh sách App, Web (TheXin dangXin truc)
  const yc = { ...y, ten_app: y.ten_app ?? ten } as YeuCauMoi;
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`${tenCon} đang xin phép`}>
      {d.xem ? null : (
        <The style={{ paddingVertical: 2 }}>
          <TheXin y={yc} may={may} lam={(fn) => lam(fn)} dang={dangChay} dangXin truc phu={`${ten} chưa có trong danh sách được mở`} />
        </The>
      )}
      <BaoLoi loi={loiLam} />
    </Man>
  );
}
