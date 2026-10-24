import XCTest
import AiiGrowCore
@testable import AiiGrowTray

final class TrayLogicTests: XCTestCase {
  let t0 = Date(timeIntervalSince1970: 1_800_000_000)

  func tt(daGhep: Bool = true, con: Bool = true, cheDo: CheDo = .tuDo, lyDo: String? = nil, conPhut: Int? = nil,
          moDen: Date? = nil, dem: Int? = nil) -> TrangThai {
    TrangThai(daGhep: daGhep, laPhienCon: con, tenCon: "Bi", cheDo: cheDo, lyDoKhoa: lyDo, conPhut: conPhut, moDen: moDen, khoaDen: nil,
              demNguocGiay: dem, yeuCauCho: [], duocDoiDiem: false, matMang: false, trangChan: [])
  }

  func testNutKiemCapNhatChiMayDaGhep() {
    XCTAssertTrue(TrayLogic.canKiemCapNhat(tt(con: false), laAdmin: true))
    XCTAssertFalse(TrayLogic.canKiemCapNhat(tt(daGhep: false, con: false), laAdmin: true), "chưa ghép: daemon không tự cập nhật ⇒ ẩn nút")
    XCTAssertFalse(TrayLogic.canKiemCapNhat(tt(con: true), laAdmin: true))
    XCTAssertFalse(TrayLogic.canKiemCapNhat(tt(con: false), laAdmin: false))
  }

  func testDongBanLayBanDaemon() {
    var t = tt(con: false)
    XCTAssertEqual(TrayLogic.dongBanDangChay(t, banTray: "0.1.1"), "AiiGrow bản 0.1.1", "daemon cũ chưa gửi bản ⇒ bản của tray")
    t.banDaemon = "0.1.1"
    XCTAssertEqual(TrayLogic.dongBanDangChay(t, banTray: "0.1.1"), "AiiGrow bản 0.1.1")
    t.banDaemon = "0.1.2"
    XCTAssertTrue(TrayLogic.dongBanDangChay(t, banTray: "0.1.1").hasPrefix("AiiGrow bản 0.1.2 (menu này bản 0.1.1"), "tray chưa nạp lại ⇒ vẫn báo bản daemon thật")
  }

  // MARK: chonMan
  func testChonMan() {
    XCTAssertEqual(TrayLogic.chonMan(nil), .khong)
    XCTAssertEqual(TrayLogic.chonMan(tt()), .khong)
    XCTAssertEqual(TrayLogic.chonMan(tt(cheDo: .khoa, lyDo: "het_gio")), .khoa(lyDo: "het_gio"))
    XCTAssertEqual(TrayLogic.chonMan(tt(cheDo: .khoa)), .khoa(lyDo: nil))
    XCTAssertEqual(TrayLogic.chonMan(tt(dem: 30)), .demNguoc(giay: 30, lyDo: nil))
    // đếm ngược thắng khoá
    XCTAssertEqual(TrayLogic.chonMan(tt(cheDo: .khoa, lyDo: "gio_ngu", dem: 10)), .demNguoc(giay: 10, lyDo: "gio_ngu"))
    XCTAssertEqual(TrayLogic.chonMan(tt(dem: 0)), .khong)
  }
  func testChonManChuaGhepVaAdmin() {
    XCTAssertEqual(TrayLogic.chonMan(tt(daGhep: false)), .khong)
    // phiên admin không bao giờ bị che, dù chế độ khoá hay đếm ngược
    XCTAssertEqual(TrayLogic.chonMan(tt(con: false, cheDo: .khoa, lyDo: "het_gio")), .khong)
    XCTAssertEqual(TrayLogic.chonMan(tt(con: false, dem: 20)), .khong)
  }

  func testCanGhep() {
    XCTAssertTrue(TrayLogic.canGhep(tt(daGhep: false, con: false), laAdmin: true))
    XCTAssertFalse(TrayLogic.canGhep(tt(daGhep: false, con: true), laAdmin: false))
    XCTAssertFalse(TrayLogic.canGhep(tt(daGhep: true), laAdmin: true))
    XCTAssertFalse(TrayLogic.canGhep(nil, laAdmin: true))
  }

