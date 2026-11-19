package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/** #422 «Xin thêm app / web»: kiểm địa chỉ web, thân xin-duyet có `kieu`, lưới app, chữ nút. */
class XinThemTest {
    @Test fun diaChiWebHopLe() {
        assertEquals("scratch.mit.edu", chuanDiaChiWeb("scratch.mit.edu"))
        assertEquals("scratch.mit.edu", chuanDiaChiWeb("  https://Scratch.MIT.edu/projects/123?x=1#a "))
        assertEquals("khanacademy.org", chuanDiaChiWeb("www.khanacademy.org"))
        assertEquals("vnexpress.net", chuanDiaChiWeb("http://vnexpress.net:443/"))
        assertEquals("olm.vn", chuanDiaChiWeb("olm.vn."))
        assertEquals("xn--bcher-kva.example", chuanDiaChiWeb("xn--bcher-kva.example"))
        assertEquals("xn--bcher-kva.example", chuanDiaChiWeb("Bücher.example"))
        assertEquals("www.com", chuanDiaChiWeb("www.com"))
    }

    @Test fun diaChiWebSai() {
        assertNull(chuanDiaChiWeb(""))
        assertNull(chuanDiaChiWeb("Minecraft"))
        assertNull(chuanDiaChiWeb("trang con thich"))
        assertNull(chuanDiaChiWeb("scratch.mit.edu hay"))
        assertNull(chuanDiaChiWeb("192.168.1.1"))
        assertNull(chuanDiaChiWeb("-abc.com"))
        assertNull(chuanDiaChiWeb("abc..com"))
        assertNull(chuanDiaChiWeb("https://"))
    }

    @Test fun thanApp() {
        val t = thanXinDuyet("com.roblox.client", "Roblox", "  Con chơi với bạn\n ạ  ", KieuXin.APP)
        assertEquals("com.roblox.client", t.getString("muc"))
        assertEquals("Roblox", t.getString("ten"))
        assertEquals("Con chơi với bạn ạ", t.getString("lyDo"))
        assertEquals("app", t.getString("kieu"))
    }

    @Test fun thanWebBoTenTrungVaLoiNhanRong() {
        val t = thanXinDuyet("scratch.mit.edu", "scratch.mit.edu", "   ", KieuXin.WEB)
        assertEquals("web", t.getString("kieu"))
        assertFalse(t.has("ten")); assertFalse(t.has("lyDo"))
    }

    @Test fun thanLuongCuKhongCoKieuVaCatLoiNhan() {
        val t = thanXinDuyet("com.x", null, "a".repeat(150), null)
        assertFalse(t.has("kieu")); assertFalse(t.has("ten"))
        assertEquals(100, t.getString("lyDo").length)
    }

    @Test fun luoiApp() {
        val ds = locAppTrenMay(listOf(AppTrenMay("vn.aiilab.aiigrow.con", "AiiGrow Con"), AppTrenMay("com.z", "zalo"),
            AppTrenMay("com.y", "YouTube"), AppTrenMay("com.y", "YouTube 2"), AppTrenMay("", "?")), "vn.aiilab.aiigrow.con")
        assertEquals(listOf("com.y", "com.z"), ds.map { it.goi })
    }

    @Test fun chuNut() {
        assertEquals("Xin Ba Mẹ thêm YouTube", chuNutXinThem(KieuXin.APP, "YouTube"))
        assertEquals("Chọn một app để xin", chuNutXinThem(KieuXin.APP, null))
        assertEquals("Xin Ba Mẹ mở trang này", chuNutXinThem(KieuXin.WEB, null))
    }
}
