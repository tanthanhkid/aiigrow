// Test cho ba lỗi review: playSeconds, giả mạo app tiền cảnh, IPC tuần tự.
import XCTest
@testable import AiiGrowCore

final class BaoMatTests: XCTestCase {

  // MARK: 1. playSeconds

  func testPlaySecondsBoKhoiJson() throws {
    let st = TrangThaiAgent(mode: "hoc", trayAlive: true, childSessionActive: true, offline: false, cheDo: "chan", phienKhac: false)
    XCTAssertNil(st.playSeconds)
    let o = try JSONSerialization.jsonObject(with: NgayGio.encoder.encode(st)) as? [String: Any]
    XCTAssertNotNil(o)
    XCTAssertFalse(o!.keys.contains("playSeconds"), "nil phải bị bỏ hẳn, không gửi 0 hay null")
    XCTAssertEqual(o?["agent"] as? String, "mac")
  }

  // MARK: 2. app tiền cảnh

  func testTachLsappinfo() {
    XCTAssertEqual(TienCanh.tachASN("ASN:0x0-0xeabcaae:\n"), "ASN:0x0-0xeabcaae:")
    XCTAssertNil(TienCanh.tachASN(""))
    XCTAssertEqual(TienCanh.tachBundleId("\"CFBundleIdentifier\"=\"com.apple.finder\"\n"), "com.apple.finder")
    XCTAssertNil(TienCanh.tachBundleId("\"CFBundleIdentifier\"=[ NULL ]"))
    XCTAssertNil(TienCanh.tachBundleId(""))
  }

  func testChonLuonDungKetQuaTuKiem() {
    XCTAssertEqual(TienCanh.chon(thatSu: "com.game"), "com.game", "có kết quả tự kiểm thì luôn dùng, tray sống hay chết")
    XCTAssertEqual(TienCanh.chon(thatSu: nil), DemPhut.khongRo)
    XCTAssertEqual(TienCanh.chon(thatSu: ""), DemPhut.khongRo)
  }

  private func dungBoMay(_ fake: HeThongGia, dongHo: DongHoGia, thuMuc: String, policyJson: String? = nil) throws -> (BoMay, ConfigStore) {
    let kho = ConfigStore(duongDan: thuMuc + "/config.json")
    let pol = try policyJson.map { try PolicyParser.parse($0) }
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be"; $0.policyCuoi = pol; $0.policyLuc = dongHo.thuc }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let api = ApiClient(mayChu: "https://aiigrow.aiilab.vn", token: nil, session: HttpMock.session())
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed", tienCanhDongBo: true),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    return (b, kho)
  }

  private func thuMucTam() throws -> String {
    let d = NSTemporaryDirectory() + "aiigrow-bm-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: d, withIntermediateDirectories: true)
    return d
  }

