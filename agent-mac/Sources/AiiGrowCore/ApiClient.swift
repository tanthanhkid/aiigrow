// Client API máy Con (agent-win ApiClient.cs) — Bearer token của máy, cùng đường + cùng thân JSON với agent Windows:
//   POST api/device/ghep        {ma, nen: "mac", tenMay}           → {deviceId, token, childName}
//   POST api/device/dong-bo     {status, clientTime, usage[]}      → {...Policy chung, nextCheckSec, lenh[], mac|windows: Policy cho agent}
//   POST api/device/yeu-cau     {loai, phut, giaTri, lyDo}         → {id, trang_thai, status}
//   GET  api/device/yeu-cau/:id                                   → {status: duoc|cho|tu_choi, trangThai}
import Foundation

public struct LoiApi: Error, Equatable, CustomStringConvertible {
  public var maHttp: Int?
  /// Mã lỗi máy chủ (`error`), vd «token_sai», «ma_sai».
  public var ma: String?
  public var chu: String
  public init(maHttp: Int? = nil, ma: String? = nil, chu: String) { self.maHttp = maHttp; self.ma = ma; self.chu = chu }
  public var description: String { chu }
  /// Không tới được máy chủ / máy chủ lỗi ⇒ chạy offline theo Policy nhớ.
  public var laMang: Bool { maHttp == nil || maHttp! >= 500 }
  /// Máy chủ KHẲNG ĐỊNH máy đã bị gỡ khỏi gia đình.
  public var laTokenSai: Bool { maHttp == 401 && (ma == "token_sai" || ma == "device_unknown") }
}

/// Phần API daemon cần — tách protocol để test bằng bản giả.
public protocol MayChuApi: AnyObject {
  func ghep(ma: String, tenMay: String) async throws -> KetQuaGhep
  func dongBo(trangThai: TrangThaiAgent, dung: [MucDung], luc: Date) async throws -> KetQuaDongBo
  func taoYeuCau(loai: String, phut: Int?, giaTri: String?, lyDo: String) async throws -> KetQuaYeuCau
  /// → «duoc» | «cho» | «tu_choi»
  func trangThaiYeuCau(id: String) async throws -> String
  /// Sau khi ghép máy: dùng token + máy chủ mới ngay (không cần khởi động lại daemon).
  func datPhien(mayChu: String, token: String)
  /// POST api/device/lenh/:id/xong — báo đã thực thi lệnh (vd «go») TRƯỚC khi xoá token.
  func baoXongLenh(id: String) async throws
  /// GET api/agent/ban-moi?platform=mac — nil nếu máy chủ không có manifest.
  func banMoi() async throws -> BanMoi?
  /// POST api/device/ung-dung — danh sách app thật (DanhSachApp.swift).
  func guiUngDung(_ than: ThanGuiApp) async throws -> KetQuaGuiApp
}

public extension MayChuApi {
  func datPhien(mayChu: String, token: String) {}
  func baoXongLenh(id: String) async throws {}
  func banMoi() async throws -> BanMoi? { nil }
  func guiUngDung(_ than: ThanGuiApp) async throws -> KetQuaGuiApp { throw LoiApi(maHttp: 404, ma: "not_found", chu: "Máy chủ chưa có danh sách app") }
}

public final class ApiClient: MayChuApi {
  public static let mayChuMacDinh = "https://aiigrow.aiilab.vn"

  /// mayChu + token đổi được (ghép máy qua IPC xong là dùng ngay): đọc/ghi dưới khoá.
  private let khoaPhien = NSLock()
  private var _mayChu: String
  private var _token: String?
  private let session: URLSession
  public var mayChu: String { khoaPhien.lock(); defer { khoaPhien.unlock() }; return _mayChu }
  private var token: String? { khoaPhien.lock(); defer { khoaPhien.unlock() }; return _token }

  public func datPhien(mayChu: String, token: String) {
    khoaPhien.lock(); defer { khoaPhien.unlock() }
    _mayChu = ApiClient.chuanMayChu(mayChu)
    _token = token.isEmpty ? nil : token
  }

  public init(mayChu: String = ApiClient.mayChuMacDinh, token: String? = nil, session: URLSession? = nil) {
    self._mayChu = ApiClient.chuanMayChu(mayChu)
    self._token = (token?.isEmpty ?? true) ? nil : token
    if let session { self.session = session } else {
      let c = URLSessionConfiguration.ephemeral
      c.timeoutIntervalForRequest = 20
      c.timeoutIntervalForResource = 30
      self.session = URLSession(configuration: c)
    }
  }

  public static func chuanMayChu(_ s: String) -> String {
    var t = s.trimmingCharacters(in: .whitespacesAndNewlines)
    if t.isEmpty { t = mayChuMacDinh }
    if !t.contains("://") { t = "https://" + t }
    while t.hasSuffix("/") { t.removeLast() }
    return t
  }

  public func ghep(ma: String, tenMay: String) async throws -> KetQuaGhep {
    let d = try await gui("POST", "api/device/ghep", ["ma": ma.trimmingCharacters(in: .whitespaces), "nen": "mac", "tenMay": tenMay])
    guard let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { throw LoiApi(chu: "Máy chủ trả dữ liệu không đúng định dạng") }
    let token = o["token"] as? String ?? ""
    guard !token.isEmpty else { throw LoiApi(chu: "Máy chủ không trả token") }
    let server = (o["server"] as? String).flatMap { $0.isEmpty ? nil : ApiClient.chuanMayChu($0) } ?? mayChu
    return KetQuaGhep(deviceId: ApiClient.chuoi(o["deviceId"]) ?? "", token: token, childName: o["childName"] as? String ?? "", server: server)
  }

