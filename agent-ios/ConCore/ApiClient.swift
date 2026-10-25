// Client máy chủ cho app Con iOS. Bearer = token thiết bị (ghép bằng mã 6 số hoặc token gói cài trong link /cai/<token>).
//   POST api/device/ghep       {ma, nen: "ios", tenMay}  | {token, nen: "ios", tenMay}  → {deviceId, token, dungChung, childName?}
//   POST api/device/nhip       NhipGui                                                  → NhipTraVe
//   POST api/device/yeu-cau    {loai: "them_gio", phut, lyDo}                          → {id, trang_thai, status}
//   GET  api/device/yeu-cau/:id                                                         → {status: duoc|cho|tu_choi, trangThai}
//   POST api/device/lenh/:id/xong                                                       (báo xong lệnh «go»)
//   POST api/device/su-kien    {ds: [SuKienMay]}                                        → {nhan}
//   POST api/device/phien-web  {}                                                       → {phienCon, het}  (mở màn Con của app AiiGrow)
//   POST api/device/ho-so-dns  {}                                                       → {apple: {mobileconfig, tep}, …}
// Lỗi: {error, message} (server/lib/api.ts).
import Foundation

public protocol VanChuyen {
  func gui(_ req: URLRequest) async throws -> (Data, Int)
}

public struct VanChuyenURLSession: VanChuyen {
  public init() {}
  public func gui(_ req: URLRequest) async throws -> (Data, Int) {
    let (d, r) = try await URLSession.shared.data(for: req)
    return (d, (r as? HTTPURLResponse)?.statusCode ?? 0)
  }
}

public enum LoiApi: Error, Equatable, LocalizedError {
  case mayChu(ma: String, cau: String, http: Int)
  case mang(String)
  case giaiMa

  public var errorDescription: String? {
    switch self {
    case .mayChu(_, let cau, _): return cau
    case .mang: return "Chưa kết nối được máy chủ AiiGrow. Con kiểm tra Wi-Fi hoặc 4G rồi thử lại nhé."
    case .giaiMa: return "Máy chủ trả về dữ liệu lạ. Thử lại sau ít phút nhé."
    }
  }
  public var chuaGhep: Bool { if case .mayChu(_, _, 401) = self { return true }; return false }
}

public struct KetQuaGhep: Codable, Equatable {
  public var deviceId: String; public var token: String; public var dungChung: Bool?; public var childName: String?
}

public struct KetQuaYeuCau: Codable, Equatable {
  public var id: String; public var trang_thai: String?; public var status: String?
  public var tuDuyet: Bool { status == "tu_duyet" || trang_thai == "dong_y" }
}

public struct TrangThaiYeuCau: Codable, Equatable { public var status: String; public var trangThai: String? }

public struct HoSoDns: Codable, Equatable {
  public struct Apple: Codable, Equatable { public var mobileconfig: String; public var tep: String }
  public var apple: Apple
}

/// Nhịp gửi lên (khớp NhipVao ở server/lib/tuan-thu.ts). `ios` là phần thêm — máy chủ hiện bỏ qua (CAN-SERVER.md).
public struct NhipGui: Codable, Equatable {
  public struct ThanhPhan: Codable, Equatable { public var quyenQuanLy: Bool; public var monitor: Bool }
  public struct Ios: Codable, Equatable {
    public var soAppHoc: Int; public var soAppGiaiTri: Int; public var soAppChan: Int
    public var soDanhMucGiaiTri: Int; public var phutDaDung: Int; public var uyQuyen: String
  }
  public var phienBan: String
  public var clientTime: String
  public var appQuanLyBat: Bool
  public var thanhPhan: ThanhPhan
  public var nguon: String
  public var matKetNoiPhut: Int?
  public var ios: Ios
  /// Vân bí mật mã offline đang nhớ (MaOffline.van) — khớp thì máy chủ không gửi lại bí mật (server/lib/nhip-may.ts).
  public var maOfflineVan: String? = nil
}

public final class ApiClient {
  public static let mayChuMacDinh = URL(string: "https://aiigrow.aiilab.vn")!
  public let goc: URL
  public var token: String?
  let vc: VanChuyen

