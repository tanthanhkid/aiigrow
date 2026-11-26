package vn.aiilab.aiigrow.maycon

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import vn.aiilab.aiigrow.maycon.logic.ChinhSach
import vn.aiilab.aiigrow.maycon.logic.HOI_XIN_TOI_DA_MS
import vn.aiilab.aiigrow.maycon.logic.KetXet
import vn.aiilab.aiigrow.maycon.logic.TrangThaiXin
import vn.aiilab.aiigrow.maycon.logic.LoaiKetQuaXin
import vn.aiilab.aiigrow.maycon.logic.XinAppCho
import vn.aiilab.aiigrow.maycon.logic.cauXin
import vn.aiilab.aiigrow.maycon.logic.chuKetQuaXinApp
import vn.aiilab.aiigrow.maycon.logic.conHanXinAppCho
import vn.aiilab.aiigrow.maycon.logic.docKetQuaXinApp
import vn.aiilab.aiigrow.maycon.logic.docXinAppCho
import vn.aiilab.aiigrow.maycon.logic.jsonXinAppCho
import vn.aiilab.aiigrow.maycon.logic.nenHoiXinApp
import vn.aiilab.aiigrow.maycon.logic.KetQuaXinApp
import vn.aiilab.aiigrow.maycon.logic.themXinAppCho
import vn.aiilab.aiigrow.maycon.logic.cauXinVay
import vn.aiilab.aiigrow.maycon.logic.dangDungPhien
import vn.aiilab.aiigrow.maycon.logic.docTin
import vn.aiilab.aiigrow.maycon.logic.docTrangThaiXin
import vn.aiilab.aiigrow.maycon.logic.docXet
import vn.aiilab.aiigrow.maycon.logic.duongChoTin
import vn.aiilab.aiigrow.maycon.logic.goiAndroid
import vn.aiilab.aiigrow.maycon.logic.locTinMoi
import vn.aiilab.aiigrow.maycon.logic.phienKetThuc
import java.net.URLEncoder

/**
 * Phần «làm việc để có điểm» của tác tử (như khay Windows gọi /api/device/hoc-vien/…): tin mới ⇒ thông báo, theo dõi lời xin thêm giờ,
 * chơi bằng điểm (mở phiên + nhịp phiên từ chính máy này). Mọi hàm gọi mạng chạy trên luồng nền; lỗi mạng ⇒ im, lần sau thử lại.
 * Máy dùng chung (chưa gắn Con) ⇒ máy chủ trả 409 chua_chon_con ⇒ bỏ qua.
 */
object HocVien {
    private const val TAG = "AiiGrowHocVien"
    const val KENH_TIN = "tin_moi"
    private const val MA_TIN = 20
    private const val MA_XIN = 21

    private fun may(k: Kho) = MayChu(k.mayChu, k.token)
    private val luong = java.util.concurrent.Executors.newSingleThreadExecutor { r -> Thread(r, "aiigrow-hoc-vien").apply { isDaemon = true } }
    private val dangChay = java.util.concurrent.atomic.AtomicBoolean(false)

    /** Sau nhịp thành công: hỏi tin mới + lời xin trên luồng riêng — không chặn vòng thực thi 5 giây
     *  (lượt trước chưa xong ⇒ bỏ lượt này). */
    fun chayNen(ctx: Context) {
        if (!dangChay.compareAndSet(false, true)) return
        val c = ctx.applicationContext
        try {
            luong.execute { try { hoiTin(c); hoiLoiXin(c); hoiXinApp(c) } catch (e: Exception) { NhatKy.canh(TAG, "hỏi tin / lời xin lỗi", e) } finally { dangChay.set(false) } }
        } catch (e: Exception) { dangChay.set(false) }
    }

    private val dangNhipPhien = java.util.concurrent.atomic.AtomicBoolean(false)
    // luồng riêng cho nhịp phiên điểm: không xếp hàng sau hỏi tin / lời xin đang chậm
    private val luongPhien = java.util.concurrent.Executors.newSingleThreadExecutor { r -> Thread(r, "aiigrow-phien-diem").apply { isDaemon = true } }

