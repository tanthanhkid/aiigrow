// «App của <con>» / «Web của <con>» và màn một app / một trang (bàn bm-ung-dung, cập nhật 20/11 — #490):
//  · DsMucCon (them-g7g1cel5@v11 · bm2-web@v19): thẻ con xin theo khuôn them-a4nqjrmp (Tính phút | Không tính phút, «Bỏ qua»), HAI NHÓM — «● Tính phút» ĐỨNG TRƯỚC
//    rồi «● Không tính phút» (lib/ds-chung › HaiNhomMuc), dòng phụ «Hôm nay N phút», «Đã bỏ qua N lời xin · Xem ›», nút «+ Thêm app / trang web cho <con>» ghim đáy.
//  · MotMuc (bm2-app-web@v20 · them-2nupeqju): chi tiết dùng chung với Lần đầu «Đổi app / web đã thêm» — lib/ds-chung › ChiTietMuc.
//    Đọc: GET con/:id/danh-sach. Ghi: danh-sach/doi · danh-sach/bo · POST danh-sach (mục chưa có — thẻ «app mới»).
import { useState } from "react";
import { Redirect, router } from "expo-router";
import { bm, laChiXem } from "./api";
import { boKhoiDs, doiNhom, hangCua, napBoQua, napDanhSach, phuHomNay, themVaoDs, type DongDs, type Kieu, type Nhom, type XinDs } from "./app-web";
import { ChiTietMuc, HaiNhomMuc } from "./ds-chung";
import type { YeuCauMoi } from "./hang-ngay";
import { laAppWeb, TheXin } from "./hom-nay-xin";
import { HangBoQua, icCuaApp, veHoac } from "./ui-bm3";
import { BaoLoi, ChoTai, Chu, M, Man, Nut, The, useLam, useTai, type TenIcon } from "./ui";

/** Icon một mục trong DANH SÁCH: trang / app xem video (YouTube, Netflix, TikTok) = máy quay, trang web khác không rõ loại = sách. */
export const icMuc = (ten: string, kieu: Kieu): TenIcon => {
  if (/youtube|netflix|tiktok|video|phim/i.test(ten)) return "camera";
  const i = icCuaApp(ten); return kieu === "web" && i === "web" ? "sach" : i;
};

/** Lời xin của danh sách (XinDs) ⇒ dạng lời xin của TheXin (cùng một khuôn thẻ ở Trang chủ, «<Con> đang xin phép», tab App & web, danh sách App / Web). */
export const xinThanhYc = (y: XinDs, con: { id: string; ten: string }): YeuCauMoi => ({
  id: y.id, child_id: con.id, ten_con: con.ten, loai: y.loai, phut: null, gia_tri: y.muc ?? y.ten, ten_app: y.ten, ly_do: y.lyDo ?? "", created_at: y.luc, het_han: y.luc });

const khoa = (t: string) => t.trim().toLowerCase();

