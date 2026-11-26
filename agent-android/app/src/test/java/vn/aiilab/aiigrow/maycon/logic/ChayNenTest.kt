package vn.aiilab.aiigrow.maycon.logic

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ChayNenTest {
    @Test fun hangDonNen() {
        for (h in listOf("Xiaomi", "OPPO", "vivo", "realme", "HUAWEI", " Redmi ")) assertTrue(h, canNhacTuKhoiChay(h))
        for (h in listOf("Google", "samsung", "motorola", "", null)) assertFalse("$h", canNhacTuKhoiChay(h))
    }

    @Test fun xinBoQuaPin() {
        assertTrue(hienQuyenPin(daGhep = true, laDeviceOwner = false, sdk = 34))
        assertFalse(hienQuyenPin(daGhep = true, laDeviceOwner = true, sdk = 34))   // DPC đã được miễn
        assertFalse(hienQuyenPin(daGhep = false, laDeviceOwner = false, sdk = 34))
        assertFalse(hienQuyenPin(daGhep = true, laDeviceOwner = false, sdk = 22))
    }
}
