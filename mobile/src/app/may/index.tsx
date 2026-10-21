// bm-an-toan-thiet-bi: An toàn thiết bị — mọi máy của gia đình, trạng thái tuân thủ (điểm, vấn đề, khoá giải trí, mở khẩn cấp).
// Bấm một máy → chi tiết + mở khẩn cấp / gỡ từ xa. Gọi GET /api/m/tuan-thu (docs/API.md).
import { router } from "expo-router";
import { bm, TT_TRANG, type TuanThuMay } from "@/lib/api";
import { BieuTron, Canh, ChoTai, Chu, Dong, M, Man, Nhan, Nhom, truoc, useTai } from "@/lib/ui";

const IC_NEN = { windows: "may_tinh", mac: "laptop", ios: "tablet", android: "dt" } as const;

export default function AnToanThietBi() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<{ ds: TuanThuMay[] }>("tuan-thu").then((x) => x.ds));
  if (!d) return <Man lui={{ chu: "Cài đặt" }} tieu="An toàn thiết bị"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const can = d.filter((m) => m.trangThai === "ngoai_vong" || m.trangThai === "lech_chuan").length;
  return (
    <Man lui={{ chu: "Cài đặt" }} tieu="An toàn thiết bị" tai={tai}>
      <Canh lv="chi" thap tieu={d.length ? `${d.length} máy` : "Chưa có máy nào"}
        loi={!d.length ? "Ghép máy ở Cài đặt → Hồ sơ & máy của Con." : can ? `${can} máy đang cần Ba Mẹ để mắt.` : "Mọi máy đều đang tuân thủ."} />
      {d.length ? (
        <Nhom>
          {d.map((m, i) => (
            <Dong key={m.id} dau={i === 0} tieu={m.ten}
              phu={`${phuMay(m)} · đồng bộ ${truoc(m.lanCuoi) || "chưa lần nào"}`}
              trai={<BieuTron ic={IC_NEN[m.nen]} mau={mauMay(m)} />}
              phai={<Nhan chu={TT_TRANG[m.trangThai].chu} loai={TT_TRANG[m.trangThai].loai} cham />}
              bam={() => router.push(`/may/${m.id}`)} />
          ))}
        </Nhom>
      ) : null}
      <Chu co={13} mau={M.chu3}>Điểm tuân thủ dưới ngưỡng thì AiiGrow tự khoá giải trí trên máy đó (fail‑closed). Ba Mẹ có thể mở khẩn cấp có hạn giờ trong từng máy.</Chu>
    </Man>
  );
}

function phuMay(m: TuanThuMay) {
  const p = m.moKhanCapDen ? "đang mở khẩn cấp" : m.khoaGiaiTri ? "giải trí đang khoá" : `điểm tuân thủ ${m.diem}`;
  return m.dungChung ? `${p} · máy dùng chung` : p;
}
const mauMay = (m: TuanThuMay): "do" | "cam" | "xanh" => (m.trangThai === "ngoai_vong" ? "do" : m.trangThai === "lech_chuan" ? "cam" : "xanh");
