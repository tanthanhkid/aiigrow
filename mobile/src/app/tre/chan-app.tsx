// «<App> chưa có trong danh sách» bản «Dịu» (con-dt-gio 08 them-4e5fwl16, App & web 15/11 #262): «Máy chỉ mở app Ba Mẹ đã thêm vào danh sách.»,
// nhãn «Theo danh sách của Ba Mẹ», «Xin Ba Mẹ mở <App>» một chạm (POST /api/kid/xin-duyet {muc, ten?, lyDo?} = xin thêm vào danh sách), «Về trang
// chính». Máy chủ cũ còn trả `web_cam` ⇒ guiXinMo đổi thành «Ba Mẹ chưa thêm … lúc này» (không còn màn cấm cứng).
// Link sâu: /tre/chan-app?muc=<định danh>&ten=<tên đẹp>.
// 24/11 (#572): hiện chưa agent nào mở màn này (agent-android chỉ cho DUONG_TRE trong HocVien.kt; win/mac/iOS vẽ màn riêng) — giữ làm màn theo Bàn, mở bằng link sâu; có kịch bản trong pha-tre.mjs.
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { guiXinMo, tenMuc } from "@/lib/api-tre";
import { useLam } from "@/lib/ui";
import { CamXuc, LoiD, ManD, NutD, PillD } from "@/lib/ui-diu";
import { ChanMan } from "@/lib/man-con";
import { useTre } from "@/lib/ui-tre";

export default function ChanApp() {
  const p = useLocalSearchParams<{ muc?: string; ten?: string }>();
  const { ten } = useTre();
  const muc = (p.muc ?? "").trim();
  const tenApp = muc ? tenMuc(muc, p.ten) : p.ten || "App này";
  const { dangChay, loi, lam } = useLam();
  const xin = () => lam(async () => {
    const r = await guiXinMo({ loai: "cai_app", muc: muc || tenApp, ten: tenApp });
    router.replace(`/tre/yeu-cau?moi=${r.id}`);
  }, { hangDoi: true });
  return (
    <ManD giua day={<><LoiD loi={loi} /><NutD chu={`Xin Ba Mẹ mở ${tenApp}`} ic="tin" bam={xin} dangChay={dangChay} />
      <NutD chu="Về trang chính" loai="chu" bam={() => router.replace("/tre/nha")} />
      <ChanMan chu={`AiiGrow · ${ten} · Ba Mẹ quản lý`} /></>}>
      <CamXuc lv="chi" co={140} tieu={`${tenApp} chưa có trong danh sách`} phu="Máy chỉ mở app Ba Mẹ đã thêm vào danh sách." />
      <View style={{ alignSelf: "center" }}><PillD chu="Theo danh sách của Ba Mẹ" ic="khien" /></View>
    </ManD>
  );
}
