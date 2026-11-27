// «Thêm app cho <con>» (bàn bm-ung-dung them-vw103x88@v8 — #262): TÌM TRƯỚC, làm hết trong 1 màn. Ô tìm ở đầu; gõ tên mới hiện
// «Kết quả cho «…»» — app THẬT trên các máy của con (GET may/:id/ung-dung) + app Grow gợi ý (GET app-goi-y) khớp tên / tương tự. Chạm ＋ ⇒ ngay dưới
// app đó hiện «<app> có tính phút không?» (Tính phút · Trả bằng sao | Không tính phút · Vào thoải mái); chọn được nhiều app.
// «Thêm Minecraft · Tính phút» ⇒ POST con/:id/danh-sach {ds: [{nhom, ma} | {nhom, ten}]} (máy chủ ghi mọi định danh cùng tên trên mọi máy) ⇒ về danh sách App.
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { bm, type ConChiTiet } from "@/lib/api";
import { themVaoDs } from "@/lib/app-web";
import { KhoiAppMay, taiAppCuaCon } from "@/lib/app-may-ui";
import { bamChonThem, chuNutThem, datNhomThem, KetQuaThem, NhomGoiY, type ChonThem, type MucThem } from "@/lib/ds-chung";
import { OTim, icCuaApp, laWeb, luatCuaCon, veHoac, type LuatApp } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Man, Nut, useLam, useTai } from "@/lib/ui";

type GoiY = { ma: string; ten: string; tinhGio: boolean; chon: boolean };
type Ung = { k: string; ten: string; muc: string; anh: string | null; phu: string; tinhGio: boolean; ma?: string };
// đoán «không tính giờ» khi lưới gợi ý không có app này: so TỪ trọn vẹn (không so chuỗi con — «book» khớp nhầm Facebook)
const KHONG_TINH = new Set(["scratch", "zoom", "teams", "meet", "word", "excel", "powerpoint", "onenote", "office", "sách", "sach", "ebook", "kindle", "dictionary", "từ", "điển", "khanacademy", "khan", "aiirob", "học", "hoc", "edu", "classroom", "duolingo", "geogebra"]);
const khongTinh = (t: string) => t.toLowerCase().split(/[^\p{L}\p{N}]+/u).some((w) => KHONG_TINH.has(w));
const chuan = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");

