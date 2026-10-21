// Webhook AiiRob ⇒ AiiGrow (M6, FR-03.04): «Con học xong một bài» ⇒ nhiệm vụ «Học 1 bài với AiiRob» tự duyệt + cộng điểm, MỘT lần mỗi bài,
// chỉ khi đạt ngưỡng (tham số aiirob_nguong / aiirob_diem). Xử lý điểm ở nhiem-vu.ts `ketQuaAiiRob` (chèn có điều kiện ⇒ gửi trùng,
// kể cả hai lượt cùng lúc, không cộng đôi).
//
// Ký: AiiRob gửi header
//   X-AiiRob-Timestamp: <giây Unix>
//   X-AiiRob-Signature: sha256=<hex HMAC-SHA256(AIIROB_WEBHOOK_SECRET, "<timestamp>.<thân JSON nguyên văn>")>
// Lệch giờ quá 5 phút ⇒ từ chối (chống phát lại). Thiếu AIIROB_WEBHOOK_SECRET ⇒ 503, không nhận gì.
// Thân: { suKien: "bai_dat", con: "<id hồ sơ Con trong AiiGrow>", giaDinh?: "<family_id>", maBai, tenBai, diemSo (0–100) }.
// Mã liên kết Ba Mẹ dán vào AiiRob là "<family_id>.<child_id>" (GET /api/m/con/:id/lien-ket-aiirob). Có giaDinh ⇒ phải khớp
// gia đình của Con, sai thì 404 như không thấy (không lộ Con có tồn tại). Không có giaDinh ⇒ cách cũ (chỉ theo id Con).
import { createHmac, timingSafeEqual } from "node:crypto";
import { json, loi, batLoi } from "./api.ts";
import { one } from "./db.ts";
import { ketQuaAiiRob } from "./nhiem-vu.ts";

export const LECH_TOI_DA_GIAY = 300;

export const kyAiiRob = (bimat: string, ts: string, than: string) =>
  "sha256=" + createHmac("sha256", bimat).update(`${ts}.${than}`).digest("hex");

function dungChuKy(bimat: string, ts: string, than: string, chuKy: string) {
  const a = Buffer.from(kyAiiRob(bimat, ts, than)), b = Buffer.from(chuKy.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function xuLyAiiRob(req: Request, now = Date.now()): Promise<Response> {
  try {
    if (req.method !== "POST") return loi("khong_co_duong", "Chỉ nhận POST", 405);
    const bimat = process.env.AIIROB_WEBHOOK_SECRET;
    if (!bimat) return loi("chua_cau_hinh", "Máy chủ chưa cấu hình khoá webhook AiiRob", 503);
    const than = await req.text();
    const ts = req.headers.get("x-aiirob-timestamp") ?? "", chuKy = req.headers.get("x-aiirob-signature") ?? "";
    if (!/^\d{9,12}$/.test(ts) || !chuKy || !dungChuKy(bimat, ts, than, chuKy)) return loi("chu_ky_sai", "Chữ ký webhook không hợp lệ", 401);
    if (Math.abs(now / 1000 - Number(ts)) > LECH_TOI_DA_GIAY) return loi("het_han", "Webhook quá cũ hoặc giờ máy gửi lệch", 401);
    let b: Record<string, unknown>;
    try { b = JSON.parse(than); } catch { return loi("json_sai", "Thân webhook không phải JSON", 400); }
    if (b.suKien !== "bai_dat") return json({ ok: true, boQua: true });            // sự kiện khác: nhận, không làm gì
    const con = String(b.con ?? "").slice(0, 40), giaDinh = b.giaDinh == null ? null : String(b.giaDinh).slice(0, 40), maBai = String(b.maBai ?? "").trim().slice(0, 80), diemSo = Number(b.diemSo);
    if (!con || !maBai || !Number.isFinite(diemSo) || diemSo < 0 || diemSo > 100) return loi("thieu_truong", "Cần con, maBai, diemSo (0–100)", 400);
    const c = await one<{ family_id: string }>(`select family_id from children where id = $1`, [con]);
    if (!c || (giaDinh !== null && giaDinh !== c.family_id)) return loi("khong_thay", "Không thấy hồ sơ Con", 404);
    const r = await ketQuaAiiRob(con, { maBai, tenBai: String(b.tenBai ?? maBai), diemSo });
    return json({ ok: true, congDiem: r ? r.diem : 0, lyDo: r ? null : "chua_dat_hoac_da_tinh" });
  } catch (e) {
    return batLoi(e);
  }
}
