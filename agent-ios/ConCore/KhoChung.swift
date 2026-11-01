// Kho chung giữa app và các extension: UserDefaults của app group `group.vn.aiilab.aiigrow.con`.
// Token máy KHÔNG để ở đây (Keychain — xem HeThong/KhoBiMat.swift). Token mờ FamilyActivitySelection lưu ở đây dạng Data (chỉ trên máy).
import Foundation

public protocol KhoGiaTri: AnyObject {
  func data(_ khoa: String) -> Data?
  func ghi(_ d: Data?, _ khoa: String)
}

public final class KhoUserDefaults: KhoGiaTri {
  public static let appGroup = "group.vn.aiilab.aiigrow.con"
  let ud: UserDefaults
  public init(suite: String = KhoUserDefaults.appGroup) { ud = UserDefaults(suiteName: suite) ?? .standard }
  public func data(_ khoa: String) -> Data? { ud.data(forKey: khoa) }
  public func ghi(_ d: Data?, _ khoa: String) { if let d { ud.set(d, forKey: khoa) } else { ud.removeObject(forKey: khoa) } }
}

public final class KhoBoNho: KhoGiaTri {
  public var o: [String: Data] = [:]
  public init() {}
  public func data(_ khoa: String) -> Data? { o[khoa] }
  public func ghi(_ d: Data?, _ khoa: String) { o[khoa] = d }
}

public enum Khoa {
  public static let keHoach = "keHoach"
  public static let nhatKyDung = "nhatKyDung"
  public static let khienDangAp = "khienDangAp"
  public static let mayChu = "mayChu"
  public static let thongTinMay = "thongTinMay"
  public static let yeuCauDangCho = "yeuCauDangCho"
  public static let xinTuManChan = "xinTuManChan"
  public static let lanDongBo = "lanDongBo"
  public static let chonHoc = "chon.hoc"
  public static let chonGiaiTri = "chon.giaiTri"
  public static let chonChan = "chon.chan"
  public static let moTamOffline = "moTamOffline"
  public static let suKienCho = "suKienCho"
}

/// Sự kiện agent (POST api/device/su-kien, server/lib/may-con.ts › SU_KIEN_MAY): `ma` một lần ⇒ gửi lại khi có mạng không ghi trùng.
public struct SuKienMay: Codable, Equatable {
  public var ma: String; public var loai: String; public var luc: String; public var chiTiet: [String: String]
  public init(ma: String = UUID().uuidString, loai: String, luc: Date, chiTiet: [String: String] = [:]) {
    self.ma = ma; self.loai = loai; self.luc = NgayISO.viet(luc); self.chiTiet = chiTiet
  }
}

public extension KhoGiaTri {
  /// Xếp một sự kiện vào hàng chờ (giữ tối đa 50 cái mới nhất).
  func xepSuKien(_ e: SuKienMay) {
    var ds = doc([SuKienMay].self, Khoa.suKienCho) ?? []
    ds.append(e)
    luu(Array(ds.suffix(50)), Khoa.suKienCho)
  }
}

public extension KhoGiaTri {
  func doc<T: Decodable>(_ kieu: T.Type, _ khoa: String) -> T? {
    guard let d = data(khoa) else { return nil }
    let dec = JSONDecoder(); dec.dateDecodingStrategy = .secondsSince1970
    return try? dec.decode(T.self, from: d)
  }
  func luu<T: Encodable>(_ v: T?, _ khoa: String) {
    guard let v else { ghi(nil, khoa); return }
    let enc = JSONEncoder(); enc.dateEncodingStrategy = .secondsSince1970
    ghi(try? enc.encode(v), khoa)
  }
}

/// Thông tin máy đã ghép (không có token).
public struct ThongTinMay: Codable, Equatable {
  public var deviceId: String; public var tenCon: String?; public var dungChung: Bool
  public init(deviceId: String, tenCon: String?, dungChung: Bool) { self.deviceId = deviceId; self.tenCon = tenCon; self.dungChung = dungChung }
}

/// Lời xin thêm giờ Con đã gửi — để màn chính theo dõi trạng thái.
public struct YeuCauDangCho: Codable, Equatable {
  public var id: String; public var phut: Int; public var loiNhan: String; public var guiLuc: Date; public var trangThai: String
  public init(id: String, phut: Int, loiNhan: String, guiLuc: Date, trangThai: String) {
    self.id = id; self.phut = phut; self.loiNhan = loiNhan; self.guiLuc = guiLuc; self.trangThai = trangThai
  }
  /// Câu cho Con theo trạng thái máy chủ (cho | duoc | tu_choi) hoặc trangThai nguyên văn.
  public var cau: String {
    switch trangThai {
    case "cho": return "Đang chờ Ba Mẹ trả lời…"
    case "duoc", "dong_y", "da_thuc_thi", "tu_duyet": return "Ba Mẹ đã đồng ý thêm \(phut) phút!"
    case "het_han": return "Lời xin đã hết hạn — con gửi lại nhé."
    case "huy": return "Lời xin đã huỷ."
    default: return "Ba Mẹ chưa đồng ý lần này."
    }
  }
  public var xong: Bool { trangThai != "cho" }
}
