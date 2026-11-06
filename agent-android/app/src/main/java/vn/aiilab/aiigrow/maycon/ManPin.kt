package vn.aiilab.aiigrow.maycon

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.ViewGroup
import android.widget.LinearLayout
import vn.aiilab.aiigrow.maycon.logic.BeHoSo
import vn.aiilab.aiigrow.maycon.logic.DemPin
import vn.aiilab.aiigrow.maycon.logic.KetQuaPin
import vn.aiilab.aiigrow.maycon.logic.demGiay

/**
 * Cổng PIN theo bé trên màn khoá (L13) — khớp `docs/thiet-ke-chot/con-dt-khac/05..11`:
 * 05 «Máy đang khoá · Ai đang dùng máy? Chạm vào tên của con nhé.» → 06/07 «Nhập PIN 4 số» (bàn phím to, 4 chấm) → 08 «Chưa đúng · còn N lần thử»
 * → 09 «Sai 5 lần rồi · 0:15 giây» → 10 «Quên PIN rồi à?» (Báo Ba Mẹ giúp con) · 11 «Ba Mẹ nhập mã» (Mở máy cho Ba Mẹ).
 * Bé chưa có PIN ⇒ chạm tên vào thẳng. Máy riêng một bé ⇒ vào thẳng màn PIN. Dùng được trong activity và lớp phủ trợ năng (bàn phím tự vẽ).
 */
class ManPin(val c: Context) {
    private enum class Buoc { CHON_TEN, PIN, CHO, QUEN, BA_ME }

