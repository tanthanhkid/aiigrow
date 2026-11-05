// con-chao «Rob chào Ken» (BRD 6.1 bước 7): lần đầu mở — 3 quy tắc bằng hình trong 30 giây, đọc to được, tặng sao chào mừng một lần (05/11: «sao» thay «điểm»).
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { BieuTron, Canh, Chu, Nut, The } from "@/lib/ui";
import { ManTre, coDocTo, docTo, useTre } from "@/lib/ui-tre";
import { kid } from "@/lib/api-tre";

const QUY_TAC = [
  { ic: "sao", mau: "vang", chu: "Làm việc tốt → được sao" },
  { ic: "game", mau: "xanh", chu: "10 sao = 10 phút chơi, hoặc đổi quà" },
  { ic: "tin", mau: "tim", chu: "Muốn thêm giờ? Xin Ba Mẹ" },
] as const;

export default function Chao() {
  const { ten } = useTre();
  const [diem, setDiem] = useState<number | null>(null);
  useEffect(() => {
    kid.goi<{ diemChaoMung: number }>("chao", {}).then((r) => setDiem(r.diemChaoMung)).catch(() => setDiem(0));
  }, []);
  const loi = diem ? `Rob tặng ${ten} ${diem} sao chào mừng!` : "Rob sẽ cùng con làm việc tốt mỗi ngày!";
  return (
    <ManTre day={
      <>
        <Nut chu={diem ? `Nhận ${diem} sao` : "Vào nhà"} loai="vang" ic="qua" rong bam={() => router.replace("/tre/nha")} />
        {coDocTo() ? <Nut chu={`Rob đọc to cho ${ten} nghe`} loai="ma" rong bam={() => docTo(`Chào ${ten}! Mình là Rob. ${loi} ${QUY_TAC.map((q) => q.chu.replace("→", "thì")).join(". ")}.`)} /> : null}
      </>
    }>
      <Canh lv="xong" mau="vang" tieu={`Chào ${ten}! Mình là Rob`} loi={loi} thap />
      <The dem>
        {QUY_TAC.map((q) => (
          <View key={q.chu} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, paddingHorizontal: 2 }}>
            <BieuTron ic={q.ic} mau={q.mau} />
            <Chu kieu="rat" co={15.5} style={{ flex: 1 }}>{q.chu}</Chu>
          </View>
        ))}
      </The>
    </ManTre>
  );
}
