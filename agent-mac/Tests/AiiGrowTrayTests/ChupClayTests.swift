// Chụp giao diện Clay của tray ra PNG để duyệt bằng mắt. Chỉ chạy khi đặt CHUP_CLAY=<thư mục>; không thì bỏ qua.
import XCTest
import AppKit
import SwiftUI
import AiiGrowCore
@testable import AiiGrowTray

@MainActor
final class ChupClayTests: XCTestCase {
  func tt(cheDo: CheDo, lyDo: String?, dem: Int?) -> TrangThai {
    TrangThai(daGhep: true, laPhienCon: true, tenCon: "Bi", cheDo: cheDo, lyDoKhoa: lyDo, conPhut: 0, moDen: nil, khoaDen: nil,
              demNguocGiay: dem, yeuCauCho: [], duocDoiDiem: false, matMang: false, trangChan: [])
  }

  func chup<V: View>(_ v: V, _ ten: String, _ co: CGSize? = nil, dir: URL) {
    let host = NSHostingView(rootView: v)
    let kt = co ?? host.fittingSize
    let w = NSWindow(contentRect: NSRect(origin: NSPoint(x: -4000, y: -4000), size: kt), styleMask: [.borderless], backing: .buffered, defer: false)
    w.contentView = host
    w.orderFrontRegardless()
    RunLoop.main.run(until: Date().addingTimeInterval(1.6))
    host.layoutSubtreeIfNeeded()
    let id = CGWindowID(w.windowNumber)
    var ok = false
    if let cg = CGWindowListCreateImage(.null, .optionIncludingWindow, id, [.boundsIgnoreFraming, .bestResolution]) {
      let rep = NSBitmapImageRep(cgImage: cg)
      if let d = rep.representation(using: .png, properties: [:]), cg.width > 10 { try? d.write(to: dir.appendingPathComponent(ten + ".png")); ok = true }
    }
    if !ok, let rep = host.bitmapImageRepForCachingDisplay(in: host.bounds) {
      host.cacheDisplay(in: host.bounds, to: rep)
      try? rep.representation(using: .png, properties: [:])?.write(to: dir.appendingPathComponent(ten + "-cache.png"))
    }
    w.orderOut(nil)
  }

  func testChupClay() throws {
    guard let p = ProcessInfo.processInfo.environment["CHUP_CLAY"] else { throw XCTSkip("đặt CHUP_CLAY=<thư mục> để chụp") }
    let dir = URL(fileURLWithPath: p)
    let tray = TrayModel(); let xin = XinModel()
    tray.capNhat(tt(cheDo: .tuDo, lyDo: nil, dem: nil))
    chup(XinThemCuaSo(tray: tray, xin: xin), "mac-xin-them", dir: dir)
    chup(XinMoView(tray: tray, xin: xin), "mac-xin-mo", dir: dir)
    chup(GhepMayView(taiKhoan: ["bi", "na"], dongLai: {}), "mac-ghep-may", dir: dir)
    chup(NhacView(phut: 5), "mac-nhac-5-phut", dir: dir)
    let khoa = TrayModel(); khoa.capNhat(tt(cheDo: .khoa, lyDo: "het_gio", dem: nil))
    chup(ManKhoaView(tray: khoa, xin: xin), "mac-man-khoa", CGSize(width: 1280, height: 860), dir: dir)
    let dem = TrayModel(); dem.capNhat(tt(cheDo: .tuDo, lyDo: "het_gio", dem: 54))
    chup(ManKhoaView(tray: dem, xin: xin), "mac-dem-nguoc", CGSize(width: 1280, height: 900), dir: dir)
  }

