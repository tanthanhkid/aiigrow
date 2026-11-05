// «Xin Ba Mẹ mở ngoại lệ» (thiết kế 05/11 con-het-gio — L3): lúc giờ ngủ / Ba Mẹ khoá / giờ học (hoặc khi hết giờ mà cần một app gấp).
// Chọn cả máy hoặc một app, bao lâu (15 / 30 / 60 phút — Ba Mẹ đặt tối đa), lời nhắn không bắt buộc ⇒ POST /api/kid/yeu-cau
// {loai: ngoai_le, phamVi: ca_may | app, giaTri?, phut, lyDo?}. Không trừ giờ chơi, không trừ sao. Mất mạng ⇒ lời xin chờ gửi khi có mạng.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { BaoLoi, Canh, ChonMot, Chu, M, Nut, ONhap, useLam } from "@/lib/ui";
import { ManTre, useTre } from "@/lib/ui-tre";
import { kid } from "@/lib/api-tre";

type PhamVi = "ca_may" | "app";
const PHUT = [15, 30, 60];
const TIEU: Record<string, string> = { gio_ngu: "Đang giờ ngủ", ba_me_khoa: "Ba Mẹ đang khoá máy", gio_hoc: "Đang giờ học" };

export default function NgoaiLe() {
  const p = useLocalSearchParams<{ ly?: string; app?: string }>();
  const { ten } = useTre();
  const [phamVi, setPhamVi] = useState<PhamVi>(p.app ? "app" : "ca_may");
  const [app, setApp] = useState(p.app ?? "");
  const [phut, setPhut] = useState(15);
  const [nhan, setNhan] = useState("");
  const { dangChay, loi, lam, setLoi } = useLam();
  const gui = () => (phamVi === "app" && !app.trim() ? setLoi("Ghi tên app con cần mở nhé") : lam(async () => {
    const r = await kid.goi<{ id: string }>("yeu-cau", { loai: "ngoai_le", phamVi, phut, lyDo: nhan.trim(), ...(phamVi === "app" ? { giaTri: app.trim() } : {}) });
    router.replace(`/tre/yeu-cau?moi=${r.id}`);
  }, { hangDoi: true }));
  return (
    <ManTre lui={{ chu: "Quay lại", ve: "/tre/nha" }}
      day={<><BaoLoi loi={loi} /><Nut chu={`Xin Ba Mẹ mở ${phamVi === "app" && app.trim() ? app.trim() : "máy"} ${phut} phút`} ic="gui" rong bam={gui} dangChay={dangChay} /></>}>
      <Canh lv="chi" mau="vang" tieu="Xin Ba Mẹ mở ngoại lệ" loi={`${TIEU[p.ly ?? ""] ? `${TIEU[p.ly!]}. ` : ""}Ba Mẹ đồng ý là ${ten} dùng được ngay — không trừ giờ chơi, không trừ sao.`} thap />
      <View>
        <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>Con cần mở gì?</Chu>
        <ChonMot ds={[{ gia: "ca_may" as PhamVi, chu: "Cả máy" }, { gia: "app" as PhamVi, chu: "Một app" }]} gia={phamVi} doi={setPhamVi} />
      </View>
      {phamVi === "app" ? <ONhap nhan="App nào?" value={app} onChangeText={setApp} placeholder="vd Từ điển, Zoom" autoCapitalize="none" maxLength={60} /> : null}
      <View>
        <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>Bao lâu?</Chu>
        <ChonMot ds={PHUT.map((x) => ({ gia: x, chu: `${x} phút` }))} gia={phut} doi={setPhut} />
      </View>
      <ONhap nhan="Nhắn Ba Mẹ (không bắt buộc)" value={nhan} onChangeText={setNhan} maxLength={100} placeholder="vd con cần tra bài cho mai ạ" />
      <Chu co={13} mau={M.chu3}>Ba Mẹ trả lời là Rob báo con ngay.</Chu>
    </ManTre>
  );
}
