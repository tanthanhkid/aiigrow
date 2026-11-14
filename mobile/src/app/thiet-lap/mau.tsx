// bm1-ob-mau «Một ngày của X» (bước 2/5 Lần đầu, thiết kế chốt 14/11 — Nghi 10/11: «Học 7, Vận động 10, Giúp Ba Mẹ 100 chia 10 chủ đề; mỗi mục /
// chủ đề Chọn tất cả, nút ＋ từng dòng»; them-5e30929l / them-wv4igjxs / them-ws974ond + 10 màn chủ đề «Phụ giúp n/10» gộp vào đây: tab Học ·
// Vận động · Giúp Ba Mẹ, tab Giúp Ba Mẹ chia 10 chủ đề). Không chọn sẵn. Kho việc ở máy chủ (GET nhiem-vu/kho). «Xong, sang phần quà» ⇒
// POST nhiem-vu/kho {con, chon} ⇒ Quà (them-s416tfdj). «+ Ba Mẹ tự thêm» ⇒ bảng them-bwlkjyw5 (tạo việc riêng ngay — POST nhiem-vu).
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, TextInput, View } from "react-native";
import { bm } from "@/lib/api";
import { BONG } from "@/lib/clay";
import { DauMan, LienKet } from "@/lib/lan-dau";
import { BongGrow, DauNhom, DongChon, TabMuc, TheDs, type MauMuc } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { layTl } from "@/lib/thiet-lap";
import { BangTruot, BaoLoi, ChoTai, Chu, F, Icon3D, M, Man, Nut, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";

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
      <ThemViecRieng mo={them} dong={() => setThem(false)} con={tl.conId} xong={(tenViec) => { setThem(false); bao(`Đã thêm «${tenViec}» cho ${ten}`); }} />
    </Man>
  );
}

// ---------------------------------------------------------------- them-bwlkjyw5 «Ba Mẹ tự thêm» (bảng trượt trên danh sách)

const GOI_Y = ["Tưới cây", "Tập đàn 15 phút", "Cho cún ăn", "Vẽ 1 bức tranh", "Tự tắm"];
const HINH: TenIcon[] = ["lau", "sach", "chay", "but", "tim", "camera"];
const MUC: { ma: string; ic: TenIcon; chu: string }[] = [{ ma: "hoc_tap", ic: "sach", chu: "Học" }, { ma: "van_dong", ic: "chay", chu: "Vận động" }, { ma: "viec_nha", ic: "nha", chu: "Giúp Ba Mẹ" }];
const SAO = [5, 10, 15, 20];
const NOP: { ma: string; ic: TenIcon; chu: string; phu: string }[] = [
  { ma: "anh", ic: "camera", chu: "Chụp ảnh", phu: "Dọn dẹp, vẽ tranh, nấu ăn" },
  { ma: "ghi_am", ic: "sach", chu: "Ghi âm", phu: "Đọc sách, tiếng Anh, học thuộc" },
  { ma: "xong", ic: "tick", chu: "Bấm «Xong»", phu: "Việc nhỏ, Ba Mẹ thấy tận mắt" },
];

