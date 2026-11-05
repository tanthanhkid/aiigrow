// Bộ nhiệm vụ (thiết kế chốt 05/11, L9 — bm-lan-dau «Giao việc cho Bảo Anh», bm-hang-ngay «Chọn bộ nhiệm vụ»): Rob chọn sẵn việc hợp tuổi theo
// bộ; Ba Mẹ bỏ tick việc không muốn giao rồi «Giao N việc». Mỗi việc tạo thành một nhiệm vụ (tasks.bo = mã bộ) giao riêng cho Con đã chọn.
// «Học 1 bài với AiiRob» là việc tự chấm (bang_chung tu_dong) — gia đình đã có thì không tạo thêm (webhook AiiRob dùng việc tự chấm đầu tiên).
import { q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { taoNv } from "./nhiem-vu.ts";

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
  const chon = Array.isArray(b.chon) && b.chon.length ? new Set(b.chon.map(String)) : null;
  const co = await q<{ ten: string; giao_cho: string | null; bang_chung: string }>(`select ten, giao_cho, bang_chung from tasks where family_id = $1 and bat`, [fam]);
  const coAiiRob = co.some((x) => x.bang_chung === "tu_dong");
  const ids: string[] = [];
  for (const v of bo.viec) {
    if (chon && !chon.has(v.ten)) continue;
    if (v.bang_chung === "tu_dong" && coAiiRob) continue;
    if (co.some((x) => x.ten === v.ten && (x.giao_cho === con || x.giao_cho === null))) continue;
    ids.push(await taoNv(fam, { ...v, giao_cho: v.bang_chung === "tu_dong" ? null : con, bo: bo.ma }, nguoi, q, true));
  }
  return { taoMoi: ids.length, ids };
}
