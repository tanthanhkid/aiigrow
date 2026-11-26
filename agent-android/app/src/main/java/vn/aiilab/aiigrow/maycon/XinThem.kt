package vn.aiilab.aiigrow.maycon

import android.app.Dialog
import android.content.Context
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.os.Handler
import android.os.Looper
import android.text.InputFilter
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.GridLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import vn.aiilab.aiigrow.maycon.logic.AppTrenMay
import vn.aiilab.aiigrow.maycon.logic.KetQuaXinApp
import vn.aiilab.aiigrow.maycon.logic.KieuXin
import vn.aiilab.aiigrow.maycon.logic.LoaiKetQuaXin
import vn.aiilab.aiigrow.maycon.logic.chuKetQuaXinApp
import vn.aiilab.aiigrow.maycon.logic.chuNutXinThem
import vn.aiilab.aiigrow.maycon.logic.chuanDiaChiWeb
import vn.aiilab.aiigrow.maycon.logic.locAppTrenMay

/**
 * #422 hộp «Xin thêm app / web» (con-dt-xin 09-them-pj2ra3jh / 10-them-euz1k35r): thẻ «App trên máy» (lưới app trên trình khởi chạy,
 * muc = package) / «Trang web» (ô địa chỉ, muc = tên miền); lời nhắn + «Ba Mẹ sẽ chọn nhóm» (chỉ thông tin). Gửi qua DichVuNhip.xinDuyet
 * (kieu app | web) rồi hiện màn kết quả như màn chặn app (chuKetQuaXinApp: Đã gửi Ba Mẹ / Ba Mẹ đã thêm / chưa thêm), hỏi yeu-cau/:id mỗi 3 giây.
 */
class HopXinThem(private val c: Context) {
    private val h = Handler(Looper.getMainLooper())
    private val d = Dialog(c)
    private var kieu = KieuXin.APP
    private var appChon: AppTrenMay? = null
    private var gen = 0
    private var luong: Thread? = null

    private val cot = Diu.the(c, dem = 20)
    private val khung = ScrollView(c).apply { isFillViewport = false; addView(cot) }

