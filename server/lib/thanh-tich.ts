// Huy hiệu, chuỗi ngày, cấp độ, điểm chào mừng (FR-03.06, BRD 6.1 bước 7). Huy hiệu/cấp độ KHÔNG quy ra điểm (không phá cân bằng).
// Chuỗi ngày = số ngày liên tiếp (theo giờ gia đình, tính tới hôm nay hoặc hôm qua) có ≥ 1 nhiệm vụ được duyệt.
import { one, q, tx } from "./db.ts";
import { congNgay, gioDiaPhuong } from "./gio.ts";
import { thamSo } from "./cau-hinh.ts";
import { ghiDiem, khoaCon, tomTatVi } from "./vi.ts";
import { ghiSuKien } from "./nhat-ky.ts";

export const HUY_HIEU: Record<string, { ten: string; mo_ta: string }> = {
  khoi_dau: { ten: "Khởi đầu", mo_ta: "Nhiệm vụ đầu tiên được Ba Mẹ duyệt" },
  mot_sach: { ten: "Mọt sách", mo_ta: "5 lần đọc sách được duyệt" },
  tay_dam_dang: { ten: "Đôi tay đảm đang", mo_ta: "10 việc nhà được duyệt" },
  khoe_manh: { ten: "Khoẻ mạnh", mo_ta: "5 lần vận động được duyệt" },
  ham_hoc: { ten: "Ham học", mo_ta: "5 bài học được duyệt" },
  chuoi_7: { ten: "Bền bỉ 7 ngày", mo_ta: "7 ngày liền có nhiệm vụ được duyệt" },
  chuoi_30: { ten: "Bền bỉ 30 ngày", mo_ta: "30 ngày liền có nhiệm vụ được duyệt" },
  cap_5: { ten: "Cấp 5", mo_ta: "Đạt cấp độ 5" },
};

async function tzCon(con: string) {
  return (await one<{ tz: string }>(`select f.tz from children c join families f on f.id = c.family_id where c.id = $1`, [con]))?.tz ?? "Asia/Ho_Chi_Minh";
}

export async function chuoiNgay(con: string, now = new Date()) {
  const tz = await tzCon(con);
  const ngay = new Set((await q<{ duyet_luc: Date }>(
    `select duyet_luc from submissions where child_id = $1 and trang_thai = 'duoc_duyet' and duyet_luc > now() - interval '400 days'`, [con]))
    .map((r) => gioDiaPhuong(new Date(r.duyet_luc), tz).ngay));
  let d = gioDiaPhuong(now, tz).ngay;
  if (!ngay.has(d)) d = congNgay(d, -1);                    // hôm nay chưa làm thì chuỗi vẫn tính tới hôm qua
  let n = 0;
  while (ngay.has(d)) { n++; d = congNgay(d, -1); }
  return n;
}

/** Sau mỗi lần duyệt: trao huy hiệu mới đạt. → mã huy hiệu mới. */
export async function sauKhiDuyet(fam: string, con: string) {
  const dem = Object.fromEntries((await q<{ nhom: string; n: number }>(
    `select t.nhom, count(*)::int as n from submissions s join tasks t on t.id = s.task_id where s.child_id = $1 and s.trang_thai = 'duoc_duyet' group by t.nhom`,
    [con])).map((r) => [r.nhom, r.n]));
  const tong = Object.values(dem).reduce((a, b) => a + b, 0);
  const chuoi = await chuoiNgay(con);
  const { capDo } = await tomTatVi(con);
  const dat = Object.entries({
    khoi_dau: tong >= 1, mot_sach: (dem.doc_sach ?? 0) >= 5, tay_dam_dang: (dem.viec_nha ?? 0) >= 10, khoe_manh: (dem.van_dong ?? 0) >= 5,
    ham_hoc: (dem.hoc_tap ?? 0) >= 5, chuoi_7: chuoi >= 7, chuoi_30: chuoi >= 30, cap_5: capDo.cap >= 5,
  }).filter(([, v]) => v).map(([k]) => k);
  const moi: string[] = [];
  for (const ma of dat) {
    if ((await q(`insert into badges(child_id, ma) values ($1, $2) on conflict do nothing returning ma`, [con, ma])).length) {
      moi.push(ma);
      await ghiSuKien(fam, "huy_hieu", { ma, ten: HUY_HIEU[ma].ten }, { con });
    }
  }
  return moi;
}

export async function thanhTich(con: string) {
  const co = new Map((await q<{ ma: string; dat_luc: Date }>(`select ma, dat_luc from badges where child_id = $1`, [con])).map((b) => [b.ma, b.dat_luc]));
  return {
    chuoiNgay: await chuoiNgay(con),
    ...(await tomTatVi(con)),
    huyHieu: Object.entries(HUY_HIEU).map(([ma, h]) => ({ ma, ...h, dat: co.has(ma), datLuc: co.get(ma) ?? null })),
  };
}

/** Lần đầu Con mở app (Rob chào): tặng điểm chào mừng MỘT lần (mục 10, mặc định 10). → số điểm đã tặng (0 nếu đã nhận). */
export async function chaoMung(con: string) {
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const c = (await t<{ chao_luc: Date | null; cau_hinh: Record<string, unknown> }>(`select chao_luc, cau_hinh from children where id = $1`, [con]))[0];
    if (c.chao_luc) return 0;
    const f = (await t<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [fam]))[0];
    const diem = thamSo(f.cau_hinh, c.cau_hinh).diem_chao_mung;
    await t(`update children set chao_luc = now() where id = $1`, [con]);
    if (diem > 0) await ghiDiem(t, con, diem, "chao_mung", "Quà chào mừng của Rob");
    return diem;
  });
}
