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
  public init(pid: Int32, uid: UInt32, duongDan: String, duongDanApp: String? = nil, bundleId: String? = nil) {
    self.pid = pid; self.uid = uid; self.duongDan = duongDan
    self.duongDanApp = duongDanApp ?? QuyetDinhApp.appNgoaiCung(duongDan); self.bundleId = bundleId
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
  ]
  /// Thư mục hệ thống (SIP bảo vệ, Con không tự đặt app vào được) — không bao giờ đóng.
  public static let thuMucHeThong = ["/System/", "/usr/", "/bin/", "/sbin/", "/Library/Apple/", "/private/var/db/", "/Library/Application Support/AiiGrow/"]

  /// «/Applications/Google Chrome.app/Contents/Frameworks/…/Helper.app/Contents/MacOS/x» ⇒ «/Applications/Google Chrome.app».
  public static func appNgoaiCung(_ duongDan: String) -> String? {
    guard let r = duongDan.range(of: ".app/", options: .caseInsensitive) ?? (duongDan.lowercased().hasSuffix(".app") ? duongDan.range(of: ".app", options: [.caseInsensitive, .backwards]) : nil)
    else { return nil }
    return String(duongDan[..<r.upperBound]).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
      .withLeadingSlash
  }

  /// App có thuộc danh sách cho phép không — so cả bundle id lẫn tên .app (máy chủ gửi được cả hai), không phân biệt hoa/thường.
  public static func duocPhep(_ t: TienTrinh, choPhep: Set<String>) -> Bool {
    guard let app = t.duongDanApp else { return true }                               // không phải app có giao diện ⇒ không đụng
    if thuMucHeThong.contains(where: { app.hasPrefix($0) || t.duongDan.hasPrefix($0) }) { return true }
    if app.lowercased() == DuongDan.app.lowercased() { return true }
    let ten = (app as NSString).lastPathComponent.lowercased()                         // «pages.app»
    let tenKhongDuoi = (ten as NSString).deletingPathExtension                          // «pages»
    if let b = t.bundleId?.lowercased(), heThong.contains(b) || choPhep.contains(b) { return true }
    return choPhep.contains(ten) || choPhep.contains(tenKhongDuoi)
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
    case .appTienCanh, .xinThem, .xinMo:
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

/// Kiểm app tiền cảnh: daemon không tin bundleId tray báo một mình — Con nào cũng gửi được lệnh qua socket 0666 (khai «calculator» để né trần giờ).
public enum TienCanh {
  /// «ASN:0x0-0xeabcaae:» ⇒ «ASN:0x0-0xeabcaae:» (nil nếu không đúng dạng).
  public static func tachASN(_ ra: String) -> String? {
    for d in ra.split(whereSeparator: \.isNewline) {
      let t = d.trimmingCharacters(in: .whitespaces)
      if t.hasPrefix("ASN:") { return t }
    }
    return nil
  }

  /// `"CFBundleIdentifier"="com.apple.finder"` ⇒ com.apple.finder (nil nếu «[ NULL ]» hay rỗng).
  public static func tachBundleId(_ ra: String) -> String? {
    guard let i = ra.range(of: "=") else { return nil }
    let v = ra[i.upperBound...].trimmingCharacters(in: CharacterSet(charactersIn: "\" \n\r\t"))
    return (v.isEmpty || v.contains(" ") || v.uppercased() == "NULL") ? nil : v
  }

  /// Tên app để đếm phút: kết quả daemon tự kiểm là nguồn duy nhất. Không kiểm được ⇒ «Không rõ» (vẫn tính giờ); tray báo lệch bị bỏ qua.
  public static func chon(thatSu: String?, trayBao: String?, trayConSong: Bool) -> String {
    guard trayConSong, let that = thatSu, !that.isEmpty else { return DemPhut.khongRo }
    return that
  }
}

/// Nhận diện tiến trình tray thật ở đầu bên kia socket: chạy từ gói đã cài (root sở hữu, Con không ghi được) — LOCAL_PEERPID ⇒ proc_pidpath.
public enum NguoiGoiTray {
  public static let tienTo = DuongDan.app + "/Contents/MacOS/"
  public static func hopLe(duongDan: String?, tienTo: String = NguoiGoiTray.tienTo) -> Bool {
    guard let d = duongDan, !d.contains("/../") else { return false }
    return d.hasPrefix(tienTo)
  }
}
