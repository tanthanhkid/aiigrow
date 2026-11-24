package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.content.res.ColorStateList
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Phía Con trên điện thoại. Bản «Dịu» (L16, 06/11) đã áp phong cách E «Ánh kim» (17/11): nền kem neumorphism, thẻ cùng màu nền nổi bằng bóng đôi,
 * ô nhập/ô chọn lõm, nút chính vàng kim chữ navy, giờ ngủ nền navy; chữ Be Vietnam Pro ExtraBold (tiêu đề, số — #417) + Be Vietnam Pro (OFL, res/font —
 * giấy phép assets/OFL-Fraunces.txt, assets/OFL-BeVietnamPro.txt). Mọi token nằm ở tệp này; Clay.kt (cũ) trỏ về đây.
 */
object Diu {
    // ---- màu: phong cách E «Ánh kim» (17/11) — kem neumorphism + vàng kim + navy. Tên token giữ như bản Dịu (XANH = màu «chính», nay là navy).
    const val NEN = 0xFFECE4D9.toInt()
    const val XANH = 0xFF0A1629.toInt()        // «chính» = navy (chấm PIN đã gõ…)
    const val XANH_NHAT = 0xFFE2D6C4.toInt()   // ô chọn / thẻ nhấn: kem sẫm (lõm)
    const val XANH_DAM = 0xFF0A1629.toInt()    // chữ nhấn / liên kết = navy
    const val OK = 0xFF2D6A14.toInt()          // thành công: 5,2:1 trên NEN
    const val CHU = 0xFF0A1629.toInt()
    const val CHU2 = 0xFF3B352E.toInt()
    const val CHU3 = 0xFF5F554B.toInt()        // chữ phụ 5,8:1 trên NEN
    const val VIEN = 0xFFD9CDBC.toInt()        // đường kẻ mảnh
    const val CHAM = 0xFFC2B5A3.toInt()        // chấm PIN chưa gõ
    const val VONG_NEN = 0xFFE2D6C4.toInt()    // phần chưa chơi của vòng giờ
    const val LOM = 0xFFE5DCCF.toInt()         // ô nhập lõm
    // vàng kim loại: linear-gradient(135deg, KIM_SANG 0, KIM 38%, KIM_DAM 72%, KIM_NHAT 100%)
    const val KIM_SANG = 0xFFFBE7B0.toInt()
    const val KIM = 0xFFF4C76A.toInt()
    const val KIM_DAM = 0xFFC9973B.toInt()
    const val KIM_NHAT = 0xFFF2D48C.toInt()
    const val KIM_VIEN = 0xFFD9AE57.toInt()    // vòng bé đang chọn
    const val KIM_HAIR = 0x59F4C76A            // viền vàng mảnh trên navy rgba(244,199,106,.35)
    const val VANG_CHU = 0xFF0A1629.toInt()    // chữ navy trên vàng ≥ 6,9:1
    const val BONG = 0x47786246                // rgba(120,98,70,.28)
    const val BONG_SANG = 0xE6FFFBF5.toInt()   // bóng sáng lệch lên-trái
    /** 15/11 số sao âm (đang nợ): nền #f9e7d2, chữ cam sẫm #983e04 (5,9:1). */
    const val NO_NEN = 0xFFF9E7D2.toInt()
    const val NO_CHU = 0xFF983E04.toInt()
    const val NO_VIEN = 0xFFEFCFAE.toInt()
    const val LOI = 0xFFA2412C.toInt()         // «Chưa đúng · còn 3 lần thử» (viền/chấm)
    const val LOI_NHAT = 0xFFFDECEA.toInt()
    const val LOI_DAM = 0xFFA2412C.toInt()     // chữ lỗi 5,2:1 trên NEN
    const val TRANG = 0xFFFFFFFF.toInt()       // chỉ còn là cờ «mặt sáng» cho khoi()/the(); mặt thật là kem
    // giờ ngủ: nền navy, số vàng
    const val DEM_NEN = 0xFF0A1629.toInt()
    const val DEM_THE = 0xFF14233D.toInt()
    const val DEM_CHU = 0xFFF2EBE3.toInt()
    const val DEM_CHU2 = 0xFFD4C9BA.toInt()
    /** Avatar bé (E): nền navy, chữ vàng kim, vòng vàng — mọi bé cùng một kiểu (không còn pastel riêng từng bé). */
    private const val AVATAR_NEN = 0xFF0A1629.toInt()

    fun dp(c: Context, v: Int) = (v * c.resources.displayMetrics.density).toInt()
    private fun dpf(c: Context, v: Float) = v * c.resources.displayMetrics.density

