// con-win-cai «Chặn file cài đặt» (Teen · Windows, FR-02.03): tệp .exe/.msi lạ không chạy; nói rõ quy tắc, xin phép kèm sẵn tên tệp + lý do.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View, useWindowDimensions } from "react-native";
import { BaoLoi, Chu, M, Nhan, Nut, ONhap, Rob, useLam } from "@/lib/ui";
import { ChipMot, ManTre } from "@/lib/ui-tre";
import { kid } from "@/lib/api-tre";

const LY_DO = ["Để học lập trình", "Bạn rủ chơi"];
const TU_VIET = "__tu_viet";

/** MinecraftInstaller.exe → Minecraft */
const tenApp = (tep: string) => tep.replace(/\.(exe|msi)$/i, "").replace(/(setup|installer|install|launcher)$/i, "").replace(/[-_.]+$/, "") || tep;

export default function ChanCai() {
  const p = useLocalSearchParams<{ tep?: string; ten?: string }>();
  const tep = p.tep || "Tệp cài đặt";
  const ten = p.ten || tenApp(tep);
  const { width } = useWindowDimensions();
  const rong = width >= 760;
  const [lyDo, setLyDo] = useState<string | null>(LY_DO[0]);
  const [tuViet, setTuViet] = useState("");
  const { dangChay, loi, lam, setLoi } = useLam();
  const lyDoGui = lyDo === TU_VIET ? tuViet.trim() : lyDo ?? "";
  const xin = () => (!lyDoGui ? setLoi("Chọn hoặc viết lý do ngắn để Ba Mẹ hiểu nhé") : lam(async () => {
    await kid.goi("yeu-cau", { loai: "cai_app", giaTri: ten, lyDo: lyDoGui });
    router.replace("/tre/yeu-cau");
  }, { hangDoi: true }));
  return (
    <ManTre>
      <View style={{ flexDirection: rong ? "row" : "column", alignItems: "center", gap: rong ? 40 : 12, paddingVertical: rong ? 40 : 8, maxWidth: 980, alignSelf: "center" }}>
        <Rob ten="chi" co={rong ? 320 : 180} />
        <View style={{ flex: rong ? 1 : undefined, gap: 8, alignSelf: "stretch" }}>
          <Nhan chu="Quy tắc: cài phần mềm mới cần Ba Mẹ duyệt" loai="xam" />
          <Chu kieu="rat" co={rong ? 34 : 26} style={{ letterSpacing: -0.6 }}>{`${tep} chưa được cài`}</Chu>
          <Chu co={rong ? 18 : 16} mau={M.chu2}>Gửi yêu cầu kèm lý do. Ba Mẹ duyệt thì bấm lại là cài được.</Chu>
          <View style={{ gap: 8, marginTop: 10, maxWidth: 460 }}>
            <ChipMot nhan="Lý do" ds={[...LY_DO.map((x) => ({ gia: x, chu: x })), { gia: TU_VIET, chu: "Tự viết…" }]} gia={lyDo} doi={setLyDo} />
            {lyDo === TU_VIET ? <ONhap nhan="Lý do của bạn" value={tuViet} onChangeText={setTuViet} maxLength={100} autoFocus /> : null}
            <BaoLoi loi={loi} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Nut chu={`Xin Ba Mẹ cài ${ten}`} bam={xin} dangChay={dangChay} />
              <Nut chu="Huỷ" loai="ma" bam={() => (router.canGoBack() ? router.back() : router.replace("/tre/nha"))} />
            </View>
          </View>
        </View>
      </View>
    </ManTre>
  );
}
