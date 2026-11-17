// «App của <con>» / «Web của <con>» và màn một app / một trang (thiết kế chốt 15/11 bm-ung-dung — #262, luồng #258):
//  · DsMucCon (03 them-g7g1cel5 · 07 bm2-web): «Con xin mở …» (Trả lời ›), hai nhóm «● Tính phút — trả bằng sao» / «● Không tính phút — vào thoải mái»,
//    dòng phụ «Hôm nay trừ 39 phút · −39 sao» / «Hôm nay 25 phút», «Đã bỏ qua N lời xin · Xem ›», nút «+ Thêm app / trang web cho <con>».
//  · MotMuc (05 bm2-app-web · 08 them-2nupeqju): «<mục> có tính phút không?» hai ô nhóm, «Lưu: <mục> tính phút», «Bỏ <mục> khỏi danh sách»
//    (bỏ rồi thì con xin lại được). Đọc: GET con/:id/danh-sach. Ghi: danh-sach/doi · danh-sach/bo · POST danh-sach (mục chưa có — thẻ «app mới»).
import { useState } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import { bm, laChiXem } from "./api";
import { boKhoiDs, doiNhom, hangCua, napBoQua, napDanhSach, phuHomNay, themVaoDs, type DongDs, type Kieu, type Nhom } from "./app-web";
import { BONG, KHOI, MEN } from "./clay";
import { ChonNhom, DauMuc, DongDen, HangBoQua, KhoiNhom, MucNhom, OIcon, icCuaApp, lucNgan, veHoac } from "./ui-bm3";
import { BaoLoi, ChoTai, Chu, Icon3D, M, Man, NhanMen, Nut, useLam, useTai, type TenIcon } from "./ui";

/** Icon một mục trong DANH SÁCH (bàn them-g7g1cel5 / bm2-web / bm2-ung-dung-may): trang / app xem video (YouTube, Netflix, TikTok) = máy quay,
 *  trang web khác không rõ loại = sách. (Thẻ lời xin vẫn dùng quả địa cầu — icCuaApp.) */
export const icMuc = (ten: string, kieu: Kieu): TenIcon => {
  if (/youtube|netflix|tiktok|video|phim/i.test(ten)) return "camera";
  const i = icCuaApp(ten); return kieu === "web" && i === "web" ? "sach" : i;
};

/** Hàng lời xin đang chờ (.xin — bàn bm2-ung-dung-may@v17 · bm2-web@v15): nền cam nhạt, ô icon lõm, tiêu đề + «19:20 · …» một dòng, «Trả lời ›». */
export function HangXin({ ic, tieu, phu, bam }: { ic: TenIcon; tieu: string; phu: string; bam: () => void }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={`${tieu}, ${phu}. Trả lời`} muc="khoi"
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 28, backgroundColor: "#f9e7d2", ...KHOI.the }}>
      <OIcon ic={ic} co={40} nen="#f3d6b8" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15} dong={1}>{tieu}</Chu>
        <Chu kieu="dam" co={12.5} mau="#8a3c0c" dong={1}>{phu}</Chu>
      </View>
      <Chu kieu="rat" co={14} mau="#8a3c0c">Trả lời ›</Chu>
    </NhanMen>
  );
}

/** Ô icon trắng nổi của một dòng danh sách / kết quả (.ic — bàn them-g7g1cel5@v7 · them-vw103x88@v8): 42, nền trắng, bóng đổ mềm (không lõm). */
export const OIconTrang = ({ ic, anh }: { ic: TenIcon; anh?: string | null }) => (
  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", boxShadow: "0px 8px 12px -8px rgba(28,32,30,0.3)" }}>
    {anh ? <Image source={{ uri: `data:image/png;base64,${anh}` }} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Icon3D ten={ic} co={26} />}
  </View>
);

