// M4b — CÀI MỘT CHẠM + GỠ TỪ XA (yêu cầu cứng, master 21/10).
// (a) Gói cài: Ba Mẹ tạo «gói cài» cho một Con + nền tảng ⇒ token enroll MỘT lần, có hạn (goi_cai_gio), chỉ lưu băm; token nhúng sẵn trong
//     tệp tải / QR (lib/chuyen-doi.ts › huongDanCai) ⇒ không nhập URL / mã tay. Agent đổi token lấy token máy qua `POST /api/device/ghep
//     {token, nen, tenMay}` — tái dùng ghepMay (mã 6 số tạm tạo từ token) nên mọi kiểm tra / sự kiện ghép giữ nguyên một chỗ.
// (b) Gỡ từ xa: chủ gia đình xác thực lại bằng mật khẩu ⇒ máy chủ ghi lệnh «go» ⇒ agent lấy lệnh qua nhịp / dong-bo (`lenh: [{id, loai}]`)
//     ⇒ `POST /api/device/lenh/:id/xong` ⇒ máy chuyển «đã gỡ» (xoá khỏi gia đình, hết cảnh báo mất nhịp). Báo xong lần hai ⇒ ok, không ghi đôi.
import { newId, one, q } from "./db.ts";
import { dungMatKhau, sha, taoToken } from "./auth.ts";
import { LoiNghiepVu } from "./loi.ts";
import { thamSo } from "./cau-hinh.ts";
import { NEN_TANG, conCua, ghepMay, taoMaGhep, type May, type NenTang } from "./gia-dinh.ts";
import { canhBao, ghiSuKien } from "./nhat-ky.ts";
import { bangM4b } from "./tuan-thu.ts";
import { huongDanCai, CACH_GO_TU_XA } from "./chuyen-doi.ts";
import type { BaMe } from "./auth.ts";

// ---------------------------------------------------------------- gói cài
export async function taoGoiCai(fam: string, b: { con?: unknown; nen?: unknown }, goc: string, nguoi?: string, now = new Date()) {
  await bangM4b();
  const nen = String(b.nen ?? "");
  if (!(NEN_TANG as readonly string[]).includes(nen)) throw new LoiNghiepVu("nen_tang_sai", "Chọn loại thiết bị");
  const con = b.con ? String(b.con).slice(0, 40) : null;
  if (con) await conCua(fam, con);
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [fam]))!;
  const het = new Date(now.getTime() + thamSo(f.cau_hinh).goi_cai_gio * 3600_000);
  const token = taoToken();
  await q(`delete from goi_cai where expires_at < $1::timestamptz - interval '7 days'`, [now]);
  await q(`insert into goi_cai(token_hash, family_id, child_id, platform, expires_at, nguoi) values ($1,$2,$3,$4,$5,$6)`, [sha(token), fam, con, nen, het, nguoi ?? null]);
  await ghiSuKien(fam, "tao_goi_cai", { nen, het: het.toISOString() }, { con, nguoi });
  return { token, het: het.toISOString(), cai: huongDanCai(nen as NenTang, token, goc) };
}

