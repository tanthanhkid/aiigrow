// «Xin Ba Mẹ mở ngoại lệ» bản «Dịu» (L3): lúc giờ ngủ / Ba Mẹ khoá / giờ học. Cả máy hoặc một app, 15 / 30 / 60 phút (Ba Mẹ đặt tối đa),
// lời nhắn không bắt buộc ⇒ POST /api/kid/yeu-cau {loai: ngoai_le, phamVi, giaTri?, phut, lyDo?}. Không trừ giờ chơi, không trừ sao.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { TextInput } from "react-native";
import { kid } from "@/lib/api-tre";
import { D, FD } from "@/lib/diu";
import { useLam } from "@/lib/ui";
import { ChonD, ChuD, LoiD, ManD, NutD, TheD } from "@/lib/ui-diu";

type PhamVi = "ca_may" | "app";
const PHUT = [15, 30, 60];
const TIEU: Record<string, string> = { gio_ngu: "Đang giờ ngủ", ba_me_khoa: "Ba Mẹ đang khoá máy", gio_hoc: "Đang giờ học" };

export default function NgoaiLe() {
  const p = useLocalSearchParams<{ ly?: string; app?: string }>();
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
    <ManD lui={true} tieu="Xin Ba Mẹ mở" day={<><LoiD loi={loi} />
      <NutD chu={`Xin Ba Mẹ mở ${phamVi === "app" && app.trim() ? app.trim() : "máy"} ${phut} phút`} ic="gui" bam={gui} dangChay={dangChay} /></>}>
      <ChuD co={15} mau={D.chu2}>{`${TIEU[p.ly ?? ""] ? `${TIEU[p.ly!]}. ` : ""}Ba Mẹ đồng ý là con dùng được ngay — không trừ giờ chơi, không trừ sao.`}</ChuD>
      <ChuD kieu="den" co={15}>Con cần mở gì?</ChuD>
      <ChonD nhan="Con cần mở gì" ds={[{ gia: "ca_may" as PhamVi, chu: "Cả máy" }, { gia: "app" as PhamVi, chu: "Một app" }]} gia={phamVi} doi={setPhamVi} />
      {phamVi === "app" ? (
        <TheD mong>
          <ChuD kieu="rat" co={13} mau={D.chu2}>App nào?</ChuD>
          <TextInput value={app} onChangeText={setApp} autoCapitalize="none" maxLength={60} accessibilityLabel="App nào" placeholder="vd Từ điển, Zoom"
            placeholderTextColor={D.chu3} style={{ fontFamily: FD.rat, fontSize: 17, color: D.chu, minHeight: 30, padding: 0 }} />
        </TheD>
      ) : null}
      <ChuD kieu="den" co={15}>Bao lâu?</ChuD>
      <ChonD nhan="Bao lâu" ds={PHUT.map((x) => ({ gia: x, chu: `${x} phút` }))} gia={phut} doi={setPhut} />
      <TheD mong>
        <ChuD kieu="rat" co={13} mau={D.chu2}>Nhắn Ba Mẹ (không bắt buộc)</ChuD>
        <TextInput value={nhan} onChangeText={setNhan} maxLength={100} accessibilityLabel="Nhắn Ba Mẹ" placeholder="vd con cần tra bài cho mai ạ"
          placeholderTextColor={D.chu3} style={{ fontFamily: FD.dam, fontSize: 16, color: D.chu, minHeight: 28, padding: 0 }} />
      </TheD>
    </ManD>
  );
}
