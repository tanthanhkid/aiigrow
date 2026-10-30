// bm-ob-mau (bước 4/5) — biến thể appllama: mẫu nhiệm vụ + phần thưởng theo tuổi (Phụ lục C), danh sách inset-grouped, điểm số tabular.
// «Dùng mẫu này» GHI lên máy chủ ⇒ sang bước 5 bằng dismissAll + replace: lùi không quay lại để áp mẫu lần hai.
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { layTl } from "@/lib/thiet-lap";
import { useLam } from "@/lib/ui";
import { C, Ch, Hang, Khung, LoiTaiCho, Nhom, NutChinh, OIcon, TienDo, TieuDe } from "@/lib/ob";

const NV = {
  nhi: [["book.fill", "Đọc 1 cuốn truyện 30 trang", "Ảnh bìa + trang cuối, kể lại 3 câu", 10], ["fork.knife", "Rửa chén sau bữa ăn", "Ảnh bồn rửa · tối đa 3 lần/ngày", 10],
    ["graduationcap.fill", "Học 1 bài với AiiRob đạt", "Tự động cộng khi đạt ≥ 80%", 20], ["figure.jumprope", "Nhảy dây 10 phút", "Ảnh · 1 lần/ngày", 5]],
  teen: [["book.fill", "Đọc sách 50 trang", "Ảnh bìa + trang cuối + tóm tắt", 10], ["fork.knife", "Rửa chén sau bữa ăn", "Ảnh bồn rửa · tối đa 3 lần/ngày", 10],
    ["graduationcap.fill", "Học 1 bài với AiiRob đạt", "Tự động cộng khi đạt ≥ 80%", 20], ["figure.run", "Chạy bộ / đạp xe 30 phút", "Ảnh · 1 lần/ngày", 10]],
} as const;

const Diem = ({ chu, vang }: { chu: string; vang?: boolean }) => (
  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: vang ? C.diemNhat : C.lapNhat }}>
    <Ch k="footnote" so mau={vang ? C.diem : C.chu2} style={{ fontWeight: "600" }}>{chu}</Ch>
  </View>
);

export default function ObMau() {
  const tl = layTl();
  const nhom = tl.nhom ?? "nhi";
  const { lam, loi, dangChay } = useLam();
  const dung = () => lam(async () => {
    await bm.goi("nhiem-vu/mau", { nhom });
    await bm.goi("qua/mau", {});
    if (router.canDismiss()) router.dismissAll();
    router.replace("/thiet-lap/gio");
  });
  return (
    <Khung dau={<TienDo n={4} tong={5} />} day={<NutChinh chu="Dùng mẫu này" dangChay={dangChay} bam={dung} />}>
      <StatusBar style="auto" />
      <TieuDe tieu={nhom === "nhi" ? "Mẫu cho Con tiểu học" : "Mẫu cho Con tuổi teen"} loi={`${nhom === "nhi" ? 8 : 9} nhiệm vụ + 6 phần thưởng. Chỉnh điểm sau cũng được.`} />
      <Nhom tieu="Nhiệm vụ">
        {NV[nhom].map(([ic, t, p, d]) => <Hang key={t} trai={<OIcon ten={ic} />} tieu={t} phu={p} phai={<Diem vang chu={`+${d}`} />} />)}
      </Nhom>
      <Nhom tieu="Phần thưởng" chuThich="Chỉnh điểm, thêm quà sau ở mục «Điểm & quà».">
        <Hang trai={<OIcon ten="gamecontroller.fill" />} tieu="1 phút chơi trò chơi" phu="Trong khung giờ, tối đa 30 phút/phiên" phai={<Diem chu="1 điểm" />} />
        <Hang trai={<OIcon ten="cup.and.saucer.fill" />} tieu="Phiếu quà AiiCafe 50.000đ" phu="Dùng tại quầy AiiCafe, hạn 60 ngày" phai={<Diem chu="500 điểm" />} />
      </Nhom>
      <LoiTaiCho loi={loi} />
    </Khung>
  );
}
