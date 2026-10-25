// Ứng dụng menu bar AiiGrow (LSUIElement): biểu tượng, menu, hỏi daemon mỗi 5 giây, màn khoá, nhắc giờ, ghép máy.
import AppKit
import SwiftUI
import UserNotifications
import AiiGrowCore

/// Cửa sổ không viền nhưng nhận được phím/chuột (cần cho nút trên màn khoá).
final class CuaSoKhongDong: NSWindow {
  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { true }
}

@MainActor
final class TrayApp: NSObject, NSApplicationDelegate, NSWindowDelegate {
  let model = TrayModel()
  let xin = XinModel()
  var item: NSStatusItem!
  var timerHoi: Timer?
  var timerGiao: Timer?
  var manKhoa: [CuaSoKhongDong] = []
  var ghepTT = TrayLogic.CuaSoGhep()
  var cuaSoXin: NSWindow?, cuaSoMo: NSWindow?, cuaSoGhep: NSWindow?
  var nhac = NhacGio()
  var cuaSoNhac: NSPanel?
  var laAdminCache: Bool?
  // App «AiiGrow của Con» (nhiệm vụ / phần quà / tin nhắn — ngang agent-win AppForm) + các cửa sổ con.
  let appCon = AppConModel()
  var cuaSoApp: NSWindow?, cuaSoChoi: NSWindow?, cuaSoNop: NSWindow?
  var cuaSoChan: NSPanel?, cuaSoTin: NSPanel?
  var timerTin: Timer?
  var tinTheo = TinTracker()
  var batNv = BatNhiemVu()
  var dangHoiTin = false
  var luotTin = 0
  /// `chanSeq` daemon trả lần trước — tăng ⇒ vừa đóng một app MỚI ⇒ hiện màn «… chưa được mở». nil = chưa nhận lần nào (không báo app cũ).
  var chanSeqDaThay: Int?
  var dangKhoaTruoc = false

