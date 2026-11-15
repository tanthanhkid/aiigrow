// Danh sách app thật + chặn app theo bundle id (hợp đồng 25/10): quét giả từ thư mục tạm, lọc, băm, diff, quyết định gửi/quét,
// đọc blockedApps, quyết định đóng, và luồng BoMay gửi /ung-dung (đủ / phần đổi / 409 / yeuCau / 404).
import CoreGraphics
import ImageIO
import XCTest
@testable import AiiGrowCore

final class DanhSachAppTests: XCTestCase {
  private var tam = ""

  override func setUp() {
    tam = NSTemporaryDirectory() + "aiigrow-dsapp-\(UUID().uuidString)"
    try? FileManager.default.createDirectory(atPath: tam, withIntermediateDirectories: true)
  }
  override func tearDown() { try? FileManager.default.removeItem(atPath: tam) }

  // MARK: quét giả

  private func taoApp(_ duong: String, plist: [String: Any], iconPng: Data? = nil) throws {
    try FileManager.default.createDirectory(atPath: duong + "/Contents/Resources", withIntermediateDirectories: true)
    XCTAssertTrue((plist as NSDictionary).write(toFile: duong + "/Contents/Info.plist", atomically: true))
    if let iconPng { try iconPng.write(to: URL(fileURLWithPath: duong + "/Contents/Resources/AppIcon.icns")) }
  }

