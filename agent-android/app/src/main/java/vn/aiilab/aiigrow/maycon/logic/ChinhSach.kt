package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

// Logic thuần (không import android.*) — chạy unit test trên JVM.
// Hình dạng theo phản hồi POST /api/device/nhip (server/lib/nhip-may.ts): { serverTime, tuanThu, chinhSach, nenTang, lenh }.
// `chinhSach` = ChinhSachChung (server/lib/chinh-sach.ts). Agent chỉ đọc phần cần để thực thi; mọi quyết định điểm / phê duyệt ở máy chủ.

data class Khung(val tu: String, val den: String) {
    val tuPhut get() = phutCua(tu)
    val denPhut get() = phutCua(den)
}

fun phutCua(hhmm: String): Int {
    val p = hhmm.trim().split(":")
    val h = p.getOrNull(0)?.toIntOrNull() ?: 0
    val m = p.getOrNull(1)?.toIntOrNull() ?: 0
    return (h.coerceIn(0, 24) * 60 + m.coerceIn(0, 59)).coerceIn(0, 1440)
}

data class MucChung(val muc: String, val kieu: String)
data class MucTamThoi(val muc: String, val loai: String, val het: Instant?)
data class Phien(val id: String, val muc: String, val conPhut: Int)
data class Lenh(val id: String, val loai: String)

/** 15/11 (#263/#264 — docs/API.md «Sổ sao 15/11»): sổ sao của bé đang dùng máy. `sao` = số dư Con thấy (ÂM khi nợ Ba Mẹ),
 *  `phutCon` = sao tiêu được = phút «Tính phút» còn chơi (1 sao = 1 phút), `hetSao` ⇒ khoá nhóm «Tính phút». */
data class Sao(
    val sao: Int, val no: Int, val phutCon: Int, val hetSao: Boolean = phutCon <= 0,
    /** 16/11 #302: sao thật tiêu được (phutCon đã kẹp theo giới hạn giờ chơi); null = máy chủ cũ ⇒ coi như phutCon. */
    val saoTieuDuoc: Int? = null,
)

/** 16/11 #302 mục 4 «Giờ chơi» (`gioiHan` trong Policy): tối đa mỗi ngày + mỗi lượt rồi nghỉ. null = máy chủ cũ ⇒ không đổi gì. */
data class GioiHan(
    val apDung: Boolean, val conNgay: Int?, val lyDoKhoa: String?, val nghiDen: Instant?, val nghiDenGio: String?, val cau: String?,
)

const val KHOA_HET_NGAY = "het_gio_ngay"
const val KHOA_DANG_NGHI = "dang_nghi"

data class ChinhSach(
    val tz: String = "Asia/Ho_Chi_Minh",
    val tenCon: String? = null,
    val ngayThuong: List<Khung> = emptyList(),
    val cuoiTuan: List<Khung> = emptyList(),
    val ngu: Khung? = null,
    val tranNgayPhut: Int = 0,
    val heThong: List<String> = emptyList(),
    val hoc: List<MucChung> = emptyList(),
    val giaiTri: List<MucChung> = emptyList(),
    val chan: List<MucChung> = emptyList(),
    val khoaNgay: Boolean = false,
    val phutThemHomNay: Int = 0,
    val mucTamThoi: List<MucTamThoi> = emptyList(),
    val moKhanCapDen: Instant? = null,
    val giaiTriDuocMo: Boolean = true,
    val lyDo: List<String> = emptyList(),
    val phien: Phien? = null,
    val cauTuanThuCon: List<String> = emptyList(),
    /** Chế độ «Mở hết»: app chưa xếp được dùng (ungDung.chuaXep = cho_phep). Mặc định «Theo danh sách» ⇒ app ngoài danh sách tạm dừng + Con xin Ba Mẹ mở. */
    val chuaXepChoPhep: Boolean = false,
    // ---- 15/11 (máy chủ cũ không gửi ⇒ null ⇒ chạy luật quỹ / luật cũ)
    /** Sổ sao (`chinhSach.sao`); null = máy chủ cũ hoặc máy dùng chung chưa chọn bé. */
    val sao: Sao? = null,
    /** Giới hạn giờ chơi (`chinhSach.gioiHan`); null = máy chủ cũ. */
    val gioiHan: GioiHan? = null,
    /** #262 `ungDung.cheDo`: `theo_danh_sach` | `mo_het`; null = máy chủ trước App & web 15/11 (khi đó «mo_het» cũ vẫn tính phút). */
    val cheDo: String? = null,
) {
    /** «Mở hết» kiểu 15/11: không chặn gì, không tính phút. Chỉ khi máy chủ gửi `cheDo` (máy chủ cũ: Mở hết vẫn đếm phút giải trí). */
    val moHet: Boolean get() = cheDo == "mo_het"
}

