// Ngang các nền (BANG-TINH-NANG-OS mục 5): lịch sử web, log + sự kiện, Safari ở «chỉ cho phép», ghép một chạm, hồ sơ DNS.
import XCTest
import SQLite3
@testable import AiiGrowCore

final class DongBoOSTests: XCTestCase {
  private func thuMucTam() throws -> String {
    let d = NSTemporaryDirectory() + "aiigrow-os-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: d, withIntermediateDirectories: true)
    return d
  }

  func testTenMienGocNhuWindows() {
    XCTAssertEqual(TenMienGoc.tu(url: "https://www.youtube.com/watch?v=1"), "youtube.com")
    XCTAssertEqual(TenMienGoc.tu(url: "https://m.gamek.vn/a"), "gamek.vn")
    XCTAssertEqual(TenMienGoc.tu(url: "https://ebank.hdbank.com.vn/"), "hdbank.com.vn")
    XCTAssertEqual(TenMienGoc.tu(url: "http://news.bbc.co.uk"), "bbc.co.uk")
    XCTAssertNil(TenMienGoc.tu(url: "chrome://settings")); XCTAssertNil(TenMienGoc.tu(url: "http://192.168.1.1/")); XCTAssertNil(TenMienGoc.tu(url: "http://localhost:3000"))
  }