  func testConKhaiGiaAppTienCanhKhongNeDuoc() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    fake.tienCanhThat = "com.game.nguy-hiem"
    for _ in 0..<6 {
      _ = await b.xuLyIPC(.appTienCanh(bundleId: "com.apple.calculator", ten: "Calculator"), uidGoi: 501)
      dongHo.tien(5)
      _ = await b.apChinhSach()
    }
    let dem = kho.doc()?.demPhut ?? [:]
    XCTAssertTrue(dem.keys.contains { $0.hasSuffix("|com.game.nguy-hiem") }, "tính theo app thật: \(dem)")
    XCTAssertFalse(dem.keys.contains { $0.contains("calculator") }, "lời khai giả bị bỏ qua: \(dem)")
  }

  func testKhongKiemDuocTienCanhThiKhongRo() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    fake.tienCanhThat = nil
    _ = await b.xuLyIPC(.appTienCanh(bundleId: "com.apple.calculator", ten: "C"), uidGoi: 501)
    dongHo.tien(5); _ = await b.apChinhSach()
    let dem = kho.doc()?.demPhut ?? [:]
    XCTAssertTrue(dem.keys.contains { $0.hasSuffix("|" + DemPhut.khongRo) }, "\(dem)")
    XCTAssertFalse(dem.keys.contains { $0.contains("calculator") })
  }

  func testKillTrayKhongDayGioSangKhongRo() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    fake.tienCanhThat = "com.apple.Pages"
    // tray chưa từng ping (như bị kill) — vẫn đếm theo app thật
    for _ in 0..<4 { dongHo.tien(5); _ = await b.apChinhSach() }
    let dem = kho.doc()?.demPhut ?? [:]
    XCTAssertTrue(dem.keys.contains { $0.hasSuffix("|com.apple.pages") }, "\(dem)")
    XCTAssertFalse(dem.keys.contains { $0.hasSuffix("|" + DemPhut.khongRo) }, "\(dem)")
  }

  func testPingVaAppTienCanhCuDeuLaPing() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    guard case .ok = await b.xuLyIPC(.ping, uidGoi: 501) else { return XCTFail("ping ok") }
    guard case .ok = await b.xuLyIPC(.appTienCanh(bundleId: "x", ten: "X"), uidGoi: 501) else { return XCTFail("tray cũ ok") }
    guard case .loi = await b.xuLyIPC(.ping, uidGoi: 502) else { return XCTFail("uid khác Con bị từ chối") }
  }

  func testDemTienCanhKhongSpawnTheoMoiLanGoi() {
    var dem = 0
    let d = DemTienCanh(lamMoiSau: 4, hanDem: 12, dongBo: true) { _ in dem += 1; return "com.a" }
    var gio = 100.0
    XCTAssertEqual(d.doc(uid: 501, gio: gio), "com.a")
    for _ in 0..<20 { gio += 0.1; _ = d.doc(uid: 501, gio: gio) }     // 20 lần gọi trong 2 giây (như trangThai IPC)
    XCTAssertEqual(dem, 1, "chỉ kiểm một lần trong 4 giây")
    gio += 5; _ = d.doc(uid: 501, gio: gio)
    XCTAssertEqual(dem, 2)
  }

  func testDemTienCanhQuaCuThiBo() {
    let chan = DispatchSemaphore(value: 0)
    let d = DemTienCanh(lamMoiSau: 4, hanDem: 12, dongBo: false) { _ in chan.wait(); return "com.a" }   // lsappinfo treo
    let t0 = Date()
    XCTAssertNil(d.doc(uid: 501, gio: 100), "đệm rỗng + việc kiểm đang treo ⇒ không chặn, trả nil")
    XCTAssertLessThan(Date().timeIntervalSince(t0), 1.0, "doc chỉ chờ lần đầu ≤0,3 giây rồi trả nil, không chặn tới khi lsappinfo xong")
    chan.signal()
    for _ in 0..<100 { if d.doc(uid: 501, gio: 101) != nil { break }; usleep(10_000) }
    XCTAssertEqual(d.doc(uid: 501, gio: 101), "com.a")
    XCTAssertNil(d.doc(uid: 501, gio: 101 + 13 + 0), "quá hạn đệm ⇒ nil (và đang làm mới)")
  }

  func testChayCoTimeoutThatKillTienTrinhCon() {
    let t0 = Date()
    let (ma, ra) = HeThongMac.chay("/bin/sleep", ["30"], timeout: 0.5)
    XCTAssertEqual(ma, -1)
    XCTAssertTrue(ra.contains("quá hạn"))
    XCTAssertLessThan(Date().timeIntervalSince(t0), 3)
    let (m2, r2) = HeThongMac.chay("/bin/echo", ["ok"], timeout: 5)
    XCTAssertEqual(m2, 0); XCTAssertEqual(r2.trimmingCharacters(in: .whitespacesAndNewlines), "ok")
  }

  // MARK: 3. IPC xử lý đồng thời

  private func noi(_ duong: String) -> Int32 {
    let fd = socket(AF_UNIX, SOCK_STREAM, 0)
    var addr = sockaddr_un()
    addr.sun_family = sa_family_t(AF_UNIX)
    let toiDa = MemoryLayout.size(ofValue: addr.sun_path)
    withUnsafeMutablePointer(to: &addr.sun_path) { p in
      p.withMemoryRebound(to: CChar.self, capacity: toiDa) { c in _ = duong.withCString { strncpy(c, $0, toiDa - 1) } }
    }
    let kq = withUnsafePointer(to: &addr) { p in p.withMemoryRebound(to: sockaddr.self, capacity: 1) { connect(fd, $0, socklen_t(MemoryLayout<sockaddr_un>.size)) } }
    return kq == 0 ? fd : -1
  }

  func testKetNoiTreoKhongChanHangDoi() throws {
    let duong = NSTemporaryDirectory() + "aiigrow-cc-\(UUID().uuidString).sock"
    let s = SocketIPC(duongDan: duong) { _, _ in .ok(id: "x") }
    try s.mo()
    let xong = expectation(description: "phục vụ")
    Task { await s.phucVu(); xong.fulfill() }
    let treo = noi(duong)                                   // nối rồi im lặng — giữ handler tới khi hết timeout đọc 3 giây
    XCTAssertGreaterThanOrEqual(treo, 0)
    let t0 = Date()
    let r = try SocketTest.gui(.trangThai, duongDan: duong)
    XCTAssertEqual(r, .ok(id: "x"))
    XCTAssertLessThan(Date().timeIntervalSince(t0), 1.5, "client thật không phải chờ client treo")
    close(treo)
    s.dong()
    wait(for: [xong], timeout: 2)
  }

  func testNhoGiotKhongKeoDaiQuaHanChotTong() throws {
    let duong = NSTemporaryDirectory() + "aiigrow-ng-\(UUID().uuidString).sock"
    let s = SocketIPC(duongDan: duong) { _, _ in .ok(id: nil) }
    try s.mo()
    let xong = expectation(description: "phục vụ")
    Task { await s.phucVu(); xong.fulfill() }
    let fd = noi(duong)
    let t0 = Date()
    var c: UInt8 = 0x20
    _ = write(fd, &c, 1)
    usleep(600_000)
    _ = write(fd, &c, 1)                       // byte thứ hai vẫn không có «\n» — hạn chót KHÔNG reset
    var b = [UInt8](repeating: 0, count: 64)
    var tv = timeval(tv_sec: 4, tv_usec: 0)
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))
    let n = read(fd, &b, 64)
    XCTAssertEqual(n, 0, "server đóng kết nối, không chờ thêm")
    XCTAssertLessThan(Date().timeIntervalSince(t0), 1.8, "đóng ở ~1 giây từ lúc accept dù có byte nhỏ giọt")
    close(fd)
    s.dong()
    wait(for: [xong], timeout: 2)
  }

  func testGioiHanMoiUid() throws {
    let duong = NSTemporaryDirectory() + "aiigrow-uid-\(UUID().uuidString).sock"
    let s = SocketIPC(duongDan: duong) { _, _ in .ok(id: "x") }
    try s.mo()
    let xong = expectation(description: "phục vụ")
    Task { await s.phucVu(); xong.fulfill() }
    var giu: [Int32] = []
    for _ in 0..<SocketIPC.toiDaMoiUid { giu.append(noi(duong)) }   // cùng uid (test) chiếm đủ phần của uid đó
    usleep(300_000)
    let thua = noi(duong)
    var tv = timeval(tv_sec: 1, tv_usec: 0)
    setsockopt(thua, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))
    var b = [UInt8](repeating: 0, count: 8)
    XCTAssertEqual(read(thua, &b, 8), 0, "vượt \(SocketIPC.toiDaMoiUid) kết nối của một uid ⇒ đóng ngay")
    XCTAssertLessThan(SocketIPC.toiDaMoiUid, SocketIPC.toiDaDongThoi, "còn chỗ cho uid khác")
    for f in giu + [thua] { close(f) }
    s.dong()
    wait(for: [xong], timeout: 2)
  }

  // MARK: lượt review 3

  func testDemTienCanhTheoUid() {
    let d = DemTienCanh(lamMoiSau: 4, hanDem: 12, dongBo: true) { uid in uid == 501 ? "com.con" : "com.khac" }
    XCTAssertEqual(d.doc(uid: 501, gio: 100), "com.con")
    XCTAssertEqual(d.doc(uid: 502, gio: 101), "com.khac", "uid khác ⇒ không trả kết quả của uid cũ")
  }

  func testDemTienCanhLanDauTraNilRoiCoDuLieu() {
    let d = DemTienCanh(lamMoiSau: 4, hanDem: 12, dongBo: false) { _ in "com.a" }
    var kq = d.doc(uid: 501, gio: 100)               // chưa có đệm: không chờ, có thể nil
    for _ in 0..<200 where kq == nil { usleep(10_000); kq = d.doc(uid: 501, gio: 100.1) }
    XCTAssertEqual(kq, "com.a", "kích kiểm nền, lần sau có dữ liệu")
  }

  func testDemTienCanhGhiLucKiemXong() {
    var dem = 0
    let d = DemTienCanh(lamMoiSau: 0.3, hanDem: 12, dongBo: true) { _ in dem += 1; usleep(500_000); return "com.a" }
    _ = d.doc(uid: 501, gio: 100)                    // kiểm tốn 0,5 giây ⇒ xong lúc ≈100,5
    _ = d.doc(uid: 501, gio: 100.6)                  // cách lúc XONG 0,1 < 0,3 ⇒ chưa làm mới (nếu ghi lúc bắt đầu thì 0,6 ≥ 0,3 sẽ kiểm lại)
    XCTAssertEqual(dem, 1)
  }

  // MARK: chữ hoa/thường (máy chủ lưu luật app bằng chữ thường)

  func testPolicyChuThuongKhopAppThatCoChuHoa() throws {
    let roblox = TienTrinh(pid: 10, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.Roblox.RobloxPlayer")
    let pages = TienTrinh(pid: 11, uid: 501, duongDan: "/Applications/Pages.app/Contents/MacOS/Pages", bundleId: "com.apple.iWork.Pages")
    let chrome = TienTrinh(pid: 12, uid: 501, duongDan: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", bundleId: "com.google.Chrome")
    // Policy qua parser: máy chủ lưu chữ thường, kể cả khi có ai gửi chữ hoa
    let p = try PolicyParser.parse(#"{"mode":"hoc","allowedApps":["com.apple.iwork.pages","COM.GOOGLE.CHROME"],"learningApps":["com.apple.iwork.pages"]}"#)
    XCTAssertEqual(p.allowedApps, ["com.apple.iwork.pages", "com.google.chrome"])
    let dong = QuyetDinhApp.canDong([roblox, pages, chrome], uidCon: 501, chiAppHoc: true, choPhep: p.allowedApps)
    XCTAssertEqual(dong.map(\.pid), [10], "Pages/Chrome (bundle id có chữ hoa) khớp luật chữ thường; Roblox không có trong luật ⇒ đóng")
    // luật chữ thường cho app chặn: Roblox được phép thì không đóng
    XCTAssertTrue(QuyetDinhApp.canDong([roblox], uidCon: 501, chiAppHoc: true, choPhep: ["com.roblox.robloxplayer"]).isEmpty)
    // duocPhep tự hạ chữ thường cả khi người gọi truyền chữ hoa
    XCTAssertTrue(QuyetDinhApp.duocPhep(roblox, choPhep: ["COM.ROBLOX.ROBLOXPLAYER"]))
  }

  func testUsageGuiLenLaChuThuong() {
    XCTAssertEqual(TienCanh.tachBundleId("\"CFBundleIdentifier\"=\"com.Roblox.RobloxPlayer\""), "com.roblox.robloxplayer")
    XCTAssertEqual(TienCanh.chon(thatSu: "com.Apple.iWork.Pages"), "com.apple.iwork.pages")
    var d: [String: Double] = [:]
    DemPhut.cong(&d, ngay: "2026-10-24", app: "com.Roblox.RobloxPlayer", giay: 120)
    XCTAssertEqual(DemPhut.tong(d), [MucDung(muc: "com.roblox.robloxplayer", phut: 2, day: "2026-10-24")])
  }

  func testChayChauGiuOngChiChoNgan() {
    let t0 = Date()
    let (ma, ra) = HeThongMac.chay("/bin/sh", ["-c", "sleep 5 & echo xin-chao"], timeout: 5)
    XCTAssertEqual(ma, 0)
    XCTAssertTrue(ra.contains("xin-chao"))
    XCTAssertLessThan(Date().timeIntervalSince(t0), 1.5, "cháu giữ ống: chỉ chờ ~0,3 giây")
  }

  func testChayLapNhieuLanKhongSapVaKhongRoFd() {
    _ = HeThongMac.chay("/bin/echo", ["x"], timeout: 5)
    let truoc = soFd()
    let nhom = DispatchGroup()
    for i in 0..<40 {
      nhom.enter()
      DispatchQueue.global().async {
        _ = i % 2 == 0 ? HeThongMac.chay("/bin/echo", ["ok"], timeout: 5) : HeThongMac.chay("/bin/sleep", ["30"], timeout: 0.1)
        nhom.leave()
      }
    }
    XCTAssertEqual(nhom.wait(timeout: .now() + 20), .success)
    usleep(300_000)
    XCTAssertLessThanOrEqual(soFd(), truoc + 2)
  }

  private func soFd() -> Int { (try? FileManager.default.contentsOfDirectory(atPath: "/dev/fd").count) ?? -1 }

  func testChayHetGioKhongRoFdVaLuong() {
    _ = HeThongMac.chay("/bin/echo", ["khoi-dong"], timeout: 5)
    let truoc = soFd()
    for _ in 0..<25 { _ = HeThongMac.chay("/bin/sleep", ["30"], timeout: 0.2) }
    usleep(300_000)
    XCTAssertLessThanOrEqual(soFd(), truoc + 2, "25 lần quá hạn không rò fd (trước \(truoc), sau \(soFd()))")
  }

  func testChayNhanhThanhCongKhongCatOutput() {
    let (ma, ra) = HeThongMac.chay("/bin/sh", ["-c", "sleep 0.3; yes x | head -c 200000"], timeout: 5)
    XCTAssertEqual(ma, 0)
    XCTAssertEqual(ra.count, 200000, "đọc đủ tới EOF")
  }

  func testDongThoatSachVaMoLai() throws {
    let duong = NSTemporaryDirectory() + "aiigrow-dg-\(UUID().uuidString).sock"
    let s = SocketIPC(duongDan: duong) { _, _ in .ok(id: "x") }
    try s.mo()
    let xong = expectation(description: "phục vụ")
    Task { await s.phucVu(); xong.fulfill() }
    usleep(100_000)
    let t0 = Date()
    s.dong()
    wait(for: [xong], timeout: 2)
    XCTAssertLessThan(Date().timeIntervalSince(t0), 1.0, "accept thoát ≤ ~200ms sau dong()")
    XCTAssertFalse(FileManager.default.fileExists(atPath: duong))
    // dong() trước khi phucVu cũng sạch, và mở lại được
    let s2 = SocketIPC(duongDan: duong) { _, _ in .ok(id: "y") }
    try s2.mo(); s2.dong()
    try s2.mo(); s2.dong()
    Task { await s2.phucVu() }          // đã đóng ⇒ trả về ngay, không treo
    usleep(100_000)
  }

  func testDongRoiMoLaiTrong200msVanPhucVu() throws {
    let duong = NSTemporaryDirectory() + "aiigrow-re-\(UUID().uuidString).sock"
    let s = SocketIPC(duongDan: duong) { _, _ in .ok(id: "moi") }
    try s.mo()
    let x1 = expectation(description: "phục vụ 1")
    Task { await s.phucVu(); x1.fulfill() }
    usleep(100_000)
    s.dong()
    try s.mo()                                       // ngay sau dong(): luồng accept cũ chưa kịp thoát
    let x2 = expectation(description: "phục vụ 2")
    Task { await s.phucVu(); x2.fulfill() }
    wait(for: [x1], timeout: 2)                      // luồng cũ phải thoát (không đè trạng thái socket mới)
    let r = try SocketTest.gui(.trangThai, duongDan: duong)
    XCTAssertEqual(r, .ok(id: "moi"), "socket mới vẫn được phục vụ")
    s.dong()
    wait(for: [x2], timeout: 2)
  }

  func testTrangThaiTuConLaNhipSongCuaTray() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    HttpMock.dat { _, _ in HttpMock.json(200, ["mode": "tu_do", "nextCheckSec": 30, "windows": ["mode": "tu_do", "cheDo": "chan", "nextCheckSec": 30, "serverTime": NgayGio.viet(dongHo.thuc)]]) }
    defer { HttpMock.dat { _, _ in nil } }
    _ = await b.xuLyIPC(.trangThai, uidGoi: 501)
    _ = await b.motVong()
    let st = HttpMock.lanGoiCuoi("api/device/dong-bo")?["status"] as? [String: Any]
    XCTAssertEqual(st?["trayAlive"] as? Bool, true, "trangThai từ uid Con cập nhật nhịp tray, không cần ping")
  }

  // MARK: lượt review 5

  func testApiClientDatPhienDoiTokenVaMayChu() async throws {
    HttpMock.dat { _, _ in HttpMock.json(200, ["mode": "tu_do", "nextCheckSec": 30, "windows": ["mode": "tu_do", "nextCheckSec": 30]]) }
    defer { HttpMock.dat { _, _ in nil } }
    let api = ApiClient(mayChu: "https://a.example", token: nil, session: HttpMock.session())
    let st = TrangThaiAgent(mode: "tu_do", trayAlive: true, childSessionActive: false, offline: false, cheDo: "chan", phienKhac: false)
    _ = try await api.dongBo(trangThai: st, dung: [], luc: Date())
    XCTAssertEqual(HttpMock.authCuoi("api/device/dong-bo"), .some(nil), "chưa ghép ⇒ không có Authorization")
    api.datPhien(mayChu: "b.example/", token: "tok-moi")
    _ = try await api.dongBo(trangThai: st, dung: [], luc: Date())
    XCTAssertEqual(HttpMock.authCuoi("api/device/dong-bo"), "Bearer tok-moi")
    XCTAssertEqual(api.mayChu, "https://b.example")
  }

  func testSafariVaChessBiDongTrongCheDoHoc() {
    let safari = TienTrinh(pid: 20, uid: 501, duongDan: "/System/Volumes/Preboot/Cryptexes/App/System/Applications/Safari.app/Contents/MacOS/Safari", bundleId: "com.apple.Safari")
    let chess = TienTrinh(pid: 21, uid: 501, duongDan: "/System/Applications/Chess.app/Contents/MacOS/Chess", bundleId: "com.apple.Chess")
    let msgs = TienTrinh(pid: 22, uid: 501, duongDan: "/System/Applications/Messages.app/Contents/MacOS/Messages", bundleId: "com.apple.MobileSMS")
    let dock = TienTrinh(pid: 23, uid: 501, duongDan: "/System/Library/CoreServices/Dock.app/Contents/MacOS/Dock", bundleId: "com.apple.dock")
    let finder = TienTrinh(pid: 24, uid: 501, duongDan: "/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder", bundleId: "com.apple.finder")
    let caiDat = TienTrinh(pid: 25, uid: 501, duongDan: "/System/Applications/System Settings.app/Contents/MacOS/System Settings", bundleId: "com.apple.systempreferences")
    let ds = [safari, chess, msgs, dock, finder, caiDat]
    let dong = QuyetDinhApp.canDong(ds, uidCon: 501, chiAppHoc: true, choPhep: [] + Array(QuyetDinhApp.heThong))
    XCTAssertEqual(dong.map(\.pid).sorted(), [20, 21, 22], "Safari/Chess/Messages bị đóng; Dock/Finder/Cài đặt hệ thống được giữ")
    let con = QuyetDinhApp.canDong(ds, uidCon: 501, chiAppHoc: true, choPhep: ["com.apple.safari"] + Array(QuyetDinhApp.heThong))
    XCTAssertEqual(con.map(\.pid).sorted(), [21, 22], "Safari có trong allowlist thì được giữ")
  }

  func testGhiLaiChinhSachTrinhDuyetKhiTepMatHoacBiSua() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    HttpMock.dat { _, _ in HttpMock.json(200, ["mode": "hoc", "nextCheckSec": 30, "windows": ["mode": "hoc", "cheDo": "chan", "nextCheckSec": 30,
      "serverTime": NgayGio.viet(dongHo.thuc), "web": ["cheDo": "mo", "chan": ["youtube.com"], "cho": []]]]) }
    defer { HttpMock.dat { _, _ in nil } }
    _ = await b.motVong()
    let chrome = ChinhSachTrinhDuyet.tatCa.first { $0.ten == "Chrome" }!
    let duong = ChinhSachTrinhDuyet.duongDan(chrome, taiKhoan: "be", thuMucGoc: thuMuc + "/Managed")
    let goc = fake.tep[duong]
    XCTAssertNotNil(goc, "lần đầu ghi chính sách Chrome")
    fake.tep[duong] = nil                                  // tệp bị xoá
    dongHo.tien(5); _ = await b.apChinhSach()
    XCTAssertEqual(fake.tep[duong] != nil, true, "tệp mất ⇒ ghi lại")
    var cu = ChinhSachTrinhDuyet.giaiMa(fake.tep[duong])!
    cu["URLBlocklist"] = ["*"]                              // bị sửa
    fake.tep[duong] = try ChinhSachTrinhDuyet.maHoa(cu)
    dongHo.tien(5); _ = await b.apChinhSach()
    let moi = ChinhSachTrinhDuyet.giaiMa(fake.tep[duong])!
    XCTAssertEqual(moi["URLBlocklist"] as? [String], ["youtube.com"], "nội dung khác ⇒ ghi lại đúng")
  }

  func testLenhGoDonMoiThuMucTaiKhoan() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    let chrome = ChinhSachTrinhDuyet.tatCa.first { $0.ten == "Chrome" }!
    // plist do ta ghi cho một tài khoản KHÁC Con (vd Con cũ / đổi tên) + một khoá của người khác
    let web = ChinhSachWeb(cheDo: ChinhSachWeb.mo, chan: ["youtube.com"], cho: [])
    var plist = ChinhSachTrinhDuyet.gop(cu: ["HomepageLocation": "https://x.vn"], trinhDuyet: chrome, p: web, mayChuHost: nil)!
    plist["HomepageLocation"] = "https://x.vn"
    let duong = ChinhSachTrinhDuyet.duongDan(chrome, taiKhoan: "con_cu", thuMucGoc: thuMuc + "/Managed")
    fake.tep[duong] = try ChinhSachTrinhDuyet.maHoa(plist)
    HttpMock.dat { _, _ in HttpMock.json(200, ["mode": "tu_do", "nextCheckSec": 30, "lenh": [["id": 1, "loai": "go"]],
      "windows": ["mode": "tu_do", "nextCheckSec": 30, "serverTime": NgayGio.viet(dongHo.thuc)]]) }
    defer { HttpMock.dat { _, _ in nil } }
    _ = await b.motVong()
    let con = ChinhSachTrinhDuyet.giaiMa(fake.tep[duong])
    XCTAssertNil(con?["URLBlocklist"], "khoá của AiiGrow đã gỡ ở thư mục tài khoản khác")
    XCTAssertEqual(con?["HomepageLocation"] as? String, "https://x.vn", "khoá người khác giữ nguyên")
  }

  func testChayXaOutputLienTucCoTran() {
    let t0 = Date()
    let (ma, ra) = HeThongMac.chay("/usr/bin/yes", ["aiigrow"], timeout: 10, trenOutput: 100_000)
    XCTAssertTrue(ra.count >= 100_000 && ra.count < 400_000, "cắt ở trần ~100KB, nhận \(ra.count)")
    XCTAssertLessThan(Date().timeIntervalSince(t0), 6)
    _ = ma
  }

  // MARK: lượt review 6

  func testChiDongTienTrinhChinhKhongDongWidgetExtensionHelper() {
    let lich = TienTrinh(pid: 30, uid: 501, duongDan: "/System/Applications/Calendar.app/Contents/PlugIns/CalendarWidgetExtension.appex/Contents/MacOS/CalendarWidgetExtension", bundleId: "com.apple.iCal.CalendarWidgetExtension")
    let mail = TienTrinh(pid: 31, uid: 501, duongDan: "/System/Applications/Mail.app/Contents/PlugIns/com.apple.mail.SpotlightIndexExtension.appex/Contents/MacOS/com.apple.mail.SpotlightIndexExtension", bundleId: "com.apple.mail.spotlightindexextension")
    let helper = TienTrinh(pid: 32, uid: 501, duongDan: "/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/1/Helpers/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper", bundleId: "com.google.Chrome.helper")
    let xpc = TienTrinh(pid: 33, uid: 501, duongDan: "/Applications/Foo.app/Contents/XPCServices/Bar.xpc/Contents/MacOS/Bar", bundleId: "com.foo.bar")
    let chrome = TienTrinh(pid: 34, uid: 501, duongDan: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", bundleId: "com.google.Chrome")
    let mailChinh = TienTrinh(pid: 35, uid: 501, duongDan: "/System/Applications/Mail.app/Contents/MacOS/Mail", bundleId: "com.apple.mail")
    let dong = QuyetDinhApp.canDong([lich, mail, helper, xpc, chrome, mailChinh], uidCon: 501, chiAppHoc: true, choPhep: Array(QuyetDinhApp.heThong))
    XCTAssertEqual(dong.map(\.pid).sorted(), [34, 35], "chỉ tiến trình chính bị đóng; widget/extension/XPC/Helper thì không")
    XCTAssertTrue(QuyetDinhApp.laTienTrinhPhu(helper.duongDan)); XCTAssertFalse(QuyetDinhApp.laTienTrinhPhu(chrome.duongDan))
  }

  private func chrome() -> ChinhSachTrinhDuyet.TrinhDuyet { ChinhSachTrinhDuyet.tatCa.first { $0.ten == "Chrome" }! }
  private let webYT = ChinhSachWeb(cheDo: ChinhSachWeb.mo, chan: ["youtube.com"], cho: [])

  func testGopKhongDongVaoPlistCuaNguoiKhac() {
    let mdm: [String: Any] = ["URLBlocklist": ["mdm.com"], "IncognitoModeAvailability": 0, "HomepageLocation": "https://x.vn"]
    // giám sát/gỡ (p nil) trên plist không có dấu của ta: nguyên vẹn, kể cả khoá trùng tên
    let r = ChinhSachTrinhDuyet.gop(cu: mdm, trinhDuyet: chrome(), p: nil, mayChuHost: nil)
    XCTAssertTrue(NSDictionary(dictionary: r ?? [:]).isEqual(to: mdm))
    // gộp vào: giữ khoá + danh sách của MDM
    let g = ChinhSachTrinhDuyet.gop(cu: mdm, trinhDuyet: chrome(), p: webYT, mayChuHost: nil)!
    XCTAssertEqual(g["URLBlocklist"] as? [String], ["youtube.com", "mdm.com"])
    XCTAssertEqual(g["HomepageLocation"] as? String, "https://x.vn")
    XCTAssertNotNil(g[ChinhSachTrinhDuyet.khoaDanhDau])
    // cập nhật lần hai không nhân đôi, rồi gỡ ⇒ về đúng nguyên trạng của MDM
    let g2 = ChinhSachTrinhDuyet.gop(cu: g, trinhDuyet: chrome(), p: webYT, mayChuHost: nil)!
    XCTAssertEqual(g2["URLBlocklist"] as? [String], ["youtube.com", "mdm.com"])
    let go = ChinhSachTrinhDuyet.gop(cu: g2, trinhDuyet: chrome(), p: nil, mayChuHost: nil)!
    XCTAssertTrue(NSDictionary(dictionary: go).isEqual(to: mdm), "gỡ trả lại đúng giá trị gốc: \(go)")
    // plist chỉ của ta ⇒ gỡ xong rỗng ⇒ nil (xoá tệp)
    let rieng = ChinhSachTrinhDuyet.gop(cu: nil, trinhDuyet: chrome(), p: webYT, mayChuHost: nil)!
    XCTAssertNil(ChinhSachTrinhDuyet.gop(cu: rieng, trinhDuyet: chrome(), p: nil, mayChuHost: nil))
  }

  func testGiamSatVaTuGoKhongDungPlistMDM() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    let mdm: [String: Any] = ["URLBlocklist": ["mdm.com"], "IncognitoModeAvailability": 0]
    let duong = ChinhSachTrinhDuyet.duongDan(chrome(), taiKhoan: "nguoi_khac", thuMucGoc: thuMuc + "/Managed")
    fake.tep[duong] = try ChinhSachTrinhDuyet.maHoa(mdm)
    let duongCon = ChinhSachTrinhDuyet.duongDan(chrome(), taiKhoan: "be", thuMucGoc: thuMuc + "/Managed")
    fake.tep[duongCon] = try ChinhSachTrinhDuyet.maHoa(mdm)
    // chế độ giám sát (cheDo = giam_sat) chạy mỗi vòng ⇒ web nil
    HttpMock.dat { _, _ in HttpMock.json(200, ["mode": "hoc", "cheDo": "giam_sat", "nextCheckSec": 30, "lenh": [["id": 1, "loai": "go"]],
      "windows": ["mode": "hoc", "cheDo": "giam_sat", "nextCheckSec": 30, "serverTime": NgayGio.viet(dongHo.thuc)]]) }
    defer { HttpMock.dat { _, _ in nil } }
    _ = await b.motVong()                                   // gồm lệnh gỡ
    for p in [duong, duongCon] {
      XCTAssertTrue(NSDictionary(dictionary: ChinhSachTrinhDuyet.giaiMa(fake.tep[p]) ?? [:]).isEqual(to: mdm), "plist MDM nguyên vẹn: \(p)")
    }
  }

  func testGhepKiemAdminTruocKhiGoiMayChu() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let kho = ConfigStore(duongDan: thuMuc + "/config.json")
    let api = ApiClient(mayChu: "https://aiigrow.aiilab.vn", token: nil, session: HttpMock.session())
    let b = BoMay(api: api, heThong: fake, kho: kho, tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed"),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    fake.uidTheoTen = ["be": 501]; fake.admin = ["be"]          // Con là admin duy nhất
    HttpMock.dat { _, _ in HttpMock.json(200, ["deviceId": "d", "token": "t", "childName": "Bé"]) }
    defer { HttpMock.dat { _, _ in nil } }
    do { try await b.ghep(ma: "123456", taiKhoanCon: "be"); XCTFail("phải lỗi con_mot_admin") }
    catch let e as LoiApi { XCTAssertEqual(e.ma, "con_mot_admin") }
    XCTAssertNil(HttpMock.lanGoiCuoi("api/device/ghep"), "KHÔNG gọi máy chủ khi lỗi cục bộ (mã ghép không bị đốt, không có máy «ma»)")
    XCTAssertTrue(fake.daHaQuyen.isEmpty)
  }

  func testSauTuGoKhongApLaiChanVaHosts() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    let hosts = thuMuc + "/hosts"
    var go = false
    HttpMock.dat { _, _ in
      HttpMock.json(200, ["mode": "hoc", "nextCheckSec": 30, "lenh": go ? [["id": 1, "loai": "go"]] : [],
        "windows": ["mode": "hoc", "cheDo": "chan", "nextCheckSec": 30, "serverTime": NgayGio.viet(dongHo.thuc),
                    "web": ["cheDo": "mo", "chan": ["youtube.com"], "cho": []]]])
    }
    defer { HttpMock.dat { _, _ in nil } }
    _ = await b.motVong()
    let duong = ChinhSachTrinhDuyet.duongDan(chrome(), taiKhoan: "be", thuMucGoc: thuMuc + "/Managed")
    XCTAssertNotNil(fake.tep[duong], "đang chặn: có plist")
    go = true
    dongHo.tien(40); _ = await b.motVong()                  // nhận lệnh gỡ
    XCTAssertNil(fake.tep[duong], "gỡ xong: plist biến mất")
    for _ in 0..<3 { dongHo.tien(5); _ = await b.apChinhSach(); _ = await b.motVong() }
    XCTAssertNil(fake.tep[duong], "vòng sau KHÔNG ghi lại plist")
    XCTAssertFalse((String(decoding: fake.tep[hosts] ?? Data(), as: UTF8.self)).contains("youtube.com"), "hosts không bị ghi lại")
    let daGhep = await b.daGhep
    XCTAssertFalse(daGhep)
    XCTAssertNil(kho.doc()?.policyCuoi)
    XCTAssertTrue(fake.tinHieuDaGui.isEmpty, "không đóng app")
  }

  // MARK: lượt review 7

  func testIpadWrapperLauncherLongNhauVaWineBiDong() {
    let ipad = TienTrinh(pid: 40, uid: 501, duongDan: "/Applications/Game.app/Wrapper/Game.app/Game", bundleId: "com.ngoai.game", bundleIdGan: "com.game.ipad")
    let lol = TienTrinh(pid: 41, uid: 501, duongDan: "/Applications/League of Legends.app/Contents/LoL/RADS/projects/league_client/releases/1/deploy/LeagueClient.app/Contents/MacOS/LeagueClient", bundleId: "com.riotgames.leagueoflegends", bundleIdGan: "com.riotgames.leagueclient")
    let wine = TienTrinh(pid: 42, uid: 501, duongDan: "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine64-preloader", bundleId: "com.codeweavers.crossover")
    XCTAssertEqual(ipad.duongDanAppGan, "/Applications/Game.app/Wrapper/Game.app")
    let tat = QuyetDinhApp.canDong([ipad, lol, wine], uidCon: 501, chiAppHoc: true, choPhep: [])
    XCTAssertEqual(tat.map(\.pid).sorted(), [40, 41, 42], "game iPad Wrapper, launcher lồng, Wine/CrossOver đều bị đóng")
    // bundle id của .app GẦN NHẤT được phép ⇒ giữ; .app ngoài cùng được phép cũng giữ
    XCTAssertEqual(QuyetDinhApp.canDong([ipad, lol, wine], uidCon: 501, chiAppHoc: true, choPhep: ["com.game.ipad", "com.riotgames.leagueclient"]).map(\.pid), [42])
    XCTAssertEqual(QuyetDinhApp.canDong([ipad, lol, wine], uidCon: 501, chiAppHoc: true, choPhep: ["com.riotgames.leagueoflegends", "com.codeweavers.crossover"]).map(\.pid).sorted(), [40])
    // tiến trình phụ của lượt trước vẫn được miễn
    let appex = TienTrinh(pid: 43, uid: 501, duongDan: "/System/Applications/Calendar.app/Contents/PlugIns/CalendarWidgetExtension.appex/Contents/MacOS/CalendarWidgetExtension", bundleId: "com.apple.ical")
    XCTAssertTrue(QuyetDinhApp.canDong([appex], uidCon: 501, chiAppHoc: true, choPhep: []).isEmpty)
  }

  func testTuGoBaoXongTruocKhiXoaTokenVaChayTrinhGo() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    try kho.sua { $0.daHaQuyen = ["be"] }
    HttpMock.dat { _, _ in HttpMock.json(200, ["mode": "tu_do", "nextCheckSec": 30, "lenh": [["id": 7, "loai": "go"]],
      "windows": ["mode": "tu_do", "nextCheckSec": 30, "serverTime": NgayGio.viet(dongHo.thuc)]]) }
    defer { HttpMock.dat { _, _ in nil } }
    _ = await b.motVong()
    XCTAssertEqual(HttpMock.authCuoi("api/device/lenh/7/xong"), "Bearer t", "báo xong lệnh gỡ khi token còn hiệu lực")
    XCTAssertEqual(kho.doc()?.token, "", "rồi mới xoá token")
    XCTAssertEqual(kho.doc()?.daHaQuyen, ["be"], "giữ danh sách để trình gỡ trả quyền admin")
    XCTAssertEqual(fake.soLanChayTrinhGo, 1, "tự chạy trình gỡ")
  }

  private func boMayChuaGhep(_ fake: HeThongGia, _ thuMuc: String, api: MayChuApi? = nil, daHa: [String] = []) throws -> (BoMay, ConfigStore) {
    let kho = ConfigStore(duongDan: thuMuc + "/config.json")
    if !daHa.isEmpty { try kho.sua { $0.daHaQuyen = daHa } }
    let dh = DongHoGia()
    let a = api ?? ApiClient(mayChu: "https://aiigrow.aiilab.vn", token: nil, session: HttpMock.session())
    let b = BoMay(api: a, heThong: fake, kho: kho, tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed"),
                  dongHo: { dh.thuc }, donDieu: { dh.donDieu })
    fake.uidTheoTen = ["be": 501, "ba": 502]; fake.admin = ["ba"]
    return (b, kho)
  }

  func testGhepLaiKhongMatDanhSachDaHaQuyen() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia()
    let (b, kho) = try boMayChuaGhep(fake, thuMuc, daHa: ["con_cu"])
    HttpMock.dat { _, _ in HttpMock.json(200, ["deviceId": "d", "token": "t2", "childName": "Bé"]) }
    defer { HttpMock.dat { _, _ in nil } }
    try await b.ghep(ma: "123456", taiKhoanCon: "be")           // be không phải admin ⇒ không hạ thêm
    XCTAssertEqual(kho.doc()?.daHaQuyen, ["con_cu"], "hợp với danh sách cũ, không ghi đè bằng []")
  }

  func testHaQuyenLoiVanGiuTokenDaGhep() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia()
    let (b, kho) = try boMayChuaGhep(fake, thuMuc)
    fake.admin = ["ba", "be"]; fake.loiHaQuyen = LoiApi(chu: "dseditgroup lỗi")
    HttpMock.dat { _, _ in HttpMock.json(200, ["deviceId": "d", "token": "tok-ok", "childName": "Bé"]) }
    defer { HttpMock.dat { _, _ in nil } }
    try await b.ghep(ma: "123456", taiKhoanCon: "be")           // không ném lỗi
    XCTAssertEqual(kho.doc()?.token, "tok-ok", "token đã lưu dù hạ quyền lỗi")
    XCTAssertEqual(kho.doc()?.daHaQuyen, [], "chưa hạ được ⇒ không ghi vào danh sách cần trả")
    XCTAssertTrue(fake.log.contains { $0.contains("CẢNH BÁO") })
  }

  func testGopGiuMucCuaTaKhiVuotTran() {
    let mdm: [String: Any] = ["URLBlocklist": (0..<2000).map { "mdm\($0).com" }]
    let web = ChinhSachWeb(cheDo: ChinhSachWeb.chiChoPhep, chan: ["youtube.com"], cho: ["hoc.vn"])
    let g = ChinhSachTrinhDuyet.gop(cu: mdm, trinhDuyet: chrome(), p: web, mayChuHost: nil)!
    let ds = g["URLBlocklist"] as! [String]
    XCTAssertEqual(ds.first, "*", "«*» của AiiGrow đứng đầu")
    XCTAssertTrue(ds.contains("youtube.com"))
    XCTAssertLessThanOrEqual(ds.count, ChinhSachTrinhDuyet.tranMuc)
  }

  final class ApiGhepCham: MayChuApi, @unchecked Sendable {
    let k = NSLock(); var soLan = 0
    func ghep(ma: String, tenMay: String) async throws -> KetQuaGhep {
      k.lock(); soLan += 1; k.unlock()
      try await Task.sleep(nanoseconds: 150_000_000)
      return KetQuaGhep(deviceId: "d", token: "t", childName: "B", server: nil)
    }
    func dongBo(trangThai: TrangThaiAgent, dung: [MucDung], luc: Date) async throws -> KetQuaDongBo { throw LoiApi(chu: "x") }
    func taoYeuCau(loai: String, phut: Int?, giaTri: String?, lyDo: String) async throws -> KetQuaYeuCau { KetQuaYeuCau(id: "1", trangThai: "cho") }
    func trangThaiYeuCau(id: String) async throws -> String { "cho" }
  }

  func testBamDoiGhepChiGoiMayChuMotLan() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), api = ApiGhepCham()
    let (b, _) = try boMayChuaGhep(fake, thuMuc, api: api)
    async let a: Void = b.ghep(ma: "111111", taiKhoanCon: "be")
    async let c: Void = b.ghep(ma: "111111", taiKhoanCon: "be")
    var loi: [String?] = []
    do { try await a } catch let e as LoiApi { loi.append(e.ma) }
    do { try await c } catch let e as LoiApi { loi.append(e.ma) }
    XCTAssertEqual(api.soLan, 1, "chỉ MỘT lần gọi server")
    XCTAssertEqual(loi.count, 1)
    XCTAssertTrue(["dang_ghep", "da_ghep"].contains(loi.first ?? nil ?? ""), "lần hai bị từ chối: \(loi)")
  }

  // MARK: lượt review 8

  func testHaQuyenLoiBaoCanhBaoVaGuiConLaAdmin() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia()
    let (b, _) = try boMayChuaGhep(fake, thuMuc)
    fake.admin = ["ba", "be"]; fake.loiHaQuyen = LoiApi(chu: "dseditgroup lỗi")
    HttpMock.dat { _, _ in HttpMock.json(200, ["deviceId": "d", "token": "tok-ok", "childName": "Bé"]) }
    defer { HttpMock.dat { _, _ in nil } }
    let tl = await b.xuLyIPC(.ghep(ma: "123456", taiKhoanCon: "be"), uidGoi: 502)
    guard case let .canhBao(_, chu) = tl else { return XCTFail("phải là canhBao, nhận \(tl)") }
    XCTAssertTrue(chu.contains("đang là quản trị (admin)"), chu)
    let tt = await b.xuLyIPC(.trangThai, uidGoi: 502)
    guard case let .trangThai(t) = tt else { return XCTFail() }
    XCTAssertNotNil(t.canhBaoAdmin, "tray (phiên Ba Mẹ) thấy cảnh báo")
    XCTAssertTrue(chu.contains("Người dùng & Nhóm") && chu.contains("quản trị máy tính này"), "kèm cách xử lý")
    guard case let .trangThai(tc) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertNil(tc.canhBaoAdmin, "phiên Con KHÔNG thấy cảnh báo")
    // dong-bo mang cờ conLaAdmin + quyen thiếu
    HttpMock.dat { _, _ in HttpMock.json(200, ["mode": "tu_do", "nextCheckSec": 30, "lenh": [], "windows": ["mode": "tu_do", "cheDo": "chan", "locked": false, "nextCheckSec": 30,
        "serverTime": NgayGio.viet(Date()), "allowedApps": [], "learningApps": [], "web": ["cheDo": "mo", "chan": [], "cho": []]]]) }
    await b.motVong()
    let st = HttpMock.lanGoiCuoi("api/device/dong-bo")?["status"] as? [String: Any]
    XCTAssertEqual(st?["conLaAdmin"] as? Bool, true)
    XCTAssertEqual((st?["quyen"] as? [String: Bool])?["haQuyenAdmin"], false, "máy chủ liệt vào «còn thiếu»")
  }

  func testGhiDaHaQuyenTruocKhiHaQuyen() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia()
    let (b, kho) = try boMayChuaGhep(fake, thuMuc)
    fake.admin = ["ba", "be"]
    var luc: [String]?
    fake.truocHaQuyen = { luc = kho.doc()?.daHaQuyen }
    HttpMock.dat { _, _ in HttpMock.json(200, ["deviceId": "d", "token": "t", "childName": "Bé"]) }
    defer { HttpMock.dat { _, _ in nil } }
    try await b.ghep(ma: "123456", taiKhoanCon: "be")
    XCTAssertEqual(luc, ["be"], "daHaQuyen đã nằm trên đĩa TRƯỚC khi hạ quyền")
    let la = await b.conLaAdmin, cb = await b.canhBaoAdmin
    XCTAssertFalse(la)
    XCTAssertNil(cb)
  }

  func testChiThuMucGameNgoaiAppBiDong() {
    let mc = TienTrinh(pid: 60, uid: 501, duongDan: "/Users/be/Library/Application Support/minecraft/runtime/java-runtime-gamma/mac-os-arm64/bin/java")
    let vscode = TienTrinh(pid: 61, uid: 501, duongDan: "/Users/be/.vscode/extensions/redhat.java-1.30/jre/17/bin/java")
    let idea = TienTrinh(pid: 62, uid: 501, duongDan: "/Users/be/Library/Java/JavaVirtualMachines/temurin-17/Contents/Home/bin/java")
    let ardu = TienTrinh(pid: 63, uid: 501, duongDan: "/Users/be/Library/Arduino15/packages/esp32/tools/xtensa-esp32-elf-gcc/bin/xtensa-esp32-elf-g++")
    let git = TienTrinh(pid: 64, uid: 501, duongDan: "/usr/bin/git")
    let tai = TienTrinh(pid: 65, uid: 501, duongDan: "/Users/be/Downloads/tool")
    let steam = TienTrinh(pid: 66, uid: 501, duongDan: "/Users/be/Library/Application Support/Steam/steamapps/common/Game/game")
    let ds = [mc, vscode, idea, ardu, git, tai, steam]
    XCTAssertEqual(QuyetDinhApp.canDong(ds, uidCon: 501, chiAppHoc: true, choPhep: Array(QuyetDinhApp.heThong)).map(\.pid).sorted(), [60, 66], "chỉ Minecraft/Steam; VS Code, IntelliJ, Arduino15 không bị đóng")
    XCTAssertEqual(QuyetDinhApp.canDong(ds, uidCon: 501, chiAppHoc: true, choPhep: ["java"]).map(\.pid), [66], "Ba Mẹ cho phép theo tên tệp")
    XCTAssertTrue(QuyetDinhApp.canDong(ds, uidCon: 501, chiAppHoc: false, choPhep: []).isEmpty)
  }

  func testChiBoGoGocRootDuocMienTru() {
    let ds = [
      TienTrinh(pid: 70, uid: 501, duongDan: "/Library/Input Methods/OpenKey.app/Contents/MacOS/OpenKey", bundleId: "com.tranvietkhoa.openkey"),
      TienTrinh(pid: 73, uid: 501, duongDan: "/Library/Application Support/Tailscale/tailscaled"),
      TienTrinh(pid: 74, uid: 501, duongDan: "/Applications/Tailscale.app/Contents/MacOS/Tailscale", bundleId: "io.tailscale.ipn.macsys"),
      TienTrinh(pid: 75, uid: 501, duongDan: "/Applications/TeamViewer.app/Contents/MacOS/TeamViewer", bundleId: "com.teamviewer.TeamViewer"),
      TienTrinh(pid: 76, uid: 501, duongDan: "/Users/be/Library/Input Methods/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.roblox.robloxplayer"),
      TienTrinh(pid: 77, uid: 501, duongDan: "/Users/be/Library/Application Support/Tailscale/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.roblox.robloxplayer"),
    ]
    XCTAssertEqual(QuyetDinhApp.canDong(ds, uidCon: 501, chiAppHoc: true, choPhep: Array(QuyetDinhApp.heThong)).map(\.pid), [76, 77], "Roblox giấu trong ~/Library/Input Methods bị đóng; bộ gõ ở /Library giữ")
  }

  func testBoGoTheoUserChiMienKhiInfoPlistLaBoGo() {
    XCTAssertTrue(QuyetDinhApp.plistLaBoGo(["InputMethodConnectionName": "OpenKey_Connection"]))
    XCTAssertTrue(QuyetDinhApp.plistLaBoGo(["ComponentInputModeDict": [:] as [String: Any]]))
    XCTAssertTrue(QuyetDinhApp.plistLaBoGo(["tsInputMethodCharacterRepertoireKey": ["Latn"]]))
    XCTAssertFalse(QuyetDinhApp.plistLaBoGo(["CFBundleIdentifier": "com.roblox.robloxplayer"]))
    var bo = TienTrinh(pid: 80, uid: 501, duongDan: "/Users/be/Library/Input Methods/OpenKey.app/Contents/MacOS/OpenKey", bundleId: "com.x.openkey")
    bo.laBoGo = true
    let gia = TienTrinh(pid: 81, uid: 501, duongDan: "/Users/be/Library/Input Methods/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.roblox.robloxplayer")
    var giaCoCo = gia; giaCoCo.laBoGo = true; giaCoCo.pid = 82
    giaCoCo.duongDan = "/Users/be/Library/Caches/Roblox.app/Contents/MacOS/RobloxPlayer"          // cờ bộ gõ nhưng NGOÀI thư mục bộ gõ ⇒ không miễn
    XCTAssertEqual(QuyetDinhApp.canDong([bo, gia, giaCoCo], uidCon: 501, chiAppHoc: true, choPhep: Array(QuyetDinhApp.heThong)).map(\.pid), [81, 82])
  }

  func testIPCTrangThaiKhongLamSigkillSom() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    HttpMock.dat { _, _ in
      HttpMock.json(200, ["mode": "hoc", "nextCheckSec": 30, "lenh": [],
        "windows": ["mode": "hoc", "cheDo": "chan", "nextCheckSec": 30, "serverTime": NgayGio.viet(dongHo.thuc),
                    "web": ["cheDo": "mo", "chan": [], "cho": []]]])
    }
    defer { HttpMock.dat { _, _ in nil } }
    fake.tienTrinhTheoUid[501] = [TienTrinh(pid: 90, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.roblox.robloxplayer")]
    fake.conSongPid = [90]
    _ = await b.motVong()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.1), [SIGTERM])
    for _ in 0..<10 { _ = await b.xuLyIPC(.trangThai, uidGoi: 502) }       // IPC dồn dập: không áp ⇒ không SIGKILL
    XCTAssertEqual(fake.tinHieuDaGui.map(\.1), [SIGTERM], "IPC không leo thang kill")
    dongHo.tien(5); _ = await b.apChinhSach()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.1), [SIGTERM, SIGKILL], "vòng daemon sau ≥ 5 giây mới SIGKILL")
  }

  // MARK: review 12 — vòng áp tách khỏi đồng bộ, đếm ngược theo hạn chót, IPC tính tươi

  private static let polKhoa = #"{"mode":"khoa","cheDo":"chan","nextCheckSec":30,"allowedApps":[],"learningApps":[]}"#
  private static let polHoc = #"{"mode":"hoc","cheDo":"chan","nextCheckSec":30,"allowedApps":["com.apple.calculator"],"learningApps":["com.apple.calculator"]}"#
  private func tt(_ b: BoMay, uid: UInt32 = 502) async -> TrangThai {
    guard case let .trangThai(t) = await b.xuLyIPC(.trangThai, uidGoi: uid) else { fatalError("trangThai") }
    return t
  }
  private let roblox = TienTrinh(pid: 90, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.roblox.robloxplayer")

  func testDoiConsoleTuConSangBaMeTrangThaiLapTuc() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc, policyJson: Self.polKhoa)
    await b.vongAp()
    let a = await tt(b)
    XCTAssertTrue(a.laPhienCon); XCTAssertEqual(a.cheDo, .khoa); XCTAssertNotNil(a.demNguocGiay)
    fake.phien = PhienConsole(uid: 502, manKhoa: false)           // Ba Mẹ đăng nhập — KHÔNG có vòng áp nào chạy giữa chừng
    let c = await tt(b)
    XCTAssertFalse(c.laPhienCon, "laPhienCon theo console ngay lúc gọi")
    XCTAssertNil(c.demNguocGiay, "không còn màn khoá/đếm ngược")
  }

  func testDongBoTreoVongApVanDongAppVaDemKhoa() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc, policyJson: Self.polHoc)
    HttpMock.dat { _, _ in Thread.sleep(forTimeInterval: 3); return nil }      // dong-bo treo (rồi lỗi mạng)
    defer { HttpMock.dat { _, _ in nil } }
    let sync = Task { await b.vongDongBo() }
    try await Task.sleep(nanoseconds: 300_000_000)                          // sync đang treo trong await mạng
    fake.tienTrinhTheoUid[501] = [roblox]; fake.conSongPid = [90]
    await b.vongAp()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.1), [SIGTERM], "đang treo đồng bộ mà vòng áp vẫn đóng app")
    await sync.value
    // khoá: cũng đếm + đóng phiên khi đồng bộ treo
    let thuMuc2 = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc2) }
    let fake2 = HeThongGia(), dongHo2 = DongHoGia()
    let (b2, _) = try dungBoMay(fake2, dongHo: dongHo2, thuMuc: thuMuc2, policyJson: Self.polKhoa)
    let sync2 = Task { await b2.vongDongBo() }
    try await Task.sleep(nanoseconds: 300_000_000)
    let t0 = await b2.vongAp()
    dongHo2.tien(10)
    let t1 = await b2.vongAp()
    XCTAssertEqual((t0.demNguocGiay ?? 0) - (t1.demNguocGiay ?? 0), 10, "vẫn đếm khoá khi đồng bộ treo")
    dongHo2.tien(60); await b2.vongAp()
    XCTAssertEqual(fake2.daDongPhien, [501], "hết hạn chót ⇒ đóng phiên dù đồng bộ treo")
    await sync2.value
  }

  func testDongBoChamKhongXoaGiayDungTrongLucCho() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc, policyJson: Self.polHoc)
    HttpMock.dat { _, _ in Thread.sleep(forTimeInterval: 1.5)
      return HttpMock.json(200, ["mode": "hoc", "cheDo": "chan", "nextCheckSec": 30, "allowedApps": [], "learningApps": []]) }
    defer { HttpMock.dat { _, _ in nil } }
    await b.vongAp()
    let sync = Task { await b.vongDongBo() }
    try await Task.sleep(nanoseconds: 300_000_000)                          // request đang bay
    dongHo.tien(10); await b.vongAp()                                       // Con dùng thêm 10 giây lúc chờ
    await sync.value
    XCTAssertEqual(kho.doc()?.daDungGiayTuSync ?? 0, 10, accuracy: 0.01, "giây dùng lúc request đang bay không bị xoá")
  }

  func testDangGoTuXaVongApKhongApLai() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc, policyJson: Self.polHoc)
    HttpMock.dat { path, _ in
      if path.contains("xong") { Thread.sleep(forTimeInterval: 1.5); return HttpMock.json(200, [:]) }
      return HttpMock.json(200, ["mode": "hoc", "cheDo": "chan", "nextCheckSec": 30, "lenh": [["id": 7, "loai": "go"]]]) }
    defer { HttpMock.dat { _, _ in nil } }
    let sync = Task { await b.vongDongBo() }
    try await Task.sleep(nanoseconds: 500_000_000)                          // tuGo đang chờ «báo xong»
    fake.tienTrinhTheoUid[501] = [roblox]; fake.conSongPid = [90]
    await b.vongAp()
    XCTAssertEqual(fake.tinHieuDaGui.count, 0, "đang gỡ ⇒ vòng áp không đóng app")
    XCTAssertFalse(((try? String(contentsOfFile: thuMuc + "/hosts", encoding: .utf8)) ?? "").contains("AiiGrow"), "không ghi lại hosts")
    await sync.value
    XCTAssertEqual(fake.soLanChayTrinhGo, 1)
  }

  func testYeuCauLucDangDongBoVanDongBoSom() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let kho = ConfigStore(duongDan: thuMuc + "/config.json")
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501]; fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let api = MayChuGia()                                                   // yeu-cau trả ngay, dong-bo chậm 1 giây — song song như máy chủ thật
    api.dongBoTraVe = .tu(policyMau(mode: "hoc", now: dongHo.thuc), next: 300); api.treDongBo = 1_000_000_000
    let b = BoMay(api: api, heThong: fake, kho: kho, tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed"),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    let sync = Task { await b.vongDongBo() }
    try await Task.sleep(nanoseconds: 300_000_000)
    _ = await b.xuLyIPC(.xinThem(phut: 15, loiNhan: "bài tập"), uidGoi: 501)
    XCTAssertEqual(api.lanYeuCau.count, 1)
    await sync.value
    api.treDongBo = 0
    dongHo.tien(6); await b.vongDongBo()
    XCTAssertEqual(api.lanDongBo.count, 2, "xin lúc đang đồng bộ ⇒ vẫn đồng bộ lại sau ~5 giây, không chờ 300 giây")
  }

  func testDemNguocIPCTheoThoiGianThatGiuaCacVong() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc, policyJson: Self.polKhoa)
    await b.vongAp()
    let d0 = await tt(b).demNguocGiay ?? -1
    dongHo.tien(7)
    let d1 = await tt(b).demNguocGiay ?? -1
    XCTAssertEqual(d0 - d1, 7, "giữa hai vòng áp IPC vẫn đúng theo thời gian trôi")
    for _ in 0..<10 { _ = await tt(b) }
    let d2 = await tt(b).demNguocGiay ?? -1
    XCTAssertEqual(d2, d1, "IPC dồn dập không làm nhanh hơn")
    dongHo.tien(3); await b.vongAp()
    let d3 = await tt(b).demNguocGiay ?? -1
    XCTAssertEqual(d1 - d3, 3)
  }

  func testPidHetCanDongRoiCanLaiPhaiNhanTermTruoc() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc, policyJson: Self.polHoc)
    fake.tienTrinhTheoUid[501] = [roblox]; fake.conSongPid = [90]
    await b.vongAp()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.1), [SIGTERM])
    fake.tienTrinhTheoUid[501] = []                                    // hết cần đóng (app đã thoát khỏi danh sách)
    dongHo.tien(5); await b.vongAp()
    fake.tienTrinhTheoUid[501] = [roblox]                             // pid cũ lại cần đóng
    dongHo.tien(5); await b.vongAp()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.1), [SIGTERM, SIGTERM], "lần cần đóng mới ⇒ TERM trước, không KILL ngay")
    dongHo.tien(5); await b.vongAp()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.1), [SIGTERM, SIGTERM, SIGKILL])
    fake.conSongPid = []; fake.tienTrinhTheoUid[501] = []; dongHo.tien(5); await b.vongAp()     // đã chết ⇒ quên
    fake.conSongPid = [90]; fake.tienTrinhTheoUid[501] = [roblox]; dongHo.tien(5); await b.vongAp()
    XCTAssertEqual(fake.tinHieuDaGui.map(\.1).suffix(1), [SIGTERM])
  }

  func testTuGoRoiGhepTrangThaiDaGhepTrueNgay() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, _) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    fake.uidTheoTen = ["be": 501, "ba": 502]; fake.admin = ["ba"]
    var go = true
    HttpMock.dat { path, _ in
      if path.hasSuffix("dong-bo") {
        return HttpMock.json(200, ["mode": "tu_do", "nextCheckSec": 30, "lenh": go ? [["id": 1, "loai": "go"]] : [],
          "windows": ["mode": "tu_do", "cheDo": "chan", "nextCheckSec": 30, "serverTime": NgayGio.viet(dongHo.thuc), "web": ["cheDo": "mo", "chan": [], "cho": []]]])
      }
      if path.hasSuffix("ghep") { return HttpMock.json(200, ["deviceId": "d2", "token": "t2", "childName": "Bé"]) }
      return HttpMock.json(200, [:])
    }
    defer { HttpMock.dat { _, _ in nil } }
    await b.motVong()
    let a = await tt(b)
    XCTAssertFalse(a.daGhep, "sau tuGo: chưa ghép")
    go = false
    let kq = await b.xuLyIPC(.ghep(ma: "123456", taiKhoanCon: "be"), uidGoi: 502)
    guard case .ok = kq else { return XCTFail("ghep ok: \(kq)") }
    let c = await tt(b)
    XCTAssertTrue(c.daGhep, "ghép lại xong ⇒ .trangThai daGhep=true ngay, không chờ vòng áp")
  }

  func testGoCaiXoaNhanLaunchctlCuoiTapLenh() throws {
    let s = try String(contentsOfFile: Self.goiDir + "/go-cai.sh", encoding: .utf8)
    XCTAssertTrue(s.contains("remove vn.aiilab.aiigrow.go"))
    XCTAssertTrue(s.trimmingCharacters(in: .whitespacesAndNewlines).hasSuffix("|| true"), "lệnh remove là việc cuối cùng")
    for f in ["preinstall", "postinstall"] {
      let t = try String(contentsOfFile: Self.goiDir + "/scripts/" + f, encoding: .utf8)
      XCTAssertTrue(t.contains("remove vn.aiilab.aiigrow.go"), f)
      XCTAssertTrue(t.contains("grep -q '\"PID\"'"), "\(f): chỉ gỡ nhãn go khi job đã xong")
    }
    XCTAssertEqual(HeThongMac.nhanTrinhGo, "vn.aiilab.aiigrow.go")
    // ngắt trước khi gỡ thật ⇒ trả dấu da-go; tới đoạn gỡ thật thì bỏ trap; chờ cập nhật có báo + cảnh báo khi quá 5 phút
    let tr = s.range(of: "trap '/bin/rm -f \"$DA_GO\"")!, bo = s.range(of: "trap - INT TERM HUP")!, out = s.range(of: "bootout system/vn.aiilab.aiigrow.daemon")!
    XCTAssertTrue(tr.lowerBound < bo.lowerBound && bo.lowerBound < out.lowerBound)
    XCTAssertTrue(s.contains("đang tự cập nhật — chờ") && s.contains("quá 5 phút"))
  }

  static var goiDir: String { URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().path + "/goi" }
}
