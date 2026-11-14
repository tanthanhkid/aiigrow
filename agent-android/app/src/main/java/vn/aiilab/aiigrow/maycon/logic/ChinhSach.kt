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

/** Quỹ phút chơi hôm nay (thiết kế 05/11, server/lib/quy-gio.ts): mọi app Giải trí dùng chung; `daDung` = phút đã dùng (mọi máy). */
data class Quy(val ngayPhut: Int, val themPhut: Int, val daDung: Int, val conPhut: Int, val dangHoc: Boolean, val phut10Sao: Int = 10) {
    val tongPhut get() = ngayPhut + themPhut
}
/** Giờ học: chỉ app Học (thu 0 = CN). */
data class GioHoc(val tu: String, val den: String, val thu: List<Int>) { val khung get() = Khung(tu, den) }
/** Ngoại lệ Ba Mẹ mở: `muc` null = cả máy; `nhom` = nhóm máy (may_tinh | ios | android). */
data class NgoaiLeMo(val den: Instant, val muc: String?, val nhom: String)

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
    // ---- 05/11 (máy chủ cũ không gửi ⇒ null / mặc định ⇒ chạy luật cũ)
    val quy: Quy? = null,
    val gioHoc: GioHoc? = null,
    val ngoaiLeMo: List<NgoaiLeMo> = emptyList(),
    /** Chế độ «Mở hết»: app chưa xếp được dùng (ungDung.chuaXep = cho_phep). Mặc định «Chặn app & web» ⇒ chặn + Con xin Ba Mẹ duyệt. */
    val chuaXepChoPhep: Boolean = false,
    /** Web luôn chặn (người lớn, cờ bạc, bạo lực) — chặn ở mọi chế độ. */
    val webLuonChan: List<String> = emptyList(),
)

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
        quy = o.optJSONObject("quy")?.let { q ->
            val ty = q.optJSONObject("tyLe")
            val sao = ty?.optInt("sao", 10)?.takeIf { it > 0 } ?: 10
            Quy(q.optInt("ngayPhut", 0), q.optInt("themPhut", 0), q.optInt("daDung", 0), q.optInt("conPhut", 0), q.optBoolean("dangHoc", false),
                ((ty?.optInt("phut", 10) ?: 10) * 10 / sao).coerceAtLeast(1))
        },
        gioHoc = o.optJSONObject("gioHoc")?.let { h ->
            val t = h.optJSONArray("thu") ?: JSONArray()
            GioHoc(h.optString("tu", "00:00"), h.optString("den", "00:00"), (0 until t.length()).map { t.optInt(it) })
        },
        ngoaiLeMo = buildList {
            val a = o.optJSONArray("ngoaiLeMo") ?: JSONArray()
            for (i in 0 until a.length()) {
                val x = a.optJSONObject(i) ?: continue
                val den = thoiDiem(x.chuoi("den")) ?: continue
                add(NgoaiLeMo(den, x.chuoi("muc")?.takeIf { it.isNotBlank() }, x.optString("nhom", "")))
            }
        },
        chuaXepChoPhep = u.optString("chuaXep") == "cho_phep",
        webLuonChan = u.optJSONArray("webLuonChan").chuoiDs(),
    )
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

/** Tên miền web bị chặn (cho cấu hình quản lý Chrome URLBlocklist) — gồm web luôn chặn (05/11). */
fun webChan(cs: ChinhSach): List<String> = (cs.chan.filter { it.kieu == "web" }.map { it.muc } + cs.webLuonChan).distinct()
