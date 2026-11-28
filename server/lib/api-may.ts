// API agent thiết bị Con: /api/device/<đường>. Bearer = token thiết bị (ghép bằng mã 6 số). Token thiết bị KHÔNG gọi được API Ba Mẹ
// (khác bảng, khác hàm kiểm) — không có lệnh «mở khoá» hay «cộng điểm» nào ở đây: điểm, phiên, phê duyệt chỉ máy chủ quyết.
import { coTacTu } from "./chuyen-doi.ts";
import { batLoi, docJson, json, loi } from "./api.ts";
import { docLog, nhanLog } from "./log-may.ts";
import { chinhSachWindows } from "./agent-windows.ts";
import { bearer } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { one, trongYeuCau } from "./db.ts";
import { conTuPhien, ghepMay, mayTuToken, nguonGoi } from "./gia-dinh.ts";
import { khopAppTheoTen, xinDuyet } from "./che-do-chan.ts";
import { dongBo, laMoHet } from "./may-con.ts";
import { biMatOfflineMay, hanMoCuaMay } from "./tuan-thu.ts";
import { buPhien, goCoMatKhau, nhanSuKien, taoPhienWeb } from "./may-con.ts";
import { dungPhien, moPhien, nhip, xetMoPhien, lyDoChu } from "./phien.ts";
import { conChoBu, ghepPhienMayChung, laAgentMoi, moRongPhienMay, nhipPhienWindows, type TrangThaiNhip } from "./phien-windows.ts";
import { apQuyTacTuDong, guiYeuCau, ketQuaYc } from "./yeu-cau.ts";
import * as hocVien from "./hoc-vien.ts";
import * as nv from "./nhiem-vu.ts";
// M4b độ bền máy con (chỉ thêm): nhịp + tuân thủ, gói cài một chạm, lệnh gỡ từ xa
import { nhipMay } from "./nhip-may.ts";
import { khoaTuanThu } from "./tuan-thu.ts";
import { cheDoGuiMay, daGoTaiMay, doiGoiCai, lenhCho, xongLenh } from "./lenh-may.ts";
import { hoSoDns, thietBiChoMay } from "./dns-gia-dinh.ts";
import { nhanLichSuWeb } from "./web.ts";
import { appChanCuaMay, mucAppThat, nhanDanhSachApp, tinHieuDanhSachApp } from "./app-may.ts";
import { xuLyConSao } from "./api-sao.ts";
// S3 thiết kế 06/11 (L13): PIN theo bé, Ba Mẹ dùng máy, bé đang đăng nhập trên máy dùng chung
import { xuLyMayS3 } from "./api-s3.ts";
import { baMeDen, nguoiDungMay } from "./pin-be.ts";
import { viQuaMay } from "./vi-qua-may.ts";
import { coNoi } from "./may-nhieu-con.ts";
import { chinhSachWebCho } from "./web.ts";
import { choThayDoi, phienBanDoi } from "./cho-thay-doi.ts";
import { dsConMay, dungWindows } from "./goi-offline.ts";

export const xuLyMay = (req: Request, p: string[]): Promise<Response> => // chỉ hai đường nóng dùng bộ nhớ đệm trong yêu cầu; long-poll cho-thay-doi PHẢI đọc DB mới mỗi vòng
  p.join("/") === "dong-bo" || p.join("/") === "nhip" ? trongYeuCau(() => xuLyMay0(req, p)) : xuLyMay0(req, p);