    private var tieuDe: Typeface? = null
    private var thuong: Typeface? = null
    private var dam: Typeface? = null
    /** Be Vietnam Pro Regular (chữ thường) / Be Vietnam Pro ExtraBold (tiêu đề, số, dacBiet = true — #417, Fraunces chỉ cho chữ logo). Không nạp được font ⇒ sans-serif. */
    fun font(c: Context, dacBiet: Boolean = false): Typeface = try {
        if (dacBiet) tieuDe ?: c.resources.getFont(R.font.bevietnampro_extrabold).also { tieuDe = it }
        else thuong ?: c.resources.getFont(R.font.bevietnampro_regular).also { thuong = it }
    } catch (_: Exception) { if (dacBiet) Typeface.create("sans-serif", Typeface.BOLD) else Typeface.create("sans-serif", Typeface.NORMAL) }

    /** Be Vietnam Pro Bold cho nhãn nút. */
    fun fontDam(c: Context): Typeface = try {
        dam ?: c.resources.getFont(R.font.bevietnampro_bold).also { dam = it }
    } catch (_: Exception) { Typeface.create("sans-serif", Typeface.BOLD) }

    fun chu(c: Context, s: String, co: Float = 16f, mau: Int = CHU, dacBiet: Boolean = false) = TextView(c).apply {
        // ExtraBold rộng hơn Fraunces ~5% ⇒ tiêu đề ×0,95 giữ bề ngang / chỗ rớt dòng như cũ (#417)
        text = s; textSize = if (dacBiet) co * 0.95f else co; setTextColor(mau); typeface = font(c, dacBiet)
        setLineSpacing(0f, 1.12f)
        if (co >= 24f) letterSpacing = -0.01f
    }

    fun tron(mau: Int, vien: Int? = null, c: Context? = null) = GradientDrawable().apply {
        shape = GradientDrawable.OVAL; setColor(mau); if (vien != null && c != null) setStroke(dp(c, 1), vien)
    }

    /** Mặt phẳng: TRANG / XANH_NHAT (không viền nhấn) ⇒ ô LÕM kem; màu khác (lỗi, nợ…) ⇒ nền đặc, viền tuỳ chọn. */
    fun khoi(c: Context, mau: Int = TRANG, bo: Int = 24, vien: Int? = VIEN, day: Int = 1): Drawable {
        val nhan = vien != null && vien != VIEN
        if ((mau == TRANG || mau == XANH_NHAT) && !nhan)
            return ChatLieu(ChatLieu.Kieu.LOM, dpf(c, bo.toFloat()), mau = if (mau == TRANG) LOM else XANH_NHAT, dp = dpf(c, 1f))
        return GradientDrawable().apply {
            setColor(if (mau == TRANG) LOM else mau); cornerRadius = dpf(c, bo.toFloat())
            if (vien != null) setStroke(dp(c, day), vien)
        }
    }

