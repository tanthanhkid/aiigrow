package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** Luật 15/11 trên Android: 1 sao = 1 phút (#264), sao âm / nợ (#263), Mở hết / Theo danh sách (#262), sổ phút theo bé (#267). */
class SoSaoTest {
    private fun vn(gio: String, ngay: String = "2026-11-15") = Instant.parse("${ngay}T${gio}:00+07:00")

    private val cs = ChinhSach(
        tz = "Asia/Ho_Chi_Minh", ngu = Khung("00:00", "00:00"),
        heThong = listOf("com.android.settings"),
        hoc = listOf(MucChung("vn.olm.app", "app")),
        giaiTri = listOf(MucChung("com.google.android.youtube", "app")),
        quy = Quy(ngayPhut = 0, themPhut = 30, daDung = 0, conPhut = 30, dangHoc = false),
        sao = Sao(sao = 30, no = 0, phutCon = 30), cheDo = "theo_danh_sach",
    )
    private val daCai = listOf(GoiCai("com.google.android.youtube", false), GoiCai("vn.olm.app", false), GoiCai("com.roblox.client", false))

    @Test fun docSaoVaCheDo() {
        val c = docChinhSach(JSONObject("""{"ungDung":{"chuaXep":"chan","cheDo":"theo_danh_sach","cheDoChan":"chi_app_duoc_phep"},
            "sao":{"sao":-20,"no":20,"phutCon":0,"saoVayChuaTieu":0,"hetSao":true,"canhBaoNo":false,
                   "cau":{"soDu":"−20 sao","phut":"Hết sao — xin Ba Mẹ cho vay sao nhé","no":"Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước"}}}"""))
        assertEquals(-20, c.sao!!.sao); assertEquals(20, c.sao!!.no); assertTrue(c.sao!!.hetSao)
        assertFalse(c.moHet)
        assertTrue(docChinhSach(JSONObject("""{"ungDung":{"cheDo":"mo_het","chuaXep":"cho_phep"}}""")).moHet)
        // máy chủ cũ: không sao, không cheDo ⇒ null (chạy luật quỹ); «mo_het» cũ (cheDoChan) không phải Mở hết 15/11
        val cu = docChinhSach(JSONObject("""{"ungDung":{"chuaXep":"cho_phep","cheDoChan":"mo_het"}}"""))
        assertNull(cu.sao); assertFalse(cu.moHet); assertTrue(cu.chuaXepChoPhep)
        assertNull("sao: null (máy chung chưa chọn bé)", docChinhSach(JSONObject("""{"sao":null}""")).sao)
    }

    @Test fun conSaoThiChoiTinhPhut_ngoaiDanhSachChan() {
        val q = quyetDinh(cs, vn("19:30"), 0, daCai, null, phutLucNhip = 0, ngayNhip = "2026-11-15")
        assertEquals(TrangThai.BINH_THUONG, q.trangThai)
        assertEquals(30, q.conPhut); assertEquals(30, q.soDu)
        assertFalse("YouTube (Tính phút) chơi được", "com.google.android.youtube" in q.goiChan)
        assertTrue("Roblox ngoài danh sách ⇒ chặn, xin Ba Mẹ mở", "com.roblox.client" in q.goiChan)
        assertTrue("com.roblox.client" in q.goiChuaXep)
        assertEquals("Còn 30 sao = 30 phút chơi.", q.cauCon)
        // không còn giờ ngủ / khung giờ: 23:00 vẫn chơi được nếu còn sao
        assertEquals(TrangThai.BINH_THUONG, quyetDinh(cs, vn("23:00"), 0, daCai, null).trangThai)
    }

    @Test fun demLuiTaiChoRoiHetSao() {
        // nhịp lúc đã chơi 10 phút hôm nay; sau đó chơi thêm 25 ⇒ còn 5 sao
        val q = quyetDinh(cs, vn("19:30"), 35, daCai, null, phutLucNhip = 10, ngayNhip = "2026-11-15")
        assertEquals(5, q.conPhut)
        val het = quyetDinh(cs, vn("19:40"), 45, daCai, null, phutLucNhip = 10, ngayNhip = "2026-11-15")
        assertEquals(TrangThai.HET_GIO, het.trangThai)
        assertTrue("hết sao ⇒ YouTube dừng", "com.google.android.youtube" in het.goiChan)
        assertFalse("app học (Không tính phút) vẫn mở", "vn.olm.app" in het.goiChan)
        assertFalse("hết sao không khoá cả máy", het.khoaCaMay)
        assertTrue(laKhoa(het.trangThai))
        // sang ngày mới chưa nhịp: sao không về lại — trừ cả phút hôm nay
        assertEquals(22, quyetDinh(cs, vn("08:00", "2026-11-16"), 8, daCai, null, phutLucNhip = 40, ngayNhip = "2026-11-15").conPhut)
    }

    @Test fun soAmKhiNo() {
        val c = cs.copy(sao = Sao(sao = 10, no = 20, phutCon = 30))   // vay 20 + tự kiếm 10
        val q = quyetDinh(c, vn("19:30"), 30, daCai, null, phutLucNhip = 0, ngayNhip = "2026-11-15")
        assertEquals(TrangThai.HET_GIO, q.trangThai); assertEquals(-20, q.soDu); assertEquals(20, q.no)
        val hs = quyetDinh(cs.copy(sao = Sao(sao = -20, no = 20, phutCon = 0, hetSao = true)), vn("19:30"), 0, daCai, null)
        assertEquals(TrangThai.HET_GIO, hs.trangThai); assertEquals(-20, hs.soDu)
        assertEquals("−20 sao", soSao(-20)); assertEquals("18 sao", soSao(18))
        assertEquals("Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước", cauNoSao(20)); assertNull(cauNoSao(0))
    }

    @Test fun moHetKhongChanKhongDem() {
        val c = cs.copy(cheDo = "mo_het", chuaXepChoPhep = true, sao = Sao(sao = 0, no = 0, phutCon = 0, hetSao = true))
        val q = quyetDinh(c, vn("19:30"), 50, daCai, null, trinhDuyet = setOf("org.mozilla.firefox"), phutLucNhip = 0, ngayNhip = "2026-11-15")
        assertEquals(TrangThai.BINH_THUONG, q.trangThai)
        assertTrue("Mở hết: không chặn gì, kể cả hết sao / trình duyệt", q.goiChan.isEmpty())
        assertTrue(q.moHet)
        assertNull("Mở hết ⇒ không nhắc giờ", giayConTruocKhoa(q, null, 0))
        // Ba Mẹ khoá máy vẫn khoá
        assertEquals(TrangThai.KHOA_NGAY, quyetDinh(c.copy(khoaNgay = true), vn("19:30"), 0, daCai, null).trangThai)
    }

    @Test fun phutBoiMaKhongTruDemLui() {
        // nhịp lúc 0 phút, 30 sao; chơi 40 phút trong đó 20 phút lúc mở bằng mã ⇒ còn 10, không «Hết sao»
        val q = quyetDinh(cs, vn("19:30"), 40, daCai, null, phutLucNhip = 0, ngayNhip = "2026-11-15", phutBoiMa = 20)
        assertEquals(TrangThai.BINH_THUONG, q.trangThai); assertEquals(10, q.conPhut)
    }

    @Test fun khoaUuTienHonNhanMoHet() {
        val c = cs.copy(cheDo = "mo_het", khoaNgay = true)
        val q = quyetDinh(c, vn("19:30"), 0, daCai, null)
        assertEquals(TrangThai.KHOA_NGAY, q.trangThai); assertFalse(q.moHet)
    }

    @Test fun maOfflineMoHetKhongTruSao() {
        val c = cs.copy(sao = Sao(sao = 0, no = 0, phutCon = 0, hetSao = true), khoaNgay = true)
        val q = quyetDinh(c, vn("19:30"), 0, daCai, null, vn("20:00"))
        assertEquals(TrangThai.DUOC_THEM_GIO, q.trangThai); assertFalse(q.khoaCaMay)
        assertTrue(q.cauCon.contains("không trừ sao"))
    }

    @Test fun nhacTheoSao() {
        assertEquals("Còn 5 sao = 5 phút chơi", tieuDeNhac(5, sao = true))
        assertEquals("Còn 5 phút chơi", tieuDeNhac(5))
        assertTrue(noiDungNhac(5, sao = true).contains("cho vay sao"))
    }

    @Test fun soPhutTheoBe_mayChung() {
        val tp = setOf("com.google.android.youtube")
        var so = SoPhutBe().chotToi("2026-11-15", mapOf("com.google.android.youtube" to 600_000L), "be-a", tp, false)
        assertTrue("lần đầu chỉ lấy mốc", so.be.isEmpty())
        so = so.chotToi("2026-11-15", mapOf("com.google.android.youtube" to 1_800_000L), "be-a", tp, false)   // Bảo Anh +20 phút
        so = so.chotToi("2026-11-15", mapOf("com.google.android.youtube" to 2_400_000L), null, tp, false)      // chọn tên: không ai
        so = so.chotToi("2026-11-15", mapOf("com.google.android.youtube" to 3_000_000L), "be-m", tp, false)    // Bảo Minh +10
        so = so.chotToi("2026-11-15", mapOf("com.google.android.youtube" to 3_600_000L, "vn.olm.app" to 120_000L), "be-a", tp, false)  // Bảo Anh vào lại +10, +2 học
        assertEquals(1_800_000L, so.be["be-a"]!!["com.google.android.youtube"])
        assertEquals(600_000L, so.be["be-m"]!!["com.google.android.youtube"])
        val than = so.thanDongBo("2026-11-15T12:00:00Z", coCon = true, conHienTai = "be-a")
        val ds = than.getJSONArray("usage")
        val dong = (0 until ds.length()).map { ds.getJSONObject(it) }.associate { "${it.optString("con")}|${it.getString("muc")}" to it.getInt("phut") }
        assertEquals(mapOf("be-a|com.google.android.youtube" to 30, "be-a|vn.olm.app" to 2, "be-m|com.google.android.youtube" to 10), dong)
        assertFalse(than.has("phutBoiMa"))
        // sổ lưu / đọc lại
        assertEquals(so, SoPhutBe.doc(so.json()))
        // sang ngày ⇒ sổ mới, mốc = hôm nay; sổ hôm qua gửi bù (day cũ) rồi xoá khi máy chủ nhận
        val mai = so.chotToi("2026-11-16", mapOf("com.google.android.youtube" to 60_000L), "be-a", tp, false)
        assertTrue(mai.be.isEmpty()); assertEquals("2026-11-16", mai.ngay); assertEquals("2026-11-15", mai.ngayCu)
        val bu = mai.thanDongBo("t", true, "be-a").getJSONArray("usage")
        assertEquals(3, bu.length()); assertEquals("2026-11-15", bu.getJSONObject(0).getString("day"))
        val xong = mai.daGui("2026-11-16", "be-a", 0, "2026-11-15")
        assertNull(xong.ngayCu); assertTrue(xong.beCu.isEmpty())
    }

    @Test fun soPhutTheoBe_boiMaVaMayRieng() {
        val tp = setOf("com.google.android.youtube")
        var so = SoPhutBe().chotToi("2026-11-15", emptyMap(), BE_MAY, tp, false)
        so = so.chotToi("2026-11-15", mapOf("com.google.android.youtube" to 900_000L, "vn.olm.app" to 300_000L), BE_MAY, tp, boiMa = true)
        assertEquals("chỉ app Tính phút lúc mở bằng mã", 15, so.phutBoiMa(BE_MAY))
        val than = so.thanDongBo("t", coCon = false, conHienTai = BE_MAY)
        assertEquals(15, than.getInt("phutBoiMa"))
        assertFalse("máy riêng không gửi con", than.getJSONArray("usage").getJSONObject(0).has("con"))
        assertEquals(0, so.daGui("2026-11-15", BE_MAY, 15, null).phutBoiMa(BE_MAY))
        // phút bởi mã theo bé: bé khác đang dùng ⇒ không gửi phần của bé trước
        val chung = SoPhutBe().chotToi("2026-11-15", emptyMap(), "a", tp, false)
            .chotToi("2026-11-15", mapOf("com.google.android.youtube" to 600_000L), "a", tp, boiMa = true)
        assertEquals(10, chung.phutBoiMa("a")); assertEquals(0, chung.phutBoiMa("m"))
        assertFalse(chung.thanDongBo("t", true, "m").has("phutBoiMa"))
        // qua ngày: phút bởi mã hôm qua KHÔNG mang sang hôm nay
        assertEquals(0, chung.chotToi("2026-11-16", emptyMap(), "a", tp, false).phutBoiMa("a"))
        // đã gửi nhưng sổ đã sang ngày ⇒ không trừ nhầm phần hôm nay
        val sau = chung.chotToi("2026-11-16", emptyMap(), "a", tp, false)
        assertEquals(sau, sau.daGui("2026-11-15", "a", 10, null))
        assertEquals(BE_MAY, beGhiPhut(Cong.MO, null)); assertEquals("x", beGhiPhut(Cong.CON, "x"))
        assertNull(beGhiPhut(Cong.BA_ME, "x")); assertNull(beGhiPhut(Cong.CHON_TEN, null))
    }

    @Test fun xinVayVaKetQuaLoiXin() {
        val t = thanXinVay(15, "  ")
        assertEquals(15, t.getInt("soSao")); assertEquals("choi", t.getString("mucDich")); assertFalse(t.has("loiNhan"))
        assertEquals("con làm xong bài rồi", thanXinVay(30, "con làm xong bài rồi").getString("loiNhan"))
        assertEquals(listOf(10, 15, 30), MUC_VAY); assertEquals(15, VAY_MAC_DINH)
        assertEquals(TrangThaiXin.DUOC, docTrangThaiXin(JSONObject("""{"ketQua":"da_them","status":"duoc"}""")))
        assertEquals(TrangThaiXin.DUOC, docTrangThaiXin(JSONObject("""{"ketQua":"mo_tam"}""")))
        assertEquals(TrangThaiXin.TU_CHOI, docTrangThaiXin(JSONObject("""{"ketQua":"chua_them","status":"tu_choi"}""")))
        assertEquals("«Bỏ qua» 60 giây đầu vẫn chờ", TrangThaiXin.CHO, docTrangThaiXin(JSONObject("""{"ketQua":"cho","status":"cho"}""")))
        assertEquals("máy chủ cũ", TrangThaiXin.DUOC, docTrangThaiXin(JSONObject("""{"status":"duoc"}""")))
        assertEquals("Ba Mẹ chưa cho vay sao lần này.", cauXinVay(TrangThaiXin.TU_CHOI, 15))
    }

    @Test fun hoSoCoSaoTungBe() {
        val hs = docHoSo(JSONObject("""{"mayRieng":false,"mayChung":true,"tenMay":"Máy cả nhà","con":[
            {"id":"a","ten":"Bảo Anh","coPin":true,"sao":18},{"id":"m","ten":"Bảo Minh","coPin":true,"sao":-20},{"id":"c","ten":"Cũ","coPin":false}]}"""), 0)
        assertEquals(listOf(18, -20, null), hs.con.map { it.sao })
        assertEquals("Máy cả nhà", hs.tenMay)
    }
}
