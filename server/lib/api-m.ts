// API app Ba Mẹ: /api/m/<đường> — Bearer = phiên Ba Mẹ. Hợp đồng: docs/API.md. Mọi ID Con / nhiệm vụ / yêu cầu đều kiểm thuộc gia đình
// của người gọi (lib/* trả «không thấy» như không tồn tại). Vai «xem» (Chỉ xem, FR-01.04) chỉ GET.
import { batLoi, docJson, json, loi } from "./api.ts";
import { baMeGoi, bearer, dangKy, dangNhap, datLaiMatKhau, guiOtp, taoPhien, xoaPhien, type BaMe } from "./auth.ts";
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { lichCua, sachCauHinh, thamSo } from "./cau-hinh.ts";
import * as gd from "./gia-dinh.ts";
import * as nv from "./nhiem-vu.ts";
import * as yc from "./yeu-cau.ts";
import * as pt from "./phan-thuong.ts";
import * as la from "./luat-app.ts";
import { dieuChinhTay, lichSu, tomTatVi } from "./vi.ts";
import { thanhTich } from "./thanh-tich.ts";
import { baoCaoTuan, homNay } from "./bao-cao.ts";
import { khoaNgay } from "./may-con.ts";
import { dsCanhBao, dsSuKien, ghiSuKien } from "./nhat-ky.ts";
import { newId } from "./db.ts";

const s = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);

async function chiTietCon(bm: BaMe, id: string) {
  const c = await gd.conCua(bm.family_id, id);
  const may = await q<gd.May>(`select * from devices where child_id = $1 or (dung_chung and family_id = $2) order by created_at`, [id, bm.family_id]);
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [bm.family_id]))!;
  return {
    id: c.id, ten: c.ten, namSinh: c.nam_sinh, avatar: c.avatar, nhom: c.nhom, coPin: true, khoaNgay: c.cau_hinh?.khoa_ngay === true,
    lich: lichCua(c.lich as never), thamSo: thamSo(f.cau_hinh, c.cau_hinh), ...(await tomTatVi(c.id)),
    may: may.map((m) => ({ id: m.id, ten: m.name, nen: m.platform, dungChung: m.dung_chung, baoVe: gd.mucBaoVe(m),
      lanCuoi: m.last_seen ? new Date(m.last_seen).toISOString() : null,
      truc: !!m.last_seen && Date.now() - new Date(m.last_seen).getTime() < 3 * 60_000, lechGiay: m.status?.lechGiay ?? null })),
  };
}