  /// App «AiiGrow của Con» + nộp bài + chơi bằng điểm + màn chặn + tin mới — dữ liệu mẫu, không gọi daemon.
  func appMau() -> (AppConModel, TrayModel) {
    let tray = TrayModel()
    var t = tt(cheDo: .hoc, lyDo: nil, dem: nil); t.conPhut = 47; t.duocDoiDiem = true; t.dsChoi = ["com.roblox.roblox", "youtube.com"]
    t.homNayTheoApp = [MucDung(muc: "com.apple.iWork.Pages", phut: 75, day: "x"), MucDung(muc: "com.roblox.roblox", phut: 20, day: "x"), MucDung(muc: "com.google.Chrome", phut: 12, day: "x")]
    tray.capNhat(t)
    let app = AppConModel(goi: { _ in .loi(ma: "thu", chu: "thử") })
    var tq = HvTongQuan(); tq.tenCon = "Bi"; tq.soDu = 128; tq.diemChoDuyet = 10; tq.capDo.cap = 3; tq.capDo.conThieu = 22
    func nv(_ id: String, _ ten: String, _ tt: String, diem: Int, moTa: String = "", han: TimeInterval? = nil) -> HvNhiemVu {
      var v = HvNhiemVu(); v.id = id; v.ten = ten; v.trangThai = tt; v.diem = diem; v.moTa = moTa; v.han = han.map { Date().addingTimeInterval($0) }
      v.luot = tt == "san_sang" ? nil : "L" + id; return v
    }
    var bs = nv("1", "Dọn góc học tập", "can_bo_sung", diem: 15, moTa: "Xếp sách vở gọn gàng, lau bàn"); bs.lyDo = "Con chụp rõ mặt bàn nhé"
    var dl = nv("2", "Đọc sách 20 phút — một cái tên rất dài để xem chữ có cắt bằng dấu ba chấm thay vì co nhỏ cỡ chữ hay không nhé", "dang_lam", diem: 10, han: 3 * 3600)
    dl.phutToiThieu = 20; dl.giaoRieng = true
    tq.nhiemVu = [bs, dl, nv("3", "Tưới cây", "san_sang", diem: 5, moTa: "Tưới chậu cây ở ban công", han: 86_400 * 2), nv("4", "Đánh răng", "du_hom_nay", diem: 2)]
    var g = HvLuot(); g.id = "g1"; g.ten = "Quét nhà"; g.trangThai = "duoc_duyet"; g.diem = 5; g.loiKhen = "Con giỏi lắm!"
    var g2 = HvLuot(); g2.id = "g2"; g2.ten = "Làm bài toán"; g2.trangThai = "cho_duyet"
    tq.gan = [g, g2]
    var k = HvLoiKhen(); k.id = "k1"; k.noiDung = "Hôm nay con tự giác lắm, Ba Mẹ thương con!"
    var k2 = HvLoiKhen(); k2.id = "k2"; k2.noiDung = "Nhớ uống nước nhé"; k2.phanHoi = "Con cảm ơn ạ"
    tq.loiKhen = [k, k2]
    var p = HvPhieu(); p.id = "p1"; p.ten = "Đi ăn kem"; p.diem = 60; tq.phieuCho = [p]
    app.tq = tq
    var ch = HvCuaHang(); ch.soDu = 128
    func qua(_ id: String, _ ten: String, _ d: Int, du: Bool, thieu: Int = 0, cuoiTuan: Bool = false) -> HvQua {
      var q = HvQua(); q.id = id; q.ten = ten; q.diem = d; q.du = du; q.conThieu = thieu; q.chiCuoiTuan = cuoiTuan; return q
    }
    ch.qua = [qua("q1", "30 phút xem hoạt hình", 50, du: true), qua("q2", "Bộ Lego nhỏ", 300, du: false, thieu: 172, cuoiTuan: true)]
    app.ch = ch
    var ds = HvTinDs()
    var t1 = HvTin(); t1.id = "t1"; t1.tieu = "Ba Mẹ đã duyệt «Quét nhà»"; t1.noi = "+5 điểm"; t1.luc = Date()
    var t2 = HvTin(); t2.id = "t2"; t2.tieu = "Nhiệm vụ mới: Tưới cây"; t2.noi = "Ba Mẹ vừa giao cho con"; t2.luc = Date().addingTimeInterval(-3600)
    ds.ds = [t1, t2]; app.tin = ds
    app.tinMoi = 2; app.phutChoi = 25; app.phutChoiCua = "com.roblox.roblox"
    return (app, tray)
  }

