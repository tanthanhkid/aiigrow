// Mã mở offline (MaOffline.swift) — cùng số với máy chủ (server/lib/ma-offline.ts), luật khoá dò, kết thúc khi có mạng; Hôm nay theo app; nhịp «đang chơi».
import XCTest
@testable import AiiGrowCore

final class MaOfflineTests: XCTestCase {
  let biMat = "bi-mat-thu_ABC"
  let t0 = Date(timeIntervalSince1970: 1_760_000_000)

  func testCungSoVoiMayChu() {
    // số lấy từ server/lib/ma-offline.ts › maOffline(…) (node) — đổi thuật toán bên nào cũng phải đổi bên kia
    XCTAssertEqual(MaOffline.ma(biMat, luc: t0), "957503")
    XCTAssertEqual(MaOffline.ma(biMat, luc: t0.addingTimeInterval(300)), "028621")
    XCTAssertTrue(MaOffline.kiem(biMat, "957 503", luc: t0.addingTimeInterval(300)), "dung sai ±1 bước, bỏ ký tự không phải số")
    XCTAssertFalse(MaOffline.kiem(biMat, "957503", luc: t0.addingTimeInterval(900)))
    XCTAssertFalse(MaOffline.kiem(nil, "957503", luc: t0)); XCTAssertFalse(MaOffline.kiem(biMat, "95750", luc: t0))
  }

  func testMoMotLuotKhoaDoVaHan() {
    var st = MoTamOffline()
    XCTAssertEqual(st.thuMo(biMat: nil, ma: "1", now: t0), .chuaCoBiMat)
    XCTAssertEqual(st.thuMo(biMat: biMat, ma: "957503", now: t0), .daMo)
    XCTAssertTrue(st.dangMo(t0.addingTimeInterval(59 * 60))); XCTAssertFalse(st.dangMo(t0.addingTimeInterval(61 * 60)))
    XCTAssertFalse(st.dangMo(t0.addingTimeInterval(-3600)), "lùi đồng hồ không kéo dài được")
    XCTAssertEqual(st.thuMo(biMat: biMat, ma: "957503", now: t0.addingTimeInterval(10)), .dangMo)
    var ngan = MoTamOffline()
    XCTAssertEqual(ngan.thuMo(biMat: biMat, ma: "957503", now: t0, phut: 5), .daMo)
    XCTAssertEqual(ngan.thuMo(biMat: biMat, ma: "957503", now: t0.addingTimeInterval(400)), .daDung, "hết lượt mở thì mã cũ không mở lại được")
    var dò = MoTamOffline()
    for i in 0..<5 { XCTAssertEqual(dò.thuMo(biMat: biMat, ma: String(format: "%06d", i), now: t0), .sai) }
    XCTAssertEqual(dò.thuMo(biMat: biMat, ma: "957503", now: t0.addingTimeInterval(1)), .choThuLai, "sai 5 lần ⇒ chờ, kể cả mã đúng")
    XCTAssertEqual(dò.thuMo(biMat: biMat, ma: MaOffline.ma(biMat, luc: t0.addingTimeInterval(601)), now: t0.addingTimeInterval(601)), .daMo)
    XCTAssertTrue(MoTamOffline.moDuocKhoa("het_gio")); XCTAssertFalse(MoTamOffline.moDuocKhoa(nil))
    let hl = PolicyHieuLuc(khoa: true, lyDoKhoa: "khoa", conPhut: nil, moDen: nil, chiAppHoc: true)
    let mo = MoTamOffline.apDung(hl, dangMo: true)
    XCTAssertFalse(mo.khoa); XCTAssertFalse(mo.chiAppHoc)
    XCTAssertEqual(MoTamOffline.apDung(hl, dangMo: false), hl)
  }

  func testDangChoiTheoTienCanh() {
    XCTAssertTrue(ChoiBangDiem.dangChoi(tienCanh: nil, playApp: "com.roblox.roblox", playWeb: false), "chưa kiểm được ⇒ tính")
    XCTAssertTrue(ChoiBangDiem.dangChoi(tienCanh: "com.Roblox.Roblox", playApp: "com.roblox.roblox", playWeb: false))
    XCTAssertTrue(ChoiBangDiem.dangChoi(tienCanh: "com.roblox.roblox.player", playApp: "com.roblox.roblox", playWeb: false))
    XCTAssertFalse(ChoiBangDiem.dangChoi(tienCanh: "com.apple.iwork.pages", playApp: "com.roblox.roblox", playWeb: false))
    XCTAssertTrue(ChoiBangDiem.dangChoi(tienCanh: "com.google.Chrome", playApp: nil, playWeb: true))
    XCTAssertFalse(ChoiBangDiem.dangChoi(tienCanh: "com.apple.iwork.pages", playApp: nil, playWeb: true))
  }

