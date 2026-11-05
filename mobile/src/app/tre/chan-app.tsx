// «<App> chưa được mở» (thiết kế 05/11 con-bi-chan, L4): máy chỉ mở app Ba Mẹ cho phép (chế độ «Chỉ app được phép») — app lạ ⇒ Con
// «Xin Ba Mẹ mở <App>» một chạm (POST /api/kid/xin-duyet {muc, ten?, lyDo?} — lời nhắn không bắt buộc, không dùng sao để mở app).
// Agent / link sâu mở: /tre/chan-app?muc=<định danh>&ten=<tên đẹp>.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { BaoLoi, CanhGiua, Chu, M, Nut, ONhap, useLam, useTai } from "@/lib/ui";
import { ManTre, useTre } from "@/lib/ui-tre";
import { kid, laMaApp, tenMuc, type TroChoi } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

export default function ChanApp() {
  const p = useLocalSearchParams<{ muc?: string; ten?: string }>();
  const { ten } = useTre();
  const muc = (p.muc ?? "").trim();
  const tenApp = muc ? tenMuc(muc, p.ten) : p.ten || "App này";
  const duoc = useTai(() => kid.goi<{ ds: TroChoi[] }>("tro-choi").catch(() => ({ ds: [] as TroChoi[] })));
  const [nhan, setNhan] = useState("");
  const [cam, setCam] = useState(false);
  const { dangChay, loi, lam } = useLam();
  const xin = () => lam(async () => {
    try {
      // mã app thật (roblox.exe, com.google.android.youtube) ⇒ xin-duyet; tên trần ⇒ yeu-cau cai_app (xin-duyet hiểu tên trần là tên miền)
      const r = muc && laMaApp(muc)
        ? await kid.goi<{ id: string }>("xin-duyet", { muc, ten: tenApp, lyDo: nhan.trim() })
        : await kid.goi<{ id: string }>("yeu-cau", { loai: "cai_app", giaTri: tenApp, lyDo: nhan.trim() });
      router.replace(`/tre/yeu-cau?moi=${r.id}`);
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "web_cam") { setCam(true); return; }
      throw e;
    }
  }, { hangDoi: true });
  if (cam) {
    return (
      <ManTre>
        <CanhGiua lv="trong-loi" tieu={`${tenApp} luôn bị chặn`} loi={`AiiGrow chặn trang này để an toàn cho ${ten}.`}>
          <Nut chu="Về Hôm nay" bam={() => router.replace("/tre/nha")} />
        </CanhGiua>
      </ManTre>
    );
  }
  // một app có nhiều định danh (exe / bundle / gói / tên miền) ⇒ gộp theo tên, không lặp «Minecraft, Minecraft…»
  const ds = [...new Set((duoc.d?.ds ?? []).map((x) => tenMuc(x.muc, x.ten)))];
  return (
    <ManTre>
      <CanhGiua lv="chi" tieu={`${tenApp} chưa được mở`} loi="Máy chỉ mở app Ba Mẹ cho phép.">
        {ds.length ? <Chu co={14} mau={M.chu2} style={{ textAlign: "center" }}>{`${ten} đang dùng được ${ds.length} app: ${ds.slice(0, 6).join(", ")}`}</Chu> : null}
        <View style={{ alignSelf: "stretch", gap: 8 }}>
          <ONhap nhan="Nhắn Ba Mẹ (không bắt buộc)" value={nhan} onChangeText={setNhan} maxLength={100} placeholder="vd con xem video vẽ tranh ạ" />
          <BaoLoi loi={loi} />
        </View>
        <Nut chu={`Xin Ba Mẹ mở ${tenApp}`} ic="tin" bam={xin} dangChay={dangChay} />
        <Nut chu="Về Hôm nay" loai="ma" bam={() => router.replace("/tre/nha")} />
      </CanhGiua>
    </ManTre>
  );
}
