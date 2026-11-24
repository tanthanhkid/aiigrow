// Mã QR thật (thư viện qrcode → SVG). Gu Thanh 20/10: ghép bằng QR, mã 6 số chỉ là đường dự phòng.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { M } from "./mau";
import { KHOI } from "./clay";

export function MaQr({ noiDung, co = 200 }: { noiDung: string; co?: number }) {
  const [xml, setXml] = useState<string | null>(null);
  useEffect(() => {
    // nạp thư viện lúc cần (#564): không nằm trong gói JS chung của mọi trang web
    let song = true;
    let hen: ReturnType<typeof setTimeout> | undefined;
    const ve = (lan: number) => import("qrcode").then((m) => (m.default ?? m).toString(noiDung, { type: "svg", margin: 0, color: { dark: M.chu, light: "#FFFBF5" } }))
      .then((x) => { if (song) setXml(x); }).catch(() => { if (song) { setXml(null); if (lan < 3) hen = setTimeout(() => ve(lan + 1), 1500 * lan); } });
    ve(1);
    return () => { song = false; if (hen) clearTimeout(hen); };
  }, [noiDung]);
  return (
    <View style={{ width: co, height: co, padding: 12, backgroundColor: "#FFFBF5", borderRadius: 24, ...KHOI.the }}
      accessibilityLabel={`Mã QR ${noiDung}`} accessibilityRole="image">
      {xml ? <SvgXml xml={xml} width={co - 26} height={co - 26} /> : null}
    </View>
  );
}
