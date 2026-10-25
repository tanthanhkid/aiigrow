package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.math.ceil
import kotlin.math.roundToInt

// Mã mở offline — khi máy MẤT MẠNG, Ba Mẹ (điện thoại còn mạng) xem mã 6 số trong app và đọc cho Con gõ vào màn khoá.
// Tác tử tự kiểm mã KHÔNG cần máy chủ, nhờ bí mật chung (`maOfflineBiMat` trong phản hồi nhịp, máy chủ cấp khi còn mạng).
// Phải RA ĐÚNG số như máy chủ (server/lib/ma-offline.ts) và agent-win (AiiGrow.Core/MaOffline.cs): TOTP RFC 6238, HMAC-SHA1,
// khoá = UTF-8 của chuỗi bí mật, bước 300 giây, 6 chữ số, dung sai ±1 bước. Trạng thái «mở tạm» chép MoTamOffline.cs.

/** Vân của bí mật (12 ký tự hex đầu của SHA-256) — agent báo vân, máy chủ so (server/lib/nhip-may.ts) để biết có phải gửi lại bí mật. */
fun vanBiMat(biMat: String): String = MessageDigest.getInstance("SHA-256").digest(biMat.toByteArray(Charsets.UTF_8))
    .joinToString("") { "%02x".format(it) }.take(12)

object MaOffline {
    const val BUOC_GIAY = 300L
    const val SO_CHU_SO = 6
    const val DUNG_SAI = 1

    private fun totp(biMat: String, buoc: Long): String {
        val buf = ByteArray(8) { i -> (buoc ushr (56 - 8 * i)).toByte() }
        val mac = Mac.getInstance("HmacSHA1").apply { init(SecretKeySpec(biMat.toByteArray(Charsets.UTF_8), "HmacSHA1")) }
        val h = mac.doFinal(buf)
        val off = h[h.size - 1].toInt() and 0x0f
        val bin = ((h[off].toInt() and 0x7f) shl 24) or ((h[off + 1].toInt() and 0xff) shl 16) or
            ((h[off + 2].toInt() and 0xff) shl 8) or (h[off + 3].toInt() and 0xff)
        return (bin % 1_000_000).toString().padStart(SO_CHU_SO, '0')
    }

    /** Mã của bước chứa `nowMs` (đối chiếu / thử). */
    fun ma(biMat: String, nowMs: Long): String = totp(biMat, Math.floorDiv(nowMs / 1000, BUOC_GIAY))

    /** Đúng nếu khớp bước hiện tại hoặc ±1 bước. So hết các bước, so sánh không lộ thời gian. */
    fun kiem(biMat: String?, ma: String?, nowMs: Long): Boolean {
        if (biMat.isNullOrEmpty()) return false
        val sach = (ma ?: "").filter { it.isDigit() }
        if (sach.length != SO_CHU_SO) return false
        val moc = Math.floorDiv(nowMs / 1000, BUOC_GIAY)
        var ok = false
        for (i in -DUNG_SAI..DUNG_SAI) ok = ok or MessageDigest.isEqual(sach.toByteArray(), totp(biMat, moc + i).toByteArray())
        return ok
    }
}

enum class KetQuaMoOffline { DA_MO, DANG_MO, SAI, DA_DUNG, CHO_THU_LAI, CHUA_CO_BI_MAT }

