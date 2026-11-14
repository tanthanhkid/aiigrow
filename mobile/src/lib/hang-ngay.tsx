// Phần dùng chung của app Ba Mẹ «Hằng ngày» + «Duyệt» theo thiết kế đã chốt 05/11 (docs/thiet-ke-chot/bm-hang-ngay, bm-duyet —
// docs/KE-HOACH-KHOP-THIET-KE-0511.md L1–L3, L9, L10, L12): kiểu dữ liệu các đường S1/S2 mới (docs/API.md cuối tệp), quyền «Người trông giúp»,
// chip đổi Con, hàng việc có sao, màn kết quả (Grow + dòng tick + 2 nút), bảng trượt «Khoá máy ngay?» và «Cho thêm giờ».
// Chữ: «sao» (không «điểm»), «Ba Mẹ». Chỉ THÊM — không đổi chữ ký thành phần cũ của lib/ui.
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet, type LuotCho, type MayCon, type YeuCau } from "./api";
import { BONG, KHOI, MEN } from "./clay";
import { datKhoa } from "./khoa-may";
import {
  Avt, BangTruot, BaoLoi, BieuTron, CanhGiua, ChonMot, Chu, gioPhut, Icon, Icon3D, M, Man, NhanMen, Nut, TickDong, useLam, type LinhVat, type MauBt, type TenIcon,
} from "./ui";

// ---------------------------------------------------------------- kiểu dữ liệu (docs/API.md «Thiết kế chốt 05/11»)

/** Đối tượng `quy` — quỹ giờ chơi hôm nay (server/lib/quy-gio.ts › quyHomNay). */
export type Quy = {
  ngay: string; cuoiTuan: boolean; quyNgayPhut: number; themPhut: number; doiSaoPhut: number; daDung: number; conPhut: number; tongPhut: number;
  dangNgu: boolean; dangHoc: boolean; khoa: boolean; gioNgu: { tu: string; den: string }; gioHoc: GioHoc | null; phutToiNgu: number; phutToiHoc: number | null;
  tyLe: { sao: number; phut: number }; doiSao: { bat: boolean; toiDaNgay: number; conDoiDuoc: number }; choXinThem: boolean;
};
export type GioHoc = { tu: string; den: string; thu: number[] };
/** GET con/:id/quy */
export type QuyCon = { quy: Quy; sao: number; ngoaiLe: { id: string; den: string; muc: string | null; nhom: string }[] };
/** GET/POST con/:id/gio-choi */
export type GioChoi = { quyNgayThuong: number; quyCuoiTuan: number; phut10Sao: number; doiSaoBat: boolean; doiSaoToiDaNgay: number; choXinThemGio: boolean;
  ngoaiLeToiDaPhut: number; gioNgu: { tu: string; den: string }; gioHoc: GioHoc | null; homNay: Quy };
/** GET nhiem-vu/bo */
export type ViecBo = { ten: string; moTa: string; sao: number; bangChung: string; tuCham: boolean; lapLai: string; hinh: string; nhan: string | null; toiDaNgay: number | null };
export type BoNv = { ma: string; ten: string; tuoi: string; soViec: number; saoToiDaNgay: number; viec: ViecBo[] };
/** Nhiệm vụ (GET nhiem-vu) + cột 05/11. */
export type NhiemVuMoi = { id: string; ten: string; mo_ta: string; nhom: string; diem: number; bang_chung: string; tu_duyet: boolean; giao_cho: string | null;
  bat: boolean; toi_da_ngay: number | null; hinh?: string | null; lap_lai?: string | null; gio_nhac?: string | null; bo?: string | null };
