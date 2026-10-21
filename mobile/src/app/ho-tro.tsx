// bm-ho-tro: chat với AiiLab — NGƯỜI THẬT trả lời (không phải AI); tin tự tải lại mỗi 10 giây khi màn đang mở.
import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { bm } from "@/lib/api";
import { BaoLoi, CanhGiua, ChoTai, Chu, F, gioPhut, Icon, M, Man, Rob, useLam, useTai } from "@/lib/ui";

type Tin = { id: string; tu: "ba_me" | "aiilab"; noi_dung: string; created_at: string };

export default function HoTro() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<{ tin: Tin[] }>("ho-tro"));
  const [nd, setNd] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  useEffect(() => { const t = setInterval(tai, 10_000); return () => clearInterval(t); }, [tai]);
  const gui = () => lam(async () => { await bm.goi("ho-tro", { noiDung: nd }); setNd(""); await tai(); });
  return (
    <Man lui={{ chu: "Quay lại" }} tieu="AiiLab hỗ trợ" day={
      <>
        <BaoLoi loi={loiLam} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderWidth: 1.5, borderColor: M.oNhap, borderRadius: 16, paddingLeft: 14, minHeight: 52 }}>
          <TextInput value={nd} onChangeText={setNd} placeholder="Nhập tin nhắn…" placeholderTextColor={M.chu3} multiline maxLength={1000} accessibilityLabel="Tin nhắn gửi AiiLab"
            style={{ flex: 1, fontFamily: F.thuong, fontSize: 16, color: M.chu, paddingVertical: 12 }} />
          <Pressable onPress={gui} disabled={!nd.trim() || dangChay} accessibilityRole="button" accessibilityLabel="Gửi"
            style={{ width: 44, height: 44, borderRadius: 15, margin: 4, backgroundColor: nd.trim() ? M.chinh : M.chinhSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon ten="gui" mau={nd.trim() ? "#fff" : M.chinhInk} />
          </Pressable>
        </View>
      </>
    }>
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : !d.tin.length ? (
        <CanhGiua lv="rob-goc" tieu="Hỏi AiiLab bất cứ điều gì" loi="Người thật của AiiLab trả lời, thường trong 5 phút." />
      ) : d.tin.map((t) => t.tu === "aiilab" ? (
        <View key={t.id} style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: M.chinhSoft }}><Rob ten="rob-goc" co={44} /></View>
          <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: M.vien, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 22, borderBottomLeftRadius: 6, maxWidth: "78%" }}>
            <Chu>{t.noi_dung}</Chu><Chu co={12} mau={M.chu3}>{gioPhut(t.created_at)}</Chu>
          </View>
        </View>
      ) : (
        <View key={t.id} style={{ alignSelf: "flex-end", backgroundColor: M.chinh, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 22, borderBottomRightRadius: 6, maxWidth: "78%" }}>
          <Chu mau="#fff">{t.noi_dung}</Chu><Chu co={12} mau="#d6f1ec">{gioPhut(t.created_at)}</Chu>
        </View>
      ))}
    </Man>
  );
}
