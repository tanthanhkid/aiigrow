// Mã mở offline (bản Swift của agent-win MaOffline.cs + MoTamOffline.cs): máy MẤT MẠNG ⇒ Ba Mẹ xem mã 6 số trong app, đọc cho Con gõ vào
// màn khoá; daemon tự kiểm KHÔNG cần máy chủ nhờ bí mật chung (Policy.maOfflineBiMat, máy chủ gửi qua dong-bo khi còn mạng).
// Phải ra ĐÚNG số như máy chủ (server/lib/ma-offline.ts) — TOTP RFC 6238 (HMAC-SHA1), bước 5 phút, dung sai ±1 bước.
// Đây là đường NỚI LỎNG do Ba Mẹ chủ động: sai tối đa 5 lần / 10 phút, một mã một lượt, có hạn giờ, có mạng lại thì kết thúc ngay.
import CryptoKit
import Foundation

public enum MaOffline {
  public static let buocGiay = 300
  public static let soChuSo = 6
  public static let dungSai = 1

  static func totp(_ biMat: String, _ dem: Int64, soChuSo: Int = MaOffline.soChuSo) -> String {
    var be = UInt64(bitPattern: dem).bigEndian
    let thongDiep = withUnsafeBytes(of: &be) { Data($0) }
    let mac = Array(HMAC<Insecure.SHA1>.authenticationCode(for: thongDiep, using: SymmetricKey(data: Data(biMat.utf8))))
    let off = Int(mac[mac.count - 1] & 0x0f)
    let bin = (Int(mac[off] & 0x7f) << 24) | (Int(mac[off + 1]) << 16) | (Int(mac[off + 2]) << 8) | Int(mac[off + 3])
    var mod = 1; for _ in 0..<soChuSo { mod *= 10 }
    let s = String(bin % mod)
    return String(repeating: "0", count: max(0, soChuSo - s.count)) + s
  }

  /// Mã của bước hiện tại (để đối chiếu / test).
  public static func ma(_ biMat: String, luc: Date) -> String { totp(biMat, Int64(floor(luc.timeIntervalSince1970)) / Int64(buocGiay)) }

  /// Kiểm mã Ba Mẹ đọc: khớp bước hiện tại hoặc ±1 bước. So hết các bước (không thoát sớm), so từng byte không thoát sớm.
  public static func kiem(_ biMat: String?, _ ma: String?, luc: Date) -> Bool {
    guard let biMat, !biMat.isEmpty else { return false }
    let sach = Array((ma ?? "").filter { $0.isASCII && $0.isNumber }.utf8)
    guard sach.count == soChuSo else { return false }
    let moc = Int64(floor(luc.timeIntervalSince1970)) / Int64(buocGiay)
    var dung = false
    for i in -Int64(dungSai)...Int64(dungSai) {
      let mong = Array(totp(biMat, moc + i).utf8)
      var khac: UInt8 = 0
      for j in 0..<soChuSo { khac |= sach[j] ^ mong[j] }
      dung = dung || khac == 0
    }
    return dung
  }
}

public enum KetQuaMoOffline: Equatable { case daMo, dangMo, sai, daDung, choThuLai, chuaCoBiMat }

/// Trạng thái «mở tạm bằng mã offline» — lưu trong cấu hình (daemon khởi động lại vẫn giữ). Đồng hồ bị lùi về trước lúc mở ⇒ coi như không mở.
public struct MoTamOffline: Codable, Equatable {
  public static let phutMoMacDinh = 60
  public static let saiToiDa = 5
  public static let cuaSoSaiGiay: TimeInterval = 10 * 60
  /// Một mã còn được nhận tối đa (2·dung sai + 1) bước ⇒ nhớ mã đã dùng lâu hơn một bước cho chắc.
  public static let nhoMaDaDung: TimeInterval = TimeInterval(MaOffline.buocGiay * (2 * MaOffline.dungSai + 2))

  public var moTu: Date?
  public var moDen: Date?
  public var maCuoi: String?
  public var maCuoiLuc: Date?
  public var saiLuc: [Date] = []
  public init() {}

