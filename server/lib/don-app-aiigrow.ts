// #418 (19/11/2026): dọn dữ liệu sai do khay AiiGrow cũ sau cập nhật («AiiGrow.Tray.exe.cu-xxxxxxxx» còn chạy) bị ghi là app Con dùng —
// «app mới chờ Ba Mẹ xếp» + trừ sao. Chạy MỘT LẦN (scripts/hoan-sao-418.ts), chạy lại bao nhiêu lần cũng như một (idempotent):
//   1. Hoàn sao: máy chủ chỉ trừ sao cho phút mục «Tính phút» (giai_tri) — mục AiiGrow chỉ bị trừ khi Ba Mẹ đã lỡ xếp nó vào «Tính phút»
//      (dòng «chưa xếp» chỉ HIỆN «−N sao», không trừ). Dòng sổ `choi` không theo app (một lần đồng bộ cộng mọi app «Tính phút», ghi tên app nhiều
//      phút nhất; nhịp sau gộp vào dòng trước) ⇒ hoàn theo (Con, ngày): min(phút mục AiiGrow loại giai_tri ngày đó, sao `choi` đã trừ ngày đó),
//      một dòng `hoan` ref `hoan-418:<con>:<ngày>` (đã có ⇒ bỏ qua). `hoan` không trả nợ (vi.ts › KHONG_TRA_NO) — trả lại đúng chỗ đã trừ.
//      Phần lẻ < 1 phút (choi_dong_ho.phut_le) không đụng.
//   2. Xoá «app mới»: dòng `usage` (đã dùng / chưa xếp) có mục là app của AiiGrow; luật app_rules Ba Mẹ lỡ xếp cho mục đó.
// Mặc định XEM TRƯỚC (không ghi gì); `chay: true` mới ghi, trong một giao dịch.
import { newId, q, tx, type Q } from "./db.ts";
import { laAppAiiGrow } from "./luat-app.ts";

export type KetQuaDon418 = {
  chay: boolean;
  hoan: { child_id: string; ngay: string; sao: number; phutAiiGrow: number; saoDaTru: number }[];
  tongSao: number;
  usage: { device_id: string; child_id: string; ngay: string; muc: string; loai: string; phut: number }[];
  luat: { family_id: string; child_id: string; muc: string; loai: string }[];
};

export async function donAppAiiGrow(o: { chay?: boolean } = {}): Promise<KetQuaDon418> {
  const lam = async (t: Q): Promise<KetQuaDon418> => {
    // lọc thô bằng SQL (ilike '%aiigrow%' — chạy được ở cả Postgres lẫn PGlite), lọc đúng bằng laAppAiiGrow
    const usage = (await t<{ device_id: string; child_id: string; ngay: string; muc: string; loai: string; phut: number }>(
      `select device_id, child_id, ngay, muc, loai, phut from usage where muc ilike '%aiigrow%' order by child_id, ngay, muc`)).filter((r) => laAppAiiGrow(r.muc));
    const luat = (await t<{ family_id: string; child_id: string; muc: string; loai: string }>(
      `select family_id, child_id, muc, loai from app_rules where muc ilike '%aiigrow%' order by family_id, muc`)).filter((r) => laAppAiiGrow(r.muc));
    const phutNgay = new Map<string, { child_id: string; ngay: string; phut: number }>();
    for (const u of usage) {
      if (u.loai !== "giai_tri" || !(Number(u.phut) > 0)) continue;
      const k = `${u.child_id}|${u.ngay}`;
      const x = phutNgay.get(k) ?? { child_id: u.child_id, ngay: u.ngay, phut: 0 };
      x.phut += Number(u.phut);
      phutNgay.set(k, x);
    }
    const hoan: KetQuaDon418["hoan"] = [];
    for (const x of phutNgay.values()) {
      const ref = `hoan-418:${x.child_id}:${x.ngay}`;
      if ((await t(`select 1 from points where child_id = $1 and ref = $2`, [x.child_id, ref])).length) continue;
      const saoDaTru = Number((await t<{ s: number }>(`select coalesce(-sum(delta), 0)::int as s from points where child_id = $1 and loai = 'choi' and ref like $2`,
        [x.child_id, `choi:${x.ngay}:%`]))[0].s);
      const sao = Math.min(Math.round(x.phut), saoDaTru);
      if (sao > 0) hoan.push({ child_id: x.child_id, ngay: x.ngay, sao, phutAiiGrow: x.phut, saoDaTru });
    }
    if (o.chay) {
      for (const h of hoan) {
        await t(`select 1 from children where id = $1 for update`, [h.child_id]);   // như vi.ts › khoaCon: nối đuôi mọi thay đổi ví của Con
        await t(`insert into points(id, child_id, delta, loai, ly_do, ref, nguoi) values ($1, $2, $3, 'hoan', $4, $5, null)`,
          [newId(), h.child_id, h.sao, `Hoàn ${h.sao} sao trừ nhầm ngày ${h.ngay} (AiiGrow cũ sau cập nhật bị tính là app)`.slice(0, 120),
            `hoan-418:${h.child_id}:${h.ngay}`]);
      }
      for (const u of usage)
        await t(`delete from usage where device_id = $1 and child_id = $2 and ngay = $3 and muc = $4`, [u.device_id, u.child_id, u.ngay, u.muc]);
      for (const l of luat)
        await t(`delete from app_rules where family_id = $1 and child_id = $2 and muc = $3`, [l.family_id, l.child_id, l.muc]);
    }
    return { chay: !!o.chay, hoan, tongSao: hoan.reduce((s, x) => s + x.sao, 0), usage, luat };
  };
  return o.chay ? tx(lam) : lam(q);
}
