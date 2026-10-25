package vn.aiilab.aiigrow.maycon

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import vn.aiilab.aiigrow.maycon.logic.GoiCai
import vn.aiilab.aiigrow.maycon.logic.LoaiSuKien
import vn.aiilab.aiigrow.maycon.logic.SuKienDung
import vn.aiilab.aiigrow.maycon.logic.demTienCanh
import java.time.Instant
import java.time.ZoneId

/** UsageStatsManager ⇒ phút tiền cảnh theo app (đếm thuần ở logic/DemPhut.kt). */
object DoPhut {
    fun coQuyen(ctx: Context): Boolean {
        val ao = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val m = if (Build.VERSION.SDK_INT >= 29) ao.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
        else @Suppress("DEPRECATION") ao.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
        return m == AppOpsManager.MODE_ALLOWED
    }

    /** ms tiền cảnh theo gói từ 0 giờ hôm nay (theo múi giờ gia đình) tới `now`. */
    fun homNay(ctx: Context, tz: String, now: Long = System.currentTimeMillis()): Map<String, Long> {
        if (!coQuyen(ctx)) return emptyMap()
        val z = try { ZoneId.of(tz) } catch (_: Exception) { ZoneId.of("Asia/Ho_Chi_Minh") }
        val dau = Instant.ofEpochMilli(now).atZone(z).toLocalDate().atStartOfDay(z).toInstant().toEpochMilli()
        val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val ev = usm.queryEvents(dau, now)
        val ds = ArrayList<SuKienDung>()
        val e = UsageEvents.Event()
        while (ev.hasNextEvent()) {
            ev.getNextEvent(e)
            val loai = when (e.eventType) {
                1 -> LoaiSuKien.MO       // ACTIVITY_RESUMED / MOVE_TO_FOREGROUND
                2 -> LoaiSuKien.DONG     // ACTIVITY_PAUSED / MOVE_TO_BACKGROUND
                16 -> LoaiSuKien.TAT_MAN // SCREEN_NON_INTERACTIVE (API 28)
                else -> null
            } ?: continue
            ds.add(SuKienDung(e.packageName ?: "", loai, e.timeStamp))
        }
        return demTienCanh(ds, dau, now).filterKeys { it.isNotEmpty() && it != ctx.packageName }
    }

    /** App mở được từ trình khởi chạy — dùng chung cho «chưa xếp» (daCai) và danh sách app gửi Ba Mẹ (DanhSachApp). */
    fun appLauncher(ctx: Context): List<ApplicationInfo> {
        val pm = ctx.packageManager
        val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val ds = if (Build.VERSION.SDK_INT >= 33) pm.queryIntentActivities(i, PackageManager.ResolveInfoFlags.of(0))
        else @Suppress("DEPRECATION") pm.queryIntentActivities(i, 0)
        return ds.map { it.activityInfo.applicationInfo }.distinctBy { it.packageName }
    }

    /** App mở được từ trình khởi chạy (để xét «chưa xếp»). */
    fun daCai(ctx: Context): List<GoiCai> {
        return appLauncher(ctx).map {
            GoiCai(it.packageName, (it.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0)
        }
    }

    fun tenApp(ctx: Context, goi: String): String = try {
        val pm = ctx.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(goi, 0)).toString()
    } catch (_: Exception) { goi }
}
