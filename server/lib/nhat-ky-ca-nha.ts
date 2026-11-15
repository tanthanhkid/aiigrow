// «Nhật ký cả nhà» (thiết kế chốt 14/11 — bm-bao-cao-ngay/04 them-r3dsl3py, MỚI): ai cho giờ, ai duyệt, ai đổi cài đặt, con xin / nộp / đổi sao —
// đọc từ bảng events (nhat-ky.ts › ghiSuKien), dịch ra câu đời thường. Đầu màn (15/11, #265 bỏ «ngoài quy tắc»): «7 ngày qua cho vay N lần · S sao
// · <người> n · …» (= Ba Mẹ / người trông giúp cho Con vay sao; hoàn tác cho vay trừ lại).
// Sự kiện kỹ thuật (phiên chơi, nhịp máy, lệch giờ…) không hiện — Cảnh báo đã lo.
import { q } from "./db.ts";
import { gioDiaPhuong } from "./gio.ts";
import { TEN_CHE_DO_CHAN } from "./chan-co-ban.ts";

export type DongNhatKy = { luc: string; ngay: string; con: string | null; tenCon: string | null; nguoi: string | null; tenNguoi: string | null;
  tieu: string; phu: string; nhan: string | null; kieu: "tot" | "xau" | "cho" | "ngoai" | "thuong" };

const XIN: Record<string, string> = { vay_sao: "vay sao", them_gio: "thêm giờ", mo_web: "mở trang web", cai_app: "dùng app", ngoai_le: "thêm giờ",
  ngoai_gio: "thêm giờ" };
