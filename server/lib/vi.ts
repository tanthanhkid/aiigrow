// Ví sao của Con (FR-03.05; sổ sao #263–#266 15/11/2026): sổ cái `points` (mỗi dòng một lần cộng/trừ, có lý do + người).
//   • Tổng delta = SAO TIÊU ĐƯỢC (≥ 0, = số phút «Tính phút» còn chơi được) — mọi lần trừ chạy trong giao dịch có khoá dòng Con
//     (`select … for update`), nên hai lần trừ song song không cùng thấy số dư cũ; trừ quá ⇒ `khong_du_diem`.
//   • NỢ Ba Mẹ = tổng delta loại vay + tra_no (Ba Mẹ cho vay +N; sao kiếm được trả nợ trước −N). Không trần nợ.
//   • Số dư Con thấy (`sao`) = sao tiêu được − nợ — ÂM khi đang nợ (Con 0 sao vay 30, tiêu hết ⇒ −30; nhiệm vụ +10 ⇒ −20).
// Cấp độ tính theo điểm KIẾM ĐƯỢC trọn đời (FR-03.06), không theo số dư.
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

export type LoaiDiem = "nhiem_vu" | "phien" | "doi_qua" | "hoan" | "tay" | "chao_mung" | "voucher" | "ngoai_le" | "doi_gio"
  | "vay" | "tra_no" | "choi" | "khoi_dau" | "qua_phut";

/** Khoản cộng KHÔNG dùng để trả nợ: tiền vay, hoàn lại (huỷ quà / hoàn tác), quà phút Ba Mẹ trao, sao khởi đầu. */
const KHONG_TRA_NO = new Set<string>(["vay", "tra_no", "hoan", "qua_phut", "khoi_dau"]);

/** Điều kiện dòng sổ cái tính vào SAO KIẾM ĐƯỢC (cấp độ, «sao kiếm 7 ngày», báo cáo): khoản kiếm dương, TRỪ dòng `hoan` âm của «Hoàn tác duyệt»
 *  (ref = lượt làm) — #433 B1: trước đây chỉ cộng dòng dương nên sao đã hoàn tác vẫn đẩy cấp độ / huy hiệu cap_5. Dùng trong `sum(delta) … where`. */
export const KIEM_SQL = `((delta > 0 and loai not in ('hoan', 'vay', 'tra_no', 'khoi_dau', 'qua_phut'))
  or (loai = 'hoan' and delta < 0 and ref in (select id from submissions where child_id = points.child_id)))`;

/** Sao tiêu được (tổng sổ cái, ≥ 0). Tên cũ giữ cho mọi chỗ gọi. */
export const soDu = async (con: string, t: Q = q) =>
  ((await t<{ d: number }>(`select coalesce(sum(delta), 0)::int as d from points where child_id = $1`, [con]))[0].d);

/** Nợ Ba Mẹ còn lại (≥ 0). */
export const noCua = async (con: string, t: Q = q) =>
  Math.max(0, (await t<{ d: number }>(`select coalesce(sum(delta), 0)::int as d from points where child_id = $1 and loai in ('vay', 'tra_no')`, [con]))[0].d);

