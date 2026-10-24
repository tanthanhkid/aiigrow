// con-huy-hieu «Huy hiệu & cấp độ» (FR-03.06): cấp theo tổng điểm trọn đời (không phải số dư); huy hiệu không quy ra điểm. Chưa đạt ⇒ mờ.
import { View } from "react-native";
import { Canh, ChoTai, M, Tien, type LinhVat } from "@/lib/ui";
import { GhiChu, ManTre, QuaO, ngayCua, useTaiTre } from "@/lib/ui-tre";
import { kid, type ThanhTich } from "@/lib/api-tre";

const TEN_CAP = ["Hạt giống", "Nảy mầm", "Lá non", "Mầm xanh", "Cây non", "Cây lớn", "Ra hoa", "Kết trái", "Cổ thụ", "Rừng xanh"];
const tenCap = (n: number) => TEN_CAP[Math.min(TEN_CAP.length, Math.max(1, n)) - 1];
const HINH: Record<string, [LinhVat, string]> = {
  khoi_dau: ["xong", "#ffeab0"], mot_sach: ["hoc", "#e3efeb"], tay_dam_dang: ["chi", "#fde3dc"], khoe_manh: ["sao", "#eeeafe"],
  ham_hoc: ["canh-hoc", "#e8f0ff"], chuoi_7: ["xong", "#ffeab0"], chuoi_30: ["canh-tien-do", "#e3efeb"], cap_5: ["sao", "#fff1c9"],
};

export default function HuyHieu() {
  const { d, loi, matMang, tai } = useTaiTre("thanh-tich", () => kid.goi<ThanhTich>("thanh-tich"));
  if (!d) return <ManTre lui={{ chu: "Nhà", ve: "/tre/nha" }}><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const { cap, diemCapSau, conThieu } = d.capDo;
  const truoc = (100 * (cap - 1) * cap) / 2;
  const ti = diemCapSau > truoc ? (d.tongKiem - truoc) / (diemCapSau - truoc) : 0;
  return (
    <ManTre lui={{ chu: "Nhà", ve: "/tre/nha" }}>
      <Canh lv="sao" mau="vang" tieu={`Cấp ${cap} · ${tenCap(cap)}`} loi={`Còn ${conThieu} điểm nữa lên cấp ${cap + 1} “${tenCap(cap + 1)}”!`}>
        <View style={{ alignSelf: "stretch", marginTop: 2 }}><Tien ti={ti} /></View>
      </Canh>
      {d.chuoiNgay ? <GhiChu giua>{`Chuỗi ${d.chuoiNgay} ngày liền có nhiệm vụ được duyệt`}</GhiChu> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[...d.huyHieu].sort((a, b) => Number(b.dat) - Number(a.dat)).map((h) => {
          const [lv, nen] = HINH[h.ma] ?? ["sao", M.diemSoft];
          return <QuaO key={h.ma} lv={lv} nen={h.dat ? nen : "#ecece8"} tieu={h.ten} mo={!h.dat} phu={h.dat && h.datLuc ? `Đạt ${ngayCua(h.datLuc).slice(0, 5)}` : h.mo_ta}
            nhanDoc={`${h.ten}: ${h.dat ? "đã đạt" : "chưa đạt"}. ${h.mo_ta}`} />;
        })}
      </View>
    </ManTre>
  );
}
