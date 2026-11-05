// bm1-chao «Tạo tài khoản Ba Mẹ» (thiết kế chốt 04/11): Rob chào + 3 cách — Google, Facebook (chưa có OAuth ⇒ báo «sắp có»), Số điện thoại.
import { router } from "expo-router";
import { ChonCachTaoTk, DauMan, KhoiRob } from "@/lib/lan-dau";
import { Man, useHoanTac } from "@/lib/ui";

export default function TaoTaiKhoan() {
  const { bao, noi } = useHoanTac();
  return (
    <Man noi={noi} dau={<DauMan ve="/chao" />}>
      <KhoiRob thoai="Chào Ba Mẹ! Giờ dùng máy cứ để Rob lo." cao={320} />
      <ChonCachTaoTk tieu="Tạo tài khoản Ba Mẹ" loi="Chọn một cách, mất chưa tới 1 phút." sdt={() => router.push("/dang-ky")} bao={bao} />
    </Man>
  );
}
