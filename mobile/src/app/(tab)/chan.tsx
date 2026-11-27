// Tab «App & web» (bàn bm-ung-dung: bm2-ung-dung-may@v21 · them-a4nqjrmp@v17 — #490): chọn bé (dải tròn kiểu Hôm nay, viên sao), thẻ navy «Máy của <con> đang ở chế độ» +
// công tắc «Mở hết | Theo danh sách» (lib/ds-chung › TheCheDo), «Con đang xin» (thẻ xin ngay trên tab: Tính phút | Không tính phút | Bỏ qua — ẩn khi Mở hết),
// «Danh sách của <con>» hai hàng App / Web (icon + chấm nhóm vàng Tính phút / navy Không tính phút, «Sửa ›»), «Đã bỏ qua N lời xin — Xem ›». Đang «Mở hết» ⇒ danh sách mờ,
// «Đang tạm nghỉ, vẫn giữ nguyên». Đọc: gia-dinh, con/:id/danh-sach. Ghi: POST con/:id/che-do {cheDo}. (Tên tệp route giữ «chan» cho các liên kết cũ /chan?con=.)
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type GiaDinh } from "@/lib/api";
import { saoTu, VienSao } from "@/lib/so-sao";
import { DaiCon } from "@/lib/ui-viec";
import { TheCheDo } from "@/lib/ds-chung";
import { laAppWeb, TheXin } from "@/lib/hom-nay-xin";
import { BONG, KHOI } from "@/lib/clay";
import { HangBoQua } from "@/lib/ui-bm3";
import { icMuc, xinThanhYc } from "@/lib/ds-con";
import { cheDoTu, doiCheDo as ghiCheDo, hangCua, MAU_NHOM, napDanhSach, TEN_CHE_DO, TEN_NHOM, type CheDo, type DanhSach, type DongDs, type Nhom } from "@/lib/app-web";
import { BaoLoi, CanhGiua, ChoTai, Chu, DauSach, IconNet, M, Man, The, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";

const TIEU = "App & web";

export default function TabChan() {
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"), "tab:chan");
  const { con: conVao, k: nonce } = useLocalSearchParams<{ con?: string; k?: string }>();
  const [chon, setChon] = useState<string | null>(null);
  // tab giữ trạng thái giữa các lần mở ⇒ mở từ màn của một Con (?con=) thì Con đó thắng lựa chọn chip cũ
  const [vaoCu, setVaoCu] = useState(`${conVao}|${nonce}`);   // nonce `k` từ chip «Chặn» Hôm nay: bấm lại cùng con vẫn về đúng con
  if (`${conVao}|${nonce}` !== vaoCu) { setVaoCu(`${conVao}|${nonce}`); setChon(null); }
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
  // Bàn bm2-ung-dung-may: dải avatar luôn có (cả nhà một con), bấm bé nào cả màn đổi theo bé đó
  const chips = (
    <DaiCon ds={ds} chon={id} doi={(x) => doi(x.id)} duoi={Object.fromEntries(ds.map((x) => [x.id, <VienSao key={x.id} s={saoTu(x)} nho />]))} />
  );
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
        {/* bm2-ung-dung-may@v21: thẻ navy chế độ + công tắc — khối dùng chung với Lần đầu (ds-chung) */}
        <TheCheDo lon ten={ten} cheDo={cheDo} doi={doiCheDo} tat={d.xem || dangChay} />
        <BaoLoi loi={loiLam} />

        {/* bàn them-98obxv7x@v6: đang «Mở hết» thì không có mục «Con đang xin» (con mở được mọi thứ, lời xin cũ vẫn ở Trang chủ / Chờ duyệt) */}
        {!moHet && d.ds.dangXin.length ? (
          <>
            <TieuMuc chu="Con đang xin" so={d.ds.dangXin.length} />
            {d.ds.dangXin.map((y) => (
              <The key={y.id} style={{ paddingVertical: 2 }}>
                <TheXin y={xinThanhYc(y, d.ds.con)} may={y.may} lam={(fn) => lam(fn)} dang={dangChay} dangXin truc={laAppWeb({ loai: y.loai })}
                  phu={`${y.ten ?? y.muc ?? (y.kieu === "web" ? "Trang" : "App")} chưa có trong danh sách được mở`} />
              </The>
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
        <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 28, backgroundColor: M.the, ...KHOI.the }}>
          <View style={{ opacity: moHet ? 0.55 : 1 }}>
            <HangIcon nhan="App" ds={app} trong="Chưa thêm app nào" sua={!moHet} bam={moApp} />
            <View style={{ height: 1.5, backgroundColor: M.xamSoft }} />
            <HangIcon nhan="Web" ds={web} web trong="Chưa thêm trang nào" sua={!moHet} bam={moWeb} />
          </View>
          {moHet ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
              <IconNet ten="dong_ho_cat" co={21} />
              <Chu kieu="dam" co={13.5} mau={M.chu2} style={{ flex: 1 }}>Đang tạm nghỉ, vẫn giữ nguyên. Bật «Theo danh sách» là dùng tiếp.</Chu>
            </View>
          ) : null}
        </View>

        {!moHet && d.ds.boQua.so ? <HangBoQua so={d.ds.boQua.so} bam={() => router.push({ pathname: "/bo-qua", params: { con: id } })} /> : null}
      </Man>
    </View>
  );
}

function TieuMuc({ chu, so }: { chu: string; so?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginHorizontal: 6, marginBottom: -4 }}>
      <DauSach mau={M.dauSach} />
      <Chu kieu="tieu" co={17} mau={M.chu}>{chu}</Chu>
      {so ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: M.badge }}><Chu kieu="rat" co={12} mau={M.chu}>{String(so)}</Chu></View> : null}
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
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingVertical: ds.length ? 4 : 0 }}>
      <Chu kieu="rat" co={14} mau={M.chu2} style={{ width: 44 }}>{nhan}</Chu>
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", gap: 4, alignItems: ds.length ? "flex-start" : "center" }}>
        {ds.length ? ds.slice(0, 4).map((h, i) => (
          <View key={i} style={{ width: 52, flexShrink: 1, minWidth: 40, alignItems: "center", gap: 3 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: M.the, alignItems: "center", justifyContent: "center",
              boxShadow: "0px 8px 12px -8px rgba(28,32,30,0.3), inset 0px -4px 8px -4px rgba(40,44,42,0.12)" }}>
              <IconNet ten={ic(h)} co={22} />
              <View style={{ position: "absolute", right: -3, bottom: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: MAU_NHOM[h.nhom], borderWidth: 2, borderColor: "#FFFBF5" }} />
            </View>
            {/* tên app / web dưới icon (#509, #526): tối đa hai dòng, tên ngắn hiện đủ */}
            <Chu kieu="dam" co={11} mau={M.chu2} dong={2} style={{ alignSelf: "stretch", textAlign: "center", lineHeight: 13, minHeight: 26 }}>{h.ten}</Chu>
          </View>
        )) : <Chu kieu="dam" co={13} mau={M.chu3}>{trong}</Chu>}
        {ds.length > 4 ? <Chu kieu="rat" co={13} mau={M.chu3}>{`+${ds.length - 4}`}</Chu> : null}
      </View>
      {sua ? <Chu kieu="rat" co={14} mau={M.chinhInk}>Sửa ›</Chu> : null}
    </Pressable>
  );
}
