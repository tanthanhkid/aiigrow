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

  /// Băm sha256 theo luồng (khúc 1 MiB) — không đọc cả gói vào bộ nhớ. nil = không mở được tệp.
  public static func sha256Tep(_ duongDan: String) -> String? {
    guard let f = FileHandle(forReadingAtPath: duongDan) else { return nil }
    defer { try? f.close() }
    var h = SHA256()
    while true {
      do {
        guard let khuc = try f.read(upToCount: 1 << 20), !khuc.isEmpty else { break }      // hết tệp ⇒ nil hoặc rỗng
        h.update(data: khuc)
      } catch { return nil }
    }
    return h.finalize().map { String(format: "%02x", $0) }.joined()
  }

  /// Sau khi cài mà vẫn chạy bản cũ: cùng gói (sha256) chỉ cho thử lại bằng nút Ba Mẹ và sau ít nhất ngần này giây.
  public static let giayChoThuLai: Double = 3600

  /// Đầu ra `pkgutil --check-signature`: trạng thái ký bởi chứng chỉ nhà phát triển do Apple cấp + chứng chỉ ĐẦU chuỗi đúng `nguoiKy`.
  public static func chuKyDung(_ ra: String) -> Bool {
    let dong = ra.split(whereSeparator: \.isNewline).map { $0.trimmingCharacters(in: .whitespaces) }
    guard dong.contains(where: { $0.hasPrefix("Status:") && $0.contains("signed by a developer certificate issued by Apple") }) else { return false }
    return dong.contains("1. " + nguoiKy)
  }
}

/// Dấu «đã giao installer cho gói này» — root-only, chống vòng cài lại vô hạn khi bản trong gói nhỏ hơn bản manifest hứa.
public struct DauDaThu: Codable, Equatable {
  public var version: String
  public var sha256: String
  public var luc: Double          // giây từ 1970
}

/// Câu trạng thái cập nhật để tray hiện — daemon ghi, BoMay đọc đồng bộ (không cần await vào actor).
public final class SoTinhCapNhat: @unchecked Sendable {
  private let khoa = NSLock()
  private var _chu: String?
  private var _luc: Date?
  public init() {}
  public var chu: String? { khoa.lock(); defer { khoa.unlock() }; return _chu }
  public var luc: Date? { khoa.lock(); defer { khoa.unlock() }; return _luc }
  public func dat(_ c: String, luc: Date = Date()) { khoa.lock(); _chu = c; _luc = luc; khoa.unlock() }
}

