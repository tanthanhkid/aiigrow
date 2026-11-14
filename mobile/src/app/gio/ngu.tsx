// «Giờ ngủ của <Con>» (thiết kế chốt 14/11, bm-gio-ho-so/02): máy khoá lúc / mở lại lúc, lưu = POST con/:id/gio-choi {gioNgu}.
// Giờ ngủ ở máy chủ áp MỌI ngày (lich.ngu không có ngày) ⇒ không có chip «Áp dụng các ngày» của thiết kế (lệch ghi trong PR M2). 14/11 vòng 2: hai ô
// khoá / mở + bánh xe giờ như thiết kế (thiết kế vẽ dạng bảng trượt trên Giờ chơi — giữ màn riêng để lối vào từ Hồ sơ / Báo cáo không đổi).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm, type ConChiTiet } from "@/lib/api";
import { Pressable, View } from "react-native";
import { BanhXeGio } from "@/lib/lan-dau";
import { BONG, KHOI } from "@/lib/clay";
import { CAU_TRONG_GIUP, gioGon, quyenToi, type GioChoi } from "@/lib/hang-ngay";
import { BaoLoi, baoKhiVe, ChoTai, Chu, M, Man, Nut, useLam, useTai } from "@/lib/ui";

export default function GioNgu() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, c, q] = await Promise.all([bm.goi<GioChoi>(`con/${con}/gio-choi`), bm.goi<ConChiTiet>(`con/${con}`), quyenToi()]);
    return { ngu: g.gioNgu, ten: c.ten, xem: q === "trong_giup" };
  });
  const [tu, setTu] = useState<string | null>(null);
  const [den, setDen] = useState<string | null>(null);
  const [dang, setDang] = useState<"tu" | "den">("tu");
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Giờ chơi" }} tieu="Giờ ngủ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const a = tu ?? d.ngu.tu, b = den ?? d.ngu.den;
  const luu = () => lam(async () => {
    await bm.goi(`con/${con}/gio-choi`, { gioNgu: { tu: a, den: b } });
    baoKhiVe(`Đã lưu giờ ngủ ${gioGon(a)} – ${gioGon(b)} cho ${d.ten}`);
    router.back();
  }, { hangDoi: true });
  return (
    <Man lui={{ chu: "Giờ chơi" }} tieu={`Giờ ngủ của ${d.ten}`} day={d.xem ? <Chu co={13.5} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu giờ ngủ ${gioGon(a)} – ${gioGon(b)}`} rong dangChay={dangChay} tat={a === b} bam={luu} />
    </>}>
      {/* thiết kế 02: hai ô «Máy khoá lúc 21:30» | «Mở lại lúc 6:30» trong rãnh lõm (ô đang sửa nổi trắng) + bánh xe giờ */}
      <View style={[{ gap: 10, padding: 12, borderRadius: 28, backgroundColor: "#f7f6f3" }, KHOI.the]}>
        <View style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 22, backgroundColor: "#ecebe7", boxShadow: BONG.lom }} accessibilityRole="tablist">
          {([["tu", "Máy khoá lúc", a], ["den", "Mở lại lúc", b]] as const).map(([k, nhan, g]) => {
            const on = k === dang;
            return (
              <Pressable key={k} onPress={() => setDang(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${nhan} ${gioGon(g)}`}
                style={[{ flex: 1, minHeight: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" }, on && { backgroundColor: "#fff", ...KHOI.nho }]}>
                <Chu kieu="dam7" co={12} mau="#565c59">{nhan}</Chu>
                <Chu kieu="rat" co={20} so mau={on ? M.chinhInk : M.chu}>{gioGon(g)}</Chu>
              </Pressable>
            );
          })}
        </View>
        {d.xem ? null : <BanhXeGio key={dang} gio={dang === "tu" ? a : b} doi={dang === "tu" ? setTu : setDen} />}
      </View>
      <Chu kieu="dam" co={13.5} mau={M.chu2} style={{ marginHorizontal: 6 }}>Tới giờ ngủ máy tự khoá · con chỉ xin Ba Mẹ mở ngoại lệ được. Áp cho mọi ngày trong tuần.</Chu>
    </Man>
  );
}
