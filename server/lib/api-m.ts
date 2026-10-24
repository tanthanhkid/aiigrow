// API app Ba Mẹ: /api/m/<đường> — Bearer = phiên Ba Mẹ. Hợp đồng: docs/API.md. Mọi ID Con / nhiệm vụ / yêu cầu đều kiểm thuộc gia đình
// của người gọi (lib/* trả «không thấy» như không tồn tại). Vai «xem» (Chỉ xem, FR-01.04) chỉ GET.
import { batLoi, docJson, json, loi } from "./api.ts";
import { docLog, nhanLog } from "./log-may.ts";
import { baMeGoi, bearer, dangKy, dangNhap, datLaiMatKhau, guiOtp, taoPhien, xoaPhien, type BaMe } from "./auth.ts";
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { lichCua, sachCauHinh, thamSo, khoaGoc, khoaDen, moTamDen } from "./cau-hinh.ts";
import * as gd from "./gia-dinh.ts";
import * as nv from "./nhiem-vu.ts";
import * as yc from "./yeu-cau.ts";
import * as pt from "./phan-thuong.ts";
import * as la from "./luat-app.ts";
import { dieuChinhTay, lichSu, tomTatVi } from "./vi.ts";
import { thanhTich } from "./thanh-tich.ts";
import { baoCaoTuan, homNay } from "./bao-cao.ts";
import { thoiGianManHinh } from "./man-hinh.ts";
import { khoaNgay } from "./may-con.ts";
import { dsCanhBao, dsSuKien, ghiSuKien } from "./nhat-ky.ts";
import { newId } from "./db.ts";
// M4b độ bền máy con (chỉ thêm): tuân thủ, mở khẩn cấp, gói cài một chạm, gỡ từ xa, cấu hình nền tảng, luật tầng mạng (TV)
import * as tt from "./tuan-thu.ts";
import { datCheDo, goMayAnToan, lenhGoTuXa, taoGoiCai } from "./lenh-may.ts";
import { cauHinhNenTangMay, luatMangCon } from "./nhip-may.ts";
// M4b kiểm soát mạng (chỉ thêm): hồ sơ DNS gia đình, máy con loại mạng (TV, console), nhật ký tóm tắt, hướng dẫn router / TV
import * as dns from "./dns-gia-dinh.ts";
// Giám sát + lọc web theo tên miền (Windows): thống kê, cho phép / chặn từng trang
import { datTrangWeb, thongKeWeb } from "./web.ts";
// Thành viên gia đình + thông báo trong app (chỉ thêm)
import * as gt from "./api-gia-dinh.ts";
import * as hta from "./ho-tro-admin.ts";
import { ghiKiemToan } from "./admin.ts";

const s = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);

