// API app Ba Mẹ: /api/m/<đường> — Bearer = phiên Ba Mẹ. Hợp đồng: docs/API.md. Mọi ID Con / nhiệm vụ / yêu cầu đều kiểm thuộc gia đình
// của người gọi (lib/* trả «không thấy» như không tồn tại). Quyền (L6, lib/quyen.ts): «Người trông giúp» GET hết, POST chỉ xem / duyệt / khoá máy.
import { batLoi, docJson, json, loi } from "./api.ts";
import { docLog, nhanLog } from "./log-may.ts";
import { baMeGoi, bearer, dangKy, dangNhap, datLaiMatKhau, guiOtp, hienDinhDanh, sha, TIEN_TO_FB, taoPhien, xoaPhien, type BaMe } from "./auth.ts";
import { one, q, tx } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { lichCua, sachCauHinh, thamSo, khoaGoc, khoaDen, moTamDen } from "./cau-hinh.ts";
import * as gd from "./gia-dinh.ts";
import * as nv from "./nhiem-vu.ts";
import * as yc from "./yeu-cau.ts";
import * as pt from "./phan-thuong.ts";
import * as la from "./luat-app.ts";
import { tenApp } from "./ten-app.ts";
import * as am from "./app-may.ts";
import { dungPhien } from "./phien.ts";
import { dieuChinhTay, lichSu, tomTatVi } from "./vi.ts";
import { thanhTich } from "./thanh-tich.ts";
import { baoCaoTuan, homNay } from "./bao-cao.ts";
import { thoiGianManHinh } from "./man-hinh.ts";
import { homNayDung } from "./hom-nay-dung.ts";
import { nhatKyCaNha } from "./nhat-ky-ca-nha.ts";
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
import { xoaTaiKhoan } from "./xoa-tai-khoan.ts";
// 14/11: xoá hồ sơ Con · khoá riêng một máy · «Trao luôn» quà Ba Mẹ mua
import { xoaCon } from "./xoa-con.ts";
import { khoaMay, trangThaiKhoaMay } from "./khoa-may.ts";
import { traoLuon } from "./phan-thuong.ts";
import { cauHinhMxh, dangNhapMxh, datMatKhauMxh, doiMatKhau, lienKetMxh } from "./dang-nhap-mxh.ts";
// S2 thiết kế 05/11 (L4–L8): quyền 2 mức, chế độ chặn theo Con, thiết lập lần đầu, phiên ghép máy
import { baMeTuToken } from "./auth.ts";
import { laChuNha, quyenCua, trongGiupDuoc, vaiCu } from "./quyen.ts";
import { doiTenToi, loiMoiChoToi } from "./thanh-vien.ts";
import { datAppChoPhep, datCheDoChan, luoiApp, TEN_CHE_DO_CHAN, WEB_CAM } from "./che-do-chan.ts";
import { cheDoChanCua } from "./chan-co-ban.ts";
import { thietLapLanDau, tomTatThietLap, webLanDau } from "./thiet-lap.ts";
import { taoPhienGhep, trangThaiGhep } from "./ghep-may.ts";
// Thiết kế chốt 05/11 (S1): sao, quỹ giờ chơi, nhiệm vụ theo bộ, làm lại, quà trao tay — lib/api-sao.ts
import { xuLyMSao } from "./api-sao.ts";
// S3 thiết kế 06/11 (L13 L14 L19): PIN theo bé, quà bảng giá, mã mở máy, chuông «Cần Ba Mẹ để ý» — lib/api-s3.ts
import { xuLyMS3 } from "./api-s3.ts";
import { canDeY, mayMatMang } from "./can-de-y.ts";
import { baMeDen } from "./pin-be.ts";
import { baoThayDoi } from "./cho-thay-doi.ts";

const s = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
/** `den` của con/:id/khoa và may/:id/khoa: "sang" | ISO | không có (không hạn) — kiểm ở may-con.ts › hanKhoa. */
const hanTuBody = (den: unknown): Date | "sang" | null => (den === "sang" ? "sang" : typeof den === "string" ? new Date(den) : null);