    /** Nhịp phiên điểm do máy này mở — mỗi lượt gọi máy chủ, KHÔNG phụ thuộc nhịp máy thành công; luồng riêng. Phiên kết thúc ⇒ áp luật lại ngay. */
    fun nhipPhienNen(ctx: Context, cs: ChinhSach?) {
        if (Kho(ctx).phienId == null || !dangNhipPhien.compareAndSet(false, true)) return
        val c = ctx.applicationContext
        try { luongPhien.execute { try { nhipPhien(c, cs) } catch (_: Exception) {} finally { dangNhipPhien.set(false) } } }
        catch (_: Exception) { dangNhipPhien.set(false) }
    }

    /** Máy rời gia đình / ghép lại ⇒ quên dữ liệu của Con cũ (tổng quan, tin đã thấy, lời xin, phiên điểm). */
    fun quen(k: Kho) {
        k.hvTongQuan = null; k.tinBay = null; k.tinDaThay = emptyList()
        k.yeuCauId = null; k.yeuCauTrangThai = null; k.yeuCauLuc = 0; k.phienId = null; k.xinAppCho = null
    }

    private const val CAU_THU = "Chế độ thử: không gọi máy chủ."

    /** Tổng quan (điểm, nhiệm vụ, lời nhắn Ba Mẹ) — lưu để màn chính hiện cả khi mất mạng. */
    fun napTongQuan(ctx: Context): Boolean {
        val k = Kho(ctx)
        if (k.token == null) return false
        return try { k.hvTongQuan = may(k).goi("hoc-vien/tong-quan").toString(); true } catch (_: Exception) { false }
    }

    /** Hỏi tin mới (mỗi nhịp). Lần đầu chỉ ghi nhận, không báo. */
    fun hoiTin(ctx: Context) {
        val k = Kho(ctx)
        if (k.token == null) return
        val bay = k.tinBay
        val r = try { may(k).goi("hoc-vien/tin" + (bay?.let { "?sau=" + URLEncoder.encode(it, "UTF-8") } ?: "")) } catch (e: MayChu.Loi) {
            if (e.http != 409) NhatKy.canh(TAG, "hỏi tin lỗi ${e.http} ${e.ma}"); return
        } catch (_: Exception) { return }
        val (ds, bayMoi) = docTin(r)
        val (bao, daThay) = locTinMoi(ds, k.tinDaThay, bay == null)
        k.tinDaThay = daThay
        bayMoi?.let { k.tinBay = it }
        if (bao.isEmpty()) return
        napTongQuan(ctx)
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val dau = bao.first()
        val tieu = if (bao.size == 1) dau.tieu else "Có ${bao.size} tin mới từ Ba Mẹ"
        val noi = if (bao.size == 1) dau.noi else bao.take(4).joinToString("\n") { "${it.tieu}: ${it.noi}" }
        nm.notify(MA_TIN, thongBao(ctx, tieu, noi, duongChoTin(dau), 30))
        NhatKy.tin(TAG, "báo ${bao.size} tin mới")
    }

