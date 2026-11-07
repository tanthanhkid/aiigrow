package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject

// P1 (07/11): «Ba Mẹ bấm ⇒ máy Con áp trong ≤5 giây» — logic thuần của vòng chờ thay đổi (GET /api/device/cho-thay-doi?ver=N,
// server/lib/cho-thay-doi.ts: máy chủ giữ ≤ ~25 giây, trả ngay khi Ba Mẹ đổi gì).

/** `phienBan` = số phiên bản thay đổi của gia đình; `doi` = khác số `ver` agent đưa; `quaTai` = máy chủ không giữ thêm được. */
data class KetQuaCho(val phienBan: Long, val doi: Boolean, val quaTai: Boolean = false)

/** Đọc `{phienBanThayDoi, doi, quaTai?}`; thiếu số phiên bản / không phải JSON ⇒ null. */
fun docKetQuaCho(s: String): KetQuaCho? = try {
    val o = JSONObject(s)
    if (!o.has("phienBanThayDoi")) null else KetQuaCho(o.getLong("phienBanThayDoi"), o.optBoolean("doi", false), o.optBoolean("quaTai", false))
} catch (_: Exception) { null }

/** Mốc dùng cho lần chờ kế: luôn là số máy chủ vừa trả. */
fun duongChoThayDoi(ver: Long?): String = if (ver == null) "cho-thay-doi" else "cho-thay-doi?ver=$ver"

/** Chờ bao lâu (ms) trước lần hỏi kế: lỗi ⇒ lùi dần 2, 4, 8, 16, 30 giây; quá tải / trả nhanh không đổi gì ⇒ 5 giây; có thay đổi hoặc đã giữ đủ lâu ⇒ 0. */
fun choLaiMs(loiLienTiep: Int, kq: KetQuaCho?, daChoMs: Long): Long = when {
    loiLienTiep > 0 -> minOf(30_000L, 1_000L shl minOf(loiLienTiep, 5))
    kq != null && kq.quaTai -> 5_000
    kq != null && !kq.doi && daChoMs < 2_000 -> 5_000
    else -> 0
}
