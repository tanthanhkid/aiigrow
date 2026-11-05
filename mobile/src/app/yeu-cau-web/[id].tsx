// «Con xin mở» app / web (thiết kế chốt bm-ung-dung/09 bm2-yeu-cau-web → 08 «Đã không cho» / bm-hang-ngay/20 «Đã cho mở»): thẻ app/web + lúc xin,
// Rob chuyển lời nhắn của con, ba nút quyết — «Cho mở, tính vào N phút còn lại» (luật giai_tri, mãi) · «Cho dùng hôm nay, không tính giờ»
// (luật hoc, phạm vi hôm nay — ngoại lệ) · «Không cho» (báo con ngay). Ghi: POST yeu-cau/:id/dong-y {phanLoai, phamVi} / tu-choi {lyDo}.
// Lời xin cai_app / mo_web từ màn chặn của con (S2: con tự xin, lý do không bắt buộc). Lời xin thêm giờ / ngoại lệ vẫn ở yeu-cau/[id] (M2).
import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type GiaDinh, type YeuCau } from "@/lib/api";
import { ManKetQua, NutQuyet, OIcon, RobNoi, icCuaApp, lucNgan, veHoac } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { BaoLoi, ChoTai, Chu, M, Man, useLam, useTai } from "@/lib/ui";

type KetQua = { loai: "cho" | "hom_nay" | "khong"; luc: Date };

export default function YeuCauWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cd, g, xem] = await Promise.all([bm.goi<{ yeuCau: YeuCau[] }>("cho-duyet"), bm.goi<GiaDinh>("gia-dinh"), laChiXem()]);
    const y = cd.yeuCau.find((x) => x.id === id) ?? null;
    return { y, con: y ? g.con.find((c) => c.id === y.child_id) ?? null : null, xem };
  });
  const [kq, setKq] = useState<(KetQua & { y: YeuCau }) | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const hoan = useLam();
  const ve = () => veHoac("/app-web");
  if (kq) {
    const y = kq.y, ten = y.gia_tri ?? "app", tenCon = d?.con?.ten ?? y.ten_con;
    const gio = `${String(kq.luc.getHours()).padStart(2, "0")}:${String(kq.luc.getMinutes()).padStart(2, "0")}`;
    if (kq.loai === "khong") {
      return <ManKetQua tieu={`Đã không cho mở ${ten}`} ic="gui" tin={`Đã báo cho ${tenCon}`} phu={`«Ba Mẹ chưa cho mở lúc này» · ${gio}`} nut={{ chu: "Xong, về App & web", bam: ve }} />;
    }
    return (
      <ManKetQua tieu={`Đã cho ${tenCon} mở ${ten}`} ic="tin" tin={`Đã báo cho ${tenCon}`}
        phu={kq.loai === "cho" ? `Tính vào giờ chơi · từ ${gio}` : `Hôm nay, không tính giờ · từ ${gio}`} nut={{ chu: "Xong, về App & web", bam: ve }}
        hoan={{ chu: "Hoàn tác", dangChay: hoan.dangChay, bam: () => hoan.lam(async () => {
          await bm.goi("luat/xoa", { con: y.child_id, muc: y.gia_tri, neuLoai: kq.loai === "cho" ? "giai_tri" : "hoc" });
          ve();
        }) }} />
    );
  }
  if (!d) return <Man lui={{ chu: "" }} tieu="Con xin mở"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.y) return <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở"><ChoTai loi="Lời xin này đã được trả lời (hoặc đã hết hạn)." tai={ve} /></Man>;
  const y = d.y, ten = y.gia_tri ?? "app mới", tenCon = d.con?.ten ?? y.ten_con;
  const con = d.con, con_lai = con ? Math.max(0, con.tranNgay - con.phutChoi) : null;
  const dongY = (loai: "cho" | "hom_nay") => lam(async () => {
    await bm.goi(`yeu-cau/${y.id}/dong-y`, loai === "cho" ? { phanLoai: "giai_tri", phamVi: "vinh_vien" } : { phanLoai: "hoc", phamVi: "hom_nay" });
    setKq({ loai, luc: new Date(), y });
  });
  const khong = () => lam(async () => {
    await bm.goi(`yeu-cau/${y.id}/tu-choi`, { lyDo: "Ba Mẹ chưa cho mở lúc này" });
    setKq({ loai: "khong", luc: new Date(), y });
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 28, backgroundColor: M.the, ...KHOI.the }}>
        <OIcon ic={icCuaApp(ten)} co={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={20}>{ten}</Chu>
          <Chu kieu="dam" co={12.5} mau={M.chu3}>{`${tenCon} xin lúc ${lucNgan(y.created_at)}${y.phut ? ` · ${y.phut} phút` : ""}`}</Chu>
        </View>
      </View>
      <RobNoi co={84}>
        <Chu kieu="dam" co={12} mau={M.chu3}>{`${tenCon} nhắn`}</Chu>
        <Chu kieu="dam" co={15}>{y.ly_do ? `«${y.ly_do}»` : `${tenCon} không ghi lý do.`}</Chu>
      </RobNoi>
      {d.xem ? <Chu co={14} mau={M.chu3}>Người trông giúp xem được lời xin; Ba Mẹ trả lời.</Chu> : (
        <View style={{ gap: 10 }}>
          <NutQuyet loai="x" ic="tick" chu={con_lai !== null ? `Cho mở, tính vào ${con_lai} phút còn lại` : "Cho mở, tính vào giờ chơi"}
            phu={con ? `Hôm nay đã chơi ${con.phutChoi}/${con.tranNgay} phút` : undefined} dangChay={dangChay} bam={() => dongY("cho")} />
          <NutQuyet loai="c" ic="dong_ho_cat" chu="Cho dùng hôm nay, không tính giờ" phu={con_lai !== null ? `Không trừ vào ${con_lai} phút còn lại` : undefined}
            dangChay={dangChay} bam={() => dongY("hom_nay")} />
          <NutQuyet loai="d" ic="x" chu="Không cho" phu={`Báo cho ${tenCon} ngay`} dangChay={dangChay} bam={khong} />
        </View>
      )}
      <BaoLoi loi={loiLam ?? hoan.loi} />
      {con ? <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ textAlign: "center" }}>{`Hôm nay ${tenCon} đã chơi ${con.phutChoi}/${con.tranNgay} phút`}</Chu> : null}
    </Man>
  );
}
