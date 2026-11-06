package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.graphics.Typeface
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
 * Bản «Dịu» của phía Con trên điện thoại (L16, 06/11 — docs/thiet-ke-chot/con-dt-*, kit `condt-tre/kit-diu.css`): nền kem phẳng, MỘT màu
 * nhấn xanh lá, vàng chỉ cho sao, thẻ trắng bo 24 viền mảnh + bóng xám mềm, nút chính cao 52dp màu đặc, chữ Nunito (OFL, res/font —
 * giấy phép assets/NUNITO-OFL.txt), robot chỉ ở màn có cảm xúc, giờ ngủ nền tối dịu. Mọi token Dịu nằm ở tệp này; Clay.kt giữ cho phần cũ.
 */
object Diu {
    // ---- màu (lấy từ :root của các màn HTML con-dt-*)
    const val NEN = 0xFFFBF8F2.toInt()
    const val XANH = 0xFF2F9E5F.toInt()
    const val XANH_NHAT = 0xFFE8F5ED.toInt()
    const val XANH_DAM = 0xFF1F6E42.toInt()
    const val CHU = 0xFF1F2A37.toInt()
    const val CHU2 = 0xFF5F6B7A.toInt()
    const val CHU3 = 0xFF9AA3AE.toInt()
    const val VIEN = 0xFFECE7DC.toInt()
    const val CHAM = 0xFFC9C2B4.toInt()      // chấm PIN chưa gõ
    const val VONG_NEN = 0xFFE9E5DC.toInt()  // phần chưa chơi của vòng giờ
    const val VANG = 0xFFFFF5D9.toInt()      // CHỈ cho sao
    const val VANG_VIEN = 0xFFF3DD9C.toInt()
    const val VANG_CHU = 0xFF8A5A00.toInt()
    const val LOI = 0xFFD9534F.toInt()       // «Chưa đúng · còn 3 lần thử»
    const val LOI_NHAT = 0xFFFDECEA.toInt()
    const val LOI_DAM = 0xFFA3302B.toInt()
    const val TRANG = 0xFFFFFFFF.toInt()
    // giờ ngủ: nền tối dịu
    const val DEM_NEN = 0xFF1E2430.toInt()
    const val DEM_THE = 0xFF283041.toInt()
    const val DEM_CHU = 0xFFE9EDF3.toInt()
    const val DEM_CHU2 = 0xFFA9B2C0.toInt()
    /** Màu vòng tên bé (avatar chữ cái) — bé đầu cam như màn mẫu, bé sau lần lượt. */
    private val MAU_BE = intArrayOf(0xFFF5A957.toInt(), 0xFF6AA9E9.toInt(), 0xFFB48CDE.toInt(), 0xFFE98AA9.toInt(), 0xFF5CB88A.toInt())

    fun dp(c: Context, v: Int) = (v * c.resources.displayMetrics.density).toInt()
    private fun dpf(c: Context, v: Float) = v * c.resources.displayMetrics.density

    private var dam: Typeface? = null
    private var dac: Typeface? = null
    /** Nunito 700 (chữ thường) / 900 (tiêu đề, số). Không nạp được font ⇒ sans-serif đậm. */
    fun font(c: Context, dacBiet: Boolean = false): Typeface = try {
        if (dacBiet) dac ?: c.resources.getFont(R.font.nunito_black).also { dac = it }
        else dam ?: c.resources.getFont(R.font.nunito_bold).also { dam = it }
    } catch (_: Exception) { Typeface.create("sans-serif", Typeface.BOLD) }

    fun chu(c: Context, s: String, co: Float = 16f, mau: Int = CHU, dacBiet: Boolean = false) = TextView(c).apply {
        text = s; textSize = co; setTextColor(mau); typeface = font(c, dacBiet)
        setLineSpacing(0f, 1.12f)
        if (co >= 24f) letterSpacing = -0.01f
    }

    fun tron(mau: Int, vien: Int? = null, c: Context? = null) = GradientDrawable().apply {
        shape = GradientDrawable.OVAL; setColor(mau); if (vien != null && c != null) setStroke(dp(c, 1), vien)
    }

    fun khoi(c: Context, mau: Int = TRANG, bo: Int = 24, vien: Int? = VIEN, day: Int = 1) = GradientDrawable().apply {
        setColor(mau); cornerRadius = dpf(c, bo.toFloat()); if (vien != null) setStroke(dp(c, day), vien)
    }

    private fun bong(v: View, c: Context, cao: Float = 2f) {
        v.elevation = dpf(c, cao)
        if (android.os.Build.VERSION.SDK_INT >= 28) { v.outlineAmbientShadowColor = 0x33201E14; v.outlineSpotShadowColor = 0x33201E14 }
    }

