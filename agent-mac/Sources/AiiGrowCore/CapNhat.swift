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
  /// Tên tệp tải tạm trong NSTemporaryDirectory (dọn tệp sót theo tiền tố này).
  public static let tienToTepTam = "aiigrow-tai-"
  /// Một câu cho mọi lớp kiểm «đã ghép và không đang gỡ» (quyền IPC, nút Ba Mẹ, choPhep của bộ cập nhật).
  public static let chuChuaGhep = "Máy chưa ghép với Con (hoặc đang được gỡ) nên chưa tự cập nhật."

  /// «0.1.10» → [0,1,10]; không đúng dạng x.y.z (chỉ số) ⇒ nil.
  public static func tachBan(_ s: String) -> [Int]? {
    let p = s.trimmingCharacters(in: .whitespaces).split(separator: ".", omittingEmptySubsequences: false)
    guard p.count == 3 else { return nil }
    guard p.allSatisfy({ !$0.isEmpty && $0.allSatisfy { $0.isASCII && $0.isNumber } }) else { return nil }
    let so = p.compactMap { Int($0) }
    return so.count == 3 ? so : nil                        // tràn Int ⇒ nil, không rơi mất một phần
  }

  /// `moi` > `hienTai` theo số; sai dạng ở bất kỳ bên nào ⇒ false (không cập nhật).
  public static func laBanMoiHon(_ moi: String, _ hienTai: String) -> Bool {
    guard let a = tachBan(moi), let b = tachBan(hienTai) else { return false }
    return b.lexicographicallyPrecedes(a)
  }

  /// URL gói phải https và cùng host với máy chủ đang dùng.
  public static func urlGoiHopLe(_ url: String, mayChu: String) -> Bool {
    guard let u = URL(string: url), u.scheme?.lowercased() == "https", let h = u.host?.lowercased(), !h.isEmpty,
          let mc = URL(string: mayChu), let host = mc.host?.lowercased(), h == host, (u.port ?? 443) == (mc.port ?? (mc.scheme?.lowercased() == "http" ? 80 : 443)) else { return false }
    return u.user == nil && u.password == nil
  }

  /// Chuyển hướng chỉ tới https: máy chủ đang dùng, github.com, *.githubusercontent.com.
  public static func choPhepChuyenHuong(_ url: URL?, mayChu: String) -> Bool {
    guard let url else { return false }
    if urlGoiHopLe(url.absoluteString, mayChu: mayChu) { return true }
    guard url.scheme?.lowercased() == "https", let h = url.host?.lowercased(), url.user == nil, url.password == nil else { return false }
    // chỉ trang Release của repo tải về + máy chủ tệp của Release (không raw./gist. hay repo khác)
    if h == "github.com" { return url.path.hasPrefix("/tanthanhkid/aiigrow-tai/releases/download/") }
    return h == "release-assets.githubusercontent.com" || h == "objects.githubusercontent.com"
  }

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
  /// Gói hỏng (sha256/chữ ký/spctl — thường do mạng/proxy): nút Ba Mẹ thử lại sau ngần này giây.
  public static let giayChoGoiHong: Double = 300
  /// Vòng định kỳ: cùng sha256 thử lại tối đa `toiDaLanThu` lần, mỗi lần cách nhau ≥ `giayGiuaCacLan`; quá thì mỗi `giayNghiSauHetLuot` mới thử một lần
  /// (lỗi tạm — proxy trả trang lạ, spctl không tới được Apple — không khoá máy ở bản cũ mãi). Nút Ba Mẹ vẫn thử được sau 1 giờ.
  public static let toiDaLanThu = 3
  public static let giayGiuaCacLan: Double = 6 * 3600
  public static let giayNghiSauHetLuot: Double = 86_400

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
  /// Số lần đã giao installer cho đúng sha256 này.
  public var lan: Int = 1
  /// false = gói hỏng (sha256/chữ ký/spctl) nên chưa giao installer: vẫn tính lượt định kỳ, nhưng nút Ba Mẹ thử lại được ngay.
  public var daGiao: Bool = true

  public init(version: String, sha256: String, luc: Double, lan: Int = 1, daGiao: Bool = true) {
    self.version = version; self.sha256 = sha256; self.luc = luc; self.lan = lan; self.daGiao = daGiao
  }
}

