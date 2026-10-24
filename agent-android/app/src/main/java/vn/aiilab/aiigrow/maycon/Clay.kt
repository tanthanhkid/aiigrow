package vn.aiilab.aiigrow.maycon

import android.animation.Keyframe
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.TimeInterpolator
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.animation.PathInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Ngôn ngữ thiết kế «Clay gương» (docs/THIET-KE-CLAY.md) dịch sang View Android: khối đất sét bo lớn, bóng kép (bóng ngoài mềm lệch
 * xuống + viền sáng trên + tối dưới), men gương (mảng men trắng nửa trên nút, dải sáng cong mép trên thẻ), motion «vui» + «ánh men».
 * Thông số lấy từ docs/clay/clay-a-goc-guong.css, M-vui.js, M-anh-men.css. Tắt hoạt ảnh (Trợ năng) ⇒ không nảy, không vệt lướt.
 */
object Clay {
    // Bảng màu gốc (giữ token app): nền, khối, lòng chảo, chữ, ngọc lục bảo, vàng chỉ cho điểm.
    const val NEN = 0xFFECEBE7.toInt()
    const val NEN_DINH = 0xFFE3EBE7.toInt()
    const val THE = 0xFFF7F6F3.toInt()
    const val LOM = 0xFFE9E8E3.toInt()
    const val CHU = 0xFF0F1312.toInt()
    const val CHU2 = 0xFF3A403D.toInt()
    const val CHU3 = 0xFF565C59.toInt()
    const val CHINH = 0xFF0F6B5C.toInt()
    const val CHINH_INK = 0xFF0A5246.toInt()
    const val CHINH_SOFT = 0xFFDCEBE6.toInt()
    const val DIEM_SOFT = 0xFFFBECC0.toInt()
    const val CANH = 0xFF8A3C0C.toInt()
    const val CANH_SOFT = 0xFFF9E7D2.toInt()
    const val LAM_SOFT = 0xFFE1E9FB.toInt()
    const val TIM_SOFT = 0xFFE7E5F8.toInt()
    const val LOI = 0xFFB42318.toInt()

    enum class Kieu { THE, THAN, NGOC, VIEN, LOM, VIEN_TRON }

    fun dp(c: Context, v: Float) = v * c.resources.displayMetrics.density

    /** Người dùng tắt hoạt ảnh (Cài đặt › Trợ năng › Xoá hoạt ảnh) ⇒ chỉ còn đổi ngay / mờ. */
    fun dongTac(): Boolean = ValueAnimator.areAnimatorsEnabled()

    /** Lò xo như withSpring(k, c, m=1): vị trí chuẩn hoá 0→1, vận tốc đầu 0 (cùng công thức loXo() trong M-vui.js). */
    class LoXo(k: Float, c: Float) : TimeInterpolator {
        private val w = sqrt(k)
        private val z = c / (2 * sqrt(k))
        private val wd = w * sqrt(1 - z * z)
        var giay = 0.45f
        override fun getInterpolation(t: Float): Float {
            if (t >= 1f) return 1f
            val s = t * giay
            return (1 - exp(-z * w * s) * (cos(wd * s) + z * w / wd * sin(wd * s))).toFloat()
        }
    }

    fun tha() = LoXo(420f, 14f).apply { giay = 0.42f }    // thả ra: nảy vượt ~8%
    fun vao() = LoXo(260f, 17f).apply { giay = 0.45f }    // nảy vào
    fun bat() = LoXo(500f, 16f).apply { giay = 0.40f }    // bật (pop)
    val MEN = PathInterpolator(.2f, .7f, .2f, 1f)
    private val EP = PathInterpolator(.3f, 0f, .5f, 1f)

