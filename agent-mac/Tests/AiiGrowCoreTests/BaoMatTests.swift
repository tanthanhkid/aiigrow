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

  private func dungBoMay(_ fake: HeThongGia, dongHo: DongHoGia, thuMuc: String) throws -> (BoMay, ConfigStore) {
    let kho = ConfigStore(duongDan: thuMuc + "/config.json")
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
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
}
