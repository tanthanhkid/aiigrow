// #418 (19/11/2026): dọn dữ liệu sai do khay AiiGrow cũ sau cập nhật («AiiGrow.Tray.exe.cu-xxxxxxxx» còn chạy) bị ghi là app Con dùng —
// «app mới chờ Ba Mẹ xếp» + trừ sao. Chạy MỘT LẦN (scripts/hoan-sao-418.ts), chạy lại bao nhiêu lần cũng như một (idempotent):
//   1. Hoàn sao: mỗi dòng sổ `choi` (trừ sao phút chơi) gắn với app của chính AiiGrow — ref `choi:<ngày>:<mục>` có mục khớp laAppAiiGrow,
//      hoặc lý do «Chơi Aiigrow tray exe cu …» — được cộng lại đúng số sao bằng một dòng `hoan` ref `hoan-418:<id dòng trừ>` (đã có ⇒ bỏ qua).
//      `hoan` không trả nợ (vi.ts › KHONG_TRA_NO) — trả lại đúng chỗ đã trừ.
//   2. Xoá «app mới»: dòng `usage` (đã dùng / chưa xếp) có mục là app của AiiGrow; luật app_rules Ba Mẹ lỡ xếp cho mục đó.
// Mặc định XEM TRƯỚC (không ghi gì); `chay: true` mới ghi, trong một giao dịch.
import { newId, q, tx, type Q } from "./db.ts";
import { laAppAiiGrow } from "./luat-app.ts";

/** Lý do dòng trừ sao ghi tên đọc của mục (man-hinh.ts › tenDoc): «Chơi Aiigrow tray exe cu 623a59b6 3 phút». */
const LY_DO_KHAY_CU = /aiigrow[ ._-]+(tray|kid|service|setup)[ ._-]+exe[ ._-]+cu\b/i;

/** Dòng sổ `choi` có phải trừ cho app của AiiGrow không. */
export function laTruNham(ref: string | null, lyDo: string | null) {
  const m = /^choi:\d{4}-\d{2}-\d{2}:(.*)$/.exec(ref ?? "");
  if (m && laAppAiiGrow(m[1])) return true;
  return LY_DO_KHAY_CU.test(lyDo ?? "");
}

export type KetQuaDon418 = {
  chay: boolean;
  hoan: { child_id: string; points_id: string; sao: number; ly_do: string; created_at: string }[];
  tongSao: number;
  usage: { device_id: string; child_id: string; ngay: string; muc: string; loai: string; phut: number }[];
  luat: { family_id: string; child_id: string; muc: string; loai: string }[];
};

export async function donAppAiiGrow(o: { chay?: boolean } = {}): Promise<KetQuaDon418> {
  const lam = async (t: Q): Promise<KetQuaDon418> => {
    // lọc thô bằng SQL (ilike '%aiigrow%' — dùng được ở cả Postgres lẫn PGlite), lọc đúng bằng laAppAiiGrow / laTruNham
    const tru = (await t<{ id: string; child_id: string; delta: number; ref: string | null; ly_do: string; created_at: Date }>(
      `select p.id, p.child_id, p.delta, p.ref, p.ly_do, p.created_at from points p
        where p.loai = 'choi' and p.delta < 0 and (p.ref ilike '%aiigrow%' or p.ly_do ilike '%aiigrow%')
          and not exists (select 1 from points h where h.child_id = p.child_id and h.ref = 'hoan-418:' || p.id)
        order by p.created_at`)).filter((r) => laTruNham(r.ref, r.ly_do));
    const usage = (await t<{ device_id: string; child_id: string; ngay: string; muc: string; loai: string; phut: number }>(
      `select device_id, child_id, ngay, muc, loai, phut from usage where muc ilike '%aiigrow%' order by ngay, muc`)).filter((r) => laAppAiiGrow(r.muc));
    const luat = (await t<{ family_id: string; child_id: string; muc: string; loai: string }>(
      `select family_id, child_id, muc, loai from app_rules where muc ilike '%aiigrow%' order by family_id, muc`)).filter((r) => laAppAiiGrow(r.muc));
    if (o.chay) {
      for (const r of tru) {
        const sao = -Number(r.delta);
        await t(`select 1 from children where id = $1 for update`, [r.child_id]);   // như vi.ts › khoaCon: nối đuôi mọi thay đổi ví của Con
        await t(`insert into points(id, child_id, delta, loai, ly_do, ref, nguoi) values ($1, $2, $3, 'hoan', $4, $5, null)`,
          [newId(), r.child_id, sao, `Hoàn ${sao} sao trừ nhầm (AiiGrow cũ sau cập nhật bị tính là app)`.slice(0, 120), `hoan-418:${r.id}`]);
      }
      for (const u of usage)
        await t(`delete from usage where device_id = $1 and child_id = $2 and ngay = $3 and muc = $4`, [u.device_id, u.child_id, u.ngay, u.muc]);
      for (const l of luat)
        await t(`delete from app_rules where family_id = $1 and child_id = $2 and muc = $3`, [l.family_id, l.child_id, l.muc]);
    }
    const hoan = tru.map((r) => ({ child_id: r.child_id, points_id: r.id, sao: -Number(r.delta), ly_do: r.ly_do, created_at: new Date(r.created_at).toISOString() }));
    return { chay: !!o.chay, hoan, tongSao: hoan.reduce((s, x) => s + x.sao, 0), usage, luat };
  };
  return o.chay ? tx(lam) : lam(q);
}
