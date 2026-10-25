package vn.aiilab.aiigrow.maycon

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import vn.aiilab.aiigrow.maycon.logic.MoTamOffline
import vn.aiilab.aiigrow.maycon.logic.NhacGio
import vn.aiilab.aiigrow.maycon.logic.PhanHoiNhip
import vn.aiilab.aiigrow.maycon.logic.giayConTruocKhoa
import vn.aiilab.aiigrow.maycon.logic.giayToiNgu
import vn.aiilab.aiigrow.maycon.logic.vanBiMat
import vn.aiilab.aiigrow.maycon.logic.noiDungNhac
import vn.aiilab.aiigrow.maycon.logic.tieuDeNhac
import vn.aiilab.aiigrow.maycon.logic.TrangThai
import vn.aiilab.aiigrow.maycon.logic.demNguocConLai
import vn.aiilab.aiigrow.maycon.logic.docPhanHoiNhip
import vn.aiilab.aiigrow.maycon.logic.goiAndroid
import vn.aiilab.aiigrow.maycon.logic.laKhoa
import vn.aiilab.aiigrow.maycon.logic.phutGiaiTri
import vn.aiilab.aiigrow.maycon.logic.quyetDinh
import vn.aiilab.aiigrow.maycon.logic.thanGhepToken
import vn.aiilab.aiigrow.maycon.logic.thanNhip
import vn.aiilab.aiigrow.maycon.logic.truGoi
import vn.aiilab.aiigrow.maycon.logic.webChan
import java.time.Instant

/**
 * Dịch vụ tiền cảnh thường trực: nhịp máy chủ (mặc định 60 giây), đếm phút, quyết định, thực thi, cập nhật thông báo + màn khoá.
 * Thông báo thường trực «AiiGrow đang bật — Ba Mẹ quản lý máy này» — Con luôn biết máy đang được quản lý.
 */
