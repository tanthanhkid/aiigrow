// bm2-may-ds / bm1-may-ds «Máy trong nhà» (thiết kế chốt 15/11, #267 một máy nhiều Con): tiêu đề «Máy trong nhà · N máy · M bé», dải lọc
// «Tất cả / <từng bé>» (?con = bé chọn sẵn); máy chia nhóm «Cần sửa N» (chưa bảo vệ — lên đầu) · «Đang bảo vệ N» · «Đang tắt N»; mỗi máy một thẻ —
// hình máy, tên, hàng «ai dùng» (máy riêng: avatar + tên + «Máy riêng»; máy chung: avatar chồng + «2 bé · đang dùng: <bé>»), ô trạng thái
// (xanh: «● <bé> · <app> · đang mở» + «còn N sao = N phút chơi»; đào: «! <lỗi>» + «Sửa <máy> trong N bước ›»). Đáy: «+ Ghép thêm máy»,
// «Khoá tất cả máy ngay» (them-sll7clha — lib/hang-ngay › BangKhoaMay), ghi chú luật đi theo bé. Dữ liệu: GET tuan-thu (conDs, dangDung) +
// GET gia-dinh (sao từng bé = soDu) + GET phien-dang (app đang mở).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh, type PhienDang, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { BangKhoaMay, tenGoi } from "@/lib/hang-ngay";
import { LienKet } from "@/lib/lan-dau";
import { AvtCon, CapAvt, cauSao, conCuaMay, DauHaiDong, hinhMay, laMayChung, laMotCon, mayCuaCon, type ConNganMay } from "@/lib/may-nhieu-con";
import { ChoTai, Chu, gioPhut, Icon3D, LopMen, M, Man, Nut, truoc, useHoanTac, useTai } from "@/lib/ui";

const dangMo = (m: TuanThuMay) => { const den = m.moKhanCapDen ?? m.moDen ?? null; return !!den && Date.parse(den) > Date.now(); };
const trungTinh = (m: TuanThuMay) => (m.trangThai === "tat_may" || m.trangThai === "chua_co_nhip") && !m.dangGo && !dangMo(m);
/** Máy đang được bảo vệ đủ (mức bảo vệ máy chủ tính + còn liên lạc, không lệch chuẩn). «chua» = máy không báo quyền ⇒ không báo đỏ. */
const dangBaoVe = (m: TuanThuMay) => m.trangThai === "tuan_thu" && m.baoVe !== "mot_phan" && !dangMo(m) && !m.dangGo;
const ngan = (t: string) => t.replace(/ · .*$/, "");
function cauTrangThai(m: TuanThuMay) {
  if (m.dangGo) return "Đang gỡ AiiGrow khỏi máy này";
  if (m.moKhanCapDen && Date.parse(m.moKhanCapDen) > Date.now()) return `Đang mở khẩn cấp tới ${gioPhut(m.moKhanCapDen)}`;
  if (m.moDen && Date.parse(m.moDen) > Date.now()) return `Đang mở tới ${gioPhut(m.moDen)}`;
  if (m.trangThai === "ngoai_vong" || m.trangThai === "tat_may" || m.trangThai === "chua_co_nhip")
    return m.lanCuoi ? `Không trừ sao từ ${truoc(m.lanCuoi)}` : "Chưa nhận được tin từ máy";
  if (m.trangThai === "lech_chuan") return m.vanDe[0]?.cauBaMe ?? "Máy đang lệch chuẩn";
  if (m.baoVe === "mot_phan") return m.baoVeThieu?.[0]?.ten ?? m.baoVeCau ?? "Còn thiếu quyền bảo vệ";
  if (m.khoaGiaiTri) return "Giải trí đang khoá";
  return `Đồng bộ ${truoc(m.lanCuoi) || "vừa xong"}`;
}

