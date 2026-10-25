package vn.aiilab.aiigrow.maycon

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import vn.aiilab.aiigrow.maycon.logic.BanMoi
import vn.aiilab.aiigrow.maycon.logic.canCapNhat
import vn.aiilab.aiigrow.maycon.logic.chuyenHuongHopLe
import vn.aiilab.aiigrow.maycon.logic.docBanMoi
import vn.aiilab.aiigrow.maycon.logic.khopSha256
import vn.aiilab.aiigrow.maycon.logic.loiApk
import vn.aiilab.aiigrow.maycon.logic.urlDauHopLe
import vn.aiilab.aiigrow.maycon.logic.vanTayChungChi
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * App Con TỰ cập nhật (từ 0.2.2): hỏi `GET <máy chủ>/api/agent/ban-moi?platform=android` lúc mở app + mỗi 6 giờ (WorkManager, cần mạng).
 * Có versionCode cao hơn ⇒ tải APK qua https (chỉ theo chuyển hướng tới GitHub Release aiigrow-tai), KIỂM sha256 của manifest + đúng gói +
 * đúng versionCode + chữ ký APK trùng chữ ký app đang chạy, rồi cài bằng PackageInstaller:
 *  • Device Owner ⇒ cài im lặng (DPC được cài/cập nhật không hỏi);
 *  • không ⇒ Android hiện hộp xác nhận (cần «Cài ứng dụng không rõ nguồn» cho AiiGrow) + thông báo «Có bản AiiGrow mới».
 * Sai bất kỳ bước nào ⇒ xoá tệp, không cài, lần sau thử lại. Đang khoá / đếm ngược ⇒ hoãn 30 phút (cài đè làm app khởi động lại).
 * Chặn không lỏng khi cập nhật: app tạm dừng (Device Owner) do hệ thống giữ; dịch vụ nhịp bật lại ngay nhờ MY_PACKAGE_REPLACED (KhoiDong).
 */
object CapNhat {
    private const val TAG = "AiiGrowCapNhat"
    private const val KENH = "cap_nhat"
    private const val MA_TB = 8
    private const val TOI_DA_BYTE = 200L * 1024 * 1024
    const val VIEC_DINH_KY = "aiigrow-cap-nhat"
    const val VIEC_NGAY = "aiigrow-cap-nhat-ngay"
    private const val VIEC_HOAN = "aiigrow-cap-nhat-hoan"

    enum class KetQua { KHONG_CO, DA_GUI_CAI, CHO_QUYEN, HOAN, LOI }

    private val canMang = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    /** Hẹn kiểm định kỳ 6 giờ (giữ lịch cũ nếu đã có). Gọi lúc app khởi động. */
    fun henDinhKy(ctx: Context) {
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(VIEC_DINH_KY, ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<ViecCapNhat>(6, TimeUnit.HOURS).setConstraints(canMang).build())
    }

    /** Kiểm ngay (lúc mở app; `epHoi` = Ba Mẹ bấm «Cập nhật ngay» ⇒ hỏi xác nhận lại dù vừa hỏi); trễ `phut` phút nếu > 0 (hoãn vì đang khoá). */
    fun chayNgay(ctx: Context, phut: Long = 0, epHoi: Boolean = false) {
        val r = OneTimeWorkRequestBuilder<ViecCapNhat>().setConstraints(canMang).setInputData(workDataOf(EP_HOI to epHoi))
            .apply { if (phut > 0) setInitialDelay(phut, TimeUnit.MINUTES) }.build()
        // lượt ngay: KEEP — app mở + Application.onCreate cùng gọi; ba việc (định kỳ / ngay / hoãn) chạy đè nhau thì `khoa` chặn lượt thứ hai
        if (epHoi) WorkManager.getInstance(ctx).enqueueUniqueWork(VIEC_NGAY, ExistingWorkPolicy.APPEND_OR_REPLACE, r)
        else if (phut > 0) WorkManager.getInstance(ctx).enqueueUniqueWork(VIEC_HOAN, ExistingWorkPolicy.REPLACE, r)
        else WorkManager.getInstance(ctx).enqueueUniqueWork(VIEC_NGAY, ExistingWorkPolicy.KEEP, r)
    }

    private const val EP_HOI = "epHoi"
    private const val HOI_LAI_MS = 6 * 3600_000L   // không phải Device Owner: hộp xác nhận tự bật lại tối đa mỗi 6 giờ (Con bấm Huỷ thì thôi tới lượt sau)
    private val choPhepHttp get() = BuildConfig.CHO_PHEP_HTTP   // chỉ bản debug: thử với máy chủ localhost (http://10.0.2.2:…)
    private val khoa = java.util.concurrent.atomic.AtomicBoolean(false)