    private fun thongBao(ctx: Context, tieu: String, noi: String, duong: String?, maYeuCau: Int) =
        NotificationCompat.Builder(ctx, KENH_TIN)
            .setSmallIcon(R.drawable.ic_aiigrow).setColor(Diu.KIM_DAM)
            .setContentTitle(tieu).setContentText(noi.lineSequence().first()).setStyle(NotificationCompat.BigTextStyle().bigText(noi))
            .setPriority(NotificationCompat.PRIORITY_HIGH).setCategory(NotificationCompat.CATEGORY_MESSAGE).setAutoCancel(true)
            .setContentIntent(PendingIntent.getActivity(ctx, maYeuCau,
                if (duong != null) Intent(ctx, ManTre::class.java).putExtra(ManTre.DUONG, duong) else Intent(ctx, ManChinh::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            .build()

    // ------------------------------------------------------------ lời xin thêm giờ (như RequestForm.cs › PollAsync)
    fun ghiLoiXin(ctx: Context, id: String?, phut: Int, daDuyet: Boolean, vay: Boolean = false) {
        val k = Kho(ctx)
        k.yeuCauId = id; k.yeuCauPhut = phut; k.yeuCauLuc = System.currentTimeMillis(); k.yeuCauVay = vay
        // không có id (máy chủ cũ) ⇒ không theo dõi được ⇒ không hiện «đang chờ» mãi
        k.yeuCauTrangThai = if (daDuyet) TrangThaiXin.DUOC.name else if (id != null) TrangThaiXin.CHO.name else null
    }

    /** Câu trạng thái lời xin gần nhất cho thẻ trên màn chính (null = không có / đã cũ quá 24 giờ). */
    fun cauLoiXin(k: Kho): String? {
        if (k.yeuCauTrangThai == null || System.currentTimeMillis() - k.yeuCauLuc > HOI_XIN_TOI_DA_MS) return null
        val t = try { TrangThaiXin.valueOf(k.yeuCauTrangThai!!) } catch (_: Exception) { return null }
        return if (k.yeuCauVay) cauXinVay(t, k.yeuCauPhut) else cauXin(t, k.yeuCauPhut)
    }

    fun hoiLoiXin(ctx: Context) {
        val k = Kho(ctx)
        val id = k.yeuCauId ?: return
        if (k.token == null || k.yeuCauTrangThai != TrangThaiXin.CHO.name || System.currentTimeMillis() - k.yeuCauLuc > HOI_XIN_TOI_DA_MS) return
        val t = try { docTrangThaiXin(may(k).goi("yeu-cau/$id")) } catch (e: MayChu.Loi) {
            if (e.http == 404) k.yeuCauTrangThai = TrangThaiXin.HET_HAN.name; return
        } catch (_: Exception) { return }
        if (t == TrangThaiXin.CHO) return
        k.yeuCauTrangThai = t.name
        if (t == TrangThaiXin.DUOC) DichVuNhip.lamMoi(ctx)
        (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(MA_XIN, thongBao(ctx, if (t == TrangThaiXin.DUOC) (if (k.yeuCauVay) "Ba Mẹ cho vay sao!" else "Ba Mẹ đã đồng ý") else "Ba Mẹ đã trả lời",
                if (k.yeuCauVay) cauXinVay(t, k.yeuCauPhut) else cauXin(t, k.yeuCauPhut), null, 31))
    }

    // ------------------------------------------------------------ #686 lời xin app / web (hộp «Xin thêm app / web», màn chặn app)
    private val khoaXinApp = Any()
    private const val MA_XIN_APP = 22   // mỗi lời xin một thông báo (tag = id lời xin)
    private const val MA_XIN_KHONG_GUI = 23

    /** Lời xin app / web vừa gửi (có id) ⇒ nhớ bền: hộp xin đóng / tiến trình bị tắt thì nhịp sau vẫn hỏi và báo kết quả. */
    fun ghiXinApp(ctx: Context, id: String, ten: String) = synchronized(khoaXinApp) {
        val k = Kho(ctx)
        val con = PinMay.nguoiDung(k)?.conId ?: ""
        k.xinAppCho = jsonXinAppCho(themXinAppCho(docXinAppCho(k.xinAppCho), XinAppCho(id, ten, System.currentTimeMillis(), con), System.currentTimeMillis()))
    }

    /** Id lời xin mà hộp xin đang tự hỏi kết quả (trong bộ nhớ: tiến trình bị tắt thì nhịp nền nhận lại). */
    private val hopHoi = HashMap<String, Int>()   // id → số hộp đang hỏi (màn chặn + hộp «Xin thêm» cùng một lời xin)
    fun hopDangHoi(id: String, dang: Boolean) {
        synchronized(hopHoi) {
            val n = (hopHoi[id] ?: 0) + if (dang) 1 else -1
            if (n > 0) hopHoi[id] = n else hopHoi.remove(id)
        }
    }
    private fun hopDangHoi(id: String) = synchronized(hopHoi) { id in hopHoi }
    /** Lần nhịp nền hỏi gần nhất của từng lời xin (bộ nhớ) — lời xin chờ lâu hỏi thưa (logic/ChayNen.kt › nenHoiXinApp). */
    private val lanHoiXinApp = java.util.concurrent.ConcurrentHashMap<String, Long>()

    /** Hộp xin đã tự hiện kết quả cho Con ⇒ thôi theo dõi (không báo lần hai). */
    fun xongXinApp(ctx: Context, id: String) = synchronized(khoaXinApp) {
        val k = Kho(ctx)
        val ds = docXinAppCho(k.xinAppCho)
        if (ds.any { it.id == id }) k.xinAppCho = jsonXinAppCho(ds.filter { it.id != id })
    }

    /** Mỗi nhịp: hỏi các lời xin app / web còn chờ (≤ 24 giờ, trừ lời xin hộp xin đang tự hỏi); Ba Mẹ đã trả lời ⇒ bỏ khỏi danh sách, thông báo
     *  nếu đúng bé xin đang dùng máy (máy chung đã Đổi người ⇒ không báo bé khác). */
    fun hoiXinApp(ctx: Context) {
        val k = Kho(ctx)
        if (k.token == null || k.cheDoThu) return
        val ds = synchronized(khoaXinApp) {
            val tat = docXinAppCho(k.xinAppCho)
            conHanXinAppCho(tat, System.currentTimeMillis()).also { if (it.size != tat.size) k.xinAppCho = jsonXinAppCho(it) }
        }
        val now = System.currentTimeMillis()
        for (x in ds) {
            if (hopDangHoi(x.id) || !nenHoiXinApp(now - x.luc, lanHoiXinApp[x.id]?.let { now - it })) continue
            lanHoiXinApp[x.id] = now
            // 404 = máy chủ không còn lời xin ⇒ báo «hết hạn» như hộp xin (không bỏ im lặng)
            val kq = try { docKetQuaXinApp(may(k).yeuCau(x.id)) } catch (e: MayChu.Loi) {
                if (e.http == 404) KetQuaXinApp(LoaiKetQuaXin.HET_HAN, null) else continue
            } catch (_: Exception) { return }   // mất mạng ⇒ nhịp sau
            if (kq.loai == LoaiKetQuaXin.CHO) continue
            synchronized(khoaXinApp) {
                val con = docXinAppCho(k.xinAppCho)
                if (con.none { it.id == x.id }) return@synchronized null   // hộp xin vừa tự báo xong
                k.xinAppCho = jsonXinAppCho(con.filter { it.id != x.id }); Unit
            } ?: continue
            lanHoiXinApp.remove(x.id)
            val (tieu, _, cau) = chuKetQuaXinApp(kq, x.ten)
            if (kq.loai == LoaiKetQuaXin.DA_THEM) DichVuNhip.lamMoi(ctx)
            if ((PinMay.nguoiDung(k)?.conId ?: "") != x.con) { NhatKy.tin(TAG, "lời xin app / web của bé trước có kết quả — không báo bé đang dùng"); continue }
            try {
                (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                    .notify(x.id, MA_XIN_APP, thongBao(ctx, tieu, cau, null, 32))
            } catch (_: SecurityException) {}
            NhatKy.tin(TAG, "báo kết quả lời xin app / web: ${kq.loai}")
        }
    }

    /** #684: lời xin lưu lúc mất mạng không tới được Ba Mẹ ⇒ báo Con (thông báo lời xin), không bỏ im lặng. */
    fun baoXinKhongGui(ctx: Context, cau: String) {
        NhatKy.tin(TAG, "báo Con: lời xin chờ mạng không gửi được")
        try {
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .notify(MA_XIN_KHONG_GUI, thongBao(ctx, "Lời xin chưa tới Ba Mẹ", cau, null, 31))
        } catch (_: SecurityException) {}
    }

    // ------------------------------------------------------------ chơi bằng điểm (như ChoiBangDiemForm / RequestForm.ExchangeAsync)
    fun xet(ctx: Context, muc: String): KetXet {
        val k = Kho(ctx)
        if (k.cheDoThu || k.token == null) return KetXet(false, 0, 0, CAU_THU)
        return try { docXet(may(k).goi("phien/xet", JSONObject().put("muc", muc))) }
        catch (e: MayChu.Loi) { KetXet(false, 0, 0, e.cau) } catch (_: Exception) { KetXet(false, 0, 0, "Chưa đổi được — máy đang mất mạng.") }
    }

    /** Mở phiên ⇒ null nếu được (lưu id để máy này nhịp phiên), câu lỗi nếu không. */
    fun mo(ctx: Context, muc: String): String? {
        val k = Kho(ctx)
        if (k.cheDoThu || k.token == null) return CAU_THU
        return try {
            val r = may(k).goi("phien/mo", JSONObject().put("muc", muc))
            k.phienId = r.optString("id").ifBlank { null }
            NhatKy.tin(TAG, "mở phiên điểm $muc (${r.optInt("phutToiDa")} phút)")
            DichVuNhip.lamMoi(ctx)
            null
        } catch (e: MayChu.Loi) { e.cau } catch (_: Exception) { "Chưa đổi được — máy đang mất mạng." }
    }

    fun dung(ctx: Context): String? {
        val k = Kho(ctx)
        val id = k.phienId ?: return null
        if (k.token == null) return CAU_THU
        return try { may(k).goi("phien/dung", JSONObject().put("id", id)); ketThuc(ctx, k, id); null }
        catch (e: MayChu.Loi) { e.cau } catch (_: Exception) { "Chưa dừng được — máy đang mất mạng." }
    }

    /** Con trả lời lời nhắn của Ba Mẹ (hoc-vien/loi-khen/:id/phan-hoi) ⇒ null nếu được, câu lỗi nếu không. */
    fun traLoi(ctx: Context, id: String, noi: String): String? {
        val k = Kho(ctx)
        if (k.cheDoThu || k.token == null) return CAU_THU
        return try { may(k).goi("hoc-vien/loi-khen/$id/phan-hoi", JSONObject().put("phanHoi", noi)); napTongQuan(ctx); null }
        catch (e: MayChu.Loi) { e.cau } catch (_: Exception) { "Chưa gửi được — máy đang mất mạng." }
    }

    /** Nhịp phiên điểm do máy này mở (mỗi 60 giây): «đang dùng» = app giải trí ở tiền cảnh ⇒ máy chủ trừ điểm theo phút thật. */
    fun nhipPhien(ctx: Context, cs: ChinhSach?) {
        val k = Kho(ctx)
        val id = k.phienId ?: return
        if (k.token == null) return
        val dangDung = dangDungPhien(DoPhut.tienCanh(ctx), goiAndroid(cs?.giaiTri ?: emptyList()))
        try {
            val r = may(k).goi("phien/nhip", JSONObject().put("id", id).put("dangDung", dangDung))
            if (phienKetThuc(r)) { ketThuc(ctx, k, id); NhatKy.tin(TAG, "phiên điểm kết thúc: ${r.optString("lyDoKet")}") }
        } catch (e: MayChu.Loi) { if (e.http == 404) ketThuc(ctx, k, id) } catch (_: Exception) {}
    }

    /** Phiên `id` đã hết: quên id (chỉ khi vẫn là phiên đó — Con có thể vừa mở phiên mới), nhớ id đã hết để luật nhớ (`cs.phien`) không mở
     *  giải trí tiếp khi nhịp máy đang lỗi, rồi áp luật lại ngay. */
    private fun ketThuc(ctx: Context, k: Kho, id: String) {
        synchronized(this) { if (k.phienId == id) k.phienId = null }
        k.phienHet = id
        DichVuNhip.lamMoi(ctx)
    }
}
