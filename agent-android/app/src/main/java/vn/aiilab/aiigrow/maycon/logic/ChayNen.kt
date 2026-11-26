package vn.aiilab.aiigrow.maycon.logic

// #709: phòng thủ khi hãng máy dọn nền (Xiaomi, Oppo, Vivo…): xin «bỏ tối ưu pin», nhắc «Tự khởi chạy», hẹn bật lại khi app bị vuốt khỏi gần đây.

/** Hãng có trình dọn nền riêng tắt cả dịch vụ tiền cảnh + chặn tự khởi chạy — cần Ba Mẹ bật «Tự khởi chạy» cho AiiGrow bằng tay. */
private val HANG_DON_NEN = setOf("xiaomi", "redmi", "poco", "oppo", "realme", "oneplus", "vivo", "iqoo", "huawei", "honor", "meizu", "asus", "tecno", "infinix", "itel")

fun canNhacTuKhoiChay(hang: String?): Boolean = hang?.trim()?.lowercase() in HANG_DON_NEN

/** Nhịp nền hỏi lại lời xin app / web chờ: 15 phút đầu mỗi nhịp; sau đó mỗi 10 phút (≤ 24 giờ) — không gõ máy chủ mỗi phút cả ngày. */
fun nenHoiXinApp(tuoiMs: Long, tuLanHoiMs: Long?): Boolean = tuoiMs < 15 * 60_000L || tuLanHoiMs == null || tuLanHoiMs >= 10 * 60_000L

/** Bị vuốt khỏi gần đây ⇒ hẹn bật lại dịch vụ sau ngần này (hãng giết tiến trình ngay sau onTaskRemoved). */
const val HEN_LAI_MS = 3_000L