/** Lượt chờ duyệt (GET cho-duyet › nhiemVu[]) + trường 05/11. */
export type LuotChoMoi = LuotCho & { sao?: number; bang_chung?: string; hinh?: string | null; so_ghi_am?: number };
/** Yêu cầu chờ (GET cho-duyet › yeuCau[]) + phạm vi ngoại lệ. */
export type YeuCauMoi = YeuCau & { pham_vi?: string | null };
/** Quà Con đã đổi, chờ Ba Mẹ trao (GET cho-duyet › phieu[], GET phieu). */
export type PhieuCho = { id: string; child_id: string; ten_con: string; ten: string; loai: string; diem: number; created_at: string };
export type ChoDuyetMoi = { nhiemVu: LuotChoMoi[]; yeuCau: YeuCauMoi[]; phieu?: PhieuCho[];
  tuDong?: { id: string; child_id: string; ten_con: string; ten: string; diem: number; nguon: string; ghi_chu: string | null; duyet_luc: string }[] };
/** Bằng chứng (GET luot/:id/bang-chung). */
export type BangChung = { id: string; mime: string; loai: "anh" | "ghi_am"; base64: string; chupLuc: string };
export type ConCt = ConChiTiet & { cheDoChan?: "chi_app_duoc_phep" | "mo_het"; sao?: number; saoChoDuyet?: number;
  /** S3 06/11: bé đã có PIN vào máy + lúc đặt; may[] thêm matMang (máy im lặng >10 phút hôm nay) */ coPin?: boolean; pinDatLuc?: string | null };

// ---------------------------------------------------------------- quyền (L6): Ba Mẹ làm được hết · Người trông giúp xem / duyệt / khoá máy

export type Quyen = "ba_me" | "trong_giup";
/** Quyền của người đang đăng nhập — máy chủ mới trả `quyen`; máy chủ cũ chỉ có `vai` (xem = trông giúp). Lỗi mạng ⇒ «ba_me» (máy chủ vẫn chặn 403). */
export const quyenToi = () => bm.goi<{ baMe: { quyen?: Quyen; vai?: string } }>("toi")
  .then((t): Quyen => t.baMe.quyen ?? (t.baMe.vai === "xem" ? "trong_giup" : "ba_me"), (): Quyen => "ba_me");
/** Câu nhỏ dưới nút bị khoá khi là Người trông giúp. */
export const CAU_TRONG_GIUP = "Người trông giúp xem, duyệt và khoá máy được — đổi cài đặt thì nhờ Ba Mẹ.";

// ---------------------------------------------------------------- chữ

