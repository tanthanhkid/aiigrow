// Ghép máy theo thiết kế chốt 05/11 (L8, docs/thiet-ke-chot/bm-ghep-may + bm-lan-dau): MỘT nội dung cho cả Lần đầu và Ghép thêm máy.
//   • «Phiên ghép» = mã 6 số hạn 10 phút (gia-dinh.ts › MA_GHEP_PHUT) + link bộ cài mang sẵn mã gia đình (gói cài một lần, không gắn loại máy —
//     trang tải tự nhận loại máy) + dữ liệu QR + câu chia sẻ (Zalo, Tin nhắn, Messenger, Sao chép). Máy mở link là tự ghép; mã 6 số là dự phòng.
//     Máy ghép bằng đường nào thì đường kia cũng hết dùng (pair_codes.goi_cai ↔ goi_cai.ma_ghep).
//   • Ghép thêm máy: «Máy mới của ai» (con) + «Cài giống máy trước» (giongMay) — lúc ghép chép cài đặt của Con dùng máy đó sang Con của máy mới.
//   • «Đang chờ máy của con»: app hỏi trangThaiGhep(ma) tới khi daGhep.
import { one, q, type Q } from "./db.ts";
import { sha, taoToken } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { thamSo } from "./cau-hinh.ts";
import { conCua, MA_GHEP_PHUT, NEN_TANG, taoMaGhep } from "./gia-dinh.ts";
import { ghiSuKien } from "./nhat-ky.ts";
import { bangM4b } from "./tuan-thu.ts";

/** Khoá cấu hình Con KHÔNG chép (trạng thái tức thời của chính Con đó, không phải «cài đặt»). */
const KHONG_CHEP = ["khoa_ngay", "khoa_den", "khoa_mo_tam_den"];

/** «Cài giống máy trước»: chép cài đặt của Con đang dùng máy `tuMay` sang Con `denCon` (máy mới `mayMoi`). Cùng Con / máy dùng chung /
 *  máy nguồn không còn ⇒ không chép gì (luật app, giờ… theo Con nên máy mới của cùng Con đã nhận sẵn). Chép: chế độ chặn, giờ ngủ + khung giờ,
 *  cấu hình (quỹ phút, tham số), luật app/web lâu dài riêng của Con (luật Con đích đã có giữ nguyên), app cho phép theo tên đang chờ khớp. */
