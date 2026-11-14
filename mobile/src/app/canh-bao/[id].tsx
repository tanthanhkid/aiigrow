// Chi tiết một cảnh báo (thiết kế chốt 05/11): trang bị chặn (bm-hang-ngay/34 — «<Con> vừa mở một trang web người lớn · ✓ Grow đã chặn», lúc nào,
// trên máy nào, «Nói chuyện với con», «Xem lịch sử <Con> dùng máy», «Đã biết»), giờ máy bị đổi (bm-duyet/05 — «Chuyện gì đã xảy ra» + Ba Mẹ chọn mở khoá
// sau khi nói chuyện hoặc để khoá). Bỏ «Trừ điểm» (L1). AiiGrow không đọc nội dung của con.
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type CanhBao, type GiaDinh } from "@/lib/api";
import { HangViec, quyenToi } from "@/lib/hang-ngay";
import { Bao, BaoLoi, Canh, ChoTai, Chu, gioPhut, M, Man, Nut, The, TickDong, useLam, useTai } from "@/lib/ui";

const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const ngayDai = (iso: string) => { const t = new Date(iso); return `${THU[t.getDay()]}, ${t.getDate()}/${t.getMonth() + 1}`; };
const homNay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const TIEU: Record<string, (ten: string) => string> = {
  lech_gio: (t) => `Giờ trên máy của ${t} bị đổi`, ngung_chay: (t) => `AiiGrow trên máy ${t} bị tắt`, go_may: (t) => `Có người gỡ AiiGrow trên máy của ${t}`,
  may_thu_go: (t) => `Có người thử gỡ AiiGrow trên máy của ${t}`, tai_khoan_la: (t) => `Tài khoản lạ trên máy ${t}`, offline_lau: (t) => `Máy của ${t} không báo về lâu`,
  may_go_chan_hosts: (t) => `Đã gỡ chặn web ngoài AiiGrow trên máy của ${t}`, may_chuyen_nha: (t) => `Máy của ${t} đã ghép sang tài khoản khác`, may_ngoai_vong: (t) => `Máy của ${t} chưa được bảo vệ đủ`, safe_mode: (t) => `Máy của ${t} vào Safe Mode`, bang_chung_trung: (t) => `Ảnh của ${t} giống ảnh cũ`,
};
/** Cảnh báo về web bị chặn (loại có «web» — người lớn, cờ bạc, luôn chặn). */
const laWeb = (x: CanhBao) => /web|nguoi_lon|co_bac/.test(x.loai);

export default function ChiTietCanhBao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ds, g, q] = await Promise.all([bm.goi<{ ds: CanhBao[] }>("canh-bao"), bm.goi<GiaDinh>("gia-dinh"), quyenToi()]);
    const x = ds.ds.find((y) => y.id === id);
    return { x: x ? { ...x, ten: g.con.find((c) => c.id === x.child_id)?.ten ?? "Con", xem: q === "trong_giup" } : null };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d?.x) return <Man lui={{ chu: "Cảnh báo" }} tieu="Cảnh báo"><ChoTai loi={loi ?? (d ? "Cảnh báo này không còn — có thể Ba Mẹ khác đã xem." : null)} matMang={matMang} tai={tai} /></Man>;
  const x = d.x;
  const daBiet = () => lam(async () => { await bm.goi(`canh-bao/${id}/doc`, {}); router.back(); });
  const may = typeof x.chi_tiet.may === "string" ? x.chi_tiet.may : typeof x.chi_tiet.tenMay === "string" ? x.chi_tiet.tenMay : null;
  const mayId = typeof x.chi_tiet.mayId === "string" ? x.chi_tiet.mayId : typeof x.chi_tiet.may_id === "string" ? x.chi_tiet.may_id : null;
  const lech = x.loai === "lech_gio" ? Math.round(Math.abs(Number(x.chi_tiet.lechGiay ?? 0)) / 60) : 0;
  const tieu = laWeb(x) ? `${x.ten} vừa mở một trang web bị chặn` : TIEU[x.loai]?.(x.ten) ?? `Cảnh báo về ${x.ten}`;
  const luc = `Lúc ${gioPhut(x.created_at).slice(-5)} ${homNay(x.created_at) ? "hôm nay" : ""}`.trim();
  return (
    <Man lui={{ chu: "Cảnh báo" }} tieu="Cảnh báo" day={<>
      <BaoLoi loi={loiLam} />
      {x.loai === "lech_gio" && x.child_id && !x.xem ? (
        <Nut chu="Đã nói chuyện · mở khoá trò chơi" rong dangChay={dangChay} bam={() => lam(async () => {
          await bm.goi(`con/${x.child_id}/khoa`, { khoa: false });
          await bm.goi(`canh-bao/${id}/doc`, {});
          router.back();
        })} />
      ) : x.child_id ? <Nut chu={`Xem lịch sử ${x.ten} dùng máy`} rong bam={() => router.push(`/man-hinh/${x.child_id}` as never)} /> : null}
      <Nut chu={x.loai === "lech_gio" ? "Để khoá, đã xem" : "Đã biết"} loai="vien" rong dangChay={dangChay} bam={daBiet} />
    </>}>
      <Canh lv="trong-loi" mau="hong" thap tieu={tieu} loi={laWeb(x) ? "✓ Grow đã chặn, con không xem được" : x.noi_dung} />
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="dongho" mau="lam" tieu={luc} phu={ngayDai(x.created_at)} />
        {may || mayId ? <HangViec ic="laptop" mau="xam" tieu={`Trên ${may ?? "máy"} của ${x.ten}`} phu={laWeb(x) ? "Mở từ trình duyệt" : undefined}
          bam={mayId ? () => router.push(`/may/${mayId}` as never) : undefined} /> : null}
      </The>
      {x.loai === "lech_gio" ? (
        <The dem style={{ gap: 2 }}>
          <Chu kieu="rat" co={15.5}>Chuyện gì đã xảy ra</Chu>
          <TickDong trang="x" chu={`Giờ máy bị chỉnh lệch ${lech} phút`} phu="Đổi giờ có thể làm giờ chơi bị tính sai" />
          <TickDong chu="App chơi đã khoá" phu="App học vẫn mở" />
          <TickDong chu={`${x.ten} thấy lời nhắn «Giờ máy chưa đúng, con nhờ Ba Mẹ chỉnh lại nhé»`} />
          <TickDong chu="Giờ chơi vẫn tính theo giờ thật" phu="Không bị cộng thêm" />
        </The>
      ) : laWeb(x) ? null : <The dem><Chu co={14.5} mau={M.chu2}>{x.noi_dung}</Chu></The>}
      <View style={{ gap: 4 }}>
        <Bao loai="lam" ic="tin" tieu="Nói chuyện với con"
          loi={laWeb(x) ? "Hỏi nhẹ nhàng: «Con thấy trang đó ở đâu?». Đừng la mắng, để con tin và kể lại lần sau."
            : "Có thể con chỉnh nhầm hoặc máy mất pin. Hỏi nhẹ nhàng trước khi quyết."} />
      </View>
    </Man>
  );
}
