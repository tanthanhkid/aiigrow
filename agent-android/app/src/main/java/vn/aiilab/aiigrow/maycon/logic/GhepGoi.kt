package vn.aiilab.aiigrow.maycon.logic

// #707: ghép bằng token gói cài (QR Device Owner ⇒ POST /api/device/ghep-goi) — thử lại có lùi dần, lỗi vĩnh viễn thì bỏ gói.
// Trước đây vòng 5 giây gọi lại mãi khi máy chủ trả 409 «Gói cài này đã dùng rồi» và mỗi lần ghi một dòng nhật ký.

/** Lỗi ghép gói cài là vĩnh viễn (gói sai 404, đã dùng / sai loại máy 409, hết hạn 410, thân sai 400…) — thử lại cũng vậy.
 *  `http` null = lỗi đường truyền; 5xx / 408 / 429 = tạm (như `boViecCho`). */
fun loiGhepGoiVinhVien(http: Int?): Boolean = http != null && boViecCho(http)

/** Chờ trước lần thử kế sau `lanLoi` lỗi tạm liên tiếp: 5, 10, 20, 40, 80, 160 giây rồi mỗi 5 phút. */
fun choGhepGoiMs(lanLoi: Int): Long = if (lanLoi <= 0) 0 else minOf(GHEP_GOI_TOI_DA_MS, 5_000L shl minOf(lanLoi - 1, 10))

const val GHEP_GOI_TOI_DA_MS = 5 * 60_000L

/** Trạng thái thử ghép bằng gói cài (trong bộ nhớ dịch vụ — tiến trình khởi động lại thì thử ngay). */
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
    @get:Synchronized val dangGoi: Boolean get() = dang
}
