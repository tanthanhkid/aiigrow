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

  var gio = Date(timeIntervalSince1970: 1_760_000_000)
  private func boCapNhat(hienTai: String = "0.1.1") -> BoCapNhat {
    let api = ApiClient(mayChu: may, token: nil, session: HttpMock.session())
    return BoCapNhat(api: api, heThong: fake, mayChu: { [may] in may }, session: HttpMock.session(), thuMuc: thuMuc,
                     tepDaThu: "/gia/da-thu.json", banHienTai: hienTai, dongHo: { [unowned self] in self.gio })
  }

  private func chay(_ b: BoCapNhat, dangGo: Bool = false, thuCong: Bool = false) async -> KetQuaCapNhat {
    let kq = await b.batDau(thuCong: thuCong, choPhep: { !dangGo })
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
    let kq = await b.batDau(choPhep: { co.goi += 1; return co.goi < 2 })
    await b.choXong()
    XCTAssertEqual(kq, .dangTai("0.1.2"))
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
  }

  func testKhongChayChong() async {
    datMayChu()
    let b = boCapNhat()
    let a = await b.batDau(choPhep: { true })
    let c = await b.batDau(choPhep: { true })
    XCTAssertEqual(a, .dangTai("0.1.2"))
    XCTAssertEqual(c, .dangBan)
    await b.choXong()
    XCTAssertEqual(fake.daCaiGoi.count, 1)
  }

  func testLoiMangKhongSap() async {
    HttpMock.dat { _, _ in nil }
    let kq = await chay(boCapNhat())
    guard case .loi = kq else { return XCTFail() }
    let lai = await boCapNhat().batDau(choPhep: { true })           // cờ chống chồng được nhả sau lỗi
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

  private func dungBoMay(daGhep: Bool = true, tre: UInt64 = 0, banMoi: BanMoi? = nil) throws -> (BoMay, MayChuGia, String) {
    let thu = NSTemporaryDirectory() + "aiigrow-cn-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: thu, withIntermediateDirectories: true)
    let kho = ConfigStore(duongDan: thu + "/config.json")
    try kho.sua { if daGhep { $0.token = "tok"; $0.deviceId = "d" }; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501, "ba": 502]; fake.admin = ["ba"]
    let api = MayChuGia()
    api.banMoiTraVe = banMoi; api.treBanMoi = tre
    let cn = BoCapNhat(api: api, heThong: fake, mayChu: { [may] in may }, session: HttpMock.session(), thuMuc: thuMuc, tepDaThu: "/gia/da-thu.json", banHienTai: "0.1.1")
    return (BoMay(api: api, heThong: fake, kho: kho, capNhat: cn), api, thu)
  }

  func testIPCCapNhatConBiTuChoiAdminTraLoiNgayKetQuaOTrangThai() async throws {
    let (b, _, thu) = try dungBoMay(tre: 1_500_000_000, banMoi: BanMoi(version: "0.1.1", url: "", sha256: ""))
    defer { try? FileManager.default.removeItem(atPath: thu) }
    let tCon = await b.xuLyIPC(.capNhat, uidGoi: 501)
    guard case .loi(let ma, _) = tCon else { return XCTFail("\(tCon)") }
    XCTAssertEqual(ma, "can_admin")
    let t0 = Date()
    let tAdmin = await b.xuLyIPC(.capNhat, uidGoi: 502)
    XCTAssertLessThan(Date().timeIntervalSince(t0), 0.5, "IPC trả lời ngay, không chờ máy chủ (tray chỉ chờ 3 giây)")
    guard case .thongBao(let chu) = tAdmin else { return XCTFail("\(tAdmin)") }
    XCTAssertTrue(chu.hasPrefix("Đang kiểm tra"))
    // đang kiểm: trangThai cho admin thấy «Đang kiểm tra…»
    guard case .trangThai(let t1) = await b.xuLyIPC(.trangThai, uidGoi: 502) else { return XCTFail() }
    XCTAssertTrue(t1.capNhat?.hasPrefix("Đang kiểm tra") ?? false)
    // gọi lần nữa khi còn bận
    let bac = await b.xuLyIPC(.capNhat, uidGoi: 502)
    XCTAssertEqual(bac, .thongBao(chu: KetQuaCapNhat.dangBan.chu))
    try await Task.sleep(nanoseconds: 2_000_000_000)
    guard case .trangThai(let t2) = await b.xuLyIPC(.trangThai, uidGoi: 502) else { return XCTFail() }
    XCTAssertEqual(t2.capNhat, "Đang là bản mới nhất (0.1.1)")
    XCTAssertNotNil(t2.capNhatLuc)
    guard case .trangThai(let tc) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertNil(tc.capNhat, "phiên Con không nhận trạng thái cập nhật")
  }

  func testChuaGhepKhongTuCapNhat() async throws {
    let (b, api, thu) = try dungBoMay(daGhep: false, banMoi: BanMoi(version: "0.1.2", url: "\(may)/tai/a.pkg", sha256: String(repeating: "a", count: 64)))
    defer { try? FileManager.default.removeItem(atPath: thu) }
    let t = await b.xuLyIPC(.capNhat, uidGoi: 502)
    guard case .loi = t else { return XCTFail("\(t)") }
    await b.kiemCapNhatDinhKy()
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertNil(api.banMoiTraVe == nil ? nil : fake.tep["/gia/da-thu.json"])
    XCTAssertFalse(HttpMock.daGoi.contains { $0.path.hasPrefix("tai/") })
  }

  func testBoCapNhatTuChoiKhiChuaGhepHoacCoDauDaGo() async {
    datMayChu()
    let kq = await boCapNhat().batDau(choPhep: { false })
    guard case .loi = kq else { return XCTFail() }
    XCTAssertFalse(HttpMock.daGoi.contains { $0.path == "api/agent/ban-moi" }, "chưa ghép ⇒ không hỏi máy chủ")
    fake.tep[DuongDan.daGo] = Data("x".utf8)
    let kq2 = await chay(boCapNhat())
    guard case .loi = kq2 else { return XCTFail() }
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
  }

  func testBiGoGiuaChungTruocKhiCaiKhongCai() async {
    datMayChu()
    final class Co: @unchecked Sendable { var n = 0 }
    let co = Co()
    let b = boCapNhat()
    _ = await b.batDau(choPhep: { co.n += 1; return co.n == 1 })       // lần 1 (đầu) ok, lần 2 (trước installer) đã gỡ
    await b.choXong()
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertNil(fake.tep["/gia/da-thu.json"], "chưa giao installer ⇒ chưa ghi dấu đã thử")
  }

  // MARK: chống vòng cài lại vô hạn

  func testDauDaThuToiDa3LanMoiLanCach6Gio() async {
    datMayChu()
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 1)
    // chưa tới 6 giờ ⇒ định kỳ không thử lại
    gio = gio.addingTimeInterval(3600)
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 1)
    // lần 2 và 3: mỗi lần sau ≥ 6 giờ
    for n in 2...3 {
      gio = gio.addingTimeInterval(6 * 3600)
      let k = await chay(boCapNhat())
      XCTAssertEqual(k, .dangTai("0.1.2"))
      XCTAssertEqual(fake.daCaiGoi.count, n)
      let d = try? JSONDecoder().decode(DauDaThu.self, from: fake.tep["/gia/da-thu.json"] ?? Data())
      XCTAssertEqual(d?.lan, n)
    }
    // quá 3 lần ⇒ dừng, log «cài xong mà bản không đổi»
    gio = gio.addingTimeInterval(6 * 3600)
    let k4 = await chay(boCapNhat())
    guard case .loi = k4 else { return XCTFail("\(k4)") }
    XCTAssertEqual(fake.daCaiGoi.count, 3)
    XCTAssertTrue(fake.log.contains { $0.contains("cài xong mà bản không đổi") })
    gio = gio.addingTimeInterval(30 * 24 * 3600)
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 3, "định kỳ không bao giờ vượt 3 lần với cùng sha")
  }

  func testNutBaMeThuLaiSau1Gio() async {
    datMayChu()
    _ = await chay(boCapNhat())
    gio = gio.addingTimeInterval(600)
    _ = await chay(boCapNhat(), thuCong: true)
    XCTAssertEqual(fake.daCaiGoi.count, 1, "chưa quá 1 giờ")
    gio = gio.addingTimeInterval(7200)
    _ = await chay(boCapNhat(), thuCong: true)
    XCTAssertEqual(fake.daCaiGoi.count, 2)
    for _ in 0..<4 { gio = gio.addingTimeInterval(7200); _ = await chay(boCapNhat(), thuCong: true) }
    XCTAssertEqual(fake.daCaiGoi.count, 6, "nút Ba Mẹ vẫn thử được dù đã quá 3 lần")
  }

  func testDuongDanDauDangCapNhatDungChung() {
    XCTAssertEqual(DuongDan.dangCapNhat, "/var/run/aiigrow-capnhat")
    XCTAssertEqual(DuongDan.daGo, "/var/db/aiigrow-da-go")
    // postinstall + go-cai.sh dùng đúng các đường dẫn này (mặc định, AIIGROW_GOC rỗng)
    let goc = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("goi")
    let post = (try? String(contentsOf: goc.appendingPathComponent("scripts/postinstall"))) ?? ""
    let go = (try? String(contentsOf: goc.appendingPathComponent("go-cai.sh"))) ?? ""
    XCTAssertTrue(post.contains("$GOC" + String(DuongDan.dangCapNhat)), "postinstall")
    XCTAssertTrue(post.contains("$GOC" + String(DuongDan.daGo)))
    XCTAssertTrue(go.contains("$GOC" + String(DuongDan.daGo)))
    XCTAssertTrue(go.contains("$GOC" + String(DuongDan.dangCapNhat)))
  }

  func testGhepLaiXoaDauDaGo() async throws {
    let (b, _, thu) = try dungBoMay(daGhep: false, banMoi: nil)
    defer { try? FileManager.default.removeItem(atPath: thu) }
    fake.tep[DuongDan.daGo] = Data("x".utf8)
    fake.uidTheoTen["be"] = 501
    HttpMock.dat { _, _ in nil }
    // ghép cần ApiClient/MayChuGia: MayChuGia.ghep trả sẵn KetQuaGhep
    let r = await b.xuLyIPC(.ghep(ma: "123456", taiKhoanCon: "be"), uidGoi: 502)
    guard case .ok = r else { return XCTFail("\(r)") }
    XCTAssertNil(fake.tep[DuongDan.daGo], "ghép lại xong thì bỏ dấu da-go")
  }

  func testManifestDoiShaThiCaiTiep() async {
    datMayChu()
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 1)
    let moi = Data("goi khac".utf8)
    HttpMock.dat { path, _ in
      if path == "api/agent/ban-moi" { return HttpMock.json(200, ["version": "0.1.3", "url": "\(self.may)/tai/AiiGrow-0.1.3.pkg", "sha256": LuatCapNhat.sha256Hex(moi)]) }
      return .init(ma: 200, than: moi)
    }
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 2)
  }

  func testDangCoInstallerChayKhongCaiKhongGhiDau() async {
    datMayChu()
    fake.caiDangChayGia = true
    _ = await chay(boCapNhat())
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertNil(fake.tep["/gia/da-thu.json"])
    XCTAssertTrue(fake.log.contains { $0.contains("installer khác chạy") })
  }

  // MARK: băm theo luồng, lịch

  func testSha256TepTheoLuong() throws {
    let p = NSTemporaryDirectory() + "sha-\(UUID().uuidString)"
    defer { try? FileManager.default.removeItem(atPath: p) }
    var lon = Data(); for i in 0..<(3 * (1 << 20) + 17) { lon.append(UInt8(i % 251)) }       // > 3 khúc 1 MiB
    try lon.write(to: URL(fileURLWithPath: p))
    XCTAssertEqual(LuatCapNhat.sha256Tep(p), LuatCapNhat.sha256Hex(lon))
    XCTAssertNil(LuatCapNhat.sha256Tep(p + "-khong-co"))
  }

  func testLichCapNhatTruoc90GiayRoiMoi6Gio() async {
    final class Ghi: @unchecked Sendable { var ngu: [Double] = []; var viec = 0 }
    let g = Ghi()
    await LichCapNhat.chay(ngu: { g.ngu.append($0); return g.ngu.count < 3 }, viec: { g.viec += 1 })
    XCTAssertEqual(g.ngu, [90, 21600, 21600])
    XCTAssertEqual(g.viec, 2)
    let h = Ghi()
    await LichCapNhat.chay(ngu: { h.ngu.append($0); return false }, viec: { h.viec += 1 })      // bị huỷ khi đang chờ 90 giây ⇒ không kiểm
    XCTAssertEqual(h.viec, 0)
  }

  func testIPCKhuHoiCapNhat() throws {
    let d = try IPCMa.encoder.encode(YeuCauTray.capNhat)
    XCTAssertEqual(try IPCMa.decoder.decode(YeuCauTray.self, from: d), .capNhat)
    let t = try IPCMa.encoder.encode(TraLoi.thongBao(chu: "x"))
    XCTAssertEqual(try IPCMa.decoder.decode(TraLoi.self, from: t), .thongBao(chu: "x"))
  }

  func testPhienBanHienTai() { XCTAssertEqual(PhienBan.hienTai, "0.1.1") }

  // MARK: chạy thử postinstall trên thư mục tạm (AIIGROW_GOC + launchctl giả; không đụng máy thật, không cần root)

  private func chayPostinstall(daGo: Bool, pidDau: String?) throws -> (bootstrapDaemon: Bool, daGoConLai: Bool, appConLai: Bool) {
    let fm = FileManager.default
    let goc = NSTemporaryDirectory() + "pi-\(UUID().uuidString)"
    defer { try? fm.removeItem(atPath: goc) }
    let res = goc + "/Applications/AiiGrow.app/Contents/Resources"
    for d in [res, goc + "/Library/LaunchDaemons", goc + "/Library/LaunchAgents", goc + "/var/db", goc + "/var/run"] { try fm.createDirectory(atPath: d, withIntermediateDirectories: true) }
    for n in ["vn.aiilab.aiigrow.daemon", "vn.aiilab.aiigrow.tray"] { try "x".write(toFile: "\(res)/\(n).plist", atomically: true, encoding: .utf8) }
    if daGo { try "da-go".write(toFile: goc + "/var/db/aiigrow-da-go", atomically: true, encoding: .utf8) }
    if let p = pidDau { try p.write(toFile: goc + "/var/run/aiigrow-capnhat", atomically: true, encoding: .utf8) }
    let gia = goc + "/launchctl-gia.sh", nhatKy = goc + "/lenh.log"
    try "#!/bin/bash\necho \"$@\" >> '\(nhatKy)'\nexit 1\n".write(toFile: gia, atomically: true, encoding: .utf8)
    chmod(gia, 0o755)
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/bash")
    p.arguments = [BaoMatTests.goiDir + "/scripts/postinstall"]
    p.environment = ["AIIGROW_GOC": goc, "AIIGROW_LAUNCHCTL": gia, "PATH": "/usr/bin:/bin"]
    p.standardOutput = FileHandle.nullDevice; p.standardError = FileHandle.nullDevice
    try p.run(); p.waitUntilExit()
    let log = (try? String(contentsOfFile: nhatKy, encoding: .utf8)) ?? ""
    return (log.contains("bootstrap system"), fm.fileExists(atPath: goc + "/var/db/aiigrow-da-go"), fm.fileExists(atPath: goc + "/Applications/AiiGrow.app"))
  }

  func testPostinstallPhanNhanhDaGo() throws {
    // đã gỡ + cài tự động (PID dấu còn sống) ⇒ không nạp lại, giữ da-go, dọn app
    let a = try chayPostinstall(daGo: true, pidDau: String(getpid()))
    XCTAssertFalse(a.bootstrapDaemon); XCTAssertTrue(a.daGoConLai); XCTAssertFalse(a.appConLai)
    // đã gỡ + dấu cũ (PID chết) ⇒ coi như cài tay: xoá da-go, nạp bình thường
    let b = try chayPostinstall(daGo: true, pidDau: "99999999")
    XCTAssertTrue(b.bootstrapDaemon); XCTAssertFalse(b.daGoConLai); XCTAssertTrue(b.appConLai)
    // đã gỡ + không có dấu ⇒ cài tay
    let c = try chayPostinstall(daGo: true, pidDau: nil)
    XCTAssertTrue(c.bootstrapDaemon); XCTAssertFalse(c.daGoConLai)
    // chưa từng gỡ ⇒ bình thường dù có dấu
    let d = try chayPostinstall(daGo: false, pidDau: String(getpid()))
    XCTAssertTrue(d.bootstrapDaemon)
  }
}
