// bm-tin-khen: lời khen ngắn gửi Con (FR-08.02) — không phải chat tự do; Con trả lời bằng biểu tượng cảm xúc. Chỉ gia đình xem.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm, type ConChiTiet } from "@/lib/api";
import { BaoLoi, baoKhiVe, Canh, ChoTai, Chips, Chu, M, Man, Nut, ONhap, useLam, useTai } from "@/lib/ui";

const MAU = ["Ba Mẹ tự hào về con!", "Cảm ơn con đã giúp nhà mình", "Đọc sách giỏi quá", "Mai cố tiếp nhé"];

export default function LoiKhen() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ConChiTiet>(`con/${con}`));
  const [nd, setNd] = useState(MAU[0]);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Trang chủ" }} tieu="Lời khen"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const gui = () => lam(async () => { await bm.goi(`con/${con}/loi-khen`, { noiDung: nd }); baoKhiVe(`Đã gửi lời khen cho ${d.ten}`); router.back(); });
  return (
    <Man lui={{ chu: "Trang chủ" }} tieu="Lời khen" day={<><BaoLoi loi={loiLam} /><Nut chu={`Gửi cho ${d.ten}`} ic="gui" rong dangChay={dangChay} tat={!nd.trim()} bam={gui} /></>}>
      <Canh lv="sao" thap tieu={`Khen ${d.ten} một câu?`} loi="Con thấy ngay trên máy, kèm hiệu ứng ăn mừng." />
      <Chips ds={MAU.map((x) => ({ gia: x, chu: x }))} chon={[nd]} doi={setNd} />
      <ONhap nhan="Lời khen" value={nd} onChangeText={setNd} multiline maxLength={200} style={{ minHeight: 80, textAlignVertical: "top", paddingTop: 12 }} />
      <Chu co={13} mau={M.chu3}>{`Tin ngắn, không phải chat tự do. ${d.ten} trả lời bằng biểu tượng cảm xúc. Chỉ gia đình xem.`}</Chu>
    </Man>
  );
}
