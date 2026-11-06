package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.time.Instant
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

// PIN theo bé (L13 — docs/KE-HOACH-KHOP-THIET-KE-0611.md, docs/API.md mục «S3 thiết kế chốt 06/11»), phần thuần JVM:
// đọc `GET /api/device/ho-so` + `nhip.nguoiDung`, quyết «cổng» của máy (chọn tên / bé đang dùng / Ba Mẹ đang dùng),
// kiểm PIN khi MẤT MẠNG bằng `vanPin` = HMAC-SHA256(khoá = maOfflineBiMat, "<id bé>:<PIN>") hex (server/lib/pin-be.ts › vanPin),
// tự đếm sai 5 lần ⇒ chờ 15 giây (như máy chủ: lượt sai cũ hơn 15 phút không cộng dồn).

const val PIN_SAI_TOI_DA = 5
const val PIN_CHO_GIAY = 15
private const val PIN_SAI_CUA_SO_MS = 15 * 60_000L

/** Vân PIN — phải RA ĐÚNG như máy chủ: HMAC-SHA256, khoá = UTF-8 của bí mật, thông điệp = "<id bé>:<PIN>", hex chữ thường. */
fun vanPin(biMat: String, conId: String, pin: String): String {
    val mac = Mac.getInstance("HmacSHA256").apply { init(SecretKeySpec(biMat.toByteArray(Charsets.UTF_8), "HmacSHA256")) }
    return mac.doFinal("$conId:$pin".toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
}

/** PIN hợp lệ = đúng 4 chữ số (bỏ ký tự lạ). null nếu không đủ. */
fun chuanPin(s: String?): String? = (s ?: "").filter { it.isDigit() }.takeIf { it.length == 4 }

private fun JSONObject.chuoi(k: String): String? = if (has(k) && !isNull(k)) optString(k).takeIf { it.isNotBlank() && it != "null" } else null
private fun iso(s: String?): Long? = try { s?.let { Instant.parse(it).toEpochMilli() } } catch (_: Exception) { null }

data class BeHoSo(val id: String, val ten: String, val avatar: String?, val coPin: Boolean, val vanPin: String?, val khoaDen: Long?) {
    /** Chữ cái đầu cho vòng avatar («B» của Bảo Anh). */
    val chuDau: String get() = ten.trim().firstOrNull()?.uppercase() ?: "?"
}

data class HoSoMay(
    val con: List<BeHoSo>, val mayRieng: Boolean, val dangDung: String?, val baMeDen: Long?,
    val pinSaiToiDa: Int = PIN_SAI_TOI_DA, val pinChoGiay: Int = PIN_CHO_GIAY,
) {
    fun be(id: String?) = con.firstOrNull { it.id == id }
}

/** Đọc `GET /api/device/ho-so`. `khoaDen` lấy ISO; thiếu thì suy từ `choGiay` + giờ nhận. */
fun docHoSo(o: JSONObject, nowMs: Long): HoSoMay {
    val a = o.optJSONArray("con") ?: JSONArray()
    val ds = (0 until a.length()).mapNotNull { i ->
        val c = a.optJSONObject(i) ?: return@mapNotNull null
        val id = c.chuoi("id") ?: return@mapNotNull null
        BeHoSo(id, c.chuoi("ten") ?: "", c.chuoi("avatar"), c.optBoolean("coPin"), c.chuoi("vanPin"),
            iso(c.chuoi("khoaDen")) ?: c.optInt("choGiay", 0).takeIf { it > 0 }?.let { nowMs + it * 1000L })
    }
    return HoSoMay(ds, o.optBoolean("mayRieng"), o.optJSONObject("dangDung")?.chuoi("id"), iso(o.optJSONObject("baMeDung")?.chuoi("den")),
        o.optInt("pinSaiToiDa", PIN_SAI_TOI_DA).coerceIn(1, 20), o.optInt("pinChoGiay", PIN_CHO_GIAY).coerceIn(1, 3600))
}

enum class LoaiNguoiDung { CON, BA_ME, CHUA }

/** `nhip.nguoiDung`: {loai: "con", con: {id, ten, coPin}} | {loai: "ba_me", den} | {loai: "chua"}. */
data class NguoiDung(val loai: LoaiNguoiDung, val conId: String? = null, val tenCon: String? = null, val coPin: Boolean = false, val baMeDen: Long? = null) {
    fun json(): String = JSONObject().put("loai", loai.name).apply {
        conId?.let { put("conId", it) }; tenCon?.let { put("tenCon", it) }; put("coPin", coPin); baMeDen?.let { put("baMeDen", it) }
    }.toString()

    companion object {
        fun doc(s: String?): NguoiDung? = try {
            if (s.isNullOrBlank()) null else JSONObject(s).let { o ->
                NguoiDung(LoaiNguoiDung.valueOf(o.getString("loai")), o.chuoi("conId"), o.chuoi("tenCon"), o.optBoolean("coPin"),
                    if (o.has("baMeDen")) o.optLong("baMeDen") else null)
            }
        } catch (_: Exception) { null }
    }
}

/** Đọc `nguoiDung` ở gốc phản hồi nhịp (+ `baMeDung.den` ở gốc). Máy chủ cũ không gửi ⇒ null (không có cổng PIN). */
fun docNguoiDung(goc: JSONObject): NguoiDung? {
    val o = goc.optJSONObject("nguoiDung") ?: return null
    return when (o.optString("loai")) {
        "con" -> o.optJSONObject("con").let { c -> NguoiDung(LoaiNguoiDung.CON, c?.chuoi("id"), c?.chuoi("ten"), c?.optBoolean("coPin") ?: false) }
        "ba_me" -> NguoiDung(LoaiNguoiDung.BA_ME, baMeDen = iso(o.chuoi("den")) ?: iso(goc.optJSONObject("baMeDung")?.chuoi("den")))
        "chua" -> NguoiDung(LoaiNguoiDung.CHUA)
        else -> null
    }
}

/** Cổng của máy: MO = không có cổng PIN (máy chủ cũ); CON = bé đang dùng; BA_ME = Ba Mẹ đang dùng (mở hết, không tính giờ con); CHON_TEN = máy khoá ở màn chọn tên. */
enum class Cong { MO, CON, BA_ME, CHON_TEN }

/**
 * Quyết cổng từ người dùng nhớ gần nhất (nhịp / hành động tại máy) + hồ sơ + hạn «Ba Mẹ dùng» tự kiểm offline.
 * - Ba Mẹ còn hạn (máy chủ hoặc mã gõ lúc mất mạng) ⇒ BA_ME; hết hạn ⇒ CHON_TEN ngay (không chờ mạng).
 * - Máy riêng của bé: nhịp luôn báo «con» (chủ máy) ⇒ dựa hồ sơ: chưa có phiên (`dangDung` null) mà bé có PIN ⇒ vẫn hỏi PIN.
 */
fun xetCong(nd: NguoiDung?, hs: HoSoMay?, baMeDenCucBo: Long, now: Long): Cong {
    val baMe = maxOf(baMeDenCucBo, if (nd?.loai == LoaiNguoiDung.BA_ME) nd.baMeDen ?: 0 else 0)
    if (baMe > now) return Cong.BA_ME
    if (nd == null) return Cong.MO
    return when (nd.loai) {
        LoaiNguoiDung.BA_ME, LoaiNguoiDung.CHUA -> Cong.CHON_TEN
        LoaiNguoiDung.CON -> if (hs != null && hs.mayRieng && hs.dangDung == null && hs.con.any { it.coPin }) Cong.CHON_TEN else Cong.CON
    }
}

sealed class KetQuaPin {
    object Dung : KetQuaPin()
    data class Sai(val conLan: Int) : KetQuaPin()
    data class TamKhoa(val choGiay: Int) : KetQuaPin()
    /** Mất mạng mà máy chưa nhớ vân PIN của bé (chưa từng lấy hồ sơ) ⇒ không tự kiểm được. */
    object CanMang : KetQuaPin()
}

/** Câu cho Con theo kết quả (màn «PIN chưa đúng», «Sai 5 lần rồi»). */
fun cauPin(kq: KetQuaPin): String = when (kq) {
    KetQuaPin.Dung -> ""
    is KetQuaPin.Sai -> "Chưa đúng · còn ${kq.conLan} lần thử"
    is KetQuaPin.TamKhoa -> "Sai $PIN_SAI_TOI_DA lần rồi"
    KetQuaPin.CanMang -> "Máy cần nối mạng một lần để nhận PIN của con."
}

/** Bộ đếm sai PIN tại máy (lúc mất mạng), theo từng bé. Lưu JSON trong Kho. */
data class DemPin(val sai: Map<String, List<Long>> = emptyMap(), val khoaDen: Map<String, Long> = emptyMap()) {
    fun choGiay(conId: String, now: Long): Int = ((khoaDen[conId] ?: 0) - now).let { if (it > 0) ((it + 999) / 1000).toInt() else 0 }

    /** Ghi một lượt thử (đúng / sai). Đang chờ ⇒ TamKhoa, không so. Sai lần thứ `toiDa` ⇒ chờ `cho` giây, đếm lại từ đầu. */
    fun thu(conId: String, dung: Boolean, now: Long, toiDa: Int = PIN_SAI_TOI_DA, cho: Int = PIN_CHO_GIAY): Pair<KetQuaPin, DemPin> {
        choGiay(conId, now).let { if (it > 0) return KetQuaPin.TamKhoa(it) to this }
        if (dung) return KetQuaPin.Dung to copy(sai = sai - conId, khoaDen = khoaDen - conId)
        val ds = (sai[conId] ?: emptyList()).filter { it > now - PIN_SAI_CUA_SO_MS && it <= now + 60_000 } + now
        if (ds.size >= toiDa) return KetQuaPin.TamKhoa(cho) to copy(sai = sai - conId, khoaDen = khoaDen + (conId to now + cho * 1000L))
        return KetQuaPin.Sai(toiDa - ds.size) to copy(sai = sai + (conId to ds))
    }

    /** Máy chủ báo bé đang bị chờ (`khoaDen`) ⇒ nhớ để mất mạng ngay sau đó vẫn chờ đúng. */
    fun khoaTheoMayChu(conId: String, den: Long): DemPin = if ((khoaDen[conId] ?: 0) >= den) this else copy(khoaDen = khoaDen + (conId to den))

    fun json(): String = JSONObject()
        .put("sai", JSONObject().apply { sai.forEach { (k, v) -> put(k, JSONArray(v)) } })
        .put("khoaDen", JSONObject().apply { khoaDen.forEach { (k, v) -> put(k, v) } }).toString()

    companion object {
        fun doc(s: String?): DemPin = try {
            if (s.isNullOrBlank()) DemPin() else JSONObject(s).let { o ->
                val sa = o.optJSONObject("sai") ?: JSONObject(); val kd = o.optJSONObject("khoaDen") ?: JSONObject()
                DemPin(sa.keys().asSequence().associateWith { k -> sa.optJSONArray(k)?.let { a -> (0 until a.length()).map { a.optLong(it) } } ?: emptyList() },
                    kd.keys().asSequence().associateWith { kd.optLong(it) })
            }
        } catch (_: Exception) { DemPin() }
    }
}

/** Kiểm PIN tại máy khi MẤT MẠNG: bé không có PIN ⇒ đúng; có PIN mà chưa nhớ vân / bí mật ⇒ CanMang. So vân không lộ thời gian. */
fun thuPinOffline(dem: DemPin, biMat: String?, be: BeHoSo, pin: String, now: Long, toiDa: Int = PIN_SAI_TOI_DA, cho: Int = PIN_CHO_GIAY): Pair<KetQuaPin, DemPin> {
    if (!be.coPin) return KetQuaPin.Dung to dem
    dem.choGiay(be.id, now).let { if (it > 0) return KetQuaPin.TamKhoa(it) to dem }
    val van = be.vanPin
    if (biMat.isNullOrEmpty() || van.isNullOrEmpty()) return KetQuaPin.CanMang to dem
    val p = chuanPin(pin)
    val dung = p != null && MessageDigest.isEqual(vanPin(biMat, be.id, p).toByteArray(), van.lowercase().toByteArray())
    return dem.thu(be.id, dung, now, toiDa, cho)
}

/** Lỗi máy chủ của `dang-nhap-be` → kết quả cho màn PIN (null = lỗi khác: khong_thay, can_pin…). */
fun docLoiPin(ma: String, than: JSONObject): KetQuaPin? = when (ma) {
    "pin_sai" -> KetQuaPin.Sai(than.optInt("conLan", 0).coerceAtLeast(0))
    "pin_tam_khoa" -> KetQuaPin.TamKhoa(than.optInt("choGiay", PIN_CHO_GIAY).coerceAtLeast(1))
    else -> null
}

/** Việc tại máy chưa báo được máy chủ (lúc mất mạng): «vao» = bé vào bằng PIN kiểm offline (gửi lại `dang-nhap-be`),
 *  «roi» = đăng xuất / khoá lại (gửi `dang-xuat`). Chỉ giữ việc cuối cùng. PIN giữ tới khi gửi xong rồi xoá. */
data class ViecCho(val loai: String, val conId: String? = null, val pin: String? = null, val luc: Long = 0) {
    fun json(): String = JSONObject().put("loai", loai).put("luc", luc).apply { conId?.let { put("conId", it) }; pin?.let { put("pin", it) } }.toString()
    companion object {
        fun doc(s: String?): ViecCho? = try { if (s.isNullOrBlank()) null else JSONObject(s).let { ViecCho(it.getString("loai"), it.chuoi("conId"), it.chuoi("pin"), it.optLong("luc")) } }
            catch (_: Exception) { null }
    }
}

/** Đếm ngược «0:15 giây» / «Ba Mẹ dùng tới 20:10 · còn 12:30». */
fun demGiay(giay: Int): String = "%d:%02d".format(maxOf(0, giay) / 60, maxOf(0, giay) % 60)
