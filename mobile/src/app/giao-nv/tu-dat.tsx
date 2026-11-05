// «Tự đặt việc» (thiết kế chốt 05/11 bm-hang-ngay/42 + L9 «Thêm việc riêng»): tên + gợi ý, hình, giao con nào (nhiều Con ⇒ mỗi Con một việc),
// số sao, lặp lại, giờ nhắc, cách báo xong, Ba Mẹ duyệt hay tự cộng sao ⇒ POST nhiem-vu {…, giao_cho: id[]}.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { BaoLoi, baoKhiVe, ChoTai, Man, Nut, useLam, useTai } from "@/lib/ui";
import { FORM_TRONG, NhapViec, tenHopLe, thanViec, type FormViec } from "@/lib/form-viec";

export default function TuDatViec() {
  const { con: conXem } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  const [f, setF] = useState<FormViec | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Quay lại" }} tieu="Tự đặt việc"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const form = f ?? { ...FORM_TRONG, giaoCho: [d.con.find((c) => c.id === conXem)?.id ?? d.con[0]?.id].filter(Boolean) as string[] };
  const ten = form.ten.trim() || "việc mới";
  const them = () => lam(async () => {
    await bm.goi("nhiem-vu", { ...thanViec(form), giao_cho: form.giaoCho });
    const tenCon = d.con.filter((c) => form.giaoCho.includes(c.id)).map((c) => c.ten).join(", ");
    baoKhiVe(`Đã thêm việc «${form.ten.trim()}»${tenCon ? ` cho ${tenCon}` : ""}`);
    router.back();
  });
  return (
    <Man lui={{ chu: "Quay lại" }} tieu="Tự đặt việc"
      day={<><BaoLoi loi={loiLam} /><Nut chu={`Thêm việc «${ten}»`} rong dangChay={dangChay} tat={!tenHopLe(form.ten) || !form.giaoCho.length} bam={them} /></>}>
      <NhapViec f={form} doi={setF} con={d.con} />
    </Man>
  );
}
