package vn.aiilab.aiigrow.maycon

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import vn.aiilab.aiigrow.maycon.logic.GOI_LUON_CHO

/**
 * Đường KHÔNG cần khôi phục gốc: dịch vụ Trợ năng chỉ nghe «cửa sổ tiền cảnh đổi sang app nào» (không đọc nội dung màn hình —
 * canRetrieveWindowContent=false). App bị chặn lên tiền cảnh ⇒ về màn hình chính + phủ màn chặn. Khoá cả máy ⇒ phủ màn khoá.
 * Android ghi rõ trong Cài đặt › Trợ năng rằng AiiGrow đang bật; Con / Ba Mẹ tắt được — tắt thì nhịp báo `troNang=false` cho Ba Mẹ.
 */
class TroNang : AccessibilityService() {
    private val h = Handler(Looper.getMainLooper())
    private var phu: GiaoDien.ManKhoaView? = null
    private var goiTienCanh: String? = null
    private var phuGoi: String? = null

    override fun onServiceConnected() { dangChay = this; DichVuNhip.batDau(this); xet() }
    override fun onDestroy() { an(); if (dangChay === this) dangChay = null; super.onDestroy() }
    override fun onInterrupt() {}

    override fun onAccessibilityEvent(e: AccessibilityEvent?) {
        if (e?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val g = e.packageName?.toString() ?: return
        if (g == "com.android.systemui") return
        goiTienCanh = g
        xet()
    }

    /** Device Owner: setPackagesSuspended đã chặn — trợ năng chỉ phủ khi KHÔNG là Device Owner. */
    private fun xet() {
        if (QuanTri.laDeviceOwner(this)) { an(); return }
        val ht = HienThi.doc(Kho(this).hienThi) ?: run { an(); return }
        val g = goiTienCanh
        when {
            ht.khoaCaMay && ht.dangKhoaThat && (g == null || g !in GOI_LUON_CHO) -> hien(ht, null)
            g != null && g in ht.goiChan -> { performGlobalAction(GLOBAL_ACTION_HOME); hien(ht, g) }
            else -> an()
        }
    }

    private fun hien(ht: HienThi, goi: String?) {
        val v = phu ?: GiaoDien.ManKhoaView(this,
            onXin = { an(); startActivity(Intent(this, ManChinh::class.java).putExtra("xin", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) },
            onVe = { an(); performGlobalAction(GLOBAL_ACTION_HOME) },
        ).also {
            phu = it
            val lp = WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.OPAQUE)
            (getSystemService(WINDOW_SERVICE) as WindowManager).addView(it.goc, lp)
        }
        phuGoi = goi
        v.ve(ht, goi)
        v.nutVe?.visibility = if (ht.khoaCaMay && ht.dangKhoaThat) android.view.View.GONE else android.view.View.VISIBLE
    }

    private fun an() {
        phu?.let { try { (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(it.goc) } catch (_: Exception) {} }
        phu = null; phuGoi = null
    }

    companion object {
        @Volatile private var dangChay: TroNang? = null

        /** Dịch vụ nhịp gọi sau mỗi vòng (luồng bất kỳ). */
        fun capNhat() { dangChay?.let { s -> s.h.post { s.xet() } } }

        fun dangBat(ctx: Context): Boolean {
            val ds = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
            val ten = ComponentName(ctx, TroNang::class.java)
            return ds.split(':').any { ComponentName.unflattenFromString(it) == ten }
        }
    }
}
