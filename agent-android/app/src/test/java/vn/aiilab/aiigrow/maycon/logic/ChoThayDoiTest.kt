package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ChoThayDoiTest {
    @Test fun docKetQua() {
        assertEquals(KetQuaCho(12, true, false), docKetQuaCho("""{"phienBanThayDoi":12,"doi":true}"""))
        assertTrue(docKetQuaCho("""{"phienBanThayDoi":3,"doi":false,"quaTai":true}""")!!.quaTai)
        assertNull(docKetQuaCho("""{"doi":true}"""))
        assertNull(docKetQuaCho("không phải json"))
    }

    @Test fun duong() {
        assertEquals("cho-thay-doi", duongChoThayDoi(null))
        assertEquals("cho-thay-doi?ver=7", duongChoThayDoi(7))
    }

    @Test fun luiDanKhiLoi() {
        assertEquals(listOf(2_000L, 4_000L, 8_000L, 16_000L, 30_000L, 30_000L), listOf(1, 2, 3, 4, 5, 9).map { choLaiMs(it, null, 0) })
    }

    @Test fun doiThiHoiLaiNgay() {
        assertEquals(0L, choLaiMs(0, KetQuaCho(2, true), 100))        // có thay đổi ⇒ vòng lại ngay
        assertEquals(0L, choLaiMs(0, KetQuaCho(2, false), 25_000))    // giữ đủ lâu rồi hết hạn ⇒ vòng lại ngay
        assertEquals(5_000L, choLaiMs(0, KetQuaCho(2, false), 300))   // trả nhanh mà không đổi ⇒ nghỉ 5 giây
        assertEquals(5_000L, choLaiMs(0, KetQuaCho(2, false, true), 30_000))   // quá tải ⇒ lùi
    }
}