  func testChupAppCon() throws {
    guard let p = ProcessInfo.processInfo.environment["CHUP_CLAY"] else { throw XCTSkip("đặt CHUP_CLAY=<thư mục> để chụp") }
    let dir = URL(fileURLWithPath: p)
    let (app, tray) = appMau()
    let co = CGSize(width: 1000, height: 760)
    for (m, ten) in [(MucApp.homNay, "mac-app-hom-nay"), (.nhiemVu, "mac-app-nhiem-vu"), (.phanQua, "mac-app-phan-qua"), (.tinNhan, "mac-app-tin-nhan")] {
      app.muc = m
      chup(AppConView(app: app, tray: tray), ten, co, dir: dir)
    }
    chup(NopBaiView(nv: app.tq!.nhiemVu[0], app: app), "mac-nop-bai", dir: dir)
    let cm = ChoiModel(goi: { _ in .loi(ma: "thu", chu: "") }); cm.phut = ["com.roblox.roblox": 25]
    chup(ChoiBangDiemView(phut10Sao: 10, sao: 30, m: cm), "mac-choi-bang-diem", dir: dir)
    chup(ChanAppView(ten: "Roblox", lyDo: "chi_app_hoc", coChoi: true, m: ChoiModel(goi: { _ in .loi(ma: "", chu: "") }), muc: "com.roblox.roblox"), "mac-chan-app", dir: dir)
    chup(XinThemCuaSo(tray: tray, xin: XinModel(), moChoi: {}), "mac-xin-them-doi-diem", dir: dir)
    chup(GhepMayView(taiKhoan: ["bi", "na"], coGoiCai: true, dongLai: {}), "mac-ghep-mot-cham", dir: dir)
    let khoa = TrayModel(); var tk = tt(cheDo: .khoa, lyDo: "het_gio", dem: nil); tk.matMang = true; tk.nhapMaOffline = true; khoa.capNhat(tk)
    chup(ManKhoaView(tray: khoa, xin: XinModel()), "mac-man-khoa-ma-offline", CGSize(width: 1280, height: 1000), dir: dir)
    chup(TinMoiView(tieu: "Nhiệm vụ mới: Tưới cây", noi: "Ba Mẹ vừa giao cho con. Làm xong để tích điểm nhé!"), "mac-tin-moi", dir: dir)
  }