/** Tuổi từ năm sinh (null = chưa có). */
export const tuoiCua = (namSinh: number | null | undefined) => {
  if (!namSinh) return null;
  const t = new Date().getFullYear() - namSinh;
  return t >= 1 && t <= 25 ? t : null;
};
/** 5 màu hồ sơ Con «mau-<số>» — trùng bảng của luồng Lần đầu (M1 lib/lan-dau › MAU_HO_SO); avatar cũ (không «mau-») ⇒ màu theo thứ tự. */
const MAU_HO_SO = ["#f29a4a", "#6aa3ef", "#ec8db2", "#5bbf95", "#a98bea"];
export const mauCon = (avatar: string | null | undefined, thu = 0) => {
  const k = Number(/^mau-(\d)$/.exec(avatar ?? "")?.[1]);
  return MAU_HO_SO[Number.isInteger(k) && k < MAU_HO_SO.length ? k : thu % MAU_HO_SO.length];
};
/** «21:30» → «21:30», «06:30» → «6:30» (thiết kế viết giờ không số 0 đầu). */
export const gioGon = (g: string | null | undefined) => (g ?? "").replace(/^0(\d):/, "$1:");
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
/** [1,2,3,4,5] → «Thứ 2 – Thứ 6»; [0,6] → «Thứ 7, Chủ nhật»; mọi ngày → «mỗi ngày». */
export function cauThu(thu: number[]) {
  const s = [...new Set(thu)].sort((a, b) => a - b);
  if (s.length === 7) return "mỗi ngày";
  if (s.join() === "1,2,3,4,5") return "Thứ 2 – Thứ 6";
  if (s.join() === "0,6") return "Thứ 7, Chủ nhật";
  return s.map((x) => THU[x]).join(", ");
}
/** Lặp lại của nhiệm vụ (`lap_lai`) → chữ: «Mỗi ngày», «Thứ 2 – Thứ 6», «Cuối tuần», «Một lần», «T2, T4». */
export function cauLapLai(l: string | null | undefined) {
  if (!l || l === "hang_ngay") return "Mỗi ngày";
  if (l === "ngay_thuong") return "Thứ 2 – Thứ 6";
  if (l === "cuoi_tuan") return "Cuối tuần";
  if (l === "mot_lan") return "Một lần";
  if (l.startsWith("thu:")) return cauThu(l.slice(4).split(",").map(Number).filter((x) => x >= 0 && x <= 6));
  return "Mỗi ngày";
}
/** Cách con báo xong (`bang_chung`). */
export const CACH_BAO: Record<string, string> = { anh: "chụp ảnh", ghi_am: "ghi âm", xong: "bấm «Xong»", van_ban: "viết", viet: "viết", tu_dong: "tự chấm", tu_cham: "tự chấm" };
export const cachBao = (b: string | null | undefined) => CACH_BAO[b ?? ""] ?? "chụp ảnh";
/** Hình nhiệm vụ (`tasks.hinh`, mã của bộ nhiệm vụ) → icon 3D sẵn có + màu viên. */
const HINH: Record<string, [TenIcon, MauBt]> = {
  choi: ["lau", "lam"], ban_chai: ["tia", "xanh"], sach: ["sach", "xanh"], cap: ["mu", "tim"], rob: ["game", "tim"], cay: ["tia", "xanh"], bat: ["chen", "lam"],
  ao: ["lau", "lam"], rac: ["lau", "xam"], ban_an: ["chen", "cam"], ban_hoc: ["ban", "lam"], vo: ["but", "tim"], but: ["but", "tim"], the_tu: ["sach", "tim"],
  day: ["chay", "cam"], the_duc: ["chay", "cam"], rau: ["coc", "xanh"], ngu: ["trang_ngu", "tim"],
};
const NHOM_HINH: Record<string, [TenIcon, MauBt]> = { doc_sach: ["sach", "xanh"], viec_nha: ["chen", "lam"], hoc_tap: ["mu", "tim"], van_dong: ["chay", "cam"], ky_nang: ["sao", "vang"] };
export const hinhNv = (x: { hinh?: string | null; nhom?: string; bang_chung?: string }): [TenIcon, MauBt] =>
  (x.bang_chung === "tu_dong" ? ["game", "tim"] : HINH[x.hinh ?? ""] ?? NHOM_HINH[x.nhom ?? ""] ?? ["sao", "vang"]);
/** Biểu tượng loại máy. */
export const IC_MAY: Record<MayCon["nen"], TenIcon> = { windows: "laptop", mac: "laptop", ios: "tablet", android: "dt" };

// ---------------------------------------------------------------- thành phần

/** Chip đổi Con (thiết kế: chữ cái trong viên màu + tên; đang chọn = khối ngọc đậm chữ trắng). */
export function ChipCon<T extends { id: string; ten: string; avatar?: string | null }>({ ds, chon, doi, them }: { ds: T[]; chon: string; doi: (c: T) => void; them?: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }} accessibilityRole="tablist">
      {ds.map((x, k) => {
        const on = x.id === chon;
        return (
          <NhanMen key={x.id} onPress={() => doi(x)} accessibilityRole="tab" accessibilityState={{ selected: on }} muc="chip" sang={!on} men={on ? MEN.ngoc : MEN.sang}
            style={[{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingLeft: 6, paddingRight: 16, borderRadius: 22, maxWidth: "100%", flexShrink: 1 },
              on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.the, ...KHOI.nho }]}>
            <Avt ten={x.ten} mau={mauCon(x.avatar, k)} co={32} />
            <Chu kieu="rat" co={15} mau={on ? "#fff" : M.chu} dong={1} style={{ flexShrink: 1 }}>{x.ten}</Chu>
          </NhanMen>
        );
      })}
      {them ? (
        <NhanMen onPress={them} accessibilityRole="button" accessibilityLabel="Thêm con" muc="chip" sang men={MEN.sang}
          style={[{ minHeight: 44, minWidth: 44, borderRadius: 22, backgroundColor: M.the, alignItems: "center", justifyContent: "center" }, KHOI.nho]}>
          <Icon ten="cong" mau={M.chu2} co={20} />
        </NhanMen>
      ) : null}
    </View>
  );
}

