// Gia đình, hồ sơ Con, thiết bị (FR-01.02, FR-01.03). Ghép máy chép cách làm của AiiControl (mã 6 số, dùng một lần, khoá dòng
// mã trong giao dịch, token máy chỉ lưu băm). Thiết kế chốt 05/11: mã hạn 10 phút (L8), không gắn loại máy; BỎ PIN hồ sơ Con (L5) —
// máy riêng dùng token máy, máy dùng chung đổi người bằng chọn tên (phiên Con kid_sessions). Mức bảo vệ.
import { randomInt } from "node:crypto";
import { coTacTu } from "./chuyen-doi.ts";
import { newId, one, q, tx, type Q } from "./db.ts";
import { sha, taoToken } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import { saoChepCaiDat } from "./ghep-may.ts";
import { coNoi, conChoMayMoi, datConMay, ghiNoi, kiemConNha, laMotCon, loiMotCon, noiConMoiVaoMayChung } from "./may-nhieu-con.ts";

export const NEN_TANG = ["windows", "mac", "ios", "android"] as const;
export type NenTang = (typeof NEN_TANG)[number];
export const TEN_NEN_TANG: Record<NenTang, string> = { windows: "Windows", mac: "Mac", ios: "iPhone/iPad", android: "Android" };

export type Con = {
  id: string; family_id: string; ten: string; nam_sinh: number | null; avatar: string; nhom: "nhi" | "teen";
  cau_hinh: Record<string, unknown>; lich: Record<string, unknown>; chao_luc: Date | null; created_at: Date;
  /** 06/11 L13 (SCHEMA_S3): PIN 4 số vào máy dùng chung (null = chưa có) + lúc đặt. */
  pin_ma?: string | null; pin_dat_luc?: Date | null;
};
export type May = {
  id: string; child_id: string | null; family_id: string; platform: NenTang; name: string; dung_chung: boolean;
  status: Record<string, any>; last_seen: Date | null; created_at: Date;
  /** giam-sat | chan (M4b, schema SCHEMA_M4B) — chế độ agent Ba Mẹ chọn từ xa. */
  che_do?: string;
  /** true = Ba Mẹ đã chọn chế độ trên app (máy chủ gửi che_do cho agent); false = chưa chọn ⇒ hiển thị chế độ agent báo (status.cheDo). */
  che_do_ba_me?: boolean;
  /** 06/11 L13 (SCHEMA_S3): bé đang đăng nhập trên máy dùng chung · «Ba Mẹ đang dùng máy» tới lúc này (lib/pin-be.ts). */
  con_dang_dung?: string | null; dang_nhap_luc?: Date | null; ba_me_den?: Date | null; ba_me_tu?: Date | null;
  /** 14/11 «Khoá riêng máy này» (lib/khoa-may.ts): {khoa_ngay, khoa_den} như children.cau_hinh — gộp vào Policy.khoaNgay. */
  khoa_may?: Record<string, unknown> | null;
};

/** Nhí (6–10) / Teen (11–16) đề xuất theo tuổi (FR-01.02); không rõ tuổi ⇒ Nhí. */
export function nhomTheoTuoi(namSinh: number | null, nam = new Date().getFullYear()) {
  return namSinh && nam - namSinh >= 11 ? "teen" : "nhi";
}

const TEN_CON_TOI_DA = 30, TEN_MAY_TOI_DA = 80;   // 80 = đúng giới hạn tên máy lúc ghép (ghepMayGd)

/** Chuẩn hoá tên người nhập: NFC, bỏ khoảng trắng đầu/cuối, gộp khoảng trắng liên tiếp. Độ dài tính SAU bước này. */
export const chuanHoaTen = (v: unknown) => String(v ?? "").normalize("NFC").trim().replace(/\s+/g, " ");

/** Tên Con mới: chuẩn hoá + chặn rỗng/quá dài. */
function tenConHopLe(v: unknown) {
  const ten = chuanHoaTen(v);
  if (!ten) throw new LoiNghiepVu("thieu_ten", "Cho biết tên gọi của Con");
  if ([...ten].length > TEN_CON_TOI_DA) throw new LoiNghiepVu("ten_qua_dai", `Tên của Con tối đa ${TEN_CON_TOI_DA} ký tự`);
  return ten;
}

/** Con khác trùng tên trong nhà (không phân biệt hoa thường). So trong mã trên bản đã chuẩn hoá của cả tên cũ lẫn mới: nhà chỉ có vài Con, và
 *  lower() của Postgres không hạ chữ hoa có dấu khi cơ sở dữ liệu chạy locale C — so ở SQL sẽ lọt «BÉ NA» / «bé na». Gọi trong giao dịch đã khoá. */
async function trungTenCon(t: Q, fam: string, ten: string, boQua: string | null) {
  const khoa = ten.toLowerCase();
  const ds = await t<{ id: string; ten: string }>(`select id, ten from children where family_id = $1`, [fam]);
  if (ds.some((c) => c.id !== boQua && chuanHoaTen(c.ten).toLowerCase() === khoa))
    throw new LoiNghiepVu("ten_trung", `Nhà đã có Con tên «${ten}» — chọn tên khác nhé`);
}
const khoaTen = (t: Q, fam: string) => t(`select pg_advisory_xact_lock(hashtext($1))`, ["ten-con:" + fam]);

