package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONArray
import org.json.JSONObject

// 15/11 (#264 / #267 — docs/API.md «Sổ sao 15/11»): sổ phút THEO BÉ trên máy Android, để gửi `POST /api/device/dong-bo {usage[], phutBoiMa}`
// (đường duy nhất máy chủ trừ sao 1 sao = 1 phút từ phút agent báo — nhịp Android chỉ lưu `phutDungHomNay` cho Ba Mẹ xem).
// UsageStats chỉ đếm phút CẢ MÁY theo app ⇒ mỗi vòng lấy phần tăng so với lần chốt trước rồi ghi cho bé đang dùng (cổng CON / máy riêng);
// lúc Ba Mẹ dùng, máy khoá chọn tên ⇒ không ghi cho ai. Máy chung: mỗi dòng `usage` mang `con` + phút là TỔNG CỦA BÉ hôm nay (theo app);
// «Đổi bé» ⇒ chốt rồi gửi ngay để phút bé trước dừng tính. Phút dùng lúc máy mở bằng mã offline (app «Tính phút») ⇒ `phutBoiMa` (không trừ sao).

/** Khoá bé khi không biết id (máy riêng / máy chủ chưa có PIN theo bé) — dòng `usage` gửi không `con`, máy chủ hiểu là Con của máy. */
const val BE_MAY = ""

