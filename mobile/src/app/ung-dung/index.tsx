// «App của <con>» (thiết kế chốt 15/11 bm-ung-dung/03 them-g7g1cel5 — #262): hai nhóm Tính phút / Không tính phút — lib/ds-con.tsx › DsMucCon.
import { useLocalSearchParams } from "expo-router";
import { DsMucCon } from "@/lib/ds-con";

export default function DsApp() {
  const { con } = useLocalSearchParams<{ con: string }>();
  return <DsMucCon con={con} kieu="app" />;
}
