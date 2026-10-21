// bm-ob-mau (bước 4/5): mẫu nhiệm vụ + phần thưởng theo tuổi (Phụ lục C) — chỉnh điểm sau ở «Điểm & quà».
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { layTl } from "@/lib/thiet-lap";
import { BaoLoi, BieuTron, Buoc, Canh, Dong, Man, Nhan, Nhom, NhomTieu, Nut, useLam } from "@/lib/ui";

const NV = {
  nhi: [["sach", "xanh", "Đọc 1 cuốn truyện 30 trang", "Ảnh bìa + trang cuối, kể lại 3 câu", 10], ["chen", "lam", "Rửa chén sau bữa ăn", "Ảnh bồn rửa · tối đa 3 lần/ngày", 10],
    ["mu", "tim", "Học 1 bài với AiiRob đạt", "Tự động cộng khi đạt ≥ 80%", 20], ["chay", "cam", "Nhảy dây 10 phút", "Ảnh · 1 lần/ngày", 5]],
  teen: [["sach", "xanh", "Đọc sách 50 trang", "Ảnh bìa + trang cuối + tóm tắt", 10], ["chen", "lam", "Rửa chén sau bữa ăn", "Ảnh bồn rửa · tối đa 3 lần/ngày", 10],
    ["mu", "tim", "Học 1 bài với AiiRob đạt", "Tự động cộng khi đạt ≥ 80%", 20], ["chay", "cam", "Chạy bộ / đạp xe 30 phút", "Ảnh · 1 lần/ngày", 10]],
} as const;

export default function ObMau() {
  const tl = layTl();
  const nhom = tl.nhom ?? "nhi";
  const { lam, loi, dangChay } = useLam();
  const dung = () => lam(async () => {
    await bm.goi("nhiem-vu/mau", { nhom });
    await bm.goi("qua/mau", {});
    router.push("/thiet-lap/gio");
  });
  return (
    <Man dau={<Buoc n={4} tong={5} nhan="Bước 4/5 · Nhiệm vụ & quà" />} day={<><BaoLoi loi={loi} /><Nut chu="Dùng mẫu này" rong dangChay={dangChay} bam={dung} /></>}>
      <Canh lv="so-tay" thap tieu={nhom === "nhi" ? "Mẫu cho Con tiểu học" : "Mẫu cho Con tuổi teen"} loi={`${nhom === "nhi" ? 8 : 9} nhiệm vụ + 6 phần thưởng. Chỉnh điểm sau cũng được.`} />
      <NhomTieu chu="Nhiệm vụ" />
      <Nhom>
        {NV[nhom].map(([ic, mau, t, p, d], i) => <Dong key={t} dau={i === 0} tieu={t} phu={p} trai={<BieuTron ic={ic} mau={mau} />} phai={<Nhan loai="diem" chu={`+${d}`} />} />)}
      </Nhom>
      <NhomTieu chu="Phần thưởng" />
      <Nhom>
        <Dong dau tieu="1 phút chơi trò chơi" phu="Trong khung giờ, tối đa 30 phút/phiên" trai={<BieuTron ic="game" mau="vang" />} phai={<Nhan loai="xam" chu="1 điểm" />} />
        <Dong tieu="Phiếu quà AiiCafe 50.000đ" phu="Dùng tại quầy AiiCafe, hạn 60 ngày" trai={<BieuTron ic="coc" mau="cam" />} phai={<Nhan loai="xam" chu="500 điểm" />} />
      </Nhom>
    </Man>
  );
}