export async function xuLyM(req: Request, p: string[]): Promise<Response> {
  try {
    const get = req.method === "GET", post = req.method === "POST";
    const d = p.join("/");
    // ---- không cần đăng nhập
    if (d === "otp" && post) { const b = await docJson(req); return json(await guiOtp(b.dinhDanh, b.mucDich === "quen_mk" ? "quen_mk" : "dang_ky")); }
    if (d === "dang-ky" && post) return json({ token: await taoPhien(await dangKy(await docJson(req))), moi: true });
    if (d === "dang-nhap" && post) { const b = await docJson(req); return json({ token: await taoPhien(await dangNhap(b.dinhDanh, b.matKhau)) }); }
    if (d === "quen-mat-khau" && post) { const b = await docJson(req); await datLaiMatKhau(b.dinhDanh, b.ma, b.matKhauMoi); return json({ ok: true }); }
    // ---- cần đăng nhập
    const bm = await baMeGoi(req);
    if (!bm) return loi("chua_dang_nhap", "Phiên đăng nhập đã hết — đăng nhập lại nhé", 401);
    if (post && bm.vai === "xem" && d !== "dang-xuat") throw new LoiNghiepVu("chi_xem", "Tài khoản của Ba/Mẹ đang ở quyền Chỉ xem", 403);
    const fam = bm.family_id, b = post ? await docJson(req) : {};
    if (d === "toi" && get) return json({ baMe: { id: bm.id, ten: bm.ten, dinhDanh: bm.dinh_danh, vai: bm.vai } });
    if (d === "dang-xuat" && post) { await xoaPhien(bearer(req)!); return json({ ok: true }); }

    if (d === "gia-dinh" && get) {
      const con = await gd.dsCon(fam);
      const f = (await one<{ ten: string; quy_voucher: number }>(`select ten, quy_voucher from families where id = $1`, [fam]))!;
      const cho = await nv.choDuyet(fam), ycCho = await yc.dsChoYc(fam);
      return json({ ten: f.ten, quyVoucher: f.quy_voucher, choDuyet: cho.length + ycCho.length,
        canhBao: (await dsCanhBao(fam, true)).length,
        con: await Promise.all(con.map(async (c) => ({ id: c.id, ten: c.ten, avatar: c.avatar, nhom: c.nhom, ...(await homNay(fam, c.id)) }))) });
    }
    if (d === "con" && post) return json({ id: await gd.taoCon(fam, b, bm.id) });
    if (p[0] === "con" && p[1]) {
      const id = p[1], sau = p.slice(2).join("/");
      if (!sau && get) return json(await chiTietCon(bm, id));
      await gd.conCua(fam, id);
      if (sau === "sua" && post) { await gd.suaCon(fam, id, b, bm.id); return json({ ok: true }); }
      if (sau === "lich" && post) {
        const l = lichCua(b as never);
        await q(`update children set lich = $2::text::jsonb where id = $1`, [id, JSON.stringify(l)]);
        await ghiSuKien(fam, "doi_lich", l, { con: id, nguoi: bm.id });
        return json({ lich: l });
      }
      if (sau === "cau-hinh" && post) {
        const moi = sachCauHinh(b);
        await q(`update children set cau_hinh = cau_hinh || $2::text::jsonb where id = $1`, [id, JSON.stringify(moi)]);
        await ghiSuKien(fam, "doi_cau_hinh", moi, { con: id, nguoi: bm.id });
        return json({ ok: true });
      }
      if (sau === "khoa" && post) { await khoaNgay(fam, id, b.khoa !== false, bm.id); return json({ ok: true }); }
      if (sau === "diem" && post) return json({ soDu: await dieuChinhTay(fam, id, Number(b.delta), s(b.lyDo, 120), bm.id) });
      if (sau === "vi" && get) return json({ ...(await tomTatVi(id)), lichSu: await lichSu(id) });
      if (sau === "bao-cao" && get) return json(await baoCaoTuan(fam, id));
      if (sau === "thanh-tich" && get) return json(await thanhTich(id));
      if (sau === "loi-khen" && post) {
        const nd = s(b.noiDung, 200);
        if (!nd) throw new LoiNghiepVu("thieu_noi_dung", "Viết lời khen ngắn cho Con");
        await q(`insert into messages(id, family_id, child_id, parent_id, noi_dung) values ($1,$2,$3,$4,$5)`, [newId(), fam, id, bm.id, nd]);
        await ghiSuKien(fam, "loi_khen", { noi_dung: nd }, { con: id, nguoi: bm.id });
        return json({ ok: true });
      }
    }
    if (d === "ma-ghep" && post) return json({ ma: await gd.taoMaGhep(fam, b.con ? s(b.con, 40) : null, s(b.nen, 20)) });
    if (p[0] === "may" && p[2] === "go" && post) { await gd.goMay(fam, p[1], bm.id); return json({ ok: true }); }

    if (d === "nhiem-vu" && get) return json({ ds: await q(`select * from tasks where family_id = $1 order by created_at`, [fam]) });
    if (d === "nhiem-vu" && post) return json({ id: await nv.taoNv(fam, b, bm.id) });
    if (d === "nhiem-vu/mau" && post) return json({ taoMoi: await nv.apDungMau(fam, b.nhom === "teen" ? "teen" : "nhi") });
    if (p[0] === "nhiem-vu" && p[1] && p.length === 2 && post) { await nv.suaNv(fam, p[1], b); return json({ ok: true }); }

    if (d === "cho-duyet" && get) return json({ nhiemVu: await nv.choDuyet(fam), yeuCau: await yc.dsChoYc(fam) });
    if (p[0] === "luot" && p[1]) {
      if (p[2] === "duyet" && post) return json(await nv.duyet(fam, p[1], bm.id, { diem: b.diem === undefined ? undefined : Number(b.diem), loiKhen: s(b.loiKhen) }));
      if (p[2] === "tu-choi" && post) { await nv.tuChoi(fam, p[1], bm.id, s(b.lyDo), b.boSung === true); return json({ ok: true }); }
      if (p[2] === "anh" && get)
        return json({ anh: (await nv.anhBangChung(fam, p[1])).map((a) => ({ id: a.id, mime: a.mime, base64: Buffer.from(a.du_lieu).toString("base64"), chupLuc: a.chup_luc })) });
    }
    if (d === "duyet-hang-loat" && post) return json({ daDuyet: await nv.duyetHangLoat(fam, Array.isArray(b.ids) ? b.ids.map(String) : [], bm.id) });

    if (p[0] === "yeu-cau" && p[1]) {
      if (p[2] === "xem-truoc" && get) return json(await yc.xemTruocDongY(fam, p[1]));
      if (p[2] === "dong-y" && post) return json(await yc.dongY(fam, p[1], bm.id, b as yc.DongY));
      if (p[2] === "tu-choi" && post) { await yc.tuChoiYc(fam, p[1], bm.id, s(b.lyDo)); return json({ ok: true }); }
    }

    if (d === "qua" && get) return json({ ds: await q(`select * from rewards where family_id = $1 order by diem`, [fam]) });
    if (d === "qua" && post) return json({ id: await pt.taoQua(fam, b) });
    if (d === "qua/mau" && post) return json({ taoMoi: await pt.apDungMauQua(fam) });
    if (p[0] === "qua" && p[1] && p.length === 2 && post) { await pt.suaQua(fam, p[1], b); return json({ ok: true }); }
    if (p[0] === "phieu" && p[1] && p[2] === "xac-nhan" && post) { await pt.xacNhanPhieu(fam, p[1], bm.id); return json({ ok: true }); }
    if (p[0] === "phieu" && p[1] && p[2] === "huy" && post) { await pt.huyPhieu(fam, p[1], bm.id); return json({ ok: true }); }
    if (d === "phieu" && get)
      return json({ ds: await q(`select r.*, c.ten as ten_con from redemptions r join children c on c.id = r.child_id where c.family_id = $1 and r.trang_thai = 'giu' order by r.created_at`, [fam]) });
    if (d === "quy" && get)
      return json({ soDu: (await one<{ quy_voucher: number }>(`select quy_voucher from families where id = $1`, [fam]))!.quy_voucher,
        giaoDich: await q(`select so_tien, loai, ghi_chu, created_at from quy_gd where family_id = $1 order by created_at desc limit 50`, [fam]) });

    if (d === "luat" && get) return json({ ds: await la.dsLuat(fam), heThong: la.ALLOWLIST_HE_THONG });
    if (d === "luat" && post) return json({ muc: await la.datLuat(fam, { con: b.con ? s(b.con, 40) : "", muc: b.muc, ten: b.ten, loai: b.loai, nhom: b.nhom }) });

    if (d === "canh-bao" && get) return json({ ds: await dsCanhBao(fam) });
    if (p[0] === "canh-bao" && p[2] === "doc" && post) { await q(`update alerts set da_doc = true where id = $1 and family_id = $2`, [p[1], fam]); return json({ ok: true }); }
    if (d === "nhat-ky" && get) return json({ ds: await dsSuKien(fam, new URL(req.url).searchParams.get("con")) });
    if (d === "cau-hinh" && get) return json({ thamSo: thamSo((await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [fam]))!.cau_hinh) });
    if (d === "cau-hinh" && post) {
      const moi = sachCauHinh(b);
      await q(`update families set cau_hinh = cau_hinh || $2::text::jsonb where id = $1`, [fam, JSON.stringify(moi)]);
      await ghiSuKien(fam, "doi_cau_hinh", moi, { nguoi: bm.id });
      return json({ ok: true });
    }
    return loi("khong_co_duong", "Không có đường này", 404);
  } catch (e) {
    return batLoi(e);
  }
}
