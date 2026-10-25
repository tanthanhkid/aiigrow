// Quét app đã cài THẬT trên máy Con: /Applications (nguon «applications») + ~/Applications của tài khoản Con («user-applications»).
// Đệ quy MỘT cấp thư mục con (/Applications/Adobe X/…app), không lấy .app nằm trong .app khác; bỏ app không giao diện (LSUIElement/LSBackgroundOnly),
// app Apple nằm trong /System (Safari qua liên kết tới Cryptexes), chính AiiGrow. Chữ ký: Security framework (không kiểm hợp lệ — chỉ đọc Team ID + Authority).
// Icon: PNG 96×96 + iconBam (SHA-256 byte PNG). Đọc thẳng .icns của gói bằng ImageIO; gói chỉ có Assets.car (CFBundleIconName) ⇒ NSWorkspace.icon(forFile:).
// Tên tệp icon lấy từ Info.plist Con sửa được (~/Applications) ⇒ chỉ nhận tệp nằm TRONG gói (daemon root không đọc tệp ngoài gói).
import AppKit
import CoreGraphics
import Foundation
import ImageIO
import Security

/// Nguồn danh sách app — tách protocol để BoMay test bằng bản giả.
public protocol NguonApp: Sendable {
  /// `taiKhoanCon`: tên ngắn tài khoản macOS của Con (để quét ~/Applications của Con); nil ⇒ chỉ /Applications.
  func quet(taiKhoanCon: String?) -> [AppMay]
}

public struct QuetAppMac: NguonApp {
  /// Thư mục gốc dùng chung ⇒ nguon «applications».
  public var thuMucChung: [String]
  /// Thư mục nhà của tài khoản ⇒ nil nếu không thấy.
  public var thuMucNha: @Sendable (String) -> String?
  public var layChuKy: Bool
  public var layIcon: Bool

  public init(thuMucChung: [String] = ["/Applications"], layChuKy: Bool = true, layIcon: Bool = true,
              thuMucNha: @escaping @Sendable (String) -> String? = { ten in FileManager.default.homeDirectory(forUser: ten)?.path }) {
    self.thuMucChung = thuMucChung; self.thuMucNha = thuMucNha; self.layChuKy = layChuKy; self.layIcon = layIcon
  }

  public func quet(taiKhoanCon: String?) -> [AppMay] {
    var goc: [(String, String)] = thuMucChung.map { ($0, "applications") }
    if let tk = taiKhoanCon?.trimmingCharacters(in: .whitespaces), !tk.isEmpty, let nha = thuMucNha(tk), !nha.isEmpty {
      goc.append(((nha as NSString).appendingPathComponent("Applications"), "user-applications"))
    }
    var kq: [AppMay] = []
    for (thuMuc, nguon) in goc {
      for duong in QuetAppMac.timGoiApp(thuMuc) {
        if let a = docApp(duong, nguon: nguon) { kq.append(a) }
      }
    }
    return kq
  }

  /// Các gói .app ở cấp 1 và cấp 2 của `thuMuc` (không vào trong .app, bỏ mục ẩn). Liên kết tượng trưng được theo (Safari ⇒ Cryptexes) — lọc sau theo đường thật.
  static func timGoiApp(_ thuMuc: String) -> [String] {
    let fm = FileManager.default
    func con(_ d: String) -> [String] { ((try? fm.contentsOfDirectory(atPath: d)) ?? []).filter { !$0.hasPrefix(".") }.sorted() }
    func laThuMuc(_ p: String) -> Bool { var d: ObjCBool = false; return fm.fileExists(atPath: p, isDirectory: &d) && d.boolValue }
    var kq: [String] = []
    for ten in con(thuMuc) {
      let p = (thuMuc as NSString).appendingPathComponent(ten)
      guard laThuMuc(p) else { continue }
      if ten.lowercased().hasSuffix(".app") { kq.append(p); continue }
      for ten2 in con(p) where ten2.lowercased().hasSuffix(".app") {
        let p2 = (p as NSString).appendingPathComponent(ten2)
        if laThuMuc(p2) { kq.append(p2) }
      }
    }
    return kq
  }

