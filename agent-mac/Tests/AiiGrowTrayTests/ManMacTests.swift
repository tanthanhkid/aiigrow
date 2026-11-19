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
    XCTAssertEqual(ManMac.chuCai([HoSoBe(id: "1", ten: "Bảo Anh", coPin: true), HoSoBe(id: "2", ten: "Bảo Minh", coPin: false)]), ["1": "B", "2": "M"])
    XCTAssertEqual(ManMac.cauPin("pin_sai", conLan: 3), "Chưa đúng · còn 3 lần thử")
    XCTAssertEqual(ManMac.manLoiGhep("ma_sai"), .maSai)
    XCTAssertEqual(ManMac.manLoiGhep("ma_het_han"), .hetHan)
    XCTAssertEqual(ManMac.manLoiGhep("mat_mang"), .matMang)
    XCTAssertNil(ManMac.manLoiGhep("con_mot_admin"))
    XCTAssertEqual(ManMac.maHien("482017"), "482 017")
  }

  func testChuMauKhoa() {
    var h = tt("con", lyDo: "het_gio", khoa: true); h.beTen = "Bảo Anh"
    XCTAssertEqual(ManMac.chuKhoa(h, phutDaChoi: 60),
                   ManMac.ChuKhoa(tieuDe: "Hết sao rồi", phu: "Bảo Anh đã chơi 60 phút hôm nay · dùng hết 60 sao. App không tính phút vẫn mở được.", hetSao: true))
    var n = tt("con", lyDo: "ba_me_khoa", khoa: true); n.beTen = "Bảo Anh"
    let c = ManMac.chuKhoa(n)
    XCTAssertEqual(c.tieuDe, "Ba Mẹ đang khoá máy"); XCTAssertFalse(c.hetSao, "Ba Mẹ khoá: không còn «xin mở ngoại lệ»")
  }

  func testSaoTheoBeVaQuaXinVay() {
    XCTAssertNil(ManMac.noCua(HoSoBe(id: "a", ten: "Bảo Anh", coPin: true, sao: 30, no: 0)))
    XCTAssertEqual(ManMac.noCua(HoSoBe(id: "m", ten: "Bảo Minh", coPin: true, sao: -20, no: 20)), 20)
    XCTAssertEqual(ManMac.noCua(HoSoBe(id: "m", ten: "Bảo Minh", coPin: true, sao: -20)), 20, "máy chủ chưa gửi no ⇒ phần âm")
    var phim = HvQua(); phim.id = "phim"; phim.conThieu = 270; phim.chiCuoiTuan = true
    var com = HvQua(); com.id = "com"; com.conThieu = 20
    var kem = HvQua(); kem.id = "kem"; kem.conThieu = 0; kem.choTraoTu = Date()
    var hong = HvQua(); hong.id = "hong"; hong.conThieu = 5; hong.conHopLe = false
    XCTAssertEqual(ManMac.quaXinVay([phim, com, kem, hong])?.id, "com")
    XCTAssertEqual(ManMac.cauHetNo(no: 20, choDuyet: 20, soViecCho: 2)?.0, "Để hết nợ còn 20 sao")
    XCTAssertEqual(ManMac.cauHetNo(no: 20, choDuyet: 20, soViecCho: 2)?.1, "2 việc chờ duyệt (+20 sao) là hết nợ")
    XCTAssertNil(ManMac.cauHetNo(no: 0, choDuyet: 20, soViecCho: 2))
    let hom = Date()
    var g = HvLuot(); g.trangThai = "duoc_duyet"; g.diem = 10; g.luc = hom
    var g2 = g; g2.diem = 20
    var cu = g; cu.luc = hom.addingTimeInterval(-3 * 86_400)
    XCTAssertEqual(ManMac.saoKiemHomNay([g, g2, cu], bayGio: hom), 30)
    var t = tt("con"); t.dsKhongTinhPhut = ["com.apple.dictionary"]; t.dsTinhPhut = ["com.roblox.roblox"]
    XCTAssertEqual(ManMac.dsCuaCon(t).map(\.nhom), ["Không tính phút", "Tính phút · 1 sao/phút"])
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

  // ---- 16/11 (#289): khớp #262–#267 + «Hỏi AiiGrow»
  func testChuXongRẽTheoMayRieng() {
    var h = HoSoMay(); h.con = [HoSoBe(id: "1", ten: "Bảo Anh", coPin: false)]; h.mayRieng = true
    let r = ManMac.chuXong(h, taiKhoan: "baoanh")
    XCTAssertEqual(r.tieuDe, "Máy của Bảo Anh đã sẵn sàng!")
    for c in [r.phu, r.chanTrang] + r.cacDong.flatMap({ [$0.tieu, $0.phu] }) { XCTAssertFalse(c.contains("PIN") || c.contains("cả nhà") || c.contains("chọn tên"), c) }
    h.con.append(HoSoBe(id: "2", ten: "Bảo Minh", coPin: true)); h.mayRieng = false
    let chung = ManMac.chuXong(h, taiKhoan: "con")
    XCTAssertEqual(chung.tieuDe, "Máy đã sẵn sàng cho cả nhà!")
    XCTAssertTrue(chung.chanTrang.contains("tên + PIN"))
    h.con = [h.con[0]]
    XCTAssertEqual(ManMac.chuXong(h, taiKhoan: "con").tieuDe, "Máy đã sẵn sàng cho cả nhà!", "một bé nhưng mayRieng=false ⇒ máy chung (tên + PIN)")
    let la = ManMac.chuXong(nil, taiKhoan: "con")
    for c in [la.tieuDe, la.phu, la.chanTrang] + la.cacDong.flatMap({ [$0.tieu, $0.phu] }) { XCTAssertFalse(c.contains("PIN") || c.contains("cả nhà") || c.contains("tên"), "chưa có hồ sơ ⇒ trung tính: \(c)") }
    XCTAssertTrue((r.cacDong + chung.cacDong).allSatisfy { !$0.tieu.contains("điểm") && !$0.phu.contains("điểm") })
    // Bàn them-0ltdde49 / them-aff60lnt (17/11): ba thẻ trắng
    XCTAssertEqual(chung.cacDong.map(\.tieu), ["Giờ tính theo từng bé", "Bảo Anh · Bảo Minh", "Mở app, web theo danh sách Ba Mẹ"])
    XCTAssertEqual(chung.cacDong[1].phu, "PIN do Ba Mẹ đặt trong app")
    XCTAssertEqual(chung.cacDong[2].phu, "App mới thì xin Ba Mẹ")
    XCTAssertEqual(r.phu, "Bảo Anh mở máy là vào thẳng.")
    XCTAssertEqual(r.cacDong.map(\.tieu), ["Sao của Bảo Anh · 1 sao = 1 phút", "Bảo Anh", "Mở app, web theo danh sách Ba Mẹ"])
    XCTAssertEqual(r.cacDong[1].phu, "Mở máy là vào thẳng")
  }

  func testSoSaoMotThuTuDoc() {
    XCTAssertFalse(ManMac.dangNo(nil))
    XCTAssertTrue(ManMac.dangNo(SoSao(sao: -20, no: 20)))
    XCTAssertTrue(ManMac.dangNo(SoSao(sao: -5)), "số dư âm là đang nợ")
    XCTAssertFalse(ManMac.dangNo(SoSao(sao: 10)))
    var t = tt("con"); t.soSao = SoSao(sao: 3)
    XCTAssertEqual(ManMac.soSao(tt: t, tq: nil)?.sao, 3)
    XCTAssertNil(ManMac.soSao(tt: tt("con"), tq: nil))
  }

  func testHoiAiiGrowCungChuVoiWindows() {
    XCTAssertEqual(HoiAiiGrow.the.map(\.ma), ["thu_lai", "ma_mo", "bat_lai", "cap_nhat"])
    XCTAssertEqual(HoiAiiGrow.the[0].tieu, "Mất mạng?")
    XCTAssertEqual(HoiAiiGrow.the[0].phu, "Máy vẫn trừ sao đúng luật")
    XCTAssertEqual(HoiAiiGrow.tieu, "Hỏi AiiGrow")
    XCTAssertEqual(HoiAiiGrow.goiBaMe, "Gọi Ba Mẹ giúp")
    let tat = HoiAiiGrow.ketQuaThuLai(ma: "bat_lai", matKetNoi: true, matMang: false, banDaemon: nil)
    XCTAssertFalse(tat.tot); XCTAssertTrue(tat.phu.contains("cài lại gói"))
    XCTAssertFalse(HoiAiiGrow.ketQuaThuLai(ma: "thu_lai", matKetNoi: false, matMang: true, banDaemon: "0.1.12").tot)
    let ok = HoiAiiGrow.ketQuaThuLai(ma: "thu_lai", matKetNoi: false, matMang: false, banDaemon: "0.1.12")
    XCTAssertTrue(ok.tot); XCTAssertTrue(ok.phu.contains("0.1.12"))
    XCTAssertFalse(HoiAiiGrow.ketQuaCapNhat(banDaemon: nil).phu.contains("giờ"))
  }
}

