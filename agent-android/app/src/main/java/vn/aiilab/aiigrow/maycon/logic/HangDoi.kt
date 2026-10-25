package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject

// Hàng đợi gửi lên máy chủ (thuần): nhật ký agent ⇒ POST /api/device/log (server/lib/log-may.ts), sự kiện ⇒ POST /api/device/su-kien
// (server/lib/may-con.ts › nhanSuKien, `ma` một lần nên gửi lại khi mất mạng không ghi trùng). Mỗi mục một dòng JSON trong tệp.

const val LOG_GIU_DONG = 1000      // tệp nhật ký chờ gửi tối đa ngần này dòng (mất mạng lâu ⇒ bỏ dòng cũ nhất)
const val LOG_MOI_LAN = 200        // máy chủ nhận tối đa 200 dòng / lần
const val LOG_DAI = 1000           // mỗi dòng tối đa 1000 ký tự
const val SU_KIEN_GIU = 200
const val SU_KIEN_MOI_LAN = 100

private val CHE = listOf(
    Regex("(?i)(bearer\\s+)[A-Za-z0-9._~+/=-]+") to "$1[ẩn]",
    Regex("(?i)((?:token|matKhau|password|biMat|maOfflineBiMat|phien)\"?\\s*[:=]\\s*\"?)[^\"&\\s,}]+") to "$1[ẩn]",
)

/** Che token / mật khẩu / bí mật lỡ lọt vào câu log. */
fun cheBiMat(s: String): String = CHE.fold(s) { a, (r, t) -> r.replace(a, t) }

fun dongLog(lucIso: String, muc: String, nguon: String, noiDung: String): String = JSONObject()
    .put("luc", lucIso).put("muc", if (muc in setOf("tin", "canh", "loi")) muc else "tin").put("nguon", nguon.take(60))
    .put("noiDung", cheBiMat(noiDung).take(LOG_DAI)).toString()

fun dongSuKien(ma: String, loai: String, lucIso: String, chiTiet: Map<String, Any>): String = JSONObject()
    .put("ma", ma.take(64)).put("loai", loai).put("luc", lucIso).put("chiTiet", JSONObject(chiTiet)).toString()

/** Giữ tối đa `toiDa` dòng cuối (dòng rỗng bỏ). */
fun catDong(ds: List<String>, toiDa: Int): List<String> = ds.filter { it.isNotBlank() }.takeLast(toiDa)

/** Thân gửi: { ds: [ ...các dòng đọc được ] } — dòng hỏng bỏ qua. */
fun thanGui(ds: List<String>): JSONObject = JSONObject().put("ds", JSONArray().apply {
    for (d in ds) try { put(JSONObject(d)) } catch (_: Exception) {}
})
