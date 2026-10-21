// bm-canh-bao-may: chi tiết một cảnh báo an toàn (vd giờ máy bị đổi) — đã làm gì, Ba Mẹ quyết bước tiếp (mở khoá sau khi nói chuyện,
// hoặc trừ điểm có lý do). AiiGrow không đọc nội dung của Con.
import { router, useLocalSearchParams } from "expo-router";
import { bm, type CanhBao } from "@/lib/api";
import { Bao, Canh, ChoTai, gioPhut, Man, Nut, The, TickDong, useLam, useTai, BaoLoi } from "@/lib/ui";

export default function ChiTietCanhBao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => (await bm.goi<{ ds: CanhBao[] }>("canh-bao")).ds.find((x) => x.id === id) ?? null);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Cảnh báo" }} tieu="Cảnh báo"><ChoTai loi={loi ?? (d === null ? null : undefined)} matMang={matMang} tai={tai} /></Man>;
  const lech = d.loai === "lech_gio" ? Math.abs(Number(d.chi_tiet.lechGiay ?? 0)) : 0;
  const daDoc = () => lam(async () => { await bm.goi(`canh-bao/${id}/doc`, {}); router.back(); });
  return (
    <Man lui={{ chu: "Cảnh báo" }} tieu="Cảnh báo" day={<>
      <BaoLoi loi={loiLam} />
      {d.child_id ? <Nut chu="Mở lại sau khi nói chuyện với Con" rong dangChay={dangChay} bam={() => lam(async () => {
        await bm.goi(`con/${d.child_id}/khoa`, { khoa: false });
        await bm.goi(`canh-bao/${id}/doc`, {});
        router.back();
      })} /> : null}
      {d.child_id ? <Nut chu="Trừ điểm · ghi lý do" loai="vien" rong bam={() => router.push(`/vi/${d.child_id}`)} /> : null}
      <Nut chu="Đã xem" loai="ma" rong bam={daDoc} />
    </>}>
      <Canh lv="trong-loi" mau="hong" tieu={d.noi_dung} loi={gioPhut(d.created_at)} />
      {d.loai === "lech_gio" ? (
        <The dem>
          <TickDong trang="x" chu={`Giờ máy lệch ${Math.round(lech / 60)} phút so với máy chủ`} />
          <TickDong chu="AiiGrow khoá trò chơi, chỉ còn app học" />
          <TickDong chu="Con thấy «Giờ máy không đúng, hãy nhờ Ba Mẹ»" />
        </The>
      ) : null}
      <Bao loai="lam" ic="khien" tieu="AiiGrow không đọc nội dung của Con" loi="Chỉ biết sự kiện trên máy — không xem tin nhắn hay trang web." />
    </Man>
  );
}