/** Nút tròn ＋ / ✓ của một dòng kết quả ở màn Thêm app / Thêm web (.c — bàn them-vw103x88@v8): hình 32 (lõm xám ＋ · xanh ✓), vùng chạm 44. */
export const NutChon = ({ chon }: { chon: boolean }) => (
  <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
    <View style={[{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
      chon ? { backgroundColor: M.chinh, boxShadow: "inset 0px 1.5px 0px rgba(255,255,255,0.3), inset 0px -4px 6px -2px rgba(0,0,0,0.3)" } : { backgroundColor: "#ecebe7", boxShadow: BONG.lom }]}>
      <Chu kieu="rat" co={chon ? 15 : 18} mau={chon ? "#fff" : M.chinhInk}>{chon ? "✓" : "+"}</Chu>
    </View>
  </View>
);
const khoa = (t: string) => t.trim().toLowerCase();

export function DsMucCon({ con, kieu }: { con: string; kieu: Kieu }) {
  const { d, loi, matMang, tai } = useTai(async () => {
    // «Đã bỏ qua N lời xin» đếm ĐÚNG loại của màn (app / web) — danh-sach chỉ trả tổng ⇒ đọc danh sách bỏ qua của Con
    const [ds, xem, bq] = await Promise.all([napDanhSach(con), laChiXem(), napBoQua(con).catch(() => null)]);
    return { ds, xem, soBoQua: bq ? bq.ds.filter((x) => x.kieu === kieu).length : 0 };
  });
  const web = kieu === "web";
  const ve = () => veHoac(`/chan?con=${con}`);
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu={web ? "Web của con" : "App của con"}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = d.ds.con.ten;
  const tat = hangCua(d.ds, kieu);
  const xin = d.ds.dangXin.filter((y) => y.kieu === kieu);
  const mo = (h: DongDs) => router.push({ pathname: web ? "/web/trang" : "/ung-dung/app", params: { con, ten: h.ten } });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`${web ? "Web" : "App"} của ${ten}`} tai={tai} vongTai>
      {xin.map((y) => (
        <HangXin key={y.id} ic={web ? "web" : icCuaApp(y.ten ?? "")} tieu={`Con xin mở ${y.ten ?? y.muc ?? (web ? "trang web" : "app mới")}`}
          phu={`${lucNgan(y.luc)} · đang chờ Ba Mẹ`} bam={() => router.push({ pathname: "/yeu-cau-web/[id]", params: { id: y.id } })} />
      ))}
      {!tat.length ? (
        <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>
          {`Chưa có ${web ? "trang" : "app"} nào trong danh sách. ${web ? "Trang" : "App"} chưa thêm thì ${ten} chưa mở được — con muốn dùng sẽ xin Ba Mẹ.`}
        </Chu>
      ) : null}
      {(["tinh_phut", "khong_tinh_phut"] as const).map((n) => {
        const ds = tat.filter((h) => h.nhom === n);
        return ds.length ? (
          <View key={n} style={{ gap: 8 }}>
            <MucNhom nhom={n} />
            <KhoiNhom nhom={n}>
              {ds.map((h, i) => (
                <DongDen key={`${h.ten}|${h.muc.join(",")}`} dau={i === 0} tieu={h.ten} phu={phuHomNay(h, web)}
                  trai={<OIconTrang ic={icMuc(`${h.ten} ${h.muc.join(" ")}`, kieu)} />} bam={d.xem ? undefined : () => mo(h)} />
              ))}
            </KhoiNhom>
          </View>
        ) : null;
      })}
      {!web && tat.length ? (
        <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>
          {d.ds.tamNghi ? `Đang «Mở hết»: ${ten} mở được mọi app. Danh sách giữ nguyên, bật «Theo danh sách» là dùng tiếp.`
            : `${ten} chỉ mở được ${tat.length} app này. Bấm vào app để đổi loại hoặc bỏ khỏi danh sách.`}
        </Chu>
      ) : null}
      {d.soBoQua ? <HangBoQua so={d.soBoQua} bam={() => router.push({ pathname: "/bo-qua", params: { con, kieu } })} /> : null}
      {d.xem ? null : (
        <Nut chu={web ? `+ Thêm trang web cho ${ten}` : `+ Thêm app cho ${ten}`} rong
          bam={() => router.push({ pathname: web ? "/web/them" : "/ung-dung/them", params: { con } })} />
      )}
    </Man>
  );
}