  private func pngMau(_ canh: Int) -> Data {
    let ctx = CGContext(data: nil, width: canh, height: canh, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.setFillColor(CGColor(red: 1, green: 0, blue: 0, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: canh, height: canh))
    let d = NSMutableData()
    let dst = CGImageDestinationCreateWithData(d as CFMutableData, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(dst, ctx.makeImage()!, nil); CGImageDestinationFinalize(dst)
    return d as Data
  }

  func testQuetThuMucGia() throws {
    let chung = tam + "/Applications", nha = tam + "/Users/be"
    try taoApp(chung + "/Roblox.app", plist: ["CFBundleIdentifier": "com.roblox.RobloxPlayer", "CFBundleDisplayName": "Roblox",
                                               "CFBundleShortVersionString": "2.6", "CFBundleIconFile": "AppIcon"], iconPng: pngMau(128))
    try taoApp(chung + "/Roblox.app/Contents/MacOS/Inner.app", plist: ["CFBundleIdentifier": "com.roblox.inner"])          // .app trong .app: bỏ
    try taoApp(chung + "/Adobe X/Photoshop.app", plist: ["CFBundleIdentifier": "com.adobe.Photoshop", "CFBundleName": "Photoshop"])
    try taoApp(chung + "/Adobe X/Sau/Qua Sau.app", plist: ["CFBundleIdentifier": "com.qua.sau"])                           // cấp 3: bỏ
    try taoApp(chung + "/Agent.app", plist: ["CFBundleIdentifier": "com.agent", "LSUIElement": true])                     // không giao diện
    try taoApp(chung + "/Nen.app", plist: ["CFBundleIdentifier": "com.nen", "LSBackgroundOnly": "1"])
    try taoApp(chung + "/KhongId.app", plist: ["CFBundleName": "X"])
    try taoApp(chung + "/.An.app", plist: ["CFBundleIdentifier": "com.an"])
    try taoApp(chung + "/AiiGrow.app", plist: ["CFBundleIdentifier": "vn.aiilab.aiigrow"])
    // app iPad: Game.app/WrappedBundle -> Wrapper/Game.app (Info.plist ở gốc gói trong)
    let ipad = chung + "/Game.app/Wrapper/Game.app"
    try FileManager.default.createDirectory(atPath: ipad, withIntermediateDirectories: true)
    XCTAssertTrue((["CFBundleIdentifier": "com.ipad.game", "CFBundleDisplayName": "Game iPad",
                    "CFBundleIcons": ["CFBundlePrimaryIcon": ["CFBundleIconFiles": ["AppIcon60x60"]]]] as NSDictionary).write(toFile: ipad + "/Info.plist", atomically: true))
    try pngMau(120).write(to: URL(fileURLWithPath: ipad + "/AppIcon60x60@2x.png"))
    try FileManager.default.createSymbolicLink(atPath: chung + "/Game.app/WrappedBundle", withDestinationPath: "Wrapper/Game.app")
    try taoApp(nha + "/Applications/Minecraft.app", plist: ["CFBundleIdentifier": "com.mojang.minecraftlauncher"])
    try taoApp(nha + "/Applications/Roblox.app", plist: ["CFBundleIdentifier": "com.roblox.RobloxPlayer"])            // trùng khoa: giữ bản /Applications

    let q = QuetAppMac(thuMucChung: [chung], layChuKy: true, layIcon: true, thuMucNha: { [tam] ten in ten == "be" ? tam + "/Users/be" : nil })
    let ban = DanhSachApp.chuan(q.quet(taiKhoanCon: "be"))
    XCTAssertEqual(ban.ds.map(\.khoa), ["com.adobe.Photoshop", "com.ipad.game", "com.mojang.minecraftlauncher", "com.roblox.RobloxPlayer"])
    let g = ban.ds.first { $0.khoa == "com.ipad.game" }
    XCTAssertEqual(g?.ten, "Game iPad"); XCTAssertEqual(g?.duongDan, chung + "/Game.app"); XCTAssertNotNil(g?.icon)
    let r = ban.ds.first { $0.khoa == "com.roblox.RobloxPlayer" }!
    XCTAssertEqual(r.muc, "com.roblox.RobloxPlayer")
    XCTAssertEqual(r.ten, "Roblox"); XCTAssertEqual(r.nguon, "applications"); XCTAssertEqual(r.phienBan, "2.6")
    XCTAssertEqual(r.duongDan, chung + "/Roblox.app")
    XCTAssertNil(r.teamId, "gói giả không ký")
    let icon = try XCTUnwrap(r.icon.flatMap { Data(base64Encoded: $0) })
    let src = try XCTUnwrap(CGImageSourceCreateWithData(icon as CFData, nil))
    let p = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any]
    XCTAssertEqual(p?[kCGImagePropertyPixelWidth] as? Int, 96); XCTAssertEqual(p?[kCGImagePropertyPixelHeight] as? Int, 96)
    XCTAssertEqual(r.iconBam, DanhSachApp.hex(icon), "iconBam = SHA-256 byte PNG")
    XCTAssertEqual(r.iconBam?.count, 64)
    XCTAssertEqual(ban.ds.first { $0.khoa == "com.adobe.Photoshop" }?.ten, "Photoshop")
    XCTAssertEqual(ban.ds.first { $0.khoa == "com.mojang.minecraftlauncher" }?.nguon, "user-applications")
    XCTAssertEqual(ban.ds.first { $0.khoa == "com.mojang.minecraftlauncher" }?.ten, "Minecraft", "không tên trong plist ⇒ tên tệp")
    // không tài khoản Con ⇒ chỉ /Applications
    XCTAssertEqual(DanhSachApp.chuan(q.quet(taiKhoanCon: nil)).ds.count, 3)
  }

  /// Quét /Applications THẬT của máy chạy test (chỉ khi AIIGROW_QUET_THAT=1) — đo thời gian + xem chữ ký/icon đọc được.
  func testQuetMayThat() throws {
    try XCTSkipUnless(ProcessInfo.processInfo.environment["AIIGROW_QUET_THAT"] == "1", "đặt AIIGROW_QUET_THAT=1 để chạy")
    let t0 = Date()
    let ban = DanhSachApp.chuan(QuetAppMac().quet(taiKhoanCon: NSUserName()))
    print("QUET_THAT \(ban.ds.count) app, \(Int(Date().timeIntervalSince(t0) * 1000)) ms, có team \(ban.ds.filter { $0.teamId != nil }.count), có icon \(ban.ds.filter { $0.icon != nil }.count)")
    for a in ban.ds { print("QUET_THAT \(a.khoa) | \(a.ten) | \(a.nguon) | \(a.phienBan ?? "-") | \(a.teamId ?? "-") | \(a.nhaPhatHanh ?? "-") | icon \(a.icon?.count ?? 0)") }
    XCTAssertFalse(ban.ds.contains { $0.khoa.lowercased() == "com.apple.safari" })
  }

  func testLocAppHeThongVaNhaPhatHanh() {
    XCTAssertTrue(DanhSachApp.laAppHeThong(bundleId: "com.apple.Safari", duongDanThat: "/System/Cryptexes/App/System/Applications/Safari.app"))
    XCTAssertFalse(DanhSachApp.laAppHeThong(bundleId: "com.apple.iWork.Pages", duongDanThat: "/Applications/Pages.app"))
    XCTAssertFalse(DanhSachApp.laAppHeThong(bundleId: "com.roblox.x", duongDanThat: "/System/x.app"))
    XCTAssertEqual(DanhSachApp.tenNhaPhatHanh(authority: "Developer ID Application: Roblox Corporation (Z7S2JB2N2R)"), "Roblox Corporation")
    XCTAssertNil(DanhSachApp.tenNhaPhatHanh(authority: "Apple Mac OS Application Signing"))
    XCTAssertEqual(DanhSachApp.tenNhaPhatHanh(authority: "Some Corp"), "Some Corp")
    XCTAssertNil(DanhSachApp.tenNhaPhatHanh(authority: nil))
  }

  // MARK: chuẩn hoá + băm + diff

  private func app(_ k: String, ban: String = "1", icon: String? = nil) -> AppMay {
    AppMay(khoa: k, muc: k, ten: k.uppercased(), nguon: "applications", duongDan: "/Applications/\(k).app", phienBan: ban, icon: icon)
  }

  func testBamTatDinhVaChuanHoa() {
    let a = DanhSachApp.chuan([app("b"), app("a"), app("c")])
    let b = DanhSachApp.chuan([app("c"), app("a"), app("b"), app("a", ban: "9")])                 // trùng khoa ⇒ giữ mục đầu
    XCTAssertEqual(a.bam, b.bam, "thứ tự quét không đổi bam")
    XCTAssertEqual(a.ds.map(\.khoa), ["a", "b", "c"])
    XCTAssertEqual(a.bam.count, 64)
    XCTAssertNotEqual(DanhSachApp.chuan([app("a", ban: "2"), app("b"), app("c")]).bam, a.bam, "đổi phiên bản ⇒ đổi bam")
    XCTAssertNotEqual(DanhSachApp.chuan([app("a", icon: "QUJD"), app("b"), app("c")]).bam, a.bam, "đổi icon ⇒ đổi bam")
    var x = app("x"), y = app("x"); x.ten = "a|b"; x.nguon = "c"; y.ten = "a"; y.nguon = "b|c"
    XCTAssertNotEqual(DanhSachApp.chuan([x]).bam, DanhSachApp.chuan([y]).bam, "dấu | trong chữ không làm trùng băm")
    // cắt chữ, bỏ icon to, trần 1500
    var dai = app("d"); dai.ten = String(repeating: "x", count: 500)
    let c = DanhSachApp.chuan([dai, app("e", icon: String(repeating: "A", count: 64 * 1024 + 4))])
    XCTAssertEqual(c.ds[0].ten.count, 300)
    XCTAssertNil(c.ds[1].icon)
    XCTAssertEqual(DanhSachApp.chuan((0..<1600).map { app(String(format: "k%04d", $0)) }).ds.count, 1500)
  }

  func testIconTheoLoVaGopHoaThuong() throws {
    let to = String(repeating: "A", count: 10_000)
    let ds = (0..<300).map { app("k\(1000 + $0)", icon: to) }
    // gửi đủ: không byte icon, vẫn iconBam
    let du = try ThanGuiApp.du(bam: "b", ds: ds).json()["ds"] as? [[String: Any]]
    XCTAssertTrue(du?.allSatisfy { $0["icon"] == nil && $0["iconBam"] as? String != nil } ?? false)
    // lô bù icon ≤ 1,5 MB, chỉ khoa máy chủ thiếu
    let lo = DanhSachApp.loIcon(ds, thieu: Set(ds.map(\.khoa)))
    XCTAssertEqual(lo.count, 150)
    XCTAssertEqual(DanhSachApp.loIcon(ds, thieu: ["k1005"]).map(\.khoa), ["k1005"])
    XCTAssertTrue(DanhSachApp.loIcon([app("x")], thieu: ["x"]).isEmpty, "không icon cục bộ ⇒ không vào lô")
    // phần đổi: kèm byte icon chỉ khi app mới / icon đổi
    let a = app("a", icon: "QUJD"), b = app("b", icon: "QUJD")
    let them = DanhSachApp.themKemIcon([a, b], iconTruoc: ["a": a.iconBam!, "b": "khac"])
    XCTAssertNil(them[0].icon); XCTAssertEqual(them[0].iconBam, a.iconBam)
    XCTAssertEqual(them[1].icon, "QUJD")
    XCTAssertEqual(DanhSachApp.chuan([app("com.Foo"), app("com.foo")]).ds.map(\.khoa), ["com.Foo"])
  }

  func testTrichIconThat() throws {
    // .icns tạo bằng iconutil trong gói giả
    let goi = tam + "/Icns.app"
    try taoApp(goi, plist: ["CFBundleIdentifier": "com.icns", "CFBundleIconFile": "AppIcon"])
    let set = tam + "/AppIcon.iconset"
    try FileManager.default.createDirectory(atPath: set, withIntermediateDirectories: true)
    for c in [16, 32, 128, 256] { try pngMau(c).write(to: URL(fileURLWithPath: set + "/icon_\(c)x\(c).png")) }
    let p = Process(); p.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
    p.arguments = ["-c", "icns", set, "-o", goi + "/Contents/Resources/AppIcon.icns"]
    try p.run(); p.waitUntilExit()
    XCTAssertEqual(p.terminationStatus, 0)
    let png = try XCTUnwrap(QuetAppMac.icon(goi, plist: ["CFBundleIconFile": "AppIcon"]).flatMap { Data(base64Encoded: $0) })
    let src = try XCTUnwrap(CGImageSourceCreateWithData(png as CFData, nil))
    XCTAssertEqual((CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any])?[kCGImagePropertyPixelWidth] as? Int, 96)
    // app hệ thống thật (Calculator: .icns + Assets.car) và đường NSWorkspace
    let calc = "/System/Applications/Calculator.app"
    if FileManager.default.fileExists(atPath: calc) {
      let plist = NSDictionary(contentsOfFile: calc + "/Contents/Info.plist") as? [String: Any] ?? [:]
      XCTAssertNotNil(QuetAppMac.icon(calc, plist: plist))
      let ws = try XCTUnwrap(QuetAppMac.iconWorkspace(calc).flatMap { Data(base64Encoded: $0) })
      XCTAssertLessThanOrEqual(ws.base64EncodedString().utf8.count, DanhSachApp.toiDaIconBase64)
    }
    // tên icon trỏ ra ngoài gói ⇒ không đọc
    try pngMau(64).write(to: URL(fileURLWithPath: tam + "/bimat.png"))
    XCTAssertNil(QuetAppMac.icon(goi, plist: ["CFBundleIconFile": "../../../bimat.png"]))
    try FileManager.default.createSymbolicLink(atPath: goi + "/Contents/Resources/lienket.png", withDestinationPath: tam + "/bimat.png")
    XCTAssertNil(QuetAppMac.icon(goi, plist: ["CFBundleIconFile": "lienket.png"]), "liên kết ra ngoài gói")
    // gói không có tệp icon ⇒ docApp vẫn có icon (NSWorkspace)
    try taoApp(tam + "/KhongIcon.app", plist: ["CFBundleIdentifier": "com.khong.icon"])
    let a = try XCTUnwrap(QuetAppMac(layChuKy: false).docApp(tam + "/KhongIcon.app", nguon: "applications"))
    XCTAssertNotNil(a.icon); XCTAssertNotNil(a.iconBam)
  }

