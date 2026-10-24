// Test TÍCH HỢP: daemon (BoMay) chạy trong tiến trình test với HeThong giả + ApiClient thật đi qua HTTP mock (HttpMock),
// socket IPC thật ở thư mục tạm, cấu hình ở thư mục tạm. Đi trọn 9 kịch bản của đề.
import XCTest
@testable import AiiGrowCore

final class TichHopTests: XCTestCase {
  var thuMuc = ""
  var kho: ConfigStore!
  var fake: HeThongGia!
  var dongHo: DongHoGia!
  var boMay: BoMay!
  var socket: SocketIPC!
  var duongSocket = ""
  var tenToi = ""
  var uidToi: UInt32 = 0

  override func setUp() async throws {
    thuMuc = NSTemporaryDirectory() + "aiigrow-th-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: thuMuc, withIntermediateDirectories: true)
    duongSocket = thuMuc + "/d.sock"
    kho = ConfigStore(duongDan: thuMuc + "/config.json")
    dongHo = DongHoGia()
    tenToi = NSUserName()
    uidToi = getuid()

    fake = HeThongGia()
    // Con = chính tài khoản chạy test (để lệnh qua socket có uid == uidCon); còn một admin khác để hạ quyền được.
    fake.uidTheoTen = [tenToi: uidToi, "admin_khac": 502]
    fake.admin = [tenToi, "admin_khac"]
    fake.phien = PhienConsole(uid: uidToi, manKhoa: false)
    fake.ten = "Mac-Test"

    let api = ApiClient(mayChu: "https://aiigrow.aiilab.vn", token: nil, session: HttpMock.session())
    boMay = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed", vongGiay: 5, demNguocKhoaGiay: 30, tienCanhDongBo: true),
                  dongHo: { [dongHo] in dongHo!.thuc }, donDieu: { [dongHo] in dongHo!.donDieu })
    socket = SocketIPC(duongDan: duongSocket) { [boMay] yc, uid in await boMay!.xuLyIPC(yc, uidGoi: uid) }
    try socket.mo()
    Task { await self.socket.phucVu() }
  }

  override func tearDown() async throws {
    socket.dong()
    HttpMock.dat { _, _ in nil }
    try? FileManager.default.removeItem(atPath: thuMuc)
  }

  /// JSON phản hồi dong-bo đúng dạng máy chủ (khối agent dưới key «windows», kèm nextCheckSec).
  private func dapDongBo(mode: String, cheDo: String = "chan", minutesLeft: Int? = nil, allowed: [String] = [],
                         chan: [String] = [], grantEndsAt: Date? = nil, lenh: [[String: Any]] = []) -> HttpMock.TraLoi {
    var win: [String: Any] = ["mode": mode, "cheDo": cheDo, "locked": mode == "khoa", "nextCheckSec": 30,
                              "serverTime": NgayGio.viet(dongHo.thuc), "allowedApps": allowed, "learningApps": allowed,
                              "web": ["cheDo": "mo", "chan": chan, "cho": []]]
    if let m = minutesLeft { win["minutesLeft"] = m }
    if let g = grantEndsAt { win["grantEndsAt"] = NgayGio.viet(g) }
    return HttpMock.json(200, ["mode": mode, "nextCheckSec": 30, "lenh": lenh, "windows": win])
  }

  func testKichBanTronVen() async throws {
    // ───── 1. chưa ghép ─────
    HttpMock.dat { _, _ in self.dapDongBo(mode: "tu_do") }
    let t1 = await boMay.motVong()
    XCTAssertFalse(t1.daGhep, "1. chưa ghép")
    let s1 = try SocketTest.gui(.trangThai, duongDan: duongSocket)
    guard case let .trangThai(tt1) = s1 else { return XCTFail("socket trangThai") }
    XCTAssertFalse(tt1.daGhep)

    // ───── 2. ghép (qua socket, uid admin thật của test) ─────
    HttpMock.dat { path, _ in
      if path == "api/device/ghep" { return HttpMock.json(200, ["deviceId": "dev9", "token": "tok9", "childName": "Bé Na"]) }
      return self.dapDongBo(mode: "tu_do")
    }
    let s2 = try SocketTest.gui(.ghep(ma: "123456", taiKhoanCon: tenToi), duongDan: duongSocket)
    guard case .ok = s2 else { return XCTFail("ghép phải ok, nhận \(s2)") }
    let cfg = kho.doc()
    XCTAssertEqual(cfg?.token, "tok9")
    XCTAssertEqual(cfg?.uidCon, uidToi)
    XCTAssertEqual(fake.daHaQuyen, [tenToi], "2. hạ Con khỏi admin (còn admin_khac)")
    let daGhep = await boMay.daGhep
    XCTAssertTrue(daGhep)

    // ───── 3. sync tu_do ─────
    HttpMock.dat { _, _ in self.dapDongBo(mode: "tu_do", minutesLeft: 60) }
    dongHo.donDieu += 100                                  // qua hạn syncLuc để sync lại
    let t3 = await boMay.motVong()
    XCTAssertEqual(HttpMock.authCuoi("api/device/dong-bo"), "Bearer tok9", "3. dong-bo ngay sau ghép mang token MỚI (không cần khởi động lại daemon)")
    XCTAssertEqual(t3.cheDo, .tuDo, "3. sync tu_do")
    XCTAssertFalse(t3.matMang)

    // ───── 4. Con báo appTienCanh → phút tăng ─────
    // Tray báo app tiền cảnh đều đặn mỗi ~8 giây (trong cửa sổ tươi 10 giây), daemon áp chính sách giữa các lần báo.
    fake.tienCanhThat = "com.apple.Pages"                  // daemon tự kiểm thấy Pages ở tiền cảnh
    for _ in 0..<18 {
      let s4 = try SocketTest.gui(.appTienCanh(bundleId: "com.apple.Pages", ten: "Pages"), duongDan: duongSocket)
      guard case .ok = s4 else { return XCTFail("appTienCanh ok") }
      dongHo.donDieu += 8                                  // 8 giây trôi khi Con đang dùng Pages
      _ = await boMay.apChinhSach()
    }                                                       // ~144 giây = hơn 2 phút
    // lần sync kế gửi usage TỔNG lên máy chủ
    HttpMock.dat { _, _ in self.dapDongBo(mode: "tu_do", minutesLeft: 60) }
    dongHo.donDieu += 100
    _ = await boMay.motVong()
    let db = HttpMock.lanGoiCuoi("api/device/dong-bo")
    let usage = db?["usage"] as? [[String: Any]] ?? []
    XCTAssertTrue(usage.contains { ($0["muc"] as? String) == "com.apple.pages" && ($0["phut"] as? Int ?? 0) >= 2 }, "4. phút Pages tăng, status.agent=mac")
    XCTAssertEqual((db?["status"] as? [String: Any])?["agent"] as? String, "mac")
    XCTAssertNil((db?["status"] as? [String: Any])?["playSeconds"], "4. KHÔNG gửi playSeconds (Mac chưa đo giây theo phiên)")

    // ───── 5. mode khoa → đếm ngược ─────
    HttpMock.dat { _, _ in self.dapDongBo(mode: "khoa") }
    dongHo.donDieu += 100
    let t5 = await boMay.motVong()
    XCTAssertEqual(t5.cheDo, .khoa, "5. mode khoa")
    XCTAssertEqual(t5.lyDoKhoa, "ba_me_khoa")
    XCTAssertNotNil(t5.demNguocGiay, "5. có đếm ngược trước khi đóng phiên")
    XCTAssertTrue(t5.demNguocGiay! > 0)
    // IPC trangThai dồn dập CHỈ đọc: đếm ngược không chạy nhanh hơn
    for _ in 0..<10 {
      guard case let .trangThai(x) = try SocketTest.gui(.trangThai, duongDan: duongSocket) else { return XCTFail("trangThai") }
      XCTAssertEqual(x.demNguocGiay, t5.demNguocGiay, "5. IPC không trừ đếm ngược")
    }
    HttpMock.dat { _, _ in self.dapDongBo(mode: "khoa") }
    dongHo.donDieu += 5
    let t5b = await boMay.apChinhSach()
    XCTAssertEqual(t5b.demNguocGiay, t5.demNguocGiay! - 5, "5. chỉ vòng daemon trừ đúng một vongGiay")

    // ───── 6. xinThem → máy chủ duyệt → grantEndsAt → tu_do ─────
    HttpMock.dat { path, _ in
      if path == "api/device/yeu-cau" { return HttpMock.json(200, ["id": "yc7", "status": "tu_duyet"]) }
      return self.dapDongBo(mode: "tu_do")
    }
    let s6 = try SocketTest.gui(.xinThem(phut: 30, loiNhan: "con làm xong bài"), duongDan: duongSocket)
    guard case let .ok(id) = s6 else { return XCTFail("xinThem ok") }
    XCTAssertEqual(id, "yc7")
    let den = dongHo.thuc.addingTimeInterval(1800)
    HttpMock.dat { _, _ in self.dapDongBo(mode: "tu_do", grantEndsAt: den) }
    dongHo.donDieu += 100
    let t6 = await boMay.motVong()
    XCTAssertEqual(t6.cheDo, .tuDo, "6. được thêm giờ ⇒ tu_do")
    XCTAssertNotNil(t6.moDen, "6. có grantEndsAt")

    // ───── 7. mất mạng → chạy theo Policy nhớ, giờ còn lại tự trừ ─────
    HttpMock.dat { _, _ in self.dapDongBo(mode: "tu_do", minutesLeft: 40) }
    dongHo.donDieu += 100
    _ = await boMay.motVong()                              // sync được: còn 40 phút
    HttpMock.dat { _, _ in nil }                           // rớt mạng
    dongHo.donDieu += 100                                  // qua syncLuc ⇒ thử sync, thất bại
    _ = await boMay.motVong()
    // 10 phút trôi khi Con dùng máy — daemon vẫn áp chính sách mỗi 5 giây theo Policy nhớ
    for _ in 0..<40 { dongHo.donDieu += 15; _ = await boMay.apChinhSach() }
    let t7 = await boMay.apChinhSach()
    XCTAssertTrue(t7.matMang, "7. báo mất mạng")
    XCTAssertNotNil(t7.conPhut)
    XCTAssertLessThan(t7.conPhut!, 40, "7. giờ còn lại tự trừ khi offline")
    XCTAssertGreaterThan(t7.conPhut!, 25)

    // ───── 8. lệnh của uid lạ bị từ chối ─────
    let laTuChoi = await boMay.xuLyIPC(.appTienCanh(bundleId: "x", ten: "X"), uidGoi: 99999)
    guard case let .loi(ma, _) = laTuChoi else { return XCTFail("uid lạ phải bị từ chối") }
    XCTAssertEqual(ma, "khong_phai_con", "8. uid lạ bị từ chối")
    // ghép lại qua socket (đã ghép) cũng bị từ chối
    let s8 = try SocketTest.gui(.ghep(ma: "1", taiKhoanCon: tenToi), duongDan: duongSocket)
    guard case let .loi(ma8, _) = s8, ma8 == "da_ghep" else { return XCTFail("ghép lại phải báo da_ghep") }

    // ───── 9. hosts + chính sách trình duyệt sinh đúng rồi gỡ đúng ─────
    fake.tep[thuMuc + "/hosts"] = Data("127.0.0.1 localhost\n".utf8)
    HttpMock.dat { _, _ in self.dapDongBo(mode: "hoc", allowed: ["com.apple.Pages"], chan: ["youtube.com", "tiktok.com"]) }
    dongHo.donDieu += 100
    _ = await boMay.motVong()
    let hosts = String(decoding: fake.tep[thuMuc + "/hosts"] ?? Data(), as: UTF8.self)
    XCTAssertTrue(hosts.contains("0.0.0.0 youtube.com # AiiGrow"), "9. hosts sinh đúng")
    XCTAssertTrue(hosts.contains(KhoiHosts.batDau) && hosts.contains(KhoiHosts.ketThuc))
    XCTAssertTrue(hosts.contains("127.0.0.1 localhost"))
    XCTAssertGreaterThan(fake.daXoaDNS, 0, "9. có flush DNS")
    let plistChrome = fake.tep[thuMuc + "/Managed/\(tenToi)/com.google.Chrome.plist"]
    XCTAssertNotNil(plistChrome, "9. plist chính sách Chrome sinh ra")
    let pl = ChinhSachTrinhDuyet.giaiMa(plistChrome)
    XCTAssertEqual(pl?[ChinhSachTrinhDuyet.khoaDanhDau] as? Bool, true)
    XCTAssertTrue((pl?["URLBlocklist"] as? [String])?.contains("youtube.com") ?? false)

    // gỡ: chuyển về giám sát ⇒ gỡ hosts + xoá plist
    HttpMock.dat { _, _ in self.dapDongBo(mode: "hoc", cheDo: "giam-sat", chan: ["youtube.com"]) }
    dongHo.donDieu += 100
    _ = await boMay.motVong()
    let hosts2 = String(decoding: fake.tep[thuMuc + "/hosts"] ?? Data(), as: UTF8.self)
    XCTAssertFalse(hosts2.contains("AiiGrow"), "9. giám sát ⇒ gỡ khối hosts")
    XCTAssertTrue(hosts2.contains("127.0.0.1 localhost"))
    XCTAssertNil(fake.tep[thuMuc + "/Managed/\(tenToi)/com.google.Chrome.plist"], "9. giám sát ⇒ xoá plist Chrome")
  }
}
