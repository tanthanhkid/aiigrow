// Đẩy LOG + SỰ KIỆN của daemon Mac lên máy chủ (như agent-win FileLog + hàng đợi SuKien) — để Ba Mẹ / AiiLab đọc lỗi từ xa.
//   POST /api/device/log     {ds: [{luc, muc: tin|canh|loi, nguon, noiDung}]}   (server/lib/log-may.ts — tối đa 200 dòng/lần, 1000 ký tự/dòng)
//   POST /api/device/su-kien {ds: [{ma, loai, luc, chiTiet}]}                   (server/lib/may-con.ts › SU_KIEN_MAY — `ma` một lần, gửi lại không trùng)
// Log: giữ trong bộ nhớ (tối đa 1000 dòng), gửi mỗi 5 phút. Sự kiện: hàng đợi lưu ĐĨA (mất mạng / khởi động lại vẫn còn), xoá khi máy chủ nhận.
import Foundation

public struct DongLog: Codable, Equatable {
  public var luc: Date
  public var muc: String
  public var nguon: String
  public var noiDung: String
  public init(luc: Date, muc: String, nguon: String = "daemon", noiDung: String) { self.luc = luc; self.muc = muc; self.nguon = nguon; self.noiDung = noiDung }
}

public struct SuKienMay: Codable, Equatable {
  public var ma: String
  public var loai: String
  public var luc: Date
  public var chiTiet: [String: String]
  public init(loai: String, luc: Date, chiTiet: [String: String] = [:], ma: String = UUID().uuidString) {
    self.ma = ma; self.loai = loai; self.luc = luc; self.chiTiet = chiTiet
  }
}

public enum NhatKyMay {
  public static let toiDaBoNho = 1000
  public static let moiLanLog = 200
  public static let toiDaHangDoi = 200
  public static let nhipGiay: Double = 300

  /// Mức của một dòng log theo chữ (daemon ghi tiếng Việt): «lỗi» ⇒ loi, «CẢNH BÁO»/«từ chối» ⇒ canh, còn lại ⇒ tin.
  public static func muc(_ s: String) -> String {
    let t = s.lowercased()
    if t.contains("lỗi") || t.contains("error") || t.contains("không ghi được") { return "loi" }
    if t.contains("cảnh báo") || t.contains("token sai") || t.contains("từ chối") { return "canh" }
    return "tin"
  }

  public static func thanLog(_ ds: [DongLog]) -> [String: Any] {
    ["ds": ds.prefix(moiLanLog).map { ["luc": NgayGio.viet($0.luc), "muc": $0.muc, "nguon": $0.nguon, "noiDung": String($0.noiDung.prefix(1000))] }]
  }

  public static func thanSuKien(_ ds: [SuKienMay]) -> [String: Any] {
    ["ds": ds.prefix(100).map { ["ma": $0.ma, "loai": $0.loai, "luc": NgayGio.viet($0.luc), "chiTiet": $0.chiTiet] }]
  }

  /// Thêm vào hàng đợi, giữ tối đa `toiDaHangDoi` sự kiện MỚI nhất.
  public static func them(_ q: inout [SuKienMay], _ e: SuKienMay) {
    q.append(e)
    if q.count > toiDaHangDoi { q.removeFirst(q.count - toiDaHangDoi) }
  }
}

/// Bộ đệm log trong bộ nhớ (an toàn luồng: ghiLog gọi từ nhiều nơi).
public final class BoDemLog: @unchecked Sendable {
  private let khoa = NSLock()
  private var ds: [DongLog] = []
  public init() {}
  public func them(_ s: String, luc: Date = Date()) {
    khoa.lock(); defer { khoa.unlock() }
    ds.append(DongLog(luc: luc, muc: NhatKyMay.muc(s), noiDung: s))
    if ds.count > NhatKyMay.toiDaBoNho { ds.removeFirst(ds.count - NhatKyMay.toiDaBoNho) }
  }
  /// Lấy tối đa một lô để gửi (không xoá — gọi `daGui(n)` khi máy chủ nhận).
  public func lo() -> [DongLog] { khoa.lock(); defer { khoa.unlock() }; return Array(ds.prefix(NhatKyMay.moiLanLog)) }
  public func daGui(_ n: Int) { khoa.lock(); defer { khoa.unlock() }; ds.removeFirst(min(n, ds.count)) }
  public var soDong: Int { khoa.lock(); defer { khoa.unlock() }; return ds.count }
}
