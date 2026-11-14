// «Con xin mở» app / web (thiết kế chốt 14/11 bm-ung-dung/13 bm2-yeu-cau-web → 12 them-hppe9qh6 «Đã không cho»): thẻ app/web + lúc xin + máy + «Chờ N′»,
// Grow chuyển lời nhắn của con, «Ba Mẹ trả lời» ba lựa chọn — «Cho N phút <app>» (Không tính giờ: luật hoc, chỉ N phút — phamVi lan_nay + phut;
// lời xin không ghi phút ⇒ «Cho dùng hôm nay») · «Cho mở, tính giờ» (Trừ vào giờ chơi: luật giai_tri, mãi) · «Không cho» (Grow báo con ngay).
// Không ghi còn bao nhiêu phút (N3). «Không cho» ⇒ màn kết quả có «Hoàn tác, xem lại lời xin» (POST yeu-cau/:id/mo-lai, trong 10 phút).
// Người trông giúp cũng quyết được (quyen.ts › trongGiupDuoc). Lời xin thêm giờ / ngoại lệ vẫn ở yeu-cau/[id].
import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type ConChiTiet, type YeuCau } from "@/lib/api";
import { ManKetQua, NutQuyet, OIcon, RobNoi, hoanLuat, icCuaApp, lucNgan, veHoac, type LuatApp, type LuatTruoc } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { BaoLoi, ChoTai, Chu, M, Man, Nut, Rob, gioPhut, useLam, useTai } from "@/lib/ui";

type Yc = YeuCau & { device_id?: string | null };
/** `truoc`: luật riêng của con cho mục này TRƯỚC khi duyệt (duyệt ghi đè nó) — Hoàn tác đặt lại đúng luật này. */
type KetQua = { loai: "phut" | "hom_nay" | "tinh_gio" | "khong"; luc: Date; truoc?: LuatTruoc };