export function DsMucCon(p: Parameters<typeof DsMucConTrong>[0]) {
  // #661: mở thẳng/tải lại không có ?con ⇒ về màn chọn bé thay vì «Không thấy hồ sơ Con»
  if (!p.con) return <Redirect href="/chan" />;
  return <DsMucConTrong {...p} />;
}
function DsMucConTrong({ con, kieu }: { con: string; kieu: Kieu }) {
  const { d, loi, matMang, tai } = useTai(async () => {
    // «Đã bỏ qua N lời xin» đếm ĐÚNG loại của màn (app / web) — danh-sach chỉ trả tổng ⇒ đọc danh sách bỏ qua của Con
    const [ds, xem, bq] = await Promise.all([napDanhSach(con), laChiXem(), napBoQua(con).catch(() => null)]);
    return { ds, xem, soBoQua: bq ? bq.ds.filter((x) => x.kieu === kieu).length : 0 };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const web = kieu === "web";
  const ve = () => veHoac(`/chan?con=${con}`);
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu={web ? "Web của con" : "App của con"}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = d.ds.con.ten;
  const tat = hangCua(d.ds, kieu);
  const xin = d.ds.dangXin.filter((y) => y.kieu === kieu);
  const mo = (h: DongDs) => router.push({ pathname: web ? "/web/trang" : "/ung-dung/app", params: { con, ten: h.ten } });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`${web ? "Web" : "App"} của ${ten}`} tai={tai} vongTai
      day={d.xem ? undefined : (
        <Nut thu chu={web ? `+ Thêm trang web cho ${ten}` : `+ Thêm app cho ${ten}`} rong
          bam={() => router.push({ pathname: web ? "/web/them" : "/ung-dung/them", params: { con } })} />
      )}>
      <BaoLoi loi={loiLam} />
      {xin.map((y) => (
        <The key={y.id} style={{ paddingVertical: 2 }}>
          <TheXin y={xinThanhYc(y, d.ds.con)} may={y.may} lam={(fn) => lam(fn)} dang={dangChay} dangXin truc={laAppWeb({ loai: y.loai })}
            phu={`${y.ten ?? y.muc ?? (web ? "Trang" : "App")} chưa có trong danh sách được mở`} />
        </The>
      ))}
      {!tat.length ? (
        <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>
          {`Chưa có ${web ? "trang" : "app"} nào trong danh sách. ${web ? "Trang" : "App"} chưa thêm thì ${ten} chưa mở được — con muốn dùng sẽ xin Ba Mẹ.`}
        </Chu>
      ) : null}
      <HaiNhomMuc ds={tat.map((h) => ({ k: `${h.ten}|${h.muc.join(",")}`, ten: h.ten, phu: phuHomNay(h, web), nhom: h.nhom,
        ic: icMuc(`${h.ten} ${h.muc.join(" ")}`, kieu), bam: d.xem ? undefined : () => mo(h) }))} />
      {!web && tat.length ? (
        <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>
          {d.ds.tamNghi ? `Đang «Mở hết»: ${ten} mở được mọi app. Danh sách giữ nguyên, bật «Theo danh sách» là dùng tiếp.`
            : `${ten} chỉ mở được ${tat.length} app này. Bấm vào app để đổi loại hoặc bỏ khỏi danh sách.`}
        </Chu>
      ) : null}
      {d.soBoQua ? <HangBoQua so={d.soBoQua} bam={() => router.push({ pathname: "/bo-qua", params: { con, kieu } })} /> : null}
    </Man>
  );
}

/** Một app / một trang trong danh sách. `muc` (không bắt buộc) = định danh khi mục CHƯA có trong danh sách (thẻ «app mới» Trang chủ ⇒ thêm mới).
 *  `caNha`: thẻ «app mới» của cả nhà (không kèm con) ⇒ ghi luật cả nhà (POST luat không `con`, loai tinh_phut | khong_tinh_phut) — mọi bé + máy chung. */
export function MotMuc(p: Parameters<typeof MotMucTrong>[0]) {
  // #661: mở thẳng/tải lại không có ?con ⇒ về màn chọn bé thay vì «Không thấy hồ sơ Con»
  if (!p.con) return <Redirect href="/chan" />;
  return <MotMucTrong {...p} />;
}
function MotMucTrong({ con, kieu, ten, muc, caNha }: { con: string; kieu: Kieu; ten: string; muc?: string; caNha?: boolean }) {
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
      <ChiTietMuc ten={ten} phu={phu} ic={icMuc(`${ten} ${muc ?? ""}`, kieu)} nhom={nhom} doi={setChon} tat={d.xem} luu={luu} bo={h ? bo : undefined}
        loi={loiLam} dangChay={dangChay}
        ghiChu={h?.theoCaNha ? `Mục này đang theo danh sách cả nhà — đổi ở đây chỉ áp cho ${tenCon}.` : null} />
    </Man>
  );
}
