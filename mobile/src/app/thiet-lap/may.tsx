// bm-ob-may (bước 2/5): Con dùng máy nào — mỗi máy một cách bảo vệ.
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BieuTron, Buoc, Canh, Man, Nut, OChon } from "@/lib/ui";

const MAY = [
  { nen: "windows", ic: "may_tinh", mau: "xanh", tieu: "Laptop Windows", phu: "Bảo vệ toàn diện · chặn app, web, cài đặt" },
  { nen: "ios", ic: "tablet", mau: "lam", tieu: "iPad / iPhone", phu: "Theo mức Apple cho phép · Screen Time" },
  { nen: "android", ic: "dt", mau: "tim", tieu: "Điện thoại Android", phu: "Toàn diện khi cấp đủ quyền" },
  { nen: "mac", ic: "laptop", mau: "cam", tieu: "MacBook / iMac", phu: "Cần cấp quyền bộ lọc nội dung" },
] as const;

export default function ObMay() {
  const [nen, setNen] = useState<(typeof MAY)[number]["nen"]>("windows");
  const ten = layTl().tenCon ?? "Con";
  return (
    <Man dau={<Buoc n={2} tong={5} nhan="Bước 2/5 · Thiết bị" />}
      day={<Nut chu="Tiếp: ghép máy" rong bam={() => { datTl({ nen }); router.push("/thiet-lap/ghep"); }} />}>
      <Canh lv="chi" thap tieu={`${ten} dùng máy nào?`} loi="Mỗi máy một cách bảo vệ — Rob dẫn từng bước." />
      <View style={{ gap: 10 }}>
        {MAY.map((m) => <OChon key={m.nen} chon={nen === m.nen} bam={() => setNen(m.nen)} trai={<BieuTron ic={m.ic} mau={m.mau} />} tieu={m.tieu} phu={m.phu} />)}
      </View>
    </Man>
  );
}
