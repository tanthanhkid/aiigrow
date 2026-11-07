// Ví quà (V1 07/11): đọc `GET device/vi-qua`, đường cho phép qua daemon, QR sinh tại máy, bản lưu khi mất mạng, điều kiện đổi quà.
import XCTest
import AppKit
import AiiGrowCore
@testable import AiiGrowTray

@MainActor
final class ViQuaTests: XCTestCase {
  static let json = """
  {"con":{"id":"c1","ten":"Bảo Anh","avatar":"rob"},"sao":450,"saoGiu":50,
   "qua":[
    {"id":"q3","ten":"Đi xem phim","loai":"dac_quyen","sao":300,"hinh":"phim","moTa":"Chỉ cuối tuần","menhGia":null,"laVoucher":false,"du":true,"conThieu":0,"choTraoTu":null,
     "dieuKien":{"chiCuoiTuan":true,"toiDaThang":null,"daDoiThang":0,"tonKho":null},"conHopLe":false,"lyDoKhong":"chi_cuoi_tuan","doiDuoc":false},
    {"id":"q4","ten":"Đồ chơi nhỏ","loai":"qua","sao":200,"du":true,"conThieu":0,"choTraoTu":null,
     "dieuKien":{"chiCuoiTuan":false,"toiDaThang":1,"daDoiThang":1,"tonKho":3},"conHopLe":false,"lyDoKhong":"du_thang","doiDuoc":false},
    {"id":"q5","ten":"Chọn món bữa tối","loai":"dac_quyen","sao":50,"du":true,"conThieu":0,"choTraoTu":null,
     "dieuKien":{"chiCuoiTuan":false,"toiDaThang":null,"daDoiThang":0,"tonKho":null},"conHopLe":true,"lyDoKhong":null,"doiDuoc":true}],
   "phieuCho":[{"id":"p1","ten":"Chọn món bữa tối","loai":"dac_quyen","sao":50,"doiLuc":"2026-11-07T03:00:00.000Z"}],
   "daTrao":[{"id":"p2","ten":"Voucher AiiCafe 50k","loai":"voucher","sao":500,"traoLuc":"2026-11-07T03:05:00.000Z",
     "voucher":{"ma":"AGK3M9X2PQ7R","qr":"AGK3M9X2PQ7R","menhGia":50000,"trangThai":"da_phat_hanh","hetHan":"2026-12-25T03:05:00.000Z","conNgay":49}},
     {"id":"p3","ten":"Xem hoạt hình","loai":"dac_quyen","sao":50,"traoLuc":"2026-11-05T03:05:00.000Z","voucher":null}],
   "voucher":[{"ten":"Voucher AiiCafe 50k","ma":"AGK3M9X2PQ7R","qr":"AGK3M9X2PQ7R","menhGia":50000,"trangThai":"da_phat_hanh","hetHan":"2026-12-25T03:05:00.000Z","conNgay":49,"dungLuc":null},
     {"ten":"AiiCafe 20k","ma":"OLD1","trangThai":"het_han","hetHan":"2026-10-01T03:05:00.000Z","conNgay":0}],
   "huyHieu":[{"ma":"sieng_doc","ten":"Siêng đọc sách","moTa":"Đọc sách 5 ngày liền","datLuc":"2026-11-07T03:00:00.000Z"},
              {"ma":"tu_lap","ten":"Bé tự lập","moTa":"Làm đủ 5 việc trong 1 ngày","datLuc":"2026-11-06T03:00:00.000Z"}]}
  """

  static func mau() -> HvViQua { HvViQua.doc(Data(json.utf8))! }