data class SoPhutBe(
    val ngay: String = "",
    /** ms tiền cảnh cả máy theo app lúc chốt gần nhất (cùng ngày). */
    val chot: Map<String, Long> = emptyMap(),
    /** bé → app → ms đã ghi cho bé hôm nay. */
    val be: Map<String, Map<String, Long>> = emptyMap(),
    /** bé → ms app «Tính phút» dùng lúc mở bằng mã offline, chưa báo máy chủ (chỉ HÔM NAY — máy chủ chỉ trừ sao phút hôm nay). */
    val boiMa: Map<String, Long> = emptyMap(),
    /** Ngày trước + sổ của ngày đó chưa gửi được (sang ngày lúc mất mạng) — gửi bù (`usage[].day`, chỉ ghi báo cáo) rồi xoá. */
    val ngayCu: String? = null,
    val beCu: Map<String, Map<String, Long>> = emptyMap(),
) {
    /**
     * Chốt tới hiện tại: `caMay` = ms cả máy theo app hôm nay (DoPhut.homNay), `conId` = bé đang dùng (null = không ai: Ba Mẹ dùng / chọn tên),
     * `tinhPhut` = gói «Tính phút», `boiMa` = máy đang mở bằng mã offline. Sang ngày ⇒ sổ hôm qua chuyển sang `beCu` (gửi bù), phút bởi mã
     * hôm qua bỏ (không cho mang sang hôm nay).
     */
    fun chotToi(ngayNay: String, caMay: Map<String, Long>, conId: String?, tinhPhut: Set<String>, boiMa: Boolean): SoPhutBe {
        if (ngayNay != ngay) return SoPhutBe(ngayNay, caMay, emptyMap(), emptyMap(),
            if (ngay.isNotEmpty() && be.isNotEmpty()) ngay else ngayCu, if (ngay.isNotEmpty() && be.isNotEmpty()) be else beCu)
        if (conId == null) return copy(chot = caMay)
        val cua = (be[conId] ?: emptyMap()).toMutableMap()
        var bm = this.boiMa[conId] ?: 0L
        for ((app, ms) in caMay) {
            val them = ms - (chot[app] ?: 0L)
            if (them <= 0) continue
            cua[app] = (cua[app] ?: 0L) + them
            if (boiMa && tinhPhut.any { it.equals(app, ignoreCase = true) }) bm += them
        }
        return copy(chot = caMay, be = be + (conId to cua), boiMa = if (bm > 0) this.boiMa + (conId to bm) else this.boiMa)
    }

    /** Phút bởi mã chưa báo của bé `conId` (đếm lùi tại chỗ không trừ phần này — máy chủ không trừ sao). */
    fun phutBoiMa(conId: String?): Int = ((boiMa[conId ?: BE_MAY] ?: 0L) / 60_000).toInt()

    /**
     * Thân `dong-bo`: mỗi (bé, app) một dòng, phút = TỔNG CỦA BÉ trong ngày (≤ 300 dòng, hôm nay trước, ngày cũ gửi bù sau).
     * `coCon` = gửi `con` (máy có PIN theo bé). `conHienTai` = bé máy chủ đang coi là người dùng máy — `phutBoiMa` máy chủ chỉ áp cho bé đó.
     */
    fun thanDongBo(clientTime: String, coCon: Boolean, conHienTai: String?): JSONObject {
        val ds = JSONArray()
        fun them(day: String, sobe: Map<String, Map<String, Long>>) {
            for ((con, apps) in sobe) for ((app, ms) in apps) {
                val phut = (ms / 60_000).toInt()
                if (phut <= 0 || ds.length() >= 300) continue
                ds.put(JSONObject().put("muc", app).put("phut", phut).put("day", day).apply { if (coCon && con != BE_MAY) put("con", con) })
            }
        }
        them(ngay, be)
        ngayCu?.let { them(it, beCu) }
        return JSONObject().put("clientTime", clientTime).put("usage", ds)
            .apply { phutBoiMa(conHienTai).takeIf { it > 0 }?.let { put("phutBoiMa", it) } }
    }

    /** Máy chủ đã nhận lượt gửi: trừ `daGui` phút bởi mã của bé `conId` (phần lẻ giữ lại, chỉ khi còn cùng ngày) và xoá sổ ngày cũ đã gửi. */
    fun daGui(ngayGui: String, conId: String?, daGui: Int, ngayCuGui: String?): SoPhutBe {
        val k = conId ?: BE_MAY
        val bm = if (ngayGui == ngay && daGui > 0) boiMa + (k to ((boiMa[k] ?: 0L) - daGui * 60_000L).coerceAtLeast(0)) else boiMa
        return if (ngayCuGui != null && ngayCuGui == ngayCu) copy(boiMa = bm, ngayCu = null, beCu = emptyMap()) else copy(boiMa = bm)
    }

    fun json(): String {
        fun m(x: Map<String, Long>) = JSONObject().apply { x.forEach { (k, v) -> put(k, v) } }
        fun mm(x: Map<String, Map<String, Long>>) = JSONObject().apply { x.forEach { (c, v) -> put(c, m(v)) } }
        return JSONObject().put("ngay", ngay).put("chot", m(chot)).put("be", mm(be)).put("boiMa", m(boiMa))
            .apply { ngayCu?.let { put("ngayCu", it); put("beCu", mm(beCu)) } }.toString()
    }

    companion object {
        private fun JSONObject?.soDai(): Map<String, Long> = this?.keys()?.asSequence()?.associateWith { optLong(it) } ?: emptyMap()
        private fun JSONObject?.soBe(): Map<String, Map<String, Long>> = this?.keys()?.asSequence()?.associateWith { optJSONObject(it).soDai() } ?: emptyMap()
        fun doc(s: String?): SoPhutBe = try {
            if (s.isNullOrBlank()) SoPhutBe() else JSONObject(s).let { o ->
                SoPhutBe(o.optString("ngay"), o.optJSONObject("chot").soDai(), o.optJSONObject("be").soBe(), o.optJSONObject("boiMa").soDai(),
                    o.optString("ngayCu").ifBlank { null }, o.optJSONObject("beCu").soBe())
            }
        } catch (_: Exception) { SoPhutBe() }
    }
}

/** Bé được ghi phút theo cổng: CON ⇒ bé đang dùng (máy riêng chưa rõ id ⇒ BE_MAY); MO (máy chủ cũ) ⇒ BE_MAY; Ba Mẹ dùng / chọn tên ⇒ null. */
fun beGhiPhut(cong: Cong, conId: String?): String? = when (cong) {
    Cong.CON -> conId ?: BE_MAY
    Cong.MO -> BE_MAY
    Cong.BA_ME, Cong.CHON_TEN -> null
}

/** Thân «Xin Ba Mẹ cho vay sao» (`POST /api/device/hoc-vien/xin-vay`): 10 / 15 / 30 sao, lời nhắn không bắt buộc. */
fun thanXinVay(soSao: Int, loiNhan: String = "", mucDich: String = "choi"): JSONObject {
    val o = JSONObject().put("soSao", soSao.coerceIn(1, 1000)).put("mucDich", mucDich)
    loiNhan.trim().take(100).takeIf { it.isNotEmpty() }?.let { o.put("loiNhan", it) }
    return o
}