/** Trạng thái «mở tạm bằng mã offline» (thuần; Kho lưu dạng JSON để dịch vụ khởi động lại vẫn giữ). Mốc thời gian = epoch ms. */
data class MoTamOffline(
    val moTu: Long? = null,
    val moDen: Long? = null,
    val maCuoi: String? = null,
    val maCuoiLuc: Long? = null,
    val saiLuc: List<Long> = emptyList(),
) {
    /** Đang mở? Đồng hồ bị lùi về trước lúc mở ⇒ coi như không mở (không kéo dài được bằng cách chỉnh giờ). */
    fun dangMo(now: Long) = moDen != null && moDen > now && (moTu == null || now >= moTu - 60_000)

    private fun saiConTinh(now: Long) = saiLuc.filter { it > now - CUA_SO_SAI_PHUT * 60_000L }.takeLast(50)

    /** Giây còn phải chờ trước khi được gõ mã tiếp (0 = gõ được). */
    fun choGiay(now: Long): Int {
        val s = saiConTinh(now)
        if (s.size < SAI_TOI_DA) return 0
        val cuNhat = s.filter { it <= now }.minOrNull() ?: now
        return maxOf(1, ceil((cuNhat + CUA_SO_SAI_PHUT * 60_000L - now) / 1000.0).toInt())
    }

    /** Con gõ mã. Trả kết quả + trạng thái mới (đúng ⇒ mở tới now + phut). `lechMs` = giờ máy chủ − giờ máy: mã Ba Mẹ thấy tính theo
     *  đồng hồ máy chủ ⇒ kiểm theo now + lechMs (máy lệch giờ vẫn nhận đúng mã); hạn mở / lượt sai vẫn tính theo đồng hồ máy. */
    fun thu(biMat: String?, ma: String?, now: Long, phut: Int = PHUT_MO, lechMs: Long = 0): Pair<KetQuaMoOffline, MoTamOffline> {
        if (biMat.isNullOrEmpty()) return KetQuaMoOffline.CHUA_CO_BI_MAT to this
        val gon = copy(saiLuc = saiConTinh(now))
        if (gon.choGiay(now) > 0) return KetQuaMoOffline.CHO_THU_LAI to gon
        val sach = (ma ?: "").filter { it.isDigit() }
        val trungMaCu = maCuoi != null && maCuoiLuc != null && sach == maCuoi && now - maCuoiLuc < NHO_MA_DA_DUNG_MS && now >= maCuoiLuc - 60_000
        if (trungMaCu) return (if (dangMo(now)) KetQuaMoOffline.DANG_MO else KetQuaMoOffline.DA_DUNG) to gon
        if (!MaOffline.kiem(biMat, sach, now + lechMs)) return KetQuaMoOffline.SAI to gon.copy(saiLuc = gon.saiLuc + now)
        val p = phut.coerceIn(5, 120)
        return KetQuaMoOffline.DA_MO to MoTamOffline(now, now + p * 60_000L, sach, now, emptyList())
    }

    /** Có mạng lại (nhịp thành công) ⇒ kết thúc lượt mở đang chạy (mã chỉ dành cho lúc mất mạng). null nếu không có lượt nào. */
    fun ketThucKhiCoMang(now: Long): MoTamOffline? = if (dangMo(now)) copy(moDen = now) else null

    fun json(): String = JSONObject().apply {
        moTu?.let { put("moTu", it) }; moDen?.let { put("moDen", it) }; maCuoi?.let { put("maCuoi", it) }; maCuoiLuc?.let { put("maCuoiLuc", it) }
        put("saiLuc", JSONArray(saiLuc))
    }.toString()

    companion object {
        const val PHUT_MO = 60
        const val SAI_TOI_DA = 5
        const val CUA_SO_SAI_PHUT = 10
        /** Một mã còn nhận tối đa (2·dung sai + 1) bước ⇒ nhớ mã đã dùng lâu hơn một bước cho chắc. */
        const val NHO_MA_DA_DUNG_MS = MaOffline.BUOC_GIAY * (2 * MaOffline.DUNG_SAI + 2) * 1000L

        fun doc(s: String?): MoTamOffline = try {
            if (s.isNullOrBlank()) MoTamOffline() else JSONObject(s).let { o ->
                fun l(k: String) = if (o.has(k) && !o.isNull(k)) o.optLong(k) else null
                val a = o.optJSONArray("saiLuc") ?: JSONArray()
                MoTamOffline(l("moTu"), l("moDen"), o.optString("maCuoi").ifBlank { null }, l("maCuoiLuc"), (0 until a.length()).map { a.optLong(it) })
            }
        } catch (_: Exception) { MoTamOffline() }
    }
}

/** Câu trả lời cho Con (không nhắc điểm). `gio` định dạng HH:mm theo giờ máy. */
fun cauMoOffline(kq: KetQuaMoOffline, st: MoTamOffline, now: Long, gio: (Long) -> String): String = when (kq) {
    KetQuaMoOffline.DA_MO -> "Đã mở ${maxOf(1, ((st.moDen!! - now) / 60_000.0).roundToInt())} phút (tới ${gio(st.moDen)}). Chơi vui nhé!"
    KetQuaMoOffline.DANG_MO -> "Máy đang mở tới ${gio(st.moDen ?: now)} rồi nhé."
    KetQuaMoOffline.SAI -> "Mã chưa đúng. Con nhờ Ba Mẹ đọc lại nhé."
    KetQuaMoOffline.DA_DUNG -> "Mã này dùng rồi. Con nhờ Ba Mẹ đọc mã mới nhé."
    KetQuaMoOffline.CHO_THU_LAI -> "Con gõ sai nhiều lần quá. Thử lại sau ${maxOf(1, (st.choGiay(now) + 59) / 60)} phút nhé."
    KetQuaMoOffline.CHUA_CO_BI_MAT -> "Máy chưa nhận được mã của Ba Mẹ. Cần nối mạng một lần đã nhé."
}

/** Máy coi là mất mạng (hiện ô nhập mã) khi nhịp thành công cuối đã quá 3 phút (nhịp mỗi 60 giây). */
const val MAT_MANG_SAU_MS = 3 * 60_000L
fun matMang(lanNhipThanhCong: Long, now: Long) = lanNhipThanhCong == 0L || now - lanNhipThanhCong > MAT_MANG_SAU_MS
