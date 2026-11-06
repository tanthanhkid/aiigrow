package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.graphics.drawable.ColorDrawable
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import vn.aiilab.aiigrow.maycon.logic.Cong
import vn.aiilab.aiigrow.maycon.logic.KetQuaMoOffline
import vn.aiilab.aiigrow.maycon.logic.TrangThai
import vn.aiilab.aiigrow.maycon.logic.chiNgoaiLe
import vn.aiilab.aiigrow.maycon.logic.mmss
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Giao diện dựng bằng code (không thư viện UI). 06/11: phía Con chuyển sang bản «Dịu» (Diu.kt — L16): nền kem, một màu nhấn xanh,
 * thẻ trắng viền mảnh, nút 52dp màu đặc, Nunito. Vùng chạm ≥ 48dp, chữ tiếng Việt có dấu. Hàm ở đây giữ chữ ký cũ để ManChinh / ManKhoa /
 * TroNang dùng chung; vẽ thật ở Diu.kt.
 */
object GiaoDien {
    const val XANH = Diu.XANH
    const val XANH_NHAT = Diu.XANH_NHAT
    const val NEN = Diu.NEN
    const val CHU = Diu.CHU
    const val CHU_PHU = Diu.CHU2
    const val TRANG = Diu.TRANG

    fun dp(c: Context, v: Int) = Diu.dp(c, v)

    /** Nền màn: kem phẳng. */
    fun nenMan() = ColorDrawable(NEN)