/** `saoKhoiDau` (15/11, bm1-ob-gio): sao tặng khởi đầu 0…200 (bước 10) — hàm này mặc định 0; API Ba Mẹ (POST con, thiet-lap) mặc định 30. */
export async function taoCon(fam: string, b: { ten?: unknown; namSinh?: unknown; pin?: unknown; avatar?: unknown; nhom?: unknown; saoKhoiDau?: unknown }, nguoi?: string) {
  const ten = tenConHopLe(b.ten);
  const nam = Number(b.namSinh) || null;
  if (nam && (nam < new Date().getFullYear() - 18 || nam > new Date().getFullYear() - 3)) throw new LoiNghiepVu("nam_sinh_sai", "Năm sinh chưa đúng");
  // 06/11 L13 (đảo L5): PIN 4 số Ba Mẹ đặt ở «Thêm con» (không bắt buộc — bé chưa có PIN thì chọn tên vào thẳng)
  const pin = pinVao(b.pin);
  const nhom = b.nhom === "teen" || b.nhom === "nhi" ? b.nhom : nhomTheoTuoi(nam);
  const { saoKhoiDauHopLe, tangSaoKhoiDau } = await import("./so-sao.ts");
  const saoKhoiDau = saoKhoiDauHopLe(b.saoKhoiDau, 0);
  // #340: chặn trùng tên cả lúc TẠO (hai bé cùng tên dễ chọn nhầm ở màn «Ai đang dùng máy?»). Bước thiết lập gửi lại (mất phản hồi) không
  // được kẹt ⇒ chỉ coi là GỬI LẠI khi: cùng Ba Mẹ tạo (sự kiện tao_con cùng `nguoi`), cùng dữ liệu (tên, năm sinh, có PIN, sao khởi đầu), trong 2 phút
  // ⇒ trả lại bé đó, không tạo thêm / không tặng sao lần nữa (bước nối máy chung vẫn chạy — idempotent). Ba Mẹ khác / dữ liệu khác ⇒ ten_trung.
  // Bản ghi Con + sự kiện tao_con trong CÙNG giao dịch ⇒ có Con là có dấu để nhận ra lần gửi lại.
  // #262: Con mới ở «Theo danh sách» (danh sách trắng — chan-co-ban.ts).
  const chiTiet = { ten, nhom, ...(pin ? { pin: true } : {}), ...(saoKhoiDau ? { sao_khoi_dau: saoKhoiDau } : {}) };
  const kq = await tx(async (t) => {
    await khoaTen(t, fam);
    if (nguoi) {
      const lai = (await t<{ id: string; nam_sinh: number | null; chi_tiet: Record<string, unknown> }>(
        `select c.id, c.nam_sinh, e.chi_tiet from children c join events e on e.child_id = c.id and e.loai = 'tao_con'
          where c.family_id = $1 and e.nguoi = $2 and c.created_at > now() - interval '2 minutes'`, [fam, nguoi]))
        .find((c) => chuanHoaTen(String(c.chi_tiet?.ten ?? "")).toLowerCase() === ten.toLowerCase() && (c.nam_sinh ?? null) === nam
          && !!c.chi_tiet?.pin === !!pin && Number(c.chi_tiet?.sao_khoi_dau ?? 0) === saoKhoiDau);
      if (lai) return { id: lai.id, lai: true };
    }
    await trungTenCon(t, fam, ten, null);
    const id = newId();
    await t(`insert into children(id, family_id, ten, nam_sinh, avatar, nhom, che_do_chan, pin_ma, pin_dat_luc)
              values ($1,$2,$3,$4,$5,$6,'theo_danh_sach',$7,$8)`, [id, fam, ten, nam, String(b.avatar ?? "rob").split("|")[0].slice(0, 12), nhom, pin, pin ? new Date() : null]);
    await ghiSuKien(fam, "tao_con", chiTiet, { con: id, nguoi }, t);
    return { id, lai: false };
  });
  const id = kq.id;
  if (kq.lai) { await noiConMoiVaoMayChung(fam, id); return id; }
  if (saoKhoiDau) await tangSaoKhoiDau(id, saoKhoiDau, nguoi ?? null);
  await noiConMoiVaoMayChung(fam, id);           // #267: bé mới tự có ở máy chung sẵn có (Ba Mẹ bỏ gán được)
  // 06/11 L14: nhà chưa có quà ⇒ gieo 7 quà mặc định một lần (lib/qua-bang-gia.ts). Lỗi gieo không làm hỏng việc tạo Con.
  try { await (await import("./qua-bang-gia.ts")).gieoQuaMacDinh(fam); } catch (e) { console.error("gieo quà mặc định lỗi", e); }
  return id;
}

export const dsCon = (fam: string) => q<Con>(`select * from children where family_id = $1 order by created_at`, [fam]);

/** Con của ĐÚNG gia đình này — gia đình khác ⇒ «không thấy» như không tồn tại (cách ly gia đình). */
export async function conCua(fam: string, id: string) {
  const c = await one<Con>(`select * from children where id = $1 and family_id = $2`, [id, fam]);
  if (!c) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  return c;
}

