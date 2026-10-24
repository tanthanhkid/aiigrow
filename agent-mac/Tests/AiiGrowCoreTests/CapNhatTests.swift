// Tự cập nhật: so bản, luật URL/chuyển hướng, sha256, chữ ký, không cài khi đang gỡ, IPC capNhat từ uid Con bị từ chối.
import XCTest
@testable import AiiGrowCore

final class CapNhatTests: XCTestCase {
  let may = "https://aiigrow.aiilab.vn"
  let thuMuc = "/gia/cap-nhat"
  let noiDung = Data("noi dung goi pkg gia".utf8)
  var fake: HeThongGia!

  override func setUp() { fake = HeThongGia() }
  override func tearDown() { HttpMock.dat { _, _ in nil } }

  /// Máy chủ giả: manifest (version/url/sha) + tệp gói; `soLanTai` đếm lượt tải.
  private func datMayChu(version: String = "0.1.2", url: String? = nil, sha: String? = nil, goi: Data? = nil) {
    let u = url ?? "\(may)/tai/AiiGrow-\(version).pkg"
    let s = sha ?? LuatCapNhat.sha256Hex(noiDung)
    let g = goi ?? noiDung
    HttpMock.dat { path, _ in
      if path == "api/agent/ban-moi" { return HttpMock.json(200, ["version": version, "url": u, "sha256": s]) }
      if path.hasPrefix("tai/") { return .init(ma: 200, than: g) }
      return nil
    }
  }

  private func boCapNhat(hienTai: String = "0.1.1") -> BoCapNhat {
    let api = ApiClient(mayChu: may, token: nil, session: HttpMock.session())
    return BoCapNhat(api: api, heThong: fake, mayChu: { [may] in may }, session: HttpMock.session(), thuMuc: thuMuc, banHienTai: hienTai)
  }

  private func chay(_ b: BoCapNhat, dangGo: Bool = false) async -> KetQuaCapNhat {
    let kq = await b.batDau(dangGo: { dangGo })
    await b.choXong()
    return kq
  }

  private func daTai() -> Bool { HttpMock.daGoi.contains { $0.path.hasPrefix("tai/") } }

  // MARK: so bản + luật thuần

  func testSoBanTheoSo() {
    XCTAssertTrue(LuatCapNhat.laBanMoiHon("0.1.2", "0.1.1"))
    XCTAssertTrue(LuatCapNhat.laBanMoiHon("0.1.10", "0.1.9"), "so theo số, không theo chữ")
    XCTAssertTrue(LuatCapNhat.laBanMoiHon("1.0.0", "0.9.9"))
    XCTAssertFalse(LuatCapNhat.laBanMoiHon("0.1.1", "0.1.1"))
    XCTAssertFalse(LuatCapNhat.laBanMoiHon("0.1.0", "0.1.1"))
    XCTAssertFalse(LuatCapNhat.laBanMoiHon("0.1", "0.0.1"), "sai dạng ⇒ không cập nhật")
    XCTAssertFalse(LuatCapNhat.laBanMoiHon("0.2.x", "0.1.1"))
    XCTAssertFalse(LuatCapNhat.laBanMoiHon("0.2.0-beta", "0.1.1"))
    XCTAssertFalse(LuatCapNhat.laBanMoiHon("0.2.-1", "0.1.1"))
  }

  func testUrlGoiPhaiHttpsVaDungHost() {
    XCTAssertTrue(LuatCapNhat.urlGoiHopLe("https://aiigrow.aiilab.vn/tai/AiiGrow-0.1.2.pkg", mayChu: may))
    XCTAssertFalse(LuatCapNhat.urlGoiHopLe("http://aiigrow.aiilab.vn/tai/a.pkg", mayChu: may), "http")
    XCTAssertFalse(LuatCapNhat.urlGoiHopLe("https://evil.example.com/a.pkg", mayChu: may), "host lạ")
    XCTAssertFalse(LuatCapNhat.urlGoiHopLe("https://aiigrow.aiilab.vn.evil.com/a.pkg", mayChu: may), "host giả đuôi")
    XCTAssertFalse(LuatCapNhat.urlGoiHopLe("https://aiigrow.aiilab.vn@evil.com/a.pkg", mayChu: may), "userinfo")
    XCTAssertFalse(LuatCapNhat.urlGoiHopLe("file:///tmp/a.pkg", mayChu: may))
  }

  func testChuyenHuongChiToiGithub() {
    func ok(_ s: String) -> Bool { LuatCapNhat.choPhepChuyenHuong(URL(string: s), mayChu: may) }
    XCTAssertTrue(ok("https://github.com/tanthanhkid/aiigrow-tai/releases/download/mac-0.1.2/AiiGrow-0.1.2.pkg"))
    XCTAssertTrue(ok("https://release-assets.githubusercontent.com/x"))
    XCTAssertTrue(ok("https://objects.githubusercontent.com/x"))
    XCTAssertTrue(ok("https://aiigrow.aiilab.vn/tai/x"))
    XCTAssertFalse(ok("http://github.com/x"), "http")
    XCTAssertFalse(ok("https://evil.com/x"))
    XCTAssertFalse(ok("https://githubusercontent.com.evil.com/x"))
    XCTAssertFalse(ok("https://notgithub.com/x"))
    XCTAssertFalse(ok("https://github.com@evil.com/x"))
  }

