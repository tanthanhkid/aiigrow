// Nút chuông Thông báo (FR-08.01) — tròn 44, số đỏ = thông báo chưa đọc của Ba/Mẹ này. Tải lại mỗi lần màn chứa nó được mở lại.
import { memo, useCallback, useState } from "react";
import { Text } from "react-native";
import Animated from "react-native-reanimated";
import { BONG, KHOI, MEN } from "./clay";
import { useBat, useKhiTang, useRung } from "./chuyen-dong";
import { router, useFocusEffect } from "expo-router";
import { bm } from "./api";
import { F, Icon3D, M, NhanMen } from "./ui";

/** memo: màn chứa nó vẽ lại (toast, vòng tải) không kéo chuông vẽ lại theo. */
export const ChuongTb = memo(function ChuongTb() {
  const [nap, setSo] = useState<number | null>(null);
  const so = nap ?? 0;
  const { st, rung } = useRung();
  const { st: stSo, bat } = useBat();
  useKhiTang(nap, useCallback(() => { rung(); bat(); }, [rung, bat]));   // có việc mới ⇒ chuông rung (lần tải đầu không rung)
  useFocusEffect(useCallback(() => {
    bm.goi<{ chuaDoc: number }>("thong-bao").then((r) => setSo(r.chuaDoc)).catch(() => {});
  }, []));
  return (
    <NhanMen onPress={() => router.push("/thong-bao")} accessibilityRole="button" accessibilityLabel={so ? `Thông báo, ${so} mới` : "Thông báo"} muc="chip" sang men={MEN.sang}
      style={[{ width: 46, height: 46, borderRadius: 23, backgroundColor: M.the, alignItems: "center", justifyContent: "center" }, KHOI.nho]}>
      <Animated.View style={st}><Icon3D ten="chuong" co={26} /></Animated.View>
      {so ? (
        <Animated.View style={[{ position: "absolute", top: -4, right: -4, backgroundColor: M.huy, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
          alignItems: "center", justifyContent: "center", boxShadow: BONG.do }, stSo]}>
          <Text style={{ fontFamily: F.rat, fontSize: 11, color: "#fff" }}>{so > 99 ? "99+" : so}</Text>
        </Animated.View>
      ) : null}
    </NhanMen>
  );
});
