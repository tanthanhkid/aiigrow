package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** Đọc chính sách App & web (#258/#262): không còn lưới web cấm cứng; kết quả lời xin app «Ba Mẹ đã thêm / chưa thêm». */
class QuyGioTest {
    private fun vn(gio: String, ngay: String = "2026-10-21") = Instant.parse("${ngay}T${gio}:00+07:00")   // thứ Tư

    private val cs = ChinhSach(
        tz = "Asia/Ho_Chi_Minh", ngayThuong = listOf(Khung("17:00", "21:00")), ngu = Khung("21:30", "06:30"), tranNgayPhut = 60,
        heThong = listOf("com.android.settings"),
        hoc = listOf(MucChung("vn.olm.app", "app")),
        giaiTri = listOf(MucChung("com.google.android.youtube", "app")),
        chan = listOf(MucChung("com.android.chrome", "app")),
    )
    private val daCai = listOf(
        GoiCai("com.google.android.youtube", false), GoiCai("com.android.chrome", true), GoiCai("vn.olm.app", false), GoiCai("com.la.game", false),
    )

    @Test fun docChinhSachBoWebLuonChan() {
        // máy chủ cũ còn gửi webLuonChan ⇒ agent bỏ qua, chỉ theo luật Ba Mẹ
        val c = docChinhSach(JSONObject("""{"ungDung":{"chuaXep":"cho_phep","webLuonChan":["pornhub.com"],"chan":[{"muc":"tiktok.com","kieu":"web"}]}}"""))
        assertTrue(c.chuaXepChoPhep)
        assertEquals(listOf("tiktok.com"), webChan(c))
        assertEquals(emptyList<String>(), webChan(docChinhSach(JSONObject("""{"ungDung":{"webLuonChan":["x.com"]}}"""))))
    }

    @Test fun moHetChoAppChuaXep() {
        val q = quyetDinh(cs.copy(chuaXepChoPhep = true), vn("10:00"), 0, daCai, null)
        assertFalse("com.la.game" in q.goiChan)
        assertTrue(q.goiChuaXep.isEmpty())
        // «Theo danh sách» (mặc định): app lạ tạm dừng + Con xin Ba Mẹ mở
        assertTrue("com.la.game" in quyetDinh(cs, vn("18:00"), 0, daCai, null).goiChan)
    }

    @Test fun ketQuaXinApp() {
        val da = docKetQuaXinApp(JSONObject("""{"ketQua":"da_them","nhom":"tinh_phut","muc":"com.roblox.client"}"""))
        assertEquals(LoaiKetQuaXin.DA_THEM, da.loai)
        val (t, p, _) = chuKetQuaXinApp(da, "Roblox")
        assertEquals("Ba Mẹ đã thêm Roblox", t); assertEquals("Tính phút", p)
        assertEquals("Không tính phút", chuKetQuaXinApp(KetQuaXinApp(LoaiKetQuaXin.DA_THEM, "khong_tinh_phut"), "YouTube").second)
        val chua = docKetQuaXinApp(JSONObject("""{"ketQua":"chua_them","status":"tu_choi"}"""))
        assertEquals(LoaiKetQuaXin.CHUA_THEM, chua.loai)
        val c = chuKetQuaXinApp(chua, "YouTube")
        assertEquals("Ba Mẹ chưa thêm YouTube", c.first)
        assertEquals("Ba Mẹ chưa thêm YouTube lúc này. Con xin lại sau được nhé", c.third)
        assertEquals(LoaiKetQuaXin.CHO, docKetQuaXinApp(JSONObject("""{"ketQua":"cho"}""")).loai)
        assertEquals(LoaiKetQuaXin.DA_THEM, docKetQuaXinApp(JSONObject("""{"ketQua":"mo_tam"}""")).loai)
        assertEquals(LoaiKetQuaXin.HET_HAN, docKetQuaXinApp(JSONObject("""{"ketQua":"huy"}""")).loai)
        assertNull(da.nhom.takeIf { it == "x" })
    }
}

class LuatWebTest {
    private val cs = ChinhSach(hoc = listOf(MucChung("khanacademy.org", "web"), MucChung("vn.olm.app", "app")),
        giaiTri = listOf(MucChung("YouTube.com", "web")), cheDo = "theo_danh_sach")
    @Test fun theoDanhSachChanMoiWebTruWebTrongDanhSach() {
        val w = luatWeb(cs, listOf("aiigrow.vn"))
        assertEquals(listOf("*"), w.chan)
        assertEquals(listOf("khanacademy.org", "youtube.com", "aiigrow.vn"), w.cho)
    }
    @Test fun moHetKhongDatGi() {
        assertEquals(LuatWeb(emptyList(), emptyList()), luatWeb(cs.copy(cheDo = "mo_het"), listOf("aiigrow.vn")))
        assertEquals(LuatWeb(emptyList(), emptyList()), luatWeb(cs.copy(chuaXepChoPhep = true)))
    }
    @Test fun tenMienMayChu() {
        assertEquals("aiigrow.vn", tenMienMayChu("https://aiigrow.vn:443/x")); assertNull(tenMienMayChu("khong hop le"))
    }
}