export default function MayTrongNha() {
  const { con: conVao } = useLocalSearchParams<{ con?: string }>();
  const [loc, setLoc] = useState<string | null>(conVao ? String(conVao) : null);
  const [khoa, setKhoa] = useState(false);
  const { bao, noi } = useHoanTac();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [tt, g, ph] = await Promise.all([bm.goi<{ ds: TuanThuMay[] }>("tuan-thu"), bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null)]);
    return { may: tt.ds, con: g.con, phien: ph?.ds ?? [] };
  });
  const lui = () => (router.canGoBack() ? router.back() : router.replace("/hom-nay"));
  if (!d) return <Man dau={<DauHaiDong tieu="Máy trong nhà" lui={lui} />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const caNha: ConNganMay[] = d.con.map((c) => ({ id: c.id, ten: c.ten, avatar: c.avatar }));
  const c = loc ? d.con.find((x) => x.id === loc) ?? null : null;
  const ds = c ? d.may.filter((m) => mayCuaCon(m, c.id)) : d.may;
  const sao = (id: string) => d.con.find((x) => x.id === id)?.soDu ?? null;
  // app đang mở trên từng máy (phiên chơi đang chạy — khớp theo tên máy, và theo bé đang dùng khi biết)
  const appMo = (m: TuanThuMay) => d.phien.find((p) => p.may && ngan(p.may).replace(/ của .*$/, "") === ngan(m.ten).replace(/ của .*$/, "") && (!m.dangDung || p.con === m.dangDung.id));
  const canSua = ds.filter((m) => !dangBaoVe(m) && !trungTinh(m));
  const baoVe = ds.filter(dangBaoVe);
  const tat = ds.filter((m) => trungTinh(m) && !dangBaoVe(m));
  // bảng «Khoá máy <bé>?» / «Khoá tất cả máy?»: máy chung = khoá theo bé (bé khác vẫn vào)
  const mayKhoa = ds.map((m) => ({ id: m.id, ten: ngan(m.ten), nen: m.nen, truc: !trungTinh(m), khoaMay: m.khoaMay, dungChung: laMayChung(m),
    conKhac: conCuaMay(m, caNha).filter((x) => x.id !== c?.id).map((x) => tenGoi(x.ten)) }));
  const dang = Object.fromEntries(ds.map((m) => { const p = appMo(m); return [m.id, p ? { chu: `● ${p.tenApp} · đang mở`, mo: true } : null]; }).filter((x) => x[1])) as Record<string, { chu: string; mo: boolean }>;
  const nhom = (chu: string, x: TuanThuMay[]) => x.length ? (
    <View key={chu} style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginHorizontal: 6 }}>
        <Chu kieu="rat" co={15} mau="#3a403d">{chu}</Chu>
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: "#ecebe7" }}><Chu kieu="rat" co={12} mau="#3a403d" so>{String(x.length)}</Chu></View>
      </View>
      {x.map((m) => <TheMay key={m.id} m={m} con={conCuaMay(m, caNha)} app={appMo(m)?.tenApp ?? null} sao={sao} />)}
    </View>
  ) : null;
  return (
    <Man noi={noi} tai={tai} dau={<>
      <DauHaiDong tieu="Máy trong nhà" phu={`${ds.length} máy · ${c ? tenGoi(c.ten) : `${d.con.length} bé`}`} canh lui={lui} />
      {d.con.length > 1 ? <DaiLoc con={caNha} loc={loc} doi={setLoc} /> : null}
    </>}
      day={<>
        <Nut chu="+ Ghép thêm máy" rong bam={() => router.push({ pathname: "/may/them", params: c ? { con: c.id } : {} })} />
        {ds.length ? <Nut chu="Khoá tất cả máy ngay" ic="khoa" ic3d loai="vien" rong bam={() => setKhoa(true)} /> : null}
      </>}>
      {ds.length ? null : <Chu kieu="dam" co={14} mau={M.chu2} style={{ marginHorizontal: 6 }}>Chưa có máy nào — ghép bằng mã 6 số, chưa tới 2 phút.</Chu>}
      {nhom("Cần sửa", canSua)}
      {nhom("Đang bảo vệ", baoVe)}
      {nhom("Đang tắt", tat)}
      {ds.length ? (
        <Chu kieu="dam" co={12.5} mau="#565c59" style={{ textAlign: "center", lineHeight: 18, marginHorizontal: 8 }}>
          {"Sao và danh sách app đi theo từng bé: máy chung áp luật của bé đang dùng.\nMột bé mở 2 máy cùng lúc chỉ trừ sao một lần.\niPhone, iPad chỉ dùng được cho một bé."}
        </Chu>
      ) : <LienKet chu="Máy của con cài AiiGrow ở đâu?" bam={() => router.push("/ho-tro")} />}
      <BangKhoaMay mo={khoa} dong={() => setKhoa(false)} con={c?.id ?? null} ten={c ? tenGoi(c.ten) : ""} caNha={c ? undefined : caNha} may={mayKhoa} dang={dang}
        xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} />
    </Man>
  );
}

/** Dải lọc «Tất cả / <bé>» (thiết kế .loc): ô lõm, mục chọn nổi trắng. */
function DaiLoc({ con, loc, doi }: { con: ConNganMay[]; loc: string | null; doi: (v: string | null) => void }) {
  const o = (id: string | null, nhan: string, hinh: React.ReactNode) => {
    const chon = loc === id;
    return (
      <Pressable key={id ?? "ca"} onPress={() => doi(id)} accessibilityRole="tab" accessibilityState={{ selected: chon }} accessibilityLabel={nhan}
        style={{ flex: 1, alignItems: "center", gap: 3, paddingTop: 6, paddingBottom: 5, borderRadius: 20, ...(chon ? { backgroundColor: "#f7f6f3", ...KHOI.nho } : {}) }}>
        {hinh}
        <Chu kieu="rat" co={11.5} mau={chon ? M.chu : "#3a403d"} dong={1}>{nhan}</Chu>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, marginHorizontal: 16, marginBottom: 6, padding: 6, borderRadius: 26, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
      {o(null, "Tất cả", <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: M.nut, backgroundImage: "linear-gradient(#2e3533, #121615)", alignItems: "center", justifyContent: "center" }}><Icon3D ten="nha" co={20} /></View>)}
      {con.slice(0, 4).map((c) => o(c.id, tenGoi(c.ten), <AvtCon c={c} co={32} />))}
    </View>
  );
}

