// bm1-dang-nhap (thiết kế chốt 04/11): «Chào Ba Mẹ! Đăng nhập để xem con đang làm gì.» — SĐT + mật khẩu (mắt), «Quên mật khẩu?»,
// «Đăng nhập vào nhà mình», hoặc Google / Facebook (lib/dang-nhap-mxh.tsx — chưa bật thì ẩn cả hàng «hoặc»). «Cần giúp?» ⇒ chat AiiLab.
// Sai 5 lần liền máy chủ tạm khoá 15 phút. Có lời mời chờ cho số này (loiMoi) + nhà còn trống ⇒ màn Lời mời (/moi/vao).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { CanGiup, CanhRob, DauMan, LienKet, OLom } from "@/lib/lan-dau";
import { NutMxhThat, useCoMxh } from "@/lib/dang-nhap-mxh";
import { BaoLoi, Chu, M, Man, Nut, useHoanTac, useLam } from "@/lib/ui";

export default function DangNhap() {
  const { dd: ddVao, moi } = useLocalSearchParams<{ dd?: string; moi?: string }>();
  const [dd, setDd] = useState(String(ddVao ?? ""));
  const [mk, setMk] = useState("");
  const { vao } = usePhien();
  const { bao, noi } = useHoanTac();
  const { lam, loi, dangChay } = useLam();
  const co = useCoMxh();
  const nc = moi ? { moi } : {};
  const di = () => lam(async () => {
    const r = await bm.goi<{ token: string; loiMoi?: unknown[] }>("dang-nhap", { dinhDanh: dd, matKhau: mk });
    if (!r.loiMoi?.length && !moi) { await vao(r.token); return; }
    // Có lời mời: chỉ rẽ sang màn Lời mời khi nhà của tài khoản này còn trống (moi/nhan đòi tài khoản trống) — không thì vào Trang chủ như cũ
    await bm.dat(r.token);
    const g = await bm.goi<{ con: unknown[] }>("gia-dinh").catch(() => ({ con: [1] }));
    await vao(r.token, false, g.con.length ? "/" : moi && moi !== "1" ? `/moi/vao?ma=${encodeURIComponent(moi)}` : "/moi/vao");
  });
  return (
    <Man noi={noi} dau={<DauMan ve="/chao" phai={<CanGiup />} />}>
      <CanhRob lv="chi" tieu="Chào Ba Mẹ!" loi="Đăng nhập để xem con đang làm gì." cao={140} />
      <OLom nhan="Số điện thoại" value={dd} onChangeText={setDd} keyboardType="email-address" autoCapitalize="none" autoComplete="username" textContentType="username" placeholder="0912 345 678" />
      <OLom nhan="Mật khẩu" matKhau value={mk} onChangeText={setMk} autoComplete="current-password" textContentType="password" onSubmitEditing={() => dd && mk && di()} />
      <View style={{ alignItems: "flex-end", marginTop: -6 }}>
        <LienKet chu="Quên mật khẩu?" bam={() => router.push({ pathname: "/quen-mat-khau", params: dd ? { dd } : {} })} />
      </View>
      <BaoLoi loi={loi} />
      <Nut chu="Đăng nhập vào nhà mình" rong dangChay={dangChay} tat={!dd || !mk} bam={di} />
      {co.google || co.facebook ? <>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: M.vien2 }} /><Chu co={13} mau={M.chu3}>hoặc</Chu><View style={{ flex: 1, height: 1, backgroundColor: M.vien2 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {co.google ? <NutMxhThat loai="google" bao={bao} nc={nc} /> : null}
          {co.facebook ? <NutMxhThat loai="facebook" bao={bao} nc={nc} /> : null}
        </View>
      </> : null}
    </Man>
  );
}
