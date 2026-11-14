// «Giao việc» (thiết kế 14/11 bm-viec-duyet/03 them-1jii7k19): Grow nói «Một ngày của <Con> · Chạm ＋ để thêm vào ngày của con», thanh mục
// Học · Vận động · Giúp Ba Mẹ (100 việc, 10 chủ đề), mỗi việc: icon lõm · tên (nhãn «12+» việc nặng) · sao · ＋ (chạm = chọn, tick ngọc); «Chọn tất cả»
// từng nhóm; việc con đã có hiện «Đã có». Đáy: «Thêm vào ngày của <Con>» = POST nhiem-vu/danh-muc {con, viec} · «+ Ba Mẹ tự thêm việc» → /giao-nv/tu-dat.
// Nhà > 1 con và chưa chỉ định con ⇒ dải các con để chọn (N9). Danh mục ở server/lib/danh-muc-viec.ts (docs/API.md «Danh mục việc»).
import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BaoLoi, baoKhiVe, ChoTai, Chu, M, Man, Nut, Rob, The, useLam, useTai } from "@/lib/ui";
import { DaiCon, NutCongTick, OLomIcon, SaoNho, ThanhMuc } from "@/lib/ui-viec";
import { MucTieu } from "@/lib/ui-bm3";
import type { TenIcon } from "@/lib/ui";

type ViecDm = { ma: string; ten: string; sao: number; tu12: boolean; bangChung: string; hinh: string; daCo: boolean };
type ChuDe = { ma: string; ten: string; viec: ViecDm[] };
type MucDm = { ma: "hoc" | "van_dong" | "giup_ba_me"; ten: string; soViec: number; chuDe: ChuDe[] };

const IC_MUC: Record<MucDm["ma"], TenIcon> = { hoc: "sach", van_dong: "chay", giup_ba_me: "nha" };
const NEN_MUC: Record<MucDm["ma"], string> = { hoc: "#dcebe6", van_dong: "#ecebe7", giup_ba_me: "#f9e7d2" };
const IC_VIEC: Record<MucDm["ma"], TenIcon> = { hoc: "sach", van_dong: "chay", giup_ba_me: "lau" };

export default function GiaoViec() {
  const { con: conSan } = useLocalSearchParams<{ con?: string }>();
  const [conChon, setConChon] = useState<string | null>(conSan ?? null);
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  if (!g.d) return <Man lui={{ chu: "" }} tieu={TIEU}><ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man>;
  const c = g.d.con.find((x) => x.id === conChon) ?? g.d.con[0];
  if (!c) return <Man lui={{ chu: "" }} tieu={TIEU}><The><Chu mau={M.chu2}>Chưa có hồ sơ con. Thêm con ở «Cả nhà» để giao việc.</Chu></The></Man>;
  // một khối theo Con (key) ⇒ đổi con là tải lại đúng danh mục (đánh dấu «Đã có» theo con) và xoá lựa chọn cũ
  return <GiaoCho key={c.id} c={c} dsCon={g.d.con.length > 1 && !conSan ? g.d.con : null} doiCon={setConChon} />;
}

const TIEU = "Giao việc";

