// «Giao việc» (bàn 17/11 them-1jii7k19@v10 — cùng khung «Một ngày của <Con>» bm1-ob-mau, emoji từng việc lấy từ GET nhiem-vu/kho): Grow nói «Một ngày của <Con> · Chạm ＋ để thêm vào ngày của con», thanh mục
// Học · Vận động · Giúp Ba Mẹ (100 việc, 10 chủ đề), mỗi việc: icon lõm · tên (nhãn «12+» việc nặng) · sao · ＋ (chạm = chọn, tick ngọc); «Chọn tất cả»
// từng nhóm; việc con đã có hiện «Đã có». Đáy: «Thêm vào ngày của <Con>» = POST nhiem-vu/danh-muc {con, viec} · «+ Ba Mẹ tự thêm việc» → bảng trượt them-6pjz1stu (lib/tu-them-viec).
// Nhà > 1 con và chưa chỉ định con ⇒ dải các con để chọn (N9). Danh mục ở server/lib/danh-muc-viec.ts (docs/API.md «Danh mục việc»).
import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BaoLoi, baoKhiVe, ChoTai, Chu, M, Man, Nut, The, useLam, useTai } from "@/lib/ui";
import { DaiCon } from "@/lib/ui-viec";
import { LienKet } from "@/lib/lan-dau";
import { BongGrow, DauNhom, DongChon, TabMuc, TheDs, type MauMuc } from "@/lib/lan-dau-ds";

type ViecDm = { ma: string; ten: string; sao: number; tu12: boolean; bangChung: string; hinh: string; daCo: boolean };
type ChuDe = { ma: string; ten: string; viec: ViecDm[] };
type MucDm = { ma: "hoc" | "van_dong" | "giup_ba_me"; ten: string; soViec: number; chuDe: ChuDe[] };
type Kho = { chuDe: { ten: string; e: string }[]; ds: { ten: string; e: string }[] };

/** Emoji + màu mỗi mục (thiết kế: 📚 Học ngọc · 🏃 Vận động lam · 🏠 Giúp Ba Mẹ cam — như bm1-ob-mau). */
const MUC_TAB: Record<MucDm["ma"], { e: string; mau: MauMuc }> = { hoc: { e: "📚", mau: "ngoc" }, van_dong: { e: "🏃", mau: "lam" }, giup_ba_me: { e: "🏠", mau: "cam" } };

export default function GiaoViec() {
  const { con: conSan } = useLocalSearchParams<{ con?: string }>();
  const [conChon, setConChon] = useState<string | null>(conSan ?? null);
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  if (!g.d) return <Man lui={{ chu: "" }} tieu={TIEU}><ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man>;
  const c = g.d.con.find((x) => x.id === conChon) ?? g.d.con[0];
  if (!c) return <Man lui={{ chu: "" }} tieu={TIEU}><The><Chu mau={M.chu2}>Chưa có hồ sơ con. Thêm con ở «Cả nhà» để giao việc.</Chu></The></Man>;
  // một khối theo Con (key) ⇒ đổi con là tải lại đúng danh mục (đánh dấu «Đã có» theo con) và xoá lựa chọn cũ
  return <GiaoCho key={c.id} c={c} dsCon={g.d.con.length > 1 && !conSan ? g.d.con : null} tatCaCon={g.d.con} doiCon={setConChon} />;
}

const TIEU = "Giao việc";
// Việc gợi ý đã chạm ＋ giữ theo Con khi mở «+ Ba Mẹ tự thêm việc» rồi quay lại (màn có thể dựng lại ⇒ không để state mất im lặng — #756)
const chonGiu = new Map<string, string[]>();

