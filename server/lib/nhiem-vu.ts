// Nhiệm vụ + bằng chứng + phê duyệt (FR-03.01–03.04, Phụ lục A.1, Phụ lục C). Trạng thái lượt làm (submissions):
//   dang_lam → cho_duyet → duoc_duyet (cộng điểm) | tu_choi (lý do) | can_bo_sung (→ nộp lại → cho_duyet) | het_han
// Chống «cày»: tần suất tối đa theo ngày/tuần (đếm lượt đã nộp, theo ngày của gia đình); thời gian tối thiểu từ lúc «Bắt đầu».
// Chống bằng chứng giả: ảnh chụp trong app (máy chủ chỉ nhận ảnh mới gửi kèm lượt nộp), băm SHA-256 — trùng ảnh Con đã nộp trước ⇒ gắn cờ
// `nghi_trung` cho Ba Mẹ (không tự từ chối: Ba Mẹ là người kiểm chứng cuối, BRD 11.3).
import { createHash } from "node:crypto";
import { newId, one, q, tx, type Q } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { dauNgayUtc, dauTuan, gioDiaPhuong } from "./gio.ts";
import { thamSo } from "./cau-hinh.ts";
import { ghiDiem, khoaCon } from "./vi.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import { sauKhiDuyet } from "./thanh-tich.ts";

export const NHOM_NV = ["doc_sach", "viec_nha", "hoc_tap", "van_dong", "ky_nang", "khac"] as const;
export const BANG_CHUNG = ["anh", "video", "ghi_am", "van_ban", "tu_dong"] as const;
export const ANH_TOI_DA = 400 * 1024;          // byte sau khi giải base64 — app nén ảnh ≤ 300 KB trước khi gửi (KE-HOACH 5.2)

type MauNv = { ten: string; mo_ta: string; nhom: string; diem: number; bang_chung: string; toi_da_ngay?: number; toi_da_tuan?: number;
  phut_toi_thieu?: number; kieu?: string; tu_duyet?: boolean };

/** Thư viện mẫu theo độ tuổi (BRD 4.3 ví dụ mặc định + Phụ lục C). */
export const MAU: Record<"nhi" | "teen", MauNv[]> = {
  nhi: [
    { ten: "Đọc 1 cuốn truyện 30 trang", mo_ta: "Đọc xong, chụp bìa và trang cuối, kể lại 3 câu.", nhom: "doc_sach", diem: 10, bang_chung: "anh", phut_toi_thieu: 20, toi_da_ngay: 1 },
    { ten: "Dọn đồ chơi", mo_ta: "Cất đồ chơi về đúng chỗ, chụp góc chơi gọn gàng.", nhom: "viec_nha", diem: 5, bang_chung: "anh", toi_da_ngay: 1 },
    { ten: "Gấp quần áo", mo_ta: "Gấp quần áo của con cho ngay ngắn.", nhom: "viec_nha", diem: 5, bang_chung: "anh", toi_da_ngay: 1 },
    { ten: "Rửa chén sau bữa ăn", mo_ta: "Rửa sạch chén, chụp bồn rửa sạch.", nhom: "viec_nha", diem: 10, bang_chung: "anh", toi_da_ngay: 3 },
    { ten: "Học 1 bài với AiiRob", mo_ta: "Học xong một bài với AiiRob — đạt là tự cộng điểm.", nhom: "hoc_tap", diem: 20, bang_chung: "tu_dong", tu_duyet: true },
    { ten: "Nhảy dây 10 phút", mo_ta: "Nhảy dây 10 phút, nhờ người lớn quay hoặc chụp.", nhom: "van_dong", diem: 5, bang_chung: "anh", phut_toi_thieu: 10, toi_da_ngay: 1 },
    { ten: "Tự chuẩn bị cặp sách", mo_ta: "Soạn sách vở cho ngày mai.", nhom: "ky_nang", diem: 5, bang_chung: "anh", toi_da_ngay: 1 },
    { ten: "Đánh răng tối 7 ngày liền", mo_ta: "Thử thách tuần: không quên đánh răng buổi tối.", nhom: "ky_nang", diem: 30, bang_chung: "van_ban", kieu: "thu_thach", toi_da_tuan: 1 },
  ],
  teen: [
    { ten: "Đọc 1 cuốn sách 50 trang", mo_ta: "Chụp bìa + trang cuối và viết 5 câu tóm tắt.", nhom: "doc_sach", diem: 10, bang_chung: "anh", phut_toi_thieu: 20, toi_da_ngay: 1 },
    { ten: "Rửa chén sau bữa ăn", mo_ta: "Rửa sạch chén, chụp bồn rửa sạch.", nhom: "viec_nha", diem: 10, bang_chung: "anh", toi_da_ngay: 3 },
    { ten: "Lau sàn nhà", mo_ta: "Lau sàn khoảng 100 m², chụp trước và sau.", nhom: "viec_nha", diem: 10, bang_chung: "anh", toi_da_ngay: 1 },
    { ten: "Đổ rác", mo_ta: "Đổ rác và thay túi mới.", nhom: "viec_nha", diem: 5, bang_chung: "anh", toi_da_ngay: 1 },
    { ten: "Học 1 bài với AiiRob", mo_ta: "Học xong một bài với AiiRob — đạt là tự cộng điểm.", nhom: "hoc_tap", diem: 20, bang_chung: "tu_dong", tu_duyet: true },
    { ten: "Làm xong bài tập về nhà", mo_ta: "Chụp vở bài tập đã làm.", nhom: "hoc_tap", diem: 10, bang_chung: "anh", toi_da_ngay: 1 },
    { ten: "Chạy bộ hoặc đạp xe 30 phút", mo_ta: "Vận động 30 phút, chụp ảnh hoặc ảnh đồng hồ.", nhom: "van_dong", diem: 10, bang_chung: "anh", phut_toi_thieu: 30, toi_da_ngay: 1 },
    { ten: "Nấu 1 món cho gia đình", mo_ta: "Tự nấu một món đơn giản, chụp món ăn.", nhom: "ky_nang", diem: 20, bang_chung: "anh", toi_da_tuan: 2 },
    { ten: "Một tuần không ngoại lệ", mo_ta: "Thử thách tuần: không xin ngoại lệ nào.", nhom: "ky_nang", diem: 30, bang_chung: "van_ban", kieu: "thu_thach", toi_da_tuan: 1 },
  ],
};

