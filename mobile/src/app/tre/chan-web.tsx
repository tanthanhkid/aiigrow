// con-chan-web «Trang chưa được phép» (BRD 6.4, FR-05.01, thiết kế 05/11 con-bi-chan): giải thích ngắn + «Xin Ba Mẹ duyệt» ≤ 2 chạm
// (1 chạm mở form đã điền sẵn link, 1 chạm gửi — lời nhắn không bắt buộc). Teen: nói rõ quy tắc nào (BRD 8.2) thay vì chỉ «Bị chặn».
import { router, useLocalSearchParams } from "expo-router";
import { CanhGiua, Nut } from "@/lib/ui";
import { ManTre, useTre } from "@/lib/ui-tre";

export default function ChanWeb() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const { nhom } = useTre();
  const trang = (url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "Trang này";
  const teen = nhom === "teen";
  return (
    <ManTre>
      <CanhGiua lv="trong-loi" tieu={teen ? "Trang này chưa được phép" : "Trang này Rob chưa biết"}
        loi={teen ? `Quy tắc: trang web mới cần Ba Mẹ cho phép. ${trang} chưa có trong danh sách.` : `${trang} chưa có trong danh sách. Xin Ba Mẹ mở cho nhé?`}>
        <Nut chu="Xin Ba Mẹ duyệt" ic="tin" bam={() => router.replace(`/tre/xin-phep?loai=mo_web&gia=${encodeURIComponent(trang)}&tu=chan-web`)} />
        <Nut chu="Quay lại" loai="ma" bam={() => router.replace("/tre/nha")} />
      </CanhGiua>
    </ManTre>
  );
}
