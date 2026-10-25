package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject

// Phía «làm việc để có điểm» của app Con (thuần): tin mới (GET hoc-vien/tin — server/lib/hoc-vien.ts › tinCho), tổng quan
// (hoc-vien/tong-quan), trạng thái lời xin (GET yeu-cau/:id), chơi bằng điểm (phien/xet · phien/mo · phien/nhip — server/lib/phien.ts).

data class Tin(val id: String, val loai: String, val tieu: String, val noi: String, val luc: String)

/** → (tin, mốc `bay` để hỏi lần sau). */
fun docTin(o: JSONObject): Pair<List<Tin>, String?> {
    val a = o.optJSONArray("ds") ?: JSONArray()
    val ds = (0 until a.length()).mapNotNull { i ->
        a.optJSONObject(i)?.let { Tin(it.optString("id"), it.optString("loai"), it.optString("tieu"), it.optString("noi"), it.optString("luc")) }
    }.filter { it.id.isNotBlank() }
    return ds to o.optString("bay").ifBlank { null }
}

/**
 * Tin chưa báo. `daThay` = id đã thấy (máy chủ lùi 5 phút nên tin lặp lại). Lần hỏi đầu (`lanDau`) chỉ ghi nhận, không báo
 * (như khay Windows: không bật bóng báo cho tin 7 ngày cũ). Trả (tin phải báo, tập id đã thấy mới — giữ ≤ 200).
 */
fun locTinMoi(ds: List<Tin>, daThay: List<String>, lanDau: Boolean): Pair<List<Tin>, List<String>> {
    val cu = daThay.toSet()
    val moi = ds.filter { it.id !in cu }
    return (if (lanDau) emptyList() else moi) to (daThay + moi.map { it.id }).takeLast(200)
}

/** Tin nhiệm vụ (mới / cần bổ sung) mở thẳng màn Nhiệm vụ; còn lại mở Nhà. */
fun duongChoTin(t: Tin): String = if (t.loai in setOf("giao_nhiem_vu", "nhiem_vu_moi", "can_bo_sung", "tu_choi_nhiem_vu")) "nhiem-vu" else "nha"

// ---------------------------------------------------------------- lời xin
enum class TrangThaiXin { CHO, DUOC, TU_CHOI, HET_HAN }

/** GET yeu-cau/:id ⇒ { status: cho|duoc|tu_choi, trangThai: cho|dong_y|tu_choi|het_han|huy|da_thuc_thi }. */
fun docTrangThaiXin(o: JSONObject): TrangThaiXin = when (o.optString("trangThai").ifBlank { o.optString("status") }) {
    "cho" -> TrangThaiXin.CHO
    "dong_y", "da_thuc_thi", "duoc", "tu_duyet" -> TrangThaiXin.DUOC
    "het_han", "huy" -> TrangThaiXin.HET_HAN
    else -> TrangThaiXin.TU_CHOI
}

fun cauXin(t: TrangThaiXin, phut: Int): String = when (t) {
    TrangThaiXin.CHO -> "Đang chờ Ba Mẹ trả lời lời xin $phut phút…"
    TrangThaiXin.DUOC -> "Ba Mẹ đã đồng ý cho thêm $phut phút!"
    TrangThaiXin.TU_CHOI -> "Ba Mẹ chưa đồng ý lần này."
    TrangThaiXin.HET_HAN -> "Lời xin đã hết hạn hoặc bị huỷ. Con gửi lại nhé."
}

/** Hỏi lại lời xin đang chờ tối đa 24 giờ sau khi gửi. */
const val HOI_XIN_TOI_DA_MS = 24 * 3600_000L

// ---------------------------------------------------------------- chơi bằng điểm
/** App giải trí có trên máy để đổi điểm (giữ `muc` đúng như chính sách — máy chủ phân loại theo chuỗi đó). */
fun appChoiDiem(cs: ChinhSach, daCai: Collection<String>): List<String> {
    val cai = daCai.map { it.lowercase() }.toSet()
    return goiAndroid(cs.giaiTri).filter { it.lowercase() in cai }.sorted()
}

data class KetXet(val duoc: Boolean, val phutToiDa: Int, val soDu: Int, val cau: String)

/** POST phien/xet ⇒ { duoc, phutToiDa, soDu, cau }. */
fun docXet(o: JSONObject): KetXet = KetXet(o.optBoolean("duoc"), o.optInt("phutToiDa"), o.optInt("soDu"),
    o.optString("cau").takeIf { it.isNotBlank() && it != "null" } ?: if (o.optBoolean("duoc")) "" else "Chưa đổi được lúc này.")

fun cauXetDuoc(x: KetXet, tenApp: String): String = "Đổi điểm để chơi $tenApp tối đa ${x.phutToiDa} phút (con có ${x.soDu} điểm). Điểm trừ theo phút chơi thật."

/** Phiên điểm đang do máy này mở: kết thúc (máy chủ báo ket_thuc / không thấy) ⇒ thôi nhịp. */
fun phienKetThuc(o: JSONObject): Boolean = o.optString("trangThai") == "ket_thuc"

/** Đang «dùng» phiên điểm: app tiền cảnh là app giải trí (đổi điểm cho phép mọi app giải trí như máy chủ mở khoá cả nhóm). */
fun dangDungPhien(tienCanh: String?, giaiTri: Set<String>): Boolean =
    tienCanh != null && giaiTri.any { it.equals(tienCanh, ignoreCase = true) }

/** App đang ở tiền cảnh theo chuỗi sự kiện (MO cuối chưa bị DONG / TAT_MAN). */
fun appTienCanh(ds: List<SuKienDung>): String? {
    var dang: String? = null
    for (e in ds.sortedBy { it.luc }) when (e.loai) {
        LoaiSuKien.MO -> dang = e.goi
        LoaiSuKien.DONG -> if (dang == e.goi) dang = null
        LoaiSuKien.TAT_MAN -> dang = null
    }
    return dang
}

// ---------------------------------------------------------------- mở app Con
/** Đường màn Con hợp lệ (mobile/src/app/tre/…) — chặn chuỗi lạ đi vào URL. */
val DUONG_TRE = setOf("nha", "nhiem-vu", "cua-hang", "choi", "vi-qua", "huy-hieu", "quy-tac", "yeu-cau")
fun duongTre(d: String?): String = d?.takeIf { it in DUONG_TRE || Regex("^nv/[A-Za-z0-9_-]{1,64}$").matches(it) } ?: "nha"

/** Chỉ cho WebView đi trong đúng máy chủ đã ghép (không thành trình duyệt vượt lọc web). */
fun cungMayChu(url: String, goc: String): Boolean = try {
    val a = java.net.URI(url); val b = java.net.URI(goc.trimEnd('/'))
    a.scheme.equals(b.scheme, true) && a.host.equals(b.host, true) && (if (a.port == -1) a.toURL().defaultPort else a.port) == (if (b.port == -1) b.toURL().defaultPort else b.port)
} catch (_: Exception) { false }