    private fun thuMuc(ctx: Context) = File(ctx.noBackupFilesDir, "cap-nhat").apply { mkdirs() }

    /** Một lượt kiểm + tải + cài. Chạy trên luồng nền (Worker). Lượt khác đang chạy (định kỳ / ngay / hoãn trùng giờ) ⇒ bỏ lượt này. */
    fun kiem(ctx: Context, epHoi: Boolean = false): KetQua {
        if (!khoa.compareAndSet(false, true)) return KetQua.KHONG_CO
        try { return kiem1(ctx, epHoi) } finally { khoa.set(false) }
    }

    private fun kiem1(ctx: Context, epHoi: Boolean): KetQua {
        val k = Kho(ctx)
        val mayChu = k.mayChu.trimEnd('/')
        val b = try { layManifest(mayChu) } catch (e: Exception) { Log.i(TAG, "không lấy được manifest: ${e.message}"); return KetQua.LOI }
        if (!canCapNhat(b, BuildConfig.VERSION_CODE.toLong())) {
            thuMuc(ctx).listFiles()?.forEach { it.delete() }   // bản đã cài xong / manifest lùi bản ⇒ dọn tệp cũ
            k.banMoiCho = null; huyThongBao(ctx)
            return KetQua.KHONG_CO
        }
        b!!
        if (!urlDauHopLe(b.url, mayChu, choPhepHttp)) { Log.w(TAG, "URL APK không trên máy chủ ${mayChu}: ${b.url}"); return KetQua.LOI }
        val tep = File(thuMuc(ctx), "aiigrow-con-${b.versionCode}.apk")
        thuMuc(ctx).listFiles()?.filter { it != tep }?.forEach { it.delete() }
        try {
            if (!khopSha256(tep, b.sha256)) {
                tep.delete()
                tai(b.url, mayChu, tep)
                if (!khopSha256(tep, b.sha256)) { tep.delete(); Log.w(TAG, "sha256 APK ${b.version} không khớp manifest — xoá, không cài"); return KetQua.LOI }
            }
            kiemApk(ctx, tep, b)?.let { tep.delete(); Log.w(TAG, "APK ${b.version} bị loại: $it — xoá, không cài"); return KetQua.LOI }
        } catch (e: Exception) { tep.delete(); Log.i(TAG, "tải APK ${b.version} lỗi: ${e.message}"); return KetQua.LOI }

        k.banMoiCho = b.version
        if (dangKhoa(k)) { Log.i(TAG, "đang khoá / đếm ngược — hoãn cài ${b.version} 30 phút"); chayNgay(ctx, 30); return KetQua.HOAN }
        val laDo = QuanTri.laDeviceOwner(ctx)
        if (!laDo && Build.VERSION.SDK_INT >= 26 && !ctx.packageManager.canRequestPackageInstalls()) {
            thongBao(ctx, b, "Có bản AiiGrow mới ${b.version}",
                "Ba Mẹ chạm vào đây, bật «Cho phép từ nguồn này» cho AiiGrow để cập nhật.",
                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${ctx.packageName}")))
            return KetQua.CHO_QUYEN
        }
        // không phải Device Owner: đã hỏi trong 6 giờ qua (Con bấm Huỷ / chưa trả lời) ⇒ giữ tệp, chờ Ba Mẹ bấm «Cập nhật ngay» hoặc lượt sau
        if (!laDo && !epHoi && System.currentTimeMillis() - k.lanHoiCai in 0 until HOI_LAI_MS) return KetQua.CHO_QUYEN
        return try { if (cai(ctx, tep, b, laDo, k)) KetQua.DA_GUI_CAI else KetQua.HOAN }
        catch (e: Exception) { tep.delete(); k.banMoiCho = null; Log.w(TAG, "PackageInstaller lỗi", e); KetQua.LOI }
    }

    fun dangKhoa(k: Kho): Boolean = k.khoaTu != 0L || HienThi.doc(k.hienThi)?.let { it.dangKhoaThat || it.demNguoc > 0 } == true

    private fun mo(url: String): HttpURLConnection = (URL(url).openConnection() as HttpURLConnection).apply {
        instanceFollowRedirects = false   // tự theo từng chặng để kiểm host mỗi chặng
        connectTimeout = 15_000; readTimeout = 30_000
        setRequestProperty("User-Agent", "AiiGrowCon-Android/${BuildConfig.VERSION_NAME}")
    }

    private fun layManifest(mayChu: String): BanMoi? {
        val c = mo("$mayChu/api/agent/ban-moi?platform=android").apply { setRequestProperty("Accept", "application/json") }
        try {
            if (c.responseCode != 200) throw IOException("manifest HTTP ${c.responseCode}")
            return docBanMoi(c.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }, choPhepHttp)
        } finally { c.disconnect() }
    }