/** Phản hồi nhịp đã đọc. `grantEndsAt`: hạn «thêm giờ được duyệt» — xem CAN-SERVER.md (nhịp Android chưa trả trường này). */
data class PhanHoiNhip(
    val serverTime: Instant?,
    val chinhSach: ChinhSach,
    val lenh: List<Lenh>,
    val grantEndsAt: Instant?,
    val privateDns: String?,
    /** Bí mật mã mở offline (nhịp Android — server/lib/nhip-may.ts); null = máy chủ chưa gửi. */
    val maOfflineBiMat: String? = null,
)

private fun JSONObject.chuoi(k: String): String? = if (has(k) && !isNull(k)) optString(k) else null
private fun thoiDiem(s: String?): Instant? = try { if (s.isNullOrBlank()) null else Instant.parse(s) } catch (_: Exception) { null }

private fun JSONArray?.khung(): List<Khung> = buildList {
    if (this@khung == null) return@buildList
    for (i in 0 until this@khung.length()) {
        val o = this@khung.optJSONObject(i) ?: continue
        add(Khung(o.optString("tu", "00:00"), o.optString("den", "00:00")))
    }
}

private fun JSONArray?.muc(): List<MucChung> = buildList {
    if (this@muc == null) return@buildList
    for (i in 0 until this@muc.length()) {
        val o = this@muc.optJSONObject(i) ?: continue
        val m = o.optString("muc").trim()
        if (m.isNotEmpty()) add(MucChung(m, o.optString("kieu", "app")))
    }
}

private fun JSONArray?.chuoiDs(): List<String> = buildList {
    if (this@chuoiDs == null) return@buildList
    for (i in 0 until this@chuoiDs.length()) this@chuoiDs.optString(i).takeIf { it.isNotBlank() }?.let(::add)
}

fun docChinhSach(o: JSONObject): ChinhSach {
    val g = o.optJSONObject("gioChoi") ?: JSONObject()
    val u = o.optJSONObject("ungDung") ?: JSONObject()
    val nl = o.optJSONObject("ngoaiLe") ?: JSONObject()
    val hl = o.optJSONObject("hieuLuc") ?: JSONObject()
    val ngu = g.optJSONObject("ngu")?.let { Khung(it.optString("tu", "00:00"), it.optString("den", "00:00")) }
    val tamThoi = buildList {
        val a = nl.optJSONArray("mucTamThoi") ?: JSONArray()
        for (i in 0 until a.length()) {
            val x = a.optJSONObject(i) ?: continue
            add(MucTamThoi(x.optString("muc"), x.optString("loai"), thoiDiem(x.chuoi("het"))))
        }
    }
    val ph = o.optJSONObject("phienDiem")?.optJSONObject("phien")
    val tt = o.optJSONObject("tuanThu")
    val cauCon = buildList {
        val a = tt?.optJSONArray("vanDe") ?: JSONArray()
        for (i in 0 until a.length()) a.optJSONObject(i)?.optString("cauCon")?.takeIf { it.isNotBlank() }?.let(::add)
    }
    return ChinhSach(
        tz = o.optString("tz", "Asia/Ho_Chi_Minh").ifBlank { "Asia/Ho_Chi_Minh" },
        tenCon = o.optJSONObject("con")?.chuoi("ten"),
        ngayThuong = g.optJSONArray("ngayThuong").khung(),
        cuoiTuan = g.optJSONArray("cuoiTuan").khung(),
        ngu = ngu,
        tranNgayPhut = g.optInt("tranNgayPhut", 0),
        heThong = u.optJSONArray("heThong").chuoiDs(),
        hoc = u.optJSONArray("hoc").muc(),
        giaiTri = u.optJSONArray("giaiTri").muc(),
        chan = u.optJSONArray("chan").muc(),
        khoaNgay = o.optBoolean("khoaNgay", false),
        phutThemHomNay = nl.optInt("phutThemHomNay", 0),
        mucTamThoi = tamThoi,
        moKhanCapDen = thoiDiem(nl.chuoi("moKhanCapDen")),
        giaiTriDuocMo = hl.optBoolean("giaiTriDuocMo", true),
        lyDo = hl.optJSONArray("lyDo").chuoiDs(),
        phien = ph?.let { Phien(it.optString("id"), it.optString("muc"), it.optInt("conPhut", 0)) },
        cauTuanThuCon = cauCon,
        chuaXepChoPhep = u.optString("chuaXep") == "cho_phep",
        sao = docSao(o.optJSONObject("sao")),
        gioiHan = docGioiHan(o.optJSONObject("gioiHan")),
        cheDo = u.chuoi("cheDo")?.takeIf { it == "mo_het" || it == "theo_danh_sach" },
    )
}

