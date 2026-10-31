// Hồi quy 0.1.7 — các lớp lỗi agent Windows đã dính, vá trước cho Mac (PR «mac-va-bug-win»).
import XCTest
@testable import AiiGrowCore

final class VaBugWinTests: XCTestCase {
  private func thuMucTam() throws -> String {
    let d = NSTemporaryDirectory() + "aiigrow-vb-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: d, withIntermediateDirectories: true)
    return d
  }
  private var goiDir: String { BaoMatTests.goiDir }

  // MARK: máy mồ côi tự thôi chặn (agent-win MoCoi, AnToan.cs)

  func testMoCoiLuatThuan() {
    let t0 = Date(timeIntervalSince1970: 1_760_000_000)
    var c = CauHinhMay()
    XCTAssertFalse(MoCoi.la(c, now: t0), "máy mới chưa đồng bộ lần nào: không mồ côi")
    let h = { (g: Double) in t0.addingTimeInterval(g * 3600) }
    MoCoi.ghiTuChoi(&c, now: t0)
    MoCoi.ghiTuChoi(&c, now: h(1))
    XCTAssertEqual(c.tuChoiTu, t0, "từ chối liên tục giữ mốc ĐẦU")
    for g in 2...5 { MoCoi.ghiTuChoi(&c, now: h(Double(g))) }       // máy chủ từ chối mỗi giờ
    XCTAssertFalse(MoCoi.la(c, now: h(7)), "các lần từ chối mới trải 5 giờ")
    MoCoi.ghiTuChoi(&c, now: h(6))
    XCTAssertTrue(MoCoi.la(c, now: h(6)), "từ chối token trải đủ 6 giờ ⇒ mồ côi")
    XCTAssertTrue(MoCoi.la(c, now: h(30)), "đã mồ côi thì giữ dù sau đó mất mạng / ngủ")
    MoCoi.ghiTuChoi(&c, now: h(30))
    XCTAssertEqual(c.tuChoiTu, t0, "đã mồ côi: lần từ chối sau khoảng trống không đếm lại")
    var le = CauHinhMay(); MoCoi.ghiTuChoi(&le, now: t0)
    XCTAssertFalse(MoCoi.la(le, now: h(6)), "một lần 401 lẻ rồi mất mạng 6 giờ: chưa phải từ chối liên tục")
    MoCoi.ghiTuChoi(&le, now: h(9))
    XCTAssertTrue(MoCoi.la(le, now: h(9)), "máy hay ngủ: các lần từ chối rời rạc vẫn gom đủ 6 giờ (chỉ đồng bộ được mới xoá mốc)")
    XCTAssertTrue(MoCoi.la(le, now: h(9).addingTimeInterval(-5)), "NTP lùi vài giây không làm mất mồ côi")
    var lui = CauHinhMay(); MoCoi.ghiTuChoi(&lui, now: t0); MoCoi.ghiTuChoi(&lui, now: t0.addingTimeInterval(-60))
    XCTAssertEqual(lui.tuChoiTu, t0.addingTimeInterval(-60), "đồng hồ lùi ⇒ đếm lại từ bây giờ")
    MoCoi.ghiThanhCong(&c, now: t0)
    XCTAssertNil(c.tuChoiTu); XCTAssertFalse(MoCoi.la(c, now: h(40)))

    // mất liên lạc: cần CẢ 14 ngày đồng hồ thật LẪN 72 giờ máy chạy
    let xa = t0.addingTimeInterval(15 * 86_400)
    XCTAssertFalse(MoCoi.la(c, now: xa), "chỉnh lịch tới trước, máy không chạy ⇒ chưa mồ côi")
    MoCoi.congChay(&c, giay: 10_000)
    XCTAssertEqual(c.matLienLacChayGiay, MoCoi.tranMoiVongGiay, "ngủ/treo giữa hai vòng bị cắt ở trần")
    c.matLienLacChayGiay = MoCoi.nguongChayGiay
    XCTAssertTrue(MoCoi.la(c, now: xa))
    XCTAssertFalse(MoCoi.la(c, now: t0.addingTimeInterval(13 * 86_400)), "chạy đủ 72 giờ nhưng chưa đủ 14 ngày")
  }

