package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

// Danh sách app đã cài THẬT trên máy Con ⇒ POST /api/device/ung-dung (hợp đồng «chan-app-that», 25/10).
// Logic thuần (không import android.*): lọc, bam tất định, tính phần đổi, đọc tín hiệu `danhSachApp` ở gốc phản hồi nhịp,
// quyết định khi nào quét / gửi đủ / gửi phần đổi. Phần chạm PackageManager ở DanhSachApp.kt.
// Android không có blockedApps: Ba Mẹ đặt «Chặn» ⇒ package vào chinhSach.ungDung.chan ⇒ quyetDinh() chặn như cũ.

/** Một app trên máy (Android: khoa = muc = package name, nguon "launcher"). */
data class AppMay(
    val khoa: String,
    val muc: String,
    val ten: String,
    val nguon: String = "launcher",
    val nhaPhatHanh: String? = null,
    val phienBan: String? = null,
    /** PNG 96×96 base64 (không tiền tố data:). Chỉ gửi khi app mới / icon đổi / máy chủ báo thiếu (xem [chonIcon]). */
    val icon: String? = null,
    /** SHA-256 hex chữ thường của byte PNG — luôn gửi; máy chủ giữ icon cũ nếu trùng. Vào bam thay cho icon. */
    val iconBam: String? = null,
) {
    fun json(): JSONObject = JSONObject().put("khoa", khoa).put("muc", muc).put("ten", ten).put("nguon", nguon).apply {
        nhaPhatHanh?.let { put("nhaPhatHanh", it) }
        phienBan?.let { put("phienBan", it) }
        icon?.let { put("icon", it) }
        iconBam?.let { put("iconBam", it) }
    }

    /** Dấu riêng của app: đổi khi tên / phiên bản / nhà phát hành / icon (iconBam) đổi ⇒ vào `them` của lần gửi phần đổi. */
    val dau: String get() = sha256Hex(listOf(khoa, muc, ten, nguon, nhaPhatHanh ?: "", phienBan ?: "", iconBam ?: "").joinToString("\u0001"))
}

const val TOI_DA_APP = 1500
const val TOI_DA_CHU = 300
/** Cỡ icon (px) và trần base64 — quá trần thì bỏ cả icon lẫn iconBam (máy chủ không nhận). */
const val CO_ICON_PX = 96
const val TOI_DA_ICON_B64 = 64 * 1024

