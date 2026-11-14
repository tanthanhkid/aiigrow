// Bộ nhiệm vụ (thiết kế chốt 05/11, L9 — bm-lan-dau «Giao việc cho Bảo Anh», bm-hang-ngay «Chọn bộ nhiệm vụ»): Grow chọn sẵn việc hợp tuổi theo
// bộ; Ba Mẹ bỏ tick việc không muốn giao rồi «Giao N việc». Mỗi việc tạo thành một nhiệm vụ (tasks.bo = mã bộ) giao riêng cho Con đã chọn.
// «Học 1 bài với AiiRob» là việc tự chấm (bang_chung tu_dong) — gia đình đã có thì không tạo thêm (webhook AiiRob dùng việc tự chấm đầu tiên).
import { q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { taoNv } from "./nhiem-vu.ts";
import { CHU_DE_GIUP, KHO_VIEC, type ViecKho } from "./kho-viec.ts";

type Viec = { ten: string; mo_ta?: string; nhom: string; diem: number; bang_chung: string; lap_lai: string; hinh: string; toi_da_ngay?: number;
  phut_toi_thieu?: number; tu_duyet?: boolean; nhan?: string };
export type Bo = { ma: string; ten: string; tuoi: string; viec: Viec[] };

const AIIROB: Viec = { ten: "Học 1 bài với AiiRob", mo_ta: "Học xong một bài với AiiRob — đạt là tự cộng sao.", nhom: "hoc_tap", diem: 20,
  bang_chung: "tu_dong", lap_lai: "hang_ngay", hinh: "rob", tu_duyet: true, nhan: "Tự chấm" };
const DOC_SACH: Viec = { ten: "Đọc sách 20 phút", mo_ta: "Đọc to 20 phút rồi ghi âm một đoạn con đọc.", nhom: "doc_sach", diem: 10, bang_chung: "ghi_am",
  lap_lai: "hang_ngay", hinh: "sach", toi_da_ngay: 1, nhan: "Mỗi ngày · nộp ghi âm" };

export const BO_NHIEM_VU: Bo[] = [
  { ma: "tu_lap", ten: "Tự lập", tuoi: "9–10 tuổi", viec: [
    { ten: "Dọn phòng", mo_ta: "Cất đồ về đúng chỗ, chụp ảnh phòng gọn.", nhom: "viec_nha", diem: 10, bang_chung: "anh", lap_lai: "hang_ngay", hinh: "choi", toi_da_ngay: 1, nhan: "Mỗi ngày · nộp ảnh" },
    { ten: "Tự đánh răng", mo_ta: "Đánh răng buổi sáng và buổi tối.", nhom: "ky_nang", diem: 10, bang_chung: "xong", lap_lai: "hang_ngay", hinh: "ban_chai", toi_da_ngay: 2, nhan: "Sáng và tối" },
    DOC_SACH,
    { ten: "Tự xếp cặp", mo_ta: "Soạn sách vở cho ngày mai.", nhom: "ky_nang", diem: 10, bang_chung: "anh", lap_lai: "ngay_thuong", hinh: "cap", toi_da_ngay: 1, nhan: "Thứ 2 – Thứ 6" },
    AIIROB,
  ] },
  { ma: "viec_nha", ten: "Phụ việc nhà", tuoi: "8–12 tuổi", viec: [
    { ten: "Tưới cây", nhom: "viec_nha", diem: 5, bang_chung: "anh", lap_lai: "hang_ngay", hinh: "cay", toi_da_ngay: 1 },
    { ten: "Rửa bát", mo_ta: "Rửa sạch bát sau bữa ăn.", nhom: "viec_nha", diem: 10, bang_chung: "anh", lap_lai: "hang_ngay", hinh: "bat", toi_da_ngay: 2 },
    { ten: "Gấp quần áo", nhom: "viec_nha", diem: 5, bang_chung: "anh", lap_lai: "hang_ngay", hinh: "ao", toi_da_ngay: 1 },
    { ten: "Đổ rác", nhom: "viec_nha", diem: 5, bang_chung: "xong", lap_lai: "hang_ngay", hinh: "rac", toi_da_ngay: 1 },
    { ten: "Dọn bàn ăn", nhom: "viec_nha", diem: 5, bang_chung: "xong", lap_lai: "hang_ngay", hinh: "ban_an", toi_da_ngay: 2 },
    { ten: "Lau bàn học", nhom: "viec_nha", diem: 5, bang_chung: "anh", lap_lai: "cuoi_tuan", hinh: "ban_hoc", toi_da_ngay: 1 },
  ] },
  { ma: "hoc_tap", ten: "Học tập", tuoi: "6–12 tuổi", viec: [
    { ten: "Làm xong bài tập về nhà", mo_ta: "Chụp vở bài tập đã làm.", nhom: "hoc_tap", diem: 10, bang_chung: "anh", lap_lai: "ngay_thuong", hinh: "vo", toi_da_ngay: 1 },
    DOC_SACH,
    AIIROB,
    { ten: "Viết nhật ký", mo_ta: "Viết 3–5 câu kể lại hôm nay.", nhom: "hoc_tap", diem: 10, bang_chung: "van_ban", lap_lai: "hang_ngay", hinh: "but", toi_da_ngay: 1 },
    { ten: "Ôn từ vựng 15 phút", nhom: "hoc_tap", diem: 5, bang_chung: "xong", lap_lai: "hang_ngay", hinh: "the_tu", toi_da_ngay: 1, phut_toi_thieu: 15 },
  ] },
  { ma: "khoe_manh", ten: "Khoẻ mạnh", tuoi: "6–12 tuổi", viec: [
    { ten: "Nhảy dây 10 phút", nhom: "van_dong", diem: 5, bang_chung: "anh", lap_lai: "hang_ngay", hinh: "day", toi_da_ngay: 1, phut_toi_thieu: 10 },
    { ten: "Tập thể dục buổi sáng", nhom: "van_dong", diem: 5, bang_chung: "xong", lap_lai: "hang_ngay", hinh: "the_duc", toi_da_ngay: 1 },
    { ten: "Ăn hết rau", nhom: "ky_nang", diem: 5, bang_chung: "anh", lap_lai: "hang_ngay", hinh: "rau", toi_da_ngay: 1 },
    { ten: "Đi ngủ đúng giờ", nhom: "ky_nang", diem: 10, bang_chung: "xong", lap_lai: "hang_ngay", hinh: "ngu", toi_da_ngay: 1 },
  ] },
];

/** Danh sách bộ cho màn chọn: mỗi bộ + tổng sao tối đa/ngày (theo số lượt/ngày) — «Đủ 5 việc · 60 sao → đổi 60 phút chơi». */
export function dsBo() {
  return BO_NHIEM_VU.map((b) => ({ ma: b.ma, ten: b.ten, tuoi: b.tuoi, soViec: b.viec.length,
    saoToiDaNgay: b.viec.reduce((n, v) => n + v.diem, 0),
    viec: b.viec.map((v) => ({ ten: v.ten, moTa: v.mo_ta ?? "", sao: v.diem, bangChung: v.bang_chung, tuCham: v.bang_chung === "tu_dong",
      lapLai: v.lap_lai, hinh: v.hinh, nhan: v.nhan ?? null, toiDaNgay: v.toi_da_ngay ?? null })) }));
}

/** Giao một bộ cho Con (`con`, hoặc cả nhà khi trống). `chon` = tên các việc giữ tick (trống = cả bộ). Việc Con đã có cùng tên thì bỏ qua. */
export async function giaoBo(fam: string, b: { bo?: unknown; con?: unknown; chon?: unknown }, nguoi?: string) {
  const bo = BO_NHIEM_VU.find((x) => x.ma === b.bo);
  if (!bo) throw new LoiNghiepVu("bo_sai", "Chọn một bộ nhiệm vụ");
  const con = b.con ? String(b.con) : null;
  const chon = Array.isArray(b.chon) ? new Set(b.chon.map(String)) : null;      // [] = bỏ tick hết ⇒ không giao gì
  const co = await q<{ ten: string; giao_cho: string | null; bang_chung: string }>(`select ten, giao_cho, bang_chung from tasks where family_id = $1 and bat`, [fam]);
  const coAiiRob = co.some((x) => x.bang_chung === "tu_dong");
  const ids: string[] = [];
  for (const v of bo.viec) {
    if (chon && !chon.has(v.ten)) continue;
    if (v.bang_chung === "tu_dong" && coAiiRob) continue;
    if (co.some((x) => x.ten === v.ten && (con === null || x.giao_cho === con || x.giao_cho === null))) continue;
    ids.push(await taoNv(fam, { ...v, giao_cho: v.bang_chung === "tu_dong" ? null : con, bo: bo.ma }, nguoi, q, true));
  }
  return { taoMoi: ids.length, ids };
}

// ---------------------------------------------------------------- kho việc «Một ngày của <Con>» (thiết kế chốt 14/11)

/** Tên việc trong kho dài quá 60 ký tự (giới hạn tên nhiệm vụ) ⇒ bỏ phần ví dụ trong ngoặc, còn dài thì cắt ở khoảng trắng; tên đủ ghi ở mô tả. */
export const tenNgan = (t: string) => {
  if ([...t].length <= 60) return t;
  const bo = t.replace(/\s*\(.*$/, "").trim();
  if (bo.length >= 3 && [...bo].length <= 60) return bo;
  return t.slice(0, 60).replace(/\s+\S*$/, "");
};
const NHOM_KHO: Record<ViecKho["muc"], string> = { hoc: "hoc_tap", van_dong: "van_dong", giup: "viec_nha" };
const HINH_KHO: Record<ViecKho["muc"], string> = { hoc: "sach", van_dong: "the_duc", giup: "ban_an" };

/** Một việc trong kho ⇒ thân taoNv: đọc sách nộp ghi âm, AiiRob tự chấm, vận động bấm «Xong», việc nhà / học nộp ảnh; hằng ngày, 1 lượt/ngày. */
export function viecTuKho(v: ViecKho) {
  const aiirob = /AiiRob/.test(v.ten), doc = /^Đọc sách/.test(v.ten);
  return {
    ten: tenNgan(v.ten), mo_ta: tenNgan(v.ten) !== v.ten ? v.ten : "", nhom: doc ? "doc_sach" : NHOM_KHO[v.muc], diem: v.sao,
    bang_chung: aiirob ? "tu_dong" : doc ? "ghi_am" : v.muc === "van_dong" ? "xong" : "anh", tu_duyet: aiirob,
    lap_lai: "hang_ngay", toi_da_ngay: 1, hinh: aiirob ? "rob" : HINH_KHO[v.muc], bo: `kho_${v.muc}`,
  };
}

/** GET nhiem-vu/kho — 117 việc + 10 chủ đề Giúp Ba Mẹ. */
export const dsKho = () => ({ chuDe: CHU_DE_GIUP, ds: KHO_VIEC.map((v) => ({ ...v, lon: !!v.lon })) });

/** POST nhiem-vu/kho {con, chon: [ma]} — giao các việc Ba Mẹ chạm ＋ cho Con (trống ⇒ cả nhà). Việc Con đã có cùng tên bỏ qua. */
export async function giaoKho(fam: string, b: { con?: unknown; chon?: unknown }, nguoi?: string) {
  if (!Array.isArray(b.chon)) throw new LoiNghiepVu("thieu_viec", "Chọn ít nhất một việc");
  const chon = new Set(b.chon.map(String));
  const ds = KHO_VIEC.filter((v) => chon.has(v.ma));
  if (ds.length !== chon.size) throw new LoiNghiepVu("viec_sai", "Có việc không còn trong danh sách — tải lại màn");
  const con = b.con ? String(b.con) : null;
  const co = await q<{ ten: string; giao_cho: string | null; bang_chung: string }>(`select ten, giao_cho, bang_chung from tasks where family_id = $1 and bat`, [fam]);
  const coAiiRob = co.some((x) => x.bang_chung === "tu_dong");
  const ids: string[] = [];
  for (const v of ds) {
    const x = viecTuKho(v);
    if (x.bang_chung === "tu_dong" && coAiiRob) continue;
    if (co.some((c) => c.ten === x.ten && (con === null || c.giao_cho === con || c.giao_cho === null))) continue;
    ids.push(await taoNv(fam, { ...x, giao_cho: x.bang_chung === "tu_dong" ? null : con }, nguoi, q, true));
  }
  return { taoMoi: ids.length, ids };
}