/** Một app / một trang trong danh sách. `muc` (không bắt buộc) = định danh khi mục CHƯA có trong danh sách (thẻ «app mới» Trang chủ ⇒ thêm mới).
 *  `caNha`: thẻ «app mới» của cả nhà (không kèm con) ⇒ ghi luật cả nhà (POST luat không `con`, loai tinh_phut | khong_tinh_phut) — mọi bé + máy chung. */
export function MotMuc({ con, kieu, ten, muc, caNha }: { con: string; kieu: Kieu; ten: string; muc?: string; caNha?: boolean }) {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [ds, xem] = await Promise.all([napDanhSach(con), laChiXem()]);
    return { ds, xem };
  });
  const [chon, setChon] = useState<Nhom | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const web = kieu === "web";
  const ve = () => veHoac(web ? `/web/${con}` : `/ung-dung?con=${con}`);
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu={ten}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const tenCon = d.ds.con.ten;
  const h = caNha ? undefined : hangCua(d.ds, kieu).find((x) => khoa(x.ten) === khoa(ten) || (!!muc && x.muc.includes(muc)));
  const nhom = chon ?? h?.nhom ?? null;
  const luu = () => lam(async () => {
    if (!nhom) return;
    if (caNha) await bm.goi("luat", { muc: muc ?? ten, ten, loai: nhom });
    else if (!h) await themVaoDs(con, [{ nhom, kieu, ...(muc ? { muc, ten } : { ten }) }]);
    else if (nhom !== h.nhom) await doiNhom(con, h, nhom);
    ve();
  });
  const bo = () => lam(async () => { if (h) await boKhoiDs(con, h); ve(); });
  const phu = caNha ? "Áp cho cả nhà · mọi bé" : h ? (h.phutHomNay ? `Hôm nay đã ${web ? "vào" : h.nhom === "tinh_phut" ? "chơi" : "dùng"} ${h.phutHomNay} phút` : `Hôm nay chưa ${web ? "vào" : "dùng"}`)
    : "Chưa có trong danh sách";
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={caNha ? `${web ? "Web" : "App"} của cả nhà` : `${web ? "Web" : "App"} của ${tenCon}`}>
      <DauMuc ic={icMuc(`${ten} ${muc ?? ""}`, kieu)} tieu={ten} phu={phu} />
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginTop: 14, marginHorizontal: 6 }}>{`${ten} có tính phút không?`}</Chu>
      <ChonNhom gia={nhom} doi={setChon} tat={d.xem} />
      {h?.theoCaNha ? <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`Mục này đang theo danh sách cả nhà — đổi ở đây chỉ áp cho ${tenCon}.`}</Chu> : null}
      {d.xem ? null : (
        <View style={{ gap: 10, marginTop: 6 }}>
          <BaoLoi loi={loiLam} />
          <Nut chu={nhom ? `Lưu: ${ten} ${nhom === "tinh_phut" ? "tính phút" : "không tính phút"}` : "Chọn Tính phút hoặc Không tính phút"} rong dangChay={dangChay} tat={!nhom} bam={luu} />
          {h ? (
            <>
              <NutBo chu={`Bỏ ${ten} khỏi danh sách`} tat={dangChay} bam={bo} />
              <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ textAlign: "center" }}>Bỏ rồi thì con xin lại được.</Chu>
            </>
          ) : null}
        </View>
      )}
    </Man>
  );
}


/** «Bỏ <mục> khỏi danh sách» (.bo — bàn bm2-app-web@v15 · them-2nupeqju@v6): viên trắng phồng cao 48, icon dấu trừ, chữ nâu. */
function NutBo({ chu, tat, bam }: { chu: string; tat?: boolean; bam: () => void }) {
  return (
    <NhanMen onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={chu} accessibilityState={{ disabled: !!tat }} muc="nut" sang men={MEN.sang}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: "#fff", ...KHOI.the }}>
      <Icon3D ten="tru" co={22} />
      <Chu kieu="rat" co={15} mau="#8a3c0c" dong={1} style={{ flexShrink: 1 }}>{chu}</Chu>
    </NhanMen>
  );
}