  /// Màn Mac làm lại 06/11 (con-cai-mac) — đặt cạnh HTML thiết kế để so.
  func testChupManMac() throws {
    guard let p = ProcessInfo.processInfo.environment["CHUP_CLAY"] else { throw XCTSkip("đặt CHUP_CLAY=<thư mục> để chụp") }
    let dir = URL(fileURLWithPath: p)
    let man = CGSize(width: 1280, height: 860)
    let hoSo: HoSoMay = { var h = HoSoMay(); h.con = [HoSoBe(id: "c1", ten: "Bảo Anh", coPin: true), HoSoBe(id: "c2", ten: "Bảo Minh", coPin: true)]; return h }()
    let goi: (YeuCauTray) async -> TraLoi = { _ in .loi(ma: "thu", chu: "") }
    let m10 = ChonTenModel(goi: goi); m10.hoSo = hoSo
    chup(ManChonTenView(m: m10), "10-chon-ten", man, dir: dir)
    let m11 = ChonTenModel(goi: goi); m11.hoSo = hoSo; m11.buoc = .pin(hoSo.con[0]); m11.pin.them("4"); m11.pin.them("8")
    chup(ManChonTenView(m: m11), "11-nhap-pin", man, dir: dir)
    let m12 = ChonTenModel(goi: goi); m12.hoSo = hoSo; m12.buoc = .pin(hoSo.con[0]); m12.cau = "Chưa đúng · còn 3 lần thử"; m12.cauLoi = true
    chup(ManChonTenView(m: m12), "12-pin-chua-dung", man, dir: dir)
    let m13 = ChonTenModel(goi: goi); m13.hoSo = hoSo; m13.buoc = .pin(hoSo.con[0]); m13.choDen = Date().addingTimeInterval(15)
    chup(ManChonTenView(m: m13), "13-sai-5-lan", man, dir: dir)
    let m14 = ChonTenModel(goi: goi); m14.hoSo = hoSo; m14.buoc = .quenPin(hoSo.con[0])
    chup(ManChonTenView(m: m14), "14-quen-pin", man, dir: dir)
    let m15 = ChonTenModel(goi: goi); m15.hoSo = hoSo; m15.buoc = .baMeMa; m15.ma = "48"
    chup(ManChonTenView(m: m15), "15-ba-me-nhap-ma", man, dir: dir)
    chup(BaMeDangDungView(den: Date().addingTimeInterval(1800), khoaLai: {}), "16-ba-me-dang-dung", dir: dir)
    // màn khoá theo bé
    var tk = tt(cheDo: .khoa, lyDo: "het_gio", dem: nil); tk.beTen = "Bảo Anh"; tk.nguoiDung = "con"; tk.quyTongPhut = 60; tk.quyConPhut = 0
    let khoa = TrayModel(); khoa.capNhat(tk)
    chup(ManKhoaView(tray: khoa, xin: XinModel(), sao: 30), "33-het-gio", man, dir: dir)
    var tn = tk; tn.lyDoKhoa = "gio_ngu"; tn.gioNgu = KhungGio(tu: "21:30", den: "06:30")
    let ngu = TrayModel(); ngu.capNhat(tn)
    chup(ManKhoaView(tray: ngu, xin: XinModel(), sao: 30), "35-gio-ngu", man, dir: dir)
    var tm = tk; tm.matMang = true; tm.nhapMaOffline = true
    let mm = TrayModel(); mm.capNhat(tm)
    chup(ManKhoaView(tray: mm, xin: XinModel(), sao: 30), "58-mat-mang", CGSize(width: 1280, height: 1000), dir: dir)
    var td = tt(cheDo: .tuDo, lyDo: "het_gio", dem: 45); td.nguoiDung = "con"; td.beTen = "Bảo Anh"
    let dn = TrayModel(); dn.capNhat(td)
    chup(ManKhoaView(tray: dn, xin: XinModel(), sao: 30), "32-dem-nguoc", CGSize(width: 1280, height: 900), dir: dir)
    // app Con theo mẫu thiết kế (Bảo Anh, 18 phút, 42/60, 30 sao)
    let (app, tray) = appMau()
    var t = tray.tt!; t.nguoiDung = "con"; t.beTen = "Bảo Anh"; t.tenCon = "Bảo Anh"; t.quyConPhut = 18; t.quyTongPhut = 60; t.conPhut = 18
    t.homNayTheoApp = [MucDung(muc: "com.roblox.roblox", phut: 30, day: "x"), MucDung(muc: "com.google.youtubekids", phut: 12, day: "x")]
    tray.capNhat(t)
    app.tq?.tenCon = "Bảo Anh"; app.tq?.soDu = 30; app.tq?.diemChoDuyet = 20
    var ch = HvCuaHang(); ch.soDu = 30
    func qua(_ id: String, _ ten: String, _ d: Int, thieu: Int, cuoiTuan: Bool = false, cho: Date? = nil) -> HvQua {
      var q = HvQua(); q.id = id; q.ten = ten; q.diem = d; q.conThieu = thieu; q.du = thieu == 0; q.chiCuoiTuan = cuoiTuan; q.choTraoTu = cho; return q
    }
    ch.qua = [qua("q1", "Đi ăn kem", 100, thieu: 70, cho: Date().addingTimeInterval(-86_400)), qua("q2", "Đi xem phim", 300, thieu: 270, cuoiTuan: true),
              qua("q3", "Chọn món bữa tối", 50, thieu: 20), qua("q4", "Đồ chơi nhỏ", 200, thieu: 170)]
    app.ch = ch
    let co = CGSize(width: 1000, height: 760)
    for (m, ten) in [(MucApp.homNay, "19-hom-nay"), (.nhiemVu, "20-nhiem-vu"), (.phanQua, "23-sao-qua"), (.tinNhan, "27-tin-nhan")] {
      app.muc = m
      chup(AppConView(app: app, tray: tray), ten, co, dir: dir)
    }
    chup(DoiQuaView(q: ch.qua[2], sao: 30, app: app), "24-doi-qua", dir: dir)
    let cm = ChoiModel(goi: goi)
    chup(ChoiBangDiemView(phut10Sao: 10, sao: 30, m: cm, conPhut: 18, xinThem: {}, lamNhiemVu: {}), "49-doi-sao-lay-gio", dir: dir)
    chup(XinThemCuaSo(tray: tray, xin: XinModel(), moChoi: {}, moXinApp: {}), "45-xin-them-gio", dir: dir)
    chup(NhacView(phut: 5, sao: 30, doiSao: {}, xinThem: {}), "31-nhac-5-phut", dir: dir)
    for (mg, ten) in [(ManGhep.nhap, "03-ghep-may"), (.maSai, "05-ma-sai"), (.hetHan, "06-het-han"), (.matMang, "07-mat-mang"), (.batQuyen, "08-bat-quyen"), (.xong, "09-xong")] {
      chup(GhepMayView(taiKhoan: ["baoanh"], dongLai: {}, manDau: mg), ten, dir: dir)
    }
  }

