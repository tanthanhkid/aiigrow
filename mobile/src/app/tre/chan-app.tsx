// «<App> chưa có trong danh sách» bản «Dịu» (con-dt-gio 08 them-4e5fwl16, App & web 15/11 #262): «Máy chỉ mở app Ba Mẹ đã thêm vào danh sách.»,
// nhãn «Theo danh sách của Ba Mẹ», «Xin Ba Mẹ mở <App>» một chạm (POST /api/kid/xin-duyet {muc, ten?, lyDo?} = xin thêm vào danh sách), «Về trang
// chính». Mục trong lưới an toàn (web người lớn / cờ bạc) ⇒ «luôn bị chặn».
// Agent / link sâu mở: /tre/chan-app?muc=<định danh>&ten=<tên đẹp>.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { LoiApi } from "@/lib/api";
import { kid, laMaApp, tenMuc } from "@/lib/api-tre";
import { useLam } from "@/lib/ui";
import { CamXuc, LoiD, ManD, NutD, PillD } from "@/lib/ui-diu";
import { ChanMan } from "@/lib/man-con";
import { useTre } from "@/lib/ui-tre";

export default function ChanApp() {
  const p = useLocalSearchParams<{ muc?: string; ten?: string }>();
  const { ten } = useTre();
  const muc = (p.muc ?? "").trim();
  const tenApp = muc ? tenMuc(muc, p.ten) : p.ten || "App này";
  const [cam, setCam] = useState(false);
  const { dangChay, loi, lam } = useLam();
  const xin = () => lam(async () => {
    try {
      // mã app thật (roblox.exe, com.google.android.youtube) ⇒ xin-duyet; tên trần ⇒ yeu-cau cai_app (xin-duyet hiểu tên trần là tên miền)
      const r = muc && laMaApp(muc)
        ? await kid.goi<{ id: string }>("xin-duyet", { muc, ten: tenApp, lyDo: "" })
        : await kid.goi<{ id: string }>("yeu-cau", { loai: "cai_app", giaTri: tenApp, lyDo: "" });
      router.replace(`/tre/yeu-cau?moi=${r.id}`);
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "web_cam") { setCam(true); return; }
      throw e;
    }
  }, { hangDoi: true });
  if (cam) {
    return (
      <ManD giua day={<NutD chu="Về trang chính" bam={() => router.replace("/tre/nha")} />}>
        <CamXuc lv="trong-loi" co={140} tieu={`${tenApp} luôn bị chặn`} phu={"AiiGrow luôn chặn trang này.\nKhông xin mở được."} />
      </ManD>
    );
  }
  return (
    <ManD giua day={<><LoiD loi={loi} /><NutD chu={`Xin Ba Mẹ mở ${tenApp}`} ic="tin" bam={xin} dangChay={dangChay} />
      <NutD chu="Về trang chính" loai="chu" bam={() => router.replace("/tre/nha")} />
      <ChanMan chu={`AiiGrow · ${ten} · Ba Mẹ quản lý`} /></>}>
      <CamXuc lv="chi" co={140} tieu={`${tenApp} chưa có trong danh sách`} phu="Máy chỉ mở app Ba Mẹ đã thêm vào danh sách." />
      <View style={{ alignSelf: "center" }}><PillD chu="Theo danh sách của Ba Mẹ" ic="khien" /></View>
    </ManD>
  );
}