/** Viên «10 sao» (vàng — vàng CHỈ dùng cho sao). `dau` = «+». */
export function SaoVien({ n, dau, nho }: { n: number; dau?: boolean; nho?: boolean }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: M.diemSoft, borderRadius: 99, paddingLeft: 6, paddingRight: 10, paddingVertical: nho ? 2 : 4,
      alignSelf: "flex-start" }, KHOI.vien]}>
      <Icon3D ten="sao" co={nho ? 16 : 18} mau={M.diemInk} />
      <Chu kieu="rat" co={nho ? 13 : 14} mau={M.diemInk} so>{`${dau ? "+" : ""}${n} sao`}</Chu>
    </View>
  );
}

/** Hàng trong thẻ (thiết kế: icon tròn · tên + dòng phụ · bên phải nhãn / sao / mũi tên). Bấm được thì có mũi tên. */
export function HangViec({ ic, mau, trai, tieu, phu, phai, bam, dau, nhanDoc }: {
  ic?: TenIcon; mau?: MauBt; trai?: ReactNode; tieu: string; phu?: string; phai?: ReactNode; bam?: () => void; dau?: boolean; nhanDoc?: string;
}) {
  const noi = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, minHeight: 60, borderTopWidth: dau ? 0 : 1, borderTopColor: "#efefec" }}>
      {trai ?? (ic ? <BieuTron ic={ic} mau={mau} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15.5}>{tieu}</Chu>
        {phu ? <Chu co={13.5} mau={M.chu3}>{phu}</Chu> : null}
      </View>
      {phai}
      {bam && !phai ? <Icon ten="phai" mau="#b3b5b1" co={18} /> : null}
    </View>
  );
  return bam ? <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={nhanDoc} style={({ pressed }) => pressed && { opacity: 0.7 }}>{noi}</Pressable> : noi;
}

/** Tiêu đề mục trong thân màn (thiết kế: chữ đậm 17 + nút chữ «Tất cả ›» bên phải). */
export function TieuMuc({ chu, so, phai }: { chu: string; so?: number; phai?: { chu: string; bam: () => void } }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginHorizontal: 4 }}>
      <Chu kieu="rat" co={17} style={{ flexShrink: 1 }}>{chu}</Chu>
      {so ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: M.huy, alignItems: "center", justifyContent: "center" }}>
        <Chu kieu="rat" co={12} mau="#fff" so>{String(so)}</Chu></View> : null}
      <View style={{ flex: 1 }} />
      {phai ? <Pressable onPress={phai.bam} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
        <Chu kieu="rat" co={14} mau={M.chinhInk}>{phai.chu}</Chu></Pressable> : null}
    </View>
  );
}

