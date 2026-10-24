package vn.aiilab.aiigrow.con.logic

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
    (msTheoGoi.filterKeys { it in giaiTri }.values.sum() / 60_000L).toInt()

// ---------------------------------------------------------------- yêu cầu gửi máy chủ

/** Mã ghép: đúng 6 chữ số (bỏ khoảng trắng, gạch). */
fun chuanMaGhep(s: String): String? = s.filter { it.isDigit() }.takeIf { it.length == 6 && s.none { c -> c.isLetter() } }

fun thanGhep(ma: String, tenMay: String): JSONObject =
    JSONObject().put("ma", ma).put("nen", "android").put("tenMay", tenMay.take(80))

fun thanGhepToken(token: String, tenMay: String): JSONObject =
    JSONObject().put("token", token).put("nen", "android").put("tenMay", tenMay.take(80))

val PHUT_XIN = listOf(30, 60, 120)

/** Lời xin thêm giờ (POST /api/device/yeu-cau). Máy chủ bắt buộc lyDo ⇒ trống thì dùng câu mặc định. */
fun thanXinThemGio(phut: Int, loiNhan: String): JSONObject {
    require(phut in PHUT_XIN) { "phut phải là 30, 60 hoặc 120" }
    val ly = loiNhan.trim().take(100).ifEmpty { "Con xin thêm $phut phút" }
    return JSONObject().put("loai", "them_gio").put("phut", phut).put("lyDo", ly)
}

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
