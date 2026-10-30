// bm-ob-may (bước 2/5) — biến thể appllama: Con dùng máy nào. Danh sách chọn một kiểu Cài đặt iOS (dấu ✓ bên phải, highlight khi nhấn,
// haptic selection), không vẽ lại nút radio. Đây là gốc ngăn xếp sau khi tạo Con (không có nút lùi về form).
import { useState } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { datTl, layTl } from "@/lib/thiet-lap";
import { haptic, Hang, Khung, Nhom, NutChinh, OIcon, TienDo, TieuDe } from "@/lib/ob";

const MAY = [
  { nen: "windows", ic: "laptopcomputer", tieu: "Laptop Windows", phu: "Bảo vệ toàn diện · chặn app, web, cài đặt" },
  { nen: "ios", ic: "ipad.and.iphone", tieu: "iPad / iPhone", phu: "Theo mức Apple cho phép · Screen Time" },
  { nen: "android", ic: "smartphone", tieu: "Điện thoại Android", phu: "Toàn diện khi cấp đủ quyền" },
  { nen: "mac", ic: "desktopcomputer", tieu: "MacBook / iMac", phu: "Cần cấp quyền bộ lọc nội dung" },
] as const;

export default function ObMay() {
  const [nen, setNen] = useState<(typeof MAY)[number]["nen"]>("windows");
  const ten = layTl().tenCon ?? "Con";
  return (
    <Khung dau={<TienDo n={2} tong={5} />} day={<NutChinh chu="Tiếp" bam={() => { datTl({ nen }); router.push("/thiet-lap/ghep"); }} />}>
      <StatusBar style="auto" />
      <TieuDe tieu={`${ten} dùng máy nào?`} loi="Mỗi máy một cách bảo vệ — Rob dẫn từng bước." />
      <Nhom>
        {MAY.map((m) => <Hang key={m.nen} chon={nen === m.nen} bam={() => { if (nen !== m.nen) haptic.chon(); setNen(m.nen); }} trai={<OIcon ten={m.ic} />} tieu={m.tieu} phu={m.phu} />)}
      </Nhom>
    </Khung>
  );
}