/** Màn kết quả (thiết kế «Đã cho…», «Duyệt xong», «Đã nhắn làm lại»): Grow lớn + tiêu đề + câu, các dòng tick, 1–2 nút ở đáy. */
export function ManKetQua({ lv = "xong", tieu, loi, dong, chinh, phu, noi, children }: {
  lv?: LinhVat; tieu: string; loi?: string; dong?: string[]; chinh: { chu: string; bam: () => void }; phu?: { chu: string; bam: () => void; tat?: boolean };
  noi?: ReactNode; children?: ReactNode;
}) {
  return (
    <Man noi={noi} day={<>
      <Nut chu={chinh.chu} rong bam={chinh.bam} />
      {phu ? <Nut chu={phu.chu} rong loai="vien" bam={phu.bam} tat={phu.tat} /> : null}
    </>}>
      <CanhGiua lv={lv} tieu={tieu} loi={loi} />
      {dong?.length ? <View style={{ paddingHorizontal: 8 }}>{dong.map((x) => <TickDong key={x} chu={x} />)}</View> : null}
      {children}
    </Man>
  );
}

/** Bảng trượt «Khoá máy <Con>?» (thiết kế 14/11 them-sll7clha): liệt kê máy (app đang mở / lần dùng gần nhất), «Khoá bao lâu?» 30 phút · 1 giờ · Sáng mai,
 *  nút «Khoá N máy tới HH:MM». POST con/:id/khoa {khoa, den} (máy chủ tự hết khoá khi qua hạn; «sang» = 7:00 theo múi giờ gia đình).
 *  `dang`: dòng phụ từng máy (vd «● Roblox · từ 19:02») — không có thì «Đang mở» / «Đang tắt». `xong(chu, hoan)` ⇒ toast + Hoàn tác (mở lại). */
export function BangKhoaMay({ mo, dong, con, ten, may, dang, xong }: {
  mo: boolean; dong: () => void; con: string; ten: string; may: Pick<MayCon, "id" | "ten" | "nen" | "truc">[];
  dang?: Record<string, { chu: string; mo?: boolean }>;
  xong: (chu: string, hoan: () => Promise<void>) => void;
}) {
  const [han, setHan] = useState<"30" | "60" | "sang">("30");
  const { lam, loi, dangChay } = useLam();
  const now = new Date();
  const denLuc = (h: "30" | "60" | "sang") => (h === "sang" ? null : new Date(now.getTime() + Number(h) * 60_000));
  const cauDen = (h: "30" | "60" | "sang") => (h === "sang" ? "tới 7:00" : `tới ${gioPhut(denLuc(h)!.toISOString())}`);
  const lua: { gia: "30" | "60" | "sang"; chu: string }[] = [{ gia: "30", chu: "30 phút" }, { gia: "60", chu: "1 giờ" }, { gia: "sang", chu: "Sáng mai" }];
  const khoa = () => lam(async () => {
    const den = han === "sang" ? "sang" : denLuc(han)!;
    await datKhoa(con, true, den);
    dong();
    xong(`Đã khoá máy của ${ten} ${cauDen(han)}`, () => datKhoa(con, false, null));
  });
  const ngan = (t: string) => t.replace(/ của .*$/, "");
  return (
    <BangTruot mo={mo} dong={dong} tieu={`Khoá máy ${ten}?`}>
      {may.length ? (
        <View style={{ gap: 8 }}>
          {may.map((m) => {
            const x = dang?.[m.id];
            return (
              <View key={m.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 22, backgroundColor: M.the }, KHOI.nho]}>
                <BieuTron ic={IC_MAY[m.nen]} mau="xam" />
                <View style={{ flex: 1 }}>
                  <Chu kieu="rat">{ngan(m.ten)}</Chu>
                  <Chu co={13} mau={x?.mo ? M.chinhInk : M.chu3}>{x?.chu ?? (m.truc ? "Đang mở" : "Đang tắt · khoá khi máy mở lên")}</Chu>
                </View>
                <Icon ten="tick" co={18} mau={M.chinhInk} />
              </View>
            );
          })}
        </View>
      ) : null}
      <Chu kieu="rat" co={15}>Khoá bao lâu?</Chu>
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
        {lua.map((x) => {
          const on = x.gia === han;
          return (
            <Pressable key={x.gia} onPress={() => setHan(x.gia)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={[{ flex: 1, minHeight: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
                on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.the, ...KHOI.nho }]}>
              <Chu kieu="rat" co={15} mau={on ? "#fff" : M.chu}>{x.chu}</Chu>
              <Chu kieu="dam" co={12.5} mau={on ? "#fff" : M.chu3}>{cauDen(x.gia)}</Chu>
            </Pressable>
          );
        })}
      </View>
      <BaoLoi loi={loi} />
      <Nut chu={`Khoá ${may.length > 1 ? `${may.length} máy` : "máy"} ${cauDen(han)}`} ic="khoa" loai="huy" rong dangChay={dangChay} bam={khoa} />
      <Nut chu="Thôi, để con chơi tiếp" loai="ma" rong bam={dong} />
    </BangTruot>
  );
}

