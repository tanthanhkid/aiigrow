// Các quyết định THUẦN của daemon: đóng app nào, lệnh IPC nào được nhận, đếm phút theo app.
import Foundation

/// Một tiến trình của tài khoản Con (HeThong liệt kê).
public struct TienTrinh: Equatable {
  public var pid: Int32
  public var uid: UInt32
  public var duongDan: String
  /// Gói .app NGOÀI CÙNG chứa tệp chạy (helper của Chrome nằm trong Chrome.app ⇒ tính là Chrome). nil = không thuộc .app nào.
  public var duongDanApp: String?
  public var bundleId: String?
  /// .app GẦN NHẤT chứa tệp thực thi (iPad: …/Wrapper/Game.app; launcher: …/LeagueClient.app) và bundle id của nó.
  public var duongDanAppGan: String?
  public var bundleIdGan: String?
  public init(pid: Int32, uid: UInt32, duongDan: String, duongDanApp: String? = nil, bundleId: String? = nil, bundleIdGan: String? = nil) {
    self.pid = pid; self.uid = uid; self.duongDan = duongDan
    self.duongDanApp = duongDanApp ?? QuyetDinhApp.appNgoaiCung(duongDan); self.bundleId = bundleId
    self.duongDanAppGan = QuyetDinhApp.appGanNhat(duongDan); self.bundleIdGan = bundleIdGan
  }
}

public enum QuyetDinhApp {
  /// App hệ thống luôn được chạy (thiếu là phiên macOS hỏng / không mở được AiiGrow / Con không xin được).
  public static let heThong: Set<String> = [
    "com.apple.finder", "com.apple.dock", "com.apple.systemuiserver", "com.apple.loginwindow", "com.apple.controlcenter",
    "com.apple.notificationcenterui", "com.apple.spotlight", "com.apple.wallpaper.agent", "com.apple.windowmanager",
    "com.apple.textinputmenuagent", "com.apple.universalcontrol", "com.apple.accessibility.axvisualsupportagent",
    "com.apple.securityagent", "com.apple.coreservices.uiagent", "com.apple.screensaver.engine", "com.apple.screensaver",
    "vn.aiilab.aiigrow", "vn.aiilab.aiigrow.tray",
    // Cài đặt hệ thống + công cụ học tập cơ bản (khớp macOS trong ALLOWLIST_HE_THONG của server/lib/luat-app.ts)
    "com.apple.systempreferences", "com.apple.calculator", "com.apple.notes", "com.apple.preview", "com.apple.photos",
    "com.microsoft.word", "com.microsoft.excel", "com.microsoft.powerpoint",
    "com.apple.iwork.pages", "com.apple.iwork.numbers", "com.apple.iwork.keynote",
    // Bộ gõ tiếng Việt + công cụ hỗ trợ từ xa của Ba Mẹ (Windows: unikey.exe, tvnserver.exe, tailscale-ipn.exe)
    "io.tailscale.ipn.macsys", "io.tailscale.ipn.macos", "com.teamviewer.teamviewer", "com.teamviewer.teamviewer.agent",
  ]
  /// Thư mục BỘ GÕ + công cụ hỗ trợ từ xa (so không phân biệt hoa/thường, khớp ở BẤT KỲ đâu trong đường dẫn: «/Library/…» và «~/Library/…»):
  /// OpenKey, EVKey, GoTiengViet cài vào «Input Methods» — đóng chúng là Con mất bộ gõ cả hệ thống.
  public static let thuMucMienTru = ["/library/input methods/", "/library/application support/tailscale/", "/library/application support/teamviewer/"]
  /// Thư mục con trực tiếp của «~» mà tệp thực thi KHÔNG nằm trong .app vẫn bị coi là app (Minecraft Java, game tải về…).
  static let thuMucNhaCuaCon: Set<String> = ["library", "downloads", "desktop", "documents", "movies", "music", "public", "applications"]
  /// Thư mục hệ thống (SIP bảo vệ, Con không tự đặt app vào được) — không bao giờ đóng.
  /// KHÔNG gồm /System/Applications và Cryptexes (Safari, Chess, Messages, FaceTime, App Store, News… là app Con tự mở) — những app đó xét theo allowlist bundle id như app thường.
  public static let thuMucHeThong = ["/System/Library/", "/usr/", "/bin/", "/sbin/", "/Library/Apple/", "/private/var/db/", "/Library/Application Support/AiiGrow/"]

