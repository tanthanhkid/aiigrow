package vn.aiilab.aiigrow.con.logic

import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

// Quyết định thực thi từ chính sách + đồng hồ máy chủ + phút đã dùng — hàm thuần, không chạm hệ điều hành.

enum class TrangThai {
    BINH_THUONG,      // trong khung, còn phút
    DUOC_THEM_GIO,    // Ba Mẹ duyệt thêm giờ / mở khẩn cấp: gỡ chặn tới grantEndsAt
    HET_GIO,          // hết trần phút hôm nay
    NGOAI_KHUNG,      // ngoài khung giờ chơi
    KHONG_TUAN_THU,   // máy lệch chuẩn (giờ sai, quyền bị tắt…) ⇒ khoá giải trí
    GIO_NGU,          // giờ ngủ ⇒ khoá cả máy
    KHOA_NGAY,        // Ba Mẹ bấm «Khoá ngay» ⇒ khoá cả máy
}

data class GoiCai(val goi: String, val heThong: Boolean)

data class QuyetDinh(
    val trangThai: TrangThai,
    /** Gói phải tạm dừng (Device Owner) / chặn bằng màn phủ (đường không reset). */
    val goiChan: Set<String>,
    /** Khoá cả máy: màn khoá + lockNow (sau đếm ngược). */
    val khoaCaMay: Boolean,
    /** Phút giải trí còn lại hôm nay (≥ 0). */
    val conPhut: Int,
    /** Lúc mở lại (nếu biết): hết giờ ngủ / đầu khung kế tiếp / hết thêm giờ. */
    val moLaiLuc: Instant?,
    val cauCon: String,
)

/** Gói không bao giờ chặn: chính AiiGrow Con, app Ba Mẹ, trình cài / Cài đặt / điện thoại khẩn cấp. */
val GOI_LUON_CHO = setOf(
    "vn.aiilab.aiigrow.con", "vn.aiilab.aiigrow",
    "com.android.settings", "com.android.phone", "com.android.dialer", "com.google.android.dialer",
    "com.android.systemui", "com.android.packageinstaller", "com.google.android.packageinstaller",
    "com.android.emergency", "com.google.android.apps.nexuslauncher", "com.android.launcher3",
)

data class GioDiaPhuong(val phut: Int, val cuoiTuan: Boolean, val zdt: ZonedDateTime)

fun gioDiaPhuong(now: Instant, tz: String): GioDiaPhuong {
    val z = try { ZoneId.of(tz) } catch (_: Exception) { ZoneId.of("Asia/Ho_Chi_Minh") }
    val t = now.atZone(z)
    return GioDiaPhuong(t.hour * 60 + t.minute, t.dayOfWeek == DayOfWeek.SATURDAY || t.dayOfWeek == DayOfWeek.SUNDAY, t)
}

/** Phút `p` có trong khung không (khung qua nửa đêm: tu > den). Khung tu == den = rỗng. */
fun trongKhung(p: Int, k: Khung): Boolean {
    val a = k.tuPhut; val b = k.denPhut
    return when {
        a == b -> false
        a < b -> p in a until b
        else -> p >= a || p < b
    }
}

/** Phút còn tới hết khung đang ở trong (0 nếu ngoài khung). */
fun phutToiHetKhung(p: Int, ds: List<Khung>): Int =
    ds.filter { trongKhung(p, it) }.maxOfOrNull { ((it.denPhut - p + 1440) % 1440).let { d -> if (d == 0) 1440 else d } } ?: 0

/** Thời điểm bắt đầu khung kế tiếp trong hôm nay (null nếu không còn khung nào). */
fun dauKhungKe(g: GioDiaPhuong, ds: List<Khung>): Instant? =
    ds.map { it.tuPhut }.filter { it > g.phut }.minOrNull()?.let { g.zdt.withHour(0).withMinute(0).withSecond(0).withNano(0).plusMinutes(it.toLong()).toInstant() }

fun hetNgu(g: GioDiaPhuong, ngu: Khung): Instant {
    val d = ((ngu.denPhut - g.phut + 1440) % 1440).toLong()
    return g.zdt.withSecond(0).withNano(0).plusMinutes(d).toInstant()
}