/** Bảng trượt «Cho <Con> thêm giờ» (thiết kế 14/11 them-6wjhze1d): «Đang còn N phút · chỉ tính hôm nay», 15 / 30 / 60 phút, nhắc sao con tự đổi được,
 *  nút «Cho thêm 30 phút · còn 48′». POST con/:id/them-gio. `conPhut`: phút chơi còn hôm nay (không có ⇒ bỏ phần «còn»).
 *  `xong(chu, grantId, phut)` ⇒ màn gọi hiện toast «Hoàn tác» (them-gio/:id/hoan-tac, 60 giây). */
export function BangThemGio({ mo, dong, con, ten, sao, phutDoiDuoc, conPhut, xong }: {
  mo: boolean; dong: () => void; con: string; ten: string; sao?: number | null; phutDoiDuoc?: number | null; conPhut?: number | null;
  xong: (chu: string, grantId: string, phut: number) => void;
}) {
  const [phut, setPhut] = useState(30);
  const { lam, loi, dangChay } = useLam();
  const coCon = typeof conPhut === "number";
  const cho = () => lam(async () => {
    const r = await bm.goi<{ id: string; phut: number; quy: Quy }>(`con/${con}/them-gio`, { phut });
    dong();
    xong(`Đã cho ${ten} thêm ${phut} phút · còn ${r.quy.conPhut} phút hôm nay`, r.id, phut);
  });
  return (
    <BangTruot mo={mo} dong={dong} tieu={`Cho ${ten} thêm giờ`}>
      <Chu co={14.5} mau={M.chu2}>{coCon ? `Đang còn ${conPhut} phút · chỉ tính hôm nay` : "Chỉ tính cho hôm nay."}</Chu>
      <ChonMot ds={[15, 30, 60].map((x) => ({ gia: x, chu: `${x} phút` }))} gia={phut} doi={setPhut} />
      {sao ? (
        <View style={[{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 20, backgroundColor: M.diemSoft }, KHOI.vien]}>
          <Chu co={14} mau={M.diemInk} style={{ flex: 1 }}>Con có <Chu kieu="rat" co={14} mau={M.diemInk}>{`${sao} sao`}</Chu>{phutDoiDuoc ? ` tự đổi ra ${phutDoiDuoc} phút được` : " tự đổi ra phút được"}</Chu>
          <Icon3D ten="sao" co={24} mau={M.diemInk} />
        </View>
      ) : null}
      <BaoLoi loi={loi} />
      <Nut chu={coCon ? `Cho thêm ${phut} phút · còn ${conPhut! + phut}′` : `Cho thêm ${phut} phút`} rong dangChay={dangChay} bam={cho} />
      <Nut chu="Thôi" loai="ma" rong bam={dong} />
    </BangTruot>
  );
}

/** Hoàn tác «Cho thêm giờ» (60 giây, đúng người cho). Lỗi (quá hạn) ⇒ báo lại. */
export const hoanTacThemGio = (grantId: string) => bm.goi(`them-gio/${grantId}/hoan-tac`, {});

/** «19:20 · trên Laptop» */
export const cauLuc = (iso: string | null | undefined, may?: string | null) => `Lúc ${gioPhut(iso)}${may ? ` · trên ${may}` : ""}`;