/** Loại sự kiện có câu trong nhật ký (cauSuKien) — lọc trong SQL TRƯỚC limit để sự kiện kỹ thuật không chiếm chỗ. */
export const LOAI_NHAT_KY = ["gui_yeu_cau", "dong_y_yeu_cau", "tu_choi_yeu_cau", "cho_vay", "hoan_tac_vay", "them_gio", "hoan_tac_them_gio", "doi_sao_lay_gio", "nop_nhiem_vu",
  "duyet_nhiem_vu", "tu_duyet_nhiem_vu", "tu_choi_nhiem_vu", "can_bo_sung", "lam_lai_nhiem_vu", "hoan_tac_duyet", "giao_nhiem_vu", "doi_qua", "xac_nhan_qua",
  "huy_qua", "doi_che_do_chan", "cho_phep_app", "doi_luat_web", "dat_luat_app", "doi_gio_choi", "doi_lich", "khoa_ngay", "mo_lai", "dat_pin", "go_may", "doi_ten_may",
  "khoa_may", "mo_khoa_may", "xoa_con"];
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/** Một sự kiện → câu hiển thị; null = không hiện trong nhật ký. `ai` = tên người lớn làm (null = con / Grow tự làm). */
export function cauSuKien(loai: string, ct: Record<string, unknown>, ai: string | null):
  Pick<DongNhatKy, "tieu" | "nhan" | "kieu"> & { phu?: string } | null {
  const nguoi = ai ?? "Ba Mẹ";
  switch (loai) {
    case "gui_yeu_cau": {
      if (ct.vay === true) return { tieu: `Xin vay ${n(ct.so_sao)} sao`, nhan: "Con xin", kieu: "cho", phu: ct.muc_dich === "qua" ? "để đổi quà" : "để chơi" };
      const g = s(ct.gia_tri);
      const tieu = ct.loai === "them_gio" ? `Xin thêm ${n(ct.phut)} phút` : g ? `Xin ${ct.loai === "cai_app" ? "dùng" : "mở"} ${g}` : `Xin ${XIN[s(ct.loai)] ?? "Ba Mẹ"}`;
      return { tieu, nhan: "Con xin", kieu: "cho", phu: ct.loai !== "them_gio" && ct.phut ? `${n(ct.phut)} phút` : undefined };
    }
    // đồng ý lời xin vay ⇒ dòng «cho_vay» đã nói đủ (không hiện hai dòng)
    case "dong_y_yeu_cau": return ct.vay === true ? null
      : { tieu: `${nguoi} cho ${XIN[s(ct.loai)] ?? "lời xin"}`, nhan: ct.tru_diem === true ? "Trừ sao" : null, kieu: "thuong" };
    case "cho_vay": return { tieu: `${nguoi} cho vay ${n(ct.so_sao)} sao`, nhan: "Cho vay", kieu: "ngoai",
      phu: n(ct.no_sau) ? `đang nợ ${n(ct.no_sau).toLocaleString("en-US").replace(/,/g, ".")} sao` : undefined };
    case "hoan_tac_vay": return { tieu: `${nguoi} rút lại ${n(ct.so_sao)} sao đã cho vay`, nhan: null, kieu: "thuong" };
    case "tu_choi_yeu_cau": return { tieu: `${nguoi} chưa cho ${XIN[s(ct.loai)] ?? "lời xin"}`, nhan: "Chưa cho", kieu: "xau" };
    case "them_gio": return { tieu: `${nguoi} cho thêm ${n(ct.phut)} phút`, nhan: null, kieu: "thuong" };     // sự kiện cũ (trước 15/11)
    case "hoan_tac_them_gio": return { tieu: `${nguoi} rút lại ${n(ct.phut)} phút đã cho`, nhan: null, kieu: "thuong" };
    case "doi_sao_lay_gio": return { tieu: `Đổi sao lấy ${n(ct.phut)} phút`, nhan: `−${n(ct.sao)}`, kieu: "thuong" };
    case "nop_nhiem_vu": return { tieu: `Nộp «${s(ct.ten)}»`, nhan: "Chờ duyệt", kieu: "cho" };
    case "duyet_nhiem_vu": return { tieu: `${nguoi} duyệt «${s(ct.ten)}»`, nhan: `+${n(ct.diem)}`, kieu: "tot" };
    case "tu_duyet_nhiem_vu": return { tieu: `«${s(ct.ten)}» tự cộng sao`, nhan: `+${n(ct.diem)}`, kieu: "tot" };
    case "tu_choi_nhiem_vu": return { tieu: `${nguoi} chưa nhận «${s(ct.ten)}»`, nhan: null, kieu: "xau" };
    case "can_bo_sung": case "lam_lai_nhiem_vu": return { tieu: `${nguoi} nhờ làm lại «${s(ct.ten)}»`, nhan: null, kieu: "thuong" };
    case "hoan_tac_duyet": return { tieu: `${nguoi} hoàn tác duyệt «${s(ct.ten)}»`, nhan: null, kieu: "thuong" };
    case "giao_nhiem_vu": return { tieu: `${nguoi} giao «${s(ct.ten)}»`, nhan: null, kieu: "thuong" };
    case "doi_qua": return { tieu: `Đổi quà «${s(ct.ten)}»`, nhan: `−${n(ct.diem)}`, kieu: "thuong" };
    case "xac_nhan_qua": return { tieu: `${nguoi} trao quà`, nhan: null, kieu: "tot", phu: s(ct.ten) };
    case "huy_qua": return { tieu: `${nguoi} huỷ quà «${s(ct.ten)}»`, nhan: n(ct.hoan) ? `+${n(ct.hoan)}` : null, kieu: "thuong" };
    case "doi_che_do_chan": {
      const ten = TEN_CHE_DO_CHAN[s(ct.sang) as keyof typeof TEN_CHE_DO_CHAN] ?? s(ct.sang);
      return { tieu: `${nguoi} bật «${ten}»`, nhan: null, kieu: "thuong" };
    }
    case "cho_phep_app": { const a = Array.isArray(ct.app) ? ct.app.length : 0; return { tieu: `${nguoi} cho dùng ${a} app`, nhan: null, kieu: "thuong" }; }
    case "doi_luat_web": return { tieu: `${nguoi} đổi trang ${s(ct.muc)}`, nhan: null, kieu: "thuong" };
    case "dat_luat_app": return { tieu: `${nguoi} đổi app ${s(ct.muc)}`, nhan: ct.loai === "chan" ? "Chặn" : null, kieu: "thuong" };
    case "doi_gio_choi": return { tieu: `${nguoi} đổi giờ chơi`, nhan: null, kieu: "thuong" };
    case "doi_lich": return { tieu: `${nguoi} đổi giờ ngủ, giờ học`, nhan: null, kieu: "thuong" };
    case "khoa_ngay": return ct.hoanTac ? null : { tieu: `${nguoi} khoá máy`, nhan: null, kieu: "thuong" };
    case "mo_lai": return { tieu: `${nguoi} mở lại máy`, nhan: null, kieu: "thuong" };
    case "dat_pin": return { tieu: `${nguoi} đặt PIN mới`, nhan: null, kieu: "thuong" };
    case "go_may": return { tieu: `${nguoi} gỡ ${s(ct.ten) || "một máy"}`, nhan: null, kieu: "thuong" };
    case "doi_ten_may": return { tieu: `${nguoi} đổi tên máy`, nhan: null, kieu: "thuong" };
    // 14/11: khoá riêng một máy (lib/khoa-may.ts) · xoá hồ sơ Con (lib/xoa-con.ts)
    case "khoa_may": return { tieu: `${nguoi} khoá ${s(ct.ten) || "một máy"}`, nhan: null, kieu: "thuong" };
    case "mo_khoa_may": return { tieu: `${nguoi} mở khoá ${s(ct.ten) || "một máy"}`, nhan: null, kieu: "thuong" };
    case "xoa_con": return { tieu: `${nguoi} xoá hồ sơ ${s(ct.ten) || "một bé"}`, nhan: null, kieu: "thuong" };
    default: return null;
  }
}

