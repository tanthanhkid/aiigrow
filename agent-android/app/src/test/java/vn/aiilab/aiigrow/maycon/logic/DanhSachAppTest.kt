package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class DanhSachAppTest {
    private val minh = "vn.aiilab.aiigrow.con"
    private val yt = AppMay("com.google.android.youtube", "com.google.android.youtube", "YouTube", nhaPhatHanh = "com.android.vending", phienBan = "19.1", icon = "aWNvbg==")
    private val rb = AppMay("com.roblox.client", "com.roblox.client", "Roblox", phienBan = "2.6")
    private val olm = AppMay("vn.olm.app", "vn.olm.app", "OLM", phienBan = "1.0")

    @Test fun chuan_boChinhMinh_trungKhoa_catChu_iconQuaCo_sapXep() {
        val dai = "x".repeat(400)
        val ds = chuanDanhSach(listOf(
            rb, AppMay(minh, minh, "AiiGrow Con"), yt, rb.copy(ten = "Roblox 2"), AppMay("  ", "a", "trống"),
            olm.copy(ten = dai, icon = "A".repeat(TOI_DA_ICON_B64 + 1)), AppMay("a.b", "a.b", "  "),
        ), minh)
        assertEquals(listOf("a.b", "com.google.android.youtube", "com.roblox.client", "vn.olm.app"), ds.map { it.khoa })
        assertEquals("Roblox", ds[2].ten)                    // trùng khoá giữ bản đầu
        assertEquals(TOI_DA_CHU, ds[3].ten.length)
        assertNull(ds[3].icon)
        assertEquals("a.b", ds[0].ten)                        // tên trống ⇒ dùng khoá
        assertEquals("aWNvbg==", ds[1].icon)
    }

    @Test fun bam_tatDinh_khongPhuThuocThuTu_khongTinhIcon() {
        val a = bamDanhSach(listOf(yt, rb, olm))
        assertEquals(a, bamDanhSach(listOf(olm, yt, rb)))
        assertEquals(a, bamDanhSach(listOf(yt.copy(icon = "khác"), rb, olm)))
        assertNotEquals(a, bamDanhSach(listOf(yt.copy(phienBan = "19.2"), rb, olm)))
        assertNotEquals(a, bamDanhSach(listOf(yt.copy(iconBam = "ib2"), rb, olm)))   // bam tính theo iconBam
        assertNotEquals(a, bamDanhSach(listOf(yt, rb)))
        assertEquals(64, a.length)
    }

    @Test fun phanDoi_themMoiVaDoi_boDaGo() {
        val truoc = dauTheoKhoa(listOf(yt, rb))
        val d = tinhPhanDoi(truoc, listOf(yt, rb.copy(phienBan = "2.7"), olm))
        assertEquals(listOf("com.roblox.client", "vn.olm.app"), d.them.map { it.khoa })
        assertTrue(d.bo.isEmpty())
        val d2 = tinhPhanDoi(truoc, listOf(yt))
        assertTrue(d2.them.isEmpty()); assertEquals(listOf("com.roblox.client"), d2.bo)
        assertTrue(tinhPhanDoi(truoc, listOf(rb, yt)).rong)
        assertEquals(truoc, docDauJson(dauJson(truoc)))
        assertTrue(docDauJson("hỏng").isEmpty())
    }

    @Test fun thanGui_dungHopDong() {
        val du = thanGuiDu(listOf(yt), "b1")
        assertTrue(du.getBoolean("du")); assertEquals("b1", du.getString("bam"))
        val a = du.getJSONArray("ds").getJSONObject(0)
        assertEquals("com.google.android.youtube", a.getString("khoa")); assertEquals("com.google.android.youtube", a.getString("muc"))
        assertEquals("launcher", a.getString("nguon")); assertEquals("com.android.vending", a.getString("nhaPhatHanh"))
        assertEquals("19.1", a.getString("phienBan")); assertEquals("aWNvbg==", a.getString("icon"))
        assertFalse(AppMay("a.b", "a.b", "A").json().has("nhaPhatHanh"))
        val doi = thanGuiDoi("b1", "b2", PhanDoi(listOf(olm), listOf("com.roblox.client")))
        assertFalse(doi.getBoolean("du")); assertEquals("b1", doi.getString("bamTruoc")); assertEquals("b2", doi.getString("bam"))
        assertEquals("vn.olm.app", doi.getJSONArray("them").getJSONObject(0).getString("khoa"))
        assertEquals("com.roblox.client", doi.getJSONArray("bo").getString(0))
    }

    @Test fun docTinHieu_oGocPhanHoiNhip() {
        assertEquals(TinHieuDanhSach("abc", "r1"), docTinHieuDanhSach("""{"chinhSach":{},"danhSachApp":{"bam":"abc","yeuCau":"r1"}}"""))
        assertEquals(TinHieuDanhSach(null, null), docTinHieuDanhSach("""{"danhSachApp":{"bam":null,"yeuCau":null}}"""))
        assertNull(docTinHieuDanhSach("""{"chinhSach":{}}"""))   // máy chủ cũ
        assertNull(docTinHieuDanhSach(null)); assertNull(docTinHieuDanhSach("hỏng"))
    }

    @Test fun nenQuet_theoTinHieuChuKySuKien() {
        val now = 10_000_000L
        val g = DaGui("b1", mapOf("x" to "y"), "r1")
        val khop = TinHieuDanhSach("b1", "r1")
        assertFalse(nenQuet(khop, g, now - 60_000, 0, now))
        assertTrue(nenQuet(khop, g, 0, 0, now))                                         // vừa khởi động dịch vụ
        assertTrue(nenQuet(khop, g, now - CHU_KY_QUET_MS, 0, now))                      // 30 phút
        assertTrue(nenQuet(TinHieuDanhSach("b1", "r2"), g, now - 1_000, 0, now))         // Ba Mẹ bấm «Làm mới» ⇒ ngay
        assertFalse(nenQuet(TinHieuDanhSach("b9", "r1"), g, now - 60_000, 0, now))       // lệch bam: giãn cách
        assertTrue(nenQuet(TinHieuDanhSach("b9", "r1"), g, now - GIAN_CACH_LECH_MS, 0, now))
        assertTrue(nenQuet(TinHieuDanhSach(null, null), g, now - GIAN_CACH_LECH_MS, 0, now))
        assertFalse(nenQuet(khop, g, now - 60_000, now - 1_000, now))                    // gói vừa cài: chờ ổn định
        assertTrue(nenQuet(khop, g, now - 60_000, now - CHO_SU_KIEN_GOI_MS, now))
        assertTrue(nenQuet(null, DaGui(null, emptyMap(), null), 0, 0, now))             // vừa ghép
        assertFalse(nenQuet(null, g, now - 60_000, 0, now))                              // máy chủ cũ: chỉ theo chu kỳ

        // gửi lỗi ⇒ lùi dần, kể cả khi có yêu cầu «Làm mới» hay chưa gửi được lần nào
        val moi = TinHieuDanhSach("b1", "r2")
        assertFalse(nenQuet(moi, g, now - 5_000, 0, now, soLanLoi = 1))
        assertTrue(nenQuet(moi, g, now - 60_000, 0, now, soLanLoi = 1))
        assertFalse(nenQuet(null, DaGui(null, emptyMap(), null), now - 60_000, 0, now, soLanLoi = 2))
        assertTrue(nenQuet(null, DaGui(null, emptyMap(), null), now - 120_000, 0, now, soLanLoi = 2))
        assertEquals(CHU_KY_QUET_MS, choSauLoi(50))
        // sự kiện gói khi chưa gửi được lần nào vẫn được xét (không bị nhánh bam null nuốt)
        assertTrue(nenQuet(null, DaGui(null, emptyMap(), null), now - 1_000, now - CHO_SU_KIEN_GOI_MS, now))
    }

    @Test fun cachGui_duDoiHayThoi() {
        val cu = listOf(yt, rb)
        val bamCu = bamDanhSach(cu)
        val g = DaGui(bamCu, dauTheoKhoa(cu), "r1")
        val moi = listOf(yt, olm)
        val bamMoi = bamDanhSach(moi)
        // chưa gửi lần nào ⇒ đủ
        assertEquals(CachGui.Du, cachGui(null, DaGui(null, emptyMap(), null), moi, bamMoi))
        // yêu cầu «Làm mới» mới ⇒ đủ, kể cả khi không đổi
        assertEquals(CachGui.Du, cachGui(TinHieuDanhSach(bamCu, "r2"), g, cu, bamCu))
        // máy chủ không có bam ⇒ đủ
        assertEquals(CachGui.Du, cachGui(TinHieuDanhSach(null, "r1"), g, cu, bamCu))
        // máy chủ giữ bản lạ ⇒ đủ (phần đổi sẽ 409)
        assertEquals(CachGui.Du, cachGui(TinHieuDanhSach("la", null), g, moi, bamMoi))
        // không đổi ⇒ thôi
        assertEquals(CachGui.KhongGui, cachGui(TinHieuDanhSach(bamCu, "r1"), g, cu, bamCu))
        assertEquals(CachGui.KhongGui, cachGui(null, g, cu, bamCu))
        // máy chủ đã khớp bản mới ⇒ thôi
        assertEquals(CachGui.KhongGui, cachGui(TinHieuDanhSach(bamMoi, "r1"), g, moi, bamMoi))
        // đổi ⇒ phần đổi theo bam lần trước (máy chủ cũ vắng trường cũng vậy)
        for (t in listOf(TinHieuDanhSach(bamCu, "r1"), null)) {
            val c = cachGui(t, g, moi, bamMoi) as CachGui.Doi
            assertEquals(bamCu, c.bamTruoc)
            assertEquals(listOf("vn.olm.app"), c.phan.them.map { it.khoa })
            assertEquals(listOf("com.roblox.client"), c.phan.bo)
        }
    }

    /** Đường chặn hiện có: Ba Mẹ đặt «Chặn» một app trong danh sách thật ⇒ package vào chinhSach.ungDung.chan ⇒ bị chặn ở mọi trạng thái. */
    @Test fun appBaMeDatChan_biChanMoiTrangThai() {
        val s = """{"chinhSach":{"tz":"Asia/Ho_Chi_Minh","gioChoi":{"ngayThuong":[{"tu":"00:00","den":"23:59"}],"cuoiTuan":[{"tu":"00:00","den":"23:59"}],"tranNgayPhut":600},
          "ungDung":{"heThong":[],"hoc":[{"muc":"vn.olm.app","kieu":"app"}],"giaiTri":[{"muc":"com.google.android.youtube","kieu":"app"}],
            "chan":[{"muc":"com.roblox.client","kieu":"app"}]}},"danhSachApp":{"bam":"b","yeuCau":null}}"""
        val cs = docPhanHoiNhip(s).chinhSach
        val daCai = listOf(GoiCai("com.roblox.client", false), GoiCai("com.google.android.youtube", false), GoiCai("vn.olm.app", false))
        val now = Instant.parse("2026-10-21T11:00:00Z")
        val binhThuong = quyetDinh(cs, now, 0, daCai, null)
        assertEquals(TrangThai.BINH_THUONG, binhThuong.trangThai)
        assertEquals(setOf("com.roblox.client"), binhThuong.goiChan)
        // Ba Mẹ cho thêm giờ / mở khẩn cấp vẫn không mở app bị Chặn
        assertTrue("com.roblox.client" in quyetDinh(cs, now, 0, daCai, now.plusSeconds(1800)).goiChan)
        assertTrue("com.roblox.client" in quyetDinh(cs.copy(moKhanCapDen = now.plusSeconds(600)), now, 0, daCai, null).goiChan)
        assertTrue("com.roblox.client" in quyetDinh(cs, now, 600, daCai, null).goiChan)   // hết giờ
        // mục tạm thời loại «chan» không gỡ chặn
        assertTrue("com.roblox.client" in quyetDinh(cs.copy(mucTamThoi = listOf(MucTamThoi("com.roblox.client", "chan", null))), now, 0, daCai, null).goiChan)
    }

    /** Máy chủ hạ chữ thường `muc` ⇒ gói có chữ hoa vẫn phải bị chặn đúng tên gói thật trên máy. */
    @Test fun chanKhongPhanBietHoaThuong() {
        val cs = ChinhSach(ngayThuong = listOf(Khung("00:00", "23:59")), cuoiTuan = listOf(Khung("00:00", "23:59")), tranNgayPhut = 600,
            chan = listOf(MucChung("com.ucmobile.intl", "app")), giaiTri = listOf(MucChung("com.supercell.clashofclans", "app")))
        val daCai = listOf(GoiCai("com.UCMobile.intl", false), GoiCai("com.Supercell.ClashOfClans", false))
        val now = Instant.parse("2026-10-21T11:00:00Z")
        assertEquals(setOf("com.UCMobile.intl"), quyetDinh(cs, now, 0, daCai, null).goiChan)   // game đã xếp giải trí ⇒ không «chưa xếp»
        assertEquals(setOf("com.UCMobile.intl", "com.Supercell.ClashOfClans"), quyetDinh(cs, now, 600, daCai, null).goiChan)
        assertEquals(2, phutGiaiTri(mapOf("com.Supercell.ClashOfClans" to 120_000L), setOf("com.supercell.clashofclans")))
        assertEquals(setOf("com.UCMobile.intl"), truGoi(setOf("com.UCMobile.intl", "com.Supercell.ClashOfClans"), setOf("com.supercell.clashofclans")))
    }

    @Test fun icon_chiGuiKhiMoiDoiHoacThieu() {
        val a = yt.copy(iconBam = "i1"); val b = rb.copy(icon = "Ymlu", iconBam = "i2"); val c = olm.copy(icon = "b2xt", iconBam = "i3")
        val ds = listOf(a, b, c)
        // lần đầu: gửi icon cho mọi app có icon
        assertEquals(listOf("aWNvbg==", "Ymlu", "b2xt"), chonIcon(ds, emptyMap(), emptySet()).map { it.icon })
        // máy chủ đã có icon a, b cùng băm; c đổi icon ⇒ chỉ c gửi icon, a/b vẫn giữ iconBam
        val g = chonIcon(ds, mapOf(a.khoa to "i1", b.khoa to "i2", c.khoa to "cu"), emptySet())
        assertEquals(listOf(null, null, "b2xt"), g.map { it.icon })
        assertEquals(listOf("i1", "i2", "i3"), g.map { it.iconBam })
        assertFalse(g[0].json().has("icon")); assertEquals("i1", g[0].json().getString("iconBam"))
        // máy chủ báo thiếu icon b ⇒ gửi icon b dù cùng băm
        assertEquals(listOf(null, "Ymlu", null), chonIcon(ds, mapOf(a.khoa to "i1", b.khoa to "i2", c.khoa to "i3"), setOf(b.khoa)).map { it.icon })
        // icon quá trần ⇒ bỏ cả icon lẫn iconBam
        val to = chuanDanhSach(listOf(c.copy(icon = "A".repeat(TOI_DA_ICON_B64 + 1))), minh).single()
        assertNull(to.icon); assertNull(to.iconBam)
        assertEquals("b2xt", chuanDanhSach(listOf(c), minh).single().icon)
    }

    @Test fun thieuIcon_docLuuVaGuiBu() {
        val r = org.json.JSONObject("""{"ok":true,"bam":"x","soApp":3,"thieuIcon":["com.roblox.client",""]}""")
        assertEquals(setOf("com.roblox.client"), docThieuIcon(r))
        assertTrue(docThieuIcon(org.json.JSONObject("""{"ok":true}""")).isEmpty()); assertTrue(docThieuIcon(null).isEmpty())
        assertEquals(setOf("a", "b"), docDsJson(dsJson(setOf("b", "a")))); assertTrue(docDsJson("hỏng").isEmpty())

        val a = yt.copy(iconBam = "i1"); val b = rb.copy(icon = "Ymlu", iconBam = "i2")
        // sau gửi: b vừa gửi icon nhưng máy chủ báo thiếu ⇒ không ghi nhận; a đã có từ trước cùng băm ⇒ giữ
        assertEquals(mapOf(a.khoa to "i1"), iconSauGui(listOf(a, b), setOf(b.khoa), mapOf(a.khoa to "i1"), setOf(b.khoa)))
        assertEquals(mapOf(a.khoa to "i1", b.khoa to "i2"), iconSauGui(listOf(a, b), setOf(b.khoa), mapOf(a.khoa to "i1"), emptySet()))
        assertEquals(emptyMap<String, String>(), iconSauGui(listOf(a), emptySet(), mapOf(a.khoa to "cu"), emptySet()))   // băm đổi mà chưa gửi icon

        // lượt sau: không đổi gì nhưng có thieuIcon ⇒ quét ngay và gửi phần đổi chỉ gồm app thiếu, kèm icon
        val ds = listOf(a, b); val bam = bamDanhSach(ds)
        val g = DaGui(bam, dauTheoKhoa(ds), "r1", mapOf(a.khoa to "i1"), setOf(b.khoa))
        assertTrue(nenQuet(TinHieuDanhSach(bam, "r1"), g, 10_000_000L - 1_000, 0, 10_000_000L))
        val c = cachGui(TinHieuDanhSach(bam, "r1"), g, ds, bam) as CachGui.Doi
        assertEquals(bam, c.bamTruoc)
        assertEquals(listOf(b.khoa), c.phan.them.map { it.khoa }); assertTrue(c.phan.bo.isEmpty())
        assertEquals("Ymlu", chonIcon(c.phan.them, g.iconDaGui, g.thieuIcon).single().icon)
        // app thiếu icon đã bị gỡ / không có icon ⇒ thôi
        assertEquals(CachGui.KhongGui, cachGui(TinHieuDanhSach(bam, "r1"), g.copy(thieuIcon = setOf("da.go")), ds, bam))
    }
}
