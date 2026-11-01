// Máy MỒ CÔI ⇒ tự thôi chặn (fail-open) — cùng luật với agent-win `MoCoi` (AnToan.cs). Thanh 22/10: «không được để máy kẹt».
// Trước 0.1.7 Mac chỉ ghi log khi máy chủ từ chối token: máy bị xoá khỏi gia đình lúc offline (lệnh gỡ không tới) giữ Policy cuối MÃI —
// kể cả «khoá» (đăng xuất Con mỗi 30 giây) — tới khi có admin chạy go-cai.sh.
// HAI mốc, cái nào tới trước thì coi là mồ côi:
//   • 6 giờ máy chủ TỪ CHỐI token liên tục (401 token_sai / device_unknown — máy đã bị gỡ khỏi gia đình). Lỗi mạng / 5xx / 403 lạ KHÔNG tính.
//   • 14 ngày KHÔNG đồng bộ được lần nào (mọi loại lỗi) VÀ máy đã CHẠY ≥ 72 giờ trong khoảng đó (đồng hồ đơn điệu, cộng từng vòng có trần)
//     — chỉnh lịch máy tới trước không đủ để mở chặn.
// Mồ côi ⇒ gỡ plist lọc web + khối hosts, không đóng app, không khoá; Policy cuối GIỮ trên đĩa. Đồng bộ lại được ⇒ hết mồ côi, chạy bình thường.
import Foundation

public enum MoCoi {
  public static let gioNguong: Double = 6
  public static let nguongTuChoiGiay: Double = gioNguong * 3600
  public static let ngayMatLienLac: Double = 14
  public static let nguongLienLacGiay: Double = ngayMatLienLac * 86_400
  public static let nguongChayGiay: Double = 72 * 3600
  /// Trần mỗi lần cộng thời gian chạy: ngủ/treo giữa hai vòng không thổi phồng thời gian mất liên lạc.
  public static let tranMoiVongGiay: Double = 30

  /// Máy chủ từ chối token. Mồ côi khi CHÍNH các lần từ chối trải đủ 6 giờ (tuChoiCuoi − tuChoiTu): một lần 401 lẻ rồi mất mạng không đủ,
  /// nhưng máy hay ngủ (mỗi lần thức vài phút) vẫn gom được — chỉ đồng bộ thành công / ghép lại mới xoá mốc (như agent-win). Đã mồ côi thì GIỮ.
  public static func ghiTuChoi(_ c: inout CauHinhMay, now: Date) {
    if c.tuChoiTu == nil || (c.tuChoiTu! > now && !tuChoiLau(c, now: now)) { c.tuChoiTu = now }   // chưa có / đồng hồ lùi (khi chưa mồ côi)
    if (c.tuChoiCuoi.map { now > $0 } ?? true) { c.tuChoiCuoi = now }                              // chỉ tiến, đồng hồ lùi không kéo lùi
  }

  /// Đồng bộ thành công ⇒ hết mồ côi.
  public static func ghiThanhCong(_ c: inout CauHinhMay, now: Date) {
    c.tuChoiTu = nil
    c.tuChoiCuoi = nil
    c.matLienLacChayGiay = 0
    c.lienLacCuoi = now
  }

  /// Cộng thời gian máy chạy (đồng hồ đơn điệu) khi lượt đồng bộ gần nhất lỗi.
  public static func congChay(_ c: inout CauHinhMay, giay: Double) {
    guard giay > 0 else { return }
    c.matLienLacChayGiay += min(giay, tranMoiVongGiay)
  }

  public static func tuChoiLau(_ c: CauHinhMay, now: Date) -> Bool {
    guard let t = c.tuChoiTu, let cuoi = c.tuChoiCuoi, cuoi >= t else { return false }      // không so với now: NTP lùi vài giây không làm mất mồ côi
    return cuoi.timeIntervalSince(t) >= nguongTuChoiGiay
  }

  /// Cần CẢ HAI: đồng hồ thật ≥ 14 ngày kể từ lần liên lạc cuối VÀ thời gian chạy cộng dồn ≥ 72 giờ.
  public static func matLienLacLau(_ c: CauHinhMay, now: Date) -> Bool {
    guard let t = c.lienLacCuoi, now >= t else { return false }
    return now.timeIntervalSince(t) >= nguongLienLacGiay && c.matLienLacChayGiay >= nguongChayGiay
  }

  public static func la(_ c: CauHinhMay, now: Date) -> Bool { tuChoiLau(c, now: now) || matLienLacLau(c, now: now) }
}
