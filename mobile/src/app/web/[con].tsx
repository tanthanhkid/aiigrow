// «Web của <con>» (thiết kế chốt 14/11 bm-ung-dung/07 bm2-web — N3, N4: App và Web ngang chức năng): hàng «Con xin mở …» (Trả lời ›), ba nhóm đèn —
// Xanh «Vào thoải mái» (luật hoc / cho_phep) · Vàng «Tính giờ» (giai_tri) · Đỏ «Đang chặn» (nút «Gỡ chặn» ⇒ màn chọn đèn của trang), «Luôn chặn … không
// gỡ được», nút «+ Thêm trang web cho <con>». Dòng phụ = phút vào hôm nay / lúc con thử vào trang bị chặn (GET con/:id/web?ngay=1).
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type ConChiTiet, type ThongKeWeb, type YeuCau } from "@/lib/api";
import { DongDen, HangVang, MucDen, NhomDen, OIcon, denCua, icCuaApp, lucNgan, veHoac, type Den } from "@/lib/ui-bm3";
import { ChoTai, Chu, M, Man, Nut, gioPhut, useTai } from "@/lib/ui";

type LuatWeb = ThongKeWeb["luat"][number];
const ICON_WEB = (muc: string) => { const i = icCuaApp(muc); return i === "web" ? "sach" : i; };

export default function WebCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [w, ct, cd, xem] = await Promise.all([
      bm.goi<ThongKeWeb>(`con/${con}/web?ngay=1`), bm.goi<ConChiTiet>(`con/${con}`),
      bm.goi<{ yeuCau: YeuCau[] }>("cho-duyet").catch(() => ({ yeuCau: [] as YeuCau[] })), laChiXem(),
    ]);
    return { w, ten: ct.ten, xin: cd.yeuCau.filter((y) => y.child_id === con && y.loai === "mo_web"), xem };
  });
  const ve = () => veHoac(`/chan?con=${con}`);
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="Web của con"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  // một tên miền có thể có luật cả nhà lẫn luật riêng của con ⇒ luật riêng của con thắng (như máy chủ áp), mỗi tên miền một dòng
  const hieuLuc = new Map<string, LuatWeb>();
  for (const l of d.w.luat) if (l.nguon === "gia_dinh") hieuLuc.set(l.tenMien, l);
  for (const l of d.w.luat) if (l.nguon === "con") hieuLuc.set(l.tenMien, l);
  const ds = [...hieuLuc.values()].map((l) => ({ l, den: denCua(l.trangThai) })).filter((x): x is { l: LuatWeb; den: Den } => !!x.den)
    .sort((a, b) => a.l.tenMien.localeCompare(b.l.tenMien));
  const dung = (muc: string) => d.w.top.filter((t) => t.tenMien === muc || t.tenMien.endsWith(`.${muc}`));
  const phu = (l: LuatWeb, den: Den) => {
    const t = dung(l.tenMien);
    if (den === "d") {
      const cuoi = t.map((x) => x.lanCuoi).filter((x): x is string => !!x).sort().pop();
      return cuoi ? `Con thử vào lúc ${gioPhut(cuoi)}` : l.nguon === "gia_dinh" ? "Ba Mẹ chặn cả nhà" : "Ba Mẹ chặn";
    }
    const p = Math.round(t.reduce((a, x) => a + x.giay, 0) / 60);
    return p ? `Hôm nay ${p} phút` : "Hôm nay chưa vào";
  };
  const mo = (l: LuatWeb) => router.push({ pathname: "/web/trang", params: { con, muc: l.tenMien } });
  const nhom = (den: Den) => ds.filter((x) => x.den === den);
  const doChan = nhom("d");

  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`Web của ${d.ten}`} tai={tai} vongTai
      day={d.xem ? undefined : <Nut chu={`Thêm trang web cho ${d.ten}`} ic="cong" rong bam={() => router.push({ pathname: "/web/them", params: { con } })} />}>
      {d.xin.map((y) => (
        <HangVang key={y.id} ic="web" tieu={`Con xin mở ${y.gia_tri ?? "trang web"}${y.phut ? ` ${y.phut} phút` : ""}`} phu={`${lucNgan(y.created_at)} · đang chờ Ba Mẹ`}
          nut="Trả lời ›" bam={() => router.push({ pathname: "/yeu-cau-web/[id]", params: { id: y.id } })} />
      ))}
      {!ds.length ? <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`Chưa có trang nào. Ở chế độ «Chặn app & web», trang lạ ${d.ten} phải xin Ba Mẹ.`}</Chu> : null}
      {(["x", "v"] as const).map((den) => nhom(den).length ? (
        <View key={den} style={{ gap: 8 }}>
          <MucDen den={den} chu={den === "x" ? "Vào thoải mái" : "Tính giờ"} />
          <NhomDen den={den}>
            {nhom(den).map((x, i) => (
              <DongDen key={x.l.tenMien} dau={i === 0} tieu={x.l.tenMien} phu={phu(x.l, den)} trai={<OIcon ic={den === "v" ? "game" : ICON_WEB(x.l.tenMien)} co={40} />}
                bam={d.xem ? undefined : () => mo(x.l)} />
            ))}
          </NhomDen>
        </View>
      ) : null)}
      {doChan.length ? (
        <View style={{ gap: 8 }}>
          <MucDen den="d" chu="Đang chặn" phai={`${doChan.length} trang`} />
          <NhomDen den="d">
            {doChan.map((x, i) => (
              <DongDen key={x.l.tenMien} dau={i === 0} tieu={x.l.tenMien} phu={phu(x.l, "d")} trai={<OIcon ic={icCuaApp(x.l.tenMien)} co={40} />}
                go={d.xem ? undefined : () => mo(x.l)} />
            ))}
          </NhomDen>
          <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 6, marginTop: 6 }}>Gỡ chặn xong, Ba Mẹ chọn đèn xanh hoặc vàng cho trang đó.</Chu>
        </View>
      ) : null}
    </Man>
  );
}