    /** Thẻ: kem nổi bằng bóng đôi (nen = TRANG) hoặc thẻ nhấn lõm kem sẫm. */
    fun the(c: Context, nen: Int = TRANG, dem: Int = 16) = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL
        background = if (nen == TRANG) noi(c, 24f) else khoi(c, XANH_NHAT, 24, null)
        setPadding(dp(c, dem), dp(c, dem), dp(c, dem), dp(c, dem))
        if (nen == TRANG) ChatLieu.choBong(this)
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 12) }
    }

    private fun bong(v: View, c: Context, cao: Float = 2f) {
        v.elevation = dpf(c, cao)
        if (android.os.Build.VERSION.SDK_INT >= 28) { v.outlineAmbientShadowColor = BONG; v.outlineSpotShadowColor = BONG }
    }

    /** Khối kem nổi (bóng đôi). */
    fun noi(c: Context, bo: Float, tron: Boolean = false) = ChatLieu(ChatLieu.Kieu.NOI, dpf(c, bo), tron, NEN, dpf(c, 1f))
    private fun kim(c: Context, bo: Float) = ChatLieu(ChatLieu.Kieu.KIM, dpf(c, bo), dp = dpf(c, 1f))
    private fun mat(bo: Float, c: Context, tron: Boolean = false) = GradientDrawable().apply {
        setColor(0xFF000000.toInt()); if (tron) shape = GradientDrawable.OVAL else cornerRadius = dpf(c, bo)
    }

    enum class KieuNut { CHINH, PHU, NHAT, CHU }

    /** Kiểu nút «chính / phụ / nhạt / chữ» — dùng khi dựng và khi nút đổi vai (vd «Xin Ba Mẹ…» chính ⇄ phụ). */
    fun datKieu(c: Context, b: Button, kieu: KieuNut) {
        val nen: Drawable? = when (kieu) {
            KieuNut.CHINH -> kim(c, 18f)                      // vàng kim, chữ navy
            KieuNut.PHU -> khoi(c, TRANG, 18, null)           // kem lõm
            KieuNut.NHAT -> khoi(c, XANH_NHAT, 18, null)
            KieuNut.CHU -> null
        }
        b.background = RippleDrawable(ColorStateList.valueOf(0x22000000), nen, mat(18f, c))
        if (kieu == KieuNut.CHINH) ChatLieu.choBong(b)
        b.setTextColor(ColorStateList(arrayOf(intArrayOf(-android.R.attr.state_enabled), intArrayOf()),
            intArrayOf(CHU3, if (kieu == KieuNut.CHU) CHU2 else CHU)))
    }

    /** Nút cao 52dp. CHINH = xanh đặc chữ trắng; PHU = trắng viền mảnh chữ xanh đậm; NHAT = nền xanh nhạt; CHU = chỉ chữ (liên kết). */
    fun nut(c: Context, s: String, kieu: KieuNut = KieuNut.CHINH, onClick: (View) -> Unit) = Button(c).apply {
        text = s; isAllCaps = false; textSize = if (kieu == KieuNut.CHU) 15f else 17f; typeface = if (kieu == KieuNut.CHU) font(c) else fontDam(c)
        maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END; gravity = Gravity.CENTER
        stateListAnimator = null; backgroundTintList = null
        datKieu(c, this, kieu)
        val cao = dp(c, if (kieu == KieuNut.CHU) 44 else 52)
        minHeight = cao; minimumHeight = cao; minWidth = 0; minimumWidth = 0
        setPadding(dp(c, 16), 0, dp(c, 16), 0)
        setOnClickListener(onClick)
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 10) }
    }

    /** Chọn trong nhóm (chip phút / sao): chọn ⇒ xanh đặc; không ⇒ trắng viền. */
    fun chon(c: Context, b: Button, dangChon: Boolean) {
        // chưa chọn = kem lõm (như nút phụ); đã chọn = vàng kim nổi, rõ ràng khác
        val nen: Drawable = if (dangChon) kim(c, 18f) else khoi(c, TRANG, 18, null)
        b.background = RippleDrawable(ColorStateList.valueOf(0x22000000), nen, mat(18f, c))
        if (dangChon) ChatLieu.choBong(b)
        b.setTextColor(CHU)
    }

    /** Vòng tên bé (chữ cái đầu vàng trên nền navy, vòng vàng #D9AE57; `dangChon` = vòng vàng sáng). `thuTu` = vị trí bé trong hồ sơ. */
    fun vongTen(c: Context, chuDau: String, thuTu: Int, coDp: Int = 72, dangChon: Boolean = false) = TextView(c).apply {
        text = chuDau; gravity = Gravity.CENTER; setTextColor(KIM); typeface = font(c, true); textSize = coDp * 0.42f
        background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(AVATAR_NEN); setStroke(dp(c, if (coDp >= 60) 4 else 2), if (dangChon) KIM_SANG else KIM_VIEN) }
        bong(this, c, if (coDp >= 60) 4f else 1f)
        layoutParams = LinearLayout.LayoutParams(dp(c, coDp), dp(c, coDp))
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    /** Chip sao vàng «★ 30 sao» — vàng CHỈ dùng ở đây. */
    /** Viên sao: dương = vàng «★ 30 sao»; ÂM (đang nợ Ba Mẹ — 15/11) = viên cảnh báo cam «★ −20 sao» (dấu trừ thật). */
    fun chipSao(c: Context, sao: Int, to: Boolean = false) = chu(c, "★  ${vn.aiilab.aiigrow.maycon.logic.soSao(sao)}", if (to) 19f else 15f,
        if (sao < 0) NO_CHU else VANG_CHU, true).apply {
        background = if (sao < 0) khoi(c, NO_NEN, if (to) 20 else 16, NO_VIEN) else kim(c, if (to) 20f else 16f)
        setPadding(dp(c, 12), dp(c, 4), dp(c, 12), dp(c, 4)); gravity = Gravity.CENTER
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(c, if (to) 40 else 32))
    }

    /** Chip tên bé «(B) Bảo Anh ▾» — chạm mở «Đổi người / Đăng xuất». */
    fun chipBe(c: Context, ten: String, thuTu: Int, onClick: (View) -> Unit) = LinearLayout(c).apply {
        orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
        background = noi(c, 19f); ChatLieu.choBong(this)
        setPadding(dp(c, 4), 0, dp(c, 12), 0)
        addView(vongTen(c, ten.trim().firstOrNull()?.uppercase() ?: "?", thuTu, 30, dangChon = true))
        addView(chu(c, "$ten  ▾", 15f, CHU, true).apply { setPadding(dp(c, 7), 0, 0, 0) })
        isClickable = true; isFocusable = true; contentDescription = "$ten — đổi bé hoặc đăng xuất"
        setOnClickListener(onClick)
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(c, 44))
    }

    /** 4 chấm PIN (đã gõ ⇒ xanh đặc; sai ⇒ đỏ). */
    class ChamPin(val c: Context) {
        val goc = LinearLayout(c).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 14) } }
        private val cham = (0 until 4).map { i -> View(c).also { v ->
            v.layoutParams = LinearLayout.LayoutParams(dp(c, 20), dp(c, 20)).apply { if (i > 0) marginStart = dp(c, 20) }; goc.addView(v) } }
        fun ve(so: Int, sai: Boolean = false) = cham.forEachIndexed { i, v ->
            v.background = GradientDrawable().apply { shape = GradientDrawable.OVAL
                if (sai) { setColor(LOI); setStroke(dp(c, 2), LOI) } else if (i < so) { setColor(XANH); setStroke(dp(c, 2), XANH) } else { setColor(0); setStroke((dpf(c, 2.5f)).toInt(), CHAM) } }
        }.also { goc.contentDescription = "Đã gõ $so trên 4 số" }
    }

    /** Bàn phím số to (phím tròn 74dp trắng viền mảnh) — PIN 4 số / mã 6 số. */
    fun banPhim(c: Context, onSo: (Char) -> Unit, onXoa: () -> Unit) = GridLayout(c).apply {
        columnCount = 3; useDefaultMargins = false
        val co = dp(c, 68); val ngang = dp(c, 14); val doc = dp(c, 6)
        fun phim(s: String?, f: (() -> Unit)?) = TextView(c).apply {
            text = s ?: ""; gravity = Gravity.CENTER; typeface = font(c, false); textSize = if (s == "⌫") 24f else 28f
            setTextColor(if (s == "⌫") CHU2 else CHU)
            if (f != null) {
                if (s != "⌫") { background = RippleDrawable(ColorStateList.valueOf(0x22000000), noi(c, 0f, true), mat(0f, c, true)); ChatLieu.choBong(this) }
                isClickable = true; isFocusable = true; setOnClickListener { f() }
                contentDescription = if (s == "⌫") "Xoá một số" else s
            }
            layoutParams = GridLayout.LayoutParams().apply { width = co; height = co; setMargins(ngang, doc, ngang, doc) }
        }
        for (s in "123456789") addView(phim(s.toString()) { onSo(s) })
        addView(phim(null, null)); addView(phim("0") { onSo('0') }); addView(phim("⌫") { onXoa() })
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.CENTER_HORIZONTAL; topMargin = dp(c, 12) }
    }

    /** Ô mã 6 số dạng 6 ô vuông (ô đang gõ viền navy dày 3dp, 13:1) — «7 3 1 _ _ _». */
    class OMa(val c: Context, val soO: Int = 6) {
        val goc = LinearLayout(c).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 12) } }
        private val o = (0 until soO).map { i -> chu(c, "", 26f, CHU, true).also { t ->
            t.gravity = Gravity.CENTER
            t.layoutParams = LinearLayout.LayoutParams(dp(c, 42), dp(c, 54)).apply { if (i > 0) marginStart = dp(c, if (i == soO / 2) 14 else 6) }
            goc.addView(t) } }
        fun ve(s: String, sai: Boolean = false) {
            o.forEachIndexed { i, t ->
                t.text = s.getOrNull(i)?.toString() ?: ""
                t.background = when {
                    sai -> khoi(c, LOI_NHAT, 14, LOI, 2)
                    i == s.length -> khoi(c, TRANG, 14, CHU, 3)
                    else -> khoi(c, TRANG, 14, VIEN)
                }
            }
            goc.contentDescription = "Đã gõ ${s.length} trên $soO số"
        }
    }

    /** Vòng giờ chơi (phần đã chơi xanh, phần còn lại nền) với số phút ở giữa. */
    class VongGio(val c: Context, val coDp: Int = 132) : View(c) {
        var tyLe = 0f; set(v) { field = v.coerceIn(0f, 1f); invalidate() }
        private val p = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply { style = android.graphics.Paint.Style.STROKE; strokeCap = android.graphics.Paint.Cap.ROUND }
        init { layoutParams = LinearLayout.LayoutParams(dp(c, coDp), dp(c, coDp)) }
        override fun onDraw(cv: android.graphics.Canvas) {
            val w = dpf(c, 12f); p.strokeWidth = w
            val r = android.graphics.RectF(w / 2, w / 2, width - w / 2, height - w / 2)
            p.color = VONG_NEN; cv.drawArc(r, 0f, 360f, false, p)
            if (tyLe > 0f) { p.color = KIM_DAM; cv.drawArc(r, -90f, 360f * tyLe, false, p) }
        }
    }

    fun gian(c: Context, cao: Int = 12) = View(c).apply { layoutParams = LinearLayout.LayoutParams(1, dp(c, cao)) }
}
