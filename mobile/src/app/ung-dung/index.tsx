// «App của <con>» (bàn bm-ung-dung them-g7g1cel5@v7 — #262): hai nhóm Tính phút / Không tính phút — lib/ds-con.tsx › DsMucCon.
import { useLocalSearchParams } from "expo-router";
import { DsMucCon } from "@/lib/ds-con";

export default function DsApp() {
  const { con } = useLocalSearchParams<{ con: string }>();
  return <DsMucCon con={con} kieu="app" />;
}