async function xuLyMay0(req: Request, p: string[]): Promise<Response> {
  try {
    const d = p.join("/");
    // M4b: ghép bằng token gói cài — đường chính ghep-goi (agent-win PR #11); ghep {token} là bí danh (giữ cách cũ {ma})
    if (d === "ghep-goi" && req.method === "POST") { const bb = await docJson(req); return json(await doiGoiCai(String(bb.token ?? ""), String(bb.nen ?? ""), String(bb.tenMay ?? ""), new Date(), bb.maMay, bb.con)); }
    if (d === "ghep" && req.method === "POST") { const bb = await docJson(req.clone()); if (bb.token) return json(await doiGoiCai(String(bb.token), String(bb.nen ?? ""), String(bb.tenMay ?? ""), new Date(), bb.maMay, bb.con)); }
    if (d === "ghep" && req.method === "POST") {
      const b = await docJson(req);
      // #267: `con` = iPhone/iPad chọn MỘT Con khi mã ghép cho nhiều Con (409 ios_mot_con kèm conChon nếu thiếu)
      return json(await ghepMay(String(b.ma ?? ""), String(b.nen ?? ""), String(b.tenMay ?? ""), nguonGoi(req.headers), Date.now(), b.maMay, b.con));
    }
    // M4b: agent báo xong lệnh — trước bước kiểm token máy vì máy đã gỡ (đã xoá) vẫn báo lại được, không ghi đôi
    if (p[0] === "lenh" && p[1] && p[2] === "xong" && req.method === "POST") return json(await xongLenh(bearer(req), p[1]));
    const may = await (async () => { const t = bearer(req); return t ? mayTuToken(t) : undefined; })();
    if (!may) return loi("token_sai", "Thiết bị chưa ghép hoặc đã bị gỡ khỏi gia đình", 401);
    // P1 (07/11): long-poll «chờ thay đổi» — Ba Mẹ đổi gì thì trả ngay (≤ ~25 giây giữ), agent gọi dong-bo/nhip rồi áp (lib/cho-thay-doi.ts)
    if (d === "cho-thay-doi" && req.method === "GET") {
      const v = new URL(req.url).searchParams.get("ver");
      return json(await choThayDoi(may.family_id, v == null || v.trim() === "" ? null : Number(v), { signal: req.signal }));
    }
    const b = await docJson(req);
    // Con đang dùng: máy riêng ⇒ chủ máy; máy dùng chung ⇒ phiên Con (chọn tên + PIN) gửi kèm header X-Phien-Con, không kèm ⇒ bé đang đăng nhập
    // trên máy (06/11 L13: devices.con_dang_dung — giờ, sao, nhiệm vụ, chính sách tính theo bé này). «Ba Mẹ đang dùng máy» ⇒ không bé nào.
    const phienCon = req.headers.get("x-phien-con");
    // #267: phiên Con chỉ có hiệu lực khi Con nằm trong danh sách nối của máy (máy chung chỉ cho Con được gán)
    const k0 = phienCon ? await conTuPhien(phienCon) : undefined;
    const k = k0 && k0.family_id === may.family_id && (may.child_id ? k0.id === may.child_id : await coNoi(may.id, k0.id)) ? k0 : undefined;
    const bmDen = baMeDen(may);
    // «bé đang dùng» chỉ còn hiệu lực khi phiên Con của bé trên máy này còn hạn (12 giờ) — hết phiên / đăng xuất ⇒ máy thả ra như trước
    const dangDung = !may.child_id && !bmDen && !(k && k.family_id === may.family_id) && may.con_dang_dung
      && await one(`select 1 from kid_sessions k join children c on c.id = k.child_id where k.device_id = $1 and k.child_id = $2 and c.family_id = $3
                    and k.expires_at > now() limit 1`, [may.id, may.con_dang_dung, may.family_id]) ? may.con_dang_dung : null;
    // Ba Mẹ đang dùng ⇒ KHÔNG bé nào (kể cả máy riêng): nhịp, sự kiện, phiên, khay không tính cho con
    const con = bmDen ? null : may.child_id ?? (k && k.family_id === may.family_id ? k.id : null) ?? dangDung;
    { const r = await xuLyMayS3(may, req, p, b); if (r) return r; }
    // M4b: dong-bo trả thêm «lenh» (lệnh đang chờ, vd gỡ từ xa) · nhịp + tuân thủ ⇒ chính sách chung + cấu hình nền tảng + lệnh
    if (d === "dong-bo") {
      const phienBanThayDoi = await phienBanDoi(may.family_id);   // đọc TRƯỚC khi dựng chính sách (agent có thể dùng làm mốc `ver`; hiện agent lấy mốc từ cho-thay-doi không ver)
      // agent-win không gửi phien/nhip ⇒ đồng bộ của máy Windows mở phiên là nhịp phiên (trước dongBo ⇒ Policy thấy phiên đã đóng ngay lượt này)
      // Lỗi ở nhịp phiên không được làm hỏng cả lượt đồng bộ (agent giữ Policy cũ, thay đổi của Ba Mẹ không tới máy) ⇒ nuốt + ghi log.
      // 0.2.4: tính đúng `status.playSeconds` agent đếm (app chơi ở nền trước, màn hình mở); máy dùng chung lấy Con từ phiên mở trên máy (lib/phien-windows.ts).
      // Mac: dong-bo không nhịp phiên — daemon Mac (agent-mac BoMay.vongNhipChoi) gửi phien/nhip 30 giây/lần cho playSessionId, «đang dùng» theo app tiền cảnh;
      // trang khay / app Con nhịp thêm cũng không tính đôi (nhip() chỉ cộng thời gian trôi từ nhip_cuoi).
      // Ba Mẹ đang dùng máy (L13): không tính giờ con — bỏ nhịp phiên + phút dùng agent gửi trong lúc đó
      if (bmDen) b.usage = [];
      if (may.platform === "windows" && !bmDen) try {
        await nhipPhienWindows(may, con, b.status as TrangThaiNhip | undefined);
      } catch (e) { console.error("dong-bo: nhịp phiên Windows lỗi", e); }
      const pol = await dongBo(may, { ...b, conDangDung: con });
      // `windows`: cùng Policy, dịch sẵn sang hình dạng agent-win đọc (lib/goi-offline.ts › dungWindows — dùng chung với gói mất mạng theo bé #337)
      const lenh = await lenhCho(may);
      const { windows, danhSachApp } = await dungWindows(may, pol, con, { lenh, bmDen, status: b.status as TrangThaiNhip | undefined });
      const nguoiDung = await nguoiDungMay(may, con);
      // #339: `dsCon` = bé được gán máy — Ba Mẹ đổi gán ⇒ «chờ thay đổi» đánh thức ⇒ lượt này agent thấy ngay, tải lại ho-so / đẩy bé bị bỏ gán ra
      return json({ ...pol, phienBanThayDoi, nextCheckSec: windows.nextCheckSec, lenh, windows, nguoiDung, dsCon: await dsConMay(may.id), ...(bmDen ? { baMeDung: { den: bmDen.toISOString() } } : {}),
        ...(danhSachApp ? { danhSachApp } : {}) });
    }
    if (d === "nhip") {
      // L13: nhịp trả chính sách của bé đang đăng nhập (`con`) + ai đang dùng máy; Ba Mẹ dùng ⇒ `baMeDung` + grantEndsAt tới hạn (máy mở hết)
      const phienBanThayDoi = await phienBanDoi(may.family_id);   // trước chính sách (như dong-bo)
      const r: Record<string, unknown> = { ...(await nhipMay(may, con, b)), phienBanThayDoi, nguoiDung: await nguoiDungMay(may, con), dsCon: await dsConMay(may.id) };
      if (bmDen) {
        const den = [r.grantEndsAt, bmDen.toISOString()].filter((x): x is string => typeof x === "string").sort().pop()!;
        Object.assign(r, { baMeDung: { den: bmDen.toISOString() }, grantEndsAt: den, moDen: den });
      }
      return json(r);
    }
    // Ba Mẹ gỡ ngay tại máy (Cài đặt › Ứng dụng / Setup --uninstall): bộ gỡ báo về trước khi xoá token ⇒ máy rời gia đình như gỡ từ xa
    if (d === "da-go" && req.method === "POST") return json(await daGoTaiMay(may));
    // M4b mạng: trình cài một chạm lấy hồ sơ DNS gia đình của chính máy (mobileconfig / Private DNS / DoH Windows) để tự cài
    if (d === "ho-so-dns") return json(await hoSoDns(await thietBiChoMay(may)));
    // ho-so, chon-con / pin (agent cũ, không PIN), dang-nhap-be (PIN): lib/api-s3.ts › xuLyMayS3 ở trên
    // M4: sự kiện agent (gửi bù được, `ma` một lần) · gỡ agent bằng mật khẩu Ba Mẹ
    if (d === "su-kien") return json({ nhan: await nhanSuKien(may, con, b.ds) });
    if (d === "log" && req.method === "POST") return json(await nhanLog(may, b.ds));
    // Giám sát web: agent gửi TỔNG theo (ngày, tên miền) đọc từ lịch sử trình duyệt của Con — chỉ tên miền + đếm (lib/web.ts)
    if (d === "web/lich-su" && req.method === "POST") return json(await nhanLichSuWeb(may, bmDen ? null : con, b.ds));
    // Danh sách app đã cài THẬT trên máy (đủ / phần đổi) — Ba Mẹ chọn từ đây để xếp / chặn (lib/app-may.ts). Không cần chọn Con.
    if (d === "ung-dung" && req.method === "POST") {
      const kq = await nhanDanhSachApp(may, b);
      // L7: app Ba Mẹ cho phép theo TÊN lúc thiết lập («Thêm app khác») ⇒ khớp với app thật máy vừa báo. Lỗi khớp không làm hỏng lượt gửi.
      try { await khopAppTheoTen(may); } catch (e) { console.error("khớp app theo tên lỗi", e); }
      return json(kq);
    }
    if (d === "go") return json(await goCoMatKhau(may, b.dinhDanh, b.matKhau));
    // Bù phút chơi khi mất mạng (agent 0.2.4 gửi TRƯỚC dong-bo khi có mạng lại). #337: ghi cho CHỦ PHIÊN `id` (phiên mở trên máy này), không
    // phải bé máy chủ đang coi là đang dùng (đổi bé lúc mất mạng); phiên mở lúc mất mạng (máy chủ chưa biết) ⇒ bé agent gửi kèm `con`.
    if (d === "phien/bu") {
      const cb = await conChoBu(may, con, b.id, bmDen ? null : b.con);   // Ba Mẹ đang dùng máy ⇒ không nhận `con` agent gửi (không tính cho bé)
      if (!cb) throw new LoiNghiepVu(b.id && !con ? "khong_thay" : "chua_chon_con", b.id && !con ? "Không thấy phiên trên máy này" : "Chọn tên con trước", b.id && !con ? 404 : 409);
      return json(await buPhien(may, cb, b));
    }
    if (!con) throw new LoiNghiepVu("chua_chon_con", "Chọn tên con trước", 409);
    // 07/11 (V1): ví quà của bé đang đăng nhập trên máy — lib/vi-qua-may.ts
    if (d === "vi-qua" && req.method === "GET") return json(await viQuaMay(con));
    // L4: Con bấm «Xin Ba Mẹ mở …» trên màn chặn — app / web lạ ⇒ yêu cầu chờ Ba Mẹ duyệt (lý do không bắt buộc; bấm lại không gửi trùng)
    if (d === "xin-duyet" && req.method === "POST") return json(await xinDuyet(con, may.id, b));
    // Khay của học viên (agent-win Tray): nhận việc, làm + nộp, xem điểm/quà, thông báo — cổng mỏng trên các hàm của màn Con (lib/hoc-vien.ts).
    if (p[0] === "hoc-vien") {
      const get = req.method === "GET", post = req.method === "POST", r = p.slice(1).join("/");
      { const kq = await xuLyConSao(con, may.id, req, p.slice(1), b, { khay: true }); if (kq) return kq; }   // 05/11: quy, doi-sao, nhiem-vu?tuCham=1
      if (r === "tong-quan" && get) return json(await hocVien.tongQuan(con));
      if (r === "tin" && get) { const s = new URL(req.url).searchParams.get("sau"); return json(await hocVien.tinCho(con, s ? new Date(s) : null, may.id)); }
      if (p[1] === "nhiem-vu" && p[3] === "bat-dau" && post) return json({ luot: await nv.batDau(con, p[2]) });
      if (p[1] === "luot" && p[3] === "nop" && post) return json(await hocVien.nopKhay(con, p[2], { anh: b.anh, ghiChu: b.ghiChu, ghiAm: b.ghiAm }));
      if (r === "cua-hang" && get) return json(await hocVien.cuaHangKhay(con));
      if (p[1] === "doi" && p[2] && post) return json(await hocVien.doiQuaKhay(con, p[2]));
      if (p[1] === "loi-khen" && p[3] === "phan-hoi" && post) return json(await hocVien.phanHoiLoiKhen(con, p[2], b.phanHoi));
      return loi("khong_co_duong", "Không có đường này", 404);
    }
    // M4b: máy KHÔNG tuân thủ (fail-closed) ⇒ không xét / mở phiên giải trí; phiên đang chạy dừng ở nhịp kế tiếp. Mở khẩn cấp chỉ do Ba Mẹ.
    if (d === "phien/xet" || d === "phien/mo" || d === "phien/nhip") {
      const kt = await khoaTuanThu(may);
      if (kt.khoa && d === "phien/xet") return json({ duoc: false, lyDo: "khong_tuan_thu", cau: kt.cau, tuanThu: kt.tuanThu });
      if (kt.khoa && d === "phien/mo") return loi("khong_mo_duoc", kt.cau, 409);
      if (kt.khoa && d === "phien/nhip") {
        try { await dungPhien(con, String(b.id ?? ""), "ba_me_khoa"); } catch { /* phiên không còn chạy */ }
        return json({ trangThai: "ket_thuc", conPhut: 0, canhBao: null, lyDoKet: "khong_tuan_thu", cau: kt.cau });
      }
    }
    if (d === "phien/xet") { const x = await xetMoPhien(con, String(b.muc ?? ""), { gioMaySai: b.gioMaySai === true, mayId: may.id }); return json({ ...x, cau: x.duoc ? null : lyDoChu(x) }); }
    if (d === "phien/mo") return json(await moPhien(con, may.id, String(b.muc ?? ""), { gioMaySai: b.gioMaySai === true }));
    if (d === "phien/nhip") return json(await nhip(con, String(b.id ?? ""), b.dangDung !== false));
    if (d === "phien/dung") { await dungPhien(con, String(b.id ?? ""), "con_dung"); return json({ ok: true }); }
    if (d === "yeu-cau") {
      // `status` cho agent Windows (RequestResult.Status): «cho» | «tu_duyet» khi quy tắc tự động 15 phút duyệt ngay
      const r = await guiYeuCau(con, may.id, b);
      const tu = await apQuyTacTuDong(may.family_id, r.id);
      return json({ ...r, ...(tu ? { trang_thai: "dong_y" } : {}), status: tu ? "tu_duyet" : r.trang_thai });
    }
    // agent hỏi trạng thái lời xin đã gửi từ màn chặn (cho | dong_y | tu_choi | bo_qua | het_han | huy | da_thuc_thi) — chỉ lời xin của máy này.
    // #258: kèm kết quả lời xin app / web — ketQua (cho | da_them | chua_them | het_han | huy), nhom (tinh_phut | khong_tinh_phut), muc,
    // tenNguoiDuyet («Mẹ Lan»), loiNhan, luc (lúc Ba Mẹ trả lời) — màn «Ba Mẹ đã thêm Roblox · Tính phút» / «Ba Mẹ chưa thêm Roblox · Xin lại».
    if (p[0] === "yeu-cau" && p[1] && req.method === "GET") {
      const r = await one<{ trang_thai: string; loai: string; gia_tri: string | null; phan_loai: string | null; loi_nhan: string | null; xu_ly_luc: Date | null;
        pham_vi: string | null; ten: string | null }>(
        `select r.trang_thai, r.loai, r.gia_tri, r.phan_loai, r.loi_nhan, r.xu_ly_luc, r.pham_vi, p.ten from requests r left join parents p on p.id = r.nguoi_duyet
          where r.id = $1 and r.device_id = $2`, [p[1], may.id]);
      if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy lời xin", 404);
      // `status` theo từ của khay 0.2.0/0.2.1 (RequestForm hiểu duoc | tu_choi | cho); `trangThai` nguyên văn cho bản mới (bo_qua ⇒ status tu_choi)
      // «Bỏ qua» trong 60 giây đầu (Ba Mẹ còn Hoàn tác được) ⇒ máy Con vẫn thấy «chờ»
      const kq = ketQuaYc(r);
      const tt = kq.ketQua === "cho" ? "cho" : r.trang_thai;
      const st = tt === "dong_y" || tt === "da_thuc_thi" ? "duoc" : tt === "cho" ? "cho" : "tu_choi";
      return json({ status: st, trangThai: tt, ...kq, muc: r.gia_tri, tenNguoiDuyet: kq.ketQua === "cho" ? null : r.ten,
        luc: r.xu_ly_luc ? new Date(r.xu_ly_luc).toISOString() : null });
    }
    // M4: phiên Con cho khung Kid (WebView2) · bù phút chơi khi mất mạng
    if (d === "phien-web") return json(await taoPhienWeb(may, con));
    return loi("khong_co_duong", "Không có đường này", 404);
  } catch (e) {
    return batLoi(e);
  }
}