export default function YeuCauWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cd, xem] = await Promise.all([bm.goi<{ yeuCau: Yc[] }>("cho-duyet"), laChiXem()]);
    const y = cd.yeuCau.find((x) => x.id === id) ?? null;
    const ct = y ? await bm.goi<ConChiTiet>(`con/${y.child_id}`).catch(() => null) : null;
    return { y, ct, xem };
  });
  const [kq, setKq] = useState<(KetQua & { y: Yc }) | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const hoan = useLam();
  const ve = () => veHoac("/chan");
  const tenMay = (y: Yc) => (y.device_id ? d?.ct?.may.find((m) => m.id === y.device_id)?.ten ?? null : null);

  if (kq) {
    const y = kq.y, ten = y.gia_tri ?? "app", tenCon = d?.ct?.ten ?? y.ten_con, may = tenMay(y);
    const gio = gioPhut(kq.luc);
    if (kq.loai === "khong") {
      return (
        <Man lui={{ chu: "", bam: ve }} day={<>
          <BaoLoi loi={hoan.loi} />
          <Nut chu="Xong" rong bam={ve} />
          {d?.xem ? null : <Nut chu="Hoàn tác, xem lại lời xin" loai="vien" rong dangChay={hoan.dangChay} bam={() => hoan.lam(async () => {
            await bm.goi(`yeu-cau/${y.id}/mo-lai`, {});
            setKq(null);
            await tai();
          })} />}
        </>}>
          <View style={{ alignItems: "center", paddingTop: 24, gap: 6 }}>
            <Rob ten="xong" co={200} />
            <Chu kieu="rat" co={24} style={{ textAlign: "center", letterSpacing: -0.4 }}>{`Đã không cho mở ${ten}`}</Chu>
          </View>
          <View style={{ marginTop: 12, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>
            <DongTin ic="gui" tieu={`Đã báo ${tenCon}${may ? ` trên ${may}` : ""}`} phu={`«Ba Mẹ chưa cho mở lúc này» · ${gio}`} dau />
            <DongTin ic="khoa" tieu={`${ten} vẫn bị chặn`} phu={`Trên mọi máy của ${tenCon}`} />
          </View>
        </Man>
      );
    }
    const phu = kq.loai === "phut" ? `${y.phut} phút, không trừ giờ chơi · từ ${gio}` : kq.loai === "hom_nay" ? `Hôm nay, không trừ giờ chơi · từ ${gio}` : `Tính giờ, trừ vào giờ chơi · từ ${gio}`;
    return (
      <ManKetQua tieu={`Đã cho ${tenCon} mở ${ten}`} ic="tin" tin={`Đã báo cho ${tenCon}${may ? ` trên ${may}` : ""}`} phu={phu} nut={{ chu: "Xong", bam: ve }} loi={hoan.loi}
        hoan={d?.xem || !y.gia_tri ? undefined : { chu: "Hoàn tác", dangChay: hoan.dangChay, bam: () => hoan.lam(async () => {
          await hoanLuat(y.child_id, y.gia_tri!, kq.truoc ?? null, kq.loai === "tinh_gio" ? "giai_tri" : "hoc");
          ve();
        }) }} />
    );
  }
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.y) return <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở"><ChoTai loi="Lời xin này đã được trả lời (hoặc đã hết hạn)." tai={ve} /></Man>;
  const y = d.y, ten = y.gia_tri ?? "App mới", tenCon = d.ct?.ten ?? y.ten_con, may = tenMay(y);
  const cho = Math.max(0, Math.round((Date.now() - new Date(y.created_at).getTime()) / 60000));
  const dongY = (loai: "phut" | "hom_nay" | "tinh_gio") => lam(async () => {
    const cu = (await bm.goi<{ ds: (LuatApp & { het?: string | null })[] }>("luat").catch(() => null))?.ds.find((l) => l.child_id === y.child_id && l.muc === y.gia_tri);
    const truoc: LuatTruoc = cu ? { con: y.child_id, muc: cu.muc, ten: cu.ten, loai: cu.loai, nhom: cu.nhom, het: cu.het ?? null } : null;
    await bm.goi(`yeu-cau/${y.id}/dong-y`, loai === "tinh_gio" ? { phanLoai: "giai_tri", phamVi: "vinh_vien" }
      : loai === "phut" ? { phanLoai: "hoc", phamVi: "lan_nay", phut: y.phut } : { phanLoai: "hoc", phamVi: "hom_nay" });
    setKq({ loai, luc: new Date(), y, truoc });
  });
  const khong = () => lam(async () => {
    await bm.goi(`yeu-cau/${y.id}/tu-choi`, { lyDo: "Ba Mẹ chưa cho mở lúc này" });
    setKq({ loai: "khong", luc: new Date(), y });
  });
  const coPhut = !!y.phut && y.phut >= 5 && y.phut <= 240;
  return (
    <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 28, backgroundColor: M.the, ...KHOI.the }}>
        <OIcon ic={y.loai === "mo_web" ? "web" : icCuaApp(ten)} co={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={20} dong={1}>{ten}</Chu>
          <Chu kieu="dam" co={12.5} mau={M.chu3}>{[`${tenCon} xin${y.phut ? ` ${y.phut} phút` : ""}`, lucNgan(y.created_at), may].filter(Boolean).join(" · ")}</Chu>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: M.diemSoft }}>
          <Chu kieu="rat" co={12.5} mau={M.diemInk}>{`Chờ ${cho}′`}</Chu>
        </View>
      </View>
      <RobNoi co={84}>
        <Chu kieu="dam" co={12} mau={M.chu3}>{`${tenCon} nhắn`}</Chu>
        <Chu kieu="dam" co={15}>{y.ly_do ? `«${y.ly_do}»` : `${tenCon} không ghi lý do.`}</Chu>
      </RobNoi>
      {d.xem ? null : (
        <>
          <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6, marginTop: 4 }}>Ba Mẹ trả lời</Chu>
          <View style={{ gap: 10 }}>
            <NutQuyet loai="x" ic="dong_ho_cat" chu={coPhut ? `Cho ${y.phut} phút ${ten}` : "Cho dùng hôm nay"} phu="Không tính giờ" dangChay={dangChay}
              bam={() => dongY(coPhut ? "phut" : "hom_nay")} />
            <NutQuyet loai="c" ic="tick" chu="Cho mở, tính giờ" phu="Trừ vào giờ chơi" dangChay={dangChay} bam={() => dongY("tinh_gio")} />
            <NutQuyet loai="d" ic="x" chu="Không cho" phu={`Grow báo cho ${tenCon} ngay`} dangChay={dangChay} bam={khong} />
          </View>
        </>
      )}
      <BaoLoi loi={loiLam} />
    </Man>
  );
}

function DongTin({ ic, tieu, phu, dau }: { ic: "gui" | "khoa"; tieu: string; phu: string; dau?: boolean }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 8 }, !dau && { borderTopWidth: 1.5, borderTopColor: "rgba(0,0,0,0.06)" }]}>
      <OIcon ic={ic} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15}>{tieu}</Chu>
        <Chu kieu="dam" co={12.5} mau={M.chu3}>{phu}</Chu>
      </View>
    </View>
  );
}
