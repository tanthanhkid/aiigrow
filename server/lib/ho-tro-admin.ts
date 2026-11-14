// Hộp thư hỗ trợ cho quản trị AiiLab: dùng chung giữa cổng web (/api/admin, phiên staff) và app (/api/m/admin/ho-tro, Ba Mẹ có cờ admin).
// Cờ admin của Ba Mẹ = `parents.id` nằm trong env AIIGROW_ADMIN_ID (danh sách cách nhau bởi dấu phẩy). KHÔNG so email/SĐT: OTP thử cho phép
// đăng ký định danh của người khác. Không có env ⇒ không ai là admin. Lấy id: đăng nhập tài khoản đó, `GET /api/m/toi` → `baMe.id`.
import { newId, one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";

export function laQuanTri(parentId: string, env: string | undefined = process.env.AIIGROW_ADMIN_ID) {
  const d = String(parentId ?? "").trim();
  return !!d && String(env ?? "").split(",").map((x) => x.trim()).filter(Boolean).includes(d);
}

/** «Gấp» trên hộp thư (thiết kế 14/11 bm-cai-dat/13 bm2-admin-ho-tro): tin Ba Mẹ chờ trả lời từ ≥ 30 phút. */
export const GAP_PHUT = 30;
export const LOC_HO_TRO = ["cho", "da_tra_loi", "cua_toi"] as const;
export type DongHoTro = { family_id: string; ten: string; tu: string; noi_dung: string; created_at: Date; chua_tra_loi: boolean;
  /** 14/11: người lớn gửi tin Ba Mẹ mới nhất («Bà Hoa») */ nguoi_gui: string | null;
  /** tin Ba Mẹ CŨ nhất chưa có trả lời (sau câu trả lời AiiLab cuối) — «Chờ 42′»; null = đã trả lời hết */ cho_tu: Date | null; cho_phut: number | null; gap: boolean;
  /** người AiiLab trả lời gần nhất: «admin:<id nhân viên>» (cổng web) | «admin-app:<id Ba Mẹ admin>» (app) */ nguoi_tra_loi: string | null; cua_toi: boolean };

/** Hộp thư: mỗi gia đình một dòng (tin mới nhất). `o.loc`: cho (chờ trả lời) · da_tra_loi · cua_toi (mình trả lời gần nhất); `o.toi` = mã người gọi
 *  dạng `nguoi` của ho_tro («admin:<id>» / «admin-app:<id>»). → {ds, soCho, soGap}: số đếm luôn tính trên cả hộp thư (không theo bộ lọc). */
export async function dsHoTro(o: { loc?: string | null; toi?: string | null } = {}, now = new Date()) {
  const loc = o.loc && (LOC_HO_TRO as readonly string[]).includes(o.loc) ? o.loc : null;
  const moc = new Date(now.getTime() - GAP_PHUT * 60_000);
  // MỘT CTE tính cho_tu / người trả lời cuối theo gia đình; danh sách (lọc + xếp TRƯỚC limit 200) và số đếm cùng lấy từ đó
  const cte = `with g as (
      select f.id as family_id, f.ten, a.nguoi as nguoi_tra_loi,
        (select min(x.created_at) from ho_tro x where x.family_id = f.id and x.tu = 'ba_me' and x.seq > coalesce(a.seq, 0)) as cho_tu
      from families f
      left join lateral (select y.seq, y.nguoi from ho_tro y where y.family_id = f.id and y.tu = 'aiilab' order by y.seq desc limit 1) a on true
      where exists (select 1 from ho_tro z where z.family_id = f.id))`;
  const [r, dem] = await Promise.all([
    q<Omit<DongHoTro, "cho_phut" | "gap" | "cua_toi">>(
      `${cte}
       select g.family_id, g.ten, h.tu, h.noi_dung, h.created_at, (h.tu = 'ba_me') as chua_tra_loi, n.ten as nguoi_gui, g.cho_tu, g.nguoi_tra_loi
       from g
       join lateral (select tu, noi_dung, created_at from ho_tro x where x.family_id = g.family_id order by x.seq desc limit 1) h on true
       left join lateral (select p.ten from ho_tro x join parents p on p.id = x.nguoi where x.family_id = g.family_id and x.tu = 'ba_me' order by x.seq desc limit 1) n on true
       where ($1::text is null or ($1 = 'cho' and g.cho_tu is not null) or ($1 = 'da_tra_loi' and g.cho_tu is null)
              or ($1 = 'cua_toi' and g.nguoi_tra_loi = $2))
       -- đang chờ lên đầu: gấp (chờ ≥ GAP_PHUT) trước, chờ lâu trước; rồi tin mới nhất
       order by (g.cho_tu is not null) desc, g.cho_tu asc nulls last, h.created_at desc limit 200`, [loc, o.toi ?? ""]),
    q<{ so_cho: number; so_gap: number }>(`${cte} select count(*) filter (where cho_tu is not null)::int as so_cho,
       count(*) filter (where cho_tu <= $1)::int as so_gap from g`, [moc]),
  ]);
  const ds: DongHoTro[] = r.map((x) => {
    const choPhut = x.cho_tu ? Math.max(0, Math.floor((now.getTime() - new Date(x.cho_tu).getTime()) / 60_000)) : null;
    return { ...x, cho_phut: choPhut, gap: choPhut !== null && choPhut >= GAP_PHUT, cua_toi: !!o.toi && x.nguoi_tra_loi === o.toi };
  });
  return { ds, soCho: dem[0]?.so_cho ?? 0, soGap: dem[0]?.so_gap ?? 0 };
}

export async function chiTietHoTro(fam: string) {
  const f = await one<{ ten: string }>(`select ten from families where id = $1`, [fam]);
  if (!f) throw new LoiNghiepVu("khong_thay", "Không thấy gia đình", 404);
  // 14/11: kèm tên người lớn gửi (Ba Mẹ) — hộp thư hiện «Bà Hoa · nhà Bảo Anh»
  return { ten: f.ten, tin: await q(`select h.id, h.tu, h.noi_dung, h.created_at, case when h.tu = 'ba_me' then p.ten end as ten_nguoi
    from ho_tro h left join parents p on p.id = h.nguoi where h.family_id = $1 order by h.created_at, h.seq limit 300`, [fam]) };
}

export async function traLoiHoTro(fam: string, nguoi: string, noiDung: string) {
  const nd = String(noiDung ?? "").trim().slice(0, 1000);
  if (!nd) throw new LoiNghiepVu("thieu_noi_dung", "Viết câu trả lời trước khi gửi");
  if (!(await one(`select 1 from families where id = $1`, [fam]))) throw new LoiNghiepVu("khong_thay", "Không thấy gia đình", 404);
  await q(`insert into ho_tro(id, family_id, tu, nguoi, noi_dung) values ($1,$2,'aiilab',$3,$4)`, [newId(), fam, nguoi, nd]);
  return nd.length;
}
