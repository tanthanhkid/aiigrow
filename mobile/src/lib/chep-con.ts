// #420 «Giống <con trước>» (bàn bm-thiet-lap-con: them-s84hkh82 Con thứ 2 · them-5t1kazz5 nhà ≥3 con) — kiểu dữ liệu GET con/:id/chep-tu + chữ các dòng
// «Sẽ chép từ <tên>» (hàm thuần, test ở chep-con.test.ts). Máy chủ: server/lib/chep-thiet-lap.ts.

/** Một Con làm nguồn chép (GET con/:id/chep-tu › ds[]). */
export type NguonChep = { id: string; ten: string; avatar: string; cheDo: "mo_het" | "theo_danh_sach"; soApp: number; soWeb: number;
  /** vài app / trang «Tính phút» (giai_tri) */ tinhPhut: string[]; soViec: number; /** nhóm việc (hoc_tap, van_dong, viec_nha, …) theo thứ tự tạo */ nhomViec: string[];
  saoKhoiDau: number };
export type DsNguon = { thu: number; ds: NguonChep[] };

const TEN_NHOM: Record<string, string> = { hoc_tap: "Học", van_dong: "Vận động", viec_nha: "Giúp Ba Mẹ" };

/** Bốn dòng thẻ «Sẽ chép từ <tên>» — [tiêu đề, dòng phụ] theo thứ tự: App & web · Tính phút · Việc mỗi ngày · Chơi bằng sao. */
export function dongChep(x: NguonChep): [string, string][] {
  const moHet = x.cheDo === "mo_het";
  const appWeb: [string, string] = moHet ? ["App & web · Mở hết", "Mở mọi app, mọi web"] : ["App & web · Theo danh sách", `${x.soApp} app · ${x.soWeb} trang web`];
  const tinh: [string, string] = moHet ? ["Không tính phút", "Mở hết: chơi không trừ sao"]
    : x.tinhPhut.length ? ["Tính phút", `${x.tinhPhut.join(", ")} tính · app học không tính`] : ["Không tính phút", "Chưa có app, web nào tính phút"];
  const nhom = [...new Set(x.nhomViec.map((n) => TEN_NHOM[n] ?? "Việc khác"))];
  const viec: [string, string] = ["Việc mỗi ngày", x.soViec ? [`${x.soViec} việc`, ...nhom].join(" · ") : "Chưa có việc nào"];
  return [appWeb, tinh, viec, ["Chơi bằng sao", "1 sao = 1 phút chơi"]];
}

/** Dòng phụ ở ô chọn bé (them-5t1kazz5): «Theo danh sách · 6 app · 5 việc» / «Mở hết · 4 việc». */
export const tomTatNguon = (x: NguonChep) => `${x.cheDo === "mo_het" ? "Mở hết" : `Theo danh sách · ${x.soApp} app`} · ${x.soViec} việc`;

/** Nguồn chép được hiện: bỏ các Con còn chờ thiết lập trong lượt Lần đầu (`boQua`) — trừ khi bỏ hết thì giữ cả. Bé ưu tiên (`truoc`) lên đầu. */
export function locNguon(ds: NguonChep[], boQua: string[] = [], truoc?: string): NguonChep[] {
  const loc = ds.filter((x) => !boQua.includes(x.id));
  const r = loc.length ? loc : ds;
  const k = truoc ? r.findIndex((x) => x.id === truoc) : -1;
  return k > 0 ? [r[k], ...r.slice(0, k), ...r.slice(k + 1)] : r;
}
