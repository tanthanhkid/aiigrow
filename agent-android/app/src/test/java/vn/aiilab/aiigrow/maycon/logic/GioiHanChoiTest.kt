package vn.aiilab.aiigrow.maycon.logic

import org.json.JSONObject
import vn.aiilab.aiigrow.maycon.HienThi
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** #302 mục 4 «Giờ chơi» (16/11): đọc `gioiHan` + câu màn khoá; máy chủ cũ (không có khối) chạy y như trước. */
class GioiHanChoiTest {
    private fun vn(gio: String, ngay: String = "2026-11-16") = Instant.parse("${ngay}T${gio}:00+07:00")
    private val daCai = listOf(GoiCai("com.google.android.youtube", false))
    private val goc = ChinhSach(
        tz = "Asia/Ho_Chi_Minh", ngu = Khung("00:00", "00:00"),
        giaiTri = listOf(MucChung("com.google.android.youtube", "app")), cheDo = "theo_danh_sach",
    )
    private fun q(cs: ChinhSach) = quyetDinh(cs, vn("19:30"), 0, daCai, null, phutLucNhip = 0, ngayNhip = "2026-11-16")

    @Test fun docGioiHan_dayDuVaThieu() {
        val c = docChinhSach(JSONObject("""{"sao":{"sao":50,"no":0,"phutCon":0,"hetSao":true,"saoTieuDuoc":50},
            "gioiHan":{"apDung":true,"ngayPhut":60,"daChoi":30,"conNgay":30,"luotPhut":30,"luotDaChoi":30,"conLuot":0,"dangNghi":true,
              "nghiDen":"2026-11-16T12:45:00.000Z","nghiDenGio":"19:45","hetNgay":false,"lyDoKhoa":"dang_nghi","phutToiDa":30,"cau":"Nghỉ một chút"}}"""))
        assertEquals(50, c.sao!!.saoTieuDuoc)
        val g = c.gioiHan!!
        assertTrue(g.apDung); assertEquals("dang_nghi", g.lyDoKhoa); assertEquals("19:45", g.nghiDenGio); assertEquals(30, g.conNgay)
        assertEquals(Instant.parse("2026-11-16T12:45:00Z"), g.nghiDen)
        assertNull("máy chủ cũ: không khối ⇒ null", docChinhSach(JSONObject("""{"sao":{"sao":5,"no":0,"phutCon":5}}""")).gioiHan)
        assertNull(docChinhSach(JSONObject("""{"gioiHan":null}""")).gioiHan)
        assertNull(docGioiHan(JSONObject("""{"apDung":true,"lyDoKhoa":null}"""))!!.lyDoKhoa)
    }

    @Test fun cauVaTieuDeKhoa() {
        val nghi = GioiHan(true, 30, KHOA_DANG_NGHI, null, "19:45", "x")
        assertEquals("Nghỉ một chút · chơi tiếp lúc 19:45", cauKhoaGioiHan(nghi))
        assertEquals("Nghỉ một chút", tieuDeKhoaGioiHan(KHOA_DANG_NGHI))
        val het = GioiHan(true, 0, KHOA_HET_NGAY, null, null, "Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé")
        assertEquals("Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé", cauKhoaGioiHan(het))
        assertEquals("Hôm nay chơi đủ rồi", tieuDeKhoaGioiHan(KHOA_HET_NGAY))
        assertNull(cauKhoaGioiHan(GioiHan(true, 10, null, null, null, null))); assertNull(cauKhoaGioiHan(null)); assertNull(tieuDeKhoaGioiHan(null))
    }

    @Test fun dangNghi_khoaKhongNoiHetSao_vaSaoThat() {
        val den = Instant.parse("2026-11-16T12:45:00Z")
        val q = q(goc.copy(
            sao = Sao(sao = 50, no = 0, phutCon = 0, hetSao = true, saoTieuDuoc = 50),
            gioiHan = GioiHan(true, 30, KHOA_DANG_NGHI, den, "19:45", "Nghỉ một chút"),
        ))
        assertEquals(TrangThai.HET_GIO, q.trangThai)
        assertEquals("Nghỉ một chút · chơi tiếp lúc 19:45", q.cauCon)
        assertEquals(den, q.moLaiLuc); assertEquals(KHOA_DANG_NGHI, q.lyDoKhoa); assertEquals("19:45", q.nghiDenGio)
        assertEquals("số sao thật, không phải phutCon kẹp", 50, q.soDu)
        assertTrue("com.google.android.youtube" in q.goiChan)
    }

    @Test fun hetGioNgay_dungCauMayChu() {
        val q = q(goc.copy(
            sao = Sao(sao = 40, no = 0, phutCon = 0, hetSao = true, saoTieuDuoc = 40),
            gioiHan = GioiHan(true, 0, KHOA_HET_NGAY, null, null, "Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé"),
        ))
        assertEquals("Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé", q.cauCon)
        assertEquals(KHOA_HET_NGAY, q.lyDoKhoa); assertNull(q.moLaiLuc); assertEquals(40, q.soDu)
    }

    @Test fun conGioiHan_nhacPhutHomNay_vaMoHetKhongApDung() {
        val gh = GioiHan(true, 20, null, null, null, null)
        val sao = Sao(sao = 90, no = 0, phutCon = 20, hetSao = false, saoTieuDuoc = 90)
        val a = q(goc.copy(sao = sao, gioiHan = gh))
        assertEquals("Còn 20 phút hôm nay.", a.cauCon); assertEquals(20, a.conPhut); assertEquals(90, a.soDu); assertEquals(20, a.conNgay)
        val moHet = q(goc.copy(sao = sao, gioiHan = gh, cheDo = "mo_het"))
        assertFalse("Mở hết ⇒ không áp dụng", moHet.lyDoKhoa != null); assertNull(moHet.conNgay)
    }

    @Test fun mayChuCu_khongGioiHan_yNhuTruoc() {
        val a = q(goc.copy(sao = Sao(sao = 30, no = 0, phutCon = 30)))
        assertEquals("Còn 30 sao = 30 phút chơi.", a.cauCon); assertEquals(30, a.soDu); assertNull(a.lyDoKhoa)
        val het = q(goc.copy(sao = Sao(sao = 0, no = 0, phutCon = 0)))
        assertEquals("Hết sao rồi. App học vẫn dùng được.", het.cauCon); assertNull(het.lyDoKhoa)
    }

    @Test fun hienThiKhuTuanTu() {
        val h = HienThi.tu(q(goc.copy(sao = Sao(50, 0, 0, true, 50), gioiHan = GioiHan(true, 30, KHOA_DANG_NGHI, null, "19:45", null))), 0, emptyList(), 0L, false, null)
        val d = HienThi.doc(h.json())!!
        assertEquals(KHOA_DANG_NGHI, d.lyDoKhoa); assertEquals("19:45", d.nghiDenGio); assertEquals(30, d.conNgay)
        assertNull(HienThi.doc(HienThi.tu(q(goc), 0, emptyList(), 0L, false, null).json())!!.lyDoKhoa)
    }
}
