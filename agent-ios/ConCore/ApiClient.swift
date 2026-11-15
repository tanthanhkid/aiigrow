// Client máy chủ cho app Con iOS. Bearer = token thiết bị (ghép bằng mã 6 số hoặc token gói cài trong link /cai/<token>).
//   POST api/device/ghep       {ma, nen: "ios", tenMay}  | {token, nen: "ios", tenMay}  → {deviceId, token, dungChung, childName?}
//   POST api/device/nhip       NhipGui                                                  → NhipTraVe
//   POST api/device/hoc-vien/xin-vay {soSao, mucDich?, quaId?, loiNhan?}                → {id, trang_thai}   (15/11: thay «xin thêm giờ» / ngoại lệ)
//   GET  api/device/hoc-vien/sao                                                        → {sao (âm được), no, phutCon, hetSao, cau, mucVay}
//   GET  api/device/yeu-cau/:id                                                         → {status: duoc|cho|tu_choi, trangThai, ketQua?, nhom?, tenNguoiDuyet?, loiNhan?}
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
  /// Lỗi máy chủ kèm trường phụ (S3: `conLan`, `choGiay`) — chỉ các lệnh PIN / mã Ba Mẹ ném loại này.
  case chiTiet(ma: String, cau: String, http: Int, conLan: Int?, choGiay: Int?)

  public var errorDescription: String? {
    switch self {
    case .mayChu(_, let cau, _): return cau
    case .chiTiet(_, let cau, _, _, _): return cau
    case .mang: return "Chưa kết nối được máy chủ AiiGrow. Con kiểm tra Wi-Fi hoặc 4G rồi thử lại nhé."
    case .giaiMa: return "Máy chủ trả về dữ liệu lạ. Thử lại sau ít phút nhé."
    }
  }
  public var chuaGhep: Bool { if case .mayChu(_, _, 401) = self { return true }; return false }
  /// Lỗi tạm (mất mạng, 5xx, dữ liệu lạ) — việc chờ nên giữ lại thử sau, không coi là máy chủ từ chối.
  public var tamThoi: Bool {
    switch self {
    case .mang, .giaiMa: return true
    case .mayChu(_, _, let h), .chiTiet(_, _, let h, _, _): return h >= 500 || h == 0
    }
  }
  /// Mã lỗi máy chủ (nil = mất mạng / dữ liệu lạ).
  public var ma: String? {
    switch self { case .mayChu(let m, _, _), .chiTiet(let m, _, _, _, _): return m; default: return nil }
  }
}

public struct KetQuaGhep: Codable, Equatable {
  public var deviceId: String; public var token: String; public var dungChung: Bool?; public var childName: String?
  /// #267: bé nối với máy (iPhone/iPad: đúng một).
  public var conDs: [BeChon]? = nil
}

public struct KetQuaYeuCau: Codable, Equatable {
  public var id: String; public var trang_thai: String?; public var status: String?
  public var tuDuyet: Bool { status == "tu_duyet" || trang_thai == "dong_y" }
}

public struct TrangThaiYeuCau: Codable, Equatable {
  public var status: String; public var trangThai: String?
  /// 15/11 (#258) — lời xin app / web: cho | da_them | mo_tam | chua_them | het_han | huy; `nhom` tinh_phut | khong_tinh_phut (khi da_them). Máy chủ cũ: nil.
  public var ketQua: String? = nil
  public var nhom: String? = nil
  public var muc: String? = nil
  public var tenNguoiDuyet: String? = nil
  public var loiNhan: String? = nil
  public init(status: String, trangThai: String? = nil) { self.status = status; self.trangThai = trangThai }
}

/// Một bé để chọn khi ghép iPhone/iPad với mã / gói cài cho nhiều bé (#267: iPhone, iPad chỉ dùng cho một bé).
public struct BeChon: Codable, Equatable, Identifiable {
  public var id: String; public var ten: String; public var avatar: String?
  public init(id: String, ten: String, avatar: String? = nil) { self.id = id; self.ten = ten; self.avatar = avatar }
}