    /** Thẻ trắng bo 24, viền mảnh, bóng xám mềm. `nhat` = thẻ màu nhạt (≤ 1 thẻ / màn). */
    fun the(c: Context, nen: Int = TRANG, dem: Int = 16) = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL
        background = khoi(c, nen, 24, if (nen == TRANG) VIEN else null)
        setPadding(dp(c, dem), dp(c, dem), dp(c, dem), dp(c, dem))
        if (nen == TRANG) bong(this, c, 1.5f)
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 12) }
    }

    enum class KieuNut { CHINH, PHU, NHAT, CHU }

    /** Nút cao 52dp. CHINH = xanh đặc chữ trắng; PHU = trắng viền mảnh chữ xanh đậm; NHAT = nền xanh nhạt; CHU = chỉ chữ (liên kết). */
    fun nut(c: Context, s: String, kieu: KieuNut = KieuNut.CHINH, onClick: (View) -> Unit) = Button(c).apply {
        text = s; isAllCaps = false; textSize = if (kieu == KieuNut.CHU) 15f else 17f; typeface = font(c, kieu == KieuNut.CHINH)
        maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END; gravity = Gravity.CENTER
        stateListAnimator = null; backgroundTintList = null
        val nen = when (kieu) {
            KieuNut.CHINH -> khoi(c, XANH, 18, null)
            KieuNut.PHU -> khoi(c, TRANG, 18, VIEN)
            KieuNut.NHAT -> khoi(c, XANH_NHAT, 18, null)
            KieuNut.CHU -> null
        }
        background = RippleDrawable(ColorStateList.valueOf(0x22000000), nen, nen ?: khoi(c, TRANG, 18, null))
        setTextColor(ColorStateList(arrayOf(intArrayOf(-android.R.attr.state_enabled), intArrayOf()),
            intArrayOf(CHU3, if (kieu == KieuNut.CHINH) TRANG else if (kieu == KieuNut.CHU) CHU2 else XANH_DAM)))
        val cao = dp(c, if (kieu == KieuNut.CHU) 44 else 52)
        minHeight = cao; minimumHeight = cao; minWidth = 0; minimumWidth = 0
        setPadding(dp(c, 16), 0, dp(c, 16), 0)
        if (kieu == KieuNut.PHU) bong(this, c, 1f)
        setOnClickListener(onClick)
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 10) }
    }

    /** Chọn trong nhóm (chip phút / sao): chọn ⇒ xanh đặc; không ⇒ trắng viền. */
    fun chon(c: Context, b: Button, dangChon: Boolean) {
        val nen = if (dangChon) khoi(c, XANH, 18, null) else khoi(c, TRANG, 18, VIEN)
        b.background = RippleDrawable(ColorStateList.valueOf(0x22000000), nen, nen)
        b.setTextColor(if (dangChon) TRANG else XANH_DAM)
    }

    /** Vòng tên bé (chữ cái đầu, viền trắng, bóng mềm). `thuTu` = vị trí bé trong hồ sơ. */
    fun vongTen(c: Context, chuDau: String, thuTu: Int, coDp: Int = 72) = TextView(c).apply {
        text = chuDau; gravity = Gravity.CENTER; setTextColor(TRANG); typeface = font(c, true); textSize = coDp * 0.42f
        background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(MAU_BE[Math.floorMod(thuTu, MAU_BE.size)]); setStroke(dp(c, if (coDp >= 60) 4 else 2), TRANG) }
        bong(this, c, if (coDp >= 60) 4f else 1f)
        layoutParams = LinearLayout.LayoutParams(dp(c, coDp), dp(c, coDp))
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    /** Chip sao vàng «★ 30 sao» — vàng CHỈ dùng ở đây. */
    fun chipSao(c: Context, sao: Int, to: Boolean = false) = chu(c, "★  $sao sao", if (to) 19f else 15f, VANG_CHU, true).apply {
        background = khoi(c, VANG, if (to) 20 else 16, VANG_VIEN)
        setPadding(dp(c, 12), dp(c, 4), dp(c, 12), dp(c, 4)); gravity = Gravity.CENTER
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(c, if (to) 40 else 32))
    }

    /** Chip tên bé «(B) Bảo Anh ▾» — chạm mở «Đổi bé / Đăng xuất». */
    fun chipBe(c: Context, ten: String, thuTu: Int, onClick: (View) -> Unit) = LinearLayout(c).apply {
        orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
        background = khoi(c, TRANG, 19, VIEN); bong(this, c, 1f)
        setPadding(dp(c, 4), 0, dp(c, 12), 0)
        addView(vongTen(c, ten.trim().firstOrNull()?.uppercase() ?: "?", thuTu, 30))
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
                if (s != "⌫") { background = RippleDrawable(ColorStateList.valueOf(0x22000000), tron(TRANG, VIEN, c), null); bong(this, c, 1.5f) }
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

    /** Ô mã 6 số dạng 6 ô vuông (ô đang gõ viền xanh) — «7 3 1 _ _ _». */
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
                    i == s.length -> khoi(c, TRANG, 14, XANH, 2)
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
            if (tyLe > 0f) { p.color = XANH; cv.drawArc(r, -90f, 360f * tyLe, false, p) }
        }
    }

    fun gian(c: Context, cao: Int = 12) = View(c).apply { layoutParams = LinearLayout.LayoutParams(1, dp(c, cao)) }
}
