// bm2-admin-ho-tro «Hộp thư hỗ trợ» (thiết kế chốt 14/11 bm-cai-dat/13): quản trị AiiGrow (Ba Mẹ có cờ admin, máy chủ kiểm lại ở /api/m/admin/ho-tro).
// Huy hiệu «N chờ» (soCho), tab lọc «Chờ trả lời / Đã trả lời / Của tôi» ⇒ GET admin/ho-tro?loc=cho|da_tra_loi|cua_toi (PR #253 — lọc trong SQL),
// tab Chờ chia «Gấp N» (chờ ≥ 30′ — `gap`, đếm `soGap`) và «Đang chờ N»; mỗi gia đình một dòng: người gửi («Bà Hoa»), nhà, tin, «Chờ 42′» (`cho_phut`) → chat.
// #325 (bàn bm2-admin-ho-tro@v3): tiêu đề lớn + viên cam «N chờ» (cam đậm #bd520a thay #e2660f của bàn — chữ trắng 13 cần tương phản ≥ 4.5); mỗi nhóm MỘT thẻ, dòng cách vạch mảnh (avatar 44 · tên · «nhà …» đậm · tin 1 dòng);
// nhãn «Chờ 42′» đỏ khi gấp / đào khi thường; số cạnh «Gấp» đỏ, cạnh «Đang chờ» xám.
import { useEffect, useState } from "react";
import { BackHandler, Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { KHOI } from "@/lib/clay";
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
  const soCho = d?.soCho ?? tho.filter((x) => x.chua_tra_loi).length;
  const { gap, dangCho } = chiaHopThu(ds);
  const dong = (x: Dong1, i: number, k: number) => {
    const p = phutCho(x), g = !!x.gap && p !== null;
    const tieu = x.nguoi_gui || x.ten;
    return (
      <Pressable key={x.family_id} onPress={() => chon(x)} accessibilityRole="button" accessibilityLabel={`${tieu}, ${x.ten}${p !== null ? `, ${cauCho(p)}` : ""}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76, paddingVertical: 8, borderTopWidth: k ? 1.5 : 0, borderTopColor: M.vien }}>
        <Avt ten={tieu} mau={MAU_CON[i % MAU_CON.length]} co={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={15} dong={1}>{tieu}</Chu>
          {x.nguoi_gui ? <Chu kieu="rat" co={12.5} mau={M.chu2} dong={1}>{x.ten.replace(/^Nhà /, "nhà ")}</Chu> : null}
          <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}>{`${x.tu === "aiilab" ? "AiiGrow: " : ""}${x.noi_dung}`}</Chu>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {p !== null ? (
            <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, backgroundColor: g ? M.loi : M.canhSoft }}>
              <Chu kieu="rat" co={12.5} mau={g ? "#FFFBF5" : M.canh}>{cauCho(p)!}</Chu>
            </View>
          ) : <Chu kieu="dam" co={12} mau={M.chu3}>{gioPhut(x.created_at)}</Chu>}
          <View style={{ minHeight: 30, justifyContent: "center" }}><Chu kieu="rat" co={13.5} mau={M.chinhInk}>Mở chat ›</Chu></View>
        </View>
      </Pressable>
    );
  };
  const nhom = (ds: Dong1[], dau: number) => (
    <View style={[{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>{ds.map((x, k) => dong(x, dau + k, k))}</View>
  );
  return (
    <Man tieuLon="Hộp thư hỗ trợ" tai={tai} vongTai
      phaiTieu={soCho ? <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: M.badge }}><Chu kieu="rat" co={13} mau={M.chu}>{`${soCho} chờ`}</Chu></View> : undefined}>
      {/* máy chủ cũ không biết «Của tôi» ⇒ ẩn tab đó */}
      <ChonMot ds={LOC_HO_TRO.filter((x) => !cu || x.gia !== "cua_toi").map((x) => ({ gia: x.gia, chu: x.chu }))} gia={loc} doi={setLoc} />
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : !ds.length ? (
        <CanhGiua lv="canh-trong" tieu={loc === "cho" ? "Đã trả lời hết" : loc === "cua_toi" ? "Bạn chưa trả lời ai" : "Chưa có tin nào"} loi="Khi gia đình nhắn AiiGrow, tin hiện ở đây." />
      ) : loc === "cho" ? (
        <View style={{ gap: 8 }}>
          {gap.length ? <><MucHop chu="Gấp" so={d.soGap ?? gap.length} gap />{nhom(gap, 0)}</> : null}
          {dangCho.length ? <><MucHop chu="Đang chờ" so={dangCho.length} />{nhom(dangCho, gap.length)}</> : null}
        </View>
      ) : nhom(ds, 0)}
    </Man>
  );
}

/** Đầu nhóm (bàn `.muc`): chữ 15/800 + số trong viên — đỏ cho «Gấp», xám cho «Đang chờ». */
function MucHop({ chu, so, gap }: { chu: string; so: number; gap?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginHorizontal: 6 }}>
      <Chu kieu="rat" co={15} mau={M.chu2}>{chu}</Chu>
      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: gap ? M.loi : M.xamSoft }}>
        <Chu kieu="rat" co={12} mau={gap ? "#FFFBF5" : M.chu2} so>{String(so)}</Chu>
      </View>
    </View>
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
