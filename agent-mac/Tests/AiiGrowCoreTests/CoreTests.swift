// Unit test THUẦN: parse Policy, đếm giờ offline, khối /etc/hosts, quyết định đóng app, kiểm uid IPC, chính sách trình duyệt.
import XCTest
@testable import AiiGrowCore

final class CoreTests: XCTestCase {

  // MARK: parse Policy

  func testParsePolicyChuanHoa() throws {
    let json = """
    {"mode":"HOC","cheDo":"chan","lockReason":"  NGU ","allowedApps":["com.apple.TextEdit","com.apple.TextEdit","  "],
     "learningApps":["Pages.app"],"minutesLeft":-5,"nextCheckSec":0,"serverTime":"2026-10-24T03:00:00.000Z"}
    """
    let p = try PolicyParser.parse(json)
    XCTAssertEqual(p.mode, "hoc")
    XCTAssertEqual(p.cheDo, CheDoAgent.chan)
    XCTAssertEqual(p.lockReason, "ngu")
    XCTAssertEqual(p.allowedApps, ["com.apple.textedit"])        // trùng + chữ thường + bỏ rỗng
    XCTAssertEqual(p.learningApps, ["pages.app"])
    XCTAssertEqual(p.minutesLeft, 0)                              // âm ⇒ 0
    XCTAssertEqual(p.nextCheckSec, 30)                           // 0 ⇒ 30
    XCTAssertNotNil(p.serverTime)
  }

