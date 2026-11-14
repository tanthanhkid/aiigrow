// 14/11 (docs/thiet-ke-chot/DOI-1411.md) — «Giỏi lắm! N ngày liền» (con-ngay-thuong 25, ngang agent-win Khop1411Tests).
import XCTest
@testable import AiiGrowCore

final class Khop1411Tests: XCTestCase {
  /// 7 ô kết thúc ở Thứ Ba 2026-11-03 (như màn Hôm nay của thiết kế): T4 T5 T6 T7 CN T2 Nay.
  func chuoi(_ soNgay: Int, _ co: [Bool]) -> HvChuoi {
    let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = TimeZone(identifier: "UTC")
    let goc = f.date(from: "2026-11-03")!
    return HvChuoi(soNgay: soNgay, tuan: (0..<7).map { i in
      HvNgayChuoi(ngay: f.string(from: goc.addingTimeInterval(Double(i - 6) * 86400)), thu: (2 + 7 + i - 6) % 7, co: co[i])
    })
  }

  func testChiHienKhiTuHaiNgayHomNayCoViecMoiNgayMotLan() {
    let c = chuoi(5, [false, false, true, true, true, true, true])
    XCTAssertTrue(ChuoiView.nenHien(c, daHienNgay: nil))
    XCTAssertFalse(ChuoiView.nenHien(c, daHienNgay: "2026-11-03"), "đã hiện hôm nay")
    XCTAssertTrue(ChuoiView.nenHien(c, daHienNgay: "2026-11-02"))
    XCTAssertFalse(ChuoiView.nenHien(chuoi(1, [false, false, false, false, false, false, true]), daHienNgay: nil), "chuỗi 1 ngày: chưa chúc")
    XCTAssertFalse(ChuoiView.nenHien(chuoi(4, [false, false, true, true, true, true, false]), daHienNgay: nil), "hôm nay chưa có việc được duyệt")
    XCTAssertFalse(ChuoiView.nenHien(nil, daHienNgay: nil), "máy chủ cũ không gửi chuỗi")
  }

  func testTenThuDongPhuVaCap() {
    let c = chuoi(5, [false, false, true, true, true, true, true])
    XCTAssertEqual(c.tuan.enumerated().map { ChuoiView.thu($0.element, homNay: $0.offset == 6) }, ["T4", "T5", "T6", "T7", "CN", "T2", "Nay"])
    XCTAssertEqual(ChuoiView.phu(5), "Làm đủ việc mỗi ngày · thêm 2 ngày nữa là tròn tuần")
    XCTAssertEqual(ChuoiView.phu(7), "Làm đủ việc mỗi ngày · tròn 1 tuần rồi!")
    var cap = HvCapDo(); cap.cap = 3
    XCTAssertTrue(ChuoiView.moiLenCap(cap, tongKiem: 305, vuaCong: 10))
    XCTAssertFalse(ChuoiView.moiLenCap(cap, tongKiem: 320, vuaCong: 10), "đã ở cấp 3 từ trước")
    cap.cap = 1
    XCTAssertFalse(ChuoiView.moiLenCap(cap, tongKiem: 50, vuaCong: 10))
    XCTAssertEqual(ChuoiView.saoTrongTin("Ba Mẹ duyệt «Dọn phòng» · +20 sao"), 20)
    XCTAssertEqual(ChuoiView.saoTrongTin("Ba Mẹ duyệt «Dọn phòng»"), 0)
  }

  func testTongQuanDocChuoi() throws {
    let json = #"{"con":{"id":"c1","ten":"Bảo Anh"},"soDu":40,"tongKiem":305,"capDo":{"cap":3,"diemCapSau":600,"conThieu":295},"chuoi":{"soNgay":5,"tuan":[{"ngay":"2026-10-28","thu":3,"co":false,"bang":true},{"ngay":"2026-11-03","thu":2,"co":true,"bang":false}]}}"#
    let t = try XCTUnwrap(HvTongQuan.doc(Data(json.utf8)))
    XCTAssertEqual(t.chuoi?.soNgay, 5)
    XCTAssertEqual(t.chuoi?.tuan.count, 2)
    XCTAssertEqual(t.chuoi?.tuan[0].bang, true)
    XCTAssertEqual(t.chuoi?.tuan[1].co, true)
    XCTAssertNil(HvTongQuan.doc(Data(#"{"soDu":1}"#.utf8))?.chuoi)
  }
}
