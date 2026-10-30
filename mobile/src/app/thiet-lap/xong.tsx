// bm-ob-xong — biến thể appllama: thiết lập xong. Khoảnh khắc hiếm, một lần ⇒ được một chuyển động «delight» duy nhất của luồng
// (Rob vào từ scale 0.95 + mờ, ease-out 280 ms; Reduce Motion ⇒ chỉ mờ). Không có nút lùi; «Vào Trang chủ» = dismissAll + replace
// (cửa một chiều: vuốt lùi từ Trang chủ không quay lại trình thiết lập).
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, ScrollView, View } from "react-native";
import Animated, { Easing, FadeIn, Keyframe, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bm, type ConChiTiet } from "@/lib/api";
import { layTl } from "@/lib/thiet-lap";
import { useTai } from "@/lib/ui";
import { C, Ch, GhiChu, Hang, Nhom, NutChinh, NutChu, Sym } from "@/lib/ob";

const MO = Easing.bezier(0.23, 1, 0.32, 1);
/** vào từ scale 0.95 + mờ (không bao giờ từ scale 0), ease-out mạnh, 280 ms */
const VAO = new Keyframe({ 0: { opacity: 0, transform: [{ scale: 0.95 }] }, 100: { opacity: 1, transform: [{ scale: 1 }], easing: MO } }).duration(280);

export default function ObXong() {
  const tl = layTl();
  const ins = useSafeAreaInsets();
  const giam = useReducedMotion();
  const { d } = useTai(() => (tl.conId ? bm.goi<ConChiTiet>(`con/${tl.conId}`) : Promise.resolve(null)));
  const ten = d?.ten ?? tl.tenCon ?? "Con";
  const may = d?.may.filter((m) => !m.dungChung) ?? [];
  const thieu = may.filter((m) => m.baoVe !== "day_du");
  const vao = () => { if (router.canDismiss()) router.dismissAll(); router.replace("/hom-nay"); };
  const ok = <Sym ten="checkmark.circle.fill" co={22} />;
  return (
    <View style={{ flex: 1, backgroundColor: C.nen }}>
      <StatusBar style="auto" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: ins.top + 16, paddingBottom: 24, gap: 24 }}>
        <Animated.Image entering={giam ? FadeIn.duration(200) : VAO}
          source={require("../../../assets/linh-vat/xong.webp")} style={{ width: 168, height: 168, alignSelf: "center" }} resizeMode="contain"
          accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <View style={{ gap: 8 }}>
          <Ch k="largeTitle" style={{ textAlign: "center" }}>Xong rồi!</Ch>
          <Ch k="body" mau={C.chu2} style={{ textAlign: "center" }}>{may.length ? `Máy của ${ten} đã được ghép.` : `Hồ sơ ${ten} đã sẵn sàng.`}</Ch>
        </View>
        {tl.conId && !d ? <ActivityIndicator style={{ marginTop: 24 }} /> : (
          <Nhom>
            <Hang trai={ok} tieu={`Hồ sơ ${ten}`} phu={`Nhóm ${(d?.nhom ?? tl.nhom) === "teen" ? "Teen" : "Nhí"}`} />
            {may.map((m) => <Hang key={m.id} trai={m.baoVe === "day_du" ? ok : <Sym ten="exclamationmark.triangle.fill" co={22} mau={C.diem} />} tieu={m.ten}
              phu={m.baoVe === "day_du" ? "Bảo vệ đầy đủ" : "Bảo vệ chưa đủ"} />)}
            {!may.length ? <Hang trai={<Sym ten="circle.dashed" co={22} mau={C.chu3} />} tieu="Chưa ghép máy nào" phu="Ghép sau ở hồ sơ Con" /> : null}
            <Hang trai={ok} tieu="Nhiệm vụ & phần thưởng" phu="Theo mẫu" />
            {d ? <Hang trai={ok} tieu={`Giờ chơi ${d.lich.ngayThuong[0]?.tu ?? "—"}–${d.lich.ngayThuong[0]?.den ?? "—"}`} phu={`Trần ${d.thamSo.tran_ngay} phút/ngày`} /> : null}
          </Nhom>
        )}
        {thieu.map((m) => <GhiChu key={m.id} ic="exclamationmark.triangle.fill" mau={C.diem} chu={`${m.ten} còn thiếu quyền cần cấp. ${m.nen === "windows" ? "Mở khay AiiGrow trên máy đó (đăng nhập tài khoản Windows của Con) để cấp nốt quyền bảo vệ." : "Mở AiiGrow trên máy đó để cấp nốt quyền bảo vệ."}`} />)}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(ins.bottom, 16), gap: 4 }}>
        <NutChinh chu="Vào Trang chủ" bam={vao} />
        <NutChu chu="Chat với AiiLab nếu cần giúp" bam={() => router.push("/ho-tro")} />
      </View>
    </View>
  );
}