async function chiTietCon(bm: BaMe, id: string) {
  const c = await gd.conCua(bm.family_id, id);
  const may = await q<gd.May>(`select * from devices where child_id = $1 or (dung_chung and family_id = $2) order by created_at`, [id, bm.family_id]);
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [bm.family_id]))!;
  const matMang = new Set((await mayMatMang(bm.family_id)).map((x) => x.mayId));
  // «bé đang dùng» chỉ khi phiên Con của bé trên máy còn hạn (như api-may.ts / pin-be.ts › hoSoMay)
  const conPhien = new Set((await q<{ d: string }>(`select distinct k.device_id || ':' || k.child_id as d from kid_sessions k
      where k.device_id = any($1::text[]) and k.expires_at > now()`, [may.map((m) => m.id)])).map((x) => x.d));
  return {
    // coPin + pinDatLuc: 06/11 L13 (PIN theo bé — đảo L5); xem PIN ở GET con/:id/pin. cheDoChan: L4.
    id: c.id, ten: c.ten, namSinh: c.nam_sinh, avatar: c.avatar, nhom: c.nhom, coPin: !!c.pin_ma,
    pinDatLuc: c.pin_dat_luc ? new Date(c.pin_dat_luc).toISOString() : null,
    cheDoChan: cheDoChanCua((c as { che_do_chan?: unknown }).che_do_chan), khoaNgay: khoaGoc(c.cau_hinh), khoaDen: khoaDen(c.cau_hinh), moTamDen: moTamDen(c.cau_hinh),
    lich: lichCua(c.lich as never), thamSo: thamSo(f.cau_hinh, c.cau_hinh), ...(await tomTatVi(c.id)),
    may: may.map((m) => ({ id: m.id, ten: m.name, nen: m.platform, dungChung: m.dung_chung, baoVe: gd.mucBaoVe(m), baoVeThieu: gd.chiTietBaoVe(m).thieu, baoVeCau: gd.chiTietBaoVe(m).cau,
      lanCuoi: m.last_seen ? new Date(m.last_seen).toISOString() : null,
      truc: !!m.last_seen && Date.now() - new Date(m.last_seen).getTime() < 3 * 60_000, lechGiay: m.status?.lechGiay ?? null,
      // 06/11 (L13, L19): ai đang dùng máy dùng chung · Ba Mẹ đang dùng tới · máy mất mạng hôm nay
      dangDung: m.con_dang_dung && conPhien.has(`${m.id}:${m.con_dang_dung}`) ? m.con_dang_dung : null, baMeDungDen: baMeDen(m)?.toISOString() ?? null,
      matMang: matMang.has(m.id),
      // 14/11: khoá riêng máy này (lib/khoa-may.ts) — {khoa, den}
      khoaMay: trangThaiKhoaMay(m.khoa_may) })),
  };
}

/** Mọi lời gọi ghi (POST) của Ba Mẹ ⇒ tăng phiên bản gia đình + đánh thức máy Con đang chờ (lib/cho-thay-doi.ts): máy áp trong ≤5 giây. */
export async function xuLyM(req: Request, p: string[]): Promise<Response> {
  const ngu: { fam?: string } = {};
  const kq = await xuLyMTrong(req, p, ngu);
  if (ngu.fam && kq.status < 400) await baoThayDoi(ngu.fam);   // chỉ khi ghi thành công (lỗi 4xx/5xx không đánh thức máy Con)
  return kq;
}

