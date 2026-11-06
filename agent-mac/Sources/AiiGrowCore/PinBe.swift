// PIN theo bé trên Mac dùng chung (L13, thiết kế con-cai-mac màn 10–17, docs/API.md mục «S3»): máy khoá → «Ai đang dùng máy?» → chạm tên →
// PIN 4 số. Có mạng ⇒ máy chủ kiểm (`POST api/device/dang-nhap-be`); MẤT MẠNG ⇒ daemon tự kiểm bằng «vân PIN» máy chủ gửi trong `ho-so`
// (HMAC-SHA256(khoá = bí mật mã offline của máy, "<id bé>:<PIN>")) và tự đếm sai 5 lần / chờ 15 giây. Vân PIN KHÔNG bao giờ sang tray
// (tray chạy dưới tài khoản Con — có vân thì dò 10.000 PIN trong tích tắc).
import CryptoKit
import Foundation

/// Một bé trong «Ai đang dùng máy?».
public struct HoSoBe: Codable, Equatable, Sendable {
  public var id: String
  public var ten: String
  public var avatar: String?
  public var coPin: Bool
  /// Chỉ daemon giữ (cấu hình root 0600). `anChoTray()` xoá trước khi trả tray.
  public var vanPin: String?
  public var khoaDen: Date?
  public var choGiay: Int?
  public init(id: String, ten: String, avatar: String? = nil, coPin: Bool, vanPin: String? = nil, khoaDen: Date? = nil, choGiay: Int? = nil) {
    self.id = id; self.ten = ten; self.avatar = avatar; self.coPin = coPin; self.vanPin = vanPin; self.khoaDen = khoaDen; self.choGiay = choGiay
  }
}

/// `GET api/device/ho-so`.
public struct HoSoMay: Codable, Equatable, Sendable {
  public var con: [HoSoBe] = []
  public var mayRieng = false
  public var dangDung: String?
  public var baMeDen: Date?
  public var pinSaiToiDa = PinBe.saiToiDa
  public var pinChoGiay = PinBe.choGiay
  public init() {}

  /// Đọc khoan dung phản hồi máy chủ (id số hay chuỗi đều nhận; phần tử thiếu id/tên bỏ qua).
  public static func doc(_ d: Data) -> HoSoMay? {
    guard let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] else { return nil }
    var h = HoSoMay()
    for c in o["con"] as? [[String: Any]] ?? [] {
      guard let id = JsonMem.chuoi(c["id"]), !id.isEmpty, let ten = c["ten"] as? String else { continue }
      h.con.append(HoSoBe(id: id, ten: ten, avatar: c["avatar"] as? String, coPin: (c["coPin"] as? Bool) ?? false,
                          vanPin: (c["vanPin"] as? String).flatMap { $0.isEmpty ? nil : $0.lowercased() },
                          khoaDen: NgayGio.doc(c["khoaDen"] as? String), choGiay: (c["choGiay"] as? NSNumber)?.intValue))
    }
    h.mayRieng = (o["mayRieng"] as? Bool) ?? false
    h.dangDung = ((o["dangDung"] as? [String: Any]).flatMap { JsonMem.chuoi($0["id"]) })
    h.baMeDen = ((o["baMeDung"] as? [String: Any]).flatMap { NgayGio.doc($0["den"] as? String) })
    if let n = (o["pinSaiToiDa"] as? NSNumber)?.intValue, n > 0 { h.pinSaiToiDa = n }
    if let n = (o["pinChoGiay"] as? NSNumber)?.intValue, n > 0 { h.pinChoGiay = n }
    return h
  }

  /// Bản gửi tray: bỏ vân PIN.
  public func anChoTray() -> HoSoMay {
    var h = self
    h.con = h.con.map { var b = $0; b.vanPin = nil; return b }
    return h
  }
}

public enum PinBe {
  public static let saiToiDa = 5
  public static let choGiay = 15
  /// Lượt sai cũ hơn 15 phút không cộng dồn (như máy chủ).
  public static let quenSaiGiay: TimeInterval = 15 * 60

  public static func hopLe(_ pin: String) -> Bool { pin.count == 4 && pin.allSatisfy { $0.isASCII && $0.isNumber } }

