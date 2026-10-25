package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.util.Log
import vn.aiilab.aiigrow.maycon.logic.LOG_GIU_DONG
import vn.aiilab.aiigrow.maycon.logic.LOG_MOI_LAN
import vn.aiilab.aiigrow.maycon.logic.SU_KIEN_GIU
import vn.aiilab.aiigrow.maycon.logic.SU_KIEN_MOI_LAN
import vn.aiilab.aiigrow.maycon.logic.catDong
import vn.aiilab.aiigrow.maycon.logic.dongLog
import vn.aiilab.aiigrow.maycon.logic.dongSuKien
import vn.aiilab.aiigrow.maycon.logic.thanGui
import java.io.File
import java.time.Instant
import java.util.UUID

/**
 * Nhật ký agent + sự kiện, gửi lên máy chủ như agent-win (LogShipWorker / hàng đợi sự kiện): Ba Mẹ (Máy › Nhật ký) và AiiLab đọc được
 * lỗi từ xa. Chỉ câu agent tự ghi (không nội dung màn hình). Ghi tệp trong filesDir (mất mạng vẫn giữ, gửi bù), gửi từ DichVuNhip.
 */
object NhatKy {
    private const val TAG = "AiiGrow"
    private val khoa = Any()
    @Volatile private var ctx: Context? = null

    fun gan(c: Context) { ctx = c.applicationContext }
    private fun tepLog(c: Context) = File(c.filesDir, "nhat-ky-cho-gui.jsonl")
    private fun tepSuKien(c: Context) = File(c.filesDir, "su-kien-cho-gui.jsonl")

    fun tin(nguon: String, s: String) { Log.i(nguon, s); ghi("tin", nguon, s) }
    fun canh(nguon: String, s: String, e: Throwable? = null) { Log.w(nguon, s, e); ghi("canh", nguon, s + (e?.let { " — ${it.javaClass.simpleName}: ${it.message}" } ?: "")) }
    fun loi(nguon: String, s: String, e: Throwable? = null) { Log.e(nguon, s, e); ghi("loi", nguon, s + (e?.let { " — ${it.javaClass.simpleName}: ${it.message}" } ?: "")) }

    private fun ghi(muc: String, nguon: String, s: String) {
        val c = ctx ?: return
        them(tepLog(c), dongLog(Instant.now().toString(), muc, nguon, s), LOG_GIU_DONG)
    }

    /** Sự kiện cho Ba Mẹ (loại phải có trong SU_KIEN_MAY của máy chủ, vd mo_ma_offline). `ma` sinh một lần ⇒ gửi lại không trùng. */
    fun suKien(c: Context, loai: String, chiTiet: Map<String, String> = emptyMap()) {
        them(tepSuKien(c), dongSuKien(UUID.randomUUID().toString(), loai, Instant.now().toString(), chiTiet), SU_KIEN_GIU)
        tin("SuKien", "sự kiện $loai")
    }

    private fun them(f: File, dong: String, toiDa: Int) = synchronized(khoa) {
        try {
            f.appendText(dong + "\n")
            // cắt bớt thỉnh thoảng (tệp vượt ~1,5 lần) để không đọc lại cả tệp mỗi dòng
            if (f.length() > toiDa * 600L) f.writeText(catDong(f.readLines(), toiDa).joinToString("\n", postfix = "\n"))
        } catch (e: Exception) { Log.w(TAG, "ghi hàng đợi", e) }
    }

    /** Gửi hết hàng đợi (luồng nền, sau nhịp thành công). Lỗi ⇒ giữ nguyên, lần sau gửi. */
    fun gui(c: Context, may: MayChu) {
        guiTep(tepSuKien(c), SU_KIEN_MOI_LAN) { may.suKien(it) }
        guiTep(tepLog(c), LOG_MOI_LAN) { may.log(it) }
    }

    private fun guiTep(f: File, moiLan: Int, goi: (org.json.JSONObject) -> Unit) {
        repeat(20) {   // tối đa 20 lô / lượt
            val lo = synchronized(khoa) { if (!f.exists()) emptyList() else f.readLines().filter { it.isNotBlank() }.take(moiLan) }
            if (lo.isEmpty()) return
            try { goi(thanGui(lo)) } catch (e: Exception) { Log.i(TAG, "chưa gửi được hàng đợi: ${e.message}"); return }
            // bỏ đúng các dòng vừa gửi; dòng mới ghi trong lúc gửi vẫn giữ
            // (tệp bị cắt bớt trong lúc gửi ⇒ đầu tệp không còn là lô này: bỏ theo nội dung — mỗi dòng có thời điểm / mã riêng)
            synchronized(khoa) {
                val ds = f.readLines().filter { it.isNotBlank() }
                val conLai = if (ds.take(lo.size) == lo) ds.drop(lo.size) else lo.toSet().let { da -> ds.filterNot { it in da } }
                f.writeText(conLai.joinToString("") { it + "\n" })
            }
        }
    }
}
