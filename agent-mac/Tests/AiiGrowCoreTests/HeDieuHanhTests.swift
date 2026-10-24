// Test trên HỆ ĐIỀU HÀNH THẬT — chỉ ĐỌC, hoặc chỉ tác động lên thứ test tự tạo (tiến trình sleep tự spawn, tệp plist thư mục tạm).
// KHÔNG sudo, KHÔNG ghi /etc/hosts hay /Library, KHÔNG kill tiến trình nào ngoài cái test tự tạo.
import XCTest
@testable import AiiGrowCore

final class HeDieuHanhTests: XCTestCase {

  /// Liệt kê tiến trình thật của uid hiện tại và map ra bundle id.
  func testLietKeTienTrinhThatVaBundleId() throws {
    let he = HeThongMac()
    let ds = he.tienTrinh(cuaUid: getuid())
    XCTAssertFalse(ds.isEmpty, "phải thấy tiến trình của chính mình")
    XCTAssertTrue(ds.contains { $0.pid == getpid() }, "có tiến trình test trong danh sách")
    // Finder (nếu đang chạy — phiên đồ hoạ) ⇒ bundle id com.apple.finder.
    if let finder = ds.first(where: { ($0.duongDanApp ?? "").hasSuffix("Finder.app") }) {
      XCTAssertEqual(finder.bundleId, "com.apple.finder")
    } else {
      // headless / không có phiên đồ hoạ: ít nhất map được một .app bất kỳ ra bundle id
      if let coApp = ds.first(where: { $0.duongDanApp != nil }) {
        XCTAssertNotNil(coApp.bundleId, "app \(coApp.duongDanApp!) phải ra bundle id")
      }
    }
  }

  /// getpeereid thật qua socket: handler nhận đúng uid của người gọi (= chính test).
  func testGetpeereidThatQuaSocket() throws {
    let duong = NSTemporaryDirectory() + "aiigrow-peer-\(UUID().uuidString).sock"
    final class Hop: @unchecked Sendable { var uid: UInt32? }
    let hop = Hop()
    let s = SocketIPC(duongDan: duong) { _, uid in hop.uid = uid; return .ok(id: nil) }
    try s.mo()
    let xong = expectation(description: "phục vụ")
    Task { await s.phucVu(); xong.fulfill() }
    _ = try SocketTest.gui(.trangThai, duongDan: duong)
    // chờ handler ghi uid
    for _ in 0..<50 { if hop.uid != nil { break }; usleep(10_000) }
    XCTAssertEqual(hop.uid, getuid(), "getpeereid trả đúng uid người gọi")
    s.dong()
    wait(for: [xong], timeout: 2)
  }

  /// Tự spawn /bin/sleep 300 rồi cho đường đóng app thật kill đúng PID đó (và chỉ PID đó).
  func testDongAppThatKillDungPid() throws {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/sleep")
    p.arguments = ["300"]
    try p.run()
    let pid = p.processIdentifier
    let he = HeThongMac()
    XCTAssertTrue(he.conSong(pid: pid), "sleep vừa spawn phải còn sống")
    he.guiTinHieu(pid: pid, tinHieu: SIGTERM)
    for _ in 0..<200 { if !he.conSong(pid: pid) { break }; usleep(10_000) }
    p.waitUntilExit()
    XCTAssertFalse(he.conSong(pid: pid), "đã kill đúng pid \(pid)")
  }

  /// plutil -lint plist chính sách trình duyệt sinh ra (ghi thư mục tạm, KHÔNG /Library).
  func testPlistChinhSachHopLeQuaPlutil() throws {
    let web = ChinhSachWeb(cheDo: ChinhSachWeb.mo, chan: ["youtube.com", "game.vn"], cho: ["hoc.edu.vn"])
    let td = ChinhSachTrinhDuyet.tatCa.first { $0.ten == "Chrome" }!
    let d = ChinhSachTrinhDuyet.gop(cu: nil, trinhDuyet: td, p: web, mayChuHost: "aiigrow.aiilab.vn")!
    let data = try ChinhSachTrinhDuyet.maHoa(d)
    let tep = NSTemporaryDirectory() + "aiigrow-\(UUID().uuidString).plist"
    defer { try? FileManager.default.removeItem(atPath: tep) }
    try data.write(to: URL(fileURLWithPath: tep))
    let (ma, ra) = HeThongMac.chay("/usr/bin/plutil", ["-lint", tep])
    XCTAssertEqual(ma, 0, "plutil -lint phải báo OK: \(ra)")
    XCTAssertTrue(ra.contains("OK"))
  }

  /// Đọc dscl danh sách user — có tài khoản đang chạy test.
  func testDocDanhSachUserQuaDscl() throws {
    let he = HeThongMac()
    let ds = he.dsNguoiDung()
    XCTAssertFalse(ds.isEmpty, "dscl phải trả ít nhất một user thường")
    XCTAssertTrue(ds.contains { $0.ten == NSUserName() }, "có tài khoản đang chạy test")
    // uid khớp getpwnam
    XCTAssertEqual(he.uid(cuaTaiKhoan: NSUserName()), getuid())
  }
}
