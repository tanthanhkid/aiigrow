// bm-dang-ky (biến thể appllama): số điện thoại (hoặc email) + tên gọi + mật khẩu → gửi mã 6 số. Người đăng ký đầu tiên là Chủ gia đình.
// Push từ Chào (quay lại được). Ô nhập: nhãn trên, đúng bàn phím, autofill, Return chuyển ô kế, ô cuối gửi.
import { useState } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { bm } from "@/lib/api";
import { useLam } from "@/lib/ui";
import { nhoDangKy } from "@/lib/dang-ky";
import { C, Ch, Khung, LoiTaiCho, NutChinh, ONhap, TieuDe, useO, useOFocusSauChuyen } from "@/lib/ob";

export default function DangKy() {
  const [sdt, setSdt] = useState("");
  const [ten, setTen] = useState("");
  const [mk, setMk] = useState("");
  const [roi, setRoi] = useState(false);          // kiểm khi rời ô, không kiểm theo từng phím
  const oSdt = useOFocusSauChuyen(); const oTen = useO(); const oMk = useO();
  const { lam, loi, dangChay } = useLam();
  const du = !!sdt && !!ten && mk.length >= 8;
  const gui = () => du && !dangChay && lam(async () => {
    const r = await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: sdt, mucDich: "dang_ky" });
    nhoDangKy({ dinhDanh: r.guiDen, ten, matKhau: mk, maThu: r.ma });
    router.push("/otp");
  });
  return (
    <Khung day={<NutChinh chu="Gửi mã" dangChay={dangChay} tat={!du} bam={gui} />}>
      <StatusBar style="auto" />
      <TieuDe tieu="Số điện thoại của Ba Mẹ" loi="AiiGrow gửi mã 6 số để xác thực." />
      <ONhap ref={oSdt} nhan="Số điện thoại hoặc email" value={sdt} onChangeText={setSdt} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
        placeholder="0912 345 678" returnKeyType="next" onSubmitEditing={() => oTen.current?.focus()} />
      <ONhap ref={oTen} nhan="Ba/Mẹ tên gì?" value={ten} onChangeText={setTen} autoComplete="name" textContentType="name" placeholder="Mẹ Lan"
        returnKeyType="next" onSubmitEditing={() => oMk.current?.focus()} />
      <ONhap ref={oMk} nhan="Mật khẩu (ít nhất 8 ký tự)" value={mk} onChangeText={setMk} secureTextEntry autoComplete="new-password" textContentType="newPassword"
        returnKeyType="send" onSubmitEditing={gui} onBlur={() => setRoi(true)} loi={roi && mk.length > 0 && mk.length < 8 ? `Mật khẩu cần ít nhất 8 ký tự — còn thiếu ${8 - mk.length}.` : null} />
      <LoiTaiCho loi={loi} />
      <Ch k="footnote" mau={C.chu2} style={{ paddingHorizontal: 4 }}>Người đăng ký đầu tiên là Chủ gia đình. Ba, Ông Bà mời vào sau trong Cài đặt.</Ch>
    </Khung>
  );
}
