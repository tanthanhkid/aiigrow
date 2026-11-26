package vn.aiilab.aiigrow.maycon.logic

// #707: ghép bằng token gói cài (QR Device Owner ⇒ POST /api/device/ghep-goi) — thử lại có lùi dần, lỗi vĩnh viễn thì bỏ gói.
// Trước đây vòng 5 giây gọi lại mãi khi máy chủ trả 409 «Gói cài này đã dùng rồi» và mỗi lần ghi một dòng nhật ký.

/** Lỗi ghép gói cài là vĩnh viễn — CHỈ khi chính máy chủ AiiGrow trả mã lỗi nghiệp vụ của gói (server/lib/lenh-may.ts › doiGoiCai: gói sai,
 *  đã dùng, hết hạn, sai loại máy). 4xx không mã (tường lửa / proxy / Cloudflare 403, 404 lúc đang triển khai), 5xx, 408, 429 = tạm. */
fun loiGhepGoiVinhVien(http: Int, ma: String): Boolean = http in 400..499 && ma in MA_GOI_HONG

private val MA_GOI_HONG = setOf("ma_sai", "ma_da_dung", "ma_het_han", "sai_nen_tang")

/** Chờ trước lần thử kế sau `lanLoi` lỗi tạm liên tiếp: 5, 10, 20, 40, 80, 160 giây rồi mỗi 5 phút. */
fun choGhepGoiMs(lanLoi: Int): Long = if (lanLoi <= 0) 0 else minOf(GHEP_GOI_TOI_DA_MS, 5_000L shl minOf(lanLoi - 1, 10))

const val GHEP_GOI_TOI_DA_MS = 5 * 60_000L

/** Trạng thái thử ghép bằng gói cài (trong bộ nhớ tiến trình — khởi động lại thì thử ngay). Mốc theo đồng hồ đơn điệu (elapsedRealtime):
 *  đồng hồ máy chỉnh lùi không làm kẹt lượt thử. `now` = lúc lần thử vừa LỖI (sau khi lời gọi trả về), không phải lúc bắt đầu gọi. */
data class ThuGhepGoi(val lanLoi: Int = 0, val thuLaiLuc: Long = 0) {
    fun nenThu(now: Long): Boolean = now >= thuLaiLuc
    fun sauLoiTam(now: Long): ThuGhepGoi = (lanLoi + 1).let { ThuGhepGoi(it, now + choGhepGoiMs(it)) }
    /** Ghi nhật ký lần lỗi đầu rồi mỗi 10 lần — tệp nhật ký chờ gửi (1000 dòng) không bị một câu lặp đẩy mất dòng khác. */
    val nenGhiNhatKy: Boolean get() = lanLoi == 1 || lanLoi % 10 == 0
}

/**
 * #708: cửa một-lượt cho việc gọi máy chủ của vòng nhịp (ghép gói, nhịp, việc chờ, DNS) — chạy trên luồng mạng riêng, vòng áp luật 5 giây
 * không chờ mạng treo. Đang có lượt ⇒ không mở lượt thứ hai; lượt ép (Ba Mẹ vừa đổi gì) tới lúc đó thì nhớ lại để gọi tiếp ngay khi xong.
 */
class CuaGoi {
    private var dang = false
    private var lai = false
    /** true = được mở lượt mới. */
    @Synchronized fun xin(ep: Boolean): Boolean {
        if (dang) { if (ep) lai = true; return false }
        dang = true; lai = false; return true
    }
    /** Đóng lượt; true = có lượt ép bị gác trong lúc chạy ⇒ gọi lại ngay. */
    @Synchronized fun xong(): Boolean { dang = false; return lai.also { lai = false } }
}

// ---------------------------------------------------------------- #685 ghép lại được khi phản hồi mất
/** Mã máy như máy chủ nhận (server/lib/gia-dinh.ts › maMayHopLe): 16–64 ký tự hex, chữ thường. Sai ⇒ null (không gửi). */
fun maMayHopLe(s: String?): String? = s?.trim()?.lowercase()?.takeIf { Regex("^[0-9a-f]{16,64}$").matches(it) }

/** Mã máy mới từ 16 byte ngẫu nhiên (32 hex) — sinh một lần, lưu trong Kho; không lấy từ định danh phần cứng. */
fun taoMaMay(ngauNhien: ByteArray): String = ngauNhien.joinToString("") { "%02x".format(it) }

/** Ghép bằng mã 6 số lỗi ĐƯỜNG TRUYỀN (không phải câu máy chủ): chờ trước lần thử lại thứ `lan` (1, 2) rồi thôi. Có maMay mới thử lại —
 *  không có thì lần thử lại gặp 409 «mã đã dùng» nếu lần trước thật ra đã ghép xong. */
fun choThuLaiGhepMs(lan: Int, coMaMay: Boolean): Long? = if (!coMaMay) null else when (lan) { 1 -> 1_500L; 2 -> 4_000L; else -> null }
