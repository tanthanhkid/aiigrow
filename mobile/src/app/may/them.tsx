// bm1-may-chon-loai / them-o76iq8p5 «Ghép thêm máy» (thiết kế chốt 04/11, L8): «Máy mới của ai?» (chọn Con / + Thêm con),
// «Cài cho máy mới»: Giống <máy trước> (y như máy trước · nên chọn: chép chế độ chặn, giờ chơi, giờ ngủ, app) / Cài riêng (chỉnh sau).
// Không chọn loại máy — trang tải tự nhận. «Lấy mã ghép máy mới cho X» ⇒ màn Ghép máy (mã 6 số + QR + chia sẻ).
import { useEffect, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { tomTat, type TomTat } from "@/lib/ghep-may";
import { Anh3D, DauMan, gioGon, mauHoSo } from "@/lib/lan-dau";
import { Avt, ChoTai, Chu, Icon, Icon3D, M, Man, Nut, Rob, useTai, type TenIcon } from "@/lib/ui";

export default function GhepThemMay() {
  const { con: conVao } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, tt] = await Promise.all([bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu")]);
    return { con: g.con, may: tt.ds };
  });
  const [con, setCon] = useState<string | null>(conVao ? String(conVao) : null);
  const [giong, setGiong] = useState(true);
  const [tom, setTom] = useState<{ may: string; v: TomTat } | null>(null);
  const c = d?.con.find((x) => x.id === con) ?? d?.con[0] ?? null;
  // «Máy trước» = máy của chính Con này; Con chưa có máy ⇒ máy gần nhất trong nhà (chép cấu hình sang Con mới)
  const truoc = d ? d.may.find((m) => m.con === c?.id && !m.dungChung) ?? d.may.find((m) => !m.dungChung && m.con) ?? null : null;
  useEffect(() => {
    let bo = false;
    if (truoc?.con) tomTat(truoc.con).then((v) => { if (!bo) setTom({ may: truoc.id, v }); }, () => {});
    return () => { bo = true; };
  }, [truoc?.id, truoc?.con]);
  const tt = tom && tom.may === truoc?.id ? tom.v : null;
  if (!d) return <Man dau={<DauMan tieu="Ghép thêm máy" ve="/may" />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const chuMay = truoc ? d.con.find((x) => x.id === truoc.con)?.ten : undefined;
  const chuTruoc = truoc ? `${truoc.ten}${chuMay ? ` của ${chuMay}` : ""}` : "";
  const lay = () => c && router.push({ pathname: "/thiet-lap/ghep", params: { con: c.id, nguon: "them", moi: "1", ...(giong && truoc ? { giong: truoc.id } : {}) } });
  const chip = (ic: TenIcon, chu: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, backgroundColor: "#f1f0ec" }}>
      <Icon3D ten={ic} co={16} /><Chu kieu="rat" co={12}>{chu}</Chu>
    </View>
  );
  const oChon = (chon: boolean, bam: () => void, trai: ReactNode, tieu: string, phu: string, duoi?: ReactNode) => (
    <Pressable onPress={bam} accessibilityRole="radio" accessibilityState={{ checked: chon }}
      style={{ borderRadius: 24, backgroundColor: "#fff", padding: 16, gap: 10, ...KHOI.nho, ...(chon ? { boxShadow: `0px 0px 0px 2.5px ${M.chinh}, ${BONG.nho}`, backgroundColor: "#f3faf7" } : {}) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", ...(chon ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: "#e6e5e1", boxShadow: BONG.lom }) }}>
          {chon ? <Icon ten="tick" mau="#fff" co={15} /> : null}
        </View>
        {trai}
        <View style={{ flex: 1 }}><Chu kieu="rat" co={15.5}>{tieu}</Chu><Chu co={12.5} mau={M.chu3}>{phu}</Chu></View>
      </View>
      {duoi}
    </Pressable>
  );
  return (
    <Man dau={<DauMan tieu="Ghép thêm máy" ve="/may" />} day={<Nut chu={`Lấy mã ghép máy mới cho ${c?.ten ?? "con"}`} rong tat={!c} bam={lay} />}>
      <Chu kieu="rat" co={14} mau={M.chu2} style={{ paddingHorizontal: 4 }}>Máy mới của ai?</Chu>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {d.con.map((x) => {
          const chon = x.id === c?.id;
          return (
            <Pressable key={x.id} onPress={() => setCon(x.id)} accessibilityRole="radio" accessibilityState={{ checked: chon }}
              style={{ width: 96, minHeight: 96, borderRadius: 24, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: chon ? "#f3faf7" : "#fff",
                boxShadow: chon ? `0px 0px 0px 2.5px ${M.chinh}, ${BONG.nho}` : BONG.nho }}>
              <Avt ten={x.ten} mau={mauHoSo(x.avatar)[0]} co={46} />
              <Chu kieu="rat" co={13.5} dong={1}>{x.ten}</Chu>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push("/thiet-lap/ten-con")} accessibilityRole="button"
          style={{ width: 96, minHeight: 96, borderRadius: 24, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fff", boxShadow: BONG.nho }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#f1f0ec", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}><Icon ten="cong" mau={M.chu2} co={20} /></View>
          <Chu kieu="rat" co={13.5}>Thêm con</Chu>
        </Pressable>
      </View>
      <Chu kieu="rat" co={14} mau={M.chu2} style={{ paddingHorizontal: 4, marginTop: 4 }}>Cài cho máy mới</Chu>
      {truoc ? oChon(giong, () => setGiong(true), null, `Giống ${chuTruoc}`, "Y như máy trước · nên chọn",
        tt ? <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", paddingLeft: 38 }}>
          {chip("dongho", `${tt.gioChoi.ngayThuong ?? "—"} phút`)}{chip("khoa", tt.cheDoChan === "mo_het" ? "Mở hết" : `${tt.soApp} app`)}{chip("trang_ngu", `Ngủ ${gioGon(tt.ngu.tu)} – ${gioGon(tt.ngu.den)}`)}
        </View> : undefined) : null}
      {oChon(!giong || !truoc, () => setGiong(false), <Icon3D ten="banhrang" co={30} />, "Cài riêng cho máy này", "Chỉnh sau khi ghép xong")}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
        <Anh3D ten="lap_lanh" co={20} /><Chu kieu="dam" co={13.5} mau={M.chu2}>Không cần chọn loại máy, trang tải tự nhận.</Chu>
      </View>
      <View style={{ alignItems: "center" }}><Rob ten="chi" co={150} /></View>
    </Man>
  );
}