  public func dangMo(_ now: Date) -> Bool {
    guard let den = moDen, den > now else { return false }
    return moTu.map { now >= $0.addingTimeInterval(-60) } ?? true
  }

  /// Số giây còn phải chờ trước khi được gõ tiếp (0 = gõ được).
  public mutating func choGiay(_ now: Date) -> Int {
    don(now)
    guard saiLuc.count >= MoTamOffline.saiToiDa else { return 0 }
    let cuNhat = saiLuc.filter { $0 <= now }.min() ?? now
    return max(1, Int(ceil(cuNhat.addingTimeInterval(MoTamOffline.cuaSoSaiGiay).timeIntervalSince(now))))
  }

  public mutating func thuMo(biMat: String?, ma: String?, now: Date, phut: Int = MoTamOffline.phutMoMacDinh) -> KetQuaMoOffline {
    guard let biMat, !biMat.isEmpty else { return .chuaCoBiMat }
    if choGiay(now) > 0 { return .choThuLai }
    let sach = (ma ?? "").filter { $0.isASCII && $0.isNumber }
    if let c = maCuoi, let l = maCuoiLuc, sach == c, now.timeIntervalSince(l) < MoTamOffline.nhoMaDaDung, now >= l.addingTimeInterval(-60) {
      return dangMo(now) ? .dangMo : .daDung
    }
    guard MaOffline.kiem(biMat, sach, luc: now) else { saiLuc.append(now); return .sai }
    let p = min(max(phut, 5), 120)
    moTu = now; moDen = now.addingTimeInterval(TimeInterval(p * 60))
    maCuoi = sach; maCuoiLuc = now; saiLuc = []
    return .daMo
  }

  /// Mốc sai «ở tương lai» (đồng hồ bị lùi) vẫn giữ để không xoá được lượt sai bằng cách chỉnh giờ.
  private mutating func don(_ now: Date) {
    let tu = now.addingTimeInterval(-MoTamOffline.cuaSoSaiGiay)
    saiLuc.removeAll { $0 <= tu }
    if saiLuc.count > 50 { saiLuc.removeFirst(saiLuc.count - 50) }
  }

  /// Câu cho Con (không nhắc điểm).
  public mutating func cau(_ kq: KetQuaMoOffline, now: Date) -> String {
    let gio = DateFormatter(); gio.dateFormat = "HH:mm"
    switch kq {
    case .daMo: return "Đã mở \(max(1, Int(((moDen ?? now).timeIntervalSince(now) / 60).rounded()))) phút (tới \(gio.string(from: moDen ?? now))). Chơi vui nhé!"
    case .dangMo: return "Máy đang mở tới \(gio.string(from: moDen ?? now)) rồi nhé."
    case .sai: return "Mã chưa đúng. Con nhờ Ba Mẹ đọc lại nhé."
    case .daDung: return "Mã này dùng rồi. Con nhờ Ba Mẹ đọc mã mới nhé."
    case .choThuLai: return "Con gõ sai nhiều lần quá. Thử lại sau \(max(1, (choGiay(now) + 59) / 60)) phút nhé."
    case .chuaCoBiMat: return "Máy chưa nhận được mã của Ba Mẹ. Cần nối mạng một lần đã nhé."
    }
  }

  /// Lý do khoá nào mã gỡ được (để màn khoá biết có hiện ô nhập mã): hết giờ, giờ ngủ, Ba Mẹ «Khoá ngay».
  public static func moDuocKhoa(_ lyDo: String?) -> Bool { [LyDoKhoa.hetGio, LyDoKhoa.ngu, LyDoKhoa.khoa].contains(lyDo ?? "") }

  /// Áp «mở tạm» lên Policy hiệu lực: bỏ khoá (lý do gỡ được) và bỏ «chỉ app học» — mất mạng thì đây là đường DUY NHẤT mở máy.
  public static func apDung(_ hl: PolicyHieuLuc, dangMo: Bool) -> PolicyHieuLuc {
    guard dangMo else { return hl }
    var h = hl
    if h.khoa && moDuocKhoa(h.lyDoKhoa) { h.khoa = false; h.lyDoKhoa = nil }
    h.chiAppHoc = false
    return h
  }
}