/** Agent đổi token gói cài ⇒ token máy (một lần). */
export async function doiGoiCai(token: string, nen: string, tenMay: string, now = new Date()) {
  await bangM4b();
  const h = sha(String(token ?? ""));
  const g = await one<{ family_id: string; child_id: string | null; platform: string; expires_at: Date; used_at: Date | null }>(
    `select family_id, child_id, platform, expires_at, used_at from goi_cai where token_hash = $1`, [h]);
  if (!g) throw new LoiNghiepVu("ma_sai", "Gói cài không hợp lệ — tải lại gói mới từ app Ba Mẹ", 404);
  if (g.used_at) throw new LoiNghiepVu("ma_da_dung", "Gói cài này đã dùng rồi — tải gói mới từ app Ba Mẹ", 409);
  if (new Date(g.expires_at) < now) throw new LoiNghiepVu("ma_het_han", "Gói cài đã hết hạn — tải gói mới từ app Ba Mẹ", 410);
  if (g.platform !== nen) throw new LoiNghiepVu("sai_nen_tang", "Gói cài này dành cho loại máy khác", 409);
  // nhận gói nguyên tử (một câu update có điều kiện) ⇒ hai lần đổi song song chỉ một lần thắng
  const nhan = await q(`update goi_cai set used_at = $2 where token_hash = $1 and used_at is null and expires_at > $2 returning token_hash`, [h, now]);
  if (!nhan.length) throw new LoiNghiepVu("ma_da_dung", "Gói cài này đã dùng rồi — tải gói mới từ app Ba Mẹ", 409);
  const kq = await ghepMay(await taoMaGhep(g.family_id, g.child_id, nen), nen, tenMay);
  await q(`update goi_cai set device_id = $2 where token_hash = $1`, [h, kq.deviceId]);
  const c = g.child_id ? await one<{ ten: string }>(`select ten from children where id = $1`, [g.child_id]) : undefined;
  return { ...kq, ...(c ? { childName: c.ten } : {}) };
}

// ---------------------------------------------------------------- lệnh gỡ từ xa
type MayDb = May & { token_hash: string };

/** Chủ gia đình + nhập lại đúng mật khẩu (gỡ = bỏ bảo vệ ⇒ cùng mức bảo vệ cho go-tu-xa và «Gỡ máy này»). */
async function xacThucChu(bm: BaMe, mayId: string, matKhau: unknown, viec = "gỡ được AiiGrow từ xa") {
  await bangM4b();
  if (bm.vai !== "chu") throw new LoiNghiepVu("chi_chu", `Chỉ chủ gia đình mới ${viec}`, 403);
  const m = await one<MayDb>(`select * from devices where id = $1 and family_id = $2`, [mayId, bm.family_id]);
  if (!m) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  const p = await one<{ pass_hash: string | null }>(`select pass_hash from parents where id = $1`, [bm.id]);
  if (!p?.pass_hash || !(await dungMatKhau(String(matKhau ?? ""), p.pass_hash))) {
    await ghiSuKien(bm.family_id, "lenh_go_sai_mat_khau", {}, { con: m.child_id, may: m.id, nguoi: bm.id });
    throw new LoiNghiepVu("sai_mat_khau", "Mật khẩu chưa đúng", 401);
  }
  return m;
}

async function ghiLenhGo(bm: BaMe, m: MayDb) {
  const da = await one<{ id: string }>(`select id from lenh_may where device_id = $1 and loai = 'go' and trang_thai = 'cho'`, [m.id]);
  if (da) return { id: da.id, lapLai: true, cach: CACH_GO_TU_XA[m.platform] };
  const id = newId();
  await q(`insert into lenh_may(id, family_id, device_id, token_hash, loai, nguoi) values ($1,$2,$3,$4,'go',$5)`, [id, bm.family_id, m.id, m.token_hash, bm.id]);
  await ghiSuKien(bm.family_id, "lenh_go", { ten: m.name }, { con: m.child_id, may: m.id, nguoi: bm.id });
  return { id, lapLai: false, cach: CACH_GO_TU_XA[m.platform] };
}

export async function lenhGoTuXa(bm: BaMe, mayId: string, matKhau: unknown) {
  return ghiLenhGo(bm, await xacThucChu(bm, mayId, matKhau));
}

/** Sau bao lâu «đang gỡ» mà máy không liên lạc thì Ba Mẹ được xoá hẳn khỏi danh sách. */
export const NGAY_XOA_HAN = 7;

