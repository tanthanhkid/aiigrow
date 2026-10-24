// Tự cập nhật: so bản, luật URL/chuyển hướng, sha256, chữ ký, không cài khi đang gỡ, IPC capNhat từ uid Con bị từ chối.
import XCTest
@testable import AiiGrowCore
import CryptoKit

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
    let s = sha ?? sha256Hex(noiDung)
    let g = goi ?? noiDung
    HttpMock.dat { path, _ in
      if path == "api/agent/ban-moi" { return HttpMock.json(200, ["version": version, "url": u, "sha256": s]) }
      if path.hasPrefix("tai/") { return .init(ma: 200, than: g) }
      return nil
    }
  }

  var gio = Date(timeIntervalSince1970: 1_760_000_000)
  private func boCapNhat(hienTai: String = "0.1.1", toiDaByte: Int = LuatCapNhat.toiDaByte) -> BoCapNhat {
    let api = ApiClient(mayChu: may, token: nil, session: HttpMock.session())
    return BoCapNhat(api: api, heThong: fake, mayChu: { [may] in may }, session: HttpMock.session(), thuMuc: thuMuc,
                     tepDaThu: "/gia/da-thu.json", banHienTai: hienTai, dongHo: { [unowned self] in self.gio }, toiDaByte: toiDaByte)
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
    XCTAssertTrue(LuatCapNhat.urlGoiHopLe("https://aiigrow.aiilab.vn/a.pkg", mayChu: may + ":443"), "cổng 443 ghi rõ = mặc định")
    XCTAssertTrue(LuatCapNhat.urlGoiHopLe("https://aiigrow.aiilab.vn:443/a.pkg", mayChu: may))
    XCTAssertNil(LuatCapNhat.tachBan("1.0.99999999999999999999"), "tràn Int ⇒ sai dạng")
    XCTAssertFalse(LuatCapNhat.urlGoiHopLe("https://aiigrow.aiilab.vn:8443/a.pkg", mayChu: may), "cổng khác")
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
    XCTAssertFalse(ok("https://raw.githubusercontent.com/evil/x/main/a.pkg"), "raw. không phải máy chủ Release")
    XCTAssertFalse(ok("https://github.com/evil/repo/releases/download/x/a.pkg"), "repo khác")
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
    XCTAssertTrue(thu("https://github.com/tanthanhkid/aiigrow-tai/releases/download/mac-0.1.2/a.pkg"))
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

  func testGoiQuaCoDungNgayKhiDangTai() async {
    let to = Data(repeating: 7, count: 256 * 1024)
    datMayChu(sha: sha256Hex(to), goi: to)
    _ = await chay(boCapNhat(toiDaByte: 64 * 1024))
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertTrue(fake.log.contains { $0.contains("đã dừng tải") }, "\(fake.log)")
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
    gio = gio.addingTimeInterval(6 * 3600)                     // gói hỏng cũng tính lượt thử ⇒ phải chờ 6 giờ
    _ = await chay(boCapNhat())
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertTrue(fake.log.contains { $0.contains("spctl từ chối") })
  }

  func testGoiHongTinhLuotThuKhongTaiLaiMai() async {
    datMayChu(sha: String(repeating: "a", count: 64))          // manifest sai sha ⇒ mọi lượt tải đều lệch
    _ = await chay(boCapNhat())
    let soTai = { HttpMock.daGoi.filter { $0.path.hasPrefix("tai/") }.count }
    XCTAssertEqual(soTai(), 1)
    gio = gio.addingTimeInterval(3600)
    _ = await chay(boCapNhat())
    XCTAssertEqual(soTai(), 1, "chưa tới 6 giờ ⇒ không tải lại")
    for _ in 0..<5 { gio = gio.addingTimeInterval(6 * 3600); _ = await chay(boCapNhat()) }
    XCTAssertEqual(soTai(), 3, "tối đa 3 lượt với cùng sha")
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
    guard case .tuChoi(ma: "chua_ghep", _) = QuyenIPC.kiem(.capNhat, uidGoi: admin, uidCon: nil, daGhep: false, laAdmin: laAdmin) else {
      return XCTFail("chưa ghép: daemon không tự cập nhật ⇒ từ chối ngay ở lớp quyền")
    }
    if case .duoc = QuyenIPC.kiem(.capNhat, uidGoi: con, uidCon: con, daGhep: true, laAdmin: laAdmin) { XCTFail("Con gọi phải bị từ chối") }
    if case .duoc = QuyenIPC.kiem(.capNhat, uidGoi: con, uidCon: con, daGhep: true, laAdmin: { _ in true }) { XCTFail("Con dù là admin cũng bị từ chối") }
    if case .duoc = QuyenIPC.kiem(.capNhat, uidGoi: 503, uidCon: con, daGhep: true, laAdmin: laAdmin) { XCTFail("không phải admin") }
  }

  private func dungBoMay(daGhep: Bool = true, tre: UInt64 = 0, banMoi: BanMoi? = nil, so: SoTinhCapNhat = SoTinhCapNhat()) throws -> (BoMay, MayChuGia, String) {
    let thu = NSTemporaryDirectory() + "aiigrow-cn-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: thu, withIntermediateDirectories: true)
    let kho = ConfigStore(duongDan: thu + "/config.json")
    try kho.sua { if daGhep { $0.token = "tok"; $0.deviceId = "d" }; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501, "ba": 502]; fake.admin = ["ba"]
    let api = MayChuGia()
    api.banMoiTraVe = banMoi; api.treBanMoi = tre
    let cn = BoCapNhat(api: api, heThong: fake, mayChu: { [may] in may }, session: HttpMock.session(), thuMuc: thuMuc, tepDaThu: "/gia/da-thu.json", banHienTai: "0.1.1", so: so)
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
    // chờ lượt nền xong theo hạn chót (máy CI tải nặng), không ngủ cố định
    var t2: TrangThai?
    let han = Date().addingTimeInterval(20)
    while Date() < han {
      if case .trangThai(let t) = await b.xuLyIPC(.trangThai, uidGoi: 502), t.capNhat?.hasPrefix("Đang kiểm tra") == false { t2 = t; break }
      try await Task.sleep(nanoseconds: 100_000_000)
    }
    guard let t2 else { return XCTFail("quá 20 giây vẫn chưa kiểm xong") }
    XCTAssertEqual(t2.capNhat, "Đang là bản mới nhất (0.1.1)")
    XCTAssertNotNil(t2.capNhatLuc)
    guard case .trangThai(let tc) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertNil(tc.capNhat, "phiên Con không nhận trạng thái cập nhật")
    guard case .trangThai(let tk) = await b.xuLyIPC(.trangThai, uidGoi: 503) else { return XCTFail() }
    XCTAssertNil(tk.capNhat, "tài khoản thường (không admin) không nhận trạng thái cập nhật")
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
    fake.goDangChay = true                                      // go-cai.sh đang chạy ⇒ dấu thật
    let kq2 = await chay(boCapNhat())
    guard case .loi = kq2 else { return XCTFail() }
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertNotNil(fake.tep[DuongDan.daGo])
  }

  func testDauDaGoSotKhiKhongCoTrinhGoThiTuBo() async throws {
    let (b, _, thu) = try dungBoMay(banMoi: BanMoi(version: "0.1.1", url: "", sha256: ""))
    defer { try? FileManager.default.removeItem(atPath: thu) }
    fake.tep[DuongDan.daGo] = Data("x".utf8)                    // go-cai.sh bị SIGKILL trước khi gỡ thật, máy vẫn ghép
    fake.goDangChay = true
    await b.kiemCapNhatDinhKy()
    XCTAssertNotNil(fake.tep[DuongDan.daGo], "go-cai.sh đang chạy ⇒ dấu thật, giữ")
    fake.goDangChay = false
    await b.kiemCapNhatDinhKy()
    XCTAssertNil(fake.tep[DuongDan.daGo], "dấu sót được bỏ (trong actor BoMay)")
  }

  /// BoCapNhat KHÔNG tự xoá dấu gỡ: choPhep đã trả true rồi tuGo mới ghi dấu (chưa kịp chạy go-cai.sh) ⇒ dấu phải còn, không tải/cài.
  func testBoCapNhatKhongXoaDauGoGhiSauChoPhep() async {
    datMayChu()
    fake.tep[DuongDan.daGo] = Data("x".utf8)
    fake.goDangChay = false
    let kq = await chay(boCapNhat())
    guard case .loi = kq else { return XCTFail("\(kq)") }
    XCTAssertNotNil(fake.tep[DuongDan.daGo])
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
  }

  func testLoiTaiChiBaoCauNganChoBaMe() async {
    let m = may
    HttpMock.dat { path, _ in
      if path == "api/agent/ban-moi" { return HttpMock.json(200, ["version": "0.1.2", "url": "\(m)/tai/a.pkg", "sha256": String(repeating: "a", count: 64)]) }
      return .init(ma: 500, than: Data())
    }
    let b = boCapNhat()
    _ = await chay(b)
    let chu = b.so.chu ?? ""
    XCTAssertTrue(chu.hasPrefix("Chưa cập nhật được bản 0.1.2: máy chủ phát hành trả lỗi"), chu)
    XCTAssertFalse(chu.contains("chuyển hướng") || chu.contains("NSURLErrorDomain"), "chi tiết kỹ thuật chỉ vào nhật ký")
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
    // hết lượt ⇒ mỗi 24 giờ (tính từ lần thử cuối) mới thử một lần — lỗi tạm không khoá máy ở bản cũ mãi
    gio = gio.addingTimeInterval(18 * 3600)
    let k5 = await chay(boCapNhat())
    XCTAssertEqual(k5, .dangTai("0.1.2"))
    XCTAssertEqual(fake.daCaiGoi.count, 4)
    gio = gio.addingTimeInterval(6 * 3600)
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 4, "sau khi hết lượt, định kỳ không thử lại trước 24 giờ")
  }

  func testDauDaThuCuThieuLanVanDoc() async throws {
    // dấu do bản 0.1.1 sớm ghi (không có «lan») vẫn phải chặn cài lại ngay
    let cu = #"{"version":"0.1.2","sha256":"\#(sha256Hex(noiDung))","luc":\#(gio.timeIntervalSince1970)}"#
    let d = try JSONDecoder().decode(DauDaThu.self, from: Data(cu.utf8))
    XCTAssertEqual(d.lan, 1)
    datMayChu()
    fake.tep["/gia/da-thu.json"] = Data(cu.utf8)
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 0, "dấu cũ không có lan vẫn được tôn trọng")
  }

  func testGiaoInstallerLoiKhongTinhLanThu() async {
    datMayChu()
    fake.loiCaiGoi = LoiApi(chu: "launchctl submit lỗi")
    _ = await chay(boCapNhat())
    XCTAssertNil(fake.tep["/gia/da-thu.json"], "submit lỗi ⇒ không để lại dấu đã thử")
    XCTAssertFalse(fake.daXoa.contains { $0.hasSuffix("AiiGrow-0.1.2.pkg") }, "submit lỗi (có thể job khác đang đọc cùng tệp) ⇒ không xoá gói")
    fake.loiCaiGoi = nil
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 1, "lượt sau thử ngay, không phải chờ 6 giờ")
    let d = try? JSONDecoder().decode(DauDaThu.self, from: fake.tep["/gia/da-thu.json"] ?? Data())
    XCTAssertEqual(d?.lan, 1)
  }

  func testDongHoLuiKhongKhoaThuLai() async {
    datMayChu()
    _ = await chay(boCapNhat())
    gio = gio.addingTimeInterval(-3 * 24 * 3600)              // NTP sửa đồng hồ lùi 3 ngày
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 2, "dấu ở «tương lai» không chặn lượt thử kế")
  }

  func testKhoiDongLaiSauLuotCaiHongBaoChoBaMe() async throws {
    let d = DauDaThu(version: "0.1.2", sha256: String(repeating: "b", count: 64), luc: gio.timeIntervalSince1970 - 600, lan: 2)
    fake.tep["/gia/da-thu.json"] = try JSONEncoder().encode(d)
    let b = boCapNhat()
    XCTAssertTrue(b.so.chu?.contains("Chưa cài được bản 0.1.2 (đã thử 2 lần)") ?? false, "\(b.so.chu ?? "nil")")
    fake.tep["/gia/da-thu.json"] = try JSONEncoder().encode(DauDaThu(version: "0.1.1", sha256: d.sha256, luc: d.luc))
    XCTAssertEqual(boCapNhat().so.chu, "Đã cập nhật lên bản 0.1.1.", "daemon mới sau khi cài xong ⇒ báo đã cập nhật")
    fake.tep["/gia/da-thu.json"] = try JSONEncoder().encode(DauDaThu(version: "0.1.1", sha256: d.sha256, luc: gio.timeIntervalSince1970 - 7200))
    XCTAssertNil(boCapNhat().so.chu, "khởi động lại vài giờ sau ⇒ không báo lại «đã cập nhật»")
    fake.tep["/gia/da-thu.json"] = try JSONEncoder().encode(DauDaThu(version: "0.1.0", sha256: d.sha256, luc: d.luc))
    XCTAssertNil(boCapNhat().so.chu, "dấu của bản cũ hơn ⇒ không báo")
  }

  func testBiGoDungLucGiaoInstallerThiDungJobCai() async {
    datMayChu()
    let f = fake!; f.sauCaiGoi = { f.tep[DuongDan.daGo] = Data("da-go".utf8) }     // go-cai.sh ghi dấu ngay sau lần kiểm cuối
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daDungCai, 1, "job cài vừa submit phải bị dừng")
    XCTAssertTrue(fake.log.contains { $0.contains("đã dừng lượt cài") })
  }

  func testLenhJobCaiDungCuPhapVaChongChayLai() throws {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/sh")
    p.arguments = ["-n", "-c", HeThongMac.lenhJobCai]
    try p.run(); p.waitUntilExit()
    XCTAssertEqual(p.terminationStatus, 0, "sh -n")
    let l = HeThongMac.lenhJobCai
    // thấy dấu PID của lượt trước (job bị launchd chạy lại) ⇒ thoát trước khi gọi installer
    XCTAssertLessThan(l.range(of: "if [ -f \"$3\" ]")!.lowerBound, l.range(of: "/usr/sbin/installer")!.lowerBound)
  }

  /// Chạy lệnh job cài thật bằng sh, thay launchctl / installer / pkgutil bằng script giả ghi nhật ký.
  private func chayJobCai(installerMa: Int, daGo: Bool, dauCu: Bool, coGoi: Bool = true) throws -> (log: String, ma: Int32) {
    let fm = FileManager.default
    let g = NSTemporaryDirectory() + "job-\(UUID().uuidString)"
    try fm.createDirectory(atPath: g, withIntermediateDirectories: true)
    defer { try? fm.removeItem(atPath: g) }
    let nk = g + "/nk.log"
    func gia(_ ten: String, _ ma: Int) throws -> String {
      let f = g + "/" + ten
      try "#!/bin/sh\necho \"\(ten) $*\" >> '\(nk)'\nexit \(ma)\n".write(toFile: f, atomically: true, encoding: .utf8)
      chmod(f, 0o755); return f
    }
    let lenh = HeThongMac.lenhJobCai
      .replacingOccurrences(of: "/bin/launchctl", with: try gia("launchctl", 0))
      .replacingOccurrences(of: "/usr/sbin/installer", with: try gia("installer", installerMa))
      .replacingOccurrences(of: "/usr/sbin/pkgutil", with: try gia("pkgutil", 0))
    let goi = g + "/a.pkg", dau = g + "/pid", daGoTep = g + "/da-go", daemon = g + "/daemon.plist", tray = g + "/tray.plist"
    for f in [goi, daemon, tray] { try "x".write(toFile: f, atomically: true, encoding: .utf8) }
    if !coGoi { try fm.removeItem(atPath: goi) }
    if daGo { try "da-go".write(toFile: daGoTep, atomically: true, encoding: .utf8) }
    if dauCu { try "123".write(toFile: dau, atomically: true, encoding: .utf8) }
    let pg = g + "/phien-gui.sh"
    try "#!/bin/sh\necho 501\n".write(toFile: pg, atomically: true, encoding: .utf8)
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/sh")
    p.arguments = ["-c", lenh, "capnhat", goi, LuatCapNhat.nhanCai, dau, daGoTep, daemon, tray, pg]
    p.standardOutput = FileHandle.nullDevice; p.standardError = FileHandle.nullDevice
    try p.run(); p.waitUntilExit()
    XCTAssertFalse(fm.fileExists(atPath: goi), "gói luôn bị xoá"); XCTAssertFalse(fm.fileExists(atPath: dau), "dấu PID luôn bị xoá")
    return ((try? String(contentsOfFile: nk, encoding: .utf8)) ?? "", p.terminationStatus)
  }

  func testJobCaiNapLaiDaemonKhiInstallerLoi() throws {
    let a = try chayJobCai(installerMa: 1, daGo: false, dauCu: false)
    XCTAssertTrue(a.log.contains("launchctl bootstrap system"), a.log)
    XCTAssertTrue(a.log.contains("daemon.plist"), a.log)
    XCTAssertTrue(a.log.contains("launchctl bootstrap gui/501 \(NSTemporaryDirectory())"), "tray nạp lại vào các phiên phien-gui.sh trả: \(a.log)")
    XCTAssertTrue(a.log.contains("launchctl remove \(LuatCapNhat.nhanCai)"))
    XCTAssertEqual(a.ma, 1)
    let b = try chayJobCai(installerMa: 0, daGo: false, dauCu: false)
    XCTAssertFalse(b.log.contains("bootstrap"), "cài xong: postinstall lo, job không nạp lại")
    XCTAssertFalse(b.log.contains("pkgutil"))
    let c = try chayJobCai(installerMa: 1, daGo: true, dauCu: false)
    XCTAssertFalse(c.log.contains("bootstrap"), "máy vừa bị gỡ: không nạp lại")
    XCTAssertTrue(c.log.contains("pkgutil --forget vn.aiilab.aiigrow.pkg"))
    let d = try chayJobCai(installerMa: 0, daGo: false, dauCu: true)
    XCTAssertFalse(d.log.contains("installer"), "job bị launchd chạy lại: không cài lại")
    XCTAssertTrue(d.log.contains("launchctl bootstrap system"), d.log)
    XCTAssertEqual(d.ma, 0)
    // lượt trước đã xong (gói + dấu PID đã xoá) mà `launchctl remove` hỏng ⇒ launchd chạy lại: không cài, không nạp lại, chỉ gỡ nhãn
    let e = try chayJobCai(installerMa: 1, daGo: false, dauCu: false, coGoi: false)
    XCTAssertFalse(e.log.contains("installer"), e.log)
    XCTAssertFalse(e.log.contains("bootstrap"), e.log)
    XCTAssertTrue(e.log.contains("launchctl remove \(LuatCapNhat.nhanCai)"))
    XCTAssertEqual(e.ma, 0)
  }

  func testManifestBanSaiDangBaoLoi() async {
    datMayChu(version: "0.1.2-rc1")
    let k = await chay(boCapNhat())
    guard case .loi(let c) = k else { return XCTFail("\(k)") }
    XCTAssertTrue(c.contains("sai dạng"))
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

  /// phien-gui.sh: chỉ in uid số >= 500, mỗi uid một dòng, không trùng (root/_windowserver không được nhận tray).
  func testPhienGuiChiInUidNguoiDung() throws {
    let p = Process(); let o = Pipe()
    p.executableURL = URL(fileURLWithPath: "/bin/bash")
    p.arguments = [BaoMatTests.goiDir + "/scripts/phien-gui.sh"]
    p.standardOutput = o
    try p.run(); p.waitUntilExit()
    XCTAssertEqual(p.terminationStatus, 0)
    let dong = String(decoding: o.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self).split(separator: "\n").map(String.init)
    for d in dong { XCTAssertGreaterThanOrEqual(Int(d) ?? -1, 500, "dòng lạ: \(d)") }
    XCTAssertEqual(Set(dong).count, dong.count)
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
    XCTAssertTrue(go.contains("DA_GO=" + DuongDan.daGo))
    XCTAssertTrue(go.contains(DuongDan.dangCapNhat))
    XCTAssertTrue(go.contains("GO_PID=" + DuongDan.goCaiDangChay))
    XCTAssertTrue(post.contains("$GOC" + DuongDan.goCaiDangChay))
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

  func testKhongGhepKhiTrinhGoConChay() async throws {
    let (b, _, thu) = try dungBoMay(daGhep: false, banMoi: nil)
    defer { try? FileManager.default.removeItem(atPath: thu) }
    fake.tep[DuongDan.daGo] = Data("x".utf8)
    fake.uidTheoTen["be"] = 501
    fake.goDangChay = true
    HttpMock.dat { _, _ in nil }
    let r = await b.xuLyIPC(.ghep(ma: "123456", taiKhoanCon: "be"), uidGoi: 502)
    guard case let .loi(ma, _) = r else { return XCTFail("\(r)") }
    XCTAssertEqual(ma, "dang_go")
    XCTAssertNotNil(fake.tep[DuongDan.daGo], "go-cai.sh còn chạy ⇒ giữ dấu da-go cho postinstall")
  }

  func testLenhThatTraQuyenAdminTuoi() async throws {
    let so = SoTinhCapNhat(); so.dat("Đang kiểm tra bản mới…")    // có trạng thái cập nhật ⇒ hỏi trạng thái tra admin qua bộ đệm
    let (b, _, thu) = try dungBoMay(daGhep: false, banMoi: nil, so: so)
    defer { try? FileManager.default.removeItem(atPath: thu) }
    _ = await b.xuLyIPC(.trangThai, uidGoi: 502)              // bộ đệm ghi «502 là admin»
    fake.admin = []                                            // vừa bị hạ quyền
    HttpMock.dat { _, _ in nil }
    let r = await b.xuLyIPC(.ghep(ma: "123456", taiKhoanCon: "be"), uidGoi: 502)
    guard case .loi = r else { return XCTFail("tài khoản vừa bị hạ quyền vẫn ghép được: \(r)") }
  }

  func testGoiHongNutBaMeThuLaiNgay() async {
    datMayChu(goi: Data("<html>proxy</html>".utf8))           // proxy trả trang lạ ⇒ lệch sha256, gói hỏng
    _ = await chay(boCapNhat())
    let d = try? JSONDecoder().decode(DauDaThu.self, from: fake.tep["/gia/da-thu.json"] ?? Data())
    XCTAssertEqual(d?.daGiao, false)
    datMayChu()                                                 // mạng đã ổn
    gio = gio.addingTimeInterval(60)
    let k0 = await chay(boCapNhat(), thuCong: true)
    guard case .loi = k0 else { return XCTFail("bấm liên tục không được tải lại cả gói: \(k0)") }
    gio = gio.addingTimeInterval(600)
    let k = await chay(boCapNhat(), thuCong: true)
    XCTAssertEqual(k, .dangTai("0.1.2"), "gói hỏng chưa giao installer ⇒ nút Ba Mẹ thử lại sau vài phút")
  }

  func testGoCaiChayTrongLucGhepThiGiuDauDaGo() async throws {
    let (b, api, thu) = try dungBoMay(daGhep: false, banMoi: nil)
    defer { try? FileManager.default.removeItem(atPath: thu) }
    let f = fake!
    api.khiGhep = { f.goDangChay = true; f.tep[DuongDan.daGo] = Data("da-go".utf8) }   // sudo go-cai.sh bắt đầu lúc đang chờ máy chủ
    let r = await b.xuLyIPC(.ghep(ma: "123456", taiKhoanCon: "be"), uidGoi: 502)
    guard case .ok = r else { return XCTFail("\(r)") }
    XCTAssertNotNil(fake.tep[DuongDan.daGo], "go-cai.sh đang chạy ⇒ không xoá dấu da-go")
  }

  func testCapNhatDinhKyTatKhiTuCapNhatFalse() async throws {
    let thu = NSTemporaryDirectory() + "aiigrow-cn-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: thu, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(atPath: thu) }
    let kho = ConfigStore(duongDan: thu + "/config.json")
    try kho.sua { $0.token = "tok"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    datMayChu()
    let cn = boCapNhat()
    let b = BoMay(api: MayChuGia(), heThong: fake, kho: kho, tuyChon: TuyChonBoMay(tuCapNhat: false), capNhat: cn)
    await b.kiemCapNhatDinhKy()
    XCTAssertTrue(fake.daCaiGoi.isEmpty, "tuCapNhat=false ⇒ không tải/cài")
  }

  func testManifestSaiDinhDangKhongBaoLaMoiNhat() async {
    HttpMock.dat { path, _ in path.hasPrefix("api/agent/ban-moi") ? .init(ma: 200, than: Data("<html>proxy</html>".utf8)) : nil }
    let k = await chay(boCapNhat())
    guard case .loi = k else { return XCTFail("manifest hỏng không được coi là bản mới nhất: \(k)") }
    HttpMock.dat { path, _ in path.hasPrefix("api/agent/ban-moi") ? .init(ma: 200, than: Data("null".utf8)) : nil }
    let k2 = await chay(boCapNhat())
    XCTAssertEqual(k2, .laMoiNhat("0.1.1"), "null = chưa phát hành")
  }

  func testDonTepTaiTamSot() async {
    let sot = NSTemporaryDirectory() + LuatCapNhat.tienToTepTam + "sot-\(UUID().uuidString).pkg"
    FileManager.default.createFile(atPath: sot, contents: Data("x".utf8))
    datMayChu()
    _ = await chay(boCapNhat())
    XCTAssertFalse(FileManager.default.fileExists(atPath: sot), "tệp tải tạm của lượt bị giết giữa chừng được dọn")
  }

  func testLoiMangBaoChuDeHieu() async {
    HttpMock.dat { _, _ in nil }
    let k = await chay(boCapNhat())
    guard case let .loi(chu) = k else { return XCTFail("\(k)") }
    XCTAssertTrue(chu.hasPrefix("Không kiểm tra được bản mới (mất mạng"), chu)      // không lộ mô tả lỗi Swift thô
  }

  func testManifestDoiShaThiCaiTiep() async {
    datMayChu()
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 1)
    let moi = Data("goi khac".utf8)
    HttpMock.dat { path, _ in
      if path == "api/agent/ban-moi" { return HttpMock.json(200, ["version": "0.1.3", "url": "\(self.may)/tai/AiiGrow-0.1.3.pkg", "sha256": sha256Hex(moi)]) }
      return .init(ma: 200, than: moi)
    }
    _ = await chay(boCapNhat())
    XCTAssertEqual(fake.daCaiGoi.count, 2)
  }

  func testDangCoInstallerChayKhongCaiKhongGhiDau() async {
    datMayChu()
    fake.caiDangChayGia = true
    let dangDoc = thuMuc + "/AiiGrow-0.1.2.pkg"                  // gói installer lượt trước đang đọc
    fake.tep[dangDoc] = Data("goi cu".utf8)
    _ = await chay(boCapNhat())
    XCTAssertTrue(fake.daCaiGoi.isEmpty)
    XCTAssertNil(fake.tep["/gia/da-thu.json"])
    XCTAssertNotNil(fake.tep[dangDoc], "không dọn gói khi installer lượt trước còn chạy")
    XCTAssertTrue(fake.log.contains { $0.contains("còn chạy") })
  }

  // MARK: băm theo luồng, lịch

  func testSha256TepTheoLuong() throws {
    let p = NSTemporaryDirectory() + "sha-\(UUID().uuidString)"
    defer { try? FileManager.default.removeItem(atPath: p) }
    var lon = Data(); for i in 0..<(3 * (1 << 20) + 17) { lon.append(UInt8(i % 251)) }       // > 3 khúc 1 MiB
    try lon.write(to: URL(fileURLWithPath: p))
    XCTAssertEqual(LuatCapNhat.sha256Tep(p), sha256Hex(lon))
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

  private func chayPostinstall(daGo: Bool, pidDau: String?, pidGo: String? = nil, goiTuDong: Bool = false, coConfig: Bool = true,
                               dauGo: String = "da-go") throws -> (bootstrapDaemon: Bool, daGoConLai: Bool, appConLai: Bool, quenBienNhan: Bool) {
    let fm = FileManager.default
    let goc = NSTemporaryDirectory() + "pi-\(UUID().uuidString)"
    defer { try? fm.removeItem(atPath: goc) }
    let res = goc + "/Applications/AiiGrow.app/Contents/Resources"
    for d in [res, goc + "/Library/LaunchDaemons", goc + "/Library/LaunchAgents", goc + "/var/db", goc + "/var/run"] { try fm.createDirectory(atPath: d, withIntermediateDirectories: true) }
    for n in ["vn.aiilab.aiigrow.daemon", "vn.aiilab.aiigrow.tray"] { try "x".write(toFile: "\(res)/\(n).plist", atomically: true, encoding: .utf8) }
    if daGo { try dauGo.write(toFile: goc + "/var/db/aiigrow-da-go", atomically: true, encoding: .utf8) }
    if let p = pidDau { try p.write(toFile: goc + "/var/run/aiigrow-capnhat", atomically: true, encoding: .utf8) }
    if let p = pidGo { try p.write(toFile: goc + "/var/run/aiigrow-go-cai", atomically: true, encoding: .utf8) }
    let cfg = goc + "/Library/Application Support/AiiGrow"
    try fm.createDirectory(atPath: cfg, withIntermediateDirectories: true)
    if coConfig { try "{}".write(toFile: cfg + "/config.json", atomically: true, encoding: .utf8) }
    let gia = goc + "/launchctl-gia.sh", nhatKy = goc + "/lenh.log"
    try "#!/bin/bash\necho \"$@\" >> '\(nhatKy)'\nexit 1\n".write(toFile: gia, atomically: true, encoding: .utf8)
    chmod(gia, 0o755)
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/bash")
    p.arguments = [BaoMatTests.goiDir + "/scripts/postinstall", goiTuDong ? cfg + "/cap-nhat/AiiGrow-0.1.2.pkg" : "/Users/ba/Downloads/AiiGrow.pkg"]
    p.environment = ["AIIGROW_GOC": goc, "AIIGROW_LAUNCHCTL": gia, "AIIGROW_PKGUTIL": gia, "PATH": "/usr/bin:/bin"]
    p.standardOutput = FileHandle.nullDevice; p.standardError = FileHandle.nullDevice
    try p.run(); p.waitUntilExit()
    let log = (try? String(contentsOfFile: nhatKy, encoding: .utf8)) ?? ""
    return (log.contains("bootstrap system"), fm.fileExists(atPath: goc + "/var/db/aiigrow-da-go"), fm.fileExists(atPath: goc + "/Applications/AiiGrow.app"),
            log.contains("--forget vn.aiilab.aiigrow.pkg"))
  }

  private func lstart(_ pid: Int32) -> String {
    let p = Process(), o = Pipe()
    p.executableURL = URL(fileURLWithPath: "/bin/ps"); p.arguments = ["-p", String(pid), "-o", "lstart="]; p.standardOutput = o
    p.environment = ["LC_ALL": "C"]                                             // như go-cai.sh ghi
    try? p.run(); p.waitUntilExit()
    return String(decoding: o.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
  }

  /// go-cai.sh chạy qua ống (`curl … | sudo bash`): dòng lệnh chỉ «bash» — nhận ra bằng PID + giờ bắt đầu, không bằng chữ «go-cai».
  func testGoCaiQuaOngVanNhanRa() throws {
    let tep = "\(getpid())\n\(lstart(getpid()))\n"
    XCTAssertTrue(HeThongMac.goCaiConSong(tep), "PID + lstart khớp ⇒ trình gỡ đang chạy")
    XCTAssertFalse(HeThongMac.goCaiConSong("\(getpid())\nMon Jan  1 00:00:00 2001\n"), "PID bị tiến trình khác dùng lại (giờ bắt đầu khác)")
    XCTAssertFalse(HeThongMac.goCaiConSong("\(getpid())\n"), "tệp kiểu cũ: dòng lệnh không có go-cai")
    let a = try chayPostinstall(daGo: true, pidDau: nil, pidGo: tep)
    XCTAssertFalse(a.bootstrapDaemon, "postinstall cùng quy tắc: go-cai qua ống còn chạy ⇒ không nạp lại"); XCTAssertFalse(a.appConLai)
    XCTAssertTrue(a.quenBienNhan, "dọn ⇒ quên luôn biên nhận installer vừa ghi")
    let c = try chayPostinstall(daGo: true, pidDau: nil, pidGo: "\(getpid())\n\(lstart(getpid()))    \n")     // ps để khoảng trắng cuối dòng như go-cai.sh ghi thật
    XCTAssertFalse(c.bootstrapDaemon)
    XCTAssertTrue(HeThongMac.goCaiConSong("\(getpid())\n\(lstart(getpid()))    \n"))
    let b = try chayPostinstall(daGo: true, pidDau: nil, pidGo: "\(getpid())\nMon Jan  1 00:00:00 2001\n")
    XCTAssertTrue(b.bootstrapDaemon)
    let s = try String(contentsOfFile: BaoMatTests.goiDir + "/go-cai.sh", encoding: .utf8)
    XCTAssertTrue(s.contains("{ echo $$; LC_ALL=C /bin/ps -p $$ -o lstart=; } > \"$GO_PID\""))
  }

  /// go-cai.sh đã phải dừng job cập nhật giữa chừng ⇒ giữ dấu «dung-cap-nhat»: installd cài nốt gói (đường $1 lạ) không nạp lại máy vừa gỡ.
  func testPostinstallSauKhiGoCaiDungCapNhat() throws {
    let a = try chayPostinstall(daGo: true, pidDau: nil, coConfig: false, dauGo: "dung-cap-nhat\n")
    XCTAssertFalse(a.bootstrapDaemon); XCTAssertFalse(a.appConLai); XCTAssertTrue(a.quenBienNhan)
    XCTAssertFalse(a.daGoConLai, "dấu dùng một lần")
    let b = try chayPostinstall(daGo: true, pidDau: nil, coConfig: true, dauGo: "dung-cap-nhat\n")
    XCTAssertTrue(b.bootstrapDaemon, "còn cấu hình ⇒ không phải máy vừa gỡ")
    let s = try String(contentsOfFile: BaoMatTests.goiDir + "/go-cai.sh", encoding: .utf8)
    XCTAssertTrue(s.contains("echo \"dung-cap-nhat\" > \"$DA_GO\""))
  }

  func testPostinstallPhanNhanhDaGo() throws {
    // đã gỡ + cài tự động (PID dấu là sh job còn sống, dòng lệnh mang nhãn job) ⇒ không nạp lại, giữ da-go, dọn app
    let job = Process()
    job.executableURL = URL(fileURLWithPath: "/bin/sh")
    job.arguments = ["-c", "sleep 30; :", "capnhat", "/tmp/x.pkg", LuatCapNhat.nhanCai]
    try job.run()
    defer { job.terminate() }
    let a = try chayPostinstall(daGo: true, pidDau: String(job.processIdentifier))
    XCTAssertFalse(a.bootstrapDaemon); XCTAssertTrue(a.daGoConLai); XCTAssertFalse(a.appConLai)
    // PID sót đã bị tiến trình KHÁC dùng lại (còn sống nhưng không phải job cập nhật) ⇒ coi như cài tay
    let e = try chayPostinstall(daGo: true, pidDau: String(getpid()))
    XCTAssertTrue(e.bootstrapDaemon); XCTAssertFalse(e.daGoConLai); XCTAssertTrue(e.appConLai)
    // đã gỡ + dấu cũ (PID chết) ⇒ coi như cài tay: xoá da-go, nạp bình thường
    let b = try chayPostinstall(daGo: true, pidDau: "99999999")
    XCTAssertTrue(b.bootstrapDaemon); XCTAssertFalse(b.daGoConLai); XCTAssertTrue(b.appConLai)
    // đã gỡ + không có dấu ⇒ cài tay
    let c = try chayPostinstall(daGo: true, pidDau: nil)
    XCTAssertTrue(c.bootstrapDaemon); XCTAssertFalse(c.daGoConLai)
    // chưa từng gỡ ⇒ bình thường dù có dấu
    let d = try chayPostinstall(daGo: false, pidDau: String(getpid()))
    XCTAssertTrue(d.bootstrapDaemon)
    // go-cai.sh còn chạy (đã giết job cập nhật sau 5 phút, installd vẫn cài tiếp) ⇒ không nạp lại, giữ da-go
    let go = Process()
    go.executableURL = URL(fileURLWithPath: "/bin/sh")
    go.arguments = ["-c", "sleep 30; :", "/var/tmp/aiigrow-go-cai.abc"]
    try go.run()
    defer { go.terminate() }
    let f = try chayPostinstall(daGo: true, pidDau: nil, pidGo: String(go.processIdentifier))
    XCTAssertFalse(f.bootstrapDaemon); XCTAssertTrue(f.daGoConLai); XCTAssertFalse(f.appConLai)
    // installd cài tiếp gói tự cập nhật sau khi go-cai đã giết job (không còn PID nào sống)
    let h = try chayPostinstall(daGo: true, pidDau: nil, goiTuDong: true)
    XCTAssertFalse(h.bootstrapDaemon); XCTAssertTrue(h.daGoConLai); XCTAssertFalse(h.appConLai)
    // … và cả khi go-cai đã xong (xoá da-go + config.json)
    let k = try chayPostinstall(daGo: false, pidDau: nil, goiTuDong: true, coConfig: false)
    XCTAssertFalse(k.bootstrapDaemon); XCTAssertFalse(k.appConLai)
    // tự cập nhật bình thường trên máy đã ghép ⇒ nạp lại
    let l = try chayPostinstall(daGo: false, pidDau: nil, goiTuDong: true)
    XCTAssertTrue(l.bootstrapDaemon); XCTAssertTrue(l.appConLai)
    // PID go-cai sót bị tiến trình khác dùng lại ⇒ cài tay
    let g = try chayPostinstall(daGo: true, pidDau: nil, pidGo: String(getpid()))
    XCTAssertTrue(g.bootstrapDaemon); XCTAssertFalse(g.daGoConLai)
  }
}

private func sha256Hex(_ d: Data) -> String { SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined() }
