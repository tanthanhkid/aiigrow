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

// #691 mục 5: app đã gỡ / chưa đọc được nhãn ⇒ tên hiển thị không phải mã gói «com.xxx.yyy». Chỉ để HIỆN — tên gửi máy chủ vẫn là định danh.
private val TEN_GOI_BIET = mapOf(
    "com.roblox.client" to "Roblox", "com.mojang.minecraftpe" to "Minecraft", "com.google.android.youtube" to "YouTube",
    "com.google.android.apps.youtube.kids" to "YouTube Kids", "com.zhiliaoapp.musically" to "TikTok", "com.ss.android.ugc.trill" to "TikTok",
    "com.supercell.clashofclans" to "Clash of Clans", "com.supercell.brawlstars" to "Brawl Stars", "com.king.candycrushsaga" to "Candy Crush Saga",
    "com.facebook.katana" to "Facebook", "com.facebook.orca" to "Messenger", "com.instagram.android" to "Instagram", "com.zing.zalo" to "Zalo",
    "com.android.chrome" to "Google Chrome", "com.dts.freefireth" to "Free Fire", "com.garena.game.kgvn" to "Liên Quân Mobile",
)

/** Mã gói ⇒ tên hiển thị dự phòng: bảng app hay gặp, không thì «App lạ» (không đoán từ khúc cuối: com.snapchat.android ⇒ «Android» là sai). */
fun tenTuGoi(goi: String): String {
    val g = goi.trim()
    if (g.isEmpty()) return "App này"
    return TEN_GOI_BIET[g.lowercase()] ?: "App lạ"
}

/** Số phút cho người đọc (#697): 45 → «45 phút», 60 → «1 giờ», 185 → «3 giờ 5 phút». */
fun chuPhut(n: Int): String {
    val p = maxOf(0, n)
    if (p < 60) return "$p phút"
    val g = p / 60; val du = p % 60
    return if (du > 0) "$g giờ $du phút" else "$g giờ"
}

/** Câu lỗi khi máy chủ / proxy trả mã lỗi không kèm câu tiếng Việt (#694): nói phải làm gì, không lộ mã HTTP. */
fun cauLoiMa(ma: Int): String = when {
    ma == 413 -> "Dữ liệu quá lớn — thử lại sau nhé."
    ma == 429 -> "Bấm hơi nhanh — đợi một chút rồi thử lại nhé."
    ma == 401 || ma == 403 -> "Máy cần ghép lại — nhờ Ba Mẹ ghép lại máy nhé."
    ma == 408 || ma >= 500 -> "Máy chủ AiiGrow đang bận — thử lại sau ít phút."
    ma >= 400 -> "Chưa làm được việc này — cập nhật AiiGrow lên bản mới rồi thử lại."
    else -> "Chưa làm được — thử lại sau ít phút."
}