  /// Vùng bấm thanh bên + nút trong app ≥ 44pt, cửa sổ không tràn ngang ở cỡ tối thiểu.
  func testAppConVungBamVaCoToiThieu() {
    let (app, tray) = appMau()
    let host = NSHostingView(rootView: AppConView(app: app, tray: tray))
    host.frame = NSRect(x: 0, y: 0, width: 880, height: 600)
    host.layoutSubtreeIfNeeded()
    XCTAssertLessThanOrEqual(host.fittingSize.width, 880.5, "cỡ tối thiểu 880 không tràn ngang")
    XCTAssertGreaterThanOrEqual(NutClayStyle().cao, 44)
  }

  /// Ô chọn tài khoản (Ghép máy): NSPopUpButton trong suốt phải phủ kín ô Clay — vùng bấm ≥ 44pt, rộng gần hết thẻ.
  func testOChonTaiKhoanDu44() {
    let host = NSHostingView(rootView: GhepMayView(taiKhoan: ["bi", "na"], dongLai: {}))
    host.frame = NSRect(origin: .zero, size: host.fittingSize)
    host.layoutSubtreeIfNeeded()
    func tim(_ v: NSView) -> NSPopUpButton? { if let p = v as? NSPopUpButton { return p }; for c in v.subviews { if let p = tim(c) { return p } }; return nil }
    guard let p = tim(host) else { return XCTFail("không thấy NSPopUpButton") }
    XCTAssertGreaterThanOrEqual(p.frame.height, 44, "vùng bấm ô chọn tài khoản")
    XCTAssertGreaterThanOrEqual(p.frame.width, 300)
    XCTAssertEqual(p.itemTitles, ["bi", "na"])
    // alpha 0 vẫn nhận bấm: điểm giữa ô trúng chính NSPopUpButton
    let w = NSWindow(contentRect: host.frame, styleMask: [.borderless], backing: .buffered, defer: false)
    w.contentView = host; host.layoutSubtreeIfNeeded()
    w.isReleasedWhenClosed = false
    defer { w.contentView = nil; w.orderOut(nil) }
    let giua = p.convert(NSPoint(x: p.bounds.midX, y: p.bounds.midY), to: nil)
    let trung = w.contentView?.superview?.hitTest(giua) ?? host.hitTest(giua)
    XCTAssertTrue(trung === p, "bấm giữa ô phải trúng pop-up, trúng \(String(describing: trung))")
  }
}
