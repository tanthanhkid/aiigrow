// Phần dùng chung của app Ba Mẹ «Hằng ngày» + «Duyệt» theo thiết kế đã chốt 05/11 (docs/thiet-ke-chot/bm-hang-ngay, bm-duyet —
// docs/KE-HOACH-KHOP-THIET-KE-0511.md L1–L3, L9, L10, L12): kiểu dữ liệu các đường S1/S2 mới (docs/API.md cuối tệp), quyền «Người trông giúp»,
// chip đổi Con, hàng việc có sao, màn kết quả (Grow + dòng tick + 2 nút), bảng trượt «Khoá máy ngay?» («Cho vay sao»: lib/so-sao).
// Chữ: «sao» (không «điểm»), «Ba Mẹ». Chỉ THÊM — không đổi chữ ký thành phần cũ của lib/ui.
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet, type LuotCho, type MayCon, type YeuCau } from "./api";
import { BONG, KHOI } from "./clay";
import { cauChuaCoMay, datKhoa, datKhoaMay } from "./khoa-may";
import { cachKhoa, cauKhoaMay, mayDangKhoa } from "./noi-1411";
import { nganTen, tenGocMay } from "./may-nhieu-con";
import { khoaTen, laWeb } from "./ui-bm3";
import { MAU_HO_SO } from "./lan-dau";
import { BangTruot, BaoLoi, BieuTron, CanhGiua, Chu, DauSach, gioPhut, Icon, Icon3D, IconNet, M, Man, Nut, TickDong, useLam, type LinhVat, type MauBt, type TenIcon } from "./ui";

// ---------------------------------------------------------------- kiểu dữ liệu (docs/API.md «Thiết kế chốt 05/11»)

/** Đối tượng `quy` — quỹ giờ chơi hôm nay (server/lib/quy-gio.ts › quyHomNay). */
export type Quy = {
  ngay: string; cuoiTuan: boolean; quyNgayPhut: number; themPhut: number; doiSaoPhut: number; daDung: number; conPhut: number; tongPhut: number;
  khoa: boolean; /** #658: phút đã trừ sao hôm nay (= số sao tiêu trong ví; máy chủ cũ không có) */ phutTruHomNay?: number;
  tyLe: { sao: number; phut: number }; doiSao: { bat: boolean; toiDaNgay: number; conDoiDuoc: number }; choXinThem: boolean;
};
/** GET con/:id/quy */
/** GET con/:id/quy — 15/11: `sao` = số dư Con thấy (âm được), `soSao` = trạng thái sổ sao (lib/so-sao); `quy.conPhut` = sao tiêu được; `ngoaiLe` luôn []. */
export type QuyCon = { quy: Quy; sao: number; soSao?: import("./so-sao").SaoCon; ngoaiLe: { id: string; den: string; muc: string | null; nhom: string }[] };
/** Nhiệm vụ (GET nhiem-vu) + cột 05/11. */
export type NhiemVuMoi = { id: string; ten: string; mo_ta: string; nhom: string; diem: number; bang_chung: string; tu_duyet: boolean; giao_cho: string | null;
  bat: boolean; toi_da_ngay: number | null; hinh?: string | null; lap_lai?: string | null; gio_nhac?: string | null; bo?: string | null };
/** Lượt chờ duyệt (GET cho-duyet › nhiemVu[]) + trường 05/11. */
export type LuotChoMoi = LuotCho & { sao?: number; bang_chung?: string; hinh?: string | null; so_ghi_am?: number };
/** Yêu cầu chờ (GET cho-duyet › yeuCau[]) + phạm vi ngoại lệ. */
export type YeuCauMoi = YeuCau & { pham_vi?: string | null };
/** Quà Con đã đổi, chờ Ba Mẹ trao (GET cho-duyet › phieu[], GET phieu). */
export type PhieuCho = { id: string; child_id: string; ten_con: string; ten: string; loai: string; diem: number; created_at: string; hinh?: string | null };
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
export const CAU_TRONG_GIUP = "Vai «Chỉ trông con» xem, duyệt, khoá máy và cho vay sao được — đổi luật, mua quà, mời người, ghép máy thì nhờ Ba Mẹ.";

