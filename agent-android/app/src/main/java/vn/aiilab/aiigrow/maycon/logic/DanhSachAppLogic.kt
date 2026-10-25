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
    /** PNG base64 (không tiền tố data:). Không vào bam — nén PNG không bảo đảm tất định giữa các lần quét. */
    val icon: String? = null,
) {
    fun json(): JSONObject = JSONObject().put("khoa", khoa).put("muc", muc).put("ten", ten).put("nguon", nguon).apply {
        nhaPhatHanh?.let { put("nhaPhatHanh", it) }
        phienBan?.let { put("phienBan", it) }
        icon?.let { put("icon", it) }
    }

    /** Dấu riêng của app: đổi khi tên / phiên bản / nhà phát hành đổi ⇒ vào `them` của lần gửi phần đổi. */
    val dau: String get() = sha256Hex(listOf(khoa, muc, ten, nguon, nhaPhatHanh ?: "", phienBan ?: "").joinToString("\u0001"))
}

const val TOI_DA_APP = 1500
const val TOI_DA_CHU = 300
/** Icon base64 lớn hơn mức này máy chủ bỏ — agent bỏ luôn cho nhẹ đường truyền. */
const val TOI_DA_ICON_B64 = 16 * 1024

fun sha256Hex(s: String): String =
    MessageDigest.getInstance("SHA-256").digest(s.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

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
                icon = a.icon?.takeIf { it.isNotEmpty() && it.length <= TOI_DA_ICON_B64 },
            )
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

/** Trạng thái agent đã lưu (Kho). */
data class DaGui(val bam: String?, val dau: Map<String, String>, val yeuCauDaXuLy: String?)

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
    g.bam == null -> true                                                             // chưa gửi được lần nào (vừa ghép / lần trước lỗi)
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
    // Thôi: máy chủ đã khớp bản vừa quét, hoặc không đổi so với lần gửi trước.
    if (t?.bam == bamNay || bamNay == g.bam) return CachGui.KhongGui
    val d = tinhPhanDoi(g.dau, ds)
    return if (d.rong) CachGui.KhongGui else CachGui.Doi(g.bam, d)
}
