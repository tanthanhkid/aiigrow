// Một trang web trong danh sách (thiết kế chốt 15/11 bm-ung-dung/08 them-2nupeqju — #262): «youtube.com có tính phút không?», «Lưu: … tính phút»,
// «Bỏ … khỏi danh sách» — lib/ds-con.tsx › MotMuc.
import { useLocalSearchParams } from "expo-router";
import { MotMuc } from "@/lib/ds-con";

export default function TrangWeb() {
  const { con, ten, muc } = useLocalSearchParams<{ con: string; ten?: string; muc?: string }>();
  return <MotMuc con={con} kieu="web" ten={ten || muc || "Trang web"} muc={muc} />;
}
