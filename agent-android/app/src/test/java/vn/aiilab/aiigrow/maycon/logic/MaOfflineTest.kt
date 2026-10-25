package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class MaOfflineTest {
    // Số đối chiếu tính bằng server/lib/ma-offline.ts › maOffline (node) — máy chủ, agent-win và agent-android phải ra cùng mã.
    @Test fun cungMaVoiMayChu() {
        assertEquals("cabe62fd6d16", vanBiMat("abcDEF_123-xyz"))   // = server/lib/nhip-may.ts › vanBiMat
        assertEquals("831732", MaOffline.ma("abcDEF_123-xyz", 1761400000000))
        assertEquals("153980", MaOffline.ma("k", 0))
        assertEquals("307297", MaOffline.ma("Bí mật", 1761400299000))
    }

    @Test fun kiem_dungSaiMotBuoc_boKyTuLa() {
        val bm = "abcDEF_123-xyz"; val t = 1761400000000
        assertTrue(MaOffline.kiem(bm, "831 732", t))
        assertTrue(MaOffline.kiem(bm, "831732", t + 300_000))     // bước sau vẫn nhận
        assertTrue(MaOffline.kiem(bm, "831732", t - 300_000))
        assertFalse(MaOffline.kiem(bm, "831732", t + 700_000))    // quá ±1 bước
        assertFalse(MaOffline.kiem(bm, "83173", t))
        assertFalse(MaOffline.kiem(null, "831732", t))
    }

    @Test fun moTam_moMotLan_maDaDung_saiNamLanPhaiCho() {
        val bm = "abcDEF_123-xyz"; val t = 1761400000000
        val (kq, st) = MoTamOffline().thu(bm, "831732", t)
        assertEquals(KetQuaMoOffline.DA_MO, kq)
        assertEquals(t + 60 * 60_000L, st.moDen)
        assertTrue(st.dangMo(t + 59 * 60_000L)); assertFalse(st.dangMo(t + 61 * 60_000L))
        assertFalse("đồng hồ lùi về trước lúc mở ⇒ không mở", st.dangMo(t - 5 * 60_000L))
        assertEquals(KetQuaMoOffline.DANG_MO, st.thu(bm, "831732", t + 60_000).first)
        // lưu / đọc lại qua JSON (Kho)
        val doc = MoTamOffline.doc(st.json())
        assertEquals(st, doc)
        // hết lượt rồi gõ lại đúng mã đó ⇒ đã dùng
        val het = st.ketThucKhiCoMang(t + 2 * 60_000)!!
        assertEquals(KetQuaMoOffline.DA_DUNG, het.thu(bm, "831732", t + 3 * 60_000).first)
        assertNull("không có lượt mở ⇒ không kết thúc gì", het.ketThucKhiCoMang(t + 4 * 60_000))

        var s = MoTamOffline()
        repeat(5) { i -> val (k, n) = s.thu(bm, "000000", t + i * 1000L); assertEquals(KetQuaMoOffline.SAI, k); s = n }
        assertTrue(s.choGiay(t + 5000) > 0)
        assertEquals(KetQuaMoOffline.CHO_THU_LAI, s.thu(bm, "831732", t + 6000).first)
        assertEquals("sai cũ ra khỏi cửa sổ 10 phút ⇒ gõ lại được", 0, s.choGiay(t + 11 * 60_000L))
        assertEquals(KetQuaMoOffline.CHUA_CO_BI_MAT, MoTamOffline().thu(null, "831732", t).first)
        // máy chậm 20 phút so với máy chủ: mã Ba Mẹ thấy (giờ máy chủ) vẫn nhận nhờ lechMs
        assertEquals(KetQuaMoOffline.SAI, MoTamOffline().thu(bm, "831732", t - 20 * 60_000L).first)
        assertEquals(KetQuaMoOffline.DA_MO, MoTamOffline().thu(bm, "831732", t - 20 * 60_000L, lechMs = 20 * 60_000L).first)
        assertTrue(cauMoOffline(KetQuaMoOffline.DA_MO, st, t) { "10:00" }.startsWith("Đã mở 60 phút"))
    }

    @Test fun quyetDinh_maOfflineGoMoiKhoa_vanChanAppBiChan() {
        val cs = ChinhSach(tranNgayPhut = 60, ngayThuong = listOf(Khung("17:00", "21:00")), cuoiTuan = listOf(Khung("17:00", "21:00")),
            ngu = Khung("21:30", "06:30"), khoaNgay = true,
            giaiTri = listOf(MucChung("com.google.android.youtube", "app")), chan = listOf(MucChung("com.la.game", "app")))
        val now = Instant.parse("2026-10-21T23:00:00+07:00")
        val daCai = listOf(GoiCai("com.google.android.youtube", false), GoiCai("com.la.game", false))
        assertEquals(TrangThai.KHOA_NGAY, quyetDinh(cs, now, 0, daCai, null).trangThai)
        val q = quyetDinh(cs, now, 0, daCai, null, now.plusSeconds(1800))
        assertEquals(TrangThai.DUOC_THEM_GIO, q.trangThai)
        assertEquals(setOf("com.la.game"), q.goiChan)
        assertFalse(q.khoaCaMay)
        assertEquals("hạn đã qua ⇒ khoá như cũ", TrangThai.KHOA_NGAY, quyetDinh(cs, now, 0, daCai, null, now.minusSeconds(1)).trangThai)
    }

    @Test fun trinhDuyetKhongLoc_bichanTruChromeVaGoiDaXep() {
        val cs = ChinhSach(tranNgayPhut = 60, ngayThuong = listOf(Khung("00:00", "23:59")), cuoiTuan = listOf(Khung("00:00", "23:59")),
            hoc = listOf(MucChung("org.mozilla.firefox", "app")))
        val daCai = listOf(GoiCai("com.sec.android.app.sbrowser", true), GoiCai("com.android.chrome", true), GoiCai("org.mozilla.firefox", false))
        val td = setOf("com.sec.android.app.sbrowser", "com.android.chrome", "org.mozilla.firefox", "com.opera.browser")
        assertEquals(setOf("com.sec.android.app.sbrowser", "com.opera.browser"), trinhDuyetKhongLoc(td, setOf("org.mozilla.firefox")))
        val q = quyetDinh(cs, Instant.parse("2026-10-21T12:00:00+07:00"), 0, daCai, null, null, td)
        assertTrue("trình duyệt hệ thống không lọc được ⇒ tạm dừng", "com.sec.android.app.sbrowser" in q.goiChan)
        assertFalse("Chrome lọc được (URLBlocklist) ⇒ chạy", "com.android.chrome" in q.goiChan)
        assertFalse("Ba Mẹ đã xếp Firefox ⇒ theo Ba Mẹ", "org.mozilla.firefox" in q.goiChan)
        val them = quyetDinh(cs, Instant.parse("2026-10-21T12:00:00+07:00"), 0, daCai, Instant.parse("2026-10-21T13:00:00+07:00"), null, td)
        assertEquals(TrangThai.DUOC_THEM_GIO, them.trangThai)
        assertTrue("thêm giờ vẫn chặn trình duyệt không lọc được", "com.sec.android.app.sbrowser" in them.goiChan)
        assertFalse("không Device Owner (không truyền) ⇒ không chặn", "com.sec.android.app.sbrowser" in quyetDinh(cs, Instant.parse("2026-10-21T12:00:00+07:00"), 0, daCai, null).goiChan)
    }

    @Test fun nhacGio_moiMocMotLan_choBaoLaiKhiThemGio() {
        var n = NhacGio()
        fun x(g: Int?): Int? { val (m, s) = n.xet(g); n = s; return m }
        assertNull(x(600)); assertEquals(5, x(300)); assertNull(x(290)); assertNull(x(120))
        assertEquals(1, x(60)); assertNull(x(30))
        assertNull(x(1800))                       // thêm giờ ⇒ cho báo lại
        assertEquals(5, x(280)); assertEquals(1, x(55))
        assertNull(NhacGio().xet(null).first)
        assertNull("nhảy thẳng xuống 3 phút (Ba Mẹ đổi luật) ⇒ không báo 5", NhacGio().xet(180).first)
        fun q(t: TrangThai, p: Int, mo: Long? = null) = QuyetDinh(t, emptySet(), false, p, mo?.let { Instant.ofEpochMilli(it) }, "")
        assertEquals(300, giayConTruocKhoa(q(TrangThai.BINH_THUONG, 5), null, 0))
        assertEquals("giờ ngủ tới trước trần ngày", 240, giayConTruocKhoa(q(TrangThai.BINH_THUONG, 60), null, 0, 240))
        assertEquals("hết thêm giờ thì khoá ⇒ đếm tới hạn", 90, giayConTruocKhoa(q(TrangThai.DUOC_THEM_GIO, 2, 100_000), q(TrangThai.HET_GIO, 0), 10_000))
        assertEquals("hết thêm giờ còn 40 phút ⇒ cộng vào", 90 + 2400, giayConTruocKhoa(q(TrangThai.DUOC_THEM_GIO, 2, 100_000), q(TrangThai.BINH_THUONG, 40), 10_000))
        assertNull(giayConTruocKhoa(q(TrangThai.HET_GIO, 0), null, 0))
        assertEquals("giờ ngủ tới trước hạn thêm giờ ⇒ đếm tới giờ ngủ", 120, giayConTruocKhoa(q(TrangThai.DUOC_THEM_GIO, 60, 3_600_000), q(TrangThai.HET_GIO, 0), 0, 120))
        val cs = ChinhSach(ngu = Khung("21:00", "06:30"))
        assertEquals(5 * 60, giayToiNgu(cs, Instant.parse("2026-10-21T20:55:00+07:00")))
        assertNull(giayToiNgu(ChinhSach(), Instant.parse("2026-10-21T20:55:00+07:00")))
    }

    @Test fun hangDoi_cheBiMat_catDong() {
        assertEquals("Authorization: Bearer [ẩn]", cheBiMat("Authorization: Bearer abc.DEF-123"))
        assertEquals("{\"token\":\"[ẩn]\",\"x\":1}", cheBiMat("{\"token\":\"tok123\",\"x\":1}"))
        val d = JSONObject(dongLog("2026-10-25T00:00:00Z", "la", "Nhip", "x".repeat(2000)))
        assertEquals("tin", d.getString("muc")); assertEquals(LOG_DAI, d.getString("noiDung").length)
        assertEquals(listOf("b", "c"), catDong(listOf("a", "", "b", "c"), 2))
        assertEquals(1, thanGui(listOf("{\"a\":1}", "hỏng")).getJSONArray("ds").length())
        val sk = JSONObject(dongSuKien("m1", "mo_ma_offline", "t", mapOf("phut" to "60")))
        assertEquals("60", sk.getJSONObject("chiTiet").getString("phut"))
    }

    @Test fun docPhanHoi_coBiMat() {
        val ph = docPhanHoiNhip("""{"serverTime":"2026-10-25T00:00:00Z","chinhSach":{},"maOfflineBiMat":"abc_DEF"}""")
        assertEquals("abc_DEF", ph.maOfflineBiMat)
        assertNull(docPhanHoiNhip("""{"chinhSach":{}}""").maOfflineBiMat)
        assertTrue(matMang(0, 1)); assertFalse(matMang(1000, 1000 + 60_000)); assertTrue(matMang(1000, 1000 + 4 * 60_000))
    }
}
