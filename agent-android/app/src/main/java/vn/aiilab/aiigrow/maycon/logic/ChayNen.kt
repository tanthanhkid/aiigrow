package vn.aiilab.aiigrow.maycon.logic

// #709: phòng thủ khi hãng máy dọn nền (Xiaomi, Oppo, Vivo…): xin «bỏ tối ưu pin», nhắc «Tự khởi chạy», hẹn bật lại khi app bị vuốt khỏi gần đây.

/** Hãng có trình dọn nền riêng tắt cả dịch vụ tiền cảnh + chặn tự khởi chạy — cần Ba Mẹ bật «Tự khởi chạy» cho AiiGrow bằng tay. */
private val HANG_DON_NEN = setOf("xiaomi", "redmi", "poco", "oppo", "realme", "oneplus", "vivo", "iqoo", "huawei", "honor", "meizu", "asus", "tecno", "infinix", "itel")

fun canNhacTuKhoiChay(hang: String?): Boolean = hang?.trim()?.lowercase() in HANG_DON_NEN

/** Thẻ quyền có dòng «bỏ tối ưu pin» (chưa bật ⇒ nút, đã bật ⇒ ✓): máy đã ghép, không phải Device Owner (DPC đã được miễn), Android 6+. */
fun hienQuyenPin(daGhep: Boolean, laDeviceOwner: Boolean, sdk: Int): Boolean = daGhep && !laDeviceOwner && sdk >= 23

/** Bị vuốt khỏi gần đây ⇒ hẹn bật lại dịch vụ sau ngần này (hãng giết tiến trình ngay sau onTaskRemoved). */
const val HEN_LAI_MS = 3_000L
