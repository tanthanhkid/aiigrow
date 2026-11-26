package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GhepGoiTest {
    @Test fun phanLoaiLoi() {
        // gói sai / đã dùng / sai loại máy / hết hạn / thân sai ⇒ vĩnh viễn
        for (m in listOf(400, 404, 409, 410)) assertTrue("$m", loiGhepGoiVinhVien(m))
        // mất mạng, máy chủ lỗi, hết giờ, quá nhanh ⇒ thử lại
        for (m in listOf(null, 500, 502, 503, 408, 429)) assertFalse("$m", loiGhepGoiVinhVien(m))
    }

    @Test fun luiDan() {
        assertEquals(listOf(0L, 5_000L, 10_000L, 20_000L, 40_000L, 80_000L, 160_000L, 300_000L, 300_000L, 300_000L),
            listOf(0, 1, 2, 3, 4, 5, 6, 7, 8, 40).map { choGhepGoiMs(it) })
    }

    /** Vòng nhịp 5 giây, máy chủ trả lỗi tạm mãi: 60 giây đầu chỉ 4 lần gọi (trước #707: 13), một ngày ≤ ~300 lần (trước: 17.280). */
    @Test fun vong5GiayKhongGoiDon() {
        fun dem(tongMs: Long): Int {
            var t = ThuGhepGoi(); var goi = 0
            for (now in 0L..tongMs step 5_000) if (t.nenThu(now)) { goi++; t = t.sauLoiTam(now) }
            return goi
        }
        assertEquals(4, dem(60_000))
        assertTrue(dem(24 * 3600_000L) < 300)
    }

    @Test fun nhatKyKhongLap() {
        var t = ThuGhepGoi(); val ghi = mutableListOf<Int>()
        repeat(30) { t = t.sauLoiTam(0); if (t.nenGhiNhatKy) ghi += t.lanLoi }
        assertEquals(listOf(1, 10, 20, 30), ghi)
    }

    @Test fun cuaGoiMotLuot() {
        val c = CuaGoi()
        assertTrue(c.xin(false))
        assertTrue(c.dangGoi)
        assertFalse(c.xin(false))          // đang gọi (mạng treo) ⇒ không mở lượt thứ hai
        assertFalse(c.xong())              // không có lượt ép bị gác
        assertFalse(c.dangGoi)
        assertTrue(c.xin(false))
        assertFalse(c.xin(true))           // Ba Mẹ đổi gì trong lúc lượt đang chạy ⇒ nhớ
        assertTrue(c.xong())               // ⇒ gọi lại ngay khi xong
        assertTrue(c.xin(false))
        assertFalse(c.xong())
    }
}