export async function suaCon(fam: string, id: string, b: { ten?: unknown; avatar?: unknown; nhom?: unknown; pin?: unknown }, nguoi?: string) {
  await conCua(fam, id);
  if (b.ten !== undefined) {
    const ten = tenConHopLe(b.ten);
    await tx(async (t) => {
      await khoaTen(t, fam);
      // Đọc tên cũ SAU khi giữ khoá: hai lần đổi song song không ghi nhật ký `tu` theo giá trị đã cũ.
      const cu = (await t<{ ten: string }>(`select ten from children where id = $1 and family_id = $2`, [id, fam]))[0];
      if (!cu) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
      const tenCu = chuanHoaTen(cu.ten);
      if (ten === tenCu) {                       // tên không đổi (sau chuẩn hoá) ⇒ không kiểm trùng, không nhật ký; giá trị thô khác ⇒ ghi lại dạng chuẩn
        if (cu.ten !== ten) await t(`update children set ten = $2 where id = $1`, [id, ten]);
        return;
      }
      await trungTenCon(t, fam, ten, id);
      await t(`update children set ten = $2 where id = $1`, [id, ten]);
      await ghiSuKien(fam, "doi_ten_con", { tu: tenCu, den: ten }, { con: id, nguoi }, t);
    });
  }
  if (b.avatar !== undefined) {
    // #302: đổi màu («mau-N») không làm mất ảnh đại diện đang có
    const cu = (await one<{ avatar: string }>(`select avatar from children where id = $1`, [id]))?.avatar ?? "";
    const dauAnh = cu.includes("|anh:") ? cu.slice(cu.indexOf("|anh:")) : "";
    const moi = String(b.avatar).split("|")[0].slice(0, 12);
    await q(`update children set avatar = $2 where id = $1`, [id, moi + dauAnh]);
  }
  if (b.nhom === "nhi" || b.nhom === "teen") await q(`update children set nhom = $2 where id = $1`, [id, b.nhom]);
  // 06/11 L13: đặt lại PIN cũng nhận ở đây (đường riêng: POST con/:id/pin — lib/pin-be.ts › datPin, kèm xoá bộ đếm sai + báo quên PIN)
  if (b.pin !== undefined && b.pin !== "") await (await import("./pin-be.ts")).datPin(fam, id, b.pin, nguoi);
}

/** Ảnh đại diện (#302): ≤ ~600 KB sau giải mã; `null` = gỡ ảnh, trở về chữ cái + màu. Ảnh nằm ở cột riêng, avatar chỉ giữ dấu «|anh:<giây>». */
export const ANH_DAI_DIEN_TOI_DA = 600 * 1024;
export async function datAnhDaiDien(fam: string, id: string, b: { base64?: unknown; mime?: unknown; xoa?: unknown }, nguoi?: string) {
  const c = await conCua(fam, id);
  const goc = String(c.avatar).split("|")[0];
  if (b.xoa === true) {
    await q(`update children set anh_dai_dien = null, anh_mime = null, avatar = $2 where id = $1`, [id, goc]);
    return { ok: true, avatar: goc };
  }
  const mime = String(b.mime ?? "image/jpeg");
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new LoiNghiepVu("anh_sai", "Ảnh cần là JPEG, PNG hoặc WebP");
  const raw = String(b.base64 ?? "").replace(/^data:[^,]*,/, "");
  const buf = Buffer.from(raw, "base64");
  if (!buf.length) throw new LoiNghiepVu("anh_sai", "Chưa nhận được ảnh");
  if (buf.length > ANH_DAI_DIEN_TOI_DA) throw new LoiNghiepVu("anh_lon", "Ảnh lớn quá — chụp lại hoặc chọn ảnh nhỏ hơn nhé", 413);
  const avatar = `${goc}|anh:${Math.floor(Date.now() / 1000)}`;
  await q(`update children set anh_dai_dien = $2, anh_mime = $3, avatar = $4 where id = $1`, [id, buf, mime, avatar]);
  await ghiSuKien(fam, "doi_anh_con", {}, { con: id, nguoi });
  return { ok: true, avatar };
}
export async function anhDaiDien(fam: string, id: string) {
  await conCua(fam, id);
  const r = await one<{ anh_dai_dien: Buffer | null; anh_mime: string | null }>(`select anh_dai_dien, anh_mime from children where id = $1`, [id]);
  if (!r?.anh_dai_dien) throw new LoiNghiepVu("khong_thay", "Con chưa có ảnh đại diện", 404);
  return { mime: r.anh_mime ?? "image/jpeg", base64: Buffer.from(r.anh_dai_dien).toString("base64") };
}

/** PIN lúc tạo Con: bỏ trống ⇒ null; có thì đúng 4 chữ số. */
function pinVao(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();
  if (!/^\d{4}$/.test(s)) throw new LoiNghiepVu("pin_sai_dang", "PIN gồm đúng 4 chữ số");
  return s;
}

// ---------------------------------------------------------------- ghép máy (FR-01.03)

/** Hạn mã ghép 6 số (thiết kế 05/11 L8: «Mã dùng được 10 phút»; trước là 15). */
export const MA_GHEP_PHUT = 10;

/** Mã 6 số, hạn MA_GHEP_PHUT phút. `con` null = máy dùng chung (đổi người bằng chọn tên). `platform` '' = không gắn loại máy (máy nào nhập
 *  cũng ghép, loại máy lấy theo máy báo). `o.giongMay`: «Cài giống máy trước» — chép cài đặt lúc ghép. `o.goiCai`: băm token link bộ cài đi kèm. */
/** `o.conDs` (#267): ghép MỘT máy cho nhiều Con (≥ 2 — máy chung); một Con thì truyền `con` như trước. */
export async function taoMaGhep(fam: string, con: string | null, platform: string,
  o: { giongMay?: string | null; nguoi?: string | null; goiCai?: string | null; conDs?: string[] | null } = {}) {
  if (platform !== "" && !(NEN_TANG as readonly string[]).includes(platform)) throw new LoiNghiepVu("nen_tang_sai", "Chọn loại thiết bị");
  if (con) await conCua(fam, con);
  const conDs = o.conDs && o.conDs.length >= 2 ? o.conDs : null;
  if (conDs) {
    await kiemConNha(q, fam, conDs);
    if (laMotCon(platform)) throw loiMotCon({ toiDa: 1 });
  }
  // mã của «phiên ghép» còn link bộ cài sống (48 giờ) thì giữ — màn «Đang chờ» tra trạng thái theo mã
  await q(`delete from pair_codes p where p.expires_at < now() - interval '1 day'
             and not exists (select 1 from goi_cai g where g.token_hash = p.goi_cai and g.expires_at > now())`);
  for (let i = 0; i < 20; i++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");        // CSPRNG (#550): bộ sinh số giả ngẫu nhiên của V8 đoán được từ chuỗi mã đã thấy
    const r = await q(`insert into pair_codes(code, family_id, child_id, platform, expires_at, giong_may, nguoi, goi_cai, con_ds)
                       values ($1,$2,$3,$4, now() + make_interval(mins => $5), $6, $7, $8, $9::text::jsonb)
                       on conflict (code) do nothing returning code`,
      [code, fam, conDs ? null : con, platform, MA_GHEP_PHUT, o.giongMay ?? null, o.nguoi ?? null, o.goiCai ?? null, conDs ? JSON.stringify(conDs) : null]);
    if (r.length) return code;
  }
  throw new Error("Không tạo được mã ghép");
}