  public func dongBo(trangThai: TrangThaiAgent, dung: [MucDung], luc: Date) async throws -> KetQuaDongBo {
    let st = try JSONSerialization.jsonObject(with: NgayGio.encoder.encode(trangThai))
    let body: [String: Any] = [
      "status": st,
      "clientTime": NgayGio.viet(luc),
      "usage": dung.map { ["muc": $0.muc, "phut": $0.phut, "day": $0.day] },
    ]
    return try ApiClient.tachDongBo(try await gui("POST", "api/device/dong-bo", body))
  }

  /// Tách phản hồi dong-bo (thuần, test được).
  public static func tachDongBo(_ raw: Data) throws -> KetQuaDongBo {
    let p = try PolicyParser.parse(PolicyParser.layKhoiPolicy(raw))
    var next = p.nextCheckSec
    var lenh: [LenhMay] = []
    var dsApp: TinHieuDanhSachApp?
    if let o = try? JSONSerialization.jsonObject(with: raw) as? [String: Any] {
      if let n = o["nextCheckSec"] as? Int, n > 0 { next = n }
      for l in o["lenh"] as? [[String: Any]] ?? [] {
        if let id = chuoi(l["id"]), let loai = l["loai"] as? String, !id.isEmpty, !loai.isEmpty { lenh.append(LenhMay(id: id, loai: loai)) }
      }
      dsApp = TinHieuDanhSachApp.tach(o)
    }
    return KetQuaDongBo(policy: p, nextCheckSec: min(max(next, 10), 600), lenh: lenh, danhSachApp: dsApp)
  }

  public func taoYeuCau(loai: String, phut: Int?, giaTri: String?, lyDo: String) async throws -> KetQuaYeuCau {
    var body: [String: Any] = ["loai": loai, "lyDo": lyDo]
    if let phut { body["phut"] = min(max(phut, 5), 240) }
    if let giaTri { body["giaTri"] = giaTri }
    let d = try await gui("POST", "api/device/yeu-cau", body)
    guard let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any], let id = ApiClient.chuoi(o["id"]) else {
      throw LoiApi(chu: "Máy chủ trả dữ liệu không đúng định dạng")
    }
    let st = (o["status"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? (o["trang_thai"] as? String ?? "cho")
    return KetQuaYeuCau(id: id, trangThai: st)
  }

  /// Kiểm bản mới (GET api/agent/ban-moi?platform=mac) → {version, url, sha256}; `null` ⇒ nil (chưa phát hành). Công khai, không cần token.
  /// Thiếu trường / không phải JSON (proxy trả trang lạ…) ⇒ ném lỗi, KHÔNG coi là «đang là bản mới nhất».
  public func banMoi() async throws -> BanMoi? {
    let d = try await gui("GET", "api/agent/ban-moi?platform=mac", nil)
    let o = try? JSONSerialization.jsonObject(with: d, options: [.fragmentsAllowed])
    if o is NSNull { return nil }
    guard let o = o as? [String: Any], let v = o["version"] as? String, let u = o["url"] as? String, let s = o["sha256"] as? String else {
      throw LoiApi(chu: "Manifest bản mới không đúng định dạng")
    }
    return BanMoi(version: v, url: u, sha256: s)
  }

  public func guiUngDung(_ than: ThanGuiApp) async throws -> KetQuaGuiApp {
    let d = try await gui("POST", "api/device/ung-dung", try than.json())
    let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
    return KetQuaGuiApp(bam: o?["bam"] as? String, soApp: o?["soApp"] as? Int, thieuIcon: o?["thieuIcon"] as? [String])
  }

  public func baoXongLenh(id: String) async throws {
    let ma = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/"))) ?? id
    _ = try await gui("POST", "api/device/lenh/" + ma + "/xong", [:])
  }

  public func trangThaiYeuCau(id: String) async throws -> String {
    let ma = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/"))) ?? id
    let d = try await gui("GET", "api/device/yeu-cau/" + ma, nil)
    guard let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { throw LoiApi(chu: "Máy chủ trả dữ liệu không đúng định dạng") }
    return o["status"] as? String ?? "cho"
  }

  // MARK: gửi

  private func gui(_ method: String, _ path: String, _ body: [String: Any]?) async throws -> Data {
    let mayChu = self.mayChu, token = self.token
    guard let url = URL(string: mayChu + "/" + path) else { throw LoiApi(chu: "Địa chỉ máy chủ sai") }
    var req = URLRequest(url: url)
    req.httpMethod = method
    req.setValue("application/json", forHTTPHeaderField: "Accept")
    req.setValue(PhienBan.hienTai, forHTTPHeaderField: "X-AiiGrow-Ban")       // máy chủ ghi bản đang chạy
    if let token { req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
    if let body {
      req.setValue("application/json", forHTTPHeaderField: "Content-Type")
      req.httpBody = try JSONSerialization.data(withJSONObject: body)
    }
    let data: Data, resp: URLResponse
    do { (data, resp) = try await session.data(for: req) } catch {
      throw LoiApi(chu: "Không kết nối được máy chủ: \(error.localizedDescription)")
    }
    let ma = (resp as? HTTPURLResponse)?.statusCode ?? 0
    guard (200..<300).contains(ma) else {
      let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
      let loi = o?["error"] as? String, cau = o?["message"] as? String
      throw LoiApi(maHttp: ma, ma: loi, chu: cau ?? loi ?? "Máy chủ báo lỗi \(ma)")
    }
    return data
  }

  /// id là chuỗi hoặc số (FlexStringConverter).
  static func chuoi(_ v: Any?) -> String? {
    if let s = v as? String { return s }
    if let n = v as? NSNumber { return n.stringValue }
    return nil
  }
}
