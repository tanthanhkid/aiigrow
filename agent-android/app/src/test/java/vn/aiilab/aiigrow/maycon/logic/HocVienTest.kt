package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HocVienTest {
    private val tinJson = JSONObject("""{"bay":"2026-10-25T10:00:00Z","ds":[
        {"id":"e1","loai":"giao_nhiem_vu","tieu":"Nhiệm vụ mới từ Ba Mẹ","noi":"«Đọc sách» · 10 điểm","luc":"2026-10-25T09:59:00Z"},
        {"id":"e2","loai":"loi_khen","tieu":"Lời nhắn từ Ba Mẹ","noi":"Giỏi lắm","luc":"2026-10-25T09:58:00Z"},
        {"loai":"x"}]}""")

    @Test fun tinMoi_lanDauKhongBao_lanSauChiBaoTinChuaThay() {
        val (ds, bay) = docTin(tinJson)
        assertEquals(2, ds.size); assertEquals("2026-10-25T10:00:00Z", bay)
        val (bao1, thay1) = locTinMoi(ds, emptyList(), lanDau = true)
        assertTrue(bao1.isEmpty()); assertEquals(listOf("e1", "e2"), thay1)
        val them = ds + Tin("e3", "duyet_nhiem_vu", "Ba Mẹ đã duyệt", "+5", "t")
        val (bao2, thay2) = locTinMoi(them, thay1, lanDau = false)
        assertEquals(listOf("e3"), bao2.map { it.id }); assertEquals(3, thay2.size)
        assertEquals("nhiem-vu", duongChoTin(ds[0])); assertEquals("nha", duongChoTin(ds[1]))
        assertEquals(200, locTinMoi((1..250).map { Tin("t$it", "x", "", "", "") }, emptyList(), false).second.size)
    }

    @Test fun trangThaiXin() {
        assertEquals(TrangThaiXin.CHO, docTrangThaiXin(JSONObject("""{"status":"cho","trangThai":"cho"}""")))
        assertEquals(TrangThaiXin.DUOC, docTrangThaiXin(JSONObject("""{"status":"duoc","trangThai":"da_thuc_thi"}""")))
        assertEquals(TrangThaiXin.HET_HAN, docTrangThaiXin(JSONObject("""{"status":"tu_choi","trangThai":"het_han"}""")))
        assertEquals(TrangThaiXin.TU_CHOI, docTrangThaiXin(JSONObject("""{"status":"tu_choi","trangThai":"tu_choi"}""")))
        assertEquals(TrangThaiXin.DUOC, docTrangThaiXin(JSONObject("""{"status":"duoc"}""")))   // máy chủ cũ chỉ có status
        assertTrue(cauXin(TrangThaiXin.DUOC, 30).contains("30 phút"))
    }

    @Test fun choiDiem_xetVaNhip() {
        val cs = ChinhSach(giaiTri = listOf(MucChung("com.roblox.client", "app"), MucChung("Game.exe", "app"), MucChung("com.khong.cai", "app")))
        assertEquals(listOf("com.roblox.client"), appChoiDiem(cs, listOf("com.ROBLOX.client", "vn.olm.app")))
        val x = docXet(JSONObject("""{"duoc":true,"phutToiDa":25,"soDu":40,"cau":null}"""))
        assertTrue(x.duoc); assertEquals(25, x.phutToiDa); assertEquals("", x.cau)
        assertTrue(cauXetDuoc(x, "Roblox").contains("25 phút"))
        assertEquals("Con chưa đủ điểm", docXet(JSONObject("""{"duoc":false,"lyDo":"het_diem","cau":"Con chưa đủ điểm"}""")).cau)
        assertTrue(phienKetThuc(JSONObject("""{"trangThai":"ket_thuc"}"""))); assertFalse(phienKetThuc(JSONObject("""{"trangThai":"tam"}""")))
        assertTrue(dangDungPhien("com.Roblox.client", setOf("com.roblox.client"))); assertFalse(dangDungPhien("vn.olm.app", setOf("com.roblox.client")))
        assertFalse(dangDungPhien(null, setOf("a.b")))
        assertEquals("b.c", appTienCanh(listOf(SuKienDung("a.b", LoaiSuKien.MO, 1), SuKienDung("b.c", LoaiSuKien.MO, 2))))
        assertNull(appTienCanh(listOf(SuKienDung("a.b", LoaiSuKien.MO, 1), SuKienDung("x", LoaiSuKien.TAT_MAN, 2))))
        assertNull(appTienCanh(listOf(SuKienDung("a.b", LoaiSuKien.MO, 1), SuKienDung("a.b", LoaiSuKien.DONG, 2))))
    }

    @Test fun duongTre_vaCungGoc() {
        assertEquals("nhiem-vu", duongTre("nhiem-vu")); assertEquals("nv/abc_1", duongTre("nv/abc_1"))
        assertEquals("nha", duongTre("../admin")); assertEquals("nha", duongTre(null)); assertEquals("nha", duongTre("nv/a?b"))
        assertTrue(cungMayChu("https://aiigrow.aiilab.vn/tre/nha?phien=x", "https://aiigrow.aiilab.vn"))
        assertTrue(cungMayChu("https://AIIGROW.aiilab.vn:443/api", "https://aiigrow.aiilab.vn/"))
        assertFalse(cungMayChu("https://youtube.com/", "https://aiigrow.aiilab.vn"))
        assertFalse(cungMayChu("http://aiigrow.aiilab.vn/", "https://aiigrow.aiilab.vn"))
        assertFalse(cungMayChu("https://aiigrow.aiilab.vn.evil.com/", "https://aiigrow.aiilab.vn"))
        assertFalse(cungMayChu("javascript:alert(1)", "https://aiigrow.aiilab.vn"))
    }
}