  func testBuIconMayChuThieu() async throws {
    let api = MayChuApp(), fake = HeThongGia(), dongHo = DongHoGia()
    let nguon = Khoa(wrappedValue: [app("a", icon: "QUJD"), app("b", icon: "REVG"), app("c")])
    let (b, kho) = try boMay(api, nguon, fake: fake, dongHo: dongHo)
    let ban = DanhSachApp.chuan(nguon.wrappedValue)
    api.policyJson = #"{"danhSachApp":{"bam":null,"yeuCau":null},"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    api.thieuIcon = [["a", "b", "c"], []]
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(api.lanGui.count, 2)
    XCTAssertTrue(api.lanGui[0].laDu)
    XCTAssertEqual(api.lanGui[1], .doi(bamTruoc: ban.bam, bam: ban.bam, them: [ban.ds[0], ban.ds[1]], bo: []), "bù icon a, b (c không có icon)")
    XCTAssertEqual(SoAppDaGui.doc(SoAppDaGui.duongDan(canh: kho.duongDan))?.thieuIcon, [])
    // máy chủ đã đủ ⇒ lần sau không gửi gì
    api.policyJson = #"{"danhSachApp":{"bam":"\#(ban.bam)","yeuCau":null},"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(api.lanGui.count, 2)
  }