export default function ThemApp() {
  const { con } = useLocalSearchParams<{ con: string }>();
  // #661: không có ?con (mở thẳng/tải lại) ⇒ về màn chọn bé
  if (!con) return <Redirect href="/chan" />;
  return <ThemAppCon con={con} />;
}
function ThemAppCon({ con }: { con: string }) {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ct, gy, luat] = await Promise.all([
      bm.goi<ConChiTiet>(`con/${con}`), bm.goi<{ ds: GoiY[] }>(`app-goi-y?con=${con}`).catch(() => ({ ds: [] as GoiY[] })), bm.goi<{ ds: LuatApp[] }>("luat"),
    ]);
    const may = await taiAppCuaCon(con, ct);
    return { ten: ct.ten, gy: gy.ds, luat: luatCuaCon(luat.ds, con).filter((l) => !laWeb(l.muc)), may };
  });
  const [tim, setTim] = useState("");
  const [chon, setChon] = useState<ChonThem>(new Map());
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = () => veHoac(`/ung-dung?con=${con}`);

  // mọi app có thể thêm: app thật của máy trước (có icon, đúng tên), rồi app gợi ý chưa có trên máy; bỏ app đã được dùng (xanh / vàng)
  const tatCa = useMemo<Ung[]>(() => {
    if (!d) return [];
    const den = new Map<string, string>();
    for (const l of d.luat) den.set(chuan(l.ten || l.muc), l.loai);
    const gy = new Map(d.gy.map((g) => [chuan(g.ten), g]));
    const m = new Map<string, Ung>();
    for (const x of d.may) for (const a of x.ds) {
      const k = chuan(a.ten);
      if (!k || a.trangThai === "he_thong" || m.has(k)) continue;
      const g = gy.get(k);
      m.set(k, { k, ten: a.ten, muc: a.muc, anh: a.icon, phu: [a.nhaPhatHanh, `trên ${x.ten}`].filter(Boolean).join(" · "), tinhGio: g ? g.tinhGio : !khongTinh(`${a.ten} ${a.muc}`),
        ma: g?.ma });
    }
    for (const g of d.gy) {
      const k = chuan(g.ten);
      if (!m.has(k)) m.set(k, { k, ten: g.ten, muc: g.ten, anh: null, phu: "Grow gợi ý", tinhGio: g.tinhGio, ma: g.ma });
    }
    return [...m.values()].filter((u) => { const l = den.get(u.k); return l !== "hoc" && l !== "giai_tri"; });
  }, [d]);

  // Lần đầu · bước App và màn này CÙNG bố cục (#508 mục 6): «App trên <máy>» + «Chưa xếp» (hai nút nhóm ngay dòng), chưa ghép máy ⇒ thẻ «Ghép máy» + gợi ý ＋
  const daXep = useMemo(() => new Set((d?.luat ?? []).map((l) => chuan(l.ten || l.muc))), [d]);
  const goiYHien = useMemo(() => (d?.may.some((m) => m.ds.some((x) => x.trangThai !== "he_thong")) ? [] : (d?.gy ?? []).filter((g) => !daXep.has(chuan(g.ten))).slice(0, 5)), [d, daXep]);
  const themNgay = (ten: string, nhom: "tinh_phut" | "khong_tinh_phut", ma?: string) => lam(async () => { await themVaoDs(con, [ma ? { nhom, ma } : { nhom, ten }]); await tai(); });
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="Thêm app"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const q = chuan(tim);
  // gõ ≥ 2 ký tự mới hiện kết quả: khớp đúng tên trước, rồi tên bắt đầu bằng chữ gõ, rồi tên chứa chữ gõ (app tương tự)
  const kq = q.length < 2 ? [] : tatCa.filter((u) => chuan(u.ten).includes(q) || chuan(u.muc).includes(q))
    .sort((a, b) => Number(chuan(b.ten) === q) - Number(chuan(a.ten) === q) || Number(chuan(b.ten).startsWith(q)) - Number(chuan(a.ten).startsWith(q)) || a.ten.localeCompare(b.ten, "vi"))
    .slice(0, 20);
  const mt = (u: Ung): MucThem => ({ k: u.k, ten: u.ten, phu: u.phu, anh: u.anh, ic: icCuaApp(`${u.ten} ${u.muc}`), nhom: u.tinhGio ? "tinh_phut" : "khong_tinh_phut" });
  const luu = () => lam(async () => {
    await themVaoDs(con, [...chon.values()].map(({ m, nhom: n }) => { const nhom = n ?? "khong_tinh_phut"; const u = tatCa.find((x) => x.k === m.k); return u?.ma ? { nhom, ma: u.ma } : { nhom, ten: m.ten }; }));
    ve();
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`Thêm app cho ${d.ten}`} dau={<View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
      <OTim gia={tim} doi={setTim} goiY="Gõ tên app: Minecraft, Zalo…" nhan="Tìm app" khongKinh />
    </View>} day={<>
      <BaoLoi loi={loiLam} />
      <Nut thu chu={chuNutThem(chon, "app")} rong dangChay={dangChay} tat={!chon.size} bam={luu} />
    </>}>
      {tim.trim().length < 2 ? <>
        <KhoiAppMay ten={d.ten} may={d.may} loc={tim.trim()} daXep={(a) => daXep.has(chuan(a.ten))} chon={(a, n) => themNgay(a.ten, n)}
          ghep={() => router.push({ pathname: "/may/them", params: { con } })} />
        <NhomGoiY tieu={`Gợi ý cho ${d.ten}`} ds={goiYHien.map((g) => ({ k: g.ma, ten: g.ten, ic: icCuaApp(g.ten) }))}
          them={(t, n) => themNgay(t, n, goiYHien.find((g) => g.ten === t)?.ma)} />
      </> : null}
      {tim.trim().length >= 2 ? (
        <KetQuaThem go={tim} kq={kq.map(mt)} chon={chon} doi={(m) => setChon(bamChonThem(m))} datNhom={(m, n) => setChon(datNhomThem(m, n))}
          trong="Không thấy app này trên máy của con. Con cài app xong, máy gửi danh sách mới là tìm được."
          chuaGo={`Gõ tên app ${d.ten} muốn dùng. App chưa thêm thì con chưa mở được — con muốn dùng sẽ xin Ba Mẹ.`} />
      ) : null}
    </Man>
  );
}
