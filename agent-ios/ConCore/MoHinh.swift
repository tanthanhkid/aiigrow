// Mô hình phản hồi máy chủ cho máy iPhone/iPad (platform "ios"). Chỉ Foundation — không đụng API hệ thống, để test thuần.
//   POST api/device/nhip ⇒ { serverTime, tuanThu, chinhSach, nenTang, lenh[] }   (server/lib/nhip-may.ts)
//   nenTang = chuyenDoi(chinhSach, "ios")                                           (server/lib/chuyen-doi.ts, case "ios")
import Foundation

/// JSON tự do — `cauHinh` của từng mục nền tảng có hình dạng khác nhau.
public enum JSON: Codable, Equatable {
  case so(Double), chuoi(String), bool(Bool), mang([JSON]), doiTuong([String: JSON]), rong

  public init(from decoder: Decoder) throws {
    let c = try decoder.singleValueContainer()
    if c.decodeNil() { self = .rong }
    else if let b = try? c.decode(Bool.self) { self = .bool(b) }
    else if let d = try? c.decode(Double.self) { self = .so(d) }
    else if let s = try? c.decode(String.self) { self = .chuoi(s) }
    else if let a = try? c.decode([JSON].self) { self = .mang(a) }
    else { self = .doiTuong(try c.decode([String: JSON].self)) }
  }

  public func encode(to encoder: Encoder) throws {
    var c = encoder.singleValueContainer()
    switch self {
    case .so(let d): try c.encode(d)
    case .chuoi(let s): try c.encode(s)
    case .bool(let b): try c.encode(b)
    case .mang(let a): try c.encode(a)
    case .doiTuong(let o): try c.encode(o)
    case .rong: try c.encodeNil()
    }
  }

  public subscript(k: String) -> JSON? { if case .doiTuong(let o) = self { return o[k] }; return nil }
  public var chuoi: String? { if case .chuoi(let s) = self { return s }; return nil }
  public var so: Double? { if case .so(let d) = self { return d }; return nil }
  public var bool: Bool? { if case .bool(let b) = self { return b }; return nil }
  public var mang: [JSON]? { if case .mang(let a) = self { return a }; return nil }
  public var dsChuoi: [String] { mang?.compactMap(\.chuoi) ?? [] }
  public var khung: Khung? {
    guard let tu = self["tu"]?.chuoi, let den = self["den"]?.chuoi else { return nil }
    return Khung(tu: tu, den: den)
  }
  public var dsKhung: [Khung] { mang?.compactMap(\.khung) ?? [] }
}

public struct Khung: Codable, Equatable {
  public var tu: String, den: String
  public init(tu: String, den: String) { self.tu = tu; self.den = den }
  /// "HH:mm" ⇒ phút trong ngày; "24:00" ⇒ 1440.
  public static func phut(_ s: String) -> Int {
    let p = s.split(separator: ":").compactMap { Int($0) }
    guard p.count == 2 else { return 0 }
    return max(0, min(1440, p[0] * 60 + p[1]))
  }
  public var tuPhut: Int { Khung.phut(tu) }
  public var denPhut: Int { Khung.phut(den) }
  /// Phút `m` (0…1439) có nằm trong khung không — khung qua nửa đêm (tu > den) được hiểu là hai đoạn.
  public func chua(_ m: Int) -> Bool {
    let a = tuPhut, b = denPhut
    if a == b { return false }
    return a < b ? (m >= a && m < b) : (m >= a || m < b)
  }
}

public struct MucChung: Codable, Equatable { public var muc: String; public var kieu: String }

public struct ChinhSach: Codable {
  public struct May: Codable { public var id: String; public var ten: String; public var nen: String; public var dungChung: Bool }
  public struct Con: Codable { public var id: String; public var ten: String }
  public struct GioChoi: Codable {
    public var ngayThuong: [Khung]; public var cuoiTuan: [Khung]; public var ngu: Khung
    public var tranNgayPhut: Int; public var tranTuanPhut: Int
  }
  public struct UngDung: Codable { public var hoc: [MucChung]; public var giaiTri: [MucChung]; public var chan: [MucChung] }
  public struct NgoaiLe: Codable { public var phutThemHomNay: Int; public var moKhanCapDen: String? }
  public struct HieuLuc: Codable { public var giaiTriDuocMo: Bool; public var lyDo: [String] }
  /// Phiên «Chơi bằng điểm» đang chạy (server/lib/chinh-sach.ts › phienDiem.phien): Con mở trên app AiiGrow (màn Con /tre/choi) hay máy khác.
  public struct PhienDang: Codable, Equatable {
    public var id: String; public var muc: String; public var conPhut: Int
    /// Máy mở phiên (máy chủ mới gửi). Khác máy này ⇒ không gỡ khiên ở đây (phiên mở trên máy tính không mở iPhone).
    public var may: String?
    public init(id: String, muc: String, conPhut: Int, may: String? = nil) { self.id = id; self.muc = muc; self.conPhut = conPhut; self.may = may }
  }
  public struct PhienDiem: Codable { public var soDu: Int?; public var phien: PhienDang? }

  public var serverTime: String
  public var tz: String
  public var may: May
  public var con: Con?
  public var gioChoi: GioChoi
  public var ungDung: UngDung
  public var khoaNgay: Bool
  public var ngoaiLe: NgoaiLe
  public var gioMaySai: Bool
  public var hieuLuc: HieuLuc
  /// Máy chủ cũ không gửi ⇒ nil (không có phiên điểm).
  public var phienDiem: PhienDiem?
}

public struct MucNenTang: Codable {
  public var khaNang: String; public var mucDo: String; public var coChe: String
  public var cauHinh: [String: JSON]?
}

public struct NenTang: Codable {
  public var nen: String
  public var nhipGiay: Int?
  public var muc: [MucNenTang]
  public func cauHinh(_ khaNang: String) -> [String: JSON] { muc.first { $0.khaNang == khaNang }?.cauHinh ?? [:] }
}

public struct Lenh: Codable, Equatable { public var id: String; public var loai: String }

/// Phản hồi `POST api/device/nhip`. `grantEndsAt` / `moDen`: hạn «thêm giờ đã duyệt» — máy chủ hiện CHƯA trả cho iOS (xem CAN-SERVER.md);
/// đọc nếu có, không có thì dùng `chinhSach.ngoaiLe.moKhanCapDen`.
public struct NhipTraVe: Codable {
  public var serverTime: String
  public var chinhSach: ChinhSach
  public var nenTang: NenTang
  public var lenh: [Lenh]
  public var grantEndsAt: String?
  public var moDen: String?
  /// Bí mật mã mở offline (TOTP, server/lib/ma-offline.ts) — app nhớ trong Keychain để tự kiểm mã Ba Mẹ đọc khi mất mạng.
  /// Chỉ gửi khi vân app báo (`NhipGui.maOfflineVan`) lệch; máy chủ cũ: nil.
  public var maOfflineBiMat: String?
}

public enum NgayISO {
  private static func f(_ phanGiay: Bool) -> ISO8601DateFormatter {
    let x = ISO8601DateFormatter()
    x.formatOptions = phanGiay ? [.withInternetDateTime, .withFractionalSeconds] : [.withInternetDateTime]
    return x
  }
  public static func doc(_ s: String?) -> Date? {
    guard let s, !s.isEmpty else { return nil }
    return f(true).date(from: s) ?? f(false).date(from: s)
  }
  public static func viet(_ d: Date) -> String { f(true).string(from: d) }
}
