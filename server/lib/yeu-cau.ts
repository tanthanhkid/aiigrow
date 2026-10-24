// Yêu cầu Con gửi Ba Mẹ (FR-05.01–05.03, BRD 6.4, Phụ lục A.2): xin thêm giờ, mở website, cài/mở ứng dụng, ngoại lệ không đủ điểm,
// xin ngoài khung giờ, khác. Giới hạn chống spam: ≤ 3 đang chờ, ≤ 10 mỗi ngày. Hết hạn: 24 giờ (thêm giờ…) / 7 ngày (web, app).
// Ứng điểm (nợ điểm) KHÔNG cho (KE-HOACH 5.5): «ngoại lệ không đủ điểm» nếu đồng ý thì là thêm giờ không trừ điểm, ghi là ngoại lệ.
import { coCuaSoThemGio } from "./chuyen-doi.ts";
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { khoaDen, khoaGoc, moTamDen, thamSo } from "./cau-hinh.ts";
import { dauNgayUtc, gioDiaPhuong } from "./gio.ts";
import { ghiDiem, khoaCon } from "./vi.ts";
import { chuanMuc, datLuat } from "./luat-app.ts";
import { ghiNgoaiLe, xemTruoc } from "./ngoai-le.ts";
import { ghiSuKien } from "./nhat-ky.ts";

export const LOAI_YC = ["them_gio", "mo_web", "cai_app", "ngoai_le", "ngoai_gio", "khac"] as const;
export type LoaiYc = (typeof LOAI_YC)[number];
export const LY_DO_NHANH = ["Để làm bài tập", "Bạn rủ chơi", "Hôm nay con ngoan", "Con làm xong việc rồi"];
const PHUT_THEM = [15, 30, 60];

type Yc = { id: string; child_id: string; device_id: string | null; loai: LoaiYc; phut: number | null; gia_tri: string | null; ly_do: string;
  trang_thai: string; het_han: Date; created_at: Date };

async function hetHanCu(t: Q, con: string, now: Date) {
  await t(`update requests set trang_thai = 'het_han', xu_ly_luc = $2 where child_id = $1 and trang_thai = 'cho' and het_han <= $2`, [con, now]);
}

