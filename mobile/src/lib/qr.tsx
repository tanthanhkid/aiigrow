// Mã QR thật (thư viện qrcode → SVG). Gu Thanh 20/10: ghép bằng QR, mã 6 số chỉ là đường dự phòng.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import QRCode from "qrcode";
import { M } from "./mau";
import { KHOI } from "./clay";

export function MaQr({ noiDung, co = 200 }: { noiDung: string; co?: number }) {
  const [xml, setXml] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toString(noiDung, { type: "svg", margin: 0, color: { dark: M.chu, light: "#ffffff" } }).then(setXml).catch(() => setXml(null));
  }, [noiDung]);
  return (
    <View style={{ width: co, height: co, padding: 12, backgroundColor: "#fff", borderRadius: 24, ...KHOI.the }}
      accessibilityLabel={`Mã QR ${noiDung}`} accessibilityRole="image">
      {xml ? <SvgXml xml={xml} width={co - 26} height={co - 26} /> : null}
    </View>
  );
}