export type Nv = { id: string; family_id: string; ten: string; mo_ta: string; nhom: string; diem: number; bang_chung: string; kieu: string;
  toi_da_ngay: number | null; toi_da_tuan: number | null; phut_toi_thieu: number; tu_duyet: boolean; giao_cho: string | null; han: Date | null; bat: boolean };

/** Tên nhiệm vụ tối thiểu (sau trim) — QA 24/10: có 4 nhiệm vụ tên chỉ là «1». App Ba Mẹ dùng cùng hằng số này (mobile/src/lib/ui.tsx không lặp: kiểm ở giao-nv.tsx). */
export const TEN_NV_TOI_THIEU = 3;

function kiemNv(b: Record<string, unknown>, kiemDoDai = true) {
  const ten = String(b.ten ?? "").trim().slice(0, 60);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Đặt tên nhiệm vụ");
  if (kiemDoDai && [...ten].length < TEN_NV_TOI_THIEU) throw new LoiNghiepVu("ten_ngan", `Tên nhiệm vụ cần ít nhất ${TEN_NV_TOI_THIEU} ký tự để Con hiểu việc cần làm`);
  const diem = Math.round(Number(b.diem));
  if (!Number.isInteger(diem) || diem < 1 || diem > 1000) throw new LoiNghiepVu("diem_sai", "Điểm thưởng là số nguyên từ 1");
  const nhom = (NHOM_NV as readonly string[]).includes(String(b.nhom)) ? String(b.nhom) : "khac";
  const bc = (BANG_CHUNG as readonly string[]).includes(String(b.bang_chung)) ? String(b.bang_chung) : "anh";
  const so = (v: unknown, max: number) => (v === null || v === undefined || v === "" ? null : Math.min(max, Math.max(1, Math.round(Number(v)) || 1)));
  return {
    ten, diem, nhom, bang_chung: bc, mo_ta: String(b.mo_ta ?? "").trim().slice(0, 300),
    kieu: ["thuong", "mot_lan", "thu_thach"].includes(String(b.kieu)) ? String(b.kieu) : "thuong",
    toi_da_ngay: so(b.toi_da_ngay, 20), toi_da_tuan: so(b.toi_da_tuan, 50),
    phut_toi_thieu: Math.min(120, Math.max(0, Math.round(Number(b.phut_toi_thieu ?? 0)) || 0)),
    tu_duyet: b.tu_duyet === true,
  };
}