  func testMoCoiCuDuocLuuVaDocLai() throws {
    let tm = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: tm) }
    let kho = ConfigStore(duongDan: tm + "/config.json")
    let t = Date(timeIntervalSince1970: 1_760_000_000)
    try kho.sua { $0.token = "t"; $0.tuChoiTu = t; $0.matLienLacChayGiay = 123 }
    XCTAssertEqual(kho.doc()?.tuChoiTu, t)
    XCTAssertEqual(kho.doc()?.matLienLacChayGiay, 123)
  }

  /// Máy bị xoá khỏi gia đình lúc offline (lệnh gỡ không tới), Policy cuối là KHOÁ + lọc web: trước 0.1.7 Con bị đăng xuất mãi.
  func testTokenBiTuChoi6GioThiThoiChanRoiChanLaiKhiDongBoDuoc() async throws {
    let tm = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: tm) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let kho = ConfigStore(duongDan: tm + "/config.json")
    let web = ChinhSachWeb(chan: ["youtube.com"])
    let pol = policyMau(mode: CheDo.khoa.rawValue, web: web, now: dongHo.thuc)
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be"; $0.policyCuoi = pol; $0.policyLuc = dongHo.thuc }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    fake.tienTrinhTheoUid = [501: [TienTrinh(pid: 77, uid: 501, duongDan: "/Applications/Game.app/Contents/MacOS/Game", bundleId: "com.game")]]
    let api = MayChuGia()
    api.dongBoLoi = LoiApi(maHttp: 401, ma: "token_sai", chu: "token sai")
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", demNguocKhoaGiay: 0, tienCanhDongBo: true, tuCapNhat: false),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    let plist = ChinhSachTrinhDuyet.duongDan(ChinhSachTrinhDuyet.tatCa[0], taiKhoan: "be", thuMucGoc: tm + "/Managed")

    _ = await b.motVong()
    XCTAssertNotNil(fake.tep[plist], "chưa đủ 6 giờ: vẫn lọc web")
    XCTAssertTrue(String(decoding: fake.tep[tm + "/hosts"] ?? Data(), as: UTF8.self).contains("youtube.com"))
    XCTAssertEqual(kho.doc()?.tuChoiTu, dongHo.thuc, "mốc từ chối lưu đĩa (khởi động lại vẫn tính tiếp)")
    dongHo.tien(5); _ = await b.apChinhSach()
    XCTAssertFalse(fake.daDongPhien.isEmpty, "còn khoá ⇒ đóng phiên Con")

    for _ in 0..<6 { dongHo.tien(3600); _ = await b.motVong() }      // máy chủ vẫn từ chối mỗi lần đồng bộ suốt 6 giờ
    fake.daDongPhien = []; fake.tinHieuDaGui = []
    dongHo.tien(60); _ = await b.motVong()
    dongHo.tien(5); _ = await b.apChinhSach()
    XCTAssertNil(fake.tep[plist], "mồ côi: gỡ plist lọc web")
    XCTAssertFalse(String(decoding: fake.tep[tm + "/hosts"] ?? Data(), as: UTF8.self).contains("youtube.com"), "mồ côi: gỡ khối hosts")
    XCTAssertTrue(fake.daDongPhien.isEmpty, "mồ côi: không khoá")
    XCTAssertTrue(fake.tinHieuDaGui.isEmpty, "mồ côi: không đóng app")
    XCTAssertNotNil(kho.doc()?.policyCuoi, "Policy cuối vẫn giữ")
    XCTAssertEqual(api.lanDongBo.last?.0.moCoi, true, "báo máy chủ moCoi")
    let tt = await b.xuLyIPC(.trangThai, uidGoi: 501)
    if case let .trangThai(s) = tt { XCTAssertNil(s.demNguocGiay); XCTAssertNotEqual(s.cheDo, .khoa) } else { XCTFail("\(tt)") }

    // ghép lại / máy chủ nhận lại token ⇒ hết mồ côi, chặn lại ngay vòng sau
    api.dongBoLoi = nil
    api.dongBoTraVe = .tu(pol)
    dongHo.tien(120); _ = await b.motVong()
    XCTAssertNil(kho.doc()?.tuChoiTu)
    XCTAssertNotNil(fake.tep[plist], "hết mồ côi: lọc web lại")
  }

  /// Máy bị xoá khỏi gia đình rồi Ba Mẹ thêm lại: máy mồ côi do token bị từ chối phải ghép lại được bằng mã 6 số, không cần gỡ + cài lại.
  func testMayMoCoiGhepLaiDuoc() async throws {
    let tm = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: tm) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let kho = ConfigStore(duongDan: tm + "/config.json")
    let pol = policyMau(mode: CheDo.khoa.rawValue, now: dongHo.thuc)
    try kho.sua { $0.token = "cu"; $0.uidCon = 501; $0.taiKhoanCon = "be"; $0.policyCuoi = pol; $0.policyLuc = dongHo.thuc }
    fake.uidTheoTen = ["be": 501, "ba": 502]; fake.admin = ["ba"]
    let api = MayChuGia(); api.dongBoLoi = LoiApi(maHttp: 401, ma: "token_sai", chu: "token sai")
    let b = BoMay(api: api, heThong: fake, kho: kho, tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tuCapNhat: false),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    _ = await b.motVong()
    if case .loi(let ma, _) = await b.xuLyIPC(.ghep(ma: "123456", taiKhoanCon: "be"), uidGoi: 502) { XCTAssertEqual(ma, "da_ghep", "chưa mồ côi: không ghép đè") }
    else { XCTFail("phải từ chối ghép") }
    for _ in 0..<6 { dongHo.tien(3600); _ = await b.motVong() }
    if case let .trangThai(t) = await b.xuLyIPC(.trangThai, uidGoi: 502) { XCTAssertFalse(t.daGhep, "tray Ba Mẹ thấy «Ghép máy»") } else { XCTFail() }
    let kq = await b.xuLyIPC(.ghep(ma: "123456", taiKhoanCon: "be"), uidGoi: 502)
    guard case .ok = kq else { return XCTFail("ghép lại máy mồ côi: \(kq)") }
    XCTAssertEqual(kho.doc()?.token, "tok1")
    XCTAssertNil(kho.doc()?.tuChoiTu); XCTAssertNil(kho.doc()?.policyCuoi, "Policy của gia đình cũ bỏ")
  }

  func testMatMangKhongPhaiTokenSaiThi6GioVanChan() async throws {
    let tm = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: tm) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let kho = ConfigStore(duongDan: tm + "/config.json")
    let pol = policyMau(mode: CheDo.hoc.rawValue, web: ChinhSachWeb(chan: ["youtube.com"]), now: dongHo.thuc)
    try kho.sua { $0.token = "t"; $0.uidCon = 501; $0.taiKhoanCon = "be"; $0.policyCuoi = pol; $0.policyLuc = dongHo.thuc; $0.lienLacCuoi = dongHo.thuc }
    fake.uidTheoTen = ["be": 501]; fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let api = MayChuGia(); api.dongBoLoi = LoiApi(chu: "mất mạng")
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tienCanhDongBo: true, tuCapNhat: false),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    let plist = ChinhSachTrinhDuyet.duongDan(ChinhSachTrinhDuyet.tatCa[0], taiKhoan: "be", thuMucGoc: tm + "/Managed")
    _ = await b.motVong()
    for _ in 0..<12 { dongHo.tien(3600); _ = await b.motVong() }     // 12 giờ mất mạng (đồng hồ đơn điệu nhảy ⇒ mỗi vòng chỉ cộng ≤ 30 giây)
    XCTAssertNotNil(fake.tep[plist], "lỗi mạng không tính là bị từ chối")
    XCTAssertNil(kho.doc()?.tuChoiTu)
    XCTAssertGreaterThan(kho.doc()?.matLienLacChayGiay ?? 0, 0, "thời gian chạy khi mất liên lạc được cộng và lưu")
  }

  // MARK: gỡ cài trả máy về như cũ (agent-win PR #138)

  func testGoCaiGoDuKhoaCuaTaVaHoSoDns() throws {
    let s = try String(contentsOfFile: goiDir + "/go-cai.sh", encoding: .utf8)
    guard let dong = s.split(separator: "\n").first(where: { $0.hasPrefix("KHOA_TA=") }) else { return XCTFail("thiếu KHOA_TA") }
    let khoa = Set(dong.dropFirst("KHOA_TA=".count).trimmingCharacters(in: CharacterSet(charactersIn: "\"")).split(separator: " ").map(String.init))
    for t in ChinhSachTrinhDuyet.tatCa {
      for k in ChinhSachTrinhDuyet.khoaCuaTa(t) where k != ChinhSachTrinhDuyet.khoaGoc {
        XCTAssertTrue(khoa.contains(k), "go-cai.sh không gỡ khoá \(k) của \(t.ten)")
      }
    }
    XCTAssertTrue(s.contains("/usr/bin/profiles remove -identifier"), "gỡ hồ sơ DNS gia đình")
    XCTAssertTrue(s.contains("vn\\.aiilab\\.aiigrow\\.dns\\."), "chỉ hồ sơ mang tiền tố AiiGrow")
    // chạy đúng chương trình awk của go-cai.sh trên mẫu `profiles list -all` có cả hồ sơ mức máy lẫn mức người dùng
    guard let r0 = s.range(of: "/usr/bin/awk '/profileIdentifier"), let k = s[r0.upperBound...].range(of: "'") else { return XCTFail("thiếu awk") }
    let chuongTrinh = "/profileIdentifier" + String(s[r0.upperBound..<k.lowerBound])
    let ra = "_computerlevel[1] attribute: profileIdentifier: vn.aiilab.aiigrow.dns.Ab_9-x\nbe[1] attribute: profileIdentifier: vn.aiilab.aiigrow.dns.CON\n_computerlevel[2] attribute: profileIdentifier: com.other.dns\n"
    let p = Process(), o = Pipe(), i = Pipe()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/awk"); p.arguments = [chuongTrinh]
    p.standardInput = i; p.standardOutput = o
    try p.run(); i.fileHandleForWriting.write(Data(ra.utf8)); i.fileHandleForWriting.closeFile(); p.waitUntilExit()
    XCTAssertEqual(String(decoding: o.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self),
                   "_computerlevel vn.aiilab.aiigrow.dns.Ab_9-x\nbe vn.aiilab.aiigrow.dns.CON\n")
    XCTAssertTrue(s.contains("-user \"$ai\" -forced"), "hồ sơ mức người dùng gỡ kèm -user")
  }

  // MARK: cập nhật xong mà daemon không nạp ⇒ nạp lại (agent-win PR #54)

  func testJobCaiNapLaiKhiInstallerXongMaDaemonChuaNap() throws {
    let fm = FileManager.default
    let g = NSTemporaryDirectory() + "job-vb-\(UUID().uuidString)"
    try fm.createDirectory(atPath: g, withIntermediateDirectories: true)
    defer { try? fm.removeItem(atPath: g) }
    let nk = g + "/nk.log"
    func gia(_ ten: String, _ them: String = "") throws -> String {
      let f = g + "/" + ten
      try "#!/bin/sh\necho \"\(ten) $*\" >> '\(nk)'\n\(them)exit 0\n".write(toFile: f, atomically: true, encoding: .utf8)
      chmod(f, 0o755); return f
    }
    for chet in [true, false] {
      try? fm.removeItem(atPath: nk)
      let lenh = HeThongMac.lenhJobCai
        .replacingOccurrences(of: "/bin/launchctl", with: try gia("launchctl", chet ? "[ \"$1\" = print ] && exit 113\n" : ""))
        .replacingOccurrences(of: "/usr/sbin/installer", with: try gia("installer"))
        .replacingOccurrences(of: "/usr/sbin/pkgutil", with: try gia("pkgutil"))
      let goi = g + "/a.pkg", dau = g + "/pid", daemon = g + "/daemon.plist", tray = g + "/tray.plist", pg = g + "/pg.sh"
      for f in [goi, daemon, tray] { try "x".write(toFile: f, atomically: true, encoding: .utf8) }
      try "#!/bin/sh\necho 501\n".write(toFile: pg, atomically: true, encoding: .utf8)
      let p = Process()
      p.executableURL = URL(fileURLWithPath: "/bin/sh")
      p.arguments = ["-c", lenh, "capnhat", goi, LuatCapNhat.nhanCai, dau, g + "/da-go", daemon, tray, pg]
      p.standardOutput = FileHandle.nullDevice; p.standardError = FileHandle.nullDevice
      try p.run(); p.waitUntilExit()
      let log = (try? String(contentsOfFile: nk, encoding: .utf8)) ?? ""
      XCTAssertTrue(log.contains("launchctl print system/vn.aiilab.aiigrow.daemon"), log)
      XCTAssertEqual(log.contains("launchctl bootstrap system"), chet, "daemon chưa nạp ⇒ nạp lại; đã nạp ⇒ không đụng: \(log)")
      XCTAssertEqual(p.terminationStatus, 0)
    }
  }

  func testPostinstallThuLaiBootstrapDenKhiDaemonNap() throws {
    let fm = FileManager.default
    let goc = NSTemporaryDirectory() + "pi-vb-\(UUID().uuidString)"
    defer { try? fm.removeItem(atPath: goc) }
    let res = goc + "/Applications/AiiGrow.app/Contents/Resources"
    for d in [res, goc + "/Library/LaunchDaemons", goc + "/Library/LaunchAgents"] { try fm.createDirectory(atPath: d, withIntermediateDirectories: true) }
    for n in ["vn.aiilab.aiigrow.daemon", "vn.aiilab.aiigrow.tray"] { try "x".write(toFile: "\(res)/\(n).plist", atomically: true, encoding: .utf8) }
    let gia = goc + "/launchctl-gia.sh", nk = goc + "/lenh.log", dem = goc + "/dem"
    // bootstrap hỏng 2 lần đầu (launchd chưa dọn xong bản cũ), lần 3 được; print chỉ OK sau khi bootstrap được
    try """
    #!/bin/bash
    echo "$@" >> '\(nk)'
    if [ "$1" = bootstrap ] && [ "$2" = system ]; then n=$(($(cat '\(dem)' 2>/dev/null || echo 0) + 1)); echo $n > '\(dem)'; [ $n -ge 3 ] && touch '\(goc)/da-nap'; [ $n -ge 3 ] && exit 0; exit 5; fi
    if [ "$1" = print ]; then [ -f '\(goc)/da-nap' ] && exit 0; exit 113; fi
    exit 0
    """.write(toFile: gia, atomically: true, encoding: .utf8)
    chmod(gia, 0o755)
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/bash")
    p.arguments = [goiDir + "/scripts/postinstall", "/Users/ba/Downloads/AiiGrow.pkg"]
    p.environment = ["AIIGROW_GOC": goc, "AIIGROW_LAUNCHCTL": gia, "AIIGROW_PKGUTIL": gia, "AIIGROW_NGU": "0", "PATH": "/usr/bin:/bin"]
    p.standardOutput = FileHandle.nullDevice; p.standardError = FileHandle.nullDevice
    try p.run(); p.waitUntilExit()
    let log = (try? String(contentsOfFile: nk, encoding: .utf8)) ?? ""
    XCTAssertEqual(log.components(separatedBy: "bootstrap system").count - 1, 3, "thử lại tới khi daemon nạp được rồi thôi: \(log)")
    XCTAssertEqual(p.terminationStatus, 0)
    // bootstrap hỏng cả 5 lần ⇒ mã 1 (job tự cập nhật của 0.1.6 chỉ nạp lại daemon khi installer ≠ 0)
    try "#!/bin/bash\necho \"$@\" >> '\(nk)'\n[ \"$1\" = bootstrap ] && exit 5\n[ \"$1\" = print ] && exit 113\nexit 0\n".write(toFile: gia, atomically: true, encoding: .utf8)
    let q = Process()
    q.executableURL = URL(fileURLWithPath: "/bin/bash")
    q.arguments = [goiDir + "/scripts/postinstall", "/Users/ba/Downloads/AiiGrow.pkg"]
    q.environment = p.environment
    q.standardOutput = FileHandle.nullDevice; q.standardError = FileHandle.nullDevice
    try q.run(); q.waitUntilExit()
    XCTAssertEqual(q.terminationStatus, 1, "daemon không nạp được ⇒ installer báo hỏng")
    let s = try String(contentsOfFile: goiDir + "/scripts/postinstall", encoding: .utf8)
    XCTAssertTrue(s.contains("unset AIIGROW_GOC AIIGROW_LAUNCHCTL AIIGROW_PKGUTIL AIIGROW_NGU"), "chạy bằng root không nhận biến thử")
  }
}