  func testTieuDeVaGoiYKhoa() {
    for ly in ["het_gio", "gio_ngu", "ba_me_khoa", "la_hoac", "", nil] as [String?] {
      XCTAssertFalse(TrayLogic.tieuDeKhoa(ly).isEmpty)
      XCTAssertFalse(TrayLogic.goiYKhoa(ly).isEmpty)
    }
    XCTAssertEqual(TrayLogic.tieuDeKhoa("het_gio"), "Hết giờ dùng máy hôm nay")
    XCTAssertEqual(TrayLogic.tieuDeKhoa("gio_ngu"), "Đến giờ nghỉ rồi")
    XCTAssertEqual(TrayLogic.tieuDeKhoa(nil), "Máy đang được Ba Mẹ khoá")
    XCTAssertEqual(TrayLogic.tieuDeKhoa("xyz"), TrayLogic.tieuDeKhoa(nil))
    XCTAssertEqual(TrayLogic.goiYKhoa("xyz"), TrayLogic.goiYKhoa(nil))
    XCTAssertNotEqual(TrayLogic.goiYKhoa("het_gio"), TrayLogic.goiYKhoa("gio_ngu"))
  }

  func testDongHo() {
    XCTAssertEqual(TrayLogic.dongHo(300), "5:00")
    XCTAssertEqual(TrayLogic.dongHo(65), "1:05")
    XCTAssertEqual(TrayLogic.dongHo(3909), "1:05:09")
    XCTAssertEqual(TrayLogic.dongHo(0), "0:00")
    XCTAssertEqual(TrayLogic.dongHo(-5), "0:00")
    XCTAssertEqual(TrayLogic.dongHo(59.2), "1:00")
  }

  func testGiayConLai() {
    XCTAssertNil(TrayLogic.giayConLai(tt(), nhanLuc: t0, bayGio: t0))
    let p = tt(conPhut: 10)
    XCTAssertEqual(TrayLogic.giayConLai(p, nhanLuc: t0, bayGio: t0)!, 600, accuracy: 0.01)
    XCTAssertEqual(TrayLogic.giayConLai(p, nhanLuc: t0, bayGio: t0.addingTimeInterval(90))!, 510, accuracy: 0.01)
    XCTAssertEqual(TrayLogic.giayConLai(p, nhanLuc: t0, bayGio: t0.addingTimeInterval(9999))!, 0, accuracy: 0.01)
    // cửa sổ mở ưu tiên
    let m = tt(conPhut: 1, moDen: t0.addingTimeInterval(1200))
    XCTAssertEqual(TrayLogic.giayConLai(m, nhanLuc: t0, bayGio: t0.addingTimeInterval(200))!, 1000, accuracy: 0.01)
    // cửa sổ mở đã qua → rơi về conPhut
    let q = tt(conPhut: 2, moDen: t0.addingTimeInterval(-5))
    XCTAssertEqual(TrayLogic.giayConLai(q, nhanLuc: t0, bayGio: t0)!, 120, accuracy: 0.01)
  }

