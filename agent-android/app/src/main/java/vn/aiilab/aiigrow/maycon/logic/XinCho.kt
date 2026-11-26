package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject

// Lời xin của Con không được mất im lặng (#684, #686 — phần Android).

// ---------------------------------------------------------------- #684 lời xin vay lưu lúc mất mạng
enum class XetXinVayCho { GUI, QUA_HAN, DOI_NGUOI }

/** Lời xin vay đã lưu: bé khác đang dùng máy (đã Đổi người) ⇒ bỏ, không gửi nhầm tên bé đang dùng và KHÔNG báo bé đang dùng (xét trước
 *  quá hạn); quá 24 giờ ⇒ bỏ (báo Con). */
fun xetXinVayCho(luuLuc: Long, conLuu: String?, conDangDung: String?, now: Long): XetXinVayCho = when {
    (conDangDung ?: "") != (conLuu ?: "") -> XetXinVayCho.DOI_NGUOI
    now - luuLuc > HOI_XIN_TOI_DA_MS -> XetXinVayCho.QUA_HAN
    else -> XetXinVayCho.GUI
}

/** Câu báo khi lưu lời xin vay lúc mất mạng. Chỉ giữ MỘT lời xin vay chờ (máy chủ chỉ nhận một lời xin vay đang chờ) ⇒ lời xin mới thay lời
 *  xin cũ của cùng bé — nói rõ để Con không tưởng cả hai đều được gửi. */
fun cauLuuXinVay(soSao: Int, soSaoCu: Int?): String =
    if (soSaoCu != null && soSaoCu > 0) "Đã thay lời xin vay $soSaoCu sao bằng lời xin $soSao sao. Có mạng là gửi Ba Mẹ ngay!"
    else "Đã lưu lời xin vay $soSao sao. Có mạng là gửi Ba Mẹ ngay!"

/** Câu báo Con khi lời xin vay đã lưu không tới được Ba Mẹ (`lyDo` = câu máy chủ, hoặc null khi quá 24 giờ chưa có mạng). */
fun cauXinVayKhongGui(soSao: Int, lyDo: String?): String =
    "Lời xin vay $soSao sao lưu lúc mất mạng chưa tới Ba Mẹ" + (lyDo?.let { ": ${it.trimEnd('.')}." } ?: " (quá 24 giờ chưa có mạng).") +
        " Con xin lại nhé."

// ---------------------------------------------------------------- #686 lời xin app / web đang chờ Ba Mẹ
/** Lời xin app / web đã gửi, đang chờ Ba Mẹ — lưu bền để hộp xin đóng / app bị tắt vẫn báo được kết quả (hỏi lại mỗi nhịp, ≤ 24 giờ). */
data class XinAppCho(val id: String, val ten: String, val luc: Long, val con: String = "")

const val XIN_APP_CHO_TOI_DA = 10

fun docXinAppCho(s: String?): List<XinAppCho> = try {
    val a = JSONArray(s ?: "[]")
    (0 until a.length()).mapNotNull { i -> a.optJSONObject(i)?.let { o ->
        o.optString("id").takeIf { it.isNotBlank() }?.let { XinAppCho(it, o.optString("ten"), o.optLong("luc"), o.optString("con")) } } }
} catch (_: Exception) { emptyList() }

fun jsonXinAppCho(ds: List<XinAppCho>): String =
    JSONArray(ds.map { JSONObject().put("id", it.id).put("ten", it.ten).put("luc", it.luc).put("con", it.con) }).toString()

/** Thêm lời xin (trùng id ⇒ thay — máy chủ trả lại lời xin cũ khi xin trùng), bỏ lời xin quá 24 giờ, giữ tối đa 10 lời xin mới nhất. */
fun themXinAppCho(ds: List<XinAppCho>, moi: XinAppCho, now: Long): List<XinAppCho> =
    (conHanXinAppCho(ds, now).filter { it.id != moi.id } + moi).takeLast(XIN_APP_CHO_TOI_DA)

fun conHanXinAppCho(ds: List<XinAppCho>, now: Long): List<XinAppCho> = ds.filter { now - it.luc in 0..HOI_XIN_TOI_DA_MS }