/** Trạng thái gỡ của một máy — dùng cho «Gỡ máy này» và màn An toàn (tuan-thu). */
export async function trangThaiGo(m: Pick<May, "id" | "status" | "last_seen">, now = new Date()) {
  await bangM4b();
  const tt = await one<{ nhip_cuoi: Date | null }>(`select nhip_cuoi from tuan_thu_may where device_id = $1`, [m.id]);
  // Ghép xong (ghepMay) đã đặt last_seen = lúc ghép ⇒ «đã đồng bộ» = agent đã gọi dong-bo (status có dữ liệu) hoặc đã gửi nhịp.
  const daDongBo = Object.keys(m.status ?? {}).length > 0 || !!tt?.nhip_cuoi;
  const l = await one<{ id: string; created_at: Date }>(
    `select id, created_at from lenh_may where device_id = $1 and loai = 'go' and trang_thai = 'cho' order by created_at limit 1`, [m.id]);
  const moc = now.getTime() - NGAY_XOA_HAN * 86400_000;
  const lienLacCuoi = Math.max(m.last_seen ? new Date(m.last_seen).getTime() : 0, tt?.nhip_cuoi ? new Date(tt.nhip_cuoi).getTime() : 0);
  const coTheXoaHan = !daDongBo || (!!l && new Date(l.created_at).getTime() < moc && lienLacCuoi < moc);
  return { daDongBo, dangGo: l ? { lenhId: l.id, tu: new Date(l.created_at).toISOString() } : null, coTheXoaHan };
}

/**
 * «Gỡ máy này» an toàn (POST may/:id/go {matKhau, xoaHan?}) — KHÔNG bao giờ bỏ agent mồ côi trên máy Con:
 *  • máy đã từng đồng bộ ⇒ ghi lệnh «go» (như go-tu-xa), máy ở trạng thái «đang gỡ»; dòng máy chỉ xoá khi agent báo xong (xongLenh).
 *  • xoaHan: true ⇒ xoá ngay khỏi danh sách, CHỈ khi máy chưa từng đồng bộ, hoặc đã «đang gỡ» > 7 ngày mà không liên lạc.
 *    Agent (nếu còn) mất token ⇒ Ba Mẹ phải gỡ tại máy (UI hướng dẫn).
 *  • máy chưa đồng bộ mà không gửi xoaHan ⇒ 409 can_xoa_han (app hỏi lại Ba Mẹ).
 */
export async function goMayAnToan(bm: BaMe, mayId: string, b: { matKhau?: unknown; xoaHan?: unknown }, now = new Date()) {
  const m = await xacThucChu(bm, mayId, b.matKhau, "gỡ được máy");
  const t = await trangThaiGo(m, now);
  if (b.xoaHan === true) {
    if (!t.coTheXoaHan) throw new LoiNghiepVu("chua_duoc_xoa_han",
      `Máy vẫn còn liên lạc gần đây — hãy chờ máy nhận lệnh gỡ. Sau ${NGAY_XOA_HAN} ngày không liên lạc mới xoá hẳn được.`, 409);
    await q(`update lenh_may set trang_thai = 'huy' where device_id = $1 and trang_thai = 'cho'`, [m.id]);
    await q(`delete from devices where id = $1`, [m.id]);
    await ghiSuKien(bm.family_id, "go_may", { ten: m.name, cach: "xoa_han", daDongBo: t.daDongBo }, { con: m.child_id, may: m.id, nguoi: bm.id });
    await canhBao(bm.family_id, "go_may", "chu_y", `Đã xoá hẳn ${m.name} khỏi danh sách. Nếu AiiGrow còn trên máy, hãy gỡ tại máy.`,
      { con: m.child_id, may: m.id, khoa: `xoa_han:${m.id}` });
    return { trangThai: "da_xoa" as const, canGoTaiMay: t.daDongBo };
  }
  if (!t.daDongBo) throw new LoiNghiepVu("can_xoa_han",
    "Máy này chưa đồng bộ lần nào nên không nhận được lệnh gỡ. Xác nhận «Xoá hẳn» để bỏ máy khỏi danh sách.", 409);
  const l = await ghiLenhGo(bm, m);
  return { trangThai: "dang_go" as const, ...l };
}

// ---------------------------------------------------------------- chế độ agent (giám sát / chặn thật) do Ba Mẹ chọn từ xa
export const CHE_DO = ["giam-sat", "chan"] as const;
export type CheDo = (typeof CHE_DO)[number];
export const TEN_CHE_DO: Record<CheDo, string> = { "giam-sat": "Giám sát (chỉ ghi lại, không chặn)", chan: "Chặn thật" };
export const cheDoCua = (m: Pick<May, "che_do">): CheDo => (m.che_do === "chan" ? "chan" : "giam-sat");

