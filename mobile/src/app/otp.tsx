// bm1-otp «Nhập mã xác thực» (+ them-pacl0mle nhánh được mời): mã 6 số tự điền; xác thực xong
//   · có link mời (?moi) ⇒ `moi/dang-ky` vào thẳng nhà người mời;
//   · đăng ký thường ⇒ `dang-ky`; máy chủ trả `loiMoi[]` (có người mời số này) hoặc bấm «Tôi được mời vào nhà» ⇒ màn Lời mời (/moi/vao),
//     không thì vào Lần đầu (tên Con). Chế độ thử (chưa có SMS): máy chủ trả mã, app hiện để thử.
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { layDangKy, nhoDangKy, xoaDangKy } from "@/lib/dang-ky";
import { usePhien } from "@/lib/phien";
import { Anh3D, DauMan, demNguoc, hienSo, INK2 } from "@/lib/lan-dau";
import { BONG } from "@/lib/clay";
import { Bao, BaoLoi, Chu, F, M, Ma6, Man, Nut, useLam } from "@/lib/ui";

export default function Otp() {
  const [dk, setDk] = useState(layDangKy);       // giữ bản chụp: xoaDangKy() lúc vào xong không được kéo màn về /dang-ky
  const [ma, setMa] = useState("");
  const [con, setCon] = useState(60);
  const { vao } = usePhien();
  const { lam, loi, dangChay } = useLam();
  useEffect(() => { const t = setInterval(() => setCon((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(t); }, []);
  if (!dk) { router.replace("/dang-ky"); return null; }
  const xacNhan = () => lam(async () => {
    if (dk.moi) {
      const r = await bm.goi<{ token: string }>("moi/dang-ky", { ma: dk.moi, dinhDanh: dk.dinhDanh, otp: ma, ten: dk.ten, matKhau: dk.matKhau });
      xoaDangKy();
      await vao(r.token, false, "/hom-nay");
      return;
    }
    const r = await bm.goi<{ token: string; loiMoi?: unknown[] }>("dang-ky", { dinhDanh: dk.dinhDanh, ma, ten: dk.ten, matKhau: dk.matKhau });
    xoaDangKy();
    await vao(r.token, true, r.loiMoi?.length || dk.duocMoi ? "/moi/vao" : "/thiet-lap/ten-con");
  });
  const guiLai = () => lam(async () => {
    const r = await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: dk.dinhDanh, mucDich: "dang_ky" });
    const moi = { ...dk, maThu: r.ma }; nhoDangKy(moi); setDk(moi);
    setCon(60);
  });
  return (
    <Man dau={<DauMan ve="/dang-ky" />} dayStyle={{ paddingTop: 0, paddingBottom: 22 }}
      day={<><BaoLoi loi={loi} /><Nut chu={dk.tenNha ? `Xác thực, vào nhà ${dk.tenNha}` : dk.duocMoi ? "Xác thực, xem lời mời" : "Xác thực số điện thoại"} rong lon dangChay={dangChay} tat={ma.length < 6} bam={xacNhan} /></>}>
      {/* bàn bm1-otp (sửa 19/11): viên khiên 96 kem nổi + icon 56, tiêu đề 26/32, câu 15/21, ô mã 48×60 (ô đang gõ viền vàng mật 3) */}
      <View style={{ alignItems: "center", paddingTop: 8 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: M.nen, boxShadow: BONG.the, alignItems: "center", justifyContent: "center" }}><Anh3D ten="khien" co={56} /></View>
        <Text accessibilityRole="header" style={{ marginTop: 18, fontFamily: F.tieu, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: M.chu, textAlign: "center" }}>Nhập mã xác thực</Text>
        <Text style={{ marginTop: 6, fontFamily: F.thuong, fontSize: 15, lineHeight: 21, color: INK2, textAlign: "center" }}>Mã 6 số đã gửi tới <Text style={{ fontFamily: F.rat, color: M.chu, fontVariant: ["tabular-nums"] }}>{hienSo(dk.dinhDanh)}</Text></Text>
      </View>
      <View style={{ marginTop: 16 }}><Ma6 ban gia={ma} doi={setMa} /></View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44, marginTop: 10 }}>
        <Anh3D ten="dong_ho_cat" co={20} />
        {con > 0 ? (dk.duocMoi
          // nhánh được mời (bàn them-pacl0mle v3): «Gửi lại mã sau 0:42»
          ? <Chu kieu="dam" co={14} mau={M.chu3}>Gửi lại mã sau <Chu kieu="rat" co={14} so>{demNguoc(con)}</Chu></Chu>
          : <Chu kieu="dam" co={14} mau={M.chu3}>Chưa nhận được? Gửi lại sau {demNguoc(con)}</Chu>) : (
          <Pressable onPress={guiLai} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Chu kieu="rat" co={14} mau={M.chinhInk}>Chưa nhận được? Gửi lại mã</Chu></Pressable>
        )}
      </View>
      {dk.maThu ? <Bao loai="canh" tieu={`Bản thử: mã là ${dk.maThu}`} loi="Chưa có kênh gửi tin nhắn thật — mã hiện ở đây để dùng thử." /> : null}
    </Man>
  );
}