const GHEP_SAI_TOI_DA = 10;                  // lượt sai / nguồn (IPv4 hoặc IPv6 /64) / khung
const GHEP_SAI_48 = 60;                      // lượt sai / khối IPv6 /48 / khung (một người thuê được cả /48 = 65k khối /64; nhà mạng di động
                                             // chia /64 cho từng máy trong một /48 ⇒ để rộng, không khoá oan thuê bao cùng khối)
const GHEP_SAI_BI_DO = 3;                    // lượt sai / nguồn khi hệ thống đang bị dò
/** Ngưỡng «bị dò» TOÀN CỤC (#550): tổng lượt sai mọi nguồn trong khung vượt ngưỡng ⇒ mỗi nguồn (IPv4 / IPv6 /64) chỉ còn GHEP_SAI_BI_DO lượt
 *  tới hết khung. Mỗi khung kẻ dò thử được ~GHEP_SAI_TONG + GHEP_SAI_BI_DO × (số nguồn nắm trong tay, IPv6 tối đa 60 / khối /48) lượt; người
 *  gõ đúng trong vài lần đầu vẫn ghép được (không khoá cứng cả hệ thống — vài chục IP không chặn được việc ghép của mọi gia đình). */
export const GHEP_SAI_TONG = 200;

const GHEP_KHUNG_MS = 15 * 60_000;           // khung đếm lượt SAI (chống dò mã) — khác hạn mã (MA_GHEP_PHUT)
// Mỗi bộ đếm một câu lệnh tự commit (khoá một dòng rồi nhả ngay) ⇒ không giữ khoá nhiều dòng, không thể deadlock giữa các yêu cầu song song.
const tra1 = (khoa: string) => q(`update pin_sai set so_lan = greatest(so_lan - 1, 0) where khoa = $1`, [khoa]);
/** Trả lượt — lỗi DB khi trả không được che lỗi gốc / biến ghép thành công thành lỗi. */
const traLuot = async (khoa: string[]) => { await Promise.all(khoa.map((k) => tra1(k).catch(() => undefined))); };
const giuCho = async (khoa: string) => (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan) values ($1, 1)
    on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1 returning so_lan`, [khoa]))[0].so_lan;
const tamKhoaGhep = () => new LoiNghiepVu("ghep_tam_khoa", "Nhập sai mã nhiều lần — đợi 15 phút rồi thử lại", 429);

/** Khối IPv6 /48 của nguồn (đã gộp /64 ở nguonGoi); IPv4 ⇒ null. */
export const khoi48 = (nguon: string) => (nguon.includes(":") ? nguon.split(":").slice(0, 3).join(":") : null);

/** Ghép máy bằng mã 6 số. Mỗi nguồn (IPv4 / IPv6 /64) được tối đa 10 lần sai, mỗi khối IPv6 /48 tối đa 60 lần trong một khung 15 phút, quá ⇒
 *  khoá tới hết khung — chặn dò mã (chốt BRD #56 câu 3). Tổng lượt sai mọi nguồn vượt GHEP_SAI_TONG ⇒ mỗi nguồn còn 3 lượt (#550). Khung cố
 *  định theo giờ ⇒ gõ nhầm lẻ tẻ nhiều ngày không cộng dồn. Giữ chỗ lượt thử TRƯỚC khi thử (upsert nguyên tử) ⇒ gửi song song cũng chỉ ≤ trần
 *  lượt lọt; ghép đúng hoặc lỗi không phải sai mã thì trả lại lượt. Tổng chỉ được giữ chỗ SAU khi qua trần riêng ⇒ một nguồn dội song song
 *  không đẩy được cả hệ thống vào chế độ bị dò. */
export async function ghepMay(code: string, platform: string, tenMay: string, nguon = "?", now = Date.now(), maMay?: unknown, chon?: unknown) {
  const k = Math.floor(now / GHEP_KHUNG_MS), k48 = khoi48(nguon);
  const khoa = `ghep:${nguon}:${k}`, khoa48 = k48 ? `ghep48:${k48}:${k}` : null, khoaTong = `ghep_tong:${k}`;
  const daGiu: string[] = [];
  const giu = async (k: string) => { const n = await giuCho(k); daGiu.push(k); return n; };
  try {
    const rieng = await giu(khoa);
    if (rieng > GHEP_SAI_TOI_DA) { daGiu.length = 0; throw tamKhoaGhep(); }          // lượt riêng quá trần: giữ nguyên bộ đếm
    if (khoa48 && (await giu(khoa48)) > GHEP_SAI_48) throw tamKhoaGhep();
    // đang bị dò: lượt không được thử ⇒ trả tổng + /48 (không khoá oan cả khối); lượt riêng giữ (nguồn đã quá trần lúc bị dò)
    if ((await giu(khoaTong)) > GHEP_SAI_TONG && rieng > GHEP_SAI_BI_DO) { daGiu.splice(daGiu.indexOf(khoa), 1); throw tamKhoaGhep(); }
  } catch (e) {
    await traLuot(daGiu);                      // lỗi DB giữa chừng / bị chặn: trả các lượt đã giữ mà chưa thử
    throw e;
  }
  let kq: Awaited<ReturnType<typeof ghepMayGd>>;
  try {
    kq = await ghepMayGd(code, platform, tenMay, maMay, chon);
  } catch (e) {
    if (!(e instanceof LoiNghiepVu && e.ma === "ma_sai")) await traLuot(daGiu);
    throw e;
  }
  await traLuot(daGiu);
  return kq;
}

/** Cron hằng ngày: xoá bộ đếm lượt ghép của các khung đã qua. → số dòng. */
export async function donBoDemGhep(now = Date.now()) {
  const k = Math.floor(now / GHEP_KHUNG_MS);
  return (await q(`delete from pin_sai where (khoa like 'ghep:%' or khoa like 'ghep48:%' or khoa like 'ghep\\_tong:%')
    and substring(khoa from '[0-9]+$')::bigint < $1 returning 1`, [k - 1])).length;
}

/** IP gọi để đếm lượt ghép: `x-real-ip` (Vercel đặt, không giả được) trước, rồi `x-forwarded-for`; IPv6 gộp theo /64 (một máy xoay được cả dải). */
export function nguonGoi(h: Headers) {
  let ip = (h.get("x-real-ip") ?? h.get("x-forwarded-for") ?? "?").split(",")[0].trim().toLowerCase();
  ip = ip.replace(/^\[([^\]]+)\](?::\d+)?$/, "$1");                       // [IPv6]:cổng
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/.exec(ip);    // IPv4 ánh xạ IPv6 / kèm cổng ⇒ IPv4 trần
  if (v4) return v4[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ip);           // ::ffff:102:304 ⇒ 1.2.3.4
  if (hex) { const a = parseInt(hex[1], 16), b = parseInt(hex[2], 16); return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`; }
  if (!ip.includes(":")) return ip;
  const [dau, cuoi = ""] = ip.split("::");                            // mở «::» thành đủ 8 nhóm rồi mới lấy /64
  const a = dau ? dau.split(":") : [], b = ip.includes("::") && cuoi ? cuoi.split(":") : [];
  const du = ip.includes("::") ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b] : a;
  return du.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, "")).join(":");
}

