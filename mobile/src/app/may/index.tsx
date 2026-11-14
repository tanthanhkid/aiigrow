// bm2-may-ds «Máy của X» (thiết kế chốt 14/11, bm-may-con/01): máy chia nhóm «Cần sửa N» (chưa bảo vệ — lên đầu) · «Đang bảo vệ N» · «Đang tắt N»;
// mỗi máy một thẻ lớn — hình máy (icon 3D), tên, nhãn «✓ Đang bảo vệ» / «! Chưa bảo vệ», dòng app đang mở («● Roblox · đang mở») + chế độ
// («Chặn app & web» / «Mở hết»), liên kết «Xem máy ›» / «Sửa <máy> ›» (⇒ /may/:id). Đáy: «+ Ghép thêm máy cho X» (⇒ /may/them),
// «Khoá tất cả máy ngay» (bảng them-sll7clha — lib/hang-ngay › BangKhoaMay), câu «Giờ chơi tính chung mọi máy: còn N phút.» (N3). Không có ?con ⇒ mọi máy trong nhà.
// Bỏ «Chặn thật / Giám sát» khỏi màn Ba Mẹ (L4 — máy luôn chặn thật). Dữ liệu: GET tuan-thu (+ GET con/:id khi có ?con).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type PhienDang, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { BangKhoaMay, type ConCt, type QuyCon } from "@/lib/hang-ngay";
import { DauMan, LienKet } from "@/lib/lan-dau";
import { ChoTai, Chu, gioPhut, Icon, Icon3D, LopMen, M, Man, Nut, truoc, useHoanTac, useTai, type TenIcon } from "@/lib/ui";

const IC: Record<TuanThuMay["nen"], TenIcon> = { windows: "laptop", mac: "laptop", ios: "tablet", android: "dt" };
const NEN_O: Record<TuanThuMay["nen"], string> = { windows: "#dce9fb", mac: "#e9e1fb", ios: "#fde3c8", android: "#d9f1e6" };

/** Máy đang được bảo vệ đủ (mức bảo vệ máy chủ tính + còn liên lạc, không lệch chuẩn). */
const dangMo = (m: TuanThuMay) => { const den = m.moKhanCapDen ?? m.moDen ?? null; return !!den && Date.parse(den) > Date.now(); };
const trungTinh = (m: TuanThuMay) => (m.trangThai === "tat_may" || m.trangThai === "chua_co_nhip") && !m.dangGo && !dangMo(m);
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
    const [tt, c, qy, ph] = await Promise.all([bm.goi<{ ds: TuanThuMay[] }>("tuan-thu"), con ? bm.goi<ConCt>(`con/${con}`) : Promise.resolve(null),
      con ? bm.goi<QuyCon>(`con/${con}/quy`).catch(() => null) : Promise.resolve(null), bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null)]);
    return { ds: c ? tt.ds.filter((m) => m.con === c.id || m.dungChung) : tt.ds, c, quy: qy?.quy ?? null, phien: ph?.ds ?? [] };
  });
  const tieu = d?.c ? `Máy của ${d.c.ten}` : "Máy của các con";
  if (!d) return <Man dau={<DauMan ve="/hom-nay" tieu={tieu} />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const c = d.c;
  const ngan = (t: string) => t.replace(/ của .*$/, "");
  // app đang mở trên từng máy (phiên chơi đang chạy — khớp theo tên máy)
  const appMo = (m: TuanThuMay) => d.phien.find((p) => p.may && (p.may === m.ten || ngan(p.may) === ngan(m.ten)) && (!c || p.con === c.id));
  const cheDo = c?.cheDoChan === "mo_het" ? "Mở hết" : c ? "Chặn app & web" : null;
  const canSua = d.ds.filter((m) => !dangBaoVe(m) && !trungTinh(m));
  const baoVe = d.ds.filter(dangBaoVe);
  const tat = d.ds.filter((m) => trungTinh(m) && !dangBaoVe(m));
  const dang = Object.fromEntries((c?.may ?? []).map((m) => { const p = d.phien.find((x) => x.con === c?.id && x.may && ngan(x.may) === ngan(m.ten)); return [m.id, p ? { chu: `● ${p.tenApp} · đang mở`, mo: true } : null]; })
    .filter((x) => x[1])) as Record<string, { chu: string; mo: boolean }>;
  const nhom = (chu: string, ds: TuanThuMay[]) => ds.length ? (
    <View key={chu} style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginHorizontal: 4 }}>
        <Chu kieu="rat" co={16}>{chu}</Chu>
        <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center" }}>
          <Chu kieu="rat" co={12} mau={M.chu2} so>{String(ds.length)}</Chu>
        </View>
      </View>
      {ds.map((m) => <TheMay key={m.id} m={m} app={appMo(m)?.tenApp ?? null} cheDo={cheDo} />)}
    </View>
  ) : null;
  return (
    // thiết kế bm-ghep-may/01: tiêu đề «Máy của <Con>» ở hàng đầu cạnh nút lùi (22/800), không tiêu đề lớn trong thân
    <Man noi={noi} tai={tai} dau={<DauMan ve="/hom-nay" tieu={tieu} />}
      day={<>
        <Nut chu={c ? `+ Ghép thêm máy cho ${c.ten}` : "+ Ghép thêm máy"} rong bam={() => router.push({ pathname: "/may/them", params: c ? { con: c.id } : {} })} />
        {c && d.ds.length ? (
          <Nut chu="Khoá tất cả máy ngay" ic="khoa" ic3d loai="vien" rong bam={() => setKhoa(true)} />
        ) : null}
        {c && d.quy && d.ds.length ? <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>{`Giờ chơi tính chung mọi máy: còn ${d.quy.conPhut} phút.`}</Chu> : null}
      </>}>
      {d.ds.length ? null : <Chu kieu="dam" co={14} mau={M.chu2} style={{ marginHorizontal: 6 }}>Chưa có máy nào — ghép bằng mã 6 số, chưa tới 2 phút.</Chu>}
      {nhom("Cần sửa", canSua)}
      {nhom("Đang bảo vệ", baoVe)}
      {nhom("Đang tắt", tat)}
      {!d.ds.length ? <LienKet chu="Máy của con cài AiiGrow ở đâu?" bam={() => router.push("/ho-tro")} /> : null}
      {c ? <BangKhoaMay mo={khoa} dong={() => setKhoa(false)} con={c.id} ten={c.ten} may={c.may} dang={dang}
        xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} /> : null}
    </Man>
  );
}