fun quyetDinh(
    cs: ChinhSach,
    now: Instant,
    phutGiaiTriHomNay: Int,
    daCai: List<GoiCai>,
    grantEndsAt: Instant?,
): QuyetDinh {
    val g = gioDiaPhuong(now, cs.tz)
    val tamThoiCho = cs.mucTamThoi.filter { (it.het == null || it.het.isAfter(now)) && it.loai != "chan" }.map { it.muc }.toSet()
    val chan = goiAndroid(cs.chan) - tamThoiCho
    val giaiTri = goiAndroid(cs.giaiTri) - tamThoiCho
    val daXep = goiAndroid(cs.hoc) + goiAndroid(cs.giaiTri) + goiAndroid(cs.chan) + cs.heThong + tamThoiCho
    // chua_xep = «chan» (server): app người dùng tự cài chưa được Ba Mẹ xếp ⇒ tạm dừng. App hệ thống không tính.
    val chuaXep = daCai.filter { !it.heThong && it.goi !in daXep }.map { it.goi }.toSet()
    val coThe = { s: Set<String> -> (s - GOI_LUON_CHO) }

    val khung = if (g.cuoiTuan) cs.cuoiTuan else cs.ngayThuong
    val trongNgu = cs.ngu?.let { trongKhung(g.phut, it) } == true
    val conTran = (cs.tranNgayPhut + cs.phutThemHomNay - phutGiaiTriHomNay).coerceAtLeast(0)
    val conKhung = phutToiHetKhung(g.phut, khung)
    val conPhut = minOf(conTran, conKhung).let { p -> cs.phien?.let { maxOf(p, it.conPhut) } ?: p }
    val mo = listOfNotNull(grantEndsAt, cs.moKhanCapDen).filter { it.isAfter(now) }.maxOrNull()

    fun kq(t: TrangThai, goi: Set<String>, ca: Boolean, phut: Int, moLai: Instant?, cau: String) =
        QuyetDinh(t, coThe(goi), ca, phut.coerceAtLeast(0), moLai, cau)

    // Khoá ngay / giờ ngủ thắng cả thêm giờ (như agent-win).
    if (cs.khoaNgay) return kq(TrangThai.KHOA_NGAY, chan + giaiTri + chuaXep, true, 0, null, "Ba Mẹ vừa khoá máy. Con nghỉ một chút nhé.")
    if (trongNgu) return kq(TrangThai.GIO_NGU, chan + giaiTri + chuaXep, true, 0, cs.ngu?.let { hetNgu(g, it) }, "Đến giờ ngủ rồi. Chúc con ngủ ngon!")
    if (mo != null) {
        val p = Duration.between(now, mo).toMinutes().toInt() + 1
        return kq(TrangThai.DUOC_THEM_GIO, chan, false, p, mo, "Ba Mẹ đã cho thêm giờ.")
    }
    if (!cs.giaiTriDuocMo || "khong_tuan_thu" in cs.lyDo || "gio_may_sai" in cs.lyDo) {
        val cau = cs.cauTuanThuCon.firstOrNull() ?: "Máy đang tạm khoá giải trí. Con nhờ Ba Mẹ kiểm tra giúp nhé."
        return kq(TrangThai.KHONG_TUAN_THU, chan + giaiTri + chuaXep, false, 0, null, cau)
    }
    if (conKhung == 0 && cs.phien == null) {
        return kq(TrangThai.NGOAI_KHUNG, chan + giaiTri + chuaXep, false, 0, dauKhungKe(g, khung), "Bây giờ chưa phải giờ chơi. App học vẫn dùng được.")
    }
    if (conPhut <= 0) return kq(TrangThai.HET_GIO, chan + giaiTri + chuaXep, false, 0, dauKhungKe(g, khung), "Hết giờ giải trí hôm nay rồi. App học vẫn dùng được.")
    return kq(TrangThai.BINH_THUONG, chan + chuaXep, false, conPhut, null, "Con còn $conPhut phút giải trí hôm nay.")
}

// ---------------------------------------------------------------- đếm ngược trước khi khoá
const val DEM_NGUOC_GIAY = 60

/** Giây còn lại trước khi khoá thật; `batDau` = lúc agent thấy trạng thái khoá lần đầu. */
fun demNguocConLai(batDau: Instant, now: Instant, tong: Int = DEM_NGUOC_GIAY): Int =
    (tong - Duration.between(batDau, now).seconds).coerceIn(0, tong.toLong()).toInt()

fun laKhoa(t: TrangThai) = t == TrangThai.KHOA_NGAY || t == TrangThai.GIO_NGU || t == TrangThai.HET_GIO || t == TrangThai.NGOAI_KHUNG

fun mmss(giay: Int): String = "%d:%02d".format(giay.coerceAtLeast(0) / 60, giay.coerceAtLeast(0) % 60)
