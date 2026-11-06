package vn.aiilab.aiigrow.maycon

import android.content.Context
import org.json.JSONObject
import vn.aiilab.aiigrow.maycon.logic.BeHoSo
import vn.aiilab.aiigrow.maycon.logic.Cong
import vn.aiilab.aiigrow.maycon.logic.DemPin
import vn.aiilab.aiigrow.maycon.logic.HoSoMay
import vn.aiilab.aiigrow.maycon.logic.KetQuaMoOffline
import vn.aiilab.aiigrow.maycon.logic.KetQuaPin
import vn.aiilab.aiigrow.maycon.logic.LoaiNguoiDung
import vn.aiilab.aiigrow.maycon.logic.NguoiDung
import vn.aiilab.aiigrow.maycon.logic.ViecCho
import vn.aiilab.aiigrow.maycon.logic.cauPin
import vn.aiilab.aiigrow.maycon.logic.docHoSo
import vn.aiilab.aiigrow.maycon.logic.docLoiPin
import vn.aiilab.aiigrow.maycon.logic.docNguoiDung
import vn.aiilab.aiigrow.maycon.logic.thuPinOffline
import vn.aiilab.aiigrow.maycon.logic.xetCong
import java.io.IOException

/**
 * PIN theo bé trên máy Android (L13): chọn tên → PIN 4 số → `dang-nhap-be`; «Quên PIN», «Ba Mẹ nhập mã» (`ba-me-mo` hoặc tự kiểm mã offline),
 * «Đổi bé / Đăng xuất» (`dang-xuat`), «Khoá lại» (`khoa-lai`). MẤT MẠNG: kiểm PIN bằng `vanPin` nhớ từ `ho-so`, tự đếm 5 lần / 15 giây,
 * việc tại máy gửi bù khi có mạng (ViecCho). Mọi hàm gọi mạng chạy trên luồng nền. Logic thuần: logic/PinBe.kt.
 */
object PinMay {
    private const val TAG = "AiiGrowPin"
    private val khoa = Any()

    fun nguoiDung(k: Kho) = NguoiDung.doc(k.nguoiDung)
    fun hoSo(k: Kho, now: Long = System.currentTimeMillis()): HoSoMay? =
        try { k.hoSo?.let { docHoSo(JSONObject(it), now) } } catch (_: Exception) { null }

    fun cong(k: Kho, now: Long = System.currentTimeMillis()): Cong = xetCong(nguoiDung(k), hoSo(k, now), k.baMeDen, now)

    /** Hạn «Ba Mẹ đang dùng» hiệu lực (máy chủ hoặc mã gõ lúc mất mạng), 0 nếu không. */
    fun baMeDen(k: Kho, now: Long = System.currentTimeMillis()): Long {
        val nd = nguoiDung(k)
        return maxOf(k.baMeDen, if (nd?.loai == LoaiNguoiDung.BA_ME) nd.baMeDen ?: 0 else 0).takeIf { it > now } ?: 0
    }

    /** Tên bé đang dùng máy (chip «Bảo Anh ▾»). */
    fun tenDangDung(k: Kho): String? = nguoiDung(k)?.takeIf { it.loai == LoaiNguoiDung.CON }?.let { it.tenCon ?: hoSo(k)?.be(it.conId)?.ten }

    /** Đổi người dùng tại máy (ghi lạc quan; nhịp đang bay về sau đó không ghi đè — xem sauNhip). */
    private fun datNguoi(k: Kho, nd: NguoiDung, dangDung: String?) {
        k.nguoiDung = nd.json(); k.lanDoiNguoi = System.currentTimeMillis()
        // hồ sơ nhớ: bé đang dùng (máy riêng dựa vào đây để biết đã vào bằng PIN)
        k.hoSo?.let { s -> try { k.hoSo = JSONObject(s).apply { if (dangDung != null) put("dangDung", JSONObject().put("id", dangDung)) else put("dangDung", JSONObject.NULL) }.toString() } catch (_: Exception) {} }
    }

    // ------------------------------------------------------------------ đồng bộ với nhịp (luồng nhịp của DichVuNhip)

    /** Trước nhịp: gửi bù việc làm lúc mất mạng (bé vào bằng PIN kiểm offline / đăng xuất). */
    fun guiViecCho(k: Kho) = synchronized(khoa) {
        val v = ViecCho.doc(k.viecCho) ?: return@synchronized
        val may = MayChu(k.mayChu, k.token)
        try {
            when (v.loai) {
                "vao" -> v.conId?.let { may.dangNhapBe(it, v.pin) }
                else -> may.dangXuat()
            }
            k.viecCho = null
        } catch (e: MayChu.Loi) {
            k.viecCho = null
            // PIN đã đổi / bé bị gỡ khỏi máy ⇒ về màn chọn tên
            if (v.loai == "vao") { NhatKy.canh(TAG, "gửi bù dang-nhap-be bị từ chối: ${e.ma}"); datNguoi(k, NguoiDung(LoaiNguoiDung.CHUA), null) }
        } catch (_: IOException) { /* còn mất mạng — giữ lại */ }
    }

