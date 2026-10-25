package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import java.io.File
import java.io.InputStream
import java.net.URI
import java.security.MessageDigest

/**
 * Tự cập nhật app Con (thuần JVM, test được): đọc manifest `GET /api/agent/ban-moi?platform=android` (server/lib/ban-agent.ts ›
 * BAN_CON_ANDROID), so versionCode, kiểm đường tải, sha256 và chữ ký APK. Phần Android (tải, PackageInstaller) ở `CapNhatApp.kt`.
 */
data class BanMoi(val version: String, val versionCode: Long, val url: String, val sha256: String)

private val HEX64 = Regex("^[0-9a-f]{64}$")

/** Manifest hợp lệ: số bản, versionCode > 0, URL https (http chỉ khi `choPhepHttp` — bản debug thử với máy chủ localhost), sha256 64 hex.
 *  Thiếu / sai ⇒ null (không cập nhật). */
fun docBanMoi(s: String, choPhepHttp: Boolean = false): BanMoi? = try {
    val o = JSONObject(s)
    val b = BanMoi(o.optString("version").trim(), o.optLong("versionCode", 0), o.optString("url").trim(), o.optString("sha256").trim().lowercase())
    if (b.versionCode <= 0 || b.version.isEmpty() || host(b.url, choPhepHttp) == null || !HEX64.matches(b.sha256)) null else b
} catch (_: Exception) { null }

/** Có bản mới hơn bản đang chạy — so versionCode (Android chỉ cho cài đè bản versionCode ≥; bằng nhau thì không cần). */
fun canCapNhat(b: BanMoi?, versionCodeHienTai: Long): Boolean = b != null && b.versionCode > versionCodeHienTai

/** host (thường) của URL https — http chỉ nhận khi `choPhepHttp`. Có user-info / không có host ⇒ null. */
private fun host(u: String, choPhepHttp: Boolean = false): String? = try {
    URI(u).let { if ((it.scheme == "https" || (choPhepHttp && it.scheme == "http")) && it.rawUserInfo == null) it.host?.lowercase() else null }
} catch (_: Exception) { null }

/** Cùng gốc (host + cổng) với máy chủ — so host thôi thì http://may-chu:9999 cũng lọt. */
private fun cungGoc(u: String, mayChu: String, choPhepHttp: Boolean): Boolean = try {
    val a = URI(u); val b = URI(mayChu)
    host(u, choPhepHttp) != null && host(u, choPhepHttp) == host(mayChu, choPhepHttp) && a.scheme == b.scheme && a.port == b.port
} catch (_: Exception) { false }

/** Địa chỉ đầu tiên phải là https trên CHÍNH host máy chủ app đã ghép (manifest staging trỏ /tai của staging). */
fun urlDauHopLe(url: String, mayChu: String, choPhepHttp: Boolean = false): Boolean = cungGoc(url, mayChu, choPhepHttp)

/**
 * Mỗi chặng chuyển hướng (máy chủ /tai/… ⇒ GitHub Release ⇒ máy chủ tệp của GitHub): chỉ https, chỉ tới host máy chủ, đúng đường
 * Release của repo tanthanhkid/aiigrow-tai trên github.com, hoặc máy chủ tệp *.githubusercontent.com. Nội dung vẫn phải qua sha256 + chữ ký.
 */
fun chuyenHuongHopLe(url: String, mayChu: String, choPhepHttp: Boolean = false): Boolean {
    if (cungGoc(url, mayChu, choPhepHttp)) return true
    val h = host(url) ?: return false   // ra ngoài máy chủ: chỉ https
    if (h == "github.com") return try { URI(url).path.startsWith("/tanthanhkid/aiigrow-tai/releases/download/") } catch (_: Exception) { false }
    return h.endsWith(".githubusercontent.com")
}

fun sha256Hex(i: InputStream): String {
    val md = MessageDigest.getInstance("SHA-256")
    val buf = ByteArray(64 * 1024)
    while (true) { val n = i.read(buf); if (n < 0) break; md.update(buf, 0, n) }
    return md.digest().joinToString("") { "%02x".format(it) }
}

fun khopSha256(f: File, mongDoi: String): Boolean = f.isFile && f.inputStream().use { sha256Hex(it) } == mongDoi.lowercase()

/** SHA-256 (hex thường) của chứng chỉ ký — đầu vào là byte DER từ `Signature.toByteArray()`. */
fun vanTayChungChi(der: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(der).joinToString("") { "%02x".format(it) }

/**
 * Chữ ký APK mới hợp lệ để cài đè: mọi chứng chỉ đang ký app hiện tại phải có trong lịch sử ký của APK mới (APK v3 xoay khoá vẫn mang
 * chứng chỉ cũ trong lịch sử; không xoay ⇒ lịch sử = chứng chỉ hiện tại). Rỗng ở bất kỳ phía nào ⇒ không cài.
 */
fun chuKyHopLe(lichSuApkMoi: Collection<String>, chungChiHienTai: Collection<String>): Boolean =
    chungChiHienTai.isNotEmpty() && lichSuApkMoi.isNotEmpty() && chungChiHienTai.all { it in lichSuApkMoi }

/** Kiểm đủ một APK đã tải trước khi cài: đúng gói, đúng versionCode trong manifest, chữ ký khớp. Trả lý do sai, null = được cài. */
fun loiApk(goiApk: String?, versionCodeApk: Long, lichSuApk: Collection<String>, goiHienTai: String, chungChiHienTai: Collection<String>, b: BanMoi): String? = when {
    goiApk != goiHienTai -> "sai gói ($goiApk)"
    versionCodeApk != b.versionCode -> "versionCode APK $versionCodeApk ≠ manifest ${b.versionCode}"
    !chuKyHopLe(lichSuApk, chungChiHienTai) -> "chữ ký APK không trùng chữ ký app đang chạy"
    else -> null
}
