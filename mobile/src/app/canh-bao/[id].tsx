// bm-canh-bao-may: chi tiết một cảnh báo an toàn (vd giờ máy bị đổi) — đã làm gì, Ba Mẹ quyết bước tiếp (mở khoá sau khi nói chuyện,
// hoặc trừ điểm có lý do). AiiGrow không đọc nội dung của Con.
// Tiêu đề cảnh ngắn theo loại (thiết kế: «Giờ máy của Bill bị đổi») — câu đầy đủ của máy chủ nằm ở dòng phụ / thẻ dưới, để bong bóng
// không dài tới chỗ Rob đứng.
import { router, useLocalSearchParams } from "expo-router";
import { bm, type CanhBao, type GiaDinh } from "@/lib/api";
import { Bao, Canh, ChoTai, Chu, gioPhut, M, Man, Nut, The, TickDong, useLam, useTai, BaoLoi } from "@/lib/ui";

const TIEU: Record<string, (ten: string) => string> = {
  lech_gio: (t) => `Giờ máy của ${t} bị đổi`, ngung_chay: (t) => `AiiGrow trên máy ${t} bị tắt`, go_cai_dat: (t) => `Có người gỡ AiiGrow của ${t}`,
  tai_khoan_la: (t) => `Tài khoản lạ trên máy ${t}`, offline_lau: (t) => `Máy của ${t} offline lâu`, safe_mode: (t) => `Máy của ${t} vào Safe Mode`,
  bang_chung_trung: (t) => `Ảnh của ${t} giống ảnh cũ`,
};

export default function ChiTietCanhBao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ds, g] = await Promise.all([bm.goi<{ ds: CanhBao[] }>("canh-bao"), bm.goi<GiaDinh>("gia-dinh")]);
    const x = ds.ds.find((y) => y.id === id);
    return x ? { ...x, ten: g.con.find((c) => c.id === x.child_id)?.ten ?? "Con" } : null;
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Cảnh báo" }} tieu="Cảnh báo"><ChoTai loi={loi ?? (d === null ? null : undefined)} matMang={matMang} tai={tai} /></Man>;
  const lech = d.loai === "lech_gio" ? Math.abs(Number(d.chi_tiet.lechGiay ?? 0)) : 0;
  const daDoc = () => lam(async () => { await bm.goi(`canh-bao/${id}/doc`, {}); router.back(); });
  const tieu = TIEU[d.loai]?.(d.ten) ?? `Cảnh báo về ${d.ten}`;
  const loiCanh = d.loai === "lech_gio" ? `Lệch ${Math.round(lech / 60)} phút lúc ${gioPhut(d.created_at)}. Trò chơi đã tự khoá.` : gioPhut(d.created_at);
  return (
    <Man lui={{ chu: "Cảnh báo" }} tieu="Cảnh báo" day={<>
      <BaoLoi loi={loiLam} />
      {d.child_id ? <Nut chu={`Mở khoá sau khi nói chuyện với ${d.ten}`} rong dangChay={dangChay} bam={() => lam(async () => {
        await bm.goi(`con/${d.child_id}/khoa`, { khoa: false });
        await bm.goi(`canh-bao/${id}/doc`, {});
        router.back();
      })} /> : null}
      {d.child_id ? <Nut chu="Trừ điểm · ghi lý do" loai="vien" rong bam={() => router.push(`/vi/${d.child_id}`)} /> : null}
      <Nut chu="Đã xem" loai="ma" rong bam={daDoc} />
    </>}>
      <Canh lv="trong-loi" mau="hong" thap tieu={tieu} loi={loiCanh} />
      <The dem style={{ gap: 2 }}>
        <Chu co={14} mau={M.chu2}>{d.noi_dung}</Chu>
        {d.loai === "lech_gio" ? (
          <>
            <TickDong trang="x" chu={`${gioPhut(d.created_at)} · giờ máy lệch ${Math.round(lech / 60)} phút so với máy chủ`} />
            <TickDong chu="AiiGrow khoá trò chơi, chỉ còn app học" />
            <TickDong chu={`${d.ten} thấy «Giờ máy không đúng, hãy nhờ Ba Mẹ»`} />
          </>
        ) : null}
      </The>
      <Bao loai="lam" ic="khien" tieu={`AiiGrow không đọc nội dung của ${d.ten}`} loi="Chỉ biết giờ máy, sự kiện trên máy — không xem tin nhắn hay trang web." />
    </Man>
  );
}
