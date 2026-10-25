package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.graphics.Typeface
import android.graphics.Rect
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import vn.aiilab.aiigrow.maycon.logic.TrangThai
import vn.aiilab.aiigrow.maycon.logic.mmss
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Giao diện dựng bằng code (không thư viện UI), ngôn ngữ «Clay gương» (docs/THIET-KE-CLAY.md, vẽ ở Clay.kt): khối đất sét bo lớn,
 * nút than chì / ngọc tráng men, icon Fluent 3D trong viên clay. Vùng chạm ≥ 48dp, chữ tiếng Việt có dấu.
 */
object GiaoDien {
    const val XANH = Clay.CHINH
    const val XANH_NHAT = Clay.CHINH_SOFT
    const val NEN = Clay.NEN
    const val CHU = Clay.CHU
    const val CHU_PHU = Clay.CHU3
    const val TRANG = 0xFFFFFFFF.toInt()

    fun dp(c: Context, v: Int) = (v * c.resources.displayMetrics.density).toInt()

    /** Nền màn: hơi ngả ngọc ở đỉnh như mẫu (radial-gradient #e3ebe7 → nền). */
    fun nenMan() = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(Clay.NEN_DINH, NEN, NEN))

    fun cot(c: Context, pad: Int = 20) = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(c, pad), dp(c, pad), dp(c, pad), dp(c, pad))
    }

    fun chu(c: Context, s: String, co: Float = 16f, mau: Int = CHU, dam: Boolean = false) = TextView(c).apply {
        text = s; textSize = co; setTextColor(mau)
        if (dam) setTypeface(typeface, Typeface.BOLD)
        if (co >= 24f) letterSpacing = -0.02f
        setLineSpacing(0f, 1.15f)
    }

    /** Dòng báo dưới nút (lỗi / đang gửi): rỗng thì ẩn hẳn, không để một khoảng trống ~20dp làm đáy thẻ dày hơn đỉnh. */
    fun dongBao(c: Context, mau: Int) = chu(c, "", 14f, mau).apply {
        visibility = View.GONE; setPadding(0, dp(c, 8), 0, 0)
        addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, d: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, d: Int) {}
            override fun afterTextChanged(e: android.text.Editable?) { visibility = if (e.isNullOrEmpty()) View.GONE else View.VISIBLE }
        })
    }

    /** Khối đất sét. `nen` = XANH ⇒ khối ngọc tráng men (chữ trắng); màu khác ⇒ khối sáng nhuốm màu đó. */
    fun the(c: Context, nen: Int = TRANG) = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL
        background = when (nen) {
            XANH -> ClayDrawable(c, Clay.Kieu.NGOC, boDp = 32f, dem = 20, leThe = true)
            TRANG -> ClayDrawable(c, Clay.Kieu.THE)
            else -> ClayDrawable(c, Clay.Kieu.THE, nen)
        }
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 6) }
    }

    /** Hàng tiêu đề khối: icon Fluent 3D trong viên clay + chữ. */
    fun dauKhoi(c: Context, hinh: Int, s: String, nenVien: Int = Clay.THE, co: Float = 20f, mau: Int = CHU) = LinearLayout(c).apply {
        orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
        addView(Clay.vien(c, hinh, nenVien, 44))
        addView(chu(c, s, co, mau, true).apply {
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(c, 8) }
        })
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(c, 4) }
    }

    private fun nenNut(c: Context, kieu: Clay.Kieu) = ClayDrawable(c, kieu, dem = 8)

    /** Nút kẹo dẻo tráng men, cao 56dp (không kể bóng). Chính = than chì; `ngoc` = điểm nhấn ngọc; `phu` = nút sáng chữ ngọc. */
    fun nut(c: Context, s: String, phu: Boolean = false, ngoc: Boolean = false, onClick: (View) -> Unit) = Button(c).apply {
        text = s; isAllCaps = false; textSize = 16f
        // chữ dài (tên con / tên máy / cỡ chữ hệ thống lớn): tối đa 2 dòng căn giữa, quá nữa thì «…» cuối — không cắt nửa chữ, không đẩy khối
        maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END; gravity = android.view.Gravity.CENTER
        setTypeface(typeface, Typeface.BOLD)
        val kieu = if (phu) Clay.Kieu.VIEN else if (ngoc) Clay.Kieu.NGOC else Clay.Kieu.THAN
        background = nenNut(c, kieu)
        setTextColor(if (phu) Clay.CHINH_INK else TRANG)
        val bong = Rect().also { background.getPadding(it) }
        val cao = dp(c, 56) + bong.top + bong.bottom - dp(c, 16)   // 56dp phần khối + lề bóng
        minHeight = cao; minimumHeight = cao
        minWidth = 0; minimumWidth = 0   // Button mặc định tối thiểu 88dp ⇒ ba nút một hàng tràn khỏi thẻ ở máy 360dp
        // chữ cách mép khối ≥ 16dp hai bên (nền chỉ đệm 8 cho cân chiều cao 56)
        setPadding(bong.left + dp(c, 8), bong.top, bong.right + dp(c, 8), bong.bottom)
        backgroundTintList = null
        stateListAnimator = null
        Clay.nhan(this)
        setOnClickListener(onClick)
        // cao theo nội dung (tối thiểu 56dp khối): nhãn dài / cỡ chữ hệ thống lớn rớt 2 dòng thì khối cao ra, không bị cắt chữ
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, 6) }
    }

    fun chonTrongNhom(c: Context, b: Button, chon: Boolean) {
        b.setTextColor(if (chon) TRANG else Clay.CHINH_INK)
        // đổi kiểu ngay trên nền đang có để vệt men vừa bắt đầu lúc nhấn vẫn chạy
        (b.background as? ClayDrawable)?.kieu = if (chon) Clay.Kieu.NGOC else Clay.Kieu.VIEN
        if (chon && b.isLaidOut) Clay.batNhe(b)
    }

    fun gio(ms: Long): String = DateTimeFormatter.ofPattern("HH:mm").format(Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()))

    fun tieuDeKhoa(t: String) = when (t) {
        TrangThai.KHOA_NGAY.name -> "Máy đang khoá"
        TrangThai.GIO_NGU.name -> "Đến giờ ngủ rồi"
        TrangThai.HET_GIO.name -> "Hết giờ giải trí"
        TrangThai.NGOAI_KHUNG.name -> "Chưa tới giờ chơi"
        else -> "AiiGrow"
    }

    /** Dòng đếm ngược trên màn khoá. */
    fun dongDemNguoc(ht: HienThi, now: Long = System.currentTimeMillis()): String = when {
        ht.demNguoc > 0 -> "Khoá sau ${mmss(ht.demNguoc)}"
        ht.moLaiLuc > now -> "Mở lại sau ${mmssDai(((ht.moLaiLuc - now) / 1000).toInt())} (lúc ${gio(ht.moLaiLuc)})"
        else -> "Chờ Ba Mẹ mở"
    }

    fun mmssDai(giay: Int): String = if (giay >= 3600) "%d:%02d:%02d".format(giay / 3600, giay % 3600 / 60, giay % 60) else mmss(giay)

    /** Icon Fluent 3D theo lý do khoá. */
    fun hinhKhoa(t: String, chanApp: Boolean) = when {
        chanApp -> R.drawable.fl_khoa
        t == TrangThai.GIO_NGU.name -> R.drawable.fl_trang
        t == TrangThai.HET_GIO.name -> R.drawable.fl_dong_ho_cat
        t == TrangThai.NGOAI_KHUNG.name -> R.drawable.fl_dong_ho
        else -> R.drawable.fl_khoa
    }

    /** Nội dung màn khoá / màn chặn dùng chung cho ManKhoa (activity) và TroNang (lớp phủ trợ năng). */
    class ManKhoaView(val c: Context, val onXin: () -> Unit, val onVe: (() -> Unit)?) {
        private val cot = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(dp(c, 22), dp(c, 24), dp(c, 22), dp(c, 24)) }
        /** Gốc cuộn được: máy nhỏ / cỡ chữ lớn thì nút «Xin Ba Mẹ thêm giờ» vẫn kéo tới được, không rơi khỏi đáy màn. Tràn viền (targetSdk 35):
         *  chừa thanh trạng thái / thanh điều hướng bằng insets thật thay vì đoán 48dp. */
        val goc = ScrollView(c).apply {
            background = nenMan(); isFillViewport = true; clipToPadding = false
            addView(cot, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            // lớp phủ Trợ năng có thể không nhận insets ⇒ luôn chừa tối thiểu 24dp (thanh trạng thái / điều hướng 3 nút)
            val toiThieu = dp(c, 24)
            setPadding(0, toiThieu, 0, toiThieu)
            setOnApplyWindowInsetsListener { v, i -> @Suppress("DEPRECATION") v.setPadding(0, maxOf(toiThieu, i.systemWindowInsetTop), 0, maxOf(toiThieu, i.systemWindowInsetBottom)); i }
        }
        private val khoi = the(c).apply { gravity = Gravity.CENTER_HORIZONTAL }
        private val vien = Clay.vien(c, R.drawable.fl_khoa, Clay.CHINH_SOFT, 92).apply { (layoutParams as ViewGroup.MarginLayoutParams).bottomMargin = dp(c, 10) }
        private val anh = vien.getChildAt(0) as ImageView
        val tieuDe = chu(c, "", 28f, CHU, true).apply { gravity = Gravity.CENTER }
        val dem = chu(c, "", 44f, CHU, true).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 12), 0, dp(c, 12)); fontFeatureSettings = "tnum" }
        val cau = chu(c, "", 18f, Clay.CHU2).apply { gravity = Gravity.CENTER }
        val ghi = chu(c, "Máy này do Ba Mẹ quản lý bằng AiiGrow.", 14f, CHU_PHU).apply { gravity = Gravity.CENTER; setPadding(0, dp(c, 20), 0, 0) }
        // nút chừa lề bóng 4dp, thẻ 6dp ⇒ lùi nút 2dp mỗi bên để mép khối nút thẳng mép khối thẻ
        val nutXin = nut(c, "Xin Ba Mẹ thêm giờ", ngoc = true) { onXin() }.apply { (layoutParams as LinearLayout.LayoutParams).apply { topMargin = dp(c, 16); marginStart = dp(c, 2); marginEnd = dp(c, 2) } }
        val nutVe = onVe?.let { f -> nut(c, "Về màn hình chính", phu = true) { f() }.apply { (layoutParams as LinearLayout.LayoutParams).apply { marginStart = dp(c, 2); marginEnd = dp(c, 2) } } }
        private var hinhDangHien = 0

        init {
            khoi.addView(vien); khoi.addView(tieuDe); khoi.addView(dem); khoi.addView(cau)
            cot.addView(khoi); cot.addView(nutXin); nutVe?.let(cot::addView); cot.addView(ghi)
        }

        fun ve(ht: HienThi, goiChan: String? = null) {
            val chanApp = goiChan != null && !ht.dangKhoaThat
            if (chanApp) {
                tieuDe.text = "Ứng dụng này đang bị chặn"
                dem.text = DoPhut.tenApp(c, goiChan!!)
                dem.textSize = 26f
                cau.text = "Ba Mẹ chưa cho dùng ứng dụng này lúc này. Con có thể xin Ba Mẹ nhé."
            } else {
                tieuDe.text = tieuDeKhoa(ht.trangThai)
                dem.text = dongDemNguoc(ht); dem.textSize = if (ht.demNguoc > 0) 44f else 24f
                cau.text = ht.cauCon
            }
            // ổ khoá «đóng sập» mỗi lần lý do đổi (lần đầu hiện cũng tính)
            val h = hinhKhoa(ht.trangThai, chanApp)
            if (h != hinhDangHien) {
                hinhDangHien = h; anh.setImageResource(h)
                goc.post { Clay.dongSap(anh, khoi) }
            }
        }
    }
}
