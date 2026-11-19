// bm1-dang-nhap (thiết kế chốt 04/11): «Chào Ba Mẹ! Đăng nhập để xem con đang làm gì.» — SĐT + mật khẩu (mắt), «Quên mật khẩu?»,
// «Đăng nhập vào nhà mình», hoặc Google / Facebook (lib/dang-nhap-mxh.tsx — chưa bật thì ẩn cả hàng «hoặc»). «Cần giúp?» ⇒ chat AiiLab.
// Sai 5 lần liền máy chủ tạm khoá 15 phút. Có lời mời chờ cho số này (loiMoi) + nhà còn trống ⇒ màn Lời mời (/moi/vao).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { CanGiup, DauMan, LienKet, OLom, SanDangNhap, useOSo, VANG_NAU } from "@/lib/lan-dau";
import { NutDangNhapMxh, useCoMxh, useVaoSau, type KetQuaVao } from "@/lib/dang-nhap-mxh";
import { BaoLoi, Chu, M, Man, Nut, useHoanTac, useLam } from "@/lib/ui";

export default function DangNhap() {
  const { dd: ddVao, moi } = useLocalSearchParams<{ dd?: string; moi?: string }>();
  const [dd, setDd] = useState(String(ddVao ?? ""));
  const oSo = useOSo(dd, setDd);
  const [mk, setMk] = useState("");
  const { bao, noi } = useHoanTac();
  const { lam, loi, dangChay } = useLam();
  const co = useCoMxh();
  const nc = moi ? { moi } : {};
  const vaoSau = useVaoSau(nc);
  const di = () => lam(async () => {
    // Có lời mời: chỉ rẽ sang màn Lời mời khi nhà của tài khoản này còn trống — luật chung ở lib/dang-nhap-mxh.tsx › useVaoSau
    await vaoSau(await bm.goi<KetQuaVao>("dang-nhap", { dinhDanh: dd, matKhau: mk }));
  });
  return (
    <Man noi={noi} dau={<DauMan ve="/chao" phai={<CanGiup />} />} dayStyle={{ paddingTop: 0, paddingBottom: 18 }} day={
      // bàn bm1-dang-nhap (sửa 19/11): nút «Đăng nhập vào nhà mình» vàng 58 + «hoặc» + Google / Facebook cao 54 ghim đáy (đáy cách 18, các hàng cách 12)
      <View style={{ gap: 12 }}>
        <Nut chu="Đăng nhập vào nhà mình" rong lon dangChay={dangChay} tat={!dd || !mk} bam={di} />
        {co.google || co.facebook ? <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 14 }}>
            <View style={{ flex: 1, height: 2, backgroundColor: "rgba(120,98,70,0.25)" }} /><Chu kieu="dam" co={13} mau={M.chu3}>hoặc</Chu><View style={{ flex: 1, height: 2, backgroundColor: "rgba(120,98,70,0.25)" }} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {co.google ? <NutDangNhapMxh loai="google" bien="dn" bao={bao} nc={nc} /> : null}
            {co.facebook ? <NutDangNhapMxh loai="facebook" bien="dn" bao={bao} nc={nc} /> : null}
          </View>
        </> : null}
      </View>
    }>
      <SanDangNhap tieu="Chào Ba Mẹ!" loi={"Đăng nhập để xem\ncon đang làm gì."} />
      <View style={{ marginTop: 12 }}>
        <OLom lon nenO={M.nen} cach={0} nhan="Số điện thoại" {...oSo} keyboardType="email-address" autoCapitalize="none" autoComplete="username" textContentType="username" placeholder="0912 345 678" />
        <OLom lon nenO={M.nen} cach={18} nhan="Mật khẩu" matKhau value={mk} onChangeText={setMk} autoComplete="current-password" textContentType="password" onSubmitEditing={() => dd && mk && di()} />
        <View style={{ marginTop: 2 }}>
          <LienKet phai kieu="dam" mau={VANG_NAU} co={14} chu="Quên mật khẩu?" bam={() => router.push({ pathname: "/quen-mat-khau", params: dd ? { dd } : {} })} />
        </View>
      </View>
      <BaoLoi loi={loi} />
    </Man>
  );
}