    /** Sau nhịp thành công: nhận `nguoiDung` (trừ khi tại máy vừa đổi người sau lúc nhịp bắt đầu, hoặc còn việc chưa gửi), lấy lại hồ sơ khi cần. */
    fun sauNhip(k: Kho, r: JSONObject, batDau: Long) {
        val nd = docNguoiDung(r)
        synchronized(khoa) {
            if (k.lanDoiNguoi < batDau && k.viecCho == null) {
                val cu = nguoiDung(k)
                k.nguoiDung = nd?.json()
                if (nd?.loai != cu?.loai || nd?.conId != cu?.conId) k.lanHoSo = 0   // đổi người ⇒ lấy hồ sơ mới
            }
        }
        if (nd == null) return
        val now = System.currentTimeMillis()
        val canGap = cong(k, now) == Cong.CHON_TEN && now - k.lanHoSo > 60_000
        if (canGap || now - k.lanHoSo > 10 * 60_000L || k.hoSo == null) napHoSo(k)
    }

    fun napHoSo(k: Kho): Boolean = try {
        val r = MayChu(k.mayChu, k.token).hoSo()
        val now = System.currentTimeMillis()
        synchronized(khoa) {
            k.hoSo = r.toString(); k.lanHoSo = now
            // bé đang bị chờ ở máy chủ ⇒ nhớ để mất mạng ngay sau đó vẫn chờ đúng
            var d = DemPin.doc(k.demPin)
            docHoSo(r, now).con.forEach { b -> b.khoaDen?.let { d = d.khoaTheoMayChu(b.id, it) } }
            k.demPin = d.json()
        }
        true
    } catch (e: Exception) { NhatKy.tin(TAG, "chưa lấy được hồ sơ: ${e.message}"); false }

    // ------------------------------------------------------------------ hành động trên màn (gọi trên luồng nền)

    sealed class KetQuaVao {
        object Vao : KetQuaVao()
        data class Loi(val kq: KetQuaPin?, val cau: String) : KetQuaVao()
    }

    /** Bé chạm tên (+ PIN). Có mạng ⇒ máy chủ kiểm; mất mạng ⇒ kiểm bằng vân PIN đã nhớ. */
    fun dangNhap(ctx: Context, be: BeHoSo, pin: String?): KetQuaVao {
        val k = Kho(ctx)
        if (k.cheDoThu) { datNguoi(k, NguoiDung(LoaiNguoiDung.CON, be.id, be.ten, be.coPin), be.id); DichVuNhip.apNgay(ctx); return KetQuaVao.Vao }
        try {
            MayChu(k.mayChu, k.token).dangNhapBe(be.id, if (be.coPin) pin else null)
            synchronized(khoa) {
                k.viecCho = null; k.baMeDen = 0
                k.demPin = DemPin.doc(k.demPin).thu(be.id, true, System.currentTimeMillis()).second.json()
                datNguoi(k, NguoiDung(LoaiNguoiDung.CON, be.id, be.ten, be.coPin), be.id)
            }
            NhatKy.tin(TAG, "bé vào máy (máy chủ kiểm)")
            DichVuNhip.lamMoi(ctx)
            return KetQuaVao.Vao
        } catch (e: MayChu.Loi) {
            val kq = docLoiPin(e.ma, e.than)
            if (kq is KetQuaPin.TamKhoa) synchronized(khoa) {
                k.demPin = DemPin.doc(k.demPin).khoaTheoMayChu(be.id, System.currentTimeMillis() + kq.choGiay * 1000L).json()
            }
            return KetQuaVao.Loi(kq, if (kq != null) cauPin(kq) else e.cau)
        } catch (_: IOException) { /* mất mạng ⇒ kiểm tại máy */ }
        val now = System.currentTimeMillis()
        val hs = hoSo(k, now)
        val (kq, d) = synchronized(khoa) {
            thuPinOffline(DemPin.doc(k.demPin), k.maOfflineBiMat, hs?.be(be.id) ?: be, pin ?: "", now,
                hs?.pinSaiToiDa ?: 5, hs?.pinChoGiay ?: 15).also { k.demPin = it.second.json() }
        }
        if (kq != KetQuaPin.Dung) return KetQuaVao.Loi(kq, cauPin(kq))
        synchronized(khoa) {
            k.baMeDen = 0
            k.viecCho = ViecCho("vao", be.id, if (be.coPin) pin else null, now).json()   // có mạng lại ⇒ báo máy chủ bé đang dùng
            datNguoi(k, NguoiDung(LoaiNguoiDung.CON, be.id, be.ten, be.coPin), be.id)
        }
        NhatKy.tin(TAG, "bé vào máy lúc mất mạng (kiểm PIN tại máy), d=${d.khoaDen.size}")
        DichVuNhip.apNgay(ctx)
        return KetQuaVao.Vao
    }

