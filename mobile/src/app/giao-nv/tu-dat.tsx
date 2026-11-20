// «Ba Mẹ tự thêm» — màn dự phòng khi mở thẳng bằng đường dẫn; bình thường là bảng trượt trên «Giao việc» (bàn 17/11 them-6pjz1stu@v4,
// app/giao-nv/index.tsx). Thân form ở lib/tu-them-viec.tsx (#302: «+ Khác», tự nhập số sao).
import { router, useLocalSearchParams } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { baoKhiVe, ChoTai, Man, useTai } from "@/lib/ui";
import { FormTuThem } from "@/lib/tu-them-viec";

export default function BaMeTuThem() {
  const p = useLocalSearchParams<{ con?: string; muc?: string; sau?: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  const tieu = "Thêm việc riêng";
  if (!d) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  return (
    <Man lui={{ chu: "" }} tieu={tieu}>
      <FormTuThem dsCon={d.con} con={p.con} mucSan={p.muc} xong={(ten, tenCon) => { baoKhiVe(`Đã thêm «${ten}»${tenCon ? ` cho ${tenCon}` : ""}`); for (let i = 0; i < (p.sau === "2" ? 2 : 1); i++) router.back(); }} nhanNut="Thêm việc" />
    </Man>
  );
}
