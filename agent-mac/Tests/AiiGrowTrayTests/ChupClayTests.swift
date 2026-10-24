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
}