// Giới hạn giờ chơi 16/11 (#302 mục 4): chữ màn khoá / khay khi khoá VÌ giới hạn, sao còn nguyên.
final class GioiHanManMacTests: XCTestCase {
  func tt(lyDo: String?, sao: SoSao?, gh: GioiHan?, phutSao: Int? = 0) -> TrangThai {
    var t = TrangThai(daGhep: true, laPhienCon: true, tenCon: "Bảo Anh", cheDo: .khoa, lyDoKhoa: lyDo, conPhut: nil, moDen: nil, khoaDen: nil,
                      demNguocGiay: nil, yeuCauCho: [], duocDoiDiem: true, matMang: false, trangChan: [])
    t.soSao = sao; t.gioiHan = gh; t.phutSao = phutSao
    return t
  }
  let nghi = GioiHan(dangNghi: true, nghiDenGio: "15:30", lyDoKhoa: GioiHan.dangNghiMa)

  func testDangNghiConSao() {
    let c = ManMac.chuKhoa(tt(lyDo: "het_gio", sao: SoSao(sao: 30, phutCon: 0, hetSao: true, saoTieuDuoc: 30), gh: nghi))
    XCTAssertEqual(c.tieuDe, "Nghỉ một chút"); XCTAssertEqual(c.phu, "Nghỉ một chút · chơi tiếp lúc 15:30")
    XCTAssertTrue(c.theoGioiHan); XCTAssertFalse(c.hetSao)
  }