/** Chế độ máy mới ghép: máy Windows/Mac RIÊNG của một Con ⇒ «chan» ngay. Máy dùng chung chưa gán Con ⇒ null (chặn với luật rỗng sẽ khoá nhầm
 *  cả nhà); khi Con chọn tên trên máy, máy chủ gửi «chan» (lenh-may.ts › cheDoGuiMay). Nền khác (điện thoại) ⇒ null. */
export const cheDoMayMoi = (nen: string, conId: string | null): "chan" | null => (coTacTu(nen) && conId ? "chan" : null);

/** Định danh máy agent gửi lúc ghép (SHA-256 hex của MachineGuid / IOPlatformUUID + muối — không phải mã thô). Sai dạng ⇒ bỏ qua (như không gửi). */
export function maMayHopLe(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[0-9a-f]{16,64}$/.test(s) ? s : null;
}

/** «Hai nhà một máy» (11/11): máy vừa ghép (id `moi`) mang `maMay` ⇒ mọi bản ghi devices KHÁC cùng ma_may là chính máy này ghép trước đó
 *  (nhà cũ, hoặc cùng nhà ghép lại) ⇒ xử lý như gỡ máy (lenh-may.ts › daGoTaiMay): huỷ lệnh chờ, xoá dòng máy (token cũ 401, máy biến mất khỏi
 *  danh sách + An toàn), ghi sự kiện + cảnh báo «may_chuyen_nha» cho nhà cũ — KHÔNG lộ nhà mới. */
async function thuHoiMayCu(t: Q, maMay: string, moi: string, famMoi: string) {
  const cu = await t<{ id: string; family_id: string; child_id: string | null; name: string }>(
    `select id, family_id, child_id, name from devices where ma_may = $1 and id <> $2 for update`, [maMay, moi]);
  for (const m of cu) {
    const cungNha = m.family_id === famMoi;
    await t(`update lenh_may set trang_thai = 'huy' where device_id = $1 and trang_thai = 'cho'`, [m.id]);
    await t(`delete from devices where id = $1`, [m.id]);
    await ghiSuKien(m.family_id, "may_chuyen_nha", { ten: m.name, ...(cungNha ? { cungNha: true } : {}) }, { con: m.child_id, may: m.id }, t);
    await canhBao(m.family_id, "may_chuyen_nha", cungNha ? "thong_tin" : "chu_y",
      cungNha ? `${m.name} vừa được ghép lại — bản cũ đã bỏ khỏi danh sách`
        : `${m.name} đã ghép sang tài khoản khác — AiiGrow không còn quản lý máy này cho nhà mình`,
      { con: m.child_id, may: m.id, khoa: `chuyen_nha:${m.id}` }, t);
  }
  return cu.length;
}

