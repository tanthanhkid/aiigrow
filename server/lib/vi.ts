// Ví điểm của Con (FR-03.05): sổ cái `points` (mỗi dòng một lần cộng/trừ, có lý do + người), số dư = tổng. Điểm KHÔNG âm — mọi lần trừ
// chạy trong giao dịch có khoá dòng Con (`select … for update`), nên hai lần trừ song song không cùng thấy số dư cũ.
// Cấp độ tính theo điểm KIẾM ĐƯỢC trọn đời (FR-03.06), không theo số dư.
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

export type LoaiDiem = "nhiem_vu" | "phien" | "doi_qua" | "hoan" | "tay" | "chao_mung" | "voucher" | "ngoai_le";

export const soDu = async (con: string, t: Q = q) =>
  ((await t<{ d: number }>(`select coalesce(sum(delta), 0)::int as d from points where child_id = $1`, [con]))[0].d);

/** Khoá dòng Con trong giao dịch `t` — mọi thay đổi ví của Con này nối đuôi nhau. */
export const khoaCon = async (t: Q, con: string) => {
  const r = await t<{ family_id: string }>(`select family_id from children where id = $1 for update`, [con]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return r[0].family_id;
};

/** Cộng (delta > 0) hoặc trừ (delta < 0) trong giao dịch `t` đã khoá Con. Trừ quá số dư ⇒ lỗi `khong_du_diem`. → số dư mới. */
export async function ghiDiem(t: Q, con: string, delta: number, loai: LoaiDiem, lyDo: string, o: { ref?: string; nguoi?: string | null } = {}) {
  const d = Math.trunc(delta);
  if (!d) return soDu(con, t);
  const du = await soDu(con, t);
  if (du + d < 0) throw new LoiNghiepVu("khong_du_diem", `Con còn ${du} điểm, cần ${-d} điểm`, 409);
  await t(`insert into points(id, child_id, delta, loai, ly_do, ref, nguoi) values ($1,$2,$3,$4,$5,$6,$7)`,
    [newId(), con, d, loai, lyDo.slice(0, 120), o.ref ?? null, o.nguoi ?? null]);
  return du + d;
}

/** Ba Mẹ cộng/trừ tay kèm lý do (thưởng sinh nhật, phạt nói dối…) — ghi nhật ký và tính là ngoại lệ ở báo cáo (FR-03.05, FR-07.01). */
export async function dieuChinhTay(fam: string, con: string, delta: number, lyDo: string, nguoi: string) {
  const d = Math.trunc(Number(delta));
  if (!d || Math.abs(d) > 10_000) throw new LoiNghiepVu("diem_sai", "Số điểm cộng/trừ chưa hợp lệ");
  const ly = String(lyDo ?? "").trim();
  if (!ly) throw new LoiNghiepVu("thieu_ly_do", "Ghi lý do để Con hiểu vì sao điểm thay đổi");
  return tx(async (t) => {
    if ((await khoaCon(t, con)) !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    const du = await ghiDiem(t, con, d, "tay", ly, { nguoi });
    await t(`insert into exceptions(id, family_id, child_id, parent_id, loai) values ($1,$2,$3,$4,'dieu_chinh_tay')`, [newId(), fam, con, nguoi]);
    await t(`insert into events(id, family_id, child_id, loai, chi_tiet, nguoi) values ($1,$2,$3,'dieu_chinh_diem',$4::text::jsonb,$5)`,
      [newId(), fam, con, JSON.stringify({ delta: d, ly_do: ly }), nguoi]);
    return du;
  });
}

export async function tomTatVi(con: string) {
  const r = (await one<{ du: number; kiem: number; cho: number }>(
    `select coalesce((select sum(delta) from points where child_id = $1), 0)::int as du,
            coalesce((select sum(delta) from points where child_id = $1 and delta > 0 and loai not in ('hoan')), 0)::int as kiem,
            coalesce((select sum(t.diem) from submissions s join tasks t on t.id = s.task_id
                      where s.child_id = $1 and s.trang_thai = 'cho_duyet'), 0)::int as cho`, [con]))!;
  return { soDu: r.du, diemChoDuyet: r.cho, tongKiem: r.kiem, capDo: capDo(r.kiem) };
}

/** Cấp độ theo tổng điểm kiếm được trọn đời: cấp n cần 100·n·(n+1)/2 điểm (100, 300, 600, 1000…). */
export function capDo(tongKiem: number) {
  let n = 0;
  while (100 * ((n + 1) * (n + 2)) / 2 <= tongKiem) n++;
  const can = (100 * ((n + 1) * (n + 2))) / 2;
  return { cap: n + 1, diemCapSau: can, conThieu: can - tongKiem };
}

export const lichSu = (con: string, gioiHan = 100) =>
  q<{ delta: number; loai: LoaiDiem; ly_do: string; nguoi: string | null; created_at: Date }>(
    `select delta, loai, ly_do, nguoi, created_at from points where child_id = $1 order by created_at desc, seq desc limit $2`, [con, gioiHan]);
