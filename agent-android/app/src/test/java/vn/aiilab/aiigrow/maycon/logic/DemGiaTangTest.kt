package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Test

class DemGiaTangTest {
    private val ds = listOf(
        SuKienDung("a", LoaiSuKien.MO, 1_000), SuKienDung("a", LoaiSuKien.DONG, 5_000),
        SuKienDung("b", LoaiSuKien.MO, 6_000), SuKienDung("b", LoaiSuKien.TAT_MAN, 9_000),
        SuKienDung("c", LoaiSuKien.MO, 12_000),
    )

    @Test fun giaTangBangDemMotLanTaiMoiMocGio() {
        val bo = BoDemGiaTang()
        val tuList = ArrayList<Long>()
        for (now in listOf(2_000L, 5_500L, 7_000L, 10_000L, 13_000L, 20_000L)) {
            val kq = bo.capNhat(0, now) { tu, den -> tuList.add(tu); ds.filter { it.luc in tu until den } }
            assertEquals("now=$now", demTienCanh(ds, 0, now), kq)
        }
        assertEquals("mỗi lần chỉ đọc từ mốc trước, không từ 0", true, tuList.drop(1).all { it > 0 })
    }

    @Test fun appMoTuTruocDauNgayVaSangNgayDatLai() {
        val bo = BoDemGiaTang()
        val e = listOf(SuKienDung("a", LoaiSuKien.DONG, 3_000))
        assertEquals(demTienCanh(e, 0, 4_000), bo.capNhat(0, 4_000) { tu, den -> e.filter { it.luc in tu until den } })
        assertEquals(emptyMap<String, Long>(), bo.capNhat(10_000, 12_000) { _, _ -> emptyList() })
    }

    @Test fun cacheCoHan() {
        var dem = 0
        val c = CacheCoHan<Int>(1_000)
        assertEquals(1, c.lay(0) { ++dem }); assertEquals(1, c.lay(999) { ++dem })
        assertEquals(2, c.lay(1_000) { ++dem })
        c.huy(); assertEquals(3, c.lay(1_001) { ++dem })
    }

    @Test fun suKienCungMsVaSuKienToiTre() {
        val e = listOf(SuKienDung("a", LoaiSuKien.MO, 1_000), SuKienDung("a", LoaiSuKien.DONG, 5_000), SuKienDung("b", LoaiSuKien.MO, 5_000))
        val bo = BoDemGiaTang()
        var co = listOf(e[0], e[1])                      // MO b cùng ms tới sau
        bo.capNhat(0, 6_000) { tu, den -> co.filter { it.luc in tu until den } }
        co = e
        val kq = bo.capNhat(0, 7_000) { tu, den -> co.filter { it.luc in tu until den } }
        assertEquals(demTienCanh(e, 0, 7_000), kq)
        // sự kiện tới trễ (luc < mốc) được bù sau nhịp đếm lại đầy đủ
        val tre = listOf(SuKienDung("a", LoaiSuKien.MO, 1_000), SuKienDung("a", LoaiSuKien.DONG, 2_000))
        val b2 = BoDemGiaTang()
        b2.capNhat(0, 10_000) { _, _ -> listOf(SuKienDung("x", LoaiSuKien.MO, 9_000)) }
        val k2 = b2.capNhat(0, 10_000 + BoDemGiaTang.HAN_DAY_DU) { tu, den -> (tre + SuKienDung("x", LoaiSuKien.MO, 9_000)).filter { it.luc in tu until den } }
        assertEquals(demTienCanh(tre + SuKienDung("x", LoaiSuKien.MO, 9_000), 0, 10_000 + BoDemGiaTang.HAN_DAY_DU), k2)
    }
}
