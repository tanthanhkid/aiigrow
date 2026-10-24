// Tự cập nhật tác tử Mac (THIET-KE.md mục «Tự cập nhật»). Daemon hỏi GET api/agent/ban-moi?platform=mac lúc khởi động (+90 giây) rồi mỗi 6 giờ;
// bản mới hơn thì tải .pkg về thư mục root-only, kiểm sha256 + chữ ký Developer ID Installer + spctl, rồi cài đè bằng `installer` chạy như job launchd riêng
// (preinstall của gói sẽ bootout chính daemon nên không thể chạy làm con của daemon). Bất kỳ bước nào sai ⇒ xoá tệp, ghi log, KHÔNG cài.
// Cùng luật an toàn với agent-win UpdateWorker; khác: chữ ký kiểm bằng pkgutil/spctl thay vì Authenticode.
import CryptoKit
import Foundation

/// Manifest bản mới (khớp server/lib/ban-agent.ts BAN_AGENT_MAC).
public struct BanMoi: Equatable {
  public var version: String
  public var url: String
  public var sha256: String
  public init(version: String, url: String, sha256: String) { self.version = version; self.url = url; self.sha256 = sha256 }
}

public enum KetQuaCapNhat: Equatable {
  case laMoiNhat(String)
  case dangTai(String)
  /// Đang có một lượt kiểm/tải/cài khác chạy.
  case dangBan
  case loi(String)

  /// Câu hiện cho Ba Mẹ.
  public var chu: String {
    switch self {
    case .laMoiNhat(let v): return "Đang là bản mới nhất (\(v))"
    case .dangTai(let v): return "Đang tải bản \(v)…"
    case .dangBan: return "Đang kiểm tra hoặc tải bản cập nhật, chờ một chút nhé."
    case .loi(let c): return c
    }
  }
}

public enum LuatCapNhat {
  /// Chữ ký bắt buộc của gói cài.
  public static let nguoiKy = "Developer ID Installer: TAN THANH TRAN (ADUL7HT969)"
  public static let thuMuc = DuongDan.thuMuc + "/cap-nhat"
  public static let nhanCai = "vn.aiilab.aiigrow.capnhat"
  public static let toiDaChuyenHuong = 5
  public static let toiDaByte = 300 * 1024 * 1024

  /// «0.1.10» → [0,1,10]; không đúng dạng x.y.z (chỉ số) ⇒ nil.
  public static func tachBan(_ s: String) -> [Int]? {
    let p = s.trimmingCharacters(in: .whitespaces).split(separator: ".", omittingEmptySubsequences: false)
    guard p.count == 3 else { return nil }
    let so = p.compactMap { Int($0) }
    guard so.count == 3, so.allSatisfy({ $0 >= 0 }), p.allSatisfy({ $0.allSatisfy(\.isNumber) }) else { return nil }
    return so
  }

  /// `moi` > `hienTai` theo số; sai dạng ở bất kỳ bên nào ⇒ false (không cập nhật).
  public static func laBanMoiHon(_ moi: String, _ hienTai: String) -> Bool {
    guard let a = tachBan(moi), let b = tachBan(hienTai) else { return false }
    return b.lexicographicallyPrecedes(a)
  }

  /// URL gói phải https và cùng host với máy chủ đang dùng.
  public static func urlGoiHopLe(_ url: String, mayChu: String) -> Bool {
    guard let u = URL(string: url), u.scheme?.lowercased() == "https", let h = u.host?.lowercased(), !h.isEmpty,
          let host = URL(string: mayChu)?.host?.lowercased(), h == host else { return false }
    return u.user == nil && u.password == nil
  }

  /// Chuyển hướng chỉ tới https: máy chủ đang dùng, github.com, *.githubusercontent.com.
  public static func choPhepChuyenHuong(_ url: URL?, mayChu: String) -> Bool {
    guard let url, url.scheme?.lowercased() == "https", let h = url.host?.lowercased(), url.user == nil else { return false }
    if let host = URL(string: mayChu)?.host?.lowercased(), h == host { return true }
    return h == "github.com" || h.hasSuffix(".githubusercontent.com")
  }