  func testDiff() {
    let truoc = DanhSachApp.chuan([app("a"), app("b"), app("c")])
    let sau = DanhSachApp.chuan([app("a"), app("b", ban: "2"), app("d")])
    let d = DanhSachApp.diff(truoc: truoc.bamTung, sau: sau)
    XCTAssertEqual(d.them.map(\.khoa), ["b", "d"])
    XCTAssertEqual(d.bo, ["c"])
    XCTAssertTrue(DanhSachApp.diff(truoc: sau.bamTung, sau: sau).them.isEmpty)
  }

  func testThanGuiJson() throws {
    let o = try ThanGuiApp.doi(bamTruoc: "x", bam: "y", them: [app("a")], bo: ["z"]).json()
    XCTAssertEqual(o["du"] as? Bool, false); XCTAssertEqual(o["bamTruoc"] as? String, "x"); XCTAssertEqual(o["bo"] as? [String], ["z"])
    let a = (o["them"] as? [[String: Any]])?.first
    XCTAssertEqual(a?["khoa"] as? String, "a"); XCTAssertEqual(a?["phienBan"] as? String, "1")
    XCTAssertNil(a?["teamId"], "trường nil bỏ khỏi JSON")
    let du = try ThanGuiApp.du(bam: "y", ds: [app("a")]).json()
    XCTAssertEqual(du["du"] as? Bool, true); XCTAssertEqual((du["ds"] as? [Any])?.count, 1)
  }

