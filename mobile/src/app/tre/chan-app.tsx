// «<App> chưa mở» bản «Dịu» (con-dt-gio 08 them-4e5fwl16, L4): «Ba Mẹ chưa cho phép app này.», nhãn «Chặn app & web», «Xin Ba Mẹ mở <App>»
// một chạm (POST /api/kid/xin-duyet {muc, ten?, lyDo?} — không dùng sao để mở app), «Về trang chính». Web cờ bạc / người lớn ⇒ «luôn bị chặn».
// Agent / link sâu mở: /tre/chan-app?muc=<định danh>&ten=<tên đẹp>.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { LoiApi } from "@/lib/api";
import { kid, laMaApp, tenMuc } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { useLam } from "@/lib/ui";
import { CamXuc, ChuD, LoiD, ManD, NutD, PillD } from "@/lib/ui-diu";
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
      <CamXuc lv="chi" co={140} tieu={`${tenApp} chưa mở`} phu="Ba Mẹ chưa cho phép app này." />
      <View style={{ alignSelf: "center" }}><PillD chu="Chặn app & web" ic="khien" /></View>
      <ChuD co={13.5} mau={D.chu2} giua>Không dùng sao để mở app — xin Ba Mẹ là được.</ChuD>
    </ManD>
  );
}
