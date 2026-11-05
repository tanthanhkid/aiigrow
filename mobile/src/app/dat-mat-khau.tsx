// «Đặt mật khẩu» cho tài khoản vào bằng Google / Facebook (chưa có mật khẩu). Mật khẩu cần cho: gỡ máy của Con (trong app và ngay trên máy Con),
// xoá tài khoản, đăng nhập bằng email + mật khẩu. Máy chủ bắt xác minh lại bằng đúng tài khoản Google / Facebook đã dùng (POST dat-mat-khau
// {matKhauMoi, idToken | accessToken}) — người cầm máy đang mở app không tự đặt được. Mở từ Cả nhà › Xoá tài khoản, hoặc khi gỡ máy báo
// `chua_co_mat_khau`.
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { NutMxhThat, useCoMxh } from "@/lib/dang-nhap-mxh";
import { DauMan, OLom, TieuDe } from "@/lib/lan-dau";
import { Bao, baoKhiVe, Man, useHoanTac } from "@/lib/ui";

export default function DatMatKhau() {
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const co = useCoMxh();
  const { bao, noi } = useHoanTac();
  const khop = mk.length >= 8 && mk === mk2;
  const luu = async (t: { idToken: string } | { accessToken: string }) => {
    await bm.goi("dat-mat-khau", { matKhauMoi: mk, ...t });
    baoKhiVe("Đã đặt mật khẩu");
    if (router.canGoBack()) router.back(); else router.replace("/");
  };
  return (
    <Man noi={noi} dau={<DauMan ve="/" />}>
      <TieuDe chu="Đặt mật khẩu" phu="Tài khoản vào bằng Google / Facebook chưa có mật khẩu. Cần mật khẩu để gỡ máy của con và xoá tài khoản." />
      <OLom nhan="Mật khẩu mới (ít nhất 8 ký tự)" matKhau value={mk} onChangeText={setMk} autoComplete="new-password" textContentType="newPassword" />
      <OLom nhan="Nhập lại mật khẩu" matKhau value={mk2} onChangeText={setMk2} autoComplete="new-password" textContentType="newPassword"
        ghi={mk2 && !khop ? (mk.length < 8 ? "Cần ít nhất 8 ký tự" : "Hai lần nhập chưa khớp") : undefined} />
      {!co.san ? null : !co.google && !co.facebook ? <Bao loai="canh" tieu="Chưa xác minh được" loi="Đăng nhập Google / Facebook đang tắt — thử lại sau." /> : (
        <View style={{ gap: 10, opacity: khop ? 1 : 0.5 }} pointerEvents={khop ? "auto" : "none"}>
          <TieuDe chu="Xác nhận bằng" co={17} />
          {co.google ? <NutMxhThat loai="google" bao={bao} khiCo={luu} /> : null}
          {co.facebook ? <NutMxhThat loai="facebook" bao={bao} khiCo={luu} /> : null}
        </View>
      )}
    </Man>
  );
}