  // MARK: quyết định gửi / quét

  func testQuyetDinh() {
    typealias T = TinHieuDanhSachApp
    let q = { (bamDaGui: String?, co: Bool, t: T?, y: String?) in DanhSachApp.quyetDinh(bamMoi: "M", bamDaGui: bamDaGui, coBanTruoc: co, tinHieu: t, yeuCauDaXuLy: y) }
    XCTAssertEqual(q(nil, false, nil, nil), .du, "chưa gửi bao giờ")
    XCTAssertEqual(q("M", true, nil, nil), .khong, "máy chủ cũ, không đổi")
    XCTAssertEqual(q("C", true, nil, nil), .doi)
    XCTAssertEqual(q("C", false, nil, nil), .du, "mất sổ băm từng app ⇒ đủ")
    XCTAssertEqual(q("C", true, T(bam: nil, yeuCau: nil), nil), .du, "máy chủ chưa có")
    XCTAssertEqual(q("C", true, T(bam: "M", yeuCau: nil), nil), .khong, "máy chủ đã có đúng bản")
    XCTAssertEqual(q("C", true, T(bam: "C", yeuCau: nil), nil), .doi)
    XCTAssertEqual(q("C", true, T(bam: "X", yeuCau: nil), nil), .du, "máy chủ giữ bản khác ⇒ đủ")
    XCTAssertEqual(q("M", true, T(bam: "M", yeuCau: "r1"), nil), .du, "Làm mới ⇒ đủ dù không đổi")
    XCTAssertEqual(q("M", true, T(bam: "M", yeuCau: "r1"), "r1"), .khong, "yeuCau đã xử lý")
  }

  func testCanQuet() {
    typealias T = TinHieuDanhSachApp
    let c = { (gio: Double, quet: Double?, thu: Double?, t: T?, bam: String?, y: String?) in
      DanhSachApp.canQuet(gio: gio, lanQuetCuoi: quet, lanThuCuoi: thu, tinHieu: t, bamDaGui: bam, yeuCauDaXuLy: y) }
    XCTAssertTrue(c(0, nil, nil, nil, nil, nil), "khởi động")
    XCTAssertFalse(c(100, 0, 0, nil, "B", nil))
    XCTAssertTrue(c(1800, 0, 0, nil, "B", nil), "30 phút")
    XCTAssertFalse(c(100, 0, 0, T(bam: "B", yeuCau: nil), "B", nil), "máy chủ đã khớp")
    XCTAssertTrue(c(100, 0, 0, T(bam: "B", yeuCau: "r"), "B", nil), "Làm mới")
    XCTAssertFalse(c(30, 0, 0, T(bam: "B", yeuCau: "r"), "B", nil), "Làm mới nhưng vừa thử < 60 giây")
    XCTAssertTrue(c(100, 0, 0, T(bam: nil, yeuCau: nil), "B", nil), "máy chủ mất dữ liệu")
    XCTAssertFalse(c(100, 0, 0, T(bam: "B", yeuCau: "r"), "B", "r"))
    // gửi hỏng liên tiếp ⇒ giãn: 3 lần lỗi ⇒ chờ 480 giây; trần 30 phút
    XCTAssertFalse(DanhSachApp.canQuet(gio: 400, lanQuetCuoi: 0, lanThuCuoi: 0, tinHieu: T(bam: nil, yeuCau: nil), bamDaGui: nil, yeuCauDaXuLy: nil, soLanLoi: 3))
    XCTAssertTrue(DanhSachApp.canQuet(gio: 500, lanQuetCuoi: 0, lanThuCuoi: 0, tinHieu: T(bam: nil, yeuCau: nil), bamDaGui: nil, yeuCauDaXuLy: nil, soLanLoi: 3))
    XCTAssertTrue(DanhSachApp.canQuet(gio: 1800, lanQuetCuoi: 0, lanThuCuoi: 0, tinHieu: nil, bamDaGui: nil, yeuCauDaXuLy: nil, soLanLoi: 99))
  }