function TheMay({ m, app, cheDo }: { m: TuanThuMay; app: string | null; cheDo: string | null }) {
  const ok = dangBaoVe(m), tt = trungTinh(m);
  const ngan = m.ten.replace(/ của .*$/, "");
  return (
    <Pressable onPress={() => router.push(`/may/${m.id}`)} accessibilityRole="button" accessibilityLabel={`${m.ten}, ${ok ? "đang bảo vệ" : "chưa bảo vệ"}`}>
      <View style={{ flexDirection: "row", gap: 14, padding: 12, borderRadius: 28, backgroundColor: "#fff", ...KHOI.the }}>
        <LopMen men={MEN.the} bo={28} />
        <View style={{ width: 112, height: 112, borderRadius: 22, backgroundColor: NEN_O[m.nen], alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
          <Icon3D ten={IC[m.nen]} co={78} />
          {ok ? <View style={{ position: "absolute", right: 6, bottom: 6 }}><Icon3D ten="khien" co={36} /></View> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6, justifyContent: "center" }}>
          <Chu kieu="rat" co={19} dong={1}>{ngan}</Chu>
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: ok ? M.chinhSoft : tt ? M.xamSoft : M.canhSoft }}>
            {ok ? <Icon ten="tick" mau={M.chinhInk} co={13} /> : tt ? null : <Chu kieu="rat" co={12.5} mau={M.canh}>!</Chu>}
            <Chu kieu="rat" co={12.5} mau={ok ? M.chinhInk : tt ? M.chu2 : M.canh}>{ok ? "Đang bảo vệ" : tt ? (m.trangThai === "tat_may" ? "Đang tắt" : "Chưa có báo cáo") : dangMo(m) ? "Đang mở" : "Chưa bảo vệ"}</Chu>
          </View>
          {ok && app ? <Chu co={13} mau={M.chu2}><Chu kieu="rat" co={13} mau={M.chinhInk}>{`● ${app}`}</Chu> · đang mở</Chu> : null}
          <Chu co={13} mau={M.chu2}>{ok ? `${cheDo ?? cauTrangThai(m)}${m.dungChung ? " · máy dùng chung" : ""}` : `${cauTrangThai(m)}${m.dungChung ? " · máy dùng chung" : ""}`}</Chu>
          <Chu kieu="rat" co={13.5} mau={ok || tt ? M.chinhInk : M.canh}>{ok || tt ? "Xem máy ›" : `Sửa ${ngan} ›`}</Chu>
        </View>
      </View>
    </Pressable>
  );
}
