// bm-dang-ky: số điện thoại (hoặc email) + tên gọi + mật khẩu → gửi mã 6 số. Người đăng ký đầu tiên là Chủ gia đình (FR-01.01).
import { useState } from "react";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { BaoLoi, Canh, Chu, M, Man, Nut, ONhap, useLam } from "@/lib/ui";
import { nhoDangKy } from "@/lib/dang-ky";

export default function DangKy() {
  const [sdt, setSdt] = useState("");
  const [ten, setTen] = useState("");
  const [mk, setMk] = useState("");
  const { lam, loi, dangChay } = useLam();
  const gui = () => lam(async () => {
    const r = await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: sdt, mucDich: "dang_ky" });
    nhoDangKy({ dinhDanh: r.guiDen, ten, matKhau: mk, maThu: r.ma });
    router.push("/otp");
  });
  return (
    <Man lui={{ chu: "Quay lại" }} day={<><BaoLoi loi={loi} /><Nut chu="Gửi mã" rong dangChay={dangChay} tat={!sdt || !ten || mk.length < 8} bam={gui} /></>}>
      <Canh lv="chi" thap tieu="Số điện thoại của Ba Mẹ" loi="AiiGrow gửi mã 6 số để xác thực." />
      <ONhap nhan="Số điện thoại hoặc email" value={sdt} onChangeText={setSdt} keyboardType="phone-pad" autoComplete="tel" placeholder="0912 345 678" />
      <ONhap nhan="Ba/Mẹ tên gì?" value={ten} onChangeText={setTen} autoComplete="name" placeholder="Mẹ Lan" />
      <ONhap nhan="Mật khẩu (ít nhất 8 ký tự)" value={mk} onChangeText={setMk} secureTextEntry autoComplete="new-password" />
      <Chu co={13} mau={M.chu3}>Người đăng ký đầu tiên là <Chu kieu="rat" co={13}>Chủ gia đình</Chu>. Ba, Ông Bà mời vào sau trong Cài đặt.</Chu>
    </Man>
  );
}