    private val h = Handler(Looper.getMainLooper())
    val goc = LinearLayout(c).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL }
    private var buoc = Buoc.CHON_TEN
    private var be: BeHoSo? = null
    private var go = ""
    private var dangGui = false
    private var loi: String? = null
    private var choDen = 0L
    private var veLanCuoi: String? = null
    private var lanNap = 0L

    /** Rời cổng (máy đã mở) ⇒ về đầu cho lần khoá sau. */
    fun dung() { if (buoc != Buoc.CHON_TEN || be != null) { buoc = Buoc.CHON_TEN; be = null; go = ""; loi = null; veLanCuoi = null } }

    private fun dp(v: Int) = Diu.dp(c, v)
    private fun chu(s: String, co: Float = 16f, mau: Int = Diu.CHU, dac: Boolean = false, giua: Boolean = true) =
        Diu.chu(c, s, co, mau, dac).apply { if (giua) gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(6) } }

    /** Vẽ lại (màn khoá gọi mỗi giây): chỉ dựng lại khi bước / dữ liệu đổi; đếm ngược chờ tự chạy. */
    fun ve() {
        val k = Kho(c)
        val hs = PinMay.hoSo(k)
        val now = System.currentTimeMillis()
        // chưa có hồ sơ (máy vừa lên bản có PIN / vừa ghép) ⇒ lấy ngay (≤ mỗi 15 giây)
        if (hs == null && !k.cheDoThu && now - lanNap > 15_000) { lanNap = now; Thread { if (PinMay.napHoSo(k)) h.post { veLanCuoi = null; ve() } }.start() }
        // máy riêng một bé ⇒ thẳng màn PIN
        if (buoc == Buoc.CHON_TEN && hs != null && hs.mayRieng && hs.con.size == 1 && hs.con[0].coPin) { be = hs.con[0]; buoc = Buoc.PIN }
        if (buoc == Buoc.CHO && choDen <= now) { buoc = Buoc.PIN; loi = null; go = "" }
        // màn chọn tên có bé đang phải chờ ⇒ khoá vẽ gồm số giây để nhãn «chờ Ns» đếm lùi
        val dem = DemPin.doc(k.demPin)
        val coCho = buoc == Buoc.CHON_TEN && hs?.con?.any { b -> choGiay(b, dem, now) > 0 } == true
        val khoa = "$buoc|${be?.id}|$go|$loi|${k.hoSo?.hashCode()}|${k.demPin?.hashCode()}|$dangGui|" +
            "${if (buoc == Buoc.CHO) (choDen - now) / 1000 else 0}|${if (coCho) now / 1000 else 0}"
        if (khoa == veLanCuoi) return
        veLanCuoi = khoa
        goc.removeAllViews()
        when (buoc) {
            Buoc.CHON_TEN -> veChonTen(hs?.con, hs?.mayRieng == true)
            Buoc.PIN -> vePin(hs?.be(be?.id) ?: be!!, hs?.con?.size ?: 1)
            Buoc.CHO -> veCho(now)
            Buoc.QUEN -> veQuen()
            Buoc.BA_ME -> veBaMe()
        }
    }

    /** Giây bé còn phải chờ: bộ đếm tại máy hoặc hạn máy chủ báo trong hồ sơ (tính theo lúc nhận hồ sơ). */
    private fun choGiay(b: BeHoSo, dem: DemPin, now: Long) =
        maxOf(dem.choGiay(b.id, now), ((b.khoaDen ?: 0) - now).let { if (it > 0) ((it + 999) / 1000).toInt() else 0 })

    private fun thuTu(id: String?) = PinMay.hoSo(Kho(c))?.con?.indexOfFirst { it.id == id }?.coerceAtLeast(0) ?: 0

    private fun nutLui(f: () -> Unit) = Diu.nut(c, "‹  Quay lại", Diu.KieuNut.CHU) { f() }.apply {
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.START }
        contentDescription = "Quay lại"
    }

    // ---- 05 chọn tên
    private fun veChonTen(ds: List<BeHoSo>?, mayRieng: Boolean) {
        goc.addView(chu("Máy đang khoá", 26f, dac = true).apply { setPadding(0, dp(20), 0, 0) })
        goc.addView(chu("Ai đang dùng máy? Chạm vào tên của con nhé.", 16f, Diu.CHU2))
        if (ds == null) {
            goc.addView(chu(if (Kho(c).cheDoThu) "Chế độ thử: chưa có hồ sơ." else "Đang lấy danh sách… (máy cần nối mạng một lần)", 15f, Diu.CHU3).apply { setPadding(0, dp(24), 0, 0) })
        }
        val now = System.currentTimeMillis()
        ds?.forEachIndexed { i, b ->
            goc.addView(Diu.the(c).apply {
                orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
                addView(Diu.vongTen(c, b.chuDau, i, 56))
                addView(Diu.chu(c, b.ten, 22f, Diu.CHU, true).apply {
                    layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(14) } })
                val cho = choGiay(b, DemPin.doc(Kho(c).demPin), now)
                if (cho > 0) addView(Diu.chu(c, "chờ ${cho}s", 14f, Diu.CHU3))
                isClickable = true; isFocusable = true; minimumHeight = dp(80); contentDescription = "Con là ${b.ten}"
                setOnClickListener { chonBe(b) }
            })
        }
        goc.addView(chu(if (mayRieng) "Nhập PIN để vào máy." else "Chưa ai vào thì máy chỉ mở màn này.", 14f, Diu.CHU3).apply { setPadding(0, dp(14), 0, 0) })
        goc.addView(Diu.nut(c, "Ba Mẹ dùng máy", Diu.KieuNut.PHU) { buoc = Buoc.BA_ME; go = ""; loi = null; ve() })
    }

    private fun chonBe(b: BeHoSo) {
        be = b; go = ""; loi = null
        val now = System.currentTimeMillis()
        val cho = choGiay(b, DemPin.doc(Kho(c).demPin), now)
        if (cho > 0) { choDen = now + cho * 1000L; buoc = Buoc.CHO; ve(); return }
        if (!b.coPin) { buoc = Buoc.PIN; vao(b, null); return }   // chưa có PIN ⇒ vào thẳng
        buoc = Buoc.PIN; ve()
    }

    // ---- 06/07/08 nhập PIN
    private fun vePin(b: BeHoSo, soBe: Int) {
        if (soBe > 1) goc.addView(nutLui { buoc = Buoc.CHON_TEN; be = null; ve() })
        goc.addView(Diu.vongTen(c, b.chuDau, thuTu(b.id), 96).apply { (layoutParams as LinearLayout.LayoutParams).apply { gravity = Gravity.CENTER_HORIZONTAL; topMargin = dp(8) } })
        goc.addView(chu(b.ten, 22f, dac = true))
        val sai = loi != null
        goc.addView(chu(loi ?: if (dangGui) "Đang kiểm…" else if (b.coPin) "Nhập PIN 4 số" else "Đang vào…", 16f,
            if (sai) Diu.LOI_DAM else Diu.CHU2, dac = sai).apply {
            if (sai) { background = Diu.khoi(c, Diu.LOI_NHAT, 16, null); setPadding(dp(12), dp(6), dp(12), dp(6))
                (layoutParams as LinearLayout.LayoutParams).apply { width = ViewGroup.LayoutParams.WRAP_CONTENT; gravity = Gravity.CENTER_HORIZONTAL } }
        })
        if (!b.coPin) return
        goc.addView(Diu.ChamPin(c).apply { ve(go.length, sai && go.isEmpty()) }.goc)
        goc.addView(Diu.banPhim(c, { s ->
            if (dangGui || go.length >= 4) return@banPhim
            go += s; loi = null; ve()
            if (go.length == 4) vao(b, go)
        }, { if (go.isNotEmpty() && !dangGui) { go = go.dropLast(1); ve() } }))
        goc.addView(Diu.nut(c, "Quên PIN?", Diu.KieuNut.CHU) { buoc = Buoc.QUEN; loi = null; ve() }.apply { setTextColor(Diu.XANH_DAM) })
    }

    private fun vao(b: BeHoSo, pin: String?) {
        dangGui = true; ve()
        Thread {
            val kq = PinMay.dangNhap(c, b, pin)
            h.post {
                dangGui = false; go = ""
                when (kq) {
                    PinMay.KetQuaVao.Vao -> { loi = null; buoc = Buoc.CHON_TEN; be = null }   // màn khoá tự đóng ở vòng vẽ kế (cổng ⇒ CON)
                    is PinMay.KetQuaVao.Loi -> {
                        val t = kq.kq
                        if (t is KetQuaPin.TamKhoa) { choDen = System.currentTimeMillis() + t.choGiay * 1000L; buoc = Buoc.CHO; loi = null }
                        else loi = kq.cau
                    }
                }
                veLanCuoi = null; ve()
            }
        }.start()
    }

    // ---- 09 sai 5 lần
    private fun veCho(now: Long) {
        val b = be ?: return
        goc.addView(Diu.vongTen(c, b.chuDau, thuTu(b.id), 96).apply { (layoutParams as LinearLayout.LayoutParams).apply { gravity = Gravity.CENTER_HORIZONTAL; topMargin = dp(28) } })
        goc.addView(chu(b.ten, 22f, dac = true))
        goc.addView(chu("Sai ${PinMay.hoSo(Kho(c))?.pinSaiToiDa ?: 5} lần rồi", 24f, dac = true).apply { setPadding(0, dp(16), 0, 0) })
        goc.addView(chu("Hít thở chậm nào. Chờ một chút rồi thử lại nhé.", 16f, Diu.CHU2))
        val giay = ((choDen - now + 999) / 1000).toInt()
        goc.addView(chu("${demGiay(giay)} giây", 40f, Diu.XANH_DAM, dac = true).apply { setPadding(0, dp(18), 0, dp(10)); fontFeatureSettings = "tnum" })
        goc.addView(Diu.nut(c, "Quên PIN? Nhờ Ba Mẹ", Diu.KieuNut.CHU) { buoc = Buoc.QUEN; ve() }.apply { setTextColor(Diu.XANH_DAM) })
    }

    // ---- 10 quên PIN
    private var baoQuen: String? = null
    private fun veQuen() {
        val b = be ?: return
        goc.addView(nutLui { buoc = Buoc.PIN; baoQuen = null; ve() })
        goc.addView(chu("Quên PIN rồi à?", 26f, dac = true))
        goc.addView(chu("Không sao! Nhờ Ba Mẹ đặt PIN mới nhé.", 16f, Diu.CHU2))
        val the = Diu.the(c)
        listOf("Ba Mẹ mở AiiGrow", "Vào hồ sơ ${b.ten}", "Bấm «PIN · Đặt lại»").forEachIndexed { i, s ->
            the.addView(LinearLayout(c).apply {
                orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; minimumHeight = dp(48)
                addView(Diu.chu(c, "${i + 1}", 16f, Diu.XANH_DAM, true).apply { gravity = Gravity.CENTER; background = Diu.tron(Diu.XANH_NHAT)
                    layoutParams = LinearLayout.LayoutParams(dp(32), dp(32)) })
                addView(Diu.chu(c, s, 17f, Diu.CHU).apply { layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(12) } })
            })
        }
        goc.addView(the)
        baoQuen?.let { goc.addView(chu(it, 15f, Diu.XANH_DAM, dac = true)) }
        goc.addView(Diu.nut(c, "Báo Ba Mẹ giúp con") { v ->
            v.isEnabled = false; baoQuen = "Đang báo Ba Mẹ…"; veLanCuoi = null; ve()
            Thread { val s = PinMay.quenPin(c, b.id); h.post { baoQuen = s; veLanCuoi = null; ve() } }.start()
        })
        goc.addView(Diu.nut(c, "Có PIN mới · nhập lại", Diu.KieuNut.PHU) {
            buoc = Buoc.PIN; go = ""; loi = null; baoQuen = null
            Thread { PinMay.napHoSo(Kho(c)); h.post { veLanCuoi = null; ve() } }.start()   // PIN mới ⇒ vân mới cho lúc mất mạng
            ve()
        })
        goc.addView(Diu.nut(c, "Chọn bé khác", Diu.KieuNut.CHU) { buoc = Buoc.CHON_TEN; be = null; baoQuen = null; ve() })
    }

    // ---- 11 Ba Mẹ nhập mã
    private fun veBaMe() {
        goc.addView(nutLui { buoc = if (be != null && PinMay.hoSo(Kho(c))?.mayRieng == true) Buoc.PIN else Buoc.CHON_TEN; go = ""; loi = null; ve() })
        goc.addView(chu("Ba Mẹ nhập mã", 26f, dac = true))
        goc.addView(chu("Dùng khi cần mở máy gấp", 16f, Diu.CHU2))
        goc.addView(chu("Mở app AiiGrow của Ba Mẹ → Mã mở máy", 15f, Diu.XANH_DAM, dac = true).apply {
            background = Diu.khoi(c, Diu.XANH_NHAT, 16, null); setPadding(dp(12), dp(8), dp(12), dp(8)) })
        val o = Diu.OMa(c); o.ve(go, loi != null && go.isEmpty()); goc.addView(o.goc)
        goc.addView(chu(loi ?: "Mã 6 số · đổi sau vài phút", 14f, if (loi != null) Diu.LOI_DAM else Diu.CHU3, dac = loi != null))
        goc.addView(Diu.banPhim(c, { s -> if (!dangGui && go.length < 6) { go += s; loi = null; ve() } }, { if (go.isNotEmpty() && !dangGui) { go = go.dropLast(1); ve() } }))
        goc.addView(Diu.nut(c, if (dangGui) "Đang kiểm mã…" else "Mở máy cho Ba Mẹ") {
            if (go.length != 6 || dangGui) { loi = "Mã gồm đúng 6 chữ số."; ve(); return@nut }
            val ma = go; dangGui = true; ve()
            Thread {
                val l = PinMay.baMeMo(c, ma)
                h.post { dangGui = false; go = ""; loi = l; if (l == null) { buoc = Buoc.CHON_TEN; be = null }; veLanCuoi = null; ve() }
            }.start()
        }.apply { (layoutParams as LinearLayout.LayoutParams).bottomMargin = dp(8) })
    }
}
