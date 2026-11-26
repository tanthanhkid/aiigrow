package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class XinChoTest {
    private val gio = 3600_000L

    @Test fun xetXinVay() {
        assertEquals(XetXinVayCho.GUI, xetXinVayCho(0, "be1", "be1", 23 * gio))
        assertEquals(XetXinVayCho.GUI, xetXinVayCho(0, "", null, gio))                 // máy riêng: "" == không rõ bé
        assertEquals(XetXinVayCho.QUA_HAN, xetXinVayCho(0, "be1", "be1", 25 * gio))
        assertEquals(XetXinVayCho.DOI_NGUOI, xetXinVayCho(0, "be1", "be2", gio))
        assertEquals(XetXinVayCho.DOI_NGUOI, xetXinVayCho(0, "be1", "be2", 25 * gio))   // quá hạn của bé trước: không báo bé đang dùng
    }

    /** #684: lời xin vay thứ hai lúc mất mạng thay lời xin đầu — Con được nói rõ, không phải «Đã lưu» cả hai. */
    @Test fun cauLuu() {
        assertEquals("Đã lưu lời xin vay 10 sao. Có mạng là gửi Ba Mẹ ngay!", cauLuuXinVay(10, null))
        assertEquals("Đã thay lời xin vay 10 sao bằng lời xin 30 sao. Có mạng là gửi Ba Mẹ ngay!", cauLuuXinVay(30, 10))
    }

    @Test fun cauKhongGui() {
        assertEquals("Lời xin vay 15 sao lưu lúc mất mạng chưa tới Ba Mẹ: Đã có lời xin đang chờ. Con xin lại nhé.",
            cauXinVayKhongGui(15, "Đã có lời xin đang chờ."))
        assertEquals("Lời xin vay 15 sao lưu lúc mất mạng chưa tới Ba Mẹ (quá 24 giờ chưa có mạng). Con xin lại nhé.", cauXinVayKhongGui(15, null))
    }

    /** #686: lời xin app / web lưu bền — trùng id thay, quá 24 giờ bỏ, tối đa 10. */
    @Test fun dsXinApp() {
        var ds = emptyList<XinAppCho>()
        ds = themXinAppCho(ds, XinAppCho("a", "YouTube", 0), 0)
        ds = themXinAppCho(ds, XinAppCho("b", "scratch.mit.edu", gio), gio)
        ds = themXinAppCho(ds, XinAppCho("a", "YouTube", 2 * gio), 2 * gio)
        assertEquals(listOf("b", "a"), ds.map { it.id })
        assertEquals(ds, docXinAppCho(jsonXinAppCho(ds)))
        assertEquals(listOf("a"), conHanXinAppCho(ds, 25 * gio + 1).map { it.id })
        for (i in 0 until 15) ds = themXinAppCho(ds, XinAppCho("x$i", "app $i", 3 * gio), 3 * gio)
        assertEquals(XIN_APP_CHO_TOI_DA, ds.size)
        assertEquals("x14", ds.last().id)
        assertTrue(docXinAppCho("hỏng").isEmpty())
        assertTrue(docXinAppCho(null).isEmpty())
        assertEquals("be1", docXinAppCho(jsonXinAppCho(listOf(XinAppCho("c", "Roblox", 0, "be1")))).single().con)
    }
}
