package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject

// #337 / #339 (17/11), phần thuần JVM. Máy CHUNG (≥ 2 bé): máy chủ chỉ gửi luật của bé ĐANG đăng nhập ở nhịp ⇒ mất mạng mà «Đổi người»,
// bé sau từng dùng luật, khoá, sao của bé trước (DichVuNhip › vong: `ph.chinhSach` là của bé trong nhịp cuối). Máy chủ (PR #342) gửi kèm
// `GET /api/device/ho-so?offline=1` gói luật của TỪNG bé (`con[i].offline = {serverTime, chinhSach, nenTang}` — đúng hình dạng phản hồi nhịp)
// ⇒ máy lưu riêng theo bé (Kho.goiOffline) và chọn luật theo bé đang dùng. Bé chưa có gói ⇒ khoá tới khi có mạng, không mượn luật bé khác.
// Nhịp / dong-bo có `dsCon` = bé được gán máy ⇒ lệch danh sách đang nhớ thì tải lại ho-so ngay; bé đang dùng bị bỏ gán ⇒ về màn chọn tên.

/** Câu màn khoá khi bé đang dùng chưa có luật trên máy (mất mạng, chưa nhận gói của bé). */
const val CAU_CHO_MANG_LUAT = "Máy cần nối mạng để nhận luật của con. Nối mạng xong là con dùng được nhé."

/**
 * Tách gói mất mạng ra khỏi phản hồi ho-so (xoá `con[i].offline` trong `hoSo` — hồ sơ nhớ đọc mỗi vòng, giữ gọn) và trả gói mới theo bé.
 * - Máy chủ có gói (`offlineLuc`) ⇒ đúng tập máy chủ gửi (bé lỗi không có gói ⇒ bỏ gói cũ: khoá khi mất mạng, như máy chủ dặn).
 * - Không có `offlineLuc` (máy riêng / máy chủ cũ) ⇒ giữ gói cũ của các bé còn trong hồ sơ.
 * Bé không còn trong hồ sơ ⇒ bỏ gói.
 */
fun tachGoiOffline(hoSo: JSONObject, cu: Map<String, String>): Map<String, String> {
    val a = hoSo.optJSONArray("con") ?: JSONArray()
    val coGoi = hoSo.has("offlineLuc") && !hoSo.isNull("offlineLuc")
    val ra = linkedMapOf<String, String>()
    for (i in 0 until a.length()) {
        val c = a.optJSONObject(i) ?: continue
        val id = c.optString("id").takeIf { it.isNotBlank() && it != "null" }
        val g = c.optJSONObject("offline")
        c.remove("offline")
        if (id == null) continue
        if (g != null) ra[id] = g.toString() else if (!coGoi) cu[id]?.let { ra[id] = it }
    }
    hoSo.remove("offlineLuc")
    return ra
}

fun goiOfflineJson(m: Map<String, String>): String = JSONObject().apply { m.forEach { (k, v) -> put(k, v) } }.toString()

fun docGoiOffline(s: String?): Map<String, String> = try {
    if (s.isNullOrBlank()) emptyMap() else JSONObject(s).let { o -> o.keys().asSequence().associateWith { o.optString(it) }.filterValues { it.isNotBlank() } }
} catch (_: Exception) { emptyMap() }

/** Luật dùng cho vòng thực thi. */
sealed class LuatBe {
    /** Phản hồi nhịp cuối là của đúng bé đang dùng (hoặc không ai dùng / máy riêng) ⇒ như trước. */
    object NhipCuoi : LuatBe()
    /** Bé đang dùng khác bé của nhịp cuối ⇒ luật từ gói mất mạng của bé này. */
    data class TuGoi(val ph: PhanHoiNhip) : LuatBe()
    /** Bé đang dùng khác bé của nhịp cuối mà chưa có gói ⇒ khoá tới khi có mạng. */
    object ChoMang : LuatBe()
}

/**
 * Chọn luật theo bé (#337). `conDung` = bé đang dùng (cổng CON; null = chọn tên / Ba Mẹ / máy chủ cũ), `mayChung` = hồ sơ báo máy dùng chung,
 * `conNhip` = bé của phản hồi nhịp cuối (`chinhSach.con.id`; null = nhịp lúc chưa ai vào), `goi` = gói mất mạng của `conDung` (JSON).
 */
fun chonLuatBe(conDung: String?, mayChung: Boolean, conNhip: String?, goi: String?): LuatBe {
    if (!mayChung || conDung == null || conDung == conNhip) return LuatBe.NhipCuoi
    val ph = try { goi?.let { docPhanHoiNhip(it) } } catch (_: Exception) { null }
    // gói phải đúng bé (chinhSach.con.id — máy chủ dựng như bé đó đang đăng nhập); thiếu id ⇒ tin khoá theo bé của Kho
    return if (ph != null && (ph.chinhSach.conId == null || ph.chinhSach.conId == conDung)) LuatBe.TuGoi(ph) else LuatBe.ChoMang
}

/** `dsCon` ở gốc phản hồi nhịp / dong-bo; máy chủ cũ không gửi ⇒ null. */
fun docDsCon(goc: JSONObject): List<String>? {
    val a = goc.optJSONArray("dsCon") ?: return null
    return (0 until a.length()).mapNotNull { a.optString(it).takeIf { s -> s.isNotBlank() && s != "null" } }
}

/** Kết quả so `dsCon` với hồ sơ nhớ: `taiLai` = tải lại ho-so ngay, `dayRa` = bé đang dùng không còn được gán ⇒ về màn chọn tên. */
data class XetDsCon(val taiLai: Boolean, val dayRa: Boolean)

/**
 * #339. `dsCon` null (máy chủ cũ) ⇒ không làm gì (chu kỳ tải lại cũ vẫn chạy). Danh sách rỗng (máy riêng đời cũ nối thẳng `child_id`,
 * hoặc vừa bỏ hết bé) ⇒ không đẩy ai ra; tải lại nếu hồ sơ còn bé. `conDung` = bé đang dùng (cổng CON).
 */
fun xetDsCon(dsCon: List<String>?, hoSoCon: List<String>?, conDung: String?): XetDsCon {
    if (dsCon == null) return XetDsCon(false, false)
    val taiLai = hoSoCon == null || dsCon.toSet() != hoSoCon.toSet()
    val dayRa = conDung != null && dsCon.isNotEmpty() && conDung !in dsCon
    return XetDsCon(taiLai, dayRa)
}
