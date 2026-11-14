// Logic màn Mac làm lại (con-cai-mac 06/11): PIN, màn chọn tên, chữ màn khoá, đổi sao, quà bảng giá, lỗi ghép.
import XCTest
import AiiGrowCore
@testable import AiiGrowTray

final class ManMacTests: XCTestCase {
  func tt(_ nd: String?, lyDo: String? = nil, khoa: Bool = false) -> TrangThai {
    var t = TrangThai(daGhep: true, laPhienCon: true, tenCon: "Bảo Anh", cheDo: khoa ? .khoa : .tuDo, lyDoKhoa: lyDo, conPhut: nil, moDen: nil, khoaDen: nil,
                      demNguocGiay: nil, yeuCauCho: [], duocDoiDiem: true, matMang: false, trangChan: [])
    t.nguoiDung = nd
    return t
  }

  func testPinNhap() {
    var p = PinNhap()
    for c in "12a345" { p.them(c) }
    XCTAssertEqual(p.so, "1234"); XCTAssertTrue(p.du)
    p.xoa(); XCTAssertEqual(p.so, "123"); p.lamLai(); XCTAssertEqual(p.so, "")
  }

  func testChonManChonTenVaBaMe() {
    XCTAssertTrue(ManMac.canChonTen(tt("chua")))
    XCTAssertFalse(ManMac.canChonTen(tt("con")))
    XCTAssertFalse(ManMac.canChonTen(tt(nil)), "daemon / máy chủ cũ: không màn chọn tên")
    var admin = tt("chua"); admin.laPhienCon = false
    XCTAssertFalse(ManMac.canChonTen(admin), "phiên Ba Mẹ không bị che")
    let now = Date()
    var bm = tt("ba_me"); bm.baMeDungDen = now.addingTimeInterval(60)
    XCTAssertTrue(ManMac.baMeDangDung(bm, bayGio: now))
    XCTAssertFalse(ManMac.baMeDangDung(bm, bayGio: now.addingTimeInterval(61)))
  }

  func testChuMan() {
    XCTAssertEqual(ManMac.dongHoCho(15), "0:15")
    XCTAssertEqual(ManMac.khung(KhungGio(tu: "21:30", den: "06:30")), "21:30 – 6:30")
    XCTAssertEqual(ManMac.chuCai([HoSoBe(id: "1", ten: "Bảo Anh", coPin: true), HoSoBe(id: "2", ten: "Bảo Minh", coPin: false)]), ["1": "B", "2": "M"])
    XCTAssertEqual(ManMac.cauPin("pin_sai", conLan: 3), "Chưa đúng · còn 3 lần thử")
    XCTAssertEqual(ManMac.manLoiGhep("ma_sai"), .maSai)
    XCTAssertEqual(ManMac.manLoiGhep("ma_het_han"), .hetHan)
    XCTAssertEqual(ManMac.manLoiGhep("mat_mang"), .matMang)
    XCTAssertNil(ManMac.manLoiGhep("con_mot_admin"))
    XCTAssertEqual(ManMac.maHien("482017"), "482 017")
  }

  func testChuMauKhoa() {
    var h = tt("con", lyDo: "het_gio", khoa: true); h.beTen = "Bảo Anh"; h.quyTongPhut = 60
    XCTAssertEqual(ManMac.chuKhoa(h), ManMac.ChuKhoa(tieuDe: "Hết giờ chơi hôm nay", phu: "Bảo Anh đã chơi đủ 60 / 60 phút. Giỏi lắm!", nhan: nil, ngoaiLe: false))
    var n = tt("con", lyDo: "gio_ngu", khoa: true); n.beTen = "Bảo Anh"; n.gioNgu = KhungGio(tu: "21:30", den: "06:30")
    let c = ManMac.chuKhoa(n)
    XCTAssertEqual(c.tieuDe, "Đến giờ ngủ rồi"); XCTAssertEqual(c.phu, "Máy mở lại lúc 6:30 sáng mai. Chúc Bảo Anh ngủ ngon!")
    XCTAssertEqual(c.nhan, "Giờ ngủ 21:30 – 6:30"); XCTAssertTrue(c.ngoaiLe)
  }

  func testDoiSaoLayGio() {
    // thiết kế 49: 30 sao, đổi 10 phút ⇒ trừ 10 sao, còn 20
    XCTAssertEqual(ManMac.doiSao(phut: 10, sao: 30, phut10Sao: 10), ManMac.DoiSao(saoCan: 10, conSao: 20, du: true, thieu: 0))
    // thiết kế 51: đổi 40 phút cần 40 sao, có 30 ⇒ thiếu 10
    XCTAssertEqual(ManMac.doiSao(phut: 40, sao: 30, phut10Sao: 10), ManMac.DoiSao(saoCan: 40, conSao: 0, du: false, thieu: 10))
    XCTAssertEqual(ManMac.buocPhut(10, them: false), 10); XCTAssertEqual(ManMac.buocPhut(60, them: true), 60); XCTAssertEqual(ManMac.buocPhut(10, them: true), 20)
  }

