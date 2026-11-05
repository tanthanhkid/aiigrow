// bm2-admin-ho-tro «Hộp thư hỗ trợ» (thiết kế chốt bm-cai-dat/18): quản trị AiiGrow (Ba Mẹ có cờ admin, máy chủ kiểm lại ở /api/m/admin/ho-tro).
// Số chờ trả lời ở đầu màn, lọc «Chờ trả lời / Đã trả lời», mỗi gia đình một thẻ (chờ ≥ 30 phút ⇒ «Gấp», vạch đỏ) → chat → trả lời.
// «Của tôi» (chia việc giữa nhiều người trả lời) của thiết kế chưa có ở máy chủ.
import { useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { TheDong } from "@/lib/ui-bm3";
import { bm } from "@/lib/api";
import { Avt, BaoLoi, BongChat, CanhGiua, ChoTai, ChonMot, Chu, gioPhut, M, MAU_CON, Man, OChat, useLam, useTai } from "@/lib/ui";

type Dong1 = { family_id: string; ten: string; tu: string; noi_dung: string; created_at: string; chua_tra_loi: boolean };
type Tin = { id: string; tu: "ba_me" | "aiilab"; noi_dung: string; created_at: string };

export default function AdminHoTro() {
  const [fam, setFam] = useState<Dong1 | null>(null);
  return fam ? <Chat fam={fam} ve={() => setFam(null)} /> : <DanhSach chon={setFam} />;
}

const phutCho = (s: string) => Math.max(0, Math.round((Date.now() - new Date(s).getTime()) / 60000));
const doChu = (p: number) => (p >= 60 ? `${Math.floor(p / 60)} giờ${p % 60 ? ` ${p % 60} phút` : ""}` : `${p} phút`);
/** Chờ trả lời ≥ 30 phút ⇒ «Gấp» (thẻ vạch đỏ, nhãn đỏ). */
const GAP_PHUT = 30;

function DanhSach({ chon }: { chon: (f: Dong1) => void }) {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<{ ds: Dong1[] }>("admin/ho-tro"));
  const [loc, setLoc] = useState<"cho" | "xong">("cho");
  useEffect(() => { const t = setInterval(tai, 15_000); return () => clearInterval(t); }, [tai]);
  const cho = d?.ds.filter((x) => x.chua_tra_loi) ?? [];
  const ds = loc === "cho" ? [...cho].sort((x, y) => x.created_at.localeCompare(y.created_at)) : d?.ds.filter((x) => !x.chua_tra_loi) ?? [];
  return (
    <Man lui={{ chu: "" }} tieu="Hộp thư hỗ trợ" tai={tai} vongTai
      phai={cho.length ? <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: M.canhSoft }}><Chu kieu="rat" co={13} mau={M.canh}>{`${cho.length} chờ trả lời`}</Chu></View> : undefined}>
      <ChonMot ds={[{ gia: "cho" as const, chu: "Chờ trả lời" }, { gia: "xong" as const, chu: "Đã trả lời" }]} gia={loc} doi={setLoc} />
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : !ds.length ? (
        <CanhGiua lv="canh-trong" tieu={loc === "cho" ? "Đã trả lời hết" : "Chưa có tin nào"} loi="Khi gia đình nhắn AiiGrow, tin hiện ở đây." />
      ) : (
        <View style={{ gap: 10 }}>
          {ds.map((x, i) => {
            const p = phutCho(x.created_at), gap = x.chua_tra_loi && p >= GAP_PHUT;
            return (
              <TheDong key={x.family_id} vach={gap ? M.loi : undefined} trai={<Avt ten={x.ten} mau={MAU_CON[i % MAU_CON.length]} />} tieu={x.ten}
                phu={`${x.tu === "aiilab" ? "AiiGrow: " : ""}${x.noi_dung}`} bam={() => chon(x)}
                phai={<View style={{ alignItems: "flex-end", gap: 6 }}>
                  {x.chua_tra_loi ? (
                    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: gap ? M.loi : M.canhSoft }}>
                      <Chu kieu="rat" co={12} mau={gap ? "#fff" : M.canh}>{gap ? `Gấp · ${doChu(p)}` : `Chờ ${doChu(p)}`}</Chu>
                    </View>
                  ) : <Chu kieu="dam" co={12} mau={M.chu3}>{gioPhut(x.created_at)}</Chu>}
                  <Chu kieu="rat" co={13} mau={M.chinhInk}>Mở chat ›</Chu>
                </View>} />
            );
          })}
        </View>
      )}
    </Man>
  );
}

function Chat({ fam, ve }: { fam: Dong1; ve: () => void }) {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<{ ten: string; tin: Tin[] }>(`admin/ho-tro/${fam.family_id}`));
  const [nd, setNd] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  useEffect(() => { const t = setInterval(tai, 10_000); return () => clearInterval(t); }, [tai]);
  useEffect(() => { const h = BackHandler.addEventListener("hardwareBackPress", () => { ve(); return true; }); return () => h.remove(); }, [ve]);   // Back Android ⇒ về danh sách
  const gui = () => lam(async () => { await bm.goi(`admin/ho-tro/${fam.family_id}`, { noiDung: nd }); setNd(""); await tai(); });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={fam.ten} cuonCuoi day={
      <>
        <BaoLoi loi={loiLam} />
        <OChat gia={nd} doi={setNd} gui={gui} dangChay={dangChay} nhan={`Trả lời ${fam.ten}`} />
      </>
    }>
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : d.tin.map((t) => <BongChat key={t.id} toi={t.tu !== "ba_me"} noiDung={t.noi_dung} luc={gioPhut(t.created_at)} style={t.tu === "ba_me" ? { alignSelf: "flex-start" } : undefined} />)}
    </Man>
  );
}