    /** Bẹp-nảy khi nhấn + vệt men lướt chéo. Trả false để click vẫn chạy như cũ. */
    @SuppressLint("ClickableViewAccessibility")
    fun nhan(v: View) {
        v.setOnTouchListener { _, e ->
            if (!dongTac() || !v.isEnabled) return@setOnTouchListener false
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    v.animate().scaleX(.96f).scaleY(.93f).setDuration(110).setInterpolator(EP).start()
                    (v.background as? ClayDrawable)?.quetMen()
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL ->
                    v.animate().scaleX(1f).scaleY(1f).setDuration(420).setInterpolator(tha()).start()
            }
            false
        }
    }

    /** Tải trang: các khối vào lần lượt (stagger 55ms, nảy từ dưới lên). Tắt hoạt ảnh ⇒ hiện ngay. */
    fun vaoLanLuot(g: ViewGroup) {
        if (!dongTac()) return
        val d = dp(g.context, 26f)
        for (i in 0 until g.childCount) {
            val v = g.getChildAt(i)
            v.alpha = 0f; v.translationY = d; v.scaleX = .96f; v.scaleY = .96f
            v.animate().alpha(1f).translationY(0f).scaleX(1f).scaleY(1f).setStartDelay(i * 55L).setDuration(450).setInterpolator(vao()).start()
        }
    }

    /** Số đổi ⇒ bật nhẹ (SP.bat). */
    fun batNhe(v: View) {
        if (!dongTac()) return
        v.scaleX = .88f; v.scaleY = .88f
        v.animate().scaleX(1f).scaleY(1f).setStartDelay(0).setDuration(400).setInterpolator(bat()).start()
    }

    /** Ổ khoá «đóng sập» 380ms (M-vui KHOÁ MÁY); khối chứa giật xuống 3dp lúc đập rồi nảy về. */
    fun dongSap(icon: View, khoi: View?) {
        if (!dongTac()) { icon.alpha = 0f; icon.animate().alpha(1f).setDuration(180).start(); return }
        val c = icon.context
        fun ty(vararg p: Pair<Float, Float>) = PropertyValuesHolder.ofKeyframe(View.TRANSLATION_Y, *p.map { Keyframe.ofFloat(it.first, dp(c, it.second)) }.toTypedArray())
        fun sc(prop: android.util.Property<View, Float>, vararg p: Pair<Float, Float>) =
            PropertyValuesHolder.ofKeyframe(prop, *p.map { Keyframe.ofFloat(it.first, it.second) }.toTypedArray())
        ObjectAnimator.ofPropertyValuesHolder(icon,
            ty(0f to 0f, .3f to -9f, .53f to 2f, .75f to 0f, 1f to 0f),
            sc(View.SCALE_X, 0f to 1f, .3f to 1.3f, .53f to .85f, .75f to 1.08f, 1f to 1f),
            sc(View.SCALE_Y, 0f to 1f, .3f to 1.3f, .53f to 1.1f, .75f to .94f, 1f to 1f),
        ).setDuration(380).start()
        khoi?.let { k ->
            k.animate().translationY(dp(c, 3f)).setStartDelay(200).setDuration(60).withEndAction {
                k.animate().translationY(0f).setStartDelay(0).setDuration(420).setInterpolator(tha()).start()
            }.start()
        }
    }

    /** Icon minh hoạ Fluent 3D trong viên clay tròn. */
    fun vien(c: Context, hinh: Int, nen: Int = THE, coDp: Int = 48): FrameLayout {
        val bd = ClayDrawable(c, Kieu.VIEN_TRON, nen)
        return FrameLayout(c).apply {
            background = bd
            val anh = ImageView(c).apply { setImageResource(hinh); scaleType = ImageView.ScaleType.FIT_CENTER; importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO }
            val ic = (coDp * 0.58f).let { dp(c, it).toInt() }
            addView(anh, FrameLayout.LayoutParams(ic, ic, android.view.Gravity.CENTER))
            val r = Rect().also { bd.getPadding(it) }
            layoutParams = ViewGroup.MarginLayoutParams(dp(c, coDp.toFloat()).toInt() + r.left + r.right, dp(c, coDp.toFloat()).toInt() + r.top + r.bottom)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
    }
}

