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

/** Đọc `GET /api/device/ho-so`. `khoaDen` lấy ISO; thiếu thì suy từ `choGiay` + `nhanLuc` = LÚC NHẬN phản hồi (không phải lúc đọc lại —
 *  đọc lại từ Kho mỗi giây mà cộng `now` thì hạn chờ trôi theo, không bao giờ hết). */
fun docHoSo(o: JSONObject, nhanLuc: Long): HoSoMay {
    val nowMs = nhanLuc
    val a = o.optJSONArray("con") ?: JSONArray()
    val ds = (0 until a.length()).mapNotNull { i ->
        val c = a.optJSONObject(i) ?: return@mapNotNull null
        val id = c.chuoi("id") ?: return@mapNotNull null
        BeHoSo(id, c.chuoi("ten") ?: "", c.chuoi("avatar"), c.optBoolean("coPin"), c.chuoi("vanPin"),
            // ưu tiên choGiay (không phụ thuộc đồng hồ máy lệch máy chủ); thiếu thì ISO
            c.optInt("choGiay", 0).takeIf { it > 0 }?.let { nowMs + it * 1000L } ?: iso(c.chuoi("khoaDen")))
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
    /** `toiDa` = số lần sai trước khi chờ (ho-so › pinSaiToiDa) — chỉ để nói «Sai 5 lần rồi». */
    data class TamKhoa(val choGiay: Int, val toiDa: Int = PIN_SAI_TOI_DA) : KetQuaPin()
    /** Mất mạng mà máy chưa nhớ vân PIN của bé (chưa từng lấy hồ sơ) ⇒ không tự kiểm được. */
    object CanMang : KetQuaPin()
}

/** Câu cho Con theo kết quả (màn «PIN chưa đúng», «Sai 5 lần rồi»). */
fun cauPin(kq: KetQuaPin): String = when (kq) {
    KetQuaPin.Dung -> ""
    is KetQuaPin.Sai -> "Chưa đúng · còn ${kq.conLan} lần thử"
    is KetQuaPin.TamKhoa -> "Sai ${kq.toiDa} lần rồi"
    KetQuaPin.CanMang -> "Máy cần nối mạng một lần để nhận PIN của con."
}

/** Bộ đếm sai PIN tại máy (lúc mất mạng), theo từng bé. Lưu JSON trong Kho. */
data class DemPin(val sai: Map<String, List<Long>> = emptyMap(), val khoaDen: Map<String, Long> = emptyMap()) {
    fun choGiay(conId: String, now: Long): Int = ((khoaDen[conId] ?: 0) - now).let { if (it > 0) ((it + 999) / 1000).toInt() else 0 }

    /** Ghi một lượt thử (đúng / sai). Đang chờ ⇒ TamKhoa, không so. Sai lần thứ `toiDa` ⇒ chờ `cho` giây, đếm lại từ đầu. */
    fun thu(conId: String, dung: Boolean, now: Long, toiDa: Int = PIN_SAI_TOI_DA, cho: Int = PIN_CHO_GIAY): Pair<KetQuaPin, DemPin> {
        choGiay(conId, now).let { if (it > 0) return KetQuaPin.TamKhoa(it, toiDa) to this }
        if (dung) return KetQuaPin.Dung to copy(sai = sai - conId, khoaDen = khoaDen - conId)
        val ds = (sai[conId] ?: emptyList()).filter { it > now - PIN_SAI_CUA_SO_MS && it <= now + 60_000 } + now
        if (ds.size >= toiDa) return KetQuaPin.TamKhoa(cho, toiDa) to copy(sai = sai - conId, khoaDen = khoaDen + (conId to now + cho * 1000L))
        return KetQuaPin.Sai(toiDa - ds.size) to copy(sai = sai + (conId to ds))
    }

    /** Máy chủ nhận PIN đúng ⇒ xoá HẲN mọi dấu sai / hạn chờ tại máy của bé (không đi qua thu() — thu() bị chặn khi đang chờ). */
    fun xoa(conId: String): DemPin = copy(sai = sai - conId, khoaDen = khoaDen - conId)

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
    dem.choGiay(be.id, now).let { if (it > 0) return KetQuaPin.TamKhoa(it, toiDa) to dem }
    val van = be.vanPin
    if (biMat.isNullOrEmpty() || van.isNullOrEmpty()) return KetQuaPin.CanMang to dem
    val p = chuanPin(pin)
    val dung = p != null && MessageDigest.isEqual(vanPin(biMat, be.id, p).toByteArray(), van.lowercase().toByteArray())
    return dem.thu(be.id, dung, now, toiDa, cho)
}

/** Lỗi máy chủ của `dang-nhap-be` → kết quả cho màn PIN (null = lỗi khác: khong_thay, can_pin…). */
fun docLoiPin(ma: String, than: JSONObject, toiDa: Int = PIN_SAI_TOI_DA): KetQuaPin? = when (ma) {
    "pin_sai" -> KetQuaPin.Sai(than.optInt("conLan", 0).coerceAtLeast(0))
    "pin_tam_khoa" -> KetQuaPin.TamKhoa(than.optInt("choGiay", PIN_CHO_GIAY).coerceAtLeast(1), toiDa)
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

/** Gửi bù ViecCho gặp lỗi máy chủ `http`: chỉ BỎ việc khi máy chủ từ chối nghiệp vụ (4xx, trừ 408 / 429 = thử lại sau);
 *  5xx / 502 / lỗi mạng ⇒ GIỮ để thử lại (bỏ «roi» thì máy chủ còn ghi bé đang dùng ⇒ nhịp sau mở máy không PIN). */
fun boViecCho(http: Int): Boolean = http in 400..499 && http != 408 && http != 429

/** Bé / Ba Mẹ rời máy (Đổi bé / Đăng xuất / Khoá lại): việc chờ cuối cùng LUÔN là «roi» — «vao» đang chờ bị thay
 *  (gửi dang-nhap-be sau dang-xuat sẽ mở lại máy cho bé đã đăng xuất). */
fun viecSauRoi(@Suppress("UNUSED_PARAMETER") cu: ViecCho?, now: Long): ViecCho = ViecCho("roi", luc = now)

/** Sau khi gửi xong `daGui`: việc đang chờ còn đúng là việc đó thì xoá; trong lúc gửi đã có việc mới (vd bé vừa đăng xuất) thì giữ việc mới. */
fun viecConLai(hienTai: ViecCho?, daGui: ViecCho): ViecCho? = if (hienTai == daGui) null else hienTai

enum class KetQuaGui { XONG, BO, GIU }

/**
 * Gửi việc chờ TUẦN TỰ (người gọi giữ một khoá gửi riêng): lấy việc đang chờ → gửi → ghi kết quả; trong lúc gửi mà việc chờ đã đổi
 * (vd «vao» đang bay thì bé bấm Đăng xuất ⇒ «roi») thì gửi tiếp việc mới ⇒ máy chủ luôn nhận «roi» SAU «vao». GIU (5xx / mạng) ⇒ dừng.
 * `ghi(daGui, kq)` cập nhật kho (XONG / BO ⇒ viecConLai). Trả danh sách việc đã gửi theo thứ tự.
 */
fun guiLanLuot(doc: () -> ViecCho?, gui: (ViecCho) -> KetQuaGui, ghi: (ViecCho, KetQuaGui) -> Unit, toiDa: Int = 3): List<ViecCho> {
    val daGui = mutableListOf<ViecCho>()
    repeat(toiDa) {
        val v = doc() ?: return daGui
        val kq = gui(v)
        daGui += v
        if (kq == KetQuaGui.GIU) return daGui
        ghi(v, kq)
    }
    return daGui
}

/** Mốc phút giải trí cả máy KHÔNG tính cho bé. Máy DÙNG CHUNG: mốc = phút cả máy lúc bé vào (bé trước / Ba Mẹ dùng không tính cho bé sau).
 *  Máy RIÊNG: mốc = tổng phút trong lúc Ba Mẹ dùng hôm nay (`baMeTu` = phút cả máy lúc Ba Mẹ bắt đầu dùng, null = Ba Mẹ không dùng).
 *  `luc` = lúc đổi người tại máy (Kho.lanDoiNguoi) khi đặt mốc — bé vào lại (kể cả cùng bé, sau Ba Mẹ dùng) ⇒ mốc mới (máy dùng chung). */
data class MocPhut(val conId: String, val ngay: String, val phut: Int, val luc: Long = 0, val baMeTu: Int? = null) {
    fun json(): String = JSONObject().put("conId", conId).put("ngay", ngay).put("phut", phut).put("luc", luc)
        .apply { baMeTu?.let { put("baMeTu", it) } }.toString()
    companion object {
        fun doc(s: String?): MocPhut? = try { if (s.isNullOrBlank()) null else JSONObject(s).let {
            MocPhut(it.getString("conId"), it.getString("ngay"), it.optInt("phut"), it.optLong("luc"), if (it.has("baMeTu")) it.optInt("baMeTu") else null) } }
            catch (_: Exception) { null }
    }
}

/** Cập nhật mốc. `coCong` = máy chủ có PIN theo bé (có nguoiDung + hồ sơ); không ⇒ null (máy chủ cũ: cả máy là của bé).
 *  Dùng chung: bé đang dùng (CON) mà mốc khác bé / ngày / lượt vào ⇒ mốc mới = phút cả máy; cổng khác ⇒ giữ.
 *  Riêng: sang ngày ⇒ 0; Ba Mẹ bắt đầu dùng ⇒ nhớ `baMeTu`; Ba Mẹ thôi dùng ⇒ mốc += phút trong lúc Ba Mẹ dùng. */
fun capNhatMoc(moc: MocPhut?, coCong: Boolean, dungChung: Boolean, cong: Cong, conId: String?, ngay: String, phutCaMay: Int, lucVao: Long): MocPhut? {
    if (!coCong) return null
    if (dungChung) {
        if (cong != Cong.CON || conId == null) return moc
        return if (moc == null || moc.conId != conId || moc.ngay != ngay || moc.luc != lucVao || moc.baMeTu != null)
            MocPhut(conId, ngay, phutCaMay, lucVao) else moc
    }
    val m = if (moc == null || moc.ngay != ngay || moc.conId.isNotEmpty()) MocPhut("", ngay, 0) else moc
    return when {
        cong == Cong.BA_ME && m.baMeTu == null -> m.copy(baMeTu = phutCaMay)
        cong != Cong.BA_ME && m.baMeTu != null -> m.copy(phut = m.phut + (phutCaMay - m.baMeTu).coerceAtLeast(0), baMeTu = null)
        else -> m
    }
}

/** Phút của bé = phút cả máy − mốc (≥ 0). */
fun truMoc(phut: Int, moc: MocPhut?): Int = (phut - (moc?.phut ?: 0)).coerceAtLeast(0)

/** Việc chờ giữ tối đa 24 giờ (ViecCho «vao» chứa PIN thô của bé — không để lâu trong SharedPreferences). */
const val VIEC_CHO_HAN_MS = 24 * 60 * 60_000L
fun viecConHan(v: ViecCho, now: Long): Boolean = now - v.luc in 0..VIEC_CHO_HAN_MS

/** Hạn «Ba Mẹ dùng» máy chủ gửi (giờ máy chủ) → giờ máy (`lechMs` = giờ máy chủ − giờ máy). Mọi so sánh cổng dùng giờ máy. */
fun denTheoGioMay(denMayChu: Long?, lechMs: Long): Long? = denMayChu?.let { it - lechMs }

/** Đếm ngược «0:15 giây» / «Ba Mẹ dùng tới 20:10 · còn 12:30». */
fun demGiay(giay: Int): String = "%d:%02d".format(maxOf(0, giay) / 60, maxOf(0, giay) % 60)