/// Câu trạng thái cập nhật để tray hiện — daemon ghi, BoMay đọc đồng bộ (không cần await vào actor).
public final class SoTinhCapNhat: @unchecked Sendable {
  private let khoa = NSLock()
  private var _chu: String?
  private var _luc: Date?
  private var _dang = false
  public init() {}
  /// Giữ chỗ nguyên tử (false ⇒ đang có lượt khác) — nút Ba Mẹ giữ chỗ TRƯỚC khi trả lời IPC để bấm liền hai lần không chạy chồng.
  func giuCho() -> Bool { khoa.lock(); defer { khoa.unlock() }; if _dang { return false }; _dang = true; return true }
  /// Trả chỗ — đúng hai nơi: `ketThuc` (batDau dừng) và cuối `taiVaCai`.
  func thaCho() { khoa.lock(); _dang = false; khoa.unlock() }
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
class ChuyenHuongAnToan: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
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

/// Tải một URL vào tệp đã mở theo từng khúc dữ liệu; vượt `toiDa` byte (Content-Length hay số đã nhận) thì huỷ ngay.
final class TaiCoTran: ChuyenHuongAnToan, URLSessionDataDelegate, @unchecked Sendable {
  private let ghi: FileHandle
  private let toiDa: Int64
  private let khoaT = NSLock()
  private var tong: Int64 = 0
  private var _quaCo = false
  private var loiGhi: Error?
  private var cho: CheckedContinuation<(URLResponse?, Error?), Never>?
  init(mayChu: String, ghi: FileHandle, toiDa: Int) { self.ghi = ghi; self.toiDa = Int64(toiDa); super.init(mayChu: mayChu) }
  var quaCo: Bool { khoaT.lock(); defer { khoaT.unlock() }; return _quaCo }

  func chay(_ s: URLSession, _ yc: URLRequest) async -> (URLResponse?, Error?) {
    await withCheckedContinuation { c in
      khoaT.lock(); cho = c; khoaT.unlock()
      let t = s.dataTask(with: yc)
      t.delegate = self
      t.resume()
    }
  }
  func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                  completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
    if response.expectedContentLength > toiDa { khoaT.lock(); _quaCo = true; khoaT.unlock(); completionHandler(.cancel) }
    else { completionHandler(.allow) }
  }
  func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
    khoaT.lock(); tong += Int64(data.count); let qua = tong > toiDa; if qua { _quaCo = true }; khoaT.unlock()
    if qua { dataTask.cancel(); return }
    do { try ghi.write(contentsOf: data) } catch { khoaT.lock(); loiGhi = error; khoaT.unlock(); dataTask.cancel() }
  }
  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    khoaT.lock(); let c = cho; cho = nil; let loi = loiGhi ?? error; khoaT.unlock()
    c?.resume(returning: (task.response, loi))
  }
}