/**
 * Khối đất sét gương vẽ tay. Chừa lề trong bounds cho bóng ngoài (getPadding cộng lề này + đệm nội dung), nên View đặt nền này tự có đệm.
 * Bóng ngoài dùng setShadowLayer — vẽ bằng phần cứng từ Android 9; Android 8 không có bóng ngoài, phần men vẫn đủ.
 */
class ClayDrawable(c: Context, val kieu: Clay.Kieu, private val mau: Int = Clay.THE, boDp: Float = -1f, private val dem: Int = -1) : Drawable() {
    private val d = c.resources.displayMetrics.density
    private fun s(v: Float) = v * d
    private val tron = kieu == Clay.Kieu.VIEN_TRON
    private val bo = s(if (boDp >= 0) boDp else when (kieu) { Clay.Kieu.THE -> 32f; Clay.Kieu.LOM -> 24f; Clay.Kieu.THAN, Clay.Kieu.NGOC, Clay.Kieu.VIEN -> 22f; Clay.Kieu.VIEN_TRON -> 999f })
    private val lon = kieu == Clay.Kieu.THE
    // lề cho bóng: thẻ lớn bóng dài hơn nút
    private val le = when (kieu) {
        Clay.Kieu.LOM -> Rect(0, 0, 0, 0)
        Clay.Kieu.THE -> Rect(s(6f).toInt(), s(3f).toInt(), s(6f).toInt(), s(16f).toInt())
        else -> Rect(s(4f).toInt(), s(2f).toInt(), s(4f).toInt(), s(10f).toInt())
    }
    private val demNoi = if (dem >= 0) s(dem.toFloat()).toInt() else when (kieu) { Clay.Kieu.THE -> s(18f).toInt(); Clay.Kieu.LOM -> s(14f).toInt(); Clay.Kieu.VIEN_TRON -> 0; else -> s(16f).toInt() }

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val r = RectF()
    private val duong = Path()
    private val tam = Path()

    /** Tiến trình vệt men lướt: <0 = không vẽ. */
    private var quet = -1f
    private var anQuet: ValueAnimator? = null

