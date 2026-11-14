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
  const r = await q<Omit<DongHoTro, "cho_phut" | "gap" | "cua_toi">>(
    `select f.id as family_id, f.ten, h.tu, h.noi_dung, h.created_at, (h.tu = 'ba_me') as chua_tra_loi, g.ten as nguoi_gui,
       (select min(x.created_at) from ho_tro x where x.family_id = f.id and x.tu = 'ba_me' and x.seq > coalesce(a.seq, 0)) as cho_tu,
       a.nguoi as nguoi_tra_loi
     from families f
     join lateral (select tu, noi_dung, created_at from ho_tro x where x.family_id = f.id order by x.created_at desc, x.seq desc limit 1) h on true
     left join lateral (select y.seq, y.nguoi from ho_tro y where y.family_id = f.id and y.tu = 'aiilab' order by y.seq desc limit 1) a on true
     left join lateral (select p.ten from ho_tro x join parents p on p.id = x.nguoi where x.family_id = f.id and x.tu = 'ba_me' order by x.seq desc limit 1) g on true
     order by (h.tu = 'ba_me') desc, h.created_at desc limit 200`);
  const ds: DongHoTro[] = r.map((x) => {
    const choPhut = x.cho_tu ? Math.max(0, Math.floor((now.getTime() - new Date(x.cho_tu).getTime()) / 60_000)) : null;
    return { ...x, cho_phut: choPhut, gap: choPhut !== null && choPhut >= GAP_PHUT, cua_toi: !!o.toi && x.nguoi_tra_loi === o.toi };
  });
  // «Chờ trả lời»: gấp trước, rồi chờ lâu trước
  ds.sort((a, b) => Number(!!b.cho_tu) - Number(!!a.cho_tu) || Number(b.gap) - Number(a.gap) || (b.cho_phut ?? 0) - (a.cho_phut ?? 0));
  const loc = o.loc && (LOC_HO_TRO as readonly string[]).includes(o.loc) ? o.loc : null;
  return {
    ds: !loc ? ds : ds.filter((x) => (loc === "cho" ? !!x.cho_tu : loc === "da_tra_loi" ? !x.cho_tu : x.cua_toi)),
    soCho: ds.filter((x) => x.cho_tu).length, soGap: ds.filter((x) => x.gap).length,
  };
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
