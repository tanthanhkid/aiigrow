// API agent thiết bị Con: /api/device/<đường>. Bearer = token thiết bị (ghép bằng mã 6 số). Token thiết bị KHÔNG gọi được API Ba Mẹ
// (khác bảng, khác hàm kiểm) — không có lệnh «mở khoá» hay «cộng điểm» nào ở đây: điểm, phiên, phê duyệt chỉ máy chủ quyết.
import { coTacTu } from "./chuyen-doi.ts";
import { batLoi, docJson, json, loi } from "./api.ts";
import { docLog, nhanLog } from "./log-may.ts";
import { chinhSachWindows } from "./agent-windows.ts";
import { bearer } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { one } from "./db.ts";
import { conTuPhien, dangNhapPin, ghepMay, mayTuToken, nguonGoi } from "./gia-dinh.ts";
import { dongBo } from "./may-con.ts";
import { biMatOfflineMay, hanMoCuaMay } from "./tuan-thu.ts";
import { buPhien, goCoMatKhau, nhanSuKien, taoPhienWeb } from "./may-con.ts";
import { dungPhien, moPhien, nhip, thuongConLai, xetMoPhien, lyDoChu } from "./phien.ts";
import { conChoBu, ghepPhienMayChung, laAgentMoi, moRongPhienMay, nhipPhienWindows, type TrangThaiNhip } from "./phien-windows.ts";
import { apQuyTacTuDong, guiYeuCau } from "./yeu-cau.ts";
import * as hocVien from "./hoc-vien.ts";
import * as nv from "./nhiem-vu.ts";
import { dsCon } from "./gia-dinh.ts";
// M4b độ bền máy con (chỉ thêm): nhịp + tuân thủ, gói cài một chạm, lệnh gỡ từ xa
import { nhipMay } from "./nhip-may.ts";
import { khoaTuanThu } from "./tuan-thu.ts";
import { cheDoGuiMay, daGoTaiMay, doiGoiCai, lenhCho, xongLenh } from "./lenh-may.ts";
import { hoSoDns, thietBiChoMay } from "./dns-gia-dinh.ts";
import { nhanLichSuWeb } from "./web.ts";

