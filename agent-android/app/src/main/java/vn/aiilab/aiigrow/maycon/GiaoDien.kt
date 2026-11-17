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
import vn.aiilab.aiigrow.maycon.logic.KetQuaXinApp
import vn.aiilab.aiigrow.maycon.logic.LoaiKetQuaXin
import vn.aiilab.aiigrow.maycon.logic.TrangThai
import vn.aiilab.aiigrow.maycon.logic.chuKetQuaXinApp
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

    fun tieuDeKhoa(t: String, sao: Boolean = false) = when (t) {
        TrangThai.KHOA_NGAY.name -> "Ba Mẹ đang khoá máy"
        TrangThai.HET_GIO.name -> if (sao) "Hết sao rồi" else "Hết giờ chơi"
        TrangThai.GIO_NGU.name -> "Đến giờ ngủ rồi"
        TrangThai.NGOAI_KHUNG.name -> "Chưa tới giờ chơi"
        else -> "AiiGrow"
    }

    /** Dòng đếm ngược trên màn khoá. */
    fun dongDemNguoc(ht: HienThi, now: Long = System.currentTimeMillis()): String = when {
        ht.demNguoc > 0 && ht.coSao && ht.trangThai == TrangThai.HET_GIO.name && ht.lyDoKhoa == null -> "Hết sao sau ${mmss(ht.demNguoc)}"
        ht.demNguoc > 0 -> "Khoá sau ${mmss(ht.demNguoc)}"
        ht.lyDoKhoa != null && ht.trangThai == TrangThai.HET_GIO.name ->
            if (ht.lyDoKhoa == "dang_nghi" && ht.nghiDenGio != null) "Chơi tiếp lúc ${ht.nghiDenGio}"
            else if (ht.moLaiLuc > now) mmssDai(((ht.moLaiLuc - now) / 1000).toInt()) else if (ht.lyDoKhoa == "dang_nghi") "Nghỉ một chút" else "Mai chơi tiếp"
        ht.coSao && ht.trangThai == TrangThai.HET_GIO.name -> vn.aiilab.aiigrow.maycon.logic.soSao(ht.soDu ?: 0)
        ht.moLaiLuc > now -> mmssDai(((ht.moLaiLuc - now) / 1000).toInt())
        else -> "Chờ Ba Mẹ mở"
    }

    fun mmssDai(giay: Int): String = if (giay >= 3600) "%d:%02d:%02d".format(giay / 3600, giay % 3600 / 60, giay % 60) else mmss(giay)

    /** Icon Fluent 3D theo lý do khoá (Dịu: icon nhỏ trong vòng xanh nhạt, không robot ở màn khoá thường). */
    fun hinhKhoa(t: String, chanApp: Boolean) = when {
        chanApp -> R.drawable.fl_khoa
        t == TrangThai.GIO_NGU.name -> R.drawable.fl_trang
        t == TrangThai.HET_GIO.name -> R.drawable.fl_dong_ho_cat
        t == TrangThai.NGOAI_KHUNG.name -> R.drawable.fl_dong_ho
        else -> R.drawable.fl_khoa
    }

    /**
     * Màn khoá / màn chặn dùng chung cho ManKhoa (activity) và TroNang (lớp phủ trợ năng) — khớp `con-dt-gio/09-cdt-android-khoa`
     * («Ba Mẹ đang khoá máy · 30:00 · Mở lại lúc 20:10 · Xin Ba Mẹ mở máy · Mất mạng? Nhập mã của Ba Mẹ · Ba Mẹ mở máy»), ô mã offline
     * theo `con-dt-chan/04..07` (6 ô + bàn phím to, «Mã chưa đúng», «Mã hết hạn rồi», «Máy mở rồi!»). Máy ở cổng PIN (chọn tên) ⇒ hiện ManPin.
     * Giờ ngủ ⇒ nền tối dịu. Bàn phím tự vẽ ⇒ lớp phủ trợ năng không cần bàn phím hệ thống.
     */
    class ManKhoaView(val c: Context, val onXin: () -> Unit, val onVe: (() -> Unit)?, val onMa: ((String) -> Triple<KetQuaMoOffline, Long?, String>)? = null,
                      /** true = Activity (có bàn phím) ⇒ ô gõ lời nhắn; false = lớp phủ trợ năng (không có IME) ⇒ chọn lý do có sẵn. */
                      val choGoLyDo: Boolean = false) {
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
        /** #258: app ngoài danh sách ⇒ «Xin Ba Mẹ mở <app>» gửi thẳng (api/device/xin-duyet) kèm lời Con nhắn; xong hiện màn kết quả. */
        val nutXin = Diu.nut(c, "Xin Ba Mẹ mở máy") { bamNutXin() }
        private val oLyDo = android.widget.EditText(c).apply {
            hint = "Con nhắn Ba Mẹ (không bắt buộc)"; filters = arrayOf(android.text.InputFilter.LengthFilter(100)); minHeight = dp(c, 52); visibility = View.GONE
            background = Diu.khoi(c, Diu.TRANG, 16, Diu.VIEN); setTextColor(CHU); setHintTextColor(Diu.CHU3); textSize = 16f
            typeface = Diu.font(c); setPadding(dp(c, 14), dp(c, 10), dp(c, 14), dp(c, 10))
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 10); bottomMargin = dp(c, 4) }
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
        }
        /** Lớp phủ trợ năng không dùng được bàn phím ⇒ vài lý do chọn sẵn (như /tre/xin-phep). */
        private val LY_DO = listOf("Để làm bài tập", "Bạn rủ chơi", "Hôm nay con ngoan")
        private var lyDoChon: String? = null
        private val hangLyDo = LinearLayout(c).apply {
            orientation = LinearLayout.VERTICAL; visibility = View.GONE
            val nuts = LY_DO.map { ly -> Diu.nut(c, ly, Diu.KieuNut.PHU) { lyDoChon = if (lyDoChon == ly) null else ly; chonLyDo() } }
            nuts.forEach(::addView)
            tag = nuts
        }
        @Suppress("UNCHECKED_CAST")
        private fun chonLyDo() { (hangLyDo.tag as List<Button>).forEachIndexed { i, b -> Diu.chon(c, b, LY_DO[i] == lyDoChon) } }
        /** Màn kết quả lời xin app (khớp con-dt-xin them-j4g2mtm8 / them-w8po32o6): `goi` = app đã xin; null = chưa xin. */
        private var xinGoi: String? = null
        private var xinKq: KetQuaXinApp? = null
        private var xinTen = ""
        private var xinGen = 0
        private var xinThread: Thread? = null
        private val lamMoiSau = Runnable { DichVuNhip.lamMoi(c) }

        /** Huỷ vòng hỏi kết quả (Activity bị huỷ / lớp phủ gỡ) — không giữ Context. */
        fun huy() { xinGen++; xinThread?.interrupt(); xinThread = null; h.removeCallbacks(lamMoiSau) }

        /** Bỏ màn kết quả, về màn «chưa có trong danh sách» (viết lại câu ở lần vẽ kế). */
        private fun boKetQua() { xinGoi = null; xinKq = null; xinGen++; goiDuyet = null; nutXin.isEnabled = true; h.removeCallbacks(lamMoiSau) }

        private fun xinApp(g: String) {
            val ten = DoPhut.tenApp(c, g)
            val ly = (if (choGoLyDo) oLyDo.text.toString().replace(Regex("\\s*\n\\s*"), " ") else lyDoChon ?: "")
            val gen = ++xinGen
            xinGoi = g; xinTen = ten
            xinKq = KetQuaXinApp(LoaiKetQuaXin.CHO, null)
            capNhatKetQua(g)
            val ctx = c.applicationContext
            xinThread = Thread {
                val r = DichVuNhip.xinDuyet(ctx, g, ten, ly)
                if (r.id == null) { h.post { if (gen == xinGen) { xinGoi = null; xinKq = null; goiDuyet = null; cau.text = r.cau; nutXin.isEnabled = true } }; return@Thread }
                // hỏi kết quả mỗi 3 giây, tối đa 5 phút; hết hạn mà chưa có ⇒ «Lời xin đã hết hạn · Xin lại»
                for (i in 0 until 100) {
                    if (gen != xinGen) return@Thread
                    val kq = DichVuNhip.hoiKetQuaXinApp(ctx, r.id)
                    if (kq != null && kq.loai != LoaiKetQuaXin.CHO) { h.post { if (gen == xinGen) { xinKq = kq; capNhatKetQua(g) } }; return@Thread }
                    try { Thread.sleep(3000) } catch (_: InterruptedException) { return@Thread }
                }
                h.post { if (gen == xinGen) { xinKq = KetQuaXinApp(LoaiKetQuaXin.HET_HAN, null); capNhatKetQua(g) } }
            }.also { it.start() }
        }

        /** Vẽ màn kết quả đè lên màn «chưa có trong danh sách» (gọi trên luồng giao diện). */
        private fun capNhatKetQua(g: String) {
            val kq = xinKq ?: return
            val (tieu, phu, caudl) = chuKetQuaXinApp(kq, xinTen)
            val cho = kq.loai == LoaiKetQuaXin.CHO
            tieuDe.text = tieu; dem.text = xinTen; dem.textSize = 24f
            goiY.text = phu; goiY.visibility = View.VISIBLE; cau.text = caudl
            moLai.visibility = View.GONE; oLyDo.visibility = View.GONE; hangLyDo.visibility = View.GONE
            nutXin.text = if (cho) "Đang chờ Ba Mẹ…" else if (kq.loai == LoaiKetQuaXin.DA_THEM) "Xong" else "Xin lại"
            nutXin.isEnabled = !cho
            // đã thêm: giữ màn kết quả cho Con đọc; áp luật mới khi Con bấm «Xong» (hoặc sau vài giây)
            if (kq.loai == LoaiKetQuaXin.DA_THEM) { h.removeCallbacks(lamMoiSau); h.postDelayed(lamMoiSau, 6000) }
        }

        private fun bamNutXin() {
            val kq = xinKq
            if (kq != null) {
                when (kq.loai) {
                    LoaiKetQuaXin.CHO -> {}
                    LoaiKetQuaXin.DA_THEM -> { boKetQua(); DichVuNhip.lamMoi(c); onVe?.invoke() }
                    else -> { boKetQua(); htCuoi?.let { ve(it, goiCuoi) } }   // «Xin lại»: về màn «chưa có trong danh sách»
                }
                return
            }
            val g = goiDuyet
            if (g != null) xinApp(g) else onXin()
        }
        private var goiCuoi: String? = null
        private var htCuoi: HienThi? = null
        /** 15/11 «Hết sao rồi» (them-n4iivj6d, cdt-het-phien): lối «Làm nhiệm vụ kiếm sao» cạnh «Xin Ba Mẹ cho vay sao». */
        private val nutNhiemVu = Diu.nut(c, "Làm nhiệm vụ kiếm sao") { ManTre.mo(c, "nhiem-vu") }.apply { visibility = View.GONE }
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
            phanKhoa.addView(theDem); phanKhoa.addView(nutNhiemVu); phanKhoa.addView(oLyDo); phanKhoa.addView(hangLyDo); phanKhoa.addView(nutXin); nutVe?.let(phanKhoa::addView)
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
                    baoMa.setTextColor(if (loi == null) Diu.OK else Diu.LOI_DAM); veMa(loi != null)
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
            theDem.background = if (toi) Diu.khoi(c, Diu.DEM_THE, 24, Diu.KIM_HAIR) else Diu.noi(c, 24f)
            dem.setTextColor(if (toi) Diu.KIM else CHU); moLai.setTextColor(if (toi) Diu.DEM_CHU2 else Diu.CHU2)
            vien.background = Diu.tron(if (toi) Diu.DEM_THE else XANH_NHAT)
            ghi.setTextColor(if (toi) Diu.DEM_CHU2 else Diu.CHU3)
        }

        fun ve(ht: HienThi, goiChan: String? = null) {
            htCuoi = ht; goiCuoi = goiChan
            val congPin = ht.cong == Cong.CHON_TEN.name && goiChan == null
            pin.goc.visibility = if (congPin) View.VISIBLE else View.GONE
            phanKhoa.visibility = if (congPin) View.GONE else View.VISIBLE
            if (congPin) { datToi(false); pin.ve(); return }
            pin.dung()
            val chanApp = goiChan != null && !ht.dangKhoaThat
            val duyet = chanApp && goiChan in ht.goiChuaXep
            // đổi sang app khác / hết cảnh ngoài danh sách ⇒ bỏ màn kết quả cũ
            if (xinKq != null && !(duyet && goiChan == xinGoi)) boKetQua()
            val goiMoi = if (duyet) goiChan else null
            // 15/11: hết sao ⇒ Làm nhiệm vụ / Xin Ba Mẹ cho vay sao; app ngoài danh sách ⇒ «Xin Ba Mẹ mở <app>» (#262)
            // 16/11 #302: khoá vì giới hạn giờ chơi (nghỉ giữa lượt / đủ giờ hôm nay) ⇒ không nói «hết sao», không đẩy «Làm nhiệm vụ»
            val vi = if (ht.trangThai == TrangThai.HET_GIO.name && !duyet) vn.aiilab.aiigrow.maycon.logic.tieuDeKhoaGioiHan(ht.lyDoKhoa) else null
            val hetSao = ht.coSao && ht.trangThai == TrangThai.HET_GIO.name && !duyet && vi == null
            val xinSao = hetSao || vi != null
            nutXin.text = when {
                duyet -> "Xin Ba Mẹ mở ${DoPhut.tenApp(c, goiChan!!)}"
                xinSao -> "Xin Ba Mẹ cho vay sao"
                else -> "Xin Ba Mẹ mở máy"
            }
            if (xinSao != xinPhu) { xinPhu = xinSao; Diu.chon(c, nutXin, !xinSao) }
            // máy chủ cũ (chưa có sổ sao) và không phải app ngoài danh sách: không còn gì để xin (đã gỡ xin thêm giờ / ngoại lệ) ⇒ ẩn nút; còn «Ba Mẹ mở máy» / mã offline
            nutXin.visibility = if (duyet || ht.coSao) View.VISIBLE else View.GONE
            nutNhiemVu.visibility = if (hetSao) View.VISIBLE else View.GONE
            // «Ba Mẹ mở máy» chỉ khi máy chủ có PIN theo bé (cổng ≠ MO) và đang khoá thật
            linkBaMe.visibility = if (!chanApp && ht.cong != Cong.MO.name) View.VISIBLE else View.GONE
            datToi(!chanApp && ht.trangThai == TrangThai.GIO_NGU.name)
            oLyDo.visibility = if (duyet && xinKq == null && choGoLyDo) View.VISIBLE else View.GONE
            hangLyDo.visibility = if (duyet && xinKq == null && !choGoLyDo) View.VISIBLE else View.GONE
            if (chanApp && xinKq != null) {
                capNhatKetQua(goiChan!!)
            } else if (chanApp) {
                // 15/11 (them-4e5fwl16 / them-n4iivj6d): ngoài danh sách ⇒ «Roblox chưa có trong danh sách»; app Tính phút lúc hết sao ⇒ «Hết sao rồi»
                val ten = DoPhut.tenApp(c, goiChan!!)
                tieuDe.text = if (duyet) "$ten chưa có trong danh sách" else if (vi != null) vi else if (hetSao) "Hết sao rồi" else "$ten đang tạm dừng"
                dem.text = if (hetSao) vn.aiilab.aiigrow.maycon.logic.soSao(ht.soDu ?: 0) else ten; dem.textSize = 24f
                moLai.visibility = View.GONE
                goiY.text = if (duyet) "Theo danh sách của Ba Mẹ" else "1 nhiệm vụ = +10 sao"
                goiY.visibility = if (duyet || hetSao) View.VISIBLE else View.GONE
                if (goiMoi == null || goiMoi != goiDuyet) cau.text = when {
                    duyet -> "Máy chỉ mở app, web Ba Mẹ đã thêm vào danh sách."
                    hetSao -> "Còn 0 sao = 0 phút chơi · $ten dừng, app học vẫn mở."
                    vi != null -> ht.cauCon
                    else -> ht.cauCon
                }
            } else {
                // #337: bé chưa có luật trên máy (mất mạng) — không nói «Ba Mẹ đang khoá máy»
                tieuDe.text = vi ?: if (ht.cauCon == vn.aiilab.aiigrow.maycon.logic.CAU_CHO_MANG_LUAT) "Máy đang chờ mạng" else tieuDeKhoa(ht.trangThai, ht.coSao)
                cau.text = if (hetSao) "Còn 0 sao = 0 phút chơi · app học vẫn mở" else ht.cauCon
                val now = System.currentTimeMillis()
                dem.text = dongDemNguoc(ht, now); dem.textSize = if (ht.demNguoc > 0 || ht.moLaiLuc > now || hetSao || vi != null) 44f else 24f
                moLai.text = if (vi != null) "" else if (ht.demNguoc == 0 && ht.moLaiLuc > now) "Mở lại lúc ${gio(ht.moLaiLuc)}" else ""
                moLai.visibility = if (moLai.text.isEmpty()) View.GONE else View.VISIBLE
                goiY.text = if (ht.trangThai == TrangThai.GIO_NGU.name) "Ngủ ngon nhé! Mai chơi tiếp." else if (hetSao) "1 nhiệm vụ = +10 sao" else "Đọc sách hoặc ra ngoài chơi nhé!"
                goiY.visibility = if (ht.demNguoc > 0) View.GONE else View.VISIBLE
            }
            goiDuyet = goiMoi
            ht.tenCon?.let { ghi.text = "Vẫn gọi được Ba Mẹ · $it" }
            val hinh = hinhKhoa(ht.trangThai, chanApp)
            if (hinh != hinhDangHien) { hinhDangHien = hinh; anh.setImageResource(hinh) }
        }
        private var hinhDangHien = 0
        /** nút xin đang vẽ kiểu phụ (màn «Hết sao rồi»: nút chính là «Làm nhiệm vụ kiếm sao»). */
        private var xinPhu = false
    }
}