/** Ghép trong giao dịch, không đếm lượt — `doiGoiCai` gọi thẳng (mã tạm tự tạo từ token gói cài, không phải mã người gõ). */
/** `chon` (#267): iPhone/iPad ghép bằng mã cho nhiều Con ⇒ agent gửi id MỘT Con trong danh sách (thiếu ⇒ 409 ios_mot_con kèm `conChon`). */
export function ghepMayGd(code: string, platform: string, tenMay: string, maMayVao?: unknown, chon?: unknown) {
  const maMay = maMayHopLe(maMayVao);
  return tx(async (t) => {
    code = String(code ?? "").trim();
    const m = (await t<{ family_id: string; child_id: string | null; platform: NenTang | ""; expires_at: Date; used_at: Date | null;
      giong_may: string | null; goi_cai: string | null; con_ds: unknown }>(
      `select family_id, child_id, platform, expires_at, used_at, giong_may, goi_cai, con_ds from pair_codes where code = $1 for update`, [code]))[0];
    if (!m) throw new LoiNghiepVu("ma_sai", "Mã ghép không đúng", 404);
    if (m.used_at) throw new LoiNghiepVu("ma_da_dung", "Mã này đã dùng rồi — xin Ba Mẹ mã mới", 409);
    if (new Date(m.expires_at) < new Date()) throw new LoiNghiepVu("ma_het_han", "Mã đã hết hạn — xin Ba Mẹ mã mới", 410);
    // mã không gắn loại máy ('') ⇒ nhận loại máy agent báo (phải là loại hợp lệ)
    if (m.platform === "" ? !(NEN_TANG as readonly string[]).includes(platform) : m.platform !== platform)
      throw new LoiNghiepVu("sai_nen_tang", m.platform ? `Mã này dành cho ${TEN_NEN_TANG[m.platform]}` : "Loại máy không hợp lệ", 409);
    // mã đi kèm link bộ cài: link đã được dùng (máy khác đang / đã ghép bằng link) ⇒ mã cũng hết dùng — giành link trong cùng giao dịch
    if (m.goi_cai && !(await t(`update goi_cai set used_at = now() where token_hash = $1 and used_at is null returning token_hash`, [m.goi_cai])).length)
      throw new LoiNghiepVu("ma_da_dung", "Mã này đã dùng rồi — xin Ba Mẹ mã mới", 409);
    // #267: Con nối với máy mới (một / nhiều / mã cũ không Con = cả nhà); iPhone/iPad đúng một Con
    const dsCon = await conChoMayMoi(t, m.family_id, platform, m, chon);
    const conMot = dsCon.length === 1 ? dsCon[0] : null;
    const id = newId(), token = taoToken();
    const tenLuu = [...chuanHoaTen(tenMay)].slice(0, TEN_MAY_TOI_DA).join("") || TEN_NEN_TANG[platform as NenTang];
    // Máy MỚI có tác tử (Windows/Mac) vào thẳng «Chặn thật» (Thanh 25/10: «cài xong là vô chặn được luôn»; thiết kế 05/11: máy luôn chặn thật,
    // kể cả máy dùng chung): ghi sẵn che_do = chan + che_do_ba_me ⇒ lần đồng bộ đầu agent (Win/Mac) đổi ngay. Máy cũ: lenh-may.ts › cheDoGuiMay luôn gửi «chan».
    const cheDo = cheDoMayMoi(platform, conMot);
    await t(`insert into devices(id, child_id, family_id, platform, name, token_hash, dung_chung, last_seen, che_do, che_do_ba_me, ma_may)
             values ($1,$2,$3,$4,$5,$6,$7, now(), $8, $9, $10)`,
      [id, conMot, m.family_id, platform, tenLuu, sha(token), dsCon.length !== 1, cheDo ?? "giam-sat", !!cheDo, maMay]);
    await ghiNoi(t, { id, family_id: m.family_id }, dsCon);
    if (maMay) await thuHoiMayCu(t, maMay, id, m.family_id);
    await t(`update pair_codes set used_at = now(), device_id = $2 where code = $1`, [code, id]);
    // link bộ cài đi kèm mã này (cùng một lần «Ghép máy») hết dùng — máy đã ghép bằng mã
    if (m.goi_cai) await t(`update goi_cai set device_id = coalesce(device_id, $2) where token_hash = $1`, [m.goi_cai, id]);
    await ghiSuKien(m.family_id, "ghep_may", { platform, ten: tenLuu, ...(cheDo ? { cheDo } : {}), ...(dsCon.length >= 2 ? { soCon: dsCon.length } : {}) },
      { con: conMot, may: id }, t);
    // «Cài giống máy trước» (L8): chép cài đặt của Con dùng máy đó sang Con của máy mới (cùng Con thì luật đã dùng chung, không cần chép)
    if (m.giong_may) for (const c of dsCon) await saoChepCaiDat(t, m.family_id, m.giong_may, c, id);
    // childName: khay chào đúng tên Con ngay sau khi cài (không đợi lần đồng bộ đầu). Không có Con ⇒ bỏ hẳn field
    // (bộ cài 0.2.0/0.2.1 đọc vào string không-null — gửi null là rủi ro).
    const conDs = dsCon.length ? await t<{ id: string; ten: string; avatar: string }>(
      `select id, ten, avatar from children where id = any($1::text[]) order by created_at`, [dsCon]) : [];
    const ten = conMot ? conDs.find((c) => c.id === conMot)?.ten : undefined;
    // dungChung = máy CHUNG (≥ 2 Con) — agent cũ hiện «Máy dùng chung» + màn chọn tên; conDs (#267): Con nối với máy
    return { deviceId: id, token, dungChung: dsCon.length !== 1, conDs, ...(ten ? { childName: ten } : {}) };
  });
}

/** Ba Mẹ gán Con cho máy — đường cũ POST may/:id/gan-con {con}: chuỗi = máy RIÊNG của đúng Con đó (thay danh sách nối như trước); mảng = danh sách
 *  Con dùng máy (#267, như POST may/:id/con {ds}). Máy nhận luật của Con ở lần đồng bộ kế. */
export async function ganConMay(fam: string, mayId: string, con: unknown, nguoi?: string) {
  if (!Array.isArray(con) && !String(con ?? "").trim()) throw new LoiNghiepVu("thieu_con", "Chọn Con dùng máy này");
  const kq = await datConMay(fam, mayId, con, nguoi);
  if (!Array.isArray(con)) await ghiSuKien(fam, "gan_con_may", {}, { con: String(con).trim(), may: mayId, nguoi });
  return kq;
}

