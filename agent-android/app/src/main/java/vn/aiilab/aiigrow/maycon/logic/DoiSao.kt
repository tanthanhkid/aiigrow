package vn.aiilab.aiigrow.maycon.logic

// 06/11 «Đổi sao lấy giờ chơi» (docs/thiet-ke-chot/con-dt-android/02..04): chip 10 / 20 / 30 / 40 sao, xem trước «Giờ chơi 18 → 28 phút ·
// Còn lại 20 sao», chưa đủ ⇒ «Cần 40 sao · con có 30 · Thiếu 10 sao = 1 nhiệm vụ». Máy chủ nhận số PHÚT (hoc-vien/doi-sao {phut}).

val SAO_DOI = listOf(10, 20, 30, 40)

data class XemDoiSao(val sao: Int, val phut: Int, val du: Boolean, val thieu: Int, val conLaiSao: Int, val phutTruoc: Int, val phutSau: Int,
                     /** chưa đủ ⇒ số sao lớn nhất (bội 10) đổi được ngay — nút «Đổi 30 sao». */
                     val doiDuocToiDa: Int)

/** Tỷ lệ của nhà «`saoTyLe` sao = `phutTyLe` phút» (hoc-vien/tong-quan › quy.tyLe = {sao: 10, phut}). Tính ĐÚNG như máy chủ
 *  (server/lib/quy-gio.ts): phút nhận = floor(sao · phut / saoTyLe) (phutChoSao), sao bị trừ = ceil(phút · saoTyLe / phut) (saoChoPhut) —
 *  không chia nguyên hai lần (lệch số sao hiển thị). Máy chủ nhận số PHÚT. */
fun xemDoiSao(sao: Int, coSao: Int, conPhut: Int, phutTyLe: Int, saoTyLe: Int = 10): XemDoiSao {
    val p = phutTyLe.coerceAtLeast(1).toLong(); val s = saoTyLe.coerceAtLeast(1).toLong()
    val phut = (maxOf(0, sao) * p / s).toInt()
    val saoTru = ((phut * s + p - 1) / p).toInt()
    val du = coSao >= saoTru
    return XemDoiSao(saoTru, phut, du, maxOf(0, saoTru - coSao), maxOf(0, coSao - saoTru), conPhut, conPhut + phut, (coSao / 10) * 10)
}

/** «Thiếu 10 sao = 1 nhiệm vụ» (làm tròn lên theo sao trung bình một việc, mặc định 10). */
fun cauThieuSao(thieu: Int, saoMoiViec: Int = 10): String = "Thiếu $thieu sao = ${maxOf(1, (thieu + saoMoiViec.coerceAtLeast(1) - 1) / saoMoiViec.coerceAtLeast(1))} nhiệm vụ"