  func testDocChromiumVaSafariRoiGopTheoNgay() throws {
    let tm = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: tm) }
    let now = Date()
    func taoDb(_ p: String, _ sql: [String]) {
      var db: OpaquePointer?
      XCTAssertEqual(sqlite3_open(p, &db), SQLITE_OK)
      for s in sql { XCTAssertEqual(sqlite3_exec(db, s, nil, nil, nil), SQLITE_OK, s) }
      sqlite3_close(db)
    }
    let micro = { (d: Date) in Int64((d.timeIntervalSince1970 + 11_644_473_600) * 1_000_000) }
    taoDb(tm + "/History", ["create table urls(id integer primary key, url text)", "create table visits(id integer primary key, url integer, visit_time integer, visit_duration integer)",
                            "insert into urls values(1,'https://www.youtube.com/a'),(2,'https://vi.wikipedia.org/x')",
                            "insert into visits values(1,1,\(micro(now)),120000000),(2,1,\(micro(now.addingTimeInterval(-60))),30000000),(3,2,\(micro(now)),5000000),(4,2,\(micro(now.addingTimeInterval(-5 * 86_400))),1)"])
    taoDb(tm + "/History.db", ["create table history_items(id integer primary key, url text)", "create table history_visits(id integer primary key, history_item integer, visit_time real)",
                               "insert into history_items values(1,'https://roblox.com/games')", "insert into history_visits values(1,1,\(now.timeIntervalSinceReferenceDate))"])
    let tu = LichSuWeb.mocDoc(now)
    let ds = LichSuWeb.tongHop(LichSuWeb.docChromium(tm + "/History", tu: tu) + LichSuWeb.docSafari(tm + "/History.db", tu: tu))
    let yt = try XCTUnwrap(ds.first { $0.tenMien == "youtube.com" })
    XCTAssertEqual(yt.soLan, 2); XCTAssertEqual(yt.giay, 150)
    XCTAssertEqual(ds.first { $0.tenMien == "wikipedia.org" }?.soLan, 1, "lượt cũ hơn hôm qua bỏ qua")
    XCTAssertEqual(ds.first { $0.tenMien == "roblox.com" }?.soLan, 1)
    XCTAssertTrue(LichSuWeb.docChromium(tm + "/khong-co", tu: tu).isEmpty)
    let than = LichSuWeb.than(ds)["ds"] as? [[String: Any]]
    XCTAssertEqual(Set(than?.first?.keys.map { $0 } ?? []), ["ngay", "tenMien", "soLan", "giay", "lanCuoi"], "chỉ tên miền + đếm, không URL")
    XCTAssertEqual(LichSuWeb.cacTep(nha: "/Users/be", lietKe: { $0.hasSuffix("Google/Chrome") ? ["Default", "Profile 1", "Crashpad"] : [] }).chromium,
                   ["/Users/be/Library/Application Support/Google/Chrome/Default/History", "/Users/be/Library/Application Support/Google/Chrome/Profile 1/History"])
  }

  func testLogVaSuKien() {
    XCTAssertEqual(NhatKyMay.muc("Đồng bộ lỗi (x)"), "loi"); XCTAssertEqual(NhatKyMay.muc("CẢNH BÁO: …"), "canh"); XCTAssertEqual(NhatKyMay.muc("Đã ghép máy"), "tin")
    let b = BoDemLog()
    for i in 0..<1005 { b.them("dòng \(i)") }
    XCTAssertEqual(b.soDong, NhatKyMay.toiDaBoNho)
    let lo = b.lo(); XCTAssertEqual(lo.count, 200); b.daGui(lo.count); XCTAssertEqual(b.soDong, 800)
    var q: [SuKienMay] = []
    for i in 0..<205 { NhatKyMay.them(&q, SuKienMay(loai: "chan_app", luc: Date(), chiTiet: ["i": "\(i)"])) }
    XCTAssertEqual(q.count, 200); XCTAssertEqual(q.first?.chiTiet["i"], "5", "giữ sự kiện MỚI nhất")
  }

  func testSafariChiDongKhiChiChoPhepMaKhongPhaiGioHoc() throws {
    let safari = TienTrinh(pid: 7, uid: 501, duongDan: "/Applications/Safari.app/Contents/MacOS/Safari", bundleId: "com.apple.Safari")
    let chrome = TienTrinh(pid: 8, uid: 501, duongDan: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", bundleId: "com.google.Chrome")
    let chiCho = try PolicyParser.parse(#"{"mode":"tu_do","web":{"cheDo":"chi_cho_phep","chan":[],"cho":["wikipedia.org"],"choKhiMo":[]}}"#)
    XCTAssertEqual(BoMay.safariKhongLocDuoc([safari, chrome], uidCon: 501, p: chiCho, now: Date(), chiAppHoc: false, daCo: []).map(\.pid), [7])
    XCTAssertTrue(BoMay.safariKhongLocDuoc([safari], uidCon: 501, p: chiCho, now: Date(), chiAppHoc: true, daCo: []).isEmpty, "giờ học: canDong đã lo")
    let mo = try PolicyParser.parse(#"{"mode":"tu_do","web":{"cheDo":"mo","chan":["x.com"],"cho":[],"choKhiMo":[]}}"#)
    XCTAssertTrue(BoMay.safariKhongLocDuoc([safari], uidCon: 501, p: mo, now: Date(), chiAppHoc: false, daCo: []).isEmpty, "danh sách đen: hosts chặn được")
  }

  func testGhepMotChamBangTokenGoi() async throws {
    let tm = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: tm) }
    let fake = HeThongGia(), dh = DongHoGia()
    fake.uidTheoTen = ["be": 501, "bame": 502]; fake.admin = ["bame"]
    fake.tep[DuongDan.tokenGoi] = Data("tok_ABCDEFGHIJKLMNOP-123\n".utf8)
    let kho = ConfigStore(duongDan: tm + "/config.json")
    let api = ApiClient(mayChu: "https://aiigrow.aiilab.vn", session: HttpMock.session())
    let b = BoMay(api: api, heThong: fake, kho: kho, tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tuCapNhat: false),
                  dongHo: { dh.thuc }, donDieu: { dh.donDieu })
    guard case .trangThai(let t) = await b.xuLyIPC(.trangThai, uidGoi: 502) else { return XCTFail() }
    XCTAssertEqual(t.coGoiCai, true)
    HttpMock.dat { path, _ in path == "api/device/ghep-goi" ? HttpMock.json(200, ["deviceId": "d9", "token": "t9", "childName": "Bi"]) : HttpMock.json(404, [:]) }
    try await b.ghep(ma: "", taiKhoanCon: "be")
    XCTAssertEqual(HttpMock.lanGoiCuoi("api/device/ghep-goi")?["token"] as? String, "tok_ABCDEFGHIJKLMNOP-123")
    XCTAssertEqual(HttpMock.lanGoiCuoi("api/device/ghep-goi")?["nen"] as? String, "mac")
    XCTAssertNil(fake.tep[DuongDan.tokenGoi], "dùng xong xoá token")
    XCTAssertEqual(kho.doc()?.token, "t9")
  }

  func testTokenGoiHongThiQuayVeMa6So() async throws {
    let tm = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: tm) }
    let fake = HeThongGia(), dh = DongHoGia()
    fake.uidTheoTen = ["be": 501]; fake.admin = ["bame"]
    fake.tep[DuongDan.tokenGoi] = Data("tok_ABCDEFGHIJKLMNOP-123".utf8)
    let b = BoMay(api: ApiClient(mayChu: "https://x", session: HttpMock.session()), heThong: fake, kho: ConfigStore(duongDan: tm + "/c.json"),
                  tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tuCapNhat: false), dongHo: { dh.thuc }, donDieu: { dh.donDieu })
    HttpMock.dat { _, _ in HttpMock.json(409, ["error": "ma_da_dung", "message": "Gói cài này đã dùng rồi"]) }
    do { try await b.ghep(ma: "", taiKhoanCon: "be"); XCTFail() } catch let e as LoiApi { XCTAssertEqual(e.ma, "ma_da_dung") }
    XCTAssertNil(fake.tep[DuongDan.tokenGoi])
    do { try await b.ghep(ma: "", taiKhoanCon: "be"); XCTFail() } catch let e as LoiApi { XCTAssertEqual(e.ma, "thieu_ma") }
  }

  func testGuiLogSuKienKhiCoMang() async throws {
    let tm = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: tm) }
    let fake = HeThongGia(), dh = DongHoGia()
    let kho = ConfigStore(duongDan: tm + "/config.json")
    let pol = try PolicyParser.parse(#"{"mode":"tu_do"}"#)
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be"; $0.policyCuoi = pol
      $0.hangDoiSuKien = [SuKienMay(loai: "chan_app", luc: dh.thuc, ma: "m1")] }
    let log = BoDemLog(); log.them("Đồng bộ lỗi (x)")
    let b = BoMay(api: ApiClient(mayChu: "https://x", token: "t", session: HttpMock.session()), heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tuCapNhat: false), dongHo: { dh.thuc }, donDieu: { dh.donDieu },
                  boDemLog: log)
    HttpMock.dat { _, _ in HttpMock.json(200, ["nhan": 1]) }
    await b.vongNhatKy()
    XCTAssertEqual((HttpMock.lanGoiCuoi("api/device/log")?["ds"] as? [[String: Any]])?.first?["muc"] as? String, "loi")
    XCTAssertEqual((HttpMock.lanGoiCuoi("api/device/su-kien")?["ds"] as? [[String: Any]])?.first?["ma"] as? String, "m1")
    XCTAssertEqual(kho.doc()?.hangDoiSuKien.count, 0); XCTAssertEqual(log.soDong, 0)
    await b.vongNhatKy()
    XCTAssertEqual(HttpMock.daGoi.count, 2, "5 phút mới gửi lại")
  }
}