export async function xuLyMay(req: Request, p: string[]): Promise<Response> {
  try {
    const d = p.join("/");
    // M4b: ghép bằng token gói cài — đường chính ghep-goi (agent-win PR #11); ghep {token} là bí danh (giữ cách cũ {ma})
    if (d === "ghep-goi" && req.method === "POST") { const bb = await docJson(req); return json(await doiGoiCai(String(bb.token ?? ""), String(bb.nen ?? ""), String(bb.tenMay ?? ""))); }
    if (d === "ghep" && req.method === "POST") { const bb = await docJson(req.clone()); if (bb.token) return json(await doiGoiCai(String(bb.token), String(bb.nen ?? ""), String(bb.tenMay ?? ""))); }
    if (d === "ghep" && req.method === "POST") {
      const b = await docJson(req);
      return json(await ghepMay(String(b.ma ?? ""), String(b.nen ?? ""), String(b.tenMay ?? ""), nguonGoi(req.headers)));
    }
    // M4b: agent báo xong lệnh — trước bước kiểm token máy vì máy đã gỡ (đã xoá) vẫn báo lại được, không ghi đôi
    if (p[0] === "lenh" && p[1] && p[2] === "xong" && req.method === "POST") return json(await xongLenh(bearer(req), p[1]));
    const may = await (async () => { const t = bearer(req); return t ? mayTuToken(t) : undefined; })();
    if (!may) return loi("token_sai", "Thiết bị chưa ghép hoặc đã bị gỡ khỏi gia đình", 401);
    const b = await docJson(req);
    // Con đang dùng: máy riêng ⇒ chủ máy; máy dùng chung ⇒ phiên PIN gửi kèm header X-Phien-Con
    const phienCon = req.headers.get("x-phien-con");
    const k = phienCon ? await conTuPhien(phienCon) : undefined;
    const con = may.child_id ?? (k && k.family_id === may.family_id ? k.id : null);
    // M4b: dong-bo trả thêm «lenh» (lệnh đang chờ, vd gỡ từ xa) · nhịp + tuân thủ ⇒ chính sách chung + cấu hình nền tảng + lệnh
    if (d === "dong-bo") {
      // agent-win không gửi phien/nhip ⇒ đồng bộ của máy Windows mở phiên là nhịp phiên (trước dongBo ⇒ Policy thấy phiên đã đóng ngay lượt này)
      // Lỗi ở nhịp phiên không được làm hỏng cả lượt đồng bộ (agent giữ Policy cũ, thay đổi của Ba Mẹ không tới máy) ⇒ nuốt + ghi log.
      // 0.2.4: tính đúng `status.playSeconds` agent đếm (app chơi ở nền trước, màn hình mở); máy dùng chung lấy Con từ phiên mở trên máy (lib/phien-windows.ts).
      if (coTacTu(may.platform)) try {
        await nhipPhienWindows(may, con, b.status as TrangThaiNhip | undefined);
      } catch (e) { console.error("dong-bo: nhịp phiên Windows lỗi", e); }
      const pol = await dongBo(may, { ...b, conDangDung: con });
      // `windows`: cùng Policy, dịch sẵn sang hình dạng agent-win đọc (lib/agent-windows.ts) — agent chỉ thực thi.
      // Kèm bí mật mã mở offline cho máy Windows (agent cache khi còn mạng để tự kiểm mã lúc mất mạng).
      const biMatOffline = coTacTu(may.platform) ? await biMatOfflineMay(may.id) : null;
      const lenh = await lenhCho(may);
      // Đang có lệnh gỡ chờ ⇒ ép giám sát: lỡ gỡ hỏng giữa chừng thì máy Con cũng không còn bị chặn (không «dính» lại).
      // Ba Mẹ chưa chọn chế độ ⇒ không gửi (agent giữ chế độ đang chạy và báo lên trong status.cheDo).
      const cheDo = cheDoGuiMay(may, lenh.some((l) => l.loai === "go"));
      // «Mở» có hạn (mở khẩn cấp / thêm giờ duyệt cho máy Windows) + thưởng còn lại ⇒ agent thả chặn ngay ở lần đồng bộ này, không đợi phiên điểm.
      const moDen = coTacTu(may.platform) ? await hanMoCuaMay(may, con) : null;
      const conThuong = coTacTu(may.platform) && con ? await thuongConLai(con) : 0;
      // play* chỉ cho máy sở hữu phiên. Máy dùng chung + agent 0.2.4: phiên mở trên máy ⇒ ghép phần phiên vào Policy chung (chỉ cho «windows»).
      const ghep = coTacTu(may.platform) && !con && laAgentMoi(b.status as TrangThaiNhip | undefined) ? await ghepPhienMayChung(may, pol) : null;
      const moPhienMay = coTacTu(may.platform) && con ? await moRongPhienMay(may, con) : null;
      const windows = chinhSachWindows(ghep?.pol ?? pol, biMatOffline ?? undefined, cheDo,
        { nen: may.platform === "mac" ? "mac" : "windows", moDen, conThuong, ...(moPhienMay ?? {}), ...(ghep?.mo ?? {}) });
      if (ghep) windows.canExchangePoints = false;               // máy dùng chung: đổi điểm phải chọn hồ sơ + PIN trên khay
      return json({ ...pol, nextCheckSec: windows.nextCheckSec, lenh, windows });
    }
    if (d === "nhip") return json(await nhipMay(may, con, b));
    // Ba Mẹ gỡ ngay tại máy (Cài đặt › Ứng dụng / Setup --uninstall): bộ gỡ báo về trước khi xoá token ⇒ máy rời gia đình như gỡ từ xa
    if (d === "da-go" && req.method === "POST") return json(await daGoTaiMay(may));
    // M4b mạng: trình cài một chạm lấy hồ sơ DNS gia đình của chính máy (mobileconfig / Private DNS / DoH Windows) để tự cài
    if (d === "ho-so-dns") return json(await hoSoDns(await thietBiChoMay(may)));
    if (d === "ho-so") return json({ con: (await dsCon(may.family_id)).filter((c) => !may.child_id || c.id === may.child_id).map((c) => ({ id: c.id, ten: c.ten, avatar: c.avatar })) });
    if (d === "pin") return json({ phienCon: await dangNhapPin(may, String(b.con ?? ""), String(b.pin ?? "")) });
    // M4: sự kiện agent (gửi bù được, `ma` một lần) · gỡ agent bằng mật khẩu Ba Mẹ
    if (d === "su-kien") return json({ nhan: await nhanSuKien(may, con, b.ds) });
    if (d === "log" && req.method === "POST") return json(await nhanLog(may, b.ds));
    // Giám sát web: agent gửi TỔNG theo (ngày, tên miền) đọc từ lịch sử trình duyệt của Con — chỉ tên miền + đếm (lib/web.ts)
    if (d === "web/lich-su" && req.method === "POST") return json(await nhanLichSuWeb(may, con, b.ds));
    if (d === "go") return json(await goCoMatKhau(may, b.dinhDanh, b.matKhau));
    // Bù phút chơi khi mất mạng (agent 0.2.4 gửi TRƯỚC dong-bo khi có mạng lại). Máy dùng chung: Con lấy từ phiên `id` mở trên máy này.
    if (d === "phien/bu") {
      const cb = await conChoBu(may, con, b.id);
      if (!cb) throw new LoiNghiepVu(b.id && !con ? "khong_thay" : "chua_chon_con", b.id && !con ? "Không thấy phiên trên máy này" : "Chọn hồ sơ và nhập mã PIN trước", b.id && !con ? 404 : 409);
      return json(await buPhien(may, cb, b));
    }
    if (!con) throw new LoiNghiepVu("chua_chon_con", "Chọn hồ sơ và nhập mã PIN trước", 409);
    // Khay của học viên (agent-win Tray): nhận việc, làm + nộp, xem điểm/quà, thông báo — cổng mỏng trên các hàm của màn Con (lib/hoc-vien.ts).
    if (p[0] === "hoc-vien") {
      const get = req.method === "GET", post = req.method === "POST", r = p.slice(1).join("/");
      if (r === "tong-quan" && get) return json(await hocVien.tongQuan(con));
      if (r === "tin" && get) { const s = new URL(req.url).searchParams.get("sau"); return json(await hocVien.tinCho(con, s ? new Date(s) : null)); }
      if (p[1] === "nhiem-vu" && p[3] === "bat-dau" && post) return json({ luot: await nv.batDau(con, p[2]) });
      if (p[1] === "luot" && p[3] === "nop" && post) return json(await hocVien.nopKhay(con, p[2], { anh: b.anh, ghiChu: b.ghiChu }));
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
    // agent Windows hỏi trạng thái lời xin đã gửi từ màn chặn (cho | dong_y | tu_choi | het_han | huy | da_thuc_thi) — chỉ lời xin của máy này
    if (p[0] === "yeu-cau" && p[1] && req.method === "GET") {
      const r = await one<{ trang_thai: string }>(`select trang_thai from requests where id = $1 and device_id = $2`, [p[1], may.id]);
      if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy lời xin", 404);
      // `status` theo từ của khay 0.2.0/0.2.1 (RequestForm hiểu duoc | tu_choi | cho); `trangThai` nguyên văn cho bản mới
      const st = r.trang_thai === "dong_y" || r.trang_thai === "da_thuc_thi" ? "duoc" : r.trang_thai === "cho" ? "cho" : "tu_choi";
      return json({ status: st, trangThai: r.trang_thai });
    }
    // M4: phiên Con cho khung Kid (WebView2) · bù phút chơi khi mất mạng
    if (d === "phien-web") return json(await taoPhienWeb(may, con));
    return loi("khong_co_duong", "Không có đường này", 404);
  } catch (e) {
    return batLoi(e);
  }
}
