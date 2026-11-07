// «Huy hiệu» bản «Dịu» (con-dt-ngay 19 cdt-huy-hieu): «Có 2», lưới huy hiệu — đạt ✓ (thẻ trắng), chưa đạt mờ + dòng «Còn 2 ngày / Còn 3 việc»;
// cấp theo tổng sao trọn đời (không phải số dư); huy hiệu không quy ra sao. Cuối màn «Làm nhiệm vụ để có thêm».
import { router } from "expo-router";
import { View } from "react-native";
import { kid, type ThanhTich } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { Icon3D, type TenIcon } from "@/lib/ui";
import { ChoD, ChuD, ManD, NutD, PillD, TheD, ThanhD } from "@/lib/ui-diu";
import { ngayCua, useTaiTre } from "@/lib/ui-tre";

const TEN_CAP = ["Hạt giống", "Nảy mầm", "Lá non", "Mầm xanh", "Cây non", "Cây lớn", "Ra hoa", "Kết trái", "Cổ thụ", "Rừng xanh"];
const tenCap = (n: number) => TEN_CAP[Math.min(TEN_CAP.length, Math.max(1, n)) - 1];
const HINH: Record<string, TenIcon> = { khoi_dau: "tia", mot_sach: "sach", tay_dam_dang: "chen", khoe_manh: "chay", ham_hoc: "mu", chuoi_7: "lua", chuoi_30: "lua", cap_5: "sao" };

export default function HuyHieu() {
  const { d, loi, matMang, tai } = useTaiTre("thanh-tich", () => kid.goi<ThanhTich>("thanh-tich"));
  if (!d) return <ManD lui="/tre/vi-qua" tieu="Huy hiệu"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const { cap, diemCapSau, conThieu } = d.capDo;
  const truoc = (100 * (cap - 1) * cap) / 2;
  const ti = diemCapSau > truoc ? (d.tongKiem - truoc) / (diemCapSau - truoc) : 0;
  const ds = [...d.huyHieu].sort((a, b) => Number(b.dat) - Number(a.dat));
  return (
    <ManD lui="/tre/vi-qua" tieu="Huy hiệu" phai={<PillD chu={`Có ${d.huyHieu.filter((h) => h.dat).length}`} loai="xanh" />}
      day={<NutD chu="Làm nhiệm vụ để có thêm" loai="phu" ic="sao" bam={() => router.push("/tre/nhiem-vu")} />}>
      <TheD>
        <ChuD kieu="den" co={17}>{`Cấp ${cap} · ${tenCap(cap)}`}</ChuD>
        <ThanhD ti={ti} />
        <ChuD kieu="rat" co={13.5} mau={D.chu2}>{`Còn ${conThieu} sao nữa lên «${tenCap(cap + 1)}»${d.chuoiNgay ? ` · chuỗi ${d.chuoiNgay} ngày` : ""}`}</ChuD>
      </TheD>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {ds.map((h) => (
          <View key={h.ma} accessibilityLabel={`${h.ten}: ${h.dat ? "đã đạt" : "chưa đạt"}. ${h.mo_ta}`}
            style={{ flexBasis: "46%", flexGrow: 1, alignItems: "center", gap: 6, padding: 14, borderRadius: 22, backgroundColor: h.dat ? D.the : D.xamNhat,
              borderWidth: 1, borderColor: D.vien, opacity: h.dat ? 1 : 0.7 }}>
            <View>
              <Icon3D ten={HINH[h.ma] ?? "sao"} co={54} />
              {h.dat ? <View style={{ position: "absolute", right: -6, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: D.xanh, alignItems: "center",
                justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}><ChuD kieu="den" co={12} mau="#fff">✓</ChuD></View> : null}
            </View>
            <ChuD kieu="den" co={15} giua dong={1}>{h.ten}</ChuD>
            <ChuD kieu="rat" co={12.5} mau={D.chu2} giua dong={2}>{h.dat && h.datLuc ? `Đạt ${ngayCua(h.datLuc).slice(0, 5)}` : h.mo_ta}</ChuD>
          </View>
        ))}
      </View>
    </ManD>
  );
}
