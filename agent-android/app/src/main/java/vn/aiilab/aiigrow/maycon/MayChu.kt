package vn.aiilab.aiigrow.maycon

import vn.aiilab.aiigrow.maycon.logic.cauLoiMa
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** Gọi /api/device/… (server/lib/api-may.ts). Chỉ gọi từ luồng nền. */
class MayChu(private val goc: String, private val token: String?, private val docMs: Int = 20_000) {
    /** `than` = cả thân lỗi (S3 06/11: trường phụ cạnh {error, message} — `conLan`, `choGiay`, `khoaDen`). */
    class Loi(val ma: String, val cau: String, val http: Int, val than: JSONObject = JSONObject()) : IOException(cau)

    fun goi(duong: String, than: JSONObject? = null): JSONObject {
        val c = (URL(goc.trimEnd('/') + "/api/device/" + duong).openConnection() as HttpURLConnection).apply {
            requestMethod = if (than != null) "POST" else "GET"
            connectTimeout = 15_000; readTimeout = docMs
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
                throw Loi(o.optString("error", "http_$ma"), o.optString("message", cauLoiMa(ma)), ma, o)
            }
            return o
        } finally { c.disconnect() }
    }

    fun ghep(than: JSONObject) = goi("ghep", than)
    fun ghepGoi(than: JSONObject) = goi("ghep-goi", than)
    fun nhip(than: JSONObject) = goi("nhip", than)
    /** P1 07/11: long-poll — máy chủ giữ ≤ ~25 giây, trả ngay khi Ba Mẹ đổi gì. Dùng `MayChu(…, docMs = 40_000)`. */
    fun choThayDoi(ver: Long?) = goi(vn.aiilab.aiigrow.maycon.logic.duongChoThayDoi(ver))
    /** 15/11 (#258): trạng thái lời xin app / web — {ketQua: cho|da_them|mo_tam|chua_them|het_han|huy, nhom, muc, …}. */
    fun yeuCau(id: String) = goi("yeu-cau/$id")
    /** 15/11 (#264): phút theo bé (`usage[].con`, `phutBoiMa`) ⇒ máy chủ trừ sao «Tính phút». Phản hồi (Policy Windows) bỏ qua. */
    fun dongBo(than: JSONObject) = goi("dong-bo", than)
    /** 15/11 (#263): «Xin Ba Mẹ cho vay sao» ⇒ {id, trang_thai, soSao, mucDich}. */
    fun xinVay(than: JSONObject) = goi("hoc-vien/xin-vay", than)
    /** 15/11: sổ sao của bé đang dùng (+ `lichSu[]` khi máy chủ có) — màn «Sao của con». */
    fun soSao() = goi("hoc-vien/sao")
    /** 05/11: Con «Xin Ba Mẹ duyệt» app lạ (máy chủ tự xếp app / web; lời xin trùng trả lại lời xin cũ). */
    fun xinDuyet(than: JSONObject) = goi("xin-duyet", than)
    fun hoSoDns() = goi("ho-so-dns")
    fun xongLenh(id: String) = goi("lenh/$id/xong", JSONObject())
    /** Nhật ký agent (server/lib/log-may.ts) và sự kiện (`ma` một lần — server/lib/may-con.ts › nhanSuKien): thân { ds: [...] }. */
    fun log(than: JSONObject) = goi("log", than)
    fun suKien(than: JSONObject) = goi("su-kien", than)
    /** Danh sách app đã cài thật (DanhSachApp.kt): đủ / phần đổi; 409 can_gui_du ⇒ gửi đủ. */
    fun ungDung(than: JSONObject) = goi("ung-dung", than)
    /** L13 PIN theo bé (docs/API.md «S3 thiết kế chốt 06/11»): ai đang dùng máy, bé vào bằng tên + PIN, quên PIN, Ba Mẹ nhập mã, đăng xuất / khoá lại. */
    /** #337: `?offline=1` ⇒ máy chung có thêm `con[i].offline` (luật của từng bé, dùng khi đổi bé lúc mất mạng). Máy chủ cũ bỏ qua tham số. */
    fun hoSo() = goi("ho-so?offline=1")
    fun dangNhapBe(con: String, pin: String?) = goi("dang-nhap-be", JSONObject().put("con", con).apply { pin?.let { put("pin", it) } })
    fun quenPin(con: String) = goi("quen-pin", JSONObject().put("con", con))
    fun baMeMo(ma: String) = goi("ba-me-mo", JSONObject().put("ma", ma))
    fun dangXuat() = goi("dang-xuat", JSONObject())
}
