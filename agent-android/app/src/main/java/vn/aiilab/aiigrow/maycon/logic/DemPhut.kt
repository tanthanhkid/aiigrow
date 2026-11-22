package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject

// Đếm thời gian tiền cảnh theo app từ chuỗi sự kiện UsageStatsManager (đã đổi sang kiểu thuần ở tầng Android).

enum class LoaiSuKien { MO, DONG, TAT_MAN }

data class SuKienDung(val goi: String, val loai: LoaiSuKien, val luc: Long)

/**
 * Mili giây tiền cảnh theo gói trong [tu, den). App đang mở lúc `den` tính tới `den`; DONG không có MO trước (app mở từ trước `tu`)
 * tính từ `tu`. Tắt màn hình đóng mọi app đang mở. Một lúc chỉ một app tiền cảnh: MO app mới đóng app cũ.
 */
fun demTienCanh(ds: List<SuKienDung>, tu: Long, den: Long): Map<String, Long> {
    val kq = HashMap<String, Long>()
    var dangMo: String? = null
    var moLuc = tu
    var daThayGi = false
    fun cong(goi: String, a: Long, b: Long) {
        val x = maxOf(a, tu); val y = minOf(b, den)
        if (y > x) kq[goi] = (kq[goi] ?: 0L) + (y - x)
    }
    for (e in ds.sortedBy { it.luc }) {
        if (e.luc >= den) break
        when (e.loai) {
            LoaiSuKien.MO -> {
                dangMo?.let { cong(it, moLuc, e.luc) }
                dangMo = e.goi; moLuc = e.luc
            }
            LoaiSuKien.DONG -> {
                if (dangMo == e.goi) { cong(e.goi, moLuc, e.luc); dangMo = null }
                else if (dangMo == null && !daThayGi) cong(e.goi, tu, e.luc)
            }
            LoaiSuKien.TAT_MAN -> { dangMo?.let { cong(it, moLuc, e.luc) }; dangMo = null }
        }
        daThayGi = true
    }
    dangMo?.let { cong(it, moLuc, den) }
    return kq
}

/** Tổng phút (làm tròn xuống) của các gói giải trí. */
fun phutGiaiTri(msTheoGoi: Map<String, Long>, giaiTri: Set<String>): Int =
    giaiTri.map { it.lowercase() }.toSet().let { gt -> (msTheoGoi.filterKeys { it.lowercase() in gt }.values.sum() / 60_000L).toInt() }

// ---------------------------------------------------------------- yêu cầu gửi máy chủ

/** Mã ghép: đúng 6 chữ số (bỏ khoảng trắng, gạch). */
fun chuanMaGhep(s: String): String? = s.filter { it.isDigit() }.takeIf { it.length == 6 && s.none { c -> c.isLetter() } }

fun thanGhep(ma: String, tenMay: String): JSONObject =
    JSONObject().put("ma", ma).put("nen", "android").put("tenMay", tenMay.take(80))

fun thanGhepToken(token: String, tenMay: String): JSONObject =
    JSONObject().put("token", token).put("nen", "android").put("tenMay", tenMay.take(80))

/** Thân nhịp (NhipVao — server/lib/tuan-thu.ts) + phút dùng hôm nay theo app (máy chủ là sổ sách — CAN-SERVER.md). */
fun thanNhip(
    clientTime: String, phienBan: String, khoa: Boolean, deviceOwner: Boolean, deviceAdmin: Boolean,
    troNang: Boolean, usage: Boolean, matKetNoiPhut: Int, phutTheoGoi: Map<String, Int>, nguon: String = "bat",
): JSONObject = JSONObject()
    .put("phienBan", phienBan).put("clientTime", clientTime).put("trangThaiKhoa", khoa)
    .put("appQuanLyBat", deviceOwner || (deviceAdmin && troNang))
    .put("thanhPhan", JSONObject().put("dichVu", true).put("quyenQuanLy", deviceOwner || deviceAdmin)
        .put("deviceOwner", deviceOwner).put("troNang", troNang).put("usageStats", usage))
    .put("matKetNoiPhut", matKetNoiPhut).put("nguon", nguon)
    .put("phutDungHomNay", JSONObject(phutTheoGoi.filterValues { it > 0 }))

/**
 * Bộ đếm tiền cảnh GIA TĂNG trong một ngày: chỉ nhận sự kiện mới (từ mốc lần đọc trước), giữ trạng thái app đang mở + tổng đã đóng.
 * Kết quả bằng `demTienCanh` chạy trên toàn bộ sự kiện từ đầu ngày. Không dùng đồng hồ thật: mọi mốc giờ do người gọi truyền.
 */
class BoDemGiaTang {
    private var dau = Long.MIN_VALUE
    private var mocDoc = 0L          // sự kiện kế tiếp cần đọc từ mốc này (ms)
    private var dangMo: String? = null
    private var moLuc = 0L
    private var daThayGi = false
    private val daDong = HashMap<String, Long>()

    /** Lần truy vấn tới sẽ đọc từ mốc nào (để test / log). */
    fun mocTiepTheo() = mocDoc

    /**
     * `truyVan(tu, den)` trả sự kiện trong [tu, den). Sang ngày mới (dau đổi) hoặc đồng hồ lùi ⇒ đếm lại từ đầu ngày.
     * Trả ms tiền cảnh theo gói từ `dau` tới `now`.
     */
    @Synchronized
    fun capNhat(dau: Long, now: Long, truyVan: (Long, Long) -> List<SuKienDung>): Map<String, Long> {
        if (dau != this.dau || now < mocDoc) {
            this.dau = dau; mocDoc = dau; dangMo = null; moLuc = dau; daThayGi = false; daDong.clear()
        }
        fun cong(goi: String, a: Long, b: Long) {
            val x = maxOf(a, dau); val y = minOf(b, now)
            if (y > x) daDong[goi] = (daDong[goi] ?: 0L) + (y - x)
        }
        val moi = truyVan(mocDoc, now).filter { it.luc >= mocDoc && it.luc < now }.sortedBy { it.luc }
        for (e in moi) {
            when (e.loai) {
                LoaiSuKien.MO -> { dangMo?.let { cong(it, moLuc, e.luc) }; dangMo = e.goi; moLuc = e.luc }
                LoaiSuKien.DONG -> {
                    if (dangMo == e.goi) { cong(e.goi, moLuc, e.luc); dangMo = null }
                    else if (dangMo == null && !daThayGi) cong(e.goi, dau, e.luc)
                }
                LoaiSuKien.TAT_MAN -> { dangMo?.let { cong(it, moLuc, e.luc) }; dangMo = null }
            }
            daThayGi = true
        }
        if (moi.isNotEmpty()) mocDoc = moi.last().luc + 1 else if (now > mocDoc) mocDoc = maxOf(mocDoc, now)
        val kq = HashMap(daDong)
        dangMo?.let { g -> val x = maxOf(moLuc, dau); if (now > x) kq[g] = (kq[g] ?: 0L) + (now - x) }
        return kq
    }
}

/** Cache danh sách có hạn: đọc lại khi hết hạn (ttlMs) hoặc bị `huy()`. Mốc giờ do người gọi truyền. */
class CacheCoHan<T>(private val ttlMs: Long) {
    private var giaTri: T? = null
    private var luc = 0L
    @Synchronized fun lay(now: Long, doc: () -> T): T {
        val g = giaTri
        if (g != null && now >= luc && now - luc < ttlMs) return g
        return doc().also { giaTri = it; luc = now }
    }
    @Synchronized fun huy() { giaTri = null }
}