    fun cot(c: Context, pad: Int = 20) = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(c, pad), dp(c, pad), dp(c, pad), dp(c, pad))
    }

    fun chu(c: Context, s: String, co: Float = 16f, mau: Int = CHU, dam: Boolean = false) = Diu.chu(c, s, co, mau, dam && co >= 20f)

    /** Dòng báo dưới nút (lỗi / đang gửi): rỗng thì ẩn hẳn. */
    fun dongBao(c: Context, mau: Int) = chu(c, "", 14f, mau).apply {
        visibility = View.GONE; setPadding(0, dp(c, 8), 0, 0)
        addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, d: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, d: Int) {}
            override fun afterTextChanged(e: android.text.Editable?) { visibility = if (e.isNullOrEmpty()) View.GONE else View.VISIBLE }
        })
    }

    /** Thẻ: trắng (mặc định) hoặc thẻ màu nhạt (mọi màu khác ⇒ xanh nhạt — Dịu chỉ có một màu nhấn). */
    fun the(c: Context, nen: Int = TRANG) = Diu.the(c, if (nen == TRANG) TRANG else XANH_NHAT)

    /** Hàng tiêu đề thẻ: icon nhỏ trong vòng xanh nhạt + chữ (Dịu: không khối clay). */
    fun dauKhoi(c: Context, hinh: Int, s: String, @Suppress("UNUSED_PARAMETER") nenVien: Int = 0, co: Float = 18f, mau: Int = CHU) = LinearLayout(c).apply {
        orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
        addView(FrameLayout(c).apply {
            background = Diu.tron(XANH_NHAT)
            addView(ImageView(c).apply { setImageResource(hinh); importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO },
                FrameLayout.LayoutParams(dp(c, 22), dp(c, 22), Gravity.CENTER))
            layoutParams = LinearLayout.LayoutParams(dp(c, 36), dp(c, 36))
        })
        addView(Diu.chu(c, s, co, mau, true).apply {
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(c, 10) }
        })
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(c, 6) }
    }

    /** Nút 52dp. Chính = xanh đặc; `phu` = trắng viền chữ xanh đậm; `ngoc` (cũ) = chính. */
    fun nut(c: Context, s: String, phu: Boolean = false, @Suppress("UNUSED_PARAMETER") ngoc: Boolean = false, onClick: (View) -> Unit) =
        Diu.nut(c, s, if (phu) Diu.KieuNut.PHU else Diu.KieuNut.CHINH, onClick)

    fun chonTrongNhom(c: Context, b: Button, chon: Boolean) = Diu.chon(c, b, chon)

    fun gio(ms: Long): String = DateTimeFormatter.ofPattern("HH:mm").format(Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()))

    fun tieuDeKhoa(t: String) = when (t) {
        TrangThai.KHOA_NGAY.name -> "Ba Mẹ đang khoá máy"
        TrangThai.GIO_NGU.name -> "Đến giờ ngủ rồi"
        TrangThai.HET_GIO.name -> "Hết giờ chơi"
        TrangThai.NGOAI_KHUNG.name -> "Chưa tới giờ chơi"
        TrangThai.GIO_HOC.name -> "Đang giờ học"
        else -> "AiiGrow"
    }

    /** Dòng đếm ngược trên màn khoá. */
    fun dongDemNguoc(ht: HienThi, now: Long = System.currentTimeMillis()): String = when {
        ht.demNguoc > 0 -> "Khoá sau ${mmss(ht.demNguoc)}"
        ht.moLaiLuc > now -> mmssDai(((ht.moLaiLuc - now) / 1000).toInt())
        else -> "Chờ Ba Mẹ mở"
    }

    fun mmssDai(giay: Int): String = if (giay >= 3600) "%d:%02d:%02d".format(giay / 3600, giay % 3600 / 60, giay % 60) else mmss(giay)

    /** Icon Fluent 3D theo lý do khoá (Dịu: icon nhỏ trong vòng xanh nhạt, không robot ở màn khoá thường). */
    fun hinhKhoa(t: String, chanApp: Boolean) = when {
        chanApp -> R.drawable.fl_khoa
        t == TrangThai.GIO_NGU.name -> R.drawable.fl_trang
        t == TrangThai.HET_GIO.name -> R.drawable.fl_dong_ho_cat
        t == TrangThai.NGOAI_KHUNG.name || t == TrangThai.GIO_HOC.name -> R.drawable.fl_dong_ho
        else -> R.drawable.fl_khoa
    }

    /**
     * Màn khoá / màn chặn dùng chung cho ManKhoa (activity) và TroNang (lớp phủ trợ năng) — khớp `con-dt-gio/09-cdt-android-khoa`
     * («Ba Mẹ đang khoá máy · 30:00 · Mở lại lúc 20:10 · Xin Ba Mẹ mở máy · Mất mạng? Nhập mã của Ba Mẹ · Ba Mẹ mở máy»), ô mã offline
     * theo `con-dt-chan/04..07` (6 ô + bàn phím to, «Mã chưa đúng», «Mã hết hạn rồi», «Máy mở rồi!»). Máy ở cổng PIN (chọn tên) ⇒ hiện ManPin.
     * Giờ ngủ ⇒ nền tối dịu. Bàn phím tự vẽ ⇒ lớp phủ trợ năng không cần bàn phím hệ thống.
     */
    class ManKhoaView(val c: Context, val onXin: () -> Unit, val onVe: (() -> Unit)?, val onMa: ((String) -> Triple<KetQuaMoOffline, Long?, String>)? = null,
                      /** 05/11: app chưa được Ba Mẹ cho phép ⇒ «Xin Ba Mẹ duyệt» gửi thẳng (api/device/xin-duyet), không mở màn xin giờ. */
                      val onDuyet: ((String) -> Unit)? = null) {
        private val h = Handler(Looper.getMainLooper())
        private var goiDuyet: String? = null
        private val cot = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL; setPadding(dp(c, 20), dp(c, 20), dp(c, 20), dp(c, 20)) }
        val goc = ScrollView(c).apply {
            background = nenMan(); isFillViewport = true; clipToPadding = false
            addView(cot, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            val toiThieu = dp(c, 24)
            setPadding(0, toiThieu, 0, toiThieu)
            setOnApplyWindowInsetsListener { v, i -> @Suppress("DEPRECATION") v.setPadding(0, maxOf(toiThieu, i.systemWindowInsetTop), 0, maxOf(toiThieu, i.systemWindowInsetBottom)); i }
        }
        /** Phần khoá thường (ẩn khi máy ở cổng chọn tên). */
        private val phanKhoa = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL }
        private val anh = ImageView(c).apply { setImageResource(R.drawable.fl_khoa); importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO }
        private val vien = FrameLayout(c).apply {
            background = Diu.tron(XANH_NHAT)
            addView(anh, FrameLayout.LayoutParams(dp(c, 48), dp(c, 48), Gravity.CENTER))
            layoutParams = LinearLayout.LayoutParams(dp(c, 88), dp(c, 88)).apply { gravity = Gravity.CENTER_HORIZONTAL; topMargin = dp(c, 12) }
        }
        val tieuDe = Diu.chu(c, "", 26f, CHU, true).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 14), 0, 0) }
        val cau = Diu.chu(c, "", 16f, Diu.CHU2).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 6), 0, 0) }
        private val theDem = Diu.the(c).apply { gravity = Gravity.CENTER_HORIZONTAL }
        val dem = Diu.chu(c, "", 44f, CHU, true).apply { gravity = Gravity.CENTER; fontFeatureSettings = "tnum" }
        private val moLai = Diu.chu(c, "", 15f, Diu.CHU2).apply { gravity = Gravity.CENTER }
        private val goiY = Diu.chu(c, "Đọc sách hoặc ra ngoài chơi nhé!", 15f, Diu.XANH_DAM).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 6), 0, 0) }
        val nutXin = Diu.nut(c, "Xin Ba Mẹ mở máy") { val g = goiDuyet; val f = onDuyet; if (g != null && f != null) f(g) else onXin() }
        private val linkMa = Diu.nut(c, "Mất mạng? Nhập mã của Ba Mẹ", Diu.KieuNut.CHU) { moNhapMa(false) }
        private val linkBaMe = Diu.nut(c, "Ba Mẹ mở máy", Diu.KieuNut.CHU) { moNhapMa(true) }
        val nutVe = onVe?.let { f -> Diu.nut(c, "Về màn hình chính", Diu.KieuNut.PHU) { f() } }
        val ghi = Diu.chu(c, "Vẫn gọi được Ba Mẹ · Máy do Ba Mẹ quản lý bằng AiiGrow", 13f, Diu.CHU3).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 16), 0, 0) }

        // ---- nhập mã (mất mạng: mã mở máy của Con; «Ba Mẹ mở máy»: chế độ Ba Mẹ dùng máy)
        private var maBaMe = false
        private var maGo = ""
        private var dangGui = false
        /** Vừa mở bằng mã offline ⇒ giữ thẻ «Máy mở rồi!» thay vì ẩn khi ô mã hết cần. */
        private var daMoBangMa = false
        private val oMa = Diu.OMa(c)
        private val tieuMa = Diu.chu(c, "", 20f, CHU, true).apply { gravity = Gravity.CENTER }
        private val phuMa = Diu.chu(c, "", 15f, Diu.CHU2).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 4), 0, 0) }
        private val baoMa = Diu.chu(c, "", 15f, Diu.LOI_DAM, true).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 8), 0, 0); visibility = View.GONE }
        private val theMa = Diu.the(c).apply {
            gravity = Gravity.CENTER_HORIZONTAL; visibility = View.GONE
            addView(tieuMa); addView(phuMa); addView(oMa.goc)
            addView(baoMa)
            addView(Diu.banPhim(c, { s -> if (maGo.length < 6 && !dangGui) { maGo += s; veMa(false) } }, { if (maGo.isNotEmpty()) { maGo = maGo.dropLast(1); veMa(false) } }))
            addView(Diu.nut(c, "Mở máy bằng mã") { guiMa() })
            addView(Diu.nut(c, "Đóng", Diu.KieuNut.CHU) { visibility = View.GONE; maGo = "" })
        }

        /** Cổng PIN (chọn tên → PIN …) — ManPin.kt. */
        val pin = ManPin(c)

        init {
            phanKhoa.addView(vien); phanKhoa.addView(tieuDe); phanKhoa.addView(cau)
            theDem.addView(dem); theDem.addView(moLai); theDem.addView(goiY)
            phanKhoa.addView(theDem); phanKhoa.addView(nutXin); nutVe?.let(phanKhoa::addView)
            phanKhoa.addView(linkMa); phanKhoa.addView(linkBaMe); phanKhoa.addView(theMa); phanKhoa.addView(ghi)
            cot.addView(phanKhoa); cot.addView(pin.goc)
            pin.goc.visibility = View.GONE
            oMa.ve("")
        }

        private fun moNhapMa(baMe: Boolean) {
            maBaMe = baMe; maGo = ""; daMoBangMa = false; baoMa.visibility = View.GONE
            tieuMa.text = if (baMe) "Ba Mẹ nhập mã" else "Mất mạng"
            phuMa.text = if (baMe) "Mở app AiiGrow của Ba Mẹ → Mã mở máy" else "Ba Mẹ ở cạnh con? Nhờ Ba Mẹ đọc mã 6 số trong AiiGrow."
            theMa.visibility = View.VISIBLE; veMa(false)
            goc.post { goc.smoothScrollTo(0, theMa.top + phanKhoa.top) }
        }

        private fun veMa(sai: Boolean) = oMa.ve(maGo, sai)

        private fun guiMa() {
            if (maGo.length != 6 || dangGui) { baoMa.text = "Mã gồm đúng 6 chữ số."; baoMa.visibility = View.VISIBLE; return }
            val ma = maGo
            if (!maBaMe) {
                val f = onMa ?: return
                val (kq, _, s) = f(ma)
                val dung = kq == KetQuaMoOffline.DA_MO || kq == KetQuaMoOffline.DANG_MO
                daMoBangMa = dung
                baoMa.text = if (dung) "Máy mở rồi! $s" else s
                baoMa.setTextColor(if (dung) Diu.XANH_DAM else Diu.LOI_DAM); baoMa.visibility = View.VISIBLE
                maGo = ""; veMa(!dung)
                return
            }
            dangGui = true; baoMa.text = "Đang kiểm mã…"; baoMa.setTextColor(Diu.CHU2); baoMa.visibility = View.VISIBLE
            Thread {
                val loi = PinMay.baMeMo(c, ma)
                h.post {
                    dangGui = false; maGo = ""
                    baoMa.text = loi ?: "Đã mở máy cho Ba Mẹ."
                    baoMa.setTextColor(if (loi == null) Diu.XANH_DAM else Diu.LOI_DAM); veMa(loi != null)
                    if (loi == null) theMa.visibility = View.GONE
                }
            }.start()
        }

        /** Hiện / ẩn đường nhập mã mất mạng (gọi mỗi lần vẽ lại). */
        fun hienMa(hien: Boolean) {
            val v = if (hien && onMa != null) View.VISIBLE else View.GONE
            if (linkMa.visibility != v) linkMa.visibility = v
            if (!hien && !maBaMe && theMa.visibility == View.VISIBLE && !daMoBangMa) theMa.visibility = View.GONE
        }

        private var demToi = false
        private fun datToi(toi: Boolean) {
            if (toi == demToi) return
            demToi = toi
            goc.background = ColorDrawable(if (toi) Diu.DEM_NEN else NEN)
            tieuDe.setTextColor(if (toi) Diu.DEM_CHU else CHU); cau.setTextColor(if (toi) Diu.DEM_CHU2 else Diu.CHU2)
            theDem.background = Diu.khoi(c, if (toi) Diu.DEM_THE else TRANG, 24, if (toi) null else Diu.VIEN)
            dem.setTextColor(if (toi) Diu.DEM_CHU else CHU); moLai.setTextColor(if (toi) Diu.DEM_CHU2 else Diu.CHU2)
            vien.background = Diu.tron(if (toi) Diu.DEM_THE else XANH_NHAT)
            ghi.setTextColor(if (toi) Diu.DEM_CHU2 else Diu.CHU3)
        }

        fun ve(ht: HienThi, goiChan: String? = null) {
            val congPin = ht.cong == Cong.CHON_TEN.name && goiChan == null
            pin.goc.visibility = if (congPin) View.VISIBLE else View.GONE
            phanKhoa.visibility = if (congPin) View.GONE else View.VISIBLE
            if (congPin) { datToi(false); pin.ve(); return }
            pin.dung()
            val chanApp = goiChan != null && !ht.dangKhoaThat
            val duyet = chanApp && goiChan in ht.goiChuaXep
            val goiMoi = if (duyet) goiChan else null
            nutXin.text = when {
                duyet -> "Xin Ba Mẹ duyệt"
                chiNgoaiLe(ht.trangThai) -> "Xin Ba Mẹ mở máy"
                ht.trangThai == TrangThai.HET_GIO.name -> "Xin Ba Mẹ thêm giờ"
                else -> "Xin Ba Mẹ thêm giờ"
            }
            // «Ba Mẹ mở máy» chỉ khi máy chủ có PIN theo bé (cổng ≠ MO) và đang khoá thật
            linkBaMe.visibility = if (!chanApp && ht.cong != Cong.MO.name) View.VISIBLE else View.GONE
            datToi(!chanApp && ht.trangThai == TrangThai.GIO_NGU.name)
            if (chanApp) {
                tieuDe.text = "Ứng dụng này đang bị chặn"
                dem.text = DoPhut.tenApp(c, goiChan!!); dem.textSize = 24f
                moLai.visibility = View.GONE; goiY.visibility = View.GONE
                if (goiMoi == null || goiMoi != goiDuyet) cau.text = if (duyet) "App này chưa được Ba Mẹ cho phép. Con xin Ba Mẹ duyệt nhé."
                    else if (ht.trangThai == TrangThai.HET_GIO.name) "Hôm nay con đã chơi hết giờ. Con dùng sao hoặc xin Ba Mẹ thêm giờ nhé."
                    else "Ba Mẹ chưa cho dùng ứng dụng này lúc này. Con có thể xin Ba Mẹ nhé."
                goiDuyet = goiMoi
            } else {
                goiDuyet = null
                tieuDe.text = tieuDeKhoa(ht.trangThai)
                cau.text = ht.cauCon
                val now = System.currentTimeMillis()
                dem.text = dongDemNguoc(ht, now); dem.textSize = if (ht.demNguoc > 0 || ht.moLaiLuc > now) 44f else 24f
                moLai.text = if (ht.demNguoc == 0 && ht.moLaiLuc > now) "Mở lại lúc ${gio(ht.moLaiLuc)}" else ""
                moLai.visibility = if (moLai.text.isEmpty()) View.GONE else View.VISIBLE
                goiY.text = if (ht.trangThai == TrangThai.GIO_NGU.name) "Ngủ ngon nhé! Mai chơi tiếp." else "Đọc sách hoặc ra ngoài chơi nhé!"
                goiY.visibility = if (ht.demNguoc > 0) View.GONE else View.VISIBLE
            }
            ht.tenCon?.let { ghi.text = "Vẫn gọi được Ba Mẹ · $it" }
            val hinh = hinhKhoa(ht.trangThai, chanApp)
            if (hinh != hinhDangHien) { hinhDangHien = hinh; anh.setImageResource(hinh) }
        }
        private var hinhDangHien = 0
    }
}
