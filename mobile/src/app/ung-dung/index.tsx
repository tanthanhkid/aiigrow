// «App của <con>» (thiết kế chốt 14/11 bm-ung-dung/03 them-g7g1cel5 — N3, N4): ba nhóm đèn — Xanh «Dùng thoải mái» · Vàng «Tính giờ» · Đỏ «Đang chặn»
// (nút «Gỡ chặn» ⇒ màn chọn đèn của app đó). Dòng phụ = phút dùng hôm nay (GET con/:id/man-hinh). «+ Thêm app cho <con>» ⇒ ung-dung/them.
// Luật: GET luat (luật riêng của con thắng luật cả nhà); mỗi app một dòng dù có nhiều định danh (roblox.exe, com.roblox.client…).
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, laChiXem, type ConChiTiet } from "@/lib/api";
import { DongDen, MucDen, NhomDen, OIcon, gomTheoTen, icCuaApp, laWeb, luatCuaCon, napManHinh, phutHomNay, veHoac, type Den, type LuatApp } from "@/lib/ui-bm3";
import { ChoTai, Chu, M, Man, Nut, useTai } from "@/lib/ui";

const DEN_CUA = (n: LuatApp[]): Den => (n.some((l) => l.loai === "chan") ? "d" : n.some((l) => l.loai === "giai_tri") ? "v" : "x");

export default function DsApp() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ct, luat, mh, xem] = await Promise.all([bm.goi<ConChiTiet>(`con/${con}`), bm.goi<{ ds: LuatApp[] }>("luat"), napManHinh(con), laChiXem()]);
    return { ten: ct.ten, luat: luatCuaCon(luat.ds, con), mh, xem };
  });
  const ve = () => veHoac(`/chan?con=${con}`);
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="App của con"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const nhom = gomTheoTen(d.luat.filter((l) => !laWeb(l.muc))).map((n) => ({ n, den: DEN_CUA(n), l: n.find((l) => l.loai === "chan") ?? n[0] }))
    .sort((a, b) => (a.l.ten || a.l.muc).localeCompare(b.l.ten || b.l.muc, "vi"));
  const mo = (l: LuatApp) => router.push({ pathname: "/ung-dung/app", params: { con, muc: l.muc, ten: l.ten || l.muc } });
  const phu = (n: LuatApp[], den: Den) => {
    if (den === "d") return n.every((l) => !l.child_id) ? "Ba Mẹ chặn cả nhà" : "Ba Mẹ chặn";
    const p = phutHomNay(d.mh, n.map((l) => l.muc), "app");
    return p === null ? undefined : p ? `Hôm nay ${p} phút` : "Hôm nay chưa dùng";
  };
  const nhomDen = (den: Den) => nhom.filter((x) => x.den === den);
  const doChan = nhomDen("d");

  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`App của ${d.ten}`} tai={tai} vongTai
      day={d.xem ? undefined : <Nut chu={`Thêm app cho ${d.ten}`} ic="cong" rong bam={() => router.push({ pathname: "/ung-dung/them", params: { con } })} />}>
      {!nhom.length ? <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`Chưa có app nào. Thêm app ${d.ten} được dùng — app khác con phải xin Ba Mẹ.`}</Chu> : null}
      {(["x", "v"] as const).map((den) => nhomDen(den).length ? (
        <View key={den} style={{ gap: 8 }}>
          <MucDen den={den} chu={den === "x" ? "Dùng thoải mái" : "Tính giờ"} />
          <NhomDen den={den}>
            {nhomDen(den).map((x, i) => (
              <DongDen key={x.l.muc} dau={i === 0} tieu={x.l.ten || x.l.muc} phu={phu(x.n, den)} trai={<OIcon ic={icCuaApp(`${x.l.ten} ${x.l.muc}`)} co={40} />}
                bam={d.xem ? undefined : () => mo(x.l)} />
            ))}
          </NhomDen>
        </View>
      ) : null)}
      {doChan.length ? (
        <View style={{ gap: 8 }}>
          <MucDen den="d" chu="Đang chặn" phai={`${doChan.length} app`} />
          <NhomDen den="d">
            {doChan.map((x, i) => (
              <DongDen key={x.l.muc} dau={i === 0} tieu={x.l.ten || x.l.muc} phu={phu(x.n, "d")} trai={<OIcon ic={icCuaApp(`${x.l.ten} ${x.l.muc}`)} co={40} />}
                go={d.xem ? undefined : () => mo(x.l)} />
            ))}
          </NhomDen>
          <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 6, marginTop: 6 }}>Gỡ chặn xong, Ba Mẹ chọn đèn xanh hoặc vàng cho app đó.</Chu>
        </View>
      ) : null}
    </Man>
  );
}
