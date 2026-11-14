// them-canktzlq «Xoá hồ sơ <Con>?» (thiết kế chốt 14/11, bm-gio-ho-so/07 — màn riêng, thay bảng trượt 05/11): «Xoá rồi không lấy lại được.»
// + 3 hậu quả (Gỡ Grow khỏi N máy · Mất N sao, cả quà đang chờ trao · Mất báo cáo và cài đặt), «Xoá hồ sơ X» / «Giữ lại».
// Máy chủ CHƯA có đường xoá hồ sơ Con ⇒ «Xoá hồ sơ X» mở chat «Hỏi AiiGrow» để AiiGrow xoá giúp (như 05/11) — câu mở trong PR.
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { CAU_TRONG_GIUP, quyenToi, type ConCt } from "@/lib/hang-ngay";
import { CanhGiua, ChoTai, Chu, M, Man, Nut, TickDong, useTai } from "@/lib/ui";

export default function XoaHoSo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [con, q] = await Promise.all([bm.goi<ConCt>(`con/${id}`), quyenToi()]);
    return { con, xem: q === "trong_giup" };
  });
  const ve = () => (router.canGoBack() ? router.back() : router.replace(`/ho-so/${id}` as never));
  if (!d) return <Man lui={{ chu: "Hồ sơ", ve: `/ho-so/${id}` }} tieu="Xoá hồ sơ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const c = d.con;
  const sao = c.sao ?? c.soDu;
  const tenMay = c.may.map((m) => m.ten.replace(/ của .*$/, ""));
  return (
    <Man lui={{ chu: "Hồ sơ", ve: `/ho-so/${id}` }} day={d.xem ? <Chu co={13.5} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : <>
      <Chu co={13} mau={M.chu3}>Để tránh xoá nhầm, AiiGrow xoá hồ sơ giúp Ba Mẹ qua chat «Hỏi AiiGrow».</Chu>
      <Nut chu={`Xoá hồ sơ ${c.ten}`} loai="huy" rong bam={() => router.push("/ho-tro")} />
      <Nut chu="Giữ lại" loai="ma" rong bam={ve} />
    </>}>
      <CanhGiua lv="nghi" tieu={`Xoá hồ sơ ${c.ten}?`} loi="Xoá rồi không lấy lại được." />
      <View style={{ paddingHorizontal: 8 }}>
        {c.may.length ? <TickDong trang="x" chu={`Gỡ Grow khỏi ${c.may.length} máy`} phu={`${tenMay.join(" và ")} của ${c.ten}`} /> : null}
        <TickDong trang="x" chu={`Mất ${sao} sao`} phu="Cả quà đang chờ trao" />
        <TickDong trang="x" chu="Mất báo cáo và cài đặt" phu="Nhiệm vụ, giờ chơi đã đặt" />
      </View>
    </Man>
  );
}