export async function saoChepCaiDat(t: Q, fam: string, tuMay: string, denCon: string | null, mayMoi?: string) {
  if (!denCon) return false;
  const src = (await t<{ child_id: string | null }>(`select child_id from devices where id = $1 and family_id = $2`, [tuMay, fam]))[0];
  if (!src?.child_id || src.child_id === denCon) return false;
  const tu = src.child_id;
  await t(`update children d set che_do_chan = coalesce(s.che_do_chan, d.che_do_chan),
             lich = case when s.lich = '{}'::jsonb then d.lich else s.lich end,
             cau_hinh = d.cau_hinh || (s.cau_hinh - $3::text[])
           from children s where d.id = $1 and s.id = $2 and s.family_id = d.family_id`, [denCon, tu, KHONG_CHEP]);
  await t(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom, het)
           select family_id, $3, muc, ten, loai, nhom, null from app_rules where family_id = $1 and child_id = $2 and het is null
           on conflict (family_id, child_id, muc) do nothing`, [fam, tu, denCon]);
  await t(`insert into app_theo_ten(child_id, family_id, ten, ten_khoa, tinh_gio)
           select $2, family_id, ten, ten_khoa, tinh_gio from app_theo_ten where child_id = $1 and khop_luc is null
           on conflict (child_id, ten_khoa) do nothing`, [tu, denCon]);
  await ghiSuKien(fam, "sao_chep_cai_dat", { tu_may: tuMay, tu_con: tu }, { con: denCon, may: mayMoi ?? null }, t);
  return true;
}

const hienMaGhep = (ma: string) => `${ma.slice(0, 3)} ${ma.slice(3)}`;

/** POST /api/m/ghep-may {con?, giongMay?, nen?} — một lần «Ghép máy»: mã 6 số (10 phút) + link bộ cài tự ghép + QR + câu chia sẻ.
 *  `nen` bỏ trống (mặc định) = không gắn loại máy. `giongMay`: id máy trong nhà để «Cài giống máy trước». */
export async function taoPhienGhep(fam: string, b: { con?: unknown; giongMay?: unknown; nen?: unknown }, goc: string, nguoi?: string, now = new Date()) {
  await bangM4b();
  const con = b.con ? String(b.con).slice(0, 40) : null;
  const c = con ? await conCua(fam, con) : null;
  const nen = b.nen ? String(b.nen) : "";
  if (nen && !(NEN_TANG as readonly string[]).includes(nen)) throw new LoiNghiepVu("nen_tang_sai", "Chọn loại thiết bị");
  let giongMay: string | null = null;
  if (b.giongMay) {
    const m = await one<{ id: string }>(`select id from devices where id = $1 and family_id = $2`, [String(b.giongMay), fam]);
    if (!m) throw new LoiNghiepVu("khong_thay", "Không thấy máy để cài giống", 404);
    giongMay = m.id;
  }
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [fam]))!;
  const hetGoi = new Date(now.getTime() + thamSo(f.cau_hinh).goi_cai_gio * 3600_000);
  const token = taoToken(), bam = sha(token);
  const ma = await taoMaGhep(fam, con, nen, { giongMay, nguoi: nguoi ?? null, goiCai: bam });
  await q(`delete from goi_cai where expires_at < $1::timestamptz - interval '7 days'`, [now]);
  await q(`insert into goi_cai(token_hash, family_id, child_id, platform, expires_at, nguoi, giong_may, ma_ghep) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [bam, fam, con, nen, hetGoi, nguoi ?? null, giongMay, ma]);
  const het = (await one<{ expires_at: Date }>(`select expires_at from pair_codes where code = $1`, [ma]))!.expires_at;
  const g = goc.replace(/\/+$/, "");
  // Link mở trang tải: trang tự nhận loại máy, trao `g` cho bộ cài ⇒ bộ cài gọi POST /api/device/ghep-goi {token: g} — tự ghép, không gõ mã.
  const lienKet = `${g}/tai?g=${encodeURIComponent(token)}&ma=${ma}`;
  const ai = c ? `máy của ${c.ten}` : "máy của con";
  await ghiSuKien(fam, "tao_phien_ghep", { het: new Date(het).toISOString(), giong_may: giongMay }, { con, nguoi });
  return {
    ma, maHien: hienMaGhep(ma), het: new Date(het).toISOString(), hanPhut: MA_GHEP_PHUT, conGiay: Math.max(0, Math.round((new Date(het).getTime() - now.getTime()) / 1000)),
    lienKet, qr: lienKet, tokenGoi: token, hetGoi: hetGoi.toISOString(), con, giongMay,
    chiaSe: { tieuDe: `Cài AiiGrow cho ${ai}`, noiDung: `Mở link này trên ${ai} để cài AiiGrow, máy tự ghép: ${lienKet}\nHoặc nhập mã ${hienMaGhep(ma)} (dùng trong ${MA_GHEP_PHUT} phút).`, lienKet },
  };
}

/** GET /api/m/ghep-may/:ma — màn «Đang chờ máy của con»: đã ghép chưa (bằng mã hoặc bằng link), máy nào, mã còn bao lâu. */
export async function trangThaiGhep(fam: string, ma: string, now = new Date()) {
  const r = await one<{ used_at: Date | null; device_id: string | null; expires_at: Date; child_id: string | null; link_den: Date | null }>(
    `select p.used_at, p.device_id, p.expires_at, p.child_id,
            (select g.expires_at from goi_cai g where g.token_hash = p.goi_cai and g.used_at is null) as link_den
       from pair_codes p where p.code = $1 and p.family_id = $2`, [String(ma ?? "").trim(), fam]);
  if (!r) throw new LoiNghiepVu("khong_thay", "Không thấy mã ghép này — lấy mã mới nhé", 404);
  const may = r.device_id ? await one<{ id: string; name: string; platform: string; che_do: string }>(
    `select id, name, platform, che_do from devices where id = $1`, [r.device_id]) : undefined;
  const conGiay = Math.max(0, Math.round((new Date(r.expires_at).getTime() - now.getTime()) / 1000));
  // mã 6 số hết 10 phút nhưng link cùng phiên còn hạn ⇒ chưa «hết hạn» (máy mở link muộn vẫn tự ghép, màn «Đang chờ» tiếp tục hỏi)
  const linkConHan = !!r.link_den && new Date(r.link_den).getTime() > now.getTime();
  return { daGhep: !!r.used_at && !!r.device_id, hetHan: !r.used_at && conGiay === 0 && !linkConHan, conGiay, maHetHan: conGiay === 0, linkConHan, con: r.child_id,
    may: may ? { id: may.id, ten: may.name, nen: may.platform } : null };
}
