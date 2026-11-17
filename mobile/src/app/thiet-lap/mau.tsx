// bm1-ob-mau «Một ngày của X» (bước 2/5 Lần đầu, thiết kế chốt 14/11 — Nghi 10/11: «Học 7, Vận động 10, Giúp Ba Mẹ 100 chia 10 chủ đề; mỗi mục /
// chủ đề Chọn tất cả, nút ＋ từng dòng»; them-5e30929l / them-wv4igjxs / them-ws974ond + 10 màn chủ đề «Phụ giúp n/10» gộp vào đây: tab Học ·
// Vận động · Giúp Ba Mẹ, tab Giúp Ba Mẹ chia 10 chủ đề). Không chọn sẵn. Kho việc ở máy chủ (GET nhiem-vu/kho). «Xong, sang phần quà» ⇒
// POST nhiem-vu/kho {con, chon} ⇒ Quà (them-s416tfdj). «+ Ba Mẹ tự thêm» ⇒ bảng them-bwlkjyw5 = form chung lib/tu-them-viec (tạo việc riêng ngay — POST nhiem-vu).
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { DauMan, LienKet } from "@/lib/lan-dau";
import { BongGrow, DauNhom, DongChon, TabMuc, TheDs, type MauMuc } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { layTl } from "@/lib/thiet-lap";
import { BangTruot, BaoLoi, ChoTai, Man, Nut, useHoanTac, useLam, useTai } from "@/lib/ui";
import { FormTuThem } from "@/lib/tu-them-viec";

type Muc = "hoc" | "van_dong" | "giup";
type ViecKho = { ma: string; muc: Muc; chuDe: string | null; e: string; ten: string; sao: number; lon: boolean };
type Kho = { chuDe: { ten: string; e: string }[]; ds: ViecKho[] };

const TAB: { ma: Muc; chu: string; tieu: string; mau: MauMuc }[] = [
  { ma: "hoc", chu: "📚 Học", tieu: "📚 Học", mau: "ngoc" },
  { ma: "van_dong", chu: "🏃 Vận động", tieu: "🏃 Vận động", mau: "lam" },
  { ma: "giup", chu: "🏠 Giúp Ba Mẹ", tieu: "🏠 Giúp Ba Mẹ", mau: "cam" },
];

export default function ObMau() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const { d, loi: loiTai, matMang, tai } = useTai(() => bm.goi<Kho>("nhiem-vu/kho"));
  const [tab, setTab] = useState<Muc>("hoc");
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [them, setThem] = useState(false);
  const { lam, loi, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  const ds = useMemo(() => d?.ds ?? [], [d]);
  const doi = (mas: string[], bat: boolean) => setChon((c) => { const n = new Set(c); for (const m of mas) { if (bat) n.add(m); else n.delete(m); } return n; });
  const nhom = (vs: ViecKho[]) => ({ het: vs.length > 0 && vs.every((v) => chon.has(v.ma)), bam: () => doi(vs.map((v) => v.ma), !vs.every((v) => chon.has(v.ma))) });
  const t = TAB.find((x) => x.ma === tab)!;
  const cuaTab = ds.filter((v) => v.muc === tab);
  const xong = () => lam(async () => {
    if (chon.size) {
      if (!tl.conId) throw new Error("Chưa biết giao việc cho con nào — quay lại bước hồ sơ con.");
      await bm.goi("nhiem-vu/kho", { con: tl.conId, chon: [...chon] });
    }
    router.push("/thiet-lap/qua");
  });
  const dong = (vs: ViecKho[], mau: MauMuc) => (
    <TheDs>{vs.map((v, i) => <DongChon key={v.ma} dau={!i} e={v.e} mau={mau} ten={v.ten} sao={v.sao} lon={v.lon} chon={chon.has(v.ma)} bam={() => doi([v.ma], !chon.has(v.ma))} />)}</TheDs>
  );
  return (
    <Man noi={noi} dau={<DauMan ve="/thiet-lap/ten-con" phai={<ThanhBuoc5 dang={1} />} />}
      day={<><BaoLoi loi={loi} />
        <Nut chu={chon.size ? `Xong ${chon.size} việc, sang phần quà` : "Xong, sang phần quà"} rong dangChay={dangChay} bam={xong} />
        <LienKet chu="+ Ba Mẹ tự thêm" bam={() => setThem(true)} /></>}>
      <BongGrow tieu={`Một ngày của ${ten}`} phu="Chạm ＋ để thêm vào ngày của con" />
      <TabMuc ds={TAB} dang={tab} doi={setTab} />
      {!d ? <ChoTai loi={loiTai} matMang={matMang} tai={tai} /> : tab !== "giup" ? (
        <>
          <DauNhom chu={t.tieu} dem={String(cuaTab.length)} mau={t.mau} {...nhom(cuaTab)} />
          {dong(cuaTab, t.mau)}
        </>
      ) : (
        <>
          <DauNhom chu={t.tieu} dem={`${cuaTab.length} · ${d.chuDe.length} chủ đề`} mau="cam" />
          {d.chuDe.map((cd) => {
            const vs = cuaTab.filter((v) => v.chuDe === cd.ten);
            return (
              <View key={cd.ten} style={{ gap: 6 }}>
                <DauNhom con chu={`${cd.e} ${cd.ten}`} mau="cam" {...nhom(vs)} />
                {dong(vs, "cam")}
              </View>
            );
          })}
        </>
      )}
      {/* them-bwlkjyw5 «Ba Mẹ tự thêm» — cùng form với «Giao việc» (lib/tu-them-viec, them-6pjz1stu) */}
      <BangTruot mo={them} dong={() => setThem(false)} tieu="Ba Mẹ tự thêm" nutDong cuon gon>
        <FormTuThem dsCon={tl.conId ? [{ id: tl.conId, ten } as GiaDinh["con"][number]] : []} con={tl.conId} xong={(tenViec) => { setThem(false); bao(`Đã thêm «${tenViec}» cho ${ten}`); }} />
      </BangTruot>
    </Man>
  );
}
