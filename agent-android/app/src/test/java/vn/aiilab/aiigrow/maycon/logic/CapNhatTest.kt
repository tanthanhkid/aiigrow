package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class CapNhatTest {
    private val sha = "e850328a5ad3ae0b7f53d8094698367db550b1da79787e247f7ea9ad201e3b81"
    private val mc = "https://aiigrow.aiilab.vn"
    private fun manifest(vc: Any = 4, url: String = "$mc/tai/AiiGrow-Con-0.2.2.apk", s: String = sha) =
        """{"version":"0.2.2","versionCode":$vc,"url":"$url","sha256":"$s"}"""

    @Test fun docManifest() {
        val b = docBanMoi(manifest())
        assertEquals(BanMoi("0.2.2", 4, "$mc/tai/AiiGrow-Con-0.2.2.apk", sha), b)
        assertEquals(sha, docBanMoi(manifest(s = sha.uppercase()))?.sha256)   // hex hoa ⇒ chuẩn về thường
        assertNull(docBanMoi(manifest(vc = 0)))
        assertNull(docBanMoi("""{"version":"0.2.2","url":"$mc/x.apk","sha256":"$sha"}"""))    // manifest Windows/Mac: không versionCode
        assertNull(docBanMoi(manifest(url = "http://aiigrow.aiilab.vn/x.apk")))
        assertNull(docBanMoi(manifest(s = "abc")))
        assertNull(docBanMoi("không phải json"))
        assertNull(docBanMoi(manifest(url = "https://ke@aiigrow.aiilab.vn/x.apk")))
        // bản debug thử localhost: http được nhận
        assertNotNull(docBanMoi(manifest(url = "http://10.0.2.2:8787/x.apk"), choPhepHttp = true))
    }

    @Test fun soBan() {
        val b = docBanMoi(manifest())
        assertTrue(canCapNhat(b, 3))
        assertFalse(canCapNhat(b, 4))
        assertFalse(canCapNhat(b, 5))   // manifest lùi bản ⇒ không hạ cấp
        assertFalse(canCapNhat(null, 1))
    }

    @Test fun duongTai() {
        assertTrue(urlDauHopLe("$mc/tai/AiiGrow-Con-0.2.2.apk", mc))
        assertTrue(urlDauHopLe("https://AIIGROW.aiilab.vn/tai/a.apk", "$mc/"))
        assertFalse("đầu tiên phải là máy chủ đã ghép", urlDauHopLe("https://github.com/tanthanhkid/aiigrow-tai/releases/download/x/a.apk", mc))
        assertFalse(urlDauHopLe("https://aiigrow.aiilab.vn.ke.com/a.apk", mc))
        assertFalse("khác cổng", urlDauHopLe("https://aiigrow.aiilab.vn:8443/a.apk", mc))
        assertFalse(urlDauHopLe("http://aiigrow.aiilab.vn/a.apk", mc))
        assertTrue(urlDauHopLe("http://10.0.2.2:8787/a.apk", "http://10.0.2.2:8787", choPhepHttp = true))
        assertFalse(urlDauHopLe("http://10.0.2.2:8787/a.apk", "http://10.0.2.2:8787"))

        assertTrue(chuyenHuongHopLe("https://github.com/tanthanhkid/aiigrow-tai/releases/download/con-android-0.2.2/AiiGrow-Con-android.apk", mc))
        assertTrue(chuyenHuongHopLe("https://release-assets.githubusercontent.com/github-production-release-asset/1/2?sp=r", mc))
        assertTrue(chuyenHuongHopLe("https://objects.githubusercontent.com/x", mc))
        assertFalse("repo khác", chuyenHuongHopLe("https://github.com/ke-gian/aiigrow-tai/releases/download/a.apk", mc))
        assertFalse(chuyenHuongHopLe("https://githubusercontent.com.ke.vn/x", mc))
        assertFalse("ra ngoài máy chủ chỉ https", chuyenHuongHopLe("http://objects.githubusercontent.com/x", mc))
        assertFalse(chuyenHuongHopLe("http://objects.githubusercontent.com/x", "http://10.0.2.2:8787", choPhepHttp = true))
        assertFalse(chuyenHuongHopLe("https://ke.vn/a.apk", mc))
    }

    @Test fun sha256Tep() {
        val f = File.createTempFile("apk", ".apk").apply { writeText("abc"); deleteOnExit() }
        val abc = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        assertEquals(abc, f.inputStream().use { sha256Hex(it) })
        assertTrue(khopSha256(f, abc))
        assertTrue(khopSha256(f, abc.uppercase()))
        assertFalse(khopSha256(f, sha))
        assertFalse(khopSha256(File(f.path + ".khong-co"), abc))
        assertEquals(abc, vanTayChungChi("abc".toByteArray()))
    }

    @Test fun chuKy() {
        val ed65 = "ed65bcbd31e0d55bb47258a4fce426074815af16fdae58fe524bbeb6af09c593"
        val khac = "00".repeat(32)
        assertTrue(chuKyHopLe(listOf(ed65), listOf(ed65)))
        assertTrue("APK v3 xoay khoá: chứng chỉ cũ trong lịch sử", chuKyHopLe(listOf(ed65, khac), listOf(ed65)))
        assertFalse(chuKyHopLe(listOf(khac), listOf(ed65)))
        assertFalse(chuKyHopLe(emptyList(), listOf(ed65)))
        assertFalse(chuKyHopLe(listOf(ed65), emptyList()))

        val b = BanMoi("0.2.2", 4, "$mc/a.apk", sha)
        val goi = "vn.aiilab.aiigrow.con"
        assertNull(loiApk(goi, 4, listOf(ed65), goi, listOf(ed65), b))
        assertNotNull(loiApk("vn.ke.gian", 4, listOf(ed65), goi, listOf(ed65), b))
        assertNotNull(loiApk(null, 4, listOf(ed65), goi, listOf(ed65), b))
        assertNotNull(loiApk(goi, 5, listOf(ed65), goi, listOf(ed65), b))
        assertNotNull(loiApk(goi, 4, listOf(khac), goi, listOf(ed65), b))
    }
}
