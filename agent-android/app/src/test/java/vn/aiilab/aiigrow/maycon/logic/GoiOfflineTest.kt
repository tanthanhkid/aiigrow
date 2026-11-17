package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #337 (luật theo bé khi máy chung mất mạng) + #339 (dsCon ⇒ tải lại hồ sơ / đẩy bé bị bỏ gán). */
class GoiOfflineTest {
    private fun goi(con: String, khoaNgay: Boolean, sao: Int) = """{ "serverTime": "2026-11-17T03:00:00.000Z",
        "chinhSach": { "tz": "Asia/Ho_Chi_Minh", "con": { "id": "$con", "ten": "Bé $con", "nhom": "lon" }, "khoaNgay": $khoaNgay,
          "sao": { "sao": $sao, "no": 0, "phutCon": $sao },
          "ungDung": { "giaiTri": [ { "muc": "com.roblox.client", "kieu": "app" } ] } }, "nenTang": {} }"""

    private val hoSo = """{ "con": [
        { "id": "A", "ten": "Bé A", "coPin": true, "sao": 0, "offline": ${goi("A", true, 0)} },
        { "id": "B", "ten": "Bé B", "coPin": true, "sao": 30, "offline": ${goi("B", false, 30)} } ],
      "mayRieng": false, "mayChung": true, "offlineLuc": "2026-11-17T03:00:00.000Z" }"""

    @Test fun chinhSach_docIdBe() {
        assertEquals("B", docPhanHoiNhip(goi("B", false, 30)).chinhSach.conId)
        assertNull(docChinhSach(JSONObject("""{ "con": null }""")).conId)
    }

    @Test fun tachGoi_luuTheoBe_vaGonHoSo() {
        val o = JSONObject(hoSo)
        val g = tachGoiOffline(o, emptyMap())
        assertEquals(setOf("A", "B"), g.keys)
        assertEquals("B", docPhanHoiNhip(g["B"]!!).chinhSach.conId)
        // hồ sơ nhớ không còn gói (đọc mỗi vòng), vẫn đủ bé
        assertFalse(o.getJSONArray("con").getJSONObject(0).has("offline")); assertFalse(o.has("offlineLuc"))
        assertEquals(listOf("A", "B"), docHoSo(o, 0).con.map { it.id })
        // bền qua Kho
        assertEquals(g, docGoiOffline(goiOfflineJson(g)))
    }

    @Test fun tachGoi_mayChuCoGoiMaBeThieu_boGoiCu_mayChuCu_giuGoiCu() {
        val cu = mapOf("A" to goi("A", false, 5), "B" to goi("B", false, 9), "C" to goi("C", false, 1))
        // máy chủ mới: B lỗi (không có gói) ⇒ bỏ gói cũ của B (khoá khi mất mạng); C không còn gán ⇒ bỏ
        val moi = JSONObject("""{ "con": [ { "id": "A", "offline": ${goi("A", true, 0)} }, { "id": "B" } ], "offlineLuc": "x" }""")
        assertEquals(setOf("A"), tachGoiOffline(moi, cu).keys)
        // máy chủ cũ (không offlineLuc) ⇒ giữ gói cũ của bé còn gán
        val cuMayChu = JSONObject("""{ "con": [ { "id": "A" }, { "id": "B" } ] }""")
        assertEquals(setOf("A", "B"), tachGoiOffline(cuMayChu, cu).keys)
    }

    @Test fun chonLuat_beSauDungGoiCuaDungBe() {
        val g = tachGoiOffline(JSONObject(hoSo), emptyMap())
        // nhịp cuối của A (A bị Ba Mẹ khoá, 0 sao); mất mạng, B vào ⇒ luật + sao của B, không phải của A
        val l = chonLuatBe("B", true, "A", g["B"])
        assertTrue(l is LuatBe.TuGoi)
        val cs = (l as LuatBe.TuGoi).ph.chinhSach
        assertEquals("B", cs.conId); assertFalse(cs.khoaNgay); assertEquals(30, cs.sao!!.phutCon)
        // nhịp cuối là của chính bé đang dùng ⇒ như trước
        assertEquals(LuatBe.NhipCuoi, chonLuatBe("A", true, "A", g["A"]))
        // nhịp cuối lúc chưa ai vào (con null) ⇒ cũng phải dùng gói của bé
        assertTrue(chonLuatBe("B", true, null, g["B"]) is LuatBe.TuGoi)
    }

    @Test fun chonLuat_khongCoGoi_khoaChoMang() {
        assertEquals(LuatBe.ChoMang, chonLuatBe("B", true, "A", null))
        assertEquals(LuatBe.ChoMang, chonLuatBe("B", true, "A", "hỏng"))
        // gói ghi id bé khác ⇒ không mượn
        assertEquals(LuatBe.ChoMang, chonLuatBe("B", true, "A", goi("A", false, 99)))
    }

