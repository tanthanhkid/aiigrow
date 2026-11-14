// them-mdujxlg2 «Con được dùng app nào?» (thiết kế chốt 04/11): lưới icon app (Grow chọn sẵn theo tuổi, bấm để đổi), ô tìm / «Thêm app»,
// ô «+ Thêm app khác» ⇒ them-at57ypdc. «Cho X dùng N app này» ⇒ lưu (POST thiet-lap) ⇒ Ghép máy. Chỉ gặp ở chế độ «Chặn app & web».
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { luuThietLap, napAppGoiY, type AppGoiY } from "@/lib/ghep-may";
import { Anh3D, DauMan, OApp, OThemApp, TieuDe } from "@/lib/lan-dau";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { coMa, datTl, layTl, type AppChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, Icon3D, M, Man, Nut, The, useLam } from "@/lib/ui";

export default function ChonApp() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [luoi, setLuoi] = useState<AppGoiY[] | null>(null);
  const [apps, setApps] = useState<AppChon[]>(tl.apps ?? []);
  const { lam, loi, dangChay } = useLam();
  useFocusEffect(useCallback(() => {
    setApps(layTl().apps ?? []);
    if (tl.conId) napAppGoiY(tl.conId).then((ds) => { setLuoi(ds); setApps(layTl().apps ?? []); }).catch(() => setLuoi([]));
  }, [tl.conId]));
  const doi = (x: AppChon[]) => { setApps(x); datTl({ apps: x }); };
  const bat = (a: AppGoiY) => doi(apps.some((x) => coMa(x) && x.ma === a.ma) ? apps.filter((x) => !(coMa(x) && x.ma === a.ma)) : [...apps, { ma: a.ma, ten: a.ten }]);
  const rieng = apps.filter((x) => !coMa(x));
  const soRob = (luoi ?? []).filter((a) => a.chon).length;
  const tuoi = tl.namSinh ? new Date().getFullYear() - tl.namSinh : null;
  const luu = () => lam(async () => {
    const con = await luuThietLap();
    router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } });
  }, { hangDoi: true });
  return (
    <Man dau={<DauMan ve="/thiet-lap/gio" phai={<ThanhBuoc5 dang={3} ic="khien" />} />}
      day={<><BaoLoi loi={loi} /><Nut chu={`Cho ${ten} dùng ${apps.length} app này`} rong dangChay={dangChay} bam={luu} /></>}>
      <TieuDe chu="Con được dùng app nào?" />
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40, paddingLeft: 8, paddingRight: 14, borderRadius: 20, backgroundColor: "#dcebe6" }}>
        <Icon3D ten="khoa" co={22} /><Chu kieu="rat" co={13.5} mau={M.chinhInk}>Chặn app & web <Chu kieu="dam" co={12.5} mau={M.chu2}>· đổi ở Giờ chơi</Chu></Chu>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <Pressable onPress={() => router.push("/thiet-lap/them-app")} accessibilityRole="search" style={{ flex: 1, minHeight: 50, borderRadius: 25, backgroundColor: "#e9e8e4", boxShadow: BONG.lom, justifyContent: "center", paddingHorizontal: 18 }}>
          <Chu co={15} mau={M.chu3}>Tìm hoặc gõ tên app</Chu>
        </Pressable>
        <Pressable onPress={() => router.push("/thiet-lap/them-app")} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 50, paddingHorizontal: 14, borderRadius: 25, backgroundColor: "#fff", ...KHOI.nho }}>
          <Icon3D ten="cong" co={22} /><Chu kieu="rat" co={14.5} mau={M.chinhInk}>Thêm app</Chu>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
        <Anh3D ten="lap_lanh" co={22} />
        <Chu kieu="rat" co={14} mau={M.chinhInk}>{`Grow chọn sẵn ${soRob} app hợp tuổi${tuoi ? ` ${tuoi}` : ""} · bấm để đổi`}</Chu>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 28, backgroundColor: "#f7f6f3", ...KHOI.the }}>
        {(luoi ?? []).map((a) => <OApp key={a.ma} ma={a.ma} ten={a.ten} chon={apps.some((x) => coMa(x) && x.ma === a.ma)} bam={() => bat(a)} />)}
        {rieng.map((a) => <OApp key={`r-${a.ten}`} ten={a.ten} chon bam={() => doi(apps.filter((x) => x !== a))} nhanDoc={`${a.ten} — bấm để bỏ`} />)}
        <OThemApp bam={() => router.push("/thiet-lap/them-app")} />
      </View>
      <The>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon3D ten="gui" co={32} />
          <View style={{ flex: 1 }}><Chu kieu="rat" co={14.5}>App mới con tải sẽ xin Ba Mẹ duyệt</Chu><Chu co={12.5} mau={M.chu3}>Sau này đổi ở Trang chủ › App & web</Chu></View>
        </View>
      </The>
    </Man>
  );
}
