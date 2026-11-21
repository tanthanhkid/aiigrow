// bm1-ob-mau «Một ngày của X» (bước 2/5 Lần đầu, thiết kế chốt 14/11 — Nghi 10/11: «Học 7, Vận động 10, Giúp Ba Mẹ 100 chia 10 chủ đề; mỗi mục /
// chủ đề Chọn tất cả, nút ＋ từng dòng»; them-5e30929l / them-wv4igjxs / them-ws974ond + 10 màn chủ đề «Phụ giúp n/10» gộp vào đây: tab Học ·
// Vận động · Giúp Ba Mẹ, tab Giúp Ba Mẹ chia 10 chủ đề). Không chọn sẵn. Kho việc ở máy chủ (GET nhiem-vu/kho). «Xong, sang phần quà» ⇒
// POST nhiem-vu/kho {con, chon} ⇒ Quà (them-s416tfdj). «+ Ba Mẹ tự thêm» ⇒ bảng them-bwlkjyw5 = form chung lib/tu-them-viec (tạo việc riêng ngay — POST nhiem-vu).
import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { DauMan, LienKet } from "@/lib/lan-dau";
import { BongGrow, DauNhom, DongChon, TabMuc, TheDs, type MauMuc } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BONG } from "@/lib/clay";
import { BangTruot, BaoLoi, ChoTai, Chu, IconNet, M, Man, Nut, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";
import { FormTuThem } from "@/lib/tu-them-viec";

type Muc = "hoc" | "van_dong" | "giup" | "khac";
type ViecKho = { ma: string; muc: "hoc" | "van_dong" | "giup"; chuDe: string | null; e: string; ten: string; sao: number; lon: boolean };
type Kho = { chuDe: { ten: string; e: string }[]; ds: ViecKho[] };

const TAB: { ma: Muc; chu: string; tieu: string; mau: MauMuc; ic: TenIcon }[] = [
  { ma: "hoc", chu: "Học", tieu: "Học", mau: "ngoc", ic: "sach" },
  { ma: "van_dong", chu: "Vận động", tieu: "Vận động", mau: "lam", ic: "chay" },
  { ma: "giup", chu: "Giúp Ba Mẹ", tieu: "Giúp Ba Mẹ", mau: "cam", ic: "nha" },
  { ma: "khac", chu: "Khác", tieu: "Khác", mau: "ngoc", ic: "sao" },
];

export default function ObMau() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const { d, loi: loiTai, matMang, tai } = useTai(() => bm.goi<Kho>("nhiem-vu/kho"));
  const [tab, setTab] = useState<Muc>("hoc");
  const [chon, setChon] = useState<Set<string>>(() => new Set(tl.viec ?? []));        // #508: nhớ lựa chọn khi quay lại / tải lại trang
  const [them, setThem] = useState(false);
  useEffect(() => { datTl({ viec: [...chon] }); }, [chon]);
  const [rieng, setRieng] = useState<string[]>(tl.viecRieng ?? []);         // việc riêng Ba Mẹ vừa tự thêm (tab «Khác»)
  const { lam, loi, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  useEffect(() => { datTl({ viecRieng: rieng }); }, [rieng]);
  const ds = useMemo(() => d?.ds ?? [], [d]);
  const doi = (mas: string[], bat: boolean) => setChon((c) => { const n = new Set(c); for (const m of mas) { if (bat) n.add(m); else n.delete(m); } return n; });
  const nhom = (vs: ViecKho[]) => ({ het: vs.length > 0 && vs.every((v) => chon.has(v.ma)), bam: () => doi(vs.map((v) => v.ma), !vs.every((v) => chon.has(v.ma))) });
  const t = TAB.find((x) => x.ma === tab)!;
  const cuaTab = ds.filter((v) => v.muc === tab);
  const icDong = (m: Muc) => TAB.find((x) => x.ma === m)!.ic;
  const xong = () => lam(async () => {
    if (chon.size) {
      if (!tl.conId) throw new Error("Chưa biết giao việc cho con nào — quay lại bước hồ sơ con.");
      await bm.goi("nhiem-vu/kho", { con: tl.conId, chon: [...chon] });
    }
    router.push("/thiet-lap/qua");
  });
  const dong = (vs: ViecKho[], mau: MauMuc) => (
    <TheDs>{vs.map((v, i) => <DongChon key={v.ma} dau={!i} e={v.e} ic={icDong(v.muc)} mau={mau} ten={v.ten} sao={v.sao} lon={v.lon} chon={chon.has(v.ma)} bam={() => doi([v.ma], !chon.has(v.ma))} />)}</TheDs>
  );
  return (
    <Man noi={noi} dau={<DauMan ve="/thiet-lap/ten-con" phai={<ThanhBuoc5 dang={1} />} />}
      day={<><BaoLoi loi={loi} />
        <Nut chu={chon.size ? `Xong ${chon.size} việc, sang phần quà` : "Xong, sang phần quà"} rong dangChay={dangChay} bam={xong} />
        <LienKet chu="+ Ba Mẹ tự thêm" bam={() => setThem(true)} /></>}>
      <BongGrow tieu={`Một ngày của ${ten}`} phu="Chạm ＋ để thêm vào ngày của con" />
      <TabMuc ds={TAB} dang={tab} doi={setTab} />
      {!d ? <ChoTai loi={loiTai} matMang={matMang} tai={tai} /> : tab === "khac" ? (
        <>
          <DauNhom ic="sao" chu="Khác" dem={String(rieng.length)} mau="ngoc" />
          {rieng.length ? (
            <TheDs>{rieng.map((v, i) => <DongChon key={`${v}-${i}`} dau={!i} e="" ic="sao" ten={v} phu="Việc riêng Ba Mẹ thêm" chon bam={() => {}} />)}</TheDs>
          ) : (
            <View style={{ alignItems: "center", gap: 4, paddingVertical: 18, borderRadius: 22, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
              <IconNet ten="sao" co={26} mau={M.chu3} />
              <Chu kieu="rat" co={14}>Chưa có việc riêng.</Chu>
              <Chu co={12.5} mau={M.chu3}>Việc ngoài danh sách, Ba Mẹ tự thêm ở nút bên dưới.</Chu>
            </View>
          )}
          <Nut chu="+ Thêm việc riêng" loai="ma" rong bam={() => setThem(true)} />
        </>
      ) : tab !== "giup" ? (
        <>
          <DauNhom ic={t.ic} chu={t.tieu} dem={String(cuaTab.length)} mau={t.mau} {...nhom(cuaTab)} />
          {dong(cuaTab, t.mau)}
        </>
      ) : (
        <>
          <DauNhom ic={t.ic} chu={t.tieu} dem={`${cuaTab.length} · ${d.chuDe.length} chủ đề`} mau="cam" />
          {d.chuDe.map((cd) => {
            const vs = cuaTab.filter((v) => v.chuDe === cd.ten);
            return (
              <View key={cd.ten} style={{ gap: 6 }}>
                <DauNhom con chu={cd.ten} mau="cam" {...nhom(vs)} />
                {dong(vs, "cam")}
              </View>
            );
          })}
        </>
      )}
      {/* them-bwlkjyw5 «Ba Mẹ tự thêm» — cùng form với «Giao việc» (lib/tu-them-viec, them-6pjz1stu) */}
      <BangTruot mo={them} dong={() => setThem(false)} tieu="Ba Mẹ tự thêm" nutDong cuon gon>
        <FormTuThem dsCon={tl.conId ? [{ id: tl.conId, ten } as GiaDinh["con"][number]] : []} con={tl.conId} xong={(tenViec) => { setThem(false); setRieng((x) => [...x, tenViec]); setTab("khac"); bao(`Đã thêm «${tenViec}» cho ${ten}`); }} />
      </BangTruot>
    </Man>
  );
}