// ---------------------------------------------------------------- chữ

/** Tuổi từ năm sinh (null = chưa có). */
export const tuoiCua = (namSinh: number | null | undefined) => {
  if (!namSinh) return null;
  const t = new Date().getFullYear() - namSinh;
  return t >= 1 && t <= 25 ? t : null;
};
/** «Nguyễn Ngọc Bảo Anh» → «Bảo Anh»: tên gọi (2 chữ cuối) — thiết kế 14/11 gọi con bằng tên gọi ở dải avatar, Báo cáo, «bước tiếp». */
export const tenGoi = (ten: string) => ten.trim().split(/\s+/).slice(-2).join(" ");
/** Màu avatar Con ở Hằng ngày: tông đậm (cột [2]) của bảng chung lib/lan-dau › MAU_HO_SO; avatar cũ (không «mau-») ⇒ màu theo thứ tự. */
export const mauCon = (avatar: string | null | undefined, thu = 0) => {
  const k = Number(/^mau-(\d)(?:\||$)/.exec(avatar ?? "")?.[1]);
  return MAU_HO_SO[Number.isInteger(k) && k < MAU_HO_SO.length ? k : thu % MAU_HO_SO.length][2];
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
  // hình chọn ở «Ba Mẹ tự thêm» (thiết kế 6pjz1stu / bwlkjyw5 lưu thẳng tên icon)
  lau: ["lau", "lam"], chay: ["chay", "cam"], tim: ["tim", "do"], camera: ["camera", "lam"],
};
const NHOM_HINH: Record<string, [TenIcon, MauBt]> = { doc_sach: ["sach", "xanh"], viec_nha: ["chen", "lam"], hoc_tap: ["mu", "tim"], van_dong: ["chay", "cam"], ky_nang: ["sao", "vang"] };
export const hinhNv = (x: { hinh?: string | null; nhom?: string; bang_chung?: string }): [TenIcon, MauBt] =>
  (x.bang_chung === "tu_dong" ? ["game", "tim"] : HINH[x.hinh ?? ""] ?? NHOM_HINH[x.nhom ?? ""] ?? ["sao", "vang"]);
/** Biểu tượng loại máy. */
export const IC_MAY: Record<MayCon["nen"], TenIcon> = { windows: "laptop", mac: "laptop", ios: "tablet", android: "dt" };

/** Luật app tối thiểu (GET luat › ds) để đếm «N app được mở». */
export type LuatDem = { child_id: string | null; muc: string; ten?: string | null; loai: string };
/** «Được mở N app» của một Con — MỘT cách đếm cho Trang chủ, Hồ sơ con, «đang xin phép» (review PR #241):
 *  bỏ trang web (lib/ui-bm3 › laWeb), luật riêng Con thắng luật cả nhà cùng mục, chỉ đèn Xanh / Vàng (khác «chan»), gom app nhiều định danh cùng tên. */
export function soAppDuocMo(ds: LuatDem[], con: string) {
  const theoMuc = new Map<string, LuatDem>();
  for (const l of ds) {
    if (l.child_id && l.child_id !== con) continue;
    if (laWeb(l.muc)) continue;
    const cu = theoMuc.get(l.muc);
    if (!cu || (!cu.child_id && l.child_id)) theoMuc.set(l.muc, l);
  }
  return new Set([...theoMuc.values()].filter((l) => l.loai !== "chan").map((l) => khoaTen({ ten: l.ten ?? "", muc: l.muc }))).size;
}

// ---------------------------------------------------------------- thành phần

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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, minHeight: 60, borderTopWidth: dau ? 0 : 1, borderTopColor: M.vien }}>
      {trai ?? (ic ? <BieuTron ic={ic} mau={mau} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15.5}>{tieu}</Chu>
        {phu ? <Chu co={13.5} mau={M.chu3}>{phu}</Chu> : null}
      </View>
      {phai}
      {bam && !phai ? <Icon ten="phai" mau={M.oNhap} co={18} /> : null}
    </View>
  );
  return bam ? <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={nhanDoc} style={({ pressed }) => pressed && { opacity: 0.7 }}>{noi}</Pressable> : noi;
}

