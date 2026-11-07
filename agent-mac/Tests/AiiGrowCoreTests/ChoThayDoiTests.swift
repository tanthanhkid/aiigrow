// P1 (07/11): «Ba Mẹ bấm ⇒ máy Con áp ≤5 giây» — vòng chờ thay đổi: đọc phản hồi, lùi dần khi lỗi, đổi ⇒ đồng bộ NGAY (không chờ nextCheckSec).
import XCTest
@testable import AiiGrowCore

final class ChoThayDoiTests: XCTestCase {
  func testDocKetQua() {
    XCTAssertEqual(KetQuaCho.doc(Data(#"{"phienBanThayDoi":12,"doi":true}"#.utf8)), KetQuaCho(phienBan: 12, doi: true))
    XCTAssertEqual(KetQuaCho.doc(Data(#"{"phienBanThayDoi":3,"doi":false,"quaTai":true}"#.utf8)), KetQuaCho(phienBan: 3, doi: false, quaTai: true))
    XCTAssertNil(KetQuaCho.doc(Data(#"{"doi":true}"#.utf8)))
    XCTAssertNil(KetQuaCho.doc(Data("không phải json".utf8)))
    XCTAssertEqual(ChoThayDoi.duong(ver: nil), "api/device/cho-thay-doi")
    XCTAssertEqual(ChoThayDoi.duong(ver: 7), "api/device/cho-thay-doi?ver=7")
  }

  func testChoLai() {
    XCTAssertEqual([1, 2, 3, 4, 5, 9].map { ChoThayDoi.choLai(loiLienTiep: $0, kq: nil, daCho: 0) }, [2, 4, 8, 16, 30, 30])
    XCTAssertEqual(ChoThayDoi.choLai(loiLienTiep: 0, kq: KetQuaCho(phienBan: 2, doi: true), daCho: 0.1), 0, "có thay đổi ⇒ vòng lại ngay")
    XCTAssertEqual(ChoThayDoi.choLai(loiLienTiep: 0, kq: KetQuaCho(phienBan: 2, doi: false), daCho: 25), 0, "giữ đủ lâu rồi hết hạn")
    XCTAssertEqual(ChoThayDoi.choLai(loiLienTiep: 0, kq: KetQuaCho(phienBan: 2, doi: false), daCho: 0.3), 5, "trả nhanh mà không đổi ⇒ nghỉ")
    XCTAssertEqual(ChoThayDoi.choLai(loiLienTiep: 0, kq: KetQuaCho(phienBan: 2, doi: false, quaTai: true), daCho: 30), 5)
  }

  func testDoiThiDongBoNgayKhongChoNextCheckSec() async throws {
    let thu = NSTemporaryDirectory() + "aiigrow-cho-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: thu, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(atPath: thu); HttpMock.dat { _, _ in nil } }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let kho = ConfigStore(duongDan: thu + "/config.json")
    try kho.sua { $0.token = "tok"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501]; fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let api = ApiClient(mayChu: "https://aiigrow.aiilab.vn", token: "tok", session: HttpMock.session())
    let b = BoMay(api: api, heThong: fake, kho: kho, tuyChon: TuyChonBoMay(duongDanHosts: thu + "/hosts", thuMucChinhSach: thu + "/Managed"),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    nonisolated(unsafe) var phienBan = 1, doi = false
    HttpMock.dat { path, _ in
      if path == "api/device/cho-thay-doi" { return HttpMock.json(200, ["phienBanThayDoi": phienBan, "doi": doi]) }
      return HttpMock.json(200, ["mode": "tu_do", "nextCheckSec": 300, "lenh": [], "windows": ["mode": "tu_do", "cheDo": "chan", "nextCheckSec": 300,
        "serverTime": NgayGio.viet(dongHo.thuc), "allowedApps": [], "web": ["cheDo": "mo", "chan": [], "cho": []]]])
    }
    await b.vongDongBo()                                             // đồng bộ thường: lần kế sau 300 giây
    let soLanDongBo = { HttpMock.khoa.lock(); defer { HttpMock.khoa.unlock() }; return HttpMock.daGoi.filter { $0.path == "api/device/dong-bo" }.count }
    XCTAssertEqual(soLanDongBo(), 1)
    await b.vongDongBo(); XCTAssertEqual(soLanDongBo(), 1, "chưa tới hạn nextCheckSec ⇒ không đồng bộ")
    let nghi1 = await b.vongChoThayDoi()                             // lần đầu: lấy mốc, chưa đổi
    XCTAssertEqual(nghi1, 5); await b.vongDongBo(); XCTAssertEqual(soLanDongBo(), 1, "lấy mốc không kích đồng bộ")
    phienBan = 2; doi = true                                         // Ba Mẹ bấm khoá máy
    let nghi2 = await b.vongChoThayDoi()
    XCTAssertEqual(nghi2, 0, "có thay đổi ⇒ vòng lại ngay")
    await b.vongDongBo()
    XCTAssertEqual(soLanDongBo(), 2, "đổi ⇒ đồng bộ NGAY dù nextCheckSec=300 chưa tới (đồng hồ không nhúc nhích)")
    // lỗi mạng ⇒ lùi dần; máy chủ cũ 404 ⇒ 300
    HttpMock.dat { _, _ in nil }
    let l1 = await b.vongChoThayDoi(), l2 = await b.vongChoThayDoi()
    XCTAssertEqual([l1, l2], [2, 4])
    HttpMock.dat { _, _ in HttpMock.json(404, ["error": "khong_co_duong", "message": "x"]) }
    let n404 = await b.vongChoThayDoi()
    XCTAssertEqual(n404, 300)
  }
}