  func testHetNgay() {
    let g = GioiHan(ngayPhut: 60, hetNgay: true, lyDoKhoa: GioiHan.hetNgay, cau: "Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé")
    let c = ManMac.chuKhoa(tt(lyDo: "het_sao", sao: SoSao(sao: 9, phutCon: 0, hetSao: true, saoTieuDuoc: 9), gh: g))
    XCTAssertEqual(c.tieuDe, "Hôm nay chơi đủ rồi"); XCTAssertEqual(c.phu, "Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé")
  }

  func testNghiNhungHetSaoThatVaMayChuCu() {
    let het = ManMac.chuKhoa(tt(lyDo: "het_gio", sao: SoSao(sao: 0, phutCon: 0, hetSao: true, saoTieuDuoc: 0), gh: nghi))
    XCTAssertEqual(het.tieuDe, "Hết sao rồi"); XCTAssertTrue(het.hetSao); XCTAssertFalse(het.theoGioiHan)
    let cu = ManMac.chuKhoa(tt(lyDo: "het_gio", sao: SoSao(sao: 0, phutCon: 0), gh: nil))
    XCTAssertEqual(cu.tieuDe, "Hết sao rồi")
    XCTAssertEqual(ManMac.chuKhoa(tt(lyDo: "ba_me_khoa", sao: nil, gh: nghi)).tieuDe, "Ba Mẹ đang khoá máy", "Ba Mẹ khoá thắng")
    XCTAssertEqual(ManMac.chuKhoa(tt(lyDo: nil, sao: SoSao(sao: 30, phutCon: 20, saoTieuDuoc: 30), gh: nghi, phutSao: 20)).tieuDe, "Ba Mẹ đang khoá máy", "lý do nil + còn phút ⇒ không lấy chữ giới hạn")
  }

  func testKhayVaSaoThat() {
    let t = tt(lyDo: nil, sao: SoSao(sao: 30, phutCon: 0, hetSao: true, saoTieuDuoc: 30), gh: nghi)
    XCTAssertEqual(TrayLogic.dongSao(t), "Nghỉ một chút · chơi tiếp lúc 15:30")
    XCTAssertEqual(ManMac.chuGioiHan(t)?.tieuDe, "Nghỉ một chút")
    let choi = tt(lyDo: nil, sao: SoSao(sao: 30, phutCon: 20, saoTieuDuoc: 30), gh: GioiHan(conNgay: 20), phutSao: 20)
    XCTAssertEqual(TrayLogic.dongSao(choi), "còn 30 sao · chơi được 20 phút · Còn 20 phút hôm nay")
    let cu = tt(lyDo: nil, sao: SoSao(sao: 18, phutCon: 18), gh: nil, phutSao: 18)
    XCTAssertEqual(TrayLogic.dongSao(cu), "còn 18 sao = 18 phút chơi", "máy chủ cũ: như trước")
  }
}