  /// Vân PIN như `server/lib/pin-be.ts › vanPin`.
  public static func van(biMat: String, con: String, pin: String) -> String {
    let mac = HMAC<SHA256>.authenticationCode(for: Data("\(con):\(pin)".utf8), using: SymmetricKey(data: Data(biMat.utf8)))
    return mac.map { String(format: "%02x", $0) }.joined()
  }

  /// So không thoát sớm.
  public static func kiem(biMat: String?, con: String, pin: String, van mong: String?) -> Bool {
    guard let biMat, !biMat.isEmpty, let mong, hopLe(pin) else { return false }
    let a = Array(van(biMat: biMat, con: con, pin: pin).utf8), b = Array(mong.lowercased().utf8)
    guard a.count == b.count else { return false }
    var khac: UInt8 = 0
    for i in 0..<a.count { khac |= a[i] ^ b[i] }
    return khac == 0
  }
}

/// Bộ đếm sai PIN tại máy (lúc mất mạng): sai `saiToiDa` lần ⇒ chờ `choGiay` giây; lần thử trong lúc chờ không tính thêm.
public struct BoDemSaiPin: Codable, Equatable, Sendable {
  public var sai: [String: [Date]] = [:]
  public var khoaDen: [String: Date] = [:]
  /// Số lần bị khoá liên tiếp (chưa đúng lần nào) — mất mạng thì chờ gấp đôi mỗi lần (15 giây → tối đa 15 phút) để không dò hết 10.000 PIN.
  public var lanKhoa: [String: Int] = [:]
  public init() {}
  public static let choToiDa = 15 * 60

  /// Giây còn phải chờ (0 = thử được).
  public func choGiay(con: String, now: Date) -> Int {
    guard let d = khoaDen[con], d > now else { return 0 }
    return max(1, Int(ceil(d.timeIntervalSince(now))))
  }

  /// Ghi một lần sai ⇒ (số lần còn, giây chờ). Lần sai thứ `saiToiDa` ⇒ khoá `choGiay` giây và xoá đếm.
  public mutating func ghiSai(con: String, now: Date, saiToiDa: Int = PinBe.saiToiDa, choGiay: Int = PinBe.choGiay) -> (conLan: Int, choGiay: Int) {
    var ds = (sai[con] ?? []).filter { now.timeIntervalSince($0) < PinBe.quenSaiGiay && $0 <= now.addingTimeInterval(60) }
    ds.append(now)
    if ds.count >= saiToiDa {
      sai[con] = []
      let lan = (lanKhoa[con] ?? 0) + 1
      lanKhoa[con] = lan
      let cho = min(BoDemSaiPin.choToiDa, choGiay << min(lan - 1, 10))
      khoaDen[con] = now.addingTimeInterval(TimeInterval(cho))
      return (0, cho)
    }
    sai[con] = ds
    return (saiToiDa - ds.count, 0)
  }

  public mutating func xoa(con: String) { sai[con] = nil; khoaDen[con] = nil; lanKhoa[con] = nil }
}

/// Ai đang dùng máy — từ khối `nguoiDung` của dong-bo / nhip (máy chủ) hoặc trạng thái cục bộ lúc mất mạng.
public enum NguoiDungMay: Codable, Equatable, Sendable {
  /// máy dùng chung chưa ai vào ⇒ màn chọn tên
  case chua
  case con(id: String, ten: String)
  /// Ba Mẹ mở bằng mã — tới `den`
  case baMe(den: Date?)

  public static func doc(_ o: Any?) -> NguoiDungMay? {
    guard let o = o as? [String: Any], let loai = o["loai"] as? String else { return nil }
    switch loai {
    case "chua": return .chua
    case "ba_me": return .baMe(den: NgayGio.doc(o["den"] as? String))
    case "con":
      let c = o["con"] as? [String: Any]
      guard let id = JsonMem.chuoi(c?["id"]) else { return nil }
      return .con(id: id, ten: c?["ten"] as? String ?? "")
    default: return nil
    }
  }

  public var loai: String {
    switch self { case .chua: return "chua"; case .con: return "con"; case .baMe: return "ba_me" }
  }
}

