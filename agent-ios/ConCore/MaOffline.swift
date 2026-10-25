// Mã mở offline — khi máy Con MẤT MẠNG, Ba Mẹ (điện thoại còn mạng) xem một mã ngắn trong app và đọc cho Con gõ vào app AiiGrow Con.
// App tự kiểm mã KHÔNG cần máy chủ, nhờ bí mật chung (NhipTraVe.biMatOffline, nhớ trong Keychain khi còn mạng).
// Phải ra ĐÚNG số như máy chủ (server/lib/ma-offline.ts) và agent Windows (agent-win/src/AiiGrow.Core/MaOffline.cs): TOTP RFC 6238
// (HMAC-SHA1), bí mật dùng nguyên chuỗi UTF-8, bước 300 giây, 6 số, dung sai ±1 bước.
// MoTamOffline chép logic agent-win MoTamOffline.cs: sai tối đa 5 lần / 10 phút, một mã một lượt, mở 60 phút, có mạng lại thì kết thúc.
import Foundation
import CryptoKit

public enum MaOffline {
  public static let buocGiay = 300
  public static let soChuSo = 6
  public static let dungSai = 1

  static func totp(_ biMat: String, _ dem: Int64, _ soChuSo: Int) -> String {
    var be = UInt64(bitPattern: dem).bigEndian
    let tin = withUnsafeBytes(of: &be) { Data($0) }
    let mac = Array(HMAC<Insecure.SHA1>.authenticationCode(for: tin, using: SymmetricKey(data: Data(biMat.utf8))))
    let off = Int(mac[mac.count - 1] & 0x0f)
    let bin = (Int(mac[off] & 0x7f) << 24) | (Int(mac[off + 1]) << 16) | (Int(mac[off + 2]) << 8) | Int(mac[off + 3])
    var mod = 1
    for _ in 0..<soChuSo { mod *= 10 }
    let s = String(bin % mod)
    return String(repeating: "0", count: max(0, soChuSo - s.count)) + s
  }

  /// Vân của bí mật: 12 ký tự hex đầu của SHA-256 (như agent Android `vanBiMat`, máy chủ `vanBiMat`).
  public static func van(_ biMat: String) -> String {
    SHA256.hash(data: Data(biMat.utf8)).map { String(format: "%02x", $0) }.joined().prefix(12).description
  }

  /// Mã của mốc `now` (đối chiếu / thử nghiệm).
  public static func ma(_ biMat: String, now: Date, buocGiay: Int = buocGiay, soChuSo: Int = soChuSo) -> String {
    totp(biMat, Int64(floor(now.timeIntervalSince1970)) / Int64(buocGiay), soChuSo)
  }

  /// Máy tự kiểm mã Ba Mẹ đọc: khớp bước hiện tại hoặc trong dung sai. So hết các bước (không thoát sớm).
  public static func kiem(_ biMat: String?, _ ma: String?, now: Date, buocGiay: Int = buocGiay, soChuSo: Int = soChuSo, dungSai: Int = dungSai) -> Bool {
    guard let biMat, !biMat.isEmpty else { return false }
    let sach = Array((ma ?? "").filter(\.isNumber).utf8)
    guard sach.count == soChuSo else { return false }
    let moc = Int64(floor(now.timeIntervalSince1970)) / Int64(buocGiay)
    var ok = false
    for i in -dungSai...dungSai {
      let mong = Array(totp(biMat, moc + Int64(i), soChuSo).utf8)
      var khac: UInt8 = 0
      for j in 0..<soChuSo { khac |= sach[j] ^ mong[j] }
      ok = ok || khac == 0
    }
    return ok
  }
}

public enum KetQuaMoOffline: String, Codable { case daMo, dangMo, sai, daDung, choThuLai, chuaCoBiMat }

/// Trạng thái «mở tạm bằng mã offline» (lưu trong app group ⇒ extension Monitor đọc được hạn mở).
public struct MoTamOffline: Codable, Equatable {
  public static let phutMoMacDinh = 60
  public static let saiToiDa = 5
  public static let cuaSoSaiPhut = 10
  /// Một mã còn được nhận tối đa (2·dung sai + 1) bước ⇒ nhớ mã đã dùng lâu hơn một bước cho chắc.
  public static let nhoMaDaDung = TimeInterval(MaOffline.buocGiay * (2 * MaOffline.dungSai + 2))

  public var moTu: Date?
  public var moDen: Date?
  public var maCuoi: String?
  public var maCuoiLuc: Date?
  public var saiLuc: [Date] = []
  /// Giờ muộn nhất máy từng thấy trong lượt mở (app + chuông lịch ghi lại) — đồng hồ bị lùi về trước mốc này ⇒ coi như hết mở.
  public var thayMuonNhat: Date?
  public init() {}