/** `{sao, no, phutCon, hetSao, …}` (Policy / chính sách chung) — agent chỉ cần số dư, nợ, phút còn, hết sao; câu chữ dựng tại máy. */
fun docSao(o: JSONObject?): Sao? {
    if (o == null || !o.has("sao") || !o.has("phutCon")) return null
    val phut = o.optInt("phutCon", 0).coerceAtLeast(0)
    return Sao(o.optInt("sao", 0), o.optInt("no", 0).coerceAtLeast(0), phut, if (o.has("hetSao")) o.optBoolean("hetSao") else phut <= 0,
        if (o.has("saoTieuDuoc") && !o.isNull("saoTieuDuoc")) o.optInt("saoTieuDuoc").coerceAtLeast(0) else null)
}

/** `gioiHan {apDung, conNgay, lyDoKhoa, nghiDen, nghiDenGio, cau, …}`; thiếu / null ⇒ null (máy chủ cũ). */
fun docGioiHan(o: JSONObject?): GioiHan? {
    if (o == null) return null
    fun chuoiOpt(k: String) = if (o.isNull(k)) null else o.optString(k).ifBlank { null }
    return GioiHan(
        apDung = o.optBoolean("apDung", false),
        conNgay = if (o.has("conNgay") && !o.isNull("conNgay")) o.optInt("conNgay").coerceAtLeast(0) else null,
        lyDoKhoa = chuoiOpt("lyDoKhoa")?.takeIf { it == KHOA_HET_NGAY || it == KHOA_DANG_NGHI },
        nghiDen = chuoiOpt("nghiDen")?.let { try { Instant.parse(it) } catch (_: Exception) { null } },
        nghiDenGio = chuoiOpt("nghiDenGio"),
        cau = chuoiOpt("cau"),
    )
}

/** Câu màn khoá khi khoá vì giới hạn giờ chơi (không nói «hết sao»). null = không phải khoá vì giới hạn. */
fun cauKhoaGioiHan(g: GioiHan?): String? = when (g?.lyDoKhoa) {
    KHOA_DANG_NGHI -> "Nghỉ một chút" + (g.nghiDenGio?.let { " · chơi tiếp lúc $it" } ?: "")
    KHOA_HET_NGAY -> g.cau ?: "Hôm nay chơi đủ rồi — mai chơi tiếp nhé"
    else -> null
}

/** Tiêu đề màn khoá khi khoá vì giới hạn. */
fun tieuDeKhoaGioiHan(lyDo: String?): String? = when (lyDo) {
    KHOA_DANG_NGHI -> "Nghỉ một chút"
    KHOA_HET_NGAY -> "Hôm nay chơi đủ rồi"
    else -> null
}

