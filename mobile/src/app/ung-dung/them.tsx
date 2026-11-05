// «Thêm app cho <con>» (thiết kế chốt bm-ung-dung/02): Rob nói một câu, lưới 3 cột chọn app (icon, tên, «Tính vào giờ chơi» / «Không tính giờ»),
// «App còn lại trên máy vẫn bị khoá…», nút «Cho <con> dùng N app».
// Nguồn lưới: có máy (`may`) và máy đã gửi danh sách ⇒ app THẬT chưa được dùng trên máy đó (ghi POST may/:id/ung-dung/dat — đúng định danh của máy);
// chưa có ⇒ lưới gợi ý của Rob theo tuổi (GET app-goi-y, ghi POST con/:id/app-cho-phep {apps:[{ma}]} — áp mọi định danh, tự khớp khi máy báo).
import { useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { bm, type ConChiTiet } from "@/lib/api";
import { OChonApp, RobNoi, icCuaApp, veHoac } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Chu, M, Man, Nut, ONhap, useLam, useTai } from "@/lib/ui";

type GoiY = { ma: string; ten: string; tinhGio: boolean; chon: boolean };
type AppMay = { khoa: string; muc: string; ten: string; icon: string | null; trangThai: string };
type O = { k: string; ten: string; ic: ReturnType<typeof icCuaApp>; anh?: string | null; tinhGio: boolean; ma?: string; khoa?: string; goiYChon?: boolean };
const KHONG_TINH = /scratch|zoom|teams|meet|word|excel|powerpoint|office|sách|sach|book|từ điển|dict|khan|aiirob|học|hoc|edu/i;
const chuan = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export default function ThemApp() {
  const ts = useLocalSearchParams<{ con: string; may?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ct, gy, dm] = await Promise.all([
      bm.goi<ConChiTiet>(`con/${ts.con}`), bm.goi<{ ds: GoiY[] }>(`app-goi-y?con=${ts.con}`).catch(() => ({ ds: [] as GoiY[] })),
      ts.may ? bm.goi<{ ds: AppMay[] }>(`may/${ts.may}/ung-dung`).catch(() => null) : Promise.resolve(null),
    ]);
    return { ten: ct.ten, may: ct.may.find((m) => m.id === ts.may)?.ten ?? null, gy: gy.ds, dm: dm?.ds ?? null };
  });
  const [chon, setChon] = useState<string[] | null>(null);
  const [tim, setTim] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = () => veHoac(ts.may ? `/ung-dung/${ts.may}` : `/app-web?con=${ts.con}`);

  const o = useMemo<O[]>(() => {
    if (!d) return [];
    const gy = new Map(d.gy.map((g) => [chuan(g.ten), g]));
    const thatMay = d.dm?.filter((a) => a.trangThai === "chua_xep" || a.trangThai === "chan") ?? [];
    if (thatMay.length) {
      return thatMay.map((a) => {
        const g = gy.get(chuan(a.ten));
        return { k: a.khoa, ten: a.ten, ic: icCuaApp(`${a.ten} ${a.muc}`), anh: a.icon, khoa: a.khoa, tinhGio: g ? g.tinhGio : !KHONG_TINH.test(`${a.ten} ${a.muc}`), goiYChon: !!g };
      }).sort((x, y) => Number(!!y.goiYChon) - Number(!!x.goiYChon) || x.ten.localeCompare(y.ten, "vi"));
    }
    return d.gy.map((g) => ({ k: g.ma, ten: g.ten, ic: icCuaApp(g.ten), ma: g.ma, tinhGio: g.tinhGio, goiYChon: g.chon }));
  }, [d]);

  if (!d) return <Man lui={{ chu: "" }} tieu="Thêm app"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const daChon = chon ?? (o.some((x) => x.ma) ? o.filter((x) => x.goiYChon).map((x) => x.k) : []);
  const q = chuan(tim);
  const hien = q ? o.filter((x) => chuan(x.ten).includes(q)) : o;
  const doi = (k: string) => setChon(daChon.includes(k) ? daChon.filter((x) => x !== k) : [...daChon, k]);
  const luu = () => lam(async () => {
    const ds = o.filter((x) => daChon.includes(x.k));
    const quaMa = ds.filter((x) => x.ma).map((x) => ({ ma: x.ma }));
    if (quaMa.length) await bm.goi(`con/${ts.con}/app-cho-phep`, { apps: quaMa });
    for (const x of ds.filter((y) => y.khoa)) await bm.goi(`may/${ts.may}/ung-dung/dat`, { khoa: x.khoa, trangThai: x.tinhGio ? "giai_tri" : "hoc" });
    ve();
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`Thêm app cho ${d.ten}`} day={<>
      <BaoLoi loi={loiLam} />
      <Nut chu={daChon.length ? `Cho ${d.ten} dùng ${daChon.length} app` : "Chọn app để cho dùng"} rong dangChay={dangChay} tat={!daChon.length} bam={luu} />
    </>}>
      <RobNoi>{`Chọn app${d.may ? ` trên ${d.may}` : ""} mà ${d.ten} được dùng.`}</RobNoi>
      {o.length > 12 ? <ONhap nhan="Tìm app" value={tim} onChangeText={setTim} placeholder="Minecraft, Zalo, Scratch…" autoCapitalize="none" /> : null}
      {hien.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {hien.slice(0, 60).map((x) => <OChonApp key={x.k} ten={x.ten} ic={x.ic} anh={x.anh} tinhGio={x.tinhGio} chon={daChon.includes(x.k)} bam={() => doi(x.k)} />)}
        </View>
      ) : <Chu co={14} mau={M.chu3}>{q ? "Không có app nào khớp." : "Máy chưa báo app nào mới — app trên máy đều đã được xếp."}</Chu>}
      <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ textAlign: "center", marginTop: 4 }}>App còn lại trên máy vẫn bị khoá. Con muốn thêm sẽ xin Ba Mẹ.</Chu>
    </Man>
  );
}
