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
import vn.aiilab.aiigrow.maycon.logic.PHUT_NGOAI_LE
import vn.aiilab.aiigrow.maycon.logic.PHUT_XIN
import vn.aiilab.aiigrow.maycon.logic.chiNgoaiLe
import vn.aiilab.aiigrow.maycon.logic.thanXinNgoaiLe
import vn.aiilab.aiigrow.maycon.logic.TrangThai
import vn.aiilab.aiigrow.maycon.logic.Cong
import vn.aiilab.aiigrow.maycon.logic.SAO_DOI
import vn.aiilab.aiigrow.maycon.logic.cauThieuSao
import vn.aiilab.aiigrow.maycon.logic.xemDoiSao
import vn.aiilab.aiigrow.maycon.logic.chuanMaGhep
import vn.aiilab.aiigrow.maycon.logic.docPhanHoiNhip
import vn.aiilab.aiigrow.maycon.logic.thanXinThemGio
import vn.aiilab.aiigrow.maycon.GiaoDien as G

/** Màn chính của Con: còn bao nhiêu phút, xin thêm giờ, hôm nay đã dùng gì; chưa ghép thì ghép bằng mã 6 số + cấp quyền. */
class ManChinh : Activity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var goc: LinearLayout
    private var phutChon = PHUT_XIN.first()
    private var dangGhep = false
    private lateinit var tPhut: TextView
    private lateinit var tCau: TextView
    private lateinit var tMoLai: TextView
    private lateinit var dsDung: LinearLayout
    private var nutPhut: List<Button> = emptyList()
    private var daVe: String? = null
    private var tChao: TextView? = null
    // app Con (HocVien.kt): tổng quan, trạng thái lời xin, chơi bằng điểm
    private var tViec: TextView? = null
    private var dsNv: LinearLayout? = null
    private var dsNhan: LinearLayout? = null
    private var tXin: TextView? = null
    private var lanNapTQ = 0L
    private var tqDaVe: String? = null   // tổng quan đã vẽ (khỏi dựng lại danh sách mỗi 2 giây)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        @Suppress("DEPRECATION") run {
            window.statusBarColor = Diu.NEN
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
        // 05/11: giờ ngủ / Ba Mẹ khoá ⇒ thẻ xin đổi thành «Xin Ba Mẹ mở ngoại lệ» (dựng lại thẻ khi đổi)
        val appDiem = if (k.daGhep) (HienThi.doc(k.hienThi)?.trangThai?.let(::chiNgoaiLe) ?: false).toString() else ""
        // 06/11 L13: cổng PIN (bé đang dùng / Ba Mẹ dùng) đổi ⇒ dựng lại (chip tên, màn Ba Mẹ)
        val cong = if (k.daGhep) PinMay.cong(k) else Cong.MO
        val nguoi = cong.name + (PinMay.tenDangDung(k) ?: "")
        // máy ở cổng chọn tên (vd vừa «Đăng xuất») ⇒ sang màn khoá chọn tên + PIN (đường không reset: lớp phủ không che app AiiGrow)
        if (cong == Cong.CHON_TEN && HienThi.doc(k.hienThi)?.cong == Cong.CHON_TEN.name && ManKhoa.dangMo == null) {
            startActivity(Intent(this, ManKhoa::class.java)); return
        }
        if (daVe != kieu + quyen + appDiem + nguoi) {
            daVe = kieu + quyen + appDiem + nguoi
            goc.removeAllViews(); tBaMe = null
            dauTrang(k)
            theCapNhat(k, laDo, duocCai)
            when {
                !k.daGhep -> dungManGhep()
                cong == Cong.BA_ME -> dungManBaMe()
                else -> dungManDaGhep()
            }
            theQuyen()
            minhBach()
        }
        tBaMe?.let { t ->
            val den = PinMay.baMeDen(k)
            t.text = if (den > 0) "Tới ${G.gio(den)} · còn ${G.mmssDai(((den - System.currentTimeMillis()) / 1000).toInt())}" else "Hết giờ Ba Mẹ dùng — máy khoá lại."
        }
        if (k.daGhep && cong != Cong.BA_ME) capNhatSo(k)
        if (k.daGhep && !k.cheDoThu && System.currentTimeMillis() - lanNapTQ > 60_000) {
            lanNapTQ = System.currentTimeMillis()
            Thread { if (HocVien.napTongQuan(this)) runOnUiThread { veViec(Kho(this)) } }.start()
        }
    }

    private fun dauTrang(k: Kho) {
        val ten = PinMay.tenDangDung(k) ?: HienThi.doc(k.hienThi)?.tenCon ?: k.tenCon
        tChao = Diu.chu(this, if (k.daGhep) "Chào ${ten ?: "con"}!" else "Máy của Con", 28f, Diu.CHU, true).apply { setPadding(G.dp(this@ManChinh, 4), G.dp(this@ManChinh, 8), 0, 0) }
        goc.addView(tChao)
        // 06/11 L13: chip «Bảo Anh ▾» dưới lời chào (máy có PIN theo bé) ⇒ «Đổi bé / Đăng xuất»
        val nd = PinMay.nguoiDung(k)
        if (k.daGhep && PinMay.cong(k) == Cong.CON && nd?.conId != null) {
            val tenBe = ten ?: "Con"
            goc.addView(Diu.chipBe(this, tenBe, PinMay.hoSo(k)?.con?.indexOfFirst { it.id == nd.conId }?.coerceAtLeast(0) ?: 0) { hoiDoiBe(tenBe) }.apply {
                (layoutParams as LinearLayout.LayoutParams).topMargin = G.dp(this@ManChinh, 6) })
        }
        if (k.cheDoThu) goc.addView(G.chu(this, "Chế độ thử cục bộ (bản debug) — không gọi máy chủ", 13f, 0xFFB45309.toInt()))
    }

    /** «Đổi bé / Đăng xuất» (con-dt-khac/13): thẻ dưới đáy — Đổi bé, Đăng xuất, Ở lại. */
    private fun hoiDoiBe(ten: String) {
        val k = Kho(this)
        val d = android.app.Dialog(this)
        val t = Diu.the(this, dem = 20).apply { gravity = Gravity.CENTER_HORIZONTAL }
        t.addView(Diu.vongTen(this, ten.trim().firstOrNull()?.uppercase() ?: "?", PinMay.hoSo(k)?.con?.indexOfFirst { it.id == PinMay.nguoiDung(k)?.conId }?.coerceAtLeast(0) ?: 0, 64))
        t.addView(Diu.chu(this, ten, 22f, Diu.CHU, true).apply { gravity = Gravity.CENTER; setPadding(0, G.dp(this@ManChinh, 8), 0, 0) })
        t.addView(Diu.chu(this, "Đang dùng máy này", 15f, Diu.CHU2).apply { gravity = Gravity.CENTER })
        t.addView(Diu.nut(this, "Đổi bé", Diu.KieuNut.PHU) { d.dismiss(); PinMay.roiMay(this, baMe = false) })
        t.addView(Diu.nut(this, "Đăng xuất") { d.dismiss(); PinMay.roiMay(this, baMe = false) })
        t.addView(Diu.chu(this, "Đăng xuất thì máy khoá lại. Vào lại bằng tên + PIN.", 14f, Diu.CHU3).apply { gravity = Gravity.CENTER; setPadding(0, G.dp(this@ManChinh, 10), 0, 0) })
        t.addView(Diu.nut(this, "Ở lại", Diu.KieuNut.CHU) { d.dismiss() })
        d.setContentView(t)
        d.window?.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(0))
        d.window?.setGravity(Gravity.BOTTOM)
        d.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        d.show()
    }

    /** «Ba Mẹ đang dùng máy» (con-dt-khac/12): không tính giờ con, đếm tới hạn, «Khoá lại» ⇒ máy về màn chọn tên. */
    private var tBaMe: TextView? = null
    private fun dungManBaMe() {
        val t = G.the(this, G.XANH_NHAT)
        t.addView(Diu.chu(this, "Ba Mẹ đang dùng", 24f, Diu.CHU, true))
        t.addView(Diu.chu(this, "Không trừ giờ của con", 16f, Diu.XANH_DAM))
        tBaMe = Diu.chu(this, "", 15f, Diu.CHU2).apply { setPadding(0, G.dp(this@ManChinh, 6), 0, 0) }
        t.addView(tBaMe)
        t.addView(Diu.nut(this, "Khoá lại") { PinMay.roiMay(this, baMe = true); daVe = null })
        goc.addView(t)
        goc.addView(Diu.chu(this, "Máy mở hết cho Ba Mẹ. Xong việc thì bấm «Khoá lại».", 15f, Diu.CHU2).apply { setPadding(G.dp(this@ManChinh, 4), G.dp(this@ManChinh, 12), 0, 0) })
    }

    // ------------------------------------------------------------ chưa ghép
    private fun dungManGhep() {
        val t = G.the(this)
        t.addView(G.dauKhoi(this, R.drawable.fl_dien_thoai, "Ghép với gia đình", Clay.LAM_SOFT))
        t.addView(G.chu(this, "Ba Mẹ mở app AiiGrow › Thêm máy › Android để lấy mã 6 số, rồi nhập vào đây.", 15f, G.CHU_PHU))
        val o = EditText(this).apply {
            hint = "000000"; contentDescription = "Mã 6 số"; inputType = InputType.TYPE_CLASS_NUMBER; filters = arrayOf(InputFilter.LengthFilter(6))
            textSize = 28f; gravity = Gravity.CENTER; letterSpacing = 0.3f; minHeight = G.dp(this@ManChinh, 64)
            background = Diu.khoi(this@ManChinh, Diu.TRANG, 16, Diu.VIEN); setTextColor(G.CHU); setHintTextColor(G.CHU_PHU)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = G.dp(this@ManChinh, 12); bottomMargin = G.dp(this@ManChinh, 4) }
        }
        val bao = G.dongBao(this, Diu.LOI_DAM)
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

    // ------------------------------------------------------------ đã ghép (con-dt-android/01 «Việc của con» — bản Dịu)
    private lateinit var vongGio: Diu.VongGio
    private lateinit var tDaChoi: TextView
    private var oSao: LinearLayout? = null
    private var saoDaVe = -2

    private fun dungManDaGhep() {
        // thẻ giờ chơi: vòng + «Còn 18 phút chơi · chơi còn lại · đã chơi 42/60» + sao + «Đổi sao lấy giờ chơi»
        val t = G.the(this)
        val hang = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val khungVong = android.widget.FrameLayout(this)
        vongGio = Diu.VongGio(this, 116)
        khungVong.addView(vongGio, android.widget.FrameLayout.LayoutParams(G.dp(this, 116), G.dp(this, 116)))
        tPhut = Diu.chu(this, "—", 26f, Diu.CHU, true).apply { gravity = Gravity.CENTER; fontFeatureSettings = "tnum" }
        khungVong.addView(tPhut, android.widget.FrameLayout.LayoutParams(G.dp(this, 116), G.dp(this, 116)))
        hang.addView(khungVong)
        val ben = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(G.dp(this@ManChinh, 14), 0, 0, 0) }
        tCau = Diu.chu(this, "", 19f, Diu.CHU, true)
        tDaChoi = Diu.chu(this, "", 14f, Diu.CHU2)
        tMoLai = Diu.chu(this, "", 14f, Diu.XANH_DAM)
        oSao = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, G.dp(this@ManChinh, 8), 0, 0) }
        ben.addView(tCau); ben.addView(tDaChoi); ben.addView(tMoLai); ben.addView(oSao)
        hang.addView(ben, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        t.addView(hang)
        val laNl0 = HienThi.doc(Kho(this).hienThi)?.trangThai?.let(::chiNgoaiLe) ?: false
        if (!laNl0) t.addView(Diu.nut(this, "Đổi sao lấy giờ chơi") { moDoiSao() })
        goc.addView(t)
        saoDaVe = -2
        dungTheViec()

        val x = G.the(this)
        val laNl = laNl0
        val dsPhut = if (laNl) PHUT_NGOAI_LE else PHUT_XIN
        if (phutChon !in dsPhut) phutChon = if (laNl) 30 else dsPhut.first()
        theXin = x
        x.addView(G.dauKhoi(this, R.drawable.fl_gio_tay, if (laNl) "Xin Ba Mẹ mở máy" else "Xin Ba Mẹ thêm giờ"))
        if (laNl) x.addView(G.chu(this, "Giờ ngủ / Ba Mẹ đang khoá: không thêm giờ được, con xin Ba Mẹ mở máy một lúc nhé.", 15f, G.CHU_PHU))
        val hangPhut = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; isBaselineAligned = false }
        nutPhut = dsPhut.map { p ->
            G.nut(this, "$p phút", phu = true) { phutChon = p; nutPhut.forEachIndexed { i, b -> G.chonTrongNhom(this, b, dsPhut[i] == p) } }.apply {
                maxLines = 1
                val cach = G.dp(this@ManChinh, 4)
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                    marginStart = if (p == dsPhut.first()) 0 else cach; marginEnd = if (p == dsPhut.last()) 0 else cach; topMargin = G.dp(this@ManChinh, 8) }
            }
        }
        nutPhut.forEach(hangPhut::addView)
        nutPhut.forEachIndexed { i, b -> G.chonTrongNhom(this, b, dsPhut[i] == phutChon) }
        x.addView(hangPhut)
        val loi = EditText(this).apply {
            hint = "Lời nhắn cho Ba Mẹ (không bắt buộc)"; filters = arrayOf(InputFilter.LengthFilter(100)); minHeight = G.dp(this@ManChinh, 52)
            background = Diu.khoi(this@ManChinh, Diu.TRANG, 16, Diu.VIEN); setTextColor(G.CHU); setHintTextColor(Diu.CHU3); textSize = 16f
            typeface = Diu.font(this@ManChinh); setPadding(G.dp(this@ManChinh, 14), G.dp(this@ManChinh, 10), G.dp(this@ManChinh, 14), G.dp(this@ManChinh, 10))
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = G.dp(this@ManChinh, 10) }
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            maxLines = 4
        }
        x.addView(loi)
        val bao = G.dongBao(this, Diu.XANH_DAM)
        tXin = G.dongBao(this, Diu.XANH_DAM)
        x.addView(G.nut(this, "Gửi Ba Mẹ") {
            val nhan = loi.text.toString().replace(Regex("\\s*\n\\s*"), " ")
            val than = if (laNl) thanXinNgoaiLe(phutChon, nhan) else thanXinThemGio(phutChon, nhan)
            bao.text = "Đang gửi…"
            Thread { val s = DichVuNhip.xinThemGio(this, than); runOnUiThread { bao.text = s; loi.setText(""); capNhatXin(Kho(this)) } }.start()
        })
        x.addView(bao)
        x.addView(tXin)
        goc.addView(x)

        val d = G.the(this)
        d.addView(G.dauKhoi(this, R.drawable.fl_bieu_do, "Hôm nay con đã dùng"))
        dsDung = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        d.addView(dsDung)
        goc.addView(d)
    }
    private var theXin: View? = null

    private fun capNhatSo(k: Kho) {
        if (!::tPhut.isInitialized) return
        capNhatXin(k); veViec(k)
        val ht = HienThi.doc(k.hienThi) ?: run { tPhut.text = "—"; tCau.text = "Đang lấy luật của Ba Mẹ…"; return }
        tChao?.text = "Chào ${PinMay.tenDangDung(k) ?: ht.tenCon ?: k.tenCon ?: "con"}!"
        val moi = "${ht.conPhut} phút"
        if (tPhut.text.toString() != moi) tPhut.text = moi
        tCau.text = if (ht.trangThai == TrangThai.BINH_THUONG.name || ht.trangThai == TrangThai.DUOC_THEM_GIO.name) "Còn ${ht.conPhut} phút chơi" else ht.cauCon
        val quy = chinhSach(k)?.quy
        if (quy != null && quy.tongPhut > 0) {
            tDaChoi.text = "chơi còn lại · đã chơi ${quy.daDung}/${quy.tongPhut}"
            vongGio.tyLe = ht.conPhut.toFloat() / quy.tongPhut
        } else { tDaChoi.text = "phút chơi còn lại hôm nay"; vongGio.tyLe = if (ht.conPhut > 0) 1f else 0f }
        tMoLai.text = when {
            ht.demNguoc > 0 -> G.dongDemNguoc(ht)
            ht.trangThai == TrangThai.DUOC_THEM_GIO.name && ht.moLaiLuc > 0 -> "Thêm giờ tới ${G.gio(ht.moLaiLuc)}"
            ht.moLaiLuc > System.currentTimeMillis() -> "Mở lại lúc ${G.gio(ht.moLaiLuc)}"
            else -> ""
        }
        tMoLai.visibility = if (tMoLai.text.isEmpty()) View.GONE else View.VISIBLE
        val sao = saoHienCo(k)
        if (sao != saoDaVe) { saoDaVe = sao ?: -1; oSao?.removeAllViews(); if (sao != null) oSao?.addView(Diu.chipSao(this, sao)) }
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

    private fun saoHienCo(k: Kho): Int? = try { k.hvTongQuan?.let { org.json.JSONObject(it) }?.let { it.optInt("sao", it.optInt("soDu")) } } catch (_: Exception) { null }

    /** Số phút cho 10 sao (tỷ lệ nhà) — tổng quan hoặc chính sách nhịp; mặc định 10. */
    private fun phut10Sao(k: Kho): Int {
        val ty = try { k.hvTongQuan?.let { org.json.JSONObject(it) }?.optJSONObject("quy")?.optJSONObject("tyLe") } catch (_: Exception) { null }
        return ty?.let { (it.optInt("phut", 10) * 10 / it.optInt("sao", 10).coerceAtLeast(1)).coerceAtLeast(1) } ?: chinhSach(k)?.quy?.phut10Sao ?: 10
    }

    /** «Đổi sao lấy giờ chơi» (con-dt-android/02) → «+10 phút chơi!» (03) / «Chưa đủ sao» (04). Màn toàn trang trên nền kem. */
    private fun moDoiSao() {
        val k = Kho(this)
        val d = android.app.Dialog(this, android.R.style.Theme_DeviceDefault_Light_NoActionBar)
        val cot = G.cot(this, 16)
        val cuon = ScrollView(this).apply { background = G.nenMan(); isFillViewport = true; addView(cot)
            setOnApplyWindowInsetsListener { v, i -> @Suppress("DEPRECATION") v.setPadding(0, i.systemWindowInsetTop, 0, i.systemWindowInsetBottom); i } }
        var chon = SAO_DOI.first()
        fun ve() {
            cot.removeAllViews()
            val coSao = saoHienCo(k) ?: 0
            val conPhut = HienThi.doc(k.hienThi)?.conPhut ?: 0
            val x = xemDoiSao(chon, coSao, conPhut, phut10Sao(k))
            cot.addView(Diu.nut(this, "‹  Quay lại", Diu.KieuNut.CHU) { d.dismiss() }.apply {
                layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT) })
            if (!x.du) {
                cot.addView(Diu.chipSao(this, coSao, to = true).apply { (layoutParams as LinearLayout.LayoutParams).gravity = Gravity.CENTER_HORIZONTAL })
                cot.addView(Diu.chu(this, "Chưa đủ sao", 26f, Diu.CHU, true).apply { gravity = Gravity.CENTER; setPadding(0, G.dp(this@ManChinh, 16), 0, 0) })
                cot.addView(Diu.chu(this, "Cần ${x.sao} sao · con có $coSao", 16f, Diu.CHU2).apply { gravity = Gravity.CENTER })
                cot.addView(Diu.chu(this, cauThieuSao(x.thieu), 16f, Diu.XANH_DAM, true).apply { gravity = Gravity.CENTER; setPadding(0, G.dp(this@ManChinh, 6), 0, 0) })
                cot.addView(Diu.nut(this, "Làm nhiệm vụ kiếm sao") { d.dismiss(); ManTre.mo(this, "nhiem-vu") })
                if (x.doiDuocToiDa >= 10) cot.addView(Diu.nut(this, "Đổi ${x.doiDuocToiDa} sao", Diu.KieuNut.PHU) { chon = x.doiDuocToiDa; ve() })
                cot.addView(Diu.nut(this, "Xin Ba Mẹ", Diu.KieuNut.CHU) { d.dismiss(); cuonToiXin() })
                return
            }
            cot.addView(Diu.chu(this, "Đổi sao lấy giờ chơi", 26f, Diu.CHU, true))
            val the = Diu.the(this)
            the.addView(Diu.chu(this, "Con đang có", 15f, Diu.CHU2))
            the.addView(Diu.chipSao(this, coSao, to = true))
            the.addView(Diu.chu(this, "10 sao = ${phut10Sao(k)} phút", 15f, Diu.CHU2).apply { setPadding(0, G.dp(this@ManChinh, 6), 0, 0) })
            cot.addView(the)
            cot.addView(Diu.chu(this, "Con muốn đổi", 17f, Diu.CHU, true).apply { setPadding(0, G.dp(this@ManChinh, 14), 0, 0) })
            val hang = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            SAO_DOI.forEachIndexed { i, s ->
                hang.addView(Diu.nut(this, "$s sao", Diu.KieuNut.PHU) { chon = s; ve() }.apply {
                    maxLines = 1; setPadding(0, 0, 0, 0)
                    Diu.chon(this@ManChinh, this, s == chon)
                    layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (i > 0) marginStart = G.dp(this@ManChinh, 8) }
                })
            }
            cot.addView(hang)
            val xem = Diu.the(this, Diu.XANH_NHAT)
            xem.addView(Diu.chu(this, "Giờ chơi", 15f, Diu.CHU2))
            xem.addView(Diu.chu(this, "${x.phutTruoc} → ${x.phutSau} phút", 24f, Diu.XANH_DAM, true))
            xem.addView(Diu.chu(this, "Còn lại ${x.conLaiSao} sao", 15f, Diu.CHU2))
            cot.addView(xem)
            val bao = G.dongBao(this, Diu.LOI_DAM)
            cot.addView(Diu.nut(this, "Đổi ${x.sao} sao lấy ${x.phut} phút") { b ->
                b.isEnabled = false; bao.text = "Đang đổi sao…"
                Thread {
                    val loi = HocVien.doiSao(this, x.phut)
                    runOnUiThread {
                        if (loi != null) { b.isEnabled = true; bao.text = loi; return@runOnUiThread }
                        // 03 «+10 phút chơi!»
                        cot.removeAllViews()
                        cot.addView(Diu.chipSao(this, x.conLaiSao, to = true).apply { (layoutParams as LinearLayout.LayoutParams).gravity = Gravity.END })
                        cot.addView(Diu.chu(this, "+${x.phut} phút chơi!", 28f, Diu.XANH_DAM, true).apply { gravity = Gravity.CENTER; setPadding(0, G.dp(this@ManChinh, 40), 0, 0) })
                        cot.addView(Diu.chu(this, "${x.phutSau} phút", 44f, Diu.CHU, true).apply { gravity = Gravity.CENTER })
                        cot.addView(Diu.chu(this, "Giờ chơi ${x.phutTruoc} → ${x.phutSau} phút", 16f, Diu.CHU2).apply { gravity = Gravity.CENTER })
                        cot.addView(Diu.chu(this, "Đã trừ ${x.sao} sao · còn ${x.conLaiSao} sao", 15f, Diu.CHU2).apply { gravity = Gravity.CENTER; setPadding(0, G.dp(this@ManChinh, 6), 0, 0) })
                        cot.addView(Diu.nut(this, "Chơi tiếp ${x.phutSau} phút") { d.dismiss() })
                    }
                }.start()
            })
            cot.addView(bao)
            cot.addView(Diu.nut(this, "Đổi quà", Diu.KieuNut.PHU) { d.dismiss(); ManTre.mo(this, "cua-hang") })
            cot.addView(Diu.nut(this, "Xin Ba Mẹ thêm giờ", Diu.KieuNut.CHU) { d.dismiss(); cuonToiXin() })
        }
        ve()
        d.setContentView(cuon)
        d.window?.statusBarColor = Diu.NEN
        d.show()
    }

    private fun cuonToiXin() { val x = theXin ?: return; goc.post { (goc.parent as? ScrollView)?.smoothScrollTo(0, x.top) } }

    // ------------------------------------------------------------ app Con: việc, lời nhắn (con-dt-android/01)
    private fun dungTheViec() {
        val v = G.the(this)
        v.addView(Diu.chu(this, "Việc của con", 20f, Diu.CHU, true))
        tViec = Diu.chu(this, "Đang lấy nhiệm vụ…", 14f, Diu.CHU2)
        v.addView(tViec)
        dsNv = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        v.addView(dsNv)
        v.addView(Diu.nut(this, "Xem cả các việc  ›", Diu.KieuNut.CHU) { ManTre.mo(this, "nhiem-vu") }.also { nutXemViec = it }.apply { setTextColor(Diu.XANH_DAM) })
        goc.addView(v)
        // lối tắt như thanh tab của màn mẫu: Nhiệm vụ · Sao & quà · Quà của con
        val tab = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; isBaselineAligned = false }
        listOf("Nhiệm vụ" to "nhiem-vu", "Sao & quà" to "cua-hang", "Quà của con" to "vi-qua").forEachIndexed { i, (ten, duong) ->
            tab.addView(Diu.nut(this, ten, Diu.KieuNut.PHU) { ManTre.mo(this, duong) }.apply {
                maxLines = 1; textSize = 15f; setPadding(G.dp(this@ManChinh, 4), 0, G.dp(this@ManChinh, 4), 0)
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { topMargin = G.dp(this@ManChinh, 12); if (i > 0) marginStart = G.dp(this@ManChinh, 8) } })
        }
        goc.addView(tab)
        val n = G.the(this)
        n.addView(Diu.chu(this, "Lời nhắn của Ba Mẹ", 18f, Diu.CHU, true))
        dsNhan = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        n.addView(dsNhan)
        goc.addView(n)
        tqDaVe = "\u0000"   // khác mọi giá trị Kho ⇒ lần vẽ đầu luôn chạy (kể cả khi chưa có tổng quan)
        veViec(Kho(this))
    }
    private var nutXemViec: Button? = null

    /** Vẽ tổng quan hoc-vien/tong-quan (đã lưu ở Kho — mất mạng vẫn hiện bản gần nhất). */
    private fun veViec(k: Kho) {
        val s = k.hvTongQuan
        if (s == tqDaVe) return
        tqDaVe = s
        val o = try { s?.let { org.json.JSONObject(it) } } catch (_: Exception) { null }
        val tv = tViec ?: return
        if (o == null) { tv.text = if (k.cheDoThu) "Chế độ thử: không gọi máy chủ." else "Đang lấy nhiệm vụ…"; return }
        val nv = o.optJSONArray("nhiemVu") ?: org.json.JSONArray()
        val nhom = (0 until nv.length()).mapNotNull { nv.optJSONObject(it)?.optString("nhom")?.takeIf { n -> n.isNotBlank() && n != "null" } }.firstOrNull()
        tv.text = if (nv.length() == 0) "Chưa có nhiệm vụ mới" else listOfNotNull(nhom, "${nv.length()} việc").joinToString(" · ")
        nutXemViec?.text = if (nv.length() > 3) "Xem cả ${nv.length()} việc  ›" else "Xem nhiệm vụ  ›"
        dsNv?.removeAllViews()
        for (i in 0 until minOf(4, nv.length())) {
            val x = nv.optJSONObject(i) ?: continue
            val id = x.optString("id")
            val tt = x.optString("trangThai")
            val choDuyet = tt == "cho_duyet" || x.optBoolean("dangCho")
            val canBoSung = tt == "can_bo_sung"
            val hang = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; minimumHeight = G.dp(this@ManChinh, 56)
                setPadding(0, G.dp(this@ManChinh, 6), 0, G.dp(this@ManChinh, 6))
                isClickable = true; contentDescription = "Mở nhiệm vụ ${x.optString("ten")}"
                setOnClickListener { ManTre.mo(this@ManChinh, "nv/$id") }
            }
            val trai = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            trai.addView(Diu.chu(this, x.optString("ten"), 17f, Diu.CHU, true).apply { maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END })
            if (canBoSung) trai.addView(Diu.chu(this, "Ba Mẹ nhờ làm lại", 13f, Diu.LOI_DAM))
            hang.addView(trai, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            if (choDuyet) hang.addView(Diu.chu(this, "⏳ Chờ duyệt", 13f, Diu.CHU2, true).apply {
                background = Diu.khoi(this@ManChinh, 0xFFF1EFE9.toInt(), 14, null); setPadding(G.dp(this@ManChinh, 10), G.dp(this@ManChinh, 5), G.dp(this@ManChinh, 10), G.dp(this@ManChinh, 5)) })
            else {
                hang.addView(Diu.chipSao(this, x.optInt("sao", x.optInt("diem"))).apply { text = "+${x.optInt("sao", x.optInt("diem"))} sao" })
                val nop = when (x.optString("bangChung")) { "ghi_am" -> "Ghi âm"; "viet" -> "Viết"; "anh", "anh_video" -> "Nộp ảnh"; else -> "Nộp bài" }
                hang.addView(Diu.nut(this, nop, Diu.KieuNut.NHAT) { ManTre.mo(this, "nv/$id") }.apply {
                    textSize = 14f; maxLines = 1; setPadding(G.dp(this@ManChinh, 12), 0, G.dp(this@ManChinh, 12), 0); minHeight = G.dp(this@ManChinh, 44); minimumHeight = minHeight
                    layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginStart = G.dp(this@ManChinh, 8) } })
            }
            if (i > 0) dsNv?.addView(View(this).apply { setBackgroundColor(Diu.VIEN); layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1) })
            dsNv?.addView(hang)
        }
        dsNhan?.removeAllViews()
        val ln = o.optJSONArray("loiKhen") ?: org.json.JSONArray()
        if (ln.length() == 0) dsNhan?.addView(G.chu(this, "Chưa có lời nhắn nào.", 15f, G.CHU_PHU))
        for (i in 0 until minOf(3, ln.length())) {
            val x = ln.optJSONObject(i) ?: continue
            dsNhan?.addView(G.chu(this, "«${x.optString("noiDung")}»", 16f, G.CHU).apply { setPadding(0, G.dp(this@ManChinh, 6), 0, 0) })
            val ph = x.optString("phanHoi").takeIf { it.isNotBlank() && it != "null" }
            if (ph != null) { dsNhan?.addView(G.chu(this, "Con đã trả lời: $ph", 14f, Diu.XANH_DAM)); continue }
            val id = x.optString("id")
            val bao = G.dongBao(this, Diu.XANH_DAM)
            dsNhan?.addView(G.nut(this, "Con cảm ơn Ba Mẹ!", phu = true) { b ->
                b.isEnabled = false; bao.text = "Đang gửi…"
                Thread {
                    val loi = HocVien.traLoi(this, id, "Con cảm ơn Ba Mẹ!")
                    runOnUiThread { if (loi == null) { bao.text = "Đã gửi Ba Mẹ."; veViec(Kho(this)) } else { bao.text = loi; b.isEnabled = true } }
                }.start()
            })
            dsNhan?.addView(bao)
        }
        saoDaVe = -2   // sao có thể đổi theo tổng quan mới
    }

    private fun chinhSach(k: Kho) = try { (if (k.cheDoThu) k.tepThu.readText() else k.phanHoi)?.let { docPhanHoiNhip(it).chinhSach } } catch (_: Exception) { null }

    /** Trạng thái lời xin (yeu-cau/:id, DichVuNhip hỏi mỗi nhịp). */
    private fun capNhatXin(k: Kho) { tXin?.text = HocVien.cauLoiXin(k) ?: "" }

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
            if (co) t.addView(G.chu(this, "✓  $ten", 16f, Diu.XANH_DAM).apply { minHeight = G.dp(this@ManChinh, 48); gravity = Gravity.CENTER_VERTICAL })
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
