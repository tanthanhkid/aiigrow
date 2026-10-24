// Ứng dụng menu bar AiiGrow (LSUIElement): biểu tượng, menu, hỏi daemon mỗi 5 giây, màn khoá, nhắc giờ, ghép máy.
import AppKit
import SwiftUI
import AiiGrowCore

/// Cửa sổ không viền nhưng nhận được phím/chuột (cần cho nút trên màn khoá).
final class CuaSoKhongDong: NSWindow {
  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { true }
}

@MainActor
final class TrayApp: NSObject, NSApplicationDelegate {
  let model = TrayModel()
  let xin = XinModel()
  var item: NSStatusItem!
  var timerHoi: Timer?
  var timerGiao: Timer?
  var manKhoa: [CuaSoKhongDong] = []
  var cuaSoXin: NSWindow?, cuaSoMo: NSWindow?, cuaSoGhep: NSWindow?
  var nhac = NhacGio()
  var cuaSoNhac: NSPanel?
  var laAdminCache: Bool?

  func applicationDidFinishLaunching(_ n: Notification) {
    item = NSStatusItem.systemStatusItem
    item.button?.image = NSImage(systemSymbolName: "leaf.fill", accessibilityDescription: "AiiGrow")
    item.button?.imagePosition = .imageLeading
    NotificationCenter.default.addObserver(self, selector: #selector(manHinhDoi),
      name: NSApplication.didChangeScreenParametersNotification, object: nil)
    veLai()
    hoi()
    timerHoi = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in Task { @MainActor in self?.hoi() } }
    timerGiao = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in Task { @MainActor in self?.nhip() } }
  }

  // MARK: hỏi daemon

  func hoi() {
    Task {
      do {
        if case .trangThai(let t) = try await IPCClient.guiAsync(.trangThai) { model.capNhat(t) } else { model.matNoi() }
      } catch { model.matNoi() }
      veLai()
    }
  }

  /// Mỗi giây: cập nhật chữ «Còn X phút» và nhắc giờ.
  func nhip() {
    guard let t = model.tt, !model.matKetNoi else { return }
    let g = TrayLogic.giayConLai(t, nhanLuc: model.nhanLuc, bayGio: Date())
    if t.laPhienCon, t.cheDo != .khoa, let m = nhac.xet(giayConLai: g) { hienNhac(m) }
    item.button?.title = " " + TrayLogic.tieuDeThanh(t, matKetNoi: false, nhanLuc: model.nhanLuc, bayGio: Date())
  }

  // MARK: vẽ lại

  func veLai() {
    let bay = Date()
    let t = model.tt
    let tieuDe = TrayLogic.tieuDeThanh(t, matKetNoi: model.matKetNoi, nhanLuc: model.nhanLuc, bayGio: bay)
    item.button?.title = tieuDe.isEmpty ? "" : " " + tieuDe
    item.button?.toolTip = [TrayLogic.dongCanhBaoAdmin(t), TrayLogic.dongTrangThai(t, matKetNoi: model.matKetNoi, nhanLuc: model.nhanLuc, bayGio: bay)].compactMap { $0 }.joined(separator: "\n")
    item.menu = dungMenu(bay: bay)
    capNhatManKhoa()
    capNhatGhep()
  }

  func dungMenu(bay: Date) -> NSMenu {
    let m = NSMenu()
    let t = model.tt
    func muc(_ ten: String, _ sel: Selector) { let i = NSMenuItem(title: ten, action: sel, keyEquivalent: ""); i.target = self; m.addItem(i) }
    func dong(_ s: String) { let i = NSMenuItem(title: s, action: nil, keyEquivalent: ""); i.isEnabled = false; m.addItem(i) }
    dong(TrayLogic.dongTrangThai(t, matKetNoi: model.matKetNoi, nhanLuc: model.nhanLuc, bayGio: bay))
    if let c = TrayLogic.dongCanhBaoAdmin(t) { dong(c) }
    if let y = TrayLogic.dongYeuCau(t?.yeuCauCho ?? []) { dong(y) }
    if let t, t.matMang, !model.matKetNoi { dong("Đang chạy theo giờ đã lưu (mất mạng)") }
    m.addItem(.separator())
    if !model.matKetNoi, t?.laPhienCon == true {
      muc("Xin thêm thời gian…", #selector(moXin))
      muc("Xin mở trang hoặc app…", #selector(moXinMo))
      if t?.duocDoiDiem == true {   // KHÔNG hiện số điểm — chỉ hiện nút khi được phép
        muc("Đổi điểm lấy thời gian", #selector(doiDiem))
      }
      m.addItem(.separator())
    }
    if TrayLogic.canGhep(t, laAdmin: laAdmin()) {
      muc("Ghép máy với Con…", #selector(moGhep))
      m.addItem(.separator())
    }
    dong(TrayLogic.dongDangBat)
    return m
  }

  // MARK: hành động menu

  @objc func moXin() { hien(&cuaSoXin, "AiiGrow · Xin thêm thời gian", XinThemCuaSo(tray: model, xin: xin)) }
  @objc func moXinMo() { hien(&cuaSoMo, "AiiGrow · Xin mở trang hoặc app", XinMoView(tray: model, xin: xin)) }
  @objc func doiDiem() {
    // IPC chưa có lệnh đổi điểm — hướng Con sang app AiiGrow của Con (xem đề xuất doiDiem ở báo cáo).
    let a = NSAlert(); a.messageText = "Đổi điểm lấy thời gian"
    a.informativeText = "Con mở app AiiGrow của Con để đổi điểm nhé."
    a.addButton(withTitle: "Đã hiểu"); a.runModal()
  }
  @objc func moGhep() { capNhatGhep(ep: true) }

  func hien<V: View>(_ giu: inout NSWindow?, _ tieuDe: String, _ v: V) {
    if let w = giu { w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true); return }
    xin.thongBao = ""
    let w = NSWindow(contentViewController: NSHostingController(rootView: v))
    w.title = tieuDe; w.styleMask = [.titled, .closable]; w.isReleasedWhenClosed = false
    w.center(); w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    giu = w
    NotificationCenter.default.addObserver(forName: NSWindow.willCloseNotification, object: w, queue: .main) { [weak self] _ in
      Task { @MainActor in
        if self?.cuaSoXin === w { self?.cuaSoXin = nil }
        if self?.cuaSoMo === w { self?.cuaSoMo = nil }
      }
    }
  }

  // MARK: ghép máy

  func laAdmin() -> Bool {
    if let c = laAdminCache { return c }
    let r = TrayLogic.laAdmin(dsclRa: chay("/usr/bin/dscl", [".", "-read", "/Groups/admin", "GroupMembership"]), ten: NSUserName())
    laAdminCache = r; return r
  }

  func chay(_ lenh: String, _ doi: [String]) -> String {
    let p = Process(); p.executableURL = URL(fileURLWithPath: lenh); p.arguments = doi
    let ong = Pipe(); p.standardOutput = ong; p.standardError = Pipe()
    do { try p.run() } catch { return "" }
    let du = ong.fileHandleForReading.readDataToEndOfFile(); p.waitUntilExit()
    return String(decoding: du, as: UTF8.self)
  }

  func capNhatGhep(ep: Bool = false) {
    let can = TrayLogic.canGhep(model.tt, laAdmin: laAdmin())
    if !can && !ep { cuaSoGhep?.close(); cuaSoGhep = nil; return }
    guard can else { return }
    if let w = cuaSoGhep { if ep { w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true) }; return }
    let ds = TrayLogic.taiKhoanThuong(dsclRa: chay("/usr/bin/dscl", [".", "-list", "/Users", "UniqueID"]), hienTai: NSUserName())
    let w = NSWindow(contentViewController: NSHostingController(rootView: GhepMayView(taiKhoan: ds, dongLai: { [weak self] in
      self?.cuaSoGhep?.close(); self?.cuaSoGhep = nil; self?.hoi() })))
    w.title = "AiiGrow · Ghép máy"; w.styleMask = [.titled, .closable]; w.isReleasedWhenClosed = false
    w.center(); w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    cuaSoGhep = w
  }

  // MARK: màn khoá toàn màn hình

  @objc func manHinhDoi() { if !manKhoa.isEmpty { datLaiManKhoa() } }

  func capNhatManKhoa() {
    let can = TrayLogic.chonMan(model.matKetNoi ? nil : model.tt) != .khong
    if can && manKhoa.isEmpty { datLaiManKhoa() }
    if !can && !manKhoa.isEmpty { goManKhoa() }
  }

  func datLaiManKhoa() {
    manKhoa.forEach { $0.orderOut(nil) }
    manKhoa = NSScreen.screens.map { s in
      let w = CuaSoKhongDong(contentRect: s.frame, styleMask: [.borderless], backing: .buffered, defer: false, screen: s)
      w.level = .screenSaver
      w.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
      w.isOpaque = true; w.backgroundColor = .black; w.hasShadow = false; w.isReleasedWhenClosed = false
      w.contentView = NSHostingView(rootView: ManKhoaView(tray: model, xin: xin))
      w.setFrame(s.frame, display: true)
      w.makeKeyAndOrderFront(nil)
      return w
    }
    NSApp.presentationOptions = [.hideDock, .hideMenuBar, .disableProcessSwitching, .disableHideApplication]
    NSApp.activate(ignoringOtherApps: true)
  }

  func goManKhoa() {
    manKhoa.forEach { $0.orderOut(nil) }
    manKhoa = []
    NSApp.presentationOptions = []
  }

  // MARK: nhắc giờ

  func hienNhac(_ phut: Int) {
    cuaSoNhac?.close()
    let p = NSPanel(contentViewController: NSHostingController(rootView: NhacView(phut: phut)))
    p.styleMask = [.titled, .nonactivatingPanel, .utilityWindow]; p.title = "AiiGrow"
    p.level = .floating; p.isReleasedWhenClosed = false
    if let s = NSScreen.main {
      p.setFrameOrigin(NSPoint(x: s.visibleFrame.maxX - p.frame.width - 16, y: s.visibleFrame.maxY - p.frame.height - 16))
    }
    p.orderFrontRegardless()
    cuaSoNhac = p
    DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self, weak p] in if self?.cuaSoNhac === p { p?.close() } }
  }
}

extension NSStatusItem {
  @MainActor static var systemStatusItem: NSStatusItem { NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength) }
}
