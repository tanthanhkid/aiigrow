package vn.aiilab.aiigrow.maycon

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import vn.aiilab.aiigrow.maycon.logic.TrangThai

/**
 * Màn khoá / hết giờ + đếm ngược. Device Owner: khoá cả máy (khoá ngay, giờ ngủ) ⇒ chế độ khoá tác vụ (lock task — chỉ AiiGrow, vẫn có
 * menu nguồn để gọi khẩn cấp). Hết giờ / ngoài khung: chỉ app giải trí bị tạm dừng ⇒ Con bấm «Về màn hình chính» dùng app học.
 */
class ManKhoa : Activity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var v: GiaoDien.ManKhoaView
    private var dangLockTask = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        dangMo = this
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (android.os.Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(false); setTurnScreenOn(false) }
        v = GiaoDien.ManKhoaView(this, onXin = { startActivity(Intent(this, ManChinh::class.java).putExtra("xin", true)) }, onVe = { veNha() })
        setContentView(v.goc)
    }

    override fun onResume() { super.onResume(); h.post(veLai) }
    override fun onPause() { super.onPause(); h.removeCallbacks(veLai) }
    override fun onDestroy() { if (dangMo === this) dangMo = null; super.onDestroy() }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { if (HienThi.doc(Kho(this).hienThi)?.khoaCaMay != true) super.onBackPressed() }

    private fun veNha() {
        Kho(this).let { it.daBoQua = it.khoaTu }
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }

    private val veLai = object : Runnable {
        override fun run() {
            val ht = HienThi.doc(Kho(this@ManKhoa).hienThi)
            val conKhoa = ht != null && ht.trangThai in KHOA
            if (!conKhoa) { thoatLockTask(); finish(); return }
            v.ve(ht!!)
            v.nutVe?.visibility = if (ht.khoaCaMay) android.view.View.GONE else android.view.View.VISIBLE
            if (ht.khoaCaMay && ht.dangKhoaThat && QuanTri.laDeviceOwner(this@ManKhoa) && !dangLockTask) {
                try { startLockTask(); dangLockTask = true } catch (_: Exception) {}
            }
            h.postDelayed(this, 1000)
        }
    }

    private fun thoatLockTask() { if (dangLockTask) try { stopLockTask(); dangLockTask = false } catch (_: Exception) {} }

    companion object {
        @Volatile var dangMo: ManKhoa? = null
        val KHOA = setOf(TrangThai.KHOA_NGAY.name, TrangThai.GIO_NGU.name, TrangThai.HET_GIO.name, TrangThai.NGOAI_KHUNG.name)
    }
}
