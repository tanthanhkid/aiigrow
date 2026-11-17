// them-slv33bgc @v5 «Sửa trên iPad của con» (thiết kế bm-may-con, mở từ «Sửa <máy> trong N bước» của bm2-may-m2): «Cầm <máy> lên, làm theo N bước»,
// mỗi bước một thẻ nổi — ô hình 3D lõm 72 (bánh răng / đồng hồ cát / khoá) có số ngọc góc, tên bước 15/800 + cách làm. Các bước là việc bảo vệ còn thiếu
// máy chủ trả (tuan-thu › baoVeThieu: ten + cach). «Đã làm xong, kiểm tra lại» ⇒ «Máy của con» (bm2-may-ds); «Làm không được? Hỏi AiiGrow» ⇒ them-zxu4yvp3.
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type ChiTietTuanThu } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { DauHaiDong, nganTen } from "@/lib/may-nhieu-con";
import { baoKhiVe, ChoTai, Chu, Icon3D, M, Man, Nut, useTai } from "@/lib/ui";

const HINH = ["banhrang", "dong_ho_cat", "khoa"] as const;

export default function SuaMay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`));
  const lui = () => (router.canGoBack() ? router.back() : router.replace({ pathname: "/may/[id]", params: { id } }));
  const tenNgan = d ? nganTen(d.ten).replace(/ của .*$/, "") : "máy";
  if (!d) return <Man dau={<DauHaiDong tieu="Sửa trên máy của con" lui={lui} />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const buoc = d.baoVeThieu ?? [];
  return (
    <Man dau={<DauHaiDong tieu={`Sửa trên ${tenNgan} của con`} lui={lui} />}>
      <Chu kieu="rat" co={14} mau="#3a403d" style={{ marginHorizontal: 6 }}>
        {buoc.length ? `Cầm ${tenNgan} lên, làm theo ${buoc.length} bước` : `${tenNgan} không còn việc nào cần sửa`}
      </Chu>
      <View style={{ gap: 12 }}>
        {buoc.map((x, k) => (
          <View key={x.ma} style={[{ flexDirection: "row", gap: 14, alignItems: "center", padding: 12, borderRadius: 26, backgroundColor: "#f7f6f3" }, KHOI.the]}>
            <View style={{ width: 92, height: 92, borderRadius: 22, backgroundColor: "#ecebe7", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}>
              <Icon3D ten={HINH[k % 3]} co={56} />
              <View style={{ position: "absolute", left: -6, top: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center" }}>
                <Chu kieu="rat" co={14} mau="#fff">{String(k + 1)}</Chu>
              </View>
            </View>
            <View style={{ flex: 1, gap: 3 }}><Chu kieu="rat" co={15.5}>{x.ten}</Chu><Chu kieu="dam" co={12.5} mau="#565c59" style={{ lineHeight: 18 }}>{x.cach}</Chu></View>
          </View>
        ))}
      </View>
      {/* «Máy của con» tự tải lại khi hiện lại (useTai) ⇒ thấy trạng thái mới; báo Grow kiểm lại ở lần máy báo về */}
      <Nut chu="Đã làm xong, kiểm tra lại" rong bam={() => { baoKhiVe("Grow kiểm lại ở lần máy báo về kế tiếp (thường dưới 3 phút)"); router.dismissTo("/may"); }} />
      <Nut chu="Làm không được? Hỏi AiiGrow" loai="ma" rong bam={() => router.push("/hoi-aiigrow")} />
    </Man>
  );
}