export async function nhatKyCaNha(fam: string, o: { con?: string | null; ngay?: number } = {}, now = new Date()) {
  const soNgay = Math.max(1, Math.min(30, Math.round(o.ngay ?? 7)));
  const tu = new Date(now.getTime() - soNgay * 86_400_000);
  const [ev, f, dem] = await Promise.all([
    q<{ loai: string; child_id: string | null; chi_tiet: Record<string, unknown>; nguoi: string | null; created_at: Date; ten_con: string | null; ten_nguoi: string | null }>(
      `select e.loai, e.child_id, e.chi_tiet, e.nguoi, e.created_at, c.ten as ten_con, p.ten as ten_nguoi
         from events e left join children c on c.id = e.child_id left join parents p on p.id = e.nguoi
        where e.family_id = $1 and e.created_at >= $2 and ($3::text is null or e.child_id = $3) and e.loai = any($4::text[])
        order by e.created_at desc, e.seq desc limit 200`, [fam, tu, o.con ?? null, LOAI_NHAT_KY]),
    q<{ tz: string }>(`select tz from families where id = $1`, [fam]),
    // «cho vay N lần · S sao · theo người» — đếm CẢ cửa sổ (không phụ thuộc limit danh sách); hoàn tác cho vay trừ lại
    q<{ nguoi: string; ten: string | null; so: number; sao: number }>(
      `select e.nguoi, max(p.ten) as ten, sum(case when e.loai = 'cho_vay' then 1 else -1 end)::int as so,
              sum(case when e.loai = 'cho_vay' then 1 else -1 end * coalesce((e.chi_tiet->>'so_sao')::int, 0))::int as sao
         from events e left join parents p on p.id = e.nguoi
        where e.family_id = $1 and e.created_at >= $2 and ($3::text is null or e.child_id = $3) and e.nguoi is not null
          and e.loai in ('cho_vay', 'hoan_tac_vay')
        group by e.nguoi`, [fam, tu, o.con ?? null]),
  ]);
  const tz = f[0]?.tz ?? "Asia/Ho_Chi_Minh";
  const ds: DongNhatKy[] = [];
  for (const e of ev) {
    const c = cauSuKien(e.loai, e.chi_tiet ?? {}, e.ten_nguoi);
    if (!c) continue;
    const g = gioDiaPhuong(new Date(e.created_at), tz);
    const hhmm = `${String(Math.floor(g.phut / 60)).padStart(2, "0")}:${String(g.phut % 60).padStart(2, "0")}`;
    ds.push({ luc: new Date(e.created_at).toISOString(), ngay: g.ngay, con: e.child_id, tenCon: e.ten_con, nguoi: e.nguoi, tenNguoi: e.ten_nguoi,
      tieu: c.tieu, phu: [hhmm, e.ten_con, c.phu].filter(Boolean).join(" · "), nhan: c.nhan, kieu: c.kieu });
  }
  const nguoiDs = dem.filter((x) => x.so > 0).map((x) => ({ ten: x.ten ?? "Ba Mẹ", so: x.so, sao: Math.max(0, x.sao) })).sort((a, b) => b.so - a.so);
  const choVay = { so: nguoiDs.reduce((a, x) => a + x.so, 0), sao: nguoiDs.reduce((a, x) => a + x.sao, 0), theoNguoi: nguoiDs };
  // `ngoaiQuyTac` (cũ, #265 bỏ khái niệm) = đúng số lần cho vay — app cũ còn đọc tới khi bản mới phát hành
  return { soNgay, ds, choVay, ngoaiQuyTac: { so: choVay.so, theoNguoi: nguoiDs.map((x) => ({ ten: x.ten, so: x.so })) } };
}
