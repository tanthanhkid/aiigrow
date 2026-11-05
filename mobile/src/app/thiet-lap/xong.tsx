// bm1-ob-xong «Xong rồi!» (đã ghép máy) / them-w8q8hcfk (chưa ghép máy) — tóm tắt: chế độ chặn + số app, giờ chơi + giờ ngủ, số việc mỗi ngày;
// đã ghép ⇒ thẻ «Con xin gì, điện thoại Ba Mẹ sẽ báo» (mẫu), «Vào trang của X», «Ghép thêm máy cho X»; chưa ghép ⇒ «Ghép máy cho X».
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type ConChiTiet, type NhiemVu } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { tomTat } from "@/lib/ghep-may";
import { gioGon, LienKet, TieuDe } from "@/lib/lan-dau";
import { layTl, xoaTl } from "@/lib/thiet-lap";
import { Avt, Chu, Icon, Icon3D, M, MAU_CON, Man, Nut, Rob, The, useTai, XuongTai, type TenIcon } from "@/lib/ui";

export default function ObXong() {
  const p = useLocalSearchParams<{ con?: string }>();
  const con = String(p.con ?? layTl().conId ?? "");
  useEffect(() => { xoaTl(); }, []);                // Lần đầu đã xong: lần «Thêm Con» sau bắt đầu form trống
  const { d } = useTai(async () => {
    if (!con) return null;
    const [t, c, nv] = await Promise.all([tomTat(con), bm.goi<ConChiTiet>(`con/${con}`), bm.goi<{ ds: NhiemVu[] }>("nhiem-vu")]);
    return { t, may: c.may.filter((m) => !m.dungChung), soViec: nv.ds.filter((x) => x.bat !== false && (x.giao_cho === con || !x.giao_cho)).length };
  });
  const ten = d?.t.ten ?? "con";
  const coMay = !!d?.may.length;
  const dong = (ic: TenIcon, chu: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#f1f0ec", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}><Icon3D ten={ic} co={26} /></View>
      <Chu kieu="rat" co={15} style={{ flex: 1 }}>{chu}</Chu>
      {coMay ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center", boxShadow: BONG.ngoc }}><Icon ten="tick" mau="#fff" co={14} /></View> : null}
    </View>
  );
  if (!d && con) return <Man><XuongTai /></Man>;
  return (
    <Man day={coMay ? <><Nut chu={`Vào trang của ${ten}`} rong bam={() => router.replace("/hom-nay")} />
      <LienKet chu={`+ Ghép thêm máy cho ${ten}`} bam={() => router.push({ pathname: "/may/them", params: { con } })} /></>
      : <Nut chu="Vào Trang chủ" rong bam={() => router.replace("/hom-nay")} />}>
      <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
        <Rob ten="xong" co={170} />
        <TieuDe chu="Xong rồi!" phu={coMay ? `Rob bắt đầu trông ${d!.may[0].ten} của ${ten}.` : `${ten} đã có việc và giờ chơi.`} giua />
      </View>
      {d ? (
        <The>
          {dong("khien", d.t.cheDoChan === "mo_het" ? "Mở hết · chỉ tính giờ" : `Chỉ app được phép · ${d.t.soApp} app`)}
          {dong("dongho", `Chơi ${d.t.gioChoi.ngayThuong ?? "—"} phút · ngủ ${gioGon(d.t.ngu.tu)}`)}
          {dong("sao", `${d.soViec} việc mỗi ngày`)}
        </The>
      ) : null}
      {coMay ? (
        <View style={{ borderRadius: 26, backgroundColor: "#fff1c9", padding: 14, gap: 10, ...KHOI.the }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon3D ten="chuong" co={22} /><Chu kieu="rat" co={14.5} mau={M.diemInk}>Con xin gì, điện thoại Ba Mẹ sẽ báo</Chu></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 18, padding: 10, ...KHOI.nho }}>
            <Avt ten={ten} mau={MAU_CON[0]} co={34} />
            <View style={{ flex: 1 }}><Chu kieu="rat" co={13.5}>{`${ten} xin mở`}</Chu><Chu co={12.5} mau={M.chu3}>YouTube 30 phút</Chu></View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "#f1f0ec" }}><Chu kieu="rat" co={13}>Không</Chu></View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: M.nut }}><Chu kieu="rat" co={13} mau="#fff">Cho</Chu></View>
          </View>
        </View>
      ) : (
        <View style={{ borderRadius: 26, backgroundColor: "#fff1c9", padding: 14, gap: 10, ...KHOI.the }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon3D ten="may_tinh" co={22} /><Chu kieu="rat" co={14.5} mau={M.diemInk}>Chưa có máy nào</Chu></View>
          <Chu co={13.5} mau={M.chu2}>{`Rob chỉ trông được khi máy của ${ten} đã ghép`}</Chu>
          <Nut chu={`Ghép máy cho ${ten}`} loai="ngoc" rong bam={() => router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } })} />
        </View>
      )}
    </Man>
  );
}
