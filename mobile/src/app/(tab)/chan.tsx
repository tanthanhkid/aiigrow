// Tab «Chặn» (thiết kế chốt 14/11 bm-ung-dung/01 bm2-ung-dung-may · 02 them-98obxv7x — N1, N2): chọn bé, thẻ lớn «Máy của <con> đang ở chế độ»
// (chế độ đang bật thấy ĐẦU TIÊN) + công tắc «Mở hết / Chặn app & web» ngay trên thẻ, «Con đang xin» (Trả lời ›), «<con> được mở» hai hàng App / Web
// (icon + «Sửa ›» ⇒ danh sách đèn), «Luôn chặn» (Xem ›). Đang Mở hết ⇒ «Danh sách Ba Mẹ đã chọn» (tạm nghỉ, giữ nguyên).
// Ghi: POST con/:id/che-do-chan {cheDo}. Đọc: gia-dinh, con/:id, luat (luật riêng + cả nhà), cho-duyet.
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type ConChiTiet, type GiaDinh, type YeuCau } from "@/lib/api";
import { ChipCon } from "@/lib/hang-ngay";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { HangLuonChan, HangVang, IC_CHE_DO, TEN_CHE_DO, gomTheoTen, icCuaApp, laWeb, lucNgan, luatCuaCon, type CheDoChan, type LuatApp } from "@/lib/ui-bm3";
import { BaoLoi, CanhGiua, ChoTai, Chu, Icon, Icon3D, M, Man, NhanMen, Rob, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";

// Grow ở thẻ chế độ: cỡ + lệch phải; tên chế độ (25px) chừa phần Grow nằm trong thẻ − lề 16 (khổ 320 đè — cổng DE-ANH)
const ROB_CO = 104, ROB_PHAI = -4, CHUA_ROB = ROB_CO + ROB_PHAI - 16;

export default function TabChan() {
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"), "tab:chan");
  const { con: conVao } = useLocalSearchParams<{ con?: string }>();
  const [chon, setChon] = useState<string | null>(null);
  // tab giữ trạng thái giữa các lần mở ⇒ mở từ màn của một Con (?con=) thì Con đó thắng lựa chọn chip cũ
  const [vaoCu, setVaoCu] = useState(conVao);
  if (conVao !== vaoCu) { setVaoCu(conVao); setChon(null); }
  const con = chon ?? (conVao && g.d?.con.some((c) => c.id === conVao) ? conVao : g.d?.con[0]?.id) ?? null;
  const dau = <Chu kieu="rat" co={13} mau={M.chu3} style={{ marginTop: -12, marginLeft: 4 }}>App và trang web của con</Chu>;
  if (!g.d) return <View style={{ flex: 1 }}><Man tieuLon="Chặn">{dau}<ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man></View>;
  if (!g.d.con.length) return <View style={{ flex: 1 }}><Man tieuLon="Chặn">{dau}<CanhGiua lv="canh-trong" tieu="Chưa có con nào" loi="Thêm hồ sơ con ở tab Cả nhà." /></Man></View>;
  return <ChanCon key={con!} id={con!} ds={g.d.con} dau={dau} doi={setChon} />;
}

type DuLieu = { ct: ConChiTiet & { cheDoChan?: CheDoChan }; luat: LuatApp[]; xin: YeuCau[]; xem: boolean };

function ChanCon({ id, ds, dau, doi }: { id: string; ds: GiaDinh["con"]; dau: React.ReactNode; doi: (id: string) => void }) {
  const idRef = useRef(id);
  const { d, loi, matMang, tai } = useTai<DuLieu>(async () => {
    const c = idRef.current;
    const [ct, luat, cd, xem] = await Promise.all([
      bm.goi<ConChiTiet & { cheDoChan?: CheDoChan }>(`con/${c}`), bm.goi<{ ds: LuatApp[] }>("luat"),
      bm.goi<{ yeuCau: YeuCau[] }>("cho-duyet").catch(() => ({ yeuCau: [] as YeuCau[] })), laChiXem(),
    ]);
    return { ct, luat: luatCuaCon(luat.ds, c), xin: cd.yeuCau.filter((y) => y.child_id === c && (y.loai === "cai_app" || y.loai === "mo_web")), xem };
  }, `tab:chan:${id}`);
  useEffect(() => { idRef.current = id; }, [id]);
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  const chips = ds.length > 1 ? <ChipCon ds={ds} chon={id} doi={(x) => doi(x.id)} /> : null;
  if (!d) return <View style={{ flex: 1 }}><Man tieuLon="Chặn">{dau}{chips}<ChoTai loi={loi} matMang={matMang} tai={tai} /></Man></View>;

  const ten = d.ct.ten;
  const cheDo: CheDoChan = d.ct.cheDoChan ?? "chi_app_duoc_phep";
  const moHet = cheDo === "mo_het";
  // mỗi app một dòng dù có nhiều định danh (roblox.exe, com.roblox.client…); app có định danh nào bị chặn thì không tính «được mở»
  const app = gomTheoTen(d.luat.filter((l) => !laWeb(l.muc))).filter((n) => n.every((l) => l.loai !== "chan")).map((n) => n[0]);
  const web = d.luat.filter((l) => laWeb(l.muc) && l.loai !== "chan");
  const doiCheDo = (v: CheDoChan) => {
    if (v === cheDo || d.xem || dangChay) return;
    lam(async () => {
      await bm.goi(`con/${id}/che-do-chan`, { cheDo: v });
      await tai();
      bao(v === "mo_het" ? `${ten}: Mở hết` : `${ten}: Chặn app & web`, () => { bm.goi(`con/${id}/che-do-chan`, { cheDo }).then(() => tai(), () => tai()); });
    });
  };
  const moApp = () => router.push({ pathname: "/ung-dung", params: { con: id } });
  const moWeb = () => router.push(`/web/${id}`);

  return (
    <View style={{ flex: 1 }}>
      <Man tieuLon="Chặn" tai={tai} vongTai noi={noi}>
        {dau}
        {chips}
        {/* thẻ lớn chế độ (.hero) — chế độ đang bật thấy đầu tiên, công tắc ngay trên thẻ */}
        <View style={{ borderRadius: 34, overflow: "hidden", ...KHOI.the }}>
          <LinearGradient colors={moHet ? ["#f6e6d2", "#faf2e8"] : ["#cfe6de", "#e8f2ee"]} style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16 }}>
            <View pointerEvents="none" style={{ position: "absolute", right: ROB_PHAI, top: 56 }}><Rob ten={moHet ? "nghi" : "chi"} co={ROB_CO} /></View>
            <Chu kieu="dam7" co={13} mau={moHet ? "#8a3c0c" : M.chinhInk}>{`Máy của ${ten} đang ở chế độ`}</Chu>
            {/* chừa chỗ Grow (phải, từ top 56): tên chế độ 25px ở khổ 320 đè lên Grow (cổng DE-ANH) */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginRight: CHUA_ROB }} accessibilityRole="header">
              <Icon3D ten={IC_CHE_DO[cheDo]} co={32} />
              <Chu kieu="rat" co={25} style={{ letterSpacing: -0.5, flexShrink: 1 }}>{TEN_CHE_DO[cheDo]}</Chu>
            </View>
            <View style={{ marginTop: 12, marginRight: 96, gap: 8 }}>
              <DongY ic="tick" nen={M.chinh} chu={moHet ? "Con mở được mọi app, mọi trang web"
                : `Chỉ mở được ${app.length} app, ${web.length} trang web Ba Mẹ chọn`} />
              <DongY ic="khoa" nen="#8a3c0c" chu={moHet ? "Grow chỉ chặn web người lớn, cờ bạc, bạo lực" : "App, web mới: con phải xin Ba Mẹ"} />
            </View>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 16, padding: 4, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.55)", boxShadow: BONG.lom }}
              accessibilityRole="radiogroup" accessibilityLabel="Chế độ chặn">
              {(["mo_het", "chi_app_duoc_phep"] as const).map((k) => {
                const on = k === cheDo;
                return (
                  <NhanMen key={k} onPress={() => doiCheDo(k)} disabled={d.xem || dangChay} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: d.xem }} aria-checked={on}
                    accessibilityLabel={TEN_CHE_DO[k]} muc="chip" sang={!on} men={on && !moHet ? MEN.ngoc : undefined}
                    style={[{ flex: k === "mo_het" ? 1 : 1.25, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 20 },
                      on && (moHet  // thiết kế 02 «Mở hết»: viên đang chọn màu nâu đất #8a3c0c
                        ? { backgroundColor: "#8a3c0c", boxShadow: "0px 10px 16px -10px rgba(138,60,12,0.7), inset 0px 1.5px 0px rgba(255,255,255,0.3), inset 0px -6px 10px -4px rgba(0,0,0,0.25)" }
                        : { backgroundColor: M.chinh, boxShadow: BONG.ngoc })]}>
                    <View style={{ opacity: on ? 1 : 0.6 }}><Icon3D ten={IC_CHE_DO[k]} co={22} /></View>
                    <Chu kieu="rat" co={14.5} mau={on ? "#fff" : M.chu2} dong={1}>{TEN_CHE_DO[k]}</Chu>
                  </NhanMen>
                );
              })}
            </View>
          </LinearGradient>
        </View>
        <BaoLoi loi={loiLam} />

        {d.xin.length ? (
          <>
            <TieuMuc chu="Con đang xin" so={d.xin.length} />
            {d.xin.map((y) => (
              <HangVang key={y.id} ic={y.loai === "mo_web" ? "web" : icCuaApp(y.gia_tri ?? "")} tieu={`${y.gia_tri ?? "App mới"}${y.phut ? ` · ${y.phut} phút` : ""}`}
                phu={`${lucNgan(y.created_at)} · ${ten} đang chờ`} nut="Trả lời ›" bam={() => router.push({ pathname: "/yeu-cau-web/[id]", params: { id: y.id } })} />
            ))}
          </>
        ) : null}

        <TieuMuc chu={moHet ? "Danh sách Ba Mẹ đã chọn" : `${ten} được mở`} />
        <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 28, backgroundColor: "#f7f6f3", ...KHOI.the }}>
          <HangIcon nhan="App" ic={app.map((l) => icCuaApp(`${l.ten} ${l.muc}`))} trong="Chưa cho app nào" sua={!moHet} bam={moApp} />
          <View style={{ height: 1.5, backgroundColor: "#ecebe7" }} />
          <HangIcon nhan="Web" ic={web.map((l) => { const i = icCuaApp(l.muc); return i === "web" ? "sach" : i; })} trong="Chưa cho trang nào" sua={!moHet} bam={moWeb} />
          {moHet ? (
            // thiết kế .tam: ô lõm xám
            <View style={{ marginTop: 6, marginBottom: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
              <Chu kieu="dam" co={13.5} mau={M.chu2}>Đang tạm nghỉ, vẫn được giữ nguyên. Bật lại «Chặn app & web» là dùng tiếp.</Chu>
            </View>
          ) : null}
        </View>

        <HangLuonChan />
      </Man>
    </View>
  );
}