/// Lịch tự cập nhật của daemon: trễ 90 giây sau khởi động rồi mỗi 6 giờ. `ngu` trả false ⇒ dừng (test; daemon: bị huỷ).
public enum LichCapNhat {
  public static let truocGiay: Double = 90
  public static let chuKyGiay: Double = 6 * 3600
  public static func chay(ngu: (Double) async -> Bool, viec: () async -> Void) async {
    guard await ngu(truocGiay) else { return }
    repeat { await viec() } while await ngu(chuKyGiay)
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
  private let tepDaThu: String
  private let banHienTai: String
  private let dongHo: () -> Date
  private var dang = false
  private var tacVu: Task<Void, Never>?
  /// Câu trạng thái cho tray (đọc không cần await).
  public nonisolated let so: SoTinhCapNhat

  public init(api: MayChuApi, heThong: HeThong, mayChu: @escaping () -> String, session: URLSession? = nil,
              thuMuc: String = LuatCapNhat.thuMuc, tepDaThu: String = DuongDan.thuMuc + "/cap-nhat-da-thu.json",
              banHienTai: String = PhienBan.hienTai, dongHo: @escaping () -> Date = Date.init, so: SoTinhCapNhat = SoTinhCapNhat()) {
    self.api = api; self.heThong = heThong; self.mayChu = mayChu; self.thuMuc = thuMuc; self.tepDaThu = tepDaThu
    self.banHienTai = banHienTai; self.dongHo = dongHo; self.so = so
    if let session { self.session = session } else {
      let c = URLSessionConfiguration.ephemeral
      c.timeoutIntervalForRequest = 30
      c.timeoutIntervalForResource = 900
      self.session = URLSession(configuration: c)
    }
  }

  public var dangBan: Bool { dang }

  private func ketThuc(_ kq: KetQuaCapNhat) -> KetQuaCapNhat { dang = false; so.dat(kq.chu, luc: dongHo()); return kq }

  private func docDau() -> DauDaThu? {
    heThong.docTep(tepDaThu).flatMap { try? JSONDecoder().decode(DauDaThu.self, from: $0) }
  }

  /// Kiểm manifest NGAY (daemon gọi từ Task riêng; nút Ba Mẹ gọi từ Task nền). Có bản mới ⇒ tải + cài chạy nền, trả `.dangTai`.
  /// `choPhep` = máy đã ghép và không đang gỡ; hỏi ở đầu và NGAY trước khi giao installer. `thuCong` = Ba Mẹ bấm nút.
  public func batDau(thuCong: Bool = false, choPhep: @escaping @Sendable () async -> Bool) async -> KetQuaCapNhat {
    guard !dang else { return .dangBan }
    dang = true
    guard await choPhep(), heThong.docTep(DuongDan.daGo) == nil else {
      heThong.ghiLog("Cập nhật: máy chưa ghép / đang gỡ / đã gỡ — không tự cập nhật.")
      return ketThuc(.loi("Máy chưa ghép với Con (hoặc đang được gỡ) nên chưa tự cập nhật."))
    }
    so.dat("Đang kiểm tra bản mới…", luc: dongHo())
    let ban: BanMoi?
    do { ban = try await api.banMoi() } catch {
      heThong.ghiLog("Cập nhật: không hỏi được bản mới (\(error)).")
      return ketThuc(.loi("Không kiểm tra được bản mới: \(error)"))
    }
    guard let m = ban, LuatCapNhat.laBanMoiHon(m.version, banHienTai) else {
      heThong.ghiLog("Cập nhật: đang là bản mới nhất (\(banHienTai)\(ban.map { ", máy chủ \($0.version)" } ?? "")).")
      return ketThuc(.laMoiNhat(banHienTai))
    }
    let may = mayChu()
    guard LuatCapNhat.urlGoiHopLe(m.url, mayChu: may) else {
      heThong.ghiLog("Cập nhật: TỪ CHỐI — URL gói \(m.url) không phải https tới máy chủ \(may).")
      return ketThuc(.loi("Địa chỉ gói cập nhật không hợp lệ, không cài."))
    }
    let sha = m.sha256.lowercased()
    guard sha.count == 64, sha.allSatisfy(\.isHexDigit) else {
      heThong.ghiLog("Cập nhật: TỪ CHỐI — sha256 trong manifest sai dạng.")
      return ketThuc(.loi("Máy chủ chưa có mã kiểm của bản \(m.version), không cài."))
    }
    // Chống vòng cài lại vô hạn: gói này (cùng sha256) đã giao cho installer rồi.
    if let d = docDau(), d.sha256 == sha {
      let troi = dongHo().timeIntervalSince1970 - d.luc
      if !(thuCong && troi > LuatCapNhat.giayChoThuLai) {
        if LuatCapNhat.laBanMoiHon(d.version, banHienTai) {
          heThong.ghiLog("Cập nhật: cài xong mà bản không đổi — đã cài gói \(d.version) nhưng đang chạy \(banHienTai). Dừng tới khi manifest đổi sha256.")
          return ketThuc(.loi("Đã cài gói \(d.version) mà máy vẫn chạy \(banHienTai); chờ bản phát hành mới."))
        }
        heThong.ghiLog("Cập nhật: gói \(m.version) (sha256 \(sha.prefix(12))…) đã thử rồi — không cài lại.")
        return ketThuc(.loi("Gói \(m.version) đã thử cài rồi; chờ bản phát hành mới."))
      }
    }
    heThong.ghiLog("Cập nhật: có bản \(m.version) (đang chạy \(banHienTai)) — tải \(m.url)")
    var chuan = m; chuan.sha256 = sha
    let kq = KetQuaCapNhat.dangTai(m.version)
    so.dat(kq.chu, luc: dongHo())
    tacVu = Task { await self.taiVaCai(chuan, choPhep: choPhep) }
    return kq
  }

  /// Chờ lượt tải/cài nền xong (test + daemon định kỳ).
  public func choXong() async { await tacVu?.value }

  private func taiVaCai(_ m: BanMoi, choPhep: @Sendable () async -> Bool) async {
    defer { dang = false }
    let tep = thuMuc + "/AiiGrow-\(m.version).pkg"
    func bo(_ lyDo: String) {
      heThong.ghiLog("Cập nhật: \(lyDo) — KHÔNG cài."); heThong.xoaTep(tep)
      so.dat("Cập nhật bản \(m.version) lỗi: \(lyDo)", luc: dongHo())
    }
    do { try heThong.taoThuMuc(thuMuc, quyen: 0o700) } catch { bo("không tạo được \(thuMuc): \(error)"); return }
    for c in heThong.lietKeThuMuc(thuMuc) { heThong.xoaTep(thuMuc + "/" + c) }          // bản cũ còn sót

    guard let u = URL(string: m.url) else { bo("URL sai"); return }
    do {
      let (tam, resp) = try await session.download(for: URLRequest(url: u), delegate: ChuyenHuongAnToan(mayChu: mayChu()))
      defer { try? FileManager.default.removeItem(at: tam) }
      guard let h = resp as? HTTPURLResponse, h.statusCode == 200 else {
        bo("tải trả mã \((resp as? HTTPURLResponse)?.statusCode ?? 0) (chuyển hướng ngoài danh sách cho phép cũng vào đây)"); return
      }
      let kich = (try? FileManager.default.attributesOfItem(atPath: tam.path)[.size] as? Int) ?? 0
      guard kich > 0, kich <= LuatCapNhat.toiDaByte else { bo("kích thước gói bất thường (\(kich) byte)"); return }
      guard let sha = LuatCapNhat.sha256Tep(tam.path) else { bo("không đọc được tệp tải"); return }
      guard sha == m.sha256 else { bo("sha256 lệch (nhận \(sha.prefix(12))…, manifest \(m.sha256.prefix(12))…)"); return }
      do { try heThong.chuyenTep(tam.path, vao: tep, quyen: 0o600) } catch { bo("không chuyển được gói vào \(thuMuc): \(error)"); return }
    } catch { bo("tải lỗi: \(error)"); return }

    let (mk, rk) = heThong.kiemChuKyGoi(tep)
    guard mk == 0, LuatCapNhat.chuKyDung(rk) else { bo("chữ ký gói sai (pkgutil mã \(mk))"); return }
    let (ms, rs) = heThong.kiemSpctlGoi(tep)
    guard ms == 0 else { bo("spctl từ chối gói (mã \(ms): \(rs.prefix(200)))"); return }
    heThong.ghiLog("Cập nhật: sha256 + chữ ký khớp (\(LuatCapNhat.nguoiKy)).")

    // Kiểm lại NGAY trước khi giao installer: máy bị gỡ / bỏ ghép trong lúc tải thì thôi.
    guard await choPhep(), heThong.docTep(DuongDan.daGo) == nil else { bo("máy đã bị gỡ hoặc bỏ ghép trong lúc tải"); return }
    guard !heThong.caiDangChay() else { bo("đang có một lượt installer khác chạy (\(LuatCapNhat.nhanCai))"); return }
    if let d = try? JSONEncoder().encode(DauDaThu(version: m.version, sha256: m.sha256, luc: dongHo().timeIntervalSince1970)) {
      do { try heThong.ghiTep(tepDaThu, d, quyen: 0o600) } catch { bo("không ghi được dấu đã thử (\(error)) nên không cài"); return }
    }
    do {
      try heThong.caiGoi(tep)
      so.dat("Đã tải bản \(m.version), đang cài…", luc: dongHo())
      heThong.ghiLog("Cập nhật: đã giao `installer` cho launchd (\(LuatCapNhat.nhanCai)) — daemon sẽ được nạp lại ở bản \(m.version).")
    } catch { bo("không chạy được installer: \(error)") }
  }
}
