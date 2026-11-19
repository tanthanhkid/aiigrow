package vn.aiilab.aiigrow.maycon.logic

// #422 «Xin thêm app / web» (con-dt-xin 08/09/10): hộp 2 thẻ «App trên máy» / «Trang web» ⇒ POST /api/device/xin-duyet {muc, ten?, lyDo?, kieu}.
// Thuần JVM để test đơn vị.

import org.json.JSONObject

/** Kiểu lời xin gửi máy chủ (`kieu`): app trên máy hoặc trang web. */
enum class KieuXin(val ma: String) { APP("app"), WEB("web") }

private val NHAN_MIEN = Regex("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")
private val DUOI_MIEN = Regex("^(xn--[a-z0-9-]{1,59}|[a-z]{2,63})$")

/**
 * Địa chỉ Con gõ ⇒ tên miền gửi máy chủ («https://Scratch.MIT.edu/projects/1» ⇒ «scratch.mit.edu»); null = không phải tên miền
 * (máy chủ cũng chặn bằng 400 web_sai — kiểm trước cho Con khỏi chờ mạng). Bỏ «www.», cổng, đường dẫn, dấu chấm cuối.
 */
fun chuanDiaChiWeb(s: String): String? {
    var t = s.trim().lowercase()
    if (t.isEmpty() || t.any { it.isWhitespace() }) return null
    t = t.replaceFirst(Regex("^[a-z][a-z0-9+.-]*://"), "")
    t = t.substringBefore('/').substringBefore('?').substringBefore('#')
    t = t.substringAfterLast('@').substringBefore(':').trimEnd('.')
    t = try { java.net.IDN.toASCII(t, java.net.IDN.ALLOW_UNASSIGNED).lowercase() } catch (_: Exception) { return null }   // «thư-viện.vn» ⇒ punycode
    if (t.startsWith("www.") && t.count { it == '.' } >= 2) t = t.removePrefix("www.")
    if (t.length > 253) return null
    val nhan = t.split('.')
    if (nhan.size < 2 || nhan.any { !NHAN_MIEN.matches(it) } || !DUOI_MIEN.matches(nhan.last())) return null
    return t
}

/** Thân `xin-duyet`: `muc` (gói / tên miền), `ten` khi khác `muc`, `lyDo` ≤ 100 ký tự một dòng, `kieu` (null = luồng cũ không gửi). */
fun thanXinDuyet(muc: String, ten: String?, lyDo: String, kieu: KieuXin?): JSONObject {
    val than = JSONObject().put("muc", muc)
    ten?.trim()?.takeIf { it.isNotEmpty() && it != muc }?.let { than.put("ten", it) }
    lyDo.replace(Regex("\\s*\n\\s*"), " ").trim().take(100).takeIf { it.isNotEmpty() }?.let { than.put("lyDo", it) }
    kieu?.let { than.put("kieu", it.ma) }
    return than
}

/** Một app trong lưới «App trên máy»: `goi` = package (muc), `ten` = nhãn app. */
data class AppTrenMay(val goi: String, val ten: String)

/** Lưới app: bỏ chính AiiGrow Con + gói trùng, xếp theo tên (không phân biệt hoa thường). */
fun locAppTrenMay(ds: List<AppTrenMay>, goiMinh: String): List<AppTrenMay> =
    ds.filter { it.goi != goiMinh && it.goi.isNotBlank() }.distinctBy { it.goi }.sortedBy { it.ten.lowercase() }

/** Chữ nút gửi theo thẻ (con-dt-xin 09 / 10). */
fun chuNutXinThem(kieu: KieuXin, tenApp: String?): String = when (kieu) {
    KieuXin.APP -> if (tenApp.isNullOrBlank()) "Chọn một app để xin" else "Xin Ba Mẹ thêm $tenApp"
    KieuXin.WEB -> "Xin Ba Mẹ mở trang này"
}