public actor BoCapNhat {
  private let api: MayChuApi
  private let heThong: HeThong
  private let mayChu: () -> String
  private let sessionTiem: URLSession?
  /// Tạo khi tải lần đầu (chế độ --thu / không có bản mới thì không tạo).
  private lazy var session: URLSession = sessionTiem ?? {
    let c = URLSessionConfiguration.ephemeral
    c.timeoutIntervalForRequest = 30
    c.timeoutIntervalForResource = 900
    return URLSession(configuration: c)
  }()
  private let thuMuc: String
  private let tepDaThu: String
  private let banHienTai: String
  private let dongHo: () -> Date
  private let toiDaByte: Int
  private var tacVu: Task<Void, Never>?
  /// Câu trạng thái cho tray (đọc không cần await).
  public nonisolated let so: SoTinhCapNhat

  public init(api: MayChuApi, heThong: HeThong, mayChu: @escaping () -> String, session: URLSession? = nil,
              thuMuc: String = LuatCapNhat.thuMuc, tepDaThu: String = DuongDan.thuMuc + "/cap-nhat-da-thu.json",
              banHienTai: String = PhienBan.hienTai, dongHo: @escaping () -> Date = Date.init, so: SoTinhCapNhat = SoTinhCapNhat(),
              toiDaByte: Int = LuatCapNhat.toiDaByte) {
    self.toiDaByte = toiDaByte
    self.api = api; self.heThong = heThong; self.mayChu = mayChu; self.thuMuc = thuMuc; self.tepDaThu = tepDaThu
    self.banHienTai = banHienTai; self.dongHo = dongHo; self.so = so
    // Lượt cài trước giao installer mà máy vẫn chạy bản cũ (installer lỗi rồi daemon cũ được nạp lại): báo cho Ba Mẹ thấy ngay khi khởi động.
    // Cài xong (đang chạy đúng bản trong dấu): báo «đã cập nhật» — daemon mới khởi động với trạng thái trống.
    if let d = BoCapNhat.docDau(heThong, tepDaThu),
       dongHo().timeIntervalSince1970 - d.luc < 86_400 {
      if LuatCapNhat.laBanMoiHon(d.version, banHienTai) {
        let khi = d.lan >= LuatCapNhat.toiDaLanThu ? "sẽ thử lại sau 24 giờ" : "sẽ thử lại"
        so.dat(d.daGiao ? "Chưa cài được bản \(d.version) (đã thử \(d.lan) lần) — lý do trong nhật ký /Library/Logs/AiiGrow; \(khi)."
                        : "Tải bản \(d.version) bị hỏng (\(d.lan) lần, kiểm tra mạng/proxy); \(khi).", luc: dongHo())
      } else if d.version == banHienTai, d.daGiao, dongHo().timeIntervalSince1970 - d.luc < 3600 {   // chỉ ngay sau lượt cài, không lặp mỗi lần khởi động lại
        so.dat("Đã cập nhật lên bản \(banHienTai).", luc: dongHo())
      }
    }
    self.sessionTiem = session
  }

  public nonisolated func giuChoNgay() -> Bool { so.giuCho() }

  private func ketThuc(_ kq: KetQuaCapNhat) -> KetQuaCapNhat { so.thaCho(); so.dat(kq.chu, luc: dongHo()); return kq }

  private func docDau() -> DauDaThu? { BoCapNhat.docDau(heThong, tepDaThu) }
  private static func docDau(_ ht: HeThong, _ tep: String) -> DauDaThu? {
    ht.docTep(tep).flatMap { try? JSONDecoder().decode(DauDaThu.self, from: $0) }
  }

  /// Kiểm manifest NGAY (daemon gọi từ Task riêng; nút Ba Mẹ gọi từ Task nền). Có bản mới ⇒ tải + cài chạy nền, trả `.dangTai`.
  /// `choPhep` = máy đã ghép và không đang gỡ; hỏi ở đầu và NGAY trước khi giao installer. `thuCong` = Ba Mẹ bấm nút.
  /// `daGiuCho`: người gọi đã `giuChoNgay()` thành công.
  public func batDau(thuCong: Bool = false, daGiuCho: Bool = false, choPhep: @escaping @Sendable () async -> Bool) async -> KetQuaCapNhat {
    if !daGiuCho { guard so.giuCho() else { return .dangBan } }
    guard await choPhep() else {
      heThong.ghiLog("Cập nhật: máy chưa ghép / đang gỡ — không tự cập nhật.")
      return ketThuc(.loi(LuatCapNhat.chuChuaGhep))
    }
    // Dấu gỡ sót được `choPhep` (BoMay.coTheCapNhat) dọn trong actor BoMay — ở đây chỉ đọc, KHÔNG xoá (đua với tuGo).
    guard heThong.docTep(DuongDan.daGo) == nil else {
      // máy vẫn ghép mà còn dấu gỡ (lượt gỡ tay bị dừng giữa chừng…): nói thật nguyên nhân + cách gỡ vướng
      heThong.ghiLog("Cập nhật: còn dấu gỡ \(DuongDan.daGo) — không tự cập nhật.")
      return ketThuc(.loi("Máy đang được gỡ AiiGrow (go-cai.sh đang chạy) nên không tự cập nhật."))
    }
    so.dat("Đang kiểm tra bản mới…", luc: dongHo())
    let ban: BanMoi?
    do { ban = try await api.banMoi() } catch {
      heThong.ghiLog("Cập nhật: không hỏi được bản mới (\(error)).")
      return ketThuc(.loi("Không kiểm tra được bản mới (mất mạng hoặc máy chủ trả sai); sẽ thử lại sau."))
    }
    if let m = ban, LuatCapNhat.tachBan(m.version) == nil {
      heThong.ghiLog("Cập nhật: TỪ CHỐI — bản «\(m.version)» trong manifest không đúng dạng x.y.z.")
      return ketThuc(.loi("Máy chủ báo bản «\(m.version)» sai dạng, không cập nhật."))
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
    // Chống vòng cài lại vô hạn: đếm số lần đã giao installer cho cùng sha256.
    var lanDaThu = 0
    if let d = docDau(), d.sha256 == sha {
      lanDaThu = d.lan
      let troi = dongHo().timeIntervalSince1970 - d.luc
      // troi < 0: đồng hồ bị lùi sau khi ghi dấu ⇒ không chờ tới «tương lai» đó (vẫn giữ trần 3 lần cho lượt định kỳ)
      // gói hỏng (chưa giao installer): nút thử lại sau vài phút, không tải lại cả gói mỗi lần bấm
      let choLai = thuCong ? (troi < 0 || troi > (d.daGiao ? LuatCapNhat.giayChoThuLai : LuatCapNhat.giayChoGoiHong))
                           : (troi < 0 || troi >= LuatCapNhat.giayNghiSauHetLuot
                              || (d.lan < LuatCapNhat.toiDaLanThu && troi >= LuatCapNhat.giayGiuaCacLan))
      if !choLai {
        if thuCong {
          let phut = Int(((d.daGiao ? LuatCapNhat.giayChoThuLai : LuatCapNhat.giayChoGoiHong) - troi) / 60) + 1
          heThong.ghiLog("Cập nhật: gói \(m.version) vừa thử (\(d.daGiao ? "đã giao installer" : "tải về hỏng")) — nút Ba Mẹ chờ thêm \(phut) phút.")
          return ketThuc(.loi("Vừa thử bản \(m.version); bấm lại sau khoảng \(phut) phút."))
        }
        if d.lan >= LuatCapNhat.toiDaLanThu && LuatCapNhat.laBanMoiHon(d.version, banHienTai) {
          let lyDo = d.daGiao ? "cài xong mà bản không đổi" : "gói tải về hỏng (sha256/chữ ký/spctl — thường do mạng/proxy)"
          heThong.ghiLog("Cập nhật: \(lyDo) — đã thử gói \(d.version) \(d.lan) lần nhưng đang chạy \(banHienTai). Thử lại sau 24 giờ hoặc khi manifest đổi sha256.")
          return ketThuc(.loi(d.daGiao ? "Đã thử cài bản \(d.version) \(d.lan) lần mà máy vẫn chạy \(banHienTai); sẽ thử lại sau 24 giờ."
                                       : "Tải bản \(d.version) bị hỏng \(d.lan) lần (kiểm tra mạng/proxy); sẽ thử lại sau 24 giờ hoặc bấm «Kiểm tra cập nhật»."))
        }
        heThong.ghiLog("Cập nhật: gói \(m.version) (sha256 \(sha.prefix(12))…) đã thử \(d.lan) lần — chưa tới lượt thử lại.")
        return ketThuc(.loi("Gói \(m.version) đã thử cài rồi; sẽ thử lại sau."))
      }
    }
    heThong.ghiLog("Cập nhật: có bản \(m.version) (đang chạy \(banHienTai)) — tải \(m.url)")
    var chuan = m; chuan.sha256 = sha
    let kq = KetQuaCapNhat.dangTai(m.version)
    so.dat(kq.chu, luc: dongHo())
    tacVu = Task { await self.taiVaCai(chuan, lan: lanDaThu + 1, choPhep: choPhep) }
    return kq
  }



  /// Chờ lượt tải/cài nền xong (test + daemon định kỳ).
  public func choXong() async { await tacVu?.value }

  private func taiVaCai(_ m: BanMoi, lan: Int, choPhep: @Sendable () async -> Bool) async {
    defer { so.thaCho() }
    let tep = thuMuc + "/AiiGrow-\(m.version).pkg"
    /// `lyDo` (chi tiết kỹ thuật) chỉ vào nhật ký; Ba Mẹ thấy câu ngắn `chu`.
    func bo(_ lyDo: String, chu: String = "gói tải về không dùng được") {
      heThong.ghiLog("Cập nhật: \(lyDo) — KHÔNG cài."); heThong.xoaTep(tep)
      so.dat("Chưa cập nhật được bản \(m.version): \(chu); sẽ thử lại (chi tiết trong /Library/Logs/AiiGrow).", luc: dongHo())
    }
    /// Gói tải về hỏng (sha256 lệch / chữ ký / spctl): cũng tính một lượt thử ⇒ trần 3 lần cách 6 giờ áp luôn, không tải lại cả gói mỗi 6 giờ mãi.
    func boVaDem(_ lyDo: String) {
      ghiDau(daGiao: false)
      bo(lyDo)
    }
    @discardableResult func ghiDau(daGiao: Bool = true) -> Bool {
      guard let d = try? JSONEncoder().encode(DauDaThu(version: m.version, sha256: m.sha256, luc: dongHo().timeIntervalSince1970, lan: lan, daGiao: daGiao))
      else { return false }
      do { try heThong.ghiTep(tepDaThu, d, quyen: 0o600); return true } catch { return false }
    }
    // installer lượt trước còn đọc gói trong thư mục này ⇒ không dọn/tải đè (bo() cũng xoá tệp nên không dùng ở đây)
    let ht = heThong
    if await chayNgoaiActor({ ht.caiDangChay() }) {
      heThong.ghiLog("Cập nhật: lượt installer trước (\(LuatCapNhat.nhanCai)) còn chạy — để lượt sau.")
      so.dat("Đang cài bản trước, sẽ kiểm lại sau.", luc: dongHo()); return
    }
    do { try heThong.taoThuMuc(thuMuc, quyen: 0o700) } catch { bo("không tạo được \(thuMuc): \(error)", chu: "lỗi ghi đĩa"); return }
    for c in heThong.lietKeThuMuc(thuMuc) { heThong.xoaTep(thuMuc + "/" + c) }          // bản cũ còn sót

    guard let u = URL(string: m.url) else { bo("URL sai"); return }
    do {
      // Tải vào tệp tạm theo từng khúc (data delegate), đếm byte khi đang tải: vượt `toiDaByte` là dừng ngay
      // (không để thân vài GB ghi đầy đĩa hệ thống trước khi kiểm kích thước).
      // Tệp tạm sót của lượt bị giết giữa chừng (bootout/crash — defer không chạy): dọn trước (mỗi lúc chỉ một lượt tải, giữ chỗ bằng `so`).
      let thuMucTam = NSTemporaryDirectory()
      for c in (try? FileManager.default.contentsOfDirectory(atPath: thuMucTam)) ?? [] where c.hasPrefix(LuatCapNhat.tienToTepTam) {
        try? FileManager.default.removeItem(atPath: (thuMucTam as NSString).appendingPathComponent(c))
      }
      let tam = URL(fileURLWithPath: thuMucTam).appendingPathComponent(LuatCapNhat.tienToTepTam + "\(UUID().uuidString).pkg")
      defer { try? FileManager.default.removeItem(at: tam) }
      guard FileManager.default.createFile(atPath: tam.path, contents: nil, attributes: [.posixPermissions: 0o600]),
            let ghi = try? FileHandle(forWritingTo: tam) else { bo("không tạo được tệp tạm", chu: "lỗi ghi đĩa"); return }
      let tai = TaiCoTran(mayChu: mayChu(), ghi: ghi, toiDa: toiDaByte)
      let (resp, loi) = await tai.chay(session, URLRequest(url: u))
      try? ghi.close()
      if tai.quaCo { bo("gói vượt \(toiDaByte) byte — đã dừng tải"); return }
      if let loi { bo("tải lỗi: \(loi)", chu: "mất mạng hoặc tải bị ngắt"); return }
      guard let h = resp as? HTTPURLResponse, h.statusCode == 200 else {
        bo("tải trả mã \((resp as? HTTPURLResponse)?.statusCode ?? 0) (chuyển hướng ngoài danh sách cho phép cũng vào đây)", chu: "máy chủ phát hành trả lỗi"); return
      }
      let kich = (try? FileManager.default.attributesOfItem(atPath: tam.path)[.size] as? Int) ?? 0
      guard kich > 0, kich <= toiDaByte else { bo("kích thước gói bất thường (\(kich) byte)"); return }
      let duong = tam.path
      guard let sha = await chayNgoaiActor({ LuatCapNhat.sha256Tep(duong) }) else { bo("không đọc được tệp tải", chu: "lỗi ghi đĩa"); return }
      guard sha == m.sha256 else { boVaDem("sha256 lệch (nhận \(sha.prefix(12))…, manifest \(m.sha256.prefix(12))…)"); return }
      do { try heThong.chuyenTep(tam.path, vao: tep, quyen: 0o600) } catch { bo("không chuyển được gói vào \(thuMuc): \(error)", chu: "lỗi ghi đĩa"); return }
    }

    // pkgutil/spctl (tới 60 giây mỗi lệnh, spctl hỏi Apple trực tuyến) chạy ngoài luồng hợp tác của Swift concurrency
    let (mk, rk) = await chayNgoaiActor({ ht.kiemChuKyGoi(tep) })
    guard mk == 0, LuatCapNhat.chuKyDung(rk) else { boVaDem("chữ ký gói sai (pkgutil mã \(mk))"); return }
    let (ms, rs) = await chayNgoaiActor({ ht.kiemSpctlGoi(tep) })
    guard ms == 0 else { boVaDem("spctl từ chối gói (mã \(ms): \(rs.prefix(200)))"); return }
    heThong.ghiLog("Cập nhật: sha256 + chữ ký khớp (\(LuatCapNhat.nguoiKy)).")

    // Kiểm lại NGAY trước khi giao installer: máy bị gỡ / bỏ ghép trong lúc tải thì thôi.
    guard await choPhep(), heThong.docTep(DuongDan.daGo) == nil else { bo("máy đã bị gỡ hoặc bỏ ghép trong lúc tải", chu: "máy đang được gỡ hoặc bỏ ghép"); return }
    // Dấu ghi TRƯỚC khi giao installer (preinstall bootout daemon ngay, không kịp ghi sau); giao lỗi (kể cả installer khác đang chạy —
    // caiGoi tự kiểm) thì trả dấu cũ ⇒ lượt này không bị tính.
    let dauCu = heThong.docTep(tepDaThu)
    func traDau() { if let c = dauCu { try? heThong.ghiTep(tepDaThu, c, quyen: 0o600) } else { heThong.xoaTep(tepDaThu) } }
    guard ghiDau() else { bo("không ghi được dấu đã thử nên không cài", chu: "lỗi ghi đĩa"); return }
    do {
      try await chayNgoaiActor({ Result { try ht.caiGoi(tep) } }).get()
      // Gỡ (go-cai.sh / gỡ từ xa) xen vào đúng giữa lần kiểm cuối và submit: KHÔNG `launchctl remove` job (có thể giết installer đang chạy ⇒
      // cài nửa chừng). Thứ tự an toàn nằm trong job (lenhJobCai): ghi PID rồi mới kiểm dấu gỡ, ngay trước installer — thấy dấu thì không cài;
      // dấu đến sau lần kiểm đó thì installer chạy trọn và postinstall (dấu gỡ + PID job còn sống) dọn, không nạp lại. Gói để job tự xoá.
      if heThong.docTep(DuongDan.daGo) != nil {
        // Thường job thấy dấu và tự bỏ (installer chưa chạy) ⇒ không tính lượt; lỡ installer đã chạy thì máy đang gỡ, postinstall dọn.
        traDau()
        heThong.ghiLog("Cập nhật: máy bị gỡ ngay lúc giao installer — job cài tự bỏ nếu installer chưa chạy; đã chạy thì cài trọn và postinstall dọn.")
        so.dat("Chưa cập nhật bản \(m.version): máy đang được gỡ; sẽ thử lại sau.", luc: dongHo()); return
      }
      so.dat("Đã tải bản \(m.version), đang cài…", luc: dongHo())
      heThong.ghiLog("Cập nhật: đã giao `installer` cho launchd (\(LuatCapNhat.nhanCai)) — daemon sẽ được nạp lại ở bản \(m.version).")
    } catch {
      traDau()
      // KHÔNG xoá gói: lỗi có thể là «đang có lượt cài» (job khác vừa submit cùng tên tệp và đang đọc nó); tệp sót được dọn ở lượt sau
      heThong.ghiLog("Cập nhật: không chạy được installer: \(error) — KHÔNG cài.")
      so.dat("Cập nhật bản \(m.version) lỗi: không chạy được installer; sẽ thử lại sau.", luc: dongHo())
    }
  }
}