    /** Tải tới `dich` qua tối đa 5 chặng chuyển hướng, mỗi chặng phải qua `chuyenHuongHopLe`; giới hạn 200 MB. */
    private fun tai(url0: String, mayChu: String, dich: File) {
        var url = url0
        repeat(6) {
            if (!chuyenHuongHopLe(url, mayChu, choPhepHttp)) throw IOException("chuyển hướng tới nơi không cho phép: ${URI(url).host}")
            val c = mo(url)
            try {
                val ma = c.responseCode
                if (ma in 300..399) { url = URL(URL(url), c.getHeaderField("Location") ?: throw IOException("thiếu Location")).toString(); return@repeat }
                if (ma != 200) throw IOException("tải APK HTTP $ma")
                if (c.contentLengthLong > TOI_DA_BYTE) throw IOException("APK quá lớn")
                val tam = File(dich.parentFile, dich.name + ".tai")
                var tong = 0L
                c.inputStream.use { i -> tam.outputStream().use { o ->
                    val buf = ByteArray(64 * 1024)
                    while (true) { val n = i.read(buf); if (n < 0) break; tong += n; if (tong > TOI_DA_BYTE) throw IOException("APK quá lớn"); o.write(buf, 0, n) }
                } }
                if (!tam.renameTo(dich)) { tam.delete(); throw IOException("không ghi được tệp APK") }
                return
            } finally { c.disconnect() }
        }
        throw IOException("chuyển hướng quá nhiều chặng")
    }

    /** Lý do APK không được cài (sai gói / versionCode / chữ ký), null = được cài. */
    fun kiemApk(ctx: Context, tep: File, b: BanMoi): String? {
        val pm = ctx.packageManager
        @Suppress("DEPRECATION")
        val co = if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
        val moi = pm.getPackageArchiveInfo(tep.path, co) ?: return "không đọc được APK"
        val hienTai = pm.getPackageInfo(ctx.packageName, co)
        // Android 8.x có thể không đọc được chữ ký của APK chưa cài (chỉ ký v2/v3) ⇒ nhường hệ thống: cài đè khác khoá vẫn bị Android từ chối
        return loiApk(moi.packageName, maBan(moi), lichSuKy(moi), ctx.packageName, kyHienTai(hienTai), b, khongDocDuocKy = Build.VERSION.SDK_INT < 28)
    }

    @Suppress("DEPRECATION")
    private fun maBan(p: PackageInfo): Long = if (Build.VERSION.SDK_INT >= 28) p.longVersionCode else p.versionCode.toLong()

    /** Chứng chỉ ký nội dung APK của app đang chạy (không gồm chứng chỉ cũ trước khi xoay khoá). */
    @Suppress("DEPRECATION")
    private fun kyHienTai(p: PackageInfo): List<String> =
        if (Build.VERSION.SDK_INT >= 28) p.signingInfo?.apkContentsSigners.orEmpty().map { vanTayChungChi(it.toByteArray()) }
        else p.signatures.orEmpty().map { vanTayChungChi(it.toByteArray()) }

    /** Lịch sử ký của APK mới (gồm chứng chỉ trước khi xoay khoá — chữ ký v3). */
    @Suppress("DEPRECATION")
    private fun lichSuKy(p: PackageInfo): List<String> {
        if (Build.VERSION.SDK_INT < 28) return p.signatures.orEmpty().map { vanTayChungChi(it.toByteArray()) }
        val s = p.signingInfo ?: return emptyList()
        val ds = if (s.hasMultipleSigners()) s.apkContentsSigners else s.signingCertificateHistory
        return ds.orEmpty().map { vanTayChungChi(it.toByteArray()) }
    }

