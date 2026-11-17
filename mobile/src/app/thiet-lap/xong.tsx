// bm1-ob-xong «Xong rồi!» (đã ghép máy) / them-w8q8hcfk (chưa ghép máy) — tóm tắt (thiết kế 15/11 #262/#264): «Theo danh sách · N app» / «Mở hết»,
// «Chơi bằng sao · 1 sao = 1 phút», số việc mỗi ngày; mẫu lời xin «Xin thêm YouTube vào danh sách · Bỏ qua / Thêm»;
// đã ghép ⇒ thẻ «Con xin gì, điện thoại Ba Mẹ sẽ báo» (mẫu), «Vào trang của X», «Ghép thêm máy cho X»; chưa ghép ⇒ «Ghép máy cho X».
// Thiết kế 14/11: «Grow» thay «Rob» (N6); tên chế độ «Theo danh sách» / «Mở hết» (N2 — thiết kế 04/05 còn ghi «Chỉ app Ba Mẹ chọn», chọn theo luật N2).
import { cheDoTu } from "@/lib/app-web";
import { tenGoi } from "@/lib/hang-ngay";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type ConChiTiet, type NhiemVu } from "@/lib/api";
import { MEN, BONG, KHOI } from "@/lib/clay";
import { tomTat } from "@/lib/ghep-may";
import { LienKet, TieuDe } from "@/lib/lan-dau";
import { datTl, layTl, xoaTl } from "@/lib/thiet-lap";
import { Avt, Chu, Icon, Icon3D, M, MAU_CON, Man, Nut, Rob, The, useTai, XuongTai, type TenIcon } from "@/lib/ui";

export default function ObXong() {
  const p = useLocalSearchParams<{ con?: string }>();
  const con = String(p.con ?? layTl().conId ?? "");
  // Con khác đã lưu trong lượt này («Thêm con khác») còn chưa giao việc / luật sao / ghép máy ⇒ mời làm tiếp
  const [conLai] = useState(() => (layTl().daLuu ?? []).filter((x) => x.id !== con));
  useEffect(() => { xoaTl(); }, []);                // Lần đầu đã xong: lần «Thêm Con» sau bắt đầu form trống
  const tiepCon = (x: (typeof conLai)[number]) => {
    datTl({ conId: x.id, tenCon: x.ten, mau: x.mau, namSinh: x.namSinh, daLuu: conLai });
    router.push("/thiet-lap/mau");
  };
  const { d } = useTai(async () => {
    if (!con) return null;
    const [t, c, nv] = await Promise.all([tomTat(con), bm.goi<ConChiTiet>(`con/${con}`), bm.goi<{ ds: NhiemVu[] }>("nhiem-vu")]);
    return { t, may: c.may.filter((m) => !m.dungChung), soViec: nv.ds.filter((x) => x.bat !== false && (x.giao_cho === con || !x.giao_cho)).length };
  });
  const ten = d?.t.ten ? tenGoi(d.t.ten) : "con";      // tên gọi ngắn như bàn («Bảo Anh»)
  const coMay = !!d?.may.length;
  const dong = (ic: TenIcon, chu: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}><Icon3D ten={ic} co={26} /></View>
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
        {/* bàn bm1-ob-xong v15 / them-w8q8hcfk v5: huy hiệu tick ngọc tròn chồng góc dưới phải Grow */}
        <View>
          <Rob ten="xong" co={170} />
          <View style={{ position: "absolute", right: -14, bottom: 4, width: 52, height: 52, borderRadius: 26, backgroundColor: M.chinh, borderWidth: 4, borderColor: "#fff",
            alignItems: "center", justifyContent: "center", boxShadow: BONG.ngoc }}><Icon ten="tick" mau="#fff" co={24} /></View>
        </View>
        <TieuDe chu="Xong rồi!" phu={coMay ? `Grow bắt đầu trông ${d!.may[0].ten.includes(ten) ? d!.may[0].ten : `${d!.may[0].ten} của ${ten}`}.` : `${ten} đã có việc và luật chơi bằng sao.`} giua />
      </View>
      {d ? (
        <The>
          {dong("khien", cheDoTu(d.t) === "mo_het" ? "Mở hết · không tính phút" : `Theo danh sách · ${d.t.soApp} app`)}
          {dong("dongho", "Chơi bằng sao · 1 sao = 1 phút")}
          {dong("sao", `${d.soViec} việc mỗi ngày`)}
        </The>
      ) : null}
      {conLai.map((x) => <Nut key={x.id} chu={`Thiết lập tiếp cho ${x.ten}`} loai="vien" rong bam={() => tiepCon(x)} />)}
      {coMay ? (
        <View style={{ borderRadius: 26, backgroundColor: M.diemSoft, padding: 16, gap: 10, ...KHOI.the }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon3D ten="chuong" co={22} /><Chu kieu="rat" co={14.5} mau={M.diemInk}>Con xin gì, điện thoại Ba Mẹ sẽ báo</Chu></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: M.the, borderRadius: 18, padding: 10, ...KHOI.nho }}>
            <Avt ten={ten} mau={MAU_CON[0]} co={34} />
            <View style={{ flex: 1 }}><Chu kieu="rat" co={13.5}>Xin thêm YouTube</Chu><Chu co={12.5} mau={M.chu3}>vào danh sách</Chu></View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: M.xamSoft }}><Chu kieu="rat" co={13}>Bỏ qua</Chu></View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: M.diem, backgroundImage: MEN.vang }}><Chu kieu="rat" co={13} mau={M.chu}>Thêm</Chu></View>
          </View>
        </View>
      ) : (
        <View style={{ borderRadius: 26, backgroundColor: M.diemSoft, padding: 16, gap: 10, ...KHOI.the }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon3D ten="may_tinh" co={22} /><Chu kieu="rat" co={14.5} mau={M.diemInk}>Chưa có máy nào</Chu></View>
          <Chu co={13.5} mau={M.chu2}>{`Grow chỉ trông được khi máy của ${ten} đã ghép`}</Chu>
          <Nut chu={`Ghép máy cho ${ten}`} loai="ngoc" rong bam={() => router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } })} />
        </View>
      )}
    </Man>
  );
}
