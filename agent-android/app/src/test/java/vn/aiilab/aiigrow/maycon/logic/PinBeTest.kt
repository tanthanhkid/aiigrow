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

    // review lượt 1 (#205): 2) chỉ bỏ việc chờ khi máy chủ từ chối nghiệp vụ; 3) rời máy thay «vao» đang chờ bằng «roi»; 5) hạn chờ theo lúc nhận
    @Test fun viecCho_boChiKhi4xx() {
        assertTrue(boViecCho(400)); assertTrue(boViecCho(401)); assertTrue(boViecCho(404)); assertTrue(boViecCho(409))
        assertTrue("5xx giữ để thử lại", !boViecCho(500)); assertTrue(!boViecCho(502)); assertTrue(!boViecCho(503))
        assertTrue("429 / 408 = thử lại sau", !boViecCho(429)); assertTrue(!boViecCho(408))
    }

    @Test fun viecCho_roiThayVao_guiXongKhongXoaViecMoi() {
        val vao = ViecCho("vao", "c1", "4821", t)
        val roi = viecSauRoi(vao, t + 1000)
        assertEquals("roi", roi.loai); assertNull("không còn PIN / bé để gửi dang-nhap-be sau dang-xuat", roi.conId); assertNull(roi.pin)
        assertEquals("roi", viecSauRoi(null, t).loai)
        assertNull("gửi xong đúng việc đang chờ ⇒ xoá", viecConLai(vao, vao))
        assertEquals("trong lúc gửi «vao» bé đã đăng xuất ⇒ giữ «roi»", roi, viecConLai(roi, vao))
        assertNull(viecConLai(null, vao))
    }

    @Test fun hoSo_hanChoTheoLucNhan_khongTroiKhiDocLai() {
        val o = JSONObject(hoSoJson)
        val nhan = t
        val a = docHoSo(o, nhan).be("c2")!!.khoaDen
        val b = docHoSo(o, nhan).be("c2")!!.khoaDen   // đọc lại sau đó (vd 20 giây) với CÙNG mốc nhận
        assertEquals(nhan + 11_000, a); assertEquals(a, b)
        assertTrue("20 giây sau đã hết chờ", (b ?: 0) < nhan + 20_000)
        assertEquals("hạn Ba Mẹ đổi sang giờ máy", 1_000L, denTheoGioMay(61_000L, 60_000L))
        assertNull(denTheoGioMay(null, 5))
        assertEquals("Sai 3 lần rồi", cauPin(KetQuaPin.TamKhoa(15, 3)))
    }

    // review lượt 2 (#205): 4) gửi tuần tự — «roi» luôn tới máy chủ sau «vao»; 6) máy chủ nhận PIN ⇒ xoá hẳn khoá cục bộ; 2) mốc phút máy dùng chung
    @Test fun guiLanLuot_roiSauVao() {
        var cho: ViecCho? = ViecCho("vao", "c1", "4821", t)
        val roi = ViecCho("roi", luc = t + 5)
        val mayChu = mutableListOf<String>()
        val da = guiLanLuot(
            doc = { cho },
            gui = { v -> mayChu += v.loai; if (v.loai == "vao") cho = roi; KetQuaGui.XONG },   // bé bấm Đăng xuất lúc «vao» đang bay
            ghi = { v, _ -> cho = viecConLai(cho, v) },
        )
        assertEquals(listOf("vao", "roi"), mayChu)
        assertEquals(listOf("vao", "roi"), da.map { it.loai })
        assertNull("gửi hết ⇒ không còn việc", cho)
        // 5xx / mạng ⇒ GIU: dừng, giữ việc
        var c2: ViecCho? = roi
        assertEquals(1, guiLanLuot({ c2 }, { KetQuaGui.GIU }, { v, _ -> c2 = viecConLai(c2, v) }).size)
        assertEquals(roi, c2)
        assertTrue(guiLanLuot({ null }, { KetQuaGui.XONG }, { _, _ -> }).isEmpty())
    }

    @Test fun demPin_xoaHanKhiMayChuNhan() {
        var d = DemPin()
        repeat(5) { d = d.thu("c1", false, t + it).second }
        assertTrue(d.choGiay("c1", t + 10) > 0)
        assertEquals("thu(dung) bị chặn khi đang chờ", KetQuaPin.TamKhoa(15), d.thu("c1", true, t + 10).first)
        val x = d.xoa("c1")
        assertEquals(0, x.choGiay("c1", t + 10)); assertTrue(x.sai["c1"] == null)
        assertEquals(KetQuaPin.Sai(4), x.thu("c1", false, t + 20).first)
    }

    @Test fun mocPhut_mayDungChung() {
        val ngay = "2026-11-06"
        assertNull("máy chủ cũ (không cổng) ⇒ không mốc", capNhatMoc(null, false, true, Cong.CON, "c1", ngay, 40, 1))
        val a = capNhatMoc(null, true, true, Cong.CON, "c1", ngay, 40, 1)!!
        assertEquals(0, truMoc(40, a)); assertEquals(15, truMoc(55, a))
        assertEquals("cùng lượt vào ⇒ giữ mốc", a, capNhatMoc(a, true, true, Cong.CON, "c1", ngay, 55, 1))
        assertEquals("chọn tên / Ba Mẹ ⇒ giữ", a, capNhatMoc(a, true, true, Cong.BA_ME, null, ngay, 70, 2))
        val b = capNhatMoc(a, true, true, Cong.CON, "c2", ngay, 70, 3)!!
        assertEquals("bé sau không bị tính 70 phút của bé trước + Ba Mẹ", 0, truMoc(70, b))
        assertEquals("cùng bé vào lại sau Ba Mẹ ⇒ mốc mới", 90, capNhatMoc(b, true, true, Cong.CON, "c2", ngay, 90, 4)!!.phut)
        assertEquals("sang ngày ⇒ mốc mới", 2, capNhatMoc(b, true, true, Cong.CON, "c2", "2026-11-07", 2, 3)!!.phut)
        assertEquals(b, MocPhut.doc(b.json()))
    }

    // review lượt 3: máy RIÊNG — phút Ba Mẹ dùng không trừ giờ bé, phút bé trước đó trong ngày vẫn tính
    @Test fun mocPhut_mayRieng_truPhutBaMe() {
        val ngay = "2026-11-06"
        var m = capNhatMoc(null, true, false, Cong.CON, "c1", ngay, 30, 1)
        assertEquals("bé đã chơi 30 phút ⇒ vẫn tính đủ", 30, truMoc(30, m))
        m = capNhatMoc(m, true, false, Cong.BA_ME, null, ngay, 30, 2)            // Ba Mẹ bắt đầu dùng ở phút 30
        m = capNhatMoc(m, true, false, Cong.BA_ME, null, ngay, 45, 2)
        m = capNhatMoc(m, true, false, Cong.CHON_TEN, null, ngay, 50, 3)         // Ba Mẹ thôi ở phút 50 ⇒ 20 phút của Ba Mẹ
        assertEquals(20, m!!.phut); assertNull(m.baMeTu)
        m = capNhatMoc(m, true, false, Cong.CON, "c1", ngay, 60, 4)
        assertEquals("bé: 30 trước + 10 sau, không tính 20 phút Ba Mẹ", 40, truMoc(60, m))
        assertEquals(m, MocPhut.doc(m!!.json()))
        assertEquals("sang ngày ⇒ 0", 0, capNhatMoc(m, true, false, Cong.CON, "c1", "2026-11-07", 3, 4)!!.phut)
        assertTrue(viecConHan(ViecCho("vao", "c1", "4821", t), t + 23 * 3_600_000L))
        assertTrue("quá 24 giờ ⇒ bỏ (PIN thô không giữ lâu)", !viecConHan(ViecCho("vao", "c1", "4821", t), t + 25 * 3_600_000L))
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
        // review lượt 2: đúng công thức máy chủ — phút = floor(sao·phut/10), sao trừ = ceil(phút·10/phut)
        val z = xemDoiSao(10, 30, 0, 7)            // 10 sao = 7 phút
        assertEquals(7, z.phut); assertEquals(10, z.sao)
        val w = xemDoiSao(10, 30, 0, 15, 10)      // 10 sao → 15 phút → trừ ceil(150/15)=10
        assertEquals(15, w.phut); assertEquals(10, w.sao)
        val u = xemDoiSao(20, 30, 0, 3)            // 20 sao → 6 phút → trừ ceil(60/3)=20
        assertEquals(6, u.phut); assertEquals(20, u.sao)
        val v = xemDoiSao(10, 30, 0, 4)            // 10 sao → 4 phút → trừ 10
        assertEquals(4, v.phut); assertEquals(10, v.sao); assertEquals(20, v.conLaiSao)
        assertEquals("tỷ lệ 3 sao = 10 phút: 10 sao → 33 phút → trừ ceil(99/10)=10", 10, xemDoiSao(10, 30, 0, 10, 3).sao)
        assertEquals(33, xemDoiSao(10, 30, 0, 10, 3).phut)
    }
}
