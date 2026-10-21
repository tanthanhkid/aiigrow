// bm-otp: nhập mã 6 số (tự điền từ tin nhắn). Chế độ thử (chưa có nhà cung cấp SMS — KE-HOACH 5.1): máy chủ trả mã, app hiện để thử.
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { layDangKy, nhoDangKy, xoaDangKy } from "@/lib/dang-ky";
import { usePhien } from "@/lib/phien";
import { Bao, BaoLoi, Canh, Chu, M, Ma6, Man, Nut, useLam } from "@/lib/ui";

export default function Otp() {
  const [dk, setDk] = useState(layDangKy);       // giữ bản chụp: xoaDangKy() lúc vào xong không được kéo màn về /dang-ky
  const [ma, setMa] = useState("");
  const [con, setCon] = useState(60);
  const { vao } = usePhien();
  const { lam, loi, dangChay } = useLam();
  useEffect(() => { const t = setInterval(() => setCon((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(t); }, []);
  if (!dk) { router.replace("/dang-ky"); return null; }
  const xacNhan = () => lam(async () => {
    const r = await bm.goi<{ token: string }>("dang-ky", { dinhDanh: dk.dinhDanh, ma, ten: dk.ten, matKhau: dk.matKhau });
    xoaDangKy();
    await vao(r.token, true);
  });
  const guiLai = () => lam(async () => {
    const r = await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: dk.dinhDanh, mucDich: "dang_ky" });
    const moi = { ...dk, maThu: r.ma }; nhoDangKy(moi); setDk(moi);
    setCon(60);
  });
  return (
    <Man lui={{ chu: "Đổi số", ve: "/dang-ky" }} day={<><BaoLoi loi={loi} /><Nut chu="Xác nhận" rong dangChay={dangChay} tat={ma.length < 6} bam={xacNhan} /></>}>
      <Canh lv="cho" thap tieu="Nhập mã 6 số" loi={`Đã gửi tới ${dk.dinhDanh}.`} />
      <Ma6 gia={ma} doi={setMa} />
      <View style={{ alignItems: "center" }}>
        {con > 0 ? <Chu co={13} mau={M.chu3}>Gửi lại mã sau <Chu kieu="rat" co={13} so>{`0:${String(con).padStart(2, "0")}`}</Chu></Chu> : (
          <Pressable onPress={guiLai} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Chu kieu="rat" co={14} mau={M.chinhInk}>Gửi lại mã</Chu></Pressable>
        )}
      </View>
      <Bao loai="lam" ic="tia" tieu="Mã tự điền" loi="Tin nhắn có mã sẽ tự điền vào ô — không cần chép tay." />
      {dk.maThu ? <Bao loai="canh" tieu={`Bản thử: mã là ${dk.maThu}`} loi="Chưa có kênh gửi tin nhắn thật — mã hiện ở đây để dùng thử." /> : null}
    </Man>
  );
}
