package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import vn.aiilab.aiigrow.maycon.logic.QuyetDinh
import java.io.File

/** Trạng thái bền của tác tử (SharedPreferences riêng của app; token không rời máy ngoài header Bearer). */
class Kho(ctx: Context) {
    private val p: SharedPreferences = ctx.applicationContext.getSharedPreferences("aiigrow_con", Context.MODE_PRIVATE)
    private val filesDir: File = ctx.applicationContext.filesDir

    var mayChu: String get() = p.getString("mayChu", null) ?: BuildConfig.MAY_CHU_MAC_DINH; set(v) = p.edit().putString("mayChu", v).apply()
    var token: String? get() = p.getString("token", null); set(v) = p.edit().putString("token", v).apply()
    var deviceId: String? get() = p.getString("deviceId", null); set(v) = p.edit().putString("deviceId", v).apply()
    var tenCon: String? get() = p.getString("tenCon", null); set(v) = p.edit().putString("tenCon", v).apply()
    /** Token gói cài nhúng trong QR Device Owner (PROVISIONING_ADMIN_EXTRAS_BUNDLE) — đổi lấy token máy bằng ghep-goi. */
    var tokenGoiCai: String? get() = p.getString("tokenGoiCai", null); set(v) = p.edit().putString("tokenGoiCai", v).apply()
    var phanHoi: String? get() = p.getString("phanHoi", null); set(v) = p.edit().putString("phanHoi", v).apply()
    var lechGioMs: Long get() = p.getLong("lechGioMs", 0); set(v) = p.edit().putLong("lechGioMs", v).apply()
    var lanNhipThanhCong: Long get() = p.getLong("lanNhip", 0); set(v) = p.edit().putLong("lanNhip", v).apply()
    var khoaTu: Long get() = p.getLong("khoaTu", 0); set(v) = p.edit().putLong("khoaTu", v).apply()
    var trangThaiKhoa: String? get() = p.getString("trangThaiKhoa", null); set(v) = p.edit().putString("trangThaiKhoa", v).apply()
    var daLockNow: Long get() = p.getLong("daLockNow", 0); set(v) = p.edit().putLong("daLockNow", v).apply()
    /** Con đã bấm «Về màn hình chính» ở màn hết giờ của lượt khoá này (khoaTu) ⇒ không bật lại màn đó tới lượt sau. */
    var daBoQua: Long get() = p.getLong("daBoQua", 0); set(v) = p.edit().putLong("daBoQua", v).apply()
    var daCaiDatDo: Boolean get() = p.getBoolean("daCaiDatDo", false); set(v) = p.edit().putBoolean("daCaiDatDo", v).apply()
    var privateDnsDaDat: String? get() = p.getString("privateDns", null); set(v) = p.edit().putString("privateDns", v).apply()
    var webDaDat: String? get() = p.getString("webDaDat", null); set(v) = p.edit().putString("webDaDat", v).apply()
    var goiKhongDung: Set<String> get() = p.getStringSet("goiKhongDung", emptySet()) ?: emptySet(); set(v) = p.edit().putStringSet("goiKhongDung", v).apply()
    var goiDaTamDung: Set<String> get() = p.getStringSet("goiDaTamDung", emptySet()) ?: emptySet(); set(v) = p.edit().putStringSet("goiDaTamDung", v).apply()
    /** Bản mới đã tải + kiểm xong, đang chờ cài (chờ quyền «Cài ứng dụng không rõ nguồn» / chờ hết khoá) — màn chính hiện thẻ cập nhật. */
    var banMoiCho: String? get() = p.getString("banMoiCho", null); set(v) = p.edit().putString("banMoiCho", v).apply()
    /** Lần cuối mở hộp xác nhận cài (đường không Device Owner) — tự hỏi lại tối đa mỗi 6 giờ. */
    var lanHoiCai: Long get() = p.getLong("lanHoiCai", 0); set(v) = p.edit().putLong("lanHoiCai", v).apply()
    /** Cập nhật: thông báo «bật quyền» lần cuối; sha256 bản vừa hỏng + thời điểm được thử lại; lúc bắt đầu hoãn vì khoá (≤ 12 giờ). */
    var lanBaoQuyen: Long get() = p.getLong("lanBaoQuyen", 0); set(v) = p.edit().putLong("lanBaoQuyen", v).apply()
    var shaLoi: String? get() = p.getString("shaLoi", null); set(v) = p.edit().putString("shaLoi", v).apply()
    var thuLaiSau: Long get() = p.getLong("thuLaiSau", 0); set(v) = p.edit().putLong("thuLaiSau", v).apply()
    var hoanTu: Long get() = p.getLong("hoanTu", 0); set(v) = p.edit().putLong("hoanTu", v).apply()
    /** Mã mở offline: bí mật máy chủ gửi trong nhịp (nhớ để kiểm mã khi mất mạng) + trạng thái mở tạm (logic/MaOffline.kt, JSON). */
    var maOfflineBiMat: String? get() = p.getString("maOfflineBiMat", null); set(v) = p.edit().putString("maOfflineBiMat", v).apply()
    var moTamOffline: String? get() = p.getString("moTamOffline", null); set(v) = p.edit().putString("moTamOffline", v).apply()
    /** Ảnh chụp trạng thái cho giao diện (màn chính, màn khoá, trợ năng) — dịch vụ ghi mỗi nhịp. */
    var hienThi: String? get() = p.getString("hienThi", null); set(v) = p.edit().putString("hienThi", v).apply()