  /// Gói chứa Info.plist: .app Mac (Contents/Info.plist) hoặc app iPhone/iPad trên Mac Apple silicon (X.app/WrappedBundle ⇒ Wrapper/X.app/Info.plist).
  static func goiThat(_ duong: String) -> (goi: String, plist: [String: Any], ios: Bool)? {
    if let p = NSDictionary(contentsOfFile: duong + "/Contents/Info.plist") as? [String: Any] { return (duong, p, false) }
    let trong = (duong + "/WrappedBundle" as NSString).resolvingSymlinksInPath
    guard trong.hasPrefix((duong as NSString).resolvingSymlinksInPath + "/Wrapper/"), let p = NSDictionary(contentsOfFile: trong + "/Info.plist") as? [String: Any] else { return nil }
    return (trong, p, true)
  }

  /// Một .app ⇒ AppMay; nil nếu không có bundle id / không giao diện / app hệ thống / AiiGrow.
  func docApp(_ duong: String, nguon: String) -> AppMay? {
    guard let (goi, plist, ios) = QuetAppMac.goiThat(duong),
          let bid = (plist["CFBundleIdentifier"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !bid.isEmpty else { return nil }
    let that = (duong as NSString).resolvingSymlinksInPath
    guard DanhSachApp.coGiaoDien(plist), !DanhSachApp.laAppHeThong(bundleId: bid, duongDanThat: that), !DanhSachApp.laAiiGrow(bid) else { return nil }
    var a = AppMay(khoa: bid, muc: bid, ten: DanhSachApp.tenHienThi(plist, duongDan: duong), nguon: nguon, duongDan: duong,
                   phienBan: (plist["CFBundleShortVersionString"] as? String) ?? (plist["CFBundleVersion"] as? String))
    if layChuKy { (a.teamId, a.nhaPhatHanh) = QuetAppMac.chuKy(goi) }
    if layIcon {
      a.icon = (ios ? QuetAppMac.iconIOS(goi, plist: plist) : QuetAppMac.icon(duong, plist: plist)) ?? QuetAppMac.iconWorkspace(duong)
      a.iconBam = a.icon.flatMap { Data(base64Encoded: $0) }.map(DanhSachApp.hex)
    }
    return a
  }

  /// (Team ID, tên nhà phát hành từ Authority đầu) — không kiểm hợp lệ chữ ký (nhanh, không chạm mạng).
  static func chuKy(_ duong: String) -> (String?, String?) {
    var code: SecStaticCode?
    guard SecStaticCodeCreateWithPath(URL(fileURLWithPath: duong) as CFURL, [], &code) == errSecSuccess, let code else { return (nil, nil) }
    var info: CFDictionary?
    guard SecCodeCopySigningInformation(code, SecCSFlags(rawValue: kSecCSSigningInformation), &info) == errSecSuccess,
          let d = info as? [String: Any] else { return (nil, nil) }
    let team = (d[kSecCodeInfoTeamIdentifier as String] as? String).flatMap { $0.isEmpty ? nil : $0 }
    var authority: String?
    if let certs = d[kSecCodeInfoCertificates as String] as? [SecCertificate], let dau = certs.first {
      authority = SecCertificateCopySubjectSummary(dau) as String?
    }
    return (team, DanhSachApp.tenNhaPhatHanh(authority: authority))
  }

  /// `thuMuc/ten` chỉ khi `ten` là tên tệp trần (không «/», không «..») và đường thật vẫn nằm trong `goi` — chặn Info.plist trỏ ra ngoài gói.
  static func tepTrongGoi(_ goi: String, _ thuMuc: String, _ ten: String) -> String? {
    guard !ten.isEmpty, !ten.contains("/"), !ten.contains("\0"), ten != ".", ten != ".." else { return nil }
    let tep = (thuMuc as NSString).appendingPathComponent(ten)
    let that = (tep as NSString).resolvingSymlinksInPath, gocThat = (goi as NSString).resolvingSymlinksInPath
    guard that.hasPrefix(gocThat + "/"), FileManager.default.fileExists(atPath: that) else { return nil }
    return that
  }

  /// PNG 96×96 base64 từ tệp icon của gói (CFBundleIconFile; thiếu đuôi thì thêm .icns). Không có / không đọc được ⇒ nil.
  static func icon(_ duong: String, plist: [String: Any], canh: Int = DanhSachApp.canhIcon) -> String? {
    guard var ten = (plist["CFBundleIconFile"] as? String)?.trimmingCharacters(in: .whitespaces), !ten.isEmpty else { return nil }
    if (ten as NSString).pathExtension.isEmpty { ten += ".icns" }
    guard let tep = tepTrongGoi(duong, duong + "/Contents/Resources", ten), let png = pngThuNho(tep, canh: canh) else { return nil }
    return png.base64EncodedString()
  }

  /// Icon hệ thống vẽ cho gói (Assets.car, app iPad…) qua NSWorkspace — chạy được từ daemon (IconServices, không cần phiên đồ hoạ).
  static func iconWorkspace(_ duong: String, canh: Int = DanhSachApp.canhIcon) -> String? {
    let anh = NSWorkspace.shared.icon(forFile: duong)
    var khung = CGRect(x: 0, y: 0, width: canh, height: canh)
    guard let cg = anh.cgImage(forProposedRect: &khung, context: nil, hints: nil) else { return nil }
    return pngTuAnh(cg, canh: canh)?.base64EncodedString()
  }

  /// App iPhone/iPad: CFBundleIcons › CFBundlePrimaryIcon › CFBundleIconFiles ⇒ «<tên>@2x.png» … ở gốc gói (chỉ có Assets.car ⇒ nil).
  static func iconIOS(_ goi: String, plist: [String: Any], canh: Int = DanhSachApp.canhIcon) -> String? {
    let chinh = (plist["CFBundleIcons"] as? [String: Any])?["CFBundlePrimaryIcon"] as? [String: Any]
    let ten = (chinh?["CFBundleIconFiles"] as? [String]) ?? []
    for t in ten.reversed() {
      let goc = t.lowercased().hasSuffix(".png") ? String(t.dropLast(4)) : t          // «AppIcon60x60.png» cũng gặp
      for duoi in ["@2x.png", "@3x.png", ".png", "@2x~ipad.png"] {
        if let tep = tepTrongGoi(goi, goi, goc + duoi), let png = pngThuNho(tep, canh: canh) { return png.base64EncodedString() }
      }
    }
    return nil
  }

  /// Ảnh (icns/png…) ⇒ PNG vuông `canh`×`canh`: chọn ảnh con nhỏ nhất mà ≥ canh (không có thì lớn nhất), vẽ lại bằng CoreGraphics.
  static func pngThuNho(_ tep: String, canh: Int) -> Data? {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: tep) as CFURL, nil) else { return nil }
    let n = CGImageSourceGetCount(src)
    guard n > 0 else { return nil }
    var chon = 0, rongChon = 0
    for i in 0..<n {
      let p = CGImageSourceCopyPropertiesAtIndex(src, i, nil) as? [CFString: Any]
      let w = (p?[kCGImagePropertyPixelWidth] as? Int) ?? 0
      let tot = rongChon < canh ? w > rongChon : (w >= canh && w < rongChon)
      if tot { chon = i; rongChon = w }
    }
    guard let anh = CGImageSourceCreateImageAtIndex(src, chon, nil) else { return nil }
    return pngTuAnh(anh, canh: canh)
  }

  /// Vẽ lại ảnh thành PNG vuông `canh`×`canh` (sRGB, có alpha).
  static func pngTuAnh(_ anh: CGImage, canh: Int) -> Data? {
    guard let ctx = CGContext(data: nil, width: canh, height: canh, bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
    ctx.interpolationQuality = .high
    ctx.draw(anh, in: CGRect(x: 0, y: 0, width: canh, height: canh))
    guard let nho = ctx.makeImage() else { return nil }
    let ra = NSMutableData()
    guard let dst = CGImageDestinationCreateWithData(ra as CFMutableData, "public.png" as CFString, 1, nil) else { return nil }
    CGImageDestinationAddImage(dst, nho, nil)
    guard CGImageDestinationFinalize(dst) else { return nil }
    return ra as Data
  }
}