function GiaoCho({ c, dsCon, tatCaCon, doiCon }: { c: GiaDinh["con"][number]; dsCon: GiaDinh["con"] | null; tatCaCon: GiaDinh["con"]; doiCon: (id: string) => void; }) {
  // danh mục (mã + «Đã có» theo Con) và kho việc (emoji từng việc / chủ đề — cùng tên, server/lib/kho-viec.ts) tải song song
  const dm = useTai(async () => {
    const [d, kho] = await Promise.all([bm.goi<{ muc: MucDm[] }>(`nhiem-vu/danh-muc?con=${encodeURIComponent(c.id)}`),
      bm.goi<Kho>("nhiem-vu/kho").catch(() => null)]);
    return { muc: d.muc, eViec: new Map(kho?.ds.map((v) => [v.ten, v.e]) ?? []), eChuDe: new Map(kho?.chuDe.map((x) => [x.ten, x.e]) ?? []) };
  });
  const [muc, setMuc] = useState<MucDm["ma"]>("hoc");
  const [chon, setChon0] = useState<string[]>(() => chonGiu.get(c.id) ?? []);
  const setChon = (f: string[] | ((x: string[]) => string[])) => setChon0((x) => { const n = typeof f === "function" ? f(x) : f; chonGiu.set(c.id, n); return n; });
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = TIEU;
  const m = useMemo(() => dm.d?.muc.find((x) => x.ma === muc) ?? dm.d?.muc[0], [dm.d, muc]);
  if (!dm.d || !m) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={dm.loi} matMang={dm.matMang} tai={dm.tai} /></Man>;
  const { eViec, eChuDe } = dm.d;

  const doi = (ma: string) => setChon((x) => (x.includes(ma) ? x.filter((y) => y !== ma) : [...x, ma]));
  const conLai = (cd: ChuDe) => cd.viec.filter((v) => !v.daCo).map((v) => v.ma);
  const nhomChon = (cd: ChuDe) => {
    const ds = conLai(cd);
    if (!ds.length) return {};
    const du = ds.every((x) => chon.includes(x));
    return { het: du, bam: () => setChon((x) => (du ? x.filter((y) => !ds.includes(y)) : [...new Set([...x, ...ds])])) };
  };
  const them = () => lam(async () => {
    const r = await bm.goi<{ taoMoi: number }>("nhiem-vu/danh-muc", { con: c.id, viec: chon });
    chonGiu.delete(c.id);
    baoKhiVe(r.taoMoi ? `Đã thêm ${r.taoMoi} việc vào ngày của ${c.ten}` : `${c.ten} đã có sẵn các việc này`);
    router.back();
  });
  const t = MUC_TAB[m.ma];
  const ds = (cd: ChuDe) => (
    <TheDs>
      {cd.viec.map((v, i) => (
        // việc con đã có: dấu ✓ sẵn + dòng phụ «Đã có», chạm không đổi
        <DongChon key={v.ma} dau={!i} e={eViec.get(v.ten) ?? t.e} mau={t.mau} ten={v.ten} sao={v.sao} lon={v.tu12} phu={v.daCo ? "Con đã có việc này" : undefined}
          chon={v.daCo || chon.includes(v.ma)} bam={() => { if (!v.daCo) doi(v.ma); }} />
      ))}
    </TheDs>
  );
  return (
    <Man lui={{ chu: "" }} tieu={tieu} tai={dm.tai}
      day={<>
        <BaoLoi loi={loiLam} />
        <Nut chu={chon.length ? `Thêm ${chon.length} việc vào ngày của ${c.ten}` : `Thêm vào ngày của ${c.ten}`} ic="sao" ic3d rong dangChay={dangChay} tat={!chon.length} bam={them} />
        <LienKet chu="+ Ba Mẹ tự thêm việc" bam={() => router.push(`/giao-nv/tu-dat?con=${c.id}&muc=${muc}&sau=2` as never)} />
      </>}>
      {dsCon ? <DaiCon ds={dsCon} chon={c.id} doi={(x) => doiCon(x.id)} /> : null}
      {/* thiết kế them-1jii7k19@v10 (cùng khung bm1-ob-mau): bong bóng Grow · tab emoji · nhóm «📚 Học 7 Chọn tất cả» · dòng emoji ＋ */}
      <BongGrow tieu={`Một ngày của ${c.ten}`} phu="Chạm ＋ để thêm vào ngày của con" />
      <TabMuc ds={dm.d.muc.map((x) => ({ ma: x.ma, chu: `${MUC_TAB[x.ma].e} ${x.ten}` }))} dang={m.ma} doi={setMuc} />
      {m.chuDe.length === 1 ? (
        <>
          <DauNhom chu={`${t.e} ${m.ten}`} dem={String(m.soViec)} mau={t.mau} {...nhomChon(m.chuDe[0])} />
          {ds(m.chuDe[0])}
        </>
      ) : (
        <>
          <DauNhom chu={`${t.e} ${m.ten}`} dem={`${m.soViec} · ${m.chuDe.length} chủ đề`} mau={t.mau} />
          {m.chuDe.map((cd) => (
            <View key={cd.ma} style={{ gap: 6 }}>
              <DauNhom con chu={`${eChuDe.get(cd.ten) ?? t.e} ${cd.ten}`} mau={t.mau} {...nhomChon(cd)} />
              {ds(cd)}
            </View>
          ))}
        </>
      )}
    </Man>
  );
}