  /// «/Applications/Google Chrome.app/Contents/Frameworks/…/Helper.app/Contents/MacOS/x» ⇒ «/Applications/Google Chrome.app».
  public static func appNgoaiCung(_ duongDan: String) -> String? {
    guard let r = duongDan.range(of: ".app/", options: .caseInsensitive) ?? (duongDan.lowercased().hasSuffix(".app") ? duongDan.range(of: ".app", options: [.caseInsensitive, .backwards]) : nil)
    else { return nil }
    return String(duongDan[..<r.upperBound]).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
      .withLeadingSlash
  }

  /// .app GẦN NHẤT chứa tệp thực thi: «…/Game.app/Wrapper/Game.app/Game» ⇒ «…/Wrapper/Game.app».
  public static func appGanNhat(_ duongDan: String) -> String? {
    guard let r = duongDan.range(of: ".app/", options: [.caseInsensitive, .backwards]) else { return nil }
    return String(duongDan[..<r.upperBound]).trimmingCharacters(in: CharacterSet(charactersIn: "/")).withLeadingSlash
  }

  /// Tiến trình PHỤ chạy nền của một app (widget/extension, XPC, helper, login item) — không đóng riêng chúng; app chính bị đóng thì chúng tự chết.
  /// Mọi tiến trình khác thuộc .app (kể cả iPad Wrapper, launcher lồng nhau, Wine/CrossOver SharedSupport) xét theo bundle id.
  public static func laTienTrinhPhu(_ duongDan: String) -> Bool {
    let d = duongDan.lowercased()
    return [".appex/", "/plugins/", "/xpcservices/", "/library/loginitems/", "/helpers/", "helper.app/"].contains { d.contains($0) }
  }

  /// App có thuộc danh sách cho phép không — so cả bundle id lẫn tên .app (máy chủ gửi được cả hai), không phân biệt hoa/thường.
  public static func duocPhep(_ t: TienTrinh, choPhep: Set<String>) -> Bool {
    let duongThap = t.duongDan.lowercased()
    if thuMucMienTru.contains(where: { duongThap.contains($0) }) { return true }      // bộ gõ + công cụ hỗ trợ từ xa
    guard let app = t.duongDanApp else { return khopNgoaiApp(t, choPhep: Set(choPhep.map { $0.lowercased() })) }
    if laTienTrinhPhu(t.duongDan) { return true }                           // phụ (.appex/PlugIns/XPCServices/Helpers/LoginItems): không đóng riêng
    let choPhep = Set(choPhep.map { $0.lowercased() })                                // máy chủ luôn lưu chữ thường (chuanMuc); bundle id thật có chữ hoa
    if thuMucHeThong.contains(where: { app.hasPrefix($0) || t.duongDan.hasPrefix($0) }) { return true }
    if app.lowercased() == DuongDan.app.lowercased() { return true }
    // Được phép nếu .app ngoài cùng HOẶC .app gần nhất (Wrapper/launcher lồng) nằm trong allowlist — theo bundle id hoặc tên .app.
    func khop(_ app: String?, _ bundle: String?) -> Bool {
      if let b = bundle?.lowercased(), heThong.contains(b) || choPhep.contains(b) { return true }
      guard let app else { return false }
      let ten = (app as NSString).lastPathComponent.lowercased()                       // «pages.app»
      return choPhep.contains(ten) || choPhep.contains((ten as NSString).deletingPathExtension)
    }
    return khop(app, t.bundleId) || khop(t.duongDanAppGan, t.bundleIdGan)
  }

