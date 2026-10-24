// Đọc + chuẩn hoá Policy (agent-win PolicyParser.cs) và tính Policy hiệu lực theo giờ hiện tại — dùng cả khi mất mạng.
import Foundation

public struct LoiPolicy: Error, Equatable, CustomStringConvertible {
  public var chu: String
  public var description: String { chu }
}

public enum PolicyParser {
  /// Đọc từ JSON của riêng khối Policy.
  public static func parse(_ data: Data) throws -> Policy {
    guard !data.isEmpty else { throw LoiPolicy(chu: "Policy rỗng") }
    let p: Policy
    do { p = try NgayGio.decoder.decode(Policy.self, from: data) } catch { throw LoiPolicy(chu: "Policy không đúng JSON: \(error)") }
    return try chuanHoa(p)
  }

  public static func parse(_ s: String) throws -> Policy { try parse(Data(s.utf8)) }

  /// Từ cả phản hồi dong-bo: khối `mac` (máy chủ dịch sẵn cho Mac), không có thì `windows` (máy chủ chưa có khối mac), không có nữa thì chính gốc.
  public static func layKhoiPolicy(_ raw: Data) -> Data {
    guard let o = try? JSONSerialization.jsonObject(with: raw) as? [String: Any] else { return raw }
    for k in ["mac", "windows"] {
      if let khoi = o[k] as? [String: Any], let d = try? JSONSerialization.data(withJSONObject: khoi) { return d }
    }
    return raw
  }

  public static func chuanHoa(_ vao: Policy) throws -> Policy {
    var p = vao
    let mode = p.mode.trimmingCharacters(in: .whitespaces).lowercased()
    guard CheDo(rawValue: mode) != nil else { throw LoiPolicy(chu: "Chế độ không hợp lệ: '\(p.mode)'") }
    p.mode = mode
    p.cheDo = CheDoAgent.chuan(p.cheDo)
    let lr = (p.lockReason ?? "").trimmingCharacters(in: .whitespaces).lowercased()
    p.lockReason = lr.isEmpty ? nil : lr
    p.allowedApps = sachDs(p.allowedApps)
    p.learningApps = sachDs(p.learningApps)
    if p.nextCheckSec <= 0 { p.nextCheckSec = 30 }
    p.nextCheckSec = min(max(p.nextCheckSec, 10), 600)
    if let m = p.minutesLeft, m < 0 { p.minutesLeft = 0 }
    return p
  }

  private static func sachDs(_ ds: [String]) -> [String] {
    var thay = Set<String>(), kq: [String] = []
    for s in ds {
      let t = s.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
      if !t.isEmpty, thay.insert(t).inserted { kq.append(t) }
    }
    return kq
  }
}

/// Policy sau khi áp lên giờ hiện tại (agent-win EffectivePolicy).
public struct PolicyHieuLuc: Equatable {
  public var khoa: Bool
  public var lyDoKhoa: String?
  public var conPhut: Double?
  public var moDen: Date?
  /// Chỉ cho app trong danh sách (mode «hoc», hoặc «mở» có hạn đã hết mà chưa đồng bộ lại được).
  public var chiAppHoc: Bool
}

public enum DanhGiaPolicy {
  /// `daDungGiay`: số giây Con dùng máy kể từ lần đồng bộ được Policy này (đếm bằng đồng hồ đơn điệu ⇒ chỉnh giờ máy không ăn gian được).
  public static func tinh(_ p: Policy, now: Date, daDungGiay: Double) -> PolicyHieuLuc {
    let dangMo = p.grantEndsAt.map { $0 > now } ?? false
    var khoa = p.locked || p.mode == CheDo.khoa.rawValue
    var lyDo: String? = khoa ? (p.lockReason ?? LyDoKhoa.khoa) : nil
    var phut: Double? = nil
    if let m = p.minutesLeft { phut = max(0, Double(m) - daDungGiay / 60) }
    if !khoa, let c = phut, c <= 0, !dangMo { khoa = true; lyDo = LyDoKhoa.hetGio }
    // «Mở» có hạn hết hạn lúc mất mạng ⇒ tự trở lại «Chỉ app học», không để máy mở tự do tới khi có mạng.
    let hetMo = p.mode == CheDo.tuDo.rawValue && p.grantEndsAt != nil && !dangMo
    return PolicyHieuLuc(khoa: khoa, lyDoKhoa: lyDo, conPhut: phut, moDen: dangMo ? p.grantEndsAt : nil,
                         chiAppHoc: p.mode == CheDo.hoc.rawValue || hetMo)
  }
}
