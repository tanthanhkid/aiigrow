// P1 (07/11): «Ba Mẹ bấm ⇒ máy Con áp ≤5 giây» — logic thuần của vòng chờ thay đổi: GET api/device/cho-thay-doi?ver=N
// (server/lib/cho-thay-doi.ts) — máy chủ giữ ≤ ~25 giây, trả ngay khi Ba Mẹ đổi gì.
// GIỚI HẠN iOS: app ở nền KHÔNG giữ kết nối được ⇒ vòng này chỉ chạy khi app đang mở (scenePhase = active). Lúc ở nền vẫn là BGAppRefresh
// (iOS quyết, vài chục phút) — muốn ≤5 giây ở nền cần APNs silent push (bước sau; CHƯA có khoá APNs, không tự tạo).
import Foundation

public struct KetQuaCho: Equatable {
  public var phienBan: Int
  public var doi: Bool
  public var quaTai: Bool
  public init(phienBan: Int, doi: Bool, quaTai: Bool = false) { self.phienBan = phienBan; self.doi = doi; self.quaTai = quaTai }

  /// Đọc `{phienBanThayDoi, doi, quaTai?}`; thiếu số phiên bản / hỏng ⇒ nil.
  public static func doc(_ d: Data) -> KetQuaCho? {
    guard let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any], let v = (o["phienBanThayDoi"] as? NSNumber)?.intValue else { return nil }
    return KetQuaCho(phienBan: v, doi: (o["doi"] as? Bool) ?? false, quaTai: (o["quaTai"] as? Bool) ?? false)
  }
}

public enum ChoThayDoi {
  public static func duong(ver: Int?) -> String { "api/device/cho-thay-doi" }
  public static func query(ver: Int?) -> [URLQueryItem] { ver.map { [URLQueryItem(name: "ver", value: String($0))] } ?? [] }

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