    /** Danh sách app đã gửi được lần cuối (DanhSachApp.kt): bam, dấu theo khoa (JSON), yêu cầu «Làm mới» đã xử lý. */
    var dsAppBam: String? get() = p.getString("dsAppBam", null); set(v) = p.edit().putString("dsAppBam", v).apply()
    var dsAppDau: String? get() = p.getString("dsAppDau", null); set(v) = p.edit().putString("dsAppDau", v).apply()
    var dsAppYeuCau: String? get() = p.getString("dsAppYeuCau", null); set(v) = p.edit().putString("dsAppYeuCau", v).apply()
    /** khoa → iconBam máy chủ đã có icon (JSON) và khoa máy chủ báo thiếu icon (JSON mảng). */
    val dsAppIcon: String? get() = p.getString("dsAppIcon", null)
    val dsAppThieuIcon: String? get() = p.getString("dsAppThieuIcon", null)

    /** Ghi một lần (một edit) để bam và dấu theo khoa không lệch nhau nếu tiến trình chết giữa chừng. */
    fun luuDsApp(bam: String, dau: String, yeuCau: String?, icon: String, thieuIcon: String) {
        p.edit().putString("dsAppBam", bam).putString("dsAppDau", dau).putString("dsAppIcon", icon).putString("dsAppThieuIcon", thieuIcon)
            .apply { if (yeuCau != null) putString("dsAppYeuCau", yeuCau) }.apply()
    }

    val daGhep get() = token != null || cheDoThu

    /** Chế độ thử cục bộ: bản debug + có tệp chính sách giả (adb đẩy vào files/). Không gọi máy chủ. */
    val tepThu: File get() = File(filesDir, "thu-chinh-sach.json")
    val cheDoThu: Boolean get() = BuildConfig.CHO_PHEP_THU && tepThu.exists()
    val tepYeuCauThu: File get() = File(filesDir, "thu-yeu-cau.jsonl")

    fun xoaHet() { p.edit().clear().apply() }
}

/** Trạng thái hiển thị (dịch vụ → giao diện). */
data class HienThi(
    val trangThai: String, val conPhut: Int, val cauCon: String, val moLaiLuc: Long, val khoaCaMay: Boolean,
    val demNguoc: Int, val dangKhoaThat: Boolean, val goiChan: Set<String>, val dungTop: List<Pair<String, Int>>, val capNhat: Long,
    val deviceOwner: Boolean, val tenCon: String?,
) {
    fun json(): String = JSONObject()
        .put("trangThai", trangThai).put("conPhut", conPhut).put("cauCon", cauCon).put("moLaiLuc", moLaiLuc)
        .put("khoaCaMay", khoaCaMay).put("demNguoc", demNguoc).put("dangKhoaThat", dangKhoaThat)
        .put("goiChan", JSONArray(goiChan.toList()))
        .put("dungTop", JSONArray(dungTop.map { JSONObject().put("goi", it.first).put("phut", it.second) }))
        .put("capNhat", capNhat).put("deviceOwner", deviceOwner).put("tenCon", tenCon ?: "").toString()

    companion object {
        fun doc(s: String?): HienThi? = try {
            if (s == null) null else JSONObject(s).let { o ->
                val gc = o.optJSONArray("goiChan") ?: JSONArray()
                val dt = o.optJSONArray("dungTop") ?: JSONArray()
                HienThi(
                    o.optString("trangThai"), o.optInt("conPhut"), o.optString("cauCon"), o.optLong("moLaiLuc"), o.optBoolean("khoaCaMay"),
                    o.optInt("demNguoc"), o.optBoolean("dangKhoaThat"), (0 until gc.length()).map { gc.optString(it) }.toSet(),
                    (0 until dt.length()).mapNotNull { dt.optJSONObject(it)?.let { x -> x.optString("goi") to x.optInt("phut") } },
                    o.optLong("capNhat"), o.optBoolean("deviceOwner"), o.optString("tenCon").ifBlank { null },
                )
            }
        } catch (_: Exception) { null }

        fun tu(qd: QuyetDinh, demNguoc: Int, dungTop: List<Pair<String, Int>>, now: Long, deviceOwner: Boolean, tenCon: String?) = HienThi(
            qd.trangThai.name, qd.conPhut, qd.cauCon, qd.moLaiLuc?.toEpochMilli() ?: 0, qd.khoaCaMay, demNguoc,
            demNguoc == 0 && vn.aiilab.aiigrow.maycon.logic.laKhoa(qd.trangThai), qd.goiChan, dungTop, now, deviceOwner, tenCon,
        )
    }
}
