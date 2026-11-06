// «Xin cài phần mềm» bản «Dịu» (con-dt-cai 02 cdt-cai, L4): app mới / tệp cài lạ ⇒ «Chỉ app được phép · Minecraft cần Ba Mẹ cho phép»,
// «Con muốn cài để làm gì?» (chip «Học xây nhà» / «Chơi với bạn» + tự viết — không bắt buộc), «Nếu được cho phép: tính vào giờ chơi · còn N phút»,
// «Gửi Ba Mẹ xin cài Minecraft» / «Thôi, để sau». Agent mở `/tre/cai?tep=MinecraftInstaller.exe` hoặc `?ten=Minecraft`.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { TextInput, View } from "react-native";
import { kid, type QuyCon } from "@/lib/api-tre";
import { D, FD } from "@/lib/diu";
import { useLam } from "@/lib/ui";
import { ChuD, IcO, LoiD, ManD, NutD, PillD, TheD, TieuD } from "@/lib/ui-diu";
import { useTaiTre } from "@/lib/ui-tre";

const LY_DO = ["Học xây nhà", "Chơi với bạn"];
/** MinecraftInstaller.exe → Minecraft */
const tenApp = (tep: string) => tep.replace(/\.(exe|msi|apk)$/i, "").replace(/(setup|installer|install|launcher)$/i, "").replace(/[-_.]+$/, "") || tep;

export default function XinCai() {
  const p = useLocalSearchParams<{ tep?: string; ten?: string }>();
  const ten = p.ten || tenApp(p.tep || "App mới");
  const quy = useTaiTre("quy", () => kid.goi<QuyCon>("quy"));
  const [lyDo, setLyDo] = useState<string | null>(null);
  const [tuViet, setTuViet] = useState("");
  const { dangChay, loi, lam } = useLam();
  const xin = () => lam(async () => {
    await kid.goi("yeu-cau", { loai: "cai_app", giaTri: ten, lyDo: [lyDo, tuViet.trim()].filter(Boolean).join(" · ") });
    router.replace("/tre/yeu-cau");
  }, { hangDoi: true });
  const conPhut = quy.d?.quy.conPhut;
  return (
    <ManD lui={true} day={<><LoiD loi={loi} /><NutD chu={`Gửi Ba Mẹ xin cài ${ten}`} ic="gui" bam={xin} dangChay={dangChay} />
      <NutD chu="Thôi, để sau" loai="chu" bam={() => (router.canGoBack() ? router.back() : router.replace("/tre/nha"))} /></>}>
      <View style={{ alignSelf: "flex-start" }}><PillD chu="Chỉ app được phép" ic="khien" /></View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IcO ic="game" co={64} />
        <View style={{ flex: 1 }}>
          <TieuD chu={`${ten} cần`} nho />
          <TieuD chu="Ba Mẹ cho phép" nho />
        </View>
      </View>
      <ChuD kieu="den" co={15}>Con muốn cài để làm gì?</ChuD>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {LY_DO.map((x) => <NutD key={x} chu={x} nho loai={lyDo === x ? "chinh" : "phu"} style={{ flex: 1 }} bam={() => setLyDo(lyDo === x ? null : x)} />)}
      </View>
      <TheD mong>
        <TextInput value={tuViet} onChangeText={setTuViet} maxLength={120} multiline accessibilityLabel="Con viết thêm" placeholder="vd Con xây mô hình trường mình, cô giáo giao."
          placeholderTextColor={D.chu3} style={{ fontFamily: FD.dam, fontSize: 16, color: D.chu, minHeight: 48, padding: 0, textAlignVertical: "top" }} />
      </TheD>
      <TheD mong>
        <ChuD kieu="rat" co={13} mau={D.chu2}>Nếu được cho phép</ChuD>
        <ChuD kieu="rat" co={15}>{`Tính vào giờ chơi${conPhut != null ? ` · còn ${conPhut} phút` : ""}`}</ChuD>
      </TheD>
    </ManD>
  );
}
