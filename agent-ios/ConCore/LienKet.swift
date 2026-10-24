// Đọc cách ghép máy: link `https://<máy chủ>/cai/<token>` (universal link / QR), `aiigrowcon://cai/<token>`, hoặc mã 6 số.
import Foundation

public enum CachGhep: Equatable {
  case ma(String)
  case token(String, mayChu: URL?)
}

public enum LienKet {
  public static let scheme = "aiigrowcon"

  public static func doc(_ url: URL) -> CachGhep? {
    let phan = url.pathComponents.filter { $0 != "/" }
    if url.scheme == scheme {
      // aiigrowcon://cai/<token>: host = "cai"
      let ds = ([url.host].compactMap { $0 } + phan)
      guard ds.count == 2, ds[0] == "cai", hopLe(ds[1]) else { return nil }
      return .token(ds[1], mayChu: nil)
    }
    guard url.scheme == "https", phan.count == 2, phan[0] == "cai", hopLe(phan[1]),
          let host = url.host, let goc = URL(string: "https://\(host)") else { return nil }
    return .token(phan[1], mayChu: goc)
  }

  /// Chuỗi người dùng gõ/dán: mã 6 số (cho phép dấu cách / gạch) hoặc cả link.
  public static func doc(chuoi s: String) -> CachGhep? {
    let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
    if let u = URL(string: t), u.scheme != nil, let c = doc(u) { return c }
    let so = t.filter(\.isNumber)
    if so.count == 6, t.allSatisfy({ $0.isNumber || $0 == " " || $0 == "-" }) { return .ma(so) }
    return nil
  }

  static func hopLe(_ t: String) -> Bool {
    t.count >= 16 && t.count <= 128 && t.allSatisfy { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" }
  }
}