/** Tiêu đề mục trong thân màn (thiết kế 14/11 .muc: 15/800 #3a3a3a, lề trái 22 — 66 màn thống nhất) + nút chữ «Tất cả ›» bên phải. */
export function TieuMuc({ chu, so, xam, phai, ic }: { chu: string; so?: number; /** viên số xám (bàn «Để biết 8») thay viên cam */ xam?: boolean; phai?: { chu: string; bam: () => void };
  /** icon 3D 22 trước chữ (.muc .t img) */ ic?: TenIcon }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginHorizontal: 6, minHeight: ic ? 44 : undefined }}>
      <DauSach mau={M.dauSach} />
      {ic ? <IconNet ten={ic} co={21} /> : null}
      <Chu kieu="tieu" co={17} mau={M.chu} style={{ flexShrink: 1 }}>{chu}</Chu>
      {so ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: xam ? M.xamSoft : M.badge, alignItems: "center", justifyContent: "center" }}>{/* huy hiệu số vàng M.badge, chữ navy */}
        <Chu kieu="rat" co={12} mau={xam ? M.chu2 : M.chu} so>{String(so)}</Chu></View> : null}
      <View style={{ flex: 1 }} />
      {phai ? <Pressable onPress={phai.bam} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
        <Chu kieu="rat" co={14} mau={M.lienKet}>{phai.chu}</Chu></Pressable> : null}
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

/** Bảng trượt «Khoá máy <Con>?» (thiết kế chốt 15/11 them-sll7clha, #267): «Khoá theo bé: <Con> không vào được máy nào. Máy chung chỉ khoá phần của <Con>.»
 *  Liệt kê máy của bé (app đang mở / «máy riêng» / «Máy chung · <bé khác> vẫn vào được») có dấu chọn từng máy, «Khoá bao lâu?» 30 phút · 1 giờ · Sáng mai,
 *  nút «Khoá <Con> tới HH:MM». Chọn đủ mọi máy ⇒ POST con/:id/khoa {khoa, den} (khoá THEO BÉ — máy chung chỉ khoá lúc bé này đang dùng, máy chủ #267);
 *  bỏ chọn bớt ⇒ khoá RIÊNG từng máy riêng đã chọn POST may/:id/khoa (lib/noi-1411 › cachKhoa) — máy chung không khoá riêng cho một bé (khoá máy ⇒ mọi bé).
 *  `caNha` (màn «Máy trong nhà» lọc «Tất cả»): khoá theo bé cho MỌI bé ⇒ mọi máy trong nhà khoá. Máy chủ tự hết khoá khi qua hạn; «sang» = 6:30.
 *  `dang`: dòng phụ từng máy (vd «● Roblox · từ 19:02»). `xong(chu, hoan)` ⇒ toast + Hoàn tác (mở lại). */