  /// Tệp thực thi KHÔNG thuộc .app: chỉ tiến trình nằm trong thư mục người dùng (Library, Downloads, Desktop…) hoặc là java/javaw ở trong «/Users/…»
  /// mới bị xét như app (tên mục = tên tệp thực thi, vd «java»); công cụ hệ thống (/usr, /bin, Homebrew…) vẫn không đụng.
  static func khopNgoaiApp(_ t: TienTrinh, choPhep: Set<String>) -> Bool {
    let phan = t.duongDan.lowercased().split(separator: "/").map(String.init)
    guard phan.count > 3, phan[0] == "users", let ten = phan.last else { return true }
    let laJava = ten == "java" || ten == "javaw"
    guard thuMucNhaCuaCon.contains(phan[2]) || laJava else { return true }
    return choPhep.contains(ten) || choPhep.contains((ten as NSString).deletingPathExtension)
  }

  /// Tiến trình cần đóng: chỉ khi «chỉ app học» và đang CHẶN THẬT; chỉ tiến trình của uid Con.
  public static func canDong(_ ds: [TienTrinh], uidCon: UInt32, chiAppHoc: Bool, choPhep: [String]) -> [TienTrinh] {
    guard chiAppHoc else { return [] }
    let cho = Set(choPhep.map { $0.lowercased() })
    return ds.filter { $0.uid == uidCon && $0.pid > 1 && !duocPhep($0, choPhep: cho) }
  }
}

private extension String {
  var withLeadingSlash: String { hasPrefix("/") ? self : "/" + self }
}

/// Ai được gọi lệnh IPC nào (THIET-KE.md mục 3) — kiểm bằng uid từ getpeereid.
public enum QuyenIPC {
  public enum KetQua: Equatable { case duoc, tuChoi(ma: String, chu: String) }

  public static func kiem(_ y: YeuCauTray, uidGoi: UInt32, uidCon: UInt32?, daGhep: Bool, laAdmin: (UInt32) -> Bool) -> KetQua {
    switch y {
    case .trangThai:
      return .duoc                                                                       // ai cũng hỏi được; phần riêng của Con chỉ trả cho uid Con
    case .ping, .appTienCanh, .xinThem, .xinMo:
      guard daGhep, let c = uidCon, c == uidGoi else { return .tuChoi(ma: "khong_phai_con", chu: "Lệnh này chỉ nhận từ tài khoản của Con.") }
      return .duoc
    case .ghep:
      guard !daGhep else { return .tuChoi(ma: "da_ghep", chu: "Máy này đã được ghép rồi.") }
      guard uidGoi != 0, laAdmin(uidGoi) else { return .tuChoi(ma: "can_admin", chu: "Chỉ tài khoản quản trị (Ba Mẹ) mới ghép được máy.") }
      return .duoc
    }
  }
}

/// Đếm giây dùng theo (ngày, app) — lưu trong cấu hình; gửi TỔNG phút của ngày (máy chủ ghi greatest ⇒ gửi lại không cộng đôi).
public enum DemPhut {
  public static let khongRo = "khong-ro"         // tray tắt ⇒ vẫn tính giờ dưới tên «Không rõ» (không dừng được đồng hồ bằng cách tắt tray)

  public static func khoa(ngay: String, app: String) -> String { ngay + "|" + app.lowercased() }

  public static func cong(_ d: inout [String: Double], ngay: String, app: String, giay: Double) {
    guard giay > 0, !app.isEmpty else { return }
    d[khoa(ngay: ngay, app: app), default: 0] += giay
  }

  /// Giữ 3 ngày gần nhất.
  public static func don(_ d: inout [String: Double]) {
    let ngay = Set(d.keys.compactMap { $0.split(separator: "|").first.map(String.init) }).sorted(by: >).prefix(3)
    d = d.filter { k, _ in ngay.contains(where: { k.hasPrefix($0 + "|") }) }
  }

  public static func tong(_ d: [String: Double]) -> [MucDung] {
    d.compactMap { k, giay in
      let p = k.split(separator: "|", maxSplits: 1).map(String.init)
      let phut = Int(giay / 60)
      return p.count == 2 && phut > 0 ? MucDung(muc: p[1], phut: phut, day: p[0]) : nil
    }.sorted { ($0.day, $0.muc) < ($1.day, $1.muc) }
  }

  public static func ngay(_ d: Date, lich: Calendar = .current) -> String {
    let c = lich.dateComponents([.year, .month, .day], from: d)
    return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
  }
}