/** POST may/:id/che-do {cheDo} — máy đổi ở lần đồng bộ tới (≤ 1 phút khi có mạng). Ghi nhật ký + báo các Ba Mẹ khác. */
export async function datCheDo(fam: string, mayId: string, b: { cheDo?: unknown }, nguoi: string, now = new Date()) {
  await bangM4b();
  const sang = String(b.cheDo ?? "") as CheDo;
  if (!(CHE_DO as readonly string[]).includes(sang)) throw new LoiNghiepVu("che_do_sai", "Chọn Giám sát hoặc Chặn thật");
  const m = await one<May>(`select * from devices where id = $1 and family_id = $2`, [mayId, fam]);
  if (!m) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  const tu = cheDoCua(m);
  if (tu === sang) return { cheDo: sang, doi: false };
  await q(`update devices set che_do = $2 where id = $1`, [m.id, sang]);
  await ghiSuKien(fam, "doi_che_do", { tu, sang }, { con: m.child_id, may: m.id, nguoi });
  const ten = (await one<{ ten: string }>(`select ten from parents where id = $1`, [nguoi]))?.ten;
  await canhBao(fam, "doi_che_do", sang === "chan" ? "thong_tin" : "chu_y",
    `${ten ?? "Ba Mẹ"} đã chuyển ${m.name} sang chế độ ${TEN_CHE_DO[sang]}`,
    { con: m.child_id, may: m.id, khoa: `doi_che_do:${m.id}:${now.getTime()}`, chiTiet: { tu, sang, nguoi } });
  return { cheDo: sang, doi: true };
}

/** Lệnh đang chờ cho máy — gửi kèm phản hồi dong-bo / nhịp. */
export async function lenhCho(may: Pick<May, "id">) {
  await bangM4b();
  return q<{ id: string; loai: "go" }>(`select id, loai from lenh_may where device_id = $1 and trang_thai = 'cho' order by created_at`, [may.id]);
}

/** Agent báo đã làm xong lệnh. `token` = Bearer của máy (máy đã xoá vẫn đối chiếu được qua token_hash lưu trong lệnh). */
export async function xongLenh(token: string | null, lenhId: string) {
  await bangM4b();
  const l = await one<{ id: string; family_id: string; device_id: string; token_hash: string; loai: string; trang_thai: string }>(
    `select * from lenh_may where id = $1`, [lenhId]);
  if (!l || !token || l.token_hash !== sha(token)) throw new LoiNghiepVu("khong_thay", "Không thấy lệnh", 404);
  if (l.trang_thai === "xong") return { ok: true, lapLai: true };
  const ok = await q(`update lenh_may set trang_thai = 'xong', xong_luc = now() where id = $1 and trang_thai = 'cho' returning id`, [l.id]);
  if (!ok.length) return { ok: true, lapLai: true };
  if (l.loai === "go") {
    const m = await one<{ id: string; child_id: string | null; name: string }>(`select id, child_id, name from devices where id = $1`, [l.device_id]);
    await q(`delete from devices where id = $1`, [l.device_id]);           // tuan_thu_may xoá theo (cascade) ⇒ hết cảnh báo mất nhịp
    await q(`update lenh_may set trang_thai = 'huy' where device_id = $1 and trang_thai = 'cho'`, [l.device_id]);
    await ghiSuKien(l.family_id, "go_may", { ten: m?.name ?? null, cach: "tu_xa" }, { con: m?.child_id ?? null, may: l.device_id });
    await canhBao(l.family_id, "go_may", "thong_tin", `Đã gỡ AiiGrow khỏi ${m?.name ?? "thiết bị"} (gỡ từ xa)`, { con: m?.child_id ?? null, may: l.device_id, khoa: `go_tu_xa:${l.id}` });
  }
  return { ok: true, lapLai: false };
}
