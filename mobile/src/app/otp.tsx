// bm-otp (biến thể appllama): nhập mã 6 số (tự điền từ tin nhắn); đủ 6 số thì tự xác nhận. Đúng mã ⇒ cửa một chiều: phien.vao() gỡ
// Chào/Số điện thoại/Mã khỏi ngăn xếp. «Đổi số» = nút lùi native. Chế độ thử: máy chủ trả mã, app hiện để thử.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { bm } from "@/lib/api";
import { layDangKy, nhoDangKy, xoaDangKy } from "@/lib/dang-ky";
import { usePhien } from "@/lib/phien";
import { useLam } from "@/lib/ui";
import { C, Ch, GhiChu, haptic, Khung, LoiTaiCho, Ma6, NutChinh, NutChu, TieuDe } from "@/lib/ob";

export default function Otp() {
  const [dk, setDk] = useState(layDangKy);
  const [ma, setMa] = useState("");
  const [con, setCon] = useState(60);
  const { vao } = usePhien();
  const { lam, loi, dangChay } = useLam();
  useEffect(() => { const t = setInterval(() => setCon((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (loi) haptic.loi(); }, [loi]);
  if (!dk) { router.replace("/dang-ky"); return null; }
  const xacNhan = (m = ma) => !dangChay && lam(async () => {
    const r = await bm.goi<{ token: string }>("dang-ky", { dinhDanh: dk.dinhDanh, ma: m, ten: dk.ten, matKhau: dk.matKhau });
    haptic.ok();
    xoaDangKy();
    await vao(r.token, true);
  });
  const guiLai = () => lam(async () => {
    const r = await bm.goi<{ guiDen: string; ma?: string }>("otp", { dinhDanh: dk.dinhDanh, mucDich: "dang_ky" });
    const moi = { ...dk, maThu: r.ma }; nhoDangKy(moi); setDk(moi);
    setCon(60);
  });
  return (
    <Khung day={<NutChinh chu="Xác nhận" dangChay={dangChay} tat={ma.length < 6} bam={() => xacNhan()} />}>
      <StatusBar style="auto" />
      <TieuDe tieu="Nhập mã 6 số" loi={`Đã gửi tới ${dk.dinhDanh}.`} />
      <Ma6 gia={ma} doi={setMa} du={xacNhan} />
      <LoiTaiCho loi={loi} />
      <View style={{ alignItems: "center" }}>
        {con > 0 ? <Ch k="subhead" mau={C.chu2} so>{`Gửi lại mã sau 0:${String(con).padStart(2, "0")}`}</Ch> : <NutChu chu="Gửi lại mã" bam={guiLai} />}
      </View>
      <View style={{ gap: 12 }}>
        <GhiChu ic="message.fill" chu="Tin nhắn có mã sẽ tự điền vào ô — không cần chép tay." />
        {dk.maThu ? <GhiChu ic="testtube.2" chu={`Bản thử: mã là ${dk.maThu}. Chưa có kênh gửi tin nhắn thật — mã hiện ở đây để dùng thử.`} mau={C.diem} /> : null}
      </View>
    </Khung>
  );
}
