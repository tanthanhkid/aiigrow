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
    /** ms app «Tính phút» dùng lúc mở bằng mã offline, chưa báo máy chủ. */
    val boiMaMs: Long = 0,
) {
    /**
     * Chốt tới hiện tại: `caMay` = ms cả máy theo app hôm nay (DoPhut.homNay), `conId` = bé đang dùng (null = không ai: Ba Mẹ dùng / chọn tên),
     * `tinhPhut` = gói «Tính phút», `boiMa` = máy đang mở bằng mã offline. Sang ngày ⇒ sổ mới (phút hôm qua đã gửi theo từng nhịp).
     */
    fun chotToi(ngayNay: String, caMay: Map<String, Long>, conId: String?, tinhPhut: Set<String>, boiMa: Boolean): SoPhutBe {
        if (ngayNay != ngay) return SoPhutBe(ngayNay, caMay, emptyMap(), boiMaMs)
        var dsBe = be
        var bm = boiMaMs
        if (conId != null) {
            val cua = (be[conId] ?: emptyMap()).toMutableMap()
            for ((app, ms) in caMay) {
                val them = ms - (chot[app] ?: 0L)
                if (them <= 0) continue
                cua[app] = (cua[app] ?: 0L) + them
                if (boiMa && tinhPhut.any { it.equals(app, ignoreCase = true) }) bm += them
            }
            dsBe = be + (conId to cua)
        }
        return copy(chot = caMay, be = dsBe, boiMaMs = bm)
    }

    /** Thân `dong-bo`: mỗi (bé, app) một dòng, phút = TỔNG CỦA BÉ hôm nay (≤ 300 dòng). `coCon` = gửi `con` (máy có PIN theo bé). */
    fun thanDongBo(clientTime: String, coCon: Boolean): JSONObject {
        val ds = JSONArray()
        for ((con, apps) in be) for ((app, ms) in apps) {
            val phut = (ms / 60_000).toInt()
            if (phut <= 0 || ds.length() >= 300) continue
            ds.put(JSONObject().put("muc", app).put("phut", phut).put("day", ngay).apply { if (coCon && con != BE_MAY) put("con", con) })
        }
        return JSONObject().put("clientTime", clientTime).put("usage", ds).apply { phutBoiMa().takeIf { it > 0 }?.let { put("phutBoiMa", it) } }
    }

    fun phutBoiMa(): Int = (boiMaMs / 60_000).toInt()

    /** Máy chủ đã nhận `daGui` phút bởi mã ⇒ trừ khỏi phần chờ (phần lẻ giữ lại). */
    fun daGuiBoiMa(daGui: Int): SoPhutBe = copy(boiMaMs = (boiMaMs - daGui * 60_000L).coerceAtLeast(0))

    fun json(): String = JSONObject().put("ngay", ngay).put("boiMaMs", boiMaMs)
        .put("chot", JSONObject().apply { chot.forEach { (k, v) -> put(k, v) } })
        .put("be", JSONObject().apply { be.forEach { (c, m) -> put(c, JSONObject().apply { m.forEach { (k, v) -> put(k, v) } }) } })
        .toString()

    companion object {
        private fun JSONObject.soDai(): Map<String, Long> = keys().asSequence().associateWith { optLong(it) }
        fun doc(s: String?): SoPhutBe = try {
            if (s.isNullOrBlank()) SoPhutBe() else JSONObject(s).let { o ->
                val b = o.optJSONObject("be") ?: JSONObject()
                SoPhutBe(o.optString("ngay"), (o.optJSONObject("chot") ?: JSONObject()).soDai(),
                    b.keys().asSequence().associateWith { (b.optJSONObject(it) ?: JSONObject()).soDai() }, o.optLong("boiMaMs"))
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
