// bm1-chao «Tạo tài khoản Ba Mẹ» (bàn bm-lan-dau, sửa 19/11 — «E · đồng bộ nút vàng»): sân Grow chào cao 360, tiêu đề + câu ngay dưới sân,
// đáy: Google (vàng kim) · Facebook + Số điện thoại · điều khoản (lib/dang-nhap-mxh.tsx — nút MXH chưa bật thì ẩn).
import { router } from "expo-router";
import { DauMan, SanRob, TieuSan } from "@/lib/lan-dau";
import { ChonCachTaoTk } from "@/lib/dang-nhap-mxh";
import { Man, useHoanTac } from "@/lib/ui";

export default function TaoTaiKhoan() {
  const { bao, noi } = useHoanTac();
  return (
    <Man noi={noi} dau={<DauMan ve="/chao" />} dayStyle={{ paddingTop: 0, paddingBottom: 18 }}
      day={<ChonCachTaoTk sdt={() => router.push("/dang-ky")} bao={bao} />}>
      <SanRob thoai="Chào Ba Mẹ! Giờ dùng máy cứ để Grow lo." />
      <TieuSan chu="Tạo tài khoản Ba Mẹ" phu="Chọn một cách, mất chưa tới 1 phút." />
    </Man>
  );
}
