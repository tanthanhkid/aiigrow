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
import org.json.JSONObject
import vn.aiilab.aiigrow.maycon.logic.CO_ICON_PX
import vn.aiilab.aiigrow.maycon.logic.chonIcon
import vn.aiilab.aiigrow.maycon.logic.docDsJson
import vn.aiilab.aiigrow.maycon.logic.docThieuIcon
import vn.aiilab.aiigrow.maycon.logic.dsJson
import vn.aiilab.aiigrow.maycon.logic.iconSauGui
import vn.aiilab.aiigrow.maycon.logic.sha256Hex
import vn.aiilab.aiigrow.maycon.logic.CHU_KY_QUET_MS
import vn.aiilab.aiigrow.maycon.logic.TinHieuDanhSach
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
    /** Máy chủ trả 404 (chưa có /ung-dung) ⇒ nghỉ tới mốc này rồi thử lại (dịch vụ chạy hàng tuần, máy chủ có thể lên sau). */
    @Volatile private var nghiDen = 0L
    /** Phản hồi nhịp đã đọc gần nhất (tránh đọc lại JSON mỗi 5 giây). */
    private var phanHoiDaDoc: String? = null
    private var tinHieu: TinHieuDanhSach? = null
    /** Phản hồi nhịp có từ trước lần gửi được cuối ⇒ `bam` trong đó đã cũ, coi như máy chủ giữ bam mình vừa gửi. */
    private var phanHoiLucGui: String? = null

    /** Gói được cài / gỡ / cập nhật (receiver của DichVuNhip). */
    fun coSuKienGoi(goi: String?) { if (goi != ctx.packageName) suKienGoiLuc.set(System.currentTimeMillis()) }

    /** Gọi mỗi vòng nhịp: chạy [buoc] trên luồng riêng (quét + POST có thể mất hàng chục giây), không chồng lượt. */
    fun kich(k: Kho) {
        if (System.currentTimeMillis() < nghiDen || k.token == null || k.cheDoThu) return
        if (!dangChay.compareAndSet(false, true)) return
        try {
            luong.execute { try { buoc(k) } catch (e: Exception) { Log.w(TAG, "danh sách app lỗi", e) } finally { dangChay.set(false) } }
        } catch (e: Exception) { dangChay.set(false) }
    }

    fun dung() { luong.shutdownNow() }

    /** Một bước: xét tín hiệu nhịp + chu kỳ + sự kiện gói ⇒ quét ⇒ gửi đủ / phần đổi. */
    private fun buoc(k: Kho) {
        val now = System.currentTimeMillis()
        val ph = k.phanHoi
        if (ph != phanHoiDaDoc) { phanHoiDaDoc = ph; tinHieu = docTinHieuDanhSach(ph) }
        val t = if (ph != null && ph == phanHoiLucGui) tinHieu?.copy(bam = k.dsAppBam) else tinHieu
        val suKien = suKienGoiLuc.get()
        // nenQuet không cần dấu theo khoa ⇒ chỉ đọc JSON dấu khi thật sự quét
        val thieu = docDsJson(k.dsAppThieuIcon)
        if (!nenQuet(t, DaGui(k.dsAppBam, emptyMap(), k.dsAppYeuCau, thieuIcon = thieu), lanQuetCuoi, suKien, now, soLanLoi)) return
        val g = DaGui(k.dsAppBam, docDauJson(k.dsAppDau), k.dsAppYeuCau, docDauJson(k.dsAppIcon), thieu)
        lanQuetCuoi = now
        var ok = false
        try {
            val ds = chuanDanhSach(quet(), ctx.packageName)
            val bam = bamDanhSach(ds)
            val mc = MayChu(k.mayChu, k.token)
            /** Lưu sau khi gửi được; `guiIcon` = khoa vừa gửi kèm icon, `r` = phản hồi 200 (đọc `thieuIcon`). */
            fun luu(guiIcon: Set<String>, r: JSONObject?) {
                val thieuMoi = docThieuIcon(r)
                k.luuDsApp(bam, dauJson(dauTheoKhoa(ds)), t?.yeuCau, dauJson(iconSauGui(ds, guiIcon, g.iconDaGui, thieuMoi)), dsJson(thieuMoi))
                phanHoiLucGui = ph
            }
            fun guiDu() {
                val gui = chonIcon(ds, g.iconDaGui, g.thieuIcon)
                luu(gui.filter { it.icon != null }.map { it.khoa }.toSet(), mc.ungDung(thanGuiDu(gui, bam)))
            }
            when (val c = cachGui(t, g, ds, bam)) {
                CachGui.KhongGui -> { if (t?.bam == bam || g.thieuIcon.isNotEmpty()) luu(emptySet(), null) }
                CachGui.Du -> guiDu()
                is CachGui.Doi -> try {
                    val them = chonIcon(c.phan.them, g.iconDaGui, g.thieuIcon)
                    luu(them.filter { it.icon != null }.map { it.khoa }.toSet(), mc.ungDung(thanGuiDoi(c.bamTruoc, bam, c.phan.copy(them = them))))
                } catch (e: MayChu.Loi) {
                    if (e.http == 409 || e.ma == "can_gui_du") guiDu() else throw e
                }
            }
            ok = true
            Log.i(TAG, "danh sách app: ${ds.size} app, bam ${bam.take(8)}")
        } catch (e: MayChu.Loi) {
            if (e.http == 404) { nghiDen = System.currentTimeMillis() + CHU_KY_QUET_MS; Log.i(TAG, "máy chủ chưa có /ung-dung — thử lại sau 30 phút") }
            else Log.w(TAG, "gửi danh sách app lỗi ${e.http} ${e.ma}")
        } catch (e: Exception) { Log.i(TAG, "quét / gửi danh sách app lỗi — thử lại sau: ${e.message}") }
        if (ok) {
            soLanLoi = 0
            suKienGoiLuc.compareAndSet(suKien, 0)   // sự kiện tới trong lúc gửi thì giữ lại cho lượt sau
        } else soLanLoi++
    }

    /** App mở được từ trình khởi chạy (cần <queries> launcher trong manifest để thấy app khác trên Android 11+), kèm icon thật + iconBam. */
    private fun quet(): List<AppMay> {
        val pm = ctx.packageManager
        return DoPhut.appLauncher(ctx).map { ai ->   // chính AiiGrow Con bị chuanDanhSach bỏ
            val goi = ai.packageName
            AppMay(
                khoa = goi, muc = goi,
                ten = try { pm.getApplicationLabel(ai).toString() } catch (_: Exception) { goi },
                nhaPhatHanh = nguoiCai(pm, goi),
                phienBan = try {
                    if (Build.VERSION.SDK_INT >= 33) pm.getPackageInfo(goi, PackageManager.PackageInfoFlags.of(0)).versionName
                    else @Suppress("DEPRECATION") pm.getPackageInfo(goi, 0).versionName
                } catch (_: Exception) { null },
            ).let { a ->
                // Icon thật từ PackageManager (AdaptiveIconDrawable vẽ cả nền + tiền cảnh qua draw()); quá cỡ ⇒ chuanDanhSach bỏ.
                val png = try { iconPng(pm.getApplicationIcon(ai)) } catch (_: Exception) { null }
                if (png == null) a else a.copy(icon = Base64.encodeToString(png, Base64.NO_WRAP), iconBam = sha256Hex(png))
            }
        }
    }

    private fun nguoiCai(pm: PackageManager, goi: String): String? = try {
        if (Build.VERSION.SDK_INT >= 30) pm.getInstallSourceInfo(goi).installingPackageName
        else @Suppress("DEPRECATION") pm.getInstallerPackageName(goi)
    } catch (_: Exception) { null }

    private fun iconPng(d: android.graphics.drawable.Drawable): ByteArray {
        val b = Bitmap.createBitmap(CO_ICON, CO_ICON, Bitmap.Config.ARGB_8888)
        val c = Canvas(b)
        d.setBounds(0, 0, CO_ICON, CO_ICON); d.draw(c)
        val o = ByteArrayOutputStream()
        b.compress(Bitmap.CompressFormat.PNG, 100, o)
        b.recycle()
        return o.toByteArray()
    }

    companion object {
        private const val TAG = "AiiGrowDsApp"
        private const val CO_ICON = CO_ICON_PX
    }
}
