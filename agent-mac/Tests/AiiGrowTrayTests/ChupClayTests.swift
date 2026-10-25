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
    chup(ChoiBangDiemView(ds: ["com.roblox.roblox", "youtube.com", "Minecraft.app"], m: cm, tuHoi: false), "mac-choi-bang-diem", dir: dir)
    chup(ChanAppView(ten: "Roblox", lyDo: "chi_app_hoc", coChoi: true, m: ChoiModel(goi: { _ in .loi(ma: "", chu: "") }), muc: "com.roblox.roblox"), "mac-chan-app", dir: dir)
    chup(XinThemCuaSo(tray: tray, xin: XinModel(), moChoi: {}), "mac-xin-them-doi-diem", dir: dir)
    chup(GhepMayView(taiKhoan: ["bi", "na"], coGoiCai: true, dongLai: {}), "mac-ghep-mot-cham", dir: dir)
    let khoa = TrayModel(); var tk = tt(cheDo: .khoa, lyDo: "het_gio", dem: nil); tk.matMang = true; tk.nhapMaOffline = true; khoa.capNhat(tk)
    chup(ManKhoaView(tray: khoa, xin: XinModel()), "mac-man-khoa-ma-offline", CGSize(width: 1280, height: 1000), dir: dir)
    chup(TinMoiView(tieu: "Nhiệm vụ mới: Tưới cây", noi: "Ba Mẹ vừa giao cho con. Làm xong để tích điểm nhé!"), "mac-tin-moi", dir: dir)
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