function GiaoCho({ c, dsCon, doiCon }: { c: GiaDinh["con"][number]; dsCon: GiaDinh["con"] | null; doiCon: (id: string) => void }) {
  const dm = useTai(() => bm.goi<{ muc: MucDm[] }>(`nhiem-vu/danh-muc?con=${encodeURIComponent(c.id)}`));
  const [muc, setMuc] = useState<MucDm["ma"]>("hoc");
  const [chon, setChon] = useState<string[]>([]);
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = TIEU;
  const m = useMemo(() => dm.d?.muc.find((x) => x.ma === muc) ?? dm.d?.muc[0], [dm.d, muc]);
  if (!dm.d || !m) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={dm.loi} matMang={dm.matMang} tai={dm.tai} /></Man>;

  const doi = (ma: string) => setChon((x) => (x.includes(ma) ? x.filter((y) => y !== ma) : [...x, ma]));
  const conLai = (cd: ChuDe) => cd.viec.filter((v) => !v.daCo).map((v) => v.ma);
  const chonHet = (cd: ChuDe) => {
    const ds = conLai(cd);
    const du = ds.every((x) => chon.includes(x));
    setChon((x) => (du ? x.filter((y) => !ds.includes(y)) : [...new Set([...x, ...ds])]));
  };
  const them = () => lam(async () => {
    const r = await bm.goi<{ taoMoi: number }>("nhiem-vu/danh-muc", { con: c.id, viec: chon });
    baoKhiVe(r.taoMoi ? `Đã thêm ${r.taoMoi} việc vào ngày của ${c.ten}` : `${c.ten} đã có sẵn các việc này`);
    router.back();
  });
  const nhieuChuDe = m.chuDe.length > 1;
  return (
    <Man lui={{ chu: "" }} tieu={tieu} tai={dm.tai}
      day={<>
        <BaoLoi loi={loiLam} />
        <Nut chu={chon.length ? `Thêm ${chon.length} việc vào ngày của ${c.ten}` : `Thêm vào ngày của ${c.ten}`} ic="sao" ic3d rong dangChay={dangChay} tat={!chon.length} bam={them} />
        <Pressable onPress={() => router.push({ pathname: "/giao-nv/tu-dat", params: { con: c.id, muc } })} accessibilityRole="button"
          style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Chu kieu="rat" co={14} mau={M.chinhInk}>+ Ba Mẹ tự thêm việc</Chu>
        </Pressable>
      </>}>
      {dsCon ? <DaiCon ds={dsCon} chon={c.id} doi={(x) => doiCon(x.id)} /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Rob ten="chi" co={52} />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={17}>{`Một ngày của ${c.ten}`}</Chu>
          <Chu kieu="dam" co={13} mau={M.chu3}>Chạm ＋ để thêm vào ngày của con</Chu>
        </View>
      </View>
      <ThanhMuc ds={dm.d.muc.map((x) => ({ gia: x.ma, chu: x.ten, ic: IC_MUC[x.ma] }))} chon={m.ma} doi={setMuc} />
      {nhieuChuDe ? <MucTieu chu={`${m.ten} · ${m.soViec} · ${m.chuDe.length} chủ đề`} /> : null}
      {m.chuDe.map((cd) => (
        <View key={cd.ma} style={{ gap: 6 }}>
          <MucTieu chu={nhieuChuDe ? cd.ten : `${cd.ten} · ${cd.viec.length}`}
            phai={conLai(cd).length ? { chu: conLai(cd).every((x) => chon.includes(x)) ? "Bỏ chọn" : "Chọn tất cả", bam: () => chonHet(cd) } : undefined} />
          <The sat>
            {/* lề hàng 16 hai bên (cổng LE-THE: nút ＋ cách mép thẻ ≥ 15.5 — trước 6) */}
            {cd.viec.map((v, i) => (
              <View key={v.ma} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 58, paddingVertical: 6, paddingLeft: 16, paddingRight: 16,
                borderTopWidth: i ? 1.5 : 0, borderTopColor: "#ecebe7" }}>
                <OLomIcon ic={v.hinh === "rob" ? "may_tinh" : IC_VIEC[m.ma]} nen={v.hinh === "rob" ? "#dcebe6" : NEN_MUC[m.ma]} />
                <View style={{ flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6 }}>
                  <Chu kieu="dam" co={14.5} style={{ lineHeight: 19 }}>{v.ten}</Chu>
                  {v.tu12 ? <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: "#f9e7d2" }}><Chu kieu="rat" co={11.5} mau="#8a3c0c">12+</Chu></View> : null}
                </View>
                <SaoNho n={v.sao} />
                {v.daCo ? (
                  <View style={{ width: 44, alignItems: "center" }}><Chu kieu="dam" co={11.5} mau={M.chu3}>Đã có</Chu></View>
                ) : <NutCongTick chon={chon.includes(v.ma)} bam={() => doi(v.ma)} nhan={`Thêm ${v.ten}`} />}
              </View>
            ))}
          </The>
        </View>
      ))}
    </Man>
  );
}
