// «Web của <con>» (bàn bm-ung-dung bm2-web@v15 — #262): lời xin đang chờ, hai nhóm Tính phút / Không tính phút, «Đã bỏ qua N lời xin»
// — lib/ds-con.tsx › DsMucCon.
import { useLocalSearchParams } from "expo-router";
import { DsMucCon } from "@/lib/ds-con";

export default function WebCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  return <DsMucCon con={con} kieu="web" />;
}
