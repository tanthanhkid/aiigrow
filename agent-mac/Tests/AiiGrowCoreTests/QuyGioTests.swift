// Quỹ giờ chơi 05/11 trên Mac: đếm lùi tại chỗ (cả mất mạng), ngoại lệ hết hạn, giờ ngủ / giờ học khi mất mạng, «Mở hết» hết quỹ, xin duyệt / ngoại lệ.
import XCTest
@testable import AiiGrowCore

final class QuyGioTests: XCTestCase {
  private let gocNgay: Date = {
    var c = DateComponents(); c.year = 2026; c.month = 11; c.day = 5; c.hour = 15; c.minute = 0   // thứ Năm 15:00 giờ máy
    return Calendar.current.date(from: c)!
  }()

  private func pol(mode: String = "hoc", quy: Int? = 10, appTinhGio: [String] = ["com.roblox.roblox"]) -> Policy {
    var p = policyMau(mode: mode, allowed: ["com.apple.textedit"] + appTinhGio, now: gocNgay)
    p.learningApps = ["com.apple.textedit"]
    p.quyConPhut = quy; p.appTinhGio = appTinhGio; p.quyTongPhut = 60
    return p
  }

  func testDocPolicyMoi() throws {
    let json = """
    {"mode":"hoc","allowedApps":["com.roblox.roblox"],"quyConPhut":18.4,"quyTongPhut":60,"quyDaDung":42,"appTinhGio":["com.Roblox.Roblox"],
     "gioNgu":{"tu":"21:30","den":"06:30"},"gioHoc":{"tu":"14:00","den":"16:00","thu":[1,2,3,4,5]},"dangGioHoc":false,
     "ngoaiLe":[{"den":"2026-11-05T09:00:00.000Z","app":null},{"den":"2026-11-05T09:00:00Z","app":"com.Minecraft"},{"den":"sai"}]}
    """
    let p = try PolicyParser.parse(json)
    XCTAssertEqual(p.quyConPhut, 18)
    XCTAssertEqual(p.appTinhGio, ["com.roblox.roblox"])
    XCTAssertEqual(p.gioNgu, KhungGio(tu: "21:30", den: "06:30"))
    XCTAssertEqual(p.gioHoc?.thu, [1, 2, 3, 4, 5])
    XCTAssertEqual(p.ngoaiLe.count, 2, "phần tử hỏng bị bỏ, không làm hỏng cả mảng")
    XCTAssertNil(p.ngoaiLe[0].app); XCTAssertEqual(p.ngoaiLe[1].app, "com.minecraft")
    // lưu đĩa rồi đọc lại giữ nguyên
    let d = try NgayGio.encoder.encode(p)
    XCTAssertEqual(try PolicyParser.parse(d), p)
    // Policy cũ không có trường mới ⇒ chạy như trước
    let cu = try PolicyParser.parse(#"{"mode":"hoc","allowedApps":["a"]}"#)
    XCTAssertNil(cu.quyConPhut); XCTAssertTrue(cu.appTinhGio.isEmpty)
    XCTAssertEqual(QuyGio.apDung(cu, quyGiay: 99_999, now: gocNgay, matMang: true).policy.allowedApps, ["a"])
  }

  func testKhungGioQuaNuaDem() {
    let n = KhungGio(tu: "21:30", den: "06:30")
    XCTAssertTrue(n.chua(phutNgay: 22 * 60, thuNay: 3))
    XCTAssertTrue(n.chua(phutNgay: 6 * 60, thuNay: 3))
    XCTAssertFalse(n.chua(phutNgay: 6 * 60 + 30, thuNay: 3))
    XCTAssertFalse(n.chua(phutNgay: 12 * 60, thuNay: 3))
    let h = KhungGio(tu: "14:00", den: "16:00", thu: [1, 2])
    XCTAssertTrue(h.chua(phutNgay: 15 * 60, thuNay: 1))
    XCTAssertFalse(h.chua(phutNgay: 15 * 60, thuNay: 0), "CN không có giờ học")
    XCTAssertFalse(KhungGio(tu: "x", den: "06:00").chua(phutNgay: 0, thuNay: 0))
  }

  func testHetQuyBoAppTinhGio() {
    let p = pol(quy: 10)
    XCTAssertEqual(QuyGio.conPhut(p, quyGiay: 0), 10)
    XCTAssertEqual(QuyGio.conPhut(p, quyGiay: 61), 8)
    var r = QuyGio.apDung(p, quyGiay: 599, now: gocNgay, matMang: false)
    XCTAssertTrue(r.policy.allowedApps.contains("com.roblox.roblox"), "còn 1 giây vẫn chơi")
    r = QuyGio.apDung(p, quyGiay: 600, now: gocNgay, matMang: false)
    XCTAssertEqual(r.policy.allowedApps, ["com.apple.textedit"], "hết quỹ ⇒ bỏ app tính giờ, app Học giữ")
    XCTAssertEqual(r.hetQuy, ["com.roblox.roblox"])
    XCTAssertTrue(r.policy.blockedApps.isEmpty, "chế độ «Chỉ app được phép» đã đóng app ngoài danh sách — không cần chặn thêm")
    XCTAssertTrue(QuyGio.laAppTinhGio(p, tienCanh: "com.Roblox.Roblox"))
    XCTAssertFalse(QuyGio.laAppTinhGio(p, tienCanh: "com.apple.textedit"))

  }

  /// Hết quỹ, máy chủ đã đồng bộ: gửi quyConPhut 0 + appTinhGio rỗng ⇒ vẫn đóng app Giải trí (lấy từ playChoices) ở «Mở hết».
  func testHetQuySauDongBoMayChuGuiAppTinhGioRong() {
    var p = pol(mode: "tu_do", quy: 0, appTinhGio: [])
    p.playChoices = ["com.roblox.roblox", "youtube.com"]
    let r = QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: false)
    XCTAssertEqual(Set(r.policy.blockedApps.map(\.muc)), ["com.roblox.roblox", "youtube.com"])
    XCTAssertEqual(r.hetQuy, ["com.roblox.roblox", "youtube.com"], "lý do het_gio cho màn chặn")
    // giờ học (máy chủ nói) ⇒ lý do gio_hoc, không phải het_gio
    p.mode = "hoc"; p.dangGioHoc = true
    let h = QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: false)
    XCTAssertTrue(h.hetQuy.isEmpty); XCTAssertEqual(h.gioHoc, ["com.roblox.roblox", "youtube.com"])
    // mất mạng, lịch học đã qua ⇒ cờ cũ không còn giữ
    p.gioHoc = KhungGio(tu: "08:00", den: "09:00", thu: [0, 1, 2, 3, 4, 5, 6]); p.quyConPhut = 20
    XCTAssertFalse(QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: true).policy.dangGioHoc)
  }

  func testSangNgayMoiDungTongQuy() {
    var p = pol(quy: 0); p.quyTongPhut = 60
    XCTAssertTrue(QuyGio.hetQuy(p, quyGiay: 0))
    XCTAssertFalse(QuyGio.hetQuy(p, quyGiay: 0, ngayMoi: true), "Policy hôm qua: hôm nay quỹ đầy lại")
    XCTAssertEqual(QuyGio.conPhut(p, quyGiay: 600, ngayMoi: true), 50)
    XCTAssertTrue(QuyGio.laAppTinhGio(p, tienCanh: nil), "không kiểm được tiền cảnh ⇒ vẫn tính giờ")
  }

  func testMoHetHetQuyThiDongAppTinhGio() {
    let r = QuyGio.apDung(pol(mode: "tu_do", quy: 0), quyGiay: 0, now: gocNgay, matMang: false)
    XCTAssertEqual(r.policy.mode, "tu_do")
    XCTAssertEqual(r.policy.blockedApps.map(\.muc), ["com.roblox.roblox"], "«Mở hết» hết quỹ ⇒ đóng app Giải trí như app Ba Mẹ chặn")
  }

  func testNgoaiLeCaMayThangHetQuy() {
    var p = pol(mode: "tu_do", quy: 0)
    p.grantEndsAt = gocNgay.addingTimeInterval(1800); p.ngoaiLe = [NgoaiLeMo(den: gocNgay.addingTimeInterval(1800), app: nil)]
    let r = QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: true)
    XCTAssertTrue(r.policy.blockedApps.isEmpty); XCTAssertTrue(r.hetQuy.isEmpty)
  }

  func testNgoaiLeMotAppHetHan() {
    var p = pol(quy: nil, appTinhGio: [])
    p.allowedApps.append("com.mojang.minecraft")
    p.ngoaiLe = [NgoaiLeMo(den: gocNgay.addingTimeInterval(-1), app: "com.mojang.minecraft")]
    XCTAssertFalse(QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: false).policy.allowedApps.contains("com.mojang.minecraft"))
    p.ngoaiLe = [NgoaiLeMo(den: gocNgay.addingTimeInterval(60), app: "com.mojang.minecraft")]
    XCTAssertTrue(QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: false).policy.allowedApps.contains("com.mojang.minecraft"))
  }

  func testMatMangTuXetGioNguVaGioHoc() {
    var p = pol(quy: 30)
    p.gioNgu = KhungGio(tu: "14:30", den: "06:30")
    var r = QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: true)
    XCTAssertEqual(r.policy.mode, "khoa"); XCTAssertTrue(r.policy.locked); XCTAssertEqual(r.policy.lockReason, LyDoKhoa.ngu)
    r = QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: false)
    XCTAssertEqual(r.policy.mode, "hoc", "có mạng: máy chủ quyết, không tự khoá")
    p.gioNgu = nil
    p.gioHoc = KhungGio(tu: "14:00", den: "16:00", thu: [4])
    r = QuyGio.apDung(p, quyGiay: 0, now: gocNgay, matMang: true)
    XCTAssertEqual(r.policy.allowedApps, ["com.apple.textedit"], "giờ học: chỉ app Học")
    XCTAssertTrue(r.hetQuy.isEmpty, "giờ học không phải hết giờ")
  }

  func testHocVienPathsVaDungSao() {
    XCTAssertTrue(HocVienPaths.duoc(method: "GET", path: "hoc-vien/quy"))
    XCTAssertTrue(HocVienPaths.duoc(method: "POST", path: "hoc-vien/doi-sao"))
    XCTAssertFalse(HocVienPaths.duoc(method: "GET", path: "hoc-vien/doi-sao"))
    XCTAssertEqual(DungSao.saoCan(phut: 15, phut10Sao: 10), 15)
    XCTAssertEqual(DungSao.saoCan(phut: 30, phut10Sao: 20), 15)
    XCTAssertEqual(DungSao.saoCan(phut: 15, phut10Sao: 20), 8)
    XCTAssertEqual(DungSao.than(phut: 30), #"{"phut":30}"#)
    XCTAssertTrue(DungSao.ketQua(.duLieu(json: #"{"phut":30,"sao":10}"#), phut: 30) == ("Đã đổi! +30 phút chơi hôm nay.", true))
    XCTAssertFalse(DungSao.ketQua(.loi(ma: "khong_du_sao", chu: "Con còn thiếu 5 sao"), phut: 30).duoc)
    let tq = HvTongQuan.doc(Data(#"{"soDu":30,"nhiemVu":[],"quy":{"conPhut":18,"tongPhut":60,"daDung":42,"tyLe":{"sao":10,"phut":20},"doiSao":{"bat":true,"conDoiDuoc":30},"choXinThem":false}}"#.utf8))
    XCTAssertEqual(tq?.quy?.conPhut, 18); XCTAssertEqual(tq?.quy?.phut10Sao, 20); XCTAssertEqual(tq?.quy?.choXinThem, false)
  }

  /// Daemon: quỹ đếm lùi CHỈ khi app tính giờ ở tiền cảnh; mất mạng vẫn đếm; hết ⇒ đóng app + lý do «het_gio» cho tray.
  func testBoMayDemLuiQuyKeCaMatMang() async throws {
    let tm = NSTemporaryDirectory() + "aiigrow-quy-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: tm, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(atPath: tm) }
    let fake = HeThongGia(), dongHo = DongHoGia()
    let kho = ConfigStore(duongDan: tm + "/config.json")
    var p = policyMau(mode: CheDo.hoc.rawValue, allowed: ["com.roblox.roblox"], now: dongHo.thuc)
    p.quyConPhut = 1; p.quyTongPhut = 60; p.appTinhGio = ["com.roblox.roblox"]
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let game = TienTrinh(pid: 77, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/Roblox", bundleId: "com.roblox.roblox")
    fake.tienTrinhTheoUid = [501: [game]]
    fake.conSongPid = [77]
    let api = MayChuGia()
    api.dongBoTraVe = .tu(p, next: 600)
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tienCanhDongBo: true, tuCapNhat: false),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    _ = await b.motVong()
    // app Học ở tiền cảnh: không tốn quỹ
    fake.tienCanhThat = "com.apple.textedit"
    for _ in 0..<20 { dongHo.tien(5); _ = await b.apChinhSach() }
    XCTAssertEqual(kho.doc()?.quyGiayTuSync ?? -1, 0, accuracy: 0.01)
    XCTAssertTrue(fake.tinHieuDaGui.isEmpty)
    // mất mạng, game ở tiền cảnh: đếm lùi, hết 60 giây ⇒ đóng
    api.dongBoTraVe = nil; api.dongBoLoi = LoiApi(chu: "mất mạng")
    fake.tienCanhThat = "com.roblox.roblox"
    for _ in 0..<14 { dongHo.tien(5); _ = await b.motVong() }
    XCTAssertGreaterThanOrEqual(kho.doc()?.quyGiayTuSync ?? 0, 60)
    XCTAssertTrue(fake.tinHieuDaGui.contains { $0.0 == 77 }, "hết quỹ lúc mất mạng ⇒ đóng game")
    if case let .trangThai(s) = await b.xuLyIPC(.trangThai, uidGoi: 501) {
      XCTAssertEqual(s.quyConPhut, 0); XCTAssertEqual(s.chanLyDo, QuyGio.lyDoHetGio)
    } else { XCTFail() }
  }

  func testXinDuyetVaNgoaiLeQuaDaemon() async throws {
    let tm = NSTemporaryDirectory() + "aiigrow-xin-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: tm, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(atPath: tm) }
    let fake = HeThongGia(), kho = ConfigStore(duongDan: tm + "/config.json")
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    let api = MayChuGia()
    let b = BoMay(api: api, heThong: fake, kho: kho, tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tuCapNhat: false))
    _ = await b.xuLyIPC(.xinMo(muc: "Roblox", loai: "app", loiNhan: nil), uidGoi: 501)
    _ = await b.xuLyIPC(.xinNgoaiLe(phamVi: "ca_may", app: nil, phut: 30, loiNhan: "làm bài"), uidGoi: 501)
    XCTAssertEqual(api.lanYeuCau.map(\.loai), ["cai_app", "ngoai_le"])
    XCTAssertEqual(api.lanYeuCau.last?.phut, 30)
    if case .loi = await b.xuLyIPC(.xinNgoaiLe(phamVi: "ca_may", app: nil, phut: 30, loiNhan: nil), uidGoi: 999) {} else { XCTFail("chỉ uid Con") }
  }
}