  func testDocViQua() {
    let v = ViQuaTests.mau()
    XCTAssertEqual(v.tenCon, "Bảo Anh"); XCTAssertEqual(v.sao, 450); XCTAssertEqual(v.saoGiu, 50)
    XCTAssertEqual(v.qua.count, 3); XCTAssertEqual(v.phieuCho.first?.sao, 50)
    XCTAssertEqual(v.daTrao.count, 2); XCTAssertEqual(v.daTrao[0].voucher?.conNgay, 49); XCTAssertNil(v.daTrao[1].voucher)
    XCTAssertEqual(v.voucher[0].qr, "AGK3M9X2PQ7R"); XCTAssertNil(v.voucher[1].qr, "hết hạn không còn QR")
    XCTAssertEqual(v.huyHieu.map(\.ten), ["Siêng đọc sách", "Bé tự lập"]); XCTAssertTrue(v.coGi)
    XCTAssertNil(HvViQua.doc(Data(#"{"loi":1}"#.utf8)))
  }

  func testDieuKienDoiQua() {
    let q = ViQuaTests.mau().qua
    XCTAssertTrue(q[0].chiCuoiTuan, "đọc từ dieuKien"); XCTAssertEqual(q[2].tonKho, nil); XCTAssertEqual(q[1].tonKho, 3)
    XCTAssertFalse(HocVienView.doiDuoc(q[0])); XCTAssertEqual(HocVienView.lyDoKhongDoi(q[0]), "Chỉ đổi vào cuối tuần")
    XCTAssertEqual(HocVienView.lyDoKhongDoi(q[1]), "Tháng này con đã đổi đủ lượt")
    XCTAssertTrue(HocVienView.doiDuoc(q[2])); XCTAssertNil(HocVienView.lyDoKhongDoi(q[2]))
    XCTAssertEqual(ManMac.dongQua(q[0]), "Chỉ cuối tuần"); XCTAssertEqual(ManMac.dongQua(q[1]), "Tháng này đã đổi đủ lượt")
    // cửa hàng cũ không có doiDuoc ⇒ theo đủ sao
    var c = HvQua(); c.du = true; XCTAssertTrue(HocVienView.doiDuoc(c)); c.du = false; XCTAssertFalse(HocVienView.doiDuoc(c))
    c.du = true; c.choTraoTu = Date(); XCTAssertFalse(HocVienView.doiDuoc(c), "đã đổi, chờ trao")
  }

  func testHanVoucher() {
    var v = HvVoucher(); v.trangThai = "da_phat_hanh"; v.conNgay = 49
    XCTAssertEqual(HocVienView.hanVoucher(v), "Còn 49 ngày")
    v.conNgay = 0; XCTAssertEqual(HocVienView.hanVoucher(v), "Hết hạn hôm nay")
    v.trangThai = "het_han"; XCTAssertEqual(HocVienView.hanVoucher(v), "Đã hết hạn")
    v.trangThai = "da_dung"; XCTAssertEqual(HocVienView.hanVoucher(v), "Đã dùng")
  }

  func testDuongViQuaQuaDaemon() {
    XCTAssertTrue(HocVienPaths.duoc(method: "GET", path: "vi-qua"))
    XCTAssertFalse(HocVienPaths.duoc(method: "POST", path: "vi-qua"))
    XCTAssertFalse(HocVienPaths.duoc(method: "GET", path: "vi-qua?x=1"))
    XCTAssertFalse(HocVienPaths.duoc(method: "GET", path: "vi-qua/x"))
    XCTAssertFalse(HocVienPaths.duoc(method: "GET", path: "ho-so"))
    XCTAssertTrue(HocVienPaths.duoc(method: "GET", path: "hoc-vien/cua-hang"))
  }

  func testQrSinhTaiMay() throws {
    let img = try XCTUnwrap(QrAnh.tao("AGK3M9X2PQ7R", canh: 132))
    XCTAssertGreaterThanOrEqual(img.size.width, 100); XCTAssertEqual(img.size.width, img.size.height)
    XCTAssertNil(QrAnh.tao(""))
    // giải ngược bằng CIDetector: QR đọc ra đúng chuỗi
    var rect = NSRect(origin: .zero, size: img.size)
    let cg = try XCTUnwrap(img.cgImage(forProposedRect: &rect, context: nil, hints: nil))
    let det = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
    let kq = det?.features(in: CIImage(cgImage: cg)).compactMap { ($0 as? CIQRCodeFeature)?.messageString }
    XCTAssertEqual(kq, ["AGK3M9X2PQ7R"])
  }

  func testDongVoucher() {
    let v = ViQuaTests.mau().daTrao[0].voucher!
    let f = DateFormatter(); f.dateFormat = "dd/MM"
    XCTAssertEqual(ViQuaView.dongVoucher(sao: 500, v), "500 sao · mã QR · hạn " + f.string(from: v.hetHan!))
  }

  /// Tải được ⇒ lưu; mất mạng ⇒ hiện bản đã lưu của ĐÚNG bé; bé khác / chưa chọn bé ⇒ không lộ ví.
  func testBanLuuKhiMatMang() async {
    let kho = UserDefaults(suiteName: "vi-qua-test-\(UUID().uuidString)")!
    var online = true
    let goi: (YeuCauTray) async -> TraLoi = { yc in
      guard case .hocVien(_, "vi-qua", _) = yc else { return .loi(ma: "x", chu: "") }
      return online ? .duLieu(json: ViQuaTests.json) : .loi(ma: "hoc_vien_loi", chu: "Chưa có mạng, con thử lại sau nhé.")
    }
    let a = AppConModel(goi: goi, kho: kho); a.tenBe = "Bảo Anh"
    await a.taiViQua()
    XCTAssertEqual(a.viQua?.sao, 450); XCTAssertFalse(a.viQuaDaLuu)
    online = false
    let b = AppConModel(goi: goi, kho: kho); b.tenBe = "Bảo Anh"        // daemon/tray khởi động lại lúc mất mạng
    await b.taiViQua()
    XCTAssertEqual(b.viQua?.huyHieu.count, 2); XCTAssertTrue(b.viQuaDaLuu)
    await a.taiViQua(); XCTAssertTrue(a.viQuaDaLuu, "giữ bản đang có")
    let c = AppConModel(goi: goi, kho: kho); c.tenBe = "Bảo Minh"
    await c.taiViQua(); XCTAssertNil(c.viQua); XCTAssertFalse(c.viQuaDaLuu)
    let d = AppConModel(goi: goi, kho: kho); await d.taiViQua(); XCTAssertNil(d.viQua, "chưa biết bé ⇒ không nạp bản lưu")
    // 409 chua_chon_con ⇒ bỏ ví đang có, không dùng bản lưu
    let e = AppConModel(goi: { _ in .loi(ma: "chua_chon_con", chu: "") }, kho: kho); e.tenBe = "Bảo Anh"; e.viQua = ViQuaTests.mau()
    await e.taiViQua(); XCTAssertNil(e.viQua)
  }

  func testQuaHienThiUuTienViQua() {
    let app = AppConModel(goi: { _ in .loi(ma: "x", chu: "") }, kho: UserDefaults(suiteName: "vi-qua-test-\(UUID().uuidString)")!)
    var ch = HvCuaHang(); var q = HvQua(); q.id = "cu"; ch.qua = [q]; app.ch = ch
    XCTAssertEqual(app.quaHienThi.map(\.id), ["cu"])
    app.viQua = ViQuaTests.mau()
    XCTAssertEqual(app.quaHienThi.map(\.id), ["q3", "q4", "q5"])
  }
}
