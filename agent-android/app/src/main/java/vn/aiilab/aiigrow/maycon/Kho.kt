package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import vn.aiilab.aiigrow.maycon.logic.QuyetDinh
import vn.aiilab.aiigrow.maycon.logic.maMayHopLe
import vn.aiilab.aiigrow.maycon.logic.taoMaMay
import java.io.File

/** Trạng thái bền của tác tử (SharedPreferences riêng của app; token không rời máy ngoài header Bearer). */
/** Khoá sinh mã máy một lần (hai luồng cùng đọc lúc chưa có không sinh hai mã). */
private val KHOA_MA_MAY = Any()

class Kho(ctx: Context) {
    private val p: SharedPreferences = ctx.applicationContext.getSharedPreferences("aiigrow_con", Context.MODE_PRIVATE)
    private val filesDir: File = ctx.applicationContext.filesDir

    var mayChu: String get() = p.getString("mayChu", null) ?: BuildConfig.MAY_CHU_MAC_DINH; set(v) = p.edit().putString("mayChu", v).apply()
    var token: String? get() = p.getString("token", null); set(v) = p.edit().putString("token", v).apply()
    var deviceId: String? get() = p.getString("deviceId", null); set(v) = p.edit().putString("deviceId", v).apply()
    var tenCon: String? get() = p.getString("tenCon", null); set(v) = p.edit().putString("tenCon", v).apply()
    /** Token gói cài nhúng trong QR Device Owner (PROVISIONING_ADMIN_EXTRAS_BUNDLE) — đổi lấy token máy bằng ghep-goi. */
    /** #685: mã máy ổn định (32 hex ngẫu nhiên, logic/GhepGoi.kt › taoMaMay) gửi khi ghép — máy chủ nhận ra lần thử lại của chính máy này. */
    val maMay: String get() = synchronized(KHOA_MA_MAY) {
        maMayHopLe(p.getString("maMay", null)) ?: taoMaMay(ByteArray(16).also { java.security.SecureRandom().nextBytes(it) })
            .also { p.edit().putString("maMay", it).commit() }
    }
    var tokenGoiCai: String? get() = p.getString("tokenGoiCai", null); set(v) = p.edit().putString("tokenGoiCai", v).apply()
    /** #707: máy chủ từ chối hẳn gói cài (đã dùng / hết hạn / sai) ⇒ bỏ gói, giữ câu máy chủ để màn ghép báo Ba Mẹ xin gói / mã mới. */
    var loiGhepGoi: String? get() = p.getString("loiGhepGoi", null); set(v) = p.edit().putString("loiGhepGoi", v).apply()
    var phanHoi: String? get() = p.getString("phanHoi", null); set(v) = p.edit().putString("phanHoi", v).apply()
    /** 05/11: phút giải trí đo tại chỗ lúc nhịp thành công gần nhất (-1 = chưa có) + ngày của nhịp (tz gia đình) — QuyetDinh.kt › quyetDinhQuy. */
    var phutLucNhip: Int get() = p.getInt("phutLucNhip", -1); set(v) = p.edit().putInt("phutLucNhip", v).apply()
    /** 16/11 #302: lúc chạm trần lượt suy tại chỗ, ghim theo nhịp (khoá = ngayNhip|phutLucNhip) ⇒ giờ nghỉ không trôi theo `now`. */
    private var chamLuotRaw: String? get() = p.getString("chamLuotRaw", null); set(v) = p.edit().putString("chamLuotRaw", v).apply()
    private fun khoaNhip() = "$ngayNhip|$phutLucNhip"
    fun mocChamLuot(): java.time.Instant? =
        chamLuotRaw?.split('#')?.takeIf { it.size == 2 && it[0] == khoaNhip() }?.get(1)?.toLongOrNull()?.let { java.time.Instant.ofEpochMilli(it) }
    fun ghimChamLuot(t: java.time.Instant) { if (mocChamLuot() == null) chamLuotRaw = khoaNhip() + "#" + t.toEpochMilli() }
    var ngayNhip: String? get() = p.getString("ngayNhip", null); set(v) = p.edit().putString("ngayNhip", v).apply()
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
    /** Lần cuối hộp xác nhận cài hiện (không Device Owner: lúc commit; Device Owner: khi hệ thống vẫn đòi xác nhận) — cùng bản tự hỏi lại tối đa mỗi 6 giờ (06/11 B2). */
    var lanHoiCai: Long get() = p.getLong("lanHoiCai", 0); set(v) = p.edit().putLong("lanHoiCai", v).apply()
    /** versionCode của lần hỏi / gửi cài gần nhất (`lanHoiCai`) — manifest có bản mới hơn thì không chờ 6 giờ. */
    var banHoiCai: Long get() = p.getLong("banHoiCai", 0); set(v) = p.edit().putLong("banHoiCai", v).apply()
    /** Cập nhật: thông báo «bật quyền» lần cuối; sha256 bản vừa hỏng + thời điểm được thử lại; lúc bắt đầu hoãn vì khoá (≤ 12 giờ). */
    var lanBaoQuyen: Long get() = p.getLong("lanBaoQuyen", 0); set(v) = p.edit().putLong("lanBaoQuyen", v).apply()
    var shaLoi: String? get() = p.getString("shaLoi", null); set(v) = p.edit().putString("shaLoi", v).apply()
    var thuLaiSau: Long get() = p.getLong("thuLaiSau", 0); set(v) = p.edit().putLong("thuLaiSau", v).apply()
    var hoanTu: Long get() = p.getLong("hoanTu", 0); set(v) = p.edit().putLong("hoanTu", v).apply()
    /** Mã mở offline: bí mật máy chủ gửi trong nhịp (nhớ để kiểm mã khi mất mạng) + trạng thái mở tạm (logic/MaOffline.kt, JSON). */
    var maOfflineBiMat: String? get() = p.getString("maOfflineBiMat", null); set(v) = p.edit().putString("maOfflineBiMat", v).apply()
    var moTamOffline: String? get() = p.getString("moTamOffline", null); set(v) = p.edit().putString("moTamOffline", v).apply()
    /** App Con (HocVien.kt): tổng quan hoc-vien/tong-quan gần nhất (JSON), mốc + id tin đã thấy, lời xin đang theo dõi, phiên điểm máy này mở. */
    var hvTongQuan: String? get() = p.getString("hvTongQuan", null); set(v) = p.edit().putString("hvTongQuan", v).apply()
    var tinBay: String? get() = p.getString("tinBay", null); set(v) = p.edit().putString("tinBay", v).apply()
    var tinDaThay: List<String>
        get() = try { JSONArray(p.getString("tinDaThay", "[]")).let { a -> (0 until a.length()).map { a.optString(it) } } } catch (_: Exception) { emptyList() }
        set(v) = p.edit().putString("tinDaThay", JSONArray(v).toString()).apply()
    var yeuCauId: String? get() = p.getString("yeuCauId", null); set(v) = p.edit().putString("yeuCauId", v).apply()
    var yeuCauPhut: Int get() = p.getInt("yeuCauPhut", 0); set(v) = p.edit().putInt("yeuCauPhut", v).apply()
    var yeuCauLuc: Long get() = p.getLong("yeuCauLuc", 0); set(v) = p.edit().putLong("yeuCauLuc", v).apply()
    /** 15/11: lời xin đang theo dõi là xin vay sao (`yeuCauPhut` = số sao). */
    var yeuCauVay: Boolean get() = p.getBoolean("yeuCauVay", false); set(v) = p.edit().putBoolean("yeuCauVay", v).apply()
    var yeuCauTrangThai: String? get() = p.getString("yeuCauTrangThai", null); set(v) = p.edit().putString("yeuCauTrangThai", v).apply()
    /** Phiên điểm máy này biết là đã hết (luật nhớ còn `phienDiem.phien` cũ khi nhịp máy lỗi ⇒ bỏ qua). */
    var phienHet: String? get() = p.getString("phienHet", null); set(v) = p.edit().putString("phienHet", v).apply()
    var phienId: String? get() = p.getString("phienId", null); set(v) = p.edit().putString("phienId", v).apply()
    /** L13 PIN theo bé (logic/PinBe.kt): hồ sơ `ho-so` gần nhất (JSON gốc — có `vanPin` để kiểm PIN khi mất mạng) + lúc lấy,
     *  người dùng nhớ gần nhất (nhịp / hành động tại máy, NguoiDung.json), hạn «Ba Mẹ dùng» mở bằng mã lúc mất mạng (epoch ms),
     *  bộ đếm sai PIN tại máy (DemPin.json), việc tại máy chưa báo máy chủ (ViecCho.json), lúc đổi người dùng tại máy gần nhất. */
    var hoSo: String? get() = p.getString("hoSo", null); set(v) = p.edit().putString("hoSo", v).apply()
    /** #337: gói luật mất mạng theo bé (máy chung) — `{ <id bé>: <gói như phản hồi nhịp> }` từ ho-so?offline=1 (logic/GoiOffline.kt). */
    var goiOffline: String? get() = p.getString("goiOffline", null); set(v) = p.edit().putString("goiOffline", v).apply()
    var lanHoSo: Long get() = p.getLong("lanHoSo", 0); set(v) = p.edit().putLong("lanHoSo", v).apply()
    var nguoiDung: String? get() = p.getString("nguoiDung", null); set(v) = p.edit().putString("nguoiDung", v).apply()
    var baMeDen: Long get() = p.getLong("baMeDen", 0); set(v) = p.edit().putLong("baMeDen", v).apply()
    var demPin: String? get() = p.getString("demPin", null); set(v) = p.edit().putString("demPin", v).apply()
    var viecCho: String? get() = p.getString("viecCho", null); set(v) = p.edit().putString("viecCho", v).apply()
    /** 15/11: sổ phút theo bé (logic/SoPhutBe.kt) — gửi `dong-bo {usage[].con, phutBoiMa}` để máy chủ trừ sao. */
    var soPhutBe: String? get() = p.getString("soPhutBe", null); set(v) = p.edit().putString("soPhutBe", v).apply()
    /** 15/11: lời xin vay sao lưu lúc mất mạng (thân JSON) — có mạng là gửi (them-qpj5mdyr «Đã lưu lời xin»). */
    var xinVayCho: String? get() = p.getString("xinVayCho", null); set(v) = p.edit().putString("xinVayCho", v).apply()
    var xinVayChoLuc: Long get() = p.getLong("xinVayChoLuc", 0); set(v) = p.edit().putLong("xinVayChoLuc", v).apply()
    /** Bé gửi lời xin vay đã lưu ("" = máy riêng / không rõ) — bé đổi thì lời xin đó huỷ, không gửi nhầm bé. */
    var xinVayChoCon: String? get() = p.getString("xinVayChoCon", null); set(v) = p.edit().putString("xinVayChoCon", v).apply()
    /** #686: lời xin app / web đang chờ Ba Mẹ (logic/XinCho.kt › XinAppCho, JSON mảng) — hỏi lại mỗi nhịp, báo kết quả cả khi hộp xin đã đóng. */
    var xinAppCho: String? get() = p.getString("xinAppCho", null); set(v) = p.edit().putString("xinAppCho", v).apply()
    /** Máy dùng chung: mốc phút giải trí cả máy lúc bé hiện tại vào (logic/PinBe.kt › MocPhut, JSON). */
    var mocBe: String? get() = p.getString("mocBe", null); set(v) = p.edit().putString("mocBe", v).apply()
    var lanDoiNguoi: Long get() = p.getLong("lanDoiNguoi", 0); set(v) = p.edit().putLong("lanDoiNguoi", v).apply()

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
    /** 05/11: app tạm dừng vì chưa được Ba Mẹ cho phép ⇒ màn tạm dừng «Xin Ba Mẹ mở». */
    val goiChuaXep: Set<String> = emptySet(),
    /** 06/11 L13: cổng PIN (logic/PinBe.kt › Cong.name) — CHON_TEN ⇒ màn khoá hiện chọn tên + PIN; BA_ME ⇒ «Ba Mẹ đang dùng máy» tới `baMeDen`. */
    val cong: String = "MO", val baMeDen: Long = 0,
    /** 15/11 sổ sao: số dư Con thấy (âm khi nợ; null = máy chủ cũ), nợ Ba Mẹ, chế độ «Mở hết» (không chặn, không tính phút). */
    val soDu: Int? = null, val no: Int = 0, val moHet: Boolean = false,
    /** 16/11 #302 giới hạn giờ chơi: lý do khoá (`het_gio_ngay` | `dang_nghi`), giờ chơi tiếp «HH:MM», phút còn của ngày. */
    val lyDoKhoa: String? = null, val nghiDenGio: String? = null, val conNgay: Int? = null,
) {
    /** Máy chủ có sổ sao (1 sao = 1 phút) — giao diện nói «sao» thay «phút chơi hôm nay». */
    val coSao: Boolean get() = soDu != null

    fun json(): String = JSONObject()
        .put("trangThai", trangThai).put("conPhut", conPhut).put("cauCon", cauCon).put("moLaiLuc", moLaiLuc)
        .put("khoaCaMay", khoaCaMay).put("demNguoc", demNguoc).put("dangKhoaThat", dangKhoaThat)
        .put("goiChan", JSONArray(goiChan.toList()))
        .put("dungTop", JSONArray(dungTop.map { JSONObject().put("goi", it.first).put("phut", it.second) }))
        .put("capNhat", capNhat).put("deviceOwner", deviceOwner).put("tenCon", tenCon ?: "")
        .put("goiChuaXep", JSONArray(goiChuaXep.toList())).put("cong", cong).put("baMeDen", baMeDen)
        .apply { soDu?.let { put("soDu", it) } }.put("no", no).put("moHet", moHet)
        .apply { lyDoKhoa?.let { put("lyDoKhoa", it) }; nghiDenGio?.let { put("nghiDenGio", it) }; conNgay?.let { put("conNgay", it) } }.toString()

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
                    (o.optJSONArray("goiChuaXep") ?: JSONArray()).let { a -> (0 until a.length()).map { a.optString(it) }.toSet() },
                    o.optString("cong", "MO").ifBlank { "MO" }, o.optLong("baMeDen"),
                    if (o.has("soDu")) o.optInt("soDu") else null, o.optInt("no"), o.optBoolean("moHet"),
                    o.optString("lyDoKhoa").ifBlank { null }, o.optString("nghiDenGio").ifBlank { null }, if (o.has("conNgay")) o.optInt("conNgay") else null,
                )
            }
        } catch (_: Exception) { null }

        fun tu(qd: QuyetDinh, demNguoc: Int, dungTop: List<Pair<String, Int>>, now: Long, deviceOwner: Boolean, tenCon: String?) = HienThi(
            qd.trangThai.name, qd.conPhut, qd.cauCon, qd.moLaiLuc?.toEpochMilli() ?: 0, qd.khoaCaMay, demNguoc,
            demNguoc == 0 && vn.aiilab.aiigrow.maycon.logic.laKhoa(qd.trangThai), qd.goiChan, dungTop, now, deviceOwner, tenCon, qd.goiChuaXep,
            soDu = qd.soDu, no = qd.no, moHet = qd.moHet,
            lyDoKhoa = qd.lyDoKhoa, nghiDenGio = qd.nghiDenGio, conNgay = qd.conNgay,
        )
    }
}
