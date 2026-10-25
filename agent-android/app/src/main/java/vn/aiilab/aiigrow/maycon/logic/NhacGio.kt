package vn.aiilab.aiigrow.maycon.logic

// Nhắc «còn 5 phút» / «còn 1 phút» trước khi khoá — cùng mốc với khay Windows (TrayContext.HandleWarnings) và Mac (TrayLogic.swift):
// báo 5 phút khi còn (240, 300] giây, báo 1 phút khi còn (0, 60] giây; còn > 330 giây thì cho báo 5 phút lại, > 90 giây thì cho báo 1 phút lại
// (thêm giờ / Ba Mẹ đổi luật). Mỗi mốc báo một lần.

data class NhacGio(val da5: Boolean = false, val da1: Boolean = false) {
    /** `conGiay` = giây còn trước khi khoá (null = không đếm, vd đang khoá / không giới hạn). Trả (mốc phải báo 5 | 1 | null, trạng thái mới). */
    fun xet(conGiay: Int?): Pair<Int?, NhacGio> {
        if (conGiay == null) return null to this
        var s = this
        if (conGiay > 330) s = s.copy(da5 = false)
        if (conGiay > 90) s = s.copy(da1 = false)
        if (conGiay in 241..300 && !s.da5) return 5 to s.copy(da5 = true)
        if (conGiay in 1..60 && !s.da1) return 1 to s.copy(da1 = true, da5 = true)
        return null to s
    }
}

/**
 * Giây còn trước khi khoá: bình thường ⇒ phút còn (trần ngày, khung giờ, phiên điểm). Thêm giờ / mở bằng mã ⇒ tới hạn mở, cộng phút còn
 * SAU hạn nếu lúc đó máy không khoá (`sau` = quyết định tại hạn + 1 giây; vẫn được thêm giờ ⇒ không nhắc). Đang khoá / không tuân thủ ⇒ null.
 */
fun giayConTruocKhoa(qd: QuyetDinh, sau: QuyetDinh?, nowMs: Long): Int? = when (qd.trangThai) {
    TrangThai.BINH_THUONG -> qd.conPhut * 60
    TrangThai.DUOC_THEM_GIO -> {
        val toiHan = qd.moLaiLuc?.let { ((it.toEpochMilli() - nowMs) / 1000).toInt().coerceAtLeast(0) }
        when {
            toiHan == null -> qd.conPhut * 60
            sau == null || laKhoa(sau.trangThai) || sau.trangThai == TrangThai.KHONG_TUAN_THU -> toiHan
            sau.trangThai == TrangThai.BINH_THUONG -> toiHan + sau.conPhut * 60
            else -> null
        }
    }
    else -> null
}

fun tieuDeNhac(moc: Int) = if (moc == 5) "Còn 5 phút" else "Còn 1 phút"
fun noiDungNhac(moc: Int) = if (moc == 5) "Lưu bài đang làm nhé. Cần thêm giờ thì mở AiiGrow để xin Ba Mẹ." else "Máy sắp khoá. Lưu bài ngay nhé."
