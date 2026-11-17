package vn.aiilab.aiigrow.maycon

import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.view.View
import android.view.ViewGroup

/**
 * Chất liệu phong cách E «Ánh kim» (17/11): neumorphism kem + vàng kim loại.
 *  NOI  = thẻ/nút kem CÙNG màu nền, nổi bằng bóng đôi (tối lệch xuống-phải, sáng lệch lên-trái);
 *  LOM  = ô chọn / ô nhập lõm (bóng trong);
 *  KIM  = vàng kim gradient 135° (nút chính, huy hiệu) kèm bóng tối nhẹ;
 *  NAVY = khối tối viền vàng mảnh.
 * Bóng vẽ NGOÀI bounds ⇒ `choBong(view)` tắt clipChildren của cha (bóng tối đa ~14dp, nằm trong đệm của cột chứa).
 * Android 8 (API 26) không vẽ setShadowLayer bằng phần cứng ⇒ chỉ mất bóng, màu/gradient vẫn đủ.
 */
class ChatLieu(
    private val kieu: Kieu,
    private val boPx: Float,
    private val tron: Boolean = false,
    private val mau: Int = Diu.NEN,
    private val dp: Float = 1f,
    private val vienKim: Boolean = false,
) : Drawable() {
    enum class Kieu { NOI, LOM, KIM, NAVY }

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val r = RectF()
    private val k get() = if (tron) minOf(r.width(), r.height()) / 2 else minOf(boPx, r.height() / 2)
    private var doTrong = 255

    override fun draw(cv: Canvas) {
        r.set(bounds)
        if (r.width() <= 0 || r.height() <= 0) return
        p.alpha = doTrong
        val bo = k
        val to = if (kieu == Kieu.NOI && boPx >= 20 * dp) 1.25f else 1f  // thẻ lớn bóng dài hơn nút
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
                val duong = Path().apply { addRoundRect(r, bo, bo, Path.Direction.CW) }
                cv.clipPath(duong)
                val khung = Path().apply {
                    fillType = Path.FillType.EVEN_ODD
                    addRect(r.left - 40 * dp, r.top - 40 * dp, r.right + 40 * dp, r.bottom + 40 * dp, Path.Direction.CW)
                    addRoundRect(r, bo, bo, Path.Direction.CW)
                }
                p.color = Diu.BONG
                p.setShadowLayer(6f * dp, 3f * dp, 3f * dp, Diu.BONG)
                cv.drawPath(khung, p)
                p.setShadowLayer(6f * dp, -3f * dp, -3f * dp, Diu.BONG_SANG)
                cv.drawPath(khung, p)
                p.clearShadowLayer()
                cv.restoreToCount(luu)
                if (vienKim) { p.style = Paint.Style.STROKE; p.strokeWidth = 2f * dp; p.color = Diu.KIM_VIEN
                    cv.drawRoundRect(r.left + dp, r.top + dp, r.right - dp, r.bottom - dp, bo, bo, p) }
            }
            Kieu.KIM -> {
                p.style = Paint.Style.FILL; p.color = Diu.KIM_DAM
                p.setShadowLayer(8f * dp, 3f * dp, 4f * dp, Diu.BONG)
                cv.drawRoundRect(r, bo, bo, p)
                p.clearShadowLayer()
                p.shader = LinearGradient(r.left, r.top, r.right, r.bottom,
                    intArrayOf(Diu.KIM_SANG, Diu.KIM, Diu.KIM_DAM, Diu.KIM_NHAT), floatArrayOf(0f, .38f, .72f, 1f), Shader.TileMode.CLAMP)
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
    }

    override fun setAlpha(alpha: Int) { doTrong = alpha; invalidateSelf() }
    override fun getAlpha() = doTrong
    override fun setColorFilter(colorFilter: ColorFilter?) { p.colorFilter = colorFilter }
    @Deprecated("Deprecated in Java")
    override fun getOpacity() = PixelFormat.TRANSLUCENT

    companion object {
        /** Bóng vẽ ngoài bounds: cho cha không cắt con khi view gắn vào cây. */
        fun choBong(v: View) {
            v.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
                override fun onViewAttachedToWindow(x: View) { (x.parent as? ViewGroup)?.apply { clipChildren = false; clipToPadding = false } }
                override fun onViewDetachedFromWindow(x: View) {}
            })
            (v.parent as? ViewGroup)?.apply { clipChildren = false; clipToPadding = false }
        }
    }
}