  func testTieuDeThanhVaDongTrangThai() {
    // mất kết nối / chưa có trạng thái
    XCTAssertEqual(TrayLogic.tieuDeThanh(tt(), matKetNoi: true, nhanLuc: t0, bayGio: t0), "")
    XCTAssertEqual(TrayLogic.tieuDeThanh(nil, matKetNoi: false, nhanLuc: t0, bayGio: t0), "")
    XCTAssertEqual(TrayLogic.dongTrangThai(tt(), matKetNoi: true, nhanLuc: t0, bayGio: t0), TrayLogic.dongKhoiDongLai)
    XCTAssertEqual(TrayLogic.dongTrangThai(nil, matKetNoi: false, nhanLuc: t0, bayGio: t0), TrayLogic.dongKhoiDongLai)
    // bình thường
    XCTAssertEqual(TrayLogic.tieuDeThanh(tt(daGhep: false), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Chưa ghép")
    XCTAssertEqual(TrayLogic.tieuDeThanh(tt(con: false), matKetNoi: false, nhanLuc: t0, bayGio: t0), "")
    XCTAssertEqual(TrayLogic.tieuDeThanh(tt(cheDo: .khoa), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Đang khoá")
    XCTAssertEqual(TrayLogic.tieuDeThanh(tt(conPhut: 30), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Còn 30 phút")
    XCTAssertEqual(TrayLogic.tieuDeThanh(tt(conPhut: 30), matKetNoi: false, nhanLuc: t0, bayGio: t0.addingTimeInterval(61)), "Còn 29 phút")
    XCTAssertTrue(TrayLogic.dongTrangThai(tt(daGhep: false), matKetNoi: false, nhanLuc: t0, bayGio: t0).contains("chưa ghép"))
    XCTAssertEqual(TrayLogic.dongTrangThai(tt(cheDo: .khoa), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Đang khoá")
    XCTAssertEqual(TrayLogic.dongTrangThai(tt(conPhut: 15), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Còn 15 phút hôm nay")
    XCTAssertEqual(TrayLogic.dongTrangThai(tt(moDen: t0.addingTimeInterval(600)), matKetNoi: false, nhanLuc: t0, bayGio: t0),
                   "Còn 10 phút (Ba Mẹ đã thêm giờ)")
    XCTAssertEqual(TrayLogic.dongTrangThai(tt(), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Không giới hạn giờ hôm nay")
  }

  func testDongYeuCau() {
    func yc(_ loai: String, _ st: String) -> YeuCauDangCho { YeuCauDangCho(id: "1", loai: loai, phut: 30, trangThai: st) }
    XCTAssertNil(TrayLogic.dongYeuCau([]))
    XCTAssertTrue(TrayLogic.dongYeuCau([yc("them_gio", "cho")])!.contains("thêm giờ"))
    XCTAssertTrue(TrayLogic.dongYeuCau([yc("mo_web", "cho")])!.contains("mở trang"))
    XCTAssertTrue(TrayLogic.dongYeuCau([yc("cai_app", "cho")])!.contains("mở app"))
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("them_gio", "duyet")]), "Ba Mẹ đã cho thêm giờ. Học tốt nhé!")
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("mo_web", "duyet")]), "Ba Mẹ đã đồng ý cho mở trang.")
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("mo_web", "tu_choi")]), "Ba Mẹ chưa đồng ý lần này.")
    XCTAssertNil(TrayLogic.dongYeuCau([yc("mo_web", "khac")]))
    // lấy cái cuối
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("mo_web", "cho"), yc("mo_web", "tu_choi")]), "Ba Mẹ chưa đồng ý lần này.")
  }

  func testNhanVaTenMuc() {
    XCTAssertEqual(TrayLogic.nhanLuaChonPhut(30), "30 phút")
    XCTAssertEqual(TrayLogic.nhanLuaChonPhut(60), "1 giờ")
    XCTAssertEqual(TrayLogic.nhanLuaChonPhut(120), "2 giờ")
    XCTAssertEqual(TrayLogic.tenMucNguoiDung(.khoa), "Đang khoá")
  }

  func testTaiKhoanThuong() {
    let ra = """
    _amavisd                -6
    daemon                   1
    nobody                  -2
    root                     0
    _spotlight             89
    thanh                  501
    be_bi                  502
    khach                  503
    _appstore              300
    """
    XCTAssertEqual(TrayLogic.taiKhoanThuong(dsclRa: ra, hienTai: "thanh"), ["be_bi", "khach"])
    XCTAssertEqual(TrayLogic.taiKhoanThuong(dsclRa: ra, hienTai: nil), ["be_bi", "khach", "thanh"])
    // chỉ có user hiện tại → vẫn trả về chính nó
    XCTAssertEqual(TrayLogic.taiKhoanThuong(dsclRa: "root 0\nthanh 501\n", hienTai: "thanh"), ["thanh"])
    XCTAssertEqual(TrayLogic.taiKhoanThuong(dsclRa: "", hienTai: "x"), [])
    XCTAssertEqual(TrayLogic.taiKhoanThuong(dsclRa: "a\tb\t502\nrac\n", hienTai: nil), ["a"])
  }

