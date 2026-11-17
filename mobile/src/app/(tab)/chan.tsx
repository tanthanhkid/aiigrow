// Tab «App & web» (bàn bm-ung-dung: bm2-ung-dung-may@v17 · them-98obxv7x@v6 — #262, luồng #258): chọn bé, thẻ lớn «Máy của <con> đang
// ở chế độ» + công tắc «Mở hết | Theo danh sách» ngay trên thẻ, «Con đang xin» (hàng cam .xin, Trả lời › — ẩn khi Mở hết), «Danh sách của <con>» (chú thích chấm vàng Tính phút /
// xanh Không tính phút) hai hàng App / Web (icon + chấm nhóm, «Sửa ›»), «Đã bỏ qua N lời xin · con xin lại được — Xem ›». Đang «Mở hết» ⇒ danh sách mờ,
// «Đang tạm nghỉ, vẫn giữ nguyên». Không còn «Chặn» / «Luôn chặn». Đọc: gia-dinh, con/:id/danh-sach. Ghi: POST con/:id/che-do {cheDo}.
// (Tên tệp route giữ «chan» cho các liên kết cũ /chan?con=.)
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type GiaDinh } from "@/lib/api";
import { ChipCon } from "@/lib/hang-ngay";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { HangBoQua, icCuaApp, lucNgan } from "@/lib/ui-bm3";
import { HangXin, icMuc } from "@/lib/ds-con";
import { cheDoTu, doiCheDo as ghiCheDo, hangCua, IC_CHE_DO, MAU_NHOM, napDanhSach, TEN_CHE_DO, TEN_NHOM, type CheDo, type DanhSach, type DongDs, type Nhom } from "@/lib/app-web";
import { BaoLoi, CanhGiua, ChoTai, Chu, Icon, Icon3D, M, Man, NhanMen, Rob, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";

// Grow ở thẻ chế độ: cỡ + lệch phải; tên chế độ (25px) chừa phần Grow nằm trong thẻ − lề 16 (khổ 320 đè — cổng DE-ANH)
const ROB_CO = 104, ROB_PHAI = -4, CHUA_ROB = ROB_CO + ROB_PHAI - 16;
const TIEU = "App & web";

export default function TabChan() {
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"), "tab:chan");
  const { con: conVao } = useLocalSearchParams<{ con?: string }>();
  const [chon, setChon] = useState<string | null>(null);
  // tab giữ trạng thái giữa các lần mở ⇒ mở từ màn của một Con (?con=) thì Con đó thắng lựa chọn chip cũ
  const [vaoCu, setVaoCu] = useState(conVao);
  if (conVao !== vaoCu) { setVaoCu(conVao); setChon(null); }
  const con = chon ?? (conVao && g.d?.con.some((c) => c.id === conVao) ? conVao : g.d?.con[0]?.id) ?? null;
  const dau = <Chu kieu="rat" co={13} mau={M.chu3} style={{ marginTop: -12, marginLeft: 4 }}>Con mở được gì trên máy</Chu>;
  if (!g.d) return <View style={{ flex: 1 }}><Man tieuLon={TIEU}>{dau}<ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man></View>;
  if (!g.d.con.length) return <View style={{ flex: 1 }}><Man tieuLon={TIEU}>{dau}<CanhGiua lv="canh-trong" tieu="Chưa có con nào" loi="Thêm hồ sơ con ở tab Cả nhà." /></Man></View>;
  return <ChanCon key={con!} id={con!} ds={g.d.con} dau={dau} doi={setChon} />;
}

type DuLieu = { ds: DanhSach; xem: boolean };

function ChanCon({ id, ds, dau, doi }: { id: string; ds: GiaDinh["con"]; dau: React.ReactNode; doi: (id: string) => void }) {
  const idRef = useRef(id);
  const { d, loi, matMang, tai } = useTai<DuLieu>(async () => {
    const [dsMuc, xem] = await Promise.all([napDanhSach(idRef.current), laChiXem()]);
    return { ds: dsMuc, xem };
  }, `tab:chan:${id}`);
  useEffect(() => { idRef.current = id; }, [id]);
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  const chips = ds.length > 1 ? <ChipCon ds={ds} chon={id} doi={(x) => doi(x.id)} /> : null;
  if (!d) return <View style={{ flex: 1 }}><Man tieuLon={TIEU}>{dau}{chips}<ChoTai loi={loi} matMang={matMang} tai={tai} /></Man></View>;

  const ten = d.ds.con.ten;
  const cheDo: CheDo = cheDoTu(d.ds);
  const moHet = cheDo === "mo_het";
  const app = hangCua(d.ds, "app"), web = hangCua(d.ds, "web");
  const doiCheDo = (v: CheDo) => {
    if (v === cheDo || d.xem || dangChay) return;
    lam(async () => {
      await ghiCheDo(id, v);
      await tai();
      bao(`${ten}: ${TEN_CHE_DO[v]}`, () => { ghiCheDo(id, cheDo).then(() => tai(), () => tai()); });
    });
  };
  const moApp = () => router.push({ pathname: "/ung-dung", params: { con: id } });
  const moWeb = () => router.push(`/web/${id}`);

  return (
    <View style={{ flex: 1 }}>
      <Man tieuLon={TIEU} tai={tai} vongTai noi={noi}>
        {dau}
        {chips}
        {/* thẻ lớn chế độ (.hero) — chế độ đang bật thấy đầu tiên, công tắc ngay trên thẻ */}
        <View style={{ borderRadius: 34, overflow: "hidden", ...KHOI.the }}>
          <LinearGradient colors={moHet ? ["#f6e6d2", "#faf2e8"] : ["#cfe6de", "#e8f2ee"]} style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16 }}>
            <View pointerEvents="none" style={{ position: "absolute", right: ROB_PHAI, top: 56 }}><Rob ten={moHet ? "nghi" : "chi"} co={ROB_CO} /></View>
            <Chu kieu="dam7" co={13} mau={moHet ? "#8a3c0c" : M.chinhInk}>{`Máy của ${ten} đang ở chế độ`}</Chu>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginRight: CHUA_ROB }} accessibilityRole="header">
              <Icon3D ten={IC_CHE_DO[cheDo]} co={32} />
              <Chu kieu="rat" co={25} style={{ letterSpacing: -0.5, flexShrink: 1 }}>{TEN_CHE_DO[cheDo]}</Chu>
            </View>
            <View style={{ marginTop: 12, marginRight: 96, gap: 8 }}>
              {moHet ? <>
                <DongY ic="tick" nen={M.chinh} chu="Con mở mọi app, mọi trang web" />
                <DongY ic="tick" nen={M.chinh} chu="Không tính phút" />
              </> : <>
                <DongY ic="tick" nen={M.chinh} chu="Chỉ mở app, web Ba Mẹ đã thêm" />
                <DongY kyTu="?" nen="#8a3c0c" chu="App, web mới: con xin Ba Mẹ" />
              </>}
            </View>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 16, padding: 4, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.55)", boxShadow: BONG.lom }}
              accessibilityRole="radiogroup" accessibilityLabel="Chế độ app và web">
              {(["mo_het", "theo_danh_sach"] as const).map((k) => {
                const on = k === cheDo;
                return (
                  <NhanMen key={k} onPress={() => doiCheDo(k)} disabled={d.xem || dangChay} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: d.xem }} aria-checked={on}
                    accessibilityLabel={TEN_CHE_DO[k]} muc="chip" sang={!on} men={on ? MEN.ngoc : undefined}
                    style={[{ flex: k === "mo_het" ? 1 : 1.25, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 20 },
                      on && { backgroundColor: M.chinh, boxShadow: BONG.ngoc }]}>
                    <View style={{ opacity: on ? 1 : 0.6 }}><Icon3D ten={IC_CHE_DO[k]} co={22} /></View>
                    <Chu kieu="rat" co={14.5} mau={on ? "#fff" : M.chu2} dong={1}>{TEN_CHE_DO[k]}</Chu>
                  </NhanMen>
                );
              })}
            </View>
          </LinearGradient>
        </View>
        <BaoLoi loi={loiLam} />

        {/* bàn them-98obxv7x@v6: đang «Mở hết» thì không có mục «Con đang xin» (con mở được mọi thứ, lời xin cũ vẫn ở Trang chủ / Chờ duyệt) */}
        {!moHet && d.ds.dangXin.length ? (
          <>
            <TieuMuc chu="Con đang xin" so={d.ds.dangXin.length} />
            {d.ds.dangXin.map((y) => (
              <HangXin key={y.id} ic={y.kieu === "web" ? "web" : icCuaApp(y.ten ?? "")} tieu={y.ten ?? y.muc ?? (y.kieu === "web" ? "Trang web" : "App mới")}
                phu={`${lucNgan(y.luc)} · ${ten} đang chờ`} bam={() => router.push({ pathname: "/yeu-cau-web/[id]", params: { id: y.id } })} />
            ))}
          </>
        ) : null}

        <TieuMuc chu={`Danh sách của ${ten}`} />
        {moHet ? null : (
          <View style={{ flexDirection: "row", gap: 14, marginHorizontal: 6, marginTop: -2 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {(["tinh_phut", "khong_tinh_phut"] as const).map((n) => (
              <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: MAU_NHOM[n], boxShadow: "inset 0px 2px 0px rgba(255,255,255,0.45), inset 0px -3px 4px -1px rgba(0,0,0,0.25)" }} />
                <Chu kieu="dam" co={12.5} mau={M.chu2}>{TEN_NHOM[n]}</Chu>
              </View>
            ))}
          </View>
        )}
        <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 28, backgroundColor: "#f7f6f3", ...KHOI.the }}>
          <View style={{ opacity: moHet ? 0.55 : 1 }}>
            <HangIcon nhan="App" ds={app} trong="Chưa thêm app nào" sua={!moHet} bam={moApp} />
            <View style={{ height: 1.5, backgroundColor: "#ecebe7" }} />
            <HangIcon nhan="Web" ds={web} web trong="Chưa thêm trang nào" sua={!moHet} bam={moWeb} />
          </View>
          {moHet ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
              <Icon3D ten="dong_ho_cat" co={22} />
              <Chu kieu="dam" co={13.5} mau={M.chu2} style={{ flex: 1 }}>Đang tạm nghỉ, vẫn giữ nguyên. Bật «Theo danh sách» là dùng tiếp.</Chu>
            </View>
          ) : null}
        </View>

        {!moHet && d.ds.boQua.so ? <HangBoQua so={d.ds.boQua.so} bam={() => router.push({ pathname: "/bo-qua", params: { con: id } })} /> : null}
      </Man>
    </View>
  );
}

