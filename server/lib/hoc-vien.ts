// Ứng dụng khay của HỌC VIÊN (agent-win Tray) — hai chiều với Ba Mẹ: nhận nhiệm vụ, làm + nộp, xem điểm + quà, nhận thông báo.
// Không thêm bảng: dựng từ tasks / submissions / points / rewards / redemptions / messages / events sẵn có (lib/nhiem-vu.ts, phan-thuong.ts,
// vi.ts). Đường /api/device/hoc-vien/* chỉ là cổng cho token thiết bị (máy riêng của Con) — mọi luật (tần suất, thời gian tối thiểu, ảnh trùng,
// trừ điểm, tồn kho) vẫn nằm ở các hàm nghiệp vụ gốc, khay không tự quyết điều gì.
import { one, q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { nop, nvCuaCon, type AnhNop } from "./nhiem-vu.ts";
import { cuaHang, doiQua } from "./phan-thuong.ts";
import { tomTatVi } from "./vi.ts";

export type TinHocVien = { id: string; loai: string; tieu: string; noi: string; luc: string };

const iso = (d: Date) => new Date(d).toISOString();
const KHONG_LAM_DUOC = new Set(["da_xong"]);

/** Màn chính của khay: điểm + cấp, việc cần làm (kèm lý do «cần bổ sung»), lượt gần đây, lời khen, quà đang chờ Ba Mẹ trao. */
export async function tongQuan(con: string) {
  const c = await one<{ id: string; ten: string; family_id: string }>(`select id, ten, family_id from children where id = $1`, [con]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const vi = await tomTatVi(con);
  const ds = (await nvCuaCon(con)).filter((x) => !KHONG_LAM_DUOC.has(x.trang_thai_con));
  const boSung = await q<{ task_id: string; ly_do: string | null }>(
    `select distinct on (task_id) task_id, ly_do from submissions where child_id = $1 and trang_thai = 'can_bo_sung' order by task_id, created_at desc`, [con]);
  const lyDo = new Map(boSung.map((x) => [x.task_id, x.ly_do]));
  return {
    con: { id: c.id, ten: c.ten },
    soDu: vi.soDu, tongKiem: vi.tongKiem, capDo: vi.capDo, diemChoDuyet: vi.diemChoDuyet,
    nhiemVu: ds.map((x) => ({
      id: x.id, ten: x.ten, moTa: x.mo_ta, nhom: x.nhom, diem: x.diem, bangChung: x.bang_chung, kieu: x.kieu, han: x.han ? new Date(x.han).toISOString() : null,
      phutToiThieu: x.phut_toi_thieu, trangThai: x.trang_thai_con, luot: x.luot_dang, homNay: x.hom_nay, dangCho: x.dang_cho,
      giaoRieng: !!x.giao_cho, lyDo: x.trang_thai_con === "can_bo_sung" ? (lyDo.get(x.id) ?? null) : null,
    })),
    gan: (await q<{ id: string; ten: string; trang_thai: string; diem: number | null; ly_do: string | null; loi_khen: string | null; luc: Date }>(
      `select s.id, t.ten, s.trang_thai, s.diem, s.ly_do, s.loi_khen, coalesce(s.duyet_luc, s.nop_luc, s.created_at) as luc
       from submissions s join tasks t on t.id = s.task_id
       where s.child_id = $1 and s.trang_thai in ('cho_duyet', 'duoc_duyet', 'tu_choi', 'can_bo_sung') and s.created_at > now() - interval '14 days'
       order by s.created_at desc limit 15`, [con])).map((x) => ({ id: x.id, ten: x.ten, trangThai: x.trang_thai, diem: x.diem, lyDo: x.ly_do, loiKhen: x.loi_khen, luc: iso(x.luc) })),
    loiKhen: (await q<{ id: string; noi_dung: string; phan_hoi: string | null; created_at: Date }>(
      `select id, noi_dung, phan_hoi, created_at from messages where child_id = $1 order by created_at desc limit 5`, [con]))
      .map((x) => ({ id: x.id, noiDung: x.noi_dung, phanHoi: x.phan_hoi, luc: iso(x.created_at) })),
    phieuCho: (await q<{ id: string; ten: string; diem: number; created_at: Date }>(
      `select id, ten, diem, created_at from redemptions where child_id = $1 and trang_thai = 'giu' order by created_at desc`, [con]))
      .map((x) => ({ id: x.id, ten: x.ten, diem: x.diem, luc: iso(x.created_at) })),
  };
}

const SO_NGAY_TIN = 7;
/** Sự kiện ghi trong giao dịch mang giờ LÚC MỞ giao dịch (`now()`), nên có thể «cũ» hơn mốc khay vừa hỏi — lùi 5 phút cho khỏi sót; khay lọc trùng theo `id`. */
const LUI_PHUT = 5;

/** Thông báo cho khay: nhiệm vụ mới (giao riêng hoặc mở cho cả nhà), Ba Mẹ duyệt / từ chối / yêu cầu bổ sung, lời khen, quà đã trao / bị huỷ.
 *  `sau` = `bay` của lần hỏi trước (máy chủ tự lùi 5 phút, khay lọc trùng theo `id`); không có `sau` ⇒ 7 ngày gần nhất (để khay hiện trong hộp thư, không bật toast). */
export async function tinCho(con: string, sau?: Date | null): Promise<{ ds: TinHocVien[]; bay: string }> {
  const c = await one<{ family_id: string }>(`select family_id from children where id = $1`, [con]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const tu = sau && Number.isFinite(sau.getTime()) ? new Date(sau.getTime() - LUI_PHUT * 60_000) : new Date(Date.now() - SO_NGAY_TIN * 86_400_000);
  const ev = await q<{ id: string; loai: string; chi_tiet: Record<string, unknown>; created_at: Date }>(
    `select id, loai, chi_tiet, created_at from events where child_id = $1 and created_at > $2
     and loai in ('giao_nhiem_vu', 'duyet_nhiem_vu', 'tu_duyet_nhiem_vu', 'tu_choi_nhiem_vu', 'can_bo_sung', 'loi_khen', 'xac_nhan_qua', 'huy_qua', 'huy_hieu')
     order by created_at desc limit 50`, [con, tu]);
  const moi = await q<{ id: string; ten: string; diem: number; created_at: Date }>(
    `select id, ten, diem, created_at from tasks where family_id = $1 and bat and giao_cho is null and bang_chung <> 'tu_dong' and created_at > $2
     and (han is null or han > now()) order by created_at desc limit 20`, [c.family_id, tu]);
  const s = (v: unknown) => String(v ?? "").trim();
  const ra: TinHocVien[] = [];
  for (const e of ev) {
    const d = e.chi_tiet ?? {};
    const luc = new Date(e.created_at).toISOString();
    const them = (tieu: string, noi: string) => ra.push({ id: e.id, loai: e.loai, tieu, noi, luc });
    switch (e.loai) {
      case "giao_nhiem_vu": them("Nhiệm vụ mới từ Ba Mẹ", `«${s(d.ten)}» · ${s(d.diem)} điểm`); break;
      case "duyet_nhiem_vu": them("Ba Mẹ đã duyệt", `«${s(d.ten)}» · +${s(d.diem)} điểm`); break;
      case "tu_duyet_nhiem_vu": them("Con được cộng điểm", `«${s(d.ten)}» · +${s(d.diem)} điểm`); break;
      case "tu_choi_nhiem_vu": them("Ba Mẹ chưa nhận bài", `«${s(d.ten)}» · ${s(d.ly_do)}`); break;
      case "can_bo_sung": them("Ba Mẹ nhờ bổ sung", `«${s(d.ten)}» · ${s(d.ly_do)}`); break;
      case "loi_khen": them("Lời nhắn từ Ba Mẹ", s(d.noi_dung)); break;
      case "xac_nhan_qua": them("Quà đã sẵn sàng", s(d.ten)); break;
      case "huy_qua": them("Phiếu quà đã huỷ", `«${s(d.ten)}» · hoàn ${s(d.hoan)} điểm`); break;
      case "huy_hieu": them("Huy hiệu mới", s(d.ten ?? d.ma)); break;
    }
  }
  for (const t of moi) ra.push({ id: "nv:" + t.id, loai: "nhiem_vu_moi", tieu: "Nhiệm vụ mới cho cả nhà", noi: `«${t.ten}» · ${t.diem} điểm`, luc: new Date(t.created_at).toISOString() });
  ra.sort((a, b) => (a.luc < b.luc ? 1 : -1));
  return { ds: ra, bay: new Date().toISOString() };
}

/** Con trả lời một lời nhắn / lời khen của Ba Mẹ (một câu ngắn hoặc một biểu tượng) — Ba Mẹ thấy ở dòng thời gian của Con. */
export async function phanHoiLoiKhen(con: string, id: string, noi: unknown) {
  const ph = s2(noi);
  if (!ph) throw new LoiNghiepVu("thieu_noi_dung", "Viết vài chữ để trả lời nhé");
  const r = await q<{ family_id: string }>(`update messages set phan_hoi = $3 where id = $1 and child_id = $2 returning family_id`, [id, con, ph]);
  if (!r.length) throw new LoiNghiepVu("khong_thay", "Không thấy lời nhắn", 404);
  await ghiSuKien(r[0].family_id, "phan_hoi_con", { noi_dung: ph }, { con });          // Ba Mẹ nhận thông báo «Con nhắn lại»
  return { ok: true };
}
const s2 = (v: unknown) => String(v ?? "").trim().slice(0, 60);

/** Cửa hàng cho khay: chỉ các trường khay cần (camelCase), kèm «đủ điểm» / «còn thiếu». */
export async function cuaHangKhay(con: string) {
  const r = await cuaHang(con);
  return {
    soDu: r.soDu,
    qua: r.qua.map((x) => ({ id: x.id, ten: x.ten, loai: x.loai, diem: x.diem, menhGia: x.menh_gia, chiCuoiTuan: x.chi_cuoi_tuan, du: x.du, conThieu: x.conThieu })),
  };
}

/** Kết quả đổi quà cho khay: `trangThai` = cho_trao | cho_xac_nhan | da_phat_hanh; voucher (nếu có) kèm mã. */
export async function doiQuaKhay(con: string, quaId: string) {
  const r = await doiQua(con, quaId);
  return { phieu: r.phieu, trangThai: r.trang_thai, voucher: r.voucher ? { ma: r.voucher.ma, hetHan: iso(r.voucher.het_han) } : null };
}

/** Nộp bài cho khay: `trangThai` = cho_duyet | duoc_duyet (nhiệm vụ tự duyệt). */
export async function nopKhay(con: string, luot: string, b: { anh?: AnhNop[]; ghiChu?: unknown }) {
  const r = await nop(con, luot, b);
  return { trangThai: r.trang_thai, nghiTrung: r.nghi_trung };
}
