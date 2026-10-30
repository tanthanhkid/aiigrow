// Nhận lời mời vào gia đình (FR-01.04) — biến thể appllama: modal có Huỷ. Gõ mã 8 ký tự / mở link …/moi?ma=… ⇒ thấy mời vào nhà nào,
// quyền gì ⇒ tạo tài khoản (số điện thoại + mã 6 số). Đã đăng nhập bằng tài khoản còn trống thì nhận thẳng bằng tài khoản đó.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { useLam } from "@/lib/ui";
import { C, Ch, GhiChu, Hang, Khung, LoiTaiCho, Ma6, Nhom, NutChinh, NutChu, OIcon, ONhap, TieuDe, useO, useOFocusSauChuyen } from "@/lib/ob";

type XemMoi = { tenGiaDinh: string; nguoiMoi: string | null; vai: "duyet" | "xem"; tenVai: string; tenGoi: string; het: string };
const MO_TA = { duyet: "Duyệt nhiệm vụ, yêu cầu của các Con như Ba Mẹ", xem: "Xem tình hình, nhận thông báo; không duyệt, không đổi gì" } as const;

export default function NhanLoiMoi() {
  const { ma: maVao } = useLocalSearchParams<{ ma?: string }>();
  const { co, vao } = usePhien();
  const [ma, setMa] = useState(String(maVao ?? ""));
  const [xem, setXem] = useState<XemMoi | null>(null);
  const [sdt, setSdt] = useState("");
  const [ten, setTen] = useState("");
  const [mk, setMk] = useState("");
  const [otp, setOtp] = useState<{ guiDen: string; ma?: string } | null>(null);
  const [maOtp, setMaOtp] = useState("");
  const oMa = useOFocusSauChuyen(); const oTen = useO(); const oMk = useO();
  const { lam, loi, dangChay } = useLam();
  const sach = ma.replace(/[^A-Za-z0-9]/g, "");
  const xemMoi = (m = ma) => lam(async () => {
    const r = await bm.goi<XemMoi>(`moi/${encodeURIComponent(m.replace(/[^A-Za-z0-9]/g, ""))}`);
    setXem(r);
    setTen((t) => t || r.tenGoi);
  });
  useEffect(() => { if (maVao) xemMoi(String(maVao)); }, [maVao]);      // eslint-disable-line react-hooks/exhaustive-deps
  const guiMa = () => lam(async () => setOtp(await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: sdt, mucDich: "dang_ky" })));
  const vaoNha = (m = maOtp) => lam(async () => {
    const r = await bm.goi<{ token: string }>("moi/dang-ky", { ma, dinhDanh: otp!.guiDen, otp: m, ten, matKhau: mk });
    await vao(r.token);
  });
  const nhanBangTaiKhoan = () => lam(async () => { await bm.goi("moi/nhan", { ma }); if (router.canDismiss()) router.dismissAll(); router.replace("/hom-nay"); });

  if (!xem) {
    return (
      <Khung day={<NutChinh chu="Xem lời mời" dangChay={dangChay} tat={sach.length < 8} bam={() => xemMoi()} />}>
        <StatusBar style="light" />
        <TieuDe tieu="Có mã mời?" loi="Ba/Mẹ trong nhà gửi mã 8 ký tự hoặc link. Nhập mã để cùng đồng hành với các Con." />
        <ONhap ref={oMa} nhan="Mã mời" value={ma} onChangeText={(t) => setMa(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="ABCD-2345"
          maxLength={12} returnKeyType="go" onSubmitEditing={() => sach.length >= 8 && xemMoi()} style={{ fontVariant: ["tabular-nums"], letterSpacing: 2 }} />
        <LoiTaiCho loi={loi} />
        <Ch k="footnote" mau={C.chu2} style={{ paddingHorizontal: 4 }}>Mã dùng một lần, hết hạn sau 72 giờ. Hết hạn thì xin người mời gửi mã mới.</Ch>
      </Khung>
    );
  }
  const the = (
    <Nhom>
      <Hang trai={<OIcon ten="house.fill" />} tieu={xem.tenGiaDinh} phu={xem.nguoiMoi ? `${xem.nguoiMoi} mời Ba/Mẹ vào` : "Lời mời vào gia đình"} />
      <Hang trai={<OIcon ten={xem.vai === "duyet" ? "checkmark.seal.fill" : "eye.fill"} />} tieu={`Quyền ${xem.tenVai}`} phu={MO_TA[xem.vai]} />
    </Nhom>
  );
  if (co) {
    return (
      <Khung day={<NutChinh chu="Nhận lời mời bằng tài khoản này" dangChay={dangChay} bam={nhanBangTaiKhoan} />}>
        <TieuDe tieu="Vào gia đình mới?" loi="Chỉ nhận được khi tài khoản này chưa có Con, máy hay thành viên nào." />
        {the}
        <LoiTaiCho loi={loi} />
        <GhiChu ic="person.crop.circle.badge.exclamationmark" chu="Mỗi tài khoản một gia đình. Tài khoản đã có dữ liệu thì đăng xuất, rồi mở lại link mời để tạo tài khoản bằng số khác." />
      </Khung>
    );
  }
  if (!otp) {
    return (
      <Khung day={<><NutChinh chu="Gửi mã" dangChay={dangChay} tat={!sdt || !ten.trim() || mk.length < 8} bam={guiMa} /><NutChu chu="Nhập mã mời khác" bam={() => setXem(null)} /></>}>
        <TieuDe tieu={`Vào ${xem.tenGiaDinh}`} loi="Tạo tài khoản bằng số điện thoại — AiiGrow gửi mã 6 số để xác thực." />
        {the}
        <ONhap nhan="Số điện thoại hoặc email" value={sdt} onChangeText={setSdt} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"
          placeholder="0912 345 678" returnKeyType="next" onSubmitEditing={() => oTen.current?.focus()} />
        <ONhap ref={oTen} nhan="Gọi là gì trong nhà?" value={ten} onChangeText={setTen} autoComplete="name" placeholder="Ba Huy, Bà nội…" maxLength={40}
          returnKeyType="next" onSubmitEditing={() => oMk.current?.focus()} />
        <ONhap ref={oMk} nhan="Mật khẩu (ít nhất 8 ký tự)" value={mk} onChangeText={setMk} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <LoiTaiCho loi={loi} />
      </Khung>
    );
  }
  return (
    <Khung day={<><NutChinh chu="Vào gia đình" dangChay={dangChay} tat={maOtp.length < 6} bam={() => vaoNha()} /><NutChu chu="Đổi số điện thoại" bam={() => { setOtp(null); setMaOtp(""); }} /></>}>
      <TieuDe tieu="Nhập mã 6 số" loi={`Đã gửi tới ${otp.guiDen}.`} />
      <Ma6 gia={maOtp} doi={setMaOtp} du={vaoNha} />
      <LoiTaiCho loi={loi} />
      {otp.ma ? <View><GhiChu ic="testtube.2" mau={C.diem} chu={`Bản thử: mã là ${otp.ma}. Chưa có kênh gửi tin nhắn thật — mã hiện ở đây để dùng thử.`} /></View> : null}
    </Khung>
  );
}