/// `409 ios_mot_con` khi ghép: chọn MỘT bé rồi gửi lại kèm `con` (mã / gói chưa bị đốt).
public struct LoiIosMotCon: Error, Equatable { public var conChon: [BeChon]; public var cau: String }

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
  /// 15/11: phút «Tính phút» dùng lúc máy mở bằng mã kể từ lần đồng bộ trước — không trừ sao (docs/API.md «Sổ sao 15/11»).
  public var phutBoiMa: Int? = nil
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

  /// Gửi yêu cầu, trả (dữ liệu, mã HTTP) — lỗi mạng ⇒ LoiApi.mang.
  func goiTho(_ method: String, _ duong: String, _ body: Data?) async throws -> (Data, Int) {
    do { return try await vc.gui(yeuCau(method, duong, body)) } catch { throw LoiApi.mang(error.localizedDescription) }
  }

  static func giaiMa<T: Decodable>(_ d: Data, _ kieu: T.Type) throws -> T {
    do { return try JSONDecoder().decode(T.self, from: d) } catch { throw LoiApi.giaiMa }
  }

  static func loiMayChu(_ d: Data, _ ma: Int) -> LoiApi {
    let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
    return LoiApi.mayChu(ma: o?["error"] as? String ?? "http_\(ma)",
                         cau: o?["message"] as? String ?? "Máy chủ báo lỗi (\(ma)). Thử lại sau ít phút nhé.", http: ma)
  }

  func goi<T: Decodable>(_ method: String, _ duong: String, _ body: Data? = nil, _ kieu: T.Type) async throws -> T {
    let (d, ma) = try await goiTho(method, duong, body)
    guard (200..<300).contains(ma) else { throw Self.loiMayChu(d, ma) }
    return try Self.giaiMa(d, T.self)
  }

  /// Như `goi` nhưng lỗi máy chủ ⇒ `.chiTiet` (đọc thêm `conLan`, `choGiay`).
  func goiChiTiet<T: Decodable>(_ method: String, _ duong: String, _ body: Data? = nil, _ kieu: T.Type) async throws -> T {
    let (d, ma) = try await goiTho(method, duong, body)
    guard (200..<300).contains(ma) else {
      let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
      throw LoiApi.chiTiet(ma: o?["error"] as? String ?? "http_\(ma)", cau: o?["message"] as? String ?? "Máy chủ báo lỗi (\(ma)). Thử lại sau ít phút nhé.",
                           http: ma, conLan: (o?["conLan"] as? NSNumber)?.intValue, choGiay: (o?["choGiay"] as? NSNumber)?.intValue)
    }
    return try Self.giaiMa(d, T.self)
  }

  static func json(_ o: [String: Any]) -> Data { (try? JSONSerialization.data(withJSONObject: o)) ?? Data() }

  /// `con`: bé đã chọn sau `409 ios_mot_con` (ném `LoiIosMotCon`).
  public func ghepBangMa(_ ma: String, tenMay: String, con: String? = nil) async throws -> KetQuaGhep {
    var b: [String: Any] = ["ma": ma.filter(\.isNumber), "nen": "ios", "tenMay": tenMay]
    if let con { b["con"] = con }
    return try await ghep("api/device/ghep", b)
  }

  public func ghepBangToken(_ t: String, tenMay: String, con: String? = nil) async throws -> KetQuaGhep {
    var b: [String: Any] = ["token": t, "nen": "ios", "tenMay": tenMay]
    if let con { b["con"] = con }
    return try await ghep("api/device/ghep-goi", b)
  }

  func ghep(_ duong: String, _ b: [String: Any]) async throws -> KetQuaGhep {
    let (d, ma) = try await goiTho("POST", duong, Self.json(b))
    if let e = Self.docIosMotCon(d, http: ma) { throw e }
    guard (200..<300).contains(ma) else { throw Self.loiMayChu(d, ma) }
    return try Self.giaiMa(d, KetQuaGhep.self)
  }

  /// `409 {error: "ios_mot_con", conChon: [...]}` ⇒ LoiIosMotCon; khác ⇒ nil.
  public static func docIosMotCon(_ d: Data, http: Int) -> LoiIosMotCon? {
    struct R: Decodable { var error: String?; var message: String?; var conChon: [BeChon]? }
    guard http == 409, let r = try? JSONDecoder().decode(R.self, from: d), r.error == "ios_mot_con", let ds = r.conChon, !ds.isEmpty else { return nil }
    return LoiIosMotCon(conChon: ds, cau: r.message ?? "iPhone, iPad chỉ dùng cho một bé. Chọn bé dùng máy này nhé.")
  }

  public func nhip(_ b: NhipGui) async throws -> NhipTraVe {
    try await goi("POST", "api/device/nhip", try JSONEncoder().encode(b), NhipTraVe.self)
  }

  /// P1 (07/11): long-poll «chờ thay đổi» — máy chủ giữ ≤ ~25 giây (hạn yêu cầu 40 giây). `ver` nil ⇒ lấy mốc ngay. Chỉ gọi khi app đang mở.
  public func choThayDoi(ver: Int?) async throws -> KetQuaCho {
    var comp = URLComponents(url: goc.appendingPathComponent(ChoThayDoi.duong), resolvingAgainstBaseURL: false)!
    let qi = ChoThayDoi.query(ver: ver)
    if !qi.isEmpty { comp.queryItems = qi }
    var r = URLRequest(url: comp.url!)
    r.httpMethod = "GET"
    r.timeoutInterval = 40
    if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    let (d, ma): (Data, Int)
    do { (d, ma) = try await vc.gui(r) } catch { throw LoiApi.mang(error.localizedDescription) }
    guard (200..<300).contains(ma) else {
      let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
      throw LoiApi.mayChu(ma: o?["error"] as? String ?? "http_\(ma)", cau: o?["message"] as? String ?? "Máy chủ báo lỗi (\(ma)).", http: ma)
    }
    guard let kq = KetQuaCho.doc(d) else { throw LoiApi.giaiMa }
    return kq
  }

  /// 15/11 (#263): «Xin Ba Mẹ cho vay sao» — POST hoc-vien/xin-vay {soSao, mucDich?, quaId?, loiNhan?} (= yeu-cau loại vay_sao).
  public func xinVay(soSao: Int, loiNhan: String, mucDich: String? = nil, quaId: String? = nil) async throws -> KetQuaYeuCau {
    let ly = loiNhan.trimmingCharacters(in: .whitespacesAndNewlines)
    var b: [String: Any] = ["soSao": max(1, min(1000, soSao))]
    if !ly.isEmpty { b["loiNhan"] = String(ly.prefix(100)) }
    if let mucDich { b["mucDich"] = mucDich }
    if let quaId { b["quaId"] = quaId }
    return try await goi("POST", "api/device/hoc-vien/xin-vay", Self.json(b), KetQuaYeuCau.self)
  }

  /// 15/11: sổ sao của bé đang dùng máy — GET hoc-vien/sao.
  public func saoCon() async throws -> ChinhSach.SaoCon { try await goi("GET", "api/device/hoc-vien/sao", nil, ChinhSach.SaoCon.self) }

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
