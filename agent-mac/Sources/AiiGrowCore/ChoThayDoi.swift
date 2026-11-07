// P1 (07/11): «Ba Mẹ bấm ⇒ máy Con áp trong ≤5 giây». Logic thuần của vòng chờ thay đổi: GET api/device/cho-thay-doi?ver=N
// (server/lib/cho-thay-doi.ts) — máy chủ giữ ≤ ~25 giây, trả ngay khi Ba Mẹ đổi gì. BoMay.vongChoThayDoi dùng; vòng đồng bộ theo nextCheckSec là dự phòng.
import Foundation

public struct KetQuaCho: Equatable, Sendable {
  /// Số phiên bản thay đổi của gia đình (máy chủ tăng mỗi lần Ba Mẹ ghi gì).
  public var phienBan: Int
  /// Khác số `ver` agent đưa ⇒ có thay đổi.
  public var doi: Bool
  /// Máy chủ không giữ thêm được (quá tải) ⇒ agent lùi.
  public var quaTai: Bool
  public init(phienBan: Int, doi: Bool, quaTai: Bool = false) { self.phienBan = phienBan; self.doi = doi; self.quaTai = quaTai }

  /// Đọc `{phienBanThayDoi, doi, quaTai?}`; thiếu số phiên bản / hỏng ⇒ nil.
  public static func doc(_ d: Data) -> KetQuaCho? {
    guard let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any], let v = (o["phienBanThayDoi"] as? NSNumber)?.intValue else { return nil }
    return KetQuaCho(phienBan: v, doi: (o["doi"] as? Bool) ?? false, quaTai: (o["quaTai"] as? Bool) ?? false)
  }
}

public enum ChoThayDoi {
  public static func duong(ver: Int?) -> String { "api/device/cho-thay-doi" + (ver.map { "?ver=\($0)" } ?? "") }

  /// Chờ bao lâu (giây) trước lần hỏi kế: lỗi ⇒ lùi dần 2, 4, 8, 16, 30; quá tải / trả nhanh không đổi gì ⇒ 5; có thay đổi hoặc đã giữ đủ lâu ⇒ 0.
  public static func choLai(loiLienTiep: Int, kq: KetQuaCho?, daCho: Double) -> Double {
    if loiLienTiep > 0 { return min(30, Double(1 << min(loiLienTiep, 5))) }
    if let kq {
      if kq.quaTai { return 5 }
      if !kq.doi && daCho < 2 { return 5 }
    }
    return 0
  }
}