class DichVuNhip : Service() {
    private lateinit var luong: HandlerThread
    private lateinit var h: Handler
    private var lanGoiMayChu = 0L
    private var lanGuiHangDoi = 0L
    private var nhac = NhacGio()
    private var daBaoDemNguoc = 0L          // khoaTu của lượt đếm ngược đã bật thông báo
    private var trinhDuyet: Set<String> = emptySet()
    private var lanQuetTrinhDuyet = 0L
    private val dsApp by lazy { DanhSachApp(this) }
    private val nhanCaiApp = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            dsApp.coSuKienGoi(i.data?.schemeSpecificPart)   // cài / gỡ / cập nhật ⇒ gửi phần đổi danh sách app sớm
            h.post { lanQuetTrinhDuyet = 0 }                 // trình duyệt mới cài ⇒ quét lại ngay (biến của luồng nhịp)
            if (i.action == Intent.ACTION_PACKAGE_ADDED) h.post { vong(true) }   // app mới cài ⇒ xét «chưa xếp» ngay
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        NhatKy.gan(this)
        NhatKy.tin(TAG, "dịch vụ bật — bản ${BuildConfig.VERSION_NAME}, Device Owner=${QuanTri.laDeviceOwner(this)}")
        taoKenh(this)
        batTienCanh()
        luong = HandlerThread("aiigrow-nhip").apply { start() }
        h = Handler(luong.looper)
        ContextCompat.registerReceiver(this, nhanCaiApp, IntentFilter(Intent.ACTION_PACKAGE_ADDED).apply {
            addAction(Intent.ACTION_PACKAGE_REMOVED); addAction(Intent.ACTION_PACKAGE_REPLACED)
            addAction(Intent.ACTION_PACKAGE_CHANGED)   // bật / tắt activity launcher
            addDataScheme("package") },
            ContextCompat.RECEIVER_NOT_EXPORTED)
        h.post(::lap)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == HANH_DONG_LAM_MOI && ::h.isInitialized) h.post { vong(true) }
        if (intent?.action == HANH_DONG_AP && ::h.isInitialized) h.post { vong(false) }   // áp ngay, không ép gọi máy chủ (mã offline)
        return START_STICKY
    }

    override fun onDestroy() {
        try { unregisterReceiver(nhanCaiApp) } catch (_: Exception) {}
        dsApp.dung()
        luong.quitSafely()
        super.onDestroy()
    }

    private fun lap() {
        try { vong(false) } catch (e: Exception) { NhatKy.canh(TAG, "vòng nhịp lỗi", e) }
        val k = Kho(this)
        h.postDelayed(::lap, if (k.cheDoThu) 3_000 else 5_000)
    }

    private fun batTienCanh() {
        val n = thongBao(this, null)
        if (Build.VERSION.SDK_INT >= 34) {
            val loai = if (QuanTri.laDeviceOwner(this)) ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED else ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            startForeground(MA_TB, n, loai)
        } else startForeground(MA_TB, n)
    }

    /** Một vòng: lấy chính sách (máy chủ ≤ mỗi 60 giây, hoặc tệp thử), đo, quyết, áp. */
    private fun vong(epGoi: Boolean) {
        val k = Kho(this)
        val nowMay = System.currentTimeMillis()
        val ph: PhanHoiNhip? = if (k.cheDoThu) {
            try { docPhanHoiNhip(k.tepThu.readText()) } catch (e: Exception) { NhatKy.canh(TAG, "tệp thử hỏng", e); null }
        } else {
            if (k.token == null && k.tokenGoiCai != null) ghepBangGoi(k)
            if (k.token != null && (epGoi || nowMay - lanGoiMayChu >= 60_000)) { lanGoiMayChu = nowMay; goiNhip(k) }
            dsApp.kich(k)   // gửi app đã cài thật (Ba Mẹ chọn chặn) — chạy luồng riêng, không chặn thực thi
            k.phanHoi?.let { try { docPhanHoiNhip(it) } catch (_: Exception) { null } }
        }
        if (ph == null) { capNhatThongBao(null); return }
        if (k.cheDoThu) ph.maOfflineBiMat?.let { if (it != k.maOfflineBiMat) k.maOfflineBiMat = it }   // thử mã offline không cần máy chủ
        val cs = ph.chinhSach
        val now = Instant.ofEpochMilli(nowMay + if (k.cheDoThu) 0 else k.lechGioMs)
        val dung = DoPhut.homNay(this, cs.tz, nowMay)
        val lech = if (k.cheDoThu) 0 else k.lechGioMs
        // mở tạm bằng mã offline (đồng hồ máy) ⇒ quy về đồng hồ máy chủ như `now`
        val moOff = MoTamOffline.doc(k.moTamOffline).takeIf { it.dangMo(nowMay) }?.moDen?.let { Instant.ofEpochMilli(it + lech) }
        val laDo = QuanTri.laDeviceOwner(this)
        if (laDo && nowMay - lanQuetTrinhDuyet > 60_000) { trinhDuyet = DoPhut.trinhDuyet(this); lanQuetTrinhDuyet = nowMay }
        val daCai = DoPhut.daCai(this)
        val phutGT = phutGiaiTri(dung, goiAndroid(cs.giaiTri))
        val qd = quyetDinh(cs, now, phutGT, daCai, ph.grantEndsAt, moOff,
            if (laDo) trinhDuyet else emptySet())

        // đếm ngược 60 giây trước khi khoá thật (Con kịp lưu bài / chào bạn)
        if (laKhoa(qd.trangThai)) {
            if (k.khoaTu == 0L || k.trangThaiKhoa != qd.trangThai.name) { k.khoaTu = now.toEpochMilli(); k.trangThaiKhoa = qd.trangThai.name }
        } else { k.khoaTu = 0; k.trangThaiKhoa = null }
        val demNguoc = if (k.khoaTu == 0L) 0 else demNguocConLai(Instant.ofEpochMilli(k.khoaTu), now)
        val khoaThat = laKhoa(qd.trangThai) && demNguoc == 0
        // trong lúc đếm ngược: app giải trí còn chạy; app bị chặn / chưa xếp vẫn chặn ngay
        val goiChan = if (laKhoa(qd.trangThai) && !khoaThat) truGoi(qd.goiChan, goiAndroid(cs.giaiTri)) else qd.goiChan
        ThucThi.apDung(this, qd, goiChan, khoaThat, webChan(cs))
        if (ph.privateDns != null && QuanTri.laDeviceOwner(this)) Log.i(TAG, "DNS: " + ThucThi.datPrivateDns(this, ph.privateDns))   // mỗi vòng ⇒ chỉ logcat

        val top = dung.entries.sortedByDescending { it.value }.map { it.key to (it.value / 60_000).toInt() }.filter { it.second > 0 }.take(5)
        val ht = HienThi.tu(qd, demNguoc, top, nowMay, QuanTri.laDeviceOwner(this), cs.tenCon ?: k.tenCon).copy(goiChan = goiChan)
        k.hienThi = ht.json()
        capNhatThongBao(ht)
        TroNang.capNhat()
        // thêm giờ / mở bằng mã: xem lúc hết hạn máy có khoá không (hết hạn mà còn phút ⇒ không «máy sắp khoá» giả)
        // (phút chơi trong lúc thêm giờ vẫn tính vào trần ngày ⇒ cộng phút còn tới hạn vào phút đã dùng; giờ ngủ tới trước hạn thì khoá sớm hơn)
        val sauHan = if (qd.trangThai == TrangThai.DUOC_THEM_GIO) qd.moLaiLuc?.let { mo ->
            val toiHanPhut = java.time.Duration.between(now, mo).toMinutes().toInt().coerceAtLeast(0)
            quyetDinh(cs, mo.plusSeconds(1), phutGT + toiHanPhut, daCai, ph.grantEndsAt, moOff, if (laDo) trinhDuyet else emptySet())
        } else null
        val nguToi = if (moOff == null) giayToiNgu(cs, now) else null   // mã offline gỡ cả giờ ngủ
        nhacTruocKhoa(k, giayConTruocKhoa(qd, sauHan, now.toEpochMilli(), nguToi), demNguoc, khoaThat, nowMay)
        if (laKhoa(qd.trangThai) && ManKhoa.dangMo == null && QuanTri.laDeviceOwner(this) && (qd.khoaCaMay || k.daBoQua != k.khoaTu)) {
            // Device Owner được mở activity từ nền (miễn trừ BAL cho DPC). Đường không reset: TroNang phủ màn khoá.
            startActivity(Intent(this, ManKhoa::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
        for (l in ph.lenh) if (l.loai == "go" && !k.cheDoThu) xuLyGo(k, l.id)
    }

    private fun ghepBangGoi(k: Kho) {
        try {
            val r = MayChu(k.mayChu, null).ghepGoi(thanGhepToken(k.tokenGoiCai!!, Build.MODEL ?: "Android"))
            MoMaOffline.quen(k); HocVien.quen(k)
            k.token = r.getString("token"); k.deviceId = r.optString("deviceId"); k.tenCon = r.optString("childName").ifBlank { null }
            k.tokenGoiCai = null
        } catch (e: Exception) { NhatKy.canh(TAG, "ghép bằng token gói cài lỗi", e) }
    }

    private fun goiNhip(k: Kho) {
        val truoc = k.lanNhipThanhCong
        val matPhut = if (truoc == 0L) 0 else ((System.currentTimeMillis() - truoc) / 60_000).toInt().coerceAtLeast(0)
        val ht = HienThi.doc(k.hienThi)
        val csCu = k.phanHoi?.let { try { docPhanHoiNhip(it).chinhSach } catch (_: Exception) { null } }
        val tz = csCu?.tz ?: "Asia/Ho_Chi_Minh"
        HocVien.nhipPhienNen(this, csCu)   // phiên chơi bằng điểm máy này mở: nhịp kể cả khi nhịp máy lỗi
        val dung = DoPhut.homNay(this, tz).mapValues { (it.value / 60_000).toInt() }
        val than = thanNhip(Instant.now().toString(), BuildConfig.VERSION_NAME, ht?.dangKhoaThat == true, QuanTri.laDeviceOwner(this),
            QuanTri.laAdmin(this), TroNang.dangBat(this), DoPhut.coQuyen(this), if (matPhut > 2) matPhut else 0, dung)
            .apply { k.maOfflineBiMat?.let { put("maOfflineVan", vanBiMat(it)) } }   // vân bí mật đang nhớ: khớp ⇒ máy chủ khỏi gửi lại, lệch ⇒ gửi bí mật đúng
        try {
            val r = MayChu(k.mayChu, k.token).nhip(than)
            k.phanHoi = r.toString()
            k.lanNhipThanhCong = System.currentTimeMillis()
            r.optString("serverTime").takeIf { it.isNotBlank() }?.let { k.lechGioMs = Instant.parse(it).toEpochMilli() - System.currentTimeMillis() }
            r.optString("maOfflineBiMat").takeIf { it.isNotBlank() && it != "null" }?.let { if (it != k.maOfflineBiMat) k.maOfflineBiMat = it }
            MoMaOffline.ketThucKhiCoMang(this)   // có mạng lại ⇒ hết lượt mở bằng mã (Ba Mẹ lại quyết bằng luật online)
            // nhiệm vụ / lời nhắn mới ⇒ thông báo (tạm thay FCM); lời xin thêm giờ đang chờ ⇒ Ba Mẹ trả lời thì báo — luồng riêng, không chặn vòng thực thi
            HocVien.chayNen(this)
            if (System.currentTimeMillis() - lanGuiHangDoi > 120_000) { lanGuiHangDoi = System.currentTimeMillis(); NhatKy.gui(this, MayChu(k.mayChu, k.token)) }
            // DNS gia đình (server/lib/dns-gia-dinh.ts › hoSoDns): Device Owner tự đặt DNS riêng tư; gia đình chưa bật DNS ⇒ máy chủ trả lỗi, bỏ qua
            if (QuanTri.laDeviceOwner(this) && k.privateDnsDaDat == null) try {
                val host = MayChu(k.mayChu, k.token).hoSoDns().optJSONObject("android")?.optString("privateDns")
                Log.i(TAG, "DNS gia đình: " + ThucThi.datPrivateDns(this, host))   // mỗi nhịp tới khi gia đình bật DNS ⇒ chỉ logcat
            } catch (e: Exception) { Log.i(TAG, "chưa có DNS gia đình: ${e.message}") }
        } catch (e: MayChu.Loi) {
            if (e.http == 401) { NhatKy.canh(TAG, "token bị thu hồi — máy đã bị gỡ khỏi gia đình"); k.token = null; k.phanHoi = null; MoMaOffline.quen(k); HocVien.quen(k) }
        } catch (e: Exception) { Log.i(TAG, "mất mạng — chạy theo chính sách nhớ: ${e.message}") }
    }

    /** Nhắc 5 phút / 1 phút (thông báo ưu tiên cao, như bóng báo khay Windows) + thông báo đếm ngược khi bắt đầu 60 giây trước khoá. */
    private fun nhacTruocKhoa(k: Kho, conGiay: Int?, demNguoc: Int, khoaThat: Boolean, nowMay: Long) {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val (moc, moi) = nhac.xet(conGiay)
        nhac = moi
        if (moc != null) nm.notify(MA_NHAC, thongBaoNhac(this, tieuDeNhac(moc), noiDungNhac(moc), null))
        if (demNguoc > 0 && !khoaThat) {
            if (daBaoDemNguoc != k.khoaTu) {
                daBaoDemNguoc = k.khoaTu
                nm.cancel(MA_NHAC)
                nm.notify(MA_DEM, thongBaoNhac(this, "Máy sắp khoá", "Lưu bài đang làm nhé. Hết đếm ngược máy sẽ khoá.", nowMay + demNguoc * 1000L))
            }
        } else if (daBaoDemNguoc != 0L) { daBaoDemNguoc = 0; nm.cancel(MA_DEM) }
    }

    private fun xuLyGo(k: Kho, id: String) {
        try { MayChu(k.mayChu, k.token).xongLenh(id) } catch (e: Exception) { NhatKy.canh(TAG, "báo xong lệnh gỡ", e); return }
        ThucThi.goHet(this)
        stopForeground(STOP_FOREGROUND_REMOVE); stopSelf()
        startActivity(Intent(Intent.ACTION_DELETE, android.net.Uri.parse("package:$packageName")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private fun capNhatThongBao(ht: HienThi?) {
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(MA_TB, thongBao(this, ht))
    }

    companion object {
        private const val TAG = "AiiGrowNhip"
        const val KENH = "thuong_truc"
        const val MA_TB = 7
        const val HANH_DONG_LAM_MOI = "vn.aiilab.aiigrow.con.LAM_MOI"
        const val HANH_DONG_AP = "vn.aiilab.aiigrow.con.AP_NGAY"
        const val KENH_NHAC = "nhac_gio"
        const val MA_NHAC = 8
        const val MA_DEM = 9
        const val TIEU_DE = "AiiGrow đang bật — Ba Mẹ quản lý máy này"

        fun batDau(ctx: Context) {
            try { ContextCompat.startForegroundService(ctx, Intent(ctx, DichVuNhip::class.java)) }
            catch (e: Exception) { NhatKy.canh(TAG, "chưa bật được dịch vụ (nền bị hạn chế) — WorkManager thử lại", e) }
        }

        /** Áp lại ngay từ trạng thái đã nhớ (không ép gọi máy chủ) — vd vừa mở bằng mã offline. */
        fun apNgay(ctx: Context) {
            try { ContextCompat.startForegroundService(ctx, Intent(ctx, DichVuNhip::class.java).setAction(HANH_DONG_AP)) } catch (_: Exception) {}
        }

        fun lamMoi(ctx: Context) {
            try { ContextCompat.startForegroundService(ctx, Intent(ctx, DichVuNhip::class.java).setAction(HANH_DONG_LAM_MOI)) } catch (_: Exception) {}
        }

        fun taoKenh(ctx: Context) {
            if (Build.VERSION.SDK_INT >= 26) {
                val c = NotificationChannel(KENH, "AiiGrow đang bật", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Luôn hiện khi Ba Mẹ quản lý máy này"; setShowBadge(false)
                }
                val nhac = NotificationChannel(KENH_NHAC, "Nhắc giờ", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Còn 5 phút, còn 1 phút và đếm ngược trước khi máy khoá"
                }
                val tin = NotificationChannel(HocVien.KENH_TIN, "Tin từ Ba Mẹ", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Nhiệm vụ mới, Ba Mẹ duyệt bài, lời nhắn, trả lời lời xin"
                }
                (ctx.getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannels(listOf(c, nhac, tin))
            }
        }

        /** Thông báo nhắc (hiện nổi trên màn). `khoaLuc` ≠ null ⇒ đồng hồ đếm ngược tới lúc khoá. */
        fun thongBaoNhac(ctx: Context, tieu: String, noi: String, khoaLuc: Long?): Notification {
            val mo = PendingIntent.getActivity(ctx, 1, Intent(ctx, ManChinh::class.java), PendingIntent.FLAG_IMMUTABLE)
            return NotificationCompat.Builder(ctx, KENH_NHAC)
                .setSmallIcon(R.drawable.ic_aiigrow).setColor(0xFF1F8A70.toInt())
                .setContentTitle(tieu).setContentText(noi).setStyle(NotificationCompat.BigTextStyle().bigText(noi))
                .setPriority(NotificationCompat.PRIORITY_HIGH).setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setContentIntent(mo).setAutoCancel(true)
                .apply {
                    if (khoaLuc != null) {
                        setWhen(khoaLuc).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true).setTimeoutAfter(maxOf(1_000L, khoaLuc - System.currentTimeMillis()))
                    } else setTimeoutAfter(10 * 60_000L)
                }
                .build()
        }

        fun thongBao(ctx: Context, ht: HienThi?): Notification {
            val mo = PendingIntent.getActivity(ctx, 0, Intent(ctx, ManChinh::class.java), PendingIntent.FLAG_IMMUTABLE)
            val noi = when {
                ht == null -> "Chưa ghép với gia đình"
                ht.trangThai == TrangThai.BINH_THUONG.name || ht.trangThai == TrangThai.DUOC_THEM_GIO.name -> "Còn ${ht.conPhut} phút giải trí hôm nay"
                else -> ht.cauCon
            }
            return NotificationCompat.Builder(ctx, KENH)
                .setSmallIcon(R.drawable.ic_aiigrow)
                .setContentTitle(TIEU_DE).setContentText(noi)
                .setColor(0xFF1F8A70.toInt()).setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false)
                .setCategory(NotificationCompat.CATEGORY_STATUS).setContentIntent(mo)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .build()
        }

        /** Ghép bằng mã 6 số (gọi trên luồng nền). Chế độ thử: không gọi máy chủ. */
        fun ghepBangMa(ctx: Context, ma: String): String? {
            val k = Kho(ctx)
            if (k.cheDoThu) { k.tenCon = k.tenCon ?: "Con (thử)"; return null }
            return try {
                val r = MayChu(k.mayChu, null).ghep(vn.aiilab.aiigrow.maycon.logic.thanGhep(ma, Build.MODEL ?: "Android"))
                MoMaOffline.quen(k); HocVien.quen(k)
                k.token = r.getString("token"); k.deviceId = r.optString("deviceId"); k.tenCon = r.optString("childName").ifBlank { null }
                lamMoi(ctx)
                null
            } catch (e: MayChu.Loi) { e.cau } catch (e: Exception) { "Không kết nối được máy chủ AiiGrow. Kiểm tra mạng rồi thử lại." }
        }

        /** Xin thêm giờ (luồng nền). Trả câu báo cho Con. */
        fun xinThemGio(ctx: Context, than: JSONObject): String {
            val k = Kho(ctx)
            if (k.cheDoThu) { k.tepYeuCauThu.appendText(than.toString() + "\n"); return "Đã gửi Ba Mẹ (chế độ thử). Chờ Ba Mẹ trả lời nhé." }
            return try {
                val r = MayChu(k.mayChu, k.token).xinThemGio(than)
                val tuDuyet = r.optString("status") == "tu_duyet"
                HocVien.ghiLoiXin(ctx, r.optString("id").ifBlank { null }, than.optInt("phut"), tuDuyet)   // theo dõi yeu-cau/:id tới khi Ba Mẹ trả lời
                if (tuDuyet) { lamMoi(ctx); "Ba Mẹ đã tự động đồng ý!" } else "Đã gửi Ba Mẹ. Chờ Ba Mẹ trả lời nhé."
            } catch (e: MayChu.Loi) { e.cau } catch (e: Exception) { "Chưa gửi được — máy đang mất mạng." }
        }
    }
}