  func applicationDidFinishLaunching(_ n: Notification) {
    item = NSStatusItem.systemStatusItem
    item.button?.image = TrayApp.iconThanhMenu()
    item.button?.imagePosition = .imageLeading
    NotificationCenter.default.addObserver(self, selector: #selector(manHinhDoi),
      name: NSApplication.didChangeScreenParametersNotification, object: nil)
    veLai()
    hoi()
    timerHoi = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in Task { @MainActor in self?.hoi() } }
    timerGiao = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in Task { @MainActor in self?.nhip() } }
    // Tin mới của Con (Ba Mẹ giao việc / duyệt / nhắn) mỗi 30 giây; app đang mở thì tải lại mỗi 60 giây.
    timerTin = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in Task { @MainActor in self?.hoiTin() } }
    DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in self?.hoiTin() }
    batThongBaoHeThong()
  }

  // MARK: thông báo hệ thống (UNUserNotification) cho tin mới — chỉ khi chạy trong AiiGrow.app (test / dev không có bundle ⇒ dùng bảng nhỏ)

  var thongBaoHeThong = false
  func batThongBaoHeThong() {
    guard Bundle.main.bundleIdentifier != nil, Bundle.main.bundleURL.pathExtension == "app" else { return }
    let c = UNUserNotificationCenter.current()
    c.delegate = ThongBaoDelegate.chung
    ThongBaoDelegate.chung.khiBam = { [weak self] muc in self?.moApp(muc) }
    c.requestAuthorization(options: [.alert, .sound, .badge]) { ok, _ in
      Task { @MainActor [weak self] in self?.thongBaoHeThong = ok }
    }
  }

  /// Báo tin mới: thông báo hệ thống nếu được phép (Trung tâm thông báo giữ lại cho Con xem sau), không thì bảng nhỏ góc phải.
  func baoTinMoi(_ tieu: String, _ noi: String, muc: MucApp) {
    guard thongBaoHeThong else { hienTinMoi(tieu, noi, muc: muc); return }
    // quyền có thể bị tắt sau lúc mở ⇒ hỏi lại mỗi lần, không được thì dùng bảng nhỏ
    UNUserNotificationCenter.current().getNotificationSettings { st in
      let duoc = st.authorizationStatus == .authorized && st.alertSetting == .enabled
      Task { @MainActor [weak self] in
        if duoc { self?.guiThongBao(tieu, noi, muc: muc) } else { self?.hienTinMoi(tieu, noi, muc: muc) }
      }
    }
  }

  func guiThongBao(_ tieu: String, _ noi: String, muc: MucApp) {
    let nd = UNMutableNotificationContent()
    nd.title = tieu; nd.body = noi; nd.sound = .default
    nd.userInfo = ["muc": muc.rawValue]
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: UUID().uuidString, content: nd, trigger: nil))
  }

  /// Biểu tượng thanh menu = Rob (Mascot/rob-goc.png, 18pt); thiếu tệp ⇒ lá cây SF Symbol như trước.
  static func iconThanhMenu() -> NSImage? {
    guard let rob = FluentIcon.anh("rob-goc", thuMuc: "Mascot") else { return NSImage(systemSymbolName: "leaf.fill", accessibilityDescription: "AiiGrow") }
    let co = NSSize(width: 18, height: 18)
    let anh = NSImage(size: co, flipped: false) { r in rob.draw(in: r, from: .zero, operation: .sourceOver, fraction: 1); return true }
    anh.accessibilityDescription = "AiiGrow"
    return anh
  }

  /// Phiên này là của Con, đã ghép, daemon trả lời ⇒ app của Con dùng được.
  var laConDaGhep: Bool { !model.matKetNoi && model.tt?.laPhienCon == true && model.tt?.daGhep == true }

  // MARK: hỏi daemon

  func hoi() {
    Task {
      do {
        if case .trangThai(let t) = try await IPCClient.guiAsync(.trangThai) { model.capNhat(t) } else { model.matNoi() }
      } catch { model.matNoi() }
      veLai()
      xetAppVuaChan()
      xetMoKhoa()
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
      if t?.daGhep == true {
        muc(appCon.tinMoi > 0 ? "Mở AiiGrow của Con (\(appCon.tinMoi) tin mới)…" : "Mở AiiGrow của Con…", #selector(moAppCon))
      }
      muc("Xin thêm thời gian…", #selector(moXin))
      muc("Xin mở trang hoặc app…", #selector(moXinMo))
      if let t, ChoiBangDiem.hienNut(duocDoiDiem: t.duocDoiDiem, lyDoKhoa: t.lyDoKhoa, matMang: t.matMang, dsChoi: t.dsChoi ?? []) {
        muc("Chơi bằng điểm…", #selector(moChoi))   // menu KHÔNG hiện số điểm — chỉ hiện khi được phép
      }
      m.addItem(.separator())
    }
    if TrayLogic.canGhep(t, laAdmin: laAdmin()) {
      muc("Ghép máy với Con…", #selector(moGhep))
      m.addItem(.separator())
    }
    if TrayLogic.canKiemCapNhat(t, laAdmin: laAdmin()) {
      if let c = TrayLogic.dongCapNhat(t, bayGio: bay) { dong(c) }
      muc("Kiểm tra cập nhật", #selector(kiemCapNhat))
      muc("Cài hồ sơ DNS gia đình…", #selector(caiHoSoDns))
    }
    dong(TrayLogic.dongBanDangChay(t))
    dong(TrayLogic.dongDangBat)
    return m
  }

  // MARK: hành động menu

  @objc func moXin() { hien(&cuaSoXin, "AiiGrow · Xin thêm thời gian", XinThemCuaSo(tray: model, xin: xin, moChoi: { [weak self] in self?.cuaSoXin?.close(); self?.moChoi() })) }
  @objc func moXinMo() { hien(&cuaSoMo, "AiiGrow · Xin mở trang hoặc app", XinMoView(tray: model, xin: xin)) }
  @objc func moAppCon() { moApp(nil) }
  @objc func moChoi() {
    if let w = cuaSoChoi { w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true); return }   // đã mở: chỉ đưa lên trước
    let ds = model.tt?.dsChoi ?? []
    let m = ChoiModel()
    hienCuaSo(&cuaSoChoi, "AiiGrow · Chơi bằng điểm", ChoiBangDiemView(ds: ds, m: m, dong: { [weak self] in self?.cuaSoChoi?.close() }))
    // xong ⇒ đóng sau 1,5 giây, hỏi lại số phút cho trang Hôm nay
    Task { @MainActor [weak self] in
      for _ in 0..<600 { if m.xong || self?.cuaSoChoi == nil { break }; try? await Task.sleep(nanoseconds: 500_000_000) }
      guard m.xong else { return }
      try? await Task.sleep(nanoseconds: 1_500_000_000); self?.cuaSoChoi?.close()
      await self?.appCon.lamMoiPhutChoi(dsChoi: ds)
    }
  }

  // MARK: app «AiiGrow của Con»

  /// Mở (hoặc đưa lên trước) cửa sổ app của Con; `muc` khác nil thì chuyển tới mục đó. Đóng cửa sổ = ẩn (tray vẫn chạy).
  func moApp(_ muc: MucApp?) {
    guard laConDaGhep else { return }
    if let muc { appCon.chon(muc) }
    if let w = cuaSoApp {
      w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    } else {
      let v = AppConView(app: appCon, tray: model, moXin: { [weak self] in self?.moXin() }, moChoi: { [weak self] in self?.moChoi() },
                         moNop: { [weak self] nv in self?.moNop(nv) })
      let w = NSWindow(contentViewController: NSHostingController(rootView: v))
      w.title = "AiiGrow của Con"
      w.styleMask = [.titled, .closable, .miniaturizable, .resizable]
      w.isReleasedWhenClosed = false
      w.setContentSize(NSSize(width: 1000, height: 680))
      w.contentMinSize = NSSize(width: 880, height: 600)
      w.center(); w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
      cuaSoApp = w
    }
    Task { await appCon.lamMoi(dsChoi: model.tt?.dsChoi ?? []) }
  }

  var appDangHien: Bool { cuaSoApp?.isVisible == true && cuaSoApp?.isMiniaturized == false }

  func moNop(_ nv: HvNhiemVu) {
    cuaSoNop?.close(); cuaSoNop = nil
    let hop = HopCuaSo()
    let v = NopBaiView(nv: nv, app: appCon, xong: { [weak self] kq in
      guard let self else { return }
      if let w = hop.w, self.cuaSoNop === w { w.close() }        // chỉ đóng ĐÚNG cửa sổ vừa nộp (Con có thể đã mở bài khác)
      Task { await self.appCon.lamMoi(dsChoi: self.model.tt?.dsChoi ?? []); self.appCon.noi(HocVienView.nopThongBao(kq)) }
    })
    hienCuaSo(&cuaSoNop, "AiiGrow · Nộp bài", v)
    hop.w = cuaSoNop
  }

  /// Hỏi tin mới (hoc-vien/tin?sau=…) ⇒ bảng báo nhỏ góc phải; có nhiệm vụ mới ⇒ tự bật app ở mục Nhiệm vụ (BatNhiemVu).
  func hoiTin() {
    guard laConDaGhep, !dangHoiTin else { return }
    dangHoiTin = true
    luotTin += 1
    let lamMoiApp = appDangHien && luotTin % 2 == 0
    Task {
      defer { dangHoiTin = false }
      if lamMoiApp { await appCon.lamMoi(dsChoi: model.tt?.dsChoi ?? []) }
      var path = "hoc-vien/tin"
      if let m = tinTheo.moc {
        let iso = NgayGio.viet(m)
        path += "?sau=" + (iso.addingPercentEncoding(withAllowedCharacters: .alphanumerics.union(CharacterSet(charactersIn: "-._"))) ?? iso)
      }
      guard let d = await appCon.hoi("GET", path).0, let r = HvTinDs.doc(d) else { return }
      let moi = tinTheo.nhan(r)
      guard !moi.isEmpty else { return }
      if !(appDangHien && appCon.muc == .tinNhan) { appCon.tinMoi += moi.count }   // đang xem Tin nhắn ⇒ đã thấy, không đếm là chưa đọc
      veLai()
      if appDangHien && !lamMoiApp { await appCon.lamMoi(dsChoi: model.tt?.dsChoi ?? []) }
      let khoa = model.tt?.cheDo == .khoa || !manKhoa.isEmpty
      if batNv.nhan(coNvMoi: HocVienView.coNhiemVuMoi(moi), khoa: khoa, appDangHien: appDangHien, bayGio: Date()) {
        moApp(.nhiemVu)
      } else if !khoa {
        let (tieu, noi) = HocVienView.thongBaoTin(moi)
        baoTinMoi(tieu, noi, muc: HocVienView.mucChoTin(moi))
      }
    }
  }

  /// Máy vừa hết khoá: nhiệm vụ mới tới trong lúc khoá ⇒ bật app một lần.
  func xetMoKhoa() {
    let khoa = model.tt?.cheDo == .khoa || !manKhoa.isEmpty
    defer { dangKhoaTruoc = khoa }
    if dangKhoaTruoc, !khoa, batNv.moKhoa(appDangHien: appDangHien, bayGio: Date()) { moApp(.nhiemVu) }
  }

  func hienTinMoi(_ tieu: String, _ noi: String, muc: MucApp) {
    cuaSoTin?.close()
    let p = NSPanel(contentViewController: NSHostingController(rootView: TinMoiView(tieu: tieu, noi: noi, xem: { [weak self] in
      self?.cuaSoTin?.close(); self?.moApp(muc)
    })))
    p.styleMask = [.titled, .closable, .nonactivatingPanel, .utilityWindow]; p.title = "AiiGrow"
    p.level = .floating; p.isReleasedWhenClosed = false
    if let s = NSScreen.main { p.setFrameOrigin(NSPoint(x: s.visibleFrame.maxX - p.frame.width - 16, y: s.visibleFrame.maxY - p.frame.height - 16)) }
    p.orderFrontRegardless()
    cuaSoTin = p
    DispatchQueue.main.asyncAfter(deadline: .now() + 12) { [weak self, weak p] in if self?.cuaSoTin === p { p?.close() } }
  }

  /// Daemon vừa đóng một app MỚI trong phiên Con ⇒ màn nhỏ góc phải «X chưa được mở» + «Dùng điểm để chơi» / «Xin phép Ba Mẹ» (agent-win BlockedForm).
  func xetAppVuaChan() {
    guard let t = model.tt, !model.matKetNoi, t.laPhienCon, let seq = t.chanSeq else { return }
    defer { chanSeqDaThay = seq }
    guard let cu = chanSeqDaThay, seq != cu, seq > 0, manKhoa.isEmpty, let ten = t.chanTen else { return }   // != : daemon khởi động lại đếm từ 0
    let muc = t.chanApp ?? ""
    let coChoi = t.chanLyDo == "chi_app_hoc"
      && ChoiBangDiem.hienNut(duocDoiDiem: t.duocDoiDiem, lyDoKhoa: t.lyDoKhoa, matMang: t.matMang, dsChoi: t.dsChoi ?? [], muc: muc)
    let m = ChoiModel()
    cuaSoChan?.close()
    let v = ChanAppView(ten: ten, lyDo: t.chanLyDo, coChoi: coChoi, m: m, muc: muc,
                        xinPhep: { [weak self] in self?.cuaSoChan?.close(); self?.moXinMoApp(ten) },
                        dong: { [weak self] in self?.cuaSoChan?.close() })
    let p = NSPanel(contentViewController: NSHostingController(rootView: v))
    p.styleMask = [.titled, .closable, .utilityWindow]; p.title = "AiiGrow"
    p.level = .floating; p.isReleasedWhenClosed = false
    if let s = NSScreen.main { p.setFrameOrigin(NSPoint(x: s.visibleFrame.maxX - p.frame.width - 16, y: s.visibleFrame.minY + 16)) }
    p.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    cuaSoChan = p
    Task { @MainActor [weak self, weak p] in
      for _ in 0..<600 { if m.xong || self?.cuaSoChan !== p { break }; try? await Task.sleep(nanoseconds: 500_000_000) }
      guard m.xong else { return }
      try? await Task.sleep(nanoseconds: 1_500_000_000); if self?.cuaSoChan === p { p?.close() }
    }
  }

  func moXinMoApp(_ app: String) {
    cuaSoMo?.close(); cuaSoMo = nil
    hien(&cuaSoMo, "AiiGrow · Xin mở trang hoặc app", XinMoView(tray: model, xin: xin, appBanDau: app))
  }

  /// Cửa sổ nhỏ dùng chung (chơi bằng điểm, nộp bài): một bản, đóng ⇒ quên tham chiếu.
  func hienCuaSo<V: View>(_ giu: inout NSWindow?, _ tieuDe: String, _ v: V) {
    if let w = giu { w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true); return }
    let w = NSWindow(contentViewController: NSHostingController(rootView: v))
    w.title = tieuDe; w.styleMask = [.titled, .closable]; w.isReleasedWhenClosed = false
    w.center(); w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    giu = w
    // một lần, giữ cửa sổ YẾU và gỡ người nghe khi đóng ⇒ cửa sổ + cây SwiftUI được giải phóng (tray chạy suốt phiên)
    var nghe: NSObjectProtocol?
    nghe = NotificationCenter.default.addObserver(forName: NSWindow.willCloseNotification, object: w, queue: .main) { [weak self, weak w] _ in
      if let nghe { NotificationCenter.default.removeObserver(nghe) }
      Task { @MainActor in
        if self?.cuaSoChoi === w { self?.cuaSoChoi = nil }
        if self?.cuaSoNop === w { self?.cuaSoNop = nil }
      }
    }
  }
  @objc func kiemCapNhat() {
    Task {
      var chu: String
      do {
        chu = TrayLogic.chuKiemCapNhat(try await IPCClient.guiAsync(.capNhat))
      } catch { chu = "Không liên lạc được dịch vụ AiiGrow (đang khởi động lại hoặc không chạy). Thử lại sau vài giây; vẫn lỗi thì cài lại gói ở trang /tai." }
      let a = NSAlert(); a.messageText = "Kiểm tra cập nhật"; a.informativeText = chu
      a.addButton(withTitle: "Đã hiểu"); NSApp.activate(ignoringOtherApps: true); a.runModal()
    }
  }
  @objc func moGhep() { capNhatGhep(ep: true) }

  /// Ba Mẹ (admin): lấy hồ sơ DNS gia đình (.mobileconfig) qua daemon, lưu vào Tải về rồi mở — macOS hiện «Hồ sơ đã tải», Ba Mẹ cài trong
  /// Cài đặt hệ thống › Quyền riêng tư & Bảo mật › Hồ sơ (macOS không cho cài hồ sơ im lặng ngoài MDM).
  @objc func caiHoSoDns() {
    Task {
      var chu: String
      do {
        switch try await IPCClient.guiAsync(.hoSoDns, giay: 25) {
        case .duLieu(let j):
          if let (ten, noi) = TrayLogic.tachHoSoDns(Data(j.utf8)) {
            let tm = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first ?? FileManager.default.temporaryDirectory
            let u = tm.appendingPathComponent(ten)
            try noi.write(to: u, atomically: true, encoding: .utf8)
            NSWorkspace.shared.open(u)
            chu = "Đã lưu «\(ten)» vào Tải về và mở. Vào Cài đặt hệ thống › Quyền riêng tư & Bảo mật › Hồ sơ, chọn hồ sơ AiiGrow rồi bấm Cài đặt."
          } else { chu = "Máy chủ chưa trả hồ sơ cho Apple." }
        case .loi(_, let c): chu = c
        default: chu = "Chưa lấy được hồ sơ."
        }
      } catch { chu = "Không liên lạc được dịch vụ AiiGrow. Thử lại sau vài giây." }
      let a = NSAlert(); a.messageText = "Hồ sơ DNS gia đình"; a.informativeText = chu
      a.addButton(withTitle: "Đã hiểu"); NSApp.activate(ignoringOtherApps: true); a.runModal()
    }
  }

  func hien<V: View>(_ giu: inout NSWindow?, _ tieuDe: String, _ v: V) {
    if let w = giu { w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true); return }
    xin.thongBao = ""
    let w = NSWindow(contentViewController: NSHostingController(rootView: v))
    w.title = tieuDe; w.styleMask = [.titled, .closable]; w.isReleasedWhenClosed = false; w.delegate = self
    w.center(); w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    giu = w
    var nghe: NSObjectProtocol?
    nghe = NotificationCenter.default.addObserver(forName: NSWindow.willCloseNotification, object: w, queue: .main) { [weak self, weak w] _ in
      if let nghe { NotificationCenter.default.removeObserver(nghe) }
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
    if ghepTT.canDong(can: can, ep: ep) { cuaSoGhep?.close(); cuaSoGhep = nil; ghepTT.daDong(); return }
    if let w = cuaSoGhep {                           // đã có cửa sổ (kể cả đang giữ cảnh báo): chỉ đưa lên trước khi Ba Mẹ chọn menu
      if ghepTT.canDuaLenTruoc(ep: ep, coCuaSo: true) { w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true) }
      return
    }
    guard can else { return }
    let ds = TrayLogic.taiKhoanThuong(dsclRa: chay("/usr/bin/dscl", [".", "-list", "/Users", "UniqueID"]), hienTai: NSUserName())
    let w = NSWindow(contentViewController: NSHostingController(rootView: GhepMayView(taiKhoan: ds, coGoiCai: model.tt?.coGoiCai == true, tray: model, khiGui: { [weak self] bat in if bat { self?.ghepTT.batDauGui() } else { self?.ghepTT.guiXong() } }, khiCanhBao: { [weak self] in self?.ghepTT.hienCanhBao() }, dongLai: { [weak self] in
      self?.cuaSoGhep?.close(); self?.hoi() })))
    w.title = "AiiGrow · Ghép máy"; w.styleMask = [.titled, .closable]; w.isReleasedWhenClosed = false; w.delegate = self
    w.center(); w.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    cuaSoGhep = w
  }

  /// Nút X đỏ cũng reset: không để cờ giữ cảnh báo + cửa sổ đã đóng làm kẹt việc mở lại cửa sổ ghép.
  func windowWillClose(_ n: Notification) {
    guard let w = n.object as? NSWindow, w === cuaSoGhep else { return }
    cuaSoGhep = nil; ghepTT.daDong()
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

/// Giữ YẾU một cửa sổ để closure tạo trước cửa sổ biết đúng cửa sổ của mình.
@MainActor final class HopCuaSo { weak var w: NSWindow? }
/// Bấm vào thông báo «tin mới» ⇒ mở app của Con đúng mục; app đang mở vẫn hiện thông báo dạng banner.
final class ThongBaoDelegate: NSObject, UNUserNotificationCenterDelegate, @unchecked Sendable {
  static let chung = ThongBaoDelegate()
  @MainActor var khiBam: ((MucApp) -> Void)?
  func userNotificationCenter(_ c: UNUserNotificationCenter, didReceive r: UNNotificationResponse, withCompletionHandler xong: @escaping () -> Void) {
    let muc = (r.notification.request.content.userInfo["muc"] as? String).flatMap(MucApp.init(rawValue:)) ?? .tinNhan
    Task { @MainActor in ThongBaoDelegate.chung.khiBam?(muc); xong() }
  }
  func userNotificationCenter(_ c: UNUserNotificationCenter, willPresent n: UNNotification,
                              withCompletionHandler xong: @escaping (UNNotificationPresentationOptions) -> Void) {
    xong([.banner, .sound])
  }
}
