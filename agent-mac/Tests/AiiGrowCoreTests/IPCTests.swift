import XCTest
@testable import AiiGrowCore

final class IPCTests: XCTestCase {
  func testKhuHoiYeuCau() throws {
    let y = YeuCauTray.xinThem(phut: 30, loiNhan: "con làm xong bài rồi")
    let d = try IPCMa.encoder.encode(y)
    XCTAssertEqual(try IPCMa.decoder.decode(YeuCauTray.self, from: d), y)
  }
}
