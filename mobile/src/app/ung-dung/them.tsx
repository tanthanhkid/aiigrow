// «Thêm app cho <con>» (thiết kế chốt 14/11 bm-ung-dung/04 them-vw103x88 — N5): TÌM TRƯỚC, làm hết trong 1 màn. Ô tìm ở đầu; gõ tên mới hiện
// «Kết quả cho «…»» — app THẬT trên các máy của con (GET may/:id/ung-dung) + app Grow gợi ý (GET app-goi-y) khớp tên / tương tự. Chạm ＋ ⇒ ngay dưới
// app đó hiện «Cho <con> dùng thế nào?» (Dùng thoải mái · Tính giờ); chọn được nhiều app. «Lưu …» ⇒ POST con/:id/app-cho-phep
// {apps: [{ma, tinhGio} | {ten, tinhGio}]} (máy chủ ghi luật cho mọi định danh cùng tên trên mọi máy của con) ⇒ về danh sách App.
import { useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { bm, type ConChiTiet } from "@/lib/api";
import { ChonDenNgang, DongDen, NhomDen, NutCong, OIcon, OTim, icCuaApp, khoaTen, laWeb, luatCuaCon, veHoac, type Den, type LuatApp } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Chu, M, Man, Nut, useLam, useTai } from "@/lib/ui";

type GoiY = { ma: string; ten: string; tinhGio: boolean; chon: boolean };
type AppMay = { khoa: string; muc: string; ten: string; icon: string | null; trangThai: string; nhaPhatHanh: string | null };
type Ung = { k: string; ten: string; muc: string; anh: string | null; phu: string; tinhGio: boolean; ma?: string; dangChan: boolean };
// đoán «không tính giờ» khi lưới gợi ý không có app này: so TỪ trọn vẹn (không so chuỗi con — «book» khớp nhầm Facebook)
const KHONG_TINH = new Set(["scratch", "zoom", "teams", "meet", "word", "excel", "powerpoint", "onenote", "office", "sách", "sach", "ebook", "kindle", "dictionary", "từ", "điển", "khanacademy", "khan", "aiirob", "học", "hoc", "edu", "classroom", "duolingo", "geogebra"]);
const khongTinh = (t: string) => t.toLowerCase().split(/[^\p{L}\p{N}]+/u).some((w) => KHONG_TINH.has(w));
const chuan = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");