    /** Mở phiên cài và commit. false = vừa vào khoá trong lúc ghi ⇒ bỏ phiên, hoãn 30 phút. */
    private fun cai(ctx: Context, tep: File, b: BanMoi, laDo: Boolean, k: Kho): Boolean {
        val pi = ctx.packageManager.packageInstaller
        // phiên cũ chưa xong của chính app (hộp xác nhận trước còn treo) ⇒ bỏ, chỉ một hộp xác nhận một lúc
        for (s in pi.mySessions) try { pi.abandonSession(s.sessionId) } catch (_: Exception) {}
        val p = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(ctx.packageName)
            setSize(tep.length())
            if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val id = pi.createSession(p)
        try {
            pi.openSession(id).use { s ->
                tep.inputStream().use { i -> s.openWrite("aiigrow-con.apk", 0, tep.length()).use { o -> i.copyTo(o); s.fsync(o) } }
                // xét khoá lần nữa ngay trước commit: cài đè khởi động lại app giữa lúc khoá / đếm ngược
                if (dangKhoa(k)) { s.abandon(); Log.i(TAG, "vừa vào khoá — hoãn cài ${b.version} 30 phút"); chayNgay(ctx, 30); return false }
                val nhan = Intent(ctx, NhanKetQuaCai::class.java).setPackage(ctx.packageName).putExtra("ban", b.version)
                // FLAG_MUTABLE bắt buộc: hệ thống điền EXTRA_STATUS / EXTRA_INTENT vào intent kết quả
                val co = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                Log.i(TAG, "cài ${b.version} (versionCode ${b.versionCode}) — ${if (laDo) "Device Owner, im lặng" else "chờ xác nhận"}")
                if (!laDo) k.lanHoiCai = System.currentTimeMillis()
                s.commit(PendingIntent.getBroadcast(ctx, id, nhan, co).intentSender)
            }
            return true
        } catch (e: Exception) { try { pi.abandonSession(id) } catch (_: Exception) {}; throw e }
    }

    fun xoaTep(ctx: Context) { thuMuc(ctx).listFiles()?.forEach { it.delete() } }

    fun thongBao(ctx: Context, b: BanMoi?, tieuDe: String, noi: String, mo: Intent) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(
            NotificationChannel(KENH, "Cập nhật AiiGrow", NotificationManager.IMPORTANCE_DEFAULT).apply { description = "Có bản AiiGrow mới cần xác nhận" })
        val pi = PendingIntent.getActivity(ctx, b?.versionCode?.toInt() ?: 0, mo.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        try {
            nm.notify(MA_TB, NotificationCompat.Builder(ctx, KENH).setSmallIcon(R.drawable.ic_aiigrow).setColor(0xFF1F8A70.toInt())
                .setContentTitle(tieuDe).setContentText(noi).setStyle(NotificationCompat.BigTextStyle().bigText(noi))
                .setContentIntent(pi).setAutoCancel(true).build())
        } catch (e: SecurityException) { Log.i(TAG, "chưa có quyền thông báo") }
    }

    fun huyThongBao(ctx: Context) { (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(MA_TB) }
}

/** WorkManager: một lượt kiểm cập nhật. Lỗi mạng / tải ⇒ thành công (đợi lượt định kỳ kế), không thử dồn dập. */
class ViecCapNhat(ctx: Context, p: WorkerParameters) : Worker(ctx, p) {
    override fun doWork(): Result {
        CapNhat.kiem(applicationContext, inputData.getBoolean("epHoi", false))
        return Result.success()
    }
}

/** Kết quả PackageInstaller. Cần xác nhận ⇒ thông báo + thử mở hộp xác nhận; lỗi ⇒ xoá tệp, lượt sau thử lại. */
class NhanKetQuaCai : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val ban = i.getStringExtra("ban") ?: "mới"
        when (val st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION") val xn: Intent = (if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                    else i.getParcelableExtra(Intent.EXTRA_INTENT)) ?: return
                CapNhat.thongBao(c, null, "Có bản AiiGrow mới $ban", "Chạm để cập nhật AiiGrow (Ba Mẹ quản lý máy này).", Intent(xn))
                try { c.startActivity(xn.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e: Exception) { Log.i("AiiGrowCapNhat", "chưa mở được hộp xác nhận từ nền — chờ chạm thông báo") }
            }
            PackageInstaller.STATUS_SUCCESS -> { CapNhat.xoaTep(c); CapNhat.huyThongBao(c); Kho(c).banMoiCho = null }
            // Con / Ba Mẹ bấm Huỷ: giữ tệp đã kiểm (không tải lại), thẻ «Cập nhật ngay» còn; tự hỏi lại sau 6 giờ
            PackageInstaller.STATUS_FAILURE_ABORTED -> Log.i("AiiGrowCapNhat", "huỷ cài $ban — giữ tệp, hỏi lại sau")
            else -> {
                Kho(c).banMoiCho = null
                Log.w("AiiGrowCapNhat", "cài $ban không xong ($st): ${i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)} — xoá tệp, lần sau thử lại")
                CapNhat.xoaTep(c)
            }
        }
    }
}
