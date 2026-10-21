// Nhật ký agent máy con gửi lên (POST /api/device/log) — để Ba Mẹ (GET /api/m/may/:id/log) và Admin AiiLab (GET /api/admin/may/:id/log)
// đọc từ xa khi thử / hỗ trợ. Chỉ dòng chữ agent tự ghi (không ảnh, không nội dung màn hình); agent đã che token/mật khẩu trước khi gửi.
// Giữ 7 ngày; mỗi lần gửi tối đa 200 dòng, mỗi dòng tối đa 1000 ký tự.
import { q } from "./db.ts";
import type { May } from "./gia-dinh.ts";
import { LoiNghiepVu } from "./loi.ts";

export const LOG_GIU_NGAY = 7, LOG_MOI_LAN = 200, LOG_DAI = 1000;
const MUC = new Set(["tin", "canh", "loi"]);

let coBang = false;
async function bangLog() {
  if (coBang) return;
  await q(`create table if not exists may_log (
    id bigserial primary key, device_id text not null, family_id text not null, luc timestamptz not null, muc text not null,
    nguon text not null default '', noi_dung text not null, nhan_luc timestamptz not null default now())`);
  await q(`create index if not exists may_log_may on may_log(device_id, luc desc)`);
  coBang = true;
}

type DongVao = { luc?: unknown; muc?: unknown; nguon?: unknown; noiDung?: unknown };

export async function nhanLog(may: May, ds: unknown, now = new Date()) {
  await bangLog();
  const vao = (Array.isArray(ds) ? ds : []).slice(0, LOG_MOI_LAN) as DongVao[];
  let n = 0;
  for (const d of vao) {
    const noiDung = String(d?.noiDung ?? "").slice(0, LOG_DAI);
    if (!noiDung) continue;
    const t = new Date(String(d?.luc ?? ""));
    const luc = Number.isFinite(t.getTime()) && Math.abs(t.getTime() - now.getTime()) < 30 * 86_400_000 ? t : now;
    await q(`insert into may_log(device_id, family_id, luc, muc, nguon, noi_dung) values ($1,$2,$3,$4,$5,$6)`,
      [may.id, may.family_id, luc, MUC.has(String(d?.muc)) ? String(d!.muc) : "tin", String(d?.nguon ?? "").slice(0, 60), noiDung]);
    n++;
  }
  if (n) await q(`delete from may_log where device_id = $1 and nhan_luc < $2`, [may.id, new Date(now.getTime() - LOG_GIU_NGAY * 86_400_000)]);
  return { nhan: n };
}

/** Đọc log mới nhất của một máy. `fam` = null chỉ dành cho Admin AiiLab (đã xác thực ở api-admin). */
export async function docLog(fam: string | null, mayId: string, o: { gioiHan?: unknown; muc?: unknown } = {}) {
  await bangLog();
  const may = (await q<{ id: string; name: string; family_id: string }>(`select id, name, family_id from devices where id = $1`, [mayId]))[0];
  if (!may || (fam !== null && may.family_id !== fam)) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  const n = Math.min(1000, Math.max(1, Number(o.gioiHan) || 200));
  const muc = MUC.has(String(o.muc)) ? String(o.muc) : null;
  const ds = await q<{ luc: Date; muc: string; nguon: string; noi_dung: string }>(
    `select luc, muc, nguon, noi_dung from may_log where device_id = $1 and ($2::text is null or muc = $2) order by luc desc, id desc limit $3`,
    [mayId, muc, n]);
  return { may: { id: may.id, ten: may.name }, ds: ds.map((x) => ({ luc: x.luc, muc: x.muc, nguon: x.nguon, noiDung: x.noi_dung })) };
}
