// Giới hạn giờ chơi 16/11 (#302 mục 4): đọc khối `gioiHan` + `sao.saoTieuDuoc` (thiếu ⇒ nil, y như máy chủ cũ) và chữ khoá.
import XCTest
@testable import AiiGrowCore

final class GioiHanTests: XCTestCase {
  private func json(_ s: String) -> Any? { try? JSONSerialization.jsonObject(with: Data(s.utf8)) }

  func testDocDayDu() {
    let g = GioiHan.doc(json("""
      {"apDung":true,"ngayPhut":60,"daChoi":20,"conNgay":40,"luotPhut":30,"luotDaChoi":30,"conLuot":0,"dangNghi":true,
       "nghiDen":"2026-11-16T08:30:00.000Z","nghiDenGio":"15:30","hetNgay":false,"lyDoKhoa":"dang_nghi","phutToiDa":30,"cau":"Nghỉ một chút · chơi tiếp lúc 15:30"}
      """))
    XCTAssertEqual(g?.ngayPhut, 60); XCTAssertEqual(g?.conNgay, 40); XCTAssertEqual(g?.lyDoKhoa, "dang_nghi")
    XCTAssertEqual(g?.nghiDenGio, "15:30"); XCTAssertNotNil(g?.nghiDen); XCTAssertEqual(g?.dangNghi, true)
  }

  func testThieuHoacNullLaNil() {
    XCTAssertNil(GioiHan.doc(nil)); XCTAssertNil(GioiHan.doc(NSNull())); XCTAssertNil(GioiHan.doc(json("[]")))
    let g = GioiHan.doc(json(#"{"apDung":false,"ngayPhut":null,"lyDoKhoa":null}"#))
    XCTAssertEqual(g?.apDung, false); XCTAssertNil(g?.ngayPhut); XCTAssertNil(g?.lyDoKhoa); XCTAssertNil(g?.chuKhoa(saoThat: 5))
  }

  func testSaoTieuDuocTuyChon() {
    XCTAssertNil(SoSao.doc(json(#"{"sao":10,"phutCon":10}"#))?.saoTieuDuoc, "máy chủ cũ không gửi ⇒ nil")
    let s = SoSao.doc(json(#"{"sao":30,"phutCon":0,"hetSao":true,"saoTieuDuoc":30}"#))
    XCTAssertEqual(s?.saoTieuDuoc, 30); XCTAssertEqual(s?.phutCon, 0); XCTAssertEqual(s?.hetSao, true)
  }

  func testPolicyCodableGiuGioiHanVaMayChuCuKhongCo() throws {
    var p = Policy(); p.gioiHan = GioiHan(ngayPhut: 60, lyDoKhoa: GioiHan.hetNgay, cau: "x")
    let lai = try JSONDecoder().decode(Policy.self, from: JSONEncoder().encode(p))
    XCTAssertEqual(lai.gioiHan?.ngayPhut, 60)
    XCTAssertNil(try JSONDecoder().decode(Policy.self, from: Data("{}".utf8)).gioiHan)
  }

  func testChuKhoa() {
    let nghi = GioiHan(dangNghi: true, nghiDenGio: "15:30", lyDoKhoa: GioiHan.dangNghiMa)
    XCTAssertEqual(nghi.chuKhoa(saoThat: 12), GioiHan.Chu(tieuDe: "Nghỉ một chút", phu: "Nghỉ một chút · chơi tiếp lúc 15:30"))
    XCTAssertEqual(nghi.chuKhoa(saoThat: nil)?.tieuDe, "Nghỉ một chút")
    XCTAssertNil(nghi.chuKhoa(saoThat: 0), "hết sao thật ⇒ giữ «Hết sao rồi»")
    let ngay = GioiHan(ngayPhut: 60, hetNgay: true, lyDoKhoa: GioiHan.hetNgay, cau: "Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé")
    XCTAssertEqual(ngay.chuKhoa(saoThat: 5), GioiHan.Chu(tieuDe: "Hôm nay chơi đủ rồi", phu: "Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé"))
    XCTAssertEqual(GioiHan(ngayPhut: 45, lyDoKhoa: GioiHan.hetNgay).chuKhoa(saoThat: 5)?.phu, "Hôm nay đã chơi đủ 45 phút — mai chơi tiếp nhé")
    XCTAssertNil(GioiHan(lyDoKhoa: nil).chuKhoa(saoThat: 5))
  }

  func testDongConNgay() {
    XCTAssertEqual(GioiHan(conNgay: 25).dongConNgay, "Còn 25 phút hôm nay")
    XCTAssertNil(GioiHan(conNgay: nil).dongConNgay)
    XCTAssertNil(GioiHan(conNgay: 0, lyDoKhoa: GioiHan.hetNgay).dongConNgay)
  }
}