function ThemViecRieng({ mo, dong, con, xong }: { mo: boolean; dong: () => void; con?: string; xong: (ten: string) => void }) {
  const [ten, setTen] = useState("");
  const [hinh, setHinh] = useState<TenIcon>("lau");
  const [muc, setMuc] = useState("viec_nha");
  const [sao, setSao] = useState(10);
  const [nop, setNop] = useState("anh");
  const { lam, loi, dangChay } = useLam();
  const oChon = (on: boolean) => ({ minHeight: 44, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 6, paddingHorizontal: 12,
    backgroundColor: on ? M.chinhSoft : "#ecebe7", boxShadow: on ? `0px 0px 0px 2px ${M.chinh}` : BONG.lom });
  const luu = () => lam(async () => {
    const t = ten.trim();
    if ([...t].length < 3) throw new Error("Viết việc con sẽ làm (ít nhất 3 ký tự).");
    await bm.goi("nhiem-vu", { ten: t, diem: sao, nhom: muc, bang_chung: nop, hinh, lap_lai: "hang_ngay", toi_da_ngay: 1, giao_cho: con ? [con] : [] });
    setTen("");
    xong(t);
  });
  return (
    <BangTruot mo={mo} dong={dong} tieu="Ba Mẹ tự thêm">
      <Chu kieu="rat" co={15}>Con sẽ làm gì?</Chu>
      <View style={{ minHeight: 50, borderRadius: 25, backgroundColor: "#ecebe7", boxShadow: BONG.lom, justifyContent: "center", paddingHorizontal: 16 }}>
        <TextInput value={ten} onChangeText={setTen} placeholder="Ví dụ: Tưới cây" placeholderTextColor={M.chu3} maxLength={60} accessibilityLabel="Con sẽ làm gì?"
          style={{ fontFamily: F.dam, fontSize: 16, color: M.chu, paddingVertical: 10, outlineStyle: "none" } as never} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {GOI_Y.map((g) => <Pressable key={g} onPress={() => setTen(g)} accessibilityRole="button" style={oChon(ten === g)}><Chu kieu="rat" co={13}>{g}</Chu></Pressable>)}
      </View>
      <Chu kieu="rat" co={15}>Hình</Chu>
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
        {HINH.map((h) => <Pressable key={h} onPress={() => setHinh(h)} accessibilityRole="radio" accessibilityState={{ checked: hinh === h }} accessibilityLabel={`Hình ${h}`}
          style={[oChon(hinh === h), { flex: 1, paddingHorizontal: 0 }]}><Icon3D ten={h} co={26} /></Pressable>)}
      </View>
      <Chu kieu="rat" co={15}>Nằm trong mục</Chu>
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
        {MUC.map((x) => <Pressable key={x.ma} onPress={() => setMuc(x.ma)} accessibilityRole="radio" accessibilityState={{ checked: muc === x.ma }} style={[oChon(muc === x.ma), { flex: 1, paddingHorizontal: 4 }]}>
          <Icon3D ten={x.ic} co={20} /><Chu kieu="rat" co={13} dong={1}>{x.chu}</Chu></Pressable>)}
      </View>
      <Chu kieu="rat" co={15}>Con nhận</Chu>
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
        {SAO.map((s) => <Pressable key={s} onPress={() => setSao(s)} accessibilityRole="radio" accessibilityState={{ checked: sao === s }} accessibilityLabel={`${s} sao`} style={[oChon(sao === s), { flex: 1 }]}>
          <Icon3D ten="sao" co={18} /><Chu kieu="rat" co={14} so>{s}</Chu></Pressable>)}
      </View>
      <Chu kieu="rat" co={15}>Con nộp bằng</Chu>
      <TheDs>
        {NOP.map((x, i) => (
          <Pressable key={x.ma} onPress={() => setNop(x.ma)} accessibilityRole="radio" accessibilityState={{ checked: nop === x.ma }}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: "#e9e8e3" }}>
            <Icon3D ten={x.ic} co={26} />
            <View style={{ flex: 1 }}><Chu kieu="rat" co={14}>{x.chu}</Chu><Chu co={12} mau={M.chu3}>{x.phu}</Chu></View>
            <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: nop === x.ma ? M.chinh : "#e6e5e1", boxShadow: nop === x.ma ? BONG.ngoc : BONG.lom }}>
              {nop === x.ma ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} /> : null}
            </View>
          </Pressable>
        ))}
      </TheDs>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Icon3D ten="chuong" co={20} /><Chu co={12.5} mau={M.chu2} style={{ flex: 1 }}>Con nộp xong, Ba Mẹ nhận thông báo. Ba Mẹ duyệt thì con mới nhận sao.</Chu>
      </View>
      <BaoLoi loi={loi} />
      <Nut chu="Thêm vào mục đã chọn" rong dangChay={dangChay} tat={!ten.trim()} bam={luu} />
    </BangTruot>
  );
}
