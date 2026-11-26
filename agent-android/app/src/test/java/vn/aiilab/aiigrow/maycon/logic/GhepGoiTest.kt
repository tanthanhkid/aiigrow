package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GhepGoiTest {
    @Test fun phanLoaiLoi() {
        // máy chủ AiiGrow: gói sai / đã dùng / sai loại máy / hết hạn ⇒ vĩnh viễn
        assertTrue(loiGhepGoiVinhVien(404, "ma_sai"))
        assertTrue(loiGhepGoiVinhVien(409, "ma_da_dung"))
        assertTrue(loiGhepGoiVinhVien(409, "sai_nen_tang"))
        assertTrue(loiGhepGoiVinhVien(410, "ma_het_han"))
        // 4xx không phải của máy chủ (tường lửa / proxy / đang triển khai) ⇒ tạm, giữ gói
        assertFalse(loiGhepGoiVinhVien(403, "http_403"))
        assertFalse(loiGhepGoiVinhVien(404, "http_404"))
        assertFalse(loiGhepGoiVinhVien(401, "http_401"))
        // máy chủ lỗi, hết giờ, quá nhanh ⇒ tạm
        for (m in listOf(500, 502, 503, 408, 429)) assertFalse("$m", loiGhepGoiVinhVien(m, "http_$m"))
    }

    @Test fun luiDan() {
        assertEquals(listOf(0L, 5_000L, 10_000L, 20_000L, 40_000L, 80_000L, 160_000L, 300_000L, 300_000L, 300_000L),
            listOf(0, 1, 2, 3, 4, 5, 6, 7, 8, 40).map { choGhepGoiMs(it) })
    }

    /** Vòng nhịp 5 giây, máy chủ trả lỗi tạm mãi: 60 giây đầu chỉ 4 lần gọi (trước #707: 13), một ngày ≤ ~300 lần (trước: 17.280).
     *  `treoMs` = mỗi lời gọi treo bao lâu rồi mới lỗi: lùi tính từ lúc LỖI ⇒ mạng treo 35 giây vẫn có khoảng nghỉ giữa hai lần gọi. */
    @Test fun vong5GiayKhongGoiDon() {
        fun dem(tongMs: Long, treoMs: Long = 0): List<Long> {
            var t = ThuGhepGoi(); val goi = mutableListOf<Long>(); var ranh = 0L
            for (now in 0L..tongMs step 5_000) if (now >= ranh && t.nenThu(now)) { goi += now; ranh = now + treoMs; t = t.sauLoiTam(now + treoMs) }
            return goi
        }
        assertEquals(4, dem(60_000).size)
        assertTrue(dem(24 * 3600_000L).size < 300)
        val treo = dem(10 * 60_000, treoMs = 35_000)
        assertEquals(listOf(0L, 40_000L, 85_000L, 140_000L), treo.take(4))   // nghỉ 5, 10, 20 giây SAU mỗi lần treo
    }

    @Test fun nhatKyKhongLap() {
        var t = ThuGhepGoi(); val ghi = mutableListOf<Int>()
        repeat(30) { t = t.sauLoiTam(0); if (t.nenGhiNhatKy) ghi += t.lanLoi }
        assertEquals(listOf(1, 10, 20, 30), ghi)
    }

    @Test fun cuaGoiMotLuot() {
        val c = CuaGoi()
        assertTrue(c.xin(false))
        assertFalse(c.xin(false))          // đang gọi (mạng treo) ⇒ không mở lượt thứ hai
        assertFalse(c.xong())              // không có lượt ép bị gác
        assertTrue(c.xin(false))
        assertFalse(c.xin(true))           // Ba Mẹ đổi gì trong lúc lượt đang chạy ⇒ nhớ
        assertTrue(c.xong())               // ⇒ gọi lại ngay khi xong
        assertTrue(c.xin(false))
        assertFalse(c.xong())
    }

    /** #685: thân ghép mang maMay hợp lệ (máy chủ nhận ra lần thử lại của chính máy này), sai thì bỏ khỏi thân. */
    @Test fun maMayTrongThanGhep() {
        val mm = taoMaMay(ByteArray(16) { it.toByte() })
        assertEquals("000102030405060708090a0b0c0d0e0f", mm)
        assertEquals(mm, maMayHopLe(mm))
        assertEquals(mm, maMayHopLe(" " + mm.uppercase() + " "))
        assertNull(maMayHopLe("abc"))                 // < 16
        assertNull(maMayHopLe("z".repeat(32)))
        assertNull(maMayHopLe(null))
        assertEquals(mm, thanGhep("123456", "Pixel", mm).getString("maMay"))
        assertEquals(mm, thanGhepToken("goi", "Pixel", mm).getString("maMay"))
        assertFalse(thanGhep("123456", "Pixel", "hong").has("maMay"))
        assertFalse(thanGhepToken("goi", "Pixel").has("maMay"))
    }

    /** #685: mã 6 số lỗi đường truyền / 5xx ⇒ thử lại tối đa 2 lần trong ~40 giây; câu máy chủ (404/409/410) ⇒ báo ngay. */
    @Test fun thuLaiGhepBangMa() {
        assertEquals(listOf(1_500L, 4_000L, null), (1..3).map { choThuLaiGhepMs(it, 0) })
        assertNull(choThuLaiGhepMs(1, 41_000))
        for (h in listOf(null, 500, 502, 504, 408, 429)) assertTrue("$h", loiGhepNenThuLai(h))
        for (h in listOf(400, 401, 404, 409, 410)) assertFalse("$h", loiGhepNenThuLai(h))
    }
}
