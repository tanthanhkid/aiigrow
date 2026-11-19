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

  func testChuKiemCapNhatDaemonCu() {
    XCTAssertTrue(TrayLogic.chuKiemCapNhat(.loi(ma: "yeu_cau_sai", chu: "Yêu cầu không đọc được.")).contains("bản cũ"), "daemon 0.1.0 chưa biết lệnh capNhat")
    XCTAssertEqual(TrayLogic.chuKiemCapNhat(.loi(ma: "can_admin", chu: "x")), "x")
    XCTAssertEqual(TrayLogic.chuKiemCapNhat(.thongBao(chu: "y")), "y")
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
    XCTAssertEqual(TrayLogic.dongTrangThai(tt(conPhut: 15), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Còn 15 phút")
    XCTAssertEqual(TrayLogic.dongTrangThai(tt(moDen: t0.addingTimeInterval(600)), matKetNoi: false, nhanLuc: t0, bayGio: t0),
                   "Còn 10 phút (Ba Mẹ đang mở máy)")
    XCTAssertEqual(TrayLogic.dongTrangThai(tt(), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Không giới hạn")
    // sổ sao 15/11: sao = phút
    var s = tt(); s.phutSao = 18
    XCTAssertEqual(TrayLogic.dongTrangThai(s, matKetNoi: false, nhanLuc: t0, bayGio: t0), "Còn 18 sao = 18 phút chơi")
    XCTAssertEqual(TrayLogic.tieuDeThanh(s, matKetNoi: false, nhanLuc: t0, bayGio: t0), "18 sao")
    // menu thanh trên cùng (them-hyj1eryo)
    XCTAssertEqual(TrayLogic.dongDauMenu(s, matKetNoi: false, nhanLuc: t0, bayGio: t0), "● Đã kết nối · còn 18 sao = 18 phút chơi")
    var mm = s; mm.matMang = true
    XCTAssertEqual(TrayLogic.dongDauMenu(mm, matKetNoi: false, nhanLuc: t0, bayGio: t0), "● Mất mạng · sao vẫn trừ")
    XCTAssertEqual(TrayLogic.dongDauMenu(tt(daGhep: false), matKetNoi: false, nhanLuc: t0, bayGio: t0), "Máy chưa ghép — Ba Mẹ cần ghép máy này")
    s.phutSao = 0
    XCTAssertEqual(TrayLogic.tieuDeThanh(s, matKetNoi: false, nhanLuc: t0, bayGio: t0), "Hết sao")
    XCTAssertTrue(TrayLogic.dongTrangThai(s, matKetNoi: false, nhanLuc: t0, bayGio: t0).hasPrefix("Hết sao rồi"))
    var mh = tt(); mh.moHet = true
    XCTAssertEqual(TrayLogic.tieuDeThanh(mh, matKetNoi: false, nhanLuc: t0, bayGio: t0), "Mở hết")
    XCTAssertEqual(TrayLogic.dongTrangThai(mh, matKetNoi: false, nhanLuc: t0, bayGio: t0), "Mở hết · không tính phút")
    // nhắc «còn 5 sao» chỉ khi app «Tính phút» đang chạy
    s.phutSao = 5
    XCTAssertNil(TrayLogic.giaySao(s, nhanLuc: t0, bayGio: t0))
    s.dangTinhPhut = "com.roblox.roblox"
    XCTAssertEqual(TrayLogic.giaySao(s, nhanLuc: t0, bayGio: t0.addingTimeInterval(30))!, 270, accuracy: 0.01)
  }

  func testDongYeuCau() {
    func yc(_ loai: String, _ st: String, muc: String? = nil) -> YeuCauDangCho { YeuCauDangCho(id: "1", loai: loai, phut: 15, trangThai: st, muc: muc) }
    XCTAssertNil(TrayLogic.dongYeuCau([]))
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("vay_sao", "cho")]), "Đã gửi Ba Mẹ xin vay 15 sao — đang chờ Ba Mẹ trả lời…")
    var luu = yc("vay_sao", "cho"); luu.choMang = true
    XCTAssertTrue(TrayLogic.dongYeuCau([luu])!.contains("có mạng là AiiGrow tự gửi"))
    var cho = yc("vay_sao", "duyet"); cho.tenNguoiDuyet = "Mẹ Lan"
    XCTAssertEqual(TrayLogic.dongYeuCau([cho]), "Mẹ Lan cho vay 15 sao!")
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("vay_sao", "tu_choi")]), "Ba Mẹ chưa cho vay sao.")
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("cai_app", "cho", muc: "com.roblox.roblox")]), "Đã xin thêm Roblox vào danh sách — đang chờ Ba Mẹ trả lời…")
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("cai_app", "duyet", muc: "YouTube")]), "Ba Mẹ đã thêm YouTube!")
    var tam = yc("mo_web", "duyet", muc: "youtube.com"); tam.ketQua = "mo_tam"; tam.moTamPhut = 30
    XCTAssertTrue(TrayLogic.dongYeuCau([tam])!.contains("cho mở"))
    XCTAssertEqual(TrayLogic.dongYeuCau([yc("cai_app", "tu_choi", muc: "YouTube")]), "Ba Mẹ chưa thêm YouTube.")
    XCTAssertNil(TrayLogic.dongYeuCau([yc("mo_web", "het_han")]))
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

final class HoSoDnsTests: XCTestCase {
  func testTachHoSoDnsTenTepAnToan() {
    let d = Data(#"{"apple":{"mobileconfig":"<plist/>","tep":"../AiiGrow-DNS-ab12.mobileconfig"}}"#.utf8)
    let r = TrayLogic.tachHoSoDns(d)
    XCTAssertEqual(r?.0, "AiiGrow-DNS.mobileconfig", "tên có / hoặc bắt đầu bằng . ⇒ dùng tên mặc định")
    XCTAssertEqual(TrayLogic.tachHoSoDns(Data(#"{"apple":{"mobileconfig":"x","tep":"AiiGrow-DNS-ab12.mobileconfig"}}"#.utf8))?.0, "AiiGrow-DNS-ab12.mobileconfig")
    XCTAssertEqual(r?.1, "<plist/>")
    XCTAssertNil(TrayLogic.tachHoSoDns(Data(#"{"android":{}}"#.utf8)))
  }
}
