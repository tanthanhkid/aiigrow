// API cổng quản trị AiiLab: /api/admin/<đường>. Bearer = phiên Admin (bảng staff, vai admin). Nhân viên quầy bị từ chối (403).
// Mọi thao tác ghi đều vào nhật ký kiểm toán (audit). KHÔNG có đường nào đọc ảnh bằng chứng của Con (KE-HOACH 5.5).
import { batLoi, docJson, json, loi } from "./api.ts";
import { newId, one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import * as ad from "./admin.ts";
import { doiSoat, napQuy } from "./phan-thuong.ts";
import { soDu } from "./vi.ts";
import { congNgay, dauNgayUtc, gioDiaPhuong } from "./gio.ts";

const TZ = "Asia/Ho_Chi_Minh";
const s = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
const NGAY = /^\d{4}-\d{2}-\d{2}$/;

/** Khoảng ngày [tu, den] theo giờ VN; mặc định từ đầu tháng tới hôm nay. */
function khoang(u: URLSearchParams) {
  const homNay = gioDiaPhuong(new Date(), TZ).ngay;
  const tu = NGAY.test(u.get("tu") ?? "") ? u.get("tu")! : `${homNay.slice(0, 8)}01`;
  const den = NGAY.test(u.get("den") ?? "") ? u.get("den")! : homNay;
  if (tu > den) throw new LoiNghiepVu("khoang_sai", "Ngày bắt đầu phải trước ngày kết thúc");
  return { tu, den, tuUtc: dauNgayUtc(tu, TZ), denUtc: new Date(dauNgayUtc(congNgay(den, 1), TZ).getTime() - 1) };
}

async function tongQuan() {
  const n = (await one<{ gd: number; con: number; may: number; quy: number }>(
    `select (select count(*) from families)::int as gd, (select count(*) from children)::int as con, (select count(*) from devices)::int as may,
            coalesce((select sum(quy_voucher) from families), 0)::int as quy`))!;
  const v = await q<{ trang_thai: string; n: number; tien: number }>(
    `select trang_thai, count(*)::int as n, coalesce(sum(menh_gia), 0)::int as tien from vouchers group by trang_thai`);
  const dauThang = dauNgayUtc(`${gioDiaPhuong(new Date(), TZ).ngay.slice(0, 8)}01`, TZ);
  const thang = (await one<{ nap: number; dung: number }>(
    `select coalesce((select sum(so_tien) from quy_gd where loai = 'nap' and created_at >= $1), 0)::int as nap,
            coalesce((select sum(menh_gia) from vouchers where trang_thai = 'da_dung' and dung_luc >= $1), 0)::int as dung`, [dauThang]))!;
  const hoTro = (await one<{ n: number }>(
    `select count(*)::int as n from families f where (select tu from ho_tro h where h.family_id = f.id order by created_at desc, seq desc limit 1) = 'ba_me'`))!.n;
  const phieu = Object.fromEntries(["da_phat_hanh", "cho_xac_nhan", "da_dung", "het_han", "thu_hoi"].map((k) => {
    const r = v.find((x) => x.trang_thai === k); return [k, { n: r?.n ?? 0, tien: r?.tien ?? 0 }];
  }));
  return { soGiaDinh: n.gd, soCon: n.con, soMay: n.may, quyDangGiu: n.quy, napThang: thang.nap, dungThang: thang.dung, phieu, hoTroChoTraLoi: hoTro };
}

async function dsGiaDinh(tim: string) {
  const t = `%${tim.toLowerCase()}%`;
  return q(`select f.id, f.ten, f.quy_voucher, f.created_at,
              (select count(*) from children c where c.family_id = f.id)::int as so_con,
              (select p.ten from parents p where p.family_id = f.id and p.vai = 'chu' order by p.created_at limit 1) as chu,
              (select p.dinh_danh from parents p where p.family_id = f.id and p.vai = 'chu' order by p.created_at limit 1) as dinh_danh
            from families f
            where $1 = '%%' or lower(f.ten) like $1 or exists (select 1 from parents p where p.family_id = f.id and (lower(p.dinh_danh) like $1 or lower(p.ten) like $1))
            order by f.created_at desc limit 200`, [t]);
}

async function chiTietGd(id: string) {
  const f = await one<{ id: string; ten: string; quy_voucher: number; created_at: Date }>(`select id, ten, quy_voucher, created_at from families where id = $1`, [id]);
  if (!f) throw new LoiNghiepVu("khong_thay", "Không thấy gia đình", 404);
  const con = await q<{ id: string; ten: string; nhom: string; nam_sinh: number | null }>(`select id, ten, nhom, nam_sinh from children where family_id = $1 order by created_at`, [id]);
  return {
    ...f,
    baMe: await q(`select ten, vai, dinh_danh from parents where family_id = $1 order by created_at`, [id]),
    con: await Promise.all(con.map(async (c) => ({ ...c, soDu: await soDu(c.id) }))),
    soMay: (await one<{ n: number }>(`select count(*)::int as n from devices where family_id = $1`, [id]))!.n,
    giaoDich: await q(`select so_tien, loai, ghi_chu, ref, created_at from quy_gd where family_id = $1 order by created_at desc limit 50`, [id]),
    voucher: await q(`select v.ma, v.menh_gia, v.trang_thai, v.het_han, v.dung_luc, v.quay, c.ten as ten_con from vouchers v
                      left join children c on c.id = v.child_id where v.family_id = $1 order by v.created_at desc limit 50`, [id]),
  };
}

export async function xuLyAdmin(req: Request, p: string[]): Promise<Response> {
  try {
    const d = p.join("/"), get = req.method === "GET", post = req.method === "POST";
    if (d === "dang-nhap" && post) {
      const b = await docJson(req);
      return json({ token: await ad.dangNhapNv(b.tenDangNhap, b.matKhau, "admin") });
    }
    const nv = await ad.nvGoi(req);
    if (!nv) return loi("chua_dang_nhap", "Phiên đăng nhập quản trị đã hết — đăng nhập lại", 401);
    if (nv.vai !== "admin") return loi("khong_du_quyen", "Tài khoản quầy không vào được cổng quản trị", 403);
    const u = new URL(req.url).searchParams;
    const b = post ? await docJson(req) : {};

    if (d === "toi" && get) return json({ admin: { ten: nv.ten, tenDangNhap: nv.ten_dang_nhap } });
    if (d === "dang-xuat" && post) { await ad.dangXuatNv(req); return json({ ok: true }); }
    if (d === "tong-quan" && get) return json(await tongQuan());

    if (d === "gia-dinh" && get) return json({ ds: await dsGiaDinh(s(u.get("tim"), 60)) });
    if (p[0] === "gia-dinh" && p[1] && p.length === 2 && get) return json(await chiTietGd(p[1]));
    if (p[0] === "gia-dinh" && p[1] && p[2] === "nap-quy" && post) {
      const ghiChu = s(b.ghiChu, 120);
      const soDuMoi = await napQuy(p[1], Number(b.soTien), ghiChu || "Nạp tại AiiCafe", `admin:${nv.id}`);
      await ad.ghiKiemToan(nv, "nap_quy", { soTien: Math.round(Number(b.soTien)), ghiChu, soDuMoi }, p[1]);
      return json({ soDu: soDuMoi });
    }

    if (d === "voucher" && get) {
      const tt = s(u.get("trangThai"), 20), tim = s(u.get("tim"), 40).toUpperCase().replace(/[\s-]/g, "");
      await q(`update vouchers set trang_thai = 'het_han' where trang_thai = 'da_phat_hanh' and het_han <= now()`);
      return json({ ds: await q(
        `select v.ma, v.menh_gia, v.trang_thai, v.het_han, v.dung_luc, v.quay, v.created_at, f.ten as ten_gd, v.family_id, c.ten as ten_con
         from vouchers v join families f on f.id = v.family_id left join children c on c.id = v.child_id
         where ($1 = '' or v.trang_thai = $1) and ($2 = '' or v.ma like '%' || $2 || '%')
         order by v.created_at desc limit 300`, [tt, tim]) });
    }
    if (d === "doi-soat" && get) {
      const k = khoang(u);
      const ten = new Map((await q<{ id: string; ten: string }>(`select id, ten from families`)).map((x) => [x.id, x.ten]));
      const ds = (await doiSoat(null, k.tuUtc, k.denUtc)).filter((r) => r.nap || r.phat_hanh || r.da_dung || r.het_han || r.thu_hoi)
        .map((r) => ({ ...r, ten: ten.get(r.family_id) ?? "" }));
      const tong = ds.reduce((a, r) => ({ nap: a.nap + r.nap, phat_hanh: a.phat_hanh + r.phat_hanh, da_dung: a.da_dung + r.da_dung,
        het_han: a.het_han + r.het_han, thu_hoi: a.thu_hoi + r.thu_hoi }), { nap: 0, phat_hanh: 0, da_dung: 0, het_han: 0, thu_hoi: 0 });
      return json({ tu: k.tu, den: k.den, ds, tong });
    }

    if (d === "ho-tro" && get)
      return json({ ds: await q(
        `select f.id as family_id, f.ten, h.tu, h.noi_dung, h.created_at from families f
         join lateral (select tu, noi_dung, created_at from ho_tro x where x.family_id = f.id order by x.created_at desc, x.seq desc limit 1) h on true
         order by (h.tu = 'ba_me') desc, h.created_at desc limit 200`) });
    if (p[0] === "ho-tro" && p[1] && get) {
      const f = await one<{ ten: string }>(`select ten from families where id = $1`, [p[1]]);
      if (!f) throw new LoiNghiepVu("khong_thay", "Không thấy gia đình", 404);
      return json({ ten: f.ten, tin: await q(`select id, tu, noi_dung, created_at from ho_tro where family_id = $1 order by created_at, seq limit 300`, [p[1]]) });
    }
    if (p[0] === "ho-tro" && p[1] && post) {
      const nd = s(b.noiDung, 1000);
      if (!nd) throw new LoiNghiepVu("thieu_noi_dung", "Viết câu trả lời trước khi gửi");
      if (!(await one(`select 1 from families where id = $1`, [p[1]]))) throw new LoiNghiepVu("khong_thay", "Không thấy gia đình", 404);
      await q(`insert into ho_tro(id, family_id, tu, nguoi, noi_dung) values ($1,$2,'aiilab',$3,$4)`, [newId(), p[1], `admin:${nv.id}`, nd]);
      await ad.ghiKiemToan(nv, "tra_loi_ho_tro", { doDai: nd.length }, p[1]);
      return json({ ok: true });
    }

    if (d === "mau" && get) return json(await ad.thuVienMau());
    if (d === "mau" && post) return json({ id: await ad.themMau(nv, b) });
    if (p[0] === "mau" && p[1] && post) { await ad.batTatMau(nv, p[1], b.bat === true); return json({ ok: true }); }

    if (d === "allowlist" && get) return json(await ad.allowlist());
    if (d === "allowlist" && post) return json({ them: await ad.suaAllowlist(nv, b.muc, b.bo !== true) });

    if (d === "tham-so" && get) return json({ ds: await ad.bangThamSo() });
    if (d === "tham-so" && post) return json({ heThong: await ad.datThamSo(nv, b) });

    if (d === "nhat-ky" && get) return json({ ds: await ad.dsKiemToan({ hanhDong: s(u.get("loai"), 40) || null }) });
    return loi("khong_co_duong", "Không có đường này", 404);
  } catch (e) {
    return batLoi(e);
  }
}
