package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.util.Base64
import android.util.Log
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
import vn.aiilab.aiigrow.maycon.logic.TOI_DA_ICON_B64
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Gửi danh sách app đã cài THẬT (app có biểu tượng ở trình khởi chạy) lên POST /api/device/ung-dung để Ba Mẹ chọn chặn / cho phép.
 * DichVuNhip gọi [kich] mỗi vòng; việc quét + gửi chạy luồng riêng. Lỗi mạng ⇒ thử lại lượt sau, không làm hỏng nhịp.
 */
class DanhSachApp(private val ctx: Context) {
    private val luong = Executors.newSingleThreadExecutor { r -> Thread(r, "aiigrow-ds-app").apply { isDaemon = true } }
    private val dangChay = AtomicBoolean(false)
    private val suKienGoiLuc = AtomicLong(0)
    private var lanQuetCuoi = 0L
    private var soLanLoi = 0
    /** Máy chủ cũ trả 404 ⇒ thôi gửi tới lần khởi động dịch vụ sau. */
    @Volatile private var mayChuKhongHoTro = false

    /** Gói được cài / gỡ / cập nhật (receiver của DichVuNhip). */
    fun coSuKienGoi(goi: String?) { if (goi != ctx.packageName) suKienGoiLuc.set(System.currentTimeMillis()) }

    /** Gọi mỗi vòng nhịp: chạy [buoc] trên luồng riêng (quét + POST có thể mất hàng chục giây), không chồng lượt. */
    fun kich(k: Kho) {
        if (mayChuKhongHoTro || k.token == null || k.cheDoThu) return
        if (!dangChay.compareAndSet(false, true)) return
        try {
            luong.execute { try { buoc(k) } catch (e: Exception) { Log.w(TAG, "danh sách app lỗi", e) } finally { dangChay.set(false) } }
        } catch (e: Exception) { dangChay.set(false) }
    }

    fun dung() { luong.shutdownNow() }

    /** Một bước: xét tín hiệu nhịp + chu kỳ + sự kiện gói ⇒ quét ⇒ gửi đủ / phần đổi. */
    private fun buoc(k: Kho) {
        val now = System.currentTimeMillis()
        val t = docTinHieuDanhSach(k.phanHoi)
        val g = DaGui(k.dsAppBam, docDauJson(k.dsAppDau), k.dsAppYeuCau)
        val suKien = suKienGoiLuc.get()
        if (!nenQuet(t, g, lanQuetCuoi, suKien, now, soLanLoi)) return
        lanQuetCuoi = now
        var ok = false
        try {
            val ds = chuanDanhSach(quet(), ctx.packageName)
            val bam = bamDanhSach(ds)
            val mc = MayChu(k.mayChu, k.token)
            fun luu() { k.dsAppBam = bam; k.dsAppDau = dauJson(dauTheoKhoa(ds)); t?.yeuCau?.let { k.dsAppYeuCau = it } }
            fun guiDu() { mc.ungDung(thanGuiDu(ds.map(::kemIcon), bam)); luu() }
            when (val c = cachGui(t, g, ds, bam)) {
                CachGui.KhongGui -> { if (t?.bam == bam) luu() }
                CachGui.Du -> guiDu()
                is CachGui.Doi -> try { mc.ungDung(thanGuiDoi(c.bamTruoc, bam, c.phan.copy(them = c.phan.them.map(::kemIcon)))); luu() } catch (e: MayChu.Loi) {
                    if (e.http == 409 || e.ma == "can_gui_du") guiDu() else throw e
                }
            }
            ok = true
            Log.i(TAG, "danh sách app: ${ds.size} app, bam ${bam.take(8)}")
        } catch (e: MayChu.Loi) {
            if (e.http == 404) { mayChuKhongHoTro = true; Log.i(TAG, "máy chủ chưa có /ung-dung — thôi gửi tới lần khởi động sau") }
            else Log.w(TAG, "gửi danh sách app lỗi ${e.http} ${e.ma}")
        } catch (e: Exception) { Log.i(TAG, "quét / gửi danh sách app lỗi — thử lại sau: ${e.message}") }
        if (ok) {
            soLanLoi = 0
            suKienGoiLuc.compareAndSet(suKien, 0)   // sự kiện tới trong lúc gửi thì giữ lại cho lượt sau
        } else soLanLoi++
    }

    /** App mở được từ trình khởi chạy (cần <queries> launcher trong manifest để thấy app khác trên Android 11+). Chưa nạp icon. */
    private fun quet(): List<AppMay> {
        val pm = ctx.packageManager
        return DoPhut.appLauncher(ctx).filter { it.packageName != ctx.packageName }.map { ai ->
            val goi = ai.packageName
            AppMay(
                khoa = goi, muc = goi,
                ten = try { pm.getApplicationLabel(ai).toString() } catch (_: Exception) { goi },
                nhaPhatHanh = nguoiCai(pm, goi),
                phienBan = try {
                    if (Build.VERSION.SDK_INT >= 33) pm.getPackageInfo(goi, PackageManager.PackageInfoFlags.of(0)).versionName
                    else @Suppress("DEPRECATION") pm.getPackageInfo(goi, 0).versionName
                } catch (_: Exception) { null },
            )
        }
    }

    /** Nạp icon chỉ cho app sắp gửi (icon không vào bam). Quá 16 KB base64 thì bỏ icon. */
    private fun kemIcon(a: AppMay): AppMay = try {
        a.copy(icon = iconPng(ctx.packageManager.getApplicationIcon(a.khoa)).takeIf { it.length <= TOI_DA_ICON_B64 })
    } catch (_: Exception) { a }

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
