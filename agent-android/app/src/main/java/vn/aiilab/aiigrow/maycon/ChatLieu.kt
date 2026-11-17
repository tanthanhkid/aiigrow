package vn.aiilab.aiigrow.maycon

import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.view.View
import android.view.ViewGroup
import android.widget.ScrollView
import java.util.Collections
import java.util.WeakHashMap

/**
 * Chất liệu phong cách E «Ánh kim» (17/11): neumorphism kem + vàng kim loại.
 *  NOI  = thẻ/nút kem CÙNG màu nền, nổi bằng bóng đôi (tối lệch xuống-phải, sáng lệch lên-trái);
 *  LOM  = ô chọn / ô nhập lõm (bóng trong);
 *  KIM  = vàng kim gradient 135° (nút chính, huy hiệu) kèm bóng tối nhẹ;
 *  NAVY = khối tối viền vàng mảnh.
 * Bóng vẽ NGOÀI bounds ⇒ `choBong(view)` tắt clipChildren của mọi tầng cha tới ScrollView (một lần mỗi view, bóng ≤ ~20dp nằm trong đệm của cột chứa).
 * Android 8 (API 26) không vẽ setShadowLayer bằng phần cứng ⇒ chỉ mất bóng, màu/gradient vẫn đủ.
 */
class ChatLieu(
    private val kieu: Kieu,
    private val boPx: Float,
    private val tron: Boolean = false,
    private val mau: Int = Diu.NEN,
    private val dp: Float = 1f,
) : Drawable() {
    enum class Kieu { NOI, LOM, KIM, NAVY }

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val r = RectF()
    private var bo = 0f
    private var doTrong = 255
    private val khung = Path()          // LOM: khung ngoài trừ lõi (bóng trong)
    private val loi = Path()            // LOM: lõi bo góc để cắt
    private var kimSh: Shader? = null   // KIM: gradient 135°

    /** Dựng một lần theo kích thước — không cấp phát mỗi khung hình. */
    override fun onBoundsChange(b: Rect) {
        r.set(b)
        bo = if (tron) minOf(r.width(), r.height()) / 2 else minOf(boPx, r.height() / 2)
        loi.reset(); loi.addRoundRect(r, bo, bo, Path.Direction.CW)
        khung.reset(); khung.fillType = Path.FillType.EVEN_ODD
        khung.addRect(r.left - 40 * dp, r.top - 40 * dp, r.right + 40 * dp, r.bottom + 40 * dp, Path.Direction.CW)
        khung.addRoundRect(r, bo, bo, Path.Direction.CW)
        kimSh = if (kieu == Kieu.KIM && r.width() > 0 && r.height() > 0)
            LinearGradient(r.left, r.top, r.right, r.bottom, intArrayOf(Diu.KIM_SANG, Diu.KIM, Diu.KIM_DAM, Diu.KIM_NHAT), floatArrayOf(0f, .38f, .72f, 1f), Shader.TileMode.CLAMP)
        else null
    }

    override fun draw(cv: Canvas) {
        if (r.width() <= 0 || r.height() <= 0) return
        // độ trong suốt áp cho cả khối (kể cả bóng) bằng lớp alpha — không để p.color ghi đè
        val lop = if (doTrong < 255) { val m = 30f * dp; cv.saveLayerAlpha(r.left - m, r.top - m, r.right + m, r.bottom + m, doTrong) } else -1
        val to = if (kieu == Kieu.NOI && boPx >= 20 * dp) 1.25f else 1f  // thẻ lớn bóng bay xa hơn nút
        when (kieu) {
            Kieu.NOI -> {
                p.style = Paint.Style.FILL; p.color = mau
                p.setShadowLayer(10f * dp * to, 6f * dp * to, 6f * dp * to, Diu.BONG)
                cv.drawRoundRect(r, bo, bo, p)
                p.setShadowLayer(10f * dp * to, -5f * dp * to, -5f * dp * to, Diu.BONG_SANG)
                cv.drawRoundRect(r, bo, bo, p)
                p.clearShadowLayer(); cv.drawRoundRect(r, bo, bo, p)
            }
            Kieu.LOM -> {
                p.style = Paint.Style.FILL; p.color = mau; p.clearShadowLayer()
                cv.drawRoundRect(r, bo, bo, p)
                val luu = cv.save()
                cv.clipPath(loi)
                p.color = Diu.BONG
                p.setShadowLayer(6f * dp, 3f * dp, 3f * dp, Diu.BONG)
                cv.drawPath(khung, p)
                p.setShadowLayer(6f * dp, -3f * dp, -3f * dp, Diu.BONG_SANG)
                cv.drawPath(khung, p)
                p.clearShadowLayer()
                cv.restoreToCount(luu)
            }
            Kieu.KIM -> {
                p.style = Paint.Style.FILL; p.color = Diu.KIM_DAM
                p.setShadowLayer(8f * dp, 3f * dp, 4f * dp, Diu.BONG)
                cv.drawRoundRect(r, bo, bo, p)
                p.clearShadowLayer()
                p.shader = kimSh
                cv.drawRoundRect(r, bo, bo, p)
                p.shader = null
            }
            Kieu.NAVY -> {
                p.style = Paint.Style.FILL; p.color = Diu.CHU
                p.setShadowLayer(8f * dp, 3f * dp, 4f * dp, Diu.BONG)
                cv.drawRoundRect(r, bo, bo, p)
                p.clearShadowLayer()
                p.style = Paint.Style.STROKE; p.strokeWidth = dp; p.color = Diu.KIM_HAIR
                cv.drawRoundRect(r.left + dp / 2, r.top + dp / 2, r.right - dp / 2, r.bottom - dp / 2, bo, bo, p)
            }
        }
        if (lop >= 0) cv.restoreToCount(lop)
    }

    override fun setAlpha(alpha: Int) { if (doTrong != alpha) { doTrong = alpha; invalidateSelf() } }
    override fun getAlpha() = doTrong
    override fun setColorFilter(colorFilter: ColorFilter?) { p.colorFilter = colorFilter; invalidateSelf() }
    @Deprecated("Deprecated in Java")
    override fun getOpacity() = PixelFormat.TRANSLUCENT

    companion object {
        private val daDang: MutableSet<View> = Collections.newSetFromMap(WeakHashMap<View, Boolean>())

        private fun moClip(v: View) {
            var cha = v.parent
            var tang = 0
            while (cha is ViewGroup && tang++ < 8) {
                cha.clipChildren = false; cha.clipToPadding = false
                if (cha is ScrollView) break
                cha = cha.parent
            }
        }

        /** Bóng vẽ ngoài bounds: tắt clip của mọi tầng cha (tới ScrollView). Mỗi view chỉ đăng ký MỘT listener. */
        fun choBong(v: View) {
            if (daDang.add(v)) v.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
                override fun onViewAttachedToWindow(x: View) { moClip(x) }
                override fun onViewDetachedFromWindow(x: View) {}
            })
            moClip(v)
        }
    }
}