    @Test fun chonLuat_mayRieng_hoacKhongAiDung_khongDoi() {
        assertEquals(LuatBe.NhipCuoi, chonLuatBe("B", false, "A", null))
        assertEquals(LuatBe.NhipCuoi, chonLuatBe(null, true, "A", null))
    }

    @Test fun dsCon_lech_taiLai_beBiBo_dayRa() {
        val nhip = JSONObject("""{ "dsCon": ["A", "C"] }""")
        val ds = docDsCon(nhip)
        assertEquals(listOf("A", "C"), ds)
        // thêm C, bỏ B (B đang dùng) ⇒ tải lại hồ sơ + đẩy B ra màn chọn tên
        assertEquals(XetDsCon(taiLai = true, dayRa = true), xetDsCon(ds, listOf("A", "B"), "B"))
        // A đang dùng vẫn còn gán ⇒ chỉ tải lại
        assertEquals(XetDsCon(taiLai = true, dayRa = false), xetDsCon(ds, listOf("A", "B"), "A"))
        // khớp (khác thứ tự) ⇒ không làm gì
        assertEquals(XetDsCon(taiLai = false, dayRa = false), xetDsCon(listOf("B", "A"), listOf("A", "B"), "A"))
        // máy chủ cũ không gửi dsCon ⇒ không làm gì
        assertNull(docDsCon(JSONObject("{}")))
        assertEquals(XetDsCon(false, false), xetDsCon(null, listOf("A"), "Z"))
        // danh sách rỗng (máy riêng đời cũ) ⇒ không đẩy ai ra
        assertFalse(xetDsCon(emptyList(), emptyList(), "A").dayRa)
        // chưa có hồ sơ ⇒ tải lại
        assertTrue(xetDsCon(listOf("A"), null, null).taiLai)
    }

    @Test fun catGoi_beRoi_luuSaoMoiNhat_quayLaiDungGoi() {
        val luc = java.time.Instant.parse("2026-11-17T05:00:00Z")
        // nhịp của B lúc 03:00 có 30 sao; B chơi 12 phút rồi «Đổi người»
        val nhipB = JSONObject(goi("B", false, 30)).put("lenh", org.json.JSONArray()).put("maOfflineBiMat", "bi-mat")
        val g = catGoiBe(nhipB, 12, luc)
        val o = JSONObject(g)
        assertFalse(o.has("maOfflineBiMat")); assertTrue(o.optBoolean(GOI_TU_MAY))
        val ph = docPhanHoiNhip(g)
        assertEquals("B", ph.chinhSach.conId); assertEquals(18, ph.chinhSach.sao!!.phutCon); assertEquals(18, ph.chinhSach.sao!!.sao)
        assertEquals(luc, ph.serverTime)
        // tiêu quá số sao ⇒ 0, hết sao
        assertTrue(docPhanHoiNhip(catGoiBe(nhipB, 40, luc)).chinhSach.sao!!.hetSao)
        // B quay lại lúc mất mạng: nhịp cuối vẫn là của B (03:00) nhưng gói cắt tại máy (05:00) mới hơn ⇒ dùng gói
        val nhipLuc = java.time.Instant.parse("2026-11-17T03:00:00Z")
        val l = chonLuatBe("B", true, "B", g, nhipLuc)
        assertTrue(l is LuatBe.TuGoi); assertEquals(18, (l as LuatBe.TuGoi).ph.chinhSach.sao!!.phutCon)
        // có nhịp mới hơn gói (có mạng lại) ⇒ nhịp
        assertEquals(LuatBe.NhipCuoi, chonLuatBe("B", true, "B", g, java.time.Instant.parse("2026-11-17T05:01:00Z")))
        // gói máy chủ gửi (không cắt tại máy) không thay nhịp của chính bé
        assertEquals(LuatBe.NhipCuoi, chonLuatBe("B", true, "B", goi("B", false, 30), nhipLuc))
    }

    @Test fun phutTieu_giongQuyetDinh() {
        assertEquals(7, phutTieuTuMoc(20, 13, "2026-11-17", "2026-11-17", 0, false))
        assertEquals(20, phutTieuTuMoc(20, 13, "2026-11-16", "2026-11-17", 0, false))   // sang ngày ⇒ cả phút hôm nay
        assertEquals(5, phutTieuTuMoc(20, 13, null, "2026-11-17", 2, false))             // trừ phút mở bằng mã
        assertEquals(0, phutTieuTuMoc(20, 0, null, "2026-11-17", 0, true))               // Mở hết không tính
    }
}