    // ---- biểu mẫu
    private val nutApp = Diu.nut(c, "App trên máy", Diu.KieuNut.PHU) { doiThe(KieuXin.APP) }
    private val nutWeb = Diu.nut(c, "Trang web", Diu.KieuNut.PHU) { doiThe(KieuXin.WEB) }
    private val phanApp = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL }
    private val luoi = GridLayout(c).apply { columnCount = 3; useDefaultMargins = false }
    private val choApp = Diu.chu(c, "Đang đọc app trên máy…", 15f, Diu.CHU2).apply { setPadding(0, Diu.dp(c, 8), 0, 0) }
    private val phanWeb = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE }
    private val oWeb = o("scratch.mit.edu", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI, 253, 1).apply { contentDescription = "Địa chỉ trang web" }
    private val oNhan = o("Lời nhắn cho Ba Mẹ (không bắt buộc)", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or InputType.TYPE_TEXT_FLAG_MULTI_LINE, 100, 3)
    private val bao = Diu.chu(c, "", 15f, Diu.LOI_DAM).apply { setPadding(0, Diu.dp(c, 8), 0, 0); visibility = View.GONE }
    private val nutGui = Diu.nut(c, "") { gui() }
    private val bieuMau = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL }

    // ---- màn kết quả (cùng chữ với màn chặn app — GiaoDien.ManKhoaView.capNhatKetQua)
    private val kqTieu = Diu.chu(c, "", 24f, Diu.CHU, true).apply { gravity = Gravity.CENTER }
    private val kqTen = Diu.chu(c, "", 20f, Diu.CHU, true).apply { gravity = Gravity.CENTER; setPadding(0, Diu.dp(c, 10), 0, 0) }
    private val kqPhu = Diu.chu(c, "", 15f, Diu.XANH_DAM).apply { gravity = Gravity.CENTER; setPadding(0, Diu.dp(c, 4), 0, 0) }
    private val kqCau = Diu.chu(c, "", 16f, Diu.CHU2).apply { gravity = Gravity.CENTER; setPadding(0, Diu.dp(c, 8), 0, 0) }
    private var kq: KetQuaXinApp? = null
    private val nutKq = Diu.nut(c, "") { bamKetQua() }
    private val ketQua = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL; visibility = View.GONE
        addView(vongHinh())
        addView(kqTieu); addView(kqTen); addView(kqPhu); addView(kqCau); addView(nutKq)
        addView(Diu.nut(c, "Đóng", Diu.KieuNut.CHU) { d.dismiss() })
    }

    private fun o(goiY: String, kieuGo: Int, dai: Int, dong: Int) = EditText(c).apply {
        hint = goiY; filters = arrayOf(InputFilter.LengthFilter(dai)); minHeight = Diu.dp(c, 52); maxLines = dong
        background = Diu.khoi(c, Diu.TRANG, 16, Diu.VIEN); setTextColor(Diu.CHU); setHintTextColor(Diu.CHU3); textSize = 16f
        typeface = Diu.font(c); setPadding(Diu.dp(c, 14), Diu.dp(c, 10), Diu.dp(c, 14), Diu.dp(c, 10)); inputType = kieuGo
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = Diu.dp(c, 8) }
    }

    private fun vongHinh() = android.widget.FrameLayout(c).apply {
        background = Diu.tron(Diu.XANH_NHAT)
        addView(ImageView(c).apply { setImageResource(R.drawable.fl_gio_tay); importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO },
            android.widget.FrameLayout.LayoutParams(Diu.dp(c, 40), Diu.dp(c, 40), Gravity.CENTER))
        layoutParams = LinearLayout.LayoutParams(Diu.dp(c, 72), Diu.dp(c, 72)).apply { gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = Diu.dp(c, 10) }
    }

    init {
        bieuMau.addView(Diu.chu(c, "Xin thêm app / web", 22f, Diu.CHU, true))
        bieuMau.addView(Diu.chu(c, "Chọn app trên điện thoại hoặc gõ địa chỉ trang web", 15f, Diu.CHU2).apply { setPadding(0, Diu.dp(c, 4), 0, 0) })
        val the2 = LinearLayout(c).apply { orientation = LinearLayout.HORIZONTAL; isBaselineAligned = false }
        listOf(nutApp, nutWeb).forEachIndexed { i, b ->
            b.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                topMargin = Diu.dp(c, 12); if (i == 0) marginEnd = Diu.dp(c, 4) else marginStart = Diu.dp(c, 4) }
            the2.addView(b)
        }
        bieuMau.addView(the2)

        phanApp.addView(Diu.chu(c, "App trên điện thoại", 16f, Diu.CHU, true).apply { setPadding(0, Diu.dp(c, 14), 0, 0) })
        phanApp.addView(choApp); phanApp.addView(luoi)
        bieuMau.addView(phanApp)

        phanWeb.addView(Diu.chu(c, "Địa chỉ trang web", 16f, Diu.CHU, true).apply { setPadding(0, Diu.dp(c, 14), 0, 0) })
        phanWeb.addView(oWeb)
        phanWeb.addView(Diu.chu(c, "Gõ địa chỉ trang con muốn vào, ví dụ scratch.mit.edu", 14f, Diu.CHU2).apply { setPadding(0, Diu.dp(c, 6), 0, 0) })
        phanWeb.addView(Diu.chu(c, "Lời nhắn cho Ba Mẹ", 16f, Diu.CHU, true).apply { setPadding(0, Diu.dp(c, 12), 0, 0) })
        bieuMau.addView(phanWeb)
        bieuMau.addView(oNhan)

        // «Ba Mẹ sẽ chọn nhóm» — chỉ thông tin, không bấm (như hộp «Xin thêm YouTube»)
        bieuMau.addView(Diu.chu(c, "Ba Mẹ sẽ chọn nhóm", 15f, Diu.CHU2).apply { setPadding(0, Diu.dp(c, 12), 0, 0) })
        val chip = LinearLayout(c).apply { orientation = LinearLayout.HORIZONTAL }
        listOf("Tính phút · 1 sao = 1 phút", "Không tính phút").forEachIndexed { i, s ->
            chip.addView(Diu.chu(c, s, 14f, Diu.CHU).apply {
                background = Diu.khoi(c, Diu.XANH_NHAT, 14, null); setPadding(Diu.dp(c, 12), Diu.dp(c, 6), Diu.dp(c, 12), Diu.dp(c, 6))
                layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                    topMargin = Diu.dp(c, 6); if (i > 0) marginStart = Diu.dp(c, 8) }
            })
        }
        bieuMau.addView(chip)
        bieuMau.addView(bao); bieuMau.addView(nutGui)
        bieuMau.addView(Diu.nut(c, "Để sau", Diu.KieuNut.CHU) { d.dismiss() })

        cot.addView(bieuMau); cot.addView(ketQua)
        d.setContentView(khung)
        d.window?.setBackgroundDrawable(ColorDrawable(0))
        d.window?.setGravity(Gravity.BOTTOM)
        d.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        @Suppress("DEPRECATION") d.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        d.setOnDismissListener { if (kq?.loai == LoaiKetQuaXin.DA_THEM) DichVuNhip.lamMoi(c); dungHoi() }
        doiThe(KieuXin.APP)
        napApp()
    }

    fun hien() = d.show()
    val dangHien: Boolean get() = d.isShowing

    /** Activity bị huỷ: dừng vòng hỏi kết quả, đóng hộp (không giữ Activity). */
    fun huy() { dungHoi(); try { d.dismiss() } catch (_: Exception) {} }
    private fun dungHoi() { gen++; luong?.interrupt(); luong = null }

    private fun doiThe(k: KieuXin) {
        kieu = k
        Diu.chon(c, nutApp, k == KieuXin.APP); Diu.chon(c, nutWeb, k == KieuXin.WEB)
        phanApp.visibility = if (k == KieuXin.APP) View.VISIBLE else View.GONE
        phanWeb.visibility = if (k == KieuXin.WEB) View.VISIBLE else View.GONE
        oNhan.hint = if (k == KieuXin.APP) "Nhắn Ba Mẹ (không bắt buộc)" else "Ví dụ: con học làm game trên Scratch ạ"
        bao.visibility = View.GONE
        veNut()
    }

    private fun veNut() {
        nutGui.text = chuNutXinThem(kieu, appChon?.ten)
        nutGui.isEnabled = kieu == KieuXin.WEB || appChon != null
    }

    /** Lưới app (DoPhut.appLauncher — cùng nguồn danh sách app gửi Ba Mẹ), đọc nhãn + icon trên luồng nền. */
    private fun napApp() {
        val ctx = c.applicationContext
        Thread {
            val pm = ctx.packageManager
            val ds = try {
                val goc = DoPhut.appLauncher(ctx)
                val ten = goc.associate { it.packageName to (try { pm.getApplicationLabel(it).toString() } catch (_: Exception) { it.packageName }) }
                locAppTrenMay(goc.map { AppTrenMay(it.packageName, ten[it.packageName] ?: it.packageName) }, ctx.packageName)
                    .map { a -> a to (try { pm.getApplicationIcon(a.goi) } catch (_: Exception) { null }) }
            } catch (_: Exception) { emptyList() }
            h.post { veLuoi(ds) }
        }.start()
    }

    private val o1 = mutableListOf<Pair<AppTrenMay, View>>()
    private fun veLuoi(ds: List<Pair<AppTrenMay, Drawable?>>) {
        choApp.visibility = if (ds.isEmpty()) View.VISIBLE else View.GONE
        if (ds.isEmpty()) choApp.text = "Chưa đọc được app trên máy. Con thử thẻ «Trang web» nhé."
        luoi.removeAllViews(); o1.clear()
        for ((a, icon) in ds) {
            val o = LinearLayout(c).apply {
                orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL
                setPadding(Diu.dp(c, 4), Diu.dp(c, 10), Diu.dp(c, 4), Diu.dp(c, 8))
                minimumHeight = Diu.dp(c, 48); isClickable = true; isFocusable = true; contentDescription = a.ten
                addView(ImageView(c).apply { setImageDrawable(icon); importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO },
                    LinearLayout.LayoutParams(Diu.dp(c, 44), Diu.dp(c, 44)))
                addView(Diu.chu(c, a.ten, 13f, Diu.CHU).apply { gravity = Gravity.CENTER; maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END; setPadding(0, Diu.dp(c, 4), 0, 0) })
                setOnClickListener { appChon = a; veChon(); veNut() }
                layoutParams = GridLayout.LayoutParams(GridLayout.spec(GridLayout.UNDEFINED), GridLayout.spec(GridLayout.UNDEFINED, 1f)).apply { width = 0; setMargins(0, Diu.dp(c, 4), 0, Diu.dp(c, 4)) }
            }
            o1.add(a to o); luoi.addView(o)
        }
        veChon()
    }

    private fun veChon() {
        for ((a, v) in o1) {
            val chon = a.goi == appChon?.goi
            v.background = if (chon) Diu.khoi(c, Diu.KIM_NHAT, 16, Diu.KIM_VIEN, 2) else null
            v.isSelected = chon
        }
    }

    private fun gui() {
        val nhan = oNhan.text.toString()
        val (muc, ten) = when (kieu) {
            KieuXin.APP -> appChon?.let { it.goi to it.ten } ?: return
            KieuXin.WEB -> {
                val m = chuanDiaChiWeb(oWeb.text.toString())
                if (m == null) { bao.text = "Gõ địa chỉ trang web, ví dụ scratch.mit.edu"; bao.visibility = View.VISIBLE; return }
                m to m
            }
        }
        bao.visibility = View.GONE
        nutGui.isEnabled = false; nutGui.text = "Đang gửi…"
        val g = ++gen
        val ctx = c.applicationContext
        val k = kieu
        luong = Thread {
            val r = DichVuNhip.xinDuyet(ctx, muc, ten, nhan, k)
            if (r.id == null) {
                // đã gửi mà không có id (chế độ thử / máy chủ không trả id) ⇒ màn «Đã gửi Ba Mẹ», không hỏi tiếp; chưa gửi ⇒ câu lỗi (web_sai, qua_nhieu_cho, mất mạng)
                h.post { if (g == gen) { if (r.daGui) hienKq(ten, KetQuaXinApp(LoaiKetQuaXin.CHO, null), khongHoi = true) else { bao.text = r.cau; bao.visibility = View.VISIBLE; veNut() } } }
                return@Thread
            }
            h.post { if (g == gen) hienKq(ten, KetQuaXinApp(LoaiKetQuaXin.CHO, null)) }
            // hỏi kết quả mỗi 3 giây, tối đa 5 phút (như màn chặn app)
            for (i in 0 until 100) {
                if (g != gen) return@Thread
                val kq = DichVuNhip.hoiKetQuaXinApp(ctx, r.id)
                if (kq != null && kq.loai != LoaiKetQuaXin.CHO) { HocVien.xongXinApp(ctx, r.id); h.post { if (g == gen) hienKq(ten, kq) }; return@Thread }
                try { Thread.sleep(3000) } catch (_: InterruptedException) { return@Thread }
            }
            // #686: 5 phút chưa có trả lời ⇒ lời xin VẪN chờ (máy chủ không hết hạn lúc này) — thôi hỏi ở hộp, nhịp nền báo khi Ba Mẹ trả lời
            h.post { if (g == gen) hienKq(ten, KetQuaXinApp(LoaiKetQuaXin.CHO, null), khongHoi = true) }
        }.also { it.start() }
    }

    private var khongHoiKq = false
    private fun hienKq(ten: String, k: KetQuaXinApp, khongHoi: Boolean = false) {
        kq = k; khongHoiKq = khongHoi
        val (tieu, phu, cau) = chuKetQuaXinApp(k, ten)
        kqTieu.text = tieu; kqTen.text = ten; kqPhu.text = phu; kqCau.text = cau
        kqTen.visibility = if (tieu.contains(ten)) View.GONE else View.VISIBLE
        val cho = k.loai == LoaiKetQuaXin.CHO
        nutKq.text = if (cho && !khongHoi) "Đang chờ Ba Mẹ…" else if (cho || k.loai == LoaiKetQuaXin.DA_THEM) "Xong" else "Xin lại"
        nutKq.isEnabled = !cho || khongHoi
        bieuMau.visibility = View.GONE; ketQua.visibility = View.VISIBLE
    }

    private fun bamKetQua() {
        when (kq?.loai) {
            LoaiKetQuaXin.DA_THEM -> d.dismiss()   // lamMoi trong OnDismiss
            LoaiKetQuaXin.CHO -> if (khongHoiKq) d.dismiss()
            null -> {}
            else -> { kq = null; gen++; ketQua.visibility = View.GONE; bieuMau.visibility = View.VISIBLE; veNut() }   // «Xin lại»
        }
    }
}