  // MARK: daemon

  private func dung(_ fake: HeThongGia, _ dh: DongHoGia, _ thuMuc: String, policy: String) throws -> (BoMay, ConfigStore) {
    let kho = ConfigStore(duongDan: thuMuc + "/config.json")
    let pol = try PolicyParser.parse(policy)
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be"; $0.policyCuoi = pol; $0.policyLuc = dh.thuc }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let api = ApiClient(mayChu: "https://aiigrow.aiilab.vn", token: "t", session: HttpMock.session())
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed", tienCanhDongBo: true, tuCapNhat: false),
                  dongHo: { dh.thuc }, donDieu: { dh.donDieu })
    return (b, kho)
  }

  func testMaOfflineGoKhoaRoiHetKhiCoMang() async throws {
    let thuMuc = NSTemporaryDirectory() + "aiigrow-mo-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: thuMuc, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dh = DongHoGia()
    dh.thuc = t0
    let pj = #"{"mode":"khoa","locked":true,"lockReason":"khoa","maOfflineBiMat":"bi-mat-thu_ABC"}"#
    let (b, kho) = try dung(fake, dh, thuMuc, policy: pj)
    HttpMock.dat { _, _ in nil }                     // mất mạng
    await b.vongDongBo()
    guard case .trangThai(let t1) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(t1.cheDo, .khoa); XCTAssertEqual(t1.nhapMaOffline, true); XCTAssertNil(t1.demNguocGiay, "chờ mã: không đếm ngược đăng xuất")
    let ap = await b.vongAp(); XCTAssertNil(ap.demNguocGiay); XCTAssertTrue(fake.daDongPhien.isEmpty)
    let sai = await b.xuLyIPC(.maOffline(ma: "000000"), uidGoi: 501)
    guard case .loi = sai else { return XCTFail() }
    if case .duoc = QuyenIPC.kiem(.maOffline(ma: "1"), uidGoi: 502, uidCon: 501, daGhep: true, laAdmin: { _ in true }) { XCTFail("chỉ uid Con") }
    let dung = await b.xuLyIPC(.maOffline(ma: "957503"), uidGoi: 501)
    guard case .thongBao = dung else { return XCTFail("\(dung)") }
    XCTAssertEqual(kho.doc()?.moTamOffline?.saiLuc.count, 0, "lưu đĩa")
    guard case .trangThai(let t2) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertNotEqual(t2.cheDo, .khoa); XCTAssertNotNil(t2.moOfflineDen); XCTAssertNotEqual(t2.nhapMaOffline, true)
    // có mạng lại ⇒ đồng bộ được ⇒ hết lượt mở
    HttpMock.dat { path, _ in path == "api/device/dong-bo" ? HttpMock.TraLoi(ma: 200, than: Data(#"{"windows":\#(pj),"nextCheckSec":30}"#.utf8)) : HttpMock.json(404, [:]) }
    dh.tien(120)
    await b.vongDongBo()
    guard case .trangThai(let t3) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(t3.cheDo, .khoa); XCTAssertNil(t3.moOfflineDen)
  }

  func testHomNayTheoAppChiHomNayVaNhieuTruoc() async throws {
    let thuMuc = NSTemporaryDirectory() + "aiigrow-hn-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: thuMuc, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dh = DongHoGia()
    let (b, kho) = try dung(fake, dh, thuMuc, policy: #"{"mode":"tu_do"}"#)
    let hn = DemPhut.ngay(dh.thuc)
    try kho.sua { $0.demPhut = [hn + "|com.a": 600, hn + "|com.b": 1800, hn + "|" + DemPhut.khongRo: 900, hn + "|com.c": 30, "2000-01-01|com.z": 9000] }
    let b2 = BoMay(api: ApiClient(mayChu: "https://x", token: "t", session: HttpMock.session()), heThong: fake, kho: kho,
                   tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed", tuCapNhat: false),
                   dongHo: { dh.thuc }, donDieu: { dh.donDieu })
    _ = b
    guard case .trangThai(let t) = await b2.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(t.homNayTheoApp?.map(\.muc), ["com.b", "com.a"])
    XCTAssertEqual(t.homNayTheoApp?.first?.phut, 30)
  }
}