export async function guiYeuCau(con: string, mayId: string | null, b: { loai?: unknown; phut?: unknown; giaTri?: unknown; lyDo?: unknown }, now = new Date()) {
  const loai = (LOAI_YC as readonly string[]).includes(String(b.loai)) ? (b.loai as LoaiYc) : null;
  if (!loai) throw new LoiNghiepVu("loai_sai", "Chọn điều con muốn xin");
  const lyDo = String(b.lyDo ?? "").trim().slice(0, 100);
  if (!lyDo) throw new LoiNghiepVu("thieu_ly_do", "Chọn hoặc ghi lý do ngắn để Ba Mẹ hiểu nhé");
  const phut = ["them_gio", "ngoai_le", "ngoai_gio"].includes(loai) ? Math.round(Number(b.phut)) : null;
  if (phut !== null && !(phut >= 5 && phut <= 240)) throw new LoiNghiepVu("phut_sai", "Số phút xin thêm phải từ 5 đến 240 (thường 30, 60 hoặc 120 phút)");
  const giaTri = loai === "mo_web" || loai === "cai_app" ? chuanMuc(b.giaTri) : String(b.giaTri ?? "").trim().slice(0, 200) || null;
  if ((loai === "mo_web" || loai === "cai_app") && !giaTri) throw new LoiNghiepVu("thieu_gia_tri", loai === "mo_web" ? "Dán đường link website" : "Ghi tên ứng dụng");
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    await hetHanCu(t, con, now);
    const f = (await t<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]))[0];
    const c = (await t<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [con]))[0];
    const ts = thamSo(f.cau_hinh, c.cau_hinh);
    const dem = (await t<{ cho: number; ngay: number }>(
      `select count(*) filter (where trang_thai = 'cho')::int as cho, count(*) filter (where created_at >= $2)::int as ngay from requests where child_id = $1`,
      [con, dauNgayUtc(gioDiaPhuong(now, f.tz).ngay, f.tz)]))[0];
    if (dem.cho >= ts.yc_cho_toi_da) throw new LoiNghiepVu("qua_nhieu_cho", `Con đã gửi ${dem.cho} yêu cầu đang chờ, đợi Ba Mẹ trả lời nhé`, 429);
    if (dem.ngay >= ts.yc_ngay_toi_da) throw new LoiNghiepVu("qua_nhieu_ngay", `Hôm nay con đã gửi ${dem.ngay} yêu cầu rồi, mai gửi tiếp nhé`, 429);
    const gio = loai === "mo_web" || loai === "cai_app" ? ts.yc_het_ngay_cai * 24 : ts.yc_het_gio_them;
    const id = newId();
    await t(`insert into requests(id, child_id, device_id, loai, phut, gia_tri, ly_do, het_han, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, con, mayId, loai, phut, giaTri, lyDo, new Date(now.getTime() + gio * 3600_000), now]);
    await ghiSuKien(fam, "gui_yeu_cau", { loai, phut, gia_tri: giaTri }, { con, may: mayId }, t);
    return { id, trang_thai: "cho" };
  });
}

export async function huyYeuCau(con: string, id: string) {
  const r = await q(`update requests set trang_thai = 'huy', xu_ly_luc = now() where id = $1 and child_id = $2 and trang_thai = 'cho' returning id`, [id, con]);
  if (!r.length) throw new LoiNghiepVu("da_xu_ly", "Yêu cầu này đã được xử lý", 409);
}

async function layYc(t: Q, fam: string, id: string, now: Date) {
  const r = (await t<Yc & { ten_con: string }>(
    `select r.*, c.ten as ten_con from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2 for update of r`, [id, fam]))[0];
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
  if (r.trang_thai === "cho" && new Date(r.het_han) <= now) {
    await t(`update requests set trang_thai = 'het_han', xu_ly_luc = $2 where id = $1`, [id, now]);
    throw new LoiNghiepVu("het_han", "Yêu cầu đã hết hạn", 409);
  }
  if (r.trang_thai !== "cho") throw new LoiNghiepVu("da_xu_ly", "Yêu cầu này đã được xử lý (có thể người khác trong nhà đã trả lời)", 409);
  return r;
}

/** Xem trước khi đồng ý: lựa chọn ngoại lệ có vượt ngưỡng cảnh báo không (FR-07.01). */
export async function xemTruocDongY(fam: string, id: string) {
  const r = await one<{ child_id: string; ten: string }>(`select r.child_id, c.ten from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2`, [id, fam]);
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
  return xemTruoc(fam, r.child_id, r.ten);
}

export type DongY = { truDiem?: boolean; phut?: number; phanLoai?: "hoc" | "giai_tri"; nhom?: string; phamVi?: "lan_nay" | "hom_nay" | "vinh_vien" };

/** Ba Mẹ đồng ý. Thêm giờ: «Trừ điểm» (Con phải đủ điểm) hoặc «Ngoại lệ — không trừ»; web/app: phân loại + phạm vi. Người đầu tiên xử lý quyết. */
export async function dongY(fam: string, id: string, nguoi: string | null, o: DongY = {}, now = new Date()) {
  return tx(async (t) => {
    const r = await layYc(t, fam, id, now);
    await khoaCon(t, r.child_id);
    const f = (await t<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [fam]))[0];
    const ngay = gioDiaPhuong(now, f.tz).ngay;
    let ngoaiLe = false, truDiem: boolean | null = null;
    if (r.loai === "them_gio" || r.loai === "ngoai_le" || r.loai === "ngoai_gio") {
      const phut = Math.round(Number(o.phut ?? r.phut));
      if (!(phut >= 5 && phut <= 240)) throw new LoiNghiepVu("phut_sai", "Chọn thời lượng");
      truDiem = r.loai === "them_gio" && o.truDiem === true;
      if (truDiem) {
        const ts = thamSo(f.cau_hinh);
        const diem = Math.ceil((phut * ts.gia_khac) / 1000);
        await ghiDiem(t, r.child_id, -diem, "phien", `Thêm ${phut} phút chơi`, { ref: r.id, nguoi });   // không đủ ⇒ khong_du_diem
      } else ngoaiLe = true;
      // Lời xin từ máy có tác tử (WINDOWS/MAC): «thêm N phút» (cả iPhone/iPad: app lập lịch «themgio» tới hạn) = cửa sổ mở tự do N phút kể từ lúc duyệt (cộng dồn nếu đang mở) — agent nhận qua dong-bo.windows (macOS dùng chung khoá này)
      // (mode tu_do + grantEndsAt) ở lần đồng bộ kế. Lý do: agent Windows không có «thưởng» để tự mở phiên khi con 0 điểm / chặn web nên grant cũ không bao giờ tới máy.
      let cuaSoDen: Date | null = null;
      const nen = r.device_id ? (await t<{ platform: string }>(`select platform from devices where id = $1`, [r.device_id]))[0]?.platform : null;
      if (coCuaSoThemGio(nen)) {
        const cu = (await t<{ d: Date | null }>(`select max(cua_so_den) as d from grants where child_id = $1 and cua_so_den > $2`, [r.child_id, now]))[0]?.d;
        cuaSoDen = new Date(Math.max(now.getTime(), cu ? new Date(cu).getTime() : 0) + phut * 60000);
      }
      await t(`insert into grants(id, child_id, request_id, phut, ngoai_le, ngay, cua_so_den) values ($1,$2,$3,$4,$5,$6,$7)`, [newId(), r.child_id, r.id, phut, ngoaiLe, ngay, cuaSoDen]);
      await t(`update requests set phut = $2 where id = $1`, [r.id, phut]);
      // Ba Mẹ cho thêm giờ lúc Con đang «Khoá ngay» ⇒ gỡ cờ khoá TẠM đúng số phút đó rồi khoá lại (Khang 24/10: «xin thêm thời gian aiigrow không
      // bật lại» — cờ khoa_ngay cũ đè cửa sổ mở). Grant ở trên giữ nguyên nghĩa (Windows: cửa sổ; máy khác: phút thưởng) — mở tạm chỉ là lúc
      // khoá nhường chỗ cho luật thường. Duyệt lần nữa cộng tiếp từ mốc cũ, không vượt hạn khoá. Chỉ Ba Mẹ duyệt tay; quy tắc tự động không vượt khoá.
      const cfg = (await t<{ c: Record<string, unknown> }>(`select cau_hinh as c from children where id = $1`, [r.child_id]))[0]?.c;
      if (nguoi && khoaGoc(cfg, now)) {
        const tu = Math.max(now.getTime(), Date.parse(moTamDen(cfg, now) ?? "") || 0);
        const het = khoaDen(cfg, now);
        const moDen = new Date(Math.min(tu + phut * 60000, het ? Date.parse(het) : Infinity)).toISOString();
        await t(`update children set cau_hinh = cau_hinh || jsonb_build_object('khoa_mo_tam_den', $2::text) where id = $1`, [r.child_id, moDen]);
        await ghiSuKien(fam, "mo_tam", { vi: "duyet_them_gio", yeu_cau: r.id, den: moDen }, { con: r.child_id, nguoi }, t);
      }
      if (ngoaiLe) await ghiNgoaiLe(fam, r.child_id, nguoi, r.loai === "ngoai_gio" ? "ngoai_gio" : "them_gio_khong_tru", r.id, t, now);
    } else if (r.loai === "mo_web" || r.loai === "cai_app") {
      const loai = o.phanLoai === "hoc" ? "hoc" : "giai_tri";
      const phamVi = o.phamVi ?? "vinh_vien";
      const het = phamVi === "vinh_vien" ? null : phamVi === "hom_nay" ? dauNgayUtc(ngay, f.tz) : new Date(now.getTime() + 3600_000);
      const hetThat = phamVi === "hom_nay" ? new Date(het!.getTime() + 86_400_000) : het;
      await datLuat(fam, { con: r.child_id, muc: r.gia_tri, ten: r.gia_tri, loai, nhom: o.nhom, het: hetThat }, t);
      if (phamVi !== "vinh_vien") { ngoaiLe = true; await ghiNgoaiLe(fam, r.child_id, nguoi, "mo_ngoai_quy_tac", r.id, t, now); }
    }
    await t(`update requests set trang_thai = 'dong_y', nguoi_duyet = $2, xu_ly_luc = $3, tru_diem = $4, ngoai_le = $5, pham_vi = $6, phan_loai = $7,
             tu_dong = $8 where id = $1`, [r.id, nguoi, now, truDiem, ngoaiLe, o.phamVi ?? null, o.phanLoai ?? null, nguoi === null]);
    await ghiSuKien(fam, "dong_y_yeu_cau", { loai: r.loai, ngoai_le: ngoaiLe, tru_diem: truDiem }, { con: r.child_id, nguoi }, t);
    return { ngoaiLe };
  });
}

export async function tuChoiYc(fam: string, id: string, nguoi: string, lyDo: string, now = new Date()) {
  const ly = String(lyDo ?? "").trim().slice(0, 120);
  if (!ly) throw new LoiNghiepVu("thieu_ly_do", "Chọn hoặc ghi lý do để Con hiểu");
  return tx(async (t) => {
    const r = await layYc(t, fam, id, now);
    await t(`update requests set trang_thai = 'tu_choi', nguoi_duyet = $2, xu_ly_luc = now(), ly_do_tu_choi = $3 where id = $1`, [r.id, nguoi, ly]);
    await ghiSuKien(fam, "tu_choi_yeu_cau", { loai: r.loai, ly_do: ly }, { con: r.child_id, nguoi }, t);
  });
}

/** Thiết bị Con báo đã áp phê duyệt (A.2: Đồng ý → Đã thực thi). */
export async function daThucThi(con: string, id: string) {
  await q(`update requests set trang_thai = 'da_thuc_thi' where id = $1 and child_id = $2 and trang_thai = 'dong_y'`, [id, con]);
}

/** Quy tắc tự động (FR-05.03) — mẫu «tự đồng ý thêm 15 phút nếu đủ điểm, 1 lần/ngày» (cấu hình Con `tu_dong_15`). Gọi ngay sau khi Con gửi. */
export async function apQuyTacTuDong(fam: string, id: string, now = new Date()) {
  const r = await one<Yc & { cau_hinh: Record<string, unknown>; tz: string }>(
    `select r.*, c.cau_hinh, f.tz from requests r join children c on c.id = r.child_id join families f on f.id = c.family_id where r.id = $1 and c.family_id = $2`, [id, fam]);
  if (!r || r.trang_thai !== "cho" || r.loai !== "them_gio" || r.phut !== 15 || r.cau_hinh?.tu_dong_15 !== true) return false;
  if (khoaGoc(r.cau_hinh, now)) return false;   // Ba Mẹ đang «Khoá ngay» (kể cả lúc đang mở tạm) ⇒ để Ba Mẹ tự quyết, không tự mở
  const daCo = await one(`select 1 from requests where child_id = $1 and tu_dong and created_at >= $2 and id <> $3`,
    [r.child_id, dauNgayUtc(gioDiaPhuong(now, r.tz).ngay, r.tz), r.id]);
  if (daCo) return false;
  try { await dongY(fam, id, null, { truDiem: true, phut: 15 }, now); return true; } catch (e) { if (e instanceof LoiNghiepVu) return false; throw e; }
}

/** Hộp thư «Chờ duyệt» (yêu cầu), gom theo Con. */
export async function dsChoYc(fam: string, now = new Date()) {
  await q(`update requests set trang_thai = 'het_han', xu_ly_luc = $2 where trang_thai = 'cho' and het_han <= $2
           and child_id in (select id from children where family_id = $1)`, [fam, now]);
  return q<Yc & { ten_con: string }>(`select r.*, c.ten as ten_con from requests r join children c on c.id = r.child_id
                                     where c.family_id = $1 and r.trang_thai = 'cho' order by r.created_at`, [fam]);
}

export const dsYcCuaCon = (con: string) =>
  q<Yc & { ly_do_tu_choi: string | null }>(`select * from requests where child_id = $1 order by created_at desc limit 30`, [con]);

/** Chi tiết một yêu cầu cho màn xử lý: yêu cầu + tên Con + số dư + giá điểm/phút + ngoại lệ tuần này theo người duyệt + xem trước cảnh báo. */
export async function chiTietYc(fam: string, id: string) {
  const r = await one<Yc & { ten_con: string; ly_do_tu_choi: string | null; nguoi_duyet: string | null }>(
    `select r.*, c.ten as ten_con from requests r join children c on c.id = r.child_id where r.id = $1 and c.family_id = $2`, [id, fam]);
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy yêu cầu", 404);
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [fam]))!;
  const ts = thamSo(f.cau_hinh);
  const { soDu } = await import("./vi.ts");
  const xt = await xemTruoc(fam, r.child_id, r.ten_con);
  const theo = await q<{ ten: string; n: number }>(
    `select p.ten, count(*)::int as n from exceptions e join parents p on p.id = e.parent_id where e.child_id = $1 and e.created_at > now() - interval '7 days'
     group by p.ten order by n desc`, [r.child_id]);
  return { ...r, soDu: await soDu(r.child_id), giaPhut: ts.gia_khac / 1000, xemTruoc: xt, ngoaiLeTheoNguoi: theo };
}
