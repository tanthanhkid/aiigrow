// «<Con> đang xin phép» — một lời xin app / web (bàn bm-ung-dung khuôn them-a4nqjrmp@v17, luồng #258 · #490): thẻ xin DÙNG CHUNG với tab App & web và danh sách
// App / Web (lib/hom-nay-xin › TheXin dangXin truc): icon · tên · «máy · con đang chờ» · giờ; ô lõm lời con; «Tính phút» (vàng kim) | «Không tính phút» ngang nhau,
// «Bỏ qua» chữ nhỏ ≥ 44. Tính phút / Không tính phút ⇒ POST yeu-cau/:id/dong-y ⇒ màn «Đã thêm …» (/yeu-cau/xong); Bỏ qua ⇒ POST yeu-cau/:id/bo-qua (hoàn tác 60 giây).
// Người trông giúp cũng trả lời được (quyen.ts › trongGiupDuoc).
import { useLocalSearchParams } from "expo-router";
import { bm, laChiXem, tenYc, type ConChiTiet, type YeuCau } from "@/lib/api";
import type { YeuCauMoi } from "@/lib/hang-ngay";
import { boQuaAppWeb, choAppWeb, denXong, TheXin } from "@/lib/hom-nay-xin";
import { veHoac } from "@/lib/ui-bm3";
import { Pressable, View } from "react-native";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { Avt, BaoLoi, ChoTai, Chu, Icon, Icon3D, M, Man, The, gioPhut, useLam, useTai } from "@/lib/ui";
import { mauCon } from "@/lib/hang-ngay";

type Yc = YeuCau & { device_id?: string | null };

export default function YeuCauWeb() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cd, xem] = await Promise.all([bm.goi<{ yeuCau: Yc[] }>("cho-duyet"), laChiXem()]);
    const y = cd.yeuCau.find((x) => x.id === id) ?? null;
    const ct = y ? await bm.goi<ConChiTiet>(`con/${y.child_id}`).catch(() => null) : null;
    return { y, ct, xem, luc: Date.now() };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = () => veHoac("/chan");
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.y) return <Man lui={{ chu: "", bam: ve }} tieu="Con xin mở"><ChoTai loi="Lời xin này đã được trả lời (hoặc đã hết hạn)." tai={ve} /></Man>;
  const y = d.y, ten = tenYc(y) ?? (y.loai === "mo_web" ? "Trang web" : "App mới"), tenCon = d.ct?.ten ?? y.ten_con;
  const may = y.device_id ? d.ct?.may.find((m) => m.id === y.device_id)?.ten ?? null : null;
  // bàn them-a4nqjrmp@v17: «<Con> đang xin phép» — thẻ xin dùng chung với tab App & web / danh sách App, Web (TheXin dangXin truc)
  const yc = { ...y, ten_app: y.ten_app ?? ten } as YeuCauMoi;
  // bàn them-lsf4eews@v11 (#492): xin MỞ TRANG — «Bảo Anh xin vào tiktok.com», hai lựa chọn to «Có, trừ sao khi dùng» | «Có, không trừ sao», «Không cho»
  if (y.loai === "mo_web" && !d.xem) {
    const mayNgan = may ? may.replace(/ của .*$/, "") : null;
    const chon = (tinhPhut: boolean) => lam(async () => denXong(await choAppWeb(yc, may, tinhPhut)));
    return (
      <Man lui={{ chu: "", bam: ve }} tieu="">
        <View style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.the }}>
            <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: M.nut, borderWidth: 2, borderColor: M.dauSach, alignItems: "center", justifyContent: "center" }}>
              <Icon ten="web" mau={M.diem} co={52} />
            </View>
            <View style={{ position: "absolute", right: 4, bottom: 4 }}><Avt ten={tenCon.trim().split(/\s+/).pop() ?? "?"} mau={mauCon(null, 0)} co={34} /></View>
          </View>
          <Chu kieu="dam" co={15} mau={M.chu3}>{`${tenCon} xin vào`}</Chu>
          <Chu kieu="tieu7" co={26} style={{ textAlign: "center" }}>{ten}</Chu>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 14, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
            <Chu kieu="rat" co={13} mau={M.chu2} so>{[gioPhut(y.created_at), mayNgan].filter(Boolean).join(" · ")}</Chu>
          </View>
        </View>
        <Chu kieu="tieu" co={18} style={{ textAlign: "center", marginTop: 14 }}>Cho con vào trang này?</Chu>
        <BaoLoi loi={loiLam} />
        <Pressable onPress={() => chon(true)} disabled={dangChay} accessibilityRole="button" accessibilityLabel="Có, trừ sao khi dùng"
          style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 28, backgroundColor: M.diem, backgroundImage: MEN.vang, boxShadow: BONG.vang }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: M.nut, alignItems: "center", justifyContent: "center" }}><Icon ten="sao" mau={M.diem} co={24} /></View>
          <View style={{ flex: 1 }}><Chu kieu="den" co={17}>Có, trừ sao khi dùng</Chu><Chu kieu="rat" co={13} mau={M.chu2}>1 sao = 1 phút con dùng</Chu></View>
        </Pressable>
        <Pressable onPress={() => chon(false)} disabled={dangChay} accessibilityRole="button" accessibilityLabel="Có, không trừ sao"
          style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 28, backgroundColor: M.the, ...KHOI.nho }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}><Icon3D ten="mo_khoa" co={26} /></View>
          <View style={{ flex: 1 }}><Chu kieu="den" co={17}>Có, không trừ sao</Chu><Chu kieu="rat" co={13} mau={M.chu2}>Con dùng thoải mái</Chu></View>
        </Pressable>
        <Pressable onPress={() => lam(() => boQuaAppWeb(yc, may))} disabled={dangChay} accessibilityRole="button" accessibilityLabel="Không cho"
          style={{ minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
          <Chu kieu="den" co={16} mau={M.lienKet}>Không cho</Chu>
        </Pressable>
      </Man>
    );
  }
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`${tenCon} đang xin phép`}>
      {d.xem ? null : (
        <The style={{ paddingVertical: 2 }}>
          <TheXin y={yc} may={may} lam={(fn) => lam(fn)} dang={dangChay} dangXin truc phu={`${ten} chưa có trong danh sách được mở`} />
        </The>
      )}
      <BaoLoi loi={loiLam} />
    </Man>
  );
}