fun sha256Hex(b: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(b).joinToString("") { "%02x".format(it) }
fun sha256Hex(s: String): String = sha256Hex(s.toByteArray(Charsets.UTF_8))

/** Chuẩn hoá danh sách quét: bỏ khoá trống / chính AiiGrow Con, trùng khoá giữ bản đầu, cắt chữ ≤ 300, icon quá cỡ bỏ, sắp theo khoa. */
fun chuanDanhSach(ds: List<AppMay>, goiMinh: String): List<AppMay> {
    fun cat(s: String?) = s?.trim()?.take(TOI_DA_CHU)?.ifEmpty { null }
    return ds.asSequence()
        .map { it.copy(khoa = it.khoa.trim(), muc = it.muc.trim()) }
        .filter { it.khoa.isNotEmpty() && it.muc.isNotEmpty() && it.khoa != goiMinh }
        .distinctBy { it.khoa }
        .map { a ->
            a.copy(
                khoa = a.khoa.take(TOI_DA_CHU), muc = a.muc.take(TOI_DA_CHU),
                ten = cat(a.ten) ?: a.khoa.take(TOI_DA_CHU),
                nhaPhatHanh = cat(a.nhaPhatHanh), phienBan = cat(a.phienBan),
            ).let { b -> if (a.icon.isNullOrEmpty() || a.icon.length > TOI_DA_ICON_B64) b.copy(icon = null, iconBam = null) else b }
        }
        .sortedBy { it.khoa }
        .take(TOI_DA_APP)
        .toList()
}

/** Bam cả danh sách — tất định, không phụ thuộc thứ tự quét. */
fun bamDanhSach(ds: List<AppMay>): String = sha256Hex(ds.sortedBy { it.khoa }.joinToString("\n") { it.khoa + "|" + it.dau })

/** Dấu theo khoa (lưu lại sau lần gửi được, để lần sau tính phần đổi). */
fun dauTheoKhoa(ds: List<AppMay>): Map<String, String> = ds.associate { it.khoa to it.dau }

data class PhanDoi(val them: List<AppMay>, val bo: List<String>) {
    val rong get() = them.isEmpty() && bo.isEmpty()
}

/** `them` = app mới hoặc đổi dấu; `bo` = khoa có ở lần gửi trước mà nay không còn. */
fun tinhPhanDoi(truoc: Map<String, String>, nay: List<AppMay>): PhanDoi {
    val khoaNay = nay.map { it.khoa }.toSet()
    return PhanDoi(nay.filter { truoc[it.khoa] != it.dau }, truoc.keys.filter { it !in khoaNay }.sorted())
}

fun thanGuiDu(ds: List<AppMay>, bam: String): JSONObject =
    JSONObject().put("du", true).put("bam", bam).put("ds", JSONArray(ds.map { it.json() }))

fun thanGuiDoi(bamTruoc: String, bam: String, d: PhanDoi): JSONObject =
    JSONObject().put("du", false).put("bamTruoc", bamTruoc).put("bam", bam)
        .put("them", JSONArray(d.them.map { it.json() })).put("bo", JSONArray(d.bo))

fun dauJson(m: Map<String, String>): String = JSONObject(m as Map<*, *>).toString()
fun docDauJson(s: String?): Map<String, String> = try {
    if (s.isNullOrBlank()) emptyMap() else JSONObject(s).let { o -> o.keys().asSequence().associateWith { o.optString(it) } }
} catch (_: Exception) { emptyMap() }

/** Tín hiệu `danhSachApp` ở GỐC phản hồi nhịp. null = máy chủ cũ (vắng trường). */
data class TinHieuDanhSach(val bam: String?, val yeuCau: String?)

fun docTinHieuDanhSach(phanHoi: String?): TinHieuDanhSach? = try {
    phanHoi?.let { JSONObject(it).optJSONObject("danhSachApp") }?.let { o ->
        fun c(k: String) = if (o.has(k) && !o.isNull(k)) o.optString(k).ifBlank { null } else null
        TinHieuDanhSach(c("bam"), c("yeuCau"))
    }
} catch (_: Exception) { null }

/**
 * Trạng thái agent đã lưu (Kho). `iconDaGui` = khoa → iconBam máy chủ đã có icon; `thieuIcon` = khoa máy chủ báo thiếu icon
 * (phản hồi 200 `thieuIcon`) ⇒ lượt sau gửi `them` kèm icon.
 */
data class DaGui(
    val bam: String?, val dau: Map<String, String>, val yeuCauDaXuLy: String?,
    val iconDaGui: Map<String, String> = emptyMap(), val thieuIcon: Set<String> = emptySet(),
)

/** Giữ `icon` chỉ cho app mới / icon đổi (iconBam khác bản máy chủ đã có) / máy chủ báo thiếu; còn lại bỏ `icon`, giữ `iconBam`. */
fun chonIcon(ds: List<AppMay>, iconDaGui: Map<String, String>, thieuIcon: Set<String>): List<AppMay> =
    ds.map { if (it.icon != null && (it.khoa in thieuIcon || iconDaGui[it.khoa] != it.iconBam)) it else it.copy(icon = null) }

/** Sau khi gửi được: khoa → iconBam máy chủ có icon (vừa gửi icon, hoặc trước đó đã có cùng iconBam), trừ khoa máy chủ báo thiếu. */
fun iconSauGui(ds: List<AppMay>, daGuiIcon: Set<String>, truoc: Map<String, String>, thieuIcon: Set<String>): Map<String, String> =
    ds.filter { it.iconBam != null && it.khoa !in thieuIcon && (it.khoa in daGuiIcon || truoc[it.khoa] == it.iconBam) }.associate { it.khoa to it.iconBam!! }

/** `thieuIcon: [khoa…]` trong phản hồi 200 của /ung-dung (vắng ⇒ rỗng). */
fun docThieuIcon(o: JSONObject?): Set<String> = o?.optJSONArray("thieuIcon")?.let { a ->
    (0 until a.length()).mapNotNull { a.optString(it).ifBlank { null } }.toSet()
} ?: emptySet()

fun dsJson(s: Collection<String>): String = JSONArray(s.sorted()).toString()
fun docDsJson(s: String?): Set<String> = try {
    if (s.isNullOrBlank()) emptySet() else JSONArray(s).let { a -> (0 until a.length()).mapNotNull { a.optString(it).ifBlank { null } }.toSet() }
} catch (_: Exception) { emptySet() }

const val CHU_KY_QUET_MS = 30 * 60_000L
/** Lệch bam với máy chủ (không phải yêu cầu «Làm mới») ⇒ quét lại nhưng không dày hơn mức này. */
const val GIAN_CACH_LECH_MS = 5 * 60_000L
/** Gói vừa cài / gỡ ⇒ đợi một chút cho PackageManager ổn định rồi quét. */
const val CHO_SU_KIEN_GOI_MS = 10_000L

/** Yêu cầu «Làm mới» của Ba Mẹ chưa xử lý. */
fun coYeuCauMoi(t: TinHieuDanhSach?, g: DaGui): Boolean = t?.yeuCau != null && t.yeuCau != g.yeuCauDaXuLy

/** Lần gửi lỗi liên tiếp thứ `n` (≥ 1) ⇒ chờ 1, 2, 4… phút, tối đa 30 phút, rồi mới quét + gửi lại. */
fun choSauLoi(n: Int): Long = if (n <= 0) 0 else minOf(60_000L shl minOf(n - 1, 5), CHU_KY_QUET_MS)

/**
 * Có nên quét PackageManager bây giờ không. `suKienGoiLuc` = lúc nhận PACKAGE_ADDED/REMOVED/REPLACED gần nhất chưa gửi được (0 = không có).
 * `soLanLoi` = số lần quét + gửi lỗi liên tiếp (lùi dần, kể cả khi đang có yêu cầu «Làm mới»).
 */
fun nenQuet(t: TinHieuDanhSach?, g: DaGui, lanQuetCuoi: Long, suKienGoiLuc: Long, now: Long, soLanLoi: Int = 0): Boolean = when {
    lanQuetCuoi == 0L -> true                                                         // dịch vụ vừa khởi động
    soLanLoi > 0 && now - lanQuetCuoi < choSauLoi(soLanLoi) -> false
    coYeuCauMoi(t, g) -> true
    g.bam == null -> true
    g.thieuIcon.isNotEmpty() -> true                                                  // máy chủ báo thiếu icon ⇒ gửi bù ngay                                                             // chưa gửi được lần nào (vừa ghép / lần trước lỗi)
    suKienGoiLuc > 0 && now - suKienGoiLuc >= CHO_SU_KIEN_GOI_MS -> true
    now - lanQuetCuoi >= CHU_KY_QUET_MS -> true
    t != null && t.bam != g.bam && now - lanQuetCuoi >= GIAN_CACH_LECH_MS -> true     // máy chủ giữ bam khác (hoặc null)
    else -> false
}

sealed class CachGui {
    object KhongGui : CachGui()
    object Du : CachGui()
    data class Doi(val bamTruoc: String, val phan: PhanDoi) : CachGui()
}

/** Sau khi quét xong: gửi gì. `bamNay` = bam của danh sách vừa quét. */
fun cachGui(t: TinHieuDanhSach?, g: DaGui, ds: List<AppMay>, bamNay: String): CachGui {
    // Đủ: yêu cầu «Làm mới» mới; chưa gửi được lần nào; máy chủ không có danh sách; máy chủ giữ bản lạ (phần đổi sẽ 409).
    if (coYeuCauMoi(t, g) || g.bam == null || g.dau.isEmpty() || (t != null && (t.bam == null || (t.bam != g.bam && t.bam != bamNay)))) return CachGui.Du
    // Bản máy chủ đang giữ: bamNay (đã khớp bản vừa quét) hoặc bam lần gửi trước.
    val coSo = if (t?.bam == bamNay || bamNay == g.bam) bamNay else g.bam
    val d = if (coSo == bamNay) PhanDoi(emptyList(), emptyList()) else tinhPhanDoi(g.dau, ds)
    // App máy chủ báo thiếu icon ⇒ thêm vào `them` (kèm icon) dù không đổi gì.
    val khoaThem = d.them.map { it.khoa }.toSet()
    val bu = ds.filter { it.khoa in g.thieuIcon && it.icon != null && it.khoa !in khoaThem }
    val phan = PhanDoi(d.them + bu, d.bo)
    return if (phan.rong) CachGui.KhongGui else CachGui.Doi(coSo, phan)
}
