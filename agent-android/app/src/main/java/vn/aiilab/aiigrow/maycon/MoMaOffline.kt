package vn.aiilab.aiigrow.maycon

import android.content.Context
import vn.aiilab.aiigrow.maycon.logic.KetQuaMoOffline
import vn.aiilab.aiigrow.maycon.logic.MoTamOffline
import vn.aiilab.aiigrow.maycon.logic.TrangThai
import vn.aiilab.aiigrow.maycon.logic.cauMoOffline
import vn.aiilab.aiigrow.maycon.logic.matMang

/**
 * Con gõ mã mở offline Ba Mẹ đọc (giống agent-win AgentRuntime.TryMaOffline): kiểm ngay trên máy bằng bí mật đã nhớ, không cần máy chủ.
 * Đúng ⇒ mở 60 phút + sự kiện «mo_ma_offline»; sai 5 lần trong 10 phút ⇒ chờ + sự kiện «sai_ma_offline». Có mạng lại ⇒ DichVuNhip kết thúc lượt mở.
 */
object MoMaOffline {
    private val khoa = Any()
    /** Trạng thái mã offline gỡ được (mọi khoá + không tuân thủ — máy mất mạng thì Ba Mẹ không gỡ được bằng cách khác). */
    val MO_DUOC = ManKhoa.KHOA + TrangThai.KHONG_TUAN_THU.name

    /** Hiện ô nhập mã: đã ghép, đang ở trạng thái khoá, máy mất mạng (nhịp thành công cuối > 3 phút). */
    fun nenHien(ctx: Context, ht: HienThi?): Boolean {
        val k = Kho(ctx)
        return ht != null && k.daGhep && !k.cheDoThu && ht.trangThai in MO_DUOC && matMang(k.lanNhipThanhCong, System.currentTimeMillis())
    }

    /** Máy rời gia đình / ghép lại ⇒ quên bí mật + lượt mở cũ (mã của gia đình cũ không mở được máy nữa). */
    fun quen(k: Kho) = synchronized(khoa) { k.maOfflineBiMat = null; k.moTamOffline = null }

    fun thu(ctx: Context, ma: String): String = synchronized(khoa) {
        val k = Kho(ctx)
        val now = System.currentTimeMillis()
        val (kq, st) = MoTamOffline.doc(k.moTamOffline).thu(k.maOfflineBiMat, ma, now, lechMs = k.lechGioMs)
        k.moTamOffline = st.json()
        val tenMay = android.os.Build.MODEL ?: "Android"
        when {
            kq == KetQuaMoOffline.DA_MO -> {
                NhatKy.suKien(ctx, "mo_ma_offline", mapOf("may" to tenMay, "phut" to ((st.moDen!! - now) / 60_000).toInt(),
                    "den" to java.time.Instant.ofEpochMilli(st.moDen).toString()))
                DichVuNhip.apNgay(ctx)
            }
            kq == KetQuaMoOffline.SAI && st.choGiay(now) > 0 ->
                NhatKy.suKien(ctx, "sai_ma_offline", mapOf("may" to tenMay, "soLan" to MoTamOffline.SAI_TOI_DA, "phut" to MoTamOffline.CUA_SO_SAI_PHUT))
        }
        NhatKy.tin("AiiGrowMaOffline", "gõ mã offline: $kq")
        cauMoOffline(kq, st, now) { GiaoDien.gio(it) }
    }

    /** Nhịp máy chủ thành công ⇒ kết thúc lượt mở đang chạy (như agent-win MoTamOffline.KetThucKhiCoMang) + sự kiện «het_ma_offline». */
    fun ketThucKhiCoMang(ctx: Context) = synchronized(khoa) {
        val k = Kho(ctx)
        val now = System.currentTimeMillis()
        val cu = MoTamOffline.doc(k.moTamOffline)
        val moi = cu.ketThucKhiCoMang(now) ?: return@synchronized
        k.moTamOffline = moi.json()
        NhatKy.suKien(ctx, "het_ma_offline", mapOf("may" to (android.os.Build.MODEL ?: "Android"), "ket_thuc" to "co_mang",
            "conPhut" to maxOf(0L, (cu.moDen!! - now) / 60_000).toInt(), "den" to java.time.Instant.ofEpochMilli(cu.moDen).toString()))
    }
}
