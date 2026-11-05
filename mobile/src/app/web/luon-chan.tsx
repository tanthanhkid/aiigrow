// «Luôn chặn» (thiết kế chốt bm-ung-dung/07): Rob luôn chặn 3 nhóm web trên mọi máy của con — web người lớn, cờ bạc, bạo lực. Không tắt được,
// kể cả Ba Mẹ (máy chủ: chan-co-ban.ts › WEB_CAM, POST luat cho phép trang này ⇒ 409 web_cam). Danh sách nhóm lấy từ GET luon-chan.
import { View } from "react-native";
import { bm } from "@/lib/api";
import { NhanLuon, OIcon, veHoac } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { Chu, Dong, M, Man, Nhom, Nut, Rob, useTai } from "@/lib/ui";

const IC = { nguoi_lon: "mat", co_bac: "xu", bao_luc: "khien" } as const;
const MAC_DINH = [{ ma: "nguoi_lon", ten: "Web người lớn" }, { ma: "co_bac", ten: "Cờ bạc" }, { ma: "bao_luc", ten: "Bạo lực" }];

export default function LuonChan() {
  const { d } = useTai(() => bm.goi<{ nhom: { ma: string; ten: string; soTrang: number }[] }>("luon-chan"));
  const ds = d?.nhom.length ? d.nhom : MAC_DINH;
  const ve = () => veHoac("/app-web");
  return (
    <Man lui={{ chu: "", bam: ve }} tieu="Luôn chặn" day={<Nut chu="Xong, về App & web" rong bam={ve} />}>
      <View style={{ alignItems: "center", gap: 10, paddingTop: 8 }}>
        <Rob ten="canh-trong" co={170} />
        <View style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 22, backgroundColor: "#fff", ...KHOI.the }}>
          <Chu kieu="rat" co={15} style={{ textAlign: "center" }}>{`Rob luôn chặn ${ds.length} thứ này trên mọi máy của con`}</Chu>
        </View>
      </View>
      <Nhom>
        {ds.map((x, i) => (
          <Dong key={x.ma} dau={i === 0} tieu={x.ten} trai={<OIcon ic={IC[x.ma as keyof typeof IC] ?? "khien"} />} phai={<NhanLuon chu="Luôn chặn" />} />
        ))}
      </Nhom>
      <Chu kieu="dam" co={13} mau={M.chu3} style={{ textAlign: "center" }}>Không tắt được, kể cả Ba Mẹ.</Chu>
    </Man>
  );
}
