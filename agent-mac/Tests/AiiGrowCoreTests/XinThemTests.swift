// #422 «Xin thêm app / web»: phần thuần của hộp xin hai thẻ + thân api/device/xin-duyet có `kieu` + IPC mang `ten`.
import XCTest
@testable import AiiGrowCore

final class XinThemTests: XCTestCase {
  private func app(_ muc: String, _ ten: String) -> AppMay { AppMay(khoa: muc, muc: muc, ten: ten, nguon: "applications") }

  func testKieuHopLe() {
    XCTAssertEqual(XinThem.kieuHopLe("app"), "app")
    XCTAssertEqual(XinThem.kieuHopLe(" WEB "), "web")
    XCTAssertNil(XinThem.kieuHopLe("game"))
    XCTAssertNil(XinThem.kieuHopLe(nil))
  }

  func testDsAppBoTrungBoTenRongXepTheoTen() {
    let ds = XinThem.dsApp([app("com.roblox.roblox", "Roblox"), app("org.scratch", "Scratch"), app("com.Roblox.roblox", "Roblox 2"),
                            app("com.x", "  "), app("com.apple.garageband10", "GarageBand"), app("com.mojang.minecraft", "minecraft")])
    XCTAssertEqual(ds.map(\.ten), ["GarageBand", "minecraft", "Roblox", "Scratch"], "trùng bundle id (khác hoa/thường) chỉ giữ một; tên rỗng bỏ")
  }

  func testAppBanDauTheoBundleHoacTen() {
    let ds = [app("com.roblox.roblox", "Roblox"), app("com.google.Chrome", "Google Chrome")]
    XCTAssertEqual(XinThem.appBanDau(ds, "roblox")?.muc, "com.roblox.roblox")
    XCTAssertEqual(XinThem.appBanDau(ds, "com.google.chrome")?.ten, "Google Chrome")
    XCTAssertNil(XinThem.appBanDau(ds, "Minecraft"))
    XCTAssertNil(XinThem.appBanDau(ds, " "))
  }

  func testLoiXinHaiThe() {
    let yt = app("com.google.YouTube", "YouTube")
    XCTAssertEqual(XinThem.loiXin(the: .app, app: yt, web: "x"), XinThem.LoiXin(muc: "com.google.YouTube", ten: "YouTube", kieu: "app"),
                   "chọn từ lưới ⇒ muc = bundle id, ten = tên app")
    XCTAssertNil(XinThem.loiXin(the: .app, app: nil, web: "scratch.mit.edu"), "thẻ app chưa chọn ⇒ chưa gửi được")
    XCTAssertEqual(XinThem.loiXin(the: .app, app: nil, tenTran: " Minecraft ", web: ""), XinThem.LoiXin(muc: "Minecraft", ten: "Minecraft", kieu: "app"))
    XCTAssertEqual(XinThem.loiXin(the: .web, app: yt, web: "  scratch.mit.edu\n"), XinThem.LoiXin(muc: "scratch.mit.edu", ten: nil, kieu: "web"),
                   "thẻ web bỏ qua app đang chọn")
    XCTAssertNil(XinThem.loiXin(the: .web, app: nil, web: "   "))
  }

  func testTenGonCatVaBoKyTuDieuKhien() {
    XCTAssertEqual(XinThem.tenGon("  You\u{0007}Tube\n"), "YouTube")
    XCTAssertNil(XinThem.tenGon("  "))
    XCTAssertEqual(XinThem.tenGon(String(repeating: "a", count: 500))?.count, 100)
    XCTAssertEqual(XinThem.tenHien(muc: "com.google.YouTube", ten: "YouTube"), "YouTube")
    XCTAssertEqual(XinThem.tenHien(muc: "scratch.mit.edu", ten: nil), "scratch.mit.edu")
  }

  func testChuNut() {
    XCTAssertEqual(XinThem.nut(the: .app, tenApp: "YouTube"), "Xin Ba Mẹ thêm YouTube")
    XCTAssertEqual(XinThem.nut(the: .app, tenApp: nil), "Xin Ba Mẹ thêm app")
    XCTAssertEqual(XinThem.nut(the: .web, tenApp: "YouTube"), "Xin Ba Mẹ mở trang này")
  }

  func testThanXinDuyetCoKieuVaTen() async throws {
    HttpMock.dat { _, _ in HttpMock.json(200, ["id": "yc9", "trang_thai": "cho", "daCo": false, "loai": "cai_app", "muc": "com.google.YouTube"]) }
    defer { HttpMock.dat { _, _ in nil } }
    let api = ApiClient(mayChu: "https://a.example", token: "t", session: HttpMock.session())
    let r = try await api.xinDuyet(muc: "com.google.YouTube", ten: "YouTube", lyDo: "con xem vẽ tranh", kieu: "app")
    XCTAssertEqual(r.id, "yc9")
    let b = try XCTUnwrap(HttpMock.lanGoiCuoi("api/device/xin-duyet"))
    XCTAssertEqual(b["muc"] as? String, "com.google.YouTube"); XCTAssertEqual(b["ten"] as? String, "YouTube")
    XCTAssertEqual(b["kieu"] as? String, "app"); XCTAssertEqual(b["lyDo"] as? String, "con xem vẽ tranh")
    _ = try await api.xinDuyet(muc: "scratch.mit.edu", ten: nil, lyDo: nil, kieu: "lạ")
    XCTAssertNil(HttpMock.lanGoiCuoi("api/device/xin-duyet")?["kieu"], "kiểu lạ không gửi")
  }

  func testWebSaiTraMessageMayChu() async {
    HttpMock.dat { _, _ in HttpMock.json(400, ["error": "web_sai", "message": "Gõ địa chỉ trang web, ví dụ scratch.mit.edu"]) }
    defer { HttpMock.dat { _, _ in nil } }
    let api = ApiClient(mayChu: "https://a.example", token: "t", session: HttpMock.session())
    do {
      _ = try await api.xinDuyet(muc: "con muốn chơi", ten: nil, lyDo: nil, kieu: "web")
      XCTFail("phải ném lỗi")
    } catch let e as LoiApi {
      XCTAssertEqual(e.ma, "web_sai"); XCTAssertEqual(e.chu, "Gõ địa chỉ trang web, ví dụ scratch.mit.edu")
    } catch { XCTFail("\(error)") }
  }

  func testIPCXinMoMangTenVaTrayCuVanDoc() throws {
    let yc = YeuCauTray.xinMo(muc: "com.google.YouTube", loai: "app", loiNhan: nil, ten: "YouTube")
    XCTAssertEqual(try JSONDecoder().decode(YeuCauTray.self, from: JSONEncoder().encode(yc)), yc)
    let cu = try JSONEncoder().encode(YeuCauTray.xinMo(muc: "YouTube", loai: "app", loiNhan: nil))
    guard case let .xinMo(muc, _, _, ten) = try JSONDecoder().decode(YeuCauTray.self, from: cu) else { return XCTFail() }
    XCTAssertEqual(muc, "YouTube"); XCTAssertNil(ten)
  }
}