/** Ba Mẹ đổi tên hiển thị của máy (devices.name — đặt lúc ghép). Máy của gia đình khác ⇒ «không thấy». */
export async function doiTenMay(fam: string, mayId: string, ten: unknown, nguoi?: string) {
  const t = chuanHoaTen(ten);
  if (!t) throw new LoiNghiepVu("thieu_ten", "Cho biết tên gọi của máy");
  if ([...t].length > TEN_MAY_TOI_DA) throw new LoiNghiepVu("ten_qua_dai", `Tên máy tối đa ${TEN_MAY_TOI_DA} ký tự`);
  await (await import("./dns-gia-dinh.ts")).bangMang();     // bảng DNS tạo lười — nhập động vì dns-gia-dinh nhập lại tệp này
  const doi = await tx(async (tq) => {
    await tq(`select pg_advisory_xact_lock(hashtext($1))`, ["ten-may:" + mayId]);
    const cu = (await tq<{ name: string; child_id: string | null }>(`select name, child_id from devices where id = $1 and family_id = $2`, [mayId, fam]))[0];
    if (!cu) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
    if (chuanHoaTen(cu.name) === t) {            // không đổi sau chuẩn hoá: không nhật ký; lưu thô khác ⇒ ghi lại dạng chuẩn
      if (cu.name !== t) {
        await tq(`update devices set name = $2 where id = $1 and family_id = $3`, [mayId, t, fam]);
        await tq(`update dns_thiet_bi set ten = $2 where device_id = $1`, [mayId, t]);
      }
      return false;
    }
    await tq(`update devices set name = $2 where id = $1 and family_id = $3`, [mayId, t, fam]);
    await tq(`update dns_thiet_bi set ten = $2 where device_id = $1`, [mayId, t]);   // màn DNS + sự kiện DNS hiện tên mới
    await ghiSuKien(fam, "doi_ten_may", { tu: chuanHoaTen(cu.name), den: t }, { con: cu.child_id, may: mayId, nguoi }, tq);
    return true;
  });
  return { ok: true, ten: t, doi };
}

export const mayTuToken = (token: string) => one<May>(`select * from devices where token_hash = $1`, [sha(token)]);

export async function goMay(fam: string, mayId: string, nguoi?: string) {
  const d = await one<{ id: string; child_id: string | null; name: string }>(`select id, child_id, name from devices where id = $1 and family_id = $2`, [mayId, fam]);
  if (!d) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  await q(`delete from devices where id = $1`, [d.id]);
  await ghiSuKien(fam, "go_may", { ten: d.name }, { con: d.child_id, nguoi });
}

// ---------------------------------------------------------------- mức bảo vệ (FR-01.03)
export type MucBaoVe = "day_du" | "mot_phan" | "chua";
export type ThieuQuyen = { ma: string; ten: string; cach: string };

/** Quyền agent báo trong `status.quyen` → tên dễ hiểu + cách khắc phục (hiện ở app Ba Mẹ). Khoá lạ vẫn được tính, hiện nguyên tên khoá. */
const MO_TA_QUYEN: Record<string, { ten: string; cach: string }> = {
  dichVu: { ten: "Dịch vụ AiiGrow chạy nền", cach: "Cài lại AiiGrow trên máy Con: bấm phải vào trình cài › «Run as administrator» (cần quyền quản trị một lần)." },
  khay: { ten: "Khay AiiGrow trên màn hình Con", cach: "Đăng nhập đúng tài khoản Windows của Con; nếu vẫn không thấy biểu tượng AiiGrow ở góc phải dưới, khởi động lại máy." },
  chanThat: { ten: "Chế độ Chặn thật", cach: "Máy chưa chặn. AiiGrow luôn chặn thật — máy đổi ở lần đồng bộ tới (≤ 3 phút khi có mạng); lâu vẫn chưa đổi: cập nhật AiiGrow trên máy Con lên bản mới nhất." },
  appLocker: { ten: "Khoá app «Chỉ app học» (AppLocker)", cach: "Windows chưa áp được luật chặn app: cần Windows Pro/Enterprise/Education và dịch vụ AiiGrow chạy bằng quyền quản trị — cài lại bằng «Run as administrator»." },
  dich_vu: { ten: "Dịch vụ AiiGrow", cach: "Cài lại AiiGrow bằng quyền quản trị." },
  haQuyenAdmin: { ten: "Tài khoản Mac của Con vẫn là quản trị (admin)", cach: "Con có thể tự gỡ AiiGrow. Trên Mac: Cài đặt hệ thống › Người dùng & Nhóm › tài khoản của Con › tắt «Cho phép người dùng quản trị máy tính này» (cần một tài khoản quản trị khác của Ba Mẹ)." },
  phienCon: { ten: "Máy đang dùng tài khoản Windows khác (không phải của Con)", cach: "Lúc đó AiiGrow không chặn, không đếm giờ. Đăng xuất tài khoản đang dùng, để Con đăng nhập tài khoản Windows của mình." },
};

/** `status.quyen` agent báo; máy cũ (agent-win trước khi có `quyen`) chỉ gửi trạng thái thô ⇒ suy ra từ đó thay vì coi như «chưa báo». */
export function quyenCuaMay(may: Pick<May, "status">): Record<string, boolean> | null {
  const st = may.status ?? {};
  const qy = st.quyen as Record<string, boolean> | undefined;
  if (qy && typeof qy === "object" && Object.keys(qy).length) return qy;
  if (!coTacTu(st.agent)) return null;
  const chan = st.cheDo === "chan" && st.moCoi !== true;
  const r: Record<string, boolean> = { dichVu: true, khay: st.trayAlive === true || st.childSessionActive !== true, chanThat: chan };
  if (chan && st.mode === "hoc" && st.agent === "windows") r.appLocker = st.appLockerApplied === true;
  return r;
}

