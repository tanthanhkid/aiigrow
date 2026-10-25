package vn.aiilab.aiigrow.maycon

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.UserManager
import android.util.Log
import vn.aiilab.aiigrow.maycon.logic.QuyetDinh

/**
 * Áp quyết định lên máy. Hai đường:
 *  • Device Owner: setPackagesSuspended (app hiện xám «Đã tạm dừng», không ẩn), setLockTaskPackages cho màn khoá, hạn chế người dùng,
 *    cấu hình quản lý Chrome, DNS riêng tư, lockNow.
 *  • Không reset (Device Admin + Trợ năng): ghi danh sách chặn cho TroNang (phủ màn chặn khi app bị chặn lên tiền cảnh), lockNow nếu là admin.
 */
object ThucThi {
    private const val TAG = "AiiGrowThucThi"

    /** Một lần sau khi thành Device Owner. Không đặt DISALLOW_DEBUGGING_FEATURES (giữ adb cho Ba Mẹ / kỹ thuật). */
    fun caiDatDeviceOwner(ctx: Context) {
        val d = QuanTri.dpm(ctx); val a = QuanTri.ten(ctx)
        val k = Kho(ctx)
        if (k.daCaiDatDo) return
        try {
            d.setLockTaskPackages(a, arrayOf(ctx.packageName))
            if (Build.VERSION.SDK_INT >= 28) d.setLockTaskFeatures(a,
                DevicePolicyManager.LOCK_TASK_FEATURE_GLOBAL_ACTIONS or DevicePolicyManager.LOCK_TASK_FEATURE_SYSTEM_INFO)
            for (r in listOf(UserManager.DISALLOW_ADD_USER, UserManager.DISALLOW_SAFE_BOOT, UserManager.DISALLOW_CONFIG_DATE_TIME,
                UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES_GLOBALLY.takeIf { Build.VERSION.SDK_INT >= 29 } ?: UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES)) {
                d.addUserRestriction(a, r)
            }
            if (Build.VERSION.SDK_INT >= 30) d.setAutoTimeEnabled(a, true)
            if (Build.VERSION.SDK_INT >= 33) d.setPermissionGrantState(a, ctx.packageName, Manifest.permission.POST_NOTIFICATIONS,
                DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED)
            // Trợ năng AiiGrow luôn được phép (Device Owner không bật hộ được; Con/Ba Mẹ bật trong Cài đặt nếu muốn màn phủ).
            d.setPermittedAccessibilityServices(a, null)
            k.daCaiDatDo = true
        } catch (e: Exception) { NhatKy.canh(TAG, "cài đặt Device Owner lỗi", e) }
    }

    fun apDung(ctx: Context, qd: QuyetDinh, goiChan: Set<String>, khoaThat: Boolean, webChan: List<String>) {
        val k = Kho(ctx)
        if (QuanTri.laDeviceOwner(ctx)) {
            caiDatDeviceOwner(ctx)
            val d = QuanTri.dpm(ctx); val a = QuanTri.ten(ctx)
            val cu = k.goiDaTamDung
            val tha = (cu - goiChan).toTypedArray()
            if (tha.isNotEmpty()) d.setPackagesSuspended(a, tha, false)
            val loi = if (goiChan.isNotEmpty()) d.setPackagesSuspended(a, goiChan.toTypedArray(), true).toSet() else emptySet()
            // gói chưa cài / gói hệ thống bắt buộc trả về «không tạm dừng được» — không ghi là đã tạm dừng
            k.goiDaTamDung = goiChan - loi
            if (loi != k.goiKhongDung) { k.goiKhongDung = loi; if (loi.isNotEmpty()) NhatKy.tin(TAG, "không tạm dừng được: $loi") }   // chỉ ghi khi đổi
            datWebChrome(ctx, webChan)
            if (khoaThat && qd.khoaCaMay && k.daLockNow != k.khoaTu) { k.daLockNow = k.khoaTu; d.lockNow() }
        } else {
            k.goiDaTamDung = emptySet()   // đường không reset: TroNang đọc HienThi.goiChan
            if (khoaThat && qd.khoaCaMay && QuanTri.laAdmin(ctx) && k.daLockNow != k.khoaTu) {
                k.daLockNow = k.khoaTu
                try { QuanTri.dpm(ctx).lockNow() } catch (e: SecurityException) { NhatKy.canh(TAG, "lockNow", e) }
            }
        }
    }