function DongY({ ic, kyTu, nen, chu }: { ic?: TenIcon; kyTu?: string; nen: string; chu: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: nen, alignItems: "center", justifyContent: "center" }}>
        {ic ? <Icon ten={ic} mau="#fff" co={12} /> : <Chu kieu="rat" co={12} mau="#fff">{kyTu ?? ""}</Chu>}
      </View>
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

/** Một hàng «App» / «Web» (.hang): nhãn, tối đa 4 icon (chấm vàng Tính phút / xanh Không tính phút ở góc), «Sửa ›». */
function HangIcon({ nhan, ds, web, trong, sua, bam }: { nhan: string; ds: DongDs[]; web?: boolean; trong: string; sua: boolean; bam: () => void }) {
  const ic = (h: DongDs): TenIcon => icMuc(`${h.ten} ${h.muc.join(" ")}`, web ? "web" : "app");
  const dem = (n: Nhom) => ds.filter((h) => h.nhom === n).length;
  return (
    <Pressable onPress={bam} accessibilityRole="button"
      accessibilityLabel={`${nhan}: ${ds.length ? `${dem("tinh_phut")} tính phút, ${dem("khong_tinh_phut")} không tính phút` : trong}${sua ? ", sửa" : ""}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60 }}>
      <Chu kieu="rat" co={14} mau={M.chu2} style={{ width: 44 }}>{nhan}</Chu>
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", gap: 6, alignItems: "center" }}>
        {ds.length ? ds.slice(0, 4).map((h, i) => (
          <View key={i} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
            boxShadow: "0px 8px 12px -8px rgba(28,32,30,0.3), inset 0px -4px 8px -4px rgba(40,44,42,0.12)" }}>
            <Icon3D ten={ic(h)} co={24} />
            <View style={{ position: "absolute", right: -3, bottom: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: MAU_NHOM[h.nhom], borderWidth: 2, borderColor: "#fff" }} />
          </View>
        )) : <Chu kieu="dam" co={13} mau={M.chu3}>{trong}</Chu>}
        {ds.length > 4 ? <Chu kieu="rat" co={13} mau={M.chu3}>{`+${ds.length - 4}`}</Chu> : null}
      </View>
      {sua ? <Chu kieu="rat" co={14} mau={M.chinhInk}>Sửa ›</Chu> : null}
    </Pressable>
  );
}
