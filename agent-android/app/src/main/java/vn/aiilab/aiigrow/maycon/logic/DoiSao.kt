package vn.aiilab.aiigrow.maycon.logic

// 06/11 «Đổi sao lấy giờ chơi» (docs/thiet-ke-chot/con-dt-android/02..04): chip 10 / 20 / 30 / 40 sao, xem trước «Giờ chơi 18 → 28 phút ·
// Còn lại 20 sao», chưa đủ ⇒ «Cần 40 sao · con có 30 · Thiếu 10 sao = 1 nhiệm vụ». Máy chủ nhận số PHÚT (hoc-vien/doi-sao {phut}).

val SAO_DOI = listOf(10, 20, 30, 40)

data class XemDoiSao(val sao: Int, val phut: Int, val du: Boolean, val thieu: Int, val conLaiSao: Int, val phutTruoc: Int, val phutSau: Int,
                     /** chưa đủ ⇒ số sao lớn nhất (bội 10) đổi được ngay — nút «Đổi 30 sao». */
                     val doiDuocToiDa: Int)

/** `phut10` = số phút cho 10 sao (tỷ lệ của nhà). `saoMoiViec` ≈ sao một nhiệm vụ để nói «Thiếu 10 sao = 1 nhiệm vụ». */
fun xemDoiSao(sao: Int, coSao: Int, conPhut: Int, phut10: Int): XemDoiSao {
    val p10 = phut10.coerceAtLeast(1)
    val phut = sao * p10 / 10
    val du = coSao >= sao
    return XemDoiSao(sao, phut, du, maxOf(0, sao - coSao), maxOf(0, coSao - sao), conPhut, conPhut + phut, (coSao / 10) * 10)
}

/** «Thiếu 10 sao = 1 nhiệm vụ» (làm tròn lên theo sao trung bình một việc, mặc định 10). */
fun cauThieuSao(thieu: Int, saoMoiViec: Int = 10): String = "Thiếu $thieu sao = ${maxOf(1, (thieu + saoMoiViec.coerceAtLeast(1) - 1) / saoMoiViec.coerceAtLeast(1))} nhiệm vụ"
