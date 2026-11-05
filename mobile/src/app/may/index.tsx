// bm1-may-ds / bm2-may-ds «Máy của X» (thiết kế chốt 04/11): mỗi máy một thẻ lớn — hình máy (icon 3D), tên, nhãn «✓ Đang bảo vệ» /
// «! Chưa bảo vệ», một dòng trạng thái, liên kết «Xem máy ›» / «Sửa <máy> ›» (⇒ chi tiết /may/:id: chế độ, mở khẩn cấp, mã offline, gỡ).
// Đáy: «+ Ghép thêm máy cho X» (⇒ /may/them) và «Khoá tất cả máy ngay» (bảng Khoá máy). Không có ?con ⇒ mọi máy trong nhà.
// Bỏ «Chặn thật / Giám sát» khỏi màn Ba Mẹ (L4 — máy luôn chặn thật). Dữ liệu: GET tuan-thu (+ GET con/:id khi có ?con).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { BangKhoa } from "@/lib/khoa-may";
import { DauMan, LienKet, TieuDe } from "@/lib/lan-dau";
import { ChoTai, Chu, gioPhut, Icon, Icon3D, LopMen, M, Man, Nut, truoc, useHoanTac, useTai, type TenIcon } from "@/lib/ui";

const IC: Record<TuanThuMay["nen"], TenIcon> = { windows: "laptop", mac: "laptop", ios: "tablet", android: "dt" };
const NEN_O: Record<TuanThuMay["nen"], string> = { windows: "#dce9fb", mac: "#e9e1fb", ios: "#fde3c8", android: "#d9f1e6" };

/** Máy đang được bảo vệ đủ (mức bảo vệ máy chủ tính + còn liên lạc, không lệch chuẩn). */
const dangMo = (m: TuanThuMay) => { const den = m.moKhanCapDen ?? m.moDen ?? null; return !!den && Date.parse(den) > Date.now(); };
const dangBaoVe = (m: TuanThuMay) => m.trangThai === "tuan_thu" && m.baoVe !== "mot_phan" && !dangMo(m) && !m.dangGo;     // «chua» = máy không báo quyền, Ba Mẹ không sửa được ⇒ không báo đỏ
function cauTrangThai(m: TuanThuMay) {
  if (m.dangGo) return "Đang gỡ AiiGrow khỏi máy này";
  if (m.moKhanCapDen && Date.parse(m.moKhanCapDen) > Date.now()) return `Đang mở khẩn cấp tới ${gioPhut(m.moKhanCapDen)}`;
  if (m.moDen && Date.parse(m.moDen) > Date.now()) return `Đang mở tới ${gioPhut(m.moDen)}`;
  if (m.trangThai === "ngoai_vong" || m.trangThai === "tat_may" || m.trangThai === "chua_co_nhip")
    return m.lanCuoi ? `Không bị tính giờ\ntừ ${truoc(m.lanCuoi)}` : "Chưa nhận được tin từ máy";
  if (m.trangThai === "lech_chuan") return m.vanDe[0]?.cauBaMe ?? "Máy đang lệch chuẩn";
  if (m.baoVe === "mot_phan") return m.baoVeCau ?? "Còn thiếu quyền bảo vệ";
  if (m.khoaGiaiTri) return "Giải trí đang khoá";
  return `Đồng bộ ${truoc(m.lanCuoi) || "vừa xong"}`;
}

export default function MayCuaCon() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const [khoa, setKhoa] = useState(false);
  const { bao, noi } = useHoanTac();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [tt, c] = await Promise.all([bm.goi<{ ds: TuanThuMay[] }>("tuan-thu"), con ? bm.goi<ConChiTiet>(`con/${con}`) : Promise.resolve(null)]);
    return { ds: c ? tt.ds.filter((m) => m.con === c.id || m.dungChung) : tt.ds, c };
  });
  const tieu = d?.c ? `Máy của ${d.c.ten}` : "Máy của các con";
  if (!d) return <Man dau={<DauMan ve="/hom-nay" />}><TieuDe chu={tieu} /><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const c = d.c;
  // chưa bảo vệ lên trước (việc Ba Mẹ cần làm)
  const ds = [...d.ds].sort((a, b) => Number(dangBaoVe(a)) - Number(dangBaoVe(b)));
  return (
    <Man noi={noi} tai={tai} dau={<DauMan ve="/hom-nay" />}
      day={<>
        <Nut chu={c ? `+ Ghép thêm máy cho ${c.ten}` : "+ Ghép thêm máy"} rong bam={() => router.push({ pathname: "/may/them", params: c ? { con: c.id } : {} })} />
        {c && ds.length ? (
          <Pressable onPress={() => setKhoa(true)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44 }}>
            <Icon3D ten="khoa" co={20} /><Chu kieu="rat" co={14.5} mau={M.chu}>Khoá tất cả máy ngay</Chu>
          </Pressable>
        ) : null}
      </>}>
      <TieuDe chu={tieu} phu={ds.length ? undefined : "Chưa có máy nào — ghép bằng mã 6 số, chưa tới 2 phút."} />
      {ds.map((m) => {
        const ok = dangBaoVe(m);
        return (
          <Pressable key={m.id} onPress={() => router.push(`/may/${m.id}`)} accessibilityRole="button" accessibilityLabel={`${m.ten}, ${ok ? "đang bảo vệ" : "chưa bảo vệ"}`}>
            <View style={{ flexDirection: "row", gap: 14, padding: 12, borderRadius: 28, backgroundColor: "#fff", ...KHOI.the }}>
              <LopMen men={MEN.the} bo={28} />
              <View style={{ width: 112, height: 112, borderRadius: 22, backgroundColor: NEN_O[m.nen], alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
                <Icon3D ten={IC[m.nen]} co={78} />
                {ok ? <View style={{ position: "absolute", right: 6, bottom: 6 }}><Icon3D ten="khien" co={36} /></View> : null}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 6, justifyContent: "center" }}>
                <Chu kieu="rat" co={19} dong={1}>{m.ten}</Chu>
                <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: ok ? M.chinhSoft : M.canhSoft }}>
                  {ok ? <Icon ten="tick" mau={M.chinhInk} co={13} /> : <Chu kieu="rat" co={12.5} mau={M.canh}>!</Chu>}
                  <Chu kieu="rat" co={12.5} mau={ok ? M.chinhInk : M.canh}>{ok ? "Đang bảo vệ" : dangMo(m) ? "Đang mở" : "Chưa bảo vệ"}</Chu>
                </View>
                <Chu co={13} mau={M.chu2}>{cauTrangThai(m)}{m.dungChung ? " · máy dùng chung" : ""}</Chu>
                <Chu kieu="rat" co={13.5} mau={ok ? M.chinhInk : M.canh}>{ok ? "Xem máy ›" : `Sửa ${m.ten} ›`}</Chu>
              </View>
            </View>
          </Pressable>
        );
      })}
      {!ds.length ? <LienKet chu="Máy của con cài AiiGrow ở đâu?" bam={() => router.push("/ho-tro")} /> : null}
      {c ? <BangKhoa mo={khoa} dong={() => setKhoa(false)} con={c.id} ten={c.ten} xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} /> : null}
    </Man>
  );
}