    fun quetMen() {
        anQuet?.cancel()
        anQuet = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = if (lon) 450 else 420
            interpolator = PathInterpolator(.3f, .6f, .2f, 1f)
            addUpdateListener { quet = it.animatedValue as Float; invalidateSelf() }
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) { quet = -1f; invalidateSelf() }
            })
            start()
        }
    }

    override fun getPadding(padding: Rect): Boolean {
        padding.set(le.left + demNoi, le.top + demNoi, le.right + demNoi, le.bottom + demNoi)
        return true
    }

    private fun boThat() = if (tron) r.height() / 2 else minOf(bo, r.height() / 2)

    override fun draw(cv: Canvas) {
        val b = bounds
        r.set(b.left + le.left.toFloat(), b.top + le.top.toFloat(), b.right - le.right.toFloat(), b.bottom - le.bottom.toFloat())
        if (r.width() <= 0 || r.height() <= 0) return
        val k = boThat()
        duong.reset(); duong.addRoundRect(r, k, k, Path.Direction.CW)

        // 1. bóng ngoài kép (khối thu vào để bóng không loang ngang — như spread âm của CSS)
        if (kieu != Clay.Kieu.LOM) {
            val (mau1, mau2) = when (kieu) {
                Clay.Kieu.THAN -> 0x99 to 0x0F1312
                Clay.Kieu.NGOC -> 0xA6 to 0x0A5246
                else -> (if (lon) 0x55 else 0x60) to 0x1C201E
            }
            p.shader = null; p.style = Paint.Style.FILL; p.color = mauNen()
            val co = if (lon) s(7f) else s(4f)
            // bóng phải nằm gọn trong lề (dy + blur − co ≤ lề dưới), không thì View cắt thành mép vuông
            p.setShadowLayer(if (lon) s(11f) else s(7f), 0f, if (lon) s(9f) else s(6f), (mau1 shl 24) or mau2)
            cv.drawRoundRect(r.left + co, r.top + co, r.right - co, r.bottom - co, k, k, p)
            p.setShadowLayer(if (lon) s(5f) else s(3f), 0f, if (lon) s(3f) else s(2f), (0x38 shl 24) or mau2)
            cv.drawRoundRect(r.left + s(2f), r.top + s(2f), r.right - s(2f), r.bottom, k, k, p)
            p.clearShadowLayer()
        }

        val luu = cv.save()
        cv.clipPath(duong)
        // 2. nền
        p.shader = when (kieu) {
            Clay.Kieu.THAN -> LinearGradient(0f, r.top, 0f, r.bottom, 0xFF2E3533.toInt(), 0xFF121615.toInt(), Shader.TileMode.CLAMP)
            Clay.Kieu.NGOC -> LinearGradient(0f, r.top, 0f, r.bottom, 0xFF0F6B5C.toInt(), 0xFF08463D.toInt(), Shader.TileMode.CLAMP)
            else -> null
        }
        p.color = mauNen()
        cv.drawRect(r, p)

        // 3. men
        when (kieu) {
            Clay.Kieu.THE -> {
                doc(cv, floatArrayOf(0f, .26f, .6f, 1f), intArrayOf(0xFFFEFEFD.toInt(), 0x00FEFEFD, 0x06282C2A, 0x12282C2A))
                // dải sáng cong sát mép trên
                elip(cv, r.centerX(), r.top + s(3f), r.width() * .46f, s(18f), intArrayOf(0xFFFFFFFF.toInt(), 0xF2FFFFFF.toInt(), 0x00FFFFFF), floatArrayOf(0f, .62f, .78f))
            }
            Clay.Kieu.VIEN -> doc(cv, floatArrayOf(0f, .44f, .5f, 1f), intArrayOf(0xFFFFFFFF.toInt(), 0xD9FFFFFF.toInt(), 0x00E8E7E2, 0x0D282C2A))
            Clay.Kieu.THAN, Clay.Kieu.NGOC -> {
                val tren = if (kieu == Clay.Kieu.NGOC) 0x57 else 0x4D
                // khối cao (thẻ) thì mảng men mỏng và nhẹ hơn, để không thành một dải đầu thẻ
                val cao = r.height() > s(100f)
                doc(cv, if (cao) floatArrayOf(0f, .1f, .12f, 1f) else floatArrayOf(0f, .24f, .26f, 1f),
                    intArrayOf(((if (cao) 0x38 else tren) shl 24) or 0xFFFFFF, 0x0DFFFFFF, 0x00FFFFFF, 0x00FFFFFF))
                val sang = if (kieu == Clay.Kieu.NGOC) 0x6650DCBE else 0x59788C87
                elip(cv, r.centerX(), r.bottom + r.height() * .05f, r.width() * .6f, r.height() * .4f, intArrayOf(sang, sang and 0x00FFFFFF), floatArrayOf(0f, 1f))
            }
            Clay.Kieu.VIEN_TRON -> {
                elip(cv, r.centerX(), r.top + r.height() * .18f, r.width() * .6f, r.height() * .34f, intArrayOf(0xF2FFFFFF.toInt(), 0x00FFFFFF), floatArrayOf(0f, 1f))
                elip(cv, r.centerX(), r.top + r.height() * .92f, r.width() * .5f, r.height() * .2f, intArrayOf(0x80FFFFFF.toInt(), 0x00FFFFFF), floatArrayOf(0f, 1f))
            }
            Clay.Kieu.LOM -> {
                // lòng chảo ấn lõm: tối mép trên, sáng mép dưới
                to(cv, LinearGradient(0f, r.top, 0f, r.top + s(9f), 0x24282C2A, 0x00282C2A, Shader.TileMode.CLAMP))
            }
        }

        // 4. viền men: sáng mép trên (inset 0 1.5 0 #fff), tối mép dưới
        val dayVien = s(1.5f)
        when (kieu) {
            Clay.Kieu.LOM -> vienDuoi(cv, k, dayVien, 0xF2FFFFFF.toInt())
            Clay.Kieu.THAN, Clay.Kieu.NGOC -> { vienTren(cv, k, s(1f), 0x73FFFFFF); vienDuoi(cv, k, s(2f), 0x66000000) }
            else -> {
                vienTren(cv, k, dayVien, 0xFFFFFFFF.toInt())
                if (lon) vienDuoi(cv, k, s(2f), 0xB3FFFFFF.toInt())
                to(cv, LinearGradient(0f, r.bottom - s(if (lon) 12f else 8f), 0f, r.bottom, 0x00282C2A, if (lon) 0x24282C2A else 0x29282C2A, Shader.TileMode.CLAMP))
            }
        }

        // 5. vệt men lướt chéo (105°)
        if (quet >= 0f) {
            val w = r.width()
            val x0 = r.left - .2f * w + (-1.1f + 2.2f * quet) * w * 1.4f
            val nhat = kieu == Clay.Kieu.THAN || kieu == Clay.Kieu.NGOC
            val dinh = if (nhat) 0x8CFFFFFF.toInt() else 0xFFFFFFFF.toInt()
            val g = LinearGradient(x0, r.top, x0 + 1.4f * w * .966f, r.top + 1.4f * w * .259f,
                intArrayOf(0x00FFFFFF, 0x1AFFFFFF, dinh, 0x29FFFFFF, 0x00FFFFFF), floatArrayOf(.34f, .42f, .49f, .54f, .62f), Shader.TileMode.CLAMP)
            to(cv, g)
        }
        p.shader = null
        cv.restoreToCount(luu)
    }

    private fun mauNen() = when (kieu) {
        Clay.Kieu.THAN -> 0xFF1A1F1E.toInt()
        Clay.Kieu.NGOC -> Clay.CHINH
        Clay.Kieu.LOM -> Clay.LOM
        else -> mau
    }

    private fun doc(cv: Canvas, vt: FloatArray, m: IntArray) {
        to(cv, LinearGradient(0f, r.top, 0f, r.bottom, m, vt, Shader.TileMode.CLAMP))
    }

    /** Tô một lớp shader lên khối (màu paint về đen đặc để alpha của lớp trước không lẫn vào). */
    private fun to(cv: Canvas, sh: Shader) { p.color = 0xFF000000.toInt(); p.shader = sh; cv.drawRect(r, p) }

    private val mt = Matrix()
    private fun elip(cv: Canvas, cx: Float, cy: Float, rx: Float, ry: Float, m: IntArray, vt: FloatArray) {
        if (rx <= 0 || ry <= 0) return
        val g = RadialGradient(cx, cy, rx, m, vt, Shader.TileMode.CLAMP)
        mt.reset(); mt.setScale(1f, ry / rx, cx, cy); g.setLocalMatrix(mt)
        to(cv, g)
    }

    private fun vienTren(cv: Canvas, k: Float, day: Float, mau: Int) {
        tam.reset(); tam.addRoundRect(r.left, r.top + day, r.right, r.bottom + day, k, k, Path.Direction.CW)
        val v = Path(duong).apply { op(tam, Path.Op.DIFFERENCE) }
        p.shader = null; p.color = mau; cv.drawPath(v, p)
    }

    private fun vienDuoi(cv: Canvas, k: Float, day: Float, mau: Int) {
        tam.reset(); tam.addRoundRect(r.left, r.top - day, r.right, r.bottom - day, k, k, Path.Direction.CW)
        val v = Path(duong).apply { op(tam, Path.Op.DIFFERENCE) }
        p.shader = null; p.color = mau; cv.drawPath(v, p)
    }

    override fun setAlpha(alpha: Int) { p.alpha = alpha }
    override fun setColorFilter(colorFilter: ColorFilter?) { p.colorFilter = colorFilter }
    @Deprecated("Deprecated in Java")
    override fun getOpacity() = PixelFormat.TRANSLUCENT
}