    /** «Đổi bé / Đăng xuất» (bé) hoặc «Khoá lại» (Ba Mẹ): máy về màn chọn tên ngay, báo máy chủ (mất mạng ⇒ gửi bù). */
    fun roiMay(ctx: Context, baMe: Boolean) {
        val k = Kho(ctx)
        synchronized(khoa) { k.baMeDen = 0; datNguoi(k, NguoiDung(LoaiNguoiDung.CHUA), null) }
        DichVuNhip.apNgay(ctx)
        if (k.cheDoThu) return
        Thread {
            try { MayChu(k.mayChu, k.token).let { if (baMe) it.khoaLai() else it.dangXuat() }; synchronized(khoa) { k.viecCho = null } }
            catch (_: MayChu.Loi) {}
            catch (_: IOException) { synchronized(khoa) { k.viecCho = ViecCho("roi", luc = System.currentTimeMillis()).json() } }
        }.start()
    }

    /** «Báo Ba Mẹ giúp con». */
    fun quenPin(ctx: Context, conId: String): String {
        val k = Kho(ctx)
        if (k.cheDoThu) return "Đã báo Ba Mẹ (chế độ thử)."
        return try {
            val r = MayChu(k.mayChu, k.token).quenPin(conId)
            if (r.optBoolean("lapLai")) "Ba Mẹ đã nhận báo rồi. Chờ Ba Mẹ đặt PIN mới nhé." else "Đã báo Ba Mẹ. Ba Mẹ đặt PIN mới là con vào được."
        } catch (e: MayChu.Loi) { e.cau } catch (_: IOException) { "Máy đang mất mạng — chưa báo được. Nhờ Ba Mẹ đọc mã mở máy nhé." }
    }

    /** «Mở máy cho Ba Mẹ»: có mạng ⇒ `ba-me-mo`; mất mạng ⇒ tự kiểm mã (60 / 30 / 15 phút, mỗi mã một lượt, sai 5 lần chờ). null = đã mở. */
    fun baMeMo(ctx: Context, ma: String): String? {
        val k = Kho(ctx)
        val sach = ma.filter { it.isDigit() }
        if (sach.length != 6) return "Mã gồm đúng 6 chữ số."
        if (!k.cheDoThu) try {
            val r = MayChu(k.mayChu, k.token).baMeMo(sach)
            val den = r.optJSONObject("baMeDung")?.optString("den")?.let { try { java.time.Instant.parse(it).toEpochMilli() } catch (_: Exception) { null } }
                ?: (System.currentTimeMillis() + r.optInt("phut", 15) * 60_000L)
            synchronized(khoa) { k.viecCho = null; datNguoi(k, NguoiDung(LoaiNguoiDung.BA_ME, baMeDen = den), null) }
            NhatKy.tin(TAG, "Ba Mẹ mở máy bằng mã (máy chủ), ${r.optInt("phut")} phút")
            DichVuNhip.lamMoi(ctx)
            return null
        } catch (e: MayChu.Loi) {
            return when (e.ma) {
                "ma_sai" -> "Mã chưa đúng · còn ${e.than.optInt("conLan")} lần thử"
                "ma_tam_khoa" -> "Nhập sai nhiều lần — thử lại sau ${maxOf(1, (e.than.optInt("choGiay", 600) + 59) / 60)} phút."
                "ma_da_dung" -> "Mã này đã dùng rồi — mở app Ba Mẹ lấy mã mới."
                else -> e.cau
            }
        } catch (_: IOException) { /* mất mạng ⇒ tự kiểm */ }
        val (kq, den, cau) = MoMaOffline.thuMa(ctx, sach)
        if (kq != KetQuaMoOffline.DA_MO || den == null) return cau
        synchronized(khoa) {
            k.baMeDen = den
            datNguoi(k, NguoiDung(LoaiNguoiDung.CHUA), null)   // bé đang dùng bị đăng xuất (máy chủ làm vậy khi Ba Mẹ mở)
            if (!k.cheDoThu) k.viecCho = ViecCho("roi", luc = System.currentTimeMillis()).json()
        }
        DichVuNhip.apNgay(ctx)
        return null
    }

    /** Máy rời gia đình / ghép lại ⇒ quên hồ sơ, người dùng, bộ đếm. */
    fun quen(k: Kho) = synchronized(khoa) {
        k.hoSo = null; k.lanHoSo = 0; k.nguoiDung = null; k.baMeDen = 0; k.demPin = null; k.viecCho = null; k.lanDoiNguoi = 0
    }
}