  public init(goc: URL = ApiClient.mayChuMacDinh, token: String? = nil, vanChuyen: VanChuyen = VanChuyenURLSession()) {
    self.goc = goc; self.token = token; self.vc = vanChuyen
  }

  func yeuCau(_ method: String, _ duong: String, _ body: Data?) -> URLRequest {
    var r = URLRequest(url: goc.appendingPathComponent(duong))
    r.httpMethod = method
    r.timeoutInterval = 20
    r.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    r.httpBody = body
    return r
  }

  func goi<T: Decodable>(_ method: String, _ duong: String, _ body: Data? = nil, _ kieu: T.Type) async throws -> T {
    let (d, ma): (Data, Int)
    do { (d, ma) = try await vc.gui(yeuCau(method, duong, body)) } catch { throw LoiApi.mang(error.localizedDescription) }
    guard (200..<300).contains(ma) else {
      let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
      throw LoiApi.mayChu(ma: o?["error"] as? String ?? "http_\(ma)",
                          cau: o?["message"] as? String ?? "Máy chủ báo lỗi (\(ma)). Thử lại sau ít phút nhé.", http: ma)
    }
    do { return try JSONDecoder().decode(T.self, from: d) } catch { throw LoiApi.giaiMa }
  }

  static func json(_ o: [String: Any]) -> Data { (try? JSONSerialization.data(withJSONObject: o)) ?? Data() }

  public func ghepBangMa(_ ma: String, tenMay: String) async throws -> KetQuaGhep {
    try await goi("POST", "api/device/ghep", Self.json(["ma": ma.filter(\.isNumber), "nen": "ios", "tenMay": tenMay]), KetQuaGhep.self)
  }

  public func ghepBangToken(_ t: String, tenMay: String) async throws -> KetQuaGhep {
    try await goi("POST", "api/device/ghep-goi", Self.json(["token": t, "nen": "ios", "tenMay": tenMay]), KetQuaGhep.self)
  }

  public func nhip(_ b: NhipGui) async throws -> NhipTraVe {
    try await goi("POST", "api/device/nhip", try JSONEncoder().encode(b), NhipTraVe.self)
  }

  public func xinThemGio(phut: Int, loiNhan: String) async throws -> KetQuaYeuCau {
    let ly = loiNhan.trimmingCharacters(in: .whitespacesAndNewlines)
    return try await goi("POST", "api/device/yeu-cau",
                         Self.json(["loai": "them_gio", "phut": phut, "lyDo": ly.isEmpty ? "Con xin thêm \(phut) phút" : String(ly.prefix(100))]),
                         KetQuaYeuCau.self)
  }

  public func trangThaiYeuCau(_ id: String) async throws -> TrangThaiYeuCau {
    try await goi("GET", "api/device/yeu-cau/\(id)", nil, TrangThaiYeuCau.self)
  }

  public func guiSuKien(_ ds: [SuKienMay]) async throws {
    struct Nhan: Decodable {}
    let body = try JSONEncoder().encode(["ds": ds])
    _ = try await goi("POST", "api/device/su-kien", body, Nhan.self)
  }

  /// Phiên Con 12 giờ cho màn Con (/tre) — app AiiGrow mở bằng `aiigrow://tre/nha?phien=…` (không cần chọn hồ sơ + PIN trên máy riêng).
  public func phienWeb() async throws -> String {
    struct P: Decodable { var phienCon: String }
    return try await goi("POST", "api/device/phien-web", Self.json([:]), P.self).phienCon
  }

  /// Hồ sơ DNS gia đình (.mobileconfig) của chính máy này — server/lib/dns-gia-dinh.ts › hoSoDns.
  public func hoSoDns() async throws -> HoSoDns {
    try await goi("POST", "api/device/ho-so-dns", Self.json([:]), HoSoDns.self)
  }

  public func xongLenh(_ id: String) async throws {
    struct Ok: Decodable {}
    _ = try await goi("POST", "api/device/lenh/\(id)/xong", Self.json([:]), Ok.self)
  }
}
