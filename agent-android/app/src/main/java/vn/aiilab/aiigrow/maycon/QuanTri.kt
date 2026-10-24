package vn.aiilab.aiigrow.maycon

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PersistableBundle

/**
 * DeviceAdminReceiver — `vn.aiilab.aiigrow.con/vn.aiilab.aiigrow.maycon.QuanTri`.
 *  • Đường mạnh: Device Owner (cài bằng QR trên máy vừa khôi phục gốc, hoặc `dpm set-device-owner` trên máy thử).
 *  • Đường không reset: Device Admin thường (chỉ lockNow + chống gỡ dễ) + UsageStats + Trợ năng.
 */
class QuanTri : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) { DichVuNhip.batDau(context) }

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        // Android 9 trở xuống: extras bundle tới đây. Android 10+: ManCaiDat (ADMIN_POLICY_COMPLIANCE) cũng nhận.
        if (Build.VERSION.SDK_INT >= 22) luuExtras(context, intent.getParcelableExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE))
        DichVuNhip.batDau(context)
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence =
        "Tắt quyền quản trị sẽ báo cho Ba Mẹ và máy được coi là không tuân thủ."

    companion object {
        fun ten(ctx: Context) = ComponentName(ctx, QuanTri::class.java)
        fun dpm(ctx: Context) = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        fun laDeviceOwner(ctx: Context) = dpm(ctx).isDeviceOwnerApp(ctx.packageName)
        fun laAdmin(ctx: Context) = dpm(ctx).isAdminActive(ten(ctx))

        fun luuExtras(ctx: Context, b: PersistableBundle?) {
            if (b == null) return
            val k = Kho(ctx)
            b.getString("aiigrow_token")?.takeIf { it.isNotBlank() }?.let { k.tokenGoiCai = it }
            b.getString("aiigrow_may_chu")?.takeIf { it.startsWith("https://") }?.let { k.mayChu = it }
        }
    }
}
