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
    XCTAssertLessThan(Date().timeIntervalSince(t0), 0.5, "doc không chặn")
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
    // gửi mỗi 0,8 giây một byte (không bao giờ có «\n») — nếu timeout reset theo byte thì giữ mãi
    var bi = false
    for _ in 0..<8 {
      var c: UInt8 = 0x20
      if write(fd, &c, 1) <= 0 { bi = true; break }
      usleep(800_000)
      if Date().timeIntervalSince(t0) > 5 { break }
    }
    XCTAssertTrue(bi || Date().timeIntervalSince(t0) < 5.5)
    var b = [UInt8](repeating: 0, count: 64)
    var tv = timeval(tv_sec: 1, tv_usec: 0)
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))
    let n = read(fd, &b, 64)        // server đã đóng ở ~3 giây (có thể kèm lời báo lỗi trước)
    XCTAssertTrue(n >= 0, "kết nối phải đã bị đóng, không còn treo (n=\(n))")
    XCTAssertTrue(bi || n >= 0)
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
}
