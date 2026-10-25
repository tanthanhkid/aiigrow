package vn.aiilab.aiigrow.maycon

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import vn.aiilab.aiigrow.maycon.logic.AppMay
import vn.aiilab.aiigrow.maycon.logic.CachGui
import vn.aiilab.aiigrow.maycon.logic.DaGui
import vn.aiilab.aiigrow.maycon.logic.bamDanhSach
import vn.aiilab.aiigrow.maycon.logic.cachGui
import vn.aiilab.aiigrow.maycon.logic.chuanDanhSach
import vn.aiilab.aiigrow.maycon.logic.dauJson
import vn.aiilab.aiigrow.maycon.logic.dauTheoKhoa
import vn.aiilab.aiigrow.maycon.logic.docDauJson
import vn.aiilab.aiigrow.maycon.logic.docTinHieuDanhSach
import vn.aiilab.aiigrow.maycon.logic.nenQuet
import vn.aiilab.aiigrow.maycon.logic.thanGuiDoi
import vn.aiilab.aiigrow.maycon.logic.thanGuiDu
import java.io.ByteArrayOutputStream

/**
 * Gửi danh sách app đã cài THẬT (app có biểu tượng ở trình khởi chạy) lên POST /api/device/ung-dung để Ba Mẹ chọn chặn / cho phép.
 * Chạy trên luồng nhịp của DichVuNhip (gọi [buoc] mỗi vòng). Lỗi mạng ⇒ thử lại lượt sau, không làm hỏng nhịp.
 */
class DanhSachApp(private val ctx: Context) {
    private var lanQuetCuoi = 0L
    @Volatile private var suKienGoiLuc = 0L
    /** Máy chủ cũ trả 404 ⇒ thôi gửi tới lần khởi động dịch vụ sau. */
    private var mayChuKhongHoTro = false

    private val nhanGoi = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            if (i.getStringExtra(Intent.EXTRA_PACKAGE_NAME) != ctx.packageName && i.data?.schemeSpecificPart != ctx.packageName) suKienGoiLuc = System.currentTimeMillis()
        }
    }

    fun dangKy() {
        val f = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED); addAction(Intent.ACTION_PACKAGE_REMOVED); addAction(Intent.ACTION_PACKAGE_REPLACED)
            addDataScheme("package")
        }
        try { ContextCompat.registerReceiver(ctx, nhanGoi, f, ContextCompat.RECEIVER_NOT_EXPORTED) } catch (e: Exception) { Log.w(TAG, "không nghe được sự kiện gói", e) }
    }

    fun huyDangKy() { try { ctx.unregisterReceiver(nhanGoi) } catch (_: Exception) {} }

    /** Một bước: xét tín hiệu nhịp + chu kỳ + sự kiện gói ⇒ quét ⇒ gửi đủ / phần đổi. */
    fun buoc(k: Kho) {
        if (mayChuKhongHoTro || k.token == null || k.cheDoThu) return
        val now = System.currentTimeMillis()
        val t = docTinHieuDanhSach(k.phanHoi)
        val g = DaGui(k.dsAppBam, docDauJson(k.dsAppDau), k.dsAppYeuCau)
        val suKien = suKienGoiLuc
        if (!nenQuet(t, g, lanQuetCuoi, suKien, now)) return
        lanQuetCuoi = now
        if (suKien != 0L && suKienGoiLuc == suKien) suKienGoiLuc = 0
        val ds = try { chuanDanhSach(quet(), ctx.packageName) } catch (e: Exception) { Log.w(TAG, "quét app lỗi", e); return }
        val bam = bamDanhSach(ds)
        val mc = MayChu(k.mayChu, k.token)
        fun luu() { k.dsAppBam = bam; k.dsAppDau = dauJson(dauTheoKhoa(ds)); t?.yeuCau?.let { k.dsAppYeuCau = it } }
        fun guiDu() { mc.ungDung(thanGuiDu(ds, bam)); luu() }
        try {
            when (val c = cachGui(t, g, ds, bam)) {
                CachGui.KhongGui -> { if (t?.bam == bam) luu() }
                CachGui.Du -> guiDu()
                is CachGui.Doi -> try { mc.ungDung(thanGuiDoi(c.bamTruoc, bam, c.phan)); luu() } catch (e: MayChu.Loi) {
                    if (e.http == 409 || e.ma == "can_gui_du") guiDu() else throw e
                }
            }
            Log.i(TAG, "danh sách app: ${ds.size} app, bam ${bam.take(8)}")
        } catch (e: MayChu.Loi) {
            if (e.http == 404) { mayChuKhongHoTro = true; Log.i(TAG, "máy chủ chưa có /ung-dung — thôi gửi tới lần khởi động sau") }
            else Log.w(TAG, "gửi danh sách app lỗi ${e.http} ${e.ma}")
        } catch (e: Exception) { Log.i(TAG, "gửi danh sách app lỗi mạng — thử lại lượt sau: ${e.message}") }
    }

    /** App mở được từ trình khởi chạy (cần <queries> launcher trong manifest để thấy app khác trên Android 11+). */
    private fun quet(): List<AppMay> {
        val pm = ctx.packageManager
        val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val ds = if (Build.VERSION.SDK_INT >= 33) pm.queryIntentActivities(i, PackageManager.ResolveInfoFlags.of(0))
        else @Suppress("DEPRECATION") pm.queryIntentActivities(i, 0)
        return ds.map { it.activityInfo.applicationInfo }.distinctBy { it.packageName }.filter { it.packageName != ctx.packageName }.map { ai ->
            val goi = ai.packageName
            AppMay(
                khoa = goi, muc = goi,
                ten = try { pm.getApplicationLabel(ai).toString() } catch (_: Exception) { goi },
                nhaPhatHanh = nguoiCai(pm, goi),
                phienBan = try {
                    if (Build.VERSION.SDK_INT >= 33) pm.getPackageInfo(goi, PackageManager.PackageInfoFlags.of(0)).versionName
                    else @Suppress("DEPRECATION") pm.getPackageInfo(goi, 0).versionName
                } catch (_: Exception) { null },
                icon = try { iconPng(pm.getApplicationIcon(ai)) } catch (_: Exception) { null },
            )
        }
    }

    private fun nguoiCai(pm: PackageManager, goi: String): String? = try {
        if (Build.VERSION.SDK_INT >= 30) pm.getInstallSourceInfo(goi).installingPackageName
        else @Suppress("DEPRECATION") pm.getInstallerPackageName(goi)
    } catch (_: Exception) { null }

    private fun iconPng(d: android.graphics.drawable.Drawable): String {
        val b = Bitmap.createBitmap(CO_ICON, CO_ICON, Bitmap.Config.ARGB_8888)
        val c = Canvas(b)
        d.setBounds(0, 0, CO_ICON, CO_ICON); d.draw(c)
        val o = ByteArrayOutputStream()
        b.compress(Bitmap.CompressFormat.PNG, 100, o)
        b.recycle()
        return Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP)
    }

    companion object {
        private const val TAG = "AiiGrowDsApp"
        private const val CO_ICON = 32
    }
}
