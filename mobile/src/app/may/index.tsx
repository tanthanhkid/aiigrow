// bm-may «Máy tính & điện thoại» (mở từ Trang chủ theo Con, hoặc cả nhà khi không có ?con): mọi máy, chế độ Chặn thật / Giám sát, trạng thái
// tuân thủ (điểm, vấn đề, khoá giải trí, mở khẩn cấp), ghép thêm máy. Bấm một máy → chi tiết: đổi chế độ, mở khẩn cấp, mã mất mạng, gỡ an toàn.
// Gọi GET /api/m/tuan-thu (docs/API.md).
import { router, useLocalSearchParams } from "expo-router";
import { bm, TEN_CHE_DO, TT_TRANG, type ConChiTiet, type TuanThuMay } from "@/lib/api";
import { datTl } from "@/lib/thiet-lap";
import { BieuTron, Canh, ChoTai, Chu, Dong, M, Man, Nhan, Nhom, Nut, truoc, useTai } from "@/lib/ui";

const IC_NEN = { windows: "may_tinh", mac: "laptop", ios: "tablet", android: "dt" } as const;

export default function MayTinhDienThoai() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [tt, c] = await Promise.all([bm.goi<{ ds: TuanThuMay[] }>("tuan-thu"), con ? bm.goi<ConChiTiet>(`con/${con}`) : Promise.resolve(null)]);
    const ds = tt.ds;
    return { ds: c ? ds.filter((m) => m.con === c.id || m.dungChung) : ds, c };
  });
  const tieu = d?.c ? `Máy của ${d.c.ten}` : "Máy tính & điện thoại";
  if (!d) return <Man lui={{ chu: "Trang chủ" }} tieu="Máy tính & điện thoại"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  // MỘT nguồn: mức bảo vệ do máy chủ tính (baoVe) — cùng giá trị với Hồ sơ Con; «tuân thủ» (điểm) chỉ là phần giờ máy / mất kết nối
  const can = d.ds.filter((m) => m.trangThai === "ngoai_vong" || m.trangThai === "lech_chuan" || (!!m.baoVe && m.baoVe !== "day_du")).length;
  const c = d.c;
  return (
    <Man lui={{ chu: "Trang chủ" }} tieu={tieu} tai={tai}
      day={c ? <Nut chu="Ghép thêm máy" ic="cong" loai="vien" rong bam={() => { datTl({ conId: c.id, tenCon: c.ten, nhom: c.nhom }); router.push("/thiet-lap/may"); }} /> : undefined}>
      <Canh lv="chi" thap tieu={d.ds.length ? `${d.ds.length} máy` : "Chưa có máy nào"}
        loi={!d.ds.length ? "Ghép bằng mã 6 số, chưa tới 2 phút." : can ? `${can} máy đang cần Ba Mẹ để mắt.` : "Mọi máy đều được bảo vệ đầy đủ."} />
      {d.ds.length ? (
        <Nhom>
          {d.ds.map((m, i) => (
            <Dong key={m.id} dau={i === 0} tieu={m.ten}
              phu={`${m.cheDo ? `${TEN_CHE_DO[m.cheDo]} · ` : ""}${phuMay(m)} · đồng bộ ${truoc(m.lanCuoi) || "chưa lần nào"}`}
              trai={<BieuTron ic={IC_NEN[m.nen]} mau={mauMay(m)} />}
              phai={!!m.baoVe && m.baoVe !== "day_du" && m.trangThai === "tuan_thu" ? <Nhan chu="Bảo vệ chưa đủ" loai="canh" cham /> : <Nhan chu={TT_TRANG[m.trangThai].chu} loai={TT_TRANG[m.trangThai].loai} cham />}
              bam={() => router.push(`/may/${m.id}`)} />
          ))}
        </Nhom>
      ) : null}
      <Chu co={13} mau={M.chu3}>Chạm một máy để đổi Chặn thật / Giám sát, mở khẩn cấp, lấy mã mở khi mất mạng hoặc gỡ AiiGrow. Máy mất kết nối quá lâu thì tự khoá giải trí.</Chu>
    </Man>
  );
}

function phuMay(m: TuanThuMay) {
  const p = m.moKhanCapDen ? "đang mở khẩn cấp" : m.khoaGiaiTri ? "giải trí đang khoá" : m.baoVe && m.baoVe !== "day_du" ? "bảo vệ chưa đủ — xem cách sửa" : "bảo vệ đầy đủ";
  return m.dungChung ? `${p} · máy dùng chung` : p;
}
const mauMay = (m: TuanThuMay): "do" | "cam" | "xanh" => (m.trangThai === "ngoai_vong" ? "do" : m.trangThai === "lech_chuan" ? "cam" : "xanh");
