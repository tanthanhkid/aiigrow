// #339 (17/11): màn chọn tên đang mở tự cập nhật khi Ba Mẹ đổi gán máy (hoSoSeq của daemon), bé đang nhập PIN bị bỏ gán ⇒ về lưới tên.
import XCTest
import AiiGrowCore
@testable import AiiGrowTray

@MainActor
final class ChonTenDoiGanTests: XCTestCase {
  private func json(_ ds: [(String, String)]) -> String {
    var h = HoSoMay(); h.con = ds.map { HoSoBe(id: $0.0, ten: $0.1, coPin: true) }
    return String(decoding: try! IPCMa.encoder.encode(h), as: UTF8.self)
  }

  func testHoSoSeqDoiThiTaiLaiVaBeBiBoGanVeLuoiTen() async throws {
    var tra = json([("c1", "Bảo Anh"), ("c2", "Bảo Minh")])
    var lanTai = 0
    let m = ChonTenModel(goi: { yc in
      if case .hoSo = yc { lanTai += 1; return .duLieu(json: tra) }
      return .loi(ma: "x", chu: "")
    })
    await m.tai()
    XCTAssertEqual(m.dsBe.map(\.id), ["c1", "c2"])
    XCTAssertFalse(m.nhanHoSoSeq(nil), "daemon cũ: không làm gì")
    XCTAssertFalse(m.nhanHoSoSeq(3), "lần đầu chỉ ghi nhận")
    XCTAssertFalse(m.nhanHoSoSeq(3))
    // Ba Mẹ gán thêm Bảo Châu trong lúc màn chọn tên đang mở
    tra = json([("c1", "Bảo Anh"), ("c2", "Bảo Minh"), ("c3", "Bảo Châu")])
    XCTAssertTrue(m.nhanHoSoSeq(4))
    for _ in 0..<50 where m.dsBe.count < 3 { try await Task.sleep(nanoseconds: 20_000_000) }
    XCTAssertEqual(m.dsBe.map(\.ten), ["Bảo Anh", "Bảo Minh", "Bảo Châu"])
    XCTAssertEqual(lanTai, 2)
    // bé đang nhập PIN bị bỏ gán ⇒ về lưới tên kèm câu nhắc
    m.buoc = .pin(m.dsBe[0])
    tra = json([("c2", "Bảo Minh"), ("c3", "Bảo Châu")])
    await m.tai()
    XCTAssertEqual(m.buoc, .chonTen)
    XCTAssertEqual(m.cau, ChonTenModel.khongThayBe)
    // bé khác vẫn trong danh sách ⇒ giữ bước PIN
    m.buoc = .pin(m.dsBe[0]); m.cau = nil
    await m.tai()
    XCTAssertEqual(m.buoc, .pin(m.dsBe[0]))
    XCTAssertEqual(ChonTenModel.khongThayTen, "Không thấy tên con?")
  }
}