    /** Cấu hình quản lý Chrome: URLBlocklist (chỉ Device Owner). */
    private fun datWebChrome(ctx: Context, web: List<String>) {
        val k = Kho(ctx)
        val khoa = web.sorted().joinToString(",")
        if (k.webDaDat == khoa) return
        try {
            val b = Bundle().apply { if (web.isNotEmpty()) putStringArray("URLBlocklist", web.toTypedArray()) }
            QuanTri.dpm(ctx).setApplicationRestrictions(QuanTri.ten(ctx), "com.android.chrome", b)
            k.webDaDat = khoa
        } catch (e: Exception) { NhatKy.canh(TAG, "Chrome restrictions", e) }
    }

    /** DNS riêng tư gia đình (Device Owner, API 29+). Trả mô tả kết quả. Gọi trên luồng nền (Android tự kiểm máy chủ DNS). */
    fun datPrivateDns(ctx: Context, host: String?): String {
        if (host.isNullOrBlank()) return "không có DNS gia đình"
        if (!QuanTri.laDeviceOwner(ctx)) return "không phải Device Owner — Ba Mẹ đặt tay: Cài đặt › Mạng › DNS riêng tư › $host"
        if (Build.VERSION.SDK_INT < 29) return "Android < 10 không có DNS riêng tư"
        val k = Kho(ctx)
        if (k.privateDnsDaDat == host) return "đã đặt $host"
        return try {
            val r = QuanTri.dpm(ctx).setGlobalPrivateDnsModeSpecifiedHost(QuanTri.ten(ctx), host)
            if (r == DevicePolicyManager.PRIVATE_DNS_SET_NO_ERROR) { k.privateDnsDaDat = host; "đã đặt $host" } else "lỗi đặt DNS ($r)"
        } catch (e: Exception) { "lỗi đặt DNS: ${e.message}" }
    }

    /** Gỡ từ xa (lệnh «go»): thả mọi chặn, bỏ hạn chế, thôi Device Owner. Không xoá dữ liệu máy. */
    fun goHet(ctx: Context) {
        val k = Kho(ctx)
        if (QuanTri.laDeviceOwner(ctx)) {
            val d = QuanTri.dpm(ctx); val a = QuanTri.ten(ctx)
            try {
                if (k.goiDaTamDung.isNotEmpty()) d.setPackagesSuspended(a, k.goiDaTamDung.toTypedArray(), false)
                for (r in listOf(UserManager.DISALLOW_ADD_USER, UserManager.DISALLOW_SAFE_BOOT, UserManager.DISALLOW_CONFIG_DATE_TIME,
                    UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES_GLOBALLY.takeIf { Build.VERSION.SDK_INT >= 29 } ?: UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES)) d.clearUserRestriction(a, r)
                d.setApplicationRestrictions(a, "com.android.chrome", Bundle())
                if (Build.VERSION.SDK_INT >= 29) d.setGlobalPrivateDnsModeOpportunistic(a)
                d.setLockTaskPackages(a, arrayOf())
                @Suppress("DEPRECATION") d.clearDeviceOwnerApp(ctx.packageName)
            } catch (e: Exception) { NhatKy.canh(TAG, "gỡ Device Owner", e) }
        } else if (QuanTri.laAdmin(ctx)) {
            QuanTri.dpm(ctx).removeActiveAdmin(QuanTri.ten(ctx))
        }
        k.xoaHet()
    }
}