/** Mức bảo vệ + danh sách quyền còn thiếu (kèm cách khắc phục). Chưa từng kết nối ⇒ «chua»; kết nối được mà thiếu quyền ⇒ «mot_phan» (nói rõ thiếu gì). */
/** Cách sửa «chanThat» theo lựa chọn của Ba Mẹ: đã chọn Chặn thật mà máy chưa đổi ⇒ đang chờ máy nhận (không bảo Ba Mẹ bật lại);
 *  Ba Mẹ chủ ý chọn Chỉ theo dõi ⇒ nói đó là lựa chọn của Ba Mẹ. Chưa chọn (máy ghép trước 25/10) ⇒ câu chung ở MO_TA_QUYEN. */
const CACH_CHAN_THAT = {
  chan: "Máy đang chuyển sang Chặn thật — máy đổi ở lần đồng bộ tới (≤ 3 phút khi có mạng). Lâu vẫn chưa đổi: cập nhật AiiGrow trên máy Con lên bản mới nhất.",
  "giam-sat": "Ba Mẹ đang để máy Chỉ theo dõi (ghi lại, chưa chặn). Muốn chặn: mở app Ba Mẹ › chọn máy › «Chặn thật».",
} as const;

export function chiTietBaoVe(may: Pick<May, "status" | "last_seen"> & Pick<Partial<May>, "che_do" | "che_do_ba_me">): { muc: MucBaoVe; thieu: ThieuQuyen[]; cau: string } {
  if (!may.last_seen) return { muc: "chua", thieu: [], cau: "Máy chưa kết nối lần nào — kiểm tra AiiGrow đã cài xong trên máy Con và máy có mạng." };
  const qy = quyenCuaMay(may);
  if (!qy) return { muc: "chua", thieu: [], cau: "Máy chưa báo quyền bảo vệ — cập nhật AiiGrow trên máy Con lên bản mới nhất." };
  // máy mồ côi tự thôi chặn (moCoi) không «đang chuyển» gì ⇒ dùng câu chung. Thiết kế 05/11: máy chủ luôn gửi «chan» (lenh-may.ts › cheDoGuiMay)
  const chon = may.status?.moCoi !== true ? "chan" as const : null;
  const thieu = Object.entries(qy).filter(([, v]) => v !== true).map(([ma]) => ({ ma, ten: MO_TA_QUYEN[ma]?.ten ?? ma,
    cach: (ma === "chanThat" && chon ? CACH_CHAN_THAT[chon] : MO_TA_QUYEN[ma]?.cach) ?? "Cài lại AiiGrow bằng quyền quản trị rồi thử lại." }));
  // agent-win 0.2.6 gửi ghiChuBaoVe («Win Home: chặn bằng cách đóng app», «Chrome: IT đặt danh sách web cho cả máy…») — nối vào câu ở MỌI mức, Ba Mẹ thấy cả khi còn thiếu quyền
  const ghiChu = typeof may.status?.ghiChuBaoVe === "string" && may.status.ghiChuBaoVe.trim() ? ` (${may.status.ghiChuBaoVe.trim().slice(0, 240)})` : "";
  // tên từng mục thiếu đã hiện ngay dưới (DsThieuBaoVe) ⇒ câu chỉ nói số mục, không lặp tên
  return thieu.length ? { muc: "mot_phan", thieu, cau: `${thieu.length} việc cần sửa (xem bên dưới).` + ghiChu } : { muc: "day_du", thieu: [], cau: "Bảo vệ đầy đủ." + ghiChu };
}

/** Mức bảo vệ (FR-01.03): đủ quyền ⇒ Đầy đủ, thiếu một phần ⇒ Một phần, chưa kết nối / chưa báo ⇒ Chưa bảo vệ. */
export const mucBaoVe = (may: Pick<May, "status" | "last_seen">): MucBaoVe => chiTietBaoVe(may).muc;

// ---------------------------------------------------------------- đổi người trên máy dùng chung (L5: không PIN)

/** Con chọn TÊN mình trên máy `may` (dùng chung, hoặc máy riêng của chính Con) ⇒ token phiên Con (12 giờ). Không còn PIN (thiết kế 05/11):
 *  máy đã ghép (token máy) là đủ tin — máy dùng chung đổi người bằng chọn tên. Tham số `_pin` (agent / app bản cũ còn gửi) bỏ qua. */
export async function chonCon(may: May, con: string) {
  const c = await one<{ id: string; family_id: string }>(`select id, family_id from children where id = $1`, [con]);
  // #267: chỉ Con trong danh sách nối của máy
  if (!c || c.family_id !== may.family_id || !(await coNoi(may.id, c.id)))
    throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ này trên máy", 404);
  const t = taoToken();
  await q(`insert into kid_sessions(id, child_id, device_id, expires_at) values ($1,$2,$3, now() + interval '12 hours')`, [sha(t), c.id, may.id]);
  await ghiSuKien(may.family_id, "doi_nguoi_may", {}, { con: c.id, may: may.id });
  return t;
}

/** Tên cũ: «đăng nhập PIN» — giờ là chọn tên (PIN bỏ qua). Giữ cho agent / đường /api/device/pin bản cũ. */
export const dangNhapPin = (may: May, con: string, _pin?: string) => chonCon(may, con);

export const conTuPhien = (token: string) =>
  one<Con & { device_id: string | null }>(`select c.*, k.device_id from kid_sessions k join children c on c.id = k.child_id
                                           where k.id = $1 and k.expires_at > now()`, [sha(token)]);