  func testDelegateChanChuyenHuongLa() {
    let d = ChuyenHuongAnToan(mayChu: may)
    let tac = URLSession.shared.dataTask(with: URL(string: may + "/tai/a.pkg")!)
    func thu(_ s: String) -> Bool {
      let resp = HTTPURLResponse(url: URL(string: may)!, statusCode: 302, httpVersion: nil, headerFields: nil)!
      var chap = false
      d.urlSession(.shared, task: tac, willPerformHTTPRedirection: resp, newRequest: URLRequest(url: URL(string: s)!)) { chap = $0 != nil }
      return chap
    }
    XCTAssertTrue(thu("https://github.com/a/b"))
    XCTAssertFalse(thu("https://evil.com/a"))
    XCTAssertFalse(thu("http://github.com/a"))
  }

  func testChuKyPkgutil() {
    XCTAssertTrue(LuatCapNhat.chuKyDung(HeThongGia.chuKyDungMau))
    XCTAssertFalse(LuatCapNhat.chuKyDung("Package \"x.pkg\":\n   Status: no signature"))
    XCTAssertFalse(LuatCapNhat.chuKyDung(HeThongGia.chuKyDungMau.replacingOccurrences(of: "ADUL7HT969", with: "AAAAAAAAAA")), "sai Team ID")
    XCTAssertFalse(LuatCapNhat.chuKyDung(HeThongGia.chuKyDungMau.replacingOccurrences(of: "Developer ID Installer", with: "Developer ID Application")))
    XCTAssertFalse(LuatCapNhat.chuKyDung(HeThongGia.chuKyDungMau.replacingOccurrences(of: "signed by a developer certificate issued by Apple", with: "signed by a certificate that cannot be verified")))
  }

  // MARK: luồng

  func testBanBangHoacNhoHonKhongTai() async {
    for v in ["0.1.1", "0.1.0"] {
      datMayChu(version: v)
      let kq = await chay(boCapNhat())
      XCTAssertEqual(kq, .laMoiNhat("0.1.1"))
      XCTAssertFalse(daTai(), "bản \(v) ≤ 0.1.1 ⇒ không tải")
      XCTAssertTrue(fake.daCaiGoi.isEmpty)
    }
    XCTAssertEqual(KetQuaCapNhat.laMoiNhat("0.1.1").chu, "Đang là bản mới nhất (0.1.1)")
  }

  func testBanMoiTaiKiemRoiCai() async {
    datMayChu()
    let kq = await chay(boCapNhat())
    XCTAssertEqual(kq, .dangTai("0.1.2"))
    XCTAssertEqual(kq.chu, "Đang tải bản 0.1.2…")
    XCTAssertEqual(fake.daCaiGoi, [thuMuc + "/AiiGrow-0.1.2.pkg"])
    XCTAssertEqual(fake.daTaoThuMuc, [thuMuc])
    XCTAssertEqual(fake.tep[thuMuc + "/AiiGrow-0.1.2.pkg"], noiDung)
  }

  func testUrlHttpHoacHostLaKhongTai() async {
    for u in ["http://aiigrow.aiilab.vn/tai/a.pkg", "https://evil.example.com/tai/a.pkg"] {
      datMayChu(url: u)
      let kq = await chay(boCapNhat())
      guard case .loi = kq else { return XCTFail("phải lỗi: \(kq)") }
      XCTAssertFalse(daTai()); XCTAssertTrue(fake.daCaiGoi.isEmpty)
    }
  }

  func testShaSaiKhongCaiVaXoaTep() async {
    datMayChu(sha: String(repeating: "a", count: 64))
    _ = await chay(boCapNhat())
    XCTAssertTrue(daTai())
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertNil(fake.tep[thuMuc + "/AiiGrow-0.1.2.pkg"])
    XCTAssertTrue(fake.log.contains { $0.contains("sha256 lệch") })
  }

  func testShaManifestSaiDangKhongTai() async {
    datMayChu(sha: "xyz")
    let kq = await chay(boCapNhat())
    guard case .loi = kq else { return XCTFail() }
    XCTAssertFalse(daTai())
  }

  func testChuKySaiKhongCai() async {
    datMayChu()
    fake.pkgutilRa = (0, "Package \"a.pkg\":\n   Status: no signature")
    _ = await chay(boCapNhat())
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertNil(fake.tep[thuMuc + "/AiiGrow-0.1.2.pkg"], "gói chữ ký sai bị xoá")
    XCTAssertTrue(fake.log.contains { $0.contains("chữ ký gói sai") })
  }

  func testPkgutilLoiHoacSpctlTuChoiKhongCai() async {
    datMayChu()
    fake.pkgutilRa = (1, HeThongGia.chuKyDungMau)
    _ = await chay(boCapNhat())
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    fake.pkgutilRa = (0, HeThongGia.chuKyDungMau); fake.spctlRa = (3, "rejected")
    _ = await chay(boCapNhat())
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertTrue(fake.log.contains { $0.contains("spctl từ chối") })
  }