function TheMay({ m, con, app, sao }: { m: TuanThuMay; con: ConNganMay[]; app: string | null; sao: (id: string) => number | null }) {
  const ok = dangBaoVe(m), tt = trungTinh(m), loi = !ok && !tt;
  const ten = ngan(m.ten), tenNgan = ten.replace(/ của .*$/, "");
  const chung = con.length >= 2;
  const ai = m.dangDung ? con.find((x) => x.id === m.dangDung!.id) ?? m.dangDung : con.length === 1 ? con[0] : null;
  const s = ai ? sao(ai.id) : null;
  const [nenTt, chuTt] = loi ? ["#f9e7d2", "#8a3c0c"] : ok ? ["#dcebe6", M.chinhInk] : ["#ecebe7", "#3a403d"];
  const buoc = m.baoVeThieu?.length ?? 0;
  return (
    <Pressable onPress={() => router.push(`/may/${m.id}`)} accessibilityRole="button" accessibilityLabel={`${ten}, ${ok ? "đang bảo vệ" : tt ? "đang tắt" : "chưa bảo vệ"}`}>
      <View style={{ flexDirection: "row", gap: 12, padding: 12, borderRadius: 28, backgroundColor: "#f7f6f3", ...KHOI.the }}>
        <LopMen men={MEN.the} bo={28} />
        <View style={{ width: 76, height: 88, borderRadius: 22, backgroundColor: loi ? "#f3d6b8" : "#ecebe7", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
          <Icon3D ten={hinhMay(m.nen, chung)} co={56} />
          {ok ? <View style={{ position: "absolute", right: -4, bottom: -4 }}><Icon3D ten="khien" co={30} /></View> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Chu kieu="rat" co={17} dong={1} style={{ flex: 1 }}>{ten}</Chu>
            <Chu kieu="rat" co={20} mau={loi ? "#8a3c0c" : M.chinhInk}>›</Chu>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 }}>
            {chung ? <>
              <CapAvt ds={con} co={22} />
              <Chu kieu="dam7" co={12.5} mau="#565c59" dong={1} style={{ flexShrink: 1 }}>
                {`${con.length} bé · ${m.dangDung ? `đang dùng: ${tenGoi(m.dangDung.ten)}` : "chưa ai dùng"}`}
              </Chu>
            </> : con.length === 1 ? <>
              <AvtCon c={con[0]} co={22} />
              <Chu kieu="dam7" co={12.5} mau="#565c59" dong={1} style={{ flexShrink: 1 }}>{tenGoi(con[0].ten)}</Chu>
              <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, backgroundColor: "#ecebe7" }}><Chu kieu="rat" co={11.5} mau="#3a403d">Máy riêng</Chu></View>
            </> : <Chu kieu="rat" co={12.5} mau="#8a3c0c">Chưa bé nào dùng · chọn bé ›</Chu>}
          </View>
          <View style={{ marginTop: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 14, backgroundColor: nenTt, gap: 1 }}>
            {loi ? <>
              <Chu kieu="rat" co={12.5} mau={chuTt} dong={2}>{`! ${m.dangGo || dangMo(m) || m.trangThai === "ngoai_vong" ? cauTrangThai(m) : `Chưa bảo vệ · ${cauTrangThai(m)}`}`}</Chu>
              <Chu kieu="rat" co={12.5} mau={chuTt} dong={1}>{laMotCon(m) || buoc ? `Sửa ${tenNgan}${buoc ? ` trong ${buoc} bước` : ""} ›` : "Xem máy ›"}</Chu>
            </> : <>
              {ok && (app || ai) ? (
                <Chu kieu="dam7" co={12.5} mau={chuTt} dong={1}>
                  <Chu kieu="rat" co={12.5} mau={M.chinh}>● </Chu>{ai ? <Chu kieu="rat" co={12.5} mau={chuTt}>{tenGoi(ai.ten)}</Chu> : null}{app ? `${ai ? " · " : ""}${app} · đang mở` : " · đang dùng"}
                </Chu>
              ) : <Chu kieu="dam7" co={12.5} mau={chuTt} dong={2}>{cauTrangThai(m)}</Chu>}
              {ai && s != null ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon3D ten="sao" co={15} />
                  {s < 0 ? <Chu kieu="dam7" co={12.5} mau="#8a3c0c" dong={1} style={{ flexShrink: 1 }}>{cauSao(s)}</Chu>
                    : <Chu kieu="dam7" co={12.5} mau={chuTt} dong={1} style={{ flexShrink: 1 }}>còn <Chu kieu="rat" co={12.5} mau="#6e4300">{`${s} sao`}</Chu>{` = ${s} phút chơi`}</Chu>}
                </View>
              ) : null}
            </>}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
