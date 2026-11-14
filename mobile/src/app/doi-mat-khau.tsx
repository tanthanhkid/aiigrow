// «Đổi mật khẩu» (thiết kế 14/11 bm-ca-nha/09 them-o4k6oei0): mật khẩu đang dùng · mật khẩu mới · nhập lại, ghi chú «Ít nhất 8 ký tự. Quên mật khẩu cũ
// thì đăng xuất rồi chọn «Quên mật khẩu»», «Lưu mật khẩu mới» ⇒ POST doi-mat-khau {matKhau, matKhauMoi} (máy chủ đăng xuất các máy khác).
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { BaoLoi, baoKhiVe, Chu, M, Man, Nut, ONhap, Rob, useLam } from "@/lib/ui";

export default function DoiMatKhau() {
  const [cu, setCu] = useState("");
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const { lam, loi, dangChay } = useLam();
  const khop = mk.length >= 8 && mk === mk2;
  const ghi = mk2 && !khop ? (mk.length < 8 ? "Cần ít nhất 8 ký tự" : "Hai lần nhập chưa khớp") : null;
  const luu = () => lam(async () => {
    await bm.goi("doi-mat-khau", { matKhau: cu, matKhauMoi: mk });
    baoKhiVe("Đã đổi mật khẩu");
    if (router.canGoBack()) router.back(); else router.replace("/tai-khoan");
  });
  return (
    // thiết kế 09: nút «Lưu mật khẩu mới» ngay dưới ô ghi chú (không ghim đáy)
    <Man lui={{ chu: "Tài khoản" }} tieu="Đổi mật khẩu">
      <ONhap nhan="Mật khẩu đang dùng" value={cu} onChangeText={setCu} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" />
      <ONhap nhan="Mật khẩu mới" value={mk} onChangeText={setMk} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
      <ONhap nhan="Nhập lại mật khẩu mới" value={mk2} onChangeText={setMk2} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" loi={ghi} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, backgroundColor: "#dcebe6" }}>
        <Rob ten="chi" co={52} />
        <Chu kieu="dam7" co={13.5} mau={M.chinhInk} style={{ flex: 1 }}>Ít nhất 8 ký tự. Quên mật khẩu cũ thì đăng xuất rồi chọn «Quên mật khẩu».</Chu>
      </View>
      <BaoLoi loi={loi} />
      <Nut chu="Lưu mật khẩu mới" rong dangChay={dangChay} tat={!cu || !khop} bam={luu} />
    </Man>
  );
}
