package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PinBeTest {
    private val bm = "abcDEF_123-xyz"
    private val t = 1_762_400_000_000L

    // Vector tính bằng node: createHmac("sha256", biMat).update("<id>:<pin>").digest("hex") — y hệt server/lib/pin-be.ts › vanPin
    @Test fun vanPin_cungMayChu() {
        assertEquals("605b3158120f867cdd2091ad55f1f2c74090a6a31eb98c86758a9d75a453b1fa", vanPin(bm, "c1", "4821"))
        assertEquals("16f232750ed42468a872cf15b339911b25530c479053ddc713dbadd756c7baa5", vanPin("Bí mật", "con-2", "0000"))
        assertEquals("4821", chuanPin(" 48-21")); assertNull(chuanPin("482")); assertNull(chuanPin("48210"))
    }

    private val hoSoJson = """{ "con": [ { "id": "c1", "ten": "Bảo Anh", "avatar": "rob", "coPin": true, "vanPin": "605b3158120f867cdd2091ad55f1f2c74090a6a31eb98c86758a9d75a453b1fa" },
           { "id": "c2", "ten": "Bảo Minh", "avatar": "rob", "coPin": false, "choGiay": 11 } ],
  "mayRieng": false, "dangDung": { "id": "c1", "ten": "Bảo Anh", "avatar": "rob", "tu": "2026-11-06T12:30:00.000Z" },
  "baMeDung": null, "pinSaiToiDa": 5, "pinChoGiay": 15 }"""

    @Test fun docHoSo_viDuApi() {
        val hs = docHoSo(JSONObject(hoSoJson), t)
        assertEquals(listOf("c1", "c2"), hs.con.map { it.id })
        assertEquals("c1", hs.dangDung); assertNull(hs.baMeDen)
        assertEquals(t + 11_000, hs.be("c2")!!.khoaDen)
        assertEquals("B", hs.be("c1")!!.chuDau)
        assertEquals(5, hs.pinSaiToiDa); assertEquals(15, hs.pinChoGiay)
    }

    @Test fun pinOffline_dung_sai_namLanCho15Giay() {
        val hs = docHoSo(JSONObject(hoSoJson), t)
        val anh = hs.be("c1")!!
        assertEquals(KetQuaPin.Dung, thuPinOffline(DemPin(), bm, anh, "4821", t).first)
        assertEquals("bé chưa có PIN ⇒ vào thẳng", KetQuaPin.Dung, thuPinOffline(DemPin(), bm, hs.be("c2")!!, "", t).first)
        assertEquals(KetQuaPin.CanMang, thuPinOffline(DemPin(), null, anh, "4821", t).first)
        var d = DemPin()
        for (i in 1..4) { val (k, n) = thuPinOffline(d, bm, anh, "1111", t + i); assertEquals(KetQuaPin.Sai(5 - i), k); d = n }
        assertEquals("Chưa đúng · còn 1 lần thử", cauPin(KetQuaPin.Sai(1)))
        val (k5, d5) = thuPinOffline(d, bm, anh, "1111", t + 5)
        assertEquals(KetQuaPin.TamKhoa(15), k5)
        assertEquals("đang chờ thì PIN đúng cũng chưa so", KetQuaPin.TamKhoa(15), thuPinOffline(d5, bm, anh, "4821", t + 100).first)
        assertEquals(KetQuaPin.TamKhoa(5), thuPinOffline(d5, bm, anh, "4821", t + 10_005).first)
        assertEquals("hết 15 giây ⇒ thử lại được", KetQuaPin.Dung, thuPinOffline(d5, bm, anh, "4821", t + 15_006).first)
        assertEquals("hết chờ ⇒ đếm lại từ đầu", KetQuaPin.Sai(4), thuPinOffline(d5, bm, anh, "1111", t + 16_000).first)
        assertEquals(d5, DemPin.doc(d5.json()))
        // sai lẻ tẻ cũ hơn 15 phút không cộng dồn
        var e = DemPin(); repeat(4) { e = e.thu("c1", false, t).second }
        assertEquals(KetQuaPin.Sai(4), e.thu("c1", false, t + 16 * 60_000L).first)
    }

    @Test fun docLoiMayChu() {
        assertEquals(KetQuaPin.Sai(3), docLoiPin("pin_sai", JSONObject("""{"error":"pin_sai","conLan":3}""")))
        assertEquals(KetQuaPin.TamKhoa(15), docLoiPin("pin_tam_khoa", JSONObject("""{"choGiay":15}""")))
        assertNull(docLoiPin("khong_thay", JSONObject()))
    }

    @Test fun nguoiDung_vaCong() {
        val con = docNguoiDung(JSONObject("""{"nguoiDung":{"loai":"con","con":{"id":"c1","ten":"Bảo Anh","coPin":true}}}"""))!!
        assertEquals(NguoiDung(LoaiNguoiDung.CON, "c1", "Bảo Anh", true), con)
        assertEquals(con, NguoiDung.doc(con.json()))
        val chua = docNguoiDung(JSONObject("""{"nguoiDung":{"loai":"chua"}}"""))!!
        val baMe = docNguoiDung(JSONObject("""{"nguoiDung":{"loai":"ba_me","den":"2026-11-06T12:40:00.000Z"},"baMeDung":{"den":"2026-11-06T12:40:00.000Z"}}"""))!!
        val den = java.time.Instant.parse("2026-11-06T12:40:00Z").toEpochMilli()
        assertEquals(den, baMe.baMeDen)
        assertNull("máy chủ cũ ⇒ không cổng", docNguoiDung(JSONObject("{}")))

        assertEquals(Cong.MO, xetCong(null, null, 0, t))
        assertEquals(Cong.CON, xetCong(con, null, 0, t))
        assertEquals(Cong.CHON_TEN, xetCong(chua, null, 0, t))
        assertEquals(Cong.BA_ME, xetCong(baMe, null, 0, den - 1))
        assertEquals("hết den ⇒ tự khoá về chọn tên, không chờ mạng", Cong.CHON_TEN, xetCong(baMe, null, 0, den + 1))
        assertEquals("mã Ba Mẹ gõ lúc mất mạng thắng «chua»", Cong.BA_ME, xetCong(chua, null, t + 60_000, t))
        // máy riêng: nhịp luôn «con»; hồ sơ chưa có phiên + bé có PIN ⇒ vẫn hỏi PIN
        val rieng = HoSoMay(listOf(BeHoSo("c1", "Bảo Anh", null, true, "x", null)), mayRieng = true, dangDung = null, baMeDen = null)
        assertEquals(Cong.CHON_TEN, xetCong(con, rieng, 0, t))
        assertEquals(Cong.CON, xetCong(con, rieng.copy(dangDung = "c1"), 0, t))
        assertEquals("máy riêng, bé chưa có PIN ⇒ không hỏi", Cong.CON, xetCong(con, rieng.copy(con = listOf(BeHoSo("c1", "Bảo Anh", null, false, null, null))), 0, t))
    }

    @Test fun viecCho_json() {
        val v = ViecCho("vao", "c1", "4821", t)
        assertEquals(v, ViecCho.doc(v.json()))
        assertNull(ViecCho.doc("hỏng"))
        assertEquals("0:15", demGiay(15)); assertEquals("12:05", demGiay(725))
    }
}

class DoiSaoTest {
    @Test fun xemTruoc_duVaThieu() {
        val x = xemDoiSao(10, 30, 18, 10)
        assertEquals(10, x.phut); assertTrue(x.du); assertEquals(20, x.conLaiSao); assertEquals(28, x.phutSau)
        val y = xemDoiSao(40, 30, 18, 10)
        assertTrue(!y.du); assertEquals(10, y.thieu); assertEquals(30, y.doiDuocToiDa)
        assertEquals("Thiếu 10 sao = 1 nhiệm vụ", cauThieuSao(10))
        assertEquals("tỷ lệ 10 sao = 15 phút", 30, xemDoiSao(20, 30, 0, 15).phut)
    }
}
