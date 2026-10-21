// Đăng nhập Ba Mẹ (số điện thoại / email + mật khẩu). Sai 5 lần liền máy chủ tạm khoá 15 phút.
import { useState } from "react";
import { bm } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { BaoLoi, Canh, Man, Nut, ONhap, useLam } from "@/lib/ui";

export default function DangNhap() {
  const [dd, setDd] = useState("");
  const [mk, setMk] = useState("");
  const { vao } = usePhien();
  const { lam, loi, dangChay } = useLam();
  const di = () => lam(async () => { const r = await bm.goi<{ token: string }>("dang-nhap", { dinhDanh: dd, matKhau: mk }); await vao(r.token); });
  return (
    <Man lui={{ chu: "Quay lại" }} day={<><BaoLoi loi={loi} /><Nut chu="Đăng nhập" rong dangChay={dangChay} tat={!dd || !mk} bam={di} /></>}>
      <Canh lv="rob-goc" thap tieu="Chào Ba Mẹ quay lại" loi="Đăng nhập bằng số điện thoại hoặc email đã đăng ký." />
      <ONhap nhan="Số điện thoại hoặc email" value={dd} onChangeText={setDd} keyboardType="email-address" autoCapitalize="none" autoComplete="username" />
      <ONhap nhan="Mật khẩu" value={mk} onChangeText={setMk} secureTextEntry autoComplete="current-password" onSubmitEditing={di} />
    </Man>
  );
}