  func testParsePolicyModeSai() {
    XCTAssertThrowsError(try PolicyParser.parse(#"{"mode":"xyz"}"#))
    XCTAssertThrowsError(try PolicyParser.parse(""))
  }

  func testLayKhoiMacTruocWindows() throws {
    let raw = #"{"mode":"tu_do","nextCheckSec":99,"mac":{"mode":"khoa","nextCheckSec":20},"windows":{"mode":"hoc"}}"#
    let kq = try ApiClient.tachDongBo(Data(raw.utf8))
    XCTAssertEqual(kq.policy.mode, "khoa")                        // ưu tiên khối «mac»
    XCTAssertEqual(kq.nextCheckSec, 99)                          // nextCheckSec lấy ở gốc
  }

  func testTachDongBoLenh() throws {
    let raw = #"{"windows":{"mode":"hoc"},"nextCheckSec":45,"lenh":[{"id":7,"loai":"go"},{"id":"","loai":"x"}]}"#
    let kq = try ApiClient.tachDongBo(Data(raw.utf8))
    XCTAssertEqual(kq.lenh, [LenhMay(id: "7", loai: "go")])       // id số ⇒ chuỗi; mục rỗng bỏ
  }

  // MARK: đếm giờ offline

  func testGioOfflineTuTru() {
    let now = Date()
    var p = policyMau(mode: "tu_do", minutesLeft: 60, now: now)
    p.minutesLeft = 60
    // đã dùng 25 phút kể từ sync ⇒ còn 35
    let hl = DanhGiaPolicy.tinh(p, now: now, daDungGiay: 25 * 60)
    XCTAssertEqual(hl.conPhut!, 35, accuracy: 0.001)
    XCTAssertFalse(hl.khoa)
    // dùng hết ⇒ khoá het_gio
    let het = DanhGiaPolicy.tinh(p, now: now, daDungGiay: 61 * 60)
    XCTAssertTrue(het.khoa)
    XCTAssertEqual(het.lyDoKhoa, LyDoKhoa.hetGio)
  }

  func testMoCoHanHetHanKhiMatMang() {
    let now = Date()
    // mode tu_do + grantEndsAt đã qua ⇒ trở lại «chỉ app học»
    let p = policyMau(mode: "tu_do", grantEndsAt: now.addingTimeInterval(-10), now: now)
    let hl = DanhGiaPolicy.tinh(p, now: now, daDungGiay: 0)
    XCTAssertTrue(hl.chiAppHoc)
    XCTAssertNil(hl.moDen)
    // còn hạn ⇒ đang mở, không phải chỉ app học
    let p2 = policyMau(mode: "tu_do", grantEndsAt: now.addingTimeInterval(600), now: now)
    let hl2 = DanhGiaPolicy.tinh(p2, now: now, daDungGiay: 0)
    XCTAssertFalse(hl2.chiAppHoc)
    XCTAssertNotNil(hl2.moDen)
  }

  // MARK: khối /etc/hosts

  func testHostsThemGoDungMoc() {
    let goc = "127.0.0.1 localhost\n255.255.255.255 broadcasthost\n10.0.0.5 nhà-nội-bộ\n"
    let them = KhoiHosts.ap(goc, tenMien: ["youtube.com", "tiktok.com"])
    XCTAssertTrue(them.contains(KhoiHosts.batDau))
    XCTAssertTrue(them.contains(KhoiHosts.ketThuc))
    XCTAssertTrue(them.contains("0.0.0.0 youtube.com # AiiGrow"))
    XCTAssertTrue(them.contains(":: www.tiktok.com # AiiGrow"))
    XCTAssertTrue(them.contains("10.0.0.5 nhà-nội-bộ"))          // dòng người khác còn nguyên
    // gỡ ⇒ về đúng gốc (giữ dòng người khác, bỏ sạch khối)
    let go = KhoiHosts.go(them)
    XCTAssertFalse(go.contains("AiiGrow"))
    XCTAssertTrue(go.contains("10.0.0.5 nhà-nội-bộ"))
    XCTAssertTrue(go.contains("127.0.0.1 localhost"))
  }

  func testHostsGoKhiMatDongDong() {
    // khối mất dòng «# AiiGrow END» (sự cố) — vẫn gỡ sạch nhờ đuôi « # AiiGrow» mỗi dòng
    let hong = "127.0.0.1 localhost\n# AiiGrow BEGIN\n0.0.0.0 x.com # AiiGrow\n:: x.com # AiiGrow\n8.8.8.8 giuLai\n"
    let go = KhoiHosts.go(hong)
    XCTAssertFalse(go.contains("x.com"))
    XCTAssertFalse(go.contains("AiiGrow"))
    XCTAssertTrue(go.contains("8.8.8.8 giuLai"))
    XCTAssertTrue(go.contains("127.0.0.1 localhost"))
  }

  func testHostsGiuDongNguoiKhacCoChuAiiGrowTrongComment() {
    // dòng comment của người khác có chữ AiiGrow nhưng KHÔNG phải mốc/đuôi của ta ⇒ không được xoá nhầm (bắt đầu bằng #)
    let goc = "# ghi chú về AiiGrow của admin\n127.0.0.1 localhost\n"
    let them = KhoiHosts.ap(goc, tenMien: ["a.com"])
    XCTAssertTrue(them.contains("# ghi chú về AiiGrow của admin"))
    let go = KhoiHosts.go(them)
    XCTAssertTrue(go.contains("# ghi chú về AiiGrow của admin"))
  }

  // MARK: quyết định đóng app

  func testCanDongApp() {
    let con: UInt32 = 501
    let ds = [
      TienTrinh(pid: 100, uid: con, duongDan: "/Applications/Pages.app/Contents/MacOS/Pages"),
      TienTrinh(pid: 101, uid: con, duongDan: "/Applications/Minecraft.app/Contents/MacOS/Minecraft"),
      TienTrinh(pid: 102, uid: con, duongDan: "/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder", bundleId: "com.apple.finder"),
      TienTrinh(pid: 103, uid: 502, duongDan: "/Applications/Minecraft.app/Contents/MacOS/Minecraft"), // uid khác
      TienTrinh(pid: 104, uid: con, duongDan: "/usr/bin/ssh"),   // không phải .app
    ]
    let dong = QuyetDinhApp.canDong(ds, uidCon: con, chiAppHoc: true, choPhep: ["pages.app"])
    XCTAssertEqual(dong.map(\.pid), [101])                        // chỉ Minecraft của Con
  }

  func testDuocPhepNhanCaBundleVaTenApp() {
    let con: UInt32 = 501
    let t = TienTrinh(pid: 1, uid: con, duongDan: "/Applications/Numbers.app/Contents/MacOS/Numbers", bundleId: "com.apple.Numbers")
    XCTAssertTrue(QuyetDinhApp.duocPhep(t, choPhep: ["com.apple.numbers"]))   // theo bundle id
    XCTAssertTrue(QuyetDinhApp.duocPhep(t, choPhep: ["numbers.app"]))         // theo tên .app
    XCTAssertTrue(QuyetDinhApp.duocPhep(t, choPhep: ["numbers"]))             // theo tên không đuôi
    XCTAssertFalse(QuyetDinhApp.duocPhep(t, choPhep: ["pages"]))
  }

  func testKhongDongKhiGiamSat() {
    // chiAppHoc = false ⇒ không đóng gì (chế độ tự do / có mở)
    let ds = [TienTrinh(pid: 9, uid: 501, duongDan: "/Applications/Game.app/Contents/MacOS/Game")]
    XCTAssertTrue(QuyetDinhApp.canDong(ds, uidCon: 501, chiAppHoc: false, choPhep: []).isEmpty)
  }

  // MARK: kiểm uid IPC

  func testQuyenIPCConChiTuUidCon() {
    let con: UInt32 = 501
    let laAdmin: (UInt32) -> Bool = { $0 == 0 || $0 == 502 }
    // app tiền cảnh: chỉ uid Con
    XCTAssertEqual(QuyenIPC.kiem(.appTienCanh(bundleId: "x", ten: "X"), uidGoi: con, uidCon: con, daGhep: true, laAdmin: laAdmin), .duoc)
    if case .duoc = QuyenIPC.kiem(.appTienCanh(bundleId: "x", ten: "X"), uidGoi: 502, uidCon: con, daGhep: true, laAdmin: laAdmin) {
      XCTFail("uid khác Con không được báo app")
    }
    // trạng thái: ai cũng hỏi được
    XCTAssertEqual(QuyenIPC.kiem(.trangThai, uidGoi: 999, uidCon: con, daGhep: true, laAdmin: laAdmin), .duoc)
  }

  func testQuyenIPCGhepChiAdminVaChuaGhep() {
    let laAdmin: (UInt32) -> Bool = { $0 == 0 || $0 == 502 }
    // admin + chưa ghép ⇒ được
    XCTAssertEqual(QuyenIPC.kiem(.ghep(ma: "123456", taiKhoanCon: "bo"), uidGoi: 502, uidCon: nil, daGhep: false, laAdmin: laAdmin), .duoc)
    // không admin ⇒ từ chối
    if case .duoc = QuyenIPC.kiem(.ghep(ma: "1", taiKhoanCon: "b"), uidGoi: 501, uidCon: nil, daGhep: false, laAdmin: laAdmin) { XCTFail() }
    // đã ghép ⇒ từ chối dù admin
    if case .duoc = QuyenIPC.kiem(.ghep(ma: "1", taiKhoanCon: "b"), uidGoi: 502, uidCon: 501, daGhep: true, laAdmin: laAdmin) { XCTFail() }
    // root (uid 0) KHÔNG được ghép (daemon chạy root — tránh tự ghép), phải admin người thật
    if case .duoc = QuyenIPC.kiem(.ghep(ma: "1", taiKhoanCon: "b"), uidGoi: 0, uidCon: nil, daGhep: false, laAdmin: laAdmin) { XCTFail() }
  }

  // MARK: chính sách trình duyệt

  func testChinhSachTrinhDuyetGopVaGo() throws {
    let web = ChinhSachWeb(cheDo: ChinhSachWeb.mo, chan: ["youtube.com"], cho: ["khanhhoc.edu.vn"])
    let td = ChinhSachTrinhDuyet.tatCa.first { $0.ten == "Chrome" }!
    let moi = ChinhSachTrinhDuyet.gop(cu: ["1": "mục của IT giữ nguyên"], trinhDuyet: td, p: web, mayChuHost: "aiigrow.aiilab.vn")!
    XCTAssertEqual(moi[ChinhSachTrinhDuyet.khoaDanhDau] as? Bool, true)
    XCTAssertTrue((moi["URLBlocklist"] as? [String])?.contains("youtube.com") ?? false)
    XCTAssertEqual(moi["1"] as? String, "mục của IT giữ nguyên")   // mục người khác còn
    // plist hợp lệ (mã hoá được)
    XCTAssertNoThrow(try ChinhSachTrinhDuyet.maHoa(moi))
    // gỡ (p: nil) ⇒ chỉ còn mục người khác
    let go = ChinhSachTrinhDuyet.gop(cu: moi, trinhDuyet: td, p: nil, mayChuHost: nil)
    XCTAssertEqual(go?.count, 1)
    XCTAssertEqual(go?["1"] as? String, "mục của IT giữ nguyên")
    XCTAssertNil(go?[ChinhSachTrinhDuyet.khoaDanhDau])
  }

  func testChinhSachChiChoPhep() {
    let web = ChinhSachWeb(cheDo: ChinhSachWeb.chiChoPhep, chan: [], cho: ["truong.edu.vn"])
    let td = ChinhSachTrinhDuyet.tatCa.first { $0.ten == "Chrome" }!
    let (chan, cho) = ChinhSachTrinhDuyet.lap(web, mayChuHost: "aiigrow.aiilab.vn")
    XCTAssertTrue(chan.contains("*"))
    XCTAssertTrue(cho.contains("truong.edu.vn"))
    XCTAssertTrue(cho.contains("chrome://*"))
    _ = td
  }

  // MARK: đếm phút

  func testDemPhutTongTheoApp() {
    var d: [String: Double] = [:]
    DemPhut.cong(&d, ngay: "2026-10-24", app: "com.apple.Pages", giay: 130)
    DemPhut.cong(&d, ngay: "2026-10-24", app: "com.apple.pages", giay: 40)  // chữ hoa gộp cùng
    DemPhut.cong(&d, ngay: "2026-10-24", app: DemPhut.khongRo, giay: 50)
    let t = DemPhut.tong(d)
    XCTAssertEqual(t.first { $0.muc == "com.apple.pages" }?.phut, 2)        // 170s = 2 phút
    XCTAssertNil(t.first { $0.muc == DemPhut.khongRo })                     // 50s < 1 phút ⇒ không gửi
  }

  // MARK: config store ghi quyền 0600, nguyên khối

  func testConfigStoreGhiDocQuyen() throws {
    let dir = NSTemporaryDirectory() + "aiigrow-test-\(UUID().uuidString)"
    defer { try? FileManager.default.removeItem(atPath: dir) }
    let kho = ConfigStore(duongDan: dir + "/config.json")
    XCTAssertNil(kho.doc())
    var c = CauHinhMay()
    c.token = "tok"; c.uidCon = 501; c.tenCon = "Bo"
    try kho.ghi(c)
    let doc = kho.doc()
    XCTAssertEqual(doc?.token, "tok")
    XCTAssertEqual(doc?.uidCon, 501)
    let attr = try FileManager.default.attributesOfItem(atPath: kho.duongDan)
    XCTAssertEqual((attr[.posixPermissions] as? NSNumber)?.intValue, 0o600)
  }
}
