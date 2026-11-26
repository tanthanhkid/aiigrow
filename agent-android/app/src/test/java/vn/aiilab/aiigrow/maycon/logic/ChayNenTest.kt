package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChayNenTest {
    @Test fun hangDonNen() {
        for (h in listOf("Xiaomi", "OPPO", "vivo", "realme", "HUAWEI", " Redmi ")) assertTrue(h, canNhacTuKhoiChay(h))
        for (h in listOf("Google", "samsung", "motorola", "", null)) assertFalse("$h", canNhacTuKhoiChay(h))
    }

    /** #686: lời xin app chờ lâu không bị hỏi mỗi nhịp (10 lời xin × mỗi phút × 24 giờ). */
    @Test fun nhipHoiXinApp() {
        val p = 60_000L
        assertTrue(nenHoiXinApp(5 * p, 1 * p))
        assertTrue(nenHoiXinApp(60 * p, null))
        assertFalse(nenHoiXinApp(60 * p, 3 * p))
        assertTrue(nenHoiXinApp(60 * p, 10 * p))
    }
}
