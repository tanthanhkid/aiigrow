package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** Luật 05/11 trên Android: quỹ phút ngày, giờ học, ngoại lệ, 2 chế độ chặn, web luôn chặn. */
class QuyGioTest {
    private fun vn(gio: String, ngay: String = "2026-10-21") = Instant.parse("${ngay}T${gio}:00+07:00")   // thứ Tư

    private val cs = ChinhSach(
        tz = "Asia/Ho_Chi_Minh", ngayThuong = listOf(Khung("17:00", "21:00")), ngu = Khung("21:30", "06:30"), tranNgayPhut = 60,
        heThong = listOf("com.android.settings"),
        hoc = listOf(MucChung("vn.olm.app", "app")),
        giaiTri = listOf(MucChung("com.google.android.youtube", "app")),
        chan = listOf(MucChung("com.android.chrome", "app")),
        quy = Quy(ngayPhut = 60, themPhut = 0, daDung = 20, conPhut = 40, dangHoc = false),
    )
    private val daCai = listOf(
        GoiCai("com.google.android.youtube", false), GoiCai("com.android.chrome", true), GoiCai("vn.olm.app", false), GoiCai("com.la.game", false),
    )

    @Test fun docChinhSachMoi() {
        val o = JSONObject("""{"ungDung":{"chuaXep":"cho_phep","webLuonChan":["pornhub.com"],"chan":[{"muc":"tiktok.com","kieu":"web"}]},
            "quy":{"ngayPhut":60,"themPhut":15,"daDung":42,"conPhut":33,"dangHoc":false,"tyLe":{"sao":10,"phut":20}},
            "gioHoc":{"tu":"14:00","den":"16:00","thu":[1,2,3]},
            "ngoaiLeMo":[{"id":"a","den":"2026-10-21T10:00:00Z","muc":null,"nhom":"android"},{"den":"sai"}]}""")
        val c = docChinhSach(o)
        assertEquals(75, c.quy!!.tongPhut); assertEquals(20, c.quy!!.phut10Sao)
        assertEquals(listOf(1, 2, 3), c.gioHoc!!.thu)
        assertEquals(1, c.ngoaiLeMo.size); assertEquals(null, c.ngoaiLeMo[0].muc)
        assertTrue(c.chuaXepChoPhep)
        assertEquals(listOf("tiktok.com", "pornhub.com"), webChan(c))
        // máy chủ cũ: không có quy ⇒ luật cũ
        assertEquals(null, docChinhSach(JSONObject("{}")).quy)
    }

    @Test fun quyThayTranVaKhungGio() {
        // 10:00 ngoài khung chơi cũ (17–21) nhưng 05/11 khung không còn chặn — chỉ quỹ
        val q = quyetDinh(cs, vn("10:00"), 0, daCai, null)
        assertEquals(TrangThai.BINH_THUONG, q.trangThai)
        assertEquals(40, q.conPhut)
        assertEquals(setOf("com.android.chrome", "com.la.game"), q.goiChan)
        assertEquals("app lạ ⇒ màn chặn «Xin Ba Mẹ duyệt»", setOf("com.la.game"), q.goiChuaXep)
    }

    @Test fun matMangVanDemLuiTheoPhutDoTaiCho() {
        val q = quyetDinh(cs, vn("10:00"), 55, daCai, null)    // máy chủ chỉ biết 20, máy đo 55
        assertEquals(5, q.conPhut)
        val het = quyetDinh(cs, vn("10:00"), 60, daCai, null)
        assertEquals(TrangThai.HET_GIO, het.trangThai)
        assertTrue("com.google.android.youtube" in het.goiChan)
        assertFalse("vn.olm.app" in het.goiChan)
    }

    @Test fun moHetChoAppChuaXep() {
        val q = quyetDinh(cs.copy(chuaXepChoPhep = true), vn("10:00"), 0, daCai, null)
        assertFalse("com.la.game" in q.goiChan)
        assertTrue("app Ba Mẹ chặn vẫn chặn", "com.android.chrome" in q.goiChan)
    }

    @Test fun gioHocChiAppHoc() {
        val c = cs.copy(gioHoc = GioHoc("09:00", "11:00", listOf(3)))
        val q = quyetDinh(c, vn("10:00"), 0, daCai, null)
        assertEquals(TrangThai.GIO_HOC, q.trangThai)
        assertTrue("com.google.android.youtube" in q.goiChan); assertFalse("vn.olm.app" in q.goiChan)
        assertEquals("thứ Năm không có giờ học", TrangThai.BINH_THUONG, quyetDinh(c, vn("10:00", "2026-10-22"), 0, daCai, null).trangThai)
    }

    @Test fun ngoaiLeCaMayThangGioNgu() {
        val nl = NgoaiLeMo(vn("23:00"), null, "android")
        val q = quyetDinh(cs.copy(ngoaiLeMo = listOf(nl)), vn("22:00"), 0, daCai, null)
        assertEquals(TrangThai.DUOC_THEM_GIO, q.trangThai); assertFalse(q.khoaCaMay)
        // ngoại lệ của nhóm máy khác (máy tính) không mở Android
        val k = quyetDinh(cs.copy(ngoaiLeMo = listOf(nl.copy(nhom = "may_tinh"))), vn("22:00"), 0, daCai, null)
        assertEquals(TrangThai.GIO_NGU, k.trangThai); assertTrue(k.khoaCaMay)
        // hết hạn ⇒ khoá lại
        assertEquals(TrangThai.GIO_NGU, quyetDinh(cs.copy(ngoaiLeMo = listOf(nl)), vn("23:01"), 0, daCai, null).trangThai)
    }

    @Test fun ngoaiLeMotAppLucBaMeKhoa() {
        val c = cs.copy(khoaNgay = true, ngoaiLeMo = listOf(NgoaiLeMo(vn("11:00"), "vn.olm.app", "android")))
        val q = quyetDinh(c, vn("10:00"), 0, daCai, null)
        assertEquals(TrangThai.KHOA_NGAY, q.trangThai)
        assertFalse(q.khoaCaMay); assertFalse("vn.olm.app" in q.goiChan); assertTrue("com.google.android.youtube" in q.goiChan)
        assertTrue(chiNgoaiLe(q.trangThai.name)); assertFalse(chiNgoaiLe(TrangThai.HET_GIO.name))
    }

    @Test fun thanXin() {
        val n = thanXinNgoaiLe(30, " cần làm bài ")
        assertEquals("ngoai_le", n.getString("loai")); assertEquals("ca_may", n.getString("phamVi")); assertEquals(30, n.getInt("phut"))
        assertEquals("cần làm bài", n.getString("lyDo"))
        assertFalse(thanXinNgoaiLe(15, "").has("lyDo"))
        assertEquals(15, saoCan(15, 10)); assertEquals(8, saoCan(15, 20))
    }
}