  /// Đang mở? Đồng hồ bị lùi (về trước lúc mở, hoặc về trước lần đã thấy) ⇒ coi như không mở (không kéo dài / hồi sinh bằng cách chỉnh giờ).
  public func dangMo(_ now: Date) -> Bool {
    guard let den = moDen, den > now else { return false }
    if let t = thayMuonNhat, now < t.addingTimeInterval(-120) { return false }
    return moTu.map { now >= $0.addingTimeInterval(-60) } ?? true
  }

  /// Ghi giờ đã thấy (gọi mỗi lần app / extension suy lại khiên). → true nếu có đổi (cần lưu).
  public mutating func ghiThay(_ now: Date) -> Bool {
    guard moDen != nil, (thayMuonNhat ?? .distantPast) < now else { return false }
    thayMuonNhat = now
    return true
  }

  /// Hạn mở còn hiệu lực lúc `now` (nil = không mở).
  public func hanMo(_ now: Date) -> Date? { dangMo(now) ? moDen : nil }

  public mutating func giayCho(_ now: Date) -> Int {
    don(now)
    guard saiLuc.count >= Self.saiToiDa else { return 0 }
    let cuNhat = saiLuc.filter { $0 <= now }.min() ?? now
    return max(1, Int(ceil(cuNhat.addingTimeInterval(TimeInterval(Self.cuaSoSaiPhut * 60)).timeIntervalSince(now))))
  }

  /// Con gõ mã Ba Mẹ đọc. Đúng ⇒ mở tới now + phut.
  public mutating func thuMo(biMat: String?, ma: String?, now: Date, phut: Int = phutMoMacDinh) -> KetQuaMoOffline {
    guard let biMat, !biMat.isEmpty else { return .chuaCoBiMat }
    if giayCho(now) > 0 { return .choThuLai }
    let sach = (ma ?? "").filter(\.isNumber)
    if let cu = maCuoi, let luc = maCuoiLuc, sach == cu, now.timeIntervalSince(luc) < Self.nhoMaDaDung, now >= luc.addingTimeInterval(-60) {
      return dangMo(now) ? .dangMo : .daDung
    }
    guard MaOffline.kiem(biMat, sach, now: now) else { saiLuc.append(now); return .sai }
    let p = min(120, max(5, phut))
    moTu = now; moDen = now.addingTimeInterval(TimeInterval(p * 60)); thayMuonNhat = now
    maCuoi = sach; maCuoiLuc = now; saiLuc = []
    return .daMo
  }

  mutating func don(_ now: Date) {
    let tu = now.addingTimeInterval(-TimeInterval(Self.cuaSoSaiPhut * 60))
    saiLuc.removeAll { $0 <= tu }     // mốc «ở tương lai» (đồng hồ lùi) vẫn giữ
    if saiLuc.count > 50 { saiLuc.removeFirst(saiLuc.count - 50) }
  }

  /// Có mạng lại (đồng bộ thành công) ⇒ kết thúc lượt mở đang chạy. → số phút còn lại bị bỏ (nil = không có lượt mở nào).
  public mutating func ketThucKhiCoMang(_ now: Date) -> Int? {
    guard dangMo(now), let den = moDen else { return nil }
    moDen = now
    return max(0, Int((den.timeIntervalSince(now) / 60).rounded()))
  }

  /// Câu cho Con (không nhắc điểm).
  public mutating func cau(_ kq: KetQuaMoOffline, now: Date) -> String {
    let gio = { (d: Date?) -> String in
      guard let d else { return "" }
      let f = DateFormatter(); f.dateFormat = "HH:mm"; return f.string(from: d)
    }
    switch kq {
    case .daMo: return "Đã mở \(max(1, Int(((moDen ?? now).timeIntervalSince(now) / 60).rounded()))) phút (tới \(gio(moDen))). Chơi vui nhé!"
    case .dangMo: return "Máy đang mở tới \(gio(moDen)) rồi nhé."
    case .sai: return "Mã chưa đúng. Con nhờ Ba Mẹ đọc lại nhé."
    case .daDung: return "Mã này dùng rồi. Con nhờ Ba Mẹ đọc mã mới nhé."
    case .choThuLai: return "Con gõ sai nhiều lần quá. Thử lại sau \(max(1, (giayCho(now) + 59) / 60)) phút nhé."
    case .chuaCoBiMat: return "Máy chưa nhận được mã của Ba Mẹ. Cần nối mạng một lần đã nhé."
    }
  }
}
