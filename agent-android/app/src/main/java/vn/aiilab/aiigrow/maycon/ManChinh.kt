package vn.aiilab.aiigrow.maycon

import android.Manifest
import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.InputFilter
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import vn.aiilab.aiigrow.maycon.logic.PHUT_XIN
import vn.aiilab.aiigrow.maycon.logic.TrangThai
import vn.aiilab.aiigrow.maycon.logic.chuanMaGhep
import vn.aiilab.aiigrow.maycon.logic.appChoiDiem
import vn.aiilab.aiigrow.maycon.logic.cauXetDuoc
import vn.aiilab.aiigrow.maycon.logic.docPhanHoiNhip
import vn.aiilab.aiigrow.maycon.logic.thanXinThemGio
import vn.aiilab.aiigrow.maycon.GiaoDien as G

/** Màn chính của Con: còn bao nhiêu phút, xin thêm giờ, hôm nay đã dùng gì; chưa ghép thì ghép bằng mã 6 số + cấp quyền. */
class ManChinh : Activity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var goc: LinearLayout
    private var phutChon = 30
    private var dangGhep = false
    private lateinit var tPhut: TextView
    private lateinit var tCau: TextView
    private lateinit var tMoLai: TextView
    private lateinit var dsDung: LinearLayout
    private var nutPhut: List<Button> = emptyList()
    private var daVe: String? = null
    private var tChao: TextView? = null
    private var daVaoLan = false   // hiệu ứng vào lần lượt chỉ một lần mỗi lần mở màn, không lặp mỗi lần dựng lại
    // app Con (HocVien.kt): tổng quan, trạng thái lời xin, chơi bằng điểm
    private var tViec: TextView? = null
    private var dsNv: LinearLayout? = null
    private var dsNhan: LinearLayout? = null
    private var tXin: TextView? = null
    private var tPhien: TextView? = null
    private var nutDungPhien: Button? = null
    private var theDiem: View? = null
    private var lanNapTQ = 0L
    private var tqDaVe: String? = null   // tổng quan đã vẽ (khỏi dựng lại danh sách mỗi 2 giây)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        @Suppress("DEPRECATION") run {
            window.statusBarColor = Clay.NEN_DINH
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }
        goc = G.cot(this, 16)
        setContentView(ScrollView(this).apply {
            background = G.nenMan(); isFillViewport = true; addView(goc)
            // targetSdk 35 = tràn viền bắt buộc: chừa chỗ thanh trạng thái / thanh điều hướng
            setOnApplyWindowInsetsListener { v, i -> @Suppress("DEPRECATION") v.setPadding(0, i.systemWindowInsetTop, 0, i.systemWindowInsetBottom); i }
        })
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        if (Kho(this).daGhep || QuanTri.laDeviceOwner(this)) DichVuNhip.batDau(this)
        CapNhat.chayNgay(this)
    }

    override fun onResume() { super.onResume(); daVe = null; h.post(lap) }
    override fun onPause() { super.onPause(); h.removeCallbacks(lap) }

    private val lap = object : Runnable {
        override fun run() { ve(); h.postDelayed(this, 2000) }
    }

    private fun ve() {
        val k = Kho(this)
        val kieu = if (k.daGhep) "da_ghep" else "chua_ghep"
        val laDo = QuanTri.laDeviceOwner(this)
        // quyền cài chỉ cần hỏi khi có bản chờ (đỡ một lời gọi PackageManager mỗi 2 giây)
        val duocCai = k.banMoiCho != null && (laDo || Build.VERSION.SDK_INT < 26 || packageManager.canRequestPackageInstalls())
        val quyen = "$laDo${QuanTri.laAdmin(this)}${DoPhut.coQuyen(this)}${TroNang.dangBat(this)}${k.banMoiCho}$duocCai"
        // danh sách trò đổi điểm theo luật mới nhất (luật tới sau khi ghép / Ba Mẹ thêm trò ⇒ dựng lại thẻ)
        val appDiem = if (k.daGhep) cacAppDiem(k).joinToString(",") else ""
        if (daVe != kieu + quyen + appDiem) {
            daVe = kieu + quyen + appDiem
            goc.removeAllViews()
            dauTrang(k)
            theCapNhat(k, laDo, duocCai)
            if (k.daGhep) dungManDaGhep() else dungManGhep()
            theQuyen()
            minhBach()
            if (!daVaoLan) { daVaoLan = true; Clay.vaoLanLuot(goc) }
        }
        if (k.daGhep) capNhatSo(k)
        if (k.daGhep && !k.cheDoThu && System.currentTimeMillis() - lanNapTQ > 60_000) {
            lanNapTQ = System.currentTimeMillis()
            Thread { if (HocVien.napTongQuan(this)) runOnUiThread { veViec(Kho(this)) } }.start()
        }
    }

    private fun dauTrang(k: Kho) {
        goc.addView(G.dauKhoi(this, R.drawable.fl_la, "AiiGrow", Clay.CHINH_SOFT, 20f, Clay.CHINH_INK))
        val ten = HienThi.doc(k.hienThi)?.tenCon ?: k.tenCon
        tChao = G.chu(this, if (k.daGhep) "Chào ${ten ?: "con"}!" else "Máy của Con", 30f, G.CHU, true).apply { setPadding(G.dp(this@ManChinh, 4), 0, 0, G.dp(this@ManChinh, 6)) }
        goc.addView(tChao)
        if (k.cheDoThu) goc.addView(G.chu(this, "Chế độ thử cục bộ (bản debug) — không gọi máy chủ", 13f, 0xFFB45309.toInt()))
    }

    // ------------------------------------------------------------ chưa ghép
    private fun dungManGhep() {
        val t = G.the(this)
        t.addView(G.dauKhoi(this, R.drawable.fl_dien_thoai, "Ghép với gia đình", Clay.LAM_SOFT))
        t.addView(G.chu(this, "Ba Mẹ mở app AiiGrow › Thêm máy › Android để lấy mã 6 số, rồi nhập vào đây.", 15f, G.CHU_PHU))
        val o = EditText(this).apply {
            hint = "000000"; contentDescription = "Mã 6 số"; inputType = InputType.TYPE_CLASS_NUMBER; filters = arrayOf(InputFilter.LengthFilter(6))
            textSize = 28f; gravity = Gravity.CENTER; letterSpacing = 0.3f; minHeight = G.dp(this@ManChinh, 64)
            background = ClayDrawable(this@ManChinh, Clay.Kieu.LOM); setTextColor(G.CHU); setHintTextColor(G.CHU_PHU)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = G.dp(this@ManChinh, 12); bottomMargin = G.dp(this@ManChinh, 4) }
        }
        val bao = G.dongBao(this, Clay.LOI)
        t.addView(o)
        t.addView(G.nut(this, "Ghép máy") {
            val ma = chuanMaGhep(o.text.toString())
            if (ma == null) { bao.text = "Mã gồm đúng 6 chữ số."; return@nut }
            if (dangGhep) return@nut
            dangGhep = true; bao.text = "Đang ghép…"
            Thread {
                val loi = DichVuNhip.ghepBangMa(this, ma)
                runOnUiThread { dangGhep = false; if (loi == null) { bao.text = ""; daVe = null; DichVuNhip.batDau(this); ve() } else bao.text = loi }
            }.start()
        })
        t.addView(bao)
        goc.addView(t)
    }

    // ------------------------------------------------------------ đã ghép
    private fun dungManDaGhep() {
        val t = G.the(this, G.XANH)
        t.addView(G.dauKhoi(this, R.drawable.fl_mat_troi, "Giờ giải trí còn lại hôm nay", Clay.CHINH_SOFT, 15f, 0xEEFFFFFF.toInt()))
        tPhut = G.chu(this, "—", 48f, G.TRANG, true).apply { fontFeatureSettings = "tnum"; pivotX = 0f }
        tCau = G.chu(this, "", 16f, G.TRANG)
        tMoLai = G.chu(this, "", 14f, 0xDDFFFFFF.toInt())
        t.addView(tPhut); t.addView(tCau); t.addView(tMoLai)
        goc.addView(t)
        dungTheViec()

        val x = G.the(this)
        x.addView(G.dauKhoi(this, R.drawable.fl_gio_tay, "Xin Ba Mẹ thêm giờ", Clay.DIEM_SOFT))
        // không canh theo baseline: nút có cỡ chữ khác nhau sẽ bị đẩy lệch dọc
        val hang = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; isBaselineAligned = false }
        nutPhut = PHUT_XIN.map { p ->
            G.nut(this, if (p == 120) "2 giờ" else "$p phút", phu = true) { phutChon = p; nutPhut.forEachIndexed { i, b -> G.chonTrongNhom(this, b, PHUT_XIN[i] == p) } }.apply {
                // ba nút chung một hàng (~47dp chữ ở máy 360dp): một dòng, chữ tự thu 12–16sp thay vì rớt «phút» xuống dòng / bị cắt
                maxLines = 1
                val cach = G.dp(this@ManChinh, 3)   // chia đều khe giữa hai nút, không dồn lề phải
                layoutParams = LinearLayout.LayoutParams(0, layoutParams.height.takeIf { it > 0 } ?: minHeight, 1f).apply {
                    marginStart = if (p == PHUT_XIN.first()) 0 else cach; marginEnd = if (p == PHUT_XIN.last()) 0 else cach; topMargin = G.dp(this@ManChinh, 6) }
            }
        }
        nutPhut.forEach(hang::addView)
        // một cỡ chữ chung cho cả ba nút, tính lại mỗi khi bề rộng đổi (chia màn hình, xoay): lớn nhất 12–16sp mà nhãn dài nhất vừa một dòng
        hang.addOnLayoutChangeListener { _, l, _, r, _, ol, _, or_, _ ->
            if (r - l == or_ - ol) return@addOnLayoutChangeListener
            val b = nutPhut.first(); val rong = b.width - b.paddingLeft - b.paddingRight
            if (rong <= 0) return@addOnLayoutChangeListener
            val sp = resources.displayMetrics.scaledDensity
            val co = (16 downTo 12).firstOrNull { c -> nutPhut.all { n -> android.graphics.Paint(n.paint).apply { textSize = c * sp }.measureText(n.text.toString()) <= rong } } ?: 12
            hang.post { nutPhut.forEach { it.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, co.toFloat()) } }
        }
        nutPhut.forEachIndexed { i, b -> G.chonTrongNhom(this, b, PHUT_XIN[i] == phutChon) }
        x.addView(hang)
        val loi = EditText(this).apply {
            hint = "Lời nhắn cho Ba Mẹ (không bắt buộc)"; filters = arrayOf(InputFilter.LengthFilter(100)); minHeight = G.dp(this@ManChinh, 56)
            background = ClayDrawable(this@ManChinh, Clay.Kieu.LOM); setTextColor(G.CHU); setHintTextColor(G.CHU_PHU); textSize = 16f
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = G.dp(this@ManChinh, 10) }
            // nhiều dòng: chữ hệ thống lớn thì gợi ý / lời nhắn xuống dòng thay vì bị cắt ở mép ô
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            maxLines = 4
        }
        x.addView(loi)
        val bao = G.dongBao(this, Clay.CHINH_INK)
        tXin = G.dongBao(this, Clay.CHINH_INK)
        x.addView(G.nut(this, "Gửi Ba Mẹ") {
            val than = thanXinThemGio(phutChon, loi.text.toString().replace(Regex("\\s*\n\\s*"), " "))  // ô nhiều dòng: lý do gửi Ba Mẹ vẫn một dòng
            bao.text = "Đang gửi…"
            Thread { val s = DichVuNhip.xinThemGio(this, than); runOnUiThread { bao.text = s; loi.setText(""); capNhatXin(Kho(this)) } }.start()
        })
        x.addView(bao)
        x.addView(tXin)
        dungDoiDiem(x)
        goc.addView(x)

        val d = G.the(this)
        d.addView(G.dauKhoi(this, R.drawable.fl_bieu_do, "Hôm nay con đã dùng", Clay.LAM_SOFT))
        dsDung = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        d.addView(dsDung)
        goc.addView(d)
    }

    private fun capNhatSo(k: Kho) {
        if (!::tPhut.isInitialized) return
        capNhatXin(k); veViec(k)
        val ht = HienThi.doc(k.hienThi) ?: run { tPhut.text = "—"; tCau.text = "Đang lấy luật của Ba Mẹ…"; return }
        tChao?.text = "Chào ${ht.tenCon ?: k.tenCon ?: "con"}!"
        val moi = "${ht.conPhut} phút"
        if (tPhut.text.toString() != moi) { val coSo = tPhut.text.toString() != "—"; tPhut.text = moi; if (coSo) Clay.batNhe(tPhut) }
        tCau.text = ht.cauCon
        tMoLai.text = when {
            ht.demNguoc > 0 -> G.dongDemNguoc(ht)
            ht.trangThai == TrangThai.DUOC_THEM_GIO.name && ht.moLaiLuc > 0 -> "Thêm giờ tới ${G.gio(ht.moLaiLuc)}"
            ht.moLaiLuc > System.currentTimeMillis() -> "Mở lại lúc ${G.gio(ht.moLaiLuc)}"
            else -> ""
        }
        dsDung.removeAllViews()
        if (ht.dungTop.isEmpty()) dsDung.addView(G.chu(this, "Chưa dùng app nào.", 15f, G.CHU_PHU))
        for ((goi, p) in ht.dungTop) {
            dsDung.addView(LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL; minimumHeight = G.dp(this@ManChinh, 40); gravity = Gravity.CENTER_VERTICAL
                addView(G.chu(this@ManChinh, DoPhut.tenApp(this@ManChinh, goi) + if (goi in ht.goiChan) " · đang chặn" else "", 16f).apply {
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) })
                addView(G.chu(this@ManChinh, "$p phút", 16f, G.CHU_PHU).apply {
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { marginStart = G.dp(this@ManChinh, 12) } })
            })
        }
    }

    // ------------------------------------------------------------ app Con: việc, quà, lời nhắn, chơi bằng điểm (mục 1, 12, 17)
    private fun dungTheViec() {
        val v = G.the(this)
        v.addView(G.dauKhoi(this, R.drawable.fl_la, "Việc của con", Clay.CHINH_SOFT))
        tViec = G.chu(this, "Đang lấy nhiệm vụ…", 15f, G.CHU_PHU)
        v.addView(tViec)
        dsNv = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        v.addView(dsNv)
        fun hang(a: Pair<String, String>, b: Pair<String, String>) = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; isBaselineAligned = false
            for ((i, p) in listOf(a, b).withIndex()) addView(G.nut(this@ManChinh, p.first, phu = true) { ManTre.mo(this@ManChinh, p.second) }.apply {
                maxLines = 1
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                    topMargin = G.dp(this@ManChinh, 6); if (i == 0) marginEnd = G.dp(this@ManChinh, 3) else marginStart = G.dp(this@ManChinh, 3) }
            })
        }
        v.addView(hang("Nhiệm vụ" to "nhiem-vu", "Nộp bài" to "nhiem-vu"))
        v.addView(hang("Phần quà" to "cua-hang", "Ví quà" to "vi-qua"))
        v.addView(G.nut(this, "Chơi bằng điểm", ngoc = true) {
            val d = theDiem
            if (d != null) (goc.parent as? ScrollView)?.smoothScrollTo(0, (d.parent as View).top + d.top) else ManTre.mo(this, "choi")
        })
        v.addView(G.dauKhoi(this, R.drawable.fl_gio_tay, "Lời nhắn của Ba Mẹ", Clay.DIEM_SOFT, 17f).apply { setPadding(0, G.dp(this@ManChinh, 12), 0, 0) })
        dsNhan = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        v.addView(dsNhan)
        goc.addView(v)
        tqDaVe = "\u0000"   // khác mọi giá trị Kho ⇒ lần vẽ đầu luôn chạy (kể cả khi chưa có tổng quan)
        veViec(Kho(this))
    }

    /** Vẽ tổng quan hoc-vien/tong-quan (đã lưu ở Kho — mất mạng vẫn hiện bản gần nhất). */
    private fun veViec(k: Kho) {
        val s = k.hvTongQuan
        if (s == tqDaVe) return
        tqDaVe = s
        val o = try { s?.let { org.json.JSONObject(it) } } catch (_: Exception) { null }
        val tv = tViec ?: return
        if (o == null) { tv.text = if (k.cheDoThu) "Chế độ thử: không gọi máy chủ." else "Đang lấy nhiệm vụ…"; return }
        val nv = o.optJSONArray("nhiemVu") ?: org.json.JSONArray()
        tv.text = "Con có ${o.optInt("soDu")} điểm · ${if (nv.length() == 0) "chưa có nhiệm vụ mới" else "${nv.length()} nhiệm vụ đang chờ con"}"
        dsNv?.removeAllViews()
        for (i in 0 until minOf(3, nv.length())) {
            val x = nv.optJSONObject(i) ?: continue
            val id = x.optString("id")
            val canBoSung = x.optString("trangThai") == "can_bo_sung"
            dsNv?.addView(G.chu(this, "• ${x.optString("ten")} · ${x.optInt("diem")} điểm" + if (canBoSung) " · Ba Mẹ nhờ bổ sung" else "", 16f, G.CHU).apply {
                maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END; minHeight = G.dp(this@ManChinh, 44); gravity = Gravity.CENTER_VERTICAL
                isClickable = true; contentDescription = "Mở nhiệm vụ ${x.optString("ten")}"
                setOnClickListener { ManTre.mo(this@ManChinh, "nv/$id") }
            })
        }
        dsNhan?.removeAllViews()
        val ln = o.optJSONArray("loiKhen") ?: org.json.JSONArray()
        if (ln.length() == 0) dsNhan?.addView(G.chu(this, "Chưa có lời nhắn nào.", 15f, G.CHU_PHU))
        for (i in 0 until minOf(3, ln.length())) {
            val x = ln.optJSONObject(i) ?: continue
            dsNhan?.addView(G.chu(this, "«${x.optString("noiDung")}»", 16f, G.CHU).apply { setPadding(0, G.dp(this@ManChinh, 6), 0, 0) })
            val ph = x.optString("phanHoi").takeIf { it.isNotBlank() && it != "null" }
            if (ph != null) { dsNhan?.addView(G.chu(this, "Con đã trả lời: $ph", 14f, Clay.CHINH_INK)); continue }
            val id = x.optString("id")
            val bao = G.dongBao(this, Clay.CHINH_INK)
            dsNhan?.addView(G.nut(this, "Con cảm ơn Ba Mẹ!", phu = true) { b ->
                b.isEnabled = false; bao.text = "Đang gửi…"
                Thread {
                    val loi = HocVien.traLoi(this, id, "Con cảm ơn Ba Mẹ!")
                    runOnUiThread { if (loi == null) { bao.text = "Đã gửi Ba Mẹ."; veViec(Kho(this)) } else { bao.text = loi; b.isEnabled = true } }
                }.start()
            })
            dsNhan?.addView(bao)
        }
    }

    /** Đổi điểm lấy thời gian ngay trong thẻ xin giờ (phien/xet ⇒ xác nhận ⇒ phien/mo), như RequestForm.cs «Đổi điểm lấy thời gian». */
    private fun dungDoiDiem(x: LinearLayout) {
        val k = Kho(this)
        val apps = cacAppDiem(k)
        val d = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, G.dp(this@ManChinh, 14), 0, 0) }
        theDiem = d
        d.addView(G.chu(this, "Hoặc đổi điểm lấy thời gian", 17f, G.CHU, true))
        tPhien = G.dongBao(this, Clay.CHINH_INK)
        nutDungPhien = G.nut(this, "Dừng chơi bằng điểm", phu = true) { b ->
            b.isEnabled = false
            Thread { val loi = HocVien.dung(this); runOnUiThread { b.isEnabled = true; tPhien?.text = loi ?: "Đã dừng. Điểm còn lại giữ nguyên."; capNhatXin(Kho(this)) } }.start()
        }.apply { visibility = View.GONE }
        if (apps.isEmpty()) {
            d.addView(G.chu(this, "Chưa có trò chơi nào Ba Mẹ cho đổi điểm trên máy này.", 15f, G.CHU_PHU))
        } else {
            d.addView(G.chu(this, "Chọn trò con muốn chơi:", 15f, G.CHU_PHU))
            var chon = apps.first()
            val bao = G.dongBao(this, Clay.CHINH_INK)
            var daXet: String? = null   // app vừa xét được (nút «Bắt đầu» mở đúng app đó)
            val nutBatDau = G.nut(this, "Bắt đầu chơi bằng điểm", ngoc = true) { b ->
                val muc = daXet ?: return@nut
                b.isEnabled = false; bao.text = "Đang mở…"
                Thread {
                    val loi = HocVien.mo(this, muc)
                    runOnUiThread { b.isEnabled = true; if (loi == null) b.visibility = View.GONE; bao.text = loi ?: "Được rồi! Con chơi vui nhé."; capNhatXin(Kho(this)) }
                }.start()
            }.apply { visibility = View.GONE }
            val nutApp = apps.map { g -> G.nut(this, DoPhut.tenApp(this, g), phu = true) { } }
            nutApp.forEachIndexed { i, b ->
                b.maxLines = 1
                b.setOnClickListener { chon = apps[i]; daXet = null; nutBatDau.visibility = View.GONE; bao.text = ""; nutApp.forEachIndexed { j, n -> G.chonTrongNhom(this, n, j == i) } }
                G.chonTrongNhom(this, b, i == 0)
                d.addView(b)
            }
            d.addView(G.nut(this, "Đổi điểm") { b ->
                b.isEnabled = false; bao.text = "Đang xem con đổi được bao lâu…"; nutBatDau.visibility = View.GONE
                val muc = chon; val ten = DoPhut.tenApp(this, muc)
                Thread {
                    val kq = HocVien.xet(this, muc)
                    runOnUiThread {
                        b.isEnabled = true
                        if (chon != muc) return@runOnUiThread   // Con đã chọn app khác trong lúc chờ ⇒ bỏ kết quả cũ
                        daXet = if (kq.duoc) muc else null
                        bao.text = if (kq.duoc) cauXetDuoc(kq, ten) else kq.cau
                        nutBatDau.visibility = if (kq.duoc) View.VISIBLE else View.GONE
                    }
                }.start()
            })
            d.addView(bao); d.addView(nutBatDau)
        }
        d.addView(tPhien); d.addView(nutDungPhien)
        x.addView(d)
        capNhatXin(k)
    }

    private fun chinhSach(k: Kho) = try { (if (k.cheDoThu) k.tepThu.readText() else k.phanHoi)?.let { docPhanHoiNhip(it).chinhSach } } catch (_: Exception) { null }

    /** App giải trí có trên máy để đổi điểm (≤ 6) — nhớ theo luật để khỏi hỏi PackageManager mỗi 2 giây. */
    private var appDiemTheo: Pair<String?, List<String>>? = null
    private fun cacAppDiem(k: Kho): List<String> {
        val nguon = if (k.cheDoThu) "thu" else k.phanHoi?.let { (chinhSach(k)?.giaiTri ?: emptyList()).toString() }
        appDiemTheo?.let { if (it.first == nguon) return it.second }
        val cs = chinhSach(k)
        val ds = if (cs == null) emptyList() else appChoiDiem(cs, DoPhut.daCai(this).map { it.goi }).take(6)
        appDiemTheo = nguon to ds
        return ds
    }

    /** Thẻ trạng thái lời xin (yeu-cau/:id, DichVuNhip hỏi mỗi nhịp) + phiên điểm đang chạy. */
    private fun capNhatXin(k: Kho) {
        tXin?.text = HocVien.cauLoiXin(k) ?: ""
        val dangChoi = k.phienId != null
        nutDungPhien?.visibility = if (dangChoi) View.VISIBLE else View.GONE
        if (dangChoi) chinhSach(k)?.phien?.let { tPhien?.text = "Đang chơi bằng điểm · còn ${it.conPhut} phút" }
        else if (tPhien?.text?.startsWith("Đang chơi") == true) tPhien?.text = ""
    }

    // ------------------------------------------------------------ quyền (đường không reset) + minh bạch
    private fun theQuyen() {
        val t = G.the(this, G.XANH_NHAT)
        if (QuanTri.laDeviceOwner(this)) {
            t.addView(G.dauKhoi(this, R.drawable.fl_khien, "Cách quản lý: Device Owner", Clay.THE, 17f))
            t.addView(G.chu(this, "Máy được cài bằng QR khi khôi phục gốc. App bị chặn hiện xám «Đã tạm dừng».", 15f, G.CHU_PHU))
            if (!DoPhut.coQuyen(this)) t.addView(G.nut(this, "Cho phép đếm thời gian dùng", phu = true) { moCaiDat(Settings.ACTION_USAGE_ACCESS_SETTINGS) })
            goc.addView(t); return
        }
        t.addView(G.dauKhoi(this, R.drawable.fl_khien, "Cách quản lý: không cần khôi phục gốc", Clay.THE, 17f))
        t.addView(G.chu(this, "Ba Mẹ bật đủ 3 quyền dưới đây. Muốn chặn mạnh hơn (app hiện «Đã tạm dừng»), cài lại bằng QR Device Owner.", 15f, G.CHU_PHU))
        val q = listOf(
            Triple("Quyền quản trị thiết bị (khoá máy)", QuanTri.laAdmin(this)) {
                startActivity(Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, QuanTri.ten(this))
                    .putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "AiiGrow dùng quyền này để khoá màn hình khi Ba Mẹ bấm Khoá ngay hoặc tới giờ ngủ."))
            },
            Triple("Đếm thời gian dùng ứng dụng", DoPhut.coQuyen(this)) { moCaiDat(Settings.ACTION_USAGE_ACCESS_SETTINGS) },
            Triple("Trợ năng AiiGrow (màn chặn)", TroNang.dangBat(this)) { moCaiDat(Settings.ACTION_ACCESSIBILITY_SETTINGS) },
        )
        for ((ten, co, mo) in q) {
            if (co) t.addView(G.chu(this, "✓  $ten", 16f, Clay.CHINH_INK).apply { minHeight = G.dp(this@ManChinh, 48); gravity = Gravity.CENTER_VERTICAL })
            else t.addView(G.nut(this, "Bật: $ten", phu = true) { mo() })
        }
        goc.addView(t)
    }

    /** Có bản mới đã tải + kiểm xong mà chưa cài (đường không reset): bật quyền cài cho AiiGrow rồi cập nhật. Device Owner tự cài im lặng. */
    private fun theCapNhat(k: Kho, laDo: Boolean, duocCai: Boolean) {
        val ban = k.banMoiCho ?: return
        if (laDo) return
        val t = G.the(this, G.XANH_NHAT)
        t.addView(G.dauKhoi(this, R.drawable.fl_la, "Có bản AiiGrow mới $ban", Clay.CHINH_SOFT, 17f))
        if (!duocCai) {
            t.addView(G.chu(this, "Ba Mẹ bật «Cho phép từ nguồn này» cho AiiGrow (một lần) để app tự cập nhật.", 15f, G.CHU_PHU))
            t.addView(G.nut(this, "Bật quyền cập nhật", phu = true) {
                try { startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, android.net.Uri.parse("package:$packageName"))) }
                catch (_: Exception) { moCaiDat(Settings.ACTION_SECURITY_SETTINGS) }
            })
        } else t.addView(G.nut(this, "Cập nhật ngay") { CapNhat.chayNgay(this, epHoi = true) })
        goc.addView(t)
    }

    private fun moCaiDat(a: String) { try { startActivity(Intent(a)) } catch (_: Exception) { startActivity(Intent(Settings.ACTION_SETTINGS)) } }

    private fun minhBach() {
        goc.addView(G.chu(this,
            "Máy này do Ba Mẹ quản lý bằng AiiGrow. AiiGrow đếm thời gian dùng từng ứng dụng và tạm dừng ứng dụng theo luật Ba Mẹ đặt. " +
                "AiiGrow không đọc tin nhắn, ảnh hay nội dung con gõ.", 13f, G.CHU_PHU).apply { setPadding(0, G.dp(this@ManChinh, 18), 0, 0) })
        if (intent?.getBooleanExtra("xin", false) == true) goc.post { (goc.parent as? ScrollView)?.smoothScrollTo(0, 0) }
    }
}
