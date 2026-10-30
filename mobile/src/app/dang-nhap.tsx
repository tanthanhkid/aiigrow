// Đăng nhập Ba Mẹ (biến thể appllama): modal có Huỷ (việc tự đứng một mình); xong ⇒ cửa một chiều (phien.vao gỡ cả modal lẫn Chào).
// Sai 5 lần liền máy chủ tạm khoá 15 phút.
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { bm } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { useLam } from "@/lib/ui";
import { Khung, LoiTaiCho, NutChinh, ONhap, TieuDe, useO, useOFocusSauChuyen } from "@/lib/ob";

export default function DangNhap() {
  const [dd, setDd] = useState("");
  const [mk, setMk] = useState("");
  const oDd = useOFocusSauChuyen(); const oMk = useO();
  const { vao } = usePhien();
  const { lam, loi, dangChay } = useLam();
  const di = () => dd && mk && !dangChay && lam(async () => { const r = await bm.goi<{ token: string }>("dang-nhap", { dinhDanh: dd, matKhau: mk }); await vao(r.token); });
  return (
    <Khung day={<NutChinh chu="Đăng nhập" dangChay={dangChay} tat={!dd || !mk} bam={di} />}>
      <StatusBar style="light" />
      <TieuDe tieu="Chào Ba Mẹ quay lại" loi="Đăng nhập bằng số điện thoại hoặc email đã đăng ký." />
      <ONhap ref={oDd} nhan="Số điện thoại hoặc email" value={dd} onChangeText={setDd} keyboardType="email-address" autoCapitalize="none" autoComplete="username"
        textContentType="username" returnKeyType="next" onSubmitEditing={() => oMk.current?.focus()} />
      <ONhap ref={oMk} nhan="Mật khẩu" value={mk} onChangeText={setMk} secureTextEntry autoComplete="current-password" textContentType="password"
        returnKeyType="go" onSubmitEditing={di} />
      <LoiTaiCho loi={loi} />
    </Khung>
  );
}
