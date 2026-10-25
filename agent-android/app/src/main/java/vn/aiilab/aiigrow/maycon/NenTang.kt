package vn.aiilab.aiigrow.maycon

import android.app.Activity
import android.app.Application
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.PersistableBundle
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Khởi động: hẹn WorkManager 15 phút (dự phòng khi hệ điều hành dừng dịch vụ) + kiểm bản mới (CapNhatApp.kt). */
class UngDung : Application() {
    override fun onCreate() {
        super.onCreate()
        NhatKy.gan(this)
        DichVuNhip.taoKenh(this)
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("aiigrow-nhip", ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<ViecNhip>(15, TimeUnit.MINUTES).build())
        // tự cập nhật: kiểm mỗi 6 giờ + ngay mỗi lần tiến trình khởi động (mở app, khởi động máy, sau khi cập nhật để dọn tệp cũ)
        CapNhat.henDinhKy(this)
        CapNhat.chayNgay(this)
    }
}

/** WorkManager định kỳ: đảm bảo dịch vụ tiền cảnh còn chạy (Doze / bị buộc dừng). Dịch vụ tự gửi nhịp khi chạy lại. */
class ViecNhip(ctx: Context, p: WorkerParameters) : Worker(ctx, p) {
    override fun doWork(): Result {
        val k = Kho(applicationContext)
        if (k.daGhep || k.tokenGoiCai != null) DichVuNhip.batDau(applicationContext)
        return Result.success()
    }
}

/** Bật lại sau khởi động máy / cập nhật app. */
class KhoiDong : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val k = Kho(c)
        if (k.daGhep || k.tokenGoiCai != null || QuanTri.laDeviceOwner(c)) DichVuNhip.batDau(c)
    }
}

/**
 * Cài Device Owner bằng QR (Android 10+): hệ thống hỏi chế độ (GET_PROVISIONING_MODE ⇒ máy được quản lý hoàn toàn) rồi mở
 * ADMIN_POLICY_COMPLIANCE với extras trong QR (aiigrow_token, aiigrow_may_chu) ⇒ lưu, bật dịch vụ ⇒ dịch vụ tự ghép bằng ghep-goi.
 */
class ManCaiDat : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        when (intent?.action) {
            "android.app.action.GET_PROVISIONING_MODE" -> {
                val r = Intent()
                if (Build.VERSION.SDK_INT >= 29) r.putExtra(DevicePolicyManager.EXTRA_PROVISIONING_MODE, DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE)
                setResult(RESULT_OK, r)
            }
            "android.app.action.ADMIN_POLICY_COMPLIANCE" -> {
                val b: PersistableBundle? = if (Build.VERSION.SDK_INT >= 33)
                    intent.getParcelableExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE, PersistableBundle::class.java)
                else @Suppress("DEPRECATION") intent.getParcelableExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE)
                QuanTri.luuExtras(this, b)
                ThucThi.caiDatDeviceOwner(this)
                DichVuNhip.batDau(this)
                setResult(RESULT_OK)
            }
            else -> setResult(RESULT_CANCELED)
        }
        finish()
    }
}