fun docPhanHoiNhip(s: String): PhanHoiNhip {
    val o = JSONObject(s)
    val lenh = buildList {
        val a = o.optJSONArray("lenh") ?: JSONArray()
        for (i in 0 until a.length()) a.optJSONObject(i)?.let { add(Lenh(it.optString("id"), it.optString("loai"))) }
    }
    // grantEndsAt: dong-bo của Windows/Mac trả trong `windows.grantEndsAt`; nhịp Android nhận ở gốc (CAN-SERVER.md) — đọc cả hai.
    val grant = thoiDiem(o.chuoi("grantEndsAt")) ?: thoiDiem(o.optJSONObject("windows")?.chuoi("grantEndsAt"))
    return PhanHoiNhip(
        serverTime = thoiDiem(o.chuoi("serverTime")),
        chinhSach = docChinhSach(o.optJSONObject("chinhSach") ?: JSONObject()),
        lenh = lenh,
        grantEndsAt = grant,
        privateDns = o.chuoi("privateDns") ?: o.optJSONObject("android")?.chuoi("privateDns"),
        maOfflineBiMat = o.chuoi("maOfflineBiMat")?.takeIf { it.isNotBlank() },
    )
}

/** Gói Android trong danh sách mục (bỏ tệp .exe / .app / tên miền). */
fun goiAndroid(ds: List<MucChung>): Set<String> = ds.filter { it.kieu == "app" && laGoiAndroid(it.muc) }.map { it.muc }.toSet()

private val GOI = Regex("^[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)+$")

/** Tên gói Android hợp lệ. «Roblox.app» (gói .app macOS một chấm) và «game.exe» không phải; «vn.olm.app» là gói Android. */
fun laGoiAndroid(m: String): Boolean =
    GOI.matches(m) && !m.endsWith(".exe") && !(m.endsWith(".app") && m.count { it == '.' } < 2)

/** Luật web cho Chrome (cấu hình quản lý): `chan` → URLBlocklist, `cho` → URLAllowlist. #262 «Theo danh sách» (`cheDo` = theo_danh_sach): chặn mọi web (`*`)
 *  trừ web «Không tính phút» + web «Tính phút» (chỉ khi `tinhPhutMo`: hết sao / khoá thì bỏ nhóm này) + tên miền để AiiGrow chạy (`them`).
 *  Gỡ hẳn khi máy mở hoàn toàn (`moHoanToan`: mã offline, Ba Mẹ đang dùng, Ba Mẹ mở / cho vay, Mở hết). Máy chủ cũ (`cheDo` null): như trước — chỉ chặn web trong `chan`. */
data class LuatWeb(val chan: List<String>, val cho: List<String>)

fun luatWeb(cs: ChinhSach, them: List<String> = emptyList(), moHoanToan: Boolean = false, tinhPhutMo: Boolean = true): LuatWeb {
    if (cs.cheDo != "theo_danh_sach" || cs.chuaXepChoPhep) return LuatWeb(webChan(cs), emptyList())      // Mở hết, hoặc máy chủ cũ chưa có cheDo
    if (moHoanToan) return LuatWeb(webChan(cs), emptyList())
    val web = { ds: List<MucChung> -> ds.filter { it.kieu == "web" }.map { it.muc.trim().lowercase() }.filter { it.isNotEmpty() } }
    val duoc = web(cs.hoc) + (if (tinhPhutMo) web(cs.giaiTri) else emptyList())
    return LuatWeb(listOf("*"), (duoc + them.filter { it.isNotBlank() }).distinct())
}

/** Tên miền (không cổng) của địa chỉ máy chủ, vd «https://aiigrow.vn:443/x» ⇒ «aiigrow.vn». */
fun tenMienMayChu(goc: String): String? = try { java.net.URI(goc.trim()).host?.lowercase() } catch (_: Exception) { null }

/** Tên miền web ngoài luật máy chủ gửi (cho cấu hình quản lý Chrome URLBlocklist). #258: không còn lưới web cấm cứng — chỉ theo danh sách của Ba Mẹ. */
fun webChan(cs: ChinhSach): List<String> = cs.chan.filter { it.kieu == "web" }.map { it.muc }.distinct()