export default function ThemApp() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ct, gy, luat] = await Promise.all([
      bm.goi<ConChiTiet>(`con/${con}`), bm.goi<{ ds: GoiY[] }>(`app-goi-y?con=${con}`).catch(() => ({ ds: [] as GoiY[] })), bm.goi<{ ds: LuatApp[] }>("luat"),
    ]);
    const may = await Promise.all(ct.may.map((m) => bm.goi<{ ds: AppMay[] }>(`may/${m.id}/ung-dung`).then((r) => ({ ten: m.ten, ds: r.ds }), () => null)));
    return { ten: ct.ten, gy: gy.ds, luat: luatCuaCon(luat.ds, con).filter((l) => !laWeb(l.muc)), may: may.filter((x) => x !== null) };
  });
  const [tim, setTim] = useState("");
  const [chon, setChon] = useState<Map<string, { u: Ung; den: Den }>>(new Map());
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = () => veHoac(`/ung-dung?con=${con}`);

  // mọi app có thể thêm: app thật của máy trước (có icon, đúng tên), rồi app gợi ý chưa có trên máy; bỏ app đã được dùng (xanh / vàng)
  const tatCa = useMemo<Ung[]>(() => {
    if (!d) return [];
    const den = new Map<string, string>();
    for (const l of d.luat) { const k = chuan(l.ten || l.muc); if (den.get(k) !== "chan") den.set(k, l.loai); }
    const gy = new Map(d.gy.map((g) => [chuan(g.ten), g]));
    const m = new Map<string, Ung>();
    for (const x of d.may) for (const a of x.ds) {
      const k = chuan(a.ten);
      if (!k || a.trangThai === "he_thong" || m.has(k)) continue;
      const g = gy.get(k);
      m.set(k, { k, ten: a.ten, muc: a.muc, anh: a.icon, phu: [a.nhaPhatHanh, `trên ${x.ten}`].filter(Boolean).join(" · "), tinhGio: g ? g.tinhGio : !khongTinh(`${a.ten} ${a.muc}`),
        ma: g?.ma, dangChan: a.trangThai === "chan" || den.get(k) === "chan" });
    }
    for (const g of d.gy) {
      const k = chuan(g.ten);
      if (!m.has(k)) m.set(k, { k, ten: g.ten, muc: g.ten, anh: null, phu: "Grow gợi ý", tinhGio: g.tinhGio, ma: g.ma, dangChan: den.get(k) === "chan" });
    }
    return [...m.values()].filter((u) => { const l = den.get(u.k); return l !== "hoc" && l !== "giai_tri"; });
  }, [d]);

  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="Thêm app"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const q = chuan(tim);
  // gõ ≥ 2 ký tự mới hiện kết quả: khớp đúng tên trước, rồi tên bắt đầu bằng chữ gõ, rồi tên chứa chữ gõ (app tương tự)
  const kq = q.length < 2 ? [] : tatCa.filter((u) => chuan(u.ten).includes(q) || chuan(u.muc).includes(q))
    .sort((a, b) => Number(chuan(b.ten) === q) - Number(chuan(a.ten) === q) || Number(chuan(b.ten).startsWith(q)) - Number(chuan(a.ten).startsWith(q)) || a.ten.localeCompare(b.ten, "vi"))
    .slice(0, 20);
  const ngoai = [...chon.values()].filter((x) => !kq.some((u) => u.k === x.u.k)).map((x) => x.u);     // đã chọn nhưng không khớp chữ đang gõ
  const doi = (u: Ung) => setChon((c) => { const n = new Map(c); if (n.has(u.k)) n.delete(u.k); else n.set(u.k, { u, den: u.tinhGio ? "v" : "x" }); return n; });
  const datDen = (u: Ung, den: Den) => setChon((c) => new Map(c).set(u.k, { u, den }));
  const luu = () => lam(async () => {
    const apps = [...chon.values()].map(({ u, den }) => (u.ma ? { ma: u.ma, tinhGio: den === "v" } : { ten: u.ten, tinhGio: den === "v" }));
    await bm.goi(`con/${con}/app-cho-phep`, { apps });
    ve();
  });
  const dong = (u: Ung, i: number) => {
    const c = chon.get(u.k);
    return (
      <View key={u.k} style={{ paddingBottom: c ? 12 : 0 }}>
        <DongDen dau={i === 0} tieu={u.ten} phu={u.phu} trai={<OIcon ic={icCuaApp(`${u.ten} ${u.muc}`)} anh={u.anh} co={40} />}
          phai={<View accessibilityRole="checkbox" accessibilityState={{ checked: !!c }}><NutCong chon={!!c} /></View>} bam={() => doi(u)} />
        {c ? (
          <View style={{ gap: 6 }}>
            <Chu kieu="rat" co={13} mau={M.chu2} style={{ marginHorizontal: 2 }}>{`Cho ${d.ten} dùng thế nào?`}</Chu>
            <ChonDenNgang gia={c.den} doi={(x) => datDen(u, x)} />
            {u.dangChan ? <Chu kieu="dam" co={12.5} mau={M.canh}>App này đang bị chặn, Lưu là mở lại.</Chu> : null}
          </View>
        ) : null}
      </View>
    );
  };
  const so = chon.size, mot = so === 1 ? [...chon.values()][0].u.ten : null;
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`Thêm app cho ${d.ten}`} dau={<View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
      <OTim gia={tim} doi={setTim} goiY="Gõ tên app: Minecraft, Zalo…" nhan="Tìm app" />
    </View>} day={<>
      <BaoLoi loi={loiLam} />
      <Nut chu={mot ? `Lưu ${mot}` : so ? `Lưu ${so} app` : "Chọn app để thêm"} rong dangChay={dangChay} tat={!so} bam={luu} />
    </>}>
      {ngoai.length ? (
        <>
          <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Đã chọn</Chu>
          <NhomDen>{ngoai.map(dong)}</NhomDen>
        </>
      ) : null}
      {q.length >= 2 ? (
        <>
          <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>{`Kết quả cho «${tim.trim()}»`}</Chu>
          {kq.length ? <NhomDen>{kq.map(dong)}</NhomDen> : (
            <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>Không thấy app này trên máy của con. Con cài app xong, máy gửi danh sách mới là tìm được.</Chu>
          )}
        </>
      ) : !ngoai.length ? (
        <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`Gõ tên app ${d.ten} muốn dùng. App chưa thêm vẫn bị chặn — con muốn dùng sẽ xin Ba Mẹ.`}</Chu>
      ) : null}
    </Man>
  );
}