async function xuLyMTrong(req: Request, p: string[], ngu: { fam?: string }): Promise<Response> {
  try {
    const get = req.method === "GET", post = req.method === "POST";
    const d = p.join("/");
    // ---- không cần đăng nhập
    if (d === "otp" && post) { const b = await docJson(req); return json(await guiOtp(b.dinhDanh, b.mucDich === "quen_mk" ? "quen_mk" : "dang_ky")); }
    // L6/L7: đăng ký / đăng nhập trả kèm lời mời đang chờ gửi tới đúng SĐT / email này ⇒ app rẽ nhánh «Vào nhà cùng …» (không tạo Con)
    if ((d === "dang-ky" || d === "dang-nhap") && post) {
      const b = await docJson(req);
      const token = await taoPhien(d === "dang-ky" ? await dangKy(b) : await dangNhap(b.dinhDanh, b.matKhau));
      const toi = await baMeTuToken(token);
      return json({ token, ...(d === "dang-ky" ? { moi: true } : {}), loiMoi: toi ? await loiMoiChoToi(toi) : [] });
    }
    // Đăng nhập Google / Facebook (lib/dang-nhap-mxh.ts, docs/OAUTH.md): app hỏi trước nút nào bật; trả như đăng nhập thường + `moi` khi vừa tạo nhà
    if (d === "cau-hinh-dang-nhap" && get) return json(cauHinhMxh());
    if ((d === "dang-nhap/google" || d === "dang-nhap/facebook") && post) {
      const { id, moi } = await dangNhapMxh(p[1] as "google" | "facebook", await docJson(req), gd.nguonGoi(req.headers));
      const token = await taoPhien(id);
      const toi = await baMeTuToken(token);
      return json({ token, ...(moi ? { moi: true } : {}), loiMoi: toi ? await loiMoiChoToi(toi) : [] });
    }
    if (d === "quen-mat-khau" && post) { const b = await docJson(req); await datLaiMatKhau(b.dinhDanh, b.ma, b.matKhauMoi); return json({ ok: true }); }
    { const r = await gt.xuLyMoiCongKhai(req, p); if (r) return r; }          // lời mời thành viên (không cần đăng nhập)
    // ---- cần đăng nhập
    const bm = await baMeGoi(req);
    if (!bm) return loi("chua_dang_nhap", "Phiên đăng nhập đã hết — đăng nhập lại nhé", 401);
    { const r = await gt.xuLyThongBao(req, bm, p); if (r) return r; }       // thông báo riêng từng Ba Mẹ (cả vai Chỉ xem)
    // Xoá tài khoản (Apple 5.1.1(v)): mọi vai, kể cả Chỉ xem — lib/xoa-tai-khoan.ts
    if (d === "dat-mat-khau" && post) { await datMatKhauMxh(bm, await docJson(req), gd.nguonGoi(req.headers)); return json({ ok: true }); }   // tài khoản Google / Facebook đặt mật khẩu lần đầu
    // Gắn Google / Facebook vào CHÍNH tài khoản đang đăng nhập (không gắn theo email) — dang-nhap-mxh.ts › lienKetMxh
    if ((d === "lien-ket/google" || d === "lien-ket/facebook") && post)
      return json(await lienKetMxh(bm, p[1] as "google" | "facebook", await docJson(req), gd.nguonGoi(req.headers)));
    if (d === "xoa-tai-khoan" && post) return json(await xoaTaiKhoan(bm, await docJson(req)));
    // «Tài khoản của bạn» (thiết kế 14/11 bm-ca-nha/08–09): đổi tên hiển thị · đổi mật khẩu — mọi vai (việc của riêng mình)
    if (d === "toi/ten" && post) return json(await doiTenToi(bm, (await docJson(req)).ten));
    if (d === "doi-mat-khau" && post) return json(await doiMatKhau(bm, await docJson(req), (() => { const t = bearer(req); return t ? sha(t) : null; })()));
    // L6: Người trông giúp — POST chỉ các việc xem / duyệt / khoá máy (lib/quyen.ts › trongGiupDuoc); còn lại là đổi cài đặt.
    if (post && quyenCua(bm) === "trong_giup" && !trongGiupDuoc(p))
      throw new LoiNghiepVu("chi_xem", "Người trông giúp xem, duyệt và khoá máy được — đổi cài đặt thì nhờ Ba Mẹ nhé", 403);
    const fam = bm.family_id, b = post ? await docJson(req) : {};
    if (post && !["thong-bao", "dang-xuat", "dat-mat-khau", "xoa-tai-khoan"].includes(p[0])) ngu.fam = fam;
    { const r = await gt.xuLyThanhVien(req, bm, p, b); if (r) return r; }   // thành viên gia đình (FR-01.04)
    { const r = await xuLyMS3(bm, req, p, b); if (r) return r; }            // 06/11: PIN theo bé, quà bảng giá, chuông
    { const r = await xuLyMSao(bm, req, p, b); if (r) return r; }           // 05/11: sao, quỹ giờ chơi, bộ nhiệm vụ, làm lại, trao quà
    if (d === "toi" && get) return json({ baMe: { id: bm.id, ten: bm.ten, dinhDanh: hienDinhDanh(bm.dinh_danh), laFacebook: bm.dinh_danh.startsWith(TIEN_TO_FB), vai: vaiCu(bm), quyen: quyenCua(bm), laChuNha: laChuNha(bm),
      coMatKhau: bm.co_mat_khau !== false },
      laAdmin: hta.laQuanTri(bm.id) });
    if (d === "dang-xuat" && post) { await xoaPhien(bearer(req)!); return json({ ok: true }); }

    if (d === "gia-dinh" && get) {
      // song song: mỗi câu SQL là một vòng mạng tới DB
      const [con, f, cho, ycCho, cb, phieuCho, mm] = await Promise.all([gd.dsCon(fam),
        one<{ ten: string; quy_voucher: number }>(`select ten, quy_voucher from families where id = $1`, [fam]), nv.choDuyet(fam), yc.dsChoYc(fam), dsCanhBao(fam, true), pt.dsPhieuCho(fam),
        mayMatMang(fam)]);
      const cdy = await canDeY(fam, new Date(), { yc: ycCho, nv: cho, mm });
      // 06/11 (L19): soChuong = số mục «Cần Ba Mẹ để ý» (lib/can-de-y.ts) · con[].matMang = máy của Con mất mạng hôm nay (dòng «Máy mất mạng · Laptop»)
      return json({ ten: f!.ten, quyVoucher: f!.quy_voucher, choDuyet: cho.length + ycCho.length + phieuCho.length,
        canhBao: cb.length, soChuong: cdy.soChuong,
        con: await Promise.all(con.map(async (c) => ({ id: c.id, ten: c.ten, avatar: c.avatar, nhom: c.nhom, ...(await homNay(fam, c.id)),
          coPin: !!c.pin_ma,
          matMang: mm.filter((x) => x.conId === c.id).map((x) => ({ mayId: x.mayId, ten: x.ten, nen: x.nen, tu: x.tu, phut: x.phut })) }))) });
    }
    if (d === "con" && post) return json({ id: await gd.taoCon(fam, b, bm.id) });
    if (p[0] === "con" && p[1]) {
      const id = p[1], sau = p.slice(2).join("/");
      if (!sau && get) return json(await chiTietCon(bm, id));
      await gd.conCua(fam, id);
      if (sau === "sua" && post) { await gd.suaCon(fam, id, b, bm.id); return json({ ok: true }); }
      // 14/11: xoá hồ sơ Con (chỉ quyền Ba Mẹ — trongGiupDuoc không có) — lib/xoa-con.ts
      if (sau === "xoa" && post) return json(await xoaCon(fam, id, b, bm.id));
      // L4: chế độ chặn theo Con (Mở hết / Chặn app & web) · app được phép (lưới gợi ý + «Thêm app khác» theo tên)
      if (sau === "che-do-chan" && post) return json(await datCheDoChan(fam, id, b.cheDo ?? b.cheDoChan, bm.id));
      if (sau === "app-cho-phep" && post) return json(await tx((t) => datAppChoPhep(fam, id, b.apps, bm.id, t)));
      if (sau === "thiet-lap" && get) return json(await tomTatThietLap(fam, id));
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
      if (sau === "khoa" && post) { await khoaNgay(fam, id, b.khoa !== false, bm.id, hanTuBody(b.den), new Date(),
        b.hoanTac === true); return json({ ok: true }); }
      if (sau === "diem" && post) return json({ soDu: await dieuChinhTay(fam, id, Number(b.delta), s(b.lyDo, 120), bm.id) });
      if (sau === "vi" && get) return json({ ...(await tomTatVi(id)), lichSu: await lichSu(id) });
      if (sau === "bao-cao" && get) return json(await baoCaoTuan(fam, id, new Date(), new URL(req.url).searchParams.get("bay") === "1"));
      // 14/11: «<Con> đã dùng gì» hôm nay — app/trang + giờ bắt đầu + máy + Chơi/Học, bị chặn hôm nay (lib/hom-nay-dung.ts)
      if (sau === "hom-nay" && get) return json(await homNayDung(fam, id));
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
    // L8: mã 6 số hạn 10 phút; `nen` bỏ trống = không gắn loại máy. Đường đủ (mã + link bộ cài + QR + chia sẻ): POST ghep-may.
    if (d === "ma-ghep" && post) return json({ ma: await gd.taoMaGhep(fam, b.con ? s(b.con, 40) : null, s(b.nen, 20), { nguoi: bm.id }), hanPhut: gd.MA_GHEP_PHUT });
    if (d === "ghep-may" && post) return json(await taoPhienGhep(fam, b, process.env.AIIGROW_APP_URL || new URL(req.url).origin, bm.id));
    if (p[0] === "ghep-may" && p[1] && p.length === 2 && get) return json(await trangThaiGhep(fam, p[1]));
    // L7: thiết lập lần đầu (tên Con + giờ chơi + giờ ngủ + chế độ chặn + app) · lưới app gợi ý · nhóm web luôn chặn
    if (d === "thiet-lap" && post) return json(await thietLapLanDau(fam, b, bm.id));
    // Lần đầu «Thêm web»: kiểm một địa chỉ Ba Mẹ dán TRƯỚC khi thêm (cùng luật với thiet-lap › web) ⇒ {muc} hoặc ten_mien_sai / web_cam
    if (d === "thiet-lap/kiem-web" && post) return json({ muc: webLanDau([b.muc])[0].muc });
    if (d === "app-goi-y" && get) return json(await luoiApp(fam, new URL(req.url).searchParams.get("con")));
    if (d === "luon-chan" && get) return json({ nhom: Object.entries(WEB_CAM).map(([ma, n]) => ({ ma, ten: n.ten, soTrang: n.mien.length })),
      cheDo: Object.entries(TEN_CHE_DO_CHAN).map(([ma, ten]) => ({ ma, ten })) });
    // «Gỡ máy này» an toàn: chủ gia đình + mật khẩu; máy đã đồng bộ ⇒ lệnh gỡ (xoá khi agent báo xong) — lib/lenh-may.ts › goMayAnToan
    if (p[0] === "may" && p[2] === "go" && !p[3] && post) return json(await goMayAnToan(bm, p[1], b));
    // M4b
    if (d === "tuan-thu" && get) return json({ ds: await tt.dsTuanThu(fam, new Date(), { nhe: new URL(req.url).searchParams.get("nhe") === "1" }) });
    if (d === "goi-cai" && post) return json(await taoGoiCai(fam, b, process.env.AIIGROW_APP_URL || new URL(req.url).origin, bm.id));
    if (p[0] === "may" && p[1]) {
      const sau = p.slice(2).join("/");
      // nhật ký agent máy con (đọc từ xa khi thử / hỗ trợ): ?gioiHan=200&muc=loi
      if (sau === "log" && get) { const sp = new URL(req.url).searchParams; return json(await docLog(fam, p[1], { gioiHan: sp.get("gioiHan"), muc: sp.get("muc") })); }
      if (sau === "tuan-thu" && get) return json(await tt.chiTietTuanThu(fam, p[1]));
      if (sau === "cau-hinh-nen-tang" && get) return json(await cauHinhNenTangMay(fam, p[1]));
      if (sau === "mo-khan-cap" && post) return json(await tt.moKhanCap(fam, p[1], b, bm.id));
      if (sau === "doi-ten" && post) return json(await gd.doiTenMay(fam, p[1], b.ten, bm.id));
      // 14/11 «Khoá riêng máy này»: {khoa, den?: "sang" | ISO} — Người trông giúp được (khoá máy) — lib/khoa-may.ts
      if (sau === "khoa" && post)
        return json(await khoaMay(fam, p[1], b.khoa !== false, bm.id, hanTuBody(b.den)));
      if (sau === "gan-con" && post) return json(await gd.ganConMay(fam, p[1], b.con, bm.id));
      if (sau === "mo-khan-cap/huy" && post) { await tt.huyMoKhanCap(fam, p[1], bm.id); return json({ ok: true }); }
      // L6: Người trông giúp được duyệt lời xin (mở máy) ⇒ cũng được đọc mã mở offline cho Con lúc máy mất mạng
      if (sau === "ma-offline" && get) return json(await tt.maOfflineChoMay(fam, p[1], bm.id, new Date(), new URL(req.url).searchParams.get("phut") ?? 60));
      // màn mã dò «đã mở bằng mã» — đường nhẹ, chỉ sự kiện mới sau `sau` (docs/API.md «S3» › Mã mở máy)
      if (sau === "mo-bang-ma" && get) return json(await tt.moBangMaSau(fam, p[1], new URL(req.url).searchParams.get("sau")));
      if (sau === "tai-khoan-tin-cay" && post) return json(await tt.tinCayAdmin(fam, p[1], b, bm.id));
      if (sau === "go-tu-xa" && post) return json(await lenhGoTuXa(bm, p[1], b.matKhau));
      // Thiết kế 05/11: máy luôn chặn thật — chỉ còn nhận «chan» (giam-sat ⇒ 409 che_do_bo); mức chặn đổi ở con/:id/che-do-chan
      if (sau === "che-do" && post) return json(await datCheDo(fam, p[1], b, bm.id));
      // Danh sách app ĐÃ CÀI THẬT trên máy (agent gửi) — Ba Mẹ xếp / chặn đúng app của máy (lib/app-may.ts)
      if (sau === "ung-dung" && get) return json(await am.dsAppMay(fam, p[1]));
      if (sau === "ung-dung/lam-moi" && post) return json(await am.yeuCauLamMoi(fam, p[1]));
      if (sau === "ung-dung/dat" && post) {
        const kq = await am.datTrangThaiApp(fam, p[1], b);
        if (b.trangThai !== "bo") await ghiSuKien(fam, "dat_luat_app", { muc: kq.muc, loai: b.trangThai, con: kq.con || null, may: p[1] }, { nguoi: bm.id });
        else if (kq.truoc) await ghiSuKien(fam, "xoa_luat_app", { muc: kq.muc }, { nguoi: bm.id });
        return json(kq);
      }
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
      if (p[2] === "mo-lai" && post) return json(await yc.moLaiYc(fam, p[1], bm.id));
    }

    if (d === "qua" && get) return json({ ds: await q(`select * from rewards where family_id = $1 order by diem`, [fam]) });
    if (d === "qua" && post) return json({ id: await pt.taoQua(fam, b) });
    if (d === "qua/mau" && post) return json({ taoMoi: await pt.apDungMauQua(fam) });
    if (p[0] === "qua" && p[1] && p.length === 2 && post) { await pt.suaQua(fam, p[1], b); return json({ ok: true }); }
    // 14/11 «Trao luôn cho <Con>» (quà Ba Mẹ mua): trao ngay, không trừ sao — {con} ⇒ {phieu, trangThai, voucher?, phut?, saoTru: 0} (phan-thuong.ts › traoLuon)
    if (p[0] === "qua" && p[1] && p[2] === "trao-luon" && p.length === 3 && post) return json({ ok: true, ...(await traoLuon(fam, p[1], s(b.con, 40), bm.id)) });
    if (p[0] === "phieu" && p[1] && p[2] === "xac-nhan" && post) return json({ ok: true, ...(await pt.xacNhanPhieu(fam, p[1], bm.id)) });   // 06/11: kèm voucher {ma, qr, hetHan}
    if (p[0] === "phieu" && p[1] && p[2] === "huy" && post) { await pt.huyPhieu(fam, p[1], bm.id); return json({ ok: true }); }
    if (d === "phieu" && get)
      return json({ ds: await pt.dsPhieuCho(fam) });
    if (d === "quy" && get)
      return json({ soDu: (await one<{ quy_voucher: number }>(`select quy_voucher from families where id = $1`, [fam]))!.quy_voucher,
        giaoDich: await q(`select so_tien, loai, ghi_chu, created_at from quy_gd where family_id = $1 order by created_at desc limit 50`, [fam]) });

    if (d === "luat" && get) {
      // «Chưa xếp»: mục máy Con gặp trong 30 ngày (phút dùng ghi loại chưa phân loại) mà VẪN chưa có luật hiệu lực cho chính Con đó —
      // so như phanLoai: luật cả nhà hoặc riêng Con đó, khớp cả tên miền cha (m.youtube.com ⇐ youtube.com), luật hết hạn không tính.
      const ds = await la.dsLuat(fam);
      const daCo = new Set(ds.map((r) => `${r.child_id}|${r.muc}`));        // '' = cả nhà
      const coLuat = (muc: string, con: string) => la.khoaSo(muc).some((k) => daCo.has(`|${k}`) || daCo.has(`${con}|${k}`));
      const chuaTheoCon = await q<{ muc: string; child_id: string; phut: number }>(
        // SQL bỏ trước mục đã có luật khớp ĐÚNG tên (phần lớn) rồi mới gom; JS chỉ còn kiểm tên miền cha + allowlist trên ≤ 500 dòng
        `select u.muc, u.child_id, sum(u.phut)::int as phut from usage u join children c on c.id = u.child_id where c.family_id = $1 and u.loai = 'chua_phan_loai'
           and u.ngay >= to_char(now() - interval '30 days', 'YYYY-MM-DD')
           and not exists (select 1 from app_rules r where r.family_id = $1 and r.muc = u.muc and r.child_id in ('', u.child_id) and (r.het is null or r.het > now()))
         group by u.muc, u.child_id order by phut desc limit 500`, [fam]);
      const gop = new Map<string, number>();
      const he = la.allowlistHieuLuc();                                       // mục Admin thêm vào hệ thống sau khi đã ghi usage: không còn «chờ xếp»
      for (const x of chuaTheoCon) if (!coLuat(x.muc, x.child_id) && !la.khoaSo(x.muc).some((k) => he.includes(k))) gop.set(x.muc, (gop.get(x.muc) ?? 0) + x.phut);
      const chuaXep = [...gop].map(([muc, phut]) => ({ muc, phut })).sort((a, b) => b.phut - a.phut).slice(0, 50);
      // «Đã thấy trên máy Con» (30 ngày) để Ba Mẹ CHỌN thay vì gõ tên tệp (DX-028): tên dễ hiểu + loại hiện tại; mục hệ thống không liệt kê
      // Chỉ màn Ứng dụng cần (`?thay=1`): Trang chủ / Chờ duyệt chỉ đọc chuaXep + ds, khỏi gộp 30 ngày usage mỗi lần tải.
      const canThay = new URL(req.url).searchParams.get("thay") === "1";
      const thay = !canThay ? [] : await q<{ muc: string; phut: number }>(
        `select u.muc, sum(u.phut)::int as phut from usage u join children c on c.id = u.child_id where c.family_id = $1 and u.loai <> 'he_thong'
           and u.ngay >= to_char(now() - interval '30 days', 'YYYY-MM-DD') group by u.muc order by phut desc limit 100`, [fam]);   // bỏ mục hệ thống TRƯỚC limit
      // «loại hiện tại» = luật CẢ NHÀ lâu dài, khớp cụ thể nhất (như phanLoai: mục dài hơn thắng). Luật riêng một Con / có hạn (Lần này, Hôm nay) không tính.
      const caNha = ds.filter((r) => !r.child_id && !r.het);
      const loaiCaNha = (muc: string) => caNha.filter((r) => la.khoaSo(muc).includes(r.muc)).sort((a, b) => b.muc.length - a.muc.length)[0]?.loai ?? "chua_xep";
      // tên THẬT agent gửi trong danh sách app của máy (lib/app-may.ts) thắng tên đoán từ tệp
      const tenThat = await am.tenAppThat(fam);
      const ten = (muc: string) => tenThat.get(muc) ?? tenApp(muc);
      const daThay = thay.filter((x) => !la.khoaSo(x.muc).some((k) => he.includes(k)))
        .map((x) => ({ muc: x.muc, ten: ten(x.muc), phut: x.phut, loai: loaiCaNha(x.muc) }));
      return json({ ds, heThong: he, chuaXep: chuaXep.map((x) => ({ ...x, ten: ten(x.muc) })), ...(canThay ? { daThay } : {}) });
    }
    // Thẻ «Đang chơi» ở Trang chủ: phiên giải trí đang chạy / tạm của cả nhà (Con, máy, app, phút còn lại). «Dừng» = như Khoá ngay một phiên.
    if (d === "phien-dang" && get) {
      const r = await q<{ id: string; child_id: string; ten_con: string; muc: string; may: string | null; toi_da_phut: number; phut_dung: number; trang_thai: string }>(
        `select p.id, p.child_id, c.ten as ten_con, p.muc, d.name as may, p.toi_da_phut, p.phut_dung, p.trang_thai
           from play_sessions p join children c on c.id = p.child_id left join devices d on d.id = p.device_id
          where c.family_id = $1 and p.trang_thai in ('chay', 'tam') and p.nhip_cuoi > now() - interval '15 minutes' order by p.bat_dau`, [fam]);
      // phiên mất nhịp > 15 phút (máy ngủ / mất mạng) không phải «đang chơi»: không hiện thẻ đứng hình hàng giờ
      return json({ ds: r.map((x) => ({ id: x.id, con: x.child_id, tenCon: x.ten_con, may: x.may, muc: x.muc, tenApp: tenApp(x.muc), tam: x.trang_thai === "tam",
        conPhut: Math.max(0, Math.ceil(x.toi_da_phut - x.phut_dung)) })) });
    }
    if (p[0] === "phien" && p[1] && p[2] === "dung" && post) {
      const ph = await one<{ child_id: string; trang_thai: string }>(`select p.child_id, p.trang_thai from play_sessions p join children c on c.id = p.child_id where p.id = $1 and c.family_id = $2`, [p[1], fam]);
      if (!ph) return loi("khong_thay", "Không thấy phiên chơi", 404);
      // thẻ cũ (phiên đã kết thúc vì Con dừng / hết giờ…) ⇒ nói thật, không báo «Đã dừng» mà không có giờ nghỉ nào
      if (ph.trang_thai === "ket_thuc") return loi("da_ket_thuc", "Phiên chơi này đã kết thúc rồi", 409);
      if (!(await dungPhien(ph.child_id, p[1], "ba_me_khoa", new Date(), { nghi: true, nguoi: bm.id })))   // phiên vừa tự kết thúc trong lúc dừng
        return loi("da_ket_thuc", "Phiên chơi này đã kết thúc rồi", 409);   // Con nghỉ nghi_giua phút; tính nốt phút như mọi đường dừng khác (≤ 2 phút/nhịp)
      return json({ ok: true });
    }
    if (d === "luat" && post) {
      // `truoc` = luật cũ của đúng (Con, mục) — app gửi lại nó (hoặc gọi luat/xoa nếu null) để «Hoàn tác»
      const con = b.con ? s(b.con, 40) : "";
      const het = b.het ? new Date(String(b.het)) : null;               // chỉ khi Hoàn tác khôi phục một luật có hạn
      if (het && isNaN(+het)) return loi("het_sai", "Hạn của luật không hợp lệ", 400);   // không lặng lẽ biến luật có hạn thành vĩnh viễn
      // Đọc luật cũ + ghi trong MỘT giao dịch, khoá dòng: Hoàn tác (`neuLoai`) chỉ khôi phục khi luật vẫn đúng loại vừa đặt —
      // người khác đổi trong lúc đó thì không đè (kiểm và ghi không bị chen giữa)
      const kq = await tx(async (t) => {
        const truoc = await la.luatHienCo(fam, con, b.muc, t, true);
        if (b.neuLoai !== undefined && truoc?.loai !== b.neuLoai) return null;
        return { muc: await la.datLuat(fam, { con, muc: b.muc, ten: b.ten, loai: b.loai, nhom: b.nhom, het }, t), truoc };
      });
      if (!kq) return loi("da_doi", "Luật này vừa được đổi ở nơi khác — không hoàn tác nữa", 409);
      const { muc, truoc } = kq;
      await ghiSuKien(fam, "dat_luat_app", { muc, loai: b.loai, con: con || null, hoan_tac: b.neuLoai !== undefined }, { nguoi: bm.id });
      return json({ muc, truoc: truoc && { con, muc: truoc.muc, ten: truoc.ten, loai: truoc.loai, nhom: truoc.nhom, het: truoc.het } });
    }
    if (d === "luat/xoa" && post) {
      const con = b.con ? s(b.con, 40) : "";
      const muc = await tx(async (t) => {
        if (b.neuLoai !== undefined && (await la.luatHienCo(fam, con, b.muc, t, true))?.loai !== b.neuLoai) return null;
        return la.xoaLuat(fam, { con, muc: b.muc }, t);
      });
      if (!muc) return loi("da_doi", "Luật này vừa được đổi ở nơi khác — không hoàn tác nữa", 409);
      await ghiSuKien(fam, "xoa_luat_app", { muc }, { nguoi: bm.id });
      return json({ muc });
    }

    if (p[0] === "admin" && p[1] === "ho-tro") {       // hộp thư hỗ trợ của AiiLab: chỉ Ba Mẹ có cờ admin
      if (!hta.laQuanTri(bm.id)) return loi("khong_du_quyen", "Tính năng này chỉ dành cho quản trị AiiLab", 403);
      // 14/11 (bm-cai-dat/13): ?loc=cho|da_tra_loi|cua_toi ⇒ {ds[+nguoi_gui, cho_tu, cho_phut, gap, nguoi_tra_loi, cua_toi], soCho, soGap}
      if (p.length === 2 && get) return json(await hta.dsHoTro({ loc: new URL(req.url).searchParams.get("loc"), toi: `admin-app:${bm.id}` }));
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
    if (d === "thanh-vien" && get)       // (đường này đã do api-gia-dinh.ts trả trước; giữ phòng khi thứ tự đổi)
      return json({ ds: (await q<{ dinh_danh: string }>(`select id, ten, vai, dinh_danh from parents where family_id = $1 and vai <> 'roi' order by created_at`, [fam]))
        .map((x) => ({ ...x, dinh_danh: hienDinhDanh(x.dinh_danh), laFacebook: x.dinh_danh.startsWith(TIEN_TO_FB) })) });
    if (d === "canh-bao" && get) return json({ ds: await dsCanhBao(fam) });
    if (p[0] === "canh-bao" && p[2] === "doc" && post) { await q(`update alerts set da_doc = true where id = $1 and family_id = $2`, [p[1], fam]); return json({ ok: true }); }
    // 14/11 «Nhật ký cả nhà»: ?ca-nha=1 [&con=&ngay=7] ⇒ câu đời thường + «cho ngoài quy tắc» (lib/nhat-ky-ca-nha.ts); không có ⇒ sự kiện thô như cũ
    if (d === "nhat-ky" && get) {
      const u = new URL(req.url).searchParams;
      if (u.get("ca-nha") === "1") return json(await nhatKyCaNha(fam, { con: u.get("con") || null, ngay: Number(u.get("ngay")) || 7 }));
      return json({ ds: await dsSuKien(fam, u.get("con")) });
    }
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
