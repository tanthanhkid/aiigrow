// bm-ho-tro: chat với AiiLab — NGƯỜI THẬT trả lời (không phải AI); tin tự tải lại mỗi 10 giây khi màn đang mở.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { BaoLoi, BongChat, CanhGiua, ChoTai, gioPhut, M, Man, OChat, Rob, useLam, useTai } from "@/lib/ui";

type Tin = { id: string; tu: "ba_me" | "aiilab"; noi_dung: string; created_at: string };

export default function HoTro() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<{ tin: Tin[] }>("ho-tro"));
  const [nd, setNd] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  useEffect(() => { const t = setInterval(tai, 10_000); return () => clearInterval(t); }, [tai]);
  const gui = () => lam(async () => { await bm.goi("ho-tro", { noiDung: nd }); setNd(""); await tai(); });
  return (
    <Man lui={{ chu: "Quay lại" }} tieu="AiiLab hỗ trợ" cuonCuoi day={
      <>
        <BaoLoi loi={loiLam} />
        <OChat gia={nd} doi={setNd} gui={gui} dangChay={dangChay} nhan="Tin nhắn gửi AiiLab" />
      </>
    }>
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : !d.tin.length ? (
        <CanhGiua lv="rob-goc" tieu="Hỏi AiiLab bất cứ điều gì" loi="Người thật của AiiLab trả lời, thường trong 5 phút." />
      ) : d.tin.map((t) => t.tu === "aiilab" ? (
        <View key={t.id} style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: M.chinhSoft }, KHOI.nho]}><View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden" }}><Rob ten="rob-goc" co={44} /></View></View>
          <BongChat noiDung={t.noi_dung} luc={gioPhut(t.created_at)} />
        </View>
      ) : <BongChat key={t.id} toi noiDung={t.noi_dung} luc={gioPhut(t.created_at)} />)}
    </Man>
  );
}