/// Trạng thái «ai đang dùng» daemon giữ: bản máy chủ + phần cục bộ lúc mất mạng (đăng nhập bé bằng vân PIN, Ba Mẹ mở bằng mã offline,
/// Đổi bé / Khoá lại khi chưa gửi được). Hết hạn Ba Mẹ dùng ⇒ về màn chọn tên NGAY tại máy, không chờ mạng.
public struct PhienMay: Codable, Equatable, Sendable {
  public var mayChu: NguoiDungMay?
  /// Ghi đè cục bộ (có hiệu lực tới khi máy chủ trả lại khối `nguoiDung` MỚI hơn lúc ghi).
  public var cucBo: NguoiDungMay?
  public var cucBoLuc: Date?
  /// Ghi đè «Ba Mẹ dùng» do mã mở offline (máy chủ không biết) — chỉ loại này được giữ tới hạn khi máy chủ nói khác.
  public var baMeOffline = false
  public init() {}

  /// nil = máy chủ cũ / máy riêng chưa gửi khối ⇒ chạy như trước (không màn chọn tên).
  public func hieuLuc(now: Date) -> NguoiDungMay? {
    let n = cucBo ?? mayChu
    if case let .baMe(den)? = n, let den, den <= now { return .chua }
    return n
  }

  /// Máy chủ trả khối mới (đồng bộ bắt đầu SAU lúc ghi cục bộ) ⇒ bỏ phần cục bộ. Riêng «Ba Mẹ mở bằng mã lúc mất mạng» giữ tới hạn
  /// (máy chủ không biết lượt mở offline — có mạng lại không cắt ngang Ba Mẹ đang dùng).
  /// `daGuiHet` = mọi lệnh máy dùng chung làm lúc mất mạng đã tới máy chủ — chưa tới thì giữ phần cục bộ (máy chủ còn trạng thái cũ).
  public mutating func nhanMayChu(_ n: NguoiDungMay?, guiLuc: Date, now: Date, daGuiHet: Bool = true) {
    guard let n else { return }
    mayChu = n
    if baMeOffline, case let .baMe(den)? = cucBo, let den, den > now, n.loai != "ba_me" { return }
    if daGuiHet, let l = cucBoLuc, guiLuc >= l { cucBo = nil; cucBoLuc = nil; baMeOffline = false }
  }

  /// Giờ / quỹ của con chỉ tính khi một bé đang dùng (hoặc máy chủ cũ không nói gì).
  public static func tinhGioCon(_ n: NguoiDungMay?) -> Bool {
    switch n { case nil, .con?: return true; default: return false }
  }

  /// Áp «ai đang dùng» lên Policy hiệu lực:
  /// - chưa ai vào ⇒ chỉ app hệ thống (màn chọn tên che máy), KHÔNG đếm ngược đăng xuất (màn chọn tên không phải khoá phạt);
  /// - Ba Mẹ dùng (còn hạn) ⇒ mở hết, không app Giải trí nào bị đóng vì quỹ của con.
  public static func apDung(_ p: Policy, _ hl: PolicyHieuLuc, _ n: NguoiDungMay?, now: Date) -> (Policy, PolicyHieuLuc) {
    var q = p, h = hl
    switch n {
    case .chua?:
      q.allowedApps = []; q.appTinhGio = []
      // giờ ngủ / Ba Mẹ khoá vẫn giữ (đếm ngược đăng xuất chạy tiếp — «Đổi bé» không thoát được giờ ngủ); chỉ không tự KHOÁ vì «chưa ai vào»
      h.moDen = nil; h.chiAppHoc = true
    case let .baMe(den)? where (den ?? .distantFuture) > now:
      q.mode = CheDo.tuDo.rawValue; q.blockedApps = []; q.appTinhGio = []
      h.khoa = false; h.lyDoKhoa = nil; h.chiAppHoc = false; h.moDen = den
    default: break
    }
    return (q, h)
  }

  public mutating func datCucBo(_ n: NguoiDungMay, now: Date, baMeOffline: Bool = false) { cucBo = n; cucBoLuc = now; self.baMeOffline = baMeOffline }
}
