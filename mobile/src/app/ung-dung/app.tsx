// Một app trong danh sách (thiết kế chốt 15/11 bm-ung-dung/05 bm2-app-web — #262): «Roblox có tính phút không?», «Lưu: Roblox tính phút»,
// «Bỏ Roblox khỏi danh sách» — lib/ds-con.tsx › MotMuc. `muc` = định danh khi app chưa có trong danh sách (thẻ «app mới» ⇒ thêm mới).
import { useLocalSearchParams } from "expo-router";
import { MotMuc } from "@/lib/ds-con";

export default function MotApp() {
  const ts = useLocalSearchParams<{ con: string; ten?: string; muc?: string }>();
  return <MotMuc con={ts.con} kieu="app" ten={ts.ten || ts.muc || "App"} muc={ts.muc} />;
}