  func testLaAdmin() {
    let ra = "GroupMembership: root thanh be_bi\n"
    XCTAssertTrue(TrayLogic.laAdmin(dsclRa: ra, ten: "thanh"))
    XCTAssertTrue(TrayLogic.laAdmin(dsclRa: ra, ten: "be_bi"))
    XCTAssertFalse(TrayLogic.laAdmin(dsclRa: ra, ten: "bi"))   // không khớp một phần
    XCTAssertFalse(TrayLogic.laAdmin(dsclRa: "", ten: "thanh"))
    XCTAssertFalse(TrayLogic.laAdmin(dsclRa: "GroupMembership: root\n", ten: "thanh"))
  }

  func testMaGhep() {
    XCTAssertEqual(TrayLogic.locMa("12a-34 56789"), "123456")
    XCTAssertEqual(TrayLogic.locMa(""), "")
    XCTAssertEqual(TrayLogic.locMa("١٢٣"), "")   // chữ số không ASCII
    XCTAssertTrue(TrayLogic.maHopLe("123456"))
    XCTAssertFalse(TrayLogic.maHopLe("12345"))
    XCTAssertFalse(TrayLogic.maHopLe("1234567"))
    XCTAssertFalse(TrayLogic.maHopLe("12345a"))
    XCTAssertFalse(TrayLogic.maHopLe("١٢٣٤٥٦"))
  }

  func testNhacGio() {
    var n = NhacGio()
    XCTAssertNil(n.xet(giayConLai: nil))
    XCTAssertNil(n.xet(giayConLai: 900))
    XCTAssertEqual(n.xet(giayConLai: 299), 5)
    XCTAssertNil(n.xet(giayConLai: 298))
    XCTAssertNil(n.xet(giayConLai: 120))
    XCTAssertEqual(n.xet(giayConLai: 59), 1)
    XCTAssertNil(n.xet(giayConLai: 58))
    XCTAssertNil(n.xet(giayConLai: 10))
    XCTAssertNil(n.xet(giayConLai: 0))
    // được thêm giờ → nhắc lại được
    XCTAssertNil(n.xet(giayConLai: 1800))
    XCTAssertEqual(n.xet(giayConLai: 250), 5)
    // nhảy thẳng xuống dưới 1 phút: chỉ nhắc mốc 1
    var m = NhacGio()
    XCTAssertEqual(m.xet(giayConLai: 30), 1)
    XCTAssertNil(m.xet(giayConLai: 20))
  }

  func testCanhBaoAdminHienChoBaMe() {
    var t = tt(); XCTAssertNil(TrayLogic.dongCanhBaoAdmin(t))
    t.canhBaoAdmin = "Chưa hạ được quyền admin của «be»"
    XCTAssertEqual(TrayLogic.dongCanhBaoAdmin(t), "⚠ Chưa hạ được quyền admin của «be»")
    XCTAssertNil(TrayLogic.dongCanhBaoAdmin(nil))
  }

  func testCuaSoGhepGiuKhiDangCanhBaoVaResetKhiDong() {
    var c = TrayLogic.CuaSoGhep()
    XCTAssertTrue(c.canDong(can: false, ep: false))
    c.hienCanhBao()
    XCTAssertFalse(c.canDong(can: false, ep: false), "daGhep đã true nhưng cảnh báo còn hiện ⇒ không đóng")
    XCTAssertTrue(c.canDuaLenTruoc(ep: true, coCuaSo: true), "menu Ghép máy đưa cửa sổ cảnh báo lên trước")
    XCTAssertFalse(c.canDuaLenTruoc(ep: false, coCuaSo: true), "làm mới định kỳ không giành focus")
    c.batDauGui(); XCTAssertFalse(c.canDong(can: false, ep: false), "đang gửi yêu cầu ghép ⇒ không tự đóng")
    c.guiXong(); c.hienCanhBao()
    c.daDong()                                           // nút X đỏ
    XCTAssertEqual(c, TrayLogic.CuaSoGhep(), "không kẹt cờ sau khi đóng")
    XCTAssertTrue(c.canDong(can: false, ep: false))
  }
}