  public static func sha256Hex(_ d: Data) -> String { SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined() }

  /// Đầu ra `pkgutil --check-signature`: trạng thái ký bởi chứng chỉ nhà phát triển do Apple cấp + chứng chỉ ĐẦU chuỗi đúng `nguoiKy`.
  public static func chuKyDung(_ ra: String) -> Bool {
    let dong = ra.split(whereSeparator: \.isNewline).map { $0.trimmingCharacters(in: .whitespaces) }
    guard dong.contains(where: { $0.hasPrefix("Status:") && $0.contains("signed by a developer certificate issued by Apple") }) else { return false }
    return dong.contains("1. " + nguoiKy)
  }
}

/// Chặn chuyển hướng ra ngoài danh sách cho phép (ở đó nhận 3xx trần ⇒ tải coi như hỏng).
final class ChuyenHuongAnToan: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
  private let mayChu: String
  private let khoa = NSLock()
  private var dem = 0
  init(mayChu: String) { self.mayChu = mayChu }

  func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                  newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
    khoa.lock(); dem += 1; let n = dem; khoa.unlock()
    completionHandler(n <= LuatCapNhat.toiDaChuyenHuong && LuatCapNhat.choPhepChuyenHuong(request.url, mayChu: mayChu) ? request : nil)
  }
}

