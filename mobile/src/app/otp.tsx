// bm1-otp «Nhập mã xác thực» (+ them-pacl0mle nhánh được mời): mã 6 số tự điền; xác thực xong
//   · có link mời (?moi) ⇒ `moi/dang-ky` vào thẳng nhà người mời;
//   · đăng ký thường ⇒ `dang-ky`; máy chủ trả `loiMoi[]` (có người mời số này) hoặc bấm «Tôi được mời vào nhà» ⇒ màn Lời mời (/moi/vao),
//     không thì vào Lần đầu (tên Con). Chế độ thử (chưa có SMS): máy chủ trả mã, app hiện để thử.
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { layDangKy, nhoDangKy, xoaDangKy } from "@/lib/dang-ky";
import { usePhien } from "@/lib/phien";
import { DauMan, demNguoc, TieuDe } from "@/lib/lan-dau";
import { Bao, BaoLoi, BieuTron, Chu, Icon3D, M, Ma6, Man, Nut, useLam } from "@/lib/ui";

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
    <Man dau={<DauMan ve="/dang-ky" />}
      day={<><BaoLoi loi={loi} /><Nut chu={dk.tenNha ? `Xác thực, vào nhà ${dk.tenNha}` : dk.duocMoi ? "Xác thực, xem lời mời" : "Xác thực số điện thoại"} rong dangChay={dangChay} tat={ma.length < 6} bam={xacNhan} /></>}>
      <View style={{ alignItems: "center", gap: 14, paddingTop: 8 }}>
        <BieuTron ic="khien" lon co={72} />
        <TieuDe chu="Nhập mã xác thực" phu={`Mã 6 số đã gửi tới ${dk.dinhDanh}`} giua />
      </View>
      <Ma6 gia={ma} doi={setMa} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Icon3D ten="dong_ho_cat" co={18} />
        {con > 0 ? <Chu co={13.5} mau={M.chu3}>Chưa nhận được? Gửi lại sau <Chu kieu="rat" co={13.5} so>{demNguoc(con)}</Chu></Chu> : (
          <Pressable onPress={guiLai} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Chu kieu="rat" co={14} mau={M.chinhInk}>Chưa nhận được? Gửi lại mã</Chu></Pressable>
        )}
      </View>
      {dk.maThu ? <Bao loai="canh" tieu={`Bản thử: mã là ${dk.maThu}`} loi="Chưa có kênh gửi tin nhắn thật — mã hiện ở đây để dùng thử." /> : null}
    </Man>
  );
}