/// Kiểm app tiền cảnh: daemon tự kiểm, không tin bundleId tray báo — Con nào cũng gửi được lệnh qua socket 0666 (khai «calculator» để né trần giờ).
public enum TienCanh {
  /// «ASN:0x0-0xeabcaae:» ⇒ «ASN:0x0-0xeabcaae:» (nil nếu không đúng dạng).
  public static func tachASN(_ ra: String) -> String? {
    for d in ra.split(whereSeparator: \.isNewline) {
      let t = d.trimmingCharacters(in: .whitespaces)
      if t.hasPrefix("ASN:") { return t }
    }
    return nil
  }

  /// `"CFBundleIdentifier"="com.Apple.Finder"` ⇒ com.apple.finder — LUÔN chữ thường (khớp luật app của máy chủ, usage gửi lên chữ thường); nil nếu «[ NULL ]» hay rỗng.
  public static func tachBundleId(_ ra: String) -> String? {
    guard let i = ra.range(of: "=") else { return nil }
    let v = ra[i.upperBound...].trimmingCharacters(in: CharacterSet(charactersIn: "\" \n\r\t"))
    return (v.isEmpty || v.contains(" ") || v.uppercased() == "NULL") ? nil : v.lowercased()
  }

  /// Tên app để đếm phút: có kết quả daemon tự kiểm thì LUÔN dùng (kill tray không đổi được gì); không kiểm được ⇒ «Không rõ» (vẫn trừ giờ).
  public static func chon(thatSu: String?) -> String {
    guard let that = thatSu, !that.isEmpty else { return DemPhut.khongRo }
    return that.lowercased()
  }
}

/// Bộ nhớ đệm app tiền cảnh THEO UID: việc kiểm (hai lần `launchctl asuser lsappinfo`) chạy NGOÀI actor trên hàng đợi riêng, có timeout.
/// `doc` KHÔNG BAO GIỜ chờ: chưa có đệm (hoặc của uid khác, hoặc quá `hanDem` giây) ⇒ trả nil (tính «Không rõ») và kích một lần kiểm nền.
/// Không spawn theo từng `trangThai` IPC: chỉ làm mới khi đệm đã ≥ `lamMoiSau` giây tính từ lúc kiểm XONG.
public final class DemTienCanh: @unchecked Sendable {
  private let khoa = NSLock()
  private var giaTri: String?
  private var uidDem: UInt32?
  private var luc: Double = -1_000_000           // lúc kiểm xong (đồng hồ của người gọi)
  private var dangChay = false
  private let kiem: (UInt32) -> String?
  private let lamMoiSau: Double
  private let hanDem: Double
  private let hangDoi = DispatchQueue(label: "vn.aiilab.aiigrow.tiencanh")
  /// Chỉ test: chạy kiểm ngay tại chỗ để kết quả có sẵn trong cùng lượt.
  private let dongBo: Bool

  public init(lamMoiSau: Double = 4, hanDem: Double = 12, dongBo: Bool = false, kiem: @escaping (UInt32) -> String?) {
    self.kiem = kiem; self.lamMoiSau = lamMoiSau; self.hanDem = hanDem; self.dongBo = dongBo
  }

  /// `gio`: đồng hồ đơn điệu (giây). Gọi mỗi vòng áp chính sách.
  public func doc(uid: UInt32, gio: Double) -> String? {
    khoa.lock()
    let canLam = !dangChay && (uidDem != uid || gio - luc >= lamMoiSau)
    if canLam { dangChay = true }
    khoa.unlock()
    if canLam {
      let viec = { [self] in
        let batDau = ProcessInfo.processInfo.systemUptime
        let kq = kiem(uid)
        let mat = ProcessInfo.processInfo.systemUptime - batDau      // thời gian kiểm tốn ⇒ `luc` ghi lúc XONG, không phải lúc bắt đầu
        khoa.lock(); giaTri = kq; uidDem = uid; luc = gio + mat; dangChay = false; khoa.unlock()
      }
      if dongBo { viec() } else { hangDoi.async(execute: viec) }
    }
    khoa.lock(); defer { khoa.unlock() }
    return (uidDem == uid && gio - luc <= hanDem) ? giaTri : nil
  }
}