async function chiTietCon(bm: BaMe, id: string) {
  const c = await gd.conCua(bm.family_id, id);
  const may = await q<gd.May>(`select * from devices where child_id = $1 or (dung_chung and family_id = $2) order by created_at`, [id, bm.family_id]);
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [bm.family_id]))!;
  return {
    id: c.id, ten: c.ten, namSinh: c.nam_sinh, avatar: c.avatar, nhom: c.nhom, coPin: true, khoaNgay: khoaGoc(c.cau_hinh), khoaDen: khoaDen(c.cau_hinh), moTamDen: moTamDen(c.cau_hinh),
    lich: lichCua(c.lich as never), thamSo: thamSo(f.cau_hinh, c.cau_hinh), ...(await tomTatVi(c.id)),
    may: may.map((m) => ({ id: m.id, ten: m.name, nen: m.platform, dungChung: m.dung_chung, baoVe: gd.mucBaoVe(m), baoVeThieu: gd.chiTietBaoVe(m).thieu, baoVeCau: gd.chiTietBaoVe(m).cau,
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
    { const r = await gt.xuLyMoiCongKhai(req, p); if (r) return r; }          // lời mời thành viên (không cần đăng nhập)
    // ---- cần đăng nhập
    const bm = await baMeGoi(req);
    if (!bm) return loi("chua_dang_nhap", "Phiên đăng nhập đã hết — đăng nhập lại nhé", 401);
    { const r = await gt.xuLyThongBao(req, bm, p); if (r) return r; }       // thông báo riêng từng Ba Mẹ (cả vai Chỉ xem)
    if (post && bm.vai === "xem" && d !== "dang-xuat") throw new LoiNghiepVu("chi_xem", "Tài khoản của Ba/Mẹ đang ở quyền Chỉ xem", 403);
    const fam = bm.family_id, b = post ? await docJson(req) : {};
    { const r = await gt.xuLyThanhVien(req, bm, p, b); if (r) return r; }   // thành viên gia đình (FR-01.04)
    if (d === "toi" && get) return json({ baMe: { id: bm.id, ten: bm.ten, dinhDanh: bm.dinh_danh, vai: bm.vai }, laAdmin: hta.laQuanTri(bm.id) });
    if (d === "dang-xuat" && post) { await xoaPhien(bearer(req)!); return json({ ok: true }); }

    if (d === "gia-dinh" && get) {
      // song song: mỗi câu SQL là một vòng mạng tới DB
      const [con, f, cho, ycCho, cb, phieuCho] = await Promise.all([gd.dsCon(fam),
        one<{ ten: string; quy_voucher: number }>(`select ten, quy_voucher from families where id = $1`, [fam]), nv.choDuyet(fam), yc.dsChoYc(fam), dsCanhBao(fam, true), pt.dsPhieuCho(fam)]);
      return json({ ten: f!.ten, quyVoucher: f!.quy_voucher, choDuyet: cho.length + ycCho.length + phieuCho.length,
        canhBao: cb.length,
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
      if (sau === "web" && get) return json(await thongKeWeb(fam, id, Number(new URL(req.url).searchParams.get("ngay")) || 7));
      if (sau === "web/trang" && post) {
        const r = await datTrangWeb(fam, b.caNha === true ? "" : id, b);
        await ghiSuKien(fam, "doi_luat_web", { muc: r.muc, trang_thai: r.trangThai }, { con: id, nguoi: bm.id });
        return json(r);
      }
      if (sau === "khoa" && post) { await khoaNgay(fam, id, b.khoa !== false, bm.id, b.den === "sang" ? "sang" : typeof b.den === "string" ? new Date(b.den) : null, new Date(),
        b.hoanTac === true); return json({ ok: true }); }
      if (sau === "diem" && post) return json({ soDu: await dieuChinhTay(fam, id, Number(b.delta), s(b.lyDo, 120), bm.id) });
      if (sau === "vi" && get) return json({ ...(await tomTatVi(id)), lichSu: await lichSu(id) });
      if (sau === "bao-cao" && get) return json(await baoCaoTuan(fam, id));
      if (sau === "man-hinh" && get) return json(await thoiGianManHinh(fam, id, Number(new URL(req.url).searchParams.get("lui")) || 0));
      if (sau === "thanh-tich" && get) return json(await thanhTich(id));
      // M6: mã liên kết AiiRob «<family_id>.<child_id>» Ba Mẹ dán vào AiiRob (webhook gửi lại giaDinh + con, xem lib/aiirob.ts)
      if (sau === "lien-ket-aiirob" && get) return json({ ma: `${fam}.${id}` });
      if (sau === "loi-khen" && post) {
        const nd = s(b.noiDung, 200);
        if (!nd) throw new LoiNghiepVu("thieu_noi_dung", "Viết lời khen ngắn cho Con");
        await q(`insert into messages(id, family_id, child_id, parent_id, noi_dung) values ($1,$2,$3,$4,$5)`, [newId(), fam, id, bm.id, nd]);
        await ghiSuKien(fam, "loi_khen", { noi_dung: nd }, { con: id, nguoi: bm.id });
        return json({ ok: true });
      }
    }
    if (d === "ma-ghep" && post) return json({ ma: await gd.taoMaGhep(fam, b.con ? s(b.con, 40) : null, s(b.nen, 20)) });
    // «Gỡ máy này» an toàn: chủ gia đình + mật khẩu; máy đã đồng bộ ⇒ lệnh gỡ (xoá khi agent báo xong) — lib/lenh-may.ts › goMayAnToan
    if (p[0] === "may" && p[2] === "go" && !p[3] && post) return json(await goMayAnToan(bm, p[1], b));
    // M4b
    if (d === "tuan-thu" && get) return json({ ds: await tt.dsTuanThu(fam) });
    if (d === "goi-cai" && post) return json(await taoGoiCai(fam, b, process.env.AIIGROW_APP_URL || new URL(req.url).origin, bm.id));
    if (p[0] === "may" && p[1]) {
      const sau = p.slice(2).join("/");
      // nhật ký agent máy con (đọc từ xa khi thử / hỗ trợ): ?gioiHan=200&muc=loi
      if (sau === "log" && get) { const sp = new URL(req.url).searchParams; return json(await docLog(fam, p[1], { gioiHan: sp.get("gioiHan"), muc: sp.get("muc") })); }
      if (sau === "tuan-thu" && get) return json(await tt.chiTietTuanThu(fam, p[1]));
      if (sau === "cau-hinh-nen-tang" && get) return json(await cauHinhNenTangMay(fam, p[1]));
      if (sau === "mo-khan-cap" && post) return json(await tt.moKhanCap(fam, p[1], b, bm.id));
      if (sau === "gan-con" && post) return json(await gd.ganConMay(fam, p[1], b.con, bm.id));
      if (sau === "mo-khan-cap/huy" && post) { await tt.huyMoKhanCap(fam, p[1], bm.id); return json({ ok: true }); }
      if (sau === "ma-offline" && get) {
        // Lấy mã = cấp quyền mở máy ⇒ chặn vai Chỉ xem (như các thao tác điều khiển POST ở trên).
        if (bm.vai === "xem") throw new LoiNghiepVu("chi_xem", "Tài khoản của Ba/Mẹ đang ở quyền Chỉ xem", 403);
        return json(await tt.maOfflineChoMay(fam, p[1], bm.id));
      }
      if (sau === "tai-khoan-tin-cay" && post) return json(await tt.tinCayAdmin(fam, p[1], b, bm.id));
      if (sau === "go-tu-xa" && post) return json(await lenhGoTuXa(bm, p[1], b.matKhau));
      // Giám sát / Chặn thật do Ba Mẹ chọn từ xa (vai Chỉ xem đã bị chặn ở trên cùng mọi POST)
      if (sau === "che-do" && post) return json(await datCheDo(fam, p[1], b, bm.id));
    }
    // M4b mạng
    if (d === "dns" && get) return json({ nhaCungCap: (await dns.nhaCungCap(fam)).loai, thietBi: await dns.dsThietBiDns(fam), huongDan: dns.huongDanMang() });
    if (d === "dns/huong-dan" && get) return json(dns.huongDanMang());
    if (d === "dns/nha-cung-cap" && post) return json(await dns.datNhaCungCap(fam, b, bm.id));
    if (d === "dns/thiet-bi" && post) return json({ id: await dns.themThietBiMang(fam, b, bm.id) });
    if (p[0] === "dns" && p[1] === "thiet-bi" && p[2]) {
      const sau = p.slice(3).join("/");
      if (sau === "ho-so" && get) return json(await dns.hoSoDnsThietBi(fam, p[2]));
      if (sau === "mobileconfig" && get) {
        const h = await dns.hoSoDnsThietBi(fam, p[2]);
        return new Response(h.apple.mobileconfig, { headers: { "content-type": "application/x-apple-aspen-config", "content-disposition": `attachment; filename="${h.apple.tep}"`, "cache-control": "no-store" } });
      }
      if (sau === "nhat-ky" && get) return json(await dns.tomTatNhatKy(fam, p[2], new URL(req.url).searchParams.get("ngay")));
      if (sau === "day" && post) return json(await dns.dayChinhSach(fam, p[2]));
      if (sau === "xoa" && post) { await dns.xoaThietBiMang(fam, p[2], bm.id); return json({ ok: true }); }
    }
    if (p[0] === "may" && p[1] && p[2] === "ho-so-dns" && get) {
      const mc = await one<gd.May>(`select * from devices where id = $1 and family_id = $2`, [p[1], fam]);
      if (!mc) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
      return json(await dns.hoSoDns(await dns.thietBiChoMay(mc)));
    }
    if (p[0] === "con" && p[1] && p[2] === "luat-mang" && get) {
      const sp = new URL(req.url).searchParams;
      return json(await luatMangCon(fam, p[1], { mac: sp.get("mac"), ten: sp.get("ten"), nen: sp.get("nen") }));
    }

    if (d === "nhiem-vu" && get) return json({ ds: await q(`select * from tasks where family_id = $1 order by created_at`, [fam]) });
    if (d === "nhiem-vu" && post) return json({ id: await nv.taoNv(fam, b, bm.id) });
    if (d === "nhiem-vu/mau" && post) return json({ taoMoi: await nv.apDungMau(fam, b.nhom === "teen" ? "teen" : "nhi") });
    if (p[0] === "nhiem-vu" && p[1] && p.length === 2 && post) { await nv.suaNv(fam, p[1], b); return json({ ok: true }); }

    if (d === "cho-duyet" && get) return json({ nhiemVu: await nv.choDuyet(fam), yeuCau: await yc.dsChoYc(fam), phieu: await pt.dsPhieuCho(fam), tuDong: await nv.tuDongHomNay(fam) });
    if (p[0] === "luot" && p[1]) {
      if (p.length === 2 && get) return json(await nv.chiTietLuot(fam, p[1]));
      if (p[2] === "hoan-tac" && post) { await nv.hoanTacDuyet(fam, p[1], bm.id); return json({ ok: true }); }
      if (p[2] === "duyet" && post) return json(await nv.duyet(fam, p[1], bm.id, { diem: b.diem === undefined ? undefined : Number(b.diem), loiKhen: s(b.loiKhen) }));
      if (p[2] === "tu-choi" && post) { await nv.tuChoi(fam, p[1], bm.id, s(b.lyDo), b.boSung === true); return json({ ok: true }); }
      if (p[2] === "anh" && get)
        return json({ anh: (await nv.anhBangChung(fam, p[1])).map((a) => ({ id: a.id, mime: a.mime, base64: Buffer.from(a.du_lieu).toString("base64"), chupLuc: a.chup_luc })) });
    }
    if (d === "duyet-hang-loat" && post) return json({ daDuyet: await nv.duyetHangLoat(fam, Array.isArray(b.ids) ? b.ids.map(String) : [], bm.id) });

    if (p[0] === "yeu-cau" && p[1]) {
      if (p.length === 2 && get) return json(await yc.chiTietYc(fam, p[1]));
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

    if (d === "luat" && get) {
      // «Chưa xếp»: mục máy Con đã gặp (phút dùng ghi loại chưa phân loại) mà gia đình chưa có luật
      const chuaXep = await q<{ muc: string; phut: number }>(
        `select u.muc, sum(u.phut)::int as phut from usage u join children c on c.id = u.child_id where c.family_id = $1 and u.loai = 'chua_phan_loai'
           and not exists (select 1 from app_rules r where r.family_id = $1 and r.muc = u.muc) group by u.muc order by phut desc limit 50`, [fam]);
      return json({ ds: await la.dsLuat(fam), heThong: la.allowlistHieuLuc(), chuaXep });
    }
    if (d === "luat" && post) return json({ muc: await la.datLuat(fam, { con: b.con ? s(b.con, 40) : "", muc: b.muc, ten: b.ten, loai: b.loai, nhom: b.nhom }) });

    if (p[0] === "admin" && p[1] === "ho-tro") {       // hộp thư hỗ trợ của AiiLab: chỉ Ba Mẹ có cờ admin
      if (!hta.laQuanTri(bm.id)) return loi("khong_du_quyen", "Tính năng này chỉ dành cho quản trị AiiLab", 403);
      if (p.length === 2 && get) return json({ ds: await hta.dsHoTro() });
      if (p.length === 3 && get) return json(await hta.chiTietHoTro(p[2]));
      if (p.length === 3 && post) {
        const doDai = await hta.traLoiHoTro(p[2], `admin-app:${bm.id}`, s(b.noiDung, 1000));
        await ghiKiemToan({ id: bm.id, vai: "admin-app" }, "tra_loi_ho_tro", { doDai, qua: "app" }, p[2]);
        return json({ ok: true });
      }
    }
    if (d === "ho-tro" && get)
      return json({ tin: await q(`select id, tu, noi_dung, created_at from ho_tro where family_id = $1 order by created_at, seq limit 200`, [fam]) });
    if (d === "ho-tro" && post) {
      const nd = s(b.noiDung, 1000);
      if (!nd) throw new LoiNghiepVu("thieu_noi_dung", "Viết tin nhắn trước khi gửi");
      await q(`insert into ho_tro(id, family_id, tu, nguoi, noi_dung) values ($1,$2,'ba_me',$3,$4)`, [newId(), fam, bm.id, nd]);
      return json({ ok: true });
    }
    if (d === "thanh-vien" && get)
      return json({ ds: await q(`select id, ten, vai, dinh_danh from parents where family_id = $1 order by created_at`, [fam]) });
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