  // MARK: blockedApps

  func testDocBlockedApps() throws {
    let raw = """
    {"mode":"hoc","nextCheckSec":30,"danhSachApp":{"bam":"abc","yeuCau":"r7"},
     "windows":{"mode":"tu_do","cheDo":"chan","blockedApps":[{"muc":" Com.Roblox.RobloxPlayer ","teamId":"Z7S2JB2N2R"},"com.mojang.x",{"khong":1},42,{"muc":"com.mojang.x"}]}}
    """
    let kq = try ApiClient.tachDongBo(Data(raw.utf8))
    XCTAssertEqual(kq.policy.blockedApps.map(\.muc), ["com.roblox.robloxplayer", "com.mojang.x"], "chữ thường, phần tử hỏng bỏ, gộp trùng")
    XCTAssertEqual(kq.policy.blockedApps.first?.teamId, "Z7S2JB2N2R")
    XCTAssertEqual(kq.danhSachApp, TinHieuDanhSachApp(bam: "abc", yeuCau: "r7"))
    // nhớ qua cấu hình (chạy offline)
    let lai = try NgayGio.decoder.decode(Policy.self, from: NgayGio.encoder.encode(kq.policy))
    XCTAssertEqual(lai.blockedApps, kq.policy.blockedApps)
    // máy chủ cũ: không có gì
    let cu = try ApiClient.tachDongBo(Data(#"{"windows":{"mode":"hoc"}}"#.utf8))
    XCTAssertNil(cu.danhSachApp); XCTAssertTrue(cu.policy.blockedApps.isEmpty)
    XCTAssertEqual(try ApiClient.tachDongBo(Data(#"{"danhSachApp":{"bam":null,"yeuCau":null},"windows":{"mode":"hoc"}}"#.utf8)).danhSachApp,
                   TinHieuDanhSachApp(bam: nil, yeuCau: nil))
  }

  func testQuyetDinhDongBiChan() {
    let r = TienTrinh(pid: 10, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.roblox.RobloxPlayer")
    let helper = TienTrinh(pid: 11, uid: 501, duongDan: "/Applications/Roblox.app/Contents/Helpers/x", bundleId: "com.roblox.RobloxPlayer")
    let khac = TienTrinh(pid: 12, uid: 502, duongDan: "/Applications/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.roblox.RobloxPlayer")
    let finder = TienTrinh(pid: 13, uid: 501, duongDan: "/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder", bundleId: "com.apple.finder")
    let ai = TienTrinh(pid: 14, uid: 501, duongDan: "/Applications/AiiGrow.app/Contents/MacOS/AiiGrowTray", bundleId: "vn.aiilab.aiigrow.tray")
    let pages = TienTrinh(pid: 15, uid: 501, duongDan: "/Applications/Pages.app/Contents/MacOS/Pages", bundleId: "com.apple.iWork.Pages")
    let ds = [r, helper, khac, finder, ai, pages]
    let chan = ["com.roblox.robloxplayer", "com.apple.finder", "vn.aiilab.aiigrow.tray", "com.apple.iwork.pages"].map { AppBiChan(muc: $0) }
    XCTAssertEqual(DanhSachApp.canDongBiChan(ds, uidCon: 501, biChan: chan).map(\.0.pid), [10], "chỉ app chính của Con; không bao giờ app hệ thống/AiiGrow")
    XCTAssertTrue(DanhSachApp.canDongBiChan(ds, uidCon: 501, biChan: []).isEmpty)
  }

  // MARK: BoMay

  final class MayChuApp: MayChuApi, @unchecked Sendable {
    @Khoa var policyJson = #"{"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    @Khoa var lanGui: [ThanGuiApp] = []
    /// Trả lời lần lượt cho mỗi lần guiUngDung (hết thì 200).
    @Khoa var traLoi: [LoiApi?] = []
    /// thieuIcon trả lần lượt cho mỗi lần gửi thành công (hết thì nil).
    @Khoa var thieuIcon: [[String]] = []
    func ghep(ma: String, tenMay: String) async throws -> KetQuaGhep { throw LoiApi(chu: "x") }
    func dongBo(trangThai: TrangThaiAgent, dung: [MucDung], luc: Date) async throws -> KetQuaDongBo { try ApiClient.tachDongBo(Data(policyJson.utf8)) }
    func taoYeuCau(loai: String, phut: Int?, giaTri: String?, lyDo: String) async throws -> KetQuaYeuCau { KetQuaYeuCau(id: "1", trangThai: "cho") }
    func trangThaiYeuCau(id: String) async throws -> String { "cho" }
    func guiUngDung(_ than: ThanGuiApp) async throws -> KetQuaGuiApp {
      lanGui.append(than)
      if !traLoi.isEmpty, let e = traLoi.removeFirst() { throw e }
      return KetQuaGuiApp(bam: than.bam, soApp: nil, thieuIcon: thieuIcon.isEmpty ? nil : thieuIcon.removeFirst())
    }
  }

  struct NguonGia: NguonApp, @unchecked Sendable {
    let ds: Khoa<[AppMay]>
    func quet(taiKhoanCon: String?) -> [AppMay] { ds.wrappedValue }
  }

  private func boMay(_ api: MayChuApp, _ nguon: Khoa<[AppMay]>, fake: HeThongGia, dongHo: DongHoGia) throws -> (BoMay, ConfigStore) {
    let kho = ConfigStore(duongDan: tam + "/config.json")
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: tam + "/hosts", thuMucChinhSach: tam + "/Managed", tienCanhDongBo: true),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu }, nguonApp: NguonGia(ds: nguon))
    return (b, kho)
  }

  private func dongBoVaCho(_ b: BoMay, _ dongHo: DongHoGia) async {
    dongHo.tien(700)                         // quá mọi nextCheckSec
    await b.vongDongBo()
    await b.choDanhSachApp()
  }

  func testLuongGuiDanhSachApp() async throws {
    let api = MayChuApp(), fake = HeThongGia(), dongHo = DongHoGia()
    let nguon = Khoa(wrappedValue: [app("a"), app("b")])
    let (b, kho) = try boMay(api, nguon, fake: fake, dongHo: dongHo)
    let ban1 = DanhSachApp.chuan(nguon.wrappedValue)

    // 1. khởi động, máy chủ chưa có ⇒ đủ
    api.policyJson = #"{"danhSachApp":{"bam":null,"yeuCau":null},"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(api.lanGui, [.du(bam: ban1.bam, ds: ban1.ds)])
    XCTAssertEqual(kho.doc()?.bamAppDaGui, ban1.bam)

    // 2. máy chủ đã giữ đúng bam ⇒ không quét/gửi lại
    api.policyJson = #"{"danhSachApp":{"bam":"\#(ban1.bam)","yeuCau":null},"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(api.lanGui.count, 1)

    // 3. cài thêm app, tới chu kỳ 30 phút ⇒ phần đổi
    nguon.wrappedValue = [app("a"), app("b", ban: "2"), app("c")]
    let ban2 = DanhSachApp.chuan(nguon.wrappedValue)
    dongHo.tien(1800)
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(api.lanGui.last, .doi(bamTruoc: ban1.bam, bam: ban2.bam, them: [ban2.ds[1], ban2.ds[2]], bo: []))
    XCTAssertEqual(kho.doc()?.bamAppDaGui, ban2.bam)

    // 4. Ba Mẹ bấm «Làm mới» ⇒ đủ ngay, lưu yeuCau; lần sau cùng yeuCau thì thôi
    api.policyJson = #"{"danhSachApp":{"bam":"\#(ban2.bam)","yeuCau":"r1"},"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(api.lanGui.last, .du(bam: ban2.bam, ds: ban2.ds))
    XCTAssertEqual(kho.doc()?.yeuCauAppDaXuLy, "r1")
    let n = api.lanGui.count
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(api.lanGui.count, n)

    // 5. gỡ một app (máy chủ cũ, vắng tín hiệu) ⇒ phần đổi bị 409 ⇒ gửi đủ ngay
    api.policyJson = #"{"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    nguon.wrappedValue = [app("a"), app("b", ban: "2")]
    let ban3 = DanhSachApp.chuan(nguon.wrappedValue)
    api.traLoi = [LoiApi(maHttp: 409, ma: "can_gui_du", chu: "can_gui_du")]
    dongHo.tien(1800)
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(Array(api.lanGui.suffix(2)), [.doi(bamTruoc: ban2.bam, bam: ban3.bam, them: [], bo: ["c"]), .du(bam: ban3.bam, ds: ban3.ds)])
    XCTAssertEqual(kho.doc()?.bamAppDaGui, ban3.bam)

    // 6. 404 ⇒ thôi gửi tới lần khởi động sau
    nguon.wrappedValue = [app("z")]
    api.traLoi = [LoiApi(maHttp: 404, ma: nil, chu: "404")]
    dongHo.tien(1800)
    await dongBoVaCho(b, dongHo)
    let sau404 = api.lanGui.count
    dongHo.tien(1800)
    await dongBoVaCho(b, dongHo)
    XCTAssertEqual(api.lanGui.count, sau404)
    XCTAssertEqual(kho.doc()?.bamAppDaGui, ban3.bam, "gửi hỏng không ghi bam")
  }

  func testGoTuXaQuenDanhSachApp() async throws {
    let api = MayChuApp(), fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try boMay(api, Khoa(wrappedValue: [app("a")]), fake: fake, dongHo: dongHo)
    await dongBoVaCho(b, dongHo)
    XCTAssertNotNil(kho.doc()?.bamAppDaGui)
    XCTAssertTrue(FileManager.default.fileExists(atPath: SoAppDaGui.duongDan(canh: kho.duongDan)))
    api.policyJson = #"{"lenh":[{"id":"g1","loai":"go"}],"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    await dongBoVaCho(b, dongHo)
    XCTAssertNil(kho.doc()?.bamAppDaGui, "ghép lại = máy mới ⇒ gửi đủ")
    XCTAssertFalse(FileManager.default.fileExists(atPath: SoAppDaGui.duongDan(canh: kho.duongDan)))
  }

  func testLoiMangThuLaiSau() async throws {
    let api = MayChuApp(), fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try boMay(api, Khoa(wrappedValue: [app("a")]), fake: fake, dongHo: dongHo)
    api.policyJson = #"{"danhSachApp":{"bam":null,"yeuCau":null},"windows":{"mode":"tu_do","cheDo":"chan"}}"#
    api.traLoi = [LoiApi(chu: "mất mạng")]
    await dongBoVaCho(b, dongHo)
    XCTAssertNil(kho.doc()?.bamAppDaGui)
    await dongBoVaCho(b, dongHo)                 // > 60 giây sau, máy chủ vẫn chưa có ⇒ thử lại
    XCTAssertEqual(api.lanGui.count, 2)
    XCTAssertNotNil(kho.doc()?.bamAppDaGui)
  }

  func testDongAppBiChanMoiMode() async throws {
    let api = MayChuApp(), fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try boMay(api, Khoa(wrappedValue: []), fake: fake, dongHo: dongHo)
    let roblox = TienTrinh(pid: 50, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.roblox.RobloxPlayer")
    let word = TienTrinh(pid: 51, uid: 501, duongDan: "/Applications/Notes2.app/Contents/MacOS/N", bundleId: "com.x.notes2")
    fake.tienTrinhTheoUid = [501: [roblox, word]]
    fake.conSongPid = [50, 51]

    // tu_do + chặn thật ⇒ đóng Roblox, không đụng app khác
    api.policyJson = #"{"windows":{"mode":"tu_do","cheDo":"chan","blockedApps":[{"muc":"com.roblox.robloxplayer","teamId":"Z7S2JB2N2R"}]}}"#
    await b.vongDongBo()
    _ = await b.apChinhSach()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.0), [50])
    XCTAssertEqual(fake.tinHieuDaGui.first?.1, SIGTERM)
    XCTAssertTrue(fake.log.contains { $0.contains("app Ba Mẹ chặn: com.roblox.robloxplayer teamId Z7S2JB2N2R") }, "\(fake.log)")
    dongHo.tien(6); _ = await b.apChinhSach()
    XCTAssertEqual(fake.tinHieuDaGui.last?.1, SIGKILL, "vẫn sống ⇒ SIGKILL")

    // giám sát ⇒ chỉ ghi «sẽ đóng», một lần
    fake.tinHieuDaGui = []; fake.log = []
    api.policyJson = #"{"windows":{"mode":"tu_do","cheDo":"giam-sat","blockedApps":["com.roblox.robloxplayer"]}}"#
    dongHo.tien(700); await b.vongDongBo()
    _ = await b.apChinhSach(); dongHo.tien(5); _ = await b.apChinhSach()
    XCTAssertTrue(fake.tinHieuDaGui.isEmpty)
    XCTAssertEqual(fake.log.filter { $0.contains("[giám sát] sẽ đóng app Ba Mẹ chặn: com.roblox.robloxplayer") }.count, 1, "\(fake.log)")

    // hoc + chặn: Roblox chỉ bị đóng một lần (không trùng pid giữa hai danh sách)
    fake.log = []
    api.policyJson = #"{"windows":{"mode":"hoc","cheDo":"chan","allowedApps":["com.x.notes2"],"blockedApps":["com.roblox.robloxplayer"]}}"#
    dongHo.tien(700); await b.vongDongBo()
    _ = await b.apChinhSach()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.0), [50])
  }
}
