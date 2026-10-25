package vn.aiilab.aiigrow.maycon

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** Gọi /api/device/… (server/lib/api-may.ts). Chỉ gọi từ luồng nền. */
class MayChu(private val goc: String, private val token: String?) {
    class Loi(val ma: String, val cau: String, val http: Int) : IOException(cau)

    fun goi(duong: String, than: JSONObject? = null): JSONObject {
        val c = (URL(goc.trimEnd('/') + "/api/device/" + duong).openConnection() as HttpURLConnection).apply {
            requestMethod = if (than != null) "POST" else "GET"
            connectTimeout = 15_000; readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "AiiGrowCon-Android/${BuildConfig.VERSION_NAME}")
            token?.let { setRequestProperty("Authorization", "Bearer $it") }
            if (than != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                outputStream.use { it.write(than.toString().toByteArray(Charsets.UTF_8)) }
            }
        }
        try {
            val ma = c.responseCode
            val s = (if (ma in 200..299) c.inputStream else c.errorStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            val o = try { JSONObject(s) } catch (_: Exception) { JSONObject() }
            if (ma !in 200..299) {
                // server/lib/api.ts › loi(): { error, message }
                throw Loi(o.optString("error", "http_$ma"), o.optString("message", "Máy chủ trả lỗi $ma"), ma)
            }
            return o
        } finally { c.disconnect() }
    }

    fun ghep(than: JSONObject) = goi("ghep", than)
    fun ghepGoi(than: JSONObject) = goi("ghep-goi", than)
    fun nhip(than: JSONObject) = goi("nhip", than)
    fun xinThemGio(than: JSONObject) = goi("yeu-cau", than)
    fun hoSoDns() = goi("ho-so-dns")
    fun xongLenh(id: String) = goi("lenh/$id/xong", JSONObject())
    /** Danh sách app đã cài thật (DanhSachApp.kt): đủ / phần đổi; 409 can_gui_du ⇒ gửi đủ. */
    fun ungDung(than: JSONObject) = goi("ung-dung", than)
}