/** Khoá dòng Con trong giao dịch `t` — mọi thay đổi ví của Con này nối đuôi nhau. */
export const khoaCon = async (t: Q, con: string) => {
  const r = await t<{ family_id: string }>(`select family_id from children where id = $1 for update`, [con]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return r[0].family_id;
};

/** Cộng (delta > 0) hoặc trừ (delta < 0) trong giao dịch `t` đã khoá Con. Trừ quá sao tiêu được ⇒ lỗi `khong_du_diem`. → sao tiêu được mới.
 *  #263: khoản KIẾM được (nhiệm vụ, Ba Mẹ cộng tay, chào mừng…) khi đang nợ ⇒ TRẢ NỢ TRƯỚC: ghi thêm dòng `tra_no` −min(delta, nợ) cùng ref.
 *  Hoàn tác một khoản kiếm (`hoan` âm có ref) ⇒ hoàn tác luôn phần nó đã trả nợ (dòng `tra_no` dương) rồi mới trừ — nợ về như cũ. */
export async function ghiDiem(t: Q, con: string, delta: number, loai: LoaiDiem, lyDo: string, o: { ref?: string; nguoi?: string | null } = {}) {
  const d = Math.trunc(delta);
  if (!d) return soDu(con, t);
  let du = await soDu(con, t);
  const ghi = (x: number, l: string, ly: string) => t(`insert into points(id, child_id, delta, loai, ly_do, ref, nguoi) values ($1,$2,$3,$4,$5,$6,$7)`,
    [newId(), con, x, l, ly.slice(0, 120), o.ref ?? null, o.nguoi ?? null]);
  if (d < 0 && loai === "hoan" && o.ref) {
    const daTra = (await t<{ s: number }>(`select coalesce(-sum(delta), 0)::int as s from points where child_id = $1 and ref = $2 and loai = 'tra_no'`, [con, o.ref]))[0].s;
    const lai = Math.min(daTra, -d);
    if (lai > 0) { await ghi(lai, "tra_no", `Hoàn tác trả nợ ${lai} sao`); du += lai; }
  }
  if (du + d < 0) throw new LoiNghiepVu("khong_du_diem", `Con còn ${du} sao, cần ${-d} sao`, 409);
  await ghi(d, loai, lyDo);
  du += d;
  if (d > 0 && !KHONG_TRA_NO.has(loai)) {
    const tra = Math.min(d, await noCua(con, t));
    if (tra > 0) { await ghi(-tra, "tra_no", `Trả nợ ${tra} sao · ${lyDo}`); du -= tra; }
  }
  return du;
}

/** Ba Mẹ cộng/trừ tay kèm lý do (thưởng sinh nhật, phạt nói dối…) — ghi nhật ký (FR-03.05). Cộng khi Con đang nợ ⇒ trả nợ trước.
 *  #433 A6 (quyết định 19/11): trừ quá số sao Con đang có ⇒ CHẶN với câu rõ «<Con> chỉ còn N sao — trừ tối đa N sao» (thay câu chung
 *  «Con còn N sao, cần M sao»). Không đẩy phần thiếu thành nợ: nợ chỉ đến từ khoản vay Ba Mẹ chủ động cho (sổ trả nợ, báo cáo đều dựa vào đó). */
export async function dieuChinhTay(fam: string, con: string, delta: number, lyDo: string, nguoi: string) {
  const d = Math.trunc(Number(delta));
  if (!d || Math.abs(d) > 10_000) throw new LoiNghiepVu("diem_sai", "Số điểm cộng/trừ chưa hợp lệ");
  const ly = String(lyDo ?? "").trim();
  if (!ly) throw new LoiNghiepVu("thieu_ly_do", "Ghi lý do để Con hiểu vì sao điểm thay đổi");
  return tx(async (t) => {
    if ((await khoaCon(t, con)) !== fam) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
    if (d < 0) {
      const co = Math.max(0, await soDu(con, t));
      if (-d > co) {
        const ten = (await t<{ ten: string }>(`select ten from children where id = $1`, [con]))[0]?.ten ?? "Con";
        throw new LoiNghiepVu("khong_du_diem", co > 0 ? `${ten} chỉ còn ${co} sao — trừ tối đa ${co} sao` : `${ten} đang hết sao — chưa trừ thêm được`, 409);
      }
    }
    const du = await ghiDiem(t, con, d, "tay", ly, { nguoi });
    await t(`insert into events(id, family_id, child_id, loai, chi_tiet, nguoi) values ($1,$2,$3,'dieu_chinh_diem',$4::text::jsonb,$5)`,
      [newId(), fam, con, JSON.stringify({ delta: d, ly_do: ly }), nguoi]);
    return du;
  });
}

export async function tomTatVi(con: string) {
  const r = (await one<{ du: number; no: number; vay: number; tra: number; kiem: number; cho: number; giu: number }>(
    `select coalesce((select sum(delta) from points where child_id = $1), 0)::int as du,
            coalesce((select sum(delta) from points where child_id = $1 and loai in ('vay', 'tra_no')), 0)::int as no,
            coalesce((select sum(delta) from points where child_id = $1 and loai = 'vay'), 0)::int as vay,
            coalesce((select -sum(delta) from points where child_id = $1 and loai = 'tra_no'), 0)::int as tra,
            coalesce((select sum(delta) from points where child_id = $1 and ${KIEM_SQL}), 0)::int as kiem,
            coalesce((select sum(coalesce(s.diem_nop, t.diem)) from submissions s join tasks t on t.id = s.task_id
                      where s.child_id = $1 and s.trang_thai = 'cho_duyet'), 0)::int as cho,
            coalesce((select sum(diem) from redemptions where child_id = $1 and trang_thai = 'giu'), 0)::int as giu`, [con]))!;
  const no = Math.max(0, r.no), tieu = Math.max(0, r.du);
  // `soDu` (cũ) = sao TIÊU ĐƯỢC (≥ 0 — app/agent cũ dùng để biết đủ sao đổi quà) · `sao` (15/11) = số dư Con thấy, ÂM khi nợ.
  // saoGiu (06/11, L14): sao đang GIỮ cho quà chờ Ba Mẹ trao (đã ghi trừ tạm; Ba Mẹ huỷ ⇒ hoàn) — «Đang giữ 50 sao cho quà chờ trao»
  return { soDu: tieu, sao: r.du - no, no, saoVayChuaTieu: Math.min(tieu, no), phutCon: tieu, hetSao: tieu <= 0, tongVay: r.vay, daTraNo: r.tra,
    canhBaoNo: no > NGUONG_NO, diemChoDuyet: r.cho, saoChoDuyet: r.cho, saoGiu: r.giu, tongKiem: Math.max(0, r.kiem), capDo: capDo(Math.max(0, r.kiem)) };
}

/** #266: nợ quá mốc này ⇒ cảnh báo Ba Mẹ (không chặn cho vay). */
export const NGUONG_NO = 1000;

/** Cấp độ theo tổng điểm kiếm được trọn đời: cấp n cần 100·n·(n+1)/2 điểm (100, 300, 600, 1000…). */
export function capDo(tongKiem: number) {
  let n = 0;
  while (100 * ((n + 1) * (n + 2)) / 2 <= tongKiem) n++;
  const can = (100 * ((n + 1) * (n + 2))) / 2;
  return { cap: n + 1, diemCapSau: can, conThieu: can - tongKiem };
}

/** Lịch sử ví — gồm vay (`vay`), trả nợ (`tra_no`), chơi Tính phút (`choi`, một dòng gom các phút liền nhau). */
export const lichSu = (con: string, gioiHan = 100) =>
  // ten_nguoi: tên Ba Mẹ để app hiện «Hôm nay · 11:12 · Mẹ Lan» (nguoi là id — giữ cho chỗ gọi cũ); người đã rời / xoá ⇒ null
  q<{ delta: number; loai: LoaiDiem; ly_do: string; nguoi: string | null; ten_nguoi: string | null; created_at: Date }>(
    `select p.delta, p.loai, p.ly_do, p.nguoi, pa.ten as ten_nguoi, p.created_at from points p left join parents pa on pa.id = p.nguoi
      where p.child_id = $1 order by p.created_at desc, p.seq desc limit $2`, [con, gioiHan]);
