package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class LogicTest {
    // 2026-10-21 là thứ Tư; giờ Việt Nam = UTC+7
    private fun vn(gio: String, ngay: String = "2026-10-21") = Instant.parse("${ngay}T${gio}:00+07:00")

    private val cs = ChinhSach(
        tz = "Asia/Ho_Chi_Minh", tenCon = "Bin",
        ngayThuong = listOf(Khung("17:00", "21:00")), cuoiTuan = listOf(Khung("08:00", "21:00")),
        ngu = Khung("21:30", "06:30"), tranNgayPhut = 60,
        heThong = listOf("com.android.settings"),
        hoc = listOf(MucChung("vn.olm.app", "app")),
        giaiTri = listOf(MucChung("com.google.android.youtube", "app"), MucChung("game.exe", "app")),
        chan = listOf(MucChung("com.android.chrome", "app"), MucChung("tiktok.com", "web")),
    )
    private val daCai = listOf(
        GoiCai("com.google.android.youtube", false), GoiCai("com.android.chrome", true), GoiCai("vn.olm.app", false),
        GoiCai("com.la.game", false), GoiCai("com.android.camera2", true), GoiCai("vn.aiilab.aiigrow.con", false),
    )

    @Test fun phutVaKhung() {
        assertEquals(1020, phutCua("17:00"))
        assertTrue(trongKhung(phutCua("23:00"), Khung("21:30", "06:30")))
        assertTrue(trongKhung(phutCua("05:00"), Khung("21:30", "06:30")))
        assertFalse(trongKhung(phutCua("12:00"), Khung("21:30", "06:30")))
        assertFalse(trongKhung(600, Khung("10:00", "10:00")))
        assertTrue(laGoiAndroid("vn.olm.app")); assertFalse(laGoiAndroid("Roblox.app")); assertFalse(laGoiAndroid("game.exe"))
        assertFalse(laGoiAndroid("tiktok com"))
        assertEquals(30, phutToiHetKhung(phutCua("20:30"), listOf(Khung("17:00", "21:00"))))
    }

    @Test fun binhThuong_chanAppChanVaChuaXep_khongChanHeThongHayAiiGrow() {
        val q = quyetDinh(cs, vn("18:00"), 20, daCai, null)
        assertEquals(TrangThai.BINH_THUONG, q.trangThai)
        assertEquals(40, q.conPhut)
        assertEquals(setOf("com.android.chrome", "com.la.game"), q.goiChan)
        assertFalse(q.khoaCaMay)
    }

    @Test fun conPhutBiGioiHanBoiHetKhung() {
        assertEquals(10, quyetDinh(cs, vn("20:50"), 0, daCai, null).conPhut)
    }

    @Test fun hetGio_chanGiaiTri() {
        val q = quyetDinh(cs, vn("18:00"), 60, daCai, null)
        assertEquals(TrangThai.HET_GIO, q.trangThai)
        assertTrue("com.google.android.youtube" in q.goiChan)
        assertFalse("vn.olm.app" in q.goiChan)
        assertFalse(q.khoaCaMay)
    }

    @Test fun phutThemHomNayCongVaoTran() {
        assertEquals(TrangThai.BINH_THUONG, quyetDinh(cs.copy(phutThemHomNay = 30), vn("18:00"), 60, daCai, null).trangThai)
    }

    @Test fun ngoaiKhung_moLaiDauKhungKe() {
        val q = quyetDinh(cs, vn("10:00"), 0, daCai, null)
        assertEquals(TrangThai.NGOAI_KHUNG, q.trangThai)
        assertEquals(vn("17:00"), q.moLaiLuc)
    }

    @Test fun cuoiTuanDungKhungCuoiTuan() {
        assertEquals(TrangThai.BINH_THUONG, quyetDinh(cs, vn("10:00", "2026-10-24"), 0, daCai, null).trangThai)
    }

    @Test fun gioNgu_khoaCaMay_moLaiLucHetNgu() {
        val q = quyetDinh(cs, vn("22:00"), 0, daCai, null)
        assertEquals(TrangThai.GIO_NGU, q.trangThai)
        assertTrue(q.khoaCaMay)
        assertEquals(Instant.parse("2026-10-22T06:30:00+07:00"), q.moLaiLuc)
    }

    @Test fun khoaNgayThangCaThemGio() {
        val q = quyetDinh(cs.copy(khoaNgay = true), vn("18:00"), 0, daCai, vn("19:00"))
        assertEquals(TrangThai.KHOA_NGAY, q.trangThai)
        assertTrue(q.khoaCaMay)
    }

    @Test fun themGioDuocDuyet_goToiGrantEndsAt() {
        val q = quyetDinh(cs, vn("10:00"), 999, daCai, vn("10:30"))
        assertEquals(TrangThai.DUOC_THEM_GIO, q.trangThai)
        assertEquals(setOf("com.android.chrome"), q.goiChan)   // app Ba Mẹ chặn vẫn chặn
        assertEquals(31, q.conPhut)
        assertEquals(vn("10:30"), q.moLaiLuc)
        // hết hạn ⇒ trở lại ngoài khung
        assertEquals(TrangThai.NGOAI_KHUNG, quyetDinh(cs, vn("10:31"), 999, daCai, vn("10:30")).trangThai)
    }

    @Test fun khongTuanThu_khoaGiaiTri() {
        val q = quyetDinh(cs.copy(giaiTriDuocMo = false, lyDo = listOf("khong_tuan_thu"), cauTuanThuCon = listOf("Giờ máy bị đổi")), vn("18:00"), 0, daCai, null)
        assertEquals(TrangThai.KHONG_TUAN_THU, q.trangThai)
        assertEquals("Giờ máy bị đổi", q.cauCon)
        assertTrue("com.google.android.youtube" in q.goiChan)
    }

    @Test fun mucTamThoiChoPhepGoChan() {
        val c = cs.copy(mucTamThoi = listOf(MucTamThoi("com.la.game", "hoc", vn("23:00"))))
        assertFalse("com.la.game" in quyetDinh(c, vn("18:00"), 0, daCai, null).goiChan)
    }

    @Test fun demNguoc() {
        val t = vn("18:00")
        assertEquals(60, demNguocConLai(t, t))
        assertEquals(15, demNguocConLai(t, t.plusSeconds(45)))
        assertEquals(0, demNguocConLai(t, t.plusSeconds(600)))
        assertEquals("1:05", mmss(65))
        assertTrue(laKhoa(TrangThai.HET_GIO)); assertFalse(laKhoa(TrangThai.DUOC_THEM_GIO))
    }

    @Test fun demTienCanhTheoSuKien() {
        val ds = listOf(
            SuKienDung("b", LoaiSuKien.DONG, 1_000),          // b mở từ trước «tu»
            SuKienDung("a", LoaiSuKien.MO, 2_000),
            SuKienDung("c", LoaiSuKien.MO, 5_000),            // c lên tiền cảnh ⇒ a dừng
            SuKienDung("c", LoaiSuKien.DONG, 6_000),
            SuKienDung("a", LoaiSuKien.MO, 7_000),
            SuKienDung("x", LoaiSuKien.TAT_MAN, 8_000),
            SuKienDung("a", LoaiSuKien.MO, 9_000),            // còn mở tới «den»
        )
        val m = demTienCanh(ds, 0, 10_000)
        assertEquals(1_000L, m["b"]); assertEquals(5_000L, m["a"]); assertEquals(1_000L, m["c"])
        assertEquals(2, phutGiaiTri(mapOf("a" to 150_000L, "z" to 600_000L), setOf("a")))
    }

    @Test fun maGhepVaThan() {
        assertEquals("123456", chuanMaGhep("123 456"))
        assertNull(chuanMaGhep("12345"))
        assertNull(chuanMaGhep("12a456"))
        assertEquals("android", thanGhep("123456", "Pixel").getString("nen"))
        val x = thanXinThemGio(60, "  ")
        assertEquals("them_gio", x.getString("loai")); assertEquals(60, x.getInt("phut")); assertEquals("Con xin thêm 60 phút", x.getString("lyDo"))
        assertEquals("cho con xem nốt", thanXinThemGio(120, "cho con xem nốt").getString("lyDo"))
        try { thanXinThemGio(45, ""); throw AssertionError("phải lỗi") } catch (_: IllegalArgumentException) {}
        val n = thanNhip("t", "0.1.0", false, true, true, false, true, 0, mapOf("a" to 3, "b" to 0))
        assertTrue(n.getBoolean("appQuanLyBat"))
        assertEquals(1, n.getJSONObject("phutDungHomNay").length())
    }

    @Test fun docPhanHoiNhipTheoHinhDangMayChu() {
        val s = """
        {"serverTime":"2026-10-21T11:00:00.000Z","tuanThu":{"trangThai":"tuan_thu"},
         "chinhSach":{"phienBan":1,"tz":"Asia/Ho_Chi_Minh","con":{"id":"c1","ten":"Bin","nhom":"9-12"},
           "gioChoi":{"ngayThuong":[{"tu":"17:00","den":"21:00"}],"cuoiTuan":[],"ngu":{"tu":"21:30","den":"06:30"},"tranNgayPhut":90,"tranTuanPhut":600},
           "ungDung":{"heThong":["com.android.settings"],"hoc":[],"giaiTri":[{"muc":"com.google.android.youtube","kieu":"app","nhom":"video_ngan"}],
             "chan":[{"muc":"com.android.chrome","kieu":"app"},{"muc":"tiktok.com","kieu":"web"}],"chuaXep":"chan"},
           "phienDiem":{"soDu":10,"phien":null},"khoaNgay":false,
           "ngoaiLe":{"phutThemHomNay":15,"mucTamThoi":[],"moKhanCapDen":null},
           "tuanThu":{"vanDe":[{"loai":"gio_sai","cauCon":"Giờ trên máy chưa đúng"}]},
           "hieuLuc":{"giaiTriDuocMo":true,"lyDo":[]}},
         "nenTang":{"nen":"android"},"lenh":[{"id":"l1","loai":"go"}],"grantEndsAt":"2026-10-21T12:00:00.000Z"}
        """.trimIndent()
        val p = docPhanHoiNhip(s)
        assertEquals("Bin", p.chinhSach.tenCon)
        assertEquals(90, p.chinhSach.tranNgayPhut)
        assertEquals(15, p.chinhSach.phutThemHomNay)
        assertEquals(Khung("21:30", "06:30"), p.chinhSach.ngu)
        assertEquals(listOf("tiktok.com"), webChan(p.chinhSach))
        assertEquals(setOf("com.android.chrome"), goiAndroid(p.chinhSach.chan))
        assertEquals(listOf(Lenh("l1", "go")), p.lenh)
        assertEquals(Instant.parse("2026-10-21T12:00:00Z"), p.grantEndsAt)
        assertEquals(listOf("Giờ trên máy chưa đúng"), p.chinhSach.cauTuanThuCon)
        // dạng dong-bo Windows/Mac: grantEndsAt trong `windows`
        assertEquals(Instant.parse("2026-10-21T12:00:00Z"),
            docPhanHoiNhip("""{"chinhSach":{},"windows":{"grantEndsAt":"2026-10-21T12:00:00Z"}}""").grantEndsAt)
    }
}