public actor BoCapNhat {
  private let api: MayChuApi
  private let heThong: HeThong
  private let mayChu: () -> String
  private let session: URLSession
  private let thuMuc: String
  private let banHienTai: String
  private var dang = false
  private var tacVu: Task<Void, Never>?

  public init(api: MayChuApi, heThong: HeThong, mayChu: @escaping () -> String, session: URLSession? = nil,
              thuMuc: String = LuatCapNhat.thuMuc, banHienTai: String = PhienBan.hienTai) {
    self.api = api; self.heThong = heThong; self.mayChu = mayChu; self.thuMuc = thuMuc; self.banHienTai = banHienTai
    if let session { self.session = session } else {
      let c = URLSessionConfiguration.ephemeral
      c.timeoutIntervalForRequest = 30
      c.timeoutIntervalForResource = 900
      self.session = URLSession(configuration: c)
    }
  }

  /// Kiểm manifest NGAY (không chặn vòng áp/đồng bộ — daemon gọi từ Task riêng). Có bản mới ⇒ tải + cài chạy nền, trả `.dangTai`.
  /// `dangGo` hỏi lại ngay trước khi cài: đang gỡ từ xa thì không cài.
  public func batDau(dangGo: @escaping @Sendable () async -> Bool) async -> KetQuaCapNhat {
    guard !dang else { return .dangBan }
    dang = true
    guard await dangGo() == false else { dang = false; heThong.ghiLog("Cập nhật: đang gỡ từ xa — bỏ qua."); return .loi("Máy đang được gỡ, không cập nhật.") }
    let ban: BanMoi?
    do { ban = try await api.banMoi() } catch {
      dang = false
      heThong.ghiLog("Cập nhật: không hỏi được bản mới (\(error)).")
      return .loi("Không kiểm tra được bản mới: \(error)")
    }
    guard let m = ban, LuatCapNhat.laBanMoiHon(m.version, banHienTai) else {
      dang = false
      heThong.ghiLog("Cập nhật: đang là bản mới nhất (\(banHienTai)\(ban.map { ", máy chủ \($0.version)" } ?? "")).")
      return .laMoiNhat(banHienTai)
    }
    let may = mayChu()
    guard LuatCapNhat.urlGoiHopLe(m.url, mayChu: may) else {
      dang = false
      heThong.ghiLog("Cập nhật: TỪ CHỐI — URL gói \(m.url) không phải https tới máy chủ \(may).")
      return .loi("Địa chỉ gói cập nhật không hợp lệ, không cài.")
    }
    let sha = m.sha256.lowercased()
    guard sha.count == 64, sha.allSatisfy(\.isHexDigit) else {
      dang = false
      heThong.ghiLog("Cập nhật: TỪ CHỐI — sha256 trong manifest sai dạng.")
      return .loi("Máy chủ chưa có mã kiểm của bản \(m.version), không cài.")
    }
    heThong.ghiLog("Cập nhật: có bản \(m.version) (đang chạy \(banHienTai)) — tải \(m.url)")
    var chuan = m; chuan.sha256 = sha
    tacVu = Task { await self.taiVaCai(chuan, dangGo: dangGo) }
    return .dangTai(m.version)
  }

  /// Chờ lượt tải/cài nền xong (test + daemon định kỳ).
  public func choXong() async { await tacVu?.value }

  private func taiVaCai(_ m: BanMoi, dangGo: @Sendable () async -> Bool) async {
    defer { dang = false }
    let tep = thuMuc + "/AiiGrow-\(m.version).pkg"
    func bo(_ lyDo: String) { heThong.ghiLog("Cập nhật: \(lyDo) — KHÔNG cài."); heThong.xoaTep(tep) }
    do { try heThong.taoThuMuc(thuMuc, quyen: 0o700) } catch { bo("không tạo được \(thuMuc): \(error)"); return }
    for c in heThong.lietKeThuMuc(thuMuc) { heThong.xoaTep(thuMuc + "/" + c) }          // bản cũ còn sót

    guard let u = URL(string: m.url) else { bo("URL sai"); return }
    let du: Data
    do {
      let (tam, resp) = try await session.download(for: URLRequest(url: u), delegate: ChuyenHuongAnToan(mayChu: mayChu()))
      defer { try? FileManager.default.removeItem(at: tam) }
      guard let h = resp as? HTTPURLResponse, h.statusCode == 200 else {
        bo("tải trả mã \((resp as? HTTPURLResponse)?.statusCode ?? 0) (chuyển hướng ngoài danh sách cho phép cũng vào đây)"); return
      }
      let kich = (try? FileManager.default.attributesOfItem(atPath: tam.path)[.size] as? Int) ?? 0
      guard kich > 0, kich <= LuatCapNhat.toiDaByte else { bo("kích thước gói bất thường (\(kich) byte)"); return }
      guard let d = FileManager.default.contents(atPath: tam.path) else { bo("không đọc được tệp tải"); return }
      du = d
    } catch { bo("tải lỗi: \(error)"); return }

    let sha = LuatCapNhat.sha256Hex(du)
    guard sha == m.sha256 else { bo("sha256 lệch (nhận \(sha.prefix(12))…, manifest \(m.sha256.prefix(12))…)"); return }
    do { try heThong.ghiTep(tep, du, quyen: 0o600) } catch { bo("không ghi được gói: \(error)"); return }

    let (mk, rk) = heThong.kiemChuKyGoi(tep)
    guard mk == 0, LuatCapNhat.chuKyDung(rk) else { bo("chữ ký gói sai (pkgutil mã \(mk))"); return }
    let (ms, rs) = heThong.kiemSpctlGoi(tep)
    guard ms == 0 else { bo("spctl từ chối gói (mã \(ms): \(rs.prefix(200)))"); return }
    heThong.ghiLog("Cập nhật: sha256 + chữ ký khớp (\(LuatCapNhat.nguoiKy)).")

    guard await dangGo() == false else { bo("đang gỡ từ xa"); return }
    do {
      try heThong.caiGoi(tep)
      heThong.ghiLog("Cập nhật: đã giao `installer` cho launchd (\(LuatCapNhat.nhanCai)) — daemon sẽ được nạp lại ở bản \(m.version).")
    } catch { bo("không chạy được installer: \(error)") }
  }
}
