// Hộp thư hỗ trợ cho quản trị AiiLab: dùng chung giữa cổng web (/api/admin, phiên staff) và app (/api/m/admin/ho-tro, Ba Mẹ có cờ admin).
// Cờ admin của Ba Mẹ = `parents.id` nằm trong env AIIGROW_ADMIN_ID (danh sách cách nhau bởi dấu phẩy). KHÔNG so email/SĐT: OTP thử cho phép
// đăng ký định danh của người khác. Không có env ⇒ không ai là admin. Lấy id: đăng nhập tài khoản đó, `GET /api/m/toi` → `baMe.id`.
import { newId, one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

export function laQuanTri(parentId: string, env: string | undefined = process.env.AIIGROW_ADMIN_ID) {
  const d = String(parentId ?? "").trim();
  return !!d && String(env ?? "").split(",").map((x) => x.trim()).filter(Boolean).includes(d);
}

export const dsHoTro = () => q<{ family_id: string; ten: string; tu: string; noi_dung: string; created_at: Date; chua_tra_loi: boolean }>(
  `select f.id as family_id, f.ten, h.tu, h.noi_dung, h.created_at, (h.tu = 'ba_me') as chua_tra_loi from families f
   join lateral (select tu, noi_dung, created_at from ho_tro x where x.family_id = f.id order by x.created_at desc, x.seq desc limit 1) h on true
   order by (h.tu = 'ba_me') desc, h.created_at desc limit 200`);

export async function chiTietHoTro(fam: string) {
  const f = await one<{ ten: string }>(`select ten from families where id = $1`, [fam]);
  if (!f) throw new LoiNghiepVu("khong_thay", "Không thấy gia đình", 404);
  return { ten: f.ten, tin: await q(`select id, tu, noi_dung, created_at from ho_tro where family_id = $1 order by created_at, seq limit 300`, [fam]) };
}

export async function traLoiHoTro(fam: string, nguoi: string, noiDung: string) {
  const nd = String(noiDung ?? "").trim().slice(0, 1000);
  if (!nd) throw new LoiNghiepVu("thieu_noi_dung", "Viết câu trả lời trước khi gửi");
  if (!(await one(`select 1 from families where id = $1`, [fam]))) throw new LoiNghiepVu("khong_thay", "Không thấy gia đình", 404);
  await q(`insert into ho_tro(id, family_id, tu, nguoi, noi_dung) values ($1,$2,'aiilab',$3,$4)`, [newId(), fam, nguoi, nd]);
  return nd.length;
}
