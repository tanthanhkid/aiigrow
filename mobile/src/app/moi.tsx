// Nhận lời mời vào gia đình (FR-01.04): mở link …/moi?ma=…, quét QR hoặc gõ mã 8 ký tự ⇒ thấy mời vào nhà nào, quyền gì ⇒ tạo tài khoản
// (số điện thoại + mã 6 số như đăng ký thường). Đã đăng nhập bằng tài khoản còn trống thì nhận thẳng bằng tài khoản đó.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { Bao, BaoLoi, Canh, Chu, Dong, M, Ma6, Man, Nhan, Nhom, Nut, ONhap, useLam } from "@/lib/ui";

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
  const { lam, loi, dangChay } = useLam();
  const xemMoi = (m = ma) => lam(async () => {
    const r = await bm.goi<XemMoi>(`moi/${encodeURIComponent(m.replace(/[^A-Za-z0-9]/g, ""))}`);
    setXem(r);
    setTen((t) => t || r.tenGoi);
  });
  useEffect(() => { if (maVao) xemMoi(String(maVao)); }, [maVao]);      // eslint-disable-line react-hooks/exhaustive-deps
  const guiMa = () => lam(async () => setOtp(await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: sdt, mucDich: "dang_ky" })));
  const vaoNha = () => lam(async () => {
    const r = await bm.goi<{ token: string }>("moi/dang-ky", { ma, dinhDanh: otp!.guiDen, otp: maOtp, ten, matKhau: mk });
    await vao(r.token);
  });
  const nhanBangTaiKhoan = () => lam(async () => { await bm.goi("moi/nhan", { ma }); router.replace("/hom-nay"); });

  if (!xem) {
    return (
      <Man lui={{ chu: "Quay lại", ve: co ? "/cai-dat" : "/chao" }}
        day={<><BaoLoi loi={loi} /><Nut chu="Xem lời mời" rong dangChay={dangChay} tat={ma.replace(/[^A-Za-z0-9]/g, "").length < 8} bam={() => xemMoi()} /></>}>
        <Canh lv="canh-cac-con" thap tieu="Có mã mời?" loi="Ba/Mẹ trong nhà gửi mã 8 ký tự hoặc link. Nhập mã để cùng đồng hành với các Con." />
        <ONhap nhan="Mã mời" value={ma} onChangeText={(t) => setMa(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="ABCD-2345" maxLength={12} />
        <Chu co={13} mau={M.chu3}>Mã dùng một lần, hết hạn sau 72 giờ. Hết hạn thì xin người mời gửi mã mới.</Chu>
      </Man>
    );
  }
  const the = (
    <Nhom>
      <Dong dau tieu={xem.tenGiaDinh} phu={xem.nguoiMoi ? `${xem.nguoiMoi} mời Ba/Mẹ vào` : "Lời mời vào gia đình"} phai={<Nhan chu={xem.tenVai} loai={xem.vai === "duyet" ? "lam" : "xam"} />} />
      <Dong tieu={`Quyền ${xem.tenVai}`} phu={MO_TA[xem.vai]} />
    </Nhom>
  );
  if (co) {
    return (
      <Man lui={{ chu: "Quay lại", ve: "/cai-dat" }}
        day={<><BaoLoi loi={loi} /><Nut chu="Nhận lời mời bằng tài khoản này" rong dangChay={dangChay} bam={nhanBangTaiKhoan} /></>}>
        <Canh lv="canh-cac-con" thap tieu="Vào gia đình mới?" loi="Chỉ nhận được khi tài khoản này chưa có Con, máy hay thành viên nào." />
        {the}
        <Bao loai="lam" ic="khien" tieu="Mỗi tài khoản một gia đình" loi="Tài khoản đã có dữ liệu thì đăng xuất, rồi mở lại link mời để tạo tài khoản bằng số khác." />
      </Man>
    );
  }
  if (!otp) {
    return (
      <Man lui={{ chu: "Đổi mã" }}
        day={<><BaoLoi loi={loi} /><Nut chu="Gửi mã" rong dangChay={dangChay} tat={!sdt || !ten.trim() || mk.length < 8} bam={guiMa} /></>}>
        <Canh lv="canh-cac-con" thap tieu={`Vào ${xem.tenGiaDinh}`} loi="Tạo tài khoản bằng số điện thoại — AiiGrow gửi mã 6 số để xác thực." />
        {the}
        <ONhap nhan="Số điện thoại hoặc email" value={sdt} onChangeText={setSdt} keyboardType="phone-pad" autoComplete="tel" placeholder="0912 345 678" />
        <ONhap nhan="Gọi là gì trong nhà?" value={ten} onChangeText={setTen} autoComplete="name" placeholder="Ba Huy, Bà nội…" maxLength={40} />
        <ONhap nhan="Mật khẩu (ít nhất 8 ký tự)" value={mk} onChangeText={setMk} secureTextEntry autoComplete="new-password" />
      </Man>
    );
  }
  return (
    <Man day={<><BaoLoi loi={loi} /><Nut chu="Vào gia đình" rong dangChay={dangChay} tat={maOtp.length < 6} bam={vaoNha} /></>}>
      <Canh lv="cho" thap tieu="Nhập mã 6 số" loi={`Đã gửi tới ${otp.guiDen}.`} />
      <Ma6 gia={maOtp} doi={setMaOtp} />
      <View style={{ alignItems: "center" }}>
        <Nut chu="Đổi số điện thoại" loai="ma" nho bam={() => { setOtp(null); setMaOtp(""); }} />
      </View>
      {otp.ma ? <Bao loai="canh" tieu={`Bản thử: mã là ${otp.ma}`} loi="Chưa có kênh gửi tin nhắn thật — mã hiện ở đây để dùng thử." /> : null}
    </Man>
  );
}
