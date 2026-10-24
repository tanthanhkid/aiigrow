package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import vn.aiilab.aiigrow.maycon.logic.TrangThai
import vn.aiilab.aiigrow.maycon.logic.mmss
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Giao diện dựng bằng code (không thư viện UI): màu #1f8a70, vùng chạm ≥ 48dp, chữ tiếng Việt có dấu. */
object GiaoDien {
    const val XANH = 0xFF1F8A70.toInt()
    const val XANH_NHAT = 0xFFE6F3EF.toInt()
    const val NEN = 0xFFF6FAF8.toInt()
    const val CHU = 0xFF12302A.toInt()
    const val CHU_PHU = 0xFF4E6B63.toInt()
    const val TRANG = 0xFFFFFFFF.toInt()

    fun dp(c: Context, v: Int) = (v * c.resources.displayMetrics.density).toInt()

    fun cot(c: Context, pad: Int = 20) = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(c, pad), dp(c, pad), dp(c, pad), dp(c, pad))
    }

    fun chu(c: Context, s: String, co: Float = 16f, mau: Int = CHU, dam: Boolean = false) = TextView(c).apply {
        text = s; textSize = co; setTextColor(mau)
        if (dam) setTypeface(typeface, Typeface.BOLD)
        setLineSpacing(0f, 1.15f)
    }

    fun the(c: Context, nen: Int = TRANG) = cot(c, 18).apply {
        background = GradientDrawable().apply { cornerRadius = dp(c, 16).toFloat(); setColor(nen) }
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 14) }
    }

    /** Nút chính: cao ≥ 48dp (56dp), nền xanh, chữ trắng. `phu` = viền xanh, nền trắng. */
    fun nut(c: Context, s: String, phu: Boolean = false, onClick: (View) -> Unit) = Button(c).apply {
        text = s; isAllCaps = false; textSize = 16f
        minHeight = dp(c, 56); minimumHeight = dp(c, 56)
        setTextColor(if (phu) XANH else TRANG)
        background = GradientDrawable().apply {
            cornerRadius = dp(c, 14).toFloat(); setColor(if (phu) TRANG else XANH)
            if (phu) setStroke(dp(c, 2), XANH)
        }
        backgroundTintList = null
        stateListAnimator = null
        setOnClickListener(onClick)
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(c, 56)).apply { topMargin = dp(c, 10) }
    }

    fun chonTrongNhom(c: Context, b: Button, chon: Boolean) {
        b.setTextColor(if (chon) TRANG else XANH)
        (b.background as? GradientDrawable)?.setColor(if (chon) XANH else TRANG)
    }

    fun gio(ms: Long): String = DateTimeFormatter.ofPattern("HH:mm").format(Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()))

    fun tieuDeKhoa(t: String) = when (t) {
        TrangThai.KHOA_NGAY.name -> "Máy đang khoá"
        TrangThai.GIO_NGU.name -> "Đến giờ ngủ rồi"
        TrangThai.HET_GIO.name -> "Hết giờ giải trí"
        TrangThai.NGOAI_KHUNG.name -> "Chưa tới giờ chơi"
        else -> "AiiGrow"
    }

    /** Dòng đếm ngược trên màn khoá. */
    fun dongDemNguoc(ht: HienThi, now: Long = System.currentTimeMillis()): String = when {
        ht.demNguoc > 0 -> "Khoá sau ${mmss(ht.demNguoc)}"
        ht.moLaiLuc > now -> "Mở lại sau ${mmssDai(((ht.moLaiLuc - now) / 1000).toInt())} (lúc ${gio(ht.moLaiLuc)})"
        else -> "Chờ Ba Mẹ mở"
    }

    fun mmssDai(giay: Int): String = if (giay >= 3600) "%d:%02d:%02d".format(giay / 3600, giay % 3600 / 60, giay % 60) else mmss(giay)

    /** Nội dung màn khoá / màn chặn dùng chung cho ManKhoa (activity) và TroNang (lớp phủ trợ năng). */
    class ManKhoaView(val c: Context, val onXin: () -> Unit, val onVe: (() -> Unit)?) {
        val goc = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setBackgroundColor(XANH); setPadding(dp(c, 28), dp(c, 48), dp(c, 28), dp(c, 48)) }
        val tieuDe = chu(c, "", 28f, TRANG, true).apply { gravity = Gravity.CENTER }
        val dem = chu(c, "", 44f, TRANG, true).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 18), 0, dp(c, 18)) }
        val cau = chu(c, "", 18f, TRANG).apply { gravity = Gravity.CENTER }
        val ghi = chu(c, "Máy này do Ba Mẹ quản lý bằng AiiGrow.", 14f, 0xCCFFFFFF.toInt()).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 24), 0, 0) }
        val nutXin = nut(c, "Xin Ba Mẹ thêm giờ", phu = true) { onXin() }
        val nutVe = onVe?.let { f -> nut(c, "Về màn hình chính", phu = true) { f() } }

        init {
            goc.addView(tieuDe); goc.addView(dem); goc.addView(cau); goc.addView(nutXin); nutVe?.let(goc::addView); goc.addView(ghi)
        }

        fun ve(ht: HienThi, goiChan: String? = null) {
            if (goiChan != null && !ht.dangKhoaThat) {
                tieuDe.text = "Ứng dụng này đang bị chặn"
                dem.text = DoPhut.tenApp(c, goiChan)
                dem.textSize = 26f
                cau.text = "Ba Mẹ chưa cho dùng ứng dụng này lúc này. Con có thể xin Ba Mẹ nhé."
            } else {
                tieuDe.text = tieuDeKhoa(ht.trangThai)
                dem.text = dongDemNguoc(ht); dem.textSize = if (ht.demNguoc > 0) 44f else 24f
                cau.text = ht.cauCon
            }
        }
    }
}
