// Giờ theo múi giờ gia đình (BRD mục 9: «đơn vị giờ/ngày theo múi giờ gia đình»). Chép từ AiiControl lib/policy.ts (gioDiaPhuong,
// phutCua, trongKhung) + đầu tuần (thứ Hai) cho trần tuần / báo cáo tuần / ngưỡng ngoại lệ.
export type Khung = { tu: string; den: string };

export function gioDiaPhuong(now: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
    }).formatToParts(now).map((x) => [x.type, x.value]),
  );
  const thu = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { ngay: `${p.year}-${p.month}-${p.day}`, thu, phut: Number(p.hour) * 60 + Number(p.minute) };
}

export const phutCua = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Phút trong ngày `phut` có nằm trong khung [tu, den) không — khung qua nửa đêm (21:00–06:30) cũng đúng. */
export function trongKhung(phut: number, k: Khung) {
  const a = phutCua(k.tu), b = phutCua(k.den);
  return a <= b ? phut >= a && phut < b : phut >= a || phut < b;
}

export const laCuoiTuan = (thu: number) => thu === 0 || thu === 6;

const soNgay = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;
const raNgay = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

/** Ngày thứ Hai của tuần chứa `ngay` (YYYY-MM-DD). */
export function dauTuan(ngay: string) {
  const n = soNgay(ngay);
  const thu = new Date(n * 86_400_000).getUTCDay();          // 0 = CN
  return raNgay(n - ((thu + 6) % 7));
}

export const congNgay = (ngay: string, k: number) => raNgay(soNgay(ngay) + k);

/** Thời điểm UTC của 00:00 ngày `ngay` theo múi giờ `tz` (chỉ múi giờ không đổi giờ mùa hè — đủ cho VN; sai số ≤ 1 giờ ở múi khác). */
export function dauNgayUtc(ngay: string, tz: string) {
  const goc = new Date(`${ngay}T00:00:00Z`);
  const g = gioDiaPhuong(goc, tz);
  const lech = (soNgay(g.ngay) - soNgay(ngay)) * 1440 + g.phut;     // phút lệch giữa giờ địa phương và UTC
  return new Date(goc.getTime() - lech * 60_000);
}