  func testDongQuaBangGia() {
    let now = Date()
    var kem = HvQua(); kem.ten = "Đi ăn kem"; kem.diem = 100; kem.choTraoTu = now.addingTimeInterval(-86_400)
    XCTAssertEqual(ManMac.dongQua(kem, bayGio: now), "Đã đổi hôm qua · chờ Ba Mẹ trao")
    var phim = HvQua(); phim.diem = 300; phim.conThieu = 270; phim.chiCuoiTuan = true
    XCTAssertEqual(ManMac.dongQua(phim, bayGio: now), "Chỉ cuối tuần · còn thiếu 270 sao")
    var bua = HvQua(); bua.diem = 50; bua.conThieu = 20
    XCTAssertEqual(ManMac.dongQua(bua, bayGio: now), "Còn thiếu 20 sao")
    var du = HvQua(); du.diem = 20; du.du = true
    XCTAssertEqual(ManMac.dongQua(du, bayGio: now), "Đủ sao rồi")
    let ch = HvCuaHang.doc(Data(#"{"soDu":30,"saoGiu":50,"qua":[{"id":"r1","ten":"AiiCafe 20k","sao":200,"moTa":"Voucher QR · 60 ngày","conThieu":170,"choTraoTu":null}]}"#.utf8))
    XCTAssertEqual(ch?.saoGiu, 50); XCTAssertEqual(ch?.qua.first?.diem, 200); XCTAssertEqual(ch?.qua.first?.moTa, "Voucher QR · 60 ngày")
  }

  func testNhomNhiemVu() {
    func nv(_ id: String, _ t: String, cho: Int = 0) -> HvNhiemVu { var v = HvNhiemVu(); v.id = id; v.trangThai = t; v.dangCho = cho; return v }
    let r = ManMac.nhomNhiemVu([nv("1", "du_hom_nay", cho: 1), nv("2", "san_sang"), nv("3", "dang_lam"), nv("4", "du_hom_nay")])
    XCTAssertEqual(r.choDuyet.map(\.id), ["1"]); XCTAssertEqual(r.chuaLam.map(\.id), ["2", "3"])
  }

  /// 14/11 (con-cai-mac 60): «Thoát AiiGrow…» ⇒ «Cần mã của Ba Mẹ».
  func testThoatCanMaBaMe() {
    XCTAssertEqual(ThoatMac.menu, "Thoát AiiGrow…")
    XCTAssertEqual(ThoatMac.tieu, "Cần mã của Ba Mẹ")
    XCTAssertEqual(ThoatMac.phu, "Thoát hoặc gỡ AiiGrow phải có Ba Mẹ đồng ý.")
    XCTAssertTrue(ThoatMac.hienMenu(tt("con")))
    var chuaGhep = tt("con"); chuaGhep.daGhep = false
    XCTAssertFalse(ThoatMac.hienMenu(chuaGhep))
    var baMe = tt(nil); baMe.laPhienCon = false
    XCTAssertFalse(ThoatMac.hienMenu(baMe), "tài khoản Ba Mẹ không có mục này")
    XCTAssertEqual(ThoatMac.chipBao(ok: nil, status: nil).cam, false)
    XCTAssertTrue(ThoatMac.chipBao(ok: true, status: "da_bao") == ("Ba Mẹ đã nhận thông báo", "bell", true))
    XCTAssertTrue(ThoatMac.chipBao(ok: true, status: "cho_mang").chu.contains("Có mạng"))
    XCTAssertTrue(ThoatMac.chipBao(ok: false, status: nil).cam)
    XCTAssertTrue(ThoatMac.docBao(.thongBao(chu: "da_bao")) == (true, "da_bao"))
    XCTAssertTrue(ThoatMac.docBao(.loi(ma: "khong_phai_con", chu: "x")) == (false, nil))
    XCTAssertTrue(ThoatMac.docBao(nil) == (false, nil))
  }

  @MainActor
  func testThoatModelGoDuMaLaGui() async {
    var lenh: [YeuCauTray] = []
    let m = ThoatModel(goi: { yc in
      lenh.append(yc)
      if case .baMeMo = yc { return .thongBao(chu: "Ba Mẹ đang dùng máy") }
      return .thongBao(chu: "da_bao")
    })
    var daMo = false
    m.daMo = { daMo = true }
    await m.bao()
    XCTAssertEqual(m.baoOk, true); XCTAssertEqual(m.baoStatus, "da_bao")
    for c in "12a34" { m.bam(c) }
    XCTAssertEqual(m.ma, "1234")
    m.bam("\u{8}"); XCTAssertEqual(m.ma, "123")
    m.ma = "123456"
    await m.gui()
    XCTAssertTrue(daMo)
    XCTAssertEqual(lenh, [.baoThoat, .baMeMo(ma: "123456")])
  }
}