export async function taoNv(fam: string, b: Record<string, unknown>, nguoi?: string, t: Q = q) {
  const v = kiemNv(b);
  const giao = b.giao_cho ? String(b.giao_cho) : null;
  if (giao && !(await t(`select 1 from children where id = $1 and family_id = $2`, [giao, fam])).length)
    throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const han = b.han ? new Date(String(b.han)) : null;
  if (han && !Number.isFinite(han.getTime())) throw new LoiNghiepVu("han_sai", "Hạn hoàn thành chưa đúng");
  const id = newId();
  await t(`insert into tasks(id, family_id, ten, mo_ta, nhom, diem, bang_chung, kieu, toi_da_ngay, toi_da_tuan, phut_toi_thieu, tu_duyet, giao_cho, han)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [id, fam, v.ten, v.mo_ta, v.nhom, v.diem, v.bang_chung, v.kieu, v.toi_da_ngay, v.toi_da_tuan, v.phut_toi_thieu, v.tu_duyet, giao, han]);
  if (giao) await ghiSuKien(fam, "giao_nhiem_vu", { ten: v.ten, diem: v.diem }, { con: giao, nguoi }, t);
  return id;
}

/** Áp mẫu theo tuổi cho gia đình (bỏ qua nhiệm vụ trùng tên đã có). → số nhiệm vụ đã tạo. */
export async function apDungMau(fam: string, nhom: "nhi" | "teen") {
  const co = new Set((await q<{ ten: string }>(`select ten from tasks where family_id = $1`, [fam])).map((x) => x.ten));
  let n = 0;
  const { mauRiengDangBat } = await import("./admin.ts");   // động: admin.ts import nhiem-vu.ts
  const rieng = (await mauRiengDangBat())[nhom] as unknown as MauNv[];
  for (const m of [...MAU[nhom], ...rieng]) if (!co.has(m.ten)) { await taoNv(fam, { ...m }); co.add(m.ten); n++; }
  return n;
}

export async function suaNv(fam: string, id: string, b: Record<string, unknown>) {
  const cu = await one<Nv>(`select * from tasks where id = $1 and family_id = $2`, [id, fam]);
  if (!cu) throw new LoiNghiepVu("khong_thay", "Không thấy nhiệm vụ", 404);
  // nhiệm vụ cũ tên ngắn (trước luật 3 ký tự) vẫn sửa điểm / tắt được: chỉ kiểm độ dài khi Ba Mẹ đổi tên
  const doiTen = b.ten !== undefined && String(b.ten ?? "").trim().slice(0, 60) !== cu.ten;
  const v = kiemNv({ ...cu, ...b }, doiTen);
  await q(`update tasks set ten=$2, mo_ta=$3, nhom=$4, diem=$5, bang_chung=$6, kieu=$7, toi_da_ngay=$8, toi_da_tuan=$9, phut_toi_thieu=$10,
           tu_duyet=$11, bat=$12 where id = $1`,
    [id, v.ten, v.mo_ta, v.nhom, v.diem, v.bang_chung, v.kieu, v.toi_da_ngay, v.toi_da_tuan, v.phut_toi_thieu, v.tu_duyet, b.bat === undefined ? cu.bat : b.bat === true]);
}

async function tz(fam: string, t: Q = q) {
  return ((await t<{ tz: string }>(`select tz from families where id = $1`, [fam]))[0]?.tz) ?? "Asia/Ho_Chi_Minh";
}

/** Số lượt đã nộp (đang chờ / được duyệt / cần bổ sung) hôm nay và tuần này của Con cho một nhiệm vụ — theo giờ gia đình. */
async function demLuot(t: Q, con: string, task: string, tzg: string, now = new Date()) {
  const ngay = gioDiaPhuong(now, tzg).ngay;
  const r = (await t<{ ngay: number; tuan: number; tong: number; moi_luc: number }>(
    `select count(*) filter (where nop_luc >= $3)::int as ngay, count(*) filter (where nop_luc >= $4)::int as tuan,
            count(*) filter (where trang_thai = 'duoc_duyet')::int as tong, count(*)::int as moi_luc
     from submissions where child_id = $1 and task_id = $2 and trang_thai in ('cho_duyet', 'duoc_duyet', 'can_bo_sung')`,
    [con, task, dauNgayUtc(ngay, tzg), dauNgayUtc(dauTuan(ngay), tzg)]))[0];
  return r;
}

export type NvCuaCon = Nv & { trang_thai_con: "san_sang" | "dang_lam" | "can_bo_sung" | "du_hom_nay" | "du_tuan" | "da_xong";
  luot_dang: string | null; hom_nay: number; dang_cho: number };

/** Danh sách «Làm gì để có điểm» của Con: nhiệm vụ đang bật, mở cho mọi Con hoặc giao riêng cho Con này, kèm trạng thái. */
export async function nvCuaCon(con: string, now = new Date()): Promise<NvCuaCon[]> {
  const c = await one<{ family_id: string }>(`select family_id from children where id = $1`, [con]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const tzg = await tz(c.family_id);
  const ds = await q<Nv>(`select * from tasks where family_id = $1 and bat and (giao_cho is null or giao_cho = $2)
                          and (han is null or han > now()) and bang_chung <> 'tu_dong' order by created_at`, [c.family_id, con]);
  const ra: NvCuaCon[] = [];
  for (const nv of ds) {
    const d = await demLuot(q, con, nv.id, tzg, now);
    // lượt ĐANG LÀM hoặc CẦN BỔ SUNG là việc dở của Con; lượt đã nộp chờ duyệt không chặn làm lượt kế (trong giới hạn tần suất)
    const dang = await one<{ id: string; trang_thai: string }>(
      `select id, trang_thai from submissions where child_id = $1 and task_id = $2 and trang_thai in ('dang_lam', 'can_bo_sung')
       order by created_at desc limit 1`, [con, nv.id]);
    const cho = (await one<{ n: number }>(`select count(*)::int as n from submissions where child_id = $1 and task_id = $2 and trang_thai = 'cho_duyet'`, [con, nv.id]))!.n;
    let tt: NvCuaCon["trang_thai_con"] = "san_sang";
    if (nv.kieu === "mot_lan" && d.tong > 0) tt = "da_xong";
    else if (dang) tt = dang.trang_thai as NvCuaCon["trang_thai_con"];
    // «một lần» đã nộp, đang chờ Ba Mẹ duyệt ⇒ không còn «Nhận việc» (dùng giá trị khay 0.2.0/0.2.1 đã biết)
    else if (nv.kieu === "mot_lan" && d.moi_luc > 0) tt = "du_hom_nay";
    else if (nv.toi_da_ngay && d.ngay >= nv.toi_da_ngay) tt = "du_hom_nay";
    else if (nv.toi_da_tuan && d.tuan >= nv.toi_da_tuan) tt = "du_tuan";
    if (tt !== "da_xong") ra.push({ ...nv, trang_thai_con: tt, luot_dang: dang?.id ?? null, hom_nay: d.ngay, dang_cho: cho });
  }
  return ra;
}

/** Con bấm «Bắt đầu». Đang có lượt dở cho nhiệm vụ này ⇒ trả lượt đó (bấm lại không tạo lượt mới). */
export async function batDau(con: string, taskId: string) {
  return tx(async (t) => {
    const fam = await khoaCon(t, con);
    const nv = (await t<Nv>(`select * from tasks where id = $1 and family_id = $2 and bat and (giao_cho is null or giao_cho = $3)`, [taskId, fam, con]))[0];
    if (!nv) throw new LoiNghiepVu("khong_thay", "Không thấy nhiệm vụ", 404);
    if (nv.bang_chung === "tu_dong") throw new LoiNghiepVu("tu_dong", "Nhiệm vụ này tự cộng điểm khi con học xong với AiiRob", 409);
    if (nv.han && new Date(nv.han) <= new Date()) throw new LoiNghiepVu("qua_han", "Nhiệm vụ đã hết hạn", 409);
    const dang = (await t<{ id: string }>(`select id from submissions where child_id = $1 and task_id = $2 and trang_thai in ('dang_lam', 'can_bo_sung')`, [con, taskId]))[0];
    if (dang) return dang.id;
    const d = await demLuot(t, con, taskId, await tz(fam, t));
    if (nv.kieu === "mot_lan" && d.moi_luc > 0) throw new LoiNghiepVu("da_xong", "Con đã làm nhiệm vụ này rồi", 409);
    if (nv.toi_da_ngay && d.ngay >= nv.toi_da_ngay) throw new LoiNghiepVu("du_hom_nay", "Hôm nay đã đủ, mai làm tiếp nhé", 409);
    if (nv.toi_da_tuan && d.tuan >= nv.toi_da_tuan) throw new LoiNghiepVu("du_tuan", "Tuần này đã đủ, tuần sau làm tiếp nhé", 409);
    const id = newId();
    await t(`insert into submissions(id, task_id, child_id, trang_thai) values ($1,$2,$3,'dang_lam')`, [id, taskId, con]);
    await ghiSuKien(fam, "bat_dau_nhiem_vu", { ten: nv.ten }, { con }, t);          // Ba Mẹ thấy «Con đã nhận việc» (khay học viên / app Con)
    return id;
  });
}

export type AnhNop = { mime?: string; base64?: string };

/** Con nộp bằng chứng (từ «Đang làm» hoặc «Cần bổ sung»). Tự duyệt nếu nhiệm vụ bật tự duyệt. → {trang_thai, nghi_trung}. */
export async function nop(con: string, subId: string, b: { anh?: AnhNop[]; ghiChu?: unknown }, now = new Date()) {
  const anh = (Array.isArray(b.anh) ? b.anh : []).slice(0, 3).map((a) => {
    const mime = /^image\/(jpeg|png|webp)$/.test(String(a?.mime)) ? String(a.mime) : null;
    const buf = Buffer.from(String(a?.base64 ?? ""), "base64");
    if (!mime || !buf.length) throw new LoiNghiepVu("anh_sai", "Ảnh chưa đọc được — chụp lại nhé");
    if (buf.length > ANH_TOI_DA) throw new LoiNghiepVu("anh_qua_lon", "Ảnh lớn quá — chụp lại nhé", 413);
    return { mime, buf, bam: createHash("sha256").update(buf).digest("hex") };
  });
  const ghiChu = String(b.ghiChu ?? "").trim().slice(0, 500);
  const kq = await tx(async (t) => {
    const fam = await khoaCon(t, con);
    const s = (await t<{ id: string; task_id: string; trang_thai: string; bat_dau_luc: Date }>(
      `select id, task_id, trang_thai, bat_dau_luc from submissions where id = $1 and child_id = $2 for update`, [subId, con]))[0];
    if (!s) throw new LoiNghiepVu("khong_thay", "Không thấy lượt làm này", 404);
    if (!["dang_lam", "can_bo_sung"].includes(s.trang_thai)) throw new LoiNghiepVu("da_nop", "Con đã nộp rồi, đợi Ba Mẹ nhé", 409);
    const nv = (await t<Nv>(`select * from tasks where id = $1`, [s.task_id]))[0];
    const daPhut = (now.getTime() - new Date(s.bat_dau_luc).getTime()) / 60000;
    if (s.trang_thai === "dang_lam" && daPhut < nv.phut_toi_thieu)
      throw new LoiNghiepVu("chua_du_gio", `Làm thêm ${Math.ceil(nv.phut_toi_thieu - daPhut)} phút nữa rồi nộp nhé`, 409);
    if (nv.bang_chung === "anh" && !anh.length && s.trang_thai === "dang_lam") throw new LoiNghiepVu("thieu_anh", "Chụp ảnh bằng chứng rồi nộp nhé");
    if (nv.bang_chung === "van_ban" && ghiChu.length < 3) throw new LoiNghiepVu("thieu_chu", "Viết vài câu kể lại rồi nộp nhé");
    let trung = false;
    for (const a of anh) {
      if ((await t(`select 1 from evidence where child_id = $1 and bam = $2 and submission_id <> $3 limit 1`, [con, a.bam, s.id])).length) trung = true;
      await t(`insert into evidence(id, submission_id, child_id, mime, du_lieu, bam) values ($1,$2,$3,$4,$5,$6)`, [newId(), s.id, con, a.mime, a.buf, a.bam]);
    }
    await t(`update submissions set trang_thai = 'cho_duyet', nop_luc = $3, ghi_chu = coalesce(nullif($2, ''), ghi_chu), nghi_trung = nghi_trung or $4 where id = $1`,
      [s.id, ghiChu, now, trung]);
    await ghiSuKien(fam, "nop_nhiem_vu", { ten: nv.ten, nghi_trung: trung }, { con }, t);
    if (trung) await canhBao(fam, "bang_chung_trung", "chu_y", `Ảnh nộp cho «${nv.ten}» giống ảnh con đã nộp trước đây`, { con, chiTiet: { submission: s.id } }, t);
    return { fam, tuDuyet: nv.tu_duyet, trung };
  });
  if (kq.tuDuyet) {
    await duyet(kq.fam, subId, null, { tuDong: true });
    return { trang_thai: "duoc_duyet", nghi_trung: kq.trung };
  }
  return { trang_thai: "cho_duyet", nghi_trung: kq.trung };
}

async function lay(t: Q, fam: string, subId: string) {
  const s = (await t<{ id: string; child_id: string; task_id: string; trang_thai: string; ten: string; diem: number }>(
    `select s.id, s.child_id, s.task_id, s.trang_thai, t.ten, t.diem from submissions s join tasks t on t.id = s.task_id
     where s.id = $1 and t.family_id = $2 for update of s`, [subId, fam]))[0];
  if (!s) throw new LoiNghiepVu("khong_thay", "Không thấy nhiệm vụ cần duyệt", 404);
  if (s.trang_thai !== "cho_duyet") throw new LoiNghiepVu("da_xu_ly", "Nhiệm vụ này đã được xử lý", 409);
  return s;
}

/** Ba Mẹ duyệt (FR-03.03): cộng điểm ngay (có thể chỉnh ±), kèm lời khen. `nguoi` null = tự duyệt (AiiRob / nhiệm vụ tin cậy). */
export async function duyet(fam: string, subId: string, nguoi: string | null, o: { diem?: number; loiKhen?: string; tuDong?: boolean } = {}) {
  const r = await tx(async (t) => {
    const s = await lay(t, fam, subId);
    await khoaCon(t, s.child_id);
    const diem = o.diem === undefined ? s.diem : Math.round(Number(o.diem));
    if (!Number.isInteger(diem) || diem < 1 || diem > s.diem * 3 + 50) throw new LoiNghiepVu("diem_sai", "Điểm thưởng chưa hợp lệ");
    const loiKhen = String(o.loiKhen ?? "").trim().slice(0, 200) || null;
    await t(`update submissions set trang_thai = 'duoc_duyet', diem = $2, nguoi_duyet = $3, duyet_luc = now(), loi_khen = $4 where id = $1`,
      [s.id, diem, nguoi, loiKhen]);
    const du = await ghiDiem(t, s.child_id, diem, "nhiem_vu", `Nhiệm vụ ${s.ten}`, { ref: s.id, nguoi });
    if (loiKhen) await t(`insert into messages(id, family_id, child_id, parent_id, noi_dung) values ($1,$2,$3,$4,$5)`, [newId(), fam, s.child_id, nguoi, loiKhen]);
    await ghiSuKien(fam, o.tuDong ? "tu_duyet_nhiem_vu" : "duyet_nhiem_vu", { ten: s.ten, diem }, { con: s.child_id, nguoi }, t);
    return { con: s.child_id, diem, soDu: du };
  });
  await sauKhiDuyet(fam, r.con);
  return r;
}

/** Từ chối (có lý do, không trừ điểm — Con thấy lý do + nút «Chụp lại») hoặc yêu cầu bổ sung. */
export async function tuChoi(fam: string, subId: string, nguoi: string, lyDo: string, boSung = false) {
  const ly = String(lyDo ?? "").trim().slice(0, 200);
  if (!ly) throw new LoiNghiepVu("thieu_ly_do", "Chọn hoặc ghi lý do để Con biết cần làm gì");
  return tx(async (t) => {
    const s = await lay(t, fam, subId);
    await t(`update submissions set trang_thai = $2, nguoi_duyet = $3, duyet_luc = now(), ly_do = $4 where id = $1`,
      [s.id, boSung ? "can_bo_sung" : "tu_choi", nguoi, ly]);
    await ghiSuKien(fam, boSung ? "can_bo_sung" : "tu_choi_nhiem_vu", { ten: s.ten, ly_do: ly }, { con: s.child_id, nguoi }, t);
  });
}

/** Duyệt hàng loạt các lượt đang chờ (bỏ qua lượt đã xử lý). → số đã duyệt. */
export async function duyetHangLoat(fam: string, ids: string[], nguoi: string) {
  let n = 0;
  for (const id of ids.slice(0, 50)) {
    try { await duyet(fam, id, nguoi); n++; } catch (e) { if (!(e instanceof LoiNghiepVu)) throw e; }
  }
  return n;
}

/** Hộp thư «Chờ duyệt» (nhiệm vụ) gom theo Con. Chạy xử lý quá hạn trước. */
export async function choDuyet(fam: string) {
  await xuLyQuaHan(fam);
  return q<{ id: string; child_id: string; ten_con: string; ten: string; nhom: string; diem: number; nop_luc: Date; ghi_chu: string | null; nghi_trung: boolean; so_anh: number }>(
    `select s.id, s.child_id, c.ten as ten_con, t.ten, t.nhom, t.diem, s.nop_luc, s.ghi_chu, s.nghi_trung,
            (select count(*)::int from evidence e where e.submission_id = s.id) as so_anh
     from submissions s join tasks t on t.id = s.task_id join children c on c.id = s.child_id
     where t.family_id = $1 and s.trang_thai = 'cho_duyet' order by s.nop_luc`, [fam]);
}

/** Ảnh bằng chứng — chỉ gia đình của Con xem được (Admin không xem, FR-09.03). */
export async function anhBangChung(fam: string, subId: string) {
  return q<{ id: string; mime: string; du_lieu: Buffer; chup_luc: Date }>(
    `select e.id, e.mime, e.du_lieu, e.chup_luc from evidence e join children c on c.id = e.child_id
     where e.submission_id = $1 and c.family_id = $2 order by e.chup_luc`, [subId, fam]);
}

/** Chờ quá 24 giờ ⇒ nhắc (một lần); quá `nv_het_han_gio` ⇒ hết hạn, hoặc tự duyệt nếu Ba Mẹ bật (BRD 4.3, mục 10). */
export async function xuLyQuaHan(fam: string, now = new Date()) {
  const f = await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [fam]);
  const ts = thamSo(f?.cau_hinh);
  const qua = await q<{ id: string; child_id: string; ten: string; nop_luc: Date }>(
    `select s.id, s.child_id, t.ten, s.nop_luc from submissions s join tasks t on t.id = s.task_id
     where t.family_id = $1 and s.trang_thai = 'cho_duyet' and s.nop_luc < $2`, [fam, new Date(now.getTime() - ts.nv_nhac_gio * 3600_000)]);
  for (const s of qua) {
    const gio = (now.getTime() - new Date(s.nop_luc).getTime()) / 3600_000;
    if (gio >= ts.nv_het_han_gio) {
      if (ts.nv_tu_duyet_qua_han) await duyet(fam, s.id, null, { tuDong: true }).catch(() => {});
      else await q(`update submissions set trang_thai = 'het_han', duyet_luc = now() where id = $1 and trang_thai = 'cho_duyet'`, [s.id]);
    } else {
      await canhBao(fam, "nhac_duyet", "thong_tin", `«${s.ten}» đang chờ Ba Mẹ duyệt hơn ${ts.nv_nhac_gio} giờ`, { con: s.child_id, khoa: `nhac:${s.id}` });
    }
  }
}

/** AiiRob báo bài đạt (FR-03.04): tạo lượt đã duyệt + cộng điểm, MỘT lần mỗi bài (`ref`), chỉ khi đạt ngưỡng. → null nếu không cộng. */
export async function ketQuaAiiRob(con: string, b: { maBai: string; tenBai: string; diemSo: number }) {
  const c = await one<{ family_id: string; cau_hinh: Record<string, unknown> }>(`select family_id, cau_hinh from children where id = $1`, [con]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  const f = await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [c.family_id]);
  const ts = thamSo(f?.cau_hinh, c.cau_hinh);
  if (!(Number(b.diemSo) >= ts.aiirob_nguong)) return null;
  const ma = String(b.maBai ?? "").trim().slice(0, 80);
  if (!ma) throw new LoiNghiepVu("thieu_ma_bai", "Thiếu mã bài học");
  let nv = await one<{ id: string }>(`select id from tasks where family_id = $1 and bang_chung = 'tu_dong' and bat order by created_at limit 1`, [c.family_id]);
  if (!nv) nv = { id: await taoNv(c.family_id, { ten: "Học 1 bài với AiiRob", nhom: "hoc_tap", diem: ts.aiirob_diem, bang_chung: "tu_dong", tu_duyet: true }) };
  const id = newId();
  const moi = await q(`insert into submissions(id, task_id, child_id, trang_thai, nop_luc, ghi_chu, nguon, ref) values ($1,$2,$3,'cho_duyet', now(), $4, 'aiirob', $5)
                       on conflict (child_id, ref) where ref is not null do nothing returning id`,
    [id, nv.id, con, `${String(b.tenBai ?? "").slice(0, 120)} — ${Math.round(b.diemSo)}%`, `aiirob:${ma}`]);
  if (!moi.length) return null;                                     // bài này đã tính điểm rồi
  return duyet(c.family_id, id, null, { tuDong: true, diem: ts.aiirob_diem });
}

/** Chi tiết một lượt nộp cho màn duyệt: tên, Con, thời gian làm, lần thứ mấy hôm nay, cờ ảnh trùng. */
export async function chiTietLuot(fam: string, subId: string) {
  const s = await one<{ id: string; child_id: string; ten_con: string; ten: string; nhom: string; diem_md: number; diem: number | null; trang_thai: string;
    bat_dau_luc: Date; nop_luc: Date | null; ghi_chu: string | null; nghi_trung: boolean; ly_do: string | null; loi_khen: string | null;
    toi_da_ngay: number | null; task_id: string; tz: string }>(
    `select s.id, s.child_id, c.ten as ten_con, t.ten, t.nhom, t.diem as diem_md, s.diem, s.trang_thai, s.bat_dau_luc, s.nop_luc, s.ghi_chu,
            s.nghi_trung, s.ly_do, s.loi_khen, t.toi_da_ngay, t.id as task_id, f.tz
     from submissions s join tasks t on t.id = s.task_id join children c on c.id = s.child_id join families f on f.id = t.family_id
     where s.id = $1 and t.family_id = $2`, [subId, fam]);
  if (!s) throw new LoiNghiepVu("khong_thay", "Không thấy nhiệm vụ này", 404);
  const d = await demLuot(q, s.child_id, s.task_id, s.tz);
  const lamPhut = s.nop_luc ? Math.max(0, Math.round((new Date(s.nop_luc).getTime() - new Date(s.bat_dau_luc).getTime()) / 60000)) : null;
  return { ...s, lamPhut, lanHomNay: d.ngay };
}

const HOAN_TAC_GIAY = 30;

/** Hoàn tác một lần duyệt trong 30 giây (Gu Thanh: mỗi thao tác chính rút lại được): trừ lại điểm, lượt về «chờ duyệt», bỏ lời khen. */
export async function hoanTacDuyet(fam: string, subId: string, nguoi: string) {
  return tx(async (t) => {
    const s = (await t<{ id: string; child_id: string; trang_thai: string; diem: number; duyet_luc: Date; nguoi_duyet: string | null; loi_khen: string | null; ten: string }>(
      `select s.id, s.child_id, s.trang_thai, s.diem, s.duyet_luc, s.nguoi_duyet, s.loi_khen, t.ten from submissions s join tasks t on t.id = s.task_id
       where s.id = $1 and t.family_id = $2 for update of s`, [subId, fam]))[0];
    if (!s) throw new LoiNghiepVu("khong_thay", "Không thấy nhiệm vụ này", 404);
    if (s.trang_thai !== "duoc_duyet" || s.nguoi_duyet !== nguoi || Date.now() - new Date(s.duyet_luc).getTime() > HOAN_TAC_GIAY * 1000)
      throw new LoiNghiepVu("het_hoan_tac", "Đã quá thời gian hoàn tác", 409);
    await khoaCon(t, s.child_id);
    await ghiDiem(t, s.child_id, -s.diem, "hoan", `Hoàn tác duyệt ${s.ten}`, { ref: s.id, nguoi });
    await t(`update submissions set trang_thai = 'cho_duyet', diem = null, nguoi_duyet = null, duyet_luc = null, loi_khen = null where id = $1`, [s.id]);
    if (s.loi_khen) await t(`delete from messages where id = (select id from messages where child_id = $1 and noi_dung = $2 order by created_at desc limit 1)`, [s.child_id, s.loi_khen]);
    await ghiSuKien(fam, "hoan_tac_duyet", { ten: s.ten }, { con: s.child_id, nguoi }, t);
  });
}

/** «Tự động duyệt hôm nay» ở hộp Chờ duyệt (bm-cho-duyet): lượt AiiRob / nhiệm vụ tự duyệt đã cộng điểm từ đầu ngày theo giờ gia đình. */
export async function tuDongHomNay(fam: string, now = new Date()) {
  const f = (await one<{ tz: string }>(`select tz from families where id = $1`, [fam]))!;
  const tu = dauNgayUtc(gioDiaPhuong(now, f.tz).ngay, f.tz);
  return q<{ id: string; child_id: string; ten_con: string; ten: string; diem: number; nguon: string; ghi_chu: string | null; duyet_luc: Date }>(
    `select s.id, s.child_id, c.ten as ten_con, t.ten, s.diem, s.nguon, s.ghi_chu, s.duyet_luc
     from submissions s join tasks t on t.id = s.task_id join children c on c.id = s.child_id
     where t.family_id = $1 and s.trang_thai = 'duoc_duyet' and s.duyet_luc >= $2 and (s.nguon = 'aiirob' or t.tu_duyet)
     order by s.duyet_luc desc limit 10`, [fam, tu]);
}
