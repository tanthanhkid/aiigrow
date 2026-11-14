// them-473f52w6 «Danh sách quà» (thiết kế chốt 06/11, BRD FR-04 — L14; cũng là bm-cai-dat/17 bm2-quy): chọn con, Grow nói «Con chọn quà → sao được giữ
// lại. Ba Mẹ trao xong mới trừ sao.», mỗi quà một dòng (hình · tên + điều kiện · giá sao · ›) theo bảng giá 7 quà mặc định, «+ Thêm quà» (thư viện mẫu),
// cuộn. Bấm một quà ⇒ «Sửa quà» (/vi/qua-sua?id=). Không còn «Thêm 30 phút» (đổi sao ra phút là nút riêng của con). GET qua?con= (docs/API.md «S3»).
// Người trông giúp: chỉ xem.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { CAU_TRONG_GIUP, ChipCon, quyenToi } from "@/lib/hang-ngay";
import { type QuaS3 } from "@/lib/s3";
import { veHoac } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Chu, Dong, Icon, Icon3D, M, Man, NhanMen, Nhom, Nut, Rob, The, tien, useHoanTac, useLam, useTai } from "@/lib/ui";
import { DongQua } from "@/lib/ui-s3";
import { KHOI, MEN } from "@/lib/clay";

export default function DanhSachQua() {
  const { con: conSan } = useLocalSearchParams<{ con?: string }>();
  const [chon, setChon] = useState<string | null>(conSan ?? null);
  const g = useTai(async () => {
    const [gd, quyen] = await Promise.all([bm.goi<GiaDinh>("gia-dinh"), quyenToi()]);
    return { con: gd.con, baMe: quyen === "ba_me", quyVoucher: gd.quyVoucher ?? 0 };
  });
  if (!g.d) return <Man lui={{ chu: "", bam: ve }} tieu={TIEU}><ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man>;
  const c = g.d.con.find((x) => x.id === chon) ?? g.d.con[0];
  // một khối theo Con (key) ⇒ đổi chip Con là tải lại đúng danh sách quà áp cho Con đó
  return <DsQuaCon key={c?.id ?? "-"} c={c} dsCon={g.d.con} baMe={g.d.baMe} quyVoucher={g.d.quyVoucher} doiCon={setChon} taiG={g.tai} />;
}

const TIEU = "Danh sách quà";
const ve = () => veHoac("/cai-dat");

function DsQuaCon({ c, dsCon, baMe, quyVoucher, doiCon, taiG }: { c: GiaDinh["con"][number] | undefined; dsCon: GiaDinh["con"]; baMe: boolean; quyVoucher: number; doiCon: (id: string) => void; taiG: () => unknown }) {
  const conId = c?.id ?? null;
  const q = useTai(() => bm.goi<{ ds: QuaS3[] }>(conId ? `qua?con=${encodeURIComponent(conId)}` : "qua"));
  const { lam, loi: loiLam, dangChay } = useLam();
  const { noi } = useHoanTac();
  if (!q.d) return <Man lui={{ chu: "", bam: ve }} tieu={TIEU}><ChoTai loi={q.loi} matMang={q.matMang} tai={q.tai} /></Man>;
  const ds = q.d.ds.filter((x) => x.bat);
  const ten = c?.ten;
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={TIEU} noi={noi} tai={() => { taiG(); q.tai(); }}
      day={!ds.length && baMe ? <><BaoLoi loi={loiLam} /><Nut chu="Dùng 7 quà Grow gợi ý" rong dangChay={dangChay} bam={() => lam(async () => { await bm.goi("qua/mac-dinh", conId ? { con: conId } : {}); await q.tai(); })} /></>
        : <Nut chu={`Lưu ${ds.length} quà${ten ? ` cho ${ten}` : ""}`} rong bam={ve} />}>
      {dsCon.length > 1 && c ? <ChipCon ds={dsCon} chon={c.id} doi={(x) => doiCon(x.id)} /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: M.chinhSoft }}>
        <Rob ten="chi" co={40} />
        <Chu kieu="dam" co={13.5} mau={M.chinhInk} style={{ flex: 1 }}>Con chọn quà → sao được giữ lại. Ba Mẹ trao xong mới trừ sao.</Chu>
      </View>
      <The sat>
        {ds.length ? ds.map((x, i) => (
          <DongQua key={x.id} q={x} dau={i === 0} bam={baMe ? () => router.push({ pathname: "/vi/qua-sua", params: { id: x.id, ...(conId ? { con: conId } : {}) } }) : undefined} />
        )) : <View style={{ padding: 16 }}><Chu co={14} mau={M.chu2}>Chưa có quà nào. Grow có sẵn 7 quà theo bảng giá — bấm nút dưới để dùng.</Chu></View>}
      </The>
      {baMe ? (
        <NhanMen onPress={() => router.push({ pathname: "/vi/qua-thu-vien", params: conId ? { con: conId } : {} })} accessibilityRole="button" accessibilityLabel="Thêm quà"
          muc="khoi" sang men={MEN.sang} style={[{ minHeight: 56, borderRadius: 22, backgroundColor: M.the, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            borderWidth: 2, borderStyle: "dashed", borderColor: M.vien2 }, KHOI.nho]}>
          <Icon ten="cong" co={20} mau={M.chinhInk} /><Chu kieu="rat" co={15.5} mau={M.chinhInk}>Thêm quà</Chu>
        </NhanMen>
      ) : <Chu co={13} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu>}
      {quyVoucher > 0 ? (
        // quỹ phiếu AiiCafe nạp trước 06/11 vẫn dùng ở quầy (KE-HOACH 0511 câu mở 3) — báo số dư + chỗ hỏi nạp / hoàn
        <Nhom><Dong dau tieu={`Quỹ phiếu quà AiiCafe còn ${tien(quyVoucher)}`} phu="Dùng ở quầy AiiCafe · cần nạp hay hoàn thì nhắn AiiGrow" trai={<Icon3D ten="coc" co={32} />}
          bam={() => router.push("/ho-tro")} /></Nhom>
      ) : null}
    </Man>
  );
}
