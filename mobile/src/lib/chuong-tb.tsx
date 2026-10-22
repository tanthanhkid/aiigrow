// Nút chuông Thông báo (FR-08.01) — tròn 44, số đỏ = thông báo chưa đọc của Ba/Mẹ này. Tải lại mỗi lần màn chứa nó được mở lại.
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { bm } from "./api";
import { F, Icon, M } from "./ui";

export function ChuongTb() {
  const [so, setSo] = useState(0);
  useFocusEffect(useCallback(() => {
    bm.goi<{ chuaDoc: number }>("thong-bao").then((r) => setSo(r.chuaDoc)).catch(() => {});
  }, []));
  return (
    <Pressable onPress={() => router.push("/thong-bao")} accessibilityRole="button" accessibilityLabel={so ? `Thông báo, ${so} mới` : "Thông báo"}
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: M.vien2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
      <Icon ten="chuong" mau={M.chu2} />
      {so ? (
        <View style={{ position: "absolute", top: -4, right: -4, backgroundColor: M.huy, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.rat, fontSize: 11, color: "#fff" }}>{so > 99 ? "99+" : so}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