  func testDangGoKhongTaiKhongCai() async {
    datMayChu()
    let kq = await chay(boCapNhat(), dangGo: true)
    guard case .loi = kq else { return XCTFail() }
    XCTAssertFalse(daTai()); XCTAssertTrue(fake.daCaiGoi.isEmpty)
  }

  func testDangGoXayRaGiuaChungKhongCai() async {
    datMayChu()
    final class Co: @unchecked Sendable { var goi = 0 }
    let co = Co()
    let b = boCapNhat()
    // lần hỏi thứ nhất (đầu batDau) chưa gỡ, lần cuối (trước khi cài) đã gỡ
    let kq = await b.batDau(dangGo: { co.goi += 1; return co.goi >= 2 })
    await b.choXong()
    XCTAssertEqual(kq, .dangTai("0.1.2"))
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
  }

  func testKhongChayChong() async {
    datMayChu()
    let b = boCapNhat()
    let a = await b.batDau(dangGo: { false })
    let c = await b.batDau(dangGo: { false })
    XCTAssertEqual(a, .dangTai("0.1.2"))
    XCTAssertEqual(c, .dangBan)
    await b.choXong()
    XCTAssertEqual(fake.daCaiGoi.count, 1)
  }

  func testLoiMangKhongSap() async {
    HttpMock.dat { _, _ in nil }
    let kq = await chay(boCapNhat())
    guard case .loi = kq else { return XCTFail() }
    let lai = await boCapNhat().batDau(dangGo: { false })           // cờ chống chồng được nhả sau lỗi
    XCTAssertNotEqual(lai, .dangBan)
  }

  // MARK: IPC

  func testIPCCapNhatTuUidConBiTuChoi() {
    let con: UInt32 = 501, admin: UInt32 = 502
    let laAdmin: (UInt32) -> Bool = { $0 == admin || $0 == 0 }
    XCTAssertEqual(QuyenIPC.kiem(.capNhat, uidGoi: admin, uidCon: con, daGhep: true, laAdmin: laAdmin), .duoc)
    XCTAssertEqual(QuyenIPC.kiem(.capNhat, uidGoi: admin, uidCon: nil, daGhep: false, laAdmin: laAdmin), .duoc, "chưa ghép vẫn kiểm được (manifest công khai)")
    if case .duoc = QuyenIPC.kiem(.capNhat, uidGoi: con, uidCon: con, daGhep: true, laAdmin: laAdmin) { XCTFail("Con gọi phải bị từ chối") }
    if case .duoc = QuyenIPC.kiem(.capNhat, uidGoi: con, uidCon: con, daGhep: true, laAdmin: { _ in true }) { XCTFail("Con dù là admin cũng bị từ chối") }
    if case .duoc = QuyenIPC.kiem(.capNhat, uidGoi: 503, uidCon: con, daGhep: true, laAdmin: laAdmin) { XCTFail("không phải admin") }
  }

  func testBoMayXuLyIPCCapNhatQuaUid() async throws {
    let thu = NSTemporaryDirectory() + "aiigrow-cn-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: thu, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(atPath: thu) }
    let kho = ConfigStore(duongDan: thu + "/config.json")
    try kho.sua { $0.token = "tok"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501, "ba": 502]; fake.admin = ["ba"]
    datMayChu(version: "0.1.1")
    let api = ApiClient(mayChu: may, token: "tok", session: HttpMock.session())
    let b = BoMay(api: api, heThong: fake, kho: kho, capNhat: BoCapNhat(api: api, heThong: fake, mayChu: { [may] in may }, session: HttpMock.session(), thuMuc: thuMuc, banHienTai: "0.1.1"))
    let tCon = await b.xuLyIPC(.capNhat, uidGoi: 501)
    guard case .loi(let ma, _) = tCon else { return XCTFail("\(tCon)") }
    XCTAssertEqual(ma, "can_admin")
    XCTAssertFalse(HttpMock.daGoi.contains { $0.path == "api/agent/ban-moi" }, "Con gọi không được làm daemon hỏi máy chủ")
    let tAdmin = await b.xuLyIPC(.capNhat, uidGoi: 502)
    XCTAssertEqual(tAdmin, .thongBao(chu: "Đang là bản mới nhất (0.1.1)"))
  }

  func testIPCKhuHoiCapNhat() throws {
    let d = try IPCMa.encoder.encode(YeuCauTray.capNhat)
    XCTAssertEqual(try IPCMa.decoder.decode(YeuCauTray.self, from: d), .capNhat)
    let t = try IPCMa.encoder.encode(TraLoi.thongBao(chu: "x"))
    XCTAssertEqual(try IPCMa.decoder.decode(TraLoi.self, from: t), .thongBao(chu: "x"))
  }

  func testPhienBanHienTai() { XCTAssertEqual(PhienBan.hienTai, "0.1.1") }
}