export function BangKhoaMay({ mo, dong, con, ten, may, dang, xong, caNha }: {
  mo: boolean; dong: () => void; con: string | null; ten: string;
  may: (Pick<MayCon, "id" | "ten" | "nen" | "truc" | "khoaMay" | "dungChung"> & { /** máy chung: tên các bé khác vẫn vào được */ conKhac?: string[] })[];
  dang?: Record<string, { chu: string; mo?: boolean }>;
  xong: (chu: string, hoan: () => Promise<void>) => void;
  /** khoá mọi bé — `khoa`: khoá theo bé đang có (Hoàn tác trả lại đúng khoá cũ) */ caNha?: { id: string; ten: string; khoa?: { khoa: boolean; den: string | null } | null }[];
}) {
  type Han = "30" | "60" | "sang" | "mo" | "tu";
  const [han, setHan] = useState<Han>("30");
  const [tuGio, setTuGio] = useState(() => { const d = new Date(Date.now() + 60 * 60_000); return Math.ceil((d.getHours() * 60 + d.getMinutes()) / 15) * 15 % 1440; });   // «Tự chọn…»: phút trong ngày (bước 15 phút)
  const [hanTruoc, setHanTruoc] = useState<Han>("30");   // lựa chọn trước khi bấm «Khoá tới khi Ba Mẹ mở» — bỏ tick là trả lại
  // máy Ba Mẹ BỎ chọn (mặc định chọn hết — danh sách máy có thể về sau khi bảng đã dựng)
  const [boChon, setBoChon] = useState<ReadonlySet<string>>(new Set());
  // máy chung không khoá riêng cho MỘT Con (khoá máy ⇒ mọi bé trên máy đó) ⇒ bỏ chọn máy chung = không khoá được theo bé; chỉ khoá riêng các máy riêng
  const rieng = may.filter((m) => !m.dungChung).map((m) => m.id);
  const chungBo = may.some((m) => m.dungChung && boChon.has(m.id));
  const cach = caNha ? (caNha.length ? { kieu: "con" as const } : null)
    : chungBo ? (() => { const ids = rieng.filter((id) => !boChon.has(id)); return ids.length ? { kieu: "may" as const, ids } : null; })()
      : cachKhoa(rieng, rieng.filter((id) => !boChon.has(id)));
  const soChon = cach?.kieu === "con" ? may.length : cach ? cach.ids.length : 0;
  const { lam, loi, dangChay } = useLam();
  // giờ hiện trên nút chỉ để xem trước; hạn THẬT tính lúc bấm (bảng có thể mở lâu — review PR #241)
  const denLuc = (h: Han, tu = new Date()) => {
    if (h === "sang" || h === "mo") return null;
    if (h === "tu") { const d = new Date(tu); d.setHours(Math.floor(tuGio / 60), tuGio % 60, 0, 0); if (d.getTime() <= tu.getTime() + 60_000) d.setDate(d.getDate() + 1); return d; }
    return new Date(tu.getTime() + Number(h) * 60_000);
  };
  const cauDen = (h: Han, tu = new Date()) => (h === "mo" ? "tới khi Ba Mẹ mở" : h === "sang" ? "tới 6:30" : `tới ${gioPhut(denLuc(h, tu)!.toISOString())}`);
  const lua: { gia: Han; chu: string }[] = [{ gia: "30", chu: "30 phút" }, { gia: "60", chu: "1 tiếng" }, { gia: "sang", chu: "Đến sáng mai" }, { gia: "tu", chu: "Tự chọn…" }];
  const buoc = (d: number) => setTuGio((v) => (v + d + 1440) % 1440);
  const gH = String(Math.floor(tuGio / 60)).padStart(2, "0"), gM = String(tuGio % 60).padStart(2, "0");
  const khoa = () => lam(async () => {
    if (!cach) return;
    const luc = new Date();
    const den = han === "sang" ? "sang" : han === "mo" ? null : denLuc(han, luc)!;
    if (caNha) {
      const kq = await Promise.allSettled(caNha.map((c) => datKhoa(c.id, true, den)));
      const ok = caNha.filter((_, i) => kq[i].status === "fulfilled");
      const chuaMay = caNha.filter((_, i) => { const r = kq[i]; return r.status === "fulfilled" && r.value?.soMay === 0; });   // #738
      if (!ok.length) throw (kq[0] as PromiseRejectedResult).reason;
      dongBang();
      const hong = caNha.filter((_, i) => kq[i].status === "rejected");
      // Hoàn tác: bé đang khoá từ trước ⇒ khoá lại đúng hạn cũ; bé chưa khoá ⇒ mở
      xong(`Đã khoá mọi máy ${cauDen(han, luc)}${hong.length ? ` · chưa khoá được ${hong.map((c) => tenGoi(c.ten)).join(", ")}, thử lại` : ""}${chuaMay.length ? ` · ${chuaMay.map((c) => tenGoi(c.ten)).join(", ")} chưa ghép máy nào` : ""}`,
        async () => { await Promise.all(ok.map((c) => (c.khoa?.khoa && (!c.khoa.den || Date.parse(c.khoa.den) > Date.now())
          ? datKhoa(c.id, true, c.khoa.den ? new Date(c.khoa.den) : null) : datKhoa(c.id, false, null)))); });
      return;
    }
    if (!con) return;
    if (cach.kieu === "con") {
      const kq = await datKhoa(con, true, den);
      dongBang();
      xong(`Đã khoá ${ten} trên mọi máy ${cauDen(han, luc)}${cauChuaCoMay(kq?.soMay, ten)}`, async () => { await datKhoa(con, false, null); });
      return;
    }
    // khoá riêng từng máy: máy nào lỗi thì báo, máy đã khoá vẫn có Hoàn tác; Hoàn tác trả lại khoá riêng CŨ (nếu có), không mở trắng
    const truocDo = new Map(may.map((m) => [m.id, m.khoaMay]));
    const kq = await Promise.allSettled(cach.ids.map((id) => datKhoaMay(id, true, den)));
    const ok = cach.ids.filter((_, i) => kq[i].status === "fulfilled");
    const hong = cach.ids.filter((_, i) => kq[i].status === "rejected");
    if (!ok.length) throw (kq[0] as PromiseRejectedResult).reason;
    dongBang();
    const tenCua = (ids: string[]) => may.filter((m) => ids.includes(m.id)).map((m) => nganTen(m.ten)).join(", ");
    xong(`Đã khoá ${tenCua(ok)} ${cauDen(han, luc)}${hong.length ? ` · chưa khoá được ${tenCua(hong)}, thử lại` : ""}`, async () => {
      await Promise.all(ok.map((id) => { const cu = truocDo.get(id);
        return mayDangKhoa(cu) ? datKhoaMay(id, true, cu!.den ? new Date(cu!.den) : null) : datKhoaMay(id, false); }));
    });
  });
  // đóng bảng ⇒ lần mở sau chọn lại đủ máy (không giữ máy đã bỏ chọn lần trước)
  const dongBang = () => {
    setBoChon(new Set()); setHan("30");
    const d = new Date(Date.now() + 60 * 60_000); setTuGio(Math.ceil((d.getHours() * 60 + d.getMinutes()) / 15) * 15 % 1440);
    dong();
  };
  const doiChon = (id: string) => setBoChon((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const phuMay = (m: (typeof may)[number]) => {
    const kh = cauKhoaMay(m.khoaMay);
    if (m.dungChung) return caNha ? "Máy chung · khoá mọi bé" : `Máy chung${m.conKhac?.length ? ` · ${m.conKhac.join(", ")} vẫn vào được` : ""}`;
    // bàn them-sll7clha@v7 / them-cjrbm5gj@v1: «● Roblox · … · máy riêng» · «Máy riêng · chưa mở»
    return dang?.[m.id]?.chu ? `${dang[m.id].chu} · máy riêng` : kh ?? (m.truc ? "Máy riêng" : "Máy riêng · chưa mở");
  };
  return (
    <BangTruot mo={mo} dong={dongBang} tieu={caNha ? "Khoá tất cả máy?" : `Khoá máy ${ten}?`} hinh="khoa">
      <Chu kieu="dam" co={13} mau={M.chu3} style={{ textAlign: "center", marginTop: -4, lineHeight: 18 }}>
        {caNha ? "Mọi bé không vào được máy nào tới khi hết hạn khoá." : !may.length ? `${ten} chưa ghép máy nào nên chưa có máy để khoá — khoá có hiệu lực khi máy ghép xong.` : `Khoá theo bé: ${ten} không vào được máy nào. Máy chung chỉ khoá phần của ${ten}.`}
      </Chu>
      {may.length ? (
        // thiết kế .ds: một thẻ, mỗi máy một hàng (ô icon lõm · tên · trạng thái · ô tick ngọc 30)
        <View style={[{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>
          {may.map((m, k) => {
            const x = dang?.[m.id];
            const on = caNha ? true : !boChon.has(m.id);
            return (
              <Pressable key={m.id} onPress={caNha ? undefined : () => doiChon(m.id)} disabled={!!caNha} accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: !!caNha }} accessibilityLabel={`Khoá ${tenGocMay(m.ten)}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, borderTopWidth: k ? 1.5 : 0, borderTopColor: M.vien }}>
                <BieuTron ic={m.dungChung && (m.nen === "windows" || m.nen === "mac") ? "may_tinh" : IC_MAY[m.nen]} mau="xam" />
                <View style={{ flex: 1 }}>
                  <Chu kieu="rat">{nganTen(m.ten)}</Chu>
                  <Chu kieu="dam" co={12.5} mau={x?.mo && !m.dungChung ? M.chinhInk : M.chu3}>{phuMay(m)}</Chu>
                </View>
                {/* ô tick ngọc 30 (thiết kế .chk); bỏ chọn ⇒ ô lõm trống */}
                {on ? <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center" }}><Icon ten="tick" co={16} mau="#FFFBF5" /></View>
                  : <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: M.xamSoft, boxShadow: BONG.lom }} />}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {chungBo && !caNha ? <Chu co={12.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>Bỏ máy chung thì chỉ khoá riêng các máy riêng đã chọn — khoá máy chung là khoá mọi bé (vào máy đó › «Khoá máy này»).</Chu> : null}
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Khoá bao lâu?</Chu>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
        {lua.map((x) => {
          const on = x.gia === han;
          return (
            <Pressable key={x.gia} onPress={() => setHan(x.gia)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={[{ flexBasis: "47%", flexGrow: 1, minHeight: 56, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, gap: 6 },
                on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }]}>
              <Chu kieu="rat" co={15} mau={on ? "#FFFBF5" : M.chu} dong={1}>{x.chu}</Chu>
              {x.gia === "tu" ? <Icon ten="dongho" co={16} mau={on ? "#FFFBF5" : M.chu3} /> : <Chu kieu="dam7" co={12.5} mau={on ? M.chinhSoft : M.chu3}>{cauDen(x.gia).replace("tới ", "")}</Chu>}
            </Pressable>
          );
        })}
      </View>
      {han === "tu" ? (
        <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 24, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: M.the }, KHOI.the]}>
          <Chu kieu="rat" co={15}>Khoá đến</Chu>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Pressable onPress={() => buoc(-15)} accessibilityRole="button" accessibilityLabel="Lùi 15 phút" hitSlop={6}
              style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center" }}><Chu kieu="rat" co={20}>−</Chu></Pressable>
            <Chu kieu="rat" co={26} style={{ minWidth: 86, textAlign: "center" }}>{gH} : {gM}</Chu>
            <Pressable onPress={() => buoc(15)} accessibilityRole="button" accessibilityLabel="Tới 15 phút" hitSlop={6}
              style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center" }}><Chu kieu="rat" co={20}>+</Chu></Pressable>
          </View>
        </View>
      ) : null}
      {/* thiết kế 05 chỉ vẽ 3 lựa chọn; giữ «Tới khi Ba Mẹ mở» (khoá không hạn — có từ trước, Trang chủ hiện «Khoá tới khi Ba Mẹ mở») dạng dòng nhỏ */}
      <Pressable onPress={() => { if (han === "mo") setHan(hanTruoc); else { setHanTruoc(han); setHan("mo"); } }} accessibilityRole="radio" accessibilityState={{ checked: han === "mo" }} hitSlop={4}
        style={{ minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {han === "mo" ? <Icon ten="tick" co={14} mau={M.chinhInk} /> : null}
        <Chu kieu="rat" co={13.5} mau={M.chinhInk}>Khoá tới khi Ba Mẹ mở</Chu>
      </Pressable>
      <BaoLoi loi={loi} />
      <Nut chu={caNha ? `Khoá mọi máy ${cauDen(han)}` : cach?.kieu === "con" ? `Khoá ${ten} ${cauDen(han)}` : `Khoá ${soChon > 1 ? `${soChon} máy` : "máy"} ${cauDen(han)}`}
        ic="khoa" ic3d rong dangChay={dangChay} tat={!cach} bam={khoa} />
      <Nut chu="Thôi, để con chơi tiếp" loai="vien" rong bam={dongBang} />
    </BangTruot>
  );
}

/** Hoàn tác cho vay sao (60 giây, đúng người cho — 15/11 «Cho thêm giờ» đã thành «Cho vay sao», lib/so-sao › BangChoVay). Lỗi (quá hạn / đã tiêu) ⇒ báo lại. */
export const hoanTacThemGio = (grantId: string) => bm.goi(`vay/${grantId}/hoan-tac`, {});
