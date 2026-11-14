// bm1-chao «Tạo tài khoản Ba Mẹ» (thiết kế chốt 04/11): Rob chào + 3 cách — Google, Facebook (lib/dang-nhap-mxh.tsx — chưa bật thì ẩn), Số điện thoại.
import { router } from "expo-router";
import { DauMan, KhoiRob } from "@/lib/lan-dau";
import { ChonCachTaoTk } from "@/lib/dang-nhap-mxh";
import { Man, useHoanTac } from "@/lib/ui";

export default function TaoTaiKhoan() {
  const { bao, noi } = useHoanTac();
  return (
    <Man noi={noi} dau={<DauMan ve="/chao" />}
      day={<ChonCachTaoTk tieu="Tạo tài khoản Ba Mẹ" loi="Chọn một cách, mất chưa tới 1 phút." sdt={() => router.push("/dang-ky")} bao={bao} />}>
      <KhoiRob thoai="Chào Ba Mẹ! Giờ dùng máy cứ để Grow lo." cao={360} />
    </Man>
  );
}
