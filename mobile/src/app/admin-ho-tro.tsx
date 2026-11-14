// bm2-admin-ho-tro «Hộp thư hỗ trợ» (thiết kế chốt 14/11 bm-cai-dat/13): quản trị AiiGrow (Ba Mẹ có cờ admin, máy chủ kiểm lại ở /api/m/admin/ho-tro).
// Huy hiệu «N chờ» (soCho), tab lọc «Chờ trả lời / Đã trả lời / Của tôi» ⇒ GET admin/ho-tro?loc=cho|da_tra_loi|cua_toi (PR #253 — lọc trong SQL),
// tab Chờ chia «Gấp N» (chờ ≥ 30′ — `gap`, đếm `soGap`) và «Đang chờ N»; mỗi gia đình một thẻ: người gửi («Bà Hoa»), nhà, tin, «Chờ 42′» (`cho_phut`) → chat.
import { useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { TheDong } from "@/lib/ui-bm3";
import { bm } from "@/lib/api";
import { TieuMuc } from "@/lib/hang-ngay";
import { cauCho, chiaHopThu, LOC_HO_TRO, type DongHoTro, type HopThu, type LocHoTro } from "@/lib/noi-1411";
import { Avt, BaoLoi, BongChat, CanhGiua, ChoTai, ChonMot, Chu, gioPhut, M, MAU_CON, Man, OChat, useLam, useTai } from "@/lib/ui";

type Dong1 = DongHoTro;
type Tin = { id: string; tu: "ba_me" | "aiilab"; noi_dung: string; created_at: string };

export default function AdminHoTro() {
  const [fam, setFam] = useState<Dong1 | null>(null);
  return fam ? <Chat fam={fam} ve={() => setFam(null)} /> : <DanhSach chon={setFam} />;
}

/** Máy chủ cũ (trước PR #253) không có cho_phut / gap ⇒ tính tạm từ tin mới nhất. */
const GAP_PHUT = 30;
const phutCho = (x: Dong1) => x.cho_phut !== undefined ? x.cho_phut : x.chua_tra_loi ? Math.max(0, Math.round((Date.now() - new Date(x.created_at).getTime()) / 60000)) : null;
const laGap = (x: Dong1) => x.gap ?? ((phutCho(x) ?? 0) >= GAP_PHUT);

function DanhSach({ chon }: { chon: (f: Dong1) => void }) {
  const [loc, setLoc] = useState<LocHoTro>("cho");
  // useTai giữ hàm tải lần đầu ⇒ mỗi tab một bản (key) để tải đúng ?loc=
  return <HopThuLoc key={loc} loc={loc} setLoc={setLoc} chon={chon} />;
}

function HopThuLoc({ loc, setLoc, chon }: { loc: LocHoTro; setLoc: (v: LocHoTro) => void; chon: (f: Dong1) => void }) {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<HopThu>(`admin/ho-tro?loc=${loc}`), `admin-ho-tro:${loc}`);
  useEffect(() => { const t = setInterval(tai, 15_000); return () => clearInterval(t); }, [tai]);
  // máy chủ cũ (trước PR #253) bỏ qua ?loc= và không có soCho ⇒ lọc + xếp tại máy như trước
  const cu = !!d && d.soCho === undefined;
  const tho = (d?.ds ?? []).map((x) => ({ ...x, gap: laGap(x) }));
  const ds = !cu ? tho : loc === "cho" ? tho.filter((x) => x.chua_tra_loi).sort((x, y) => x.created_at.localeCompare(y.created_at))
    : loc === "da_tra_loi" ? tho.filter((x) => !x.chua_tra_loi) : tho.filter((x) => x.cua_toi);
  const soCho = d?.soCho ?? ds.filter((x) => x.chua_tra_loi).length;
  const { gap, dangCho } = chiaHopThu(ds);
  const the = (x: Dong1, i: number) => {
    const p = phutCho(x), g = !!x.gap && p !== null;
    const tieu = x.nguoi_gui || x.ten;
    return (
      <TheDong key={x.family_id} vach={g ? M.loi : undefined} trai={<Avt ten={tieu} mau={MAU_CON[i % MAU_CON.length]} />} tieu={tieu}
        phu={`${x.nguoi_gui ? `${x.ten} · ` : ""}${x.tu === "aiilab" ? "AiiGrow: " : ""}${x.noi_dung}`} bam={() => chon(x)}
        phai={<View style={{ alignItems: "flex-end", gap: 6 }}>
          {p !== null ? (
            <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: g ? M.loi : M.canhSoft }}>
              <Chu kieu="rat" co={12} mau={g ? "#fff" : M.canh}>{cauCho(p)!}</Chu>
            </View>
          ) : <Chu kieu="dam" co={12} mau={M.chu3}>{gioPhut(x.created_at)}</Chu>}
          <Chu kieu="rat" co={13} mau={M.chinhInk}>Mở chat ›</Chu>
        </View>} />
    );
  };
  return (
    <Man lui={{ chu: "" }} tieu="Hộp thư hỗ trợ" tai={tai} vongTai
      phai={soCho ? <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: M.canhSoft }}><Chu kieu="rat" co={13} mau={M.canh}>{`${soCho} chờ`}</Chu></View> : undefined}>
      <ChonMot ds={LOC_HO_TRO.map((x) => ({ gia: x.gia, chu: x.chu }))} gia={loc} doi={setLoc} />
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : !ds.length ? (
        <CanhGiua lv="canh-trong" tieu={loc === "cho" ? "Đã trả lời hết" : loc === "cua_toi" ? "Bạn chưa trả lời ai" : "Chưa có tin nào"} loi="Khi gia đình nhắn AiiGrow, tin hiện ở đây." />
      ) : loc === "cho" ? (
        <View style={{ gap: 10 }}>
          {gap.length ? <TieuMuc chu="Gấp" so={d.soGap ?? gap.length} /> : null}
          {gap.map(the)}
          {dangCho.length ? <TieuMuc chu="Đang chờ" so={dangCho.length} /> : null}
          {dangCho.map((x, i) => the(x, gap.length + i))}
        </View>
      ) : (
        <View style={{ gap: 10 }}>{ds.map(the)}</View>
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
