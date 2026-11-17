// «Con xin mở» app / web (bàn bm-ung-dung bm2-yeu-cau-web@v15 — luồng #258): thẻ app/web + «Bảo Anh xin · 19:20 · Laptop» + «Chờ N′»,
// Grow chuyển lời nhắn của con, «Thêm YouTube cho Bảo Anh?» ba lựa chọn:
//  · «Tính phút» (nút chính) — thêm vào danh sách · trả bằng sao  ⇒ POST yeu-cau/:id/dong-y {nhom: tinh_phut} ⇒ màn «Đã thêm … · Tính phút» (them-1ypcydle)
//  · «Không tính phút» — thêm vào danh sách · vào thoải mái         ⇒ dong-y {nhom: khong_tinh_phut}
//  · «Bỏ qua» — không ghi gì · con xin lại được                     ⇒ POST yeu-cau/:id/bo-qua ⇒ màn «Đã bỏ qua» (them-hppe9qh6, Hoàn tác 60 giây)
// Người trông giúp cũng trả lời được (quyen.ts › trongGiupDuoc).
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type ConChiTiet, type YeuCau } from "@/lib/api";
import { boQuaXin, themTuXin, type Nhom } from "@/lib/app-web";
import { NutQuyet, OIcon, RobNoi, icCuaApp, lucNgan, veHoac } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { BaoLoi, ChoTai, Chu, M, Man, useLam, useTai } from "@/lib/ui";

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
  const y = d.y, ten = y.gia_tri ?? (y.loai === "mo_web" ? "Trang web" : "App mới"), tenCon = d.ct?.ten ?? y.ten_con;
  const may = y.device_id ? d.ct?.may.find((m) => m.id === y.device_id)?.ten ?? null : null;
  const cho = Math.max(0, Math.round((d.luc - new Date(y.created_at).getTime()) / 60000));
  const them = (nhom: Nhom) => lam(async () => {
    const r = await themTuXin(y.id, nhom);
    // `ma` = định danh máy chủ vừa ghi (app: tên thật máy báo / tên miền) — màn kết quả tìm hàng bằng nó, không bằng nhãn hiển thị
    router.replace({ pathname: "/yeu-cau/xong", params: { kieu: "mo", ten: tenCon, con: y.child_id, muc: ten, ...(r?.muc ? { ma: r.muc } : {}), ...(may ? { may } : {}),
      ...(nhom === "tinh_phut" ? { phut: "1" } : {}) } } as never);
  });
  const boQua = () => lam(async () => {
    await boQuaXin(y.id);
    router.replace({ pathname: "/yeu-cau-web/bo-qua", params: { id: y.id, ten, con: tenCon, ...(may ? { may } : {}) } });
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 28, backgroundColor: M.the, ...KHOI.the }}>
        <OIcon ic={y.loai === "mo_web" ? "web" : icCuaApp(ten)} co={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={20} dong={1}>{ten}</Chu>
          <Chu kieu="dam" co={12.5} mau={M.chu3}>{[`${tenCon} xin`, lucNgan(y.created_at), may?.replace(/ của .*$/, "")].filter(Boolean).join(" · ")}</Chu>
        </View>
        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, backgroundColor: M.canhSoft, alignSelf: "flex-start" }}>
          <Chu kieu="rat" co={12.5} mau={M.canh}>{`Chờ ${cho}′`}</Chu>
        </View>
      </View>
      <RobNoi co={88}>
        <Chu kieu="dam" co={12} mau={M.chu3}>{`${tenCon} nhắn`}</Chu>
        <Chu kieu="dam" co={15}>{y.ly_do ? `«${y.ly_do}»` : `${tenCon} không ghi lý do.`}</Chu>
      </RobNoi>
      {d.xem ? null : (
        <>
          <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6, marginTop: 8 }}>{`Thêm ${ten} cho ${tenCon}?`}</Chu>
          <View style={{ gap: 10 }}>
            <NutQuyet loai="x" cham={M.diem} chu="Tính phút" phu="Thêm vào danh sách · trả bằng sao" dangChay={dangChay} bam={() => them("tinh_phut")} />
            <NutQuyet loai="c" cham="#7ED957" chu="Không tính phút" phu="Thêm vào danh sách · vào thoải mái" dangChay={dangChay} bam={() => them("khong_tinh_phut")} />
            <NutQuyet loai="b" ic="tro_lai" chu="Bỏ qua" phu="Không ghi gì · con xin lại được" dangChay={dangChay} bam={boQua} />
          </View>
        </>
      )}
      <BaoLoi loi={loiLam} />
    </Man>
  );
}