function DongY({ ic, nen, chu }: { ic: TenIcon; nen: string; chu: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: nen, alignItems: "center", justifyContent: "center" }}><Icon ten={ic} mau="#fff" co={12} /></View>
      <Chu kieu="rat" co={13.5} style={{ flex: 1 }}>{chu}</Chu>
    </View>
  );
}

function TieuMuc({ chu, so }: { chu: string; so?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginHorizontal: 6, marginBottom: -4 }}>
      <Chu kieu="rat" co={15} mau={M.chu2}>{chu}</Chu>
      {so ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: M.camDam /* #e2660f + chữ trắng 3.42:1 < 4.5 */ }}><Chu kieu="rat" co={12} mau="#fff">{String(so)}</Chu></View> : null}
    </View>
  );
}

/** Một hàng «App» / «Web» (.hang): nhãn, tối đa 4 icon của mục được mở, «Sửa ›». */
function HangIcon({ nhan, ic, trong, sua, bam }: { nhan: string; ic: TenIcon[]; trong: string; sua: boolean; bam: () => void }) {
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`${nhan}: ${ic.length ? `${ic.length} mục` : trong}${sua ? ", sửa" : ""}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60 }}>
      <Chu kieu="rat" co={14} mau={M.chu2} style={{ width: 44 }}>{nhan}</Chu>
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", gap: 6, alignItems: "center" }}>
        {ic.length ? ic.slice(0, 4).map((x, i) => (
          <View key={i} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
            boxShadow: "0px 8px 12px -8px rgba(28,32,30,0.3), inset 0px -4px 8px -4px rgba(40,44,42,0.12)" }}><Icon3D ten={x} co={24} /></View>
        )) : <Chu kieu="dam" co={13} mau={M.chu3}>{trong}</Chu>}
        {ic.length > 4 ? <Chu kieu="rat" co={13} mau={M.chu3}>{`+${ic.length - 4}`}</Chu> : null}
      </View>
      {sua ? <Chu kieu="rat" co={14} mau={M.chinhInk}>Sửa ›</Chu> : null}
    </Pressable>
  );
}
