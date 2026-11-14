// Đường cũ «App & web» (Trang chủ, Hồ sơ con, Máy, Lời xin, Thời gian màn hình… còn trỏ tới đây). Thiết kế 14/11 (N1): màn này thành tab «Chặn»
// ⇒ chuyển thẳng sang tab, giữ con đang xem. `?xep=<muc>&ten=` (thẻ «app mới» ở Trang chủ) ⇒ mở thẳng màn chọn đèn của app đó.
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { ChoTai, Man } from "@/lib/ui";

export default function AppWeb() {
  const ts = useLocalSearchParams<{ con?: string; xep?: string; ten?: string }>();
  useEffect(() => {
    if (!ts.xep) { router.replace({ pathname: "/chan", params: ts.con ? { con: ts.con } : {} }); return; }
    // app mới của cả nhà (không kèm con) ⇒ luật cả nhà, như luồng xếp loại cũ
    const di = (con: string) => router.replace({ pathname: "/ung-dung/app", params: { con, muc: ts.xep!, ten: ts.ten ?? ts.xep!, ...(ts.con ? {} : { caNha: "1" }) } });
    if (ts.con) di(ts.con);
    else bm.goi<GiaDinh>("gia-dinh").then((g) => (g.con[0] ? di(g.con[0].id) : router.replace("/chan")), () => router.replace("/chan"));
  }, [ts.con, ts.xep, ts.ten]);
  return <Man lui={{ chu: "" }} tieu="Chặn"><ChoTai tai={() => router.replace("/chan")} /></Man>;
}
