// «Thêm trang web cho <con>» (thiết kế chốt bm-ung-dung/06): Rob «Gõ địa chỉ trang web Ba Mẹ muốn cho phép», ô gõ, «Hoặc chọn nhanh»,
// «Trang này tính thế nào?» (Không tính giờ / Tính vào giờ chơi), «Web người lớn, cờ bạc, bạo lực luôn bị chặn», nút «Cho phép trang này».
// Không tính giờ ⇒ POST con/:id/web/trang {trangThai: cho_phep}; Tính vào giờ chơi ⇒ POST luat {con, muc, loai: giai_tri}. Trang luôn chặn ⇒ 409 web_cam.
import { useState } from "react";
import { TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { bm, type ConChiTiet } from "@/lib/api";
import { MucTieu, RobNoi, veHoac } from "@/lib/ui-bm3";
import { BONG } from "@/lib/clay";
import { BaoLoi, ChonMot, Chips, Chu, F, M, Man, Nut, useLam, useTai } from "@/lib/ui";

const NHANH = ["khanacademy.org", "scratch.mit.edu", "youtube.com"];
const tenMien = (t: string) => t.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#\s]/)[0];

export default function ThemWeb() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const ten = useTai(() => bm.goi<ConChiTiet>(`con/${con}`)).d?.ten ?? "con";
  const [go, setGo] = useState("");
  const [tinh, setTinh] = useState<"khong" | "co">("khong");
  const { lam, loi, dangChay } = useLam();
  const muc = tenMien(go);
  const hop = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(muc);
  const ve = () => veHoac(`/web/${con}`);
  const luu = () => lam(async () => {
    if (tinh === "co") await bm.goi("luat", { con, muc, loai: "giai_tri" });
    else await bm.goi(`con/${con}/web/trang`, { muc, trangThai: "cho_phep" });
    ve();
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`Thêm trang web cho ${ten}`} day={<>
      <BaoLoi loi={loi} />
      <Nut chu="Cho phép trang này" rong dangChay={dangChay} tat={!hop} bam={luu} />
    </>}>
      <RobNoi>Gõ địa chỉ trang web Ba Mẹ muốn cho phép.</RobNoi>
      <View style={{ minHeight: 56, borderRadius: 22, backgroundColor: M.xamSoft, boxShadow: BONG.lom, paddingHorizontal: 18, justifyContent: "center" }}>
        <TextInput value={go} onChangeText={setGo} placeholder="vuihoc.vn" placeholderTextColor={M.chu3} autoCapitalize="none" autoCorrect={false} keyboardType="url"
          accessibilityLabel="Địa chỉ trang web" style={{ fontFamily: F.dam, fontSize: 16, color: M.chu, paddingVertical: 14 }} />
      </View>
      <MucTieu chu="Hoặc chọn nhanh" />
      <Chips ds={NHANH.map((x) => ({ gia: x, chu: x }))} chon={hop ? [muc] : []} doi={setGo} />
      <MucTieu chu="Trang này tính thế nào?" />
      <ChonMot ds={[{ gia: "khong" as const, chu: "Không tính giờ" }, { gia: "co" as const, chu: "Tính vào giờ chơi" }]} gia={tinh} doi={setTinh} />
      <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ textAlign: "center", marginTop: 4 }}>Web người lớn, cờ bạc, bạo lực luôn bị chặn.</Chu>
    </Man>
  );
}
