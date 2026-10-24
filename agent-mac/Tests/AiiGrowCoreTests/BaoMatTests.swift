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

  func testChonTienCanhBoQuaTrayBaoLech() {
    XCTAssertEqual(TienCanh.chon(thatSu: "com.game", trayBao: "com.apple.calculator", trayConSong: true), "com.game")
    XCTAssertEqual(TienCanh.chon(thatSu: nil, trayBao: "com.apple.calculator", trayConSong: true), DemPhut.khongRo, "không kiểm được ⇒ không tin tray")
    XCTAssertEqual(TienCanh.chon(thatSu: "com.game", trayBao: nil, trayConSong: false), DemPhut.khongRo, "tray tắt ⇒ Không rõ")
  }

  func testNhanDienDuongTray() {
    XCTAssertTrue(NguoiGoiTray.hopLe(duongDan: "/Applications/AiiGrow.app/Contents/MacOS/AiiGrowTray"))
    XCTAssertFalse(NguoiGoiTray.hopLe(duongDan: "/Users/con/Downloads/AiiGrow.app/Contents/MacOS/AiiGrowTray"))
    XCTAssertFalse(NguoiGoiTray.hopLe(duongDan: "/Applications/AiiGrow.app/Contents/MacOS/../../../../tmp/x"))
    XCTAssertFalse(NguoiGoiTray.hopLe(duongDan: nil))
  }

  private func dungBoMay(_ fake: HeThongGia, dongHo: DongHoGia, thuMuc: String, tienTo: String? = NguoiGoiTray.tienTo) throws -> (BoMay, ConfigStore) {
    let kho = ConfigStore(duongDan: thuMuc + "/config.json")
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let api = ApiClient(mayChu: "https://aiigrow.aiilab.vn", token: nil, session: HttpMock.session())
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed", tienToDuongTray: tienTo),
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
      _ = await b.xuLyIPC(.appTienCanh(bundleId: "com.apple.calculator", ten: "Calculator"), uidGoi: 501, pidGoi: 42)
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
    _ = await b.xuLyIPC(.appTienCanh(bundleId: "com.apple.calculator", ten: "C"), uidGoi: 501, pidGoi: 42)
    dongHo.tien(5); _ = await b.apChinhSach()
    let dem = kho.doc()?.demPhut ?? [:]
    XCTAssertTrue(dem.keys.contains { $0.hasSuffix("|" + DemPhut.khongRo) }, "\(dem)")
    XCTAssertFalse(dem.keys.contains { $0.contains("calculator") })
  }

  func testTuChoiAppTienCanhTuTienTrinhKhongPhaiTray() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let (b, kho) = try dungBoMay(fake, dongHo: dongHo, thuMuc: thuMuc)
    fake.tienCanhThat = "com.apple.Pages"
    fake.duongDanTheoPid[77] = "/Users/be/script/gia-mao"
    let r = await b.xuLyIPC(.appTienCanh(bundleId: "x", ten: "X"), uidGoi: 501, pidGoi: 77)
    guard case let .loi(ma, _) = r else { return XCTFail("phải từ chối, nhận \(r)") }
    XCTAssertEqual(ma, "khong_phai_tray")
    let r2 = await b.xuLyIPC(.appTienCanh(bundleId: "x", ten: "X"), uidGoi: 501, pidGoi: nil)
    guard case .loi = r2 else { return XCTFail("không có pid ⇒ từ chối") }
    fake.duongDanTheoPid[78] = NguoiGoiTray.tienTo + "AiiGrowTray"
    let r3 = await b.xuLyIPC(.appTienCanh(bundleId: "x", ten: "X"), uidGoi: 501, pidGoi: 78)
    guard case .ok = r3 else { return XCTFail("tray thật phải được nhận, nhận \(r3)") }
    // trayNhipCuoi chỉ cập nhật cho tray thật
    dongHo.tien(5); _ = await b.apChinhSach()
    XCTAssertTrue((kho.doc()?.demPhut ?? [:]).keys.contains { $0.hasSuffix("|com.apple.pages") })
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
    let s = SocketIPC(duongDan: duong) { _, _, _ in .ok(id: "x") }
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

  func testVuotGioiHanDongThoiThiDongNgay() throws {
    let duong = NSTemporaryDirectory() + "aiigrow-gh-\(UUID().uuidString).sock"
    let s = SocketIPC(duongDan: duong) { _, _, _ in .ok(id: nil) }
    try s.mo()
    let xong = expectation(description: "phục vụ")
    Task { await s.phucVu(); xong.fulfill() }
    var giu: [Int32] = []
    for _ in 0..<SocketIPC.toiDaDongThoi { giu.append(noi(duong)) }
    usleep(300_000)                                          // để vòng accept nhận đủ
    let thua = noi(duong)
    var tv = timeval(tv_sec: 1, tv_usec: 0)
    setsockopt(thua, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))
    var b = [UInt8](repeating: 0, count: 8)
    let t0 = Date()
    let n = read(thua, &b, 8)                                // bị đóng ngay ⇒ EOF (0), không phải timeout (-1)
    XCTAssertEqual(n, 0)
    XCTAssertLessThan(Date().timeIntervalSince(t0), 0.9)
    for f in giu + [thua] { close(f) }
    s.dong()
    wait(for: [xong], timeout: 2)
  }
}
